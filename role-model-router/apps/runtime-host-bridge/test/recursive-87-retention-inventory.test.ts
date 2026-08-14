import { expect, test } from "vitest";

import * as trackBRuntime from "../src/track-b-runtime.js";

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
