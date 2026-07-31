import type {
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsFilters,
  RuntimeTelemetryAnalyticsMetric,
  RuntimeTelemetryAnalyticsQuery,
} from "./runtime-api";
import type { TelemetryMetricAxisAssignments } from "./telemetry-analytics";
import { resolveTelemetryGranularity } from "./telemetry-analytics";
import { telemetryTimeRangeOptions } from "./telemetry-chart-config";

export type TelemetryTimeRangeValue = (typeof telemetryTimeRangeOptions)[number]["value"];

export interface TelemetryRouteChartDefinition {
  readonly title: string;
  readonly description: string;
  readonly kind: "area" | "line" | "bar" | "ranking";
  readonly metrics: readonly RuntimeTelemetryAnalyticsMetric[];
  readonly metricAxisIds?: TelemetryMetricAxisAssignments;
  readonly query: RuntimeTelemetryAnalyticsQuery;
  readonly emptyMessage: string;
  readonly minHeightClassName?: string;
  readonly className?: string;
}

const cacheEfficiencyMetricAxisIds = {
  cacheHitTokens: "left",
  cacheHitTokenRate: "right",
} as const satisfies TelemetryMetricAxisAssignments;

function getWindowMs(timeRange: TelemetryTimeRangeValue): number {
  return telemetryTimeRangeOptions.find((option) => option.value === timeRange)?.windowMs ?? 0;
}

function buildBaseQuery(input: {
  readonly timeRange: TelemetryTimeRangeValue;
  readonly metrics: readonly RuntimeTelemetryAnalyticsMetric[];
  readonly breakdown?: RuntimeTelemetryAnalyticsDimension | null;
  readonly filters?: RuntimeTelemetryAnalyticsFilters;
  readonly ranking?: {
    readonly dimension: RuntimeTelemetryAnalyticsDimension;
    readonly metric: RuntimeTelemetryAnalyticsMetric;
    readonly limit?: number;
  } | null;
}): RuntimeTelemetryAnalyticsQuery {
  const windowMs = getWindowMs(input.timeRange);
  return {
    windowMs,
    granularity: resolveTelemetryGranularity(windowMs),
    metrics: input.metrics,
    breakdown: input.breakdown ?? null,
    filters: input.filters,
    ranking: input.ranking ?? null,
  };
}

export function buildOverviewChartDefinitions(input: {
  readonly timeRange: TelemetryTimeRangeValue;
  readonly filters?: RuntimeTelemetryAnalyticsFilters;
  readonly breakdown?: RuntimeTelemetryAnalyticsDimension | null;
}): readonly TelemetryRouteChartDefinition[] {
  return [
    {
      title: "Token usage over time",
      description: "Input, output, and total token flow across the selected telemetry window.",
      kind: "area",
      metrics: ["inputTokens", "outputTokens", "totalTokens"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["inputTokens", "outputTokens", "totalTokens"],
        filters: input.filters,
      }),
      emptyMessage: "No token-bearing requests have been recorded yet.",
      className: "col-span-12",
    },
    {
      title: "Cache efficiency trend",
      description: "Cache-hit token volume and cache-hit rate.",
      kind: "line",
      metrics: ["cacheHitTokens", "cacheHitTokenRate"],
      metricAxisIds: cacheEfficiencyMetricAxisIds,
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["cacheHitTokens", "cacheHitTokenRate"],
        breakdown:
          input.breakdown === "sourceType" ||
          input.breakdown === null ||
          input.breakdown === undefined
            ? (input.breakdown ?? null)
            : null,
        filters: input.filters,
      }),
      emptyMessage: "No cache activity has been recorded for this slice yet.",
      className: "col-span-12",
    },
    {
      title: "Effective cost over time",
      description: "Authoritative effective cost based on stored request-time pricing facts.",
      kind: "line",
      metrics: ["actualCostUsd", "estimatedCostUsd", "effectiveCostUsd"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["actualCostUsd", "estimatedCostUsd", "effectiveCostUsd"],
        breakdown: input.breakdown ?? null,
        filters: input.filters,
      }),
      emptyMessage: "No request costs have been recorded for this slice yet.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Cost avoided over time",
      description: "Routing-avoided cost, cache-avoided cost, and total avoided spend.",
      kind: "area",
      metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
        breakdown: input.breakdown ?? null,
        filters: input.filters,
      }),
      emptyMessage: "No routing or cache savings have been recorded yet.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Latency trend",
      description: "Average and p95 latency across the selected window.",
      kind: "line",
      metrics: ["averageLatencyMs", "p95LatencyMs"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["averageLatencyMs", "p95LatencyMs"],
        breakdown:
          input.breakdown === "sourceType" ||
          input.breakdown === null ||
          input.breakdown === undefined
            ? (input.breakdown ?? null)
            : null,
        filters: input.filters,
      }),
      emptyMessage: "Latency telemetry has not been recorded for this slice yet.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Success vs failure volume",
      description: "Successful and failed request volume by time bucket.",
      kind: "bar",
      metrics: ["successCount", "failureCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["successCount", "failureCount"],
        breakdown:
          input.breakdown === "sourceType" || input.breakdown === "statusFamily"
            ? input.breakdown
            : null,
        filters: input.filters,
      }),
      emptyMessage: "No successful or failed requests have been recorded yet.",
      className: "col-span-12 xl:col-span-6",
    },
  ];
}

