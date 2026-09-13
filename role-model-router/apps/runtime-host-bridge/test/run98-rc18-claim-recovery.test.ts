import { describe, expect, it } from "vitest";

import {
  claimReplayIntentWithRecovery,
  type ReplayIntentClaim,
  type ReplayIntentScheduler,
} from "../src/track-b-runtime.js";

/**
 * Run 98 R2 / slice S2 (RC18) - a replay scheduler intent whose lease/deadline elapsed
 * must be recovered (fresh intent for the same durable replay job) instead of being
 * reported as an invalid claim receipt.
 *
 * Live evidence (stage v57): eight fresh `replay scheduler claim receipt is invalid`
 * deferrals. Root cause: `claimReplayIntent` returns `{ jobId, expired: true }` for an
 * expired intent while the host validates it as a full claim receipt and throws.
 */

const intentClaim = (jobId: string, attempt = 1): ReplayIntentClaim => ({
  jobId,
  payload: { replayJobId: "replay-job:1", scope: "standalone-runtime-stage" },
  leaseId: `${jobId}:lease:${attempt}`,
  fence: attempt,
  attempt,
  deadlineAtMs: 1_700_000_000_000,
});

const schedulerWith = (
  claims: Array<ReplayIntentClaim | null | { jobId: string; expired: true }>,
): { scheduler: ReplayIntentScheduler; enqueued: string[]; claimed: string[] } => {
  const enqueued: string[] = [];
  const claimed: string[] = [];
  const scheduler: ReplayIntentScheduler = {
    async enqueue(input) {
      enqueued.push(input.jobId);
      return { accepted: true };
    },
    async claim(input) {
      const jobId = input?.jobId ?? "";
      claimed.push(jobId);
      const next = claims.shift() ?? null;
      return next as ReplayIntentClaim | null;
    },
    async complete() {
      return { completed: true };
    },
    async fail() {
      return { failed: true };
    },
  };
  return { scheduler, enqueued, claimed };
};

describe("run98 rc18 replay intent claim recovery", () => {
  it("recovers an expired intent with a fresh intent for the same durable replay job", async () => {
    const { scheduler, enqueued, claimed } = schedulerWith([
      { jobId: "replay-intent:replay-job:1", expired: true },
      intentClaim("replay-intent:replay-job:1:retry-1", 2),
    ]);
    const outcome = await claimReplayIntentWithRecovery({
      scheduler,
      replayJobId: "replay-job:1",
      scope: "standalone-runtime-stage",
      deadlineAtMs: 1_700_000_000_000,
    });
    expect(outcome.state).toBe("claimed");
    if (outcome.state !== "claimed") throw new Error("expected a claimed outcome");
    expect(outcome.claim.attempt).toBe(2);
    expect(enqueued).toEqual([
      "replay-intent:replay-job:1",
      "replay-intent:replay-job:1:retry-1",
    ]);
    expect(claimed.at(-1)).toBe("replay-intent:replay-job:1:retry-1");
  });

  it("reports a bounded expired outcome instead of throwing when the retry also expires", async () => {
    const { scheduler } = schedulerWith([
      { jobId: "replay-intent:replay-job:1", expired: true },
      { jobId: "replay-intent:replay-job:1:retry-1", expired: true },
    ]);
    const outcome = await claimReplayIntentWithRecovery({
      scheduler,
      replayJobId: "replay-job:1",
      scope: "standalone-runtime-stage",
      deadlineAtMs: 1_700_000_000_000,
    });
    expect(outcome).toMatchObject({
      state: "expired",
      reason: "scheduler_intent_expired",
      attempts: 2,
    });
  });

  it("returns an empty outcome when the scheduler has no work", async () => {
    const { scheduler } = schedulerWith([null]);
    const outcome = await claimReplayIntentWithRecovery({
      scheduler,
      replayJobId: "replay-job:1",
      scope: "standalone-runtime-stage",
      deadlineAtMs: 1_700_000_000_000,
    });
    expect(outcome.state).toBe("empty");
  });

  it("names the offending fields when a claim receipt is genuinely malformed", async () => {
    const { scheduler } = schedulerWith([
      {
        jobId: "replay-intent:replay-job:1",
        payload: { replayJobId: "replay-job:1", scope: "standalone-runtime-stage" },
        fence: 1,
        attempt: 1,
        deadlineAtMs: null,
      } as unknown as ReplayIntentClaim,
    ]);
    await expect(
      claimReplayIntentWithRecovery({
        scheduler,
        replayJobId: "replay-job:1",
        scope: "standalone-runtime-stage",
        deadlineAtMs: 1_700_000_000_000,
      }),
    ).rejects.toThrow(/leaseId/);
  });
});
