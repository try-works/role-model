import type {
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsMetric,
} from "./runtime-api";

export const telemetryTimeRangeOptions = [
  { label: "Day", value: "day", windowMs: 24 * 60 * 60 * 1000 },
  { label: "Week", value: "week", windowMs: 7 * 24 * 60 * 60 * 1000 },
  { label: "Month", value: "month", windowMs: 30 * 24 * 60 * 60 * 1000 },
  { label: "90 days", value: "quarter", windowMs: 90 * 24 * 60 * 60 * 1000 },
] as const;

export const telemetryMetricOptions: ReadonlyArray<{
  label: string;
  value: RuntimeTelemetryAnalyticsMetric;
}> = [
  { label: "Requests", value: "requestCount" },
  { label: "Total tokens", value: "totalTokens" },
  { label: "Effective cost", value: "effectiveCostUsd" },
  { label: "Cost avoided", value: "totalAvoidedCostUsd" },
  { label: "Average latency", value: "averageLatencyMs" },
  { label: "Cache hit rate", value: "cacheHitTokenRate" },
];

export const telemetryBreakdownOptions: ReadonlyArray<{
  label: string;
  value: RuntimeTelemetryAnalyticsDimension;
}> = [
  { label: "Source", value: "sourceType" },
  { label: "Endpoint", value: "endpointId" },
  { label: "Model", value: "modelId" },
  { label: "Provider", value: "providerId" },
  { label: "Strategy", value: "selectedStrategy" },
  { label: "Taxonomy group", value: "taxonomyGroupId" },
  { label: "Taxonomy role", value: "taxonomyRoleId" },
  { label: "Taxonomy task", value: "taxonomyTaskType" },
  { label: "Task variant", value: "taxonomyTaskVariant" },
  { label: "Capability", value: "taxonomyCapabilityId" },
  { label: "Modality", value: "taxonomyModalityId" },
  { label: "Tool class", value: "taxonomyToolClassId" },
];

export const telemetryChartColorTokens = {
  local: "var(--rm-chart-local)",
  remote: "var(--rm-chart-remote)",
  cost: "var(--rm-chart-cost)",
  latency: "var(--rm-chart-latency)",
  cacheHit: "var(--rm-chart-cache-hit)",
  accent: "var(--rm-chart-link-blue)",
  warningSoft: "var(--rm-chart-warning-soft)",
} as const;

const categoricalTokens = [
  "var(--rm-chart-link-blue)",
  "var(--rm-chart-cyan)",
  "var(--rm-chart-highlight-pink)",
  "var(--rm-chart-violet)",
  "var(--rm-chart-link-deep)",
  "var(--rm-chart-warning)",
  "var(--rm-chart-error)",
] as const;

function pickCategoricalToken(key: string): string {
  const seed = [...key].reduce((total, character) => total + character.charCodeAt(0), 0);
  return categoricalTokens[seed % categoricalTokens.length];
}

export function getTelemetryChartSeriesStyle(
  dimension: RuntimeTelemetryAnalyticsDimension,
  key: string,
): {
  colorToken: string;
  strokeOpacity: number;
  fillOpacity: number;
} {
  if (dimension === "sourceType" && key === "local") {
    return {
      colorToken: telemetryChartColorTokens.local,
      strokeOpacity: 1,
      fillOpacity: 0.16,
    };
  }
  if (dimension === "sourceType" && key === "remote") {
    return {
      colorToken: telemetryChartColorTokens.remote,
      strokeOpacity: 1,
      fillOpacity: 0.16,
    };
  }
  return {
    colorToken: pickCategoricalToken(`${dimension}:${key}`),
    strokeOpacity: 1,
    fillOpacity: 0.16,
  };
}
