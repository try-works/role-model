import { describe, expect, test } from "vitest";

import {
  getTelemetryBreakdownOption,
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
        "reasoningEffort",
        "effortSource",
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
    expect(getTelemetryBreakdownOption("modelId")).toEqual(
      expect.objectContaining({
        label: "Upstream model (aggregates effort variants)",
        shortLabel: "Upstream model",
        value: "modelId",
      }),
    );
    expect(getTelemetryBreakdownOption("endpointId")).toEqual(
      expect.objectContaining({ label: "Endpoint variant" }),
    );
    expect(getTelemetryBreakdownOption("reasoningEffort")).toEqual(
      expect.objectContaining({ label: "Reasoning effort" }),
    );
    expect(getTelemetryBreakdownOption("effortSource")).toEqual(
      expect.objectContaining({ label: "Effort source" }),
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

  test("uses the shared identity catalog and first-class effort filters on every analytics route", () => {
    const requestsRoute = readFileSync(new URL("../routes/requests.tsx", import.meta.url), "utf8");
    const routingRoute = readFileSync(
      new URL("../routes/observe-routing.tsx", import.meta.url),
      "utf8",
    );
    const dashboardRoute = readFileSync(
      new URL("../routes/dashboard.tsx", import.meta.url),
      "utf8",
    );

    for (const route of [requestsRoute, routingRoute, dashboardRoute]) {
      expect(route).toContain("telemetryBreakdownOptions");
    }
    for (const route of [requestsRoute, routingRoute]) {
      expect(route).toContain('"reasoningEffort"');
      expect(route).toContain('"effortSource"');
      expect(route).toContain("reasoningEfforts");
      expect(route).toContain("effortSources");
    }
    expect(requestsRoute).toContain('label: "Selected model"');
    expect(requestsRoute).toContain('label: "Endpoint effort"');
    expect(requestsRoute).toContain('?? "Default"');
    expect(requestsRoute).not.toContain('label: "Request effort"');
  });
});
import { readFileSync } from "node:fs";
