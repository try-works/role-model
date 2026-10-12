import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Entry discovery + resolution for the vendored Effect wrapper build
 * (Run 101 / R1 moved them out of `build.mjs` so the resolution rule can be
 * pinned by a test without running the whole build).
 *
 * ## Case-sensitivity contract (Run 108 follow-up, CI run 37988479615)
 *
 * The entry set returned here must be IDENTICAL on every filesystem, because the
 * Linux CI lanes build this package and Windows does not. Two rules make that
 * true:
 *
 * 1. Existence is decided by an EXACT name match against a directory listing,
 *    never by opening the candidate. `readFile` succeeded for
 *    `src/schema.ts` on Windows (the filesystem is case-insensitive and folded
 *    it onto `src/Schema.ts`), so resolution returned a different entry set per
 *    platform: Windows aliased `effect/schema` onto the main Schema module,
 *    Linux fell through to the barrel `src/schema/index.ts`.
 * 2. No two entry names may differ only by case. esbuild rejects such a pair
 *    with "Two output files share the same path but have different contents"
 *    (`dist/Schema.js`) because its output-conflict check is case-insensitive on
 *    every platform - and on Windows the two names are literally one file, so
 *    the same build passed there.
 *
 * The one pair this repository hits is `effect/Schema` vs `effect/schema`, and
 * both halves are genuinely published: `src/Schema.ts` is the main Schema module
 * (reachable upstream through the vendored package's `"./*": "./src/*.ts"`
 * wildcard) and `src/schema/index.ts` is the barrel the vendored
 * `package.json` declares explicitly as `"./schema": "./src/schema/index.ts"`.
 * Neither is dropped. The barrel is a directory entry, so its vendored-relative
 * name is `schema/index`; it is written to `dist/schema/index.js` - the layout
 * effect@4.0.1 itself publishes (`"./schema": "./dist/schema/index.js"`) - and
 * this package's `exports` map serves it as `effect/schema`, while
 * `dist/Schema.js` keeps serving `effect/Schema`.
 */

const here = import.meta.dirname;
const repoRoot = path.resolve(here, "..", "..", "..");

/** Vendored Effect v4 sources this package re-exports. */
export const vendored = path.join(repoRoot, "vendor", "effect", "packages", "effect", "src");

async function listSourceFiles(root) {
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await listSourceFiles(entryPath)));
    } else if (entry.name.endsWith(".ts")) {
      out.push(entryPath);
    }
  }
  return out;
}

/**
 * The published subpaths are discovered from the vendored Effect family
 * (Effect itself, effect-mq and the SQLite client), so the package exposes
 * exactly the `effect/<subpath>` specifiers the runtime actually imports.
 */
export async function discoverEffectSubpaths() {
  const searchRoots = [
    vendored,
    path.join(repoRoot, "vendor", "effect-mq", "packages", "effect-mq", "src"),
    path.join(repoRoot, "vendor", "effect", "packages", "sql", "sqlite-node", "src"),
  ];
  const subpaths = new Set();
  for (const root of searchRoots) {
    for (const file of await listSourceFiles(root)) {
      const source = await readFile(file, "utf8");
      for (const match of source.matchAll(/["']effect\/([^"']+)["']/g)) {
        subpaths.add(match[1].replace(/\.ts$/, "").replace(/\/index$/, ""));
      }
    }
  }
  const withAncestors = new Set(subpaths);
  for (const subpath of subpaths) {
    const segments = subpath.split("/");
    while (segments.length > 1) {
      segments.pop();
      withAncestors.add(segments.join("/"));
    }
  }
  return [...withAncestors].sort();
}

/**
 * Exact-name existence check. Returns the path spelled the way the directory
 * actually spells it, or `undefined`. `readFile`/stat cannot be used here: on a
 * case-insensitive filesystem they open `src/schema.ts` for `src/Schema.ts`,
 * which is what made this build resolve differently on Windows and Linux
 * (CI run 37988479615).
 */
async function exactFile(candidate) {
  const parent = path.dirname(candidate);
  const name = path.basename(candidate);
  try {
    for (const entry of await readdir(parent)) {
      if (entry === name) return path.join(parent, entry);
    }
  } catch {
    // The parent directory does not exist; the candidate cannot either.
  }
  return undefined;
}

export async function resolveEntry(subpath) {
  const candidate = path.join(vendored, ...subpath.split("/"));
  for (const file of [`${candidate}.ts`, path.join(candidate, "index.ts")]) {
    const resolved = await exactFile(file);
    if (resolved !== undefined) return resolved;
  }
  // Some `effect/...` strings are internal ids the reachable entries resolve
  // themselves; skipping them is safe because esbuild fails the build below if
  // a published entry actually needs one.
  return undefined;
}

/** Output name (`dist/<name>.js`) esbuild gives a resolved entry file. */
export function relativeEntryName(file, root = vendored) {
  return path.relative(root, file).replaceAll("\\", "/").replace(/\.ts$/, "");
}

/**
 * GUARD - the case collision must not come back. It is invisible on Windows
 * (both names resolve to one file there) and only shows up as a failed Linux CI
 * lane, so the build fails loudly here instead. `entries.mjs` deliberately hits
 * this in a unit test with a synthetic subpath pair.
 */
export function assertNoCaseInsensitiveCollisions(entries) {
  const seen = new Map();
  for (const key of Object.keys(entries)) {
    const folded = key.toLowerCase();
    const clash = seen.get(folded);
    if (clash !== undefined && clash !== key) {
      throw new Error(
        `entry points "${clash}" and "${key}" differ only by case: ${relativeEntryName(entries[clash])}.ts and ${relativeEntryName(entries[key])}.ts would be written under one case-insensitive output path, and on Windows they are the same file. Key one of them by its vendored-relative path (see entries.mjs) or stop publishing it.`,
      );
    }
    seen.set(folded, key);
  }
}

/**
 * The esbuild entry map: one `dist/<subpath>.js` output per resolved subpath,
 * plus the package root. A subpath whose flat output name collides
 * case-insensitively with an already-claimed one is re-keyed to its
 * vendored-relative name when that is a genuinely different name (a directory
 * entry such as `src/schema/index.ts`), and the guard fails the build when it is
 * not.
 */
export async function assembleEntries(subpaths, options = {}) {
  const resolve = options.resolve ?? resolveEntry;
  const root = options.root ?? vendored;
  const entries = { index: path.join(vendored, "index.ts") };
  const published = new Map([["index", "index"]]);
  const rekeyed = [];
  const claimed = new Map([["index", "index"]]);

  for (const subpath of subpaths) {
    const file = await resolve(subpath);
    if (file === undefined) continue;
    if (entries[subpath] !== undefined) {
      if (entries[subpath] !== file) {
        throw new Error(
          `subpath "${subpath}" resolved to both "${entries[subpath]}" and "${file}"`,
        );
      }
      continue;
    }
    const shadows = claimed.get(subpath.toLowerCase());
    if (shadows === undefined) {
      entries[subpath] = file;
      published.set(subpath, subpath);
      claimed.set(subpath.toLowerCase(), subpath);
      continue;
    }
    const relative = relativeEntryName(file, root);
    if (relative !== subpath && !claimed.has(relative.toLowerCase())) {
      entries[relative] = file;
      published.set(relative, subpath);
      claimed.set(relative.toLowerCase(), relative);
      rekeyed.push({ subpath, key: relative, shadows });
      continue;
    }
    // No alternative name: keep the flat one and let the guard report the pair.
    entries[subpath] = file;
    published.set(subpath, subpath);
  }

  assertNoCaseInsensitiveCollisions(entries);
  return { entries, published, rekeyed };
}
