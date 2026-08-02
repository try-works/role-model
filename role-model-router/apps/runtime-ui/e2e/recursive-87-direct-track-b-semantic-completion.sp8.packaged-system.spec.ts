import { expect, test } from "@playwright/test";

test.describe("@recursive:87-direct-track-b-semantic-completion @sp8 @smoke", () => {
  test("live system exposes the complete extension release and survives a lifecycle round trip", async ({
    page,
  }) => {
    const health = await page.request.get("/healthz");
    expect(health.ok()).toBeTruthy();
    const response = await page.request.get("/api/role-model/extensions");
    expect(response.ok()).toBeTruthy();
    const rows = (await response.json()) as Array<{
      id: string;
      packageClass: string;
      installed: boolean;
      health: { available: boolean };
    }>;
    expect(rows).toHaveLength(13);
    expect(new Set(rows.map((row) => row.id)).size).toBe(13);
    expect(rows.every((row) => row.packageClass === "canonical_extension" && row.installed)).toBe(
      true,
    );
    expect(rows.some((row) => row.health.available)).toBe(true);
    const knowledgeWorkerBefore = rows.find((row) => row.id === "knowledge-worker") as
      | ((typeof rows)[number] & { enabledMode?: string; productionActivation?: boolean })
      | undefined;
    expect(knowledgeWorkerBefore).toMatchObject({ enabledMode: "shadow" });
    expect(knowledgeWorkerBefore).not.toHaveProperty("productionActivation");
    const productionConfigBefore = await (
      await page.request.get("/api/role-model/runtime/config")
    ).json();
    const productionExtensionModesBefore = rows.map((row) => ({
      id: row.id,
      enabledMode: (row as { enabledMode?: string }).enabledMode,
    }));

    const readNewShadowReceipt = async (priorRequestIds: ReadonlySet<string>) => {
      const response = await page.request.get("/api/role-model/track-b/shadow-receipts");
      expect(response.ok()).toBeTruthy();
      const body = (await response.json()) as {
        pendingCount: number;
        receiptCount: number;
        receipts: Array<{ requestId: string; result: Record<string, unknown> }>;
      };
      return body.receipts.find((receipt) => !priorRequestIds.has(receipt.requestId)) ?? null;
    };

    const requestId = `run87-packaged-shadow-${Date.now()}`;
    const preRequestReceipts = (await (
      await page.request.get("/api/role-model/track-b/shadow-receipts")
    ).json()) as { receipts: Array<{ requestId: string }> };
    const preRequestReceiptIds = new Set(
      preRequestReceipts.receipts.map((receipt) => receipt.requestId),
    );
    const routed = await page.request.post("/v1/chat/completions", {
      headers: { "x-request-id": requestId },
      data: {
        model: "deepseek/chat-capture-v1",
        messages: [{ role: "user", content: "Execute the packaged run-87 shadow pipeline." }],
      },
    });
    expect(routed.ok()).toBeTruthy();
    expect(await routed.json()).toEqual(expect.objectContaining({ choices: expect.any(Array) }));
    await expect
      .poll(async () => (await readNewShadowReceipt(preRequestReceiptIds)) !== null)
      .toBe(true);
    const shadowBeforeCutover = await readNewShadowReceipt(preRequestReceiptIds);
    expect(shadowBeforeCutover).not.toBeNull();
    if (!shadowBeforeCutover) throw new Error("pre-cutover shadow receipt was not durable");
    const observedRequestId = shadowBeforeCutover.requestId;
    expect(shadowBeforeCutover.result).toMatchObject({
      pipeline: {
        schemaVersion: "role-model.track-b-shadow-pipeline-receipt.v1",
        mode: "shadow",
        requestId: observedRequestId,
        providerCalls: 0,
        productionMutation: false,
        candidateId: expect.any(String),
      },
      projection: {
        scope: expect.any(String),
        readiness: {
          rolloutPurpose: "routing_shadow",
          authorizationState: "authorized",
          lifecycleReadiness: "ready",
          routingTrainingSuitability: "eligible",
        },
        evidence: [expect.objectContaining({ verified: true })],
      },
      consumption: {
        consumerCount: 3,
        productionMutation: false,
        results: expect.arrayContaining([
          expect.objectContaining({
            state: "shadow",
            productionMutation: false,
            productionEffects: {
              providerCalls: 0,
              promptMutations: 0,
              routeMutations: 0,
              weightMutations: 0,
              activeProfileMutations: 0,
            },
          }),
        ]),
      },
    });
    const retentionBeforeCutover = (await (
      await page.request.get("/api/role-model/storage-retention")
    ).json()) as { totalCount: number; storageInventory: { complete: boolean } };
    expect(retentionBeforeCutover.storageInventory.complete).toBe(true);
    await expect
      .poll(async () => {
        const current = (await (
          await page.request.get("/api/role-model/extensions")
        ).json()) as Array<{ id: string; lifecycle: string; health: { available: boolean } }>;
        return current.filter((row) => row.lifecycle === "ready" && row.health.available).length;
      })
      .toBe(13);

    const migration = await page.request.get("/api/role-model/graph-migration");
    expect(migration.ok()).toBeTruthy();
    const beforeMigration = (await migration.json()) as { state: string };
    expect(beforeMigration.state).toMatch(
      /legacy_primary|shadow_mirror|parity_verified|graph_primary/,
    );
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const current = (await (
        await page.request.get("/api/role-model/graph-migration")
      ).json()) as { state: string };
      if (current.state === "graph_primary") break;
      const advanced = await page.request.post("/api/role-model/graph-migration/advance", {
        data: {
          backupVerified: true,
          restoreVerified: true,
          consumersVerified: true,
        },
      });
      expect(advanced.ok()).toBeTruthy();
    }
    expect(
      (await (await page.request.get("/api/role-model/graph-migration")).json()) as {
        state: string;
      },
    ).toMatchObject({ state: "graph_primary" });

    const afterCutoverRequestId = `run87-packaged-graph-primary-${Date.now()}`;
    const preCutoverReceipts = (await (
      await page.request.get("/api/role-model/track-b/shadow-receipts")
    ).json()) as { receipts: Array<{ requestId: string }> };
    const preCutoverReceiptIds = new Set(
      preCutoverReceipts.receipts.map((receipt) => receipt.requestId),
    );
    const afterCutover = await page.request.post("/v1/chat/completions", {
      headers: { "x-request-id": afterCutoverRequestId },
      data: {
        model: "deepseek/chat-capture-v1",
        messages: [{ role: "user", content: "Verify graph-primary continuity." }],
      },
    });
    expect(afterCutover.ok()).toBeTruthy();
    await expect
      .poll(async () => (await readNewShadowReceipt(preCutoverReceiptIds)) !== null)
      .toBe(true);
    const shadowAfterCutover = await readNewShadowReceipt(preCutoverReceiptIds);
    expect(shadowAfterCutover).not.toBeNull();
    if (!shadowAfterCutover) throw new Error("post-cutover shadow receipt was not durable");
    expect(shadowAfterCutover.result).toMatchObject({
      pipeline: { mode: "shadow", productionMutation: false, providerCalls: 0 },
      projection: {
        scope: (shadowBeforeCutover.result.projection as { scope: string }).scope,
        readiness: {
          rolloutPurpose: "routing_shadow",
          lifecycleReadiness: "ready",
          routingTrainingSuitability: "eligible",
        },
      },
      consumption: { consumerCount: 3, productionMutation: false },
    });
    expect((await page.request.get("/healthz")).ok()).toBeTruthy();
    const extensionsAfterCutover = (await (
      await page.request.get("/api/role-model/extensions")
    ).json()) as Array<{
      id: string;
      enabledMode?: string;
      productionActivation?: boolean;
    }>;
    const knowledgeWorkerAfter = extensionsAfterCutover.find(
      (row) => row.id === "knowledge-worker",
    );
    expect(knowledgeWorkerAfter).toMatchObject({ enabledMode: "shadow" });
    expect(knowledgeWorkerAfter).not.toHaveProperty("productionActivation");
    expect(
      extensionsAfterCutover.map((row) => ({ id: row.id, enabledMode: row.enabledMode })),
    ).toEqual(productionExtensionModesBefore);
    expect(await (await page.request.get("/api/role-model/runtime/config")).json()).toEqual(
      productionConfigBefore,
    );
    const retentionAfterCutover = (await (
      await page.request.get("/api/role-model/storage-retention")
    ).json()) as { totalCount: number; storageInventory: { complete: boolean } };
    expect(retentionAfterCutover.totalCount).toBeGreaterThanOrEqual(
      retentionBeforeCutover.totalCount,
    );
    expect(retentionAfterCutover.storageInventory.complete).toBe(true);
    const postCutoverRetentionPlan = await page.request.post(
      "/api/role-model/storage-retention/dry-run",
    );
    expect(postCutoverRetentionPlan.ok()).toBeTruthy();
    expect(await postCutoverRetentionPlan.json()).toMatchObject({
      currentPlan: {
        manifestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        blocks: [],
      },
    });

    await page.goto("/app/system/extensions");
    await expect(page.getByLabel("Extensions summary").getByText("Installed")).toBeVisible();
    await expect(
      page.getByRole("table").getByText("knowledge-worker", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Shadow-ready by default", { exact: true })).toBeVisible();
  });
});
