import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(
  "D:/DEV/role-model/.worktrees/60-runtime-ui-paper-linear-review-alignment/role-model-router/apps/runtime-ui/package.json",
);
const { chromium } = require("@playwright/test");

const runtimeBaseUrl = "http://127.0.0.1:3468";
const evidenceDir =
  "D:/DEV/role-model/.worktrees/60-runtime-ui-paper-linear-review-alignment/.recursive/run/60-runtime-ui-paper-linear-review-alignment/evidence";

const reviewPages = [
  { slug: "studio-chat", route: "/app/studio/chat", heading: "Chat workspace", group: "studio" },
  {
    slug: "studio-images",
    route: "/app/studio/images",
    heading: "Image workflows",
    group: "studio",
  },
  {
    slug: "studio-audio",
    route: "/app/studio/audio",
    heading: "Audio workflows",
    group: "studio",
  },
  { slug: "studio-rerank", route: "/app/studio/rerank", heading: "Rerank", group: "studio" },
  {
    slug: "studio-advanced",
    route: "/app/studio/advanced",
    heading: "Advanced APIs",
    group: "studio",
  },
  {
    slug: "local-choose",
    route: "/app/local/choose",
    heading: "Choose local backend",
    group: "local",
  },
  {
    slug: "local-peer-models",
    route: "/app/local/peer-models",
    heading: "Peer models",
    group: "local",
  },
  {
    slug: "local-matrix",
    route: "/app/local/llama-swap/matrix",
    heading: "Llama-swap matrix",
    group: "local",
  },
  {
    slug: "local-policy",
    route: "/app/local/llama-swap/policy",
    heading: "Llama-swap host policy",
    group: "local",
  },
  {
    slug: "local-endpoints",
    route: "/app/local/endpoints",
    heading: "Local endpoints",
    group: "local",
  },
  {
    slug: "local-swap",
    route: "/app/local/llama-swap/swap",
    heading: "Llama-swap swap history",
    group: "local",
  },
  {
    slug: "local-logs",
    route: "/app/local/llama-swap/logs",
    heading: "Llama-swap logs",
    group: "local",
  },
  {
    slug: "remote-providers",
    route: "/app/remote/providers",
    heading: "Remote providers",
    group: "remote",
  },
  {
    slug: "configured-models",
    route: "/app/models",
    heading: "Configured models",
    group: "models-router",
  },
  {
    slug: "runtime-roles",
    route: "/app/models/roles",
    heading: "Runtime roles",
    group: "models-router",
  },
  {
    slug: "capability-benchmark",
    route: "/app/models/benchmark",
    heading: "Capability benchmark",
    group: "models-router",
  },
  {
    slug: "router-overview",
    route: "/app/router",
    heading: "Routing overview",
    group: "models-router",
  },
  {
    slug: "router-decisions",
    route: "/app/router/decisions",
    heading: "Routing decisions",
    group: "models-router",
  },
  {
    slug: "router-strategy",
    route: "/app/router/strategy",
    heading: "Routing strategy",
    group: "models-router",
  },
  {
    slug: "router-controller",
    route: "/app/router/controller",
    heading: "Routing controller",
    group: "models-router",
  },
  {
    slug: "router-config",
    route: "/app/router/config",
    heading: "Routing config",
    group: "models-router",
  },
  {
    slug: "router-candidates",
    route: "/app/router/candidates",
    heading: "Candidate inventory",
    group: "models-router",
  },
  { slug: "observe-logs", route: "/app/observe/logs", heading: "Host logs", group: "observe" },
  {
    slug: "observe-activity",
    route: "/app/observe/activity",
    heading: "Host activity and metrics",
    group: "observe",
  },
  {
    slug: "observe-requests",
    route: "/app/observe/requests",
    heading: "Telemetry request ledger",
    group: "observe",
  },
  {
    slug: "observe-routing",
    route: "/app/observe/routing",
    heading: "Routing analytics",
    group: "observe",
  },
  {
    slug: "connect-registry",
    route: "/app/connect",
    heading: "Available models & endpoints",
    group: "connect-system",
  },
  {
    slug: "connect-downstream",
    route: "/app/connect/downstream",
    heading: "Connect your application",
    group: "connect-system",
  },
  {
    slug: "connect-upstream",
    route: "/app/connect/upstream",
    heading: "Upstream passthrough",
    group: "connect-system",
  },
  {
    slug: "system-runtime",
    route: "/app/system/runtime",
    heading: "Runtime topology",
    group: "connect-system",
  },
  {
    slug: "runtime-config",
    route: "/app/system/runtime-config",
    heading: "Runtime config",
    group: "connect-system",
  },
  {
    slug: "session-readiness",
    route: "/app/system/session-readiness",
    heading: "Session readiness",
    group: "connect-system",
  },
  { slug: "system-peers", route: "/app/system/peers", heading: "Peers", group: "connect-system" },
];

