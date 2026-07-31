import { describe, expect, it } from "vitest";

import type { RuntimeTelemetryAnalyticsResponse } from "./runtime-api";
import {
  OVERVIEW_CHART_ORDER,
  OVERVIEW_CHART_SPANS,
  adaptOverviewChartBlock,
  mapTelemetryDataToKitHours,
  mapTelemetrySeriesToKit,
  resolveOverviewChartFormatters,
  sortOverviewChartBlocks,
} from "./overview-chart-adapter";
import { buildTelemetryTimeSeriesChartModel } from "./telemetry-analytics";
import { buildOverviewChartDefinitions } from "./telemetry-route-models";

function makeResponse(
  overrides: Partial<RuntimeTelemetryAnalyticsResponse> = {},
): RuntimeTelemetryAnalyticsResponse {
  return {
    startAtMs: 1_700_000_000_000,
    endAtMs: 1_700_007_200_000,
    granularity: "hour",
    metrics: ["inputTokens", "outputTokens", "totalTokens"],
    breakdown: null,
    buckets: [
      {
        startAtMs: 1_700_000_000_000,
        endAtMs: 1_700_003_600_000,
        totals: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        series: [],
      },
      {
        startAtMs: 1_700_003_600_000,
        endAtMs: 1_700_007_200_000,
        totals: { inputTokens: 200, outputTokens: 80, totalTokens: 280 },
        series: [],
      },
    ],
    totals: { inputTokens: 300, outputTokens: 130, totalTokens: 430 },
    ranking: null,
    labels: {},
    metricSupport: {},
    ...overrides,
  };
}

describe("overview-chart-adapter", () => {
  it("maps overview chart spans to Paper 5-0 grid (cache full-width, success half)", () => {
    expect(OVERVIEW_CHART_SPANS["Token usage over time"]).toBe(12);
    expect(OVERVIEW_CHART_SPANS["Cache efficiency trend"]).toBe(12);
    expect(OVERVIEW_CHART_SPANS["Effective cost over time"]).toBe(6);
    expect(OVERVIEW_CHART_SPANS["Cost avoided over time"]).toBe(6);
    expect(OVERVIEW_CHART_SPANS["Latency trend"]).toBe(6);
    expect(OVERVIEW_CHART_SPANS["Success vs failure volume"]).toBe(6);
  });

  it("orders charts Token → Cache → Effective+Avoided → Latency+Success", () => {
    expect([...OVERVIEW_CHART_ORDER]).toEqual([
      "Token usage over time",
      "Cache efficiency trend",
      "Effective cost over time",
      "Cost avoided over time",
      "Latency trend",
      "Success vs failure volume",
    ]);
  });

  it("adapts token usage telemetry into kit-ready area chart data", () => {
    const [definition] = buildOverviewChartDefinitions({ timeRange: "day" });
    const block = adaptOverviewChartBlock(definition!, {
      response: makeResponse(),
    });

    expect(block.status).toBe("ready");
    expect(block.kind).toBe("area");
    expect(block.span).toBe(12);
    expect(block.series?.length).toBeGreaterThan(0);
    expect(block.data?.[0]).toHaveProperty("hour");
    expect(block.data?.[0]).toHaveProperty("inputTokens");
  });

  it("returns error status when fetch failed without response", () => {
    const [definition] = buildOverviewChartDefinitions({ timeRange: "day" });
    const block = adaptOverviewChartBlock(definition!, {
      errorMessage: "Token Usage Over Time: network error",
    });

    expect(block.status).toBe("error");
    expect(block.statusMessage).toContain("network error");
  });

  it("returns loading status when response is missing during initial load", () => {
    const [definition] = buildOverviewChartDefinitions({ timeRange: "day" });
    const block = adaptOverviewChartBlock(definition!, { loading: true });

    expect(block.status).toBe("loading");
  });

  it("maps cache efficiency metrics to dual-axis formatters", () => {
    const formatters = resolveOverviewChartFormatters(["cacheHitTokens", "cacheHitTokenRate"]);
    expect(formatters.rightTickFormatter).toBeTypeOf("function");
    expect(formatters.rightTickFormatter?.(0.42)).toContain("%");
  });

  it("maps telemetry series color tokens to kit series colors", () => {
    const model = buildTelemetryTimeSeriesChartModel(makeResponse(), {
      title: "Token usage over time",
      metrics: ["inputTokens", "outputTokens", "totalTokens"],
    });
    const kitSeries = mapTelemetrySeriesToKit(model.series);

    expect(kitSeries[0]?.color).toMatch(/^var\(--rm(3)?-chart/);
    expect(kitSeries[0]?.key).toBe("inputTokens");
  });

  it("distributes bucket rows across 0–24 hour axis", () => {
    const model = buildTelemetryTimeSeriesChartModel(makeResponse(), {
      title: "Token usage over time",
      metrics: ["inputTokens", "outputTokens", "totalTokens"],
    });
    const rows = mapTelemetryDataToKitHours(model, model.series);

    expect(rows[0]?.hour).toBe(0);
    expect(rows.at(-1)?.hour).toBe(24);
  });

  it("sorts chart blocks in canonical overview display order", () => {
    const definitions = buildOverviewChartDefinitions({ timeRange: "day" });
    const blocks = sortOverviewChartBlocks(
      definitions.map((definition) =>
        adaptOverviewChartBlock(definition, { response: makeResponse() }),
      ),
    );

    expect(blocks.map((block) => block.title)).toEqual([...OVERVIEW_CHART_ORDER]);
  });
});
