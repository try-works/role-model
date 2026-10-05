/**
 * Run 101 / R7 - once a queue is authoritative, the loop it replaced stops
 * scheduling that work.
 *
 * The property under test is the one the design's §3.3 asks for: the superseded
 * sweeps are not schedulers any more. `legacy` keeps every sweep running (a
 * rollback restores the old behaviour with no other change), `shadow` keeps the
 * sweep authoritative, and only `queue` retires it.
 */
import { describe, expect, it } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";

function harness(planeModes?: {
  readonly evaluation?: "legacy" | "shadow" | "queue";
  readonly learner?: "legacy" | "shadow" | "queue";
}) {
  const called: string[] = [];
  const operations = {
    listPendingReplayCaptures: async () => {
      called.push("listPendingReplayCaptures");
      return { pending: [] };
    },
    recordReplayDisposition: async () => undefined,
    expireStaleReplayJobs: async () => {
      called.push("expireStaleReplayJobs");
      return { expired: 0 };
    },
    resumePendingEvaluations: async () => {
      called.push("resumePendingEvaluations");
      return {
        resumed: 0,
        completed: 0,
        failed: 0,
        outsideRetentionWindow: 0,
        renewedFromDrain: 0,
        remaining: 0,
      };
    },
    reconcileEvaluationJobs: async () => {
      called.push("reconcileEvaluationJobs");
      return { completed: 0, stranded: 0, reclaimed: 0 };
    },
    retroFinalizeEvaluations: async () => {
      called.push("retroFinalizeEvaluations");
      return { finalized: 0 };
    },
    sweepFinalizationSignals: async () => {
      called.push("sweepFinalizationSignals");
      return { written: 0 };
    },
    learnFromUnconsumedCandidates: async () => {
      called.push("learnFromUnconsumedCandidates");
      return { consumed: 0, remaining: 0 };
    },
    deriveLearnerCandidates: async () => {
      called.push("deriveLearnerCandidates");
      return { derived: 0, pending: 0 };
    },
  } as never;

  const loop = startAutoReplayLoop({
    operations,
    ledger: {
      status: () => ({
        dispatches: 0,
        dispatchLimit: 100,
        counterfactuals: 0,
        counterfactualLimit: 100,
      }),
      hasTerminalCounterfactual: () => false,
      reserve: () => ({ accepted: true, reservationId: "res" }),
      record: () => ({ accepted: true }),
      complete: () => ({ accepted: true }),
      completeCounterfactual: () => ({ accepted: true }),
      release: () => undefined,
    } as never,
    policySet: { policySetDigest: "digest", policyIds: [] } as never,
    configuredEndpointIds: ["endpoint-a"],
    executor: async () => ({ branches: [], terminal: true }) as never,
    intervalMs: 0,
    ...(planeModes ? { planeModes } : {}),
  });
  return { loop, called };
}

describe("@recursive:101-effect-mq-queue-rebuild @sp7 R7 sweeps retired", () => {
  it("keeps every sweep running while the planes are legacy", async () => {
    const { loop, called } = harness();
    await loop.tick();
    loop.stop();
    expect(called).toContain("resumePendingEvaluations");
    expect(called).toContain("reconcileEvaluationJobs");
    expect(called).toContain("learnFromUnconsumedCandidates");
    expect(called).toContain("deriveLearnerCandidates");
  });

  it("keeps the sweeps authoritative in shadow mode", async () => {
    const { loop, called } = harness({ evaluation: "shadow", learner: "shadow" });
    await loop.tick();
    loop.stop();
    expect(called).toContain("resumePendingEvaluations");
    expect(called).toContain("deriveLearnerCandidates");
  });

  it("retires the evaluation sweeps once the evaluation queue is authoritative", async () => {
    const { loop, called } = harness({ evaluation: "queue" });
    await loop.tick();
    loop.stop();
    expect(called).not.toContain("resumePendingEvaluations");
    expect(called).not.toContain("reconcileEvaluationJobs");
    expect(called).not.toContain("retroFinalizeEvaluations");
    // The signals producer is evidence, not scheduling, so it keeps running.
    expect(called).toContain("sweepFinalizationSignals");
  });

  it("retires the learner sweeps once the learner queue is authoritative", async () => {
    const { loop, called } = harness({ learner: "queue" });
    await loop.tick();
    loop.stop();
    expect(called).not.toContain("learnFromUnconsumedCandidates");
    expect(called).not.toContain("deriveLearnerCandidates");
    expect(called).toContain("resumePendingEvaluations");
  });
});
