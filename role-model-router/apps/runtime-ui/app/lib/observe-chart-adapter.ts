import type { ChartSeries, RankingChartRow } from "@role-model/ui";

import type { RuntimeTelemetryAnalyticsResponse } from "./runtime-api";
import {
  adaptOverviewChartBlock,
  resolveOverviewChartFormatters,
  type OverviewChartBlockModel,
  type OverviewChartBlockStatus,
} from "./overview-chart-adapter";
import {
  buildTelemetryRankingChartModel,
  type TelemetryRankingChartModel,
} from "./telemetry-analytics";
import type { TelemetryRouteChartDefinition } from "./telemetry-route-models";

/** RM3 ChartGrid spans parsed from legacy tailwind class names (6 or 12 only). */
export function resolveObserveChartSpan(className?: string): 6 | 12 {
  return className?.includes("xl:col-span-6") ? 6 : 12;
}

export type ObserveChartBlockModel = {
  readonly title: string;
  readonly description?: string;
  readonly kind: "area" | "line" | "bar" | "ranking";
  readonly span: 6 | 12;
  readonly status: OverviewChartBlockStatus;
  readonly statusMessage?: string;
  readonly data?: Record<string, string | number>[];
  readonly series?: ChartSeries[];
  readonly rows?: RankingChartRow[];
  readonly valueLabel?: string;
  readonly leftTickFormatter?: (value: number) => string;
  readonly rightTickFormatter?: (value: number) => string;
  readonly valueFormatter?: (value: number) => string;
};

function resolveRankingStatus(
  model: TelemetryRankingChartModel,
  definition: TelemetryRouteChartDefinition,
  errorMessage?: string,
  loading?: boolean,
): Pick<ObserveChartBlockModel, "status" | "statusMessage"> {
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

function mapRankingRows(model: TelemetryRankingChartModel): RankingChartRow[] {
  return model.rows
    .filter((row): row is typeof row & { value: number } => typeof row.value === "number")
    .map((row) => ({
      key: row.key,
      label: row.label,
      value: row.value,
      color: row.colorToken,
    }));
}

function metricLabel(metric: string): string {
  switch (metric) {
    case "requestCount":
      return "Requests";
    case "totalAvoidedCostUsd":
      return "Avoided cost";
    case "effectiveCostUsd":
      return "Effective cost";
    case "averageLatencyMs":
      return "Average latency";
    default:
      return metric;
  }
}

/** Map live telemetry chart definition + response → kit Observe chart block model. */
export function adaptObserveChartBlock(
  definition: TelemetryRouteChartDefinition,
  input: {
    readonly response?: RuntimeTelemetryAnalyticsResponse;
    readonly errorMessage?: string;
    readonly loading?: boolean;
  } = {},
): ObserveChartBlockModel {
  const span = resolveObserveChartSpan(definition.className);
  const formatters = resolveOverviewChartFormatters(definition.metrics);

  if (definition.kind === "ranking") {
    if (input.loading) {
      return {
        title: definition.title,
        description: definition.description,
        kind: "ranking",
        span,
        status: "loading",
        valueLabel: metricLabel(definition.metrics[0] ?? "requestCount"),
        ...formatters,
      };
    }
    if (!input.response) {
      return {
        title: definition.title,
        description: definition.description,
        kind: "ranking",
        span,
        status: input.errorMessage ? "error" : "empty",
        statusMessage: input.errorMessage ?? definition.emptyMessage,
        valueLabel: metricLabel(definition.metrics[0] ?? "requestCount"),
        ...formatters,
      };
    }

    const model = buildTelemetryRankingChartModel(input.response, {
      title: definition.title,
      metric: definition.metrics[0] ?? "requestCount",
    });
    const status = resolveRankingStatus(model, definition, input.errorMessage, input.loading);

    if (status.status !== "ready" && status.status !== "partial" && status.status !== "truncated") {
      return {
        title: definition.title,
        description: definition.description,
        kind: "ranking",
        span,
        valueLabel: metricLabel(definition.metrics[0] ?? "requestCount"),
        ...status,
        ...formatters,
      };
    }

    return {
      title: definition.title,
      description: definition.description,
      kind: "ranking",
      span,
      valueLabel: metricLabel(definition.metrics[0] ?? "requestCount"),
      rows: mapRankingRows(model),
      ...status,
      ...formatters,
    };
  }

  const overviewBlock: OverviewChartBlockModel = adaptOverviewChartBlock(definition, input);
  return {
    title: overviewBlock.title,
    description: overviewBlock.description,
    kind: definition.kind,
    span,
    status: overviewBlock.status,
    statusMessage: overviewBlock.statusMessage,
    data: overviewBlock.data,
    series: overviewBlock.series,
    leftTickFormatter: overviewBlock.leftTickFormatter,
    rightTickFormatter: overviewBlock.rightTickFormatter,
    valueFormatter: overviewBlock.valueFormatter,
  };
}
