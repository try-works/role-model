import { describe, expect, test } from "vitest";

import { getQualityMetric, routeRequest } from "../src/router.js";
import type {
  EndpointCandidate,
  ObservedDataConfigRecord,
  RouteRequestInput,
} from "../src/types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function candidate(
  endpointId: string,
  capabilities: readonly string[],
  overrides: Partial<EndpointCandidate> = {},
): EndpointCandidate {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: endpointId,
      runtime_version: "run-64-decay-tests",
      region: "global",
    },
    declared: {
      endpoint_id: endpointId,
      capabilities,
      modalities: ["text"],
      max_context_tokens: 100_000,
      tool_calling: { supported: false, style: "none" },
      supports_embeddings: false,
    },
    status: "active",
    ...overrides,
  };
}

function buildObservedDataConfig(): ObservedDataConfigRecord {
  return {
    enabled: true,
    aggregation: { minSamples: 1 },
    metricDecayPercentPerDay: {
      latency: 10,
      throughput: 10,
    },
    throughputSla: {
      enabled: false,
      minTokensPerSec: 24,
      penaltyTimeoutMs: 600_000,
      penaltyFactor: 0,
    },
  };
}

function singleCandidateMetric(
  metricName: "latency" | "throughput" | "reliability" | "cost",
  observed: NonNullable<EndpointCandidate["observed"]>,
  routingTimeMs: number,
): number {
  const decision = routeRequest({
    request: {
      requestId: `run-64-${metricName}`,
      taskType: "text.chat",
      requiredCapabilities: [],
      preferredCapabilities: [],
      requiredModalities: ["text"],
      contextTokens: 1000,
      needsTools: false,
      strategy: "balanced",
      preferLocal: false,
    },
    candidates: [candidate(`endpoint-${metricName}`, ["text.chat"], { observed })],
    observedDataConfig: buildObservedDataConfig(),
    routingTimeMs,
  });

  const scored = decision.scored_candidates.find(
    (entry) => entry.endpoint_id === `endpoint-${metricName}`,
  );
  expect(scored).toBeDefined();
  const metric = scored?.metric_breakdown[metricName];
  expect(metric).toBeDefined();
  expect(typeof metric?.value).toBe("number");
  return metric?.value;
}

