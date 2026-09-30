import { describe, expect, test } from "vitest";

import { STRATEGY_WEIGHTS } from "@role-model-router/core";

import { resolveStrategy, type StrategyResolutionInput } from "../src/scoring-strategy.js";

/**
 * Run 103 / SP2 - the resolution ladder (design document section 5, requirements R2 and R4):
 * request intent > controller directive > difficulty decisive bucket > operator strategy > balanced,
 * with `pin_weights` blocking both automatic overrides.
 */
describe("scoring strategy resolution", () => {
  const customWeights = {
    quality: 0.35,
    latency: 0.1,
    throughput: 0.05,
    cost: 0.35,
    reliability: 0.1,
    preference: 0.05,
  } as const;

  const operator = { name: "latency", weights: STRATEGY_WEIGHTS.latency } as const;

  const resolve = (overrides: Partial<StrategyResolutionInput> = {}) =>
    resolveStrategy({
      operator,
      pinWeights: false,
      difficultyRoutingActive: false,
      controllerActive: false,
      ...overrides,
    });

  test("baseline posture uses the operator strategy", () => {
    const resolution = resolve();
    expect(resolution.strategy).toBe("latency");
    expect(resolution.source).toBe("operator");
    expect(resolution.weights).toEqual(STRATEGY_WEIGHTS.latency);
  });

  test("an unset posture falls back to balanced with the default source", () => {
    const resolution = resolve({ operator: null });
    expect(resolution.strategy).toBe("balanced");
    expect(resolution.source).toBe("default");
    expect(resolution.weights).toEqual(STRATEGY_WEIGHTS.balanced);
  });

  test("a controller directive wins while unpinned", () => {
    const resolution = resolve({ controllerActive: true, controllerStrategy: "quality" });
    expect(resolution.strategy).toBe("quality");
    expect(resolution.source).toBe("controller");
    expect(resolution.discarded).toBeUndefined();
  });

  test("a pinned posture discards the controller directive and records it", () => {
    const resolution = resolve({
      pinWeights: true,
      controllerActive: true,
      controllerStrategy: "quality",
    });
    expect(resolution.strategy).toBe("latency");
    expect(resolution.source).toBe("operator");
    expect(resolution.discarded).toEqual({ source: "controller", strategy: "quality" });
  });

  test("an easy request resolves to cost while difficulty routing is active", () => {
    const resolution = resolve({ difficultyRoutingActive: true, difficulty: "easy" });
    expect(resolution.strategy).toBe("cost");
    expect(resolution.source).toBe("difficulty");
    expect(resolution.weights).toEqual(STRATEGY_WEIGHTS.cost);
  });

  test("a hard request resolves to quality while difficulty routing is active", () => {
    const resolution = resolve({ difficultyRoutingActive: true, difficulty: "hard" });
    expect(resolution.strategy).toBe("quality");
    expect(resolution.source).toBe("difficulty");
  });

  test("a medium request keeps the operator strategy", () => {
    const resolution = resolve({ difficultyRoutingActive: true, difficulty: "medium" });
    expect(resolution.strategy).toBe("latency");
    expect(resolution.source).toBe("operator");
    expect(resolution.discarded).toBeUndefined();
  });

  test("a pinned posture discards a decisive difficulty bucket and records it", () => {
    const resolution = resolve({
      pinWeights: true,
      difficultyRoutingActive: true,
      difficulty: "hard",
    });
    expect(resolution.strategy).toBe("latency");
    expect(resolution.source).toBe("operator");
    expect(resolution.discarded).toEqual({ source: "difficulty", strategy: "quality" });
  });

  test("a custom operator posture resolves to its own weights", () => {
    const resolution = resolve({
      operator: { name: "custom", weights: customWeights },
    });
    expect(resolution.strategy).toBe("custom");
    expect(resolution.source).toBe("operator");
    expect(resolution.weights).toEqual(customWeights);
  });

  test("the controller wins over difficulty when both are active and unpinned", () => {
    const resolution = resolve({
      difficultyRoutingActive: true,
      difficulty: "hard",
      controllerActive: true,
      controllerStrategy: "cost",
    });
    expect(resolution.strategy).toBe("cost");
    expect(resolution.source).toBe("controller");
  });
});
