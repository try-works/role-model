import { describe, expect, it } from "vitest";

import {
  OVERVIEW_CHART_ORDER,
  OVERVIEW_CHART_SPANS,
  adaptOverviewChartBlock,
  mapTelemetryDataToKitHours,
  mapTelemetrySeriesToKit,
  resolveOverviewChartFormatters,
  sortOverviewChartBlocks,
} from "./overview-chart-adapter";
import type { RuntimeTelemetryAnalyticsResponse } from "./runtime-api";
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

function expectFirstOverviewDefinition(timeRange: "day" | "week" | "quarter") {
  const [definition] = buildOverviewChartDefinitions({ timeRange });
  expect(definition).toBeDefined();
  return definition;
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
    const definition = expectFirstOverviewDefinition("day");
    const block = adaptOverviewChartBlock(definition, {
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
    const definition = expectFirstOverviewDefinition("day");
    const block = adaptOverviewChartBlock(definition, {
      errorMessage: "Token Usage Over Time: network error",
    });

    expect(block.status).toBe("error");
    expect(block.statusMessage).toContain("network error");
  });

  it("returns loading status when response is missing during initial load", () => {
    const definition = expectFirstOverviewDefinition("day");
    const block = adaptOverviewChartBlock(definition, { loading: true });

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

  it("distributes bucket rows across Paper 4h time ticks", () => {
    const model = buildTelemetryTimeSeriesChartModel(makeResponse(), {
      title: "Token usage over time",
      metrics: ["inputTokens", "outputTokens", "totalTokens"],
    });
    const rows = mapTelemetryDataToKitHours(model, model.series);

    expect(rows.map((row) => row.hour)).toEqual([0, 4, 8, 12, 16, 20, 24]);
    expect(rows[0]?.hour).toBe(0);
    expect(rows.at(-1)?.hour).toBe(24);
    // Two source buckets snap to the end rails and keep volume on those slots.
    expect(rows[0]?.inputTokens).toBe(100);
    expect(rows.at(-1)?.inputTokens).toBe(200);
  });

  it("aggregates dense hour buckets onto 4h rails", () => {
    const buckets = Array.from({ length: 25 }, (_, index) => ({
      startAtMs: 1_700_000_000_000 + index * 3_600_000,
      endAtMs: 1_700_000_000_000 + (index + 1) * 3_600_000,
      totals: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      series: [],
    }));
    const model = buildTelemetryTimeSeriesChartModel(
      makeResponse({
        buckets,
        totals: { inputTokens: 250, outputTokens: 125, totalTokens: 375 },
      }),
      {
        title: "Token usage over time",
        metrics: ["inputTokens", "outputTokens", "totalTokens"],
      },
    );
    const rows = mapTelemetryDataToKitHours(model, model.series);
    expect(rows).toHaveLength(7);
    expect(rows.every((row) => typeof row.hour === "number" && Number(row.hour) % 4 === 0)).toBe(
      true,
    );
    const totalInput = rows.reduce((sum, row) => sum + Number(row.inputTokens ?? 0), 0);
    expect(totalInput).toBe(250);
  });

  it("keeps day-range charts on the 24h clock axis", () => {
    const definition = expectFirstOverviewDefinition("day");
    const block = adaptOverviewChartBlock(definition, {
      response: makeResponse({ granularity: "hour" }),
    });

    expect(block.xAxisMode).toBe("day-24h");
    expect(block.xKey).toBe("hour");
    expect(block.data?.[0]).toHaveProperty("hour");
  });

  it("maps week-range charts onto labeled window ticks instead of 00:00–24:00", () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const buckets = Array.from({ length: 7 }, (_, index) => ({
      startAtMs: 1_700_000_000_000 + index * dayMs,
      endAtMs: 1_700_000_000_000 + (index + 1) * dayMs,
      totals: { inputTokens: 10 * (index + 1), outputTokens: 5, totalTokens: 15 },
      series: [],
    }));
    const definition = expectFirstOverviewDefinition("week");
    const block = adaptOverviewChartBlock(definition, {
      response: makeResponse({
        granularity: "day",
        buckets,
        totals: { inputTokens: 280, outputTokens: 35, totalTokens: 105 },
      }),
    });

    expect(block.xAxisMode).toBe("window");
    expect(block.xKey).toBe("t");
    expect(block.xDomain).toEqual([0, 6]);
    expect(block.xTicks).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(block.data?.[0]).toHaveProperty("t", 0);
    expect(block.data?.[0]).toHaveProperty("bucketLabel");
    expect(block.xTickFormatter?.(0)).not.toMatch(/^\d{2}:00$/);
    expect(block.xTickFormatter?.(0)).toEqual(block.data?.[0]?.bucketLabel);
  });

  it("maps 90d charts onto week-of labels across the window", () => {
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const buckets = Array.from({ length: 13 }, (_, index) => ({
      startAtMs: 1_700_000_000_000 + index * weekMs,
      endAtMs: 1_700_000_000_000 + (index + 1) * weekMs,
      totals: { inputTokens: 20, outputTokens: 8, totalTokens: 28 },
      series: [],
    }));
    const definition = expectFirstOverviewDefinition("quarter");
    const block = adaptOverviewChartBlock(definition, {
      response: makeResponse({
        granularity: "week",
        buckets,
        totals: { inputTokens: 260, outputTokens: 104, totalTokens: 364 },
      }),
    });

    expect(block.xAxisMode).toBe("window");
    expect(block.data).toHaveLength(13);
    expect(block.xTicks?.length).toBeLessThanOrEqual(7);
    expect(block.xTickFormatter?.(0)).toMatch(/^Week of /);
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
