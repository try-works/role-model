import { describe, expect, test } from "vitest";

import {
  getTelemetryChartSeriesStyle,
  telemetryBreakdownOptions,
  telemetryChartColorTokens,
  telemetryMetricOptions,
  telemetryTimeRangeOptions,
} from "./telemetry-chart-config";

describe("telemetry chart config", () => {
  test("defines stable RM3 chart color tokens and selector options", () => {
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
        "taxonomyGroupId",
        "taxonomyRoleId",
        "taxonomyTaskType",
        "taxonomyTaskVariant",
        "taxonomyCapabilityId",
        "taxonomyModalityId",
        "taxonomyToolClassId",
      ]),
    );
    expect(telemetryChartColorTokens).toEqual(
      expect.objectContaining({
        local: "var(--rm3-chart-local)",
        remote: "var(--rm3-chart-remote)",
        cost: "var(--rm3-chart-cost)",
        latency: "var(--rm3-chart-latency)",
        cacheHit: "var(--rm3-chart-cache)",
        accent: "var(--rm3-chart-1)",
        warningSoft: "var(--rm3-di-serria-50)",
      }),
    );
  });

  test("assigns deterministic series colors for repeated semantic and categorical keys", () => {
    expect(getTelemetryChartSeriesStyle("sourceType", "local")).toEqual({
      colorToken: "var(--rm3-chart-local)",
      strokeOpacity: 1,
      fillOpacity: 0.16,
    });
    expect(getTelemetryChartSeriesStyle("sourceType", "remote")).toEqual({
      colorToken: "var(--rm3-chart-remote)",
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
