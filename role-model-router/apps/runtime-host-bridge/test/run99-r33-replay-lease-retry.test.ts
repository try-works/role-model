import { describe, expect, it } from "vitest";

import {
  REPLAY_LEASE_RETRY_DELAYS_MS,
  isReplayJobLeasedFailure,
  retryLeasedReplayDispatch,
} from "../src/track-b-auto-replay.js";

/**
 * Run 99 R33 live finding (stage v143/v144): the auto-replay loop kept deferring captures with
 *
 *   `replay endpoint HTTP 409: {"error":"extension replay-core failed: replay job is already leased"}`
 *
 * because another dispatcher already held the same durable job — the exact idempotency the loop
 * relies on. Deferral is the wrong answer: the job is in flight, so its terminal receipt is only a
 * bounded wait away, and re-dispatching after the hold releases produced the same 409 until the
 * capture was refused (`replay_window_elapsed`). A lease hold is now classified explicitly and
 * retried with backoff inside the capture's own deadline.
 */
describe("run99 R33 replay lease retry", () => {
  it("classifies the lease hold and nothing else", () => {
    expect(
      isReplayJobLeasedFailure(
        409,
        '{"error":"extension replay-core failed: replay job is already leased"}',
      ),
    ).toBe(true);
    expect(isReplayJobLeasedFailure(409, '{"error":"extension replay-core failed: replay job is not awaiting evaluation completion"}')).toBe(false);
    expect(isReplayJobLeasedFailure(500, "already leased")).toBe(false);
  });

  it("waits out a hold and returns the terminal receipt", async () => {
    const slept: number[] = [];
    let attempts = 0;
    const result = await retryLeasedReplayDispatch({
      dispatch: async () => {
        attempts += 1;
        if (attempts < 3) {
          return {
            ok: false,
            status: 409,
            body: '{"error":"extension replay-core failed: replay job is already leased"}',
          };
        }
        return { ok: true, value: { state: "complete" } };
      },
      deadlineAtMs: 10_000,
      now: () => 0,
      sleep: async (ms) => {
        slept.push(ms);
      },
    });

    expect(result.value).toEqual({ state: "complete" });
    expect(result.attempts).toBe(3);
    expect(slept).toEqual([REPLAY_LEASE_RETRY_DELAYS_MS[0], REPLAY_LEASE_RETRY_DELAYS_MS[1]]);
  });

  it("stops at the deadline instead of waiting forever", async () => {
    const result = await retryLeasedReplayDispatch({
      dispatch: async () => ({
        ok: false,
        status: 409,
        body: '{"error":"extension replay-core failed: replay job is already leased"}',
      }),
      deadlineAtMs: 3_000,
      now: (() => {
        let clock = 0;
        return () => {
          clock += 2_000;
          return clock;
        };
      })(),
      sleep: async () => {},
    });

    expect(result.value).toBeNull();
    expect(result.lastFailure).toMatch(/already leased/);
  });

  it("does not retry a failure that is not a lease hold", async () => {
    const result = await retryLeasedReplayDispatch({
      dispatch: async () => ({ ok: false, status: 500, body: "provider exploded" }),
      deadlineAtMs: 60_000,
      now: () => 0,
      sleep: async () => {},
    });

    expect(result.value).toBeNull();
    expect(result.attempts).toBe(1);
    expect(result.lastFailure).toBe("provider exploded");
  });
});
