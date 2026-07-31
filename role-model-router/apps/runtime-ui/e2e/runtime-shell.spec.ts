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
  await page
    .getByRole("button", { name: /moonshot\/kimi-k2\.5/i })
    .first()
    .click();
  await expect(page.getByText("tasks under each role")).toBeVisible();
  await expect(page.getByRole("button", { name: "Make primary controller" })).toBeVisible();
  await page.getByRole("link", { name: "Open Roles" }).click();
  await expect(page.getByRole("heading", { name: "Runtime roles" })).toBeVisible();

  await page.goto("/app/system/session-readiness");

  await expect(page.getByText("Bootstrap", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Host health", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Authority", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Endpoints", { exact: true }).first()).toBeVisible();
});
