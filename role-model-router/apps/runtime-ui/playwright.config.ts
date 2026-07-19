import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const runtimeQaPort = 3462;

const browserChannel = process.platform === "win32" && !process.env.CI ? "msedge" : undefined;

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://127.0.0.1:${runtimeQaPort}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    channel: browserChannel,
  },
  webServer: {
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
    },
  },
});
