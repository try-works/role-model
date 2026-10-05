import { expect, test } from "@playwright/test";

/**
 * Run 98 addendum 47 (`A47`) and addendum 46's user-visible half.
 *
 * The operator asked for the activation stage to default to S4, and for local changes to need no token. Both
 * are read from the runtime's own policy API first, then asserted against what the Configuration page
 * renders — so the spec fails when the page and the served policy disagree.
 */
test.describe("@recursive:98-shadow-to-active-routing-graduation @a47", () => {
  test("configuration shows the S4 stage default and does not ask the device owner for a token", async ({
    page,
  }, testInfo) => {
    test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

    await page.goto("/app/learning/configuration");
    await expect(
      page.getByRole("heading", { name: /Learning configuration/i }).first(),
    ).toBeVisible({ timeout: 60_000 });

    const response = await page.request.get("/api/role-model/operator/learning/policy");
    expect(response.ok()).toBeTruthy();
    const policy = (await response.json()) as {
      readonly fields?: readonly {
        readonly name: string;
        readonly value?: unknown;
        readonly default?: unknown;
        readonly values?: readonly string[] | null;
      }[];
      readonly effective?: { readonly stage?: string };
    };
    const stage = policy.fields?.find((entry) => entry.name === "stage");
    expect(stage, "the runtime must publish the stage field").toBeTruthy();
    if (!stage) {
      throw new Error("stage is not published");
    }

    const row = page.locator("tr").filter({ hasText: "stage" }).first();
    await expect(row).toBeVisible();
    await expect(row.getByLabel("stage", { exact: true })).toHaveValue(String(stage.value));
    // The DEFAULT column carries the shipped default, which the operator asked to be S4.
    await expect(row).toContainText(String(stage.default));
    expect(stage.default).toBe("S4");
    // The Range column lists the enum, so the page proves the field is the stage enum and not a free string.
    if (Array.isArray(stage.values)) {
      await expect(row).toContainText(stage.values.join(" | "));
    }

    // Addendum 46: the page tells the device owner no token is needed here.
    await expect(page.getByPlaceholder(/Not needed on this machine/i)).toBeVisible();
    await expect(page.locator("body")).not.toContainText("required for changes");

    await row.scrollIntoViewIfNeeded();
    await row.screenshot({ path: testInfo.outputPath("a47-stage-row.png") });
    await page.screenshot({ path: testInfo.outputPath("a47-configuration.png"), fullPage: true });
  });
});
