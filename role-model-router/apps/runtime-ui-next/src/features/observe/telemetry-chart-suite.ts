import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import type { Message } from "../../message";
import { telemetryChartCard } from "../overview/charts";

/** Shared shape for the reference telemetry chart suites (Requests + Observe routing). */
export interface TelemetryChartDefinition {
  readonly breakdown?: string;
  readonly className: string;
  readonly description: string;
  readonly emptyMessage: string;
  readonly kind: "area" | "bar" | "line" | "ranking";
  readonly metrics: ReadonlyArray<string>;
  readonly ranking?: {
    readonly dimension: string;
    readonly limit: number;
    readonly metric: string;
  };
  readonly title: string;
  readonly usesSelectedBreakdown?: boolean;
}

const labelFor = (metric: string): string => {
  switch (metric) {
    case "requestCount":
      return "Requests";
    case "successCount":
      return "Success";
    case "failureCount":
      return "Failures";
    case "inputTokens":
      return "Input tokens";
    case "outputTokens":
      return "Output tokens";
    case "totalTokens":
      return "Total tokens";
    case "cacheHitTokens":
      return "Cache hit tokens";
    case "cacheHitTokenRate":
      return "Cache hit token rate";
    case "actualCostUsd":
      return "Actual cost";
    case "estimatedCostUsd":
      return "Estimated cost";
    case "effectiveCostUsd":
      return "Effective cost";
    case "averageLatencyMs":
      return "Average latency";
    case "p95LatencyMs":
      return "p95 latency";
    case "routingCostSavingsUsd":
      return "Routing avoided cost";
    case "cacheCostSavingsUsd":
      return "Cache avoided cost";
    case "totalAvoidedCostUsd":
      return "Total avoided cost";
    default:
      return metric;
  }
};

const numberOrNull = (value: unknown): number | null => {
  const numeric = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(numeric)
    ? null
    : numeric;
};

const bucketLabel = (startAtMs: unknown, granularity: "hour" | "day"): string => {
  const ms = Number(startAtMs);
  if (!Number.isFinite(ms)) return "—";
  const iso = new Date(ms).toISOString();
  return granularity === "hour" ? `${iso.slice(11, 13)}:00` : iso.slice(5, 10);
};

interface AnalyticsBucket {
  readonly startAtMs?: unknown;
  readonly totals?: unknown;
}

export const chartSeriesFrom = (
  body: unknown,
  chart: TelemetryChartDefinition,
): { hasData: boolean; series: ReadonlyArray<ChartSeries> } => {
  const record = body as {
    readonly buckets?: ReadonlyArray<AnalyticsBucket>;
    readonly granularity?: unknown;
    readonly ranking?: {
      readonly rows?: ReadonlyArray<{
        readonly key?: unknown;
        readonly label?: unknown;
        readonly value?: unknown;
      }>;
    } | null;
  } | null;
  if (record === null || typeof record !== "object") return { hasData: false, series: [] };
  if (chart.kind === "ranking") {
    // A ranking row's unique identity is its key (endpoint/model id), never its display label: two endpoints can
    // share a displayName. Dedupe by key and disambiguate equal labels with the key so the chart's x positions stay
    // unique (TanStack throws "A stack requires at most one value for each position and series" otherwise).
    const rows = record.ranking?.rows ?? [];
    const byKey = new Map<
      string,
      { readonly key: string; readonly label: string; readonly value: number | null }
    >();
    for (const row of rows) {
      const rawKey = row.key;
      const key =
        typeof rawKey === "string" && rawKey.length > 0
          ? rawKey
          : String(rawKey ?? row.label ?? "—");
      if (byKey.has(key)) continue;
      byKey.set(key, {
        key,
        label: typeof row.label === "string" ? row.label : key,
        value: numberOrNull(row.value),
      });
    }
    const labelCounts = new Map<string, number>();
    for (const entry of byKey.values())
      labelCounts.set(entry.label, (labelCounts.get(entry.label) ?? 0) + 1);
    const points = [...byKey.values()].flatMap((entry) => {
      if (entry.value === null || entry.value === 0) return [];
      const shared = (labelCounts.get(entry.label) ?? 0) > 1;
      return [
        { label: shared ? `${entry.label} (${entry.key})` : entry.label, value: entry.value },
      ];
    });
    return points.length === 0
      ? { hasData: false, series: [] }
      : {
          hasData: true,
          series: [
            {
              id: chart.ranking?.metric ?? "value",
              label: labelFor(chart.ranking?.metric ?? "value"),
              points,
            },
          ],
        };
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
  const hasData = series.some((entry) =>
    entry.points.some((point) => point.value !== null && point.value > 0),
  );
  return { hasData, series };
};

export const telemetryChartCards = (
  definitions: ReadonlyArray<TelemetryChartDefinition>,
  entries: ReadonlyArray<{ readonly id: string; readonly json: string }>,
  state: { readonly status: "idle" | "loading" | "ok" | "error"; readonly message?: string },
  h: HtmlBuilder<Message>,
  gridAttribute: string,
): Html => {
  const byId = new Map(entries.map((entry) => [entry.id, entry.json]));
  return h.div(
    [
      h.DataAttribute(gridAttribute, ""),
      h.Class(
        "grid w-full grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2",
      ),
    ],
    definitions.map((chart) => {
      const json = byId.get(chart.title);
      let body: unknown;
      if (json !== undefined) {
        try {
          body = JSON.parse(json);
        } catch {
          body = undefined;
        }
      }
      const parsed =
        body === undefined ? { hasData: false, series: [] } : chartSeriesFrom(body, chart);
      const cardState =
        state.status === "loading"
          ? "loading"
          : state.status === "error"
            ? "error"
            : parsed.hasData
              ? "ready"
              : "empty";
      return h.div(
        [h.Class(chart.className)],
        [
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
        ],
      );
    }),
  );
};
