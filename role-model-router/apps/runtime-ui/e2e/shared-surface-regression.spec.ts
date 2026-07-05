import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { type Page, expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const evidenceDir = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "..",
  ".recursive",
  "run",
  "60-runtime-ui-paper-linear-review-alignment",
  "evidence",
  "runtime-batch-2026-07-04",
);

async function capture(page: Page, file: string, fullPage = false) {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: path.join(evidenceDir, file), fullPage });
}

test("keeps shared typography and tokenized controls aligned on seeded QA routes", async ({
  page,
}) => {
  await page.goto("/app/observe/requests");
  await expect(page.getByRole("heading", { name: "Telemetry request ledger" })).toBeVisible();
  await expect(page.getByText("Analytics controls", { exact: true })).toBeVisible();
  await expect(page.getByText("Advanced controls", { exact: true })).toBeVisible();
  await capture(page, "qa-shared-observe-requests.png");

  await page.goto("/app/remote/providers");
  await expect(
    page.getByRole("heading", { name: "Configured provider connections" }),
  ).toBeVisible();
  await expect(page.getByText("Choose provider and models", { exact: true })).toBeVisible();
  await expect(page.getByText("All runtime roles assigned.", { exact: true })).toBeVisible();
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
});
