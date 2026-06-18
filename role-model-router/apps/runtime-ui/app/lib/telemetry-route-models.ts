import type {
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsFilters,
  RuntimeTelemetryAnalyticsMetric,
  RuntimeTelemetryAnalyticsQuery,
} from "./runtime-api";
import { resolveTelemetryGranularity } from "./telemetry-analytics";
import { telemetryTimeRangeOptions } from "./telemetry-chart-config";

export type TelemetryTimeRangeValue = (typeof telemetryTimeRangeOptions)[number]["value"];

export interface TelemetryRouteChartDefinition {
  readonly title: string;
  readonly description: string;
  readonly kind: "area" | "line" | "bar" | "ranking";
  readonly metrics: readonly RuntimeTelemetryAnalyticsMetric[];
  readonly query: RuntimeTelemetryAnalyticsQuery;
  readonly emptyMessage: string;
  readonly minHeightClassName?: string;
  readonly className?: string;
}

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
  readonly sourceTypes: readonly ("local" | "remote")[];
  readonly breakdown?: RuntimeTelemetryAnalyticsDimension | null;
}): readonly TelemetryRouteChartDefinition[] {
  const filters =
    input.sourceTypes.length > 0
      ? ({
          sourceTypes: input.sourceTypes,
        } satisfies RuntimeTelemetryAnalyticsFilters)
      : undefined;

  return [
    {
      title: "Token Usage Over Time",
      description: "Input, output, and total token flow across the selected telemetry window.",
      kind: "area",
      metrics: ["inputTokens", "outputTokens", "totalTokens"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["inputTokens", "outputTokens", "totalTokens"],
        filters,
      }),
      emptyMessage: "No token-bearing requests have been recorded yet.",
      className: "col-span-12",
    },
    {
      title: "Effective Cost Over Time",
      description: "Authoritative effective cost based on stored request-time pricing facts.",
      kind: "line",
      metrics: ["actualCostUsd", "estimatedCostUsd", "effectiveCostUsd"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["actualCostUsd", "estimatedCostUsd", "effectiveCostUsd"],
        breakdown: input.breakdown ?? null,
        filters,
      }),
      emptyMessage: "No request costs have been recorded for this slice yet.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Cost Avoided Over Time",
      description:
        "Routing-avoided cost, cache-avoided cost, and total avoided spend from persisted request-time economics snapshots.",
      kind: "area",
      metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
        breakdown: input.breakdown ?? null,
        filters,
      }),
      emptyMessage: "No routing or cache savings have been recorded yet.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Latency Trend",
      description: "Average and p95 latency across the selected telemetry window.",
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
        filters,
      }),
      emptyMessage: "Latency telemetry has not been recorded for this slice yet.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Cache Efficiency Trend",
      description: "Cache-hit token volume and cache-hit rate across the selected window.",
      kind: "line",
      metrics: ["cacheHitTokens", "cacheHitTokenRate"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["cacheHitTokens", "cacheHitTokenRate"],
        breakdown:
          input.breakdown === "sourceType" ||
          input.breakdown === null ||
          input.breakdown === undefined
            ? (input.breakdown ?? null)
            : null,
        filters,
      }),
      emptyMessage: "No cache activity has been recorded for this slice yet.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Success vs Failure Volume",
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
        filters,
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
      title: "Request Volume Over Time",
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
      title: "Token Usage Over Time",
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
      title: "Effective Cost Over Time",
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
      title: "Latency Trend",
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
      title: "Cache Efficiency Trend",
      description: "Cache-hit token volume and cache-hit rate for the filtered slice.",
      kind: "line",
      metrics: ["cacheHitTokens", "cacheHitTokenRate"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["cacheHitTokens", "cacheHitTokenRate"],
        breakdown: input.breakdown,
        filters: input.filters,
      }),
      emptyMessage: "No cache-backed requests match the current analytics filters.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Failure Trend",
      description: "Failed request volume across the filtered slice.",
      kind: "bar",
      metrics: ["failureCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["failureCount"],
        breakdown: input.breakdown,
        filters: input.filters,
      }),
      emptyMessage: "No failures match the current analytics filters.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Ranked Comparison",
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
      title: "Cost Avoided By Routing",
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
      title: "Routing Decision Volume",
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
      title: "Difficulty Distribution",
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
      title: "Strategy Selection Trend",
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
      title: "Role Demand",
      description: "Requested role distribution across the selected routing slice.",
      kind: "ranking",
      metrics: ["requestCount"],
      query: buildBaseQuery({
        timeRange: input.timeRange,
        metrics: ["requestCount"],
        filters: input.filters,
        ranking: {
          dimension: "requestedRoleId",
          metric: "requestCount",
          limit: 8,
        },
      }),
      emptyMessage: "No requested-role demand is available for the current slice.",
      className: "col-span-12 xl:col-span-6",
    },
    {
      title: "Model Selection",
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
