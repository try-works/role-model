import { expect, test } from "@playwright/test";

// Run 101 addendum 49 `A49-R3`: the models column shows the leaf model id, so the page-vs-readback check below
// holds the page to the same rule instead of the raw endpoint path.
import { readEndpointModelLeaf } from "../app/lib/effort-identity";

/**
 * Run 98 addendum 44 `A44-S3`: the Learning Overview reports the numbers `AC-R12-01` lists, and the packaged
 * runtime's missing profile-inspection capability appears as a bounded `unavailable` with its reason.
 *
 * Each expectation is derived from the runtime's own APIs in the same page session, so the spec fails when the
 * page and the readbacks disagree — which is the point of the slice.
 */
test.describe("@recursive:98-shadow-to-active-routing-graduation @a44-s3", () => {
  test("the overview shows applied share, fallback reasons, guardrails, rollbacks and the profile state", async ({
    page,
  }, testInfo) => {
    test.skip(!process.env.RUNTIME_LIVE_BASE_URL, "live packaged runtime URL required");

    await page.goto("/app/learning");
    await expect(page.getByRole("heading", { name: /Learning overview/i }).first()).toBeVisible({
      timeout: 60_000,
    });

    const summary = (await (
      await page.request.get("/api/role-model/track-b/learning/summary")
    ).json()) as {
      readonly advisory?: {
        readonly applied?: number;
        readonly observed?: number;
        readonly fallbackReasons?: Readonly<Record<string, number>>;
      };
    };
    const advisory = summary.advisory ?? {};
    const observed = advisory.observed ?? 0;
    const applied = advisory.applied ?? 0;
    expect(observed).toBeGreaterThan(0);

    const body = page.locator("body");
    await expect(body).toContainText("Applied share");
    await expect(body).toContainText(`${((applied / observed) * 100).toFixed(1)}%`);

    const reasons = Object.entries(advisory.fallbackReasons ?? {}).sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en"),
    );
    expect(reasons.length).toBeGreaterThan(0);
    await expect(body).toContainText(`${reasons[0]?.[0]} ×${reasons[0]?.[1]}`);

    const history = (await (
      await page.request.get("/api/role-model/operator/learning/history?hours=24")
    ).json()) as { readonly guardrailWindowMinutes?: number };
    await expect(body).toContainText(`window ${history.guardrailWindowMinutes} min`);
    await expect(body).toContainText("Rollbacks");

    /**
     * Run 101 addendum 48 update: the profile-inspection capability is a property of the runtime the spec is
     * pointed at. A runtime without it answers 503 and the page must name the reason; the current stage runtime
     * answers 200 with its own `available`/`unavailable` document, and the page must render that answer - what
     * the page may never do is report a capability the runtime did not.
     */
    const profileResponse = await page.request.get("/api/role-model/operator/learning/profile");
    const profile = (await profileResponse.json()) as {
      readonly state?: string;
      readonly reason?: string;
    };
    await expect(body).toContainText("Profile inspection");
    if (profileResponse.status() === 200 && profile.state !== "unavailable") {
      await expect(page.getByText("available", { exact: true }).first()).toBeVisible();
    } else {
      await expect(body).toContainText(
        `unavailable${profile.reason ? ` · ${profile.reason}` : ""}`,
      );
    }

    /**
     * Run 101 addendum 48 `A48-R4`/`A48-R6`: `Recent decisions` is the operator-approved five-column table, and
     * each row's models/judge/evidence/decision cells carry what the readback in this same window carries - a
     * readback without the evaluation join renders the bounded absence text instead of a plausible score.
     */
    for (const header of ["Role · task", "Models · judge score", "Judge", "Evidence", "Decision"]) {
      await expect(page.getByRole("columnheader", { name: header, exact: true })).toBeVisible();
    }
    const decisions = (await (
      await page.request.get("/api/role-model/operator/learning/decisions?limit=10")
    ).json()) as {
      readonly decisions?: readonly {
        readonly evidence?: {
          readonly members?: readonly { readonly candidateRef?: string }[];
        } | null;
      }[];
    };
    const members = decisions.decisions?.[0]?.evidence?.members ?? [];
    if (members.length > 0) {
      await expect(body).toContainText(readEndpointModelLeaf(String(members[0]?.candidateRef)));
    } else {
      await expect(body).toContainText("not reported");
    }

    await page.screenshot({ path: testInfo.outputPath("a44-s3-overview.png"), fullPage: true });
  });
});
