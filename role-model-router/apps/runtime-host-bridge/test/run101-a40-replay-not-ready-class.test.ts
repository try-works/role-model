import { expect, test } from "vitest";

import {
  classifyReplayExecutorFailure,
  retryableReplayRefusalCodes,
} from "../src/track-b-auto-replay.js";
import { REPLAY_REFUSAL_CODES } from "../src/track-b-replay-policy.js";

/**
 * Run 101 - "a replay that is still retrying is not a failed replay".
 *
 * Measured live on the packaged stage RC (public `abf7be61` + private `e915c3fb`) on `:3457`, found by
 * the R5 kill-recovery drill because that drill forces the shape:
 *
 *   capture  req-891aa223-c21a-4836-a853-6d24dc8b2d3d
 *   outcome  deferred   refusal_code  replay_failed   counters {"deferrals":0}
 *   detail   replay endpoint HTTP 409: {"error":"extension replay-core failed: replay job is not awaiting evaluation"}
 *
 * The same pair appears at `06:13:22Z` on `req-5df30514-fafc-4ea6-b156-77c6a9c6c961`; both follow a
 * restart. The durable job behind the first one shows why:
 *
 *   jobId 3b7f9cb8933e19c1...  state=queued  attempt=1
 *   dispatches: gpt-5.6-terra=complete, gpt-5.5=complete, gpt-5.4=retryable_failure
 *
 * One arm failed *retryably*, which puts the whole job back to `queued` (replay-core `index.mjs:2090`),
 * and `recordEvaluationReceipt` (`:1888`) refuses anything that is not `awaiting_evaluation`/`evaluating`
 * with exactly that message. So the capture was reported as `replay_failed` while its replay was simply
 * not finished - the collapse this run keeps removing.
 *
 * The budget was never the problem (`counters {"deferrals":0}`, because `applyReplayDeferralBudget`
 * already recognises the detail as in-flight). The defect is the *name*: `replay_failed` is what the
 * classifier falls back to for anything it does not recognise, and this shape was unrecognised.
 */

const NOT_READY =
  'replay endpoint HTTP 409: {"error":"extension replay-core failed: replay job is not awaiting evaluation"}';

test("run101 a replay that is still retrying is named, not reported as replay_failed", () => {
  const classification = classifyReplayExecutorFailure(NOT_READY);

  expect(classification).toEqual({ code: "replay_job_not_ready_for_evaluation", terminal: false });
  expect(retryableReplayRefusalCodes().has("replay_job_not_ready_for_evaluation")).toBe(true);
  expect(REPLAY_REFUSAL_CODES).toContain("replay_job_not_ready_for_evaluation");
});

test("run101 the class is matched on the message whichever envelope carries it", () => {
  // The executor surfaces the same 409 both bare and wrapped, so the match must not depend on the
  // `replay endpoint HTTP 409:` prefix that happens to appear in the live row.
  expect(classifyReplayExecutorFailure("replay job is not awaiting evaluation").code).toBe(
    "replay_job_not_ready_for_evaluation",
  );
  expect(
    classifyReplayExecutorFailure(
      'something else: {"error":"extension replay-core failed: replay job is not awaiting evaluation"}',
    ).code,
  ).toBe("replay_job_not_ready_for_evaluation");
});

test("run101 the neighbouring classes are untouched", () => {
  // This change renames one class; it must not quietly reclassify the ones already named, and the
  // genuine fallback must still fall back.
  expect(
    classifyReplayExecutorFailure("awaiting replay is missing its durable evaluation receipt"),
  ).toEqual({ code: "replay_evaluation_receipt_missing", terminal: false });
  expect(
    classifyReplayExecutorFailure("durable replay branch append has no host dispatch receipt"),
  ).toEqual({ code: "replay_branch_append_unavailable", terminal: false });
  expect(
    classifyReplayExecutorFailure("route capture skipped: boundary unavailable until 12:00"),
  ).toEqual({ code: "replay_boundary_unavailable", terminal: false });
  expect(
    classifyReplayExecutorFailure("idempotency key was reused with different immutable bytes"),
  ).toEqual({ code: "replay_capture_idempotency_conflict", terminal: true });
  expect(classifyReplayExecutorFailure("some unmapped boundary error")).toEqual({
    code: "replay_failed",
    terminal: false,
  });
});
