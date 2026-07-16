import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:3483";
const evidenceDir = process.argv[3];
if (!evidenceDir) {
  throw new Error("Evidence directory argument is required.");
}

const playwrightUrl = pathToFileURL(
  path.join(process.cwd(), "node_modules", "@playwright", "test", "index.mjs"),
).href;
const { chromium } = await import(playwrightUrl);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function assertVisible(locator, description) {
  await locator.waitFor({ state: "visible", timeout: 15_000 });
  assert(await locator.isVisible(), `${description} is not visible.`);
}

async function measureChart(page, cardTestId, expectedAxisCount) {
  const card = page.getByTestId(cardTestId);
  const plot = card.getByTestId("telemetry-chart-plot");
  const firstLegendItem = card
    .getByTestId("telemetry-chart-legend")
    .getByTestId("telemetry-chart-legend-item")
    .first();
  await assertVisible(card, cardTestId);
  await assertVisible(plot, `${cardTestId} plot`);
  await assertVisible(firstLegendItem, `${cardTestId} first legend item`);
  const axes = plot.locator(".recharts-yAxis");
  await axes.nth(expectedAxisCount - 1).waitFor({ state: "visible", timeout: 15_000 });
  assert((await axes.count()) === expectedAxisCount, `${cardTestId} axis count mismatch.`);

  const cardBox = await card.boundingBox();
  const plotBox = await plot.boundingBox();
  const legendBox = await firstLegendItem.boundingBox();
  assert(cardBox && plotBox && legendBox, `${cardTestId} bounding boxes are unavailable.`);

  const ticks = plot.locator(".recharts-yAxis .recharts-cartesian-axis-tick-value");
  const tickCount = await ticks.count();
  assert(tickCount > 0, `${cardTestId} has no rendered Y-axis ticks.`);
  let minimumTickInset = Number.POSITIVE_INFINITY;
  for (let index = 0; index < tickCount; index += 1) {
    const tickBox = await ticks.nth(index).boundingBox();
    assert(tickBox, `${cardTestId} tick ${index} has no bounding box.`);
    minimumTickInset = Math.min(minimumTickInset, tickBox.x - cardBox.x);
    assert(tickBox.x >= cardBox.x - 1, `${cardTestId} tick ${index} clips left.`);
    assert(
      tickBox.x + tickBox.width <= cardBox.x + cardBox.width + 1,
      `${cardTestId} tick ${index} clips right.`,
    );
  }

  const legendInset = legendBox.x - plotBox.x;
  const plotLeftInset = plotBox.x - cardBox.x;
  const plotRightInset = cardBox.x + cardBox.width - (plotBox.x + plotBox.width);
  assert(legendInset >= 11, `${cardTestId} legend inset is ${legendInset}px.`);
  assert(
    Math.abs(plotLeftInset - plotRightInset) <= 2,
    `${cardTestId} plot insets differ by more than 2px.`,
  );

  return {
    cardTestId,
    axisCount: expectedAxisCount,
    tickCount,
    minimumTickInset,
    legendInset,
    plotLeftInset,
    plotRightInset,
  };
}

await mkdir(evidenceDir, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
const observations = {
  baseUrl,
  verifiedAt: new Date().toISOString(),
  routes: [],
  charts: [],
  requests: [],
};

try {
  await page.goto(`${baseUrl}/app`, { waitUntil: "domcontentloaded" });
  await assertVisible(page.getByRole("heading", { name: "Runtime overview" }), "overview heading");
  observations.routes.push("/app");
  observations.charts.push(
    await measureChart(page, "telemetry-chart-card-latency-trend", 1),
    await measureChart(page, "telemetry-chart-card-cache-efficiency", 2),
    await measureChart(page, "telemetry-chart-card-token-usage-over-time", 1),
    await measureChart(page, "telemetry-chart-card-success-vs-failure", 1),
  );
  await page.screenshot({ path: path.join(evidenceDir, "packaged-overview.png"), fullPage: true });

  await page.goto(`${baseUrl}/app/observe/requests`, { waitUntil: "domcontentloaded" });
  await assertVisible(
    page.getByRole("heading", { name: "Telemetry request ledger" }),
    "request ledger heading",
  );
  observations.routes.push("/app/observe/requests");
  observations.charts.push(
    await measureChart(page, "telemetry-chart-card-cache-efficiency-trend", 2),
  );
  await page.screenshot({
    path: path.join(evidenceDir, "packaged-observe-requests.png"),
    fullPage: true,
  });

  const requestChecks = [
    ["qa-telemetry-measured-001", "120000 · measured", "explicit"],
    ["qa-telemetry-estimated-001", "107 · estimated", "synthesized"],
    ["qa-telemetry-unavailable-001", "n/a · unavailable", null],
    ["qa-telemetry-zero-001", "0 · measured", "synthesized"],
    ["qa-telemetry-measured-002", "400 · normalized", "synthesized"],
  ];
  for (const [requestId, tokenText, cacheSource] of requestChecks) {
    const route = `/app/observe/requests/${requestId}`;
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await assertVisible(page.getByText(tokenText, { exact: true }).first(), `${requestId} token truth`);
    if (cacheSource) {
      await assertVisible(
        page.getByText(cacheSource, { exact: true }).first(),
        `${requestId} cache source`,
      );
    }
    if (requestId === "qa-telemetry-unavailable-001") {
      assert(
        (await page.getByText("0 · measured", { exact: true }).count()) === 0,
        "Unavailable request rendered a fabricated measured zero.",
      );
    }
    observations.routes.push(route);
    observations.requests.push({ requestId, tokenText, cacheSource });
    await page.screenshot({
      path: path.join(evidenceDir, `packaged-${requestId}.png`),
      fullPage: true,
    });
  }
} finally {
  await browser.close();
}

await writeFile(
  path.join(evidenceDir, "browser-observations.json"),
  `${JSON.stringify(observations, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify(observations, null, 2));
