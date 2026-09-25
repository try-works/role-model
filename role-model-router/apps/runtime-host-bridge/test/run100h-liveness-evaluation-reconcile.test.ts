import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 100 addendum `00-requirements.evaluation-lease-wedge-repair.addendum-02` S1 (operator report
 * 2026-09-23: "18 evals have been stuck in flight for hours").
 *
 * `evaluation:reconcile-jobs` is the pass that completes a job whose comparison finalized, strands one
 * with no live lease, and reclaims it after the grace — and it had **no production caller**, which is
 * why 18 rows could stay non-terminal for two days. The auto-replay liveness sweeps already expire
 * stale replay jobs and resume interrupted evaluations each tick; the reconcile pass belongs there and
 * its counts must be visible in the loop health instead of being discovered by eye.
 */

function harness() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run100h-reconcile-sweep-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-23T06:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function fakeOperations(pending: string[]) {
  const reconciles: Array<Record<string, unknown>> = [];
  return {
    reconciles,
    async listPendingReplayCaptures() {
      return { pending, pendingCount: pending.length };
    },
    async recordReplayDisposition() {
      return { recorded: true };
    },
    async reconcileEvaluationJobs(input: Record<string, unknown>) {
      reconciles.push(input);
      return {
        scanned: 3,
        completed: ["evaluation-completed-1"],
        stranded: ["evaluation-stranded-1"],
        reclaimed: ["evaluation-reclaimed-1"],
      };
    },
  };
}

test("run100h the auto-replay tick reconciles evaluation jobs and surfaces the counts", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations([]);
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async () => ({ terminal: true, branches: [] }),
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-23T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();

    expect(operations.reconciles).toHaveLength(1);
    expect(result.processed).toBe(0);
    expect(loop.health()).toMatchObject({
      ticks: 1,
      lastOutcome: "ok",
      lastReconciledEvaluations: 1,
      lastStrandedEvaluations: 1,
      lastReclaimedEvaluations: 1,
    });
    expect(loop.status()).toMatchObject({
      lastReconciledEvaluations: 1,
      lastStrandedEvaluations: 1,
      lastReclaimedEvaluations: 1,
    });
  } finally {
    cleanup();
  }
});

test("run100h a failing reconcile degrades the tick without discarding dispositions", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-1"]);
    operations.reconcileEvaluationJobs = async () => {
      throw new Error("bounded evaluation job reconciliation limit required");
    };
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async ({ candidates }) => ({
        terminal: true,
        branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
      }),
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-23T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();

    expect(result.replayed).toBe(1);
    expect(loop.health().lastOutcome).toBe("degraded");
    expect(String(loop.health().lastError)).toMatch(/evaluation job reconciliation failed/i);
  } finally {
    cleanup();
  }
});
