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
  "role-model-router/packages/adapter-execution/package.json",
  "role-model-router/packages/openai-compat/tsconfig.json",
  "role-model-router/packages/process-supervisor/package.json",
  "role-model-router/packages/process-supervisor/tsconfig.json",
  "role-model-router/packages/profile-aggregator/package.json",
  "role-model-router/packages/profile-aggregator/tsconfig.json",
  "role-model-router/packages/protocol-routing/package.json",
  "role-model-router/packages/protocol-routing/tsconfig.json",
  "role-model-router/packages/provider-account/package.json",
  "role-model-router/packages/provider-account/tsconfig.json",
  "role-model-router/packages/provider-acp/package.json",
  "role-model-router/packages/provider-acp/tsconfig.json",
  "role-model-router/packages/provider-anthropic/package.json",
  "role-model-router/packages/provider-anthropic/tsconfig.json",
  "role-model-router/packages/provider-cli/package.json",
  "role-model-router/packages/provider-cli/tsconfig.json",
  "role-model-router/packages/provider-litellm/package.json",
  "role-model-router/packages/provider-mcp/package.json",
  "role-model-router/packages/provider-mcp/tsconfig.json",
  "role-model-router/packages/provider-openai/tsconfig.json",
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

describe("run31 bounded Biome regression for local provider config format batch", () => {
  it("requires the local provider config format blocker set to pass under repository config", async () => {
    await runBoundedBiomeCheck();
  });
});
