import { afterEach, describe, expect, test, vi } from "vitest";

import {
  computeAdaptiveThrottleMs,
  describeResponseChannels,
  JUDGE_CIRCUIT_FAILURE_THRESHOLD,
  recordJudgeCallOutcome,
  resetBenchmarkJudgeRuntimeForTests,
} from "../src/benchmark-judge-runtime.js";

describe("benchmark-judge-runtime", () => {
  afterEach(() => {
    resetBenchmarkJudgeRuntimeForTests();
    vi.restoreAllMocks();
  });

  test("opens circuit after consecutive judge failures", () => {
    for (let index = 0; index < JUDGE_CIRCUIT_FAILURE_THRESHOLD; index += 1) {
      const state = recordJudgeCallOutcome({ success: false, latencyMs: 0 });
      if (index < JUDGE_CIRCUIT_FAILURE_THRESHOLD - 1) {
        expect(state.circuitOpen).toBe(false);
      } else {
        expect(state.circuitOpen).toBe(true);
      }
    }
  });

  test("adaptive throttle scales with last successful judge latency", () => {
    recordJudgeCallOutcome({ success: true, latencyMs: 120_000 });
    expect(computeAdaptiveThrottleMs()).toBeGreaterThanOrEqual(12_000);
  });

  test("describeResponseChannels reports available message fields", () => {
    expect(
      describeResponseChannels({
        contentText: "",
        reasoningText: "analysis only",
        outputText: "",
      }),
    ).toEqual({
      hasContentText: false,
      hasReasoningText: true,
      hasOutputText: false,
      hasToolCalls: false,
      contentLength: 0,
      reasoningLength: 13,
    });
  });
});
