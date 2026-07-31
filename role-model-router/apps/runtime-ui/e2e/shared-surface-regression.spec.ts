import { type APIRequestContext, type Page, expect, test } from "@playwright/test";

async function capture(page: Page, file: string, fullPage = false) {
  const outputPath = test.info().outputPath(file);
  await page.screenshot({ path: outputPath, fullPage });
}

function chartCardByTitle(page: Page, title: string) {
  return page.locator('[data-slot="chart-card"]').filter({
    has: page.locator('[data-slot="chart-card-title"]', { hasText: title }),
  });
}

async function assertTimeSeriesGeometry(page: Page, title: string, _expectedAxisCount: number) {
  const card = chartCardByTitle(page, title);
  const plot = card.locator('[data-slot="chart-card-plot"]');
  const legend = card.locator('[data-slot="chart-card-legend"]');
  const firstLegendItem = legend.locator(":scope > div").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toBeVisible();
  await expect(plot.locator(".recharts-surface").first()).toBeVisible({ timeout: 15_000 });
  await expect(legend).toBeVisible();
  await expect(firstLegendItem).toBeVisible();

  const cardBox = await card.boundingBox();
  const plotBox = await plot.boundingBox();
  const legendBox = await firstLegendItem.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(plotBox).not.toBeNull();
  expect(legendBox).not.toBeNull();
  if (!cardBox || !plotBox || !legendBox) {
    return;
  }

  expect(plotBox.height).toBeGreaterThanOrEqual(120);
  // Legend inset matches plot/X (RM3 rule #2); plot fills card width without a centered stub.
  expect(legendBox.x - plotBox.x).toBeGreaterThanOrEqual(11);
  const plotLeftInset = plotBox.x - cardBox.x;
  const plotRightInset = cardBox.x + cardBox.width - (plotBox.x + plotBox.width);
  expect(Math.abs(plotLeftInset - plotRightInset)).toBeLessThanOrEqual(2);
}

async function seedTelemetryFailureRequest(request: APIRequestContext, model: string) {
  const response = await request.post("/v1/chat/completions", {
    data: {
      model,
      messages: [{ role: "user", content: `Seed deterministic telemetry row for ${model}.` }],
    },
  });

  expect([400, 503]).toContain(response.status());
}

function createUniqueModelId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

