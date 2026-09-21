import { expect, test } from "vitest";

import {
  PairwiseJudgeOrderDisagreementError,
  createRouterPairwiseJudge,
} from "../src/track-b-shadow-judge-dispatch.js";
import {
  buildPairwiseJudgeMessages,
  pairwiseJudgePresentation,
  parsePairwiseJudgeResponse,
} from "../src/track-b-shadow-judge.js";

/**
 * Run 98 R10 - judge quality: identity-blind mode, agreement measurement, and bounded
 * position-order effects. Every failure path must be recorded and must never become a
 * silent tie.
 */

const taskText = "Fix the failing router test.";
const source = { candidateRef: "endpoint:source", outputText: "source answer" };
const counterfactual = {
  candidateRef: "endpoint:counterfactual",
  outputText: "counterfactual answer",
};

const judgeRouter = (
  responses: readonly string[],
  calls: Array<{ requestId: string; messages: readonly { content: string }[] }>,
) => ({
  executeChatCompletions: async (
    body: { messages: readonly { content: string }[] },
    requestId: string,
  ) => {
    calls.push({ requestId, messages: body.messages });
    const contentText = responses[Math.min(calls.length - 1, responses.length - 1)] ?? "";
    return { contentText, routingDecisionId: `decision:${requestId}` };
  },
  endpoints: [{ endpointId: "endpoint:judge", modelId: "judge-model" }],
  excludedEndpointIds: ["endpoint:source", "endpoint:counterfactual"],
  taskText,
});

const request = {
  requestId: "route-98-judge",
  channel: "development",
  scope: "tenant:run98",
  authorizationEpoch: 1,
  evaluationJobId: "job:98",
  judgeEndpointId: "endpoint:judge",
  source: {
    trialId: "trial:source",
    candidateRef: source.candidateRef,
    outputRef: "output:source",
    outputDigest: "sha256:source",
    outputText: source.outputText,
  },
  counterfactual: {
    trialId: "trial:counterfactual",
    candidateRef: counterfactual.candidateRef,
    outputRef: "output:counterfactual",
    outputDigest: "sha256:counterfactual",
    outputText: counterfactual.outputText,
  },
} as const;

test("AC-R10-01 identity-blind prompts withhold model identities and the identified judge keeps them", () => {
  const identified = buildPairwiseJudgeMessages({
    taskText,
    sourceText: source.outputText,
    counterfactualText: counterfactual.outputText,
    sourceCandidateRef: source.candidateRef,
    counterfactualCandidateRef: counterfactual.candidateRef,
  });
  expect(identified[1].content).toContain('model="endpoint:source"');
  expect(identified[1].content).toContain('model="endpoint:counterfactual"');

  const blind = buildPairwiseJudgeMessages({
    taskText,
    sourceText: source.outputText,
    counterfactualText: counterfactual.outputText,
    sourceCandidateRef: source.candidateRef,
    counterfactualCandidateRef: counterfactual.candidateRef,
    mode: "identity_blind",
  });
  expect(blind[1].content).not.toContain("endpoint:source");
  expect(blind[1].content).not.toContain("endpoint:counterfactual");
  expect(blind[1].content).not.toContain("model=");
  expect(blind[1].content).toContain('label="A"');
  expect(blind[1].content).toContain('label="B"');
});

test("AC-R10-02 presentation order is recorded and swapped answers translate back through it", () => {
  const swapped = buildPairwiseJudgeMessages({
    taskText,
    sourceText: source.outputText,
    counterfactualText: counterfactual.outputText,
    sourceCandidateRef: source.candidateRef,
    counterfactualCandidateRef: counterfactual.candidateRef,
    presentation: pairwiseJudgePresentation(true),
  });
  const userMessage = swapped[1].content;
  expect(userMessage.indexOf("counterfactual answer")).toBeLessThan(
    userMessage.indexOf("source answer"),
  );
  // "A" now means the counterfactual branch.
  expect(
    parsePairwiseJudgeResponse('{"winner":"A","confidence":0.9}', { first: "counterfactual" }),
  ).toMatchObject({ winner: "counterfactual" });
  expect(
    parsePairwiseJudgeResponse('{"winner":"B","confidence":0.9}', { first: "counterfactual" }),
  ).toMatchObject({ winner: "source" });
});

