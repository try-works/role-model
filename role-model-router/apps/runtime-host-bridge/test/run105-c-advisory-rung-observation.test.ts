import { describe, expect, test } from "vitest";

import { buildLiveRouteAdvisoryObservation } from "../src/track-b-runtime.js";

/**
 * Run 105 package C (C13, R13): the observation ledger recorded ONE package per decision, so
 * "rung 2 applied" and "baseline retained" were indistinguishable. The rung fields are additive
 * and omitted when absent, so every existing observation stays byte-identical.
 */

const decision = (overrides: Record<string, unknown> = {}) => ({
  decisionId: "decision-run105-c",
  routePackage: "endpoint-leader",
  eligibleRoutePackages: ["endpoint-leader", "endpoint-a", "endpoint-b"],
  advisory: {
    candidateId: "shadow-c",
    preferredEndpointId: "endpoint-b",
    advisoryId: "pack-c",
    advisoryState: "fresh" as const,
    confidence: 0.8,
    stage: "S2" as const,
    cohortPercent: 100,
    taskTypeId: "coder.review",
    requestTaskTypeId: "coder.review",
  },
  outcome: {
    applied: false,
    fallbackReason: "advisory_matches_baseline",
    cohortBucket: 3,
    scoreGapBefore: 0,
    advisoryPackageEligible: true,
    eligibleEndpointCount: 3,
  },
  observedAtMs: 1_789_440_400_000,
  ...overrides,
});

describe("run105 C advisory rung observation", () => {
  test("C13 records the walked rung, its rank, the ladder length and the skipped count", () => {
    const observation = buildLiveRouteAdvisoryObservation(
      decision({
        outcome: {
          ...decision().outcome,
          advisoryLadderLength: 3,
          advisoryRungRank: 2,
          advisoryRungWalked: "endpoint-b",
          advisoryRungSkipped: 1,
        },
      }) as never,
    );
    expect(observation).toMatchObject({
      advisoryLadderLength: 3,
      advisoryRungRank: 2,
      advisoryRungWalked: "endpoint-b",
      advisoryRungSkipped: 1,
    });
  });

  test("C13 the rung fields are omitted when the caller has no ladder (back-compat)", () => {
    const observation = buildLiveRouteAdvisoryObservation(decision() as never) as Record<
      string,
      unknown
    >;
    expect(observation).not.toHaveProperty("advisoryLadderLength");
    expect(observation).not.toHaveProperty("advisoryRungRank");
    expect(observation).not.toHaveProperty("advisoryRungWalked");
    expect(observation).not.toHaveProperty("advisoryRungSkipped");
  });

  test("C13 the skipped count is bounded to 32 so a hostile ladder cannot widen the ledger row", () => {
    const observation = buildLiveRouteAdvisoryObservation(
      decision({
        outcome: {
          ...decision().outcome,
          advisoryLadderLength: 64,
          advisoryRungRank: 33,
          advisoryRungWalked: "endpoint-b",
          advisoryRungSkipped: 900,
        },
      }) as never,
    );
    expect(observation).toMatchObject({
      advisoryLadderLength: 64,
      advisoryRungRank: 33,
      advisoryRungSkipped: 32,
    });
  });
});
