import { expect, test } from "@playwright/test";

test("shows seeded provider maintenance and session readiness over the rebuilt runtime", async ({
  page,
}) => {
  const latestIdsResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/role-model/requests/latest-ids?limit=10") &&
      response.request().method() === "GET",
  );

  await page.goto("/app/remote/providers");

  await expect(
    page.getByRole("heading", { name: "Configured provider connections" }),
  ).toBeVisible();

  const moonshotMaintenanceCard = page.getByTestId(
    "provider-maintenance-moonshot.personal.primary",
  );
  await expect(
    moonshotMaintenanceCard.getByRole("heading", { name: "moonshot.personal.primary" }),
  ).toBeVisible();
  await expect(
    moonshotMaintenanceCard.getByText("Connection method: api-key-static"),
  ).toBeVisible();
  await expect(moonshotMaintenanceCard.getByText("Active endpoints: 1")).toBeVisible();
  await expect(moonshotMaintenanceCard.getByText("moonshot/kimi-k2.5")).toBeVisible();

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
