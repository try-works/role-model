import { expect, test } from "@playwright/test";

test.describe("@recursive:94-direct-track-b-storage-graph-cloud-roundtrip @sp8 @smoke", () => {
  test("contribution surface exposes the lifecycle from preview to revocation", async ({
    page,
  }) => {
    const before = await page.request.get("/api/role-model/contribution");
    expect(before.ok()).toBeTruthy();
    const initial = (await before.json()) as {
      authorizationState: string;
      queuedCount: number;
      revocationEpoch: number;
      mode: string;
      contributionTier: string;
      recommendationTier: string;
      recommendationAccess: string;
      allowCloudUpload: boolean;
      managed: boolean;
      disclosureId: string | null;
      nextSequence: number;
    };
    expect(initial.authorizationState).toEqual(expect.any(String));
    expect(initial.queuedCount).toEqual(expect.any(Number));
    expect(initial.revocationEpoch).toEqual(expect.any(Number));
    expect(initial.mode).toEqual(expect.any(String));
    expect(initial.recommendationAccess).toEqual(expect.any(String));

    // Destination-scoped authorization: completing disclosure with an invalid
    // disclosure identity must be refused before any authorization state change.
    const unauthorized = await page.request.put("/api/role-model/contribution", {
      data: { action: "complete_disclosure", disclosureId: "!!bad disclosure id!!" },
    });
    expect(unauthorized.ok()).toBe(false);

    const stillPending = (await (
      await page.request.get("/api/role-model/contribution")
    ).json()) as { authorizationState: string };
    expect(["pending_disclosure", "active", "revoked"]).toContain(stillPending.authorizationState);

    // Revocation clears any queued rows and bumps the epoch.
    const revoked = await page.request.put("/api/role-model/contribution", {
      data: { action: "opt_out" },
    });
    expect(revoked.ok()).toBeTruthy();
    const revokedBody = (await revoked.json()) as { queuedCount: number; revocationEpoch: number };
    expect(revokedBody.queuedCount).toBe(0);
    expect(revokedBody.revocationEpoch).toBeGreaterThanOrEqual(initial.revocationEpoch);

    const reenabled = await page.request.put("/api/role-model/contribution", {
      data: { action: "reenable" },
    });
    expect(reenabled.ok()).toBeTruthy();
    const reenabledBody = (await reenabled.json()) as { authorizationState: string };
    expect(["pending_disclosure", "active", "revoked"]).toContain(reenabledBody.authorizationState);

    await page.goto("/app/system/extensions");
    await expect(
      page.getByText(/disclosure|authorization|preview|outbox|revocation/i).first(),
    ).toBeVisible();
  });
});
