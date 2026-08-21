import type { ObservedPerformanceProfile } from "@role-model/protocol-types";

export interface BenchmarkResultSample {
  endpointId: string;
  endpointVersion?: string;
  judgeScore: number;
  latencyMs: number;
  latencyMsP95?: number;
  tokensPerSec?: number;
  costPer1kTokensEst?: number;
}

export interface ObservedPerformanceSample {
  endpoint_id: string;
  endpoint_version: string;
  /** Structured identity is additive for legacy rows and required on newly produced samples. */
  model_id?: string;
  reasoning_effort?: string | null;
  effort_source?: string;
  source_type: "benchmark" | "live_request";
  difficulty_bucket?: "easy" | "medium" | "hard";
  timestamp_ms: number;
  latency_ms: number;
  latency_ms_p95?: number;
  tokens_per_sec?: number;
  judge_score?: number;
  cost_per_1k_tokens_est?: number;
  failure?: boolean;
  error_class?: string;
  request_id?: string;
  routing_decision_id?: string;
  benchmark_mode?: "quick" | "full";
  /**
   * Canonical configured-membership revision captured at benchmark run start.
   * Samples whose revision no longer matches the current membership are quarantined
   * (not selected as latest valid) rather than silently reused.
   */
  membership_revision?: string;
  /** Non-destructive quarantine marker; stale samples are never selected as latest valid. */
  completion_state?: "stale";
}

export interface AggregateObservedPerformanceOptions {
  nowMs?: number;
}

export type OperationalPerformanceProfile = ObservedPerformanceProfile & {
  readonly model_id?: string;
  readonly reasoning_effort?: string | null;
  readonly effort_source?: string;
  readonly profile_scope: "live-request-operational";
  readonly profile_semantics_version: "role-model.operational-performance.v1";
};

export const FRESHNESS_HALFLIFE_MS = 7 * 24 * 60 * 60 * 1000;
export const CONFIDENCE_SAMPLE_TARGET = 50;

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

function sampleFailed(sample: ObservedPerformanceSample): boolean {
  return sample.failure === true || typeof sample.error_class === "string";
}
export function validateObservedPerformanceProfileConsistency(
  profile: ObservedPerformanceProfile,
): void {
  const sourceCount = profile.sources.benchmark_samples + profile.sources.live_request_samples;
  if (profile.sample_size < sourceCount) {
    throw new Error(
      `ObservedPerformanceProfile sample_size ${profile.sample_size} is smaller than source sample count ${sourceCount}.`,
    );
  }
}

export function aggregateObservedPerformanceSamples(
  samples: readonly ObservedPerformanceSample[],
  options: AggregateObservedPerformanceOptions = {},
): ObservedPerformanceProfile {
  if (samples.length === 0) {
    throw new Error("aggregateObservedPerformanceSamples requires at least one sample.");
  }

  const endpointId = samples[0]?.endpoint_id;
  const endpointVersion = samples[0]?.endpoint_version;
  if (!endpointId) {
    throw new Error("Samples must include an endpoint_id.");
  }
  if (!endpointVersion) {
    throw new Error("Samples must include an endpoint_version.");
  }
  if (samples.some((sample) => sample.endpoint_id !== endpointId)) {
    throw new Error("All aggregated samples must belong to the same endpoint.");
  }
  if (samples.some((sample) => sample.endpoint_version !== endpointVersion)) {
    throw new Error("All aggregated samples must share one endpoint_version.");
  }

  const nowMs = options.nowMs ?? Date.now();
  const recordedAtValues = samples.map((sample) => sample.timestamp_ms);
  const latencyValues = samples.map((sample) => sample.latency_ms);
  const latencyP95Values = samples.map((sample) => sample.latency_ms_p95 ?? sample.latency_ms);
  const throughputValues = samples.flatMap((sample) =>
    typeof sample.tokens_per_sec === "number" ? [sample.tokens_per_sec] : [],
  );
  const costValues = samples.flatMap((sample) =>
    typeof sample.cost_per_1k_tokens_est === "number" ? [sample.cost_per_1k_tokens_est] : [],
  );
  const judgeScores = samples.flatMap((sample) =>
    sample.source_type === "benchmark" && typeof sample.judge_score === "number"
      ? [sample.judge_score]
      : [],
  );
  const errorClassCounts = new Map<string, number>();
  for (const sample of samples) {
    if (sample.error_class) {
      errorClassCounts.set(sample.error_class, (errorClassCounts.get(sample.error_class) ?? 0) + 1);
    }
  }

  const measurementWindow = {
    started_at_ms: Math.min(...recordedAtValues),
    ended_at_ms: Math.max(...recordedAtValues),
  };
  const sampleSize = samples.length;
  const ageMs = Math.max(0, nowMs - measurementWindow.ended_at_ms);
  const freshnessScore = clamp(Math.exp((-Math.log(2) * ageMs) / FRESHNESS_HALFLIFE_MS), 0, 1);
  const confidenceScore = clamp(
    Math.log1p(sampleSize) / Math.log1p(CONFIDENCE_SAMPLE_TARGET),
    0,
    1,
  );
  const failureCount = samples.filter(sampleFailed).length;
  const failureRate = failureCount / sampleSize;
  const errorClassRates = Object.fromEntries(
    [...errorClassCounts.entries()].map(([errorClass, count]) => [errorClass, count / sampleSize]),
  );
  const liveRequestSamples = samples.filter(
    (sample) => sample.source_type === "live_request",
  ).length;
  const benchmarkSamples = samples.filter((sample) => sample.source_type === "benchmark").length;
  const meanJudgeScore =
    judgeScores.length > 0
      ? judgeScores.reduce((total, score) => total + score, 0) / judgeScores.length
      : undefined;

  const profile: ObservedPerformanceProfile = {
    endpoint_id: endpointId,
    endpoint_version: endpointVersion,
    measured_at_ms: nowMs,
    measurement_window: measurementWindow,
    sample_size: sampleSize,
    sources: {
      live_request_samples: liveRequestSamples,
      benchmark_samples: benchmarkSamples,
    },
    latency_ms_p50: percentile(latencyValues, 0.5),
    latency_ms_p95: percentile(latencyP95Values, 0.95),
    failure_rate: failureRate,
    freshness_score: freshnessScore,
    confidence_score: confidenceScore,
    ...(typeof meanJudgeScore === "number"
      ? {
          judge_score: meanJudgeScore,
          quality_score: meanJudgeScore,
        }
      : {}),
    ...(typeof median(throughputValues) === "number"
      ? { tokens_per_sec: median(throughputValues) }
      : {}),
    ...(Object.keys(errorClassRates).length > 0 ? { error_class_rates: errorClassRates } : {}),
    ...(typeof median(costValues) === "number"
      ? {
          cost_per_1k_tokens_est: median(costValues),
          currency: "USD",
        }
      : {}),
  };

  validateObservedPerformanceProfileConsistency(profile);
  return profile;
}

