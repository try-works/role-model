import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import type { Message } from "../../message";
import { telemetryChartCard } from "../overview/charts";

/**
 * S632 (task-112): the observe-routing chart suite ported from the :3456 reference
 * (apps/runtime-ui/app/routes/observe-routing.tsx + lib/telemetry-route-models.ts). Every card is fed by the
 * telemetry analytics query (POST /api/role-model/telemetry/query); a card whose query failed or returned no
 * data renders the honest empty state INSIDE the plot.
 */
export type RoutingChartKind = "area" | "bar" | "ranking";

export interface RoutingChartDefinition {
  readonly breakdown?: string;
  readonly className: string;
  readonly description: string;
  readonly emptyMessage: string;
  readonly kind: RoutingChartKind;
  readonly metrics: ReadonlyArray<string>;
  readonly ranking?: { readonly dimension: string; readonly limit: number; readonly metric: string };
  readonly title: string;
}

export const ROUTING_CHARTS: ReadonlyArray<RoutingChartDefinition> = [
  {
    breakdown: undefined,
    className: "min-w-0 bg-card col-span-1 md:col-span-2",
    description: "Avoided spend based on the selected route versus the highest-cost eligible configured candidate, plus cache savings.",
    emptyMessage: "No routing savings have been recorded for the current slice.",
    kind: "area",
    metrics: ["routingCostSavingsUsd", "cacheCostSavingsUsd", "totalAvoidedCostUsd"],
    title: "Cost avoided by routing",
  },
  {
    className: "min-w-0 bg-card col-span-1 md:col-span-2",
    description: "Historical routed decision volume across the filtered slice.",
    emptyMessage: "No routed decisions match the current filters.",
    kind: "bar",
    metrics: ["requestCount"],
    title: "Routing decision volume",
  },
  {
    breakdown: "taxonomyRoleId",
    className: "min-w-0 bg-card col-span-1",
    description: "Observe which taxonomy roles are driving routing decisions over time.",
    emptyMessage: "No taxonomy role routing telemetry is available for the current slice.",
    kind: "bar",
    metrics: ["requestCount"],
    title: "Routing volume by taxonomy role",
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "Compare routing-driven avoided cost across normalized taxonomy tasks.",
    emptyMessage: "No taxonomy task savings are available for the current slice.",
    kind: "ranking",
    metrics: ["totalAvoidedCostUsd"],
    ranking: { dimension: "taxonomyTaskType", limit: 8, metric: "totalAvoidedCostUsd" },
    title: "Avoided cost by taxonomy task",
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "Easy, medium, and hard demand mix for the selected historical slice.",
    emptyMessage: "No difficulty-classified requests match the current slice.",
    kind: "ranking",
    metrics: ["requestCount"],
    ranking: { dimension: "difficultyBucket", limit: 8, metric: "requestCount" },
    title: "Difficulty distribution",
  },
  {
    breakdown: "selectedStrategy",
    className: "min-w-0 bg-card col-span-1",
    description: "Which routing strategies are being selected over time.",
    emptyMessage: "No routing strategy selections match the current slice.",
    kind: "bar",
    metrics: ["requestCount"],
    title: "Strategy selection trend",
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "Rank the taxonomy capabilities currently driving routed traffic.",
    emptyMessage: "No capability-tagged routing telemetry is available for the current slice.",
    kind: "ranking",
    metrics: ["requestCount"],
    ranking: { dimension: "taxonomyCapabilityId", limit: 8, metric: "requestCount" },
    title: "Capability routing mix",
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "See which tool-class patterns are most associated with routed requests.",
    emptyMessage: "No tool-class telemetry is available for the current slice.",
    kind: "ranking",
    metrics: ["requestCount"],
    ranking: { dimension: "taxonomyToolClassId", limit: 8, metric: "requestCount" },
    title: "Tool class routing mix",
  },
  {
    className: "min-w-0 bg-card col-span-1",
    description: "Selected model distribution across the filtered routing slice.",
    emptyMessage: "No model-selection history is available for the current slice.",
    kind: "ranking",
    metrics: ["requestCount"],
    ranking: { dimension: "modelId", limit: 8, metric: "requestCount" },
    title: "Model selection",
  },
];

export interface RoutingChartQuery {
  readonly id: string;
  readonly query: {
    readonly breakdown: string | null;
    readonly filters: Readonly<Record<string, never>>;
    readonly granularity: "hour" | "day";
    readonly metrics: ReadonlyArray<string>;
    readonly ranking: { readonly dimension: string; readonly limit: number; readonly metric: string } | null;
    readonly windowMs: number;
  };
}

