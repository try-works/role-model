import { describe, expect, test } from "vitest";

import { resolveObservedCostPer1kTokens } from "../src/index.js";

/**
 * Run 98 addendum 50 — the observed-cost signal must be a rate per 1,000 tokens.
 *
 * The stage runtime wrote `cost_per_1k_tokens_est: usageEvent.cost_estimate` straight through, so once the usage
 * event carried a request total (or, before the fix, a rate that happened to match), the observed profile fed the
 * router's cost metric a number with the wrong unit. It is derived from the request cost and its tokens instead.
 */
describe("run98 a50 observed cost per 1k tokens", () => {
  test("the request cost is spread over the measured tokens", () => {
    const rate = resolveObservedCostPer1kTokens({
      requestCostUsd: 0.000735,
      inputTokens: 90,
      outputTokens: 31,
      catalogCostPer1k: 0.009857142857142858,
    });

    expect(rate).toBeCloseTo((0.000735 / 121) * 1000, 12);
  });

  test("a total is never returned as a rate", () => {
    const rate = resolveObservedCostPer1kTokens({
      requestCostUsd: 0.009857142857142858,
      inputTokens: 90,
      outputTokens: 31,
      catalogCostPer1k: null,
    });

    expect(rate).not.toBe(0.009857142857142858);
    expect(rate).toBeCloseTo((0.009857142857142858 / 121) * 1000, 12);
  });

  test("without a request cost the catalog rate is reported", () => {
    expect(
      resolveObservedCostPer1kTokens({
        requestCostUsd: null,
        inputTokens: 0,
        outputTokens: 0,
        catalogCostPer1k: 0.0003,
      }),
    ).toBe(0.0003);
  });

  test("with neither a request cost nor tokens the signal stays unavailable", () => {
    expect(
      resolveObservedCostPer1kTokens({
        requestCostUsd: 0.000735,
        inputTokens: 0,
        outputTokens: 0,
        catalogCostPer1k: null,
      }),
    ).toBeUndefined();
  });
});
