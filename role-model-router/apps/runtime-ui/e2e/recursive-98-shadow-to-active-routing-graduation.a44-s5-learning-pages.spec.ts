import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

// Run 101 addendum 50 `A50-R4`: the packs table shortens a recorded claim for display, so the page-vs-readback
// check below holds the page to the same transform instead of comparing against the raw recorded text.
import { formatLearningClaim } from "../app/lib/learning-claim";

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
  {
    route: "/app/learning",
    heading: /Learning overview/i,
    shot: "a44-s5-learning.png",
    // Run 101 addendum 48: the approved columns of `Recent decisions`.
    headers: ["Role · task", "Models · judge score", "Judge", "Evidence", "Decision"],
  },
  {
    route: "/app/learning/configuration",
    heading: /Learning configuration/i,
    shot: "a44-s5-configuration.png",
    headers: [],
  },
  {
    route: "/app/learning/packs",
    heading: /Learned packs/i,
    shot: "a44-s5-packs.png",
    // Run 101 addendum 48: the approved columns of the pack table.
    headers: [
      "Pack · scope",
      "Replay models · score",
      "Pack model",
      "Claim · evidence",
      "State",
      "Action",
    ],
  },
  {
    route: "/app/learning/decisions",
    heading: /Decision receipts/i,
    shot: "a44-s5-decisions.png",
    // Run 101 addendum 48: the approved columns of the decision table, including the receipt chain.
    headers: ["Role · task", "Models · judge score", "Judge", "Evidence", "Decision", "Receipt"],
  },
  {
    route: "/app/learning/evidence",
    heading: /^Evidence$/i,
    shot: "a44-s5-evidence.png",
    headers: [],
  },
  {
    route: "/app/learning/history",
    heading: /Learning history/i,
    shot: "a44-s5-history.png",
    headers: [],
  },
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
      const loadingMarker =
        /Loading learning state|Reading live replay and evaluation state|^\s*loading\s*$/m;
      let bodyText = await page.locator("body").innerText();
      for (let attempt = 0; attempt < 30 && loadingMarker.test(bodyText); attempt += 1) {
        await page.waitForTimeout(2_000);
        bodyText = await page.locator("body").innerText();
      }
      expect(loadingMarker.test(bodyText), `${entry.route} never left its loading state`).toBe(
        false,
      );
      /**
       * Run 101 addendum 48 `A48-R6`: the three rebuilt surfaces are the approved column tables - asserted
       * against the same runtime that just served the page, so a page that silently kept its old markup fails.
       */
      for (const header of entry.headers) {
        await expect(
          page.getByRole("columnheader", { name: header, exact: true }).first(),
        ).toBeVisible({ timeout: 30_000 });
      }
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
      await expect(
        page.getByText(policy.routerResolution.stage, { exact: false }).first(),
      ).toBeVisible();
    }
  });

  /**
   * Run 101 addendum 50 `A50-R4` (operator-reported): "you shouldn't leak the full endpoint names and evidence
   * file name into the ui, is too long and not legible for users". Every claim the readback carries in this same
   * window must be on the page in its shortened form - the form the runtime UI is built to render - and no claim
   * cell may print a dotted endpoint path or an artifact digest. The whole recorded text stays in the cell's
   * `title`, which is asserted too, so shortening never means losing the record.
   */
  test("the packs table shortens recorded claims instead of printing endpoint paths and digests", async ({
    page,
  }) => {
    await page.goto("/app/learning/packs");
    await expect(page.getByRole("heading", { name: /Learned packs/i }).first()).toBeVisible({
      timeout: 150_000,
    });
    const readback = (await (
      await page.request.get("/api/role-model/operator/learning/records?kind=pack&limit=200")
    ).json()) as {
      readonly records?: readonly {
        readonly evidence?: { readonly claim?: string | null } | null;
      }[];
    };
    const claims = (readback.records ?? [])
      .map((row) => row.evidence?.claim)
      .filter((claim): claim is string => typeof claim === "string" && claim.trim().length > 0);
    expect(claims.length).toBeGreaterThan(0);

    const cells = page.locator("table").first().locator("td p");
    const shortened = claims.map((claim) => formatLearningClaim(claim));
    expect(shortened.every((claim) => typeof claim === "string")).toBe(true);
    await expect(async () => {
      const rendered = await cells.allInnerTexts();
      for (const claim of shortened) expect(rendered).toContain(claim);
    }).toPass({ timeout: 60_000 });

    const claimCells = (await cells.allInnerTexts()).filter((cell) =>
      cell.includes("outperformed"),
    );
    expect(claimCells.length).toBeGreaterThan(0);
    for (const cell of claimCells) {
      expect(cell).not.toMatch(/artifact:/i);
      expect(cell).not.toMatch(/[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+/i);
    }
    const titles = await page
      .locator("table")
      .first()
      .locator("td p[title]")
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("title") ?? ""));
    // The recorded text is carried whole; the only difference the cell makes is trimming the edges.
    const recordedTitles = titles.map((title) => title.trim());
    for (const claim of claims) expect(recordedTitles).toContain(claim.trim());
  });
});
