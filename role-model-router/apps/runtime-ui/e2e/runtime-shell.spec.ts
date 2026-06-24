import { expect, test } from "@playwright/test";

test("shows seeded provider maintenance and session readiness over the rebuilt runtime", async ({
  page,
}) => {
  await page.goto("/app/remote/providers");

  await expect(
    page.getByRole("heading", { name: "Configured provider connections" }),
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "openai.litellm" })).toBeVisible();
  await expect(page.getByText("Connection method: api-key-static")).toBeVisible();
  await expect(page.getByText("Active endpoints: 0")).toBeVisible();
  await expect(page.getByText("openai/gpt-4.1-mini-fast")).toBeVisible();

  await page.goto("/app/models");

  await expect(page.getByRole("heading", { name: "Model inventory" })).toBeVisible();
  await expect(page.getByText("openai/gpt-4.1-mini-fast").first()).toBeVisible();
  await page.getByRole("button", { name: "Inspect" }).first().click();
  await expect(page.getByRole("heading", { level: 2, name: "GPT-4.1 Mini Fast" })).toBeVisible();
  await expect(page.getByText("Backing account role bindings")).toBeVisible();
  await expect(page.getByLabel("All roles")).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage role definitions" })).toBeVisible();

  await page.goto("/app/system/session-readiness");

  await expect(page.getByText("Bootstrap status")).toBeVisible();
  await expect(page.getByText("Lifecycle authority")).toBeVisible();
  await expect(page.getByText("Execution mode")).toBeVisible();
  await expect(page.getByText("Routable endpoints").first()).toBeVisible();
});
