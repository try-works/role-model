import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 99 R33 live finding (stage v158, `:3457`): a supervised-replay evaluation whose completion was
 * interrupted (deployment restart between "scores recorded" and "comparison group finalized") is
 * never resumed, because the producer only drives *replay jobs* and those are already terminal.
 *
 * The auto-replay tick therefore owns one bounded evaluation-resume sweep per tick — the same shape
 * as the existing replay-expiration sweep — so an interrupted completion is retried on the running
 * loop instead of waiting for another capture to arrive.
 */

function harness() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run99-resume-sweep-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-16T06:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function fakeOperations(pending: string[]) {
  const recorded: Array<Record<string, unknown>> = [];
  const sweeps: Array<Record<string, unknown>> = [];
  return {
    recorded,
    sweeps,
    async listPendingReplayCaptures() {
      return { pending, pendingCount: pending.length };
    },
    async recordReplayDisposition(input: Record<string, unknown>) {
      recorded.push(input);
      return { recorded: true };
    },
    async resumePendingEvaluations(input: Record<string, unknown>) {
      sweeps.push(input);
      return { resumed: 2, completed: 1, failed: 1, remaining: 1 };
    },
  };
}

test("run99 R33 the auto-replay tick sweeps interrupted evaluations even with no pending captures", async () => {
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
      now: () => Date.parse("2026-09-16T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();

    expect(operations.sweeps).toHaveLength(1);
    expect(result.processed).toBe(0);
    expect(loop.health()).toMatchObject({ ticks: 1, lastOutcome: "ok", lastResumedEvaluations: 2 });
    expect(loop.status()).toMatchObject({ lastResumedEvaluations: 2 });
  } finally {
    cleanup();
  }
});

test("run99 R33 a failing evaluation sweep degrades the tick without discarding dispositions", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-1"]);
    operations.resumePendingEvaluations = async () => {
      throw new Error("durable replay evaluation is missing branch capture for endpoint:endpoint-a");
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
      now: () => Date.parse("2026-09-16T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();

    expect(result.replayed).toBe(1);
    expect(operations.recorded.map((row) => row.outcome)).toEqual(["replayed"]);
    expect(loop.health().lastOutcome).toBe("degraded");
    expect(String(loop.health().lastError)).toMatch(/evaluation resume sweep failed/i);
  } finally {
    cleanup();
  }
});
