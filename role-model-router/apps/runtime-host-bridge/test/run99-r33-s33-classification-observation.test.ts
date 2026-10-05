import { describe, expect, test } from "vitest";

import { buildLiveRouteAdvisoryObservation } from "../src/track-b-runtime.js";

/**
 * Run 99 close-out / addenda 19-21 (`S33`, `D1`, `D6`).
 *
 * `S33` requires the classification to be recorded, not only the family: `taskTypeId`, `roleId`,
 * `toolClassIds` and the taxonomy identity (`taxonomyVersion`, `contentRevision`,
 * `contentHashes.taskTypes`), carried onto the advisory observation and the observation ledger
 * entry, with `selectionMode`/`selectionProbability` (`D6`).
 *
 * Measured on the live stage runtime before this slice: of 5,000 bounded ledger entries, 3,341
 * carried a task family, 17 carried a taxonomy version, and **none** carried `roleId`,
 * `toolClassIds`, `contentRevision`, `contentHashes`, `selectionMode` or `selectionProbability`.
 * The classification is already resolved and validated at request time; it was simply not
 * persisted.
 */

const classification = () => ({
  taskTypeId: "coder.review",
  roleId: "coder",
  toolClassIds: ["filesystem.read", "shell.execute"],
  taxonomyVersion: "1.0.0-alpha.1",
  contentRevision: "taxonomy-v1-alpha.1",
  contentHashes: { taskTypes: `sha256:${"c4c9dfa1".repeat(8)}` },
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
  classification: classification(),
  outcome: {
    applied: false,
    fallbackReason: "advisory_candidate_not_eligible",
    cohortBucket: 42,
    scoreGapBefore: 0.185,
  },
  observedAtMs: 1_789_548_000_000,
  ...overrides,
});

describe("run99 R33 S33 classification on the advisory observation", () => {
  test("carries the whole classification, not only the family", () => {
    const observation = buildLiveRouteAdvisoryObservation(decision() as never) as Record<
      string,
      unknown
    >;
    expect(observation.classification).toEqual(classification());
    // The flat family fields the earlier slices introduced are unchanged.
    expect(observation.taskTypeId).toBe("coder.review");
    expect(observation.requestTaskTypeId).toBe("coder.review");
  });

  test("records the deterministic policy propensity for a live routed answer", () => {
    const observation = buildLiveRouteAdvisoryObservation(decision() as never) as Record<
      string,
      unknown
    >;
    expect(observation.selectionMode).toBe("policy_deterministic");
    expect(observation.selectionProbability).toBe(1);
  });

  test("never fabricates a propensity for a counterfactual replay arm", () => {
    const observation = buildLiveRouteAdvisoryObservation(
      decision({ selectionMode: "replay_counterfactual" }) as never,
    ) as Record<string, unknown>;
    expect(observation.selectionMode).toBe("replay_counterfactual");
    // The arm was chosen by the replay scheduler, not drawn from the policy, so the propensity is
    // unobservable and must stay absent rather than being invented.
    expect(observation.selectionProbability).toBeUndefined();
  });

  test("omits the classification rather than inventing one when the request declared none", () => {
    const observation = buildLiveRouteAdvisoryObservation(
      decision({ classification: undefined }) as never,
    ) as Record<string, unknown>;
    expect(observation.classification).toBeUndefined();
  });
});