async function capturePage(page, { route, heading, slug }) {
  const url = `${runtimeBaseUrl}${route}?ts=${Date.now()}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(800);
  try {
    await page.locator("main").getByRole("heading", { name: heading, exact: true }).waitFor({
      state: "visible",
      timeout: 4000,
    });
  } catch {}
  const screenshotPath = path.join(evidenceDir, `${slug}-batch-review-2026-07-04.png`);
  await page.screenshot({ path: screenshotPath });
  return screenshotPath;
}

async function captureDynamicRequestDetail(page) {
  const listUrl = `${runtimeBaseUrl}/app/observe/requests?ts=${Date.now()}`;
  await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(800);

  const detailLink = page.locator('a[href^="/app/observe/requests/"]').first();
  if ((await detailLink.count()) === 0) {
    return null;
  }

  const href = await detailLink.getAttribute("href");
  if (!href) {
    return null;
  }

  await page.goto(`${runtimeBaseUrl}${href}?ts=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(800);
  const screenshotPath = path.join(evidenceDir, "observe-request-detail-batch-review-2026-07-04.png");
  await page.screenshot({ path: screenshotPath });
  return screenshotPath;
}

async function captureDynamicRouterDecisionDetail(page) {
  const listUrl = `${runtimeBaseUrl}/app/router/decisions?ts=${Date.now()}`;
  await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(800);

  const detailLink = page.locator('a[href^="/app/router/decisions/"]').first();
  if ((await detailLink.count()) === 0) {
    return null;
  }

  const href = await detailLink.getAttribute("href");
  if (!href) {
    return null;
  }

  await page.goto(`${runtimeBaseUrl}${href}?ts=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.locator("main").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(800);
  const screenshotPath = path.join(
    evidenceDir,
    "router-decision-detail-batch-review-2026-07-04.png",
  );
  await page.screenshot({ path: screenshotPath });
  return screenshotPath;
}

async function main() {
  await fs.mkdir(evidenceDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: process.platform === "win32" ? "msedge" : undefined,
  });

  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const manifest = [];

  try {
    for (const entry of reviewPages) {
      try {
        const screenshotPath = await capturePage(page, entry);
        manifest.push({ ...entry, screenshotPath });
      } catch (error) {
        manifest.push({
          ...entry,
          screenshotPath: null,
          unavailable: true,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    try {
      const requestDetailScreenshotPath = await captureDynamicRequestDetail(page);
      manifest.push({
        slug: "observe-request-detail",
        route: "/app/observe/requests/:requestId",
        heading: "Telemetry request detail",
        group: "observe",
        screenshotPath: requestDetailScreenshotPath,
        unavailable: requestDetailScreenshotPath === null,
      });
    } catch (error) {
      manifest.push({
        slug: "observe-request-detail",
        route: "/app/observe/requests/:requestId",
        heading: "Telemetry request detail",
        group: "observe",
        screenshotPath: null,
        unavailable: true,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      const routerDecisionDetailScreenshotPath = await captureDynamicRouterDecisionDetail(page);
      manifest.push({
        slug: "router-decision-detail",
        route: "/app/router/decisions/:requestId",
        heading: "Routing decision detail",
        group: "models-router",
        screenshotPath: routerDecisionDetailScreenshotPath,
        unavailable: routerDecisionDetailScreenshotPath === null,
      });
    } catch (error) {
      manifest.push({
        slug: "router-decision-detail",
        route: "/app/router/decisions/:requestId",
        heading: "Routing decision detail",
        group: "models-router",
        screenshotPath: null,
        unavailable: true,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } finally {
    await browser.close();
  }

  await fs.writeFile(
    path.join(evidenceDir, "remaining-pages-batch-review-manifest-2026-07-04.json"),
    JSON.stringify(manifest, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
