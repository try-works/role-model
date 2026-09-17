import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import {
  DEFAULT_TICK_BUDGET_MS,
  resolveAutoReplayTickBudgetMs,
} from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

function harness() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run97-loop-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

const fakeOperations = (pending: string[]) => {
  const recorded: Array<Record<string, unknown>> = [];
  return {
    recorded,
    async listPendingReplayCaptures() {
      return { pending, pendingCount: pending.length };
    },
    async recordReplayDisposition(input: Record<string, unknown>) {
      recorded.push(input);
      return { recorded: true };
    },
  };
};

test("run97 auto loop fetches pending captures, replays them, and writes dispositions", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-1", "req-2"]);
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
      executor: async ({ capture, candidates }) => ({
        terminal: true,
        branches: candidates.map((endpointId) => ({
          endpointId,
          outcome: "complete" as const,
        })),
        captureRefSeen: capture.captureRef,
      }),
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();
    expect(result.replayed).toBe(2);
    expect(operations.recorded.map((row) => row.captureRef)).toEqual(["req-1", "req-2"]);
    expect(operations.recorded.map((row) => row.outcome)).toEqual(["replayed", "replayed"]);
    expect(loop.health()).toMatchObject({ ticks: 1, lastOutcome: "ok" });
  } finally {
    cleanup();
  }
});

test("run97 auto loop survives executor failure and reports it without throwing", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-1"]);
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async () => {
        throw new Error("provider unavailable");
      },
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();
    expect(result.deferred).toBe(1);
    expect(operations.recorded[0]).toMatchObject({
      outcome: "deferred",
      refusalCode: "replay_failed",
    });
    expect(loop.health()).toMatchObject({ ticks: 1, lastOutcome: "ok" });
  } finally {
    cleanup();
  }
});

test("run97 auto loop never overlaps ticks and stops cleanly", async () => {
  const { ledger, cleanup } = harness();
  try {
    let release: (() => void) | null = null;
    const operations = fakeOperations(["req-1"]);
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return {
          terminal: true,
          branches: [{ endpointId: "endpoint-b", outcome: "complete" as const }],
        };
      },
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const first = loop.tick();
    const second = await loop.tick();
    expect(second.skipped).toBe(true);
    release?.();
    await first;
    loop.stop();
    expect(loop.health().ticks).toBe(1);
    expect(loop.health().running).toBe(false);
  } finally {
    cleanup();
  }
});

test("run97 auto loop degrades when the private boundary is unavailable", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = {
      async listPendingReplayCaptures() {
        throw new Error("operations boundary unavailable");
      },
      async recordReplayDisposition() {
        throw new Error("operations boundary unavailable");
      },
    };
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a"],
      executor: async () => ({ terminal: true, branches: [] }),
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();
    expect(result).toMatchObject({ processed: 0, replayed: 0, deferred: 0 });
    expect(loop.health().lastOutcome).toBe("degraded");
  } finally {
    cleanup();
  }
});

test("run97 auto loop pauses and resumes without disabling routing", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-1"]);
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async ({ candidates }) => ({
        terminal: true,
        branches: candidates.map((endpointId) => ({
          endpointId,
          outcome: "complete" as const,
        })),
      }),
      intervalMs: 60_000,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    loop.pause();
    expect(loop.health().paused).toBe(true);
    const paused = await loop.tick();
    expect(paused.skipped).toBe(true);
    expect(operations.recorded).toEqual([]);
    expect(ledger.status()).toMatchObject({ dispatches: 0 });
    loop.resume();
    const resumed = await loop.tick();
    expect(resumed.replayed).toBe(1);
    expect(loop.health().paused).toBe(false);
    loop.stop();
  } finally {
    cleanup();
  }
});

test("run97 auto loop reports bounded operator status", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-1"]);
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async ({ candidates }) => ({
        terminal: true,
        branches: candidates.map((endpointId) => ({
          endpointId,
          outcome: "complete" as const,
        })),
      }),
      intervalMs: 0,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    await loop.tick();
    const status = loop.status();
    expect(status).toMatchObject({
      paused: false,
      lastOutcome: "ok",
      budget: { window: "2026-09-12", counterfactuals: 1, dispatchLimit: 300 },
      lastDispositions: 1,
    });
    loop.stop();
  } finally {
    cleanup();
  }
});

