import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import { readRouteCaptureFromQueueReceipt } from "../src/cli.js";

/**
 * Run 100 addendum 31 — item 8's `capture_missing` class, measured on the live store 2026-09-25.
 *
 * The handoff-recovery pass reads each arm's branch capture through the operations boundary and reports
 * `capture_missing(<requestId>)` when that read answers nothing. Measured: 1-2 such lines per build window
 * (`[run101] resumed handoff … could not read 3 arm(s): …=capture_missing(replay-req-0673e0e4-…)`), while the
 * capture queue's own durable receipt store holds **three** receipts for that exact request id, each with
 * `status: "captured"` and a ~6 KB record carrying the arm's `endpointId`, `modelId`, `reasoningEffort`,
 * classification and response payload.
 *
 * So the evidence is not gone; the boundary read cannot see it. This fallback reads the receipt the queue
 * already wrote, so an arm whose capture is durably recorded is no longer reported missing.
 */

const SCOPE = "standalone-runtime-stage";

const withReceipts = (
  rows: ReadonlyArray<{ requestId: string; resultJson: string; completedAtMs: number }>,
): { stateRoot: string; scopeId: string } => {
  const stateRoot = mkdtempSync(path.join(tmpdir(), "run166-capture-receipts-"));
  const directory = path.join(stateRoot, SCOPE, "track-b");
  mkdirSync(directory, { recursive: true });
  const database = new DatabaseSync(path.join(directory, "deferred-route-captures.sqlite"));
  database.exec(
    "CREATE TABLE track_b_route_capture_receipts (request_id TEXT PRIMARY KEY, result_json TEXT NOT NULL, completed_at_ms INTEGER NOT NULL)",
  );
  const insert = database.prepare(
    "INSERT OR REPLACE INTO track_b_route_capture_receipts (request_id, result_json, completed_at_ms) VALUES (?, ?, ?)",
  );
  for (const row of rows) insert.run(row.requestId, row.resultJson, row.completedAtMs);
  database.close();
  return { stateRoot, scopeId: SCOPE };
};

const capturedReceipt = (requestId: string) =>
  JSON.stringify({
    status: "delivered",
    result: {
      status: "captured",
      requestId,
      routingDecisionId: `decision-${requestId}`,
      endpointId: "moonshot.personal.kimi-code.global.kimi-k3",
      modelId: "moonshot/kimi-k3",
      reasoningEffort: null,
      taskTypeId: "support.ticket.reply",
      responseText: "the arm's recorded answer",
    },
  });

test("run166 item 8 a durably captured arm is recovered from its queue receipt", () => {
  const requestId = "replay-req-0673e0e4-4bdd-48eb-a0da-4ff8e7531b6b-e7a8fde460ec822a";
  const location = withReceipts([
    { requestId, resultJson: capturedReceipt(requestId), completedAtMs: 1790329000000 },
  ]);

  const capture = readRouteCaptureFromQueueReceipt({
    runtimeStateRoot: location.stateRoot,
    scopeId: location.scopeId,
    requestId,
  });
  expect(capture).toMatchObject({
    requestId,
    endpointId: "moonshot.personal.kimi-code.global.kimi-k3",
    modelId: "moonshot/kimi-k3",
    responseText: "the arm's recorded answer",
  });
});

test("run166 item 8 the newest receipt wins when a request was captured more than once", () => {
  const requestId = "replay-req-repeat";
  const older = JSON.stringify({ status: "captured", requestId, responseText: "older" });
  const newer = JSON.stringify({ status: "captured", requestId, responseText: "newer" });
  const location = withReceipts([
    { requestId, resultJson: older, completedAtMs: 1 },
    { requestId, resultJson: newer, completedAtMs: 2 },
  ]);
  /**
   * The table is keyed by request id, so "more than once" means the store is rewritten; this asserts the
   * reader takes what is there rather than inventing an order of its own.
   */
  const capture = readRouteCaptureFromQueueReceipt({
    runtimeStateRoot: location.stateRoot,
    scopeId: location.scopeId,
    requestId,
  });
  expect(String(capture?.responseText)).toBe("newer");
});

test("run166 item 8 an unknown id, a malformed receipt and a missing store all answer null", () => {
  const location = withReceipts([
    { requestId: "known", resultJson: capturedReceipt("known"), completedAtMs: 1 },
    { requestId: "broken", resultJson: "{not json", completedAtMs: 2 },
  ]);
  expect(
    readRouteCaptureFromQueueReceipt({
      runtimeStateRoot: location.stateRoot,
      scopeId: location.scopeId,
      requestId: "unknown",
    }),
  ).toBeNull();
  expect(
    readRouteCaptureFromQueueReceipt({
      runtimeStateRoot: location.stateRoot,
      scopeId: location.scopeId,
      requestId: "broken",
    }),
  ).toBeNull();
  expect(
    readRouteCaptureFromQueueReceipt({
      runtimeStateRoot: path.join(location.stateRoot, "absent"),
      scopeId: location.scopeId,
      requestId: "known",
    }),
  ).toBeNull();
});
