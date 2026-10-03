import { describe, expect, test } from "vitest";

import { planChallenge } from "@role-model-router/core";

/**
 * Run 105 R8: a complete task idles for stalenessWindowDays, then becomes eligible for a refresh
 * replay; a new configured endpoint breaks the idle immediately and starts a TOP-DOWN challenge
 * (leader first, then the next rung), one pairwise comparison per challenged rung, bounded by
 * challengeBatchSize. The 30 days is ONE constant used for both the request-count window and the
 * idle (plan drift check #7).
 */
const rung = (endpointId: string, rank: number, status: "available" | "unavailable" = "available") => ({ endpointId, rank, status });

describe("run105 R8 idle refresh and challenge", () => {
  test("the challenge walks the leader first and then the next rung, one comparison per rung", () => {
    const planned = planChallenge({
      newEndpointId: "endpoint:new",
      rungs: [rung("endpoint:leader", 1), rung("endpoint:second", 2), rung("endpoint:third", 3)],
      challengeBatchSize: 3,
    });
    expect(planned).toEqual([
      { newEndpointId: "endpoint:new", againstEndpointId: "endpoint:leader", rank: 1 },
      { newEndpointId: "endpoint:new", againstEndpointId: "endpoint:second", rank: 2 },
      { newEndpointId: "endpoint:new", againstEndpointId: "endpoint:third", rank: 3 },
    ]);
  });

  test("challengeBatchSize bounds how many sequential comparisons one dispatch may run", () => {
    const input = { newEndpointId: "endpoint:new", rungs: [rung("a", 1), rung("b", 2), rung("c", 3)] };
    expect(planChallenge({ ...input, challengeBatchSize: 1 })).toHaveLength(1);
    expect(planChallenge({ ...input, challengeBatchSize: 2 })).toHaveLength(2);
    expect(planChallenge({ ...input, challengeBatchSize: 0 })).toEqual([]);
    expect(planChallenge({ ...input, challengeBatchSize: -1 })).toEqual([]);
  });

  test("a user-removed rung is not challenged (status unavailable is skipped)", () => {
    expect(
      planChallenge({
        newEndpointId: "endpoint:new",
        rungs: [rung("a", 1, "unavailable"), rung("b", 2)],
        challengeBatchSize: 1,
      }).map((row) => row.againstEndpointId),
    ).toEqual(["b"]);
  });

  test("a ladder holding only the new endpoint has nothing to challenge", () => {
    expect(planChallenge({ newEndpointId: "a", rungs: [rung("a", 1)], challengeBatchSize: 3 })).toEqual([]);
  });
});
