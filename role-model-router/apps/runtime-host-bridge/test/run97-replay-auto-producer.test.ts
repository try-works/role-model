import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { retryableReplayRefusalCodes, runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

function tempLedger(limits?: { counterfactualsPerDay: number; dispatchesPerDay: number }) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run97-auto-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-12T06:00:00Z"),
      ...(limits ? { limits } : {}),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

const configured = ["endpoint-a", "endpoint-b", "endpoint-c", "endpoint-d"];

test("run97 auto producer replays pending captures with no manual call", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const dispositions: string[] = [];
    const result = await runAutoReplayTick({
      captures: [
        { captureRef: "req-1", sourceEndpointId: "endpoint-a", hasRecordedToolResults: true },
        { captureRef: "req-2", sourceEndpointId: "endpoint-b", hasRecordedToolResults: false },
      ],
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async ({ capture, candidates, toolPolicy }) => {
        expect(candidates).toHaveLength(3);
        expect(candidates).not.toContain(capture.sourceEndpointId);
        expect(["recorded_results_only", "sandboxed_allowlist"]).toContain(toolPolicy);
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
      dispositionSink: (row) => dispositions.push(`${row.captureRef}:${row.outcome}`),
    });
    expect(result.replayed).toBe(2);
    expect(result.refused).toBe(0);
    expect(result.deferred).toBe(0);
    expect(dispositions).toEqual(["req-1:replayed", "req-2:replayed"]);
    expect(ledger.status()).toMatchObject({ counterfactuals: 2, dispatches: 6 });
  } finally {
    cleanup();
  }
});

test("run97 auto producer refuses with a declared code instead of skipping work", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const result = await runAutoReplayTick({
      captures: [
        { captureRef: "req-single", sourceEndpointId: "endpoint-a", hasRecordedToolResults: true },
        {
          captureRef: "req-replay-produced",
          sourceEndpointId: "endpoint-b",
          hasRecordedToolResults: true,
          replayProduced: true,
        },
      ],
      configuredEndpointIds: ["endpoint-a"],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async () => ({ terminal: true, branches: [] }),
    });
    expect(result.replayed).toBe(0);
    // A missing distinct candidate is retryable (configuration can change), so it
    // defers; replay-produced sources stay terminally refused.
    expect(result.refused).toBe(1);
    expect(result.deferred).toBe(1);
    expect(result.dispositions.map((row) => row.code)).toEqual([
      "no_distinct_candidate_configured",
      "amplification_depth_exceeded",
    ]);
  } finally {
    cleanup();
  }
});

test("run97 auto producer is idempotent and defers when the budget is exhausted", async () => {
  const { ledger, cleanup } = tempLedger({ counterfactualsPerDay: 1, dispatchesPerDay: 3 });
  try {
    const executor = async (input: { candidates: readonly string[] }) => ({
      terminal: true,
      branches: input.candidates.map((endpointId) => ({
        endpointId,
        outcome: "complete" as const,
      })),
    });
    const first = await runAutoReplayTick({
      captures: [
        { captureRef: "req-1", sourceEndpointId: "endpoint-a", hasRecordedToolResults: true },
        { captureRef: "req-2", sourceEndpointId: "endpoint-b", hasRecordedToolResults: true },
      ],
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      executor,
    });
    expect(first.replayed).toBe(1);
    expect(first.deferred).toBe(1);
    expect(first.dispositions[1]?.code).toBe("budget_exhausted");
    const second = await runAutoReplayTick({
      captures: [
        { captureRef: "req-1", sourceEndpointId: "endpoint-a", hasRecordedToolResults: true },
        { captureRef: "req-2", sourceEndpointId: "endpoint-b", hasRecordedToolResults: true },
      ],
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      executor,
    });
    expect(second.replayed).toBe(0);
    expect(second.dispositions[0]?.code).toBe("duplicate_already_processed");
    expect(second.dispositions[1]?.code).toBe("budget_exhausted");
    expect(ledger.status()).toMatchObject({ dispatches: 3, counterfactuals: 1 });
  } finally {
    cleanup();
  }
});

test("run97 auto producer bounds each tick and reports the cursor", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const captures = Array.from({ length: 5 }, (_value, index) => ({
      captureRef: `req-${index + 1}`,
      sourceEndpointId: "endpoint-a",
      hasRecordedToolResults: true,
    }));
    const seen: string[] = [];
    const result = await runAutoReplayTick({
      captures,
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      maxCapturesPerTick: 2,
      startCursor: null,
      executor: async ({ capture }) => {
        seen.push(capture.captureRef);
        return {
          terminal: true,
          branches: [{ endpointId: "endpoint-b", outcome: "complete" as const }],
        };
      },
    });
    expect(seen).toEqual(["req-1", "req-2"]);
    expect(result.cursor).toBe("req-2");
    expect(result.processed).toBe(2);
  } finally {
    cleanup();
  }
});

test("run97 transient admission failures defer instead of terminally refusing", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-no-candidates",
          sourceEndpointId: "endpoint-a",
          hasRecordedToolResults: true,
        },
        { captureRef: "req-privacy", sourceEndpointId: "endpoint-a", hasRecordedToolResults: true },
      ],
      configuredEndpointIds: ["endpoint-a"],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async () => ({ terminal: true, branches: [] }),
    });
    // A capture refused only because the runtime had no distinct candidate yet must
    // stay pending so a later tick can replay it once configuration changes.
    expect(result.dispositions[0]).toMatchObject({
      outcome: "deferred",
      code: "no_distinct_candidate_configured",
    });
    expect(result.deferred).toBeGreaterThanOrEqual(1);

    const retryable = retryableReplayRefusalCodes();
    expect(retryable.has("no_distinct_candidate_configured")).toBe(true);
    expect(retryable.has("budget_exhausted")).toBe(true);
    expect(retryable.has("privacy_denied")).toBe(false);
    expect(retryable.has("retention_expired")).toBe(false);
  } finally {
    cleanup();
  }
});

test("run97 executor failure detail is recorded on the disposition", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const result = await runAutoReplayTick({
      captures: [
        { captureRef: "req-detail", sourceEndpointId: "endpoint-a", hasRecordedToolResults: true },
      ],
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async () => ({
        terminal: false,
        branches: [],
        failureDetail:
          "replay endpoint HTTP 409: complete durable replay source receipt is required",
      }),
    });
    expect(result.dispositions[0]).toMatchObject({
      outcome: "deferred",
      code: "replay_failed",
      detail: "replay endpoint HTTP 409: complete durable replay source receipt is required",
    });
  } finally {
    cleanup();
  }
});
