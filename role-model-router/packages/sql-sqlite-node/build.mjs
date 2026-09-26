import { mkdir } from "node:fs/promises";
import path from "node:path";
/**
 * Run 101 / R2: build the vendored `@effect/sql-sqlite-node` client into this
 * workspace package's `dist/`. The client only needs `node:sqlite`, which Node
 * 24 ships, so nothing has to be unpacked beside the packaged runtime.
 */
import { build } from "esbuild";

import { emitVendoredDeclarations } from "../emit-vendored-declarations.mjs";

const here = import.meta.dirname;
const repoRoot = path.resolve(here, "..", "..", "..");
const vendored = path.join(repoRoot, "vendor", "effect", "packages", "sql", "sqlite-node", "src");

await mkdir(path.join(here, "dist"), { recursive: true });
await build({
  entryPoints: { index: path.join(vendored, "index.ts") },
  outdir: path.join(here, "dist"),
  bundle: true,
  splitting: true,
  chunkNames: "chunks/[name]-[hash]",
  platform: "node",
  format: "esm",
  target: "node24",
  sourcemap: false,
  logLevel: "warning",
  external: ["effect", "effect/*", "@effect/*"],
});

console.log(
  JSON.stringify({ status: "PASS", package: "@effect/sql-sqlite-node", entries: ["index"] }),
);
await emitVendoredDeclarations({
  repoRoot,
  entryFiles: [path.join(vendored, "index.ts")],
  typesDir: path.join(here, "dist", "types"),
});
