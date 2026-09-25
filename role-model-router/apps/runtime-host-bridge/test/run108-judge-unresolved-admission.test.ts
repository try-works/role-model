import { expect, test } from "vitest";

import { REPLAY_REFUSAL_CODES, decideReplayAdmission } from "../src/track-b-replay-policy.js";

/**
 * Run 108: an unresolvable judge must stop the arms from being planned, not be ignored.
 *
 * Measured on the live store: of the newest 300 comparison groups, 45 carry
 * `validityIssues: ["judge_self_evaluation"]` and in the newest 400 measured cases **142 of 144** have the judge
 * as the *counterfactual arm* (the judge is always the controller, `deepseek…flash-high`). The executor does pass
 * an exclusion (`selectReplayCandidates({ …, excludedEndpointIds: [evalJudgeEndpointId] })`) - but the judge is
 * resolved per capture from the controller assignment, and when that read fails the resolution is `""`, the
 * exclusion disappears, and the strongest alternative arm is planned - and then judged by the controller. The
 * clean and self-judged groups are interleaved in time, which is what an intermittent read looks like.
 *
 * Fail closed instead: if the judge cannot be resolved, the capture is refused with a named code and retried on
 * a later tick, so a comparison is never planned without the exclusion that keeps the judge out of its own
 * arms.
 */

const admittedInput = () => ({
  channelReplayEnabled: true,
  captureAvailable: true,
  scopeAuthorized: true,
  authorizationEpochValid: true,
  retentionReplayable: true,
  privacyReplayable: true,
  distinctCandidateCount: 2,
  budgetAvailable: true,
  alreadyProcessed: false,
  sourceIsReplayProduced: false,
  sourceIsBenchmark: false,
  policyIdsResolvable: true,
  dependenciesAvailable: true,
});

test("run108 an unresolvable judge refuses the capture by name", () => {
  const decision = decideReplayAdmission({ ...admittedInput(), judgeResolved: false });
  expect(decision.admitted).toBe(false);
  if (!decision.admitted) {
    expect(decision.code).toBe("judge_unresolved");
    expect(decision.detail).toMatch(/judge/i);
  }
  expect(REPLAY_REFUSAL_CODES).toContain("judge_unresolved");
});

test("run108 a resolved judge (and a caller that does not plan arms) still admits", () => {
  expect(decideReplayAdmission({ ...admittedInput(), judgeResolved: true }).admitted).toBe(true);
  // Omitted means "this caller does not plan arms" - the tick's own pre-filter keeps its behaviour.
  expect(decideReplayAdmission(admittedInput()).admitted).toBe(true);
});
