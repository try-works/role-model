import { expect, test } from "@playwright/test";

test("shows seeded provider maintenance and session readiness over the rebuilt runtime", async ({
  page,
}) => {
  await page.goto("/app/remote/providers");

  await expect(
    page.getByRole("heading", { name: "Configured provider connections" }),
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "moonshot.personal.primary" })).toBeVisible();
  await expect(page.getByText("Connection method: api-key-static")).toBeVisible();
  await expect(page.getByText("Active endpoints: 1")).toBeVisible();

  await page.goto("/app/system/session-readiness");

  await expect(page.getByText("Bootstrap status")).toBeVisible();
  await expect(page.getByText("Lifecycle authority")).toBeVisible();
  await expect(page.getByText("Execution mode")).toBeVisible();
  await expect(page.getByText("Routable endpoints").first()).toBeVisible();
});
