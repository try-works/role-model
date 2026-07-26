import { expect, test } from "@playwright/test";

/** Structural v1 ceremony material for host bootstrap (HMAC verify stays private KW). */
const RUN84_BOOTSTRAP_RECEIPT = {
  payload: {
    kind: "knowledge_validation",
    groupDigest: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewed: true,
    safetyReviewed: true,
    redacted: true,
    holdoutPassed: true,
  },
  signature: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
} as const;

const RUN84_GROUP_DIGEST = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test.describe("@recursive:84-kw-ui-toggle-gated-retrieve-eval @kw-ui-toggle", () => {
  test("prepares shadow-ready, turns production ON, then soft OFFs Knowledge Worker", async ({
    page,
  }) => {
    test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

    await page.goto("/app/system/extensions");
    await expect(page.getByRole("main").getByText(/knowledge-worker/i).first()).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByText(/Production retrieve is gated/i).first()).toBeVisible();

    const kwCard = page.locator("article").filter({ hasText: /knowledge-worker/i }).first();
    await expect(kwCard).toBeVisible();

    // Production ON requires installed+enabled; packaged state may start disabled.
    // SelectField is a custom listbox (not a native <select>).
    const modeTrigger = kwCard.getByRole("button", { name: /Disabled|Active|Shadow|Advisory|Bounded/i });
    const setMode = kwCard.getByRole("button", { name: "Set mode" });
    const enabledModeText = (await kwCard.getByText(/Enabled mode/i).locator("..").textContent()) ?? "";
    if (/disabled/i.test(enabledModeText)) {
      await modeTrigger.click();
      await page.getByRole("option", { name: /^Active$/i }).click();
      await expect(setMode).toBeEnabled();
      await setMode.click();
      await expect(kwCard.getByText(/Enabled mode/i).locator("..")).toContainText(/Active/i, {
        timeout: 30_000,
      });
    }

    const prepare = kwCard.getByRole("button", { name: "Prepare shadow-ready" });
    const productionOn = kwCard.getByRole("button", { name: "Production ON" });
    const softOff = kwCard.getByRole("button", { name: "Soft OFF" });

    await expect(kwCard.getByText("Production OFF").first()).toBeVisible();

    if (await prepare.isVisible()) {
      await kwCard
        .getByLabel(/Knowledge validation receipt JSON/i)
        .fill(JSON.stringify(RUN84_BOOTSTRAP_RECEIPT));
      await kwCard.getByLabel(/Shadow group digest/i).fill(RUN84_GROUP_DIGEST);
      await expect(prepare).toBeEnabled({ timeout: 10_000 });
      await prepare.click();
      await expect(prepare).toBeHidden({ timeout: 30_000 });
    }

    await expect(productionOn).toBeEnabled({ timeout: 30_000 });
    await productionOn.click();
    await expect(kwCard.getByText("Production ON").first()).toBeVisible({ timeout: 30_000 });
    await expect(softOff).toBeEnabled();

    await softOff.click();
    await expect(kwCard.getByText("Production OFF").first()).toBeVisible({ timeout: 30_000 });

    await page.screenshot({
      path: process.env.RUN84_SCREENSHOT_DIR
        ? `${process.env.RUN84_SCREENSHOT_DIR}/kw-ui-toggle-pass.png`
        : "test-results/kw-ui-toggle-pass.png",
      fullPage: true,
    });
  });
});
