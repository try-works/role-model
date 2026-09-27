import { describe, expect, test } from "vitest";

import { hasSubstantiveStreamDelta } from "../src/index.js";

/**
 * Run 101 addendum 20 - the retry/reroute gate keyed on every chunk the executor emitted, not on what the client
 * actually held.
 *
 * Measured on RC `247f383a` (2026-09-27 ~19:4x): six `terminated` failures in a row carried
 * `streamTextDeltaCount: 0`, `retryCount: 0`, `rerouteCount: 0` and ~75 s latency, and a six-request probe batch
 * reproduced 2/6 of them. Addendum 19 had already deferred the ingress write until the first substantive delta, so
 * nothing had reached the client - but the bridge's own counter still incremented on the executor's role-only
 * opening chunk, which closed the gate before it could retry or fail over.
 *
 * The counter now uses the same predicate as the ingress commit point, so the gate opens exactly when the client
 * has received something that cannot be replayed.
 */
describe("run 101 addendum 20: only substantive chunks close the retry/reroute gate", () => {
  test("a role-only opening chunk does not count as delivered content", () => {
    expect(
      hasSubstantiveStreamDelta({
        choices: [{ index: 0, delta: { role: "assistant", content: null }, finish_reason: null }],
      }),
    ).toBe(false);
  });

  test("a reasoning-only chunk does not count as delivered content", () => {
    expect(
      hasSubstantiveStreamDelta({
        choices: [{ index: 0, delta: { content: null, reasoning_content: "thinking" } }],
      }),
    ).toBe(false);
  });

  test("first content closes the gate; tool calls close it too", () => {
    expect(
      hasSubstantiveStreamDelta({ choices: [{ index: 0, delta: { content: "Hello" } }] }),
    ).toBe(true);
    expect(
      hasSubstantiveStreamDelta({
        choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: "c1", type: "function" }] } }],
      }),
    ).toBe(true);
  });
});
