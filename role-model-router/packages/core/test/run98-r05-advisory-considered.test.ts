import { describe, expect, test } from "vitest";

import { evaluateRouteAdvisoryConsideration, routeRequest } from "../src/router.js";
import type {
  EndpointCandidate,
  RouteAdvisoryConsiderationInput,
  RouteRequestInput,
  RoutingRequest,
} from "../src/types.js";

/**
 * Run 98 R5 (stage S2, advisory-considered): an advisory may only re-rank candidates that
 * are already eligible, only inside the configured score band, and only when the operator
 * policy gates pass. Every other case falls back to the baseline with a typed reason.
 */

function candidate(endpointId: string, capabilities: readonly string[]): EndpointCandidate {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: endpointId,
      runtime_version: "1",
      region: "global",
    },
    declared: {
      endpoint_id: endpointId,
      capabilities,
      modalities: ["text"],
      max_context_tokens: 100_000,
      tool_calling: { supported: false, style: "openai" },
      supports_embeddings: false,
    },
    status: "active",
  };
}

const baseRequest: RoutingRequest = {
  requestId: "run98-r05",
  taskType: "text.chat",
  requiredCapabilities: [],
  preferredCapabilities: [],
  requiredModalities: ["text"],
  contextTokens: 1000,
  needsTools: false,
  strategy: "balanced",
  preferLocal: false,
};

const routeInput = (advisory?: RouteAdvisoryConsiderationInput): RouteRequestInput => ({
  request: baseRequest,
  candidates: [
    candidate("endpoint-a", ["text.chat"]),
    candidate("endpoint-b", ["text.chat"]),
    candidate("endpoint-c", ["text.chat"]),
  ],
  ...(advisory ? { advisoryConsideration: advisory } : {}),
});

const scored = [
  { endpoint_id: "endpoint-a", total_score: 0.9 },
  { endpoint_id: "endpoint-b", total_score: 0.88 },
  { endpoint_id: "endpoint-c", total_score: 0.5 },
];

const advisory = (
  overrides: Partial<RouteAdvisoryConsiderationInput> = {},
): RouteAdvisoryConsiderationInput => ({
  candidateId: "candidate-1",
  preferredEndpointId: "endpoint-b",
  advisoryState: "fresh",
  confidence: 0.8,
  advisoryId: "advisory:1",
  policyVersion: "policy:1",
  stage: "S2",
  scoreBand: 0.05,
  minAdvisoryConfidence: 0.7,
  cohortPercent: 100,
  thresholdSetVersion: "scorers.replay.v1+judge",
  ...overrides,
});

describe("run98 R5 advisory-considered selection", () => {
  test("AC-R05-01/02 applies inside the band and refuses to widen eligibility", () => {
    const applied = evaluateRouteAdvisoryConsideration({
      scored,
      eligibleEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
      decisionSeed: "decision-1",
      advisory: advisory(),
    });
    expect(applied).toMatchObject({
      applied: true,
      explorationMode: "advisory_considered",
      selectionProbability: 1,
      advisoryPackageId: "endpoint-b",
      fallbackReason: null,
      scoreBand: 0.05,
      thresholdSetVersion: "scorers.replay.v1+judge",
    });
    expect(applied.scoreGapBefore).toBeCloseTo(0.02, 5);

    const ineligible = evaluateRouteAdvisoryConsideration({
      scored,
      eligibleEndpointIds: ["endpoint-a"],
      decisionSeed: "decision-1",
      advisory: advisory(),
    });
    expect(ineligible.applied).toBe(false);
    expect(ineligible.fallbackReason).toBe("advisory_candidate_not_eligible");

    const outsideBand = evaluateRouteAdvisoryConsideration({
      scored,
      eligibleEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
      decisionSeed: "decision-1",
      advisory: advisory({ preferredEndpointId: "endpoint-c" }),
    });
    expect(outsideBand.applied).toBe(false);
    expect(outsideBand.fallbackReason).toBe("outside_score_band");
    expect(outsideBand.scoreGapBefore).toBeCloseTo(0.4, 5);
  });

  test("AC-R05-04 every policy gate failure falls back with a typed reason", () => {
    const cases: Array<[Partial<RouteAdvisoryConsiderationInput>, string]> = [
      [{ advisoryState: "stale" }, "advisory_stale"],
      [{ advisoryState: "unavailable" }, "advisory_unavailable"],
      [{ stage: "S1" }, "stage_below_s2"],
      [{ killSwitch: true }, "kill_switch_engaged"],
      [{ confidence: 0.2 }, "below_confidence_floor"],
      [{ cohortPercent: 0 }, "cohort_excluded"],
      [{ preferredEndpointId: null }, "advisory_candidate_not_eligible"],
    ];
    for (const [overrides, reason] of cases) {
      const outcome = evaluateRouteAdvisoryConsideration({
        scored,
        eligibleEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
        decisionSeed: "decision-gates",
        advisory: advisory(overrides),
      });
      expect(outcome.applied, reason).toBe(false);
      expect(outcome.fallbackReason, reason).toBe(reason);
      expect(outcome.explorationMode).toBe("baseline");
    }
    const noAdvisory = evaluateRouteAdvisoryConsideration({
      scored,
      eligibleEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
      decisionSeed: "decision-gates",
    });
    expect(noAdvisory.fallbackReason).toBe("no_advisory");
  });

  test("AC-R05-03 cohort assignment is deterministic and records the bucket", () => {
    const first = evaluateRouteAdvisoryConsideration({
      scored,
      eligibleEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
      decisionSeed: "stable-decision",
      advisory: advisory({ cohortPercent: 1 }),
    });
    const second = evaluateRouteAdvisoryConsideration({
      scored,
      eligibleEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
      decisionSeed: "stable-decision",
      advisory: advisory({ cohortPercent: 1 }),
    });
    expect(first.cohortBucket).toBe(second.cohortBucket);
    expect(first.applied).toBe(second.applied);
    expect(first.cohortBucket).toBeGreaterThanOrEqual(0);
    expect(first.cohortBucket).toBeLessThan(100);
  });

  test("AC-R05-03 randomized exploration records the selection probability", () => {
    const outcomes = Array.from({ length: 40 }, (_, index) =>
      evaluateRouteAdvisoryConsideration({
        scored,
        eligibleEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
        decisionSeed: `exploration-${index}`,
        advisory: advisory({ explorationPercent: 25 }),
      }),
    );
    const explored = outcomes.filter((outcome) => outcome.explorationMode === "advisory_exploration");
    expect(explored.length).toBeGreaterThan(0);
    expect(explored.length).toBeLessThan(outcomes.length);
    for (const outcome of outcomes) {
      // The propensity is the probability of the arm that was actually selected: the
      // advisory arm under exploration, the baseline arm otherwise.
      expect(outcome.selectionProbability).toBeCloseTo(
        outcome.explorationMode === "advisory_exploration" ? 0.25 : 0.75,
        5,
      );
    }
  });

  test("AC-R05-02 the router applies the advisory only when it is passed and gated", () => {
    const baseline = routeRequest(routeInput());
    expect(baseline.advisory_consideration).toBeUndefined();
    expect(baseline.chosen_endpoint_id).toBe("endpoint-a");

    const considered = routeRequest(
      routeInput(advisory({ preferredEndpointId: null, scoreBand: 0.5 })),
    );
    expect(considered.chosen_endpoint_id).toBe(baseline.chosen_endpoint_id);
    expect(considered.advisory_consideration).toMatchObject({
      applied: false,
      fallbackReason: "advisory_candidate_not_eligible",
    });
  });
});
