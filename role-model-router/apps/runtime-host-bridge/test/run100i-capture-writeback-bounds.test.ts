import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  createTrackBRouteCaptureQueue,
  resolveDeferredCaptureMaxBytes,
} from "../src/track-b-capture-queue.js";
import { resolveRouteCaptureTimeoutMs } from "../src/track-b-operations.js";

/**
 * Run 100 addendum `replay-dispatch-envelope-repair.addendum-03` S2 (operator report 2026-09-23: "replays
 * are stuck and not reaching eval or learner stage").
 *
 * The branch evidence for each counterfactual arm is written back through the route-capture client, bounded
 * by its own 10 s default - the operator's 600 s decision covered the private-operations boundary and the
 * replay deadline but not this client, so a heavy capture's write-back was cut off
 * (`private Track B operation timed out after 10000ms`) and the paid arm discarded. The deferred-capture
 * queue's 512 KiB payload budget has the same effect one step earlier: real dsh captures are 750-800 KB and
 * were refused before they could be replayed at all.
 */

test("run100i the write-back bound carries the operator's 600 s decision", () => {
  expect(resolveRouteCaptureTimeoutMs(undefined)).toBe(600_000);
  expect(resolveRouteCaptureTimeoutMs("")).toBe(600_000);
  expect(resolveRouteCaptureTimeoutMs("30000")).toBe(30_000);
  expect(resolveRouteCaptureTimeoutMs("900000")).toBe(900_000);
  // Out-of-band values fall back to the default rather than silently disabling the bound.
  expect(resolveRouteCaptureTimeoutMs("999999999")).toBe(600_000);
  expect(resolveRouteCaptureTimeoutMs("99")).toBe(600_000);
});

test("run100i a real dsh-sized capture is queued instead of refused", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run100i-writeback-"));
  try {
    expect(resolveDeferredCaptureMaxBytes(undefined)).toBe(20 * 1024 * 1024);
    expect(resolveDeferredCaptureMaxBytes("1048576")).toBe(1_048_576);
    expect(resolveDeferredCaptureMaxBytes("999999999")).toBe(20 * 1024 * 1024);

    const queue = createTrackBRouteCaptureQueue({
      filePath: path.join(dir, "deferred.sqlite"),
      maxPayloadBytes: resolveDeferredCaptureMaxBytes(undefined),
    });
    // 800 KB: the observed live dsh capture size that the old 512 KiB budget refused.
    const item = await queue.enqueue({
      requestId: "req-800kb",
      routingDecisionId: "decision-1",
      endpointId: "endpoint-a",
      payload: { transcript: "x".repeat(800 * 1024) },
    });
    expect(item.status).toBe("enqueued");
    const pending = await queue.readPending();
    expect(pending.map((row) => row.requestId)).toContain("req-800kb");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
