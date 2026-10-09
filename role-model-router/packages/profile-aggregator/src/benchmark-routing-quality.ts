import type { ObservedPerformanceProfile } from "@role-model/protocol-types";

import type { ObservedPerformanceSample } from "./index.js";

export type BenchmarkRoutingMode = "quick" | "full";

export type BenchmarkDifficultyBucket = "easy" | "medium" | "hard";

const DIFFICULTY_BUCKETS: readonly BenchmarkDifficultyBucket[] = ["easy", "medium", "hard"];

export interface BenchmarkBucketScore {
  readonly score: number;
  readonly cases: number;
}

export interface BenchmarkHardBlend {
  readonly full: number;
  readonly quick: number;
  readonly blended: number;
}

export interface RoutingBenchmarkQuality {
  readonly judge_score: number;
  readonly quality_score: number;
  readonly benchmark_samples: number;
  readonly scoresByBucket: Record<BenchmarkDifficultyBucket, BenchmarkBucketScore>;
  readonly hardBlend?: BenchmarkHardBlend;
}

function meanJudgeScores(samples: readonly ObservedPerformanceSample[]): number | null {
  const scores = samples.flatMap((sample) =>
    typeof sample.judge_score === "number" ? [sample.judge_score] : [],
  );
  if (scores.length === 0) {
    return null;
  }
  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

function benchmarkSamplesWithScores(
  samples: readonly ObservedPerformanceSample[],
): ObservedPerformanceSample[] {
  return samples.filter(
    (sample) =>
      sample.source_type === "benchmark" &&
      typeof sample.judge_score === "number" &&
      sample.completion_state !== "failed" &&
      sample.completion_state !== "cancelled" &&
      sample.completion_state !== "stale",
  );
}

function resolveSampleMode(sample: ObservedPerformanceSample): BenchmarkRoutingMode {
  return sample.benchmark_mode === "quick" ? "quick" : "full";
}

function bucketSamples(input: {
  readonly samples: readonly ObservedPerformanceSample[];
  readonly bucket: BenchmarkDifficultyBucket;
  readonly mode?: BenchmarkRoutingMode;
}): ObservedPerformanceSample[] {
  return input.samples.filter((sample) => {
    if (sample.difficulty_bucket !== input.bucket) {
      return false;
    }
    if (input.mode === undefined) {
      return true;
    }
    return resolveSampleMode(sample) === input.mode;
  });
}

export function normalizeBenchmarkSampleVersions(
  samples: readonly ObservedPerformanceSample[],
): ObservedPerformanceSample[] {
  const benchmarkSamples = samples.filter((sample) => sample.source_type === "benchmark");
  if (benchmarkSamples.length === 0) {
    return [...samples];
  }

  const latestVersion = benchmarkSamples.at(-1)?.endpoint_version;
  if (!latestVersion) {
    return [...samples];
  }

  return samples.map((sample) =>
    sample.source_type === "benchmark"
      ? { ...sample, endpoint_version: latestVersion }
      : { ...sample },
  );
}

export function resolveRoutingBenchmarkQuality(
  samples: readonly ObservedPerformanceSample[],
): RoutingBenchmarkQuality | null {
  const benchmarkSamples = benchmarkSamplesWithScores(samples);
  if (benchmarkSamples.length === 0) {
    return null;
  }

  const fullHardMean = meanJudgeScores(
    bucketSamples({ samples: benchmarkSamples, bucket: "hard", mode: "full" }),
  );
  const quickHardMean = meanJudgeScores(
    bucketSamples({ samples: benchmarkSamples, bucket: "hard", mode: "quick" }),
  );

  let hardScore: number | null = null;
  let hardBlend: BenchmarkHardBlend | undefined;
  if (fullHardMean !== null && quickHardMean !== null) {
    hardScore = (fullHardMean + quickHardMean) / 2;
    hardBlend = {
      full: fullHardMean,
      quick: quickHardMean,
      blended: hardScore,
    };
  } else {
    hardScore = fullHardMean ?? quickHardMean;
  }

  const scoresByBucket: Record<BenchmarkDifficultyBucket, BenchmarkBucketScore> = {
    easy: { score: 0, cases: 0 },
    medium: { score: 0, cases: 0 },
    hard: { score: 0, cases: 0 },
  };

  for (const bucket of DIFFICULTY_BUCKETS) {
    if (bucket === "hard" && hardScore !== null) {
      const hardSamples = bucketSamples({ samples: benchmarkSamples, bucket: "hard" });
      scoresByBucket.hard = {
        score: hardScore,
        cases: hardSamples.length,
      };
      continue;
    }

    const fullBucketSamples = bucketSamples({ samples: benchmarkSamples, bucket, mode: "full" });
    const bucketSamplesForScore =
      fullBucketSamples.length > 0
        ? fullBucketSamples
        : bucketSamples({ samples: benchmarkSamples, bucket });
    const bucketMean = meanJudgeScores(bucketSamplesForScore);
    if (bucketMean !== null) {
      scoresByBucket[bucket] = {
        score: bucketMean,
        cases: bucketSamplesForScore.length,
      };
    }
  }

  let weightedScoreTotal = 0;
  let weightedCaseTotal = 0;
  for (const bucket of DIFFICULTY_BUCKETS) {
    const bucketScore = scoresByBucket[bucket];
    if (bucketScore.cases <= 0) {
      continue;
    }
    weightedScoreTotal += bucketScore.score * bucketScore.cases;
    weightedCaseTotal += bucketScore.cases;
  }

  const overallScore =
    weightedCaseTotal > 0
      ? weightedScoreTotal / weightedCaseTotal
      : (meanJudgeScores(benchmarkSamples) ?? 0);

  return {
    judge_score: overallScore,
    quality_score: overallScore,
    benchmark_samples: benchmarkSamples.length,
    scoresByBucket,
    ...(hardBlend ? { hardBlend } : {}),
  };
}

export function applyRoutingBenchmarkQualityToProfile(
  profile: ObservedPerformanceProfile | null | undefined,
  samples: readonly ObservedPerformanceSample[],
  difficultyBucket?: BenchmarkDifficultyBucket,
): ObservedPerformanceProfile | null | undefined {
  if (!profile) {
    return profile;
  }
  const routingQuality = resolveRoutingBenchmarkQuality(samples);
  if (!routingQuality) {
    return profile;
  }

  if (difficultyBucket) {
    const bucketScore = routingQuality.scoresByBucket[difficultyBucket];
    if (bucketScore.cases <= 0) {
      return profile;
    }
    return {
      ...profile,
      judge_score: bucketScore.score,
      quality_score: bucketScore.score,
      sample_size: bucketScore.cases,
      sources: {
        ...profile.sources,
        benchmark_samples: bucketScore.cases,
      },
    };
  }

  return {
    ...profile,
    judge_score: routingQuality.judge_score,
    quality_score: routingQuality.quality_score,
    sample_size: Math.max(profile.sample_size, routingQuality.benchmark_samples),
    sources: {
      ...profile.sources,
      benchmark_samples: routingQuality.benchmark_samples,
    },
  };
}

export function applyRoutingBenchmarkQualityToProfiles(input: {
  readonly latestProfile: ObservedPerformanceProfile | null;
  readonly difficultyProfiles: Partial<
    Record<BenchmarkDifficultyBucket, ObservedPerformanceProfile | null>
  >;
  readonly samples: readonly ObservedPerformanceSample[];
  readonly nowMs?: number;
}): {
  readonly latestProfile: ObservedPerformanceProfile | null;
  readonly difficultyProfiles: Partial<
    Record<BenchmarkDifficultyBucket, ObservedPerformanceProfile | null>
  >;
} {
  const routingQuality = resolveRoutingBenchmarkQuality(input.samples);
  if (!routingQuality) {
    return {
      latestProfile: input.latestProfile,
      difficultyProfiles: input.difficultyProfiles,
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  const baseProfile = input.latestProfile;
  const endpointId = baseProfile?.endpoint_id ?? input.samples[0]?.endpoint_id;
  const endpointVersion =
    baseProfile?.endpoint_version ??
    input.samples.find((sample) => sample.source_type === "benchmark")?.endpoint_version ??
    input.samples[0]?.endpoint_version;
  if (!endpointId || !endpointVersion) {
    return {
      latestProfile: input.latestProfile,
      difficultyProfiles: input.difficultyProfiles,
    };
  }

  const latestProfile: ObservedPerformanceProfile = {
    ...(baseProfile ?? {
      endpoint_id: endpointId,
      endpoint_version: endpointVersion,
      measured_at_ms: nowMs,
      measurement_window: {
        started_at_ms: nowMs,
        ended_at_ms: nowMs,
      },
      sample_size: routingQuality.benchmark_samples,
      sources: {
        benchmark_samples: routingQuality.benchmark_samples,
        live_request_samples: 0,
      },
      latency_ms_p50: 0,
      latency_ms_p95: 0,
      failure_rate: 0,
      freshness_score: 1,
      confidence_score: 0,
    }),
    judge_score: routingQuality.judge_score,
    quality_score: routingQuality.quality_score,
    measured_at_ms: baseProfile?.measured_at_ms ?? nowMs,
    sample_size: Math.max(baseProfile?.sample_size ?? 0, routingQuality.benchmark_samples),
    sources: {
      live_request_samples: baseProfile?.sources.live_request_samples ?? 0,
      benchmark_samples: routingQuality.benchmark_samples,
    },
  };

  const difficultyProfiles: Partial<
    Record<BenchmarkDifficultyBucket, ObservedPerformanceProfile | null>
  > = { ...input.difficultyProfiles };

  for (const bucket of DIFFICULTY_BUCKETS) {
    const bucketScore = routingQuality.scoresByBucket[bucket];
    if (bucketScore.cases <= 0) {
      continue;
    }
    const existing = difficultyProfiles[bucket];
    difficultyProfiles[bucket] = {
      ...(existing ?? {
        endpoint_id: endpointId,
        endpoint_version: endpointVersion,
        measured_at_ms: nowMs,
        measurement_window: {
          started_at_ms: nowMs,
          ended_at_ms: nowMs,
        },
        sample_size: bucketScore.cases,
        sources: {
          benchmark_samples: bucketScore.cases,
          live_request_samples: 0,
        },
        latency_ms_p50: 0,
        latency_ms_p95: 0,
        failure_rate: 0,
        freshness_score: 1,
        confidence_score: 0,
      }),
      judge_score: bucketScore.score,
      quality_score: bucketScore.score,
      sample_size: bucketScore.cases,
      sources: {
        live_request_samples: existing?.sources.live_request_samples ?? 0,
        benchmark_samples: bucketScore.cases,
      },
    };
  }

  return {
    latestProfile,
    difficultyProfiles,
  };
}

export interface EffortBenchmarkEvidenceSubject {
  readonly endpointId: string;
  readonly modelId?: string | null;
  readonly providerId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly overallScore?: number | null;
}

function isNamedEffort(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Run 106 R5 (producer): resolve a borrowed, related-effort benchmark score for a provider-default arm.
 *
 * A provider-default arm (`reasoningEffort` null/undefined) serves a dynamic effort and therefore has no
 * effort-encoded benchmark key of its own. When it also has no exact benchmark evidence, the only defensible
 * signal is a SIBLING fixed-effort arm of the same model (and provider, when both are known). The borrowed
 * score is returned raw here; the router-side consumer (`resolveBorrowedQualityPrior`) applies the
 * documented symmetric regression toward neutral and labels it `borrowed`, so it never appears as exact
 * benchmark evidence.
 *
 * Selection is deterministic: the sibling with the highest exact `overallScore` wins, ties broken by
 * endpoint id ascending, so the prior is stable across repeated snapshots.
 */
export function resolveRelatedEffortOverallScore(input: {
  readonly endpointId: string;
  readonly modelId?: string | null;
  readonly providerId?: string | null;
  readonly reasoningEffort?: string | null;
  readonly subjects: readonly EffortBenchmarkEvidenceSubject[];
}): number | null {
  // Only a provider-default arm borrows. A fixed-effort arm names its own effort and must never be
  // credited with another effort's evidence.
  if (isNamedEffort(input.reasoningEffort)) {
    return null;
  }
  // A sibling lookup needs a model key; without one there is no defensible "same model" match.
  if (!isNamedEffort(input.modelId)) {
    return null;
  }
  // If this arm already has exact benchmark evidence, borrowing would be a downgrade, not a prior.
  const own = input.subjects.find((subject) => subject.endpointId === input.endpointId);
  if (typeof own?.overallScore === "number" && Number.isFinite(own.overallScore)) {
    return null;
  }

  const sameProvider = (subject: EffortBenchmarkEvidenceSubject): boolean => {
    if (isNamedEffort(input.providerId) && isNamedEffort(subject.providerId)) {
      return input.providerId === subject.providerId;
    }
    return true;
  };

  const siblings = input.subjects
    .filter((subject) => subject.endpointId !== input.endpointId)
    .filter((subject) => subject.modelId === input.modelId)
    .filter((subject) => isNamedEffort(subject.reasoningEffort))
    .filter(
      (subject) =>
        typeof subject.overallScore === "number" && Number.isFinite(subject.overallScore),
    )
    .filter(sameProvider);

  if (siblings.length === 0) {
    return null;
  }

  const best = siblings.reduce((best, candidate) => {
    const bestScore = best.overallScore as number;
    const candidateScore = candidate.overallScore as number;
    if (candidateScore !== bestScore) {
      return candidateScore > bestScore ? candidate : best;
    }
    return candidate.endpointId.localeCompare(best.endpointId) < 0 ? candidate : best;
  });

  return best.overallScore as number;
}
