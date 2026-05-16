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
  "role-model-router/apps/runtime-ui/app/routes/integrations-downstream.tsx",
  "role-model-router/apps/runtime-ui/app/routes/endpoints.tsx",
  "role-model-router/apps/runtime-ui/app/routes/integrations-upstream.tsx",
  "role-model-router/apps/runtime-ui/app/routes/local-logs.tsx",
  "role-model-router/apps/runtime-ui/app/routes/local-matrix.tsx",
  "role-model-router/apps/runtime-ui/app/routes/local-peers.tsx",
  "role-model-router/vendor/llama-swap/ui-svelte/src/lib/chatApi.ts",
  "role-model-router/vendor/llama-swap/ui-svelte/src/lib/audioApi.ts",
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

describe("run31 bounded Biome regression for run80", () => {
  it("requires the run80 Biome blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  });
});
