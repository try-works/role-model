import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

import { retryableReplayRefusalCodes, runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 108: a capture whose judge cannot be resolved must be deferred by name, not planned without the judge's
 * exclusion.
 *
 * The tick already refuses a capture whose *own* endpoint is the judge (`judge_candidate_overlap`), using the
 * judge the caller resolved. When that resolution fails the field is `null` and the refusal was simply skipped -
 * so the capture went to the executor, which plans arms *without* the exclusion and can pick the controller as
 * the counterfactual arm; the completion then resolves the judge successfully and the controller scores a
 * comparison it is an arm of. Measured: 45 of the newest 300 groups carry `judge_self_evaluation`, and in the
 * newest 400 measured cases 142 of 144 have the judge as the counterfactual arm, interleaved with clean groups.
 *
 * `undefined` keeps meaning "this caller does not resolve a judge" (the automatic tick's non-exclusion mode),
 * so nothing changes for a caller that never had the exclusion.
 */

const configured = ["endpoint-a", "endpoint-b", "endpoint-c"];

const tempLedger = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run108-judge-unresolved-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-24T05:00:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
};

test("run111 an unresolvable judge defers by name only when the caller opts in", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const executed: string[] = [];
    const rows: Array<Record<string, unknown>> = [];
    const result = await runAutoReplayTick({
      captures: [
        { captureRef: "req-1", sourceEndpointId: "endpoint-a", hasRecordedToolResults: false },
      ],
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      // The caller resolved a judge for this tick, could not name it, and asks to be refused rather than plan
      // arms that may contain it.
      judgeEndpointId: null,
      requireResolvedJudge: true,
      executor: async ({ capture }) => {
        executed.push(capture.captureRef);
        return { terminal: true, branches: [] };
      },
      dispositionSink: (row) => rows.push(row as unknown as Record<string, unknown>),
    });
    expect(executed).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      captureRef: "req-1",
      outcome: "deferred",
      code: "judge_unresolved",
    });
    expect(result.deferred).toBe(1);
    expect(retryableReplayRefusalCodes().has("judge_unresolved")).toBe(true);
  } finally {
    cleanup();
  }
});

test("run108 a tick that does not resolve a judge keeps its behaviour", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const executed: string[] = [];
    const result = await runAutoReplayTick({
      captures: [
        { captureRef: "req-1", sourceEndpointId: "endpoint-a", hasRecordedToolResults: false },
      ],
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async ({ capture, candidates }) => {
        executed.push(capture.captureRef);
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
    });
    expect(executed).toEqual(["req-1"]);
    expect(result.replayed).toBe(1);
  } finally {
    cleanup();
  }
});

test("run111 an unresolved judge without the opt-in proceeds (the live regression guard)", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const executed: string[] = [];
    const result = await runAutoReplayTick({
      captures: [
        { captureRef: "req-1", sourceEndpointId: "endpoint-a", hasRecordedToolResults: false },
      ],
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      /**
       * The state the real-traffic runtime is in: the caller's judge hook answers `null` although the
       * controller assignment exists, so an unconditional guard refused **every** capture (measured live: the
       * four newest dispositions were all `refused` / `judge_unresolved`). Without the opt-in the capture is
       * planned as it was before the guard existed - a worse comparison is better than no replay at all.
       */
      judgeEndpointId: null,
      executor: async ({ capture, candidates }) => {
        executed.push(capture.captureRef);
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
    });
    expect(executed).toEqual(["req-1"]);
    expect(result.replayed).toBe(1);
    expect(result.deferred).toBe(0);
  } finally {
    cleanup();
  }
});

test("run108 a resolved judge still lets a capture whose own endpoint differs through", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const executed: string[] = [];
    await runAutoReplayTick({
      captures: [
        { captureRef: "req-1", sourceEndpointId: "endpoint-a", hasRecordedToolResults: false },
      ],
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      judgeEndpointId: "endpoint-c",
      executor: async ({ capture, candidates }) => {
        executed.push(capture.captureRef);
        expect(candidates).not.toContain("endpoint-c");
        return {
          terminal: true,
          branches: candidates.map((endpointId) => ({ endpointId, outcome: "complete" as const })),
        };
      },
    });
    expect(executed).toEqual(["req-1"]);
  } finally {
    cleanup();
  }
});
