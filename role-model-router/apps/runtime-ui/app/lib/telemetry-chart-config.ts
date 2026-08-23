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
  shortLabel: string;
  description: string;
  value: RuntimeTelemetryAnalyticsDimension;
}> = [
  {
    label: "Source",
    shortLabel: "Source",
    description: "Local or remote execution source.",
    value: "sourceType",
  },
  {
    label: "Endpoint variant",
    shortLabel: "Endpoint variant",
    description: "Exact routable endpoint, including fixed reasoning effort.",
    value: "endpointId",
  },
  {
    label: "Upstream model (aggregates effort variants)",
    shortLabel: "Upstream model",
    description: "Canonical upstream model; all effort variants are grouped together.",
    value: "modelId",
  },
  {
    label: "Reasoning effort",
    shortLabel: "Reasoning effort",
    description: "Effective reasoning effort selected for the request.",
    value: "reasoningEffort",
  },
  {
    label: "Effort source",
    shortLabel: "Effort source",
    description: "How the effective effort was selected or constrained.",
    value: "effortSource",
  },
  {
    label: "Provider",
    shortLabel: "Provider",
    description: "Provider identity.",
    value: "providerId",
  },
  {
    label: "Strategy",
    shortLabel: "Strategy",
    description: "Routing strategy used for selection.",
    value: "selectedStrategy",
  },
  {
    label: "Taxonomy group",
    shortLabel: "Taxonomy group",
    description: "Taxonomy group identity.",
    value: "taxonomyGroupId",
  },
  {
    label: "Taxonomy role",
    shortLabel: "Taxonomy role",
    description: "Taxonomy role identity.",
    value: "taxonomyRoleId",
  },
  {
    label: "Taxonomy task",
    shortLabel: "Taxonomy task",
    description: "Taxonomy task type.",
    value: "taxonomyTaskType",
  },
  {
    label: "Task variant",
    shortLabel: "Task variant",
    description: "Taxonomy task variant.",
    value: "taxonomyTaskVariant",
  },
  {
    label: "Capability",
    shortLabel: "Capability",
    description: "Taxonomy capability.",
    value: "taxonomyCapabilityId",
  },
  {
    label: "Modality",
    shortLabel: "Modality",
    description: "Taxonomy modality.",
    value: "taxonomyModalityId",
  },
  {
    label: "Tool class",
    shortLabel: "Tool class",
    description: "Taxonomy tool class.",
    value: "taxonomyToolClassId",
  },
];

export function getTelemetryBreakdownOption(dimension: RuntimeTelemetryAnalyticsDimension) {
  return telemetryBreakdownOptions.find((option) => option.value === dimension);
}

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
