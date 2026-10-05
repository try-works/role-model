import { expect, test } from "vitest";

import {
  dedupeJudgeAgainstPair,
  selectAlternativeJudgeEndpoint,
} from "../src/track-b-auto-replay.js";

/**
 * Run 100 addendum 22 follow-up (requirement 3) — the identity that scored the trial must travel with it.
 *
 * The tick (`5a3fee23`) now judges a colliding capture with a substitute instead of refusing it, but the
 * comparison's judge identity is resolved later, on the evaluation/completion path (`cli.ts` `resolveControllerJudge`
 * -> `input.judge.endpointId` -> the job's comparability at `cli.ts:1707`, the evaluator factory's
 * `judgeEndpointId` at `cli.ts:7419` and the runner's receipt stamp at
 * `extensions/evaluation-runner-local/index.mjs:471`). Resolved from the controller alone, that path re-introduces
 * the controller as the judge of a pair it is an arm of, so the comparison is scored without a judge (or, before
 * the guard, by itself) and the provenance names an endpoint that never scored anything.
 *
 * These tests pin the rule that closes the gap: wherever a pair's judge is resolved and the pair is known, the
 * judge is de-conflicted with the same deterministic function the tick uses — same arms, same list order, same
 * answer — and the judge object keeps its other fields so the recording sites need no new plumbing. With no usable
 * alternative the judge is left exactly as it was, which keeps today's fail-closed behaviour (the evaluator records
 * judge missingness rather than scoring a candidate with itself).
 */

const controllerJudge = {
  endpointId: "endpoint-a",
  source: "controller" as const,
  assignmentUpdatedAtMs: 1790310000000,
};

test("run155 provenance leaves a judge that is not an arm of the pair alone", () => {
  const judge = dedupeJudgeAgainstPair(controllerJudge, {
    sourceEndpointId: "endpoint-b",
    counterfactualEndpointIds: ["endpoint-c"],
    configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c", "endpoint-d"],
  });
  expect(judge).toEqual(controllerJudge);
});

test("run155 provenance substitutes a judge that is the pair's own source arm and keeps the controller fields", () => {
  const judge = dedupeJudgeAgainstPair(controllerJudge, {
    sourceEndpointId: "endpoint-a",
    counterfactualEndpointIds: ["endpoint-c", "endpoint-b"],
    configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c", "endpoint-d"],
  });
  expect(judge.endpointId).toBe("endpoint-d");
  // The recording sites (comparability, manifest, receipt) read the same object shape, so nothing else moves.
  expect(judge.source).toBe("controller");
  expect(judge.assignmentUpdatedAtMs).toBe(controllerJudge.assignmentUpdatedAtMs);
});

test("run155 provenance never picks a judge that is one of the planned counterfactual arms", () => {
  const judge = dedupeJudgeAgainstPair(controllerJudge, {
    sourceEndpointId: "endpoint-b",
    counterfactualEndpointIds: ["endpoint-a", "endpoint-c"],
    configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c", "endpoint-d"],
  });
  expect(judge.endpointId).toBe("endpoint-d");
});

test("run155 provenance keeps today's behaviour when the pair leaves no alternative judge", () => {
  const judge = dedupeJudgeAgainstPair(controllerJudge, {
    sourceEndpointId: "endpoint-a",
    counterfactualEndpointIds: ["endpoint-b", "endpoint-c"],
    configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
  });
  // Unchanged: the evaluator's own factory then records judge missingness instead of scoring with an arm.
  expect(judge).toEqual(controllerJudge);
});

test("run155 provenance prefers the configured fallback list over the runtime pool", () => {
  const judge = dedupeJudgeAgainstPair(controllerJudge, {
    sourceEndpointId: "endpoint-a",
    counterfactualEndpointIds: [],
    fallbackEndpointIds: ["endpoint-a", "endpoint-c", "endpoint-d"],
    configuredEndpointIds: ["endpoint-a", "endpoint-b"],
  });
  expect(judge.endpointId).toBe("endpoint-c");
});

test("run155 provenance and the tick derive the same substitute from the same pair", () => {
  const arms = ["endpoint-a"];
  const fromTick = selectAlternativeJudgeEndpoint({
    collidingJudgeEndpointId: "endpoint-a",
    sourceEndpointId: "endpoint-a",
    fallbackEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
  });
  const fromProvenance = dedupeJudgeAgainstPair(controllerJudge, {
    sourceEndpointId: arms[0],
    counterfactualEndpointIds: [],
    configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
  }).endpointId;
  expect(fromProvenance).toBe(fromTick);
});
