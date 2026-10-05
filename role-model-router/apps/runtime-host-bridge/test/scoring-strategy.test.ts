import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { STRATEGY_WEIGHTS } from "@role-model-router/core";

import {
  SCORING_PRESETS,
  SCORING_STRATEGY_NAMES,
  WEIGHT_METRICS,
  WeightProfile,
  normalizeScoringStrategyName,
  resolveScoringWeights,
} from "../src/scoring-strategy.js";

/**
 * Run 103 / SP1 - the scoring-strategy vocabulary is the single owner of the canonical
 * names, the legacy spellings and the preset weights (R1, R9, R10 of
 * `.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md`).
 */
describe("scoring strategy vocabulary", () => {
  const validWeights = {
    quality: 0.35,
    latency: 0.1,
    throughput: 0.05,
    cost: 0.35,
    reliability: 0.1,
    preference: 0.05,
  } as const;

  test("exposes exactly the canonical names", () => {
    expect([...SCORING_STRATEGY_NAMES]).toEqual([
      "balanced",
      "quality",
      "latency",
      "cost",
      "custom",
    ]);
    expect([...WEIGHT_METRICS]).toEqual([
      "quality",
      "latency",
      "throughput",
      "cost",
      "reliability",
      "preference",
    ]);
  });

  test("normalizes every legacy spelling from the design document", () => {
    expect(normalizeScoringStrategyName("basic")).toBe("balanced");
    expect(normalizeScoringStrategyName("balanced")).toBe("balanced");
    expect(normalizeScoringStrategyName("low-latency")).toBe("latency");
    expect(normalizeScoringStrategyName("latency-first")).toBe("latency");
    expect(normalizeScoringStrategyName("high-quality")).toBe("quality");
    expect(normalizeScoringStrategyName("low-cost")).toBe("cost");
    expect(normalizeScoringStrategyName("Quality")).toBe("quality");
  });

  test("refuses an unknown spelling", () => {
    expect(normalizeScoringStrategyName("turbo")).toBeNull();
    expect(normalizeScoringStrategyName("")).toBeNull();
  });

  test("presets reuse the core weight tables", () => {
    expect(SCORING_PRESETS.balanced).toEqual(STRATEGY_WEIGHTS.balanced);
    expect(SCORING_PRESETS.quality).toEqual(STRATEGY_WEIGHTS.quality);
    expect(SCORING_PRESETS.latency).toEqual(STRATEGY_WEIGHTS.latency);
    expect(SCORING_PRESETS.cost).toEqual(STRATEGY_WEIGHTS.cost);
  });

  test("resolves a preset plan to its preset weights", () => {
    expect(resolveScoringWeights({ _tag: "Latency" })).toEqual(STRATEGY_WEIGHTS.latency);
  });

  test("resolves a custom plan to the supplied weights", () => {
    expect(resolveScoringWeights({ _tag: "Custom", weights: validWeights })).toEqual(validWeights);
  });

  test("accepts a valid weight profile", () => {
    expect(Schema.decodeUnknownSync(WeightProfile)(validWeights)).toEqual(validWeights);
  });

  test("rejects a profile whose sum is not one, a negative weight and NaN", () => {
    expect(() =>
      Schema.decodeUnknownSync(WeightProfile)({ ...validWeights, cost: 0.9 }),
    ).toThrowError();
    expect(() =>
      Schema.decodeUnknownSync(WeightProfile)({ ...validWeights, cost: -0.1 }),
    ).toThrowError();
    expect(() =>
      Schema.decodeUnknownSync(WeightProfile)({ ...validWeights, cost: Number.NaN }),
    ).toThrowError();
  });

  test("every canonical name maps to a plan and a weight profile", () => {
    for (const name of SCORING_STRATEGY_NAMES) {
      const weights =
        name === "custom"
          ? resolveScoringWeights({ _tag: "Custom", weights: validWeights })
          : resolveScoringWeights(
              {
                balanced: { _tag: "Balanced" },
                quality: { _tag: "Quality" },
                latency: { _tag: "Latency" },
                cost: { _tag: "Cost" },
              }[name as "balanced" | "quality" | "latency" | "cost"],
            );
      for (const metric of WEIGHT_METRICS) {
        expect(typeof weights[metric], `${name}.${metric}`).toBe("number");
      }
    }
  });
});
