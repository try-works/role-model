import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { createTrackBRouteCaptureQueue } from "../src/track-b-capture-queue.js";

// Run 98 addendum 40 (L2): a live request must not wait on the Track B operations boundary. The
// capture is written to a durable queue in one bounded statement and delivered by a background drain.
async function makeQueue(options?: { readonly maxPayloadBytes?: number }) {
  const root = await mkdtemp(path.join(os.tmpdir(), "run98-a40-capture-queue-"));
  return createTrackBRouteCaptureQueue({
    filePath: path.join(root, "capture-queue.sqlite"),
    ...options,
  });
}

const capture = (requestId: string, payload: Record<string, unknown> = { messages: [] }) =>
  ({
    requestId,
    routingDecisionId: `decision-${requestId}`,
    endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
    payload,
  }) as const;

test("a40 L2: an enqueued capture survives a restart of the runtime process", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run98-a40-capture-durable-"));
  const filePath = path.join(root, "capture-queue.sqlite");
  const first = createTrackBRouteCaptureQueue({ filePath });
  await first.enqueue(capture("req-a40-1", { messages: [{ role: "user", content: "hi" }] }));

  const second = createTrackBRouteCaptureQueue({ filePath });
  const pending = await second.readPending();
  expect(pending).toHaveLength(1);
  expect(pending[0]?.requestId).toBe("req-a40-1");
  expect(pending[0]?.payload).toEqual({ messages: [{ role: "user", content: "hi" }] });
});

test("a40 L2: the drain delivers queued captures in order and records a receipt for each", async () => {
  const queue = await makeQueue();
  for (const requestId of ["req-a40-b", "req-a40-a"]) {
    await queue.enqueue({ ...capture(requestId), enqueuedAtMs: requestId.endsWith("a") ? 1 : 2 });
  }

  const delivered: string[] = [];
  const summary = await queue.drain(async (item) => {
    delivered.push(item.requestId);
    return { status: "captured" };
  });

  expect(delivered).toEqual(["req-a40-a", "req-a40-b"]);
  expect(summary).toMatchObject({ delivered: 2, failed: 0 });
  expect(await queue.readPending()).toHaveLength(0);
  const receipts = await queue.readReceipts();
  expect(receipts.map((receipt) => receipt.requestId).sort()).toEqual([
    "req-a40-a",
    "req-a40-b",
  ]);
});

test("a40 L2: a boundary failure keeps the capture for retry instead of losing it", async () => {
  const queue = await makeQueue();
  await queue.enqueue(capture("req-a40-retry"));

  const failed = await queue.drain(async () => {
    throw new Error("private Track B operation timed out after 10000ms");
  });
  expect(failed).toMatchObject({ delivered: 0, failed: 1 });

  const pending = await queue.readPending();
  expect(pending).toHaveLength(1);
  expect(pending[0]?.attempts).toBe(1);
  expect(pending[0]?.lastError).toContain("timed out");

  // A later drain after the backoff window delivers it.
  const delivered = await queue.drain(
    async () => ({ status: "captured" }),
    { nowMs: Date.now() + 60 * 60 * 1000 },
  );
  expect(delivered).toMatchObject({ delivered: 1, failed: 0 });
  expect(await queue.readPending()).toHaveLength(0);
});

test("a40 L2: a capture larger than the boundary budget fails closed at enqueue", async () => {
  const queue = await makeQueue({ maxPayloadBytes: 1_024 });
  await expect(
    queue.enqueue(capture("req-a40-large", { blob: "x".repeat(2_048) })),
  ).rejects.toThrow(/exceeds/i);
  expect(await queue.readPending()).toHaveLength(0);
});

// v1.1 guidance 05 §"Track B maintenance job state machines": every job carries bounded attempts and a
// deadline and ends in a typed state (queued -> running -> succeeded | partial | failed | expired),
// never in an unbounded retry.
test("a40 L2: a capture that keeps failing reaches a typed terminal disposition", async () => {
  const queue = await makeQueue({ maxAttempts: 2 });
  await queue.enqueue(capture("req-a40-exhausted"));

  let nowMs = Date.now();
  const attempt = () =>
    queue.drain(
      async () => {
        throw new Error("boundary down");
      },
      { nowMs },
    );

  expect(await attempt()).toMatchObject({ delivered: 0, failed: 1 });
  nowMs += 60_000;
  expect(await attempt()).toMatchObject({ delivered: 0, failed: 1 });
  expect(await queue.readPending()).toHaveLength(0);

  const terminal = await queue.readReceipts();
  expect(terminal[0]?.result).toMatchObject({ status: "failed", attempts: 2 });
  expect(String((terminal[0]?.result as { lastError?: string }).lastError)).toContain(
    "boundary down",
  );

  // A terminal disposition never consumes another attempt.
  nowMs += 60_000;
  expect(await attempt()).toMatchObject({ delivered: 0, failed: 0 });
});

test("a40 L2: a capture past its deadline is expired instead of retried", async () => {
  const queue = await makeQueue({ maxAttempts: 8, deadlineMs: 1_000 });
  await queue.enqueue(capture("req-a40-expired"));

  const summary = await queue.drain(
    async () => {
      throw new Error("boundary down");
    },
    { nowMs: Date.now() + 5_000 },
  );
  expect(summary).toMatchObject({ delivered: 0, failed: 1 });
  expect((await queue.readReceipts())[0]?.result).toMatchObject({ status: "expired" });
  expect(await queue.readPending()).toHaveLength(0);
});

test("a40 L2: a delivered capture records a typed delivered receipt", async () => {
  const queue = await makeQueue();
  await queue.enqueue(capture("req-a40-delivered"));
  await queue.drain(async () => ({ status: "captured", artifactId: "artifact-1" }));

  expect((await queue.readReceipts())[0]?.result).toMatchObject({
    status: "delivered",
    result: { status: "captured", artifactId: "artifact-1" },
  });
});
