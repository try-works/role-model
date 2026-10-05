import { mkdir } from "node:fs/promises";
import path from "node:path";
/**
 * Run 101 / R1: build the vendored effect-mq tree into this workspace package's
 * `dist/` entry points.
 *
 * `effect` stays external so the built output imports the sibling `effect`
 * workspace package instead of carrying a second copy of the runtime.
 */
import { build } from "esbuild";

import { emitVendoredDeclarations } from "../emit-vendored-declarations.mjs";

const here = import.meta.dirname;
const repoRoot = path.resolve(here, "..", "..", "..");
const vendored = path.resolve(repoRoot, "vendor", "effect-mq", "packages", "effect-mq", "src");

const entries = {
  index: path.join(vendored, "index.ts"),
  testing: path.join(vendored, "testing", "index.ts"),
};

await mkdir(path.join(here, "dist"), { recursive: true });
await build({
  entryPoints: entries,
  outdir: path.join(here, "dist"),
  bundle: true,
  splitting: true,
  chunkNames: "chunks/[name]-[hash]",
  platform: "node",
  format: "esm",
  target: "node24",
  sourcemap: false,
  logLevel: "warning",
  external: ["effect", "effect/*", "@effect/*", "drizzle-orm", "drizzle-orm/*", "redis"],
});

console.log(
  JSON.stringify({ status: "PASS", package: "effect-mq", entries: Object.keys(entries) }),
);
await emitVendoredDeclarations({
  repoRoot,
  entryFiles: Object.values(entries),
  typesDir: path.join(here, "dist", "types"),
});