export function buildObserveRequestsChartDefinitions(input: {
  readonly timeRange: TelemetryTimeRangeValue;
  readonly breakdown: RuntimeTelemetryAnalyticsDimension | null;
  readonly rankingMetric: RuntimeTelemetryAnalyticsMetric;
  readonly rankingDimension: RuntimeTelemetryAnalyticsDimension;
  readonly filters: RuntimeTelemetryAnalyticsFilters;
}): readonly TelemetryRouteChartDefinition[] {
  return [
    {
      title: "Request volume over time",
      description: "Historical request volume across the selected structured telemetry slice.",
      kind: "bar",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        breakdown: input.breakdown,
        filters: input.filters,
      }),
      emptyMessage: "No requests match the current analytics filters.",
      className: "col-span-12",
    },
    {
      title: "Taxonomy demand by group",
      description: "Track which top-level taxonomy groups are driving request volume over time.",
      kind: "bar",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        breakdown: "taxonomyGroupId",
        filters: input.filters,
      }),
      emptyMessage: "No taxonomy group analytics are available for the current slice.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Task success vs failure",
      description: "Compare successful and failed requests by normalized taxonomy task.",
      kind: "bar",
      metrics: ["successCount", "failureCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["successCount", "failureCount"],
        breakdown: "taxonomyTaskType",
        filters: input.filters,
      }),
      emptyMessage: "No taxonomy task analytics are available for the current slice.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Token usage over time",
      description: "Token flow for the selected slice.",
      kind: "area",
      metrics: ["inputTokens", "outputTokens", "totalTokens"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["inputTokens", "outputTokens", "totalTokens"],
        breakdown: input.breakdown,
        filters: input.filters,
      }),
      emptyMessage: "No token-bearing requests match the current analytics filters.",
      className: "col-span-12",
    },
    {
      title: "Cache efficiency trend",
      description: "Cache-hit token volume and cache-hit rate for the filtered slice.",
      kind: "line",
      metrics: ["cacheHitTokens", "cacheHitTokenRate"],
      metricAxisIds: cacheEfficiencyMetricAxisIds,
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["cacheHitTokens", "cacheHitTokenRate"],
        breakdown: input.breakdown,
        filters: input.filters,
      }),
      emptyMessage: "No cache-backed requests match the current analytics filters.",
      className: "col-span-12",
    },
    {
      title: "Effective cost over time",
      description: "Stored per-request cost rolled up through the selected historical slice.",
      kind: "line",
      metrics: ["actualCostUsd", "estimatedCostUsd", "effectiveCostUsd"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["actualCostUsd", "estimatedCostUsd", "effectiveCostUsd"],
        breakdown: input.breakdown,
        filters: input.filters,
      }),
      emptyMessage: "No request cost has been recorded for the current analytics filters.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Latency trend",
      description: "Average and p95 latency for the filtered request slice.",
      kind: "line",
      metrics: ["averageLatencyMs", "p95LatencyMs"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["averageLatencyMs", "p95LatencyMs"],
        breakdown: input.breakdown,
        filters: input.filters,
      }),
      emptyMessage: "Latency telemetry is unavailable for the current analytics filters.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Capability leaders",
      description: "Rank the most active taxonomy capabilities in the selected window.",
      kind: "ranking",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        filters: input.filters,
        ranking: {
          dimension: "taxonomyCapabilityId",
          metric: "requestCount",
          limit: 8,
        },
      }),
      emptyMessage: "No capability-tagged telemetry is available for the current slice.",
      className: "col-span-12",
    },
    {
      title: "Ranked comparison",
      description: "Top contributors or outliers for the selected metric and ranking target.",
      kind: "ranking",
      metrics: [input.rankingMetric],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: [input.rankingMetric],
        filters: input.filters,
        ranking: {
          dimension: input.rankingDimension,
          metric: input.rankingMetric,
          limit: 8,
        },
      }),
      emptyMessage: "No ranked comparison data is available for the current slice.",
      className: "col-span-12",
    },
  ];
}

