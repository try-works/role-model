import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const execFileAsync = promisify(execFile);

const boundedBiomePaths = [
  "role-model-router/vendor/llama-swap/ui-svelte/src/main.ts",
  "role-model-router/vendor/llama-swap/ui-svelte/src/lib/speechApi.ts",
  "role-model-router/vendor/llama-swap/ui-svelte/src/lib/sdApi.ts",
  "role-model-router/vendor/llama-swap/ui-svelte/src/lib/rerankApi.ts",
  "role-model-router/vendor/llama-swap/ui-svelte/src/lib/modelUtils.ts",
  "role-model-router/vendor/llama-swap/ui-svelte/src/lib/markdown.ts",
  "role-model-router/vendor/llama-swap/ui-svelte/src/lib/markdown.test.ts",
  "role-model-router/vendor/llama-swap/ui-svelte/src/lib/imageApi.ts",
  "role-model-router/apps/runtime-host-bridge/src/index.ts",
];

function buildBiomeCommand() {
  return `corepack pnpm exec biome check ${boundedBiomePaths.join(" ")}`;
}

async function runBoundedBiomeCheck() {
  const command = buildBiomeCommand();

  if (process.platform === "win32") {
    return execFileAsync("cmd.exe", ["/c", command], {
      cwd: repoRoot,
      windowsHide: true,
    });
  }

  return execFileAsync("sh", ["-lc", command], {
    cwd: repoRoot,
    windowsHide: true,
  });
}

describe("run31 bounded Biome regression for run77", () => {
  it("requires the run77 Biome blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  });
});
