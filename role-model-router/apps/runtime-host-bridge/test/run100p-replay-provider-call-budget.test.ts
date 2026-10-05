import { expect, test } from "vitest";

import { resolveReplayProviderCallBudget } from "../src/track-b-auto-replay.js";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S11 (live on `:3457`):
 *
 *   `replay endpoint HTTP 409: {"error":"extension replay-core failed: replay provider call budget is
 *    exhausted"}` - and the capture was then terminally refused.
 *
 * The automatic producer sized the job's provider-call budget as exactly one call per candidate. An arm whose
 * dispatch was interrupted (the executor abandoned the attempt, the process restarted, the lease lapsed) has
 * to be dispatched again under a fresh attempt - and that second call spent a budget that was already
 * consumed, so the job could never finish and the capture was refused even though its work had merely been
 * interrupted. The budget now carries a bounded retry allowance per candidate: still fail-closed against a
 * job that keeps retrying, but tolerant of one interrupted attempt.
 */

test("run100p the provider-call budget covers a bounded retry per candidate", () => {
  expect(resolveReplayProviderCallBudget(3)).toBe(6);
  expect(resolveReplayProviderCallBudget(1)).toBe(2);
  // The budget stays a multiple of the candidate count so a job cannot retry without bound.
  expect(resolveReplayProviderCallBudget(8)).toBe(16);
  // Unusable input falls back to a single candidate rather than an unbounded budget.
  expect(resolveReplayProviderCallBudget(0)).toBe(2);
  expect(resolveReplayProviderCallBudget(Number.NaN)).toBe(2);
});
