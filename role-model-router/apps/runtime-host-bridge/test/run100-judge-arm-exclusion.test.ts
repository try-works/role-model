import { describe, expect, test } from "vitest";

import { selectTrackBCounterfactualArms } from "../src/track-b-runtime.js";

/**
 * Run 100 R1 (live finding, clean verification window 2026-09-22): the routing-shadow path created its
 * durable evaluation job with the **controller judge** among its cases, and `evaluation-core` refused it
 * with `judge_candidate_overlap: candidate deepseek…flash-high is the judge declared by scorer set
 * run96-routing-shadow-v3` (`req-26a7d08a-034e-424a`, 03:31:09Z; no job row was written).
 *
 * The replay path already resolves the judge per tick (`resolveJudgeEndpointId` in `cli.ts`) "so it must
 * never be planned as a counterfactual arm"; the post-observation path plans its arms from
 * `configuredCandidateEndpointIds` and never consulted the judge. This helper is the single place both
 * paths can share, and these tests pin its contract: the judge never becomes an arm, and a pool the
 * judge consumes refuses with a named, bounded reason instead of producing evidence the learner must
 * discard.
 */
describe("run 100 R1 judge arm exclusion", () => {
  test("the controller judge is dropped from the arm list and reported by name", () => {
    const selection = selectTrackBCounterfactualArms({
      routePackage: "endpoint:source",
      judgeEndpointId: "endpoint:judge",
      candidateEndpointIds: ["endpoint:arm-b", "endpoint:judge", "endpoint:arm-c"],
      armBound: 4,
    });

    expect(selection.arms).toEqual(["endpoint:arm-b", "endpoint:arm-c"]);
    expect(selection.excluded).toEqual([
      { endpointId: "endpoint:judge", reason: "judge_arm_excluded" },
    ]);
    expect(selection.refusal).toBeNull();
  });

  test("a pool the judge consumes refuses once, naming the judge", () => {
    const selection = selectTrackBCounterfactualArms({
      routePackage: "endpoint:source",
      judgeEndpointId: "endpoint:judge",
      candidateEndpointIds: ["endpoint:judge"],
      armBound: 4,
    });

    expect(selection.arms).toEqual([]);
    expect(selection.excluded).toHaveLength(1);
    expect(selection.refusal?.code).toBe("R14_ALL_CANDIDATES_ARE_JUDGE");
    expect(selection.refusal?.detail).toContain("endpoint:judge");
  });

  test("the served route is still excluded, duplicates collapse and the bound applies", () => {
    const selection = selectTrackBCounterfactualArms({
      routePackage: "endpoint:source",
      judgeEndpointId: null,
      candidateEndpointIds: [
        "endpoint:source",
        "endpoint:arm-b",
        "endpoint:arm-b",
        "endpoint:arm-c",
        "endpoint:arm-d",
      ],
      armBound: 2,
    });

    expect(selection.arms).toEqual(["endpoint:arm-b", "endpoint:arm-c"]);
    expect(selection.excluded).toEqual([]);
    expect(selection.refusal).toBeNull();
  });
});
