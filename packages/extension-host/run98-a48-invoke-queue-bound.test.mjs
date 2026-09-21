import assert from "node:assert/strict";
import test from "node:test";

import { ExtensionHost } from "./index.mjs";

/**
 * Run 98 addendum 48 (live v288: `shadow-pipeline register-deterministic-scorer` then silence for minutes).
 *
 * The per-invoke timeout was armed inside `execute()`, i.e. only once the call actually started. A caller whose
 * extension was saturated (`maxConcurrent` reached) or whose in-flight calls never answered simply waited in
 * `#queue` **forever** — no timeout, no error, no receipt. The pipeline sat on the first
 * `evaluation:register-scorer` invoke and the evaluation counters never moved.
 *
 * Acceptance: a queued caller is rejected with a bounded, named error instead of hanging.
 */
const envelope = (requestId, capability = "fixture:work") => ({
  requestId,
  protocolVersion: "1.1.0",
  authorizationEpoch: 1,
  channel: "stage",
  scope: "run98-a48",
  capability,
  payload: {},
});

test("run98 a48: a caller queued behind a saturated extension is rejected, not left pending", async () => {
  const host = new ExtensionHost({
    protocolVersion: "1.1.0",
    authorizationEpoch: 1,
    maxConcurrent: 1,
    maxQueued: 8,
    timeoutMs: 5_000,
    queueTimeoutMs: 50,
  });
  let release;
  host.register(
    {
      id: "fixture",
      version: "1.0.0",
      protocolVersion: "1.1.0",
      capabilities: ["fixture:work"],
    },
    async () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );

  // The first call occupies the only slot and never answers on its own.
  const first = host.invoke("fixture", envelope("req-1"));
  await new Promise((resolve) => setTimeout(resolve, 10));

  // The second call cannot start, so it must fail on the queue bound rather than wait for the first.
  const started = Date.now();
  await assert.rejects(
    host.invoke("fixture", envelope("req-2")),
    /extension fixture failed: queue timeout after 50ms \(fixture:work\)/,
  );
  assert.ok(Date.now() - started < 1_000, "the queue bound must fire promptly");

  release?.({ ok: true });
  await first;
  assert.equal(host.health().queued, 0, "the timed-out caller must leave the queue");
});
