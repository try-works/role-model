import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

/**
 * Run 98 addendum 49 — the operator's "y axis is all 0" report.
 *
 * "Cost avoided over time" draws real sub-cent values, but the axis formatter pinned two fraction digits, so
 * every label read `$0.00`. The check reads the rendered tick labels: with a non-zero series at least one label
 * must be a non-zero dollar amount, and the labels must not collapse to a single repeated value.
 */
const evidenceDir = path.resolve(
  process.env.RUN98_EVIDENCE_DIR ??
    "D:/DEV/role-model-internal/.worktrees/98-shadow-to-active-routing-graduation/.recursive/run/98-shadow-to-active-routing-graduation/evidence/phase5",
);

test.describe("@recursive:98-a49 @runtime-telemetry", () => {
  test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

  test("the cost-avoided axis shows non-zero sub-cent ticks", async ({ page }) => {
    test.setTimeout(180_000);
    mkdirSync(evidenceDir, { recursive: true });
    await page.goto("/app");
    await expect(page.getByText("Cost avoided over time").first()).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(4_000);

    // Axis labels are SVG <text> nodes, so read their text content rather than a container's innerText.
    const svgLabels = await page.locator("svg text").allTextContents();
    const tickLabels = [
      ...new Set(
        svgLabels
          .map((label) => label.trim())
          .filter((label) => /^\$-?[\d,]+(?:\.\d+)?$/.test(label)),
      ),
    ];
    console.log(`cost-avoided labels: ${tickLabels.join(", ")}`);
    expect(tickLabels.length).toBeGreaterThan(1);
    // At least one tick must be a non-zero amount: that is exactly what the report said was missing.
    expect(
      tickLabels.some((label) => Number(label.replace(/[$,]/g, "")) !== 0),
      `every cost-avoided label was zero: ${tickLabels.join(", ")}`,
    ).toBe(true);

    await page.screenshot({ path: path.join(evidenceDir, "a49-cost-avoided-axis.png"), fullPage: true });
    // A viewport capture with the chart in view, so the axis labels are legible in the evidence.
    await page.getByText("Cost avoided over time").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(evidenceDir, "a49-cost-avoided-viewport.png") });
  });
});
