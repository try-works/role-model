import { expect, test } from "@playwright/test";

const requestId = process.env.RUN96_CORRELATION_REQUEST_ID?.trim();

test.describe("@recursive:96-message-graph-replay-evaluation-learning @sp5 @live", () => {
  test("joins the Pi-correlated decision view to native storage inventory without false readiness", async ({
    page,
  }) => {
    test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "rebuilt development runtime URL required");
    test.skip(!requestId, "Pi-observed Run 96 correlation request identity required");
    if (!requestId) {
      return;
    }

    const [storageResponse, decisionResponse] = await Promise.all([
      page.request.get("/api/role-model/storage-retention"),
      page.request.get(`/api/role-model/router/decisions/${encodeURIComponent(requestId)}`),
    ]);
    expect(storageResponse.ok()).toBeTruthy();
    expect(decisionResponse.ok()).toBeTruthy();
    const storage = (await storageResponse.json()) as {
      storageInventory?: {
        uniquePhysicalBytes?: number;
        physicalResources?: unknown[];
      };
    };
    expect(storage.storageInventory?.uniquePhysicalBytes).toEqual(expect.any(Number));
    expect(storage.storageInventory?.physicalResources?.length).toBeGreaterThan(0);

    await page.goto(`/app/observe/requests/${encodeURIComponent(requestId)}`);
    await expect(page.getByText(requestId, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Routing receipts", { exact: true })).toBeVisible();

    await page.goto("/app/system/storage-retention");
    await expect(page.getByRole("heading", { name: "Physical storage inventory" })).toBeVisible();
    const summary = page.getByLabel("Storage retention summary");
    // The summary strip reports the measured physical, logical, reclaimable,
    // and unattributed totals with their unit-suffixed labels; the logical
    // class breakdown and the unattributed explanation live below it.
    await expect(summary.getByText("Physical bytes", { exact: true })).toBeVisible();
    await expect(summary.getByText("Logical bytes", { exact: true })).toBeVisible();
    await expect(summary.getByText("Reclaimable bytes", { exact: true })).toBeVisible();
    await expect(summary.getByText("Unattributed bytes", { exact: true })).toBeVisible();
    await expect(summary.getByText("Legal holds", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Observation state" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Enforcement" })).toHaveCount(0);

    await test.info().attach("run96-p5-08-reconciliation", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});
