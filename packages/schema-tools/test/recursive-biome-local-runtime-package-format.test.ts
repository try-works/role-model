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
  "role-model-router/packages/provider-litellm/tsconfig.json",
  "role-model-router/packages/provider-openai/package.json",
  "role-model-router/packages/retrieval-receipt/package.json",
  "role-model-router/packages/roles/package.json",
  "role-model-router/packages/roles/tsconfig.json",
  "role-model-router/packages/runtime-observability/package.json",
  "role-model-router/packages/runtime-observability/tsconfig.json",
  "role-model-router/packages/runtime-web/package.json",
  "role-model-router/packages/runtime-web/tsconfig.json",
  "role-model-router/packages/sqlite-memory/tsconfig.json",
  "role-model-router/packages/tasks/package.json",
  "role-model-router/packages/tasks/tsconfig.json",
  "role-model-router/packages/tool-registry/package.json",
  "role-model-router/packages/tool-registry/tsconfig.json",
  "role-model-router/packages/trace/package.json",
  "role-model-router/packages/trace/tsconfig.json",
  "role-model-router/packages/usage/package.json",
  "role-model-router/packages/vendor-abstraction/package.json",
  "role-model-router/packages/vendor-abstraction/tsconfig.json",
  "testdata/router-runtime/routing-request.json",
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

describe("run31 bounded Biome regression for local runtime package format batch", () => {
  it("requires the local runtime package format blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  });
});
