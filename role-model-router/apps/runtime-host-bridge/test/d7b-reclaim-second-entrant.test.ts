import { describe, expect, it, vi } from "vitest";
import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";

/**
 * D7b, second defect: A SECOND ENTRANT MUST NOT RESET ANOTHER TICK'S STALENESS CLOCK.
 *
 * Measured on stage-rc-425a26946d65: the reclaim did NOT fire while the walk skipped 81 times over 54+ minutes against
 * a 30-minute deadline, although the reclaim code is provably in the shipped exe ("reclaiming stale tick", x1).
 *
 * Structural cause: runningSinceMs is assigned on EVERY entry to the tick body, and there are TWO entry paths - the
 * interval walk (gated by `running`) and dispatchCapture() from the replay.dispatch queue worker, which BYPASSES
 * `running` (track-b-auto-replay-runtime.ts:1299, :2414). A worker entering the body therefore restarts the deadline
 * the guard measures, so a hung INTERVAL tick can be kept permanently "fresh" by worker traffic.
 *
 * TIMING IS THE WHOLE TEST. The hung interval tick enters at t=1000; a worker enters at t=1010 (restarting the clock);
 * the check happens at t=1060. That is 60ms after the ORIGINAL entry but only 50ms after the worker's - and the
 * deadline is 50ms, so a guard measuring the most recent entry sees "not stale" while the tick that actually holds the
 * slot has been stuck for 60ms. The reclaim must measure the OLDEST in-flight entry.
 */
const makeInput = (opts: { now: () => number }) =>
  ({
    operations: {
      async listPendingReplayCaptures() {
        return new Promise<never>(() => {}); // the hang
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

describe("D7b: a second entrant must not reset the staleness clock", () => {
  it("reclaims the hung INTERVAL tick even though a worker entered later", async () => {
    let clock = 1_000;
    const logged: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    });
    const loop = startAutoReplayLoop(makeInput({ now: () => clock }));
    try {
      const hung = loop.tick(); // enters at t=1000 and never returns
      await new Promise((r) => setTimeout(r, 30));
      clock = 1_010;
      void loop.dispatchCapture("capture-worker-1"); // a queue worker enters, bypassing the guard
      await new Promise((r) => setTimeout(r, 30));
      clock = 1_060; // 60ms after the ORIGINAL entry, 50ms after the worker's
      void loop.tick();
      await new Promise((r) => setTimeout(r, 40));
      expect(logged.join("\n")).toMatch(/reclaiming stale tick/);
      void hung;
    } finally {
      spy.mockRestore();
      loop.stop();
    }
  });
});
