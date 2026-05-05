import { describe, expect, test } from "vitest";

import * as profileAggregator from "@role-model-router/profile-aggregator";

describe("profile aggregation", () => {
  test("aggregates multiple samples into deterministic window and latency percentiles", () => {
    const aggregateObservedPerformanceSamples = Reflect.get(
      profileAggregator,
      "aggregateObservedPerformanceSamples",
    );
    if (typeof aggregateObservedPerformanceSamples !== "function") {
      throw new Error("aggregateObservedPerformanceSamples is not implemented");
    }

    const result = aggregateObservedPerformanceSamples(
      [
        {
          endpoint_id: "endpoint-1",
          endpoint_version: "v1",
          source_type: "benchmark",
          timestamp_ms: 100,
          latency_ms: 10,
          tokens_per_sec: 100,
          cost_per_1k_tokens_est: 0.001,
          judge_score: 0.8,
        },
        {
          endpoint_id: "endpoint-1",
          endpoint_version: "v1",
          source_type: "live_request",
          timestamp_ms: 200,
          latency_ms: 20,
          tokens_per_sec: 95,
          cost_per_1k_tokens_est: 0.002,
          failure: false,
          request_id: "req-1",
          routing_decision_id: "decision-1",
        },
        {
          endpoint_id: "endpoint-1",
          endpoint_version: "v1",
          source_type: "benchmark",
          timestamp_ms: 300,
          latency_ms: 30,
          tokens_per_sec: 90,
          cost_per_1k_tokens_est: 0.003,
          judge_score: 0.84,
        },
        {
          endpoint_id: "endpoint-1",
          endpoint_version: "v1",
          source_type: "live_request",
          timestamp_ms: 400,
          latency_ms: 40,
          tokens_per_sec: 85,
          cost_per_1k_tokens_est: 0.004,
          failure: false,
          request_id: "req-2",
          routing_decision_id: "decision-2",
        },
        {
          endpoint_id: "endpoint-1",
          endpoint_version: "v1",
          source_type: "benchmark",
          timestamp_ms: 500,
          latency_ms: 50,
          tokens_per_sec: 80,
          cost_per_1k_tokens_est: 0.005,
          judge_score: 0.88,
        },
      ],
      { nowMs: 500 },
    );

    expect(result.endpoint_id).toBe("endpoint-1");
    expect(result.endpoint_version).toBe("v1");
    expect(result.sample_size).toBe(5);
    expect(result.measurement_window).toEqual({
      started_at_ms: 100,
      ended_at_ms: 500,
    });
    expect(result.sources).toEqual({
      live_request_samples: 2,
      benchmark_samples: 3,
    });
    expect(result.latency_ms_p50).toBe(30);
    expect(result.latency_ms_p95).toBe(48);
  });

  test("aggregates failure_rate and error_class_rates correctly", () => {
    const aggregateObservedPerformanceSamples = Reflect.get(
      profileAggregator,
      "aggregateObservedPerformanceSamples",
    );
    if (typeof aggregateObservedPerformanceSamples !== "function") {
      throw new Error("aggregateObservedPerformanceSamples is not implemented");
    }

    const result = aggregateObservedPerformanceSamples(
      [
        {
          endpoint_id: "endpoint-2",
          endpoint_version: "v2",
          source_type: "benchmark",
          timestamp_ms: 100,
          latency_ms: 50,
        },
        {
          endpoint_id: "endpoint-2",
          endpoint_version: "v2",
          source_type: "live_request",
          timestamp_ms: 200,
          latency_ms: 75,
          failure: true,
          error_class: "timeout",
        },
        {
          endpoint_id: "endpoint-2",
          endpoint_version: "v2",
          source_type: "benchmark",
          timestamp_ms: 300,
          latency_ms: 60,
          failure: true,
          error_class: "timeout",
        },
        {
          endpoint_id: "endpoint-2",
          endpoint_version: "v2",
          source_type: "live_request",
          timestamp_ms: 400,
          latency_ms: 80,
          failure: true,
          error_class: "rate_limit",
        },
        {
          endpoint_id: "endpoint-2",
          endpoint_version: "v2",
          source_type: "benchmark",
          timestamp_ms: 500,
          latency_ms: 55,
        },
      ],
      { nowMs: 500 },
    );

    expect(result.failure_rate).toBe(0.6);
    expect(result.error_class_rates).toEqual({
      timeout: 0.4,
      rate_limit: 0.2,
    });
  });

  test("applies freshness half-life decay and increases confidence with sample count", () => {
    const aggregateObservedPerformanceSamples = Reflect.get(
      profileAggregator,
      "aggregateObservedPerformanceSamples",
    );
    if (typeof aggregateObservedPerformanceSamples !== "function") {
      throw new Error("aggregateObservedPerformanceSamples is not implemented");
    }

    const halfLifeMs = 7 * 24 * 60 * 60 * 1000;
    const nowMs = halfLifeMs * 2;

    const freshResult = aggregateObservedPerformanceSamples(
      [
        {
          endpoint_id: "endpoint-3",
          endpoint_version: "v3",
          source_type: "benchmark",
          timestamp_ms: nowMs,
          latency_ms: 25,
        },
      ],
      { nowMs },
    );
    const staleResult = aggregateObservedPerformanceSamples(
      [
        {
          endpoint_id: "endpoint-4",
          endpoint_version: "v4",
          source_type: "benchmark",
          timestamp_ms: nowMs - halfLifeMs,
          latency_ms: 25,
        },
      ],
      { nowMs },
    );
    const manySamplesResult = aggregateObservedPerformanceSamples(
      Array.from({ length: 50 }, (_, index) => ({
        endpoint_id: "endpoint-5",
        endpoint_version: "v5",
        source_type: "benchmark" as const,
        timestamp_ms: nowMs - index,
        latency_ms: 25,
      })),
      { nowMs },
    );

    expect(freshResult.freshness_score).toBeCloseTo(1, 8);
    expect(staleResult.freshness_score).toBeCloseTo(0.5, 8);
    expect(manySamplesResult.confidence_score).toBeCloseTo(1, 8);
    expect(manySamplesResult.confidence_score).toBeGreaterThan(freshResult.confidence_score);
  });

  test("rejects mixed endpoint versions as different profile streams", () => {
    const aggregateObservedPerformanceSamples = Reflect.get(
      profileAggregator,
      "aggregateObservedPerformanceSamples",
    );
    if (typeof aggregateObservedPerformanceSamples !== "function") {
      throw new Error("aggregateObservedPerformanceSamples is not implemented");
    }

    expect(() =>
      aggregateObservedPerformanceSamples(
        [
          {
            endpoint_id: "endpoint-6",
            endpoint_version: "v1",
            source_type: "benchmark",
            timestamp_ms: 100,
            latency_ms: 25,
          },
          {
            endpoint_id: "endpoint-6",
            endpoint_version: "v2",
            source_type: "live_request",
            timestamp_ms: 200,
            latency_ms: 30,
          },
        ],
        { nowMs: 200 },
      ),
    ).toThrow(/endpoint_version/i);
  });

  test("aggregates quality_score only from available judge scores", () => {
    const aggregateObservedPerformanceSamples = Reflect.get(
      profileAggregator,
      "aggregateObservedPerformanceSamples",
    );
    if (typeof aggregateObservedPerformanceSamples !== "function") {
      throw new Error("aggregateObservedPerformanceSamples is not implemented");
    }

    const mixedJudgeResult = aggregateObservedPerformanceSamples(
      [
        {
          endpoint_id: "endpoint-7",
          endpoint_version: "v7",
          source_type: "benchmark",
          timestamp_ms: 100,
          latency_ms: 25,
          judge_score: 0.8,
        },
        {
          endpoint_id: "endpoint-7",
          endpoint_version: "v7",
          source_type: "live_request",
          timestamp_ms: 200,
          latency_ms: 30,
        },
        {
          endpoint_id: "endpoint-7",
          endpoint_version: "v7",
          source_type: "benchmark",
          timestamp_ms: 300,
          latency_ms: 35,
          judge_score: 0.9,
        },
      ],
      { nowMs: 300 },
    );

    const noJudgeResult = aggregateObservedPerformanceSamples(
      [
        {
          endpoint_id: "endpoint-8",
          endpoint_version: "v8",
          source_type: "benchmark",
          timestamp_ms: 100,
          latency_ms: 25,
        },
        {
          endpoint_id: "endpoint-8",
          endpoint_version: "v8",
          source_type: "live_request",
          timestamp_ms: 200,
          latency_ms: 30,
        },
      ],
      { nowMs: 200 },
    );

    expect(mixedJudgeResult.quality_score).toBeCloseTo(0.85, 8);
    expect(mixedJudgeResult.judge_score).toBeCloseTo(0.85, 8);
    expect("quality_score" in noJudgeResult).toBe(false);
    expect("judge_score" in noJudgeResult).toBe(false);
  });

  test("does not invent throughput or cost when samples omit those measurements", () => {
    const aggregateObservedPerformanceSamples = Reflect.get(
      profileAggregator,
      "aggregateObservedPerformanceSamples",
    );
    if (typeof aggregateObservedPerformanceSamples !== "function") {
      throw new Error("aggregateObservedPerformanceSamples is not implemented");
    }

    const result = aggregateObservedPerformanceSamples(
      [
        {
          endpoint_id: "endpoint-9",
          endpoint_version: "v9",
          source_type: "benchmark",
          timestamp_ms: 100,
          latency_ms: 25,
        },
        {
          endpoint_id: "endpoint-9",
          endpoint_version: "v9",
          source_type: "live_request",
          timestamp_ms: 200,
          latency_ms: 35,
        },
      ],
      { nowMs: 200 },
    );

    expect("tokens_per_sec" in result).toBe(false);
    expect("cost_per_1k_tokens_est" in result).toBe(false);
  });
});
