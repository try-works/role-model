import { expect, test } from "vitest";

import { createRouterEvaluationJudgeAdapter } from "../src/track-b-runtime.js";

test("Run96 S4 RED: the public host routes remote evaluation judges through the authenticated router boundary", async () => {
  const received: Record<string, unknown>[] = [];
  const adapter = createRouterEvaluationJudgeAdapter({
    channel: "development",
    scope: "tenant:one",
    authorizationEpoch: 96,
    dispatch: async (request) => {
      received.push(request);
      return {
        dispatchReceiptId: "dispatch:judge-96",
        routerDecisionId: "decision:judge-96",
        judgeResultRef: "artifact:judge-result-96",
        score: 0.85,
        confidence: 0.7,
      };
    },
  });

  await expect(adapter.dispatch({
    schemaVersion: "role-model.evaluation-judge-dispatch.v1",
    channel: "development",
    scope: "tenant:one",
    evaluationJobId: "evaluation:96",
    trialId: "trial:96",
    outputRef: "artifact:output-96",
    scorer: { id: "judge:quality", version: "1", digest: "sha256:judge-quality-v1", dimension: "quality" },
    judgeEndpointId: "endpoint:judge",
  })).resolves.toEqual({
    dispatchReceiptId: "dispatch:judge-96",
    routerDecisionId: "decision:judge-96",
    judgeResultRef: "artifact:judge-result-96",
    score: 0.85,
    confidence: 0.7,
  });
  expect(received).toEqual([expect.objectContaining({
    schemaVersion: "role-model.evaluation-judge-router-request.v1",
    source: "evaluation-runner-local",
    authorizationEpoch: 96,
    evaluationJobId: "evaluation:96",
    trialId: "trial:96",
    outputRef: "artifact:output-96",
    judgeEndpointId: "endpoint:judge",
  })]);
  expect(JSON.stringify(received)).not.toMatch(/api[_-]?key|credential|secret/i);
});
