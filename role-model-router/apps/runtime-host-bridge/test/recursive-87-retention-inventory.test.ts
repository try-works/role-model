import { expect, test } from "vitest";

import * as trackBRuntime from "../src/track-b-runtime.js";
import { normalizeStorageRetentionContract } from "../src/track-b-operations.js";

test("SP5 host retention inventory refuses incomplete physical storage claims", () => {
  expect(typeof trackBRuntime.validateTrackBRetentionInventory).toBe("function");
  const complete = trackBRuntime.validateTrackBRetentionInventory({
    schemaVersion: "role-model.storage-registry.v1",
    entries: [
      {
        id: "artifact_graph",
        owner: "artifact-store",
        health: "ready",
        measurement: "measured",
        physicalBytes: 100,
        heldItems: 1,
        retentionState: "enforced",
      },
      {
        id: "sqlite_runtime_observations",
        owner: "sqlite-memory",
        health: "ready",
        measurement: "measured",
        physicalBytes: 200,
        heldItems: 0,
        retentionState: "enforced",
      },
    ],
  });
  expect(complete).toMatchObject({ complete: true, totalPhysicalBytes: 300, heldItems: 1 });
  expect(() =>
    trackBRuntime.validateTrackBRetentionInventory({
      schemaVersion: "role-model.storage-registry.v1",
      entries: [{ id: "unknown", owner: "", health: "ready" }],
    }),
  ).toThrow(/incomplete physical storage inventory/i);
});

test("SP50 preserves distinct nested physical resources and logical classes", () => {
  const normalized = normalizeStorageRetentionContract({
    storageInventory: {
      schemaVersion: "role-model.storage-registry.v2",
      complete: true,
      entries: [{ id: "legacy-entry" }],
      physicalResources: [{ id: "cloud_history_r2", physicalBytes: 42 }],
      logicalClasses: [{ id: "history", bytes: 21 }],
    },
  });

  expect(normalized.physicalResources).toEqual([
    { id: "cloud_history_r2", physicalBytes: 42 },
  ]);
  expect(normalized.logicalClasses).toEqual([]);
  expect(normalized.storageInventory).toMatchObject({
    physicalResources: [{ id: "cloud_history_r2", physicalBytes: 42 }],
    logicalClasses: [{ id: "history", bytes: 21 }],
  });
});

test("SP53 never projects physical-inventory logical mappings as usage categories", () => {
  const normalized = normalizeStorageRetentionContract({
    storageInventory: {
      schemaVersion: "role-model.storage-registry.v2",
      complete: true,
      logicalClasses: [{ id: "artifact_graph", physicalResourceId: "physical-a", measurement: "physical_resource_reference" }],
      physicalResources: [{ id: "physical-a", physicalBytes: 10 }],
    },
  });

  expect(normalized.logicalClasses).toEqual([]);
  expect((normalized.storageInventory as { logicalClasses: unknown[] }).logicalClasses).toEqual([
    { id: "artifact_graph", physicalResourceId: "physical-a", measurement: "physical_resource_reference" },
  ]);
});
