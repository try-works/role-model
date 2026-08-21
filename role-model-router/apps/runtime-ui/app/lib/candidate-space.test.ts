import { describe, expect, test } from "vitest";

import {
  buildCandidateSpacePoints,
  formatCandidateMetricTriplet,
  formatRouteScore,
  projectCandidateSpacePoint,
} from "./candidate-space";
import type { RouterCandidate } from "./runtime-api";

function candidate(
  partial: Partial<RouterCandidate> & Pick<RouterCandidate, "endpointId" | "modelId">,
): RouterCandidate {
  return {
    providerId: "test",
    sourceType: "remote",
    routingEligible: true,
    ...partial,
  };
}

describe("buildCandidateSpacePoints", () => {
  test("uses exact benchmark capability before a generic routing profile score", () => {
    const points = buildCandidateSpacePoints([
      candidate({
        endpointId: "deepseek.flash-max",
        modelId: "deepseek/deepseek-v4-flash",
        reasoningEffort: "max",
        routingQualityScore: 0.2,
        benchmarkCapability: {
          evidenceSource: "run-artifact",
          overallScore: 0.91,
          benchmarkSamples: 4,
          sampleCount: 4,
          measuredAtMs: 100,
          freshnessScore: 1,
          lastRunId: "run-max",
          lastRunCompletedAtMs: 100,
          judgeEndpointId: "judge",
        },
      }),
    ]);

    expect(points[0]?.quality).toBe(0.91);
    expect(points[0]?.tags).toContain("Benchmark run");
  });

  test("projects quality from routingQualityScore and speed from latency p50", () => {
    const points = buildCandidateSpacePoints([
      candidate({
        endpointId: "a",
        modelId: "vendor/alpha",
        routingQualityScore: 0.9,
        latestProfile: { latency_ms_p50: 100 },
        preferred: true,
      }),
      candidate({
        endpointId: "b",
        modelId: "vendor/beta",
        routingQualityScore: 0.4,
        latestProfile: { latency_ms_p50: 400 },
      }),
    ]);

    expect(points).toHaveLength(2);
    expect(points[0]?.endpointId).toBe("a");
    expect(points[0]?.selected).toBe(true);
    expect(points[0]?.quality).toBeCloseTo(0.9, 5);
    expect(points[0]?.speed).toBeGreaterThan(points[1]?.speed ?? 0);
    expect(points[0]?.label).toBe("alpha");
  });

  test("inverts cost so cheaper input pricing scores higher", () => {
    const points = buildCandidateSpacePoints([
      candidate({
        endpointId: "cheap",
        modelId: "cheap/model",
        latestProfile: { pricing: { inputPer1M: 1 } },
      }),
      candidate({
        endpointId: "pricey",
        modelId: "pricey/model",
        latestProfile: { pricing: { inputPer1M: 10 } },
      }),
    ]);

    const cheap = points.find((point) => point.endpointId === "cheap");
    const pricey = points.find((point) => point.endpointId === "pricey");
    expect(cheap?.cost).toBeGreaterThan(pricey?.cost ?? 0);
  });

  test("uses models.dev pricing map when candidate profiles omit pricing", () => {
    const points = buildCandidateSpacePoints(
      [
        candidate({
          endpointId: "deepseek",
          modelId: "deepseek/deepseek-v4-flash",
          latestProfile: { latency_ms_p50: 1000 },
        }),
        candidate({
          endpointId: "kimi",
          modelId: "moonshot/kimi-k3",
          latestProfile: { latency_ms_p50: 2000 },
        }),
      ],
      5,
      new Map([
        ["deepseek/deepseek-v4-flash", 0.14],
        ["moonshot/kimi-k3", 3],
      ]),
    );

    const deepseek = points.find((point) => point.endpointId === "deepseek");
    const kimi = points.find((point) => point.endpointId === "kimi");
    expect(deepseek?.cost).toBeGreaterThan(kimi?.cost ?? 0);
    // Ratio to cheapest: deepseek = 1.0, kimi = 0.14/3 ≈ 0.047 — not pinned to C0.
    expect(Math.round((deepseek?.cost ?? 0) * 100)).toBe(100);
    expect(Math.round((kimi?.cost ?? 0) * 100)).toBe(5);
    // Ratio to fastest: deepseek = 1.0, kimi = 1000/2000 = 0.5 — not pinned to S0.
    expect(Math.round((deepseek?.speed ?? 0) * 100)).toBe(100);
    expect(Math.round((kimi?.speed ?? 0) * 100)).toBe(50);
  });

  test("does not pin the slowest or priciest cohort member to zero after benchmarks", () => {
    const points = buildCandidateSpacePoints(
      [
        candidate({
          endpointId: "deepseek",
          modelId: "deepseek/deepseek-v4-flash",
          routingQualityScore: 0.88,
          latestProfile: {
            latency_ms_p50: 7127.5,
            pricing: { inputPer1M: 0.14 },
          },
        }),
        candidate({
          endpointId: "kimi",
          modelId: "moonshot/kimi-k3",
          routingQualityScore: 0.85,
          latestProfile: {
            latency_ms_p50: 18582,
            pricing: { inputPer1M: 3 },
          },
        }),
      ],
      5,
    );

    const kimi = points.find((point) => point.endpointId === "kimi");
    expect(kimi?.cost ?? 0).toBeGreaterThan(0);
    expect(kimi?.speed ?? 0).toBeGreaterThan(0);
    expect(Math.round((kimi?.speed ?? 0) * 100)).toBe(38);
    expect(Math.round((kimi?.cost ?? 0) * 100)).toBe(5);
  });

  test("marks ignored candidates excluded and formats C/Q/S legend lines", () => {
    const points = buildCandidateSpacePoints([
      candidate({
        endpointId: "ok",
        modelId: "ok/model",
        routingQualityScore: 0.8,
        preferred: true,
      }),
      candidate({
        endpointId: "skip",
        modelId: "skip/model",
        routingEligible: false,
        ignored: true,
        routingQualityScore: 0.95,
      }),
    ]);

    // Excluded-only rows are dropped when eligible inventory exists.
    expect(points.every((point) => point.endpointId !== "skip")).toBe(true);
    const firstPoint = points[0];
    expect(firstPoint).toBeDefined();
    expect(formatCandidateMetricTriplet(firstPoint)).toMatch(
      /^C— · Q80 · S— · No live telemetry · Selected$/,
    );
    expect(formatRouteScore(0.841)).toBe("0.841");
  });

  test("never synthesizes a default score for an un-scored candidate", () => {
    const points = buildCandidateSpacePoints([
      candidate({
        endpointId: "bare",
        modelId: "vendor/bare",
      }),
    ]);

    const bare = points.find((point) => point.endpointId === "bare");
    expect(bare).toBeDefined();
    expect(bare?.quality).toBeNull();
    expect(bare?.speed).toBeNull();
    expect(bare?.cost).toBeNull();
    expect(bare?.routeScore).toBeNull();
    expect(bare?.evidence).toBe("none");
    // The legend must not fabricate 55/58/0 — every metric is "no data".
    expect(formatCandidateMetricTriplet(bare!)).toBe(
      "C— · Q— · S— · No live telemetry · Selected",
    );
    expect(formatRouteScore(null)).toBe("—");
  });

  test("computes route score only from present metrics (partial evidence)", () => {
    const points = buildCandidateSpacePoints([
      candidate({
        endpointId: "partial",
        modelId: "vendor/partial",
        routingQualityScore: 0.9,
      }),
    ]);

    const partial = points.find((point) => point.endpointId === "partial");
    expect(partial?.quality).toBeCloseTo(0.9, 5);
    expect(partial?.speed).toBeNull();
    expect(partial?.cost).toBeNull();
    expect(partial?.routeScore).toBeCloseTo(0.9, 5);
    expect(partial?.evidence).toBe("partial");
  });
});

