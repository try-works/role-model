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
  local: "var(--rm3-chart-local)",
  remote: "var(--rm3-chart-remote)",
  cost: "var(--rm3-chart-cost)",
  latency: "var(--rm3-chart-latency)",
  cacheHit: "var(--rm3-chart-cache)",
  accent: "var(--rm3-chart-1)",
  warningSoft: "var(--rm3-di-serria-50)",
} as const;

const categoricalTokens = [
  "var(--rm3-chart-1)",
  "var(--rm3-chart-2)",
  "var(--rm3-chart-3)",
  "var(--rm3-chart-4)",
  "var(--rm3-chart-5)",
  "var(--rm3-chart-6)",
  "var(--rm3-chart-7)",
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
