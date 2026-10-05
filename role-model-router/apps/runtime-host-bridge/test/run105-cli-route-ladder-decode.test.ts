import { describe, expect, test } from "vitest";

import { decodeRouteLadderRow } from "../src/track-b-auto-replay-runtime.js";

/**
 * Run 105 Phase 3.5 CLI-compile repair (R8/R9 readback typing).
 *
 * The loop's `readRouteLadder` provider must return a DECODED RouteLadderRow, not `unknown`: the
 * tick reads `routeLadder.rungs` and `routeLadder.rolledBack.on` directly, so an untyped value
 * makes the contract unprovable at the call site (the original TS2322). This decoder is the single
 * boundary where a store answer - which is JSON from another process - becomes that typed row.
 *
 * It decodes only what the tick consumes and NEVER throws: a malformed or absent answer is `null`
 * ("no ladder known"), which is exactly the fail-closed path the tick already handles.
 */
describe("run105 CLI compile repair: RouteLadderRow decoding", () => {
  test("decodes the store's ladder answer into the typed row the tick consumes", () => {
    const decoded = decodeRouteLadderRow({
      contract: "RouteLadderPackV1",
      roleId: "role:code-review",
      taskTypeId: "task:code-review",
      rungs: [
        { endpointId: "endpoint:a", rank: 1, status: "available" },
        { endpointId: "endpoint:b", rank: 2, status: "unavailable" },
      ],
      completeness: { admitted: 1, configured: 2 },
      nextEligibleAtMs: 1_800_000_000_000,
      version: 3,
      rolledBack: { on: true, reason: "operator_rollback", atMs: 42 },
    });

    expect(decoded).not.toBeNull();
    // The rungs survive with their status, so the tick's walk can skip an unavailable rung.
    expect(decoded?.rungs).toEqual([
      { endpointId: "endpoint:a", rank: 1, status: "available" },
      { endpointId: "endpoint:b", rank: 2, status: "unavailable" },
    ]);
    expect(decoded?.completeness).toEqual({ admitted: 1, configured: 2 });
    expect(decoded?.nextEligibleAtMs).toBe(1_800_000_000_000);
    expect(decoded?.version).toBe(3);
    expect(decoded?.rolledBack).toEqual({ on: true, reason: "operator_rollback", atMs: 42 });
  });

  test("a ladder without a rollback flag decodes to OFF rather than undefined", () => {
    const decoded = decodeRouteLadderRow({
      rungs: [],
      completeness: { admitted: 0, configured: 2 },
      version: 1,
    });
    expect(decoded?.rolledBack).toEqual({ on: false, reason: null, atMs: null });
    expect(decoded?.nextEligibleAtMs).toBeNull();
  });

  test("a wrong-typed value is refused, not coerced (a malformed rung drops the row's rungs)", () => {
    // A status outside the contract must not be accepted as if it were 'available'.
    const decoded = decodeRouteLadderRow({
      rungs: [{ endpointId: "endpoint:a", rank: 1, status: "removed" }],
      completeness: { admitted: 1, configured: 1 },
    });
    expect(decoded?.rungs).toEqual([]);
  });

  test("a non-object answer is null (no ladder known), never a throw", () => {
    for (const malformed of [null, undefined, "ladder", 42, []]) {
      expect(decodeRouteLadderRow(malformed)).toBeNull();
    }
  });
});
