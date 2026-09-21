import { expect, test } from "vitest";

import { createRouterPairwiseJudge } from "../src/track-b-shadow-judge-dispatch.js";
import { resolveJudgeEndpointFromController } from "../src/track-b-shadow-judge-dispatch.js";
import {
  buildPairwiseJudgeMessages,
  parsePairwiseJudgeResponse,
  redactJudgeExcerpt,
} from "../src/track-b-shadow-judge.js";

/**
 * Run 97 RC04 - the judge boundary: bounded, redacted excerpts in, a decisively
 * parsed preference out. An unparseable judge answer must be a scorer failure, never a
 * silent tie (`guidance/09`, judge failure persistence).
 */

test("run97 rc04 judge prompts carry the task and both branch answers only", () => {
  const messages = buildPairwiseJudgeMessages({
    taskText: "Fix the failing test in packages/core.",
    sourceText: "Here is the patch A.",
    counterfactualText: "Here is the patch B.",
    sourceCandidateRef: "endpoint:source",
    counterfactualCandidateRef: "endpoint:counterfactual",
  });
  expect(messages).toHaveLength(2);
  expect(messages[0].role).toBe("system");
  expect(messages[1].content).toContain("<task>");
  expect(messages[1].content).toContain("Here is the patch A.");
  expect(messages[1].content).toContain("Here is the patch B.");
  expect(messages[1].content).toContain('label="A"');
  expect(messages[1].content).toContain('label="B"');
});

test("run97 rc04 judge excerpts are bounded and redacted", () => {
  const secret = "sk-live-abcdefghijklmnopqrstuvwx";
  const redacted = redactJudgeExcerpt(`token ${secret} and more text`, 200);
  expect(redacted).not.toContain(secret);
  expect(redacted).toContain("[redacted-token]");
  const bounded = redactJudgeExcerpt("x".repeat(100), 10);
  expect(bounded.startsWith("x".repeat(10))).toBe(true);
  expect(bounded).toContain("[truncated 90 chars]");
  expect(redactJudgeExcerpt("api_key: supersecretvalue")).toContain("[redacted-secret]");
});

test("run97 rc04 judge responses parse into a bounded preference", () => {
  expect(
    parsePairwiseJudgeResponse('{"winner":"B","confidence":0.7,"rationale":"better"}'),
  ).toEqual({
    winner: "counterfactual",
    confidence: 0.7,
    rationale: "better",
  });
  expect(parsePairwiseJudgeResponse('```json\n{"winner":"A","confidence":1}\n```')).toMatchObject({
    winner: "source",
    confidence: 1,
  });
  expect(parsePairwiseJudgeResponse('{"winner":"tie","confidence":0.5}')).toMatchObject({
    winner: "tie",
  });
});

test("run97 rc04 unusable judge responses are rejected instead of defaulting to a tie", () => {
  expect(parsePairwiseJudgeResponse("I cannot decide")).toBeNull();
  expect(parsePairwiseJudgeResponse('{"winner":"maybe","confidence":0.5}')).toBeNull();
  expect(parsePairwiseJudgeResponse('{"winner":"A","confidence":2}')).toBeNull();
  expect(parsePairwiseJudgeResponse('{"winner":"A"}')).toBeNull();
  expect(parsePairwiseJudgeResponse("")).toBeNull();
  expect(parsePairwiseJudgeResponse(null)).toBeNull();
});

/**
 * RC04 live follow-up: the judge dispatch is itself a routed request, so the runtime
 * captures it. The capture boundary classifies replay output by the documented naming
 * family (`<replay-prefix><source>-<16 hex>`), and the first judged comparison on
 * stage used a 24-hex id, so the producer replayed the judge call and amplified. The
 * judge request id therefore has to stay inside the recognised family.
 */
test("run97 rc04 judge dispatches are named in the replay-produced capture family", async () => {
  const requestIds: string[] = [];
  const derived: Record<string, unknown>[] = [];
  const judge = createRouterPairwiseJudge({
    executeChatCompletions: async (_body, requestId) => {
      requestIds.push(requestId);
      return {
        contentText: '{"winner":"B","confidence":0.9}',
        routingDecisionId: "decision:judge-1",
        replayCost: { usd: 0.0005 },
        responseBytes: 64,
      };
    },
    endpoints: [{ endpointId: "endpoint:judge", modelId: "model:judge" }],
    taskText: "Fix the failing test.",
    recordDerivedDispatch: (row) => derived.push(row),
  });
  const branch = (role: "source" | "counterfactual") => ({
    trialId: `trial:${role}`,
    candidateRef: `endpoint:${role}`,
    outputRef: `artifact:${role}`,
    outputDigest: `sha256:${role}`,
    outputText: `${role} answer`,
    role,
  });
  const decision = await judge?.dispatch({
    requestId: "run97-rc04-naming",
    channel: "stage",
    scope: "tenant:naming",
    authorizationEpoch: 1,
    evaluationJobId: "job:naming",
    judgeEndpointId: "endpoint:judge",
    source: branch("source"),
    counterfactual: branch("counterfactual"),
  });
  expect(requestIds).toHaveLength(1);
  expect(requestIds[0]).toMatch(/^replay-judge-[0-9a-f]{16}$/);
  // A 24-hex suffix would not match the boundary's `<16 hex>` family, which is what let
  // the judge capture re-enter the pending replay queue on live traffic.
  expect(requestIds[0]).not.toMatch(/^replay-judge-[0-9a-f]{17,}$/);
  expect(decision).toEqual({
    winner: "counterfactual",
    confidence: 0.9,
    dispatchReceiptId: `router-judge:${requestIds[0]}`,
    routerDecisionId: "decision:judge-1",
    judgeResultRef: expect.stringMatching(/^judge-result:[0-9a-f]{16}$/),
    judgeEndpointId: "endpoint:judge",
    // Run 98 R10: the decision records the judge mode and presentation order it was
    // produced under, so agreement and position-order effects stay measurable.
    judgeMode: "identified",
    presentation: { first: "source" },
  });
  expect(derived).toEqual([
    {
      judgeEndpointId: "endpoint:judge",
      attempt: 1,
      costMicros: 500,
      bytes: 64,
      outcome: "complete",
    },
  ]);
});