describe("projectCandidateSpacePoint", () => {
  test("lifts markers above the cost×speed floor along quality", () => {
    const low = projectCandidateSpacePoint({
      cost: 0.5,
      quality: 0.2,
      speed: 0.5,
      routeScore: 0.5,
    });
    const high = projectCandidateSpacePoint({
      cost: 0.5,
      quality: 0.9,
      speed: 0.5,
      routeScore: 0.5,
    });
    expect(low.floorX).toBeCloseTo(high.floorX, 5);
    expect(low.floorY).toBeCloseTo(high.floorY, 5);
    expect(high.markerY).toBeLessThan(low.markerY);
    expect(high.radius).toBeGreaterThanOrEqual(8);
  });

  test("pulls cost left and speed right from the origin", () => {
    const origin = projectCandidateSpacePoint({ cost: 0, quality: 0, speed: 0, routeScore: 0 });
    const cost = projectCandidateSpacePoint({ cost: 1, quality: 0, speed: 0, routeScore: 0 });
    const speed = projectCandidateSpacePoint({ cost: 0, quality: 0, speed: 1, routeScore: 0 });
    expect(origin.markerX).toBe(200);
    expect(origin.markerY).toBe(175);
    expect(cost.markerX).toBeLessThan(origin.markerX);
    expect(speed.markerX).toBeGreaterThan(origin.markerX);
  });
});
