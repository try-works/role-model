import { describe, expect, test } from "vitest";

import { buildLiveRouteAdvisoryObservation } from "../src/track-b-runtime.js";

/**
 * Run 104 `R6` follow-up (`SP4` remainder) - the resolved task variant survives the advisory
 * normalizer.
 *
 * `SP4` (commit `61748eed`) added `taskVariant` to `BridgeRequestClassification` and to all four
 * capture payloads, so the classification a request was routed with carries it. The observation
 * bundle is a plain object, but `normalizeTrackBRouteAdvisoryClassification` re-projects only the
 * run-99 keys (`taskTypeId`, `roleId`, `toolClassIds`, taxonomy identity) before the classification
 * is persisted on the advisory observation ledger entry - so the variant was dropped exactly where
 * `R6` requires it to travel with the classification.
 *
 * These tests pin the passthrough: the variant is recorded on the live observation (which the route
 * capture reads back from the ledger), bounded like every other classification id, and a
 * classification without a variant still normalizes byte-identically.
 */

const classification = (overrides: Record<string, unknown> = {}) => ({
  taskTypeId: "coder.review",
  roleId: "coder",
  toolClassIds: ["filesystem.read", "shell.execute"],
  taxonomyVersion: "1.0.0-alpha.1",
  contentRevision: "taxonomy-v1-alpha.1",
  contentHashes: { taskTypes: `sha256:${"c4c9dfa1".repeat(8)}` },
  ...overrides,
});

const decision = (overrides: Record<string, unknown> = {}) => ({
  decisionId: "decision-req-s33",
  routePackage: "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
  eligibleRoutePackages: [
    "deepseek.personal.deepseek-api-key.global.deepseek-flash-max",
    "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
  ],
  advisory: {
    candidateId: "shadow-s33",
    preferredEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
    advisoryId: "pack-s33",
    advisoryState: "fresh",
    confidence: 0.5,
    stage: "S2",
    policyVersion: "policy:28:00566d8bb0a01609",
    cohortPercent: 100,
    taskTypeId: "coder.review",
    requestTaskTypeId: "coder.review",
    taxonomyVersion: "1.0.0-alpha.1",
  },
  classification: classification({ taskVariant: "review" }),
  outcome: {
    applied: false,
    fallbackReason: "advisory_candidate_not_eligible",
    cohortBucket: 42,
    scoreGapBefore: 0.185,
  },
  observedAtMs: 1_789_548_000_000,
  ...overrides,
});

const readClassification = (observation: Record<string, unknown>): Record<string, unknown> =>
  observation.classification as Record<string, unknown>;

describe("run104 R6 advisory classification carries the task variant", () => {
  test("records the resolved variant on the classification the observation persists", () => {
    const observation = buildLiveRouteAdvisoryObservation(decision() as never) as Record<
      string,
      unknown
    >;
    expect(readClassification(observation).taskVariant).toBe("review");
  });

  test("normalizes a classification without a variant byte-identically", () => {
    const observation = buildLiveRouteAdvisoryObservation(
      decision({ classification: classification() }) as never,
    ) as Record<string, unknown>;
    const normalized = readClassification(observation);
    expect(normalized).toEqual(classification());
    // Absence stays absence: no manufactured `taskVariant: null` key on the persisted record.
    expect("taskVariant" in normalized).toBe(false);
  });

  test("bounds the variant like every other classification id", () => {
    const long = "v".repeat(200);
    const bounded = buildLiveRouteAdvisoryObservation(
      decision({ classification: classification({ taskVariant: long }) }) as never,
    ) as Record<string, unknown>;
    expect(readClassification(bounded).taskVariant).toBe("v".repeat(128));

    const blank = buildLiveRouteAdvisoryObservation(
      decision({ classification: classification({ taskVariant: "   " }) }) as never,
    ) as Record<string, unknown>;
    expect("taskVariant" in readClassification(blank)).toBe(false);
  });
});