test("run97 auto loop re-reads configured endpoints on every tick", async () => {
  const { ledger, cleanup } = harness();
  try {
    const configured: string[] = [];
    const operations = fakeOperations(["req-1"]);
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: () => configured,
      executor: async ({ candidates }) => ({
        terminal: true,
        branches: candidates.map((endpointId) => ({
          endpointId,
          outcome: "complete" as const,
        })),
      }),
      intervalMs: 0,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const beforeConfiguration = await loop.tick();
    expect(beforeConfiguration.deferred).toBe(1);
    expect(beforeConfiguration.dispositions[0]?.code).toBe("no_distinct_candidate_configured");
    configured.push("endpoint-a", "endpoint-b");
    const afterConfiguration = await loop.tick();
    expect(afterConfiguration.replayed).toBe(1);
    // Two configured endpoints both differ from the unknown source, so the tick
    // dispatches both candidates under one counterfactual.
    expect(ledger.status()).toMatchObject({ counterfactuals: 1, dispatches: 2 });
    loop.stop();
  } finally {
    cleanup();
  }
});

test("run97 auto loop uses the capture's source endpoint to pick distinct candidates", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = {
      async listPendingReplayCaptures() {
        return {
          pending: [
            {
              captureRef: "req-object-1",
              sourceEndpointId: "endpoint-a",
              hasRecordedToolResults: true,
            },
          ],
        };
      },
      async recordReplayDisposition(input: Record<string, unknown>) {
        operations.recorded.push(input);
        return { recorded: true };
      },
      recorded: [] as Array<Record<string, unknown>>,
    };
    const seenCandidates: string[][] = [];
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async ({ candidates }) => {
        seenCandidates.push([...candidates]);
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({
            endpointId,
            outcome: "complete" as const,
          })),
        };
      },
      intervalMs: 0,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();
    // The source endpoint must never be offered as its own counterfactual.
    expect(seenCandidates).toEqual([["endpoint-b"]]);
    expect(result.replayed).toBe(1);
    expect(operations.recorded[0]).toMatchObject({ outcome: "replayed" });
  } finally {
    cleanup();
  }
});

test("run97 auto loop refuses replay-produced captures reported by the private boundary", async () => {
  const { ledger, cleanup } = harness();
  try {
    const recorded: Array<Record<string, unknown>> = [];
    const operations = {
      async listPendingReplayCaptures() {
        return {
          pending: [
            {
              captureRef: "req-live-1",
              sourceEndpointId: "endpoint-a",
              hasRecordedToolResults: true,
              replayProduced: false,
            },
            {
              captureRef: "replay-req-live-1-1e03652ce6770a82",
              sourceEndpointId: "endpoint-a",
              hasRecordedToolResults: false,
              replayProduced: true,
            },
          ],
          replayProducedCount: 1,
        };
      },
      async recordReplayDisposition(input: Record<string, unknown>) {
        recorded.push(input);
        return { recorded: true };
      },
    };
    const executed: string[] = [];
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async ({ capture }) => {
        executed.push(capture.captureRef);
        return { terminal: true, branches: [{ endpointId: "endpoint-b", outcome: "complete" as const }] };
      },
      intervalMs: 0,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();
    expect(executed).toEqual(["req-live-1"]);
    expect(result.refused).toBe(1);
    expect(recorded.map((row) => `${row.captureRef}:${row.outcome}:${row.refusalCode}`)).toEqual([
      "req-live-1:replayed:null",
      "replay-req-live-1-1e03652ce6770a82:refused:amplification_depth_exceeded",
    ]);
  } finally {
    cleanup();
  }
});