test("AC-R10-01 agreement with the identified judge is measured and recorded", async () => {
  const calls: Array<{ requestId: string; messages: readonly { content: string }[] }> = [];
  const observations: Array<Record<string, unknown>> = [];
  const judge = createRouterPairwiseJudge({
    ...judgeRouter(
      [
        '{"winner":"A","confidence":0.8}', // identity-blind: A is the source
        '{"winner":"A","confidence":0.7}', // identified probe: A is the source as well
      ],
      calls,
    ),
    mode: "identity_blind",
    measureAgreement: true,
    recordJudgeObservation: (row) => observations.push(row as unknown as Record<string, unknown>),
  });
  expect(judge?.mode).toBe("identity_blind");
  const decision = await judge?.dispatch(request);
  expect(decision).toMatchObject({
    winner: "source",
    judgeMode: "identity_blind",
    judgeModeAgreement: true,
    presentation: { first: "source" },
  });
  // The blind dispatch must not leak identities into the prompt.
  expect(calls[0]?.messages[1].content).not.toContain("model=");
  expect(observations.some((row) => row.agreement === true)).toBe(true);

  const disagreeing = createRouterPairwiseJudge({
    ...judgeRouter(['{"winner":"A","confidence":0.8}', '{"winner":"B","confidence":0.7}'], []),
    mode: "identity_blind",
    measureAgreement: true,
    recordJudgeObservation: (row) => observations.push(row as unknown as Record<string, unknown>),
  });
  const disagreeingDecision = await disagreeing?.dispatch(request);
  expect(disagreeingDecision?.judgeModeAgreement).toBe(false);
  expect(observations.some((row) => row.agreement === false)).toBe(true);
});

/**
 * Run 98 addendum 33 S2: `balanced` is now the default (a flipped pair is calibrated to an explicit tie
 * and kept as evidence), so the strict refusal is asserted by naming it — `fails_closed` remains the
 * behaviour a caller gets when it asks for it, and `run98-a33-order-calibration.test.ts` pins the default.
 */
test("AC-R10-02 dual-order disagreement fails closed with a typed reason when strictness is declared", async () => {
  const observations: Array<Record<string, unknown>> = [];
  const judge = createRouterPairwiseJudge({
    ...judgeRouter(
      // A in the source-first order means source; A in the swapped order means the
      // counterfactual, so the two orders disagree.
      ['{"winner":"A","confidence":0.8}', '{"winner":"A","confidence":0.8}'],
      [],
    ),
    orderPolicy: "dual_order",
    orderAggregation: "fails_closed",
    recordJudgeObservation: (row) => observations.push(row as unknown as Record<string, unknown>),
  });
  await expect(judge?.dispatch(request)).rejects.toBeInstanceOf(
    PairwiseJudgeOrderDisagreementError,
  );
  await expect(judge?.dispatch(request)).rejects.toMatchObject({
    code: "position_order_disagreement",
  });
  expect(observations.some((row) => row.outcome === "order_disagreement")).toBe(true);
});

test("AC-R10-02 dual-order agreement yields the decided winner with both orders recorded", async () => {
  const calls: Array<{ requestId: string; messages: readonly { content: string }[] }> = [];
  const judge = createRouterPairwiseJudge({
    ...judgeRouter(
      // A then B both mean the source branch across the two presentation orders.
      ['{"winner":"A","confidence":0.8}', '{"winner":"B","confidence":0.8}'],
      calls,
    ),
    orderPolicy: "dual_order",
  });
  const decision = await judge?.dispatch(request);
  expect(decision?.winner).toBe("source");
  expect(calls).toHaveLength(2);
  expect(calls[0]?.requestId).not.toBe(calls[1]?.requestId);
});

test("AC-R10-02 an unparseable judge response still fails closed", async () => {
  const judge = createRouterPairwiseJudge({ ...judgeRouter(["I cannot decide"], []) });
  await expect(judge?.dispatch(request)).rejects.toThrow(/unparseable/i);
});
