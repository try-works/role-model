import { expect, test } from "vitest";

import type { RuntimeTelemetrySummary } from "./runtime-api";
import { summarizeTelemetryStats } from "./view-models";

// Run 98 addendum 40 (L1): the operator surface must label the provider response-header time as such
// and show the duration the client actually waited for beside it.
function makeSummary(overrides: Partial<RuntimeTelemetrySummary>): RuntimeTelemetrySummary {
  const source = {
    requestCount: 2,
    successCount: 2,
    failureCount: 0,
    totalInputTokens: 100,
    totalOutputTokens: 20,
    totalTokens: 120,
    cachedRequestCount: 1,
    totalActualCostUsd: 0.001,
    totalEstimatedCostUsd: 0.001,
    averageLatencyMs: 900,
    p95LatencyMs: 1_400,
    lastSeenAtMs: 1_770_000_000_000,
  };
  return {
    ...source,
    totalEffectiveCostUsd: 0.001,
    sourceBreakdown: { local: source, remote: source },
    ...overrides,
  } as RuntimeTelemetrySummary;
}

test("a40 L1: the summary labels the provider time and shows the client-visible percentile", () => {
  const cards = summarizeTelemetryStats(
    makeSummary({
      averageRequestLatencyMs: 11_346,
      p95RequestLatencyMs: 40_982,
      requestLatencySampleCount: 55,
    }),
  );

  const providerCard = cards.find((card) => card.label === "Provider latency");
  expect(providerCard).toBeDefined();
  expect(providerCard?.detail).toContain("1.4 s p95");
  expect(providerCard?.detail).toMatch(/provider response headers/i);

  const clientCard = cards.find((card) => card.label === "Client latency");
  expect(clientCard).toBeDefined();
  expect(clientCard?.value).toBe("40.98 s p95");
  expect(clientCard?.detail).toContain("11.35 s avg");
  expect(clientCard?.detail).toContain("55");
});

test("a40 L1: a window with no client-visible samples says so instead of showing the provider number", () => {
  const cards = summarizeTelemetryStats(makeSummary({}));

  const clientCard = cards.find((card) => card.label === "Client latency");
  expect(clientCard).toBeDefined();
  expect(clientCard?.value).toBe("n/a");
  expect(clientCard?.detail).toMatch(/not measured/i);
});
