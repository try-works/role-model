import { describe, expect, it } from "vitest";

import { adaptObserveChartBlock, resolveObserveChartSpan } from "./observe-chart-adapter";
import type { RuntimeTelemetryAnalyticsResponse } from "./runtime-api";
import { fromPageTimeRange, toPageTimeRange } from "./telemetry-page-filters";
import { buildObserveRequestsChartDefinitions } from "./telemetry-route-models";

describe("observe-chart-adapter", () => {
  it("maps legacy tailwind spans to ChartGrid spans", () => {
    expect(resolveObserveChartSpan("col-span-12 xl:col-span-6")).toBe(6);
    expect(resolveObserveChartSpan("col-span-12")).toBe(12);
  });

  it("maps quarter telemetry range to kit 90d page filters", () => {
    expect(toPageTimeRange("quarter")).toBe("90d");
    expect(fromPageTimeRange("90d")).toBe("quarter");
  });

  it("returns loading status for ranking charts without responses", () => {
    const [rankingDefinition] = buildObserveRequestsChartDefinitions({
      timeRange: "week",
      breakdown: null,
      rankingMetric: "requestCount",
      rankingDimension: "endpointId",
      filters: {},
    }).filter((definition) => definition.kind === "ranking");

    expect(adaptObserveChartBlock(rankingDefinition, { loading: true }).status).toBe("loading");
  });

  it("maps ranking responses to kit rows", () => {
    const [rankingDefinition] = buildObserveRequestsChartDefinitions({
      timeRange: "week",
      breakdown: null,
      rankingMetric: "requestCount",
      rankingDimension: "endpointId",
      filters: {},
    }).filter((definition) => definition.kind === "ranking");

    const response: RuntimeTelemetryAnalyticsResponse = {
      startAtMs: Date.UTC(2026, 5, 10, 0, 0, 0),
      endAtMs: Date.UTC(2026, 5, 17, 0, 0, 0),
      granularity: "day",
      metrics: ["requestCount"],
      breakdown: null,
      buckets: [],
      totals: { requestCount: 12 },
      metricSupport: {},
      labels: {},
      ranking: {
        dimension: "endpointId",
        metric: "requestCount",
        rows: [{ key: "endpoint-a", label: "Endpoint A", value: 12 }],
      },
    };

    const block = adaptObserveChartBlock(rankingDefinition, { response });
    expect(block.kind).toBe("ranking");
    expect(block.status).toBe("ready");
    expect(block.rows).toEqual([expect.objectContaining({ key: "endpoint-a", value: 12 })]);
  });
});
