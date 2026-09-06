import { expect, test } from "@playwright/test";

const requestId = process.env.RUN96_CORRELATION_REQUEST_ID?.trim();

test.describe("@recursive:96-message-graph-replay-evaluation-learning @sp5 @live", () => {
  test("joins the Pi-correlated decision view to native storage inventory without false readiness", async ({
    page,
  }) => {
    test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "rebuilt development runtime URL required");
    test.skip(!requestId, "Pi-observed Run 96 correlation request identity required");

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
    await expect(page.getByText(/Router.*Open detail|Open detail.*Router/).first()).toBeVisible();

    await page.goto("/app/system/storage-retention");
    await expect(page.getByRole("heading", { name: "Physical storage inventory" })).toBeVisible();
    const summary = page.getByLabel("Storage retention summary");
    await expect(summary.getByText("Physical", { exact: true })).toBeVisible();
    await expect(summary.getByText("Logical classes", { exact: true })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Observation state" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Enforcement" })).toHaveCount(0);

    await test.info().attach("run96-p5-08-reconciliation", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});
