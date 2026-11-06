import { existsSync, readFileSync, statSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Bundles the Foldkit runtime UI into a static client the packaged runtime can
// serve via --static-root. Uses the repository's esbuild; adds no dependency.
import { build } from "esbuild";

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

await import("./style-build.mjs");
const cssTarget = path.join(outDir, "assets", "main.css");
await cp(path.join(here, "dist", "css", "main.css"), cssTarget);
const cssBytes = statSync(cssTarget).size;
if (cssBytes < 10_000)
  throw new Error(`generated stylesheet is empty or truncated: ${String(cssBytes)}`);
await cp(
  path.join(here, "../runtime-ui/public/assets/fonts"),
  path.join(outDir, "assets", "fonts"),
  { recursive: true },
);
const emittedCss = readFileSync(cssTarget, "utf8");
const unresolved = [...emittedCss.matchAll(/url\(([^)]+)\)/g)]
  .map((match) => (match[1] ?? "").trim().replace(/^["\']|["\']$/g, ""))
  .filter((ref) => ref.length > 0 && !ref.startsWith("data:") && !ref.startsWith("http"))
  .filter((ref) => {
    const resolved = ref.startsWith("/")
      ? path.join(outDir, ref.slice(1))
      : path.resolve(path.dirname(cssTarget), ref);
    return !existsSync(resolved);
  });
if (unresolved.length > 0) {
  throw new Error(`generated stylesheet references unserved assets: ${unresolved.join(", ")}`);
}
await cp(path.join(here, "index.html"), path.join(outDir, "index.html"));
console.log(JSON.stringify({ status: "PASS", outDir }));
