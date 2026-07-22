import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const runtimeQaPort = 3462;
const runtimeQaStateRoot = path.join(os.tmpdir(), `role-model-runtime-qa-playwright-${process.pid}`);
const liveBaseUrl = process.env.RUNTIME_LIVE_BASE_URL?.trim();

const browserChannel = process.platform === "win32" && !process.env.CI ? "msedge" : undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: liveBaseUrl || `http://127.0.0.1:${runtimeQaPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    channel: browserChannel,
  },
  webServer: liveBaseUrl ? undefined : {
    command: [
      `corepack pnpm --dir "${repoRoot}" --filter @role-model-router/runtime-ui run build`,
      `corepack pnpm --dir "${repoRoot}" --filter @role-model-router/runtime-host-bridge exec tsx scripts/start-for-qa.ts`,
    ].join(" && "),
    url: `http://127.0.0.1:${runtimeQaPort}/healthz`,
    reuseExistingServer: false,
    timeout: 120_000,
    cwd: repoRoot,
    env: {
      ...process.env,
      RUNTIME_QA_PORT: String(runtimeQaPort),
      RUNTIME_QA_STATE_ROOT: runtimeQaStateRoot,
      RUNTIME_QA_RESET_STATE: "1",
    },
  },
});
