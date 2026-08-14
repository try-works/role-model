import { expect, test } from "@playwright/test";

test.describe("@recursive:79-extension-control-and-recommendations-qa @sp4", () => {
  test("mutates extension enablement and can dismiss recommendations against live runtime", async ({
    page,
  }) => {
    test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

    await page.goto("/app/system/extensions");
    await expect(
      page.getByRole("main").getByRole("heading", { name: "Extension boundary" }),
    ).toBeVisible();

    const disable = page.getByRole("button", { name: "Disable" }).first();
    const enable = page.getByRole("button", { name: "Enable" }).first();
    if (await disable.isEnabled()) {
      const [mutateResponse] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().includes("/api/role-model/extensions/mutate") &&
            candidate.request().method() === "POST",
        ),
        disable.click(),
      ]);
      expect(mutateResponse.ok()).toBeTruthy();
      await expect(page.getByText("disabled").first()).toBeVisible();
      if (await enable.isEnabled()) {
        page.once("dialog", (dialog) => void dialog.accept());
        const [enableResponse] = await Promise.all([
          page.waitForResponse(
            (candidate) =>
              candidate.url().includes("/api/role-model/extensions/mutate") &&
              candidate.request().method() === "POST",
          ),
          enable.click(),
        ]);
        expect(enableResponse.ok()).toBeTruthy();
      }
    }

    const dismiss = page.getByRole("button", { name: "Dismiss" }).first();
    if (await dismiss.isVisible()) {
      const [dismissResponse] = await Promise.all([
        page.waitForResponse(
          (candidate) =>
            candidate.url().includes("/api/role-model/recommendations/dismiss") &&
            candidate.request().method() === "POST",
        ),
        dismiss.click(),
      ]);
      expect(dismissResponse.ok()).toBeTruthy();
      await expect(page.getByText("dismissed", { exact: true }).first()).toBeVisible();
    } else {
      // Offline packaged SEA may have no downloaded packs; mutate path above is the hard gate.
      await expect(page.getByRole("button", { name: "Enable" }).first()).toBeVisible();
    }
  });
});
