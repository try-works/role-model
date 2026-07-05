import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(
  "D:/DEV/role-model/.worktrees/60-runtime-ui-paper-linear-review-alignment/role-model-router/apps/runtime-ui/package.json",
);
const { chromium } = require("@playwright/test");

const runtimeBaseUrl = "http://127.0.0.1:3470";
const evidenceDir =
  "D:/DEV/role-model/.worktrees/60-runtime-ui-paper-linear-review-alignment/.recursive/run/60-runtime-ui-paper-linear-review-alignment/evidence";

const targets = [
  {
    slug: "observe-requests-mock-preview-2026-07-04.png",
    fullSlug: "observe-requests-mock-preview-full-2026-07-04.png",
    route: "/app/observe/requests?preview=mock",
    heading: "Telemetry request ledger",
  },
  {
    slug: "observe-routing-mock-preview-2026-07-04.png",
    fullSlug: "observe-routing-mock-preview-full-2026-07-04.png",
    route: "/app/observe/routing?preview=mock",
    heading: "Routing analytics",
  },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1400 } });

for (const target of targets) {
  await page.goto(`${runtimeBaseUrl}${target.route}&ts=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
  await page.getByRole("heading", { name: target.heading, exact: true }).waitFor({
    state: "visible",
    timeout: 10000,
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(evidenceDir, target.slug) });
  await page.screenshot({ path: path.join(evidenceDir, target.fullSlug), fullPage: true });
}

await browser.close();
