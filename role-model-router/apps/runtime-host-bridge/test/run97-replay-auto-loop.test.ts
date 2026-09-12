import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
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
