import { describe, expect, it } from "vitest";
import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";

/**
 * Run 108: an OVER-BUDGET corpus must not starve the whole replay walk.
 *
 * MEASURED on stage-rc-4f9216c2a492 (:3457). The corpus read refuses a family whose live capture count exceeds its
 * 500-row faithful-projection budget (route-challenge-evidence.ts:556) - 1465 for recruiter.candidate.screen, 1045 for
 * writer.outline, while mathematician.proof.write (498), coordinator.follow_up (307) and writer.summarize (226) are
 * under it. The focus is sticky, so the over-budget family was re-selected EVERY tick, threw EVERY tick, and aborted the
 * whole tick each time: zero dispatches, zero comparisons, zero ladder progress, and the replayable families were never
 * reached.
 *
 * The repair keeps FAIL-CLOSED - the tick still fails loudly, because an unknown corpus must never be treated as a
 * skippable empty task (pinned by "unknown historical corpus availability fails closed..." in
 * run105-review-dispatch.test.ts) - and adds the COOLDOWN that rotates the focus to a family that can be projected.
 */
const task = (over: Record<string, unknown> = {}) => ({
  roleId: "recruiter",
  taskTypeId: "recruiter.candidate.screen",
  scopeKey: "recruiter\u0000recruiter.candidate.screen",
  requestCount: 1465,
  admitted: 0,
  configured: 7,
  remaining: 7,
  ...over,
});

const makeInput = (marked: unknown[]) =>
  ({
    operations: {
      async listPendingReplayCaptures() {
        return { pending: [], pendingTotal: 0, pendingCount: 0 };
      },
      async recordReplayDisposition() {
        return { recorded: true };
      },
    },
    ledger: { status: () => ({ window: {} }) },
    policySet: { policySetId: "p", policySetVersion: "1", policySetDigest: "d" },
    configuredEndpointIds: () => ["a", "b", "c"],
    // The census offers a family whose capture count is over the corpus budget.
    routeFocusCandidates: () => [task()],
    readRouteLadder: () => ({
      roleId: "recruiter",
      taskTypeId: "recruiter.candidate.screen",
      rungs: [],
      nextEligibleAtMs: 0,
    }),
    markRouteLadderEligible: (value: {
      roleId: string;
      taskTypeId: string;
      nextEligibleAtMs: number;
    }) => {
      marked.push(value);
    },
    readFinalizedRouteChallenge: async () => null,
    // The corpus read refuses it, exactly as the shipped gate does for an over-budget family.
    readRouteReplayableCaptures: async () => null,
    routeLearningDefaults: {
      minComparisons: 5,
      minConfidence: 0.7,
      stalenessWindowDays: 30,
      challengeBatchSize: 1,
    },
    executor: async () => ({ terminal: true, branches: [] }),
    staleTickDeadlineMs: 600_000,
    now: () => 1_000_000,
  }) as never;

describe("run108: an over-budget corpus puts the family on cooldown instead of starving the walk", () => {
  it("still FAILS CLOSED - the tick must not silently succeed", async () => {
    const marked: unknown[] = [];
    const loop = startAutoReplayLoop(makeInput(marked));
    try {
      const result = await loop.tick();
      // Fail-closed is preserved: the tick did not return a successful empty result.
      expect(loop.health().lastError ?? "").toMatch(/route replayable corpus unavailable/);
      expect(result.skipped).not.toBe(true);
    } finally {
      loop.stop();
    }
  });

  it("marks the over-budget family not-yet-eligible so the next tick can pick another one", async () => {
    const marked: { roleId?: string; taskTypeId?: string; nextEligibleAtMs?: number }[] = [];
    const loop = startAutoReplayLoop(makeInput(marked));
    try {
      await loop.tick().catch(() => undefined);
      const forFamily = marked.filter(
        (m) => m.roleId === "recruiter" && m.taskTypeId === "recruiter.candidate.screen",
      );
      expect(forFamily.length).toBeGreaterThan(0);
      // The cooldown must push eligibility into the FUTURE, otherwise the same family is re-picked immediately.
      expect(forFamily[0]?.nextEligibleAtMs ?? 0).toBeGreaterThan(1_000_000);
    } finally {
      loop.stop();
    }
  });
});
