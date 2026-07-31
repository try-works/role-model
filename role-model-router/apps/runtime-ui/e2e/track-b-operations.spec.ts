import { expect, test } from "@playwright/test";

test("operates disclosure, opt-out, retention, recommendations, and failure isolation", async ({
  page,
}) => {
  await page.goto("/app/system/extensions");

  await expect(page.getByText("pending_disclosure · epoch 0")).toBeVisible();
  await page.getByRole("button", { name: "Review disclosure & authorize" }).click();
  await expect(page.getByText("active · epoch 0")).toBeVisible();

  await page.getByRole("button", { name: "Opt out & clear queue" }).click();
  await expect(page.getByText("consumer · none")).toBeVisible();
  await expect(page.getByText("revoked · epoch 1")).toBeVisible();

  await page.getByRole("button", { name: "Re-enable contribution" }).click();
  await expect(page.getByText("pending_disclosure · epoch 2")).toBeVisible();

  await page.getByRole("button", { name: "Download & validate latest" }).click();
  await expect(page.getByText(/recommendation service trust is not configured/i)).toBeVisible();
  await expect(
    page.getByRole("main").getByRole("heading", { name: "Extension boundary" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Set mode" }).first()).toBeVisible();
  await expect(page.getByLabel("Mode").first()).toBeVisible();

  await page.goto("/app/system/storage-retention");
  await expect(page.getByRole("heading", { name: "Retention policy" })).toBeVisible();
  await page.getByLabel("Maximum bytes").fill("1024");
  await page.getByLabel("Maximum age (days)").fill("1");
  await page.getByRole("button", { name: "Save policy" }).click();
  await page.getByRole("button", { name: "Dry-run" }).click();
  await expect(page.getByText(/0 affected · 0 B ·/)).toBeVisible();
  await page.getByRole("button", { name: "Execute plan" }).click();
  // QA bridge has no private operations sidecar; execute must fail closed (same boundary as unit tests).
  await expect(
    page.getByText(/private operations endpoint is required for retention execution/i),
  ).toBeVisible();
});
