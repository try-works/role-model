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
