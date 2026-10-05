import { describe, expect, test } from "vitest";

import {
  PairwiseJudgeOrderDisagreementError,
  createRouterPairwiseJudge,
} from "../src/track-b-shadow-judge-dispatch.js";

/**
 * Run 98 addendum 33 S2 (the research's Balanced Position Calibration; guidance/07 "randomize execution
 * order where order can bias tools or caches"): a pair the judge flips under a swapped presentation
 * measured a position effect, not a preference. Addendum 30's `dual_order` turned every flip into a
 * discarded row (15+ live rows lost that way); `balanced` keeps the pair and calibrates it to an explicit
 * tie, while `strict_consistency` stays available for callers that would rather refuse the pair.
 */

const request = {
  requestId: "route-98-a33",
  channel: "development",
  scope: "tenant:run98",
  authorizationEpoch: 1,
  evaluationJobId: "job:a33",
  judgeEndpointId: "endpoint:judge",
  source: {
    trialId: "trial:source",
    candidateRef: "endpoint:source",
    outputRef: "output:source",
    outputDigest: "sha256:source",
    outputText: "source answer",
  },
  counterfactual: {
    trialId: "trial:counterfactual",
    candidateRef: "endpoint:counterfactual",
    outputRef: "output:counterfactual",
    outputDigest: "sha256:counterfactual",
    outputText: "counterfactual answer",
  },
} as const;

const flippingJudge = (calls: unknown[]) => ({
  async executeChatCompletions(_body: unknown, requestId: string) {
    calls.push(requestId);
    // Both presentations answer "A"; in the swapped one A is the other candidate, so the judge
    // contradicted itself.
    return {
      contentText: '{"winner":"A","confidence":0.9}',
      routingDecisionId: `decision:${requestId}`,
    };
  },
  endpoints: [{ endpointId: "endpoint:judge", modelId: "judge-model" }],
  excludedEndpointIds: ["endpoint:source", "endpoint:counterfactual"],
  taskText: "Fix the failing router test.",
});

describe("run98 A33 S2 position-order calibration", () => {
  test("a flipped pair is calibrated to an explicit tie instead of being discarded", async () => {
    const calls: unknown[] = [];
    const observations: Array<Record<string, unknown>> = [];
    const judge = createRouterPairwiseJudge({
      ...flippingJudge(calls),
      judgeEndpointId: "endpoint:judge",
      mode: "identity_blind",
      orderPolicy: "dual_order",
      orderAggregation: "balanced",
      recordJudgeObservation: (row) => observations.push(row as Record<string, unknown>),
    });
    expect(judge).toBeDefined();
    const decision = await judge?.dispatch(request as never);
    expect(decision.winner).toBe("tie");
    expect(decision.orderDisagreement).toBe(true);
    expect(decision.confidence).toBeLessThanOrEqual(0.5);
    expect(observations.some((row) => row.outcome === "order_disagreement")).toBe(true);
  });

  test("strict_consistency still refuses a flipped pair", async () => {
    const calls: unknown[] = [];
    const judge = createRouterPairwiseJudge({
      ...flippingJudge(calls),
      judgeEndpointId: "endpoint:judge",
      mode: "identity_blind",
      orderPolicy: "dual_order",
      orderAggregation: "strict_consistency",
    });
    await expect(judge?.dispatch(request as never)).rejects.toBeInstanceOf(
      PairwiseJudgeOrderDisagreementError,
    );
  });

  test("fails_closed keeps the strict behaviour for callers that name it", async () => {
    const calls: unknown[] = [];
    const judge = createRouterPairwiseJudge({
      ...flippingJudge(calls),
      judgeEndpointId: "endpoint:judge",
      mode: "identity_blind",
      orderPolicy: "dual_order",
      orderAggregation: "fails_closed",
    });
    await expect(judge?.dispatch(request as never)).rejects.toBeInstanceOf(
      PairwiseJudgeOrderDisagreementError,
    );
  });
});