export const routingChartGranularity = (windowMs: number): "hour" | "day" => (windowMs <= 86_400_000 ? "hour" : "day");

export const buildRoutingChartQueries = (windowMs: number): ReadonlyArray<RoutingChartQuery> =>
  ROUTING_CHARTS.map((chart) => ({
    id: chart.title,
    query: {
      breakdown: chart.breakdown ?? null,
      filters: {},
      granularity: routingChartGranularity(windowMs),
      metrics: chart.metrics,
      ranking: chart.ranking ?? null,
      windowMs,
    },
  }));

const labelFor = (metric: string): string => {
  switch (metric) {
    case "requestCount": return "Requests";
    case "routingCostSavingsUsd": return "Routing avoided cost";
    case "cacheCostSavingsUsd": return "Cache avoided cost";
    case "totalAvoidedCostUsd": return "Total avoided cost";
    default: return metric;
  }
};

const numberOrNull = (value: unknown): number | null => {
  const numeric = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(numeric) ? null : numeric;
};

interface AnalyticsBucket {
  readonly series?: ReadonlyArray<{ readonly key?: unknown; readonly label?: unknown; readonly totals?: unknown }>;
  readonly startAtMs?: unknown;
  readonly totals?: unknown;
}

const bucketLabel = (startAtMs: unknown, granularity: "hour" | "day"): string => {
  const ms = Number(startAtMs);
  if (!Number.isFinite(ms)) return "—";
  const iso = new Date(ms).toISOString();
  return granularity === "hour" ? iso.slice(11, 13) + ":00" : iso.slice(5, 10);
};

const seriesFrom = (body: unknown, chart: RoutingChartDefinition): { hasData: boolean; series: ReadonlyArray<ChartSeries> } => {
  const record = body as {
    readonly buckets?: ReadonlyArray<AnalyticsBucket>;
    readonly granularity?: unknown;
    readonly ranking?: { readonly rows?: ReadonlyArray<{ readonly key?: unknown; readonly label?: unknown; readonly value?: unknown }> } | null;
  } | null;
  if (record === null || typeof record !== "object") return { hasData: false, series: [] };
  if (chart.kind === "ranking") {
    const rows = record.ranking?.rows ?? [];
    const points = rows.flatMap((row) => {
      const value = numberOrNull(row.value);
      return value === null || value === 0 ? [] : [{ label: typeof row.label === "string" ? row.label : String(row.key ?? "—"), value }];
    });
    return points.length === 0
      ? { hasData: false, series: [] }
      : { hasData: true, series: [{ id: chart.ranking?.metric ?? "value", label: labelFor(chart.ranking?.metric ?? "value"), points }] };
  }
  const granularity = record.granularity === "hour" ? "hour" : "day";
  const buckets = record.buckets ?? [];
  const series: ChartSeries[] = chart.metrics.map((metric) => ({
    id: metric,
    label: labelFor(metric),
    points: buckets.map((bucket) => ({
      label: bucketLabel(bucket.startAtMs, granularity),
      value: numberOrNull((bucket.totals as Record<string, unknown> | undefined)?.[metric]),
    })),
  }));
  const hasData = series.some((entry) => entry.points.some((point) => point.value !== null && point.value > 0));
  return { hasData, series };
};

export const routingChartCards = (
  entries: ReadonlyArray<{ readonly id: string; readonly json: string }>,
  state: { readonly status: "idle" | "loading" | "ok" | "error"; readonly message?: string },
  h: HtmlBuilder<Message>,
): Html => {
  const byId = new Map(entries.map((entry) => [entry.id, entry.json]));
  return h.div([h.DataAttribute("routing-charts", ""), h.Class("grid w-full grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2")], ROUTING_CHARTS.map((chart) => {
    const json = byId.get(chart.title);
    let body: unknown;
    if (json !== undefined) {
      try { body = JSON.parse(json); } catch { body = undefined; }
    }
    const parsed = body === undefined ? { hasData: false, series: [] } : seriesFrom(body, chart);
    const cardState = state.status === "loading" ? "loading" : state.status === "error" ? "error" : parsed.hasData ? "ready" : "empty";
    return h.div([h.Class(chart.className)], [
      telemetryChartCard({
        description: chart.description,
        emptyMessage: chart.emptyMessage,
        hasData: parsed.hasData,
        h,
        kind: chart.kind === "ranking" ? "bar" : chart.kind,
        series: parsed.series,
        state: cardState,
        title: chart.title,
      }),
    ]);
  }));
};
