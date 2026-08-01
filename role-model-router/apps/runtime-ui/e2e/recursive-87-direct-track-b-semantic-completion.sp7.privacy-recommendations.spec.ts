import { expect, test } from "@playwright/test";

test.describe("@recursive:87-direct-track-b-semantic-completion @sp7 @smoke", () => {
  test("privacy opt-out clears upload authority without disabling local recommendation access", async ({
    page,
  }) => {
    await page.goto("/app/system/extensions");
    await expect(page.getByRole("heading", { name: "Contribution posture" })).toBeVisible();
    const current = await page.request.get("/api/role-model/contribution");
    expect(current.ok()).toBeTruthy();
    const before = (await current.json()) as { mode: string };
    const disclosure = await page.request.put("/api/role-model/contribution", {
      data: { action: "complete_disclosure", disclosureId: "run87-browser-disclosure" },
    });
    expect(disclosure.ok()).toBeTruthy();
    expect(await disclosure.json()).toMatchObject({
      authorizationState: "active",
      disclosureId: "run87-browser-disclosure",
    });
    if (before.mode === "contributor") {
      const optedOut = await page.request.put("/api/role-model/contribution", {
        data: { action: "opt_out" },
      });
      expect(optedOut.ok()).toBeTruthy();
    }
    const privateState = (await (
      await page.request.get("/api/role-model/contribution")
    ).json()) as {
      mode: string;
      contributionTier: string;
      recommendationAccess: string;
      allowCloudUpload: boolean;
      queuedCount: number;
      authorizationState: string;
    };
    expect(privateState).toMatchObject({
      mode: "consumer",
      contributionTier: "none",
      recommendationAccess: "preview_and_apply",
      allowCloudUpload: false,
      queuedCount: 0,
      authorizationState: "revoked",
    });
    const serialized = JSON.stringify(privateState).toLowerCase();
    for (const forbidden of ["messages", "prompt", "transcript", "repositorycontent", "secret"]) {
      expect(serialized).not.toContain(forbidden);
    }
    const hostileReplay = await page.request.post("/v1/chat/completions", {
      headers: { "x-request-id": `run87-sp7-revoked-replay-${Date.now()}` },
      data: {
        model: "deepseek/chat-capture-v1",
        messages: [{ role: "user", content: "This must remain local after revocation." }],
      },
    });
    expect(hostileReplay.ok()).toBeTruthy();
    expect(await (await page.request.get("/api/role-model/contribution")).json()).toMatchObject({
      authorizationState: "revoked",
      allowCloudUpload: false,
      queuedCount: 0,
    });

    const downloaded = await page.request.post("/api/role-model/recommendations/download");
    expect(downloaded.ok()).toBeTruthy();
    const recommendations = await page.request.get("/api/role-model/recommendations");
    expect(recommendations.ok()).toBeTruthy();
    const recommendationRows = (await recommendations.json()) as Array<{
      id: string;
      status: string;
      signatureValid: boolean;
      policyAllowed: boolean;
    }>;
    expect(recommendationRows).toHaveLength(2);
    expect(recommendationRows.every((row) => row.signatureValid && row.policyAllowed)).toBe(true);
    expect(recommendationRows.every((row) => row.status === "validated")).toBe(true);

    const dismissed = await page.request.post("/api/role-model/recommendations/dismiss", {
      data: { id: "run87-recommendation-dismiss" },
    });
    expect(dismissed.ok()).toBeTruthy();
    expect(await dismissed.json()).toMatchObject({
      recommendations: expect.arrayContaining([
        expect.objectContaining({ id: "run87-recommendation-dismiss", status: "dismissed" }),
      ]),
    });
    const applied = await page.request.post("/api/role-model/recommendations/apply", {
      data: { id: "run87-recommendation-apply" },
    });
    expect(applied.ok()).toBeTruthy();
    expect(await applied.json()).toMatchObject({
      activePack: { id: "run87-recommendation-apply" },
    });
    expect(
      await (await page.request.get("/api/role-model/recommendations/active-pack")).json(),
    ).toMatchObject({ id: "run87-recommendation-apply" });

    const reenabled = await page.request.put("/api/role-model/contribution", {
      data: { action: "reenable" },
    });
    expect(reenabled.ok()).toBeTruthy();
    expect(await reenabled.json()).toMatchObject({ authorizationState: "pending_disclosure" });
  });
});
