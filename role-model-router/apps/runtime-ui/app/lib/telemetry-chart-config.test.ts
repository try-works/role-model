import { describe, expect, test } from "vitest";

import {
  getTelemetryChartSeriesStyle,
  telemetryBreakdownOptions,
  telemetryChartColorTokens,
  telemetryMetricOptions,
  telemetryTimeRangeOptions,
} from "./telemetry-chart-config";

describe("telemetry chart config", () => {
  test("defines stable Apple-theme chart color tokens and selector options", () => {
    expect(telemetryTimeRangeOptions.map((option) => option.value)).toEqual([
      "day",
      "week",
      "month",
      "quarter",
    ]);
    expect(telemetryMetricOptions.map((option) => option.value)).toEqual(
      expect.arrayContaining([
        "totalTokens",
        "effectiveCostUsd",
        "totalAvoidedCostUsd",
        "averageLatencyMs",
        "cacheHitTokenRate",
      ]),
    );
    expect(telemetryBreakdownOptions.map((option) => option.value)).toEqual(
      expect.arrayContaining([
        "sourceType",
        "endpointId",
        "modelId",
        "providerId",
        "selectedStrategy",
      ]),
    );
    expect(telemetryChartColorTokens).toEqual(
      expect.objectContaining({
        local: "var(--rm-chart-local)",
        remote: "var(--rm-chart-remote)",
        cost: "var(--rm-chart-cost)",
        latency: "var(--rm-chart-latency)",
        cacheHit: "var(--rm-chart-cache-hit)",
        accent: "var(--rm-chart-link-blue)",
        warningSoft: "var(--rm-chart-warning-soft)",
      }),
    );
  });

  test("assigns deterministic series colors for repeated semantic and categorical keys", () => {
    expect(getTelemetryChartSeriesStyle("sourceType", "local")).toEqual({
      colorToken: "var(--rm-chart-local)",
      strokeOpacity: 1,
      fillOpacity: 0.16,
    });
    expect(getTelemetryChartSeriesStyle("sourceType", "remote")).toEqual({
      colorToken: "var(--rm-chart-remote)",
      strokeOpacity: 1,
      fillOpacity: 0.16,
    });
    expect(getTelemetryChartSeriesStyle("providerId", "moonshot")).toEqual(
      getTelemetryChartSeriesStyle("providerId", "moonshot"),
    );
    expect(getTelemetryChartSeriesStyle("providerId", "moonshot")).not.toEqual(
      getTelemetryChartSeriesStyle("providerId", "openai"),
    );
  });
});
