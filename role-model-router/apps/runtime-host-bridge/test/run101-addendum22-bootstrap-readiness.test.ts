import { describe, expect, test } from "vitest";

import { isRuntimeBootstrapBlock } from "../src/index.js";

/**
 * Run 101 addendum 22 - a degraded-but-serving bootstrap was reported as a runtime-level failure.
 *
 * Measured on RC `6f769013` (2026-09-27 ~20:3x): the boot probed three endpoints, two answered and
 * `deepseek-v4-flash-max` timed out; `/healthz` answered 503 / `degraded` / `ready: false` while the chat path
 * served normally. The rule the run documented in addendum 11 says a partially degraded remote-health stage is an
 * endpoint-level fact; only "no usable endpoint at all" (or a blocked bootstrap) is a runtime-level failure.
 */
function state(
  status: string,
  remoteHealth?: { readonly status: string; readonly healthy?: unknown },
) {
  return {
    status,
    stages: [
      ...(remoteHealth
        ? [
            {
              stageId: "remote-health",
              status: remoteHealth.status,
              ...(remoteHealth.healthy === undefined
                ? {}
                : { details: { healthy: remoteHealth.healthy } }),
            },
          ]
        : []),
    ],
  };
}

describe("run 101 addendum 22: only a blocked bootstrap or an empty endpoint pool blocks readiness", () => {
  test("a serving runtime with one timed-out probe is not blocked", () => {
    expect(isRuntimeBootstrapBlock(state("degraded", { status: "degraded", healthy: 2 }))).toBe(
      false,
    );
    expect(isRuntimeBootstrapBlock(state("degraded", { status: "degraded", healthy: 1 }))).toBe(
      false,
    );
  });

  test("a remote-health stage with no healthy endpoint is blocked", () => {
    expect(isRuntimeBootstrapBlock(state("degraded", { status: "degraded", healthy: 0 }))).toBe(
      true,
    );
  });

  test("a blocked bootstrap is blocked regardless of the stage detail", () => {
    expect(isRuntimeBootstrapBlock(state("blocked"))).toBe(true);
  });

  test("a ready bootstrap and a non-remote-health degradation are not blocked", () => {
    expect(isRuntimeBootstrapBlock(state("ready"))).toBe(false);
    expect(isRuntimeBootstrapBlock(state("degraded", { status: "ready", healthy: 3 }))).toBe(false);
    expect(isRuntimeBootstrapBlock(state("degraded"))).toBe(false);
  });
});
