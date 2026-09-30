import { describe, expect, test } from "vitest";

import {
  decodeLegacyRoutingStrategy,
  resolveRequestStrategy,
  summarizeStrategyProvenance,
  weightsDigest,
} from "../src/scoring-strategy.js";

/**
 * Run 103 / SP3 - every decision must answer which strategy was used, who chose it and with which
 * weights (design document section 6.5; requirement R3).
 */
describe("strategy provenance", () => {
  const weights = {
    quality: 0.35,
    latency: 0.1,
    throughput: 0.05,
    cost: 0.35,
    reliability: 0.1,
    preference: 0.05,
  } as const;

  test("the digest is stable for equal weights regardless of key order", () => {
    expect(weightsDigest(weights)).toBe(weightsDigest({ ...weights }));
    expect(weightsDigest(weights)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("the digest changes when any weight changes", () => {
    expect(weightsDigest(weights)).not.toBe(weightsDigest({ ...weights, cost: 0.4 }));
    expect(weightsDigest(weights)).not.toBe(weightsDigest({ ...weights, quality: 0.3 }));
  });

  test("summarizes an operator resolution with its source and digest", () => {
    const posture = decodeLegacyRoutingStrategy("quality");
    const resolution = resolveRequestStrategy({ posture, effectiveRoutingMode: "baseline" });
    const provenance = summarizeStrategyProvenance(resolution);
    expect(provenance.strategy).toBe("quality");
    expect(provenance.source).toBe("operator");
    expect(provenance.weightsDigest).toBe(weightsDigest(resolution.weights));
    expect(provenance.discarded).toBeUndefined();
  });

  test("carries the discarded override when a pinned posture suppressed difficulty", () => {
    const posture = { ...decodeLegacyRoutingStrategy("latency"), pinWeights: true };
    const resolution = resolveRequestStrategy({
      posture,
      effectiveRoutingMode: "difficulty",
      difficulty: "hard",
    });
    const provenance = summarizeStrategyProvenance(resolution);
    expect(provenance.source).toBe("operator");
    expect(provenance.discarded).toEqual({ source: "difficulty", strategy: "quality" });
  });
});
