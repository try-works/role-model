import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
/**
 * Run 115 S80: resolve the CSS toolchain like a normal dependency first, so a clean
 * `pnpm install` in this package provides it. The legacy app's node_modules is only a
 * fallback for an un-installed checkout, and falling back is reported rather than silent.
 */
const legacyModules = path.join(here, "../runtime-ui/node_modules");
async function loadDependency(name, legacyRelativePath) {
  try {
    return await import(name);
  } catch (primaryError) {
    const legacyEntry = path.join(legacyModules, legacyRelativePath);
    if (!existsSync(legacyEntry)) {
      throw new Error(
        `Cannot resolve ${name}. Install the workspace dependencies (corepack pnpm install) so @role-model-router/runtime-ui-next has its own copy of the CSS toolchain.`,
      );
    }
    console.warn(
      `[style-build] falling back to ../runtime-ui/node_modules for ${name}; run pnpm install so this package owns its toolchain.`,
    );
    return await import(pathToFileURL(legacyEntry).href);
  }
}
const { build } = await loadDependency("vite", "vite/dist/node/index.js");
const tailwindcss = (await loadDependency("@tailwindcss/vite", "@tailwindcss/vite/dist/index.mjs"))
  .default;
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
