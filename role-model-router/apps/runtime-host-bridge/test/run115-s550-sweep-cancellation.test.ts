import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

interface SweepInput {
  readonly signal?: AbortSignal;
}

const baseOperations = () => ({
  async listPendingReplayCaptures() { return { pending: [], pendingCount: 0 }; },
  async recordReplayDisposition() { return { recorded: true }; },
});

test("run115 s550 every production sweep body receives the loop abort signal", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run115-s550-signal-"));
  try {
    const signals: AbortSignal[] = [];
    const record = (input: SweepInput) => {
      const signal = input.signal;
      if (signal instanceof AbortSignal) signals.push(signal);
      return {};
    };
    const loop = startAutoReplayLoop({
      operations: {
        ...baseOperations(),
        async resumePendingEvaluations(input: SweepInput) { return record(input); },
        async sweepFinalizationSignals(input: SweepInput) { return record(input); },
        async learnFromUnconsumedCandidates(input: SweepInput) { return record(input); },
        async deriveLearnerCandidates(input: SweepInput) { return record(input); },
        async recoverHandedOffEvaluations(input: SweepInput) { return record(input); },
      },
      ledger: createReplayLedger({ filePath: path.join(dir, "ledger.json") }),
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a"],
      executor: async () => ({ terminal: true, branches: [] }),
      intervalMs: 60_000,
      now: () => Date.parse("2026-10-30T00:00:00Z"),
    });
    await loop.tick();
    loop.stop();
    expect(signals.length).toBeGreaterThanOrEqual(5);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("run115 s550 a wedged sweep is aborted by stop instead of holding the tick open", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run115-s550-wedged-"));
  try {
    let seen: AbortSignal | undefined;
    const loop = startAutoReplayLoop({
      operations: {
        ...baseOperations(),
        recoverHandedOffEvaluations(input: SweepInput) {
          const signal = input.signal;
          if (signal instanceof AbortSignal) seen = signal;
          return new Promise(() => {});
        },
      },
      ledger: createReplayLedger({ filePath: path.join(dir, "ledger.json") }),
      policySet: buildReplayPolicySet(),
      configuredEndpointIds: ["endpoint-a"],
      executor: async () => ({ terminal: true, branches: [] }),
      intervalMs: 60_000,
      now: () => Date.parse("2026-10-30T00:00:00Z"),
    });
    const tick = loop.tick();
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(seen).toBeDefined();
    loop.stop();
    const outcome = await Promise.race([
      tick.then((result) => ({ status: "settled" as const, result })),
      new Promise<{ status: "hung" }>((resolve) => setTimeout(() => resolve({ status: "hung" }), 500)),
    ]);
    expect(outcome.status).toBe("settled");
    if (outcome.status !== "settled") throw new Error("wedged tick did not settle");
    expect(outcome.result.skipped).toBe(true);
    expect(seen?.aborted).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
