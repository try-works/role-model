import { describe, expect, test } from "vitest";

import { STRATEGY_WEIGHTS } from "@role-model-router/core";

import { decodeLegacyRoutingStrategy, resolveRequestStrategy } from "../src/scoring-strategy.js";

/**
 * Run 103 / SP2c - the legacy single-key config migrates to the two-axis posture, and the
 * request-level helper turns a posture plus the difficulty result into the effective strategy
 * (design document sections 3 and 5; requirement R1/R2).
 */
describe("legacy routing strategy migration", () => {
  test("baseline spellings keep the baseline mode and the balanced preset", () => {
    for (const spelling of ["baseline", "basic", "balanced"]) {
      const posture = decodeLegacyRoutingStrategy(spelling);
      expect(posture.mode, spelling).toBe("baseline");
      expect(posture.operator?.name, spelling).toBe("balanced");
    }
  });

  test("scoring spellings become the baseline mode plus that strategy", () => {
    expect(decodeLegacyRoutingStrategy("quality").operator?.weights).toEqual(
      STRATEGY_WEIGHTS.quality,
    );
    expect(decodeLegacyRoutingStrategy("high-quality").operator?.name).toBe("quality");
    expect(decodeLegacyRoutingStrategy("latency-first").operator?.name).toBe("latency");
    expect(decodeLegacyRoutingStrategy("low-cost").operator?.name).toBe("cost");
    expect(decodeLegacyRoutingStrategy("quality").mode).toBe("baseline");
  });

  test("mode spellings keep their mode and leave the scoring strategy unset", () => {
    expect(decodeLegacyRoutingStrategy("difficulty").mode).toBe("difficulty");
    expect(decodeLegacyRoutingStrategy("hybrid").mode).toBe("hybrid");
    expect(decodeLegacyRoutingStrategy("controller").mode).toBe("intelligent");
    expect(decodeLegacyRoutingStrategy("intelligent").mode).toBe("intelligent");
    expect(decodeLegacyRoutingStrategy("difficulty").operator).toBeNull();
  });

  test("unset and the legacy craft-ask alias decode to the default posture without degradations", () => {
    for (const spelling of [null, undefined, "", "craft-ask"]) {
      const posture = decodeLegacyRoutingStrategy(spelling);
      expect(posture.mode).toBe("baseline");
      expect(posture.operator).toBeNull();
      expect(posture.degradations).toEqual([]);
    }
  });
});

describe("request strategy resolution", () => {
  test("baseline mode uses the operator strategy", () => {
    const posture = decodeLegacyRoutingStrategy("quality");
    const resolution = resolveRequestStrategy({ posture, effectiveRoutingMode: "baseline" });
    expect(resolution.strategy).toBe("quality");
    expect(resolution.source).toBe("operator");
  });

  test("difficulty mode lets a decisive bucket override an unpinned operator strategy", () => {
    const posture = decodeLegacyRoutingStrategy("latency");
    const resolution = resolveRequestStrategy({
      posture,
      effectiveRoutingMode: "difficulty",
      difficulty: "hard",
    });
    expect(resolution.strategy).toBe("quality");
    expect(resolution.source).toBe("difficulty");
  });

  test("a pinned posture keeps the operator strategy under a decisive bucket", () => {
    const posture = { ...decodeLegacyRoutingStrategy("latency"), pinWeights: true };
    const resolution = resolveRequestStrategy({
      posture,
      effectiveRoutingMode: "difficulty",
      difficulty: "hard",
    });
    expect(resolution.strategy).toBe("latency");
    expect(resolution.discarded).toEqual({ source: "difficulty", strategy: "quality" });
  });
});
