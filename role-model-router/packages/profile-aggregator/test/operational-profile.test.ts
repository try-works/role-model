import { describe, expect, test } from "vitest";

import {
  aggregateOperationalPerformanceSamples,
  type ObservedPerformanceSample,
} from "../src/index.js";

function sample(
  sourceType: ObservedPerformanceSample["source_type"],
  latencyMs: number,
  failure: boolean,
  timestampMs: number,
): ObservedPerformanceSample {
  return {
    endpoint_id: "deepseek.personal.primary.deepseek-v4-flash-high",
    endpoint_version: "v91:high",
    model_id: "deepseek/deepseek-v4-flash",
    reasoning_effort: "high",
    effort_source: "fixed",
    source_type: sourceType,
    timestamp_ms: timestampMs,
    latency_ms: latencyMs,
    latency_ms_p95: latencyMs,
    failure,
    ...(failure ? { error_class: `${sourceType}_failure` } : {}),
    request_id: `${sourceType}-${timestampMs}`,
  };
}

describe("aggregateOperationalPerformanceSamples", () => {
  test("excludes benchmark latency, failures, freshness, and sample counts", () => {
    const profile = aggregateOperationalPerformanceSamples(
      [sample("benchmark", 90_000, true, 1_000), sample("live_request", 250, false, 2_000)],
      { nowMs: 2_000 },
    );

    expect(profile).toMatchObject({
      endpoint_id: "deepseek.personal.primary.deepseek-v4-flash-high",
      model_id: "deepseek/deepseek-v4-flash",
      reasoning_effort: "high",
      effort_source: "fixed",
      profile_scope: "live-request-operational",
      sample_size: 1,
      sources: { live_request_samples: 1, benchmark_samples: 0 },
      latency_ms_p50: 250,
      latency_ms_p95: 250,
      failure_rate: 0,
      measurement_window: { started_at_ms: 2_000, ended_at_ms: 2_000 },
    });
    expect(profile).not.toHaveProperty("judge_score");
  });

  test("returns null when no live operational evidence exists", () => {
    expect(
      aggregateOperationalPerformanceSamples([sample("benchmark", 400, false, 1_000)], {
        nowMs: 1_000,
      }),
    ).toBeNull();
  });

  test("rejects conflicting structured effort identity for one endpoint", () => {
    const high = sample("live_request", 250, false, 1_000);
    const conflicting = { ...sample("live_request", 300, false, 2_000), reasoning_effort: "max" };

    expect(() => aggregateOperationalPerformanceSamples([high, conflicting])).toThrow(
      /structured identity/i,
    );
  });

  test("upgrades legacy live samples that predate structured effort identity", () => {
    const legacy = sample("live_request", 300, false, 1_000);
    delete legacy.model_id;
    delete legacy.reasoning_effort;
    delete legacy.effort_source;

    expect(
      aggregateOperationalPerformanceSamples([legacy, sample("live_request", 250, false, 2_000)]),
    ).toMatchObject({
      model_id: "deepseek/deepseek-v4-flash",
      reasoning_effort: "high",
      effort_source: "fixed",
      sample_size: 2,
    });
  });
});