/**
 * Run 98 addendum 04 §7 (`L6`), measured live on v171: a tick walks up to eight captures and each
 * real dsh replay takes ~4 minutes, so a full tick runs for tens of minutes. Nothing was written to
 * the durable disposition ledger until the whole tick returned, so the ledger showed "no replay
 * activity" for half an hour at a time while the captures were simply queued behind each other.
 */
/**
 * Run 98 addendum 04 §7 (`L7`), measured live on v171/v172: a work tick walks up to eight captures
 * at ~4 minutes each, so it can hold the loop for tens of minutes — and the deadline sweep ran only
 * *after* that work. The result was 10 replay jobs sitting in `running` at ages up to 79 minutes
 * against a 360 s deadline, with the newest expiry in the whole store still 08:16Z. Liveness
 * bookkeeping must not be hostage to replay throughput.
 */
test("run98 addendum 04 liveness sweeps still run while a long work tick is in flight", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-long-1"]);
    let expiries = 0;
    let resumes = 0;
    operations.expireStaleReplayJobs = async () => {
      expiries += 1;
      return { expiredCount: 1 };
    };
    operations.resumePendingEvaluations = async () => {
      resumes += 1;
      return { resumed: 0 };
    };
    let releaseFirst: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async () => {
        await gate;
        return {
          terminal: true,
          branches: [{ endpointId: "endpoint-b", outcome: "complete" as const }],
        };
      },
      intervalMs: 0,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const first = loop.tick();
    // Let the first tick enter its executor, then let the interval fire while it is still working.
    await new Promise((resolve) => setTimeout(resolve, 20));
    const second = await loop.tick();
    expect(second.skipped).toBe(true);
    expect(expiries).toBeGreaterThan(0);
    expect(resumes).toBeGreaterThan(0);
    releaseFirst?.();
    await first;
    loop.stop();
  } finally {
    cleanup();
  }
});

test("run98 addendum 04 a disposition is recorded per capture instead of only when the tick ends", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-slow-1", "req-slow-2"]);
    const recorded: Record<string, unknown>[] = [];
    operations.recordReplayDisposition = async (input: Record<string, unknown>) => {
      recorded.push(input);
      return { recorded: true };
    };
    let releaseSecond: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async ({ capture }) => {
        if (capture.captureRef === "req-slow-2") await gate;
        return {
          terminal: true,
          branches: [{ endpointId: "endpoint-b", outcome: "complete" as const }],
        };
      },
      executorTimeoutMs: 30_000,
      intervalMs: 0,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const tickPromise = loop.tick();
    // While the second capture is still executing, the first one's disposition must already be
    // durable — that is what lets the ledger and the pending projection advance mid-tick.
    for (let attempt = 0; attempt < 200 && recorded.length === 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    expect(recorded.length).toBe(1);
    expect(recorded[0]?.captureRef).toBe("req-slow-1");
    releaseSecond?.();
    await tickPromise;
    loop.stop();
    expect(recorded.length).toBe(2);
  } finally {
    cleanup();
  }
});

test("run98 addendum 04 a hung replay execution is bounded instead of stalling the producer", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-hung-1"]);
    const recorded: Record<string, unknown>[] = [];
    operations.recordReplayDisposition = async (input: Record<string, unknown>) => {
      recorded.push(input);
      return { recorded: true };
    };
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      // Measured live on v170: one capture whose replay never returned held the whole producer
      // tick open (`ticks: 0`, `lastProcessedAtMs: null`), so no disposition was recorded, no
      // expiry sweep ran, and eight replay jobs accumulated in `running` past their deadline.
      executor: () => new Promise(() => {}),
      executorTimeoutMs: 50,
      intervalMs: 0,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const result = await loop.tick();
    loop.stop();
    expect(result.deferred).toBe(1);
    expect(String(recorded[0]?.outcome)).toBe("deferred");
    expect(String(recorded[0]?.detail ?? "")).toMatch(/exceeded 50ms/);
  } finally {
    cleanup();
  }
});

  test("run97 auto loop re-reads endpoint health and never dispatches a degraded candidate", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-health-1"]);
    let healthReads = 0;
    const seenCandidates: string[][] = [];
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-degraded"],
      // A credential-less endpoint is degraded: selecting it can only burn budget and
      // leave the capture without a comparison.
      healthyEndpointIds: async () => {
        healthReads += 1;
        return ["endpoint-a", "endpoint-b"];
      },
      executor: async ({ candidates }) => {
        seenCandidates.push([...candidates]);
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({
            endpointId,
            outcome: "complete" as const,
          })),
        };
      },
      intervalMs: 0,
      now: () => Date.parse("2026-09-13T02:00:00Z"),
    });
    const first = await loop.tick();
    const second = await loop.tick();
    loop.stop();
    expect(healthReads).toBe(2);
    // Run 98 addendum 33 S3 rotates the counterfactual by a per-capture digest key, so the offered
    // order is a property of the capture, not of the configured list. What the health filter must
    // guarantee is the *set*: every healthy endpoint is offered and the degraded one never is.
    expect([...seenCandidates[0]].sort()).toEqual(["endpoint-a", "endpoint-b"]);
    expect(seenCandidates.flat()).not.toContain("endpoint-degraded");
    expect(first.replayed + second.replayed).toBeGreaterThanOrEqual(1);
  } finally {
    cleanup();
  }
});

