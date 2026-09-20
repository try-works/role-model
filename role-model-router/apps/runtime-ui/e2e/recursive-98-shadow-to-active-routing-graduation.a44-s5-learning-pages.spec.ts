import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

/**
 * Run 98 addendum 44 `A44-S5` — inspect every Learning page on the live packaged runtime.
 *
 * The requirement is not "the page loads": every page must render its components against the runtime's own
 * stores while real requests are in flight, show the numbers the APIs report, and say so explicitly when a
 * field is unavailable instead of leaving it blank. This spec drives the six pages, compares the served
 * values with the API reads, and writes one screenshot per page into the run's evidence directory.
 */
const evidenceDir = path.resolve(
  process.env.RUN98_EVIDENCE_DIR ??
    "D:/DEV/role-model-internal/.worktrees/98-shadow-to-active-routing-graduation/.recursive/run/98-shadow-to-active-routing-graduation/evidence/phase5",
);

const pages = [
  { route: "/app/learning", heading: /Learning overview/i, shot: "a44-s5-learning.png" },
  {
    route: "/app/learning/configuration",
    heading: /Learning configuration/i,
    shot: "a44-s5-configuration.png",
  },
  { route: "/app/learning/packs", heading: /Learned packs/i, shot: "a44-s5-packs.png" },
  { route: "/app/learning/decisions", heading: /Decision receipts/i, shot: "a44-s5-decisions.png" },
  { route: "/app/learning/evidence", heading: /^Evidence$/i, shot: "a44-s5-evidence.png" },
  { route: "/app/learning/history", heading: /Learning history/i, shot: "a44-s5-history.png" },
] as const;

test.describe("@recursive:98-shadow-to-active-routing-graduation @a44-s5", () => {
  test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

  for (const entry of pages) {
    test(`render ${entry.route} against the running runtime`, async ({ page }, testInfo) => {
      test.setTimeout(180_000);
      mkdirSync(evidenceDir, { recursive: true });
      await page.goto(entry.route);
      await expect(page.getByRole("heading", { name: entry.heading }).first()).toBeVisible({
        timeout: 150_000,
      });
      /**
       * Run 98 addendum 44 A44-S5 (re-run on v295): the first capture pass recorded the pages while their
       * operator readbacks were still resolving (`Loading learning state…`, `loading`, `Reading live replay and
       * evaluation state`), so the evidence showed the shell instead of the values the requirement asks for. Wait
       * for the readbacks to settle — bounded, because a live runtime never goes network-idle — and fail the
       * page's check if it is still loading, so "empty because it never loaded" cannot pass as a rendered page.
       */
      const loadingMarker = /Loading learning state|Reading live replay and evaluation state|^\s*loading\s*$/m;
      let bodyText = await page.locator("body").innerText();
      for (let attempt = 0; attempt < 30 && loadingMarker.test(bodyText); attempt += 1) {
        await page.waitForTimeout(2_000);
        bodyText = await page.locator("body").innerText();
      }
      expect(loadingMarker.test(bodyText), `${entry.route} never left its loading state`).toBe(false);
      await page.screenshot({ path: path.join(evidenceDir, entry.shot), fullPage: true });
      const text = await page.locator("body").innerText();
      testInfo.annotations.push({
        type: "page-text",
        description: `${entry.route}: ${text.replace(/\s+/g, " ").slice(0, 600)}`,
      });
      writeFileSync(
        path.join(evidenceDir, `${entry.shot.replace(/\.png$/, "")}.txt`),
        text,
        "utf8",
      );
      expect(text.length).toBeGreaterThan(50);
    });
  }

  test("the configuration page's stage value and router resolution match the served policy", async ({
    page,
  }) => {
    await page.goto("/app/learning/configuration");
    const response = await page.request.get("/api/role-model/operator/learning/policy");
    expect(response.ok()).toBeTruthy();
    const policy = (await response.json()) as {
      readonly policyVersion: number;
      readonly digest: string;
      readonly routerResolution?: {
        readonly stage?: string;
        readonly source?: string;
        readonly degraded?: unknown;
      } | null;
      readonly fields?: readonly { readonly name: string; readonly value: unknown }[];
    };
    const stageField = policy.fields?.find((field) => field.name === "stage");
    const row = page.locator("tr").filter({ hasText: "stage" }).first();
    await expect(row).toBeVisible({ timeout: 60_000 });
    if (stageField) {
      await expect(row.getByLabel("stage", { exact: true })).toHaveValue(String(stageField.value));
    }
    // The router-resolution block is the addendum 44 A44-S4 addition; it must name the stage the router uses.
    await expect(page.getByText("Router resolution").first()).toBeVisible();
    if (policy.routerResolution?.stage) {
      await expect(page.getByText(policy.routerResolution.stage, { exact: false }).first()).toBeVisible();
    }
  });
});
