import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";

test.describe("@recursive:87-direct-track-b-semantic-completion @sp5 @smoke", () => {
  test("storage retention exposes truthful inventory and safe maintenance controls", async ({
    page,
  }) => {
    const requestId = `run87-sp5-retention-${Date.now()}`;
    const receiptsBefore = (await (
      await page.request.get("/api/role-model/track-b/shadow-receipts")
    ).json()) as { receipts: Array<{ requestId: string }> };
    const priorReceiptIds = new Set(receiptsBefore.receipts.map((receipt) => receipt.requestId));
    const routed = await page.request.post("/v1/chat/completions", {
      headers: { "x-request-id": requestId },
      data: {
        model: "deepseek/chat-capture-v1",
        messages: [{ role: "user", content: "Create a real retention archive for run 87." }],
      },
    });
    expect(routed.ok()).toBeTruthy();
    const receiptsAfter = (await (
      await page.request.get("/api/role-model/track-b/shadow-receipts")
    ).json()) as { receipts: Array<{ requestId: string }> };
    const capturedRequestId = receiptsAfter.receipts.find(
      (receipt) => !priorReceiptIds.has(receipt.requestId),
    )?.requestId;
    expect(capturedRequestId).toEqual(expect.stringMatching(/^req-/));
    const policy = await page.request.put("/api/role-model/storage-retention/policy", {
      data: {
        policyId: "run87-sp5-held-zero-byte",
        scope: "global",
        maxBytes: 0,
        maxAgeDays: 1,
        holdRequestIds: [capturedRequestId],
      },
    });
    expect(policy.ok()).toBeTruthy();
    await page.goto("/app/system/storage-retention");

    await expect(page.getByRole("heading", { name: "Physical storage inventory" })).toBeVisible();
    const summary = page.getByLabel("Storage retention summary");
    await expect(summary.getByText("Physical stores")).toBeVisible();
    await expect(summary.getByText("Legal holds")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Owner" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Physical bytes" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Enforcement" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Dry-run" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Execute plan" })).toBeDisabled();
    const inventoryResponse = await page.request.get("/api/role-model/storage-retention");
    expect(inventoryResponse.ok()).toBeTruthy();
    const inventory = (await inventoryResponse.json()) as {
      totalBytes: number;
      storageInventory: {
        complete: boolean;
        entries: Array<{ measurement: string; physicalBytes: number | null; health: string }>;
      };
    };
    expect(Array.isArray(inventory.storageInventory.entries)).toBe(true);
    expect(
      inventory.storageInventory.entries.every((row) =>
        row.measurement === "measured"
          ? typeof row.physicalBytes === "number"
          : row.measurement === "unavailable" && row.physicalBytes === null,
      ),
    ).toBe(true);
    expect(inventory.storageInventory.complete).toBe(true);
    expect(inventory.storageInventory.entries.some((row) => row.measurement === "measured")).toBe(
      true,
    );
    expect(
      inventory.storageInventory.entries.some((row) => row.measurement === "unavailable"),
    ).toBe(true);
    await expect(page.getByText("Unavailable", { exact: true }).first()).toBeVisible();

    const heldPreview = await page.request.post("/api/role-model/storage-retention/dry-run");
    expect(heldPreview.ok()).toBeTruthy();
    const heldBody = (await heldPreview.json()) as {
      holds: number;
      currentPlan: { conflicts: Array<{ id: string; reason: string }> };
    };
    const heldRetentionId = `capture-${createHash("sha256")
      .update(capturedRequestId as string)
      .digest("hex")
      .slice(0, 24)}`;
    expect(heldBody.holds).toBe(1);
    expect(heldBody.currentPlan.conflicts).toContainEqual({
      id: heldRetentionId,
      reason: "legal_hold",
    });
    await page.reload();
    await expect(
      page.getByLabel("Storage retention summary").getByText("1", { exact: true }),
    ).toBeVisible();

    const releasedPolicy = await page.request.put("/api/role-model/storage-retention/policy", {
      data: {
        policyId: "run87-sp5-released-zero-byte",
        scope: "global",
        maxBytes: 0,
        maxAgeDays: 1,
        holdRequestIds: [],
      },
    });
    expect(releasedPolicy.ok()).toBeTruthy();
    const released = (await releasedPolicy.json()) as { holds: number };
    expect(released.holds).toBe(0);
    const artifactBytesBefore = inventory.storageInventory.entries.find(
      (row) => (row as { id?: string }).id === "artifact_graph",
    )?.physicalBytes;
    expect(artifactBytesBefore).toEqual(expect.any(Number));
    const [dryRun] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          candidate.url().includes("/api/role-model/storage-retention/dry-run") &&
          candidate.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Dry-run" }).click(),
    ]);
    expect(dryRun.ok()).toBeTruthy();
    const dryRunBody = (await dryRun.json()) as { currentPlan?: unknown };
    expect(dryRunBody.currentPlan).toEqual(
      expect.objectContaining({
        manifestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        affectedCount: expect.any(Number),
        estimatedBytes: expect.any(Number),
        rollbackAvailable: true,
        blocks: expect.any(Array),
      }),
    );
    const plan = dryRunBody.currentPlan as {
      manifestHash: string;
      affectedCount: number;
      estimatedBytes: number;
    };
    expect(plan.affectedCount).toBeGreaterThan(0);
    expect(plan.estimatedBytes).toBeGreaterThan(0);
    const execute = await page.request.post("/api/role-model/storage-retention/execute", {
      data: { manifestHash: plan.manifestHash, scope: "global" },
    });
    expect(execute.ok()).toBeTruthy();
    let completed: {
      activeJob?: { status?: string };
      receipts?: Array<{
        id: string;
        status: string;
        affectedCount?: number;
        deletedBytes?: number;
        deletedIds?: string[];
        rollbackAvailable?: boolean;
        maintenancePlanHash?: string;
        maintenanceReceipt?: {
          bounded?: boolean;
          routingInterrupted?: boolean;
          reclaimedBytes?: number;
        };
      }>;
    } = {};
    await expect
      .poll(async () => {
        const response = await page.request.get("/api/role-model/storage-retention");
        completed = await response.json();
        return completed.activeJob?.status;
      })
      .toBe("completed");
    const completionReceipt = completed.receipts?.at(-1);
    expect(completionReceipt).toMatchObject({
      status: "completed",
      rollbackAvailable: true,
      maintenancePlanHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      maintenanceReceipt: { bounded: true, routingInterrupted: false },
    });
    expect(completionReceipt?.affectedCount).toBeGreaterThan(0);
    expect(completionReceipt?.deletedBytes).toBeGreaterThan(0);
    expect(completionReceipt?.deletedIds?.length).toBeGreaterThan(0);
    const afterExecute = (await (
      await page.request.get("/api/role-model/storage-retention")
    ).json()) as {
      storageInventory: { entries: Array<{ id: string; physicalBytes: number | null }> };
    };
    const artifactBytesAfterExecute = afterExecute.storageInventory.entries.find(
      (row) => row.id === "artifact_graph",
    )?.physicalBytes;
    expect(artifactBytesAfterExecute).toEqual(expect.any(Number));
    expect(artifactBytesAfterExecute as number).toBeLessThan(artifactBytesBefore as number);
    const rollback = await page.request.post("/api/role-model/storage-retention/rollback", {
      data: { receiptId: completionReceipt?.id },
    });
    expect(rollback.ok()).toBeTruthy();
    const rolledBack = (await rollback.json()) as {
      receipts: Array<{ status: string; affectedCount: number; sourceReceiptId: string }>;
      totalCount: number;
    };
    expect(rolledBack.receipts.at(-1)).toMatchObject({
      status: "rolled_back",
      sourceReceiptId: completionReceipt?.id,
    });
    expect(rolledBack.receipts.at(-1)?.affectedCount).toBeGreaterThan(0);
    expect(rolledBack.totalCount).toBeGreaterThan(0);

    const afterRollback = (await (
      await page.request.get("/api/role-model/storage-retention")
    ).json()) as {
      totalCount: number;
      storageInventory: { entries: Array<{ id: string; physicalBytes: number | null }> };
    };
    const artifactBytesAfterRollback = afterRollback.storageInventory.entries.find(
      (row) => row.id === "artifact_graph",
    )?.physicalBytes;
    expect(artifactBytesAfterRollback).toBeGreaterThanOrEqual(artifactBytesBefore as number);

    const extensions = (await (
      await page.request.get("/api/role-model/extensions")
    ).json()) as Array<{ id: string; pid: number | null; revision: number }>;
    const artifactStore = extensions.find((row) => row.id === "artifact-store");
    const restarted = await page.request.post("/api/role-model/extensions/mutate", {
      data: {
        id: "artifact-store",
        action: "restart",
        expectedRevision: artifactStore?.revision,
        mutationId: `run87-sp5-storage-owner-restart-${artifactStore?.revision}`,
      },
    });
    expect(restarted.ok()).toBeTruthy();
    const afterOwnerRestart = (await (
      await page.request.get("/api/role-model/extensions")
    ).json()) as Array<{ id: string; lifecycle: string; pid: number | null }>;
    expect(afterOwnerRestart.find((row) => row.id === "artifact-store")).toMatchObject({
      lifecycle: "ready",
    });
    expect(afterOwnerRestart.find((row) => row.id === "artifact-store")?.pid).not.toBe(
      artifactStore?.pid,
    );
    expect(
      (
        (await (await page.request.get("/api/role-model/storage-retention")).json()) as {
          totalCount: number;
        }
      ).totalCount,
    ).toBe(afterRollback.totalCount);
    expect((await page.request.get("/healthz")).ok()).toBeTruthy();
  });
});
