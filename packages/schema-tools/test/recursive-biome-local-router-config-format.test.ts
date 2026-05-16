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
  "role-model-router/apps/gateway-smoke/package.json",
  "role-model-router/apps/router-devtools/package.json",
  "role-model-router/apps/runtime-host-bridge/package.json",
  "role-model-router/apps/runtime-ui/package.json",
  "role-model-router/apps/runtime-ui/tsconfig.json",
  "role-model-router/packages/adapter-execution/tsconfig.json",
  "role-model-router/packages/bench-core/package.json",
  "role-model-router/packages/bench-core/tsconfig.json",
  "role-model-router/packages/bench-judge/package.json",
  "role-model-router/packages/bench-judge/tsconfig.json",
  "role-model-router/packages/catalog/package.json",
  "role-model-router/packages/catalog/tsconfig.json",
  "role-model-router/packages/context-envelope/package.json",
  "role-model-router/packages/context-envelope/tsconfig.json",
  "role-model-router/packages/core/package.json",
  "role-model-router/packages/core/tsconfig.json",
  "role-model-router/packages/endpoint-registry/package.json",
  "role-model-router/packages/endpoint-registry/tsconfig.json",
  "role-model-router/packages/openai-compat/package.json",
  "testdata/router-runtime/routing-role-task.json",
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

describe("run31 bounded Biome regression for local router config format batch", () => {
  it("requires the local router config format blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  }, 15_000);
});
