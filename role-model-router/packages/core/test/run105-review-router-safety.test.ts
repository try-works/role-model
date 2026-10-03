import { describe, expect, test } from "vitest";
import { resolveAdvisoryRung } from "../src/route-advisory-ladder.js";
import { evaluateRouteAdvisoryConsideration, routeRequest } from "../src/router.js";
import type {
  EndpointCandidate,
  RouteAdvisoryConsiderationInput,
  RouteAdvisoryRung,
  RouteRequestInput,
} from "../src/types.js";

const scored = [
  { endpoint_id: "leader", total_score: 0.9 },
  { endpoint_id: "near", total_score: 0.89 },
  { endpoint_id: "far", total_score: 0.5 },
];
const ladder: readonly RouteAdvisoryRung[] = [{ endpointId: "near", rank: 1, status: "available" }];
const advisory = (
  overrides: Partial<RouteAdvisoryConsiderationInput> = {},
): RouteAdvisoryConsiderationInput => ({
  candidateId: "candidate-1",
  preferredEndpointId: "near",
  advisoryState: "fresh",
  confidence: 0.9,
  stage: "S3",
  scoreBand: 0.05,
  minAdvisoryConfidence: 0.7,
  cohortPercent: 100,
  taskTypeId: "task.review",
  taxonomyVersion: "taxonomy-v1",
  ...overrides,
});
const consider = (overrides: Partial<RouteAdvisoryConsiderationInput> = {}, request = {}) =>
  evaluateRouteAdvisoryConsideration({
    scored,
    eligibleEndpointIds: ["leader", "near", "far"],
    decisionSeed: "decision-1",
    advisory: advisory(overrides),
    requestTaskTypeId: "task.review",
    requestTaxonomyVersion: "taxonomy-v1",
    ...request,
  });
const evidenceKeys = [
  "advisoryLadderLength",
  "advisoryRungRank",
  "advisoryRungWalked",
  "advisoryRungSkipped",
];