test("keeps shared typography and tokenized controls aligned on seeded QA routes", async ({
  page,
}) => {
  await page.goto("/app/observe/requests");
  await expect(page.getByRole("heading", { name: "Telemetry request ledger" })).toBeVisible();
  // RM3: primary filters live in PageFilters (header/content), not a FactCard "Analytics controls" strip.
  await expect(page.getByText("Time range", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Advanced controls", { exact: true })).toBeVisible();
  await capture(page, "qa-shared-observe-requests.png");

  await page.goto("/app/remote/providers");
  await expect(
    page.getByRole("heading", { name: "Configured provider connections" }),
  ).toBeVisible();
  await expect(page.getByText("Choose provider and models", { exact: true })).toBeVisible();
  await expect(page.getByText(/runtime roles assigned\./).first()).toBeVisible();
  await capture(page, "qa-shared-remote-providers.png");

  await page.goto("/app/models");
  await expect(page.getByRole("heading", { name: "Model inventory" })).toBeVisible();
  const kimiInventoryCard = page.locator("article").filter({ hasText: "moonshot/kimi-k2.5" });
  await expect(kimiInventoryCard).toContainText("moonshot/kimi-k2.5");
  await kimiInventoryCard.getByRole("button", { name: "Inspect" }).click();
  await page.getByText("Edit role bindings", { exact: true }).click();
  await expect(page.getByRole("link", { name: "Manage role definitions" }).first()).toBeVisible();
  await expect(page.getByText("Runtime roles", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save bindings" }).first()).toBeVisible();
  await capture(page, "qa-shared-models-role-bindings.png", true);

  await page.goto("/app/connect");
  await expect(page.getByText("Runtime connections", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View alias posture → Router" })).toBeVisible();
  await capture(page, "qa-shared-connect-runtime-connections.png", true);
});

test("supports filter changes, query-param restoration, and request-list narrowing on the request analytics surface", async ({
  page,
  request,
}) => {
  const firstModelId = createUniqueModelId("browser-request-filter-a");
  const secondModelId = createUniqueModelId("browser-request-filter-b");
  await seedTelemetryFailureRequest(request, firstModelId);
  await seedTelemetryFailureRequest(request, secondModelId);

  await page.goto("/app/observe/requests");

  await expect(page.getByText("Time range", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Advanced controls")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Telemetry request ledger" })).toBeVisible();
  await expect(page.getByText(firstModelId)).toBeVisible();
  await expect(page.getByText(secondModelId)).toBeVisible();

  await page.getByText("Advanced controls", { exact: true }).click();
  const modelIdField = page.getByRole("textbox", { name: "Model id" });
  await modelIdField.fill(secondModelId);

  await expect(page).toHaveURL(new RegExp(`modelId=${secondModelId}`));
  await expect(page.getByRole("link", { name: "Inspect" })).toHaveCount(1);
  await expect(page.getByText(secondModelId)).toBeVisible();
  await expect(page.getByText(firstModelId)).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Telemetry request ledger" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Model id" })).toHaveValue(secondModelId);
  await expect(page.getByRole("link", { name: "Inspect" })).toHaveCount(1);
  await expect(page.getByText(secondModelId)).toBeVisible();
});

test("supports request inspection drill-in from request analytics", async ({ page, request }) => {
  const modelId = createUniqueModelId("browser-request-drill-in");
  await seedTelemetryFailureRequest(request, modelId);
  await page.goto("/app/observe/requests");

  await expect(page.getByRole("heading", { name: "Telemetry request ledger" })).toBeVisible();
  await page.getByText("Advanced controls", { exact: true }).click();
  await page.getByRole("textbox", { name: "Model id" }).fill(modelId);

  const inspectLink = page.getByRole("link", { name: "Inspect" }).first();
  await expect(inspectLink).toBeVisible();
  await inspectLink.click();
  await expect(page).toHaveURL(/\/app\/observe\/requests\/[^/]+$/);
  await expect(page.getByRole("link", { name: "Back to request ledger" })).toBeVisible();
  await expect(page.getByText(modelId, { exact: true })).toBeVisible();
});

test("renders shared time-series charts without clipped axes and with inset legends", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(page.getByRole("heading", { name: "Runtime overview" })).toBeVisible();
  await assertTimeSeriesGeometry(page, "Latency Trend", 1);
  await assertTimeSeriesGeometry(page, "Cache Efficiency", 2);
  await assertTimeSeriesGeometry(page, "Token Usage Over Time", 1);
  await assertTimeSeriesGeometry(page, "Success vs Failure", 1);
  await capture(page, "qa-overview-cache-efficiency.png");

  await page.goto("/app/observe/requests");
  await expect(page.getByRole("heading", { name: "Telemetry request ledger" })).toBeVisible();
  await assertTimeSeriesGeometry(page, "Cache Efficiency Trend", 2);
  await capture(page, "qa-observe-cache-efficiency.png");
});

test("renders deterministic request-detail token and cache provenance", async ({ page }) => {
  await page.goto("/app/observe/requests/qa-telemetry-measured-001");
  await expect(page.getByText("120000 · measured", { exact: true })).toBeVisible();
  await expect(page.getByText("explicit", { exact: true })).toBeVisible();
  await capture(page, "qa-request-detail-token-provenance.png");

  await page.goto("/app/observe/requests/qa-telemetry-estimated-001");
  await expect(page.getByText("107 · estimated", { exact: true })).toBeVisible();
  await expect(page.getByText("synthesized", { exact: true })).toBeVisible();

  await page.goto("/app/observe/requests/qa-telemetry-unavailable-001");
  await expect(page.getByText("n/a · unavailable", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("0 · measured", { exact: true })).toHaveCount(0);
});
