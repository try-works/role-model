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
  "role-model-router/apps/runtime-ui/app/components/future-surface.tsx",
  "role-model-router/apps/runtime-ui/app/components/page-primitives.tsx",
  "role-model-router/apps/runtime-ui/app/routes/control-routing-strategy.tsx",
  "role-model-router/apps/runtime-ui/app/routes/control-runtime-config.tsx",
  "role-model-router/apps/runtime-ui/app/routes/dashboard.tsx",
  "role-model-router/vendor/llama-swap/ui-svelte/src/lib/histogram.test.ts",
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

describe("run31 bounded Biome regression for run79", () => {
  it("requires the run79 Biome blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  }, 15_000);
});
