import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test } from "vitest";

import { createTrackBRouteCaptureQueue } from "../src/track-b-capture-queue.js";
import {
  RouteCaptureBoundaryCoolingDownError,
  createTrackBOperations,
  resolveRouteCaptureTimeoutMs,
} from "../src/track-b-operations.js";

/**
 * Run 98 addendum 48 — the capture boundary cooldown must not eat the queue.
 *
 * Measured live (addendum 48): one capture timeout armed a 5-minute "boundary unavailable" window, and during
 * that window every queued capture was *skipped* — which the queue counted as a delivery attempt. With 8
 * attempts allowed, the whole backlog burned out and was dropped (`36 failed / 7 delivered` receipts), so no
 * capture reached replay, evaluation or the judge and the learning counters froze.
 *
 * Acceptance: a cooling-down boundary produces a typed, deferrable outcome (with the retry time) instead of a
 * spent attempt; the first failure costs a short window, escalating to the configured ceiling; and a queue
 * item that was deferred is still pending with an unchanged attempt count.
 */
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  delete process.env.ROLE_MODEL_ROUTE_CAPTURE_COOLDOWN_MS;
  delete process.env.ROLE_MODEL_ROUTE_CAPTURE_TIMEOUT_MS;
});

const tempRoot = (): string => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run98-a48-"));
  roots.push(root);
  return root;
};

const startServer = async (handler: (url: URL) => Promise<{ status: number; body: string }>) => {
  const { createServer } = await import("node:http");
  const server = createServer((request, response) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(chunk as Buffer);
      const result = await handler(new URL(request.url ?? "/", "http://127.0.0.1"));
      response.statusCode = result.status;
      response.setHeader("content-type", "application/json");
      response.end(result.body);
    })();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    endpoint: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
};

test("run98 a48: a cooling-down boundary is a deferrable outcome, not a spent attempt", async () => {
  process.env.ROLE_MODEL_ROUTE_CAPTURE_COOLDOWN_MS = "60000";
  let calls = 0;
  // First call times out (500 after the client bound), the rest answer 200 if they ever arrive.
  const server = await startServer(async () => {
    calls += 1;
    if (calls === 1) return { status: 500, body: JSON.stringify({ error: "boundary busy" }) };
    return { status: 200, body: JSON.stringify({ status: "recorded" }) };
  });
  try {
    const operations = createTrackBOperations({
      statePath: path.join(tempRoot(), "bridge.json"),
      catalog: [],
      operationsEndpoint: server.endpoint,
      operationsTimeoutMs: 5_000,
      runtimeChannel: "stage",
      scope: "scope:a48",
    });
    await expect(
      operations.recordLocalRouteCapture({
        requestId: "req-first",
        routingDecisionId: "d1",
        endpointId: "e1",
      }),
    ).rejects.toBeInstanceOf(Error);

    // Immediately afterwards the boundary is cooling down; the refusal must say *when* it may be retried and
    // must be recognisable by type, so a caller can defer instead of counting a failure.
    const callsBeforeRefusal = calls;
    const coolingDown = await operations
      .recordLocalRouteCapture({
        requestId: "req-second",
        routingDecisionId: "d2",
        endpointId: "e2",
      })
      .then(
        () => null,
        (error: unknown) => error,
      );
    expect(coolingDown).toBeInstanceOf(RouteCaptureBoundaryCoolingDownError);
    const typed = coolingDown as RouteCaptureBoundaryCoolingDownError;
    expect(typed.retryAtMs).toBeGreaterThan(Date.now());
    expect(typed.retryAtMs - Date.now()).toBeLessThanOrEqual(60_000);
    // The first failure is cheap: a short probe window, not the whole configured ceiling.
    expect(typed.retryAtMs - Date.now()).toBeLessThanOrEqual(20_000);
    // The refusal itself did not re-send anything.
    expect(calls).toBe(callsBeforeRefusal);
  } finally {
    await server.close();
  }
});

test("run98 a48: a deferred queue item keeps its attempts and is retried after the window", async () => {
  const queue = createTrackBRouteCaptureQueue({
    filePath: path.join(tempRoot(), "deferred.sqlite"),
    maxAttempts: 3,
  });
  await queue.enqueue({
    requestId: "req-deferred",
    routingDecisionId: "d1",
    endpointId: "e1",
    payload: { requestId: "req-deferred" },
    enqueuedAtMs: 1_000,
  });

  const first = await queue.drain(async () => ({ deferredUntilMs: 61_000 }), { nowMs: 1_000 });
  expect(first.delivered).toBe(0);
  expect(first.failed).toBe(0);
  expect(first.remaining).toBe(1);
  const pendingAfterDefer = await queue.readPending();
  expect(pendingAfterDefer).toHaveLength(1);
  // A deferral is not an attempt: the item is still at zero and scheduled at the boundary's own time.
  expect(pendingAfterDefer[0]?.attempts).toBe(0);
  expect(pendingAfterDefer[0]?.nextAttemptAtMs).toBe(61_000);

  // Before the window it is not eligible; after it, one delivery clears it.
  const beforeWindow = await queue.drain(async () => ({ status: "recorded" }), { nowMs: 60_999 });
  expect(beforeWindow.delivered).toBe(0);
  const afterWindow = await queue.drain(async () => ({ status: "recorded" }), { nowMs: 61_000 });
  expect(afterWindow.delivered).toBe(1);
  expect(await queue.readPending()).toHaveLength(0);
});

/**
 * Run 98 addendum 48 (live v285): the capture bound is the knob that decides whether durable evidence is
 * recorded. Branch captures completed at 22.6 s / 24.6 s / 26.0 s while the ceiling was 30 s, and only the
 * branch writes crossed it. The ceiling is therefore configurable up to a still-bounded maximum; anything
 * outside the range falls back to the documented default rather than disabling the bound.
 */
test("run98 a48: the configured capture bound is honoured inside a bounded range", () => {
  // Run 100 addendum `replay-dispatch-envelope-repair.addendum-03` S2: the default moved from 10 s to the
  // operator's 600 s decision (this client writes the branch evidence every replay depends on) and the band
  // was widened with it; the "outside the range falls back to the default" behaviour is unchanged.
  expect(resolveRouteCaptureTimeoutMs(undefined)).toBe(600_000);
  expect(resolveRouteCaptureTimeoutMs("")).toBe(600_000);
  expect(resolveRouteCaptureTimeoutMs("junk")).toBe(600_000);
  expect(resolveRouteCaptureTimeoutMs("99")).toBe(600_000);
  expect(resolveRouteCaptureTimeoutMs("100")).toBe(100);
  expect(resolveRouteCaptureTimeoutMs("30000")).toBe(30_000);
  expect(resolveRouteCaptureTimeoutMs("120000")).toBe(120_000);
  expect(resolveRouteCaptureTimeoutMs("180000")).toBe(180_000);
  expect(resolveRouteCaptureTimeoutMs("180001")).toBe(180_001);
  expect(resolveRouteCaptureTimeoutMs("900000")).toBe(900_000);
  expect(resolveRouteCaptureTimeoutMs("900001")).toBe(600_000);
  expect(resolveRouteCaptureTimeoutMs("999999999")).toBe(600_000);
});
