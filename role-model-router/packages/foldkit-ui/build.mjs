import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { build } from "esbuild";

import { assembleEntries } from "./entries.mjs";

/**
 * Run 115 S3b (R6/R5): build the first-party @role-model-router/foldkit-ui wrapper from the vendored
 * @foldkit/ui source tree.
 *
 * It exposes the published `@foldkit/ui` subpath map; the `foldkit` peer is rewritten to the first-party wrapper and stays external, and `@floating-ui/dom` stays external.
 *
 * The published manifest maps subpaths to ./dist/*, which this repository does not vendor, so
 * the entry list is derived from the vendored exports map (entries.mjs) and each entry is
 * bundled from its vendored .ts source. `effect` and its subpaths stay external (never
 * bundled); `@effect/platform-browser` is the browser platform package.
 * `@effect/platform-node` and the vendored vite-plugin-foldkit must never enter this graph.
 */
const here = import.meta.dirname;
const repoRoot = path.resolve(here, "..", "..", "..");
const packageDir = path.join(repoRoot, "vendor", "foldkit", "packages", "ui");
const sourceDir = path.join(packageDir, "src");
const distDir = path.join(here, "dist");
const typesDir = path.join(distDir, "types");

const { entries, bySubpath } = await assembleEntries({ packageDir });

await rm(distDir, { recursive: true, force: true });
await mkdir(typesDir, { recursive: true });

const foldkitPeer = {
  name: "foldkit-peer-specifier",
  setup(buildApi) {
    // @foldkit/ui imports its framework peer as `foldkit` and `foldkit/<subpath>`; in this
    // workspace that peer is the first-party wrapper, so rewrite the specifier and keep it
    // external (one shared foldkit instance, never bundled into foldkit-ui).
    buildApi.onResolve({ filter: /^foldkit(\/.*)?$/ }, (args) => ({
      path: args.path.replace(/^foldkit/, "@role-model-router/foldkit"),
      external: true,
    }));
  },
};

const result = await build({
  entryPoints: entries,
  outdir: distDir,
  bundle: true,
  splitting: true,
  chunkNames: "chunks/[name]-[hash]",
  platform: "browser",
  format: "esm",
  target: "es2022",
  sourcemap: false,
  logLevel: "warning",
  external: [
    "effect",
    "effect/*",
    "@floating-ui/dom",
    "vitest",
    "@effect/vitest",
    "@effect/vitest/*",
  ],
  plugins: [foldkitPeer],
});

/**
 * Declarations: the wrapper `exports` map points `types` at `dist/types/<key>.d.ts`. The
 * vendored sources import their siblings with `.js` specifiers, so tsc resolves them without
 * a rewriting pass. `--noCheck` is deliberate: some optional peers of the vendored tree are
 * not installed here, and declaration EMIT needs syntax, not type state. The per-entry
 * existence check below is the gate, exactly like the Effect wrapper declaration step.
 */
const declarationProject = path.join(typesDir, "tsconfig.emit.json");
await writeFile(
  declarationProject,
  JSON.stringify(
    {
      extends: path.relative(typesDir, path.join(here, "tsconfig.json")).replaceAll("\\", "/"),
      files: [...bySubpath.values()].map((file) =>
        path.relative(typesDir, file).replaceAll("\\", "/"),
      ),
    },
    null,
    2,
  ),
);
try {
  execFileSync(
    process.execPath,
    [
      path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"),
      "--project",
      declarationProject,
    ],
    { stdio: "pipe" },
  );
} catch {
  // Optional peers referenced by the vendored tree are absent; the per-entry check below is
  // the real gate.
}

const missingDeclarations = [...bySubpath.entries()].filter(([, file]) => {
  const relative = path.relative(sourceDir, file).replace(/\.ts$/, ".d.ts");
  return !existsSync(path.join(typesDir, relative));
});
if (missingDeclarations.length > 0) {
  throw new Error(
    `declaration emit missed ${missingDeclarations.length} entry point(s): ${missingDeclarations
      .slice(0, 3)
      .map(([subpath, file]) => `${subpath} (${path.relative(sourceDir, file)})`)
      .join(", ")}`,
  );
}

/** Every .d.ts under the emitted tree, recursively. */
function* allDeclarationFiles(root) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) yield* allDeclarationFiles(entryPath);
    else if (entry.name.endsWith(".d.ts")) yield entryPath;
  }
}

/**
 * Subpath type shims: tsc mirrors the source layout (`dist/types/<rel>.d.ts`), while the
 * wrapper exposes `dist/types/<subpath>.d.ts`. Write the thin re-export unless tsc already
 * emitted that exact path (the `test/vitest` entry does).
 */
for (const [subpath, file] of bySubpath) {
  if (subpath === ".") continue;
  const key = subpath.slice(2);
  const emitted = path.join(typesDir, path.relative(sourceDir, file).replace(/\.ts$/, ".d.ts"));
  const shimPath = path.join(typesDir, `${key}.d.ts`);
  if (existsSync(shimPath)) continue;
  const relativeTarget = path
    .relative(path.dirname(shimPath), emitted)
    .replaceAll("\\", "/")
    .replace(/\.d\.ts$/, ".js");
  const target = relativeTarget.startsWith(".") ? relativeTarget : `./${relativeTarget}`;
  await mkdir(path.dirname(shimPath), { recursive: true });
  await writeFile(
    shimPath,
    `/** Run 115 S3b: generated declaration shim for the published "${subpath}" subpath - see build.mjs. */\nexport * from "${target}";\n`,
    "utf8",
  );
}

/**
 * Run 115 S14b: the RUNTIME rewrite is esbuild's job, but tsc emits the declaration
 * files from the vendored sources, which import the upstream bare name `foldkit/...`.
 * Left alone, consumers of this wrapper resolve types against a package that is not
 * installed here (the app had to ship a `paths` shim to work around it). Rewrite the
 * module specifiers in every emitted .d.ts so types and runtime agree.
 */
const bareSpecifier = /((?:from|import\()\s*)'foldkit(\/[^']*)?'/g;
for (const file of allDeclarationFiles(typesDir)) {
  const source = await readFile(file, "utf8");
  const rewritten = source.replace(bareSpecifier, (_match, prefix, subpath) => {
    return prefix + "'@role-model-router/foldkit" + (subpath ?? "") + "'";
  });
  if (rewritten !== source) await writeFile(file, rewritten, "utf8");
}

console.log(
  JSON.stringify({
    status: "PASS",
    package: "@role-model-router/foldkit-ui",
    entries: Object.keys(entries).sort(),
    subpaths: [...bySubpath.keys()].sort(),
    warnings: result.warnings.length,
    warningDetails: result.warnings.slice(0, 5).map((warning) => warning.text.slice(0, 200)),
  }),
);