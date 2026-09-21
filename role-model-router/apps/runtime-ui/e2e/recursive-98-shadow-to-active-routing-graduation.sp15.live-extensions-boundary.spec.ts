import { expect, test } from "@playwright/test";

/**
 * Run 98 `P98-15` (AC-R17-10 / AC-R18-*): the live packaged runtime must render the
 * knowledge-worker activation boundary it serves, so an operator never sees a stale or
 * hardcoded mode. The row caption, the mode control and the inventory detail all read the
 * host record (`enabledMode` + `activationBoundary`), not per-id copy.
 */
test.describe("@recursive:98-shadow-to-active-routing-graduation @p98-15", () => {
  test("knowledge-worker row renders the host effective mode and policy-gated boundary", async ({
    page,
  }, testInfo) => {
    test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

    await page.goto("/app/system/extensions");
    await expect(page.getByRole("heading", { name: "Extension inventory" })).toBeVisible({
      timeout: 60_000,
    });

    const listed = await page.request.get("/api/role-model/extensions");
    expect(listed.ok()).toBeTruthy();
    const rows = (await listed.json()) as readonly {
      id: string;
      enabled: boolean;
      enabledMode: string;
      activationBoundary: {
        policyGated: boolean;
        defaultMode: string;
        allowedModes: readonly string[];
      };
    }[];
    const knowledgeWorker = rows.find((row) => row.id === "knowledge-worker");
    expect(knowledgeWorker).toBeTruthy();
    expect(knowledgeWorker?.activationBoundary.policyGated).toBe(true);
    expect(knowledgeWorker?.activationBoundary.allowedModes).toEqual([
      "disabled",
      "shadow",
      "advisory",
    ]);

    const titleCase = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
    const effectiveLabel = titleCase(knowledgeWorker?.enabledMode ?? "");
    const defaultLabel = titleCase(knowledgeWorker?.activationBoundary.defaultMode ?? "");
    const ceilingLabel = titleCase(knowledgeWorker?.activationBoundary.allowedModes.at(-1) ?? "");

    const row = page.locator("tr").filter({ hasText: "knowledge-worker" }).first();
    await expect(row).toBeVisible();

    // The mode control shows the effective mode the host reported, not the default.
    const modeControl = row.getByRole("button", { name: "Mode", exact: true });
    await expect(modeControl).toHaveText(new RegExp(`^${effectiveLabel}$`));

    // The caption is derived from the declared boundary rather than per-extension copy.
    await expect(row).toContainText(
      `${defaultLabel} by default · policy-gated (ceiling ${ceilingLabel})`,
    );
    await expect(page.locator("body")).not.toContainText("Shadow-ready by default");
    await expect(page.locator("body")).not.toContainText("keeps Knowledge Worker shadow-only");

    // The operator-selectable modes come from the boundary, so `bounded`/`active` are absent.
    await modeControl.click();
    await expect(page.getByRole("option", { name: "Advisory", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "Shadow", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "Disabled", exact: true })).toBeVisible();
    await expect(page.getByRole("option", { name: "Active", exact: true })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Bounded", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");

    await page.screenshot({
      path: testInfo.outputPath("knowledge-worker-boundary-row.png"),
      fullPage: false,
    });
  });
});
