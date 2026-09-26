/**
 * Run 101 / R1: build the vendored Effect v4 tree into this workspace package's
 * `dist/` entry points.
 *
 * The vendored tree is source-only and ships without the upstream repo-root
 * tsconfig its package tsconfigs extend, so test runners that resolve a
 * tsconfig per transformed file cannot consume the `.ts` sources directly.
 * Bundling once here keeps the shipped entry points plain ESM, keeps exactly
 * one Effect runtime instance in the graph, and leaves the vendored bytes
 * untouched.
 *
 * The published subpaths are discovered from the vendored Effect family
 * (Effect itself, effect-mq and the SQLite client), so the package exposes
 * exactly the `effect/<subpath>` specifiers the runtime actually imports.
 */
import { build } from "esbuild";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const here = import.meta.dirname;
const repoRoot = path.resolve(here, "..", "..", "..");
const vendored = path.join(repoRoot, "vendor", "effect", "packages", "effect", "src");

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

async function discoverEffectSubpaths() {
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

async function resolveEntry(subpath) {
  const candidate = path.join(vendored, ...subpath.split("/"));
  for (const file of [`${candidate}.ts`, path.join(candidate, "index.ts")]) {
    try {
      await readFile(file);
      return file;
    } catch {
      // keep looking
    }
  }
  // Some `effect/...` strings are internal ids the reachable entries resolve
  // themselves; skipping them is safe because esbuild fails the build below if
  // a published entry actually needs one.
  return undefined;
}

const subpaths = await discoverEffectSubpaths();
const entries = { index: path.join(vendored, "index.ts") };
const shims = [];
for (const subpath of subpaths) {
  const resolved = await resolveEntry(subpath);
  if (!resolved) continue;
  entries[subpath] = resolved;
  shims.push([subpath, path.relative(path.join(vendored, ".."), resolved).replaceAll("\\", "/")]);
}

await mkdir(path.join(here, "dist"), { recursive: true });
await mkdir(path.join(here, "src"), { recursive: true });
for (const [subpath, relativeTarget] of shims) {
  const shimPath = path.join(here, "src", `${subpath}.ts`);
  await mkdir(path.dirname(shimPath), { recursive: true });
  await writeFile(
    shimPath,
    [
      `/** Run 101 / R1: generated type shim for \`effect/${subpath}\` - see build.mjs. */`,
      `export * from "${relativeTarget}";`,
      "",
    ].join("\n"),
    "utf8",
  );
}

await build({
  entryPoints: entries,
  outdir: path.join(here, "dist"),
  bundle: true,
  // Code splitting keeps the shared Effect core in one chunk that every entry
  // imports, so the package ships exactly one runtime instance rather than one
  // copy per entry point.
  splitting: true,
  chunkNames: "chunks/[name]-[hash]",
  platform: "node",
  format: "esm",
  target: "node24",
  sourcemap: false,
  logLevel: "warning",
});

console.log(JSON.stringify({ status: "PASS", package: "effect", entries: Object.keys(entries).sort() }));
