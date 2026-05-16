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
  "packages/conformance/src/router-fixture-conformance.test.ts",
  "packages/schema-tools/src/validate-schemas.ts",
  "protocol/fixtures/router-golden/cases/advisory-vs-hard-budget.json",
  "protocol/fixtures/router-golden/cases/latency-strategy-prefers-faster.json",
  "protocol/fixtures/router-golden/cases/measured-profile-partial-coverage.json",
  "protocol/schemas/router-decision.schema.json",
  "role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts",
  "role-model-router/apps/gateway-smoke/src/index.ts",
  "role-model-router/apps/runtime-host-bridge/src/litellm-catalog.ts",
  "role-model-router/apps/runtime-host-bridge/src/package-sea.ts",
  "role-model-router/apps/runtime-host-bridge/src/unified-runtime-config.ts",
  "role-model-router/apps/runtime-host-bridge/src/validate-host.ts",
  "role-model-router/apps/runtime-host-bridge/src/validate-operations.ts",
  "role-model-router/apps/runtime-host-bridge/src/validate-packaging.ts",
  "role-model-router/apps/runtime-host-bridge/src/validate-tools.ts",
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

describe("run31 bounded Biome regression for run75", () => {
  it("requires the run75 Biome blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  });
});
