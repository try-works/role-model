import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const execFileAsync = promisify(execFile);
const shellExecutable = process.platform === "win32" ? "cmd.exe" : "sh";
const shellArguments = (command: string) =>
  process.platform === "win32" ? ["/c", command] : ["-lc", command];

async function runRuntimeHostBridgeBuild() {
  const command = "corepack pnpm run build";

  return execFileAsync(shellExecutable, shellArguments(command), {
    cwd: path.join(repoRoot, "role-model-router", "apps", "runtime-host-bridge"),
    windowsHide: true,
  });
}

describe("run31 runtime-host-bridge build regression", () => {
  it("requires @role-model-router/runtime-host-bridge to build cleanly under repository config", async () => {
    await runRuntimeHostBridgeBuild();
  }, 30_000);
});
