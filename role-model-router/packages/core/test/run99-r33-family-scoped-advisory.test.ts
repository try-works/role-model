import { describe, expect, test } from "vitest";

import { evaluateRouteAdvisoryConsideration } from "../src/router.js";
import type { RouteAdvisoryConsiderationInput } from "../src/types.js";

/**
 * Run 99 R33 (addendum 19 S35 / addendum 20 D1-D3 / addendum 21 D10):
 *
 * Routing already knows the task family. The advisory must be *scoped* to it, exactly like the
 * canonical `EndpointPreferenceRecordV1` (`preferredFor: [taskType]`, `guidance/19` L217), so a
 * preference learned from one family cannot move another family's traffic. An advisory that
 * declares no family is refused (`advisory_task_unscoped`) rather than trusted implicitly; a
 * taxonomy-version mismatch fails closed; and the family gate runs before the confidence floor so
 * the operator sees the real reason.
 */

const scored = [
  { endpoint_id: "endpoint-a", total_score: 0.9 },
  { endpoint_id: "endpoint-b", total_score: 0.88 },
  { endpoint_id: "endpoint-c", total_score: 0.5 },
];

const eligibleEndpointIds = ["endpoint-a", "endpoint-b", "endpoint-c"];

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
  taskTypeId: "coder.review",
  taxonomyVersion: "taxonomy-v1-alpha.1",
  ...overrides,
});

const consider = (
  overrides: Partial<RouteAdvisoryConsiderationInput> = {},
  request: {
    readonly requestTaskTypeId?: string | null;
    readonly requestTaxonomyVersion?: string | null;
  } = { requestTaskTypeId: "coder.review", requestTaxonomyVersion: "taxonomy-v1-alpha.1" },
) =>
  evaluateRouteAdvisoryConsideration({
    scored,
    eligibleEndpointIds,
    decisionSeed: "decision-1",
    advisory: advisory(overrides),
    ...request,
  });

describe("run99 R33 family-scoped advisory", () => {
  test("a code-review advisory does not move a planner decision", () => {
    const outcome = consider(
      { taskTypeId: "coder.review", preferredFor: ["coder.review"] },
      { requestTaskTypeId: "planner.requirements", requestTaxonomyVersion: "taxonomy-v1-alpha.1" },
    );

    expect(outcome.applied).toBe(false);
    expect(outcome.fallbackReason).toBe("advisory_task_mismatch");
    expect(outcome.advisoryTaskTypeId).toBe("coder.review");
    expect(outcome.requestTaskTypeId).toBe("planner.requirements");
  });

  test("an in-family advisory still applies inside the band", () => {
    const outcome = consider();

    expect(outcome).toMatchObject({
      applied: true,
      explorationMode: "advisory_considered",
      fallbackReason: null,
      advisoryTaskTypeId: "coder.review",
      requestTaskTypeId: "coder.review",
    });
  });

  test("an advisory that declares no family is refused, not trusted", () => {
    const outcome = consider({ taskTypeId: null, preferredFor: undefined });

    expect(outcome.applied).toBe(false);
    expect(outcome.fallbackReason).toBe("advisory_task_unscoped");
    expect(outcome.advisoryTaskTypeId).toBeNull();
  });

  test("preferredFor carries the family when taskTypeId is absent", () => {
    const applied = consider({ taskTypeId: null, preferredFor: ["coder.review"] });
    expect(applied.applied).toBe(true);
    expect(applied.advisoryTaskTypeId).toBe("coder.review");

    const refused = consider(
      { taskTypeId: null, preferredFor: ["coder.review"] },
      { requestTaskTypeId: "planner.requirements", requestTaxonomyVersion: null },
    );
    expect(refused.fallbackReason).toBe("advisory_task_mismatch");
  });

  test("avoidFor refuses the family explicitly avoided by the evidence", () => {
    const outcome = consider({ avoidFor: ["coder.review"] });

    expect(outcome.applied).toBe(false);
    expect(outcome.fallbackReason).toBe("advisory_task_avoided");
  });

  test("a taxonomy-version mismatch fails closed", () => {
    const outcome = consider(
      { taxonomyVersion: "taxonomy-v0-other" },
      { requestTaskTypeId: "coder.review", requestTaxonomyVersion: "taxonomy-v1-alpha.1" },
    );

    expect(outcome.applied).toBe(false);
    expect(outcome.fallbackReason).toBe("advisory_taxonomy_mismatch");
    expect(outcome.advisoryTaxonomyVersion).toBe("taxonomy-v0-other");
  });

  test("the family gate runs before the confidence floor", () => {
    const outcome = consider(
      { confidence: 0.2, preferredFor: ["coder.review"], taskTypeId: null },
      { requestTaskTypeId: "planner.requirements", requestTaxonomyVersion: null },
    );

    expect(outcome.fallbackReason).toBe("advisory_task_mismatch");
  });

  test("a request that declares no family keeps the pre-run98-R33 behaviour", () => {
    const outcome = consider(
      { taskTypeId: null, preferredFor: undefined },
      { requestTaskTypeId: null, requestTaxonomyVersion: null },
    );

    expect(outcome).toMatchObject({ applied: true, fallbackReason: null });
  });
});
