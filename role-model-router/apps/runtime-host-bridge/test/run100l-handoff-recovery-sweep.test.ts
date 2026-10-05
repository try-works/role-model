import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S7 at the loop level: the liveness sweep owns the
 * recovery pass (the same place the expiry, resume and reconcile sweeps live), so a handed-off replay is
 * picked up even when no work tick ever reaches the capture again, and its count is on the loop's health
 * readback rather than only in a log line.
 */

test("run100l the liveness sweep recovers handed-off replays and reports the count", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run100l-handoff-sweep-"));
  try {
    const ledger = createReplayLedger({ filePath: path.join(dir, "ledger.json") });
    const calls: Array<Record<string, unknown>> = [];
    const operations = {
      async listPendingReplayCaptures() {
        return { pending: [], pendingCount: 0 };
      },
      async recordReplayDisposition() {
        return { recorded: true };
      },
      async recoverHandedOffEvaluations(input: Record<string, unknown>) {
        calls.push(input);
        return { scanned: 4, recovered: 2, skipped: 2 };
      },
    };
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async () => ({ terminal: true, branches: [] }),
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-23T12:00:00Z"),
    });
    await loop.tick();
    loop.stop();

    expect(calls).toHaveLength(1);
    expect(loop.health()).toMatchObject({ ticks: 1, lastOutcome: "ok", lastRecoveredHandoffs: 2 });
    expect(loop.status()).toMatchObject({ lastRecoveredHandoffs: 2 });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("run100l a failing recovery pass degrades the tick instead of stopping the loop", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run100l-handoff-sweep-fail-"));
  try {
    const ledger = createReplayLedger({ filePath: path.join(dir, "ledger.json") });
    const operations = {
      async listPendingReplayCaptures() {
        return { pending: ["req-1"], pendingCount: 1 };
      },
      async recordReplayDisposition() {
        return { recorded: true };
      },
      async recoverHandedOffEvaluations() {
        throw new Error("replay job listing failed");
      },
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
      now: () => Date.parse("2026-09-23T12:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();

    expect(result.replayed).toBe(1);
    expect(loop.health().lastOutcome).toBe("degraded");
    expect(String(loop.health().lastError)).toMatch(/handed-off replay recovery failed/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
