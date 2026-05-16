import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const execFileAsync = promisify(execFile);

function buildBiomeCommand() {
  return "corepack pnpm exec biome check .";
}

async function runRepoWideBiomeCheck() {
  const command = buildBiomeCommand();

  if (process.platform === "win32") {
    return execFileAsync("cmd.exe", ["/c", command], {
      cwd: repoRoot,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    });
  }

  return execFileAsync("sh", ["-lc", command], {
    cwd: repoRoot,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
}

describe("run31 repo-wide Biome parity", () => {
  it("requires repo-wide biome check to pass under repository config", async () => {
    await runRepoWideBiomeCheck();
  }, 15_000);
});
