import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  classifyReplayExecutorFailure,
  retryableReplayRefusalCodes,
  runAutoReplayTick,
} from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";
import { REPLAY_REFUSAL_CODES } from "../src/track-b-replay-policy.js";

/**
 * Run 100 addendum 16 item 8a, measured on the live stage store 2026-09-25. Two 409s the executor surfaces
 * were arriving as the generic `replay_failed`, which names nothing:
 *
 * - `route capture skipped: boundary unavailable until <ts>` — 9 captures in flight, newest 06:46:11Z, and
 *   the tick's behaviour (defer, retry next tick) is already correct. The class only had to be named.
 * - `route capture idempotency key was reused with different immutable bytes` — deterministic by
 *   construction (24 refused / 3 deferred lifetime), so it was spending the deferral budget and then
 *   landing in `replay_failed` wearing a code that says nothing. Named terminal.
 *
 * Everything else keeps the generic code and the previous deferral behaviour.
 */

test("run154 item 8a a boundary-unavailable skip is named and stays retryable", () => {
  const classification = classifyReplayExecutorFailure(
    'replay endpoint HTTP 409: {"error":"route capture skipped: boundary unavailable until 2026-09-25T06:50:00.000Z"}',
  );
  expect(classification).toEqual({ code: "replay_boundary_unavailable", terminal: false });
  expect(retryableReplayRefusalCodes().has("replay_boundary_unavailable")).toBe(true);
  expect(REPLAY_REFUSAL_CODES).toContain("replay_boundary_unavailable");
});

test("run154 item 8a a reused capture idempotency key is named terminal", () => {
  const classification = classifyReplayExecutorFailure(
    'replay endpoint HTTP 409: {"error":"route capture idempotency key was reused with different immutable bytes"}',
  );
  expect(classification).toEqual({ code: "replay_capture_idempotency_conflict", terminal: true });
  expect(retryableReplayRefusalCodes().has("replay_capture_idempotency_conflict")).toBe(false);
  expect(REPLAY_REFUSAL_CODES).toContain("replay_capture_idempotency_conflict");
});

test("run154 item 8a every other executor failure keeps the generic retryable code", () => {
  expect(
    classifyReplayExecutorFailure("private Track B operation timed out after 10000ms"),
  ).toEqual({
    code: "replay_failed",
    terminal: false,
  });
  expect(classifyReplayExecutorFailure("some unmapped boundary error")).toEqual({
    code: "replay_failed",
    terminal: false,
  });
});

/**
 * Run 100 addendum 24 §3: the census left two more classes live and unnamed — `awaiting replay is missing
 * its durable evaluation receipt` (five of the last six hours) and `durable replay branch append has no host
 * dispatch receipt` (08:13:28Z). Both are *recoverable* shapes rather than terminal ones: the handoff-recovery
 * pass rebuilds a missing evaluation from durable evidence for exactly a job in `awaiting_evaluation` with no
 * evaluation id (`isRecoverableHandoff`), and the append-recovery leg rebuilds the branch from the dispatch's
 * persisted `providerResultRef`. They were spending the deferral budget under a code that named neither.
 */
test("run154 item 8a the recoverable handoff shapes are named and stay deferrable", () => {
  const missingReceipt = classifyReplayExecutorFailure(
    "awaiting replay is missing its durable evaluation receipt",
  );
  expect(missingReceipt).toEqual({ code: "replay_evaluation_receipt_missing", terminal: false });
  expect(retryableReplayRefusalCodes().has("replay_evaluation_receipt_missing")).toBe(true);
  expect(REPLAY_REFUSAL_CODES).toContain("replay_evaluation_receipt_missing");

  const missingAppend = classifyReplayExecutorFailure(
    "durable replay branch append has no host dispatch receipt",
  );
  expect(missingAppend).toEqual({ code: "replay_branch_append_unavailable", terminal: false });
  expect(retryableReplayRefusalCodes().has("replay_branch_append_unavailable")).toBe(true);
  expect(REPLAY_REFUSAL_CODES).toContain("replay_branch_append_unavailable");
});

/**
 * The live rows were emitted by the tick's *result* path, not by its catch: the boundary answers the
 * executor with a non-terminal execution carrying the 409 text in `failureDetail`. These two tests are
 * therefore the ones that mirror the store — before the change both rows said `replay_failed`.
 */
const tempLedger = () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run154-item8a-"));
  return {
    ledger: createReplayLedger({ filePath: path.join(dir, "ledger.json") }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
};

const tickWithFailureDetail = async (failureDetail: string) => {
  const { ledger, cleanup } = tempLedger();
  try {
    const rows: Array<Record<string, unknown>> = [];
    const result = await runAutoReplayTick({
      captures: [
        { captureRef: "req-1", sourceEndpointId: "endpoint-a", hasRecordedToolResults: false },
      ],
      configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async () => ({ terminal: false, branches: [], failureDetail }),
      dispositionSink: (row) => rows.push(row as unknown as Record<string, unknown>),
    });
    return { rows, result };
  } finally {
    cleanup();
  }
};

test("run154 item 8a a boundary-unavailable execution result is named, still deferred", async () => {
  const { rows, result } = await tickWithFailureDetail(
    'replay endpoint HTTP 409: {"error":"route capture skipped: boundary unavailable until 2026-09-25T07:20:00.000Z"}',
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    captureRef: "req-1",
    outcome: "deferred",
    code: "replay_boundary_unavailable",
  });
  expect(result.deferred).toBe(1);
  expect(result.refused).toBe(0);
});

test("run154 item 8a a reused-idempotency execution result is named terminal", async () => {
  const { rows, result } = await tickWithFailureDetail(
    'replay endpoint HTTP 409: {"error":"route capture idempotency key was reused with different immutable bytes"}',
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    captureRef: "req-1",
    outcome: "refused",
    code: "replay_capture_idempotency_conflict",
  });
  expect(result.refused).toBe(1);
  expect(result.deferred).toBe(0);
});
