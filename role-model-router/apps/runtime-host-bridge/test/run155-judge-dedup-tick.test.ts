import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "vitest";

import {
  resolveReplayJudgeFallbackEndpointIds,
  runAutoReplayTick,
  selectAlternativeJudgeEndpoint,
} from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 100 addendum 22 — de-conflict the replay judge instead of refusing the capture.
 *
 * Measured basis: `9c3e5548` made the tick's judge resolve from the durable controller assignment, so the
 * `judge_candidate_overlap` guard became reachable for the first time, and its live effect is refusal: the two
 * captures deferred at 2026-09-25T06:39:52Z were rewritten to terminal `refused` at 06:57:53Z with the deferral
 * budget spent (`counters = {"deferrals":4}`), and 30 of the last 64 replay jobs (47%) were planned with the
 * configured controller as their source arm. Refusing half of real replay volume is not acceptable under the
 * operator's "replay everything" directive; substituting the judge is, as long as the substitute is
 * deterministic, config-driven and never an arm of the pair.
 *
 * The named refusal stays exactly where it was for the case that has no substitute: an empty (or fully excluded)
 * fallback list must still defer with `judge_candidate_overlap`.
 */

const configured = ["endpoint-a", "endpoint-b", "endpoint-c", "endpoint-d"];

const tempLedger = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run155-judge-dedup-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-25T07:30:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
};

test("run155 a capture whose own endpoint is the judge is judged by a deterministic alternative", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const requests: Array<Record<string, unknown>> = [];
    const rows: Array<Record<string, unknown>> = [];
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-dedup-1",
          sourceEndpointId: "endpoint-a",
          hasRecordedToolResults: false,
        },
      ],
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      judgeEndpointId: "endpoint-a",
      judgeFallbackEndpointIds: ["endpoint-a", "endpoint-c", "endpoint-b"],
      executor: async (request) => {
        requests.push(request as unknown as Record<string, unknown>);
        return {
          terminal: true,
          branches: (request.candidates as readonly string[]).map((endpointId) => ({
            endpointId,
            outcome: "complete" as const,
          })),
        };
      },
      dispositionSink: (row) => rows.push(row as unknown as Record<string, unknown>),
    });
    // The colliding judge is replaced by the first fallback that is not an arm, so the capture runs.
    expect(result.replayed).toBe(1);
    expect(result.deferred).toBe(0);
    expect(rows.map((row) => row.code)).not.toContain("judge_candidate_overlap");
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ judgeEndpointId: "endpoint-c" });
    // The substitute judge is never one of the pair's arms, and neither is the original judge.
    // The engine rotates the counterfactual by capture, so the arm *set* is the contract, not its order.
    expect([...(requests[0].candidates as string[])].sort()).toEqual(["endpoint-b", "endpoint-d"]);
  } finally {
    cleanup();
  }
});

test("run155 the substitute is chosen by stable list order and skips both the colliding judge and the source arm", () => {
  const chosen = selectAlternativeJudgeEndpoint({
    collidingJudgeEndpointId: "endpoint-a",
    sourceEndpointId: "endpoint-a",
    fallbackEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
  });
  expect(chosen).toBe("endpoint-b");
  // Same input, same answer - no randomness, no rotation.
  expect(
    selectAlternativeJudgeEndpoint({
      collidingJudgeEndpointId: "endpoint-a",
      sourceEndpointId: "endpoint-a",
      fallbackEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
    }),
  ).toBe("endpoint-b");
  // A fallback entry that is the source arm of the pair is never usable as its judge.
  expect(
    selectAlternativeJudgeEndpoint({
      collidingJudgeEndpointId: "endpoint-a",
      sourceEndpointId: "endpoint-b",
      fallbackEndpointIds: ["endpoint-b", "endpoint-c"],
    }),
  ).toBe("endpoint-c");
});

test("run155 a fallback list with no usable alternative keeps the named refusal", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const executed: string[] = [];
    const rows: Array<Record<string, unknown>> = [];
    const result = await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-dedup-2",
          sourceEndpointId: "endpoint-a",
          hasRecordedToolResults: false,
        },
      ],
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      judgeEndpointId: "endpoint-a",
      judgeFallbackEndpointIds: ["endpoint-a"],
      executor: async ({ capture }) => {
        executed.push(capture.captureRef);
        return { terminal: true, branches: [] };
      },
      dispositionSink: (row) => rows.push(row as unknown as Record<string, unknown>),
    });
    expect(executed).toEqual([]);
    expect(result.refused + result.deferred).toBe(1);
    expect(rows[0]).toMatchObject({ captureRef: "req-dedup-2", code: "judge_candidate_overlap" });
  } finally {
    cleanup();
  }
});

test("run155 the fallback list is configured by name and an empty list means today's behaviour", () => {
  expect(resolveReplayJudgeFallbackEndpointIds({})).toBeNull();
  expect(
    resolveReplayJudgeFallbackEndpointIds({ ROLE_MODEL_REPLAY_JUDGE_FALLBACK_ENDPOINT_IDS: "  " }),
  ).toBeNull();
  expect(
    resolveReplayJudgeFallbackEndpointIds({ ROLE_MODEL_REPLAY_JUDGE_FALLBACK_ENDPOINT_IDS: "," }),
  ).toBeNull();
  expect(
    resolveReplayJudgeFallbackEndpointIds({
      ROLE_MODEL_REPLAY_JUDGE_FALLBACK_ENDPOINT_IDS: "endpoint-b, endpoint-c ,endpoint-b,",
    }),
  ).toEqual(["endpoint-b", "endpoint-c"]);
});

test("run155 a capture whose own endpoint is not the judge keeps the arm exclusion unchanged", async () => {
  const { ledger, cleanup } = tempLedger();
  try {
    const requests: Array<Record<string, unknown>> = [];
    await runAutoReplayTick({
      captures: [
        {
          captureRef: "req-dedup-3",
          sourceEndpointId: "endpoint-d",
          hasRecordedToolResults: false,
        },
      ],
      configuredEndpointIds: configured,
      ledger,
      policySet: buildReplayPolicySet(),
      judgeEndpointId: "endpoint-a",
      judgeFallbackEndpointIds: ["endpoint-b"],
      executor: async (request) => {
        requests.push(request as unknown as Record<string, unknown>);
        return { terminal: true, branches: [] };
      },
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].judgeEndpointId).toBe("endpoint-a");
    expect([...(requests[0].candidates as string[])].sort()).toEqual(["endpoint-b", "endpoint-c"]);
  } finally {
    cleanup();
  }
});
