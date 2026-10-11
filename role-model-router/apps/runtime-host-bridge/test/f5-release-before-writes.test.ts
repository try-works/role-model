import { describe, expect, it } from "vitest";
import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";

/**
 * F5, step 1 - THE SLOT MUST BE RELEASED BEFORE THE AWAITED WRITES.
 *
 * This ordering was the original D7b wedge. The slot used to be released AFTER
 * `await Promise.all(dispositionWrites)` in the tick's finally, so a disposition write that never settled held the
 * slot forever: the guard skipped every later tick, the walk was dead, and the reclaim could not fire because the
 * clock it measures belonged to an entry that never left. Reproduced live on three processes - 81 skips over 54+
 * minutes with running=true.
 *
 * Effect's guidance for this shape (resource-lifetime: Effect.acquireRelease, Scope) is that a finalizer must "also run
 * on failure or interruption". A release sitting BEHIND an await cannot promise that. These cases pin the property:
 * whatever a disposition write does - including never settling - the next tick is NOT skipped.
 */
const makeInput = (opts: { now: () => number; hangWrites: boolean }) =>
  ({
    operations: {
      async listPendingReplayCaptures() {
        return { pending: [], pendingTotal: 0, pendingCount: 0 };
      },
      async recordReplayDisposition() {
        // The write that never settles: the wedge's actual trigger.
        if (opts.hangWrites) return new Promise<never>(() => {});
        return { recorded: true };
      },
    },
    ledger: { status: () => ({ window: {} }) },
    policySet: { policySetId: "p", policySetVersion: "1", policySetDigest: "d" },
    configuredEndpointIds: () => ["a", "b", "c"],
    routeFocusCandidates: () => [],
    readRouteLadder: () => null,
    markRouteLadderEligible: () => undefined,
    readFinalizedRouteChallenge: async () => null,
    routeLearningDefaults: {
      minComparisons: 5,
      minConfidence: 0.7,
      stalenessWindowDays: 30,
      challengeBatchSize: 1,
    },
    executor: async () => ({ terminal: true, branches: [] }),
    staleTickDeadlineMs: 60_000,
    now: opts.now,
  }) as never;

describe("F5 step 1: the slot is released before the awaited writes", () => {
  it("does NOT skip the next tick while the previous tick disposition write hangs", async () => {
    const loop = startAutoReplayLoop(makeInput({ now: () => Date.now(), hangWrites: true }));
    try {
      // Tick 1 runs and then hangs inside its finally, in the disposition write.
      void loop.tick();
      await new Promise((resolve) => setTimeout(resolve, 50));
      // Tick 2 must NOT be skipped: the slot was released before the write was awaited.
      const second = await loop.tick();
      expect(second.skipped).not.toBe(true);
    } finally {
      loop.stop();
    }
  });
});
