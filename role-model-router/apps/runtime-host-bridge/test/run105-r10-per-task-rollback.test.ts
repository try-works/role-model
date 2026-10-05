import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { landRollbackToggle } from "@role-model-router/core";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 105 R10 / D8: a per-(role, task) rollback flag, default OFF. ON means the advisory source
 * returns no advisory for that task AND replay dispatch is paused for it; the toggle is reversible
 * and keeps the reason for the audit trail. The toggle NEVER calls rollbackPack and never writes
 * rolledBackWithValidationReceiptId; guardrail auto-rollback and the kill switch do not set
 * per-task flags (the kill switch suppresses through the existing router gate).
 *
 * Also the R1/R8 classification gate: a capture without BOTH roleId and taskTypeId is never
 * admitted to the queue and is reported once per tick as no_route_classification.
 */
const harness = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run105-r10-"));
  return {
    dir,
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-10-03T00:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
};

describe("run105 R10 rollback toggle (pure)", () => {
  test("default OFF: an untouched ladder is not rolled back", () => {
    expect(
      landRollbackToggle({
        rolledBack: { on: false, reason: null, atMs: null },
        rolledBackOn: false,
      }),
    ).toEqual({
      on: false,
      reason: null,
      atMs: null,
    });
  });

  test("ON records the operator reason and the time; OFF is reversible and keeps the reason", () => {
    const on = landRollbackToggle({
      rolledBack: { on: false, reason: null, atMs: null },
      rolledBackOn: true,
      reason: "operator_rollback",
      atMs: 100,
    });
    expect(on).toEqual({ on: true, reason: "operator_rollback", atMs: 100 });
    const off = landRollbackToggle({ rolledBack: on, rolledBackOn: false });
    expect(off.on).toBe(false);
    expect(off.reason).toBe("operator_rollback");
  });

  test("D8: the toggle carries no pack/receipt identity - it is not the legacy receipt-bound rollback", () => {
    const landed = landRollbackToggle({
      rolledBack: { on: false, reason: null, atMs: null },
      rolledBackOn: true,
      reason: "operator_rollback",
    });
    expect(Object.keys(landed).sort()).toEqual(["atMs", "on", "reason"]);
  });
});

describe("run105 R10/R1 classification gate in the replay tick", () => {
  test("a capture without BOTH roleId and taskTypeId is never admitted and is reported once as no_route_classification", async () => {
    const { ledger, cleanup } = harness();
    try {
      const executed: string[] = [];
      const recorded: Array<Record<string, unknown>> = [];
      const loop = startAutoReplayLoop({
        operations: {
          async listPendingReplayCaptures() {
            return {
              pending: [
                {
                  captureRef: "capture:unclassified",
                  roleId: "role:code-review",
                  sourceEndpointId: "endpoint:a",
                },
                {
                  captureRef: "capture:classified",
                  roleId: "role:code-review",
                  taskTypeId: "task:code-review",
                  sourceEndpointId: "endpoint:a",
                },
              ],
              pendingCount: 2,
            };
          },
          async recordReplayDisposition(input: Record<string, unknown>) {
            recorded.push(input);
            return { recorded: true };
          },
        },
        ledger,
        policySet: buildReplayPolicySet(),
        configuredEndpointIds: ["endpoint:a", "endpoint:b"],
        executor: async ({ capture, candidates }) => {
          executed.push(capture.captureRef);
          return {
            terminal: true,
            branches: candidates.map((endpointId) => ({
              endpointId,
              outcome: "complete" as const,
            })),
          };
        },
        intervalMs: 60_000,
        now: () => Date.parse("2026-10-03T00:00:00Z"),
      });
      const result = await loop.tick();
      loop.stop();
      expect(executed).toEqual(["capture:classified"]);
      const gate = recorded.filter((row) => row.refusalCode === "no_route_classification");
      expect(gate).toHaveLength(1);
      expect(gate[0]).toMatchObject({ captureRef: "capture:unclassified", outcome: "refused" });
      expect(result.replayed).toBe(1);
    } finally {
      cleanup();
    }
  });
});
