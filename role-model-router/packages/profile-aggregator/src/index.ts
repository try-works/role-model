export interface BenchmarkResultSample {
  endpointId: string;
  judgeScore: number;
  latencyMs: number;
  tokensPerSec: number;
  costPer1kTokensEst: number;
}

export function aggregateObservedPerformance(sample: BenchmarkResultSample) {
  return {
    endpoint_id: sample.endpointId,
    measured_at_ms: Date.now(),
    measurement_window: "baseline-smoke",
    sample_size: 1,
    judge_score: sample.judgeScore,
    latency_ms_p50: sample.latencyMs,
    latency_ms_p95: sample.latencyMs,
    tokens_per_sec: sample.tokensPerSec,
    cold_start_ms: sample.latencyMs / 2,
    failure_rate: 0,
    error_class_rates: {},
    cost_per_1k_tokens_est: sample.costPer1kTokensEst,
    currency: "USD",
    freshness_score: 1,
    confidence_score: 0.7,
  };
}
