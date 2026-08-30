import { describe, expect, test } from "vitest";

import { normalizeStorageRetentionContract } from "../src/track-b-operations.js";

describe("Run 95 storage projection", () => {
  test("preserves unavailable-observation diagnostics instead of replacing them with zero-byte readiness", () => {
    const summary = normalizeStorageRetentionContract({
      policyState: { channel: "development", state: "enforced" },
      storageInventory: {
        complete: false,
        physicalResources: [
          {
            id: "physical-cloud-history",
            owner: "history-service",
            health: "unavailable",
            measurement: "remote_observed",
            physicalBytes: null,
            heldItems: 0,
            retentionState: "measured_uncovered",
            observationState: "observed",
            observedAt: "2026-08-30T00:00:00.000Z",
          },
        ],
      },
    });
    const row = (summary.physicalResources as Record<string, unknown>[])[0];
    expect(row).toMatchObject({
      health: "unavailable",
      physicalBytes: null,
      observationReason: "Observation reported unavailable",
      lastCheckedAt: "2026-08-30T00:00:00.000Z",
      retentionState: "measured_uncovered",
    });
    expect(summary.policyState).toEqual({ channel: "development", state: "enforced" });
  });
});
