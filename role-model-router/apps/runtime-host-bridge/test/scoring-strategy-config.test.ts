import { describe, expect, test } from "vitest";

import { STRATEGY_WEIGHTS } from "@role-model-router/core";

import { decodeRoutingPosture } from "../src/scoring-strategy.js";

/**
 * Run 103 / SP2b - decoding the routing block into the posture the ladder consumes
 * (design document sections 3 and 4, requirement R1).
 */
describe("routing posture decode", () => {
  const customWeights = {
    quality: 0.35,
    latency: 0.1,
    throughput: 0.05,
    cost: 0.35,
    reliability: 0.1,
    preference: 0.05,
  };

  test("decodes a preset posture with its preset weights", () => {
    const posture = decodeRoutingPosture({ scoringStrategy: "quality" });
    expect(posture.scoringStrategy).toBe("quality");
    expect(posture.operator).toEqual({ name: "quality", weights: STRATEGY_WEIGHTS.quality });
    expect(posture.degradations).toEqual([]);
  });

  test("normalizes a legacy spelling on read", () => {
    const posture = decodeRoutingPosture({ scoringStrategy: "latency-first" });
    expect(posture.scoringStrategy).toBe("latency");
    expect(posture.operator?.weights).toEqual(STRATEGY_WEIGHTS.latency);
  });

  test("decodes a valid custom profile", () => {
    const posture = decodeRoutingPosture({ scoringStrategy: "custom", weights: customWeights });
    expect(posture.scoringStrategy).toBe("custom");
    expect(posture.operator).toEqual({ name: "custom", weights: customWeights });
    expect(posture.degradations).toEqual([]);
  });

  test("records a degradation when custom weights are missing", () => {
    const posture = decodeRoutingPosture({ scoringStrategy: "custom" });
    expect(posture.scoringStrategy).toBeNull();
    expect(posture.operator).toBeNull();
    expect(posture.degradations.join(" ")).toMatch(/custom/i);
  });

  test("records a degradation and fails closed when custom weights are invalid", () => {
    const posture = decodeRoutingPosture({
      scoringStrategy: "custom",
      weights: { ...customWeights, cost: 0.9 },
    });
    expect(posture.operator).toBeNull();
    expect(posture.degradations.length).toBeGreaterThan(0);
  });

  test("records a degradation for an unknown spelling", () => {
    const posture = decodeRoutingPosture({ scoringStrategy: "turbo" });
    expect(posture.scoringStrategy).toBeNull();
    expect(posture.degradations.join(" ")).toMatch(/turbo/);
  });

  test("normalizes the mode and keeps the pin flag", () => {
    expect(decodeRoutingPosture({ mode: "controller" }).mode).toBe("intelligent");
    expect(decodeRoutingPosture({ mode: "difficulty" }).mode).toBe("difficulty");
    expect(decodeRoutingPosture({ pinWeights: true }).pinWeights).toBe(true);
    expect(decodeRoutingPosture({}).mode).toBe("baseline");
  });

  test("an unset strategy decodes to a null operator without degradations", () => {
    const posture = decodeRoutingPosture({});
    expect(posture.scoringStrategy).toBeNull();
    expect(posture.operator).toBeNull();
    expect(posture.degradations).toEqual([]);
  });
});
