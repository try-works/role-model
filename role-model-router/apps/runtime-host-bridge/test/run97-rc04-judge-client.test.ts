import { expect, test } from "vitest";

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
  expect(parsePairwiseJudgeResponse('{"winner":"B","confidence":0.7,"rationale":"better"}')).toEqual({
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
