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
  "apps/docs-site/package.json",
  "apps/docs-site/tsconfig.json",
  "package.json",
  "packages/conformance/package.json",
  "packages/conformance/tsconfig.json",
  "packages/packaging/package.json",
  "packages/packaging/tsconfig.json",
  "packages/protocol-types/package.json",
  "packages/protocol-types/tsconfig.json",
  "packages/schema-tools/package.json",
  "packages/schema-tools/tsconfig.json",
  "packages/store-contract/package.json",
  "packages/store-contract/tsconfig.json",
  "role-model-router/apps/bench-cli/package.json",
  "role-model-router/apps/bench-cli/tsconfig.json",
  "role-model-router/apps/gateway-smoke/tsconfig.json",
  "role-model-router/apps/router-devtools/tsconfig.json",
  "role-model-router/apps/runtime-host-bridge/tsconfig.json",
  "testdata/traces/sample-trace.json",
  "tsconfig.base.json",
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

describe("run31 bounded Biome regression for local config format batch", () => {
  it("requires the local config format blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  }, 15_000);
});
