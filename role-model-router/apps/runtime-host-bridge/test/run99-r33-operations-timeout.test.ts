import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRACK_B_OPERATIONS_TIMEOUT_MS,
  resolveTrackBOperationsTimeoutMs,
} from "../src/track-b-operations.js";

/**
 * Run 99 R33 live finding (stage v146, real coding-agent traffic flowing): the eight-second
 * private-operations bound aborted healthy calls on a mature stage root —
 *
 *   `Track B route capture failed track-b-capture-boundary-http-504 reason=private Track B operation
 *    timed out after 8000ms`
 *
 *   `/api/role-model/track-b/replay/status` → `{"running":true,"lastOutcome":"degraded","lastError":
 *   "private Track B operation timed out after 8000ms"}`
 *
 * — and the second starved the auto-replay producer, so freshly captured requests were never
 * replayed. The bound now covers the durable commit path under load and stays operator-tunable.
 */
describe("run99 R33 private operations timeout", () => {
  it("defaults to a bound that covers the durable commit path", () => {
    expect(DEFAULT_TRACK_B_OPERATIONS_TIMEOUT_MS).toBeGreaterThanOrEqual(30_000);
    expect(resolveTrackBOperationsTimeoutMs(undefined)).toBe(DEFAULT_TRACK_B_OPERATIONS_TIMEOUT_MS);
  });

  it("honours an operator override without a rebuild", () => {
    expect(resolveTrackBOperationsTimeoutMs(45_000)).toBe(45_000);
    expect(resolveTrackBOperationsTimeoutMs(1)).toBe(1);
  });

  it("falls back to the default for unusable values", () => {
    for (const value of [null, 0, -5, Number.NaN, 1.5]) {
      expect(resolveTrackBOperationsTimeoutMs(value as number)).toBe(
        DEFAULT_TRACK_B_OPERATIONS_TIMEOUT_MS,
      );
    }
  });
});
