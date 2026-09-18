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

  /**
   * Run 98 addendum 34 S5 residual (live 2026-09-18): the Learning UI showed every replay deferred, with
   * `fetch failed` as the dominant detail — the auto-replay producer's own POST to the runtime's replay
   * endpoint threw at the transport layer (undici wraps the real cause in `error.cause`), and a *transport*
   * failure was treated as terminal for the capture even though the durable job was still there to be
   * driven. A transient socket abort is exactly the kind of thing the capture's own deadline should absorb,
   * like the lease hold next to it, and the disposition must name the cause instead of the wrapper.
   */
  it("retries a transport failure inside the deadline and names it", async () => {
    const slept: number[] = [];
    let attempts = 0;
    const result = await retryLeasedReplayDispatch({
      dispatch: async () => {
        attempts += 1;
        if (attempts < 3) {
          return { ok: false, status: 0, body: "UND_ERR_HEADERS_TIMEOUT: headers timeout" };
        }
        return { ok: true, value: { state: "complete" } };
      },
      deadlineAtMs: 10_000,
      now: () => 0,
      sleep: async (ms) => {
        slept.push(ms);
      },
      retryable: (failure) => failure.status === 0 || isReplayJobLeasedFailure(failure.status, failure.body),
    });

    expect(result.value).toEqual({ state: "complete" });
    expect(result.attempts).toBe(3);
    expect(slept).toHaveLength(2);
  });

  it("does not retry a transport failure when the caller does not ask it to", async () => {
    let attempts = 0;
    const result = await retryLeasedReplayDispatch({
      dispatch: async () => {
        attempts += 1;
        return { ok: false, status: 0, body: "ECONNRESET" };
      },
      deadlineAtMs: 10_000,
      now: () => 0,
      sleep: async () => {},
    });
    expect(result.value).toBeNull();
    expect(result.attempts).toBe(1);
    expect(result.lastFailure).toBe("ECONNRESET");
  });

  /**
   * Run 98 addendum 34 S5 residual (live 2026-09-18, third measurement): jobs ran but never finished —
   * `replay execution exceeded 720000ms (bounded per-capture budget)` — because the deadline constants
   * assumed ~2-minute provider calls while real dsh prompts were taking 2-4 minutes each. The budget is
   * execution policy, so the operator sizes it for the traffic being served; the defaults keep today's
   * behaviour and the bounds refuse nonsense.
   */
  it("sizes the per-capture deadline from the operator's policy within bounded limits", async () => {
    const {
      resolveAutoReplayDeadlineMaxMs,
      resolveAutoReplayDeadlineMs,
      resolveAutoReplayDeadlinePerCandidateMs,
    } = await import("../src/track-b-auto-replay.js");

    expect(resolveAutoReplayDeadlinePerCandidateMs({})).toBe(120_000);
    expect(
      resolveAutoReplayDeadlinePerCandidateMs({
        ROLE_MODEL_AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS: "300000",
      }),
    ).toBe(300_000);
    expect(
      resolveAutoReplayDeadlinePerCandidateMs({
        ROLE_MODEL_AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS: "1",
      }),
    ).toBe(120_000);
    expect(resolveAutoReplayDeadlineMaxMs({})).toBe(1_800_000);
    expect(
      resolveAutoReplayDeadlineMaxMs({ ROLE_MODEL_AUTO_REPLAY_DEADLINE_MAX_MS: "7200000" }),
    ).toBe(7_200_000);
    expect(
      resolveAutoReplayDeadlineMaxMs({ ROLE_MODEL_AUTO_REPLAY_DEADLINE_MAX_MS: "99999999" }),
    ).toBe(1_800_000);

    // Three candidates at five minutes each, with the operator's ceiling: the budget covers the run.
    expect(
      resolveAutoReplayDeadlineMs(3, { perCandidateMs: 300_000, maxMs: 7_200_000 }),
    ).toBe(900_000);
    // …and the ceiling still binds when the arithmetic would exceed it.
    expect(resolveAutoReplayDeadlineMs(12, { perCandidateMs: 900_000, maxMs: 1_800_000 })).toBe(
      1_800_000,
    );
    // The defaults are unchanged for every existing caller.
    expect(resolveAutoReplayDeadlineMs(3)).toBe(360_000);
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
