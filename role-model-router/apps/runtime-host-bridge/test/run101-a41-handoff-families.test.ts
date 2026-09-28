import { expect, test } from "vitest";

import {
  classifyReplayExecutorFailure,
  retryableReplayRefusalCodes,
} from "../src/track-b-auto-replay.js";
import { REPLAY_REFUSAL_CODES } from "../src/track-b-replay-policy.js";

/**
 * Run 101 - the two remaining unnamed members of the `replay_failed` family, both read off the live
 * ledger on `:3457` while trying to observe addendum 40's class:
 *
 *   req-752e67dd-6028-4fe7-810b-81b393f91cac   deferred  replay_failed  counters {"deferrals":1}
 *     detail: replay endpoint HTTP 409: {"error":"extension evaluation-core failed:
 *              partial evaluation trial scores require recovery"}             at 08:33:58Z
 *
 *   req-50a7da06-6b1c-418b-8045-eb772c455020   deferred  replay_failed
 *     detail: replay endpoint HTTP 409: {"error":"extension replay-core failed:
 *              replay job is awaiting evaluation and cannot be re-leased"}     at 05:45:28Z
 *
 * Neither names what happened. The first is raised by `extensions/evaluation-core/index.mjs:2943` when a
 * trial carries some scores but not the whole batch; the second by `extensions/replay-core/index.mjs:965`
 * when a job that has already handed off is asked to be re-leased - work in progress, which the deferral
 * budget already recognises as in-flight (`tests/track-b/run99-r22-replay-deferral-budget.test.mjs` pins
 * that it does not consume the budget) but the *refusal code* never said so.
 *
 * This change names both so the census can count them. It deliberately does **not** change what the tick
 * does: the first still consumes deferral budget and retires named on exhaustion, the second still does
 * not - because neither claim about recoverability is proven here, and a name is what the neighbouring
 * branches added in the same situation.
 */

test("run101 a job awaiting evaluation that cannot be re-leased is named, not replay_failed", () => {
  const classification = classifyReplayExecutorFailure(
    'replay endpoint HTTP 409: {"error":"extension replay-core failed: replay job is awaiting evaluation and cannot be re-leased"}',
  );

  expect(classification).toEqual({ code: "replay_awaiting_evaluation_in_flight", terminal: false });
  expect(retryableReplayRefusalCodes().has("replay_awaiting_evaluation_in_flight")).toBe(true);
  expect(REPLAY_REFUSAL_CODES).toContain("replay_awaiting_evaluation_in_flight");
});

test("run101 a partially scored trial is named, not replay_failed", () => {
  const classification = classifyReplayExecutorFailure(
    'replay endpoint HTTP 409: {"error":"extension evaluation-core failed: partial evaluation trial scores require recovery"}',
  );

  expect(classification).toEqual({ code: "replay_partial_trial_scores", terminal: false });
  expect(retryableReplayRefusalCodes().has("replay_partial_trial_scores")).toBe(true);
  expect(REPLAY_REFUSAL_CODES).toContain("replay_partial_trial_scores");
});

test("run101 the two new names do not capture their neighbours", () => {
  // "awaiting evaluation" appears in several messages; the new branches must be specific enough that
  // addendum 40's class and the recoverable-receipt class still classify as themselves.
  expect(classifyReplayExecutorFailure("replay job is not awaiting evaluation").code).toBe(
    "replay_job_not_ready_for_evaluation",
  );
  expect(
    classifyReplayExecutorFailure("awaiting replay is missing its durable evaluation receipt").code,
  ).toBe("replay_evaluation_receipt_missing");
  // And the bare fallback still falls back.
  expect(classifyReplayExecutorFailure("some unmapped boundary error").code).toBe("replay_failed");
});
