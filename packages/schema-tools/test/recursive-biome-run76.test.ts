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
  "role-model-router/apps/runtime-host-bridge/src/validate-ui.ts",
  "role-model-router/apps/runtime-host-bridge/src/validate-vendors.ts",
  "role-model-router/apps/runtime-host-bridge/test/executable.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/index.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/litellm-catalog.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/local-policy.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/runtime-assets.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/unified-runtime-config.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/validate-operations.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/validate-tools.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/validate-ui.test.ts",
  "role-model-router/apps/runtime-host-bridge/test/validate-vendors.test.ts",
  "role-model-router/apps/runtime-ui/app/app.css",
  "role-model-router/apps/runtime-ui/app/components/app-shell.tsx",
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

describe("run31 bounded Biome regression for run76", () => {
  it("requires the run76 Biome blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  });
});
