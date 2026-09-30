import { describe, expect, test } from "vitest";

import {
  decodeLegacyRoutingStrategy,
  resolveRequestStrategy,
  summarizeStrategyProvenance,
  weightsDigest,
  withStrategyProvenance,
} from "../src/scoring-strategy.js";

/**
 * Run 103 / SP3b - the routing diagnostics carry the strategy receipt without losing the fields a
 * mapper already produced (design document section 6.5; requirement R3).
 */
describe("strategy diagnostics receipt", () => {
  const posture = decodeLegacyRoutingStrategy("quality");
  const resolution = resolveRequestStrategy({ posture, effectiveRoutingMode: "baseline" });

  test("adds the receipt and preserves the existing diagnostics fields", () => {
    const diagnostics = withStrategyProvenance(
      { aliasResolution: { aliasId: "quality.remote-only" }, routingMode: { source: "alias-default" } },
      resolution,
    );
    expect(diagnostics.aliasResolution).toEqual({ aliasId: "quality.remote-only" });
    expect(diagnostics.routingMode).toEqual({ source: "alias-default" });
    expect(diagnostics.strategyResolution).toEqual({
      strategy: "quality",
      source: "operator",
      weights: resolution.weights,
      weightsDigest: weightsDigest(resolution.weights),
    });
  });

  test("works when no diagnostics were produced yet", () => {
    const diagnostics = withStrategyProvenance(undefined, resolution);
    expect(diagnostics.strategyResolution.source).toBe("operator");
  });

  test("propagates a discarded override", () => {
    const pinned = { ...decodeLegacyRoutingStrategy("latency"), pinWeights: true };
    const pinnedResolution = resolveRequestStrategy({
      posture: pinned,
      effectiveRoutingMode: "difficulty",
      difficulty: "hard",
    });
    const diagnostics = withStrategyProvenance({}, pinnedResolution);
    expect(diagnostics.strategyResolution.discarded).toEqual({
      source: "difficulty",
      strategy: "quality",
    });
    expect(diagnostics.strategyResolution.source).toBe("operator");
    expect(summarizeStrategyProvenance(pinnedResolution).strategy).toBe("latency");
  });
});
