import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
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
for (const subpath of subpaths) {
  const resolved = await resolveEntry(subpath);
  if (!resolved) continue;
  entries[subpath] = resolved;
}

await mkdir(path.join(here, "dist"), { recursive: true });

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

/**
 * Declarations: the vendored tree imports its own modules with explicit `.ts`
 * extensions, which TypeScript only accepts under `allowImportingTsExtensions`
 * - and that flag is only legal with `noEmit`/`emitDeclarationOnly`. Emitting
 * declarations here (with `--noCheck`, so the vendored tree's own type state
 * cannot fail the build) and rewriting the emitted `.ts` specifiers to `.js`
 * gives consumers real types without changing vendored bytes.
 */
const typesDir = path.join(here, "dist", "types");
await mkdir(typesDir, { recursive: true });
/**
 * Declaration emit covers the subpaths the queue stack consumes: every core
 * namespace plus `unstable/persistence`, `unstable/sql/*` and
 * `unstable/reactivity/*`. The remaining published subpaths are runtime-only in
 * this run - emitting them would drag optional peers (for example the AI and
 * CLI trees) into the declaration program, which `--noCheck` still has to
 * resolve.
 */
const declarationEntries = Object.entries(entries).filter(
  ([subpath]) =>
    !subpath.includes("/") ||
    subpath === "index" ||
    subpath.startsWith("unstable/persistence") ||
    subpath.startsWith("unstable/sql/") ||
    subpath === "unstable/sql" ||
    subpath.startsWith("unstable/reactivity"),
);
const declarationEntryFiles = declarationEntries.map(([, file]) => file);
try {
  execFileSync(
    process.execPath,
    [
      path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"),
      "--noCheck",
      "--emitDeclarationOnly",
      "--declaration",
      "--allowImportingTsExtensions",
      "--module",
      "nodenext",
      "--moduleResolution",
      "nodenext",
      "--target",
      "es2022",
      "--skipLibCheck",
      "--outDir",
      typesDir,
      ...declarationEntryFiles,
    ],
    { stdio: "pipe" },
  );
} catch {
  // The vendored tree references optional peers (for example the test helpers)
  // that are not part of this repository; tsc reports them after emitting the
  // declarations we need. The per-entry check below is the real gate.
}
const missingDeclarations = declarationEntryFiles.filter((entryFile) => {
  const relative = path.relative(vendored, entryFile).replace(/\.ts$/, ".d.ts");
  return !existsSync(path.join(typesDir, relative));
});
if (missingDeclarations.length > 0) {
  throw new Error(
    `declaration emit missed ${missingDeclarations.length} entry point(s): ${missingDeclarations
      .slice(0, 3)
      .join(", ")}`,
  );
}
/**
 * The `./*` export map points `types` at `dist/types/<subpath>.d.ts`, while tsc
 * mirrors the source layout (a directory entry emits `<subpath>/index.d.ts`).
 * Write the thin shim so both shapes resolve.
 */
for (const [subpath, entryFile] of declarationEntries) {
  const emitted = path.join(typesDir, path.relative(vendored, entryFile).replace(/\.ts$/, ".d.ts"));
  const shimPath = path.join(typesDir, `${subpath}.d.ts`);
  if (!existsSync(emitted) || existsSync(shimPath)) continue;
  const relativeTarget = path
    .relative(path.dirname(shimPath), emitted)
    .replaceAll("\\", "/")
    .replace(/\.d\.ts$/, ".js");
  const target = relativeTarget.startsWith(".") ? relativeTarget : `./${relativeTarget}`;
  await mkdir(path.dirname(shimPath), { recursive: true });
  await writeFile(
    shimPath,
    `/** Run 101 / R1: generated declaration shim for \`effect/${subpath}\` - see build.mjs. */\nexport * from "${target}";\n`,
    "utf8",
  );
}
for (const file of await readdir(typesDir, { recursive: true, withFileTypes: true })) {
  if (!file.isFile() || !file.name.endsWith(".d.ts")) continue;
  const filePath = path.join(file.parentPath ?? file.path, file.name);
  const source = await readFile(filePath, "utf8");
  const rewritten = source.replace(
    /(from\s+|import\()(["'])([^"']+)\.ts\2/g,
    (_match, prefix, quote, specifier) => `${prefix}${quote}${specifier}.js${quote}`,
  );
  if (rewritten !== source) {
    await writeFile(filePath, rewritten, "utf8");
  }
}

console.log(
  JSON.stringify({
    status: "PASS",
    package: "effect",
    entries: Object.keys(entries).sort(),
    types: typesDir,
  }),
);
