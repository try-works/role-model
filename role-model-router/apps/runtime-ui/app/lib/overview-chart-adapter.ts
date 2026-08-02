import type { ChartSeries, ChartTimeAxisMode } from "@role-model/ui";
import { CHART_TIME_TICKS, chartWindowTickIndices } from "@role-model/ui";

import type { RuntimeTelemetryAnalyticsResponse } from "./runtime-api";
import {
  type TelemetryChartSeriesModel,
  type TelemetryTimeSeriesChartModel,
  buildTelemetryTimeSeriesChartModel,
} from "./telemetry-analytics";
import type { TelemetryRouteChartDefinition } from "./telemetry-route-models";

/** RM3 ChartGrid spans for overview charts (12-col grid, 6 or 12 only). */
export const OVERVIEW_CHART_SPANS: Readonly<Record<string, 6 | 12>> = {
  "Token usage over time": 12,
  "Cache efficiency trend": 12,
  "Effective cost over time": 6,
  "Cost avoided over time": 6,
  "Latency trend": 6,
  "Success vs failure volume": 6,
};

export const OVERVIEW_CHART_ORDER: readonly string[] = [
  "Token usage over time",
  "Cache efficiency trend",
  "Effective cost over time",
  "Cost avoided over time",
  "Latency trend",
  "Success vs failure volume",
];

export type OverviewChartBlockStatus =
  | "ready"
  | "loading"
  | "error"
  | "empty"
  | "unsupported"
  | "partial"
  | "truncated";

/** Kit-facing overview chart block — mirrors `RuntimeOverviewChartBlock` plus status. */
export type OverviewChartBlockModel = {
  readonly title: string;
  readonly description?: string;
  readonly kind: "area" | "line" | "bar";
  readonly span: 6 | 12;
  readonly status: OverviewChartBlockStatus;
  readonly statusMessage?: string;
  readonly data?: Record<string, string | number>[];
  readonly series?: ChartSeries[];
  readonly xKey?: string;
  readonly xAxisMode?: ChartTimeAxisMode;
  readonly xDomain?: [number, number];
  readonly xTicks?: readonly number[];
  readonly xTickFormatter?: (value: number) => string;
  readonly leftTickFormatter?: (value: number) => string;
  readonly rightTickFormatter?: (value: number) => string;
  readonly valueFormatter?: (value: number) => string;
};