describe("observed-data decay policy (run-64 RED)", () => {
  test("retains 90 percent of latency deviation from neutral after 24 hours", () => {
    const routingTimeMs = DAY_MS;
    const freshValue = singleCandidateMetric(
      "latency",
      {
        latency_ms_p50: 70,
        latency_ms_p95: 90,
        tokens_per_sec: 60,
        failure_rate: 0.02,
        cost_per_1k_tokens_est: 0.004,
        measured_at_ms: routingTimeMs,
      },
      routingTimeMs,
    );
    const staleValue = singleCandidateMetric(
      "latency",
      {
        latency_ms_p50: 70,
        latency_ms_p95: 90,
        tokens_per_sec: 60,
        failure_rate: 0.02,
        cost_per_1k_tokens_est: 0.004,
        measured_at_ms: 0,
      },
      routingTimeMs,
    );

    expect(staleValue).toBeCloseTo(0.5 + 0.9 * (freshValue - 0.5), 6);
  });

  test("retains 81 percent of throughput deviation after 48 hours and resets when samples are fresh", () => {
    const routingTimeMs = 2 * DAY_MS;
    const freshValue = singleCandidateMetric(
      "throughput",
      {
        latency_ms_p50: 70,
        latency_ms_p95: 90,
        tokens_per_sec: 90,
        failure_rate: 0.02,
        cost_per_1k_tokens_est: 0.004,
        measured_at_ms: routingTimeMs,
      },
      routingTimeMs,
    );
    const staleValue = singleCandidateMetric(
      "throughput",
      {
        latency_ms_p50: 70,
        latency_ms_p95: 90,
        tokens_per_sec: 90,
        failure_rate: 0.02,
        cost_per_1k_tokens_est: 0.004,
        measured_at_ms: 0,
      },
      routingTimeMs,
    );

    expect(staleValue).toBeLessThan(freshValue);
    expect(staleValue).toBeCloseTo(0.5 + 0.81 * (freshValue - 0.5), 6);
  });

  test("falls back to canonical decay defaults when nested decay rates are omitted", () => {
    const routingTimeMs = DAY_MS;
    const observed = {
      latency_ms_p50: 70,
      latency_ms_p95: 90,
      tokens_per_sec: 60,
      failure_rate: 0.02,
      cost_per_1k_tokens_est: 0.004,
      measured_at_ms: 0,
    } satisfies NonNullable<EndpointCandidate["observed"]>;

    const decision = routeRequest({
      request: {
        requestId: "run-64-latency-fallback",
        taskType: "text.chat",
        requiredCapabilities: [],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 1000,
        needsTools: false,
        strategy: "balanced",
        preferLocal: false,
      },
      candidates: [candidate("endpoint-latency-fallback", ["text.chat"], { observed })],
      observedDataConfig: {
        enabled: true,
        aggregation: { minSamples: 1 },
        throughputSla: {
          enabled: false,
          minTokensPerSec: 24,
          penaltyTimeoutMs: 600_000,
          penaltyFactor: 0,
        },
      } as ObservedDataConfigRecord,
      routingTimeMs,
    } as RouteRequestInput);

    const scored = decision.scored_candidates.find(
      (entry) => entry.endpoint_id === "endpoint-latency-fallback",
    );
    expect(scored?.metric_breakdown.latency.raw).toMatchObject({
      decay_percent_per_day: 10,
      time_decay_applied: true,
    });
    expect(scored?.metric_breakdown.latency.value).toBeCloseTo(
      singleCandidateMetric("latency", observed, routingTimeMs),
      6,
    );
  });

  test("does not neutralize benchmark quality when only benchmark freshness metadata is old", () => {
    const reviewedCandidate = candidate("quality-endpoint", ["text.chat"], {
      observed: {
        measured_at_ms: 0,
        quality_measured_at_ms: 0,
        quality_freshness_score: 0.05,
        freshness_score: 0.05,
        quality_benchmark_samples: 12,
        quality_live_request_samples: 0,
        sources: {
          benchmark_samples: 12,
          live_request_samples: 0,
        },
      },
      benchmarkCapability: {
        overallScore: 0.92,
      },
    });

    const quality = getQualityMetric(reviewedCandidate, {
      request: {
        requestId: "run-64-quality",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 1200,
        needsTools: false,
        strategy: "quality",
        preferLocal: false,
      },
      candidates: [reviewedCandidate],
      observedDataConfig: buildObservedDataConfig(),
      routingTimeMs: 7 * DAY_MS,
    } as RouteRequestInput);

    expect(quality.source).toBe("benchmark");
    expect(quality.value).toBeCloseTo(0.92, 6);
  });

  test("does not time-decay measured reliability or measured cost", () => {
    const routingTimeMs = 10 * DAY_MS;
    const reliabilityValue = singleCandidateMetric(
      "reliability",
      {
        latency_ms_p50: 70,
        latency_ms_p95: 90,
        tokens_per_sec: 60,
        failure_rate: 0.2,
        cost_per_1k_tokens_est: 0.004,
        measured_at_ms: 0,
      },
      routingTimeMs,
    );
    const costValue = singleCandidateMetric(
      "cost",
      {
        latency_ms_p50: 70,
        latency_ms_p95: 90,
        tokens_per_sec: 60,
        failure_rate: 0.2,
        cost_per_1k_tokens_est: 0.004,
        measured_at_ms: 0,
      },
      routingTimeMs,
    );

    expect(reliabilityValue).toBeCloseTo(0.8, 6);
    expect(costValue).toBeCloseTo(0.6, 6);
  });
});
