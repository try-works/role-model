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
  "biome.json",
  "testdata/catalog/litellm-model-prices.json",
  "packages/conformance/src/protocol-fixture-conformance.test.ts",
  "role-model-router/vendor/llama-swap/ui-svelte/src/routes/Models.svelte",
  "role-model-router/vendor/llama-swap/ui-svelte/src/routes/LogViewer.svelte",
  "role-model-router/vendor/llama-swap/ui-svelte/src/routes/Activity.svelte",
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

describe("run31 bounded Biome regression", () => {
  it("requires the run74 Biome blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  }, 15_000);
});
