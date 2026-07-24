import { expect, test } from "@playwright/test";

test.describe("@recursive:81-kw-activation-browser-recommendation-evidence @browser-recommendations", () => {
  test("downloads, previews, applies, and dismisses recommendations in the Extensions UI", async ({
    page,
  }) => {
    test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

    await page.goto("/app/system/extensions");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Signed recommendations" }),
    ).toBeVisible({ timeout: 60_000 });

    await expect(
      page.getByText(/productionActivation stays fail-closed by default/i),
    ).toBeVisible();

    const download = page.getByRole("button", { name: "Download & validate latest" });
    await expect(download).toBeEnabled();

    // Prefer existing validated rows; otherwise download. Re-download may 400 when already current.
    let apply = page.getByRole("button", { name: "Validate & apply" }).first();
    if (!(await apply.isVisible().catch(() => false))) {
      const [downloadResponse] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().includes("/api/role-model/recommendations/download") &&
            candidate.request().method() === "POST",
        ),
        download.click(),
      ]);
      expect(
        downloadResponse.ok() || downloadResponse.status() === 400,
        `download status ${downloadResponse.status()}`,
      ).toBeTruthy();
      apply = page.getByRole("button", { name: "Validate & apply" }).first();
    }

    await expect(apply).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Signature valid/i).first()).toBeVisible();
    await apply.scrollIntoViewIfNeeded();

    const [applyResponse] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          candidate.url().includes("/api/role-model/recommendations/apply") &&
          candidate.request().method() === "POST",
      ),
      apply.click(),
    ]);
    expect(applyResponse.ok()).toBeTruthy();
    await expect(page.getByText("Applied").first()).toBeVisible();

    // Always reseed-driven dismiss path: download after apply should surface a non-applied row.
    await page.waitForTimeout(500);
    const [downloadAgain] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          candidate.url().includes("/api/role-model/recommendations/download") &&
          candidate.request().method() === "POST",
      ),
      download.click(),
    ]);
    expect(downloadAgain.ok() || downloadAgain.status() === 400).toBeTruthy();
    const dismiss = page.getByRole("button", { name: "Dismiss" }).first();
    await expect(dismiss).toBeVisible({ timeout: 30_000 });
    await expect(dismiss).toBeEnabled();
    const [dismissResponse] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          candidate.url().includes("/api/role-model/recommendations/dismiss") &&
          candidate.request().method() === "POST",
      ),
      dismiss.click(),
    ]);
    expect(dismissResponse.ok()).toBeTruthy();
    await expect(page.getByText("Dismissed").first()).toBeVisible();
    await page.screenshot({
      path: process.env.RUN81_SCREENSHOT_DIR
        ? `${process.env.RUN81_SCREENSHOT_DIR}/browser-dev-dismiss-pass.png`
        : "test-results/browser-dev-dismiss-pass.png",
      fullPage: true,
    });
  });
});
