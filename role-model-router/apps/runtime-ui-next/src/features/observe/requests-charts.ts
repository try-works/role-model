import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../../message";
import { telemetryChartCards, type TelemetryChartDefinition } from "./telemetry-chart-suite";

/**
 * S634: the Requests analytics chart suite ported from the :3456 reference
 * (apps/runtime-ui/app/routes/requests.tsx + buildObserveRequestsChartDefinitions in
 * lib/telemetry-route-models.ts). Nine cards, driven by the page filter state and fed by the telemetry
 * analytics query (POST /api/role-model/telemetry/query).
 */
export interface RequestsChartFilters {
  readonly sourceTypes?: ReadonlyArray<string>;
  readonly statusFamilies?: ReadonlyArray<string>;
}

export interface RequestsChartInput {
  readonly breakdown: string | null;
  readonly filters: RequestsChartFilters;
  readonly rankingDimension: string;
  readonly rankingMetric: string;
}

export const REQUESTS_CHARTS: ReadonlyArray<TelemetryChartDefinition> = [
  {
    className: "min-w-0 bg-card col-span-1 md:col-span-2",
    description: "Historical request volume across the selected structured telemetry slice.",
    emptyMessage: "No requests match the current analytics filters.",
    kind: "bar",
    metrics: ["requestCount"],
    title: "Request volume over time",
    usesSelectedBreakdown: true,
  },
  {
    breakdown: "taxonomyGroupId",
    className: "min-w-0 bg-card col-span-1",
    description: "Track which top-level taxonomy groups are driving request volume over time.",
    emptyMessage: "No taxonomy group analytics are available for the current slice.",
    kind: "bar",
    metrics: ["requestCount"],
    title: "Taxonomy demand by group",
  },
  {
    breakdown: "taxonomyTaskType",
    className: "min-w-0 bg-card col-span-1",
    description: "Compare successful and failed requests by normalized taxonomy task.",
    emptyMessage: "No taxonomy task analytics are available for the current slice.",
    kind: "bar",
    metrics: ["successCount", "failureCount"],
    title: "Task success vs failure",
  },
  {
    className: "min-w-0 bg-card col-span-1 md:col-span-2",
    description: "Token flow for the selected slice.",
    emptyMessage: "No token-bearing requests match the current analytics filters.",
    kind: "area",
    metrics: ["inputTokens", "outputTokens", "totalTokens"],
    title: "Token usage over time",
    usesSelectedBreakdown: true,
  },
  {
    className: "min-w-0 bg-card col-span-1 md:col-span-2",
    description: "Cache-hit token volume and cache-hit rate for the filtered slice.",
    emptyMessage: "No cache-backed requests match the current analytics filters.",
    kind: "line",
    metrics: ["cacheHitTokens", "cacheHitTokenRate"],
    title: "Cache efficiency trend",
    usesSelectedBreakdown: true,
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "Stored per-request cost rolled up through the selected historical slice.",
    emptyMessage: "No request cost has been recorded for the current analytics filters.",
    kind: "line",
    metrics: ["actualCostUsd", "estimatedCostUsd", "effectiveCostUsd"],
    title: "Effective cost over time",
    usesSelectedBreakdown: true,
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "Average and p95 latency for the filtered request slice.",
    emptyMessage: "Latency telemetry is unavailable for the current analytics filters.",
    kind: "line",
    metrics: ["averageLatencyMs", "p95LatencyMs"],
    title: "Latency trend",
    usesSelectedBreakdown: true,
  },
  {
    className: "min-w-0 bg-card col-span-1 md:col-span-2",
    description: "Rank the most active taxonomy capabilities in the selected window.",
    emptyMessage: "No capability-tagged telemetry is available for the current slice.",
    kind: "ranking",
    metrics: ["requestCount"],
    ranking: { dimension: "taxonomyCapabilityId", limit: 8, metric: "requestCount" },
    title: "Capability leaders",
  },
  {
    className: "min-w-0 bg-card col-span-1 md:col-span-2",
    description: "Top contributors or outliers for the selected metric and ranking target.",
    emptyMessage: "No ranked comparison data is available for the current slice.",
    kind: "ranking",
    metrics: ["requestCount"],
    ranking: { dimension: "endpointId", limit: 8, metric: "requestCount" },
    title: "Ranked comparison",
  },
];

export const requestsBreakdownDimension = (breakdown: string | undefined): string | null => {
  switch (breakdown) {
    case "By endpoint variant": return "endpointId";
    case "By upstream model": return "modelId";
    case "By provider": return "providerId";
    default: return null;
  }
};

export const requestsChartFilters = (
  state: { readonly source?: string; readonly statusFamily?: string } | undefined,
): RequestsChartFilters => ({
  ...(state?.source === "Local only" ? { sourceTypes: ["local"] } : state?.source === "Remote only" ? { sourceTypes: ["remote"] } : {}),
  ...(state?.statusFamily === "Success only" ? { statusFamilies: ["success"] }
    : state?.statusFamily === "Failure only" ? { statusFamilies: ["failure"] }
      : state?.statusFamily === "Unknown only" ? { statusFamilies: ["unknown"] }
        : {}),
});

export interface RequestsChartQuery {
  readonly id: string;
  readonly query: {
    readonly breakdown: string | null;
    readonly filters: RequestsChartFilters;
    readonly granularity: "hour" | "day";
    readonly metrics: ReadonlyArray<string>;
    readonly ranking: { readonly dimension: string; readonly limit: number; readonly metric: string } | null;
    readonly windowMs: number;
  };
}

export const requestsChartGranularity = (windowMs: number): "hour" | "day" => (windowMs <= 86_400_000 ? "hour" : "day");

export const buildRequestsChartQueries = (
  windowMs: number,
  input: RequestsChartInput,
): ReadonlyArray<RequestsChartQuery> =>
  REQUESTS_CHARTS.map((chart) => {
    const isRankedComparison = chart.title === "Ranked comparison";
    return {
      id: chart.title,
      query: {
        breakdown: chart.usesSelectedBreakdown === true ? input.breakdown : chart.breakdown ?? null,
        filters: input.filters,
        granularity: requestsChartGranularity(windowMs),
        metrics: isRankedComparison ? [input.rankingMetric] : chart.metrics,
        ranking: isRankedComparison
          ? { dimension: input.rankingDimension, limit: 8, metric: input.rankingMetric }
          : chart.ranking ?? null,
        windowMs,
      },
    };
  });

export const requestsChartCards = (
  entries: ReadonlyArray<{ readonly id: string; readonly json: string }>,
  state: { readonly status: "idle" | "loading" | "ok" | "error"; readonly message?: string },
  h: HtmlBuilder<Message>,
): Html => telemetryChartCards(REQUESTS_CHARTS, entries, state, h, "requests-charts");
