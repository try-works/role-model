import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 97 RC07 (L2) wiring: the bounded auto-replay tick expires abandoned replay jobs.
 *
 * The expiry semantics themselves are RED/GREEN-tested in the private replay-core suite
 * (`tests/track-b/run97-rc07-stale-job-expiry.test.mjs`); this test pins the producer
 * wiring: one sweep per tick, counted in loop health, and a failing sweep degrades the
 * tick instead of failing routing or losing the dispositions.
 */

function harness() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run97-rc07-loop-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-13T09:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("run97 rc07 the tick sweeps abandoned replay jobs once and reports the count", async () => {
  const { ledger, cleanup } = harness();
  try {
    const sweeps: Record<string, unknown>[] = [];
    const operations = {
      async listPendingReplayCaptures() {
        return { pending: ["req-rc07"], pendingCount: 1 };
      },
      async recordReplayDisposition() {
        return { recorded: true };
      },
      async expireStaleReplayJobs(input: Record<string, unknown>) {
        sweeps.push(input);
        return { expiredCount: 2, expired: [{ jobId: "job:1" }, { jobId: "job:2" }] };
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
      now: () => Date.parse("2026-09-13T09:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();
    expect(result.replayed).toBe(1);
    expect(sweeps).toHaveLength(1);
    expect(loop.health().lastExpiredJobs).toBe(2);
    expect(loop.status().lastExpiredJobs).toBe(2);
  } finally {
    cleanup();
  }
});

test("run97 rc07 a failing sweep degrades the tick without losing dispositions", async () => {
  const { ledger, cleanup } = harness();
  try {
    const recorded: Record<string, unknown>[] = [];
    const operations = {
      async listPendingReplayCaptures() {
        return { pending: ["req-rc07"], pendingCount: 1 };
      },
      async recordReplayDisposition(input: Record<string, unknown>) {
        recorded.push(input);
        return { recorded: true };
      },
      async expireStaleReplayJobs() {
        throw new Error("private Track B operation timed out after 8000ms");
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
      now: () => Date.parse("2026-09-13T09:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();
    expect(result.replayed).toBe(1);
    expect(recorded.map((row) => row.outcome)).toEqual(["replayed"]);
    expect(loop.health().lastOutcome).toBe("degraded");
    expect(String(loop.health().lastError)).toMatch(/timed out|sweep/i);
  } finally {
    cleanup();
  }
});
test("run97 rc07 the expiry sweep resolves the capture scope instead of falling back to the operator scope", async () => {
  const source = await readFile(new URL("../src/cli.ts", import.meta.url), "utf8");
  const start = source.indexOf("async expireStaleReplayJobs(");
  expect(start, "the expiry sweep must exist in the CLI composition").toBeGreaterThan(-1);
  const end = source.indexOf('capability: "replay:expire-stale-jobs"', start);
  expect(end).toBeGreaterThan(start);
  const sweep = source.slice(start, end);
  /**
   * Measured live on a just-restarted runtime (PID 22876): no capture had been read, so
   * `lastReplayCaptureScope` was null and the sweep fell back to the operator scope
   * (`standalone-runtime-dev`) while all 160 durable jobs lived under `runtime:1964e40c...`. The
   * extension skipped EVERY job on `job.scope !== scope` and returned `expiredCount: 0`, so the sweep
   * reported success while expiring nothing. No `expirationReceipt` was ever issued, and any job that
   * became expire-able in that window was stranded for ever behind the claim guard that requires that
   * receipt - three jobs sat overdue by ~3.5 hours past a 30-minute grace with every field eligible
   * except their scope. Run 100 addendum-06 S27/S28 already derived the scope from the store for the
   * listings; this call site simply never used that resolver.
   */
  expect(sweep, "the sweep must not fall back to a scope known to match no jobs").not.toContain(
    "lastReplayCaptureScope ?? options.scopeId",
  );
  expect(
    sweep,
    "the sweep must resolve the capture scope the way every other replay read does",
  ).toContain("replayJobScopeRef.current");
});