/**
 * Run 98 addendum 04 follow-on: the tick had no wall-clock bound.
 *
 * Measured live: eight captures at ~4 minutes each made a single tick run for tens of minutes, and
 * although `L7` keeps the liveness sweeps running on the interval path, everything else the tick
 * owns — dispositions for the captures it has not reached, the auto-loop's status, the next tick —
 * waited with it. The tick now stops *starting* new captures once its budget is spent; the remaining
 * captures stay queued for the next tick, and the cursor is left on the last capture actually
 * processed so nothing is skipped.
 */
test("run98 addendum 04 the tick stops starting captures once its wall-clock budget is spent", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-1", "req-2", "req-3", "req-4"]);
    const executions: string[] = [];
    let clock = Date.parse("2026-09-14T06:00:00Z");
    const loop = startAutoReplayLoop({
      operations,
      ledger,
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      executor: async ({ capture, candidates }) => {
        executions.push(capture.captureRef);
        // Each capture takes two minutes of the tick's budget.
        clock += 120_000;
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({
            endpointId,
            outcome: "complete" as const,
          })),
        };
      },
      intervalMs: 0,
      now: () => clock,
      maxCapturesPerTick: 8,
      tickBudgetMs: 300_000,
    });
    const result = await loop.tick();
    loop.stop();
    // Three captures fit inside the five-minute budget; the fourth is left for the next tick.
    expect(executions).toHaveLength(3);
    expect(result.processed).toBe(3);
    expect(result.budgetExhausted).toBe(true);
    // Only the captures that ran wrote dispositions, and the cursor stayed on the last one that ran.
    const recordedRefs = operations.recorded.map((row) => String(row.captureRef));
    expect(recordedRefs).toEqual(["req-1", "req-2", "req-3"]);
    expect(result.cursor).toBe("req-3");
  } finally {
    cleanup();
  }
});

test("run98 addendum 04 the tick budget is operator-tunable and bounded", () => {
  // No explicit value: the loop keeps its documented default.
  expect(resolveAutoReplayTickBudgetMs({})).toBeNull();
  expect(
    resolveAutoReplayTickBudgetMs({ ROLE_MODEL_AUTO_REPLAY_TICK_BUDGET_MS: "600000" }),
  ).toBe(600_000);
  // Zero is meaningful: it disables the wall-clock bound.
  expect(resolveAutoReplayTickBudgetMs({ ROLE_MODEL_AUTO_REPLAY_TICK_BUDGET_MS: "0" })).toBe(0);
  // Malformed or out-of-range values fall back to the default rather than removing the bound.
  for (const raw of ["nope", "-5", "99999999", "1.5"]) {
    expect(
      resolveAutoReplayTickBudgetMs({ ROLE_MODEL_AUTO_REPLAY_TICK_BUDGET_MS: raw }),
    ).toBe(DEFAULT_TICK_BUDGET_MS);
  }
});
