import { describe, expect, test } from "vitest";

import { offerEvaluationHandoff } from "../src/track-b-auto-replay-runtime.js";

/**
 * Run 101 addendum 27 (the operator's rule: "implement using effect and effect-mq").
 *
 * The handoff offer is an Effect program with a typed failure and a bounded retry (the effect-mq guidance's retry
 * shape) rather than an inline promise `.catch`; after the bound it resolves as a value, because the replay itself
 * already succeeded and a refused handoff is a fact to report, not an exception to throw.
 */
describe("run 101 addendum 27: the handoff offer retries a transient refusal through Effect", () => {
  test("a transient refusal is retried and the offer succeeds", async () => {
    let calls = 0;
    const outcome = await offerEvaluationHandoff({
      replayJobId: "job-transient",
      offer: async () => {
        calls += 1;
        return calls < 3
          ? { enqueued: false, reason: "queue_offer_failed: database is locked" }
          : { enqueued: true };
      },
    });

    expect(outcome.enqueued).toBe(true);
    expect(calls).toBe(3);
  });

  test("a persistent refusal resolves as a value after the bound instead of throwing", async () => {
    let calls = 0;
    const outcome = await offerEvaluationHandoff({
      replayJobId: "job-persistent",
      offer: async () => {
        calls += 1;
        return { enqueued: false, reason: "evaluation_queue_not_started" };
      },
    });

    expect(outcome.enqueued).toBe(false);
    expect(outcome.reason).toBe("evaluation_queue_not_started");
    expect(calls).toBe(3);
  });

  test("a rejecting offer (a thrown transport failure) is bounded the same way", async () => {
    let calls = 0;
    const outcome = await offerEvaluationHandoff({
      replayJobId: "job-reject",
      offer: async () => {
        calls += 1;
        throw new Error("store unavailable");
      },
    });

    expect(outcome.enqueued).toBe(false);
    expect(outcome.reason).toContain("store unavailable");
    expect(calls).toBe(3);
  });
});
