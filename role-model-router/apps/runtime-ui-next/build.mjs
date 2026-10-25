// Bundles the Foldkit runtime UI into a static client the packaged runtime can
// serve via --static-root. Uses the repository's esbuild; adds no dependency.
import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
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

const cssSource = path.join(here, "../runtime-ui/build/client/assets/root-DB32G0ZY.css");
const cssTarget = path.join(outDir, "assets", "main.css");
if (!existsSync(cssSource)) throw new Error("design-system stylesheet missing: " + cssSource);
await cp(cssSource, cssTarget);
const cssBytes = statSync(cssTarget).size;
if (cssBytes < 10_000) throw new Error("design-system stylesheet is empty or truncated: " + String(cssBytes));
await cp(path.join(here, "../runtime-ui/build/client/assets/fonts"), path.join(outDir, "assets", "fonts"), { recursive: true });
await cp(path.join(here, "index.html"), path.join(outDir, "index.html"));
console.log(JSON.stringify({ status: "PASS", outDir }));
