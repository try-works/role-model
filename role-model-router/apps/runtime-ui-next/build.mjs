// Bundles the Foldkit runtime UI into a static client the packaged runtime can
// serve via --static-root. Uses the repository's esbuild; adds no dependency.
import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, "dist", "client");

await rm(outDir, { recursive: true, force: true });
await mkdir(path.join(outDir, "assets"), { recursive: true });

await build({
  entryPoints: [path.join(here, "src", "main.ts")],
  outfile: path.join(outDir, "assets", "main.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: "linked",
  logLevel: "info",
  define: { 
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "development"),
  },
});

await cp(path.join(here, "index.html"), path.join(outDir, "index.html"));
console.log(JSON.stringify({ status: "PASS", outDir }));
