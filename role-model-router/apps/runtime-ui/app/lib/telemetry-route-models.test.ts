import { describe, expect, test } from "vitest";

import {
  buildObserveRequestsChartDefinitions,
  buildObserveRoutingChartDefinitions,
  buildOverviewChartDefinitions,
} from "./telemetry-route-models";

describe("telemetry route chart definitions", () => {
  test("defines the approved overview telemetry charts and query contracts", () => {
    const charts = buildOverviewChartDefinitions({
      filters: {
        sourceTypes: ["remote"],
        statusFamilies: ["failure"],
        providerIds: ["openai"],
      },
      timeRange: "week",
    });

    expect(charts.map((chart) => chart.title)).toEqual([
      "Token usage over time",
      "Cache efficiency trend",
      "Effective cost over time",
      "Cost avoided over time",
      "Latency trend",
      "Success vs failure volume",
    ]);
    expect(charts[0]).toEqual(
      expect.objectContaining({
        kind: "area",
        metrics: ["inputTokens", "outputTokens", "totalTokens"],
        query: expect.objectContaining({
          granularity: "day",
          metrics: ["inputTokens", "outputTokens", "totalTokens"],
          filters: {
            sourceTypes: ["remote"],
            statusFamilies: ["failure"],
            providerIds: ["openai"],
          },
        }),
      }),
    );
    expect(charts[1]).toEqual(
      expect.objectContaining({
        title: "Cache efficiency trend",
        kind: "line",
        metrics: ["cacheHitTokens", "cacheHitTokenRate"],
        metricAxisIds: {
          cacheHitTokens: "left",
          cacheHitTokenRate: "right",
        },
      }),
    );
    expect(charts[3]).toEqual(
      expect.objectContaining({
        kind: "area",
        metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
      }),
    );
    expect(charts[4]).not.toHaveProperty("metricAxisIds");
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
      "Taxonomy Demand By Group",
      "Task Success vs Failure",
      "Token Usage Over Time",
      "Effective Cost Over Time",
      "Latency Trend",
      "Cache Efficiency Trend",
      "Failure Trend",
      "Capability Leaders",
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
    expect(charts[1]).toEqual(
      expect.objectContaining({
        kind: "bar",
        query: expect.objectContaining({
          breakdown: "taxonomyGroupId",
          metrics: ["requestCount"],
        }),
      }),
    );
    expect(charts[2]).toEqual(
      expect.objectContaining({
        kind: "bar",
        query: expect.objectContaining({
          breakdown: "taxonomyTaskType",
          metrics: ["successCount", "failureCount"],
        }),
      }),
    );
    expect(charts[8]).toEqual(
      expect.objectContaining({
        kind: "ranking",
        query: expect.objectContaining({
          ranking: {
            dimension: "taxonomyCapabilityId",
            limit: 8,
            metric: "requestCount",
          },
        }),
      }),
    );
    expect(charts[9]).toEqual(
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
    expect(charts[6]).toEqual(
      expect.objectContaining({
        title: "Cache Efficiency Trend",
        kind: "line",
        metrics: ["cacheHitTokens", "cacheHitTokenRate"],
        metricAxisIds: {
          cacheHitTokens: "left",
          cacheHitTokenRate: "right",
        },
      }),
    );
    expect(charts[5]).not.toHaveProperty("metricAxisIds");
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
      "Routing Volume By Taxonomy Role",
      "Avoided Cost By Taxonomy Task",
      "Difficulty Distribution",
      "Strategy Selection Trend",
      "Role Demand",
      "Capability Routing Mix",
      "Tool Class Routing Mix",
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
        kind: "bar",
        query: expect.objectContaining({
          breakdown: "taxonomyRoleId",
          metrics: ["requestCount"],
        }),
      }),
    );
    expect(charts[3]).toEqual(
      expect.objectContaining({
        kind: "ranking",
        query: expect.objectContaining({
          ranking: {
            dimension: "taxonomyTaskType",
            limit: 8,
            metric: "totalAvoidedCostUsd",
          },
        }),
      }),
    );
    expect(charts[4]).toEqual(
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
    expect(charts[7]).toEqual(
      expect.objectContaining({
        kind: "ranking",
        query: expect.objectContaining({
          ranking: {
            dimension: "taxonomyCapabilityId",
            limit: 8,
            metric: "requestCount",
          },
        }),
      }),
    );
  });
});
