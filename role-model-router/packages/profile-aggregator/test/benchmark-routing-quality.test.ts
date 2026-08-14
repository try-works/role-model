import { describe, expect, test } from "vitest";

import type { ObservedPerformanceSample } from "../src/index.js";
import {
  applyRoutingBenchmarkQualityToProfiles,
  resolveRoutingBenchmarkQuality,
} from "../src/index.js";

function benchmarkSample(input: {
  readonly score: number;
  readonly bucket: "easy" | "medium" | "hard";
  readonly mode?: "quick" | "full";
  readonly id: string;
}): ObservedPerformanceSample {
  return {
    endpoint_id: "deepseek.litellm.global.deepseek-v4-pro",
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

describe("resolveRoutingBenchmarkQuality", () => {
  test("runtime package export resolves the built JavaScript module", async () => {
    const runtime = await import("@role-model-router/profile-aggregator");

    expect(typeof runtime.aggregateObservedPerformanceSamples).toBe("function");
    expect(typeof runtime.resolveRoutingBenchmarkQuality).toBe("function");
  });

  test("uses quick hard mean for quick-only runs instead of averaging empty buckets", () => {
    const quality = resolveRoutingBenchmarkQuality(
      Array.from({ length: 12 }, (_, index) =>
        benchmarkSample({
          id: `quick-${index}`,
          bucket: "hard",
          mode: "quick",
          score: 0.71,
        }),
      ),
    );

    expect(quality?.judge_score).toBeCloseTo(0.71, 5);
    expect(quality?.benchmark_samples).toBe(12);
    expect(quality?.scoresByBucket.hard).toMatchObject({ score: 0.71, cases: 12 });
    expect(quality?.scoresByBucket.easy.cases).toBe(0);
    expect(quality?.scoresByBucket.medium.cases).toBe(0);
  });

  test("blends full-hard and quick-hard scores when both exist", () => {
    const quality = resolveRoutingBenchmarkQuality([
      benchmarkSample({ id: "full-h1", bucket: "hard", mode: "full", score: 0.4 }),
      benchmarkSample({ id: "full-h2", bucket: "hard", mode: "full", score: 0.6 }),
      benchmarkSample({ id: "quick-h1", bucket: "hard", mode: "quick", score: 0.8 }),
      benchmarkSample({ id: "quick-h2", bucket: "hard", mode: "quick", score: 1 }),
      benchmarkSample({ id: "full-e1", bucket: "easy", mode: "full", score: 0.9 }),
      benchmarkSample({ id: "full-m1", bucket: "medium", mode: "full", score: 0.7 }),
    ]);

    expect(quality?.hardBlend).toEqual({
      full: 0.5,
      quick: 0.9,
      blended: 0.7,
    });
    expect(quality?.scoresByBucket.hard).toMatchObject({ score: 0.7, cases: 4 });
    expect(quality?.scoresByBucket.easy).toMatchObject({ score: 0.9, cases: 1 });
    expect(quality?.scoresByBucket.medium).toMatchObject({ score: 0.7, cases: 1 });
    expect(quality?.judge_score).toBeCloseTo((0.9 + 0.7 + 0.7 * 4) / 6, 5);
  });

  test("creates a routing profile when only benchmark samples exist", () => {
    const enriched = applyRoutingBenchmarkQualityToProfiles({
      latestProfile: null,
      difficultyProfiles: {},
      samples: [benchmarkSample({ id: "quick-h1", bucket: "hard", mode: "quick", score: 0.8 })],
    });

    expect(enriched.latestProfile?.judge_score).toBeCloseTo(0.8, 5);
    expect(enriched.latestProfile?.sources.benchmark_samples).toBe(1);
    expect(enriched.difficultyProfiles.hard?.judge_score).toBeCloseTo(0.8, 5);
  });
});
