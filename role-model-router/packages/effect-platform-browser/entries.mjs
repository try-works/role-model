import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/**
 * Run 115 S3c (R5): entry discovery for the first-party
 * `@role-model-router/effect-platform-browser` wrapper.
 *
 * The vendored `@effect/platform-browser` manifest publishes SOURCE directly: the root maps to
 * `./src/index.ts` and a one-segment wildcard maps to `./src/<name>.ts`, while the internal
 * wildcard, the `index` subpath and the per-directory index pattern are blocked (null targets).
 * This module expands that manifest into the concrete published surface
 * (the wildcard is expanded against the vendored src directory), refuses a target shape it does
 * not understand, and fails loudly if a mapped source file is missing.
 */
const here = import.meta.dirname;
const repoRoot = path.resolve(here, "..", "..", "..");

export const vendoredPackageDir = path.join(
  repoRoot,
  "vendor",
  "effect",
  "packages",
  "platform",
  "browser",
);

/** The public exports map of the vendored package - the source of truth for entry discovery. */
export async function readPublishedExports(packageDir = vendoredPackageDir) {
  const manifestPath = path.join(packageDir, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.exports === undefined || typeof manifest.exports !== "object") {
    throw new Error(`vendored package ${manifestPath} publishes no exports map`);
  }
  return manifest.exports;
}

/** The published target must be a vendored source file (`./src/*.ts`), never a build output. */
function targetSpecifier(target, subpath) {
  const specifier =
    typeof target === "string" ? target : (target?.import ?? target?.default ?? target?.types);
  if (
    typeof specifier !== "string" ||
    !specifier.startsWith("./src/") ||
    !specifier.endsWith(".ts")
  ) {
    throw new Error(
      `published export "${subpath}" does not resolve to a ./src/*.ts source file: ${JSON.stringify(target)}`,
    );
  }
  return specifier;
}

/**
 * Expand the vendored exports map into concrete published subpaths -> source files. Explicit keys
 * win, `null` targets block a subpath, and a wildcard key is expanded against the directory its
 * target names.
 */
export async function publishedSourcePaths(packageDir, exportsMap) {
  const published = exportsMap ?? (await readPublishedExports(packageDir));
  const blocked = new Set(Object.keys(published).filter((key) => published[key] === null));
  const subpaths = new Map();

  for (const [subpath, target] of Object.entries(published)) {
    if (target === null || subpath.includes("*")) continue;
    const specifier =
      typeof target === "string" ? target : (target?.import ?? target?.default ?? target?.types);
    // `./package.json` is metadata re-exported by the wrapper manifest, not a module entry.
    if (typeof specifier === "string" && specifier.endsWith(".json")) continue;
    subpaths.set(subpath, targetSpecifier(target, subpath));
  }

  for (const [subpath, target] of Object.entries(published)) {
    if (target === null || !subpath.includes("*")) continue;
    const specifier = targetSpecifier(target, subpath);
    if ((specifier.match(/\*/g) ?? []).length !== 1) {
      throw new Error(`wildcard export "${subpath}" must contain exactly one "*": ${specifier}`);
    }
    const [prefix, suffix] = subpath.split("*");
    const [targetPrefix, targetSuffix] = specifier.split("*");
    const extension = targetSuffix;
    if (!/^\.[A-Za-z0-9]+$/.test(extension)) {
      throw new Error(`wildcard export "${subpath}" must end in a file extension: ${specifier}`);
    }
    const directory = path.join(packageDir, targetPrefix);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(extension)) continue;
      const candidate = `${prefix}${entry.name.slice(0, -extension.length)}${suffix}`;
      if (blocked.has(candidate) || subpaths.has(candidate)) continue;
      const relative = path
        .relative(packageDir, path.join(directory, entry.name))
        .replaceAll("\\", "/");
      subpaths.set(candidate, `./${relative}`);
    }
  }

  return subpaths;
}

/**
 * Exact-name existence check. `readdir` never folds case, so a source file whose spelling differs
 * from the manifest is reported as missing instead of being opened through a case-insensitive
 * filesystem.
 */
async function exactFile(file) {
  try {
    for (const entry of await readdir(path.dirname(file))) {
      if (entry === path.basename(file)) return file;
    }
  } catch {
    // A missing parent directory means the candidate cannot exist either.
  }
  return undefined;
}

/** The esbuild entry map: `index` for the package root and the published subpath otherwise. */
export async function assembleEntries({ packageDir = vendoredPackageDir, exportsMap } = {}) {
  const subpaths = await publishedSourcePaths(packageDir, exportsMap);
  const entries = {};
  const bySubpath = new Map();
  const missing = [];

  for (const [subpath, sourceRelative] of subpaths) {
    const resolved = await exactFile(
      path.join(packageDir, ...sourceRelative.replace(/^\.\//, "").split("/")),
    );
    if (resolved === undefined) {
      missing.push(`${subpath} -> ${sourceRelative}`);
      continue;
    }
    const key = subpath === "." ? "index" : subpath.slice(2);
    if (entries[key] !== undefined) throw new Error(`duplicate wrapper entry "${key}"`);
    entries[key] = resolved;
    bySubpath.set(subpath, resolved);
  }

  if (missing.length > 0) {
    throw new Error(
      `published export(s) without a vendored source file: ${missing.join(", ")}. The vendored drop is source-only, so a mapped source file that does not exist would silently disappear from the wrapper.`,
    );
  }

  return { entries, bySubpath };
}

/** The wrapper `exports` map implied by the resolved entries (the build and its test share it). */
export function renderWrapperExports(bySubpath) {
  const exportsMap = { "./package.json": "./package.json" };
  for (const subpath of [...bySubpath.keys()].sort()) {
    const key = subpath === "." ? "index" : subpath.slice(2);
    exportsMap[subpath] = {
      types: `./dist/types/${key}.d.ts`,
      import: `./dist/${key}.js`,
      default: `./dist/${key}.js`,
    };
  }
  return exportsMap;
}