function formatK(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatUsd(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMs(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  return `${Math.round(value)}ms`;
}

function formatPct(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  const pct = value <= 1 ? value * 100 : value;
  return `${Math.round(pct)}%`;
}

function formatCount(value: number): string {
  if (!Number.isFinite(value)) {
    return "";
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function resolveOverviewChartFormatters(
  metrics: TelemetryRouteChartDefinition["metrics"],
): Pick<OverviewChartBlockModel, "leftTickFormatter" | "rightTickFormatter" | "valueFormatter"> {
  const hasRate = metrics.includes("cacheHitTokenRate");
  const hasLatency = metrics.some((metric) => metric.includes("Latency") || metric.endsWith("Ms"));
  const hasCost = metrics.some(
    (metric) =>
      metric.includes("Cost") ||
      metric.includes("Usd") ||
      metric.includes("Savings") ||
      metric === "actualCostUsd" ||
      metric === "estimatedCostUsd" ||
      metric === "effectiveCostUsd",
  );
  const hasTokens = metrics.some((metric) => metric.includes("Token"));
  const hasCounts = metrics.some(
    (metric) => metric.endsWith("Count") || metric === "successCount" || metric === "failureCount",
  );

  if (hasRate) {
    return {
      leftTickFormatter: formatK,
      rightTickFormatter: formatPct,
      valueFormatter: (value) => (value <= 100 ? formatPct(value) : formatK(value)),
    };
  }

  if (hasCost && !hasTokens) {
    return {
      leftTickFormatter: formatUsd,
      valueFormatter: formatUsd,
    };
  }

  if (hasLatency && !hasCost) {
    return {
      leftTickFormatter: formatMs,
      valueFormatter: formatMs,
    };
  }

  if (hasCounts && !hasTokens) {
    return {
      leftTickFormatter: formatCount,
      valueFormatter: formatCount,
    };
  }

  return {
    leftTickFormatter: formatK,
    valueFormatter: formatK,
  };
}

function bucketIndexToHour(index: number, count: number): number {
  if (count <= 1) {
    return 12;
  }
  return (index / (count - 1)) * 24;
}

/** Snap a continuous hour onto the Paper 4h tick rails (0…24). */
function snapToChartTimeTick(hour: number): number {
  const clamped = Math.max(0, Math.min(24, hour));
  const nearest = CHART_TIME_TICKS.reduce((best, tick) =>
    Math.abs(tick - clamped) < Math.abs(best - clamped) ? tick : best,
  );
  return nearest;
}

function shouldAverageMetric(dataKey: string): boolean {
  return dataKey.includes("Rate") || dataKey.includes("Latency") || dataKey.endsWith("Ms");
}

export function mapTelemetrySeriesToKit(
  series: readonly TelemetryChartSeriesModel[],
): ChartSeries[] {
  return series.map((entry) => ({
    key: entry.dataKey,
    label: entry.label,
    color: entry.colorToken,
    yAxis: entry.yAxisId,
  }));
}

/**
 * Roll live telemetry buckets onto Paper's 7-tick 24h domain (0,4,…,24).
 * Volume metrics sum within a slot; rates/latency average.
 */
export function mapTelemetryDataToKitHours(
  model: TelemetryTimeSeriesChartModel,
  series: readonly TelemetryChartSeriesModel[],
): Record<string, string | number>[] {
  const count = model.data.length;
  if (count === 0) {
    return [];
  }

  const slots = new Map<number, { sums: Record<string, number>; counts: Record<string, number> }>();
  for (const hour of CHART_TIME_TICKS) {
    slots.set(hour, { sums: {}, counts: {} });
  }

  model.data.forEach((row, index) => {
    const hour = snapToChartTimeTick(bucketIndexToHour(index, count));
    const slot = slots.get(hour);
    if (!slot) {
      return;
    }
    for (const entry of series) {
      const value = row[entry.dataKey];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        continue;
      }
      slot.sums[entry.dataKey] = (slot.sums[entry.dataKey] ?? 0) + value;
      slot.counts[entry.dataKey] = (slot.counts[entry.dataKey] ?? 0) + 1;
    }
  });

  return CHART_TIME_TICKS.map((hour) => {
    const slot = slots.get(hour) ?? { sums: {}, counts: {} };
    const mapped: Record<string, string | number> = { hour };
    for (const entry of series) {
      const n = slot.counts[entry.dataKey] ?? 0;
      const sum = slot.sums[entry.dataKey] ?? 0;
      mapped[entry.dataKey] = n === 0 ? 0 : shouldAverageMetric(entry.dataKey) ? sum / n : sum;
    }
    return mapped;
  });
}

/**
 * Keep one point per telemetry bucket for Week / Month / 90d windows.
 * Domain `[0, n-1]` with values on integer bucket indices; labels and grid share those rails.
 */
export function mapTelemetryDataToKitWindow(
  model: TelemetryTimeSeriesChartModel,
  series: readonly TelemetryChartSeriesModel[],
): {
  readonly data: Record<string, string | number>[];
  readonly xDomain: [number, number];
  readonly xTicks: readonly number[];
  readonly xTickFormatter: (value: number) => string;
} {
  const labels: string[] = [];
  const data = model.data.map((row, index) => {
    const label =
      typeof row.bucketLabel === "string" && row.bucketLabel.length > 0
        ? row.bucketLabel
        : String(index);
    labels.push(label);
    const mapped: Record<string, string | number> = {
      t: index,
      bucketLabel: label,
    };
    for (const entry of series) {
      const value = row[entry.dataKey];
      mapped[entry.dataKey] = typeof value === "number" && Number.isFinite(value) ? value : 0;
    }
    return mapped;
  });

  const n = data.length;
  return {
    data,
    xDomain: [0, Math.max(n - 1, 0)],
    xTicks: chartWindowTickIndices(n),
    xTickFormatter: (value) => labels[Math.round(value)] ?? "",
  };
}

function resolveChartStatus(
  model: TelemetryTimeSeriesChartModel,
  definition: TelemetryRouteChartDefinition,
  errorMessage?: string,
  loading?: boolean,
): Pick<OverviewChartBlockModel, "status" | "statusMessage"> {
  if (!loading && errorMessage) {
    return { status: "error", statusMessage: errorMessage };
  }
  if (loading) {
    return { status: "loading" };
  }
  if (model.state?.kind === "unsupported") {
    return { status: "unsupported", statusMessage: model.state.message };
  }
  if (model.state?.kind === "partial") {
    return { status: "partial", statusMessage: model.state.message };
  }
  if (model.state?.kind === "truncated") {
    return { status: "truncated", statusMessage: model.state.message };
  }
  if (model.isEmpty) {
    return { status: "empty", statusMessage: definition.emptyMessage };
  }
  return { status: "ready" };
}

/** Map live telemetry chart definition + response → kit `RuntimeOverviewChartBlock`-like model. */
export function adaptOverviewChartBlock(
  definition: TelemetryRouteChartDefinition,
  input: {
    readonly response?: RuntimeTelemetryAnalyticsResponse;
    readonly errorMessage?: string;
    readonly loading?: boolean;
  } = {},
): OverviewChartBlockModel {
  const span = OVERVIEW_CHART_SPANS[definition.title] ?? 12;
  const formatters = resolveOverviewChartFormatters(definition.metrics);

  if (definition.kind === "ranking" || !input.response) {
    if (input.loading) {
      return {
        title: definition.title,
        description: definition.description,
        kind: definition.kind === "ranking" ? "bar" : definition.kind,
        span,
        status: "loading",
        ...formatters,
      };
    }
    return {
      title: definition.title,
      description: definition.description,
      kind: definition.kind === "ranking" ? "bar" : definition.kind,
      span,
      status: input.errorMessage ? "error" : "empty",
      statusMessage: input.errorMessage ?? definition.emptyMessage,
      ...formatters,
    };
  }

  const model = buildTelemetryTimeSeriesChartModel(input.response, {
    title: definition.title,
    metrics: definition.metrics,
    breakdown: input.response.breakdown,
    metricAxisIds: definition.metricAxisIds,
  });
  const status = resolveChartStatus(model, definition, input.errorMessage, input.loading);
  const kitSeries = mapTelemetrySeriesToKit(model.series);

  if (status.status !== "ready" && status.status !== "partial" && status.status !== "truncated") {
    return {
      title: definition.title,
      description: definition.description,
      kind: definition.kind,
      span,
      ...status,
      ...formatters,
    };
  }

  if (input.response.granularity === "hour") {
    return {
      title: definition.title,
      description: definition.description,
      kind: definition.kind,
      span,
      ...status,
      data: mapTelemetryDataToKitHours(model, model.series),
      series: kitSeries,
      xKey: "hour",
      xAxisMode: "day-24h",
      ...formatters,
    };
  }

  const windowed = mapTelemetryDataToKitWindow(model, model.series);
  return {
    title: definition.title,
    description: definition.description,
    kind: definition.kind,
    span,
    ...status,
    data: windowed.data,
    series: kitSeries,
    xKey: "t",
    xAxisMode: "window",
    xDomain: windowed.xDomain,
    xTicks: windowed.xTicks,
    xTickFormatter: windowed.xTickFormatter,
    ...formatters,
  };
}

export function sortOverviewChartBlocks(
  blocks: readonly OverviewChartBlockModel[],
): OverviewChartBlockModel[] {
  const order = new Map(OVERVIEW_CHART_ORDER.map((title, index) => [title, index] as const));
  return [...blocks].sort(
    (left, right) => (order.get(left.title) ?? 999) - (order.get(right.title) ?? 999),
  );
}
