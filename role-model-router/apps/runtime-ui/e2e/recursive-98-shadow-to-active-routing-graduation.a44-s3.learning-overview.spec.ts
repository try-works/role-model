import { expect, test } from "@playwright/test";

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

    // The packaged stage has no profile-inspection capability: the page must say so with the runtime's reason.
    const profileResponse = await page.request.get("/api/role-model/operator/learning/profile");
    expect(profileResponse.status()).toBe(503);
    const profile = (await profileResponse.json()) as { readonly reason?: string };
    await expect(body).toContainText("Profile inspection");
    await expect(body).toContainText(`unavailable · ${profile.reason}`);

    await page.screenshot({ path: testInfo.outputPath("a44-s3-overview.png"), fullPage: true });
  });
});
