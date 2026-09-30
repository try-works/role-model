import { describe, expect, test } from "vitest";

import { resolveControllerStrategyApplication } from "../src/scoring-strategy.js";

/**
 * Run 103 / SP4b - a pinned posture keeps its weights against the controller's strategy directive
 * while the controller's other directives still apply (design document section 5; requirement R4).
 */
describe("controller strategy pin rule", () => {
  test("an unpinned posture applies the controller strategy", () => {
    const applied = resolveControllerStrategyApplication({
      pinWeights: false,
      requestStrategy: "latency",
      guidanceStrategy: "quality",
    });
    expect(applied.strategy).toBe("quality");
    expect(applied.discarded).toBeUndefined();
  });

  test("a pinned posture keeps the request strategy and records the discard", () => {
    const applied = resolveControllerStrategyApplication({
      pinWeights: true,
      requestStrategy: "latency",
      guidanceStrategy: "quality",
    });
    expect(applied.strategy).toBe("latency");
    expect(applied.discarded).toEqual({ source: "controller", strategy: "quality" });
  });

  test("guidance without a strategy leaves the request strategy untouched", () => {
    const applied = resolveControllerStrategyApplication({
      pinWeights: false,
      requestStrategy: "cost",
      guidanceStrategy: undefined,
    });
    expect(applied.strategy).toBe("cost");
    expect(applied.discarded).toBeUndefined();
  });

  test("a pinned posture whose guidance matches the request strategy records nothing", () => {
    const applied = resolveControllerStrategyApplication({
      pinWeights: true,
      requestStrategy: "quality",
      guidanceStrategy: "quality",
    });
    expect(applied.strategy).toBe("quality");
    expect(applied.discarded).toBeUndefined();
  });
});
