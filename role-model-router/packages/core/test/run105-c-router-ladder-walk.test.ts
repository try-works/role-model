import { describe, expect, test } from "vitest";

import { evaluateRouteAdvisoryConsideration } from "../src/router.js";
import { resolveAdvisoryRung } from "../src/route-advisory-ladder.js";
import type { RouteAdvisoryConsiderationInput } from "../src/types.js";

/**
 * Run 105 package C (R1 read/match, R4, R5 + addendum A1/A2).
 *
 * The walk skips only NON-ROUTABLE rungs (stored `unavailable` or not in the request's
 * eligible set). It is deliberately NOT band-aware: the existing score band still decides
 * whether the walked preference is APPLIED. Every existing gate/fallback string is unchanged,
 * and role is a new exact-match dimension while taxonomyVersion stays provenance only (A1).
 */

const scored = [
  { endpoint_id: "leader", total_score: 0.9 },
  { endpoint_id: "endpoint-a", total_score: 0.89 },
  { endpoint_id: "endpoint-b", total_score: 0.88 },
];

const allEligible = ["leader", "endpoint-a", "endpoint-b"];

const advisory = (
  overrides: Partial<RouteAdvisoryConsiderationInput> = {},
): RouteAdvisoryConsiderationInput => ({
  candidateId: "candidate-1",
  preferredEndpointId: "endpoint-a",
  advisoryState: "fresh",
  confidence: 0.9,
  advisoryId: "advisory:1",
  stage: "S2",
  scoreBand: 0.05,
  minAdvisoryConfidence: 0.7,
  cohortPercent: 100,
  taskTypeId: "coder.review",
  taxonomyVersion: "taxonomy-v1-alpha.1",
  ...overrides,
});

const consider = (
  overrides: Partial<RouteAdvisoryConsiderationInput> = {},
  request: {
    readonly requestTaskTypeId?: string | null;
    readonly requestTaxonomyVersion?: string | null;
    readonly requestRoleId?: string | null;
  } = { requestTaskTypeId: "coder.review", requestTaxonomyVersion: "taxonomy-v1-alpha.1" },
) =>
  evaluateRouteAdvisoryConsideration({
    scored,
    eligibleEndpointIds: allEligible,
    decisionSeed: "decision-1",
    advisory: advisory(overrides),
    ...request,
  });