/**
 * Run 98 addendum 30 S1 (`guidance/11` judgePolicy `excludeFromLiveEvaluation: true`).
 *
 * The judge used to be "the first registry endpoint that is not in this pair", which is how a scored
 * candidate ended up judging itself in 861 of 863 live battles. The judge is now a designated client:
 * the policy names it, and the factory fails closed rather than ever substituting a candidate.
 */
const judgeBranches = () => ({
  source: {
    trialId: "trial:source",
    candidateRef: "endpoint:source",
    outputRef: "artifact:source",
    outputDigest: "sha256:source",
    outputText: "source answer",
    role: "source" as const,
  },
  counterfactual: {
    trialId: "trial:counterfactual",
    candidateRef: "endpoint:counterfactual",
    outputRef: "artifact:counterfactual",
    outputDigest: "sha256:counterfactual",
    outputText: "counterfactual answer",
    role: "counterfactual" as const,
  },
});

test("run98 a30 the designated judge endpoint is used even when it is not first in the registry", async () => {
  const used: string[] = [];
  const judge = createRouterPairwiseJudge({
    executeChatCompletions: async (_body, _requestId, _stream, options) => {
      used.push(String(options?.endpointId ?? ""));
      return {
        contentText: '{"winner":"B","confidence":0.9}',
        routingDecisionId: "decision:judge",
      };
    },
    // The designated judge is deliberately NOT the first endpoint: the old selection rule would have
    // taken `endpoint:first`, the new rule takes the designation.
    endpoints: [
      { endpointId: "endpoint:first", modelId: "model:first" },
      { endpointId: "endpoint:designated", modelId: "model:designated" },
    ],
    judgeEndpointId: "endpoint:designated",
    taskText: "Fix the failing test.",
  });
  expect(judge?.endpointId).toBe("endpoint:designated");
  const { source, counterfactual } = judgeBranches();
  const decision = await judge?.dispatch({
    requestId: "run98-a30-designated",
    channel: "stage",
    scope: "tenant:a30",
    authorizationEpoch: 1,
    evaluationJobId: "job:a30",
    judgeEndpointId: "endpoint:designated",
    source,
    counterfactual,
  });
  expect(used).toEqual(["endpoint:designated"]);
  expect(decision?.judgeEndpointId).toBe("endpoint:designated");
});

test("run98 a30 a pair that contains the designated judge is not judged at all", () => {
  const judge = createRouterPairwiseJudge({
    executeChatCompletions: async () => ({ contentText: '{"winner":"B","confidence":0.9}' }),
    endpoints: [
      { endpointId: "endpoint:designated", modelId: "model:designated" },
      { endpointId: "endpoint:other", modelId: "model:other" },
    ],
    judgeEndpointId: "endpoint:designated",
    // The pair under test contains the designated judge (as the source).
    excludedEndpointIds: ["endpoint:designated", "endpoint:other"],
    taskText: "Fix the failing test.",
  });
  expect(judge).toBeUndefined();
});

test("run98 a30 a designated judge missing from the registry fails closed", () => {
  const judge = createRouterPairwiseJudge({
    executeChatCompletions: async () => ({ contentText: '{"winner":"B","confidence":0.9}' }),
    endpoints: [
      { endpointId: "endpoint:first", modelId: "model:first" },
      { endpointId: "endpoint:second", modelId: "model:second" },
    ],
    judgeEndpointId: "endpoint:not-registered",
    taskText: "Fix the failing test.",
  });
  // No fallback to a candidate: the caller records judge missingness instead.
  expect(judge).toBeUndefined();
});

test("run98 a45 the judge resolves from the controller assignment, and disabled/unset means no judge", () => {
  // Run 98 addendum 45 J2 supersedes addendum 30 S1's env-then-policy designation: the policy carries only
  // the selector, and the endpoint comes from the controller the operator configured.
  expect(
    resolveJudgeEndpointFromController({
      judgeSource: "controller",
      controllerEndpointId: "moonshot.personal.moonshot-oauth.global.kimi-k3",
    }),
  ).toBe("moonshot.personal.moonshot-oauth.global.kimi-k3");
  // A selector of `disabled` means no judge even when a controller is configured.
  expect(
    resolveJudgeEndpointFromController({
      judgeSource: "disabled",
      controllerEndpointId: "moonshot.personal.moonshot-oauth.global.kimi-k3",
    }),
  ).toBe("");
  // A missing controller, or junk, is "no judge" — never a candidate standing in.
  expect(resolveJudgeEndpointFromController({ judgeSource: "controller" })).toBe("");
  expect(
    resolveJudgeEndpointFromController({ judgeSource: "controller", controllerEndpointId: 42 }),
  ).toBe("");
  expect(resolveJudgeEndpointFromController({})).toBe("");
});
