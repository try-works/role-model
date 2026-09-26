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
 */
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const here = import.meta.dirname;
const vendored = path.resolve(here, "..", "..", "..", "vendor", "effect", "packages", "effect", "src");

const entries = {
  index: path.join(vendored, "index.ts"),
  "unstable-persistence": path.join(vendored, "unstable", "persistence", "index.ts"),
  "unstable-sql": path.join(vendored, "unstable", "sql", "index.ts"),
  "unstable-workflow": path.join(vendored, "unstable", "workflow", "index.ts"),
};

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

console.log(JSON.stringify({ status: "PASS", package: "effect", entries: Object.keys(entries) }));