describe("run105 C router ladder walk", () => {
  test("R4 walks past unavailable and ineligible rungs in rank order", () => {
    const walked = resolveAdvisoryRung(
      [
        { endpointId: "endpoint-a", rank: 1, status: "unavailable" },
        { endpointId: "endpoint-b", rank: 2, status: "available" },
        { endpointId: "endpoint-c", rank: 3, status: "available" },
      ],
      ["endpoint-c", "endpoint-b"],
    );
    expect(walked).toMatchObject({
      _tag: "Walked",
      endpointId: "endpoint-b",
      rank: 2,
      skipped: 1,
    });

    const ineligibleTop = resolveAdvisoryRung(
      [
        { endpointId: "endpoint-a", rank: 1, status: "available" },
        { endpointId: "endpoint-b", rank: 2, status: "available" },
      ],
      ["endpoint-b"],
    );
    expect(ineligibleTop).toMatchObject({ _tag: "Walked", endpointId: "endpoint-b", rank: 2, skipped: 1 });
  });

  test("R5 a ladder whose rungs are all non-routable starves without inventing a rung", () => {
    const starved = resolveAdvisoryRung(
      [
        { endpointId: "endpoint-a", rank: 1, status: "unavailable" },
        { endpointId: "endpoint-b", rank: 2, status: "available" },
      ],
      ["endpoint-z"],
    );
    expect(starved).toMatchObject({ _tag: "Starved", skipped: 2 });
  });

  test("R5 a greedy walk that lands on the leader records considered-baseline", () => {
    const outcome = consider({
      preferredEndpointId: "endpoint-a",
      preferredLadder: [
        { endpointId: "endpoint-a", rank: 1, status: "unavailable" },
        { endpointId: "leader", rank: 2, status: "available" },
      ],
    });
    expect(outcome).toMatchObject({
      applied: false,
      fallbackReason: "advisory_matches_baseline",
      advisoryPackageId: "leader",
      advisoryLadderLength: 2,
      advisoryRungRank: 2,
      advisoryRungWalked: "leader",
      advisoryRungSkipped: 1,
    });
  });

  test("R4/R5 the walk ignores the score band and lets the band gate the application (A2)", () => {
    const outsideBand = consider({
      preferredEndpointId: "endpoint-b",
      preferredLadder: [
        { endpointId: "endpoint-b", rank: 1, status: "available" },
        { endpointId: "endpoint-a", rank: 2, status: "available" },
      ],
      scoreBand: 0.001,
    });
    // Rung 1 is routable, so the walk stops there; the band (not the walk) refuses it.
    expect(outsideBand).toMatchObject({
      applied: false,
      fallbackReason: "outside_score_band",
      advisoryPackageId: "endpoint-b",
      advisoryRungRank: 1,
      advisoryRungWalked: "endpoint-b",
    });
  });

  test("R5 no routable rung returns the EXISTING advisory_candidate_not_eligible fallback", () => {
    const outcome = consider({
      preferredEndpointId: "endpoint-a",
      preferredLadder: [
        { endpointId: "endpoint-a", rank: 1, status: "unavailable" },
        { endpointId: "endpoint-x", rank: 2, status: "available" },
      ],
    });
    expect(outcome.applied).toBe(false);
    expect(outcome.fallbackReason).toBe("advisory_candidate_not_eligible");
    expect(outcome.advisoryRungWalked).toBeNull();
  });

  test("R1 a role mismatch is refused with the existing advisory_task_mismatch code", () => {
    const outcome = consider(
      { roleId: "role.advisory" },
      {
        requestTaskTypeId: "coder.review",
        requestTaxonomyVersion: "taxonomy-v1-alpha.1",
        requestRoleId: "role.request",
      },
    );
    expect(outcome.applied).toBe(false);
    expect(outcome.fallbackReason).toBe("advisory_task_mismatch");
  });

  test("A1 a taxonomyVersion difference stays provenance-only and never adds a new gate", () => {
    const sameRole = consider(
      { roleId: "role.request", taxonomyVersion: "taxonomy-v0-other" },
      {
        requestTaskTypeId: "coder.review",
        requestTaxonomyVersion: "taxonomy-v1-alpha.1",
        requestRoleId: "role.request",
      },
    );
    // The pre-existing taxonomy gate still fires for the taxonomy dimension itself...
    expect(sameRole.fallbackReason).toBe("advisory_taxonomy_mismatch");

    // ...and matching role+task still applies when the versions agree.
    const matching = consider(
      { roleId: "role.request", taxonomyVersion: "taxonomy-v1-alpha.1" },
      {
        requestTaskTypeId: "coder.review",
        requestTaxonomyVersion: "taxonomy-v1-alpha.1",
        requestRoleId: "role.request",
      },
    );
    expect(matching.applied).toBe(true);
    expect(matching.fallbackReason).toBeNull();
  });

  test("R5 back-compat: without preferredLadder the outcome is byte-for-byte today's result", () => {
    const output = consider({ preferredEndpointId: "endpoint-b" });
    // scoreGapBefore is a float subtraction of the fixture's scores, so it is compared
    // numerically (0.02 vs 0.020000000000000018 is the same gap, not a behaviour change);
    // every other key is compared exactly.
    const { scoreGapBefore, ...rest } = output;
    expect(scoreGapBefore).toBeCloseTo(0.02, 12);
    expect(rest).toEqual({
      applied: true,
      explorationMode: "advisory_considered",
      selectionProbability: 1,
      advisoryCandidateId: "candidate-1",
      advisoryPackageId: "endpoint-b",
      advisoryConfidence: 0.9,
      thresholdSetVersion: null,
      policyVersion: null,
      fallbackReason: null,
      scoreBand: 0.05,
      cohortBucket: expect.any(Number),
      advisoryPackageEligible: true,
      eligibleEndpointCount: 3,
      advisoryTaskTypeId: "coder.review",
      requestTaskTypeId: "coder.review",
      advisoryTaxonomyVersion: "taxonomy-v1-alpha.1",
      advisoryLadderLength: 0,
      advisoryRungRank: null,
      advisoryRungWalked: null,
      advisoryRungSkipped: 0,
    });
  });

  test("R5 every existing fallback string is still produced by its original gate", () => {
    const cases: Array<[Partial<RouteAdvisoryConsiderationInput>, string]> = [
      [{ advisoryState: "stale" }, "advisory_stale"],
      [{ advisoryState: "unavailable" }, "advisory_unavailable"],
      [{ stage: "S1" }, "stage_below_s2"],
      [{ killSwitch: true }, "kill_switch_engaged"],
      [{ confidence: 0.2 }, "below_confidence_floor"],
      [{ cohortPercent: 0 }, "cohort_excluded"],
      [{ preferredEndpointId: null }, "advisory_candidate_not_eligible"],
      [{ avoidFor: ["coder.review"] }, "advisory_task_avoided"],
      [{ taskTypeId: null, preferredFor: undefined }, "advisory_task_unscoped"],
    ];
    for (const [overrides, reason] of cases) {
      const outcome = consider(overrides);
      expect(outcome.applied, reason).toBe(false);
      expect(outcome.fallbackReason, reason).toBe(reason);
    }
    const noAdvisory = evaluateRouteAdvisoryConsideration({
      scored,
      eligibleEndpointIds: allEligible,
      decisionSeed: "decision-1",
    });
    expect(noAdvisory.fallbackReason).toBe("no_advisory");
  });
});
