export interface BenchmarkResultSample {
  endpointId: string;
  judgeScore: number;
  latencyMs: number;
  tokensPerSec: number;
  costPer1kTokensEst: number;
}

export interface ObservedPerformanceSample {
  endpoint_id: string;
  endpoint_version?: string;
  sample_source: "benchmark" | "live_request";
  recorded_at_ms: number;
  latency_ms: number;
  tokens_per_sec?: number;
  cold_start_ms?: number;
  failure_class?: string;
  cost_per_1k_tokens_est?: number;
  judge_score?: number;
  request_id?: string;
  routing_decision_id?: string;
}

export interface AggregateObservedPerformanceOptions {
  nowMs?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function percentile(values: readonly number[], quantile: number): number {
  if (values.length === 0) {
    throw new Error("Percentile requires at least one value.");
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * quantile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex] ?? 0;
  }

  const lowerValue = sorted[lowerIndex] ?? 0;
  const upperValue = sorted[upperIndex] ?? lowerValue;
  const fraction = index - lowerIndex;
  return lowerValue + (upperValue - lowerValue) * fraction;
}

function median(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }

  return percentile(values, 0.5);
}

export function aggregateObservedPerformanceSamples(
  samples: readonly ObservedPerformanceSample[],
  options: AggregateObservedPerformanceOptions = {},
) {
  if (samples.length === 0) {
    throw new Error("aggregateObservedPerformanceSamples requires at least one sample.");
  }

  const endpointId = samples[0]?.endpoint_id;
  if (!endpointId) {
    throw new Error("Samples must include an endpoint_id.");
  }
  if (samples.some((sample) => sample.endpoint_id !== endpointId)) {
    throw new Error("All aggregated samples must belong to the same endpoint.");
  }
  const definedEndpointVersions = [...new Set(samples.flatMap((sample) => sample.endpoint_version ?? []))];
  if (definedEndpointVersions.length > 1) {
    throw new Error("All aggregated samples must share one endpoint_version.");
  }

  const nowMs = options.nowMs ?? Date.now();
  const recordedAtValues = samples.map((sample) => sample.recorded_at_ms);
  const latencyValues = samples.map((sample) => sample.latency_ms);
  const throughputValues = samples.flatMap((sample) =>
    typeof sample.tokens_per_sec === "number" ? [sample.tokens_per_sec] : [],
  );
  const coldStartValues = samples.flatMap((sample) =>
    typeof sample.cold_start_ms === "number" ? [sample.cold_start_ms] : [],
  );
  const costValues = samples.flatMap((sample) =>
    typeof sample.cost_per_1k_tokens_est === "number" ? [sample.cost_per_1k_tokens_est] : [],
  );
  const judgeScores = samples.flatMap((sample) =>
    typeof sample.judge_score === "number" ? [sample.judge_score] : [],
  );
  const errorClassCounts = new Map<string, number>();
  for (const sample of samples) {
    if (sample.failure_class) {
      errorClassCounts.set(sample.failure_class, (errorClassCounts.get(sample.failure_class) ?? 0) + 1);
    }
  }

  const sampleWindow = {
    started_at_ms: Math.min(...recordedAtValues),
    ended_at_ms: Math.max(...recordedAtValues),
  };
  const sampleSize = samples.length;
  const ageMs = Math.max(0, nowMs - sampleWindow.ended_at_ms);
  const freshnessHalfLifeMs = 7 * 24 * 60 * 60 * 1000;
  const freshnessScore = clamp(
    Math.exp((-Math.log(2) * ageMs) / freshnessHalfLifeMs),
    0,
    1,
  );
  const confidenceScore = clamp(Math.log1p(sampleSize) / Math.log1p(50), 0, 1);
  const failureRate = errorClassCounts.size === 0 ? 0 : samples.filter((sample) => sample.failure_class).length / sampleSize;
  const errorClassRates = Object.fromEntries(
    [...errorClassCounts.entries()].map(([errorClass, count]) => [errorClass, count / sampleSize]),
  );
  const liveRequestSamples = samples.filter((sample) => sample.sample_source === "live_request").length;
  const benchmarkSamples = samples.filter((sample) => sample.sample_source === "benchmark").length;
  const meanJudgeScore =
    judgeScores.length > 0
      ? judgeScores.reduce((total, score) => total + score, 0) / judgeScores.length
      : undefined;

  return {
    endpoint_id: endpointId,
    measured_at_ms: nowMs,
    sample_window: sampleWindow,
    sample_size: sampleSize,
    sources: {
      live_request_samples: liveRequestSamples,
      benchmark_samples: benchmarkSamples,
    },
    ...(typeof meanJudgeScore === "number"
      ? {
          judge_score: meanJudgeScore,
          quality_score: meanJudgeScore,
        }
      : {}),
    latency_ms_p50: percentile(latencyValues, 0.5),
    latency_ms_p95: percentile(latencyValues, 0.95),
    ...(typeof median(throughputValues) === "number"
      ? { tokens_per_sec: median(throughputValues) }
      : {}),
    ...(typeof median(coldStartValues) === "number"
      ? { cold_start_ms: median(coldStartValues) }
      : {}),
    failure_rate: failureRate,
    ...(Object.keys(errorClassRates).length > 0 ? { error_class_rates: errorClassRates } : { error_class_rates: {} }),
    ...(typeof median(costValues) === "number"
      ? {
          cost_per_1k_tokens_est: median(costValues),
          currency: "USD",
        }
      : {}),
    freshness_score: freshnessScore,
    confidence_score: confidenceScore,
  };
}

export function aggregateObservedPerformance(sample: BenchmarkResultSample) {
  const measuredAtMs = Date.now();
  return {
    ...aggregateObservedPerformanceSamples(
      [
        {
          endpoint_id: sample.endpointId,
          sample_source: "benchmark",
          recorded_at_ms: measuredAtMs,
          latency_ms: sample.latencyMs,
          tokens_per_sec: sample.tokensPerSec,
          cold_start_ms: sample.latencyMs / 2,
          cost_per_1k_tokens_est: sample.costPer1kTokensEst,
          judge_score: sample.judgeScore,
        },
      ],
      { nowMs: measuredAtMs },
    ),
  };
}
