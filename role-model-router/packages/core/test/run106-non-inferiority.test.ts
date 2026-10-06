import { describe, expect, it } from "vitest";
import { shouldPreferNonInferiorChallenger } from "../src/router.js";

describe("run106 non-inferiority preference", () => {
  const base = {
    incumbentQuality: 0.9,
    qualityMargin: 0.05,
    incumbentLatencyMs: 11000,
    incumbentCostUsd: 0.4,
  };
  it("prefers a faster+cheaper non-inferior challenger", () => {
    expect(
      shouldPreferNonInferiorChallenger({
        ...base,
        challengerQuality: 0.88,
        challengerLatencyMs: 7000,
        challengerCostUsd: 0.25,
      }),
    ).toBe(true);
  });
  it("rejects a quality-inferior challenger", () => {
    expect(
      shouldPreferNonInferiorChallenger({
        ...base,
        challengerQuality: 0.7,
        challengerLatencyMs: 7000,
        challengerCostUsd: 0.25,
      }),
    ).toBe(false);
  });
  it("rejects a challenger that is not faster", () => {
    expect(
      shouldPreferNonInferiorChallenger({
        ...base,
        challengerQuality: 0.88,
        challengerLatencyMs: 12000,
        challengerCostUsd: 0.25,
      }),
    ).toBe(false);
  });
  it("rejects a challenger that is not cheaper", () => {
    expect(
      shouldPreferNonInferiorChallenger({
        ...base,
        challengerQuality: 0.88,
        challengerLatencyMs: 7000,
        challengerCostUsd: 0.5,
      }),
    ).toBe(false);
  });
});
