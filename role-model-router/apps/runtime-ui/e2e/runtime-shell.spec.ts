import { expect, test } from "@playwright/test";

test("keeps provider maintenance absent while showing configured connections", async ({ page }) => {
  const latestIdsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/role-model/requests/latest-ids?limit=10") &&
      response.request().method() === "GET",
  );

  await page.goto("/app/remote/providers");

  await expect(
    page.getByRole("heading", { name: "Configured provider connections" }),
  ).toBeVisible();

  await expect(page.getByText("Saved provider maintenance", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Archived stale diagnostics", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId(/provider-maintenance-/)).toHaveCount(0);

  const latestIdsResponse = await latestIdsResponsePromise;
  expect(latestIdsResponse.status()).toBe(200);
  const latestIds = await latestIdsResponse.json();
  expect(Array.isArray(latestIds)).toBe(true);
  expect(latestIds.length).toBeLessThanOrEqual(10);
  expect(
    latestIds.every((requestId: unknown) => typeof requestId === "string" && requestId.length > 0),
  ).toBe(true);

  await page.goto("/app/models");

  await expect(page.getByRole("heading", { name: "Model inventory" })).toBeVisible();
  const kimiInventoryCard = page.locator("article").filter({ hasText: "moonshot/kimi-k2.5" });
  await expect(kimiInventoryCard).toContainText("moonshot/kimi-k2.5");
  await kimiInventoryCard.getByRole("button", { name: "Inspect" }).click();
  const selectedModelDetail = page.locator("section").filter({ hasText: "Selected model detail" });
  await expect(selectedModelDetail.getByText("Backing account role bindings")).toBeVisible();
  await expect(
    selectedModelDetail.getByText("moonshot.personal.primary • healthy", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save bindings" })).toBeVisible();
  await page.getByText("Edit role bindings", { exact: true }).click();
  await expect(page.getByRole("link", { name: "Manage role definitions" }).first()).toBeVisible();

  await page.goto("/app/system/session-readiness");

  await expect(page.getByText("Bootstrap status")).toBeVisible();
  await expect(page.getByText("Lifecycle authority")).toBeVisible();
  await expect(page.getByText("Execution mode")).toBeVisible();
  await expect(page.getByText("Routable endpoints").first()).toBeVisible();
});
