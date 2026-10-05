import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test, vi } from "vitest";

import { InsufficientEvidence, evaluateRouteLadderActivation } from "@role-model-router/core";
import { Effect } from "effect";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 105 R9 / D7: derived activation is the ONLY routing authority. The learner sweep stops
 * calling knowledge:activate-pack, so this test asserts the INVOKE SPY is never called by the
 * activation decision, and that the legacy activatePack/rollbackPack code paths are untouched
 * (they stay reachable for the legacy callers asserted by run-98/run-107).
 *
 * R9's floor is a NEW quantity (K finalized effort-comparable comparisons AND mean confidence >=
 * 0.7); it does not repurpose learning-integrity's own 0.7 (C4/D6).
 */
const DEFAULTS = {
  minComparisons: 5,
  minConfidence: 0.7,
  stalenessWindowDays: 30,
  challengeBatchSize: 1,
};

const records = (count: number) =>
  Array.from({ length: count }, () => ({
    endpointId: "endpoint:a",
    confidence: 0.8,
    effortComparable: true,
  }));

const floorAdmitting = (admitted: string[]) => () => ({
  admitted,
  admittedStats: {},
  belowFloorStats: {},
});

describe("run105 R9 derived activation", () => {
  test("activation never invokes knowledge:activate-pack (D7: no promote-then-activate)", async () => {
    const invoke = vi.fn(async () => ({ receipt: { state: "active", packageId: "pack:1" } }));
    const result = await Effect.runPromise(
      evaluateRouteLadderActivation({
        records: records(5),
        configuredEndpointIds: ["endpoint:a"],
        defaults: DEFAULTS,
        admissionFloor: floorAdmitting(["endpoint:a"]),
        // The legacy activation surface is handed in on purpose: the derived path must not use it.
        invoke,
      } as never),
    );
    expect(result.active).toBe(true);
    expect(invoke).not.toHaveBeenCalled();
  });

  test("K finalized comparisons at mean confidence >= 0.7 activates the ladder", async () => {
    const result = await Effect.runPromise(
      evaluateRouteLadderActivation({
        records: records(5),
        configuredEndpointIds: ["endpoint:a"],
        defaults: DEFAULTS,
        admissionFloor: floorAdmitting(["endpoint:a"]),
      }),
    );
    expect(result.active).toBe(true);
    expect(result.admittedEndpointIds).toEqual(["endpoint:a"]);
  });

  test("below the floor there is no ladder and no advisory: routing falls back to baseline", async () => {
    const result = await Effect.runPromise(
      evaluateRouteLadderActivation({
        records: records(4),
        configuredEndpointIds: ["endpoint:a"],
        defaults: DEFAULTS,
        admissionFloor: () => ({ admitted: [], admittedStats: {}, belowFloorStats: {} }),
      }),
    );
    expect(result.active).toBe(false);
    expect(result.evidence).toBeInstanceOf(InsufficientEvidence);
  });

  test("per-(role, task) isolation: two families activate simultaneously under different keys", async () => {
    const derive = (roleId: string) =>
      Effect.runPromise(
        evaluateRouteLadderActivation({
          records: records(5),
          configuredEndpointIds: ["endpoint:a"],
          defaults: DEFAULTS,
          admissionFloor: floorAdmitting(["endpoint:a"]),
          roleId,
          taskTypeId: "task:shared",
        }),
      );
    const [left, right] = await Promise.all([derive("role:left"), derive("role:right")]);
    expect(left.active).toBe(true);
    expect(right.active).toBe(true);
    expect(left.scopeKey).toBe("role:left\u0000task:shared");
    expect(right.scopeKey).toBe("role:right\u0000task:shared");
  });

  test("the replay loop's own health never reports a ladder activation it did not derive", async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), "run105-derived-"));
    const ledger = createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-10-03T00:00:00Z"),
    });
    try {
      const loop = startAutoReplayLoop({
        operations: {
          async listPendingReplayCaptures() {
            return { pending: [], pendingCount: 0 };
          },
          async recordReplayDisposition() {
            return { recorded: true };
          },
        },
        ledger,
        policySet: buildReplayPolicySet(),
        configuredEndpointIds: ["endpoint:a"],
        executor: async () => ({ terminal: true, branches: [] }),
        intervalMs: 60_000,
        now: () => Date.parse("2026-10-03T00:00:00Z"),
      });
      await loop.tick();
      const health = loop.health();
      loop.stop();
      // The health surface gains the focus ladder readouts and nothing that looks like a stored
      // active-pack pointer (R9: active is DERIVED, never recorded).
      expect(health).toHaveProperty("focusTaskKey");
      expect(health).toHaveProperty("focusRemaining");
      expect(health).toHaveProperty("challengeInFlight");
      expect(JSON.stringify(health)).not.toMatch(/activePackageId|activate-pack/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
