import { describe, expect, test } from "vitest";

import {
  buildObserveRequestsChartDefinitions,
  buildObserveRoutingChartDefinitions,
  buildOverviewChartDefinitions,
} from "./telemetry-route-models";

describe("telemetry route chart definitions", () => {
  test("defines the approved overview telemetry charts and query contracts", () => {
    const charts = buildOverviewChartDefinitions({
      sourceTypes: [],
      timeRange: "week",
    });

    expect(charts.map((chart) => chart.title)).toEqual([
      "Token Usage Over Time",
      "Effective Cost Over Time",
      "Cost Avoided Over Time",
      "Latency Trend",
      "Cache Efficiency Trend",
      "Success vs Failure Volume",
    ]);
    expect(charts[0]).toEqual(
      expect.objectContaining({
        kind: "area",
        metrics: ["inputTokens", "outputTokens", "totalTokens"],
        query: expect.objectContaining({
          granularity: "day",
          metrics: ["inputTokens", "outputTokens", "totalTokens"],
        }),
      }),
    );
    expect(charts[2]).toEqual(
      expect.objectContaining({
        kind: "area",
        metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
      }),
    );
  });

  test("builds observe requests charts from shared filters and ranked-comparison selectors", () => {
    const charts = buildObserveRequestsChartDefinitions({
      breakdown: "providerId",
      filters: {
        endpointIds: ["openai.primary.fast"],
        providerIds: ["openai"],
        sourceTypes: ["remote"],
        statusFamilies: ["failure"],
      },
      rankingDimension: "endpointId",
      rankingMetric: "averageLatencyMs",
      timeRange: "month",
    });

    expect(charts.map((chart) => chart.title)).toEqual([
      "Request Volume Over Time",
      "Token Usage Over Time",
      "Effective Cost Over Time",
      "Latency Trend",
      "Cache Efficiency Trend",
      "Failure Trend",
      "Ranked Comparison",
    ]);
    expect(charts[0]?.query).toEqual(
      expect.objectContaining({
        breakdown: "providerId",
        filters: {
          endpointIds: ["openai.primary.fast"],
          providerIds: ["openai"],
          sourceTypes: ["remote"],
          statusFamilies: ["failure"],
        },
      }),
    );
    expect(charts[6]).toEqual(
      expect.objectContaining({
        kind: "ranking",
        query: expect.objectContaining({
          ranking: {
            dimension: "endpointId",
            limit: 8,
            metric: "averageLatencyMs",
          },
        }),
      }),
    );
  });

  test("keeps routing analytics under Observe with cost savings and routing dimensions", () => {
    const charts = buildObserveRoutingChartDefinitions({
      breakdown: "selectedStrategy",
      filters: {
        difficultyBuckets: ["hard"],
        requestedRoleIds: ["developer"],
        selectedStrategies: ["quality"],
        sourceTypes: ["remote"],
      },
      timeRange: "quarter",
    });

    expect(charts.map((chart) => chart.title)).toEqual([
      "Cost Avoided By Routing",
      "Routing Decision Volume",
      "Difficulty Distribution",
      "Strategy Selection Trend",
      "Role Demand",
      "Model Selection",
    ]);
    expect(charts[0]).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          breakdown: "selectedStrategy",
          filters: {
            difficultyBuckets: ["hard"],
            requestedRoleIds: ["developer"],
            selectedStrategies: ["quality"],
            sourceTypes: ["remote"],
          },
          metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
        }),
      }),
    );
    expect(charts[2]).toEqual(
      expect.objectContaining({
        kind: "ranking",
        query: expect.objectContaining({
          ranking: {
            dimension: "difficultyBucket",
            limit: 8,
            metric: "requestCount",
          },
        }),
      }),
    );
  });
});
