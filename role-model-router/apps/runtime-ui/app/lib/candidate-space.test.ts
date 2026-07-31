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
    expect(formatCandidateMetricTriplet(firstPoint)).toMatch(/^C\d+ · Q\d+ · S\d+ · Selected$/);
    expect(formatRouteScore(0.841)).toBe("0.841");
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
