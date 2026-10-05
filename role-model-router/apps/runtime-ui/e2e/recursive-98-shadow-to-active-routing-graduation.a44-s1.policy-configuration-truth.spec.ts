import { expect, test } from "@playwright/test";

/**
 * Run 98 addendum 44 `A44-S1` — the browser clause.
 *
 * The requirement table published `advisoryAuthorizationTtlMs` (300000 ms, read-only, with a
 * `<= 300000` invariant). Addendum 21 §D12 measured it with zero consumers and no canonical source, and
 * the shipped schema replaced it with the enforced, operator-editable `advisorySourceMaxAgeMs`. The page an
 * operator actually reads must therefore show the replacement field with its real bounds and current value,
 * and must never show the retired name as if it were still a control.
 *
 * The assertions read the runtime's own policy API rather than hardcoding values, so the spec fails when the
 * page and the served policy disagree — which is the whole point of the slice.
 */
interface LearningPolicyField {
  readonly name: string;
  readonly unit?: string | null;
  readonly default?: unknown;
  readonly min?: number | null;
  readonly max?: number | null;
  readonly uiEditable?: boolean;
  readonly value?: unknown;
}

test.describe("@recursive:98-shadow-to-active-routing-graduation @a44-s1", () => {
  test("configuration renders advisorySourceMaxAgeMs with its bounds and never the retired name", async ({
    page,
  }, testInfo) => {
    test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

    await page.goto("/app/learning/configuration");
    // The page title (h1) and the card title (h2) share the words "Learning configuration".
    await expect(
      page.getByRole("heading", { name: /Learning configuration/i }).first(),
    ).toBeVisible({ timeout: 60_000 });

    const response = await page.request.get("/api/role-model/operator/learning/policy");
    expect(response.ok()).toBeTruthy();
    const policy = (await response.json()) as {
      readonly policyVersion: number;
      readonly fields?: readonly LearningPolicyField[];
    };
    const field = policy.fields?.find((entry) => entry.name === "advisorySourceMaxAgeMs");
    expect(
      field,
      "the runtime must publish advisorySourceMaxAgeMs (the retirement of advisoryAuthorizationTtlMs)",
    ).toBeTruthy();
    if (!field) {
      throw new Error("advisorySourceMaxAgeMs is not published");
    }

    const row = page.locator("tr").filter({ hasText: "advisorySourceMaxAgeMs" }).first();
    await expect(row).toBeVisible();

    // The current value is the runtime's own effective value, editable in place.
    const valueControl = row.getByLabel("advisorySourceMaxAgeMs", { exact: true });
    await expect(valueControl).toHaveValue(String(field.value));
    await expect(row).toContainText(String(field.unit));
    await expect(row).toContainText(String(field.default));
    // The Range column renders `${min} – ${max}` for bounded numeric fields.
    await expect(row).toContainText(`${String(field.min)} – ${String(field.max)}`);
    await expect(row).toContainText(field.uiEditable ? "editable" : "read-only");

    // The retired requirement name must not appear as a control or as copy.
    await expect(page.locator("body")).not.toContainText("advisoryAuthorizationTtlMs");

    // The row itself is the evidence: value, unit, default, range and editability in one frame. The page
    // scrolls inside the shell, so the element shot is what proves the field renders rather than a
    // viewport capture of the table's first rows.
    await row.scrollIntoViewIfNeeded();
    await row.screenshot({
      path: testInfo.outputPath("a44-s1-advisory-source-max-age-row.png"),
    });
    await page.screenshot({
      path: testInfo.outputPath("learning-configuration-policy-truth.png"),
      fullPage: true,
    });
  });
});
