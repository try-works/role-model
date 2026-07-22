import { expect, test } from "@playwright/test";

test("operates the packaged Track B runtime and cloud-backed recommendation flow", async ({ page }) => {
  test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

  await page.goto("/app/system/extensions");
  await expect(page.getByRole("heading", { name: "Contribution, disclosure, and opt-out" })).toBeVisible();

  const optOut = page.getByRole("button", { name: "Opt out & clear queue" });
  if (await optOut.isVisible()) await optOut.click();
  await expect(page.getByText("consumer · none")).toBeVisible();
  await page.getByRole("button", { name: "Re-enable contribution" }).click();
  await expect(page.getByText(/pending_disclosure · epoch/)).toBeVisible();
  await page.getByRole("button", { name: "Review disclosure & authorize" }).click();
  await expect(page.getByText(/active · epoch/)).toBeVisible();

  const signatureStatus = page.getByText(/Signature valid · Local policy allows apply/);
  if (!(await signatureStatus.isVisible()))
    await page.getByRole("button", { name: "Download & validate latest" }).click();
  await expect(signatureStatus).toBeVisible();
  await page.getByRole("button", { name: "Validate & apply" }).click();
  await expect(page.getByText("applied", { exact: true })).toBeVisible();
  await expect(page.getByText(/^route-[a-f0-9]{16}$/).first()).toBeVisible();

  await page.goto("/app/system/storage-retention");
  await expect(page.getByRole("heading", { name: "Retention policy editor" })).toBeVisible();
  await expect(page.getByText("rich_trace").first()).toBeVisible();
  await page.getByRole("button", { name: "Dry-run" }).click();
  await expect(page.getByText(/\d+ affected · [\d.]+ (?:B|KiB|MiB) · Rollback-safe/).first()).toBeVisible();
  await page.getByRole("button", { name: "Execute plan" }).click();
  const cancel = page.getByRole("button", { name: "Cancel job" });
  if (await cancel.isVisible()) {
    await cancel.click();
    await expect(page.getByText(/cancelled · 0%/)).toBeVisible();
  }

  await page.getByRole("button", { name: "Dry-run" }).click();
  await page.getByRole("button", { name: "Execute plan" }).click();
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByText(/completed · 100%/)).toBeVisible();
  await page.getByRole("button", { name: "Rollback" }).last().click();
  await expect(page.getByText("rolled_back", { exact: true }).last()).toBeVisible();
  await expect(page.getByText("rich_trace").first()).toBeVisible();
});
