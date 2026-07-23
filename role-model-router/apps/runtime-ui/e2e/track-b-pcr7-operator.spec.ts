import { expect, test } from "@playwright/test";
import path from "node:path";

/**
 * PCR7 operator surfaces that do not require a provisioned recommendation bundle.
 * Full cloud-backed apply remains covered by track-b-live.spec.ts when RUNTIME has signed recs.
 */
test("PCR7 contribution disclosure and retention operator surfaces", async ({ page }, testInfo) => {
  test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live runtime URL required");

  await page.goto("/app/system/extensions");
  await expect(page.getByRole("heading", { name: "Contribution, disclosure, and opt-out" })).toBeVisible();

  const optOut = page.getByRole("button", { name: "Opt out & clear queue" });
  if (await optOut.isVisible()) {
    const [response] = await Promise.all([
      page.waitForResponse((candidate) => candidate.url().includes("/api/role-model/contribution") && candidate.request().method() === "PUT"),
      optOut.click(),
    ]);
    expect(response.ok()).toBeTruthy();
  }
  await expect(page.getByText("consumer · none")).toBeVisible();

  const [reenableResponse] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().includes("/api/role-model/contribution") && candidate.request().method() === "PUT"),
    page.getByRole("button", { name: "Re-enable contribution" }).click(),
  ]);
  expect(reenableResponse.ok()).toBeTruthy();
  await expect(page.getByText(/pending_disclosure · epoch/)).toBeVisible();

  const [disclosureResponse] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().includes("/api/role-model/contribution") && candidate.request().method() === "PUT"),
    page.getByRole("button", { name: "Review disclosure & authorize" }).click(),
  ]);
  expect(disclosureResponse.ok()).toBeTruthy();
  await expect(page.getByText(/active · epoch/)).toBeVisible();

  const contributionShot = path.join(testInfo.outputDir, "contribution.png");
  await page.screenshot({ fullPage: true, path: contributionShot });
  await testInfo.attach("contribution", { path: contributionShot, contentType: "image/png" });

  await page.goto("/app/system/storage-retention");
  await expect(page.getByRole("heading", { name: "Retention policy editor" })).toBeVisible();
  await page.getByRole("button", { name: "Dry-run" }).click();
  await expect(page.getByText(/\d+ affected · [\d.]+ (?:B|KiB|MiB)/).first()).toBeVisible({ timeout: 15_000 });

  const retentionShot = path.join(testInfo.outputDir, "retention.png");
  await page.screenshot({ fullPage: true, path: retentionShot });
  await testInfo.attach("retention", { path: retentionShot, contentType: "image/png" });

  if (process.env.RUN00_EVIDENCE_SCREENSHOT) {
    await page.screenshot({ fullPage: true, path: process.env.RUN00_EVIDENCE_SCREENSHOT });
  }
});
