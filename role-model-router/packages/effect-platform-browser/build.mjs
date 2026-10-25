import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { build } from "esbuild";

import { assembleEntries } from "./entries.mjs";

/**
 * Run 115 S3c (R5): build the first-party @role-model-router/effect-platform-browser wrapper
 * from the vendored @effect/platform-browser source tree.
 *
 * The vendored package publishes source directly, so each entry is bundled from its vendored
 * .ts file. `effect` and its subpaths stay external (never bundled): the workspace Effect
 * wrapper is the single runtime instance. This package is a browser graph: it must not contain
 * a Node builtin, @effect/platform-node or @effect/platform-node-shared.
 */
const here = import.meta.dirname;
const repoRoot = path.resolve(here, "..", "..", "..");
const packageDir = path.join(repoRoot, "vendor", "effect", "packages", "platform", "browser");
const sourceDir = path.join(packageDir, "src");
const distDir = path.join(here, "dist");
const typesDir = path.join(distDir, "types");

const { entries, bySubpath } = await assembleEntries({ packageDir });

await rm(distDir, { recursive: true, force: true });
await mkdir(typesDir, { recursive: true });

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
  external: ["effect", "effect/*"],
});

/**
 * Declarations: the wrapper `exports` map points `types` at `dist/types/<key>.d.ts`.
 * `--noCheck` is deliberate: declaration EMIT needs syntax, not type state, and the vendored
 * tree imports the external `effect` peer. The per-entry existence check below is the gate.
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
  // The vendored tree imports the external effect peer; the per-entry check below is the gate.
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

/**
 * Subpath type shims: tsc mirrors the source layout (`dist/types/<rel>.d.ts`), while the
 * wrapper exposes `dist/types/<subpath>.d.ts`.
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
    `/** Run 115 S3c: generated declaration shim for the published "${subpath}" subpath - see build.mjs. */\nexport * from "${target}";\n`,
    "utf8",
  );
}

console.log(
  JSON.stringify({
    status: "PASS",
    package: "@role-model-router/effect-platform-browser",
    entries: Object.keys(entries).sort(),
    subpaths: [...bySubpath.keys()].sort(),
    warnings: result.warnings.length,
    warningDetails: result.warnings.slice(0, 5).map((warning) => warning.text.slice(0, 200)),
  }),
);
