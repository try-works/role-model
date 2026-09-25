import { expect, test } from "vitest";

import { isReplayInFlightFailure, retryLeasedReplayDispatch } from "../src/track-b-auto-replay.js";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S3 (operator report 2026-09-23: "replays are
 * stuck and not reaching eval or learner stage"; live refusal `extension replay-core failed: replay
 * concurrency budget is exhausted`).
 *
 * The job's own concurrency budget is per job (`maxConcurrency`, 1 when unset): a second candidate may not
 * be prepared while one of its dispatches is still in flight. The scheduler therefore holds the capture
 * rather than treating it as a replay failure - and, before the S1 fix, every later attempt on such a job
 * burned the capture's deferral budget against a marker nothing could ever clear, ending in
 * `refused replay_failed` while the provider work had already been paid for. A *resource* budget refusal
 * (`provider call budget is exhausted`, cost, bytes) stays a real refusal.
 */

test("run100j an in-flight dispatch hold is retried, a real budget refusal is not", () => {
  expect(
    isReplayInFlightFailure(
      409,
      '{"error":"extension replay-core failed: replay concurrency budget is exhausted"}',
    ),
  ).toBe(true);
  expect(
    isReplayInFlightFailure(
      409,
      '{"error":"extension replay-core failed: replay provider call budget is exhausted"}',
    ),
  ).toBe(false);
  expect(
    isReplayInFlightFailure(
      409,
      '{"error":"extension replay-core failed: replay provider cost budget is exhausted"}',
    ),
  ).toBe(false);
});

test("run100j a concurrency hold is waited out inside the capture's own deadline", async () => {
  let attempts = 0;
  const result = await retryLeasedReplayDispatch({
    deadlineAtMs: Date.now() + 60_000,
    sleep: async () => {},
    retryable: (failure) =>
      failure.status === 0 || isReplayInFlightFailure(failure.status, failure.body),
    dispatch: async () => {
      attempts += 1;
      if (attempts < 3) {
        return {
          ok: false as const,
          status: 409,
          body: '{"error":"extension replay-core failed: replay concurrency budget is exhausted"}',
        };
      }
      return { ok: true as const, value: { state: "complete" } };
    },
  });
  expect(attempts).toBe(3);
  expect(result.value).toEqual({ state: "complete" });
});
