import { describe, expect, it, vi } from "vitest";
import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";

/**
 * D7b - A HUNG TICK MUST NOT DISABLE THE WALK.
 *
 * Measured live on stage-rc-06a09d37eabc (:3457, 2026-10-10) and REPRODUCED on two separate processes: one tick
 * entered the body and never returned. running was cleared only by that body's own finally - at its SECOND
 * statement, after an awaited write - while the guard returned BEFORE the try/finally, so the flag stayed true and
 * every later tick was skipped (62 skips on one process, 24+ on another) with ticks frozen.
 *
 * These cases pin the GUARD's behaviour, which is what the fix changes: a tick holding the slot past its deadline
 * must be RECLAIMED - the next tick proceeds instead of being skipped. They deliberately do not await the
 * reclaiming tick, because the hung dependency stays hung: the property under test is that a permanent hang costs
 * one tick, never the loop.
 */
const makeInput = (opts: { now: () => number }) =>
  ({
    operations: {
      // The hang: never returns, exactly as observed live.
      async listPendingReplayCaptures() {
        return new Promise<never>(() => {});
      },
      async recordReplayDisposition() {
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
    staleTickDeadlineMs: 50,
    now: opts.now,
  }) as never;

describe("D7b: the guard reclaims a stale slot", () => {
  it("RECLAIMS and proceeds once the in-flight tick exceeds its deadline", async () => {
    let clock = 1_000;
    const logged: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    });
    const loop = startAutoReplayLoop(makeInput({ now: () => clock }));
    try {
      const hung = loop.tick(); // enters the body and hangs, holding the slot
      clock += 100; // past the 50ms deadline
      void loop.tick(); // must reclaim rather than skip - not awaited, the dependency stays hung
      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(logged.join("\n")).toMatch(/reclaiming stale tick/);
      void hung;
    } finally {
      spy.mockRestore();
      loop.stop();
    }
  });

  it("does NOT reclaim a tick that is still inside its deadline", async () => {
    let clock = 1_000;
    const logged: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    });
    const loop = startAutoReplayLoop(makeInput({ now: () => clock }));
    try {
      const hung = loop.tick();
      clock += 10; // still inside the deadline
      void loop.tick();
      await new Promise((resolve) => setTimeout(resolve, 40));
      expect(logged.join("\n")).not.toMatch(/reclaiming stale tick/);
      void hung;
    } finally {
      spy.mockRestore();
      loop.stop();
    }
  });
});