describe("run105 review router safety", () => {
  test("R5 no-ladder success keeps exact legacy object and serialized key order", () => {
    const expected = {
      applied: true,
      explorationMode: "advisory_considered",
      selectionProbability: 1,
      advisoryCandidateId: "candidate-1",
      advisoryPackageId: "near",
      advisoryConfidence: 0.9,
      thresholdSetVersion: null,
      policyVersion: null,
      scoreBand: 0.05,
      scoreGapBefore: 0.9 - 0.89,
      cohortBucket: 33,
      advisoryPackageEligible: true,
      eligibleEndpointCount: 3,
      advisoryTaskTypeId: "task.review",
      requestTaskTypeId: "task.review",
      advisoryTaxonomyVersion: "taxonomy-v1",
      fallbackReason: null,
    };
    expect(consider()).toEqual(expected);
    expect(JSON.stringify(consider())).toBe(JSON.stringify(expected));
  });
  test.each([
    [{ advisoryState: "stale" }, "advisory_stale"],
    [{ advisoryState: "unavailable" }, "advisory_unavailable"],
    [{ stage: "S1" }, "stage_below_s2"],
    [{ killSwitch: true }, "kill_switch_engaged"],
    [{ preferredEndpointId: null }, "advisory_candidate_not_eligible"],
    [{ avoidFor: ["task.review"] }, "advisory_task_avoided"],
    [{ taskTypeId: null }, "advisory_task_unscoped"],
    [{ taskTypeId: "task.other" }, "advisory_task_mismatch"],
    [{ taxonomyVersion: "old" }, "advisory_taxonomy_mismatch"],
    [{ confidence: 0.1 }, "below_confidence_floor"],
    [{ cohortPercent: 0 }, "cohort_excluded"],
    [{ preferredEndpointId: "far" }, "outside_score_band"],
    [{ preferredEndpointId: "leader" }, "advisory_matches_baseline"],
  ] as const)(
    "R5 no-ladder gate %j preserves fallback %s and omits ladder keys",
    (overrides, reason) => {
      const outcome = consider(overrides);
      expect(outcome.fallbackReason).toBe(reason);
      for (const key of evidenceKeys) expect(Object.hasOwn(outcome, key), key).toBe(false);
    },
  );
  test.each([
    [[{ endpointId: "near", rank: 3.5, status: "available" }]],
    [[{ endpointId: "near", rank: 1, status: "unknown" }]],
    [[{ endpointId: "near", rank: 0, status: "available" }]],
    [[null]],
    [
      [
        { endpointId: "near", rank: 1, status: "available" },
        { endpointId: "far", rank: 2, status: "unknown" },
      ],
    ],
  ])("malformed ladder %j fails closed without throwing or partially walking", (rungs) => {
    const malformed = rungs as unknown as readonly RouteAdvisoryRung[];
    expect(() => resolveAdvisoryRung(malformed, ["near", "far"])).not.toThrow();
    expect(resolveAdvisoryRung(malformed, ["near", "far"])._tag).toBe("Starved");
    expect(() => consider({ preferredLadder: malformed })).not.toThrow();
    expect(consider({ preferredLadder: malformed })).toMatchObject({
      applied: false,
      fallbackReason: "advisory_candidate_not_eligible",
      advisoryRungRank: null,
      advisoryRungWalked: null,
    });
  });
  test.each([undefined, null, "role.other"])(
    "ladder refuses absent or mismatched role %s",
    (roleId) => {
      expect(
        consider({ preferredLadder: ladder, roleId }, { requestRoleId: "role.review" }),
      ).toMatchObject({
        applied: false,
        fallbackReason: "advisory_task_mismatch",
      });
    },
  );
  test("ladder requires explicit task scope and cannot borrow preferredFor", () => {
    expect(
      consider({ preferredLadder: ladder, taskTypeId: null, preferredFor: ["task.review"] }),
    ).toMatchObject({
      applied: false,
      fallbackReason: "advisory_task_unscoped",
    });
    expect(consider({ taskTypeId: null, preferredFor: ["task.review"] }).applied).toBe(true);
  });
  test("no advisory also omits the four evidence keys", () => {
    const outcome = evaluateRouteAdvisoryConsideration({
      scored,
      eligibleEndpointIds: ["leader"],
      decisionSeed: "decision-1",
    });
    expect(outcome.fallbackReason).toBe("no_advisory");
    for (const key of evidenceKeys) expect(Object.hasOwn(outcome, key), key).toBe(false);
  });
  test("band gates first routable rung once, not first in-band rung", () => {
    const outcome = consider({
      preferredLadder: [
        { endpointId: "removed", rank: 1, status: "unavailable" },
        { endpointId: "missing", rank: 2, status: "available" },
        { endpointId: "far", rank: 3, status: "available" },
        { endpointId: "near", rank: 4, status: "available" },
      ],
    });
    expect(outcome).toMatchObject({
      applied: false,
      fallbackReason: "outside_score_band",
      advisoryRungWalked: "far",
      advisoryRungRank: 3,
      advisoryRungSkipped: 2,
      scoreGapBefore: 0.9 - 0.5,
    });
  });
  test("deeper rank influences routing when score and ladder order differ", () => {
    expect(
      consider({
        preferredLadder: [
          { endpointId: "missing", rank: 1, status: "available" },
          { endpointId: "near", rank: 2, status: "available" },
          { endpointId: "leader", rank: 3, status: "available" },
        ],
      }),
    ).toMatchObject({
      applied: true,
      advisoryPackageId: "near",
      advisoryRungRank: 2,
      advisoryRungSkipped: 1,
    });
  });
  test("ladder taxonomy mismatch retains existing fallback", () => {
    expect(consider({ preferredLadder: ladder, taxonomyVersion: "old" }).fallbackReason).toBe(
      "advisory_taxonomy_mismatch",
    );
  });
  test("legacy role absence remains allowed without ladder", () => {
    expect(consider({}, { requestRoleId: "role.review" }).applied).toBe(true);
  });
  test("skip count remains bounded at 32", () => {
    const rungs = Array.from({ length: 100 }, (_, i) => ({
      endpointId: "removed",
      rank: i + 1,
      status: "unavailable" as const,
    }));
    expect(consider({ preferredLadder: rungs }).advisoryRungSkipped).toBe(32);
  });
  test("legacy exploration math still describes one advised arm", () => {
    for (let index = 0; index < 40; index += 1) {
      const outcome = evaluateRouteAdvisoryConsideration({
        scored,
        eligibleEndpointIds: ["leader", "near", "far"],
        decisionSeed: `exploration-${index}`,
        advisory: advisory({ explorationPercent: 25 }),
      });
      expect(outcome.selectionProbability).toBe(
        outcome.explorationMode === "advisory_exploration" ? 0.25 : 0.75,
      );
    }
  });
  test("legacy single selection swap never changes score order or scores", () => {
    const candidate = (id: string): EndpointCandidate => ({
      identity: {
        endpoint_id: id,
        endpoint_kind: "remote_api",
        provider_kind: "remote_openai_compat",
        serving_source: "remote-service",
        model_id: id,
        runtime_version: "1",
        region: "global",
      },
      declared: {
        endpoint_id: id,
        capabilities: ["text.chat"],
        modalities: ["text"],
        max_context_tokens: 100000,
        tool_calling: { supported: false, style: "openai" },
        supports_embeddings: false,
      },
      status: "active",
    });
    const input: RouteRequestInput = {
      request: {
        requestId: "swap",
        taskType: "text.chat",
        requiredCapabilities: [],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 1000,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
      },
      candidates: [candidate("endpoint-a"), candidate("endpoint-b"), candidate("endpoint-c")],
    };
    const baseline = routeRequest(input);
    const output = routeRequest({
      ...input,
      advisoryConsideration: advisory({
        taskTypeId: "text.chat",
        preferredEndpointId: "endpoint-c",
        scoreBand: 0.5,
      }),
    });
    expect(output.chosen_endpoint_id).toBe("endpoint-c");
    expect(output.scored_candidates).toEqual(baseline.scored_candidates);
    expect(output.fallback_endpoint_ids).toEqual(["endpoint-a", "endpoint-b"]);
  });
});
