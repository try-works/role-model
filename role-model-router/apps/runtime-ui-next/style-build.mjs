import { pathToFileURL } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const legacyModules = path.join(here, "../runtime-ui/node_modules");
const viteEntry = path.join(legacyModules, "vite/dist/node/index.js");
if (!existsSync(viteEntry)) throw new Error("Tailwind/Vite missing; run corepack pnpm --filter @role-model-router/runtime-ui install");
const tailwindEntry = path.join(legacyModules, "@tailwindcss/vite/dist/index.mjs");
const { build } = await import(pathToFileURL(viteEntry).href);
const tailwindcss = (await import(pathToFileURL(tailwindEntry).href)).default;
await build({
  configFile: false,
  logLevel: "warn",
  plugins: [tailwindcss()],
  root: here,
  build: {
    assetsDir: "",
    emptyOutDir: true,
    outDir: "dist/css",
    rollupOptions: {
      input: path.join(here, "src/generated-client.css"),
      output: { assetFileNames: "main.css" },
    },
  },
});
