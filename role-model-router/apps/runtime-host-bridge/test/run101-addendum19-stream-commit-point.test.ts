import { describe, expect, test } from "vitest";

import { hasSubstantiveStreamDelta } from "../src/index.js";

/**
 * Run 101 addendum 19 - the ingress committed the downstream SSE stream on the first metadata-bearing chunk, which
 * is a provider's role-only opening delta, not content.
 *
 * Result on `:3457` (2026-09-27 ~18:2x): every failure in the last 50 requests had zero content deltas, and pi
 * still reported "Stream ended without finish_reason" about one request in ten - the client held an open 200 stream
 * that ended before any answer arrived, and `streamedChunkCount > 0` forbade the retry/failover the attempt still
 * deserved. The commit point is now the first chunk that carries the answer.
 */
describe("run 101 addendum 19: the stream commits on the first substantive delta", () => {
  test("a role-only opening delta is not substantive", () => {
    expect(
      hasSubstantiveStreamDelta({
        choices: [{ index: 0, delta: { role: "assistant", content: null }, finish_reason: null }],
      }),
    ).toBe(false);
  });

  test("a reasoning-only delta is not substantive", () => {
    expect(
      hasSubstantiveStreamDelta({
        choices: [
          {
            index: 0,
            delta: { content: null, reasoning_content: "The user wants" },
            finish_reason: null,
          },
        ],
      }),
    ).toBe(false);
  });

  test("an empty or finish-only chunk is not substantive", () => {
    expect(
      hasSubstantiveStreamDelta({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }),
    ).toBe(false);
    expect(hasSubstantiveStreamDelta({})).toBe(false);
    expect(hasSubstantiveStreamDelta(null)).toBe(false);
  });

  test("content and tool calls are substantive", () => {
    expect(hasSubstantiveStreamDelta({ choices: [{ index: 0, delta: { content: "ok" } }] })).toBe(
      true,
    );
    expect(
      hasSubstantiveStreamDelta({
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index: 0,
                  id: "call_1",
                  type: "function",
                  function: { name: "list", arguments: "" },
                },
              ],
            },
          },
        ],
      }),
    ).toBe(true);
  });
});
