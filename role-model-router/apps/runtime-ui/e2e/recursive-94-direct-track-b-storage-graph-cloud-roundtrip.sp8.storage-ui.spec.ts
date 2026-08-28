import { expect, test } from "@playwright/test";

test.describe("@recursive:94-direct-track-b-storage-graph-cloud-roundtrip @sp8 @smoke", () => {
  test("storage UI shows measured physical accounting and honest policy state", async ({
    page,
  }) => {
    const inventoryResponse = await page.request.get("/api/role-model/storage-retention");
    expect(inventoryResponse.ok()).toBeTruthy();
    const inventory = (await inventoryResponse.json()) as {
      totalBytes: number;
      storageAudit: {
        schemaVersion: string;
        available?: boolean;
        allocatedBytes?: number;
        logicalBytes?: number;
        reclaimableBytes?: number;
        unattributedPhysicalBytes?: number;
        heldBytes?: number | null;
        measuredAt?: string;
      } | null;
      policyState: { channel: string; state: string };
      storageInventory: {
        entries: Array<{ measurement: string; physicalBytes: number | null; health: string }>;
      };
    };

    // Honest accounting: local and read-only cloud observations both carry a
    // numeric byte value; intentionally unobserved/unavailable entries do not.
    expect(Array.isArray(inventory.storageInventory.entries)).toBe(true);
    for (const row of inventory.storageInventory.entries) {
      if (["measured", "remote_observed"].includes(row.measurement))
        expect(typeof row.physicalBytes).toBe("number");
      else expect(row.physicalBytes).toBeNull();
    }

    // The read-only audit either reports measured bytes or is honestly absent.
    if (inventory.storageAudit && inventory.storageAudit.available !== false) {
      expect(inventory.storageAudit.schemaVersion).toBe("role-model.storage-audit.v1");
      expect(inventory.storageAudit.allocatedBytes).toEqual(expect.any(Number));
      expect(inventory.storageAudit.measuredAt).toEqual(expect.any(String));
    }

    // Policy state is measured, never fabricated.
    expect(["enforced", "absent", "violation", "unavailable", "enforcement_failure"]).toContain(
      inventory.policyState.state,
    );

    await page.goto("/app/system/storage-retention");
    await expect(page.getByRole("heading", { name: "Physical storage inventory" })).toBeVisible();
    const summary = page.getByLabel("Storage retention summary");
    await expect(summary.getByText("Physical", { exact: true })).toBeVisible();
    await expect(summary.getByText("Logical classes", { exact: true })).toBeVisible();
    await expect(summary.getByText("Reclaimable", { exact: true })).toBeVisible();
    await expect(summary.getByText("Unattributed physical bytes", { exact: true })).toBeVisible();
    await expect(summary.getByText("Legal holds")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Enforcement" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Observation state" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Fresh through" })).toBeVisible();
  });
});
