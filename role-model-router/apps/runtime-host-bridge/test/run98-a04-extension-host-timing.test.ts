import { describe, expect, test } from "vitest";

import { extensionHostTiming } from "../src/track-b-runtime.js";

/**
 * Run 98 addendum 04 (live finding, stage v180, 2026-09-16).
 *
 * The bridge builds its own extension host for the replay/evaluation path and never passed
 * `timeoutMs`, so it inherited the extension host's 1-second default: every evaluation slower than a
 * second was reported as `extension evaluation-core failed: timeout` and the replay deferred, leaving
 * evaluation jobs stuck in `scoring`. The timing profile is shared and env-tunable, and this pins it.
 */
describe("run98 a04 extension host timing", () => {
  test("defaults to an evaluation-grade invoke budget", () => {
    expect(extensionHostTiming({})).toEqual({
      timeoutMs: 60_000,
      startupTimeoutMs: 30_000,
      maxRestarts: 3,
      restartBackoffMs: 10,
      restartCooldownMs: 60_000,
    });
  });

  test("accepts bounded operator overrides expressed as strings", () => {
    expect(
      extensionHostTiming({
        ROLE_MODEL_EXTENSION_INVOKE_TIMEOUT_MS: "180000",
        ROLE_MODEL_EXTENSION_STARTUP_TIMEOUT_MS: "45000",
        ROLE_MODEL_EXTENSION_MAX_RESTARTS: "5",
        ROLE_MODEL_EXTENSION_RESTART_BACKOFF_MS: "25",
        ROLE_MODEL_EXTENSION_RESTART_COOLDOWN_MS: "120000",
      }),
    ).toEqual({
      timeoutMs: 180_000,
      startupTimeoutMs: 45_000,
      maxRestarts: 5,
      restartBackoffMs: 25,
      restartCooldownMs: 120_000,
    });
  });

  test("falls back to the bounded default for malformed or out-of-range values", () => {
    const timing = extensionHostTiming({
      ROLE_MODEL_EXTENSION_INVOKE_TIMEOUT_MS: "nope",
      ROLE_MODEL_EXTENSION_STARTUP_TIMEOUT_MS: "-1",
      ROLE_MODEL_EXTENSION_MAX_RESTARTS: "1000",
      ROLE_MODEL_EXTENSION_RESTART_BACKOFF_MS: "9999999",
      ROLE_MODEL_EXTENSION_RESTART_COOLDOWN_MS: "abc",
    });
    expect(timing).toEqual({
      timeoutMs: 60_000,
      startupTimeoutMs: 30_000,
      maxRestarts: 3,
      restartBackoffMs: 10,
      restartCooldownMs: 60_000,
    });
    // Zero is meaningful for the breaker knobs and stays in bounds.
    expect(extensionHostTiming({ ROLE_MODEL_EXTENSION_MAX_RESTARTS: "0" }).maxRestarts).toBe(0);
    expect(
      extensionHostTiming({ ROLE_MODEL_EXTENSION_RESTART_COOLDOWN_MS: "0" }).restartCooldownMs,
    ).toBe(0);
  });
});
