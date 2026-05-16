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
  "role-model-router/apps/runtime-ui/app/lib/design-system.test.ts",
  "role-model-router/apps/runtime-ui/app/lib/design-system.ts",
  "role-model-router/apps/runtime-ui/app/lib/device-authorization.test.ts",
  "role-model-router/apps/runtime-ui/app/lib/device-authorization.ts",
  "role-model-router/apps/runtime-ui/app/lib/runtime-api.test.ts",
  "role-model-router/apps/runtime-ui/app/lib/runtime-api.ts",
  "role-model-router/apps/runtime-ui/app/lib/view-models.test.ts",
  "role-model-router/apps/runtime-ui/app/root.tsx",
  "role-model-router/apps/runtime-ui/app/routes/control-controller.tsx",
  "role-model-router/apps/runtime-ui/app/routes/control-models.tsx",
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

describe("run31 bounded Biome regression for run78", () => {
  it("requires the run78 Biome blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  });
});
