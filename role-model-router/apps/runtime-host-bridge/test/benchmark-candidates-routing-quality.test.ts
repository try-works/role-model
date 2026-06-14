import { describe, expect, test } from "vitest";

import type { ObservedPerformanceSample } from "@role-model-router/profile-aggregator";
import { resolveRoutingBenchmarkQuality } from "@role-model-router/profile-aggregator";

import {
  buildBenchmarkCapabilityForEndpoint,
  type BenchmarkSummaryResponse,
} from "../src/benchmark-summary.js";

const endpointId = "deepseek.litellm.global.deepseek-v4-pro";

function benchmarkSample(input: {
  readonly score: number;
  readonly bucket: "easy" | "medium" | "hard";
  readonly mode?: "quick" | "full";
  readonly id: string;
}): ObservedPerformanceSample {
  return {
    endpoint_id: endpointId,
    endpoint_version: "v1",
    source_type: "benchmark",
    benchmark_mode: input.mode ?? "full",
    difficulty_bucket: input.bucket,
    timestamp_ms: 1_000,
    latency_ms: 900,
    judge_score: input.score,
    request_id: input.id,
  };
}

function quickOnlyArtifactSummary(): BenchmarkSummaryResponse {
  return {
    runId: "run-quick-only",
    completedAtMs: 600,
    mode: "quick",
    suiteId: "routing-capability-v2",
    suiteVersion: "2.0",
    judgeEndpointId: "judge.quick",
    judgeModelId: "judge-model",
    artifactRoot: "run-quick-only",
    subjects: [
      {
        endpointId,
        modelId: "deepseek-v4-pro",
        overallScore: 0.9,
        scoresByBucket: {
          easy: { score: 0, cases: 0 },
          medium: { score: 0, cases: 0 },
          hard: { score: 0.9, cases: 2 },
        },
        passingCaseIds: ["quick-h1", "quick-h2"],
        caseCount: 2,
      },
    ],
    caseComparisons: [],
    caseAudits: [],
    manifest: {
      executionCompletedAtMs: 500,
      gradingCompletedAtMs: 600,
      judgeArtifactCount: 2,
      compareArtifactCount: 0,
    },
  };
}

describe("router candidate routing benchmark quality", () => {
  test("exposes hardBlend and routingQualityScore distinct from quick artifact overallScore", () => {
    const benchmarkSamples = [
      benchmarkSample({ id: "full-h1", bucket: "hard", mode: "full", score: 0.4 }),
      benchmarkSample({ id: "full-h2", bucket: "hard", mode: "full", score: 0.6 }),
      benchmarkSample({ id: "quick-h1", bucket: "hard", mode: "quick", score: 0.8 }),
      benchmarkSample({ id: "quick-h2", bucket: "hard", mode: "quick", score: 1 }),
      benchmarkSample({ id: "full-e1", bucket: "easy", mode: "full", score: 0.9 }),
      benchmarkSample({ id: "full-m1", bucket: "medium", mode: "full", score: 0.7 }),
    ];

    const routingBenchmarkQuality = resolveRoutingBenchmarkQuality(benchmarkSamples);
    expect(routingBenchmarkQuality?.hardBlend).toEqual({
      full: 0.5,
      quick: 0.9,
      blended: 0.7,
    });

    const routingQualityScore = routingBenchmarkQuality?.quality_score ?? null;
    expect(routingQualityScore).not.toBeNull();

    const benchmarkCapability = buildBenchmarkCapabilityForEndpoint({
      endpointId,
      latestProfile: {
        judge_score: routingQualityScore,
        quality_score: routingQualityScore,
        sample_size: benchmarkSamples.length,
        measured_at_ms: 1_700_000_000_000,
        freshness_score: 0.8,
        sources: {
          benchmark_samples: benchmarkSamples.length,
          live_request_samples: 0,
        },
      },
      summary: quickOnlyArtifactSummary(),
    });

    expect(benchmarkCapability?.overallScore).toBe(0.9);
    expect(routingQualityScore).not.toBe(benchmarkCapability?.overallScore);
    expect(routingQualityScore).toBeCloseTo(0.733333, 4);
  });
});
