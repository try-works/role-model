import { describe, expect, test } from "vitest";

import { claimEvaluationTrial } from "../src/track-b-auto-replay-runtime.js";

/**
 * Run 101 addendum 32 (the operator's rule: USE EFFECT).
 *
 * `evaluation:claim-trial` is the lease authority for a resumed comparison. Its transient failures (a momentarily
 * busy store) deserve the effect-mq guidance's bounded retry; a trial that is genuinely not claimable is a value the
 * caller already handles. The claim is therefore an Effect program: typed failure, spaced retry, and the bound
 * resolving as `null`.
 */
describe("run 101 addendum 32: the trial claim is an Effect program with a bounded retry", () => {
  test("a transient claim failure is retried and the claim succeeds", async () => {
    let calls = 0;
    const claimed = await claimEvaluationTrial({
      trialId: "trial-1",
      workerId: "runtime-host:req-1",
      claim: async () => {
        calls += 1;
        if (calls < 3) throw new Error("invalid scheduler claim receipt");
        return { trialId: "trial-1", leaseId: "lease-1" };
      },
    });

    expect(claimed).toEqual({ trialId: "trial-1", leaseId: "lease-1" });
    expect(calls).toBe(3);
  });

  test("a persistent claim failure resolves as null after the bound, so the no-claim path runs", async () => {
    let calls = 0;
    const claimed = await claimEvaluationTrial({
      trialId: "trial-2",
      workerId: "runtime-host:req-2",
      claim: async () => {
        calls += 1;
        throw new Error("durable replay state is queued");
      },
    });

    expect(claimed).toBeNull();
    expect(calls).toBe(3);
  });

  test("a claim that the lease authority declines is returned as-is, not retried", async () => {
    let calls = 0;
    const claimed = await claimEvaluationTrial({
      trialId: "trial-3",
      workerId: "runtime-host:req-3",
      claim: async () => {
        calls += 1;
        return undefined;
      },
    });

    expect(claimed).toBeUndefined();
    expect(calls).toBe(1);
  });
});
