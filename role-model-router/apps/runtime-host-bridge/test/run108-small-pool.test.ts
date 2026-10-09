import { expect, test } from "vitest";

import { assessSmallPoolJudgePlacement } from "../src/track-b-runtime.js";

test("run108 R6 a 2-model pool with the judge inside it surfaces a config-time signal", () => {
  // Today a pool of 2 with the judge among them can never form a comparison (2 - 1 served - 1 judge = 0
  // arms) and every capture stalls with a per-tick R14_ALL_CANDIDATES_ARE_JUDGE refusal. The contract: the
  // misplacement is a CONFIG-TIME condition and must be surfaced once, by name, not per tick.
  const signal = assessSmallPoolJudgePlacement({
    candidateEndpointIds: ["endpoint:served", "endpoint:judge"],
    judgeEndpointId: "endpoint:judge",
  });
  expect(signal).toBeTruthy(); // RED today: no export assessSmallPoolJudgePlacement
  expect(signal?.code).toBe("SMALL_POOL_JUDGE_INSIDE_POOL");
  expect(signal?.detail).toContain("the judge must be outside the pool");
});

test("run108 R6 healthy placements produce no signal", () => {
  // 3+ models, or a 2-model pool with the judge OUTSIDE it: no signal.
  expect(
    assessSmallPoolJudgePlacement({
      candidateEndpointIds: ["endpoint:served", "endpoint:judge", "endpoint:arm"],
      judgeEndpointId: "endpoint:judge",
    }),
  ).toBeNull();
  expect(
    assessSmallPoolJudgePlacement({
      candidateEndpointIds: ["endpoint:served", "endpoint:arm"],
      judgeEndpointId: "endpoint:external-judge",
    }),
  ).toBeNull();
  expect(
    assessSmallPoolJudgePlacement({
      candidateEndpointIds: ["endpoint:served"],
      judgeEndpointId: "endpoint:judge",
    }),
  ).toBeNull(); // a 1-model pool has no pair to protect; not a judge-placement defect
});