function assertStructuredIdentityConsistency(samples: readonly ObservedPerformanceSample[]): void {
  const identityFields = ["model_id", "reasoning_effort", "effort_source"] as const;
  for (const field of identityFields) {
    const present = samples.filter((sample) => Object.prototype.hasOwnProperty.call(sample, field));
    if (present.length === 0) {
      continue;
    }
    const expected = present[0]?.[field];
    if (present.some((sample) => sample[field] !== expected)) {
      throw new Error(
        `Operational samples contain conflicting structured identity field ${field}.`,
      );
    }
  }
}

/**
 * Build the routing/UI operational profile from live executions only.
 * Benchmark samples remain durable input evidence but never affect this projection.
 */
export function aggregateOperationalPerformanceSamples(
  samples: readonly ObservedPerformanceSample[],
  options: AggregateObservedPerformanceOptions = {},
): OperationalPerformanceProfile | null {
  const liveSamples = samples.filter((sample) => sample.source_type === "live_request");
  if (liveSamples.length === 0) {
    return null;
  }
  assertStructuredIdentityConsistency(liveSamples);
  const profile = aggregateObservedPerformanceSamples(liveSamples, options);
  const identity = [...liveSamples]
    .reverse()
    .find(
      (sample) =>
        typeof sample.model_id === "string" ||
        Object.prototype.hasOwnProperty.call(sample, "reasoning_effort") ||
        typeof sample.effort_source === "string",
    );
  return {
    ...profile,
    ...(typeof identity?.model_id === "string" ? { model_id: identity.model_id } : {}),
    ...(Object.prototype.hasOwnProperty.call(identity ?? {}, "reasoning_effort")
      ? { reasoning_effort: identity?.reasoning_effort ?? null }
      : {}),
    ...(typeof identity?.effort_source === "string"
      ? { effort_source: identity.effort_source }
      : {}),
    profile_scope: "live-request-operational",
    profile_semantics_version: "role-model.operational-performance.v1",
  };
}

export {
  applyRoutingBenchmarkQualityToProfile,
  applyRoutingBenchmarkQualityToProfiles,
  normalizeBenchmarkSampleVersions,
  resolveRoutingBenchmarkQuality,
} from "./benchmark-routing-quality.js";
export type {
  BenchmarkBucketScore,
  BenchmarkDifficultyBucket,
  BenchmarkHardBlend,
  BenchmarkRoutingMode,
  RoutingBenchmarkQuality,
} from "./benchmark-routing-quality.js";

export function aggregateObservedPerformance(
  sample: BenchmarkResultSample,
): ObservedPerformanceProfile {
  const measuredAtMs = Date.now();
  return aggregateObservedPerformanceSamples(
    [
      {
        endpoint_id: sample.endpointId,
        endpoint_version: sample.endpointVersion ?? "unknown",
        source_type: "benchmark",
        timestamp_ms: measuredAtMs,
        latency_ms: sample.latencyMs,
        ...(typeof sample.latencyMsP95 === "number" ? { latency_ms_p95: sample.latencyMsP95 } : {}),
        ...(typeof sample.tokensPerSec === "number" ? { tokens_per_sec: sample.tokensPerSec } : {}),
        ...(typeof sample.costPer1kTokensEst === "number"
          ? { cost_per_1k_tokens_est: sample.costPer1kTokensEst }
          : {}),
        judge_score: sample.judgeScore,
      },
    ],
    { nowMs: measuredAtMs },
  );
}
