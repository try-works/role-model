import { describe, expect, test } from "vitest";

import { resolveLiveAttemptTimeoutMs } from "../src/index.js";

/**
 * Run 101 addendum 16 - the live per-attempt bound resolved to five seconds whenever the operator had not set
 * `ROLE_MODEL_LIVE_ATTEMPT_TIMEOUT_MS`, which is the default state.
 *
 * Measured live on `:3457` (stage RC `11eaf2b19492`, 2026-09-27T17:0xZ): every response that needed more than
 * ~5.0 s was cut at 5.00-5.04 s. A streaming request returned HTTP 200 and then ended mid-sentence with no
 * `finish_reason` and no `[DONE]` (pi reports "Stream ended without finish_reason"); a non-streaming request was
 * answered `400 execution_failed` with `"The operation was aborted due to timeout"` recorded under the fallback
 * endpoint id `routing.failed.pre-execution`.
 *
 * The resolver's `?? ""` makes an unset variable `Number("") === 0`, which *is* a safe integer, so the documented
 * 2-minute default never applied and the 5 s floor became the effective bound for every live attempt.
 */
describe("run 101 addendum 16: the live per-attempt bound defaults to two minutes when it is not configured", () => {
  test("an unset variable resolves to the documented two-minute default", () => {
    expect(resolveLiveAttemptTimeoutMs({})).toBe(120_000);
  });

  test("an empty or whitespace-only variable resolves to the default", () => {
    expect(resolveLiveAttemptTimeoutMs({ ROLE_MODEL_LIVE_ATTEMPT_TIMEOUT_MS: "" })).toBe(120_000);
    expect(resolveLiveAttemptTimeoutMs({ ROLE_MODEL_LIVE_ATTEMPT_TIMEOUT_MS: "   " })).toBe(
      120_000,
    );
  });

  test("a zero or negative value resolves to the default rather than the five-second floor", () => {
    expect(resolveLiveAttemptTimeoutMs({ ROLE_MODEL_LIVE_ATTEMPT_TIMEOUT_MS: "0" })).toBe(120_000);
    expect(resolveLiveAttemptTimeoutMs({ ROLE_MODEL_LIVE_ATTEMPT_TIMEOUT_MS: "-1" })).toBe(120_000);
  });

  test("a non-numeric value resolves to the default", () => {
    expect(resolveLiveAttemptTimeoutMs({ ROLE_MODEL_LIVE_ATTEMPT_TIMEOUT_MS: "soon" })).toBe(
      120_000,
    );
  });

  test("an explicit value is honoured and clamped to the documented five-second to ten-minute bounds", () => {
    expect(resolveLiveAttemptTimeoutMs({ ROLE_MODEL_LIVE_ATTEMPT_TIMEOUT_MS: "30000" })).toBe(
      30_000,
    );
    expect(resolveLiveAttemptTimeoutMs({ ROLE_MODEL_LIVE_ATTEMPT_TIMEOUT_MS: "1000" })).toBe(5_000);
    expect(resolveLiveAttemptTimeoutMs({ ROLE_MODEL_LIVE_ATTEMPT_TIMEOUT_MS: "900000" })).toBe(
      600_000,
    );
  });
});
