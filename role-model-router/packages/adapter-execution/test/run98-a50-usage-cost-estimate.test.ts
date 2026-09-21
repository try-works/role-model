import { describe, expect, test } from "vitest";

import { resolveUsageEventCostEstimate } from "../src/index.js";

/**
 * Run 98 addendum 50 — operator report 2026-09-20: "y axis is all 0 somehow cost data is being lost from
 * requests".
 *
 * Live evidence: every telemetry row in the audited stage window recorded `estimated_cost_usd` exactly equal
 * to the candidate's `cost_per_1k_tokens_est` — a per-1,000-token rate stored as the request's cost, so each
 * request's spend was overstated by `1000 / totalTokens` (13x on the kimi-k3 row below, worse on smaller ones).
 * The usage event must carry the request's cost: the vendor's reported amount, else the measured tokens at the
 * catalog price, else the pre-flight request estimate. Never the rate.
 */
const kimiK3Catalog = {
  canonicalModelId: "moonshotai/kimi-k3",
  tokenEconomicsSource: "catalog",
  inputPer1M: 3,
  outputPer1M: 15,
  // Pre-flight estimate for the request's declared context (6) and max output (8) tokens.
  estimatedRequestUsd: 0.000138,
  cost_per_1k_tokens_est: 0.009857142857142858,
} as const;

describe("run98 a50 usage-event cost estimate", () => {
  test("measured tokens at the catalog price are the request's estimate", () => {
    const resolved = resolveUsageEventCostEstimate({
      catalogCostEstimate: kimiK3Catalog,
      inputTokens: 90,
      outputTokens: 31,
      tokensAvailable: true,
    });

    expect(resolved?.source).toBe("usage_estimate");
    // (90 * 3 + 31 * 15) / 1_000_000
    expect(resolved?.costUsd).toBeCloseTo(0.000735, 12);
    expect(resolved?.costUsd).not.toBe(kimiK3Catalog.cost_per_1k_tokens_est);
  });

  test("a vendor-reported amount is preferred over the catalog estimate", () => {
    const resolved = resolveUsageEventCostEstimate({
      vendorCostUsd: 0.0042,
      catalogCostEstimate: kimiK3Catalog,
      inputTokens: 90,
      outputTokens: 31,
      tokensAvailable: true,
    });

    expect(resolved?.source).toBe("vendor_actual");
    expect(resolved?.costUsd).toBe(0.0042);
  });

  test("without measured tokens the pre-flight request estimate is used, not the per-1k rate", () => {
    const resolved = resolveUsageEventCostEstimate({
      catalogCostEstimate: kimiK3Catalog,
      inputTokens: 0,
      outputTokens: 0,
      tokensAvailable: false,
    });

    expect(resolved?.source).toBe("preflight_estimate");
    expect(resolved?.costUsd).toBe(0.000138);
    expect(resolved?.costUsd).not.toBe(kimiK3Catalog.cost_per_1k_tokens_est);
  });

  test("a rate is never returned when the catalog carries no request estimate", () => {
    const resolved = resolveUsageEventCostEstimate({
      catalogCostEstimate: {
        canonicalModelId: "deepseek/deepseek-flash",
        tokenEconomicsSource: "catalog",
        inputPer1M: null,
        outputPer1M: null,
        estimatedRequestUsd: null,
        cost_per_1k_tokens_est: 0.000375,
      },
      inputTokens: 36,
      outputTokens: 8,
      tokensAvailable: true,
    });

    expect(resolved).toBeNull();
  });

  test("no catalog economics and no vendor amount yields no estimate", () => {
    expect(
      resolveUsageEventCostEstimate({
        catalogCostEstimate: null,
        inputTokens: 12,
        outputTokens: 4,
        tokensAvailable: true,
      }),
    ).toBeNull();
  });
});