export function buildObserveRoutingChartDefinitions(input: {
  readonly timeRange: TelemetryTimeRangeValue;
  readonly breakdown: RuntimeTelemetryAnalyticsDimension | null;
  readonly filters: RuntimeTelemetryAnalyticsFilters;
}): readonly TelemetryRouteChartDefinition[] {
  return [
    {
      title: "Cost avoided by routing",
      description:
        "Avoided spend based on the selected route versus the highest-cost eligible configured candidate, plus cache savings.",
      kind: "area",
      metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
        breakdown: input.breakdown,
        filters: input.filters,
      }),
      emptyMessage: "No routing savings have been recorded for the current slice.",
      className: "col-span-12",
    },
    {
      title: "Routing decision volume",
      description: "Historical routed decision volume across the filtered slice.",
      kind: "bar",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        breakdown: input.breakdown,
        filters: input.filters,
      }),
      emptyMessage: "No routed decisions match the current filters.",
      className: "col-span-12",
    },
    {
      title: "Routing volume by taxonomy role",
      description: "Observe which taxonomy roles are driving routing decisions over time.",
      kind: "bar",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        breakdown: "taxonomyRoleId",
        filters: input.filters,
      }),
      emptyMessage: "No taxonomy role routing telemetry is available for the current slice.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Avoided cost by taxonomy task",
      description: "Compare routing-driven avoided cost across normalized taxonomy tasks.",
      kind: "ranking",
      metrics: ["totalAvoidedCostUsd"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["totalAvoidedCostUsd"],
        filters: input.filters,
        ranking: {
          dimension: "taxonomyTaskType",
          metric: "totalAvoidedCostUsd",
          limit: 8,
        },
      }),
      emptyMessage: "No taxonomy task savings are available for the current slice.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Difficulty distribution",
      description: "Easy, medium, and hard demand mix for the selected historical slice.",
      kind: "ranking",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        filters: input.filters,
        ranking: {
          dimension: "difficultyBucket",
          metric: "requestCount",
          limit: 8,
        },
      }),
      emptyMessage: "No difficulty-classified requests match the current slice.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Strategy selection trend",
      description: "Which routing strategies are being selected over time.",
      kind: "bar",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        breakdown: "selectedStrategy",
        filters: input.filters,
      }),
      emptyMessage: "No routing strategy selections match the current slice.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Capability routing mix",
      description: "Rank the taxonomy capabilities currently driving routed traffic.",
      kind: "ranking",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        filters: input.filters,
        ranking: {
          dimension: "taxonomyCapabilityId",
          metric: "requestCount",
          limit: 8,
        },
      }),
      emptyMessage: "No capability-tagged routing telemetry is available for the current slice.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Tool class routing mix",
      description: "See which tool-class patterns are most associated with routed requests.",
      kind: "ranking",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        filters: input.filters,
        ranking: {
          dimension: "taxonomyToolClassId",
          metric: "requestCount",
          limit: 8,
        },
      }),
      emptyMessage: "No tool-class telemetry is available for the current slice.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Model selection",
      description: "Selected model distribution across the filtered routing slice.",
      kind: "ranking",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        filters: input.filters,
        ranking: {
          dimension: "modelId",
          metric: "requestCount",
          limit: 8,
        },
      }),
      emptyMessage: "No model-selection history is available for the current slice.",
      className: "col-span-12 xl:col-span-6",
    },
  ];
}
