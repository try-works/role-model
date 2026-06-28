import type {
  RuntimeTelemetryAnalyticsDimension,
  RuntimeTelemetryAnalyticsMetric,
  RuntimeTelemetryAnalyticsResponse,
  RuntimeTelemetryAnalyticsSeries,
} from "./runtime-api";
import { getTelemetryChartSeriesStyle } from "./telemetry-chart-config";

export interface TelemetryChartSeriesModel {
  readonly key: string;
  readonly label: string;
  readonly colorToken: string;
  readonly dataKey: string;
  readonly strokeOpacity: number;
  readonly fillOpacity: number;
}

export type TelemetrySemanticChartStateKind =
  | "empty"
  | "unsupported"
  | "partial"
  | "truncated"
  | "populated";

export interface TelemetrySemanticChartState {
  readonly kind: TelemetrySemanticChartStateKind;
  readonly message: string;
}

export interface TelemetryTimeSeriesChartModel {
  readonly title: string;
  readonly isEmpty: boolean;
  readonly state?: TelemetrySemanticChartState;
  readonly data: ReadonlyArray<Record<string, number | string | null>>;
  readonly series: readonly TelemetryChartSeriesModel[];
}

export interface TelemetryRankingChartModel {
  readonly title: string;
  readonly metric: RuntimeTelemetryAnalyticsMetric;
  readonly isEmpty: boolean;
  readonly state?: TelemetrySemanticChartState;
  readonly rows: readonly {
    key: string;
    label: string;
    value: number | null;
    colorToken: string;
  }[];
}

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

const weekFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});

const metricLabels: Record<RuntimeTelemetryAnalyticsMetric, string> = {
  requestCount: "Requests",
  successCount: "Success",
  failureCount: "Failures",
  inputTokens: "Input tokens",
  outputTokens: "Output tokens",
  totalTokens: "Total tokens",
  cacheHitTokens: "Cache hit tokens",
  cacheReadTokens: "Cache read tokens",
  cacheBackedRequestRate: "Cache-backed request rate",
  cacheHitTokenRate: "Cache hit token rate",
  actualCostUsd: "Actual cost",
  estimatedCostUsd: "Estimated cost",
  effectiveCostUsd: "Effective cost",
  selectedUncachedCostUsd: "Selected uncached cost",
  baselineMaxEligibleCostUsd: "Most expensive eligible cost",
  routingCostSavingsUsd: "Routing avoided cost",
  cacheCostSavingsUsd: "Cache avoided cost",
  totalAvoidedCostUsd: "Total avoided cost",
  averageLatencyMs: "Average latency",
  p95LatencyMs: "p95 latency",
};

const distinctSeriesColorTokens = [
  "var(--rm-chart-link-blue)",
  "var(--rm-chart-cyan)",
  "var(--rm-chart-highlight-pink)",
  "var(--rm-chart-violet)",
  "var(--rm-chart-link-deep)",
  "var(--rm-chart-warning)",
  "var(--rm-chart-error)",
  "var(--rm-chart-cache-hit)",
  "var(--rm-chart-cache-rate)",
  "var(--rm-chart-latency)",
  "var(--rm-chart-cost)",
  "var(--rm-chart-success)",
] as const;

function pickDistinctSeriesColorToken(preferredColorToken: string, usedColorTokens: Set<string>) {
  if (!usedColorTokens.has(preferredColorToken)) {
    usedColorTokens.add(preferredColorToken);
    return preferredColorToken;
  }
  const fallbackColorToken =
    distinctSeriesColorTokens.find((colorToken) => !usedColorTokens.has(colorToken)) ??
    preferredColorToken;
  usedColorTokens.add(fallbackColorToken);
  return fallbackColorToken;
}

function resolveMetricColorToken(metric: RuntimeTelemetryAnalyticsMetric): string {
  switch (metric) {
    case "inputTokens":
      return "var(--rm-chart-link-blue)";
    case "outputTokens":
      return "var(--rm-chart-cyan)";
    case "totalTokens":
      return "var(--rm-chart-tokens)";
    case "actualCostUsd":
    case "estimatedCostUsd":
    case "effectiveCostUsd":
    case "selectedUncachedCostUsd":
    case "baselineMaxEligibleCostUsd":
      return "var(--rm-chart-cost)";
    case "routingCostSavingsUsd":
    case "cacheCostSavingsUsd":
    case "totalAvoidedCostUsd":
      return "var(--rm-chart-violet)";
    case "averageLatencyMs":
      return "var(--rm-chart-latency)";
    case "p95LatencyMs":
      return "var(--rm-chart-warning)";
    case "successCount":
      return "var(--rm-chart-success)";
    case "failureCount":
      return "var(--rm-chart-failure)";
    case "cacheHitTokens":
    case "cacheReadTokens":
      return "var(--rm-chart-cache-hit)";
    case "cacheBackedRequestRate":
    case "cacheHitTokenRate":
      return "var(--rm-chart-cache-rate)";
    default:
      return "var(--rm-chart-link-blue)";
  }
}

function formatBucketLabel(
  startAtMs: number,
  granularity: RuntimeTelemetryAnalyticsResponse["granularity"],
): string {
  if (granularity === "hour") {
    return hourFormatter.format(startAtMs);
  }
  if (granularity === "week") {
    return `Week of ${weekFormatter.format(startAtMs)}`;
  }
  return dayFormatter.format(startAtMs);
}

function resolveLabel(
  response: RuntimeTelemetryAnalyticsResponse,
  dimension: RuntimeTelemetryAnalyticsDimension,
  key: string,
): string {
  return response.labels[dimension]?.[key] ?? key;
}

function buildOtherAggregateSeries(
  bucketSeries: readonly RuntimeTelemetryAnalyticsSeries[],
  includedKeys: ReadonlySet<string>,
  metrics: readonly RuntimeTelemetryAnalyticsMetric[],
): RuntimeTelemetryAnalyticsSeries | null {
  const remaining = bucketSeries.filter((entry) => !includedKeys.has(entry.key));
  if (remaining.length === 0) {
    return null;
  }
  const aggregatedMetrics: Record<string, number> = {};
  for (const metric of metrics) {
    aggregatedMetrics[metric] = remaining.reduce(
      (sum, entry) => sum + (entry.metrics[metric] ?? 0),
      0,
    );
  }
  return {
    key: "other",
    label: "Other",
    metrics: aggregatedMetrics,
  };
}

function pickBreakdownSeriesKeys(
  response: RuntimeTelemetryAnalyticsResponse,
  metric: RuntimeTelemetryAnalyticsMetric,
  maxSeries: number,
): string[] {
  const totalsByKey = new Map<string, number>();
  for (const bucket of response.buckets) {
    for (const series of bucket.series) {
      totalsByKey.set(
        series.key,
        (totalsByKey.get(series.key) ?? 0) + (series.metrics[metric] ?? 0),
      );
    }
  }
  return [...totalsByKey.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maxSeries)
    .map(([key]) => key);
}

function resolveTelemetryChartState(
  response: RuntimeTelemetryAnalyticsResponse,
  input: {
    readonly metrics: readonly RuntimeTelemetryAnalyticsMetric[];
    readonly breakdown?: RuntimeTelemetryAnalyticsDimension | null;
    readonly visibleSeriesCount?: number;
  },
): TelemetrySemanticChartState | undefined {
  if (response.metadata?.matchedRowCount === 0) {
    return {
      kind: "empty",
      message: "No telemetry rows match the current filters.",
    };
  }

  const unsupportedMetric = input.metrics
    .map((metric) => response.metricSupport?.[metric])
    .find((support) => support?.status === "unsupported");
  if (unsupportedMetric) {
    return {
      kind: "unsupported",
      message:
        unsupportedMetric.reason ??
        `The selected telemetry slice does not support ${unsupportedMetric.metric}.`,
    };
  }

  const breakdown = input.breakdown ?? response.breakdown ?? null;
  const breakdownSupport = breakdown ? response.dimensionSupport?.[breakdown] : undefined;
  if (breakdownSupport?.status === "unsupported") {
    return {
      kind: "unsupported",
      message: breakdownSupport.reason ?? `No rows in this slice include ${breakdown}.`,
    };
  }
  if (
    breakdown &&
    typeof input.visibleSeriesCount === "number" &&
    input.visibleSeriesCount === 0 &&
    (response.metadata?.matchedRowCount ?? 0) > 0
  ) {
    return {
      kind: "unsupported",
      message: `No rows in this slice include ${breakdown}.`,
    };
  }

  if (response.metadata?.truncated) {
    return {
      kind: "truncated",
      message: response.metadata.truncationReason ?? "Telemetry analytics were truncated.",
    };
  }

  const partialMetric = input.metrics
    .map((metric) => response.metricSupport?.[metric])
    .find((support) => support?.status === "partial");
  if (partialMetric) {
    return {
      kind: "partial",
      message:
        partialMetric.reason ??
        `Some rows in this telemetry slice do not support ${partialMetric.metric}.`,
    };
  }
  if (breakdownSupport?.status === "partial") {
    return {
      kind: "partial",
      message: breakdownSupport.reason ?? `Some rows in this slice omit ${breakdown}.`,
    };
  }
  return undefined;
}

function isBlockingTelemetryChartState(state: TelemetrySemanticChartState | undefined): boolean {
  return state?.kind === "empty" || state?.kind === "unsupported";
}

export function resolveTelemetryGranularity(
  windowMs: number,
): RuntimeTelemetryAnalyticsResponse["granularity"] {
  if (windowMs <= 24 * 60 * 60 * 1000) {
    return "hour";
  }
  if (windowMs <= 31 * 24 * 60 * 60 * 1000) {
    return "day";
  }
  return "week";
}

export function buildTelemetryTimeSeriesChartModel(
  response: RuntimeTelemetryAnalyticsResponse,
  input: {
    readonly title: string;
    readonly metrics: readonly RuntimeTelemetryAnalyticsMetric[];
    readonly breakdown?: RuntimeTelemetryAnalyticsDimension | null;
    readonly maxSeries?: number;
  },
): TelemetryTimeSeriesChartModel {
  const breakdown = input.breakdown ?? response.breakdown ?? null;
  if (!breakdown || input.metrics.length > 1) {
    const usedColorTokens = new Set<string>();
    const series = input.metrics.map((metric) => ({
      key: metric,
      label: metricLabels[metric],
      colorToken: pickDistinctSeriesColorToken(resolveMetricColorToken(metric), usedColorTokens),
      dataKey: metric,
      strokeOpacity: 1,
      fillOpacity: 0.16,
    }));
    const state = resolveTelemetryChartState(response, {
      metrics: input.metrics,
      breakdown,
    });

    return {
      title: input.title,
      isEmpty: response.buckets.length === 0 || isBlockingTelemetryChartState(state),
      ...(state ? { state } : {}),
      data: response.buckets.map((bucket) => ({
        bucketStartMs: bucket.startAtMs,
        bucketEndMs: bucket.endAtMs,
        bucketLabel: formatBucketLabel(bucket.startAtMs, response.granularity),
        ...Object.fromEntries(
          input.metrics.map((metric) => [metric, bucket.totals[metric] ?? null] as const),
        ),
      })),
      series,
    };
  }

  const primaryMetric = input.metrics[0] ?? "requestCount";
  const topSeriesKeys = pickBreakdownSeriesKeys(response, primaryMetric, input.maxSeries ?? 4);
  const includedSeries = new Set(topSeriesKeys);
  const state = resolveTelemetryChartState(response, {
    metrics: input.metrics,
    breakdown,
    visibleSeriesCount: topSeriesKeys.length,
  });

  const usedColorTokens = new Set<string>();
  return {
    title: input.title,
    isEmpty: response.buckets.length === 0 || isBlockingTelemetryChartState(state),
    ...(state ? { state } : {}),
    data: response.buckets.map((bucket) => {
      const otherSeries = buildOtherAggregateSeries(bucket.series, includedSeries, input.metrics);
      const selectedSeries = [
        ...bucket.series.filter((entry) => includedSeries.has(entry.key)),
        ...(otherSeries ? [otherSeries] : []),
      ];
      return {
        bucketStartMs: bucket.startAtMs,
        bucketEndMs: bucket.endAtMs,
        bucketLabel: formatBucketLabel(bucket.startAtMs, response.granularity),
        ...Object.fromEntries(
          selectedSeries.map(
            (series) => [`series:${series.key}`, series.metrics[primaryMetric] ?? null] as const,
          ),
        ),
      };
    }),
    series: [
      ...topSeriesKeys.map((key) => {
        const style = getTelemetryChartSeriesStyle(breakdown, key);
        return {
          key,
          label: resolveLabel(response, breakdown, key),
          colorToken: pickDistinctSeriesColorToken(style.colorToken, usedColorTokens),
          dataKey: `series:${key}`,
          strokeOpacity: style.strokeOpacity,
          fillOpacity: style.fillOpacity,
        };
      }),
      ...(response.buckets.some((bucket) =>
        bucket.series.some((series) => !includedSeries.has(series.key)),
      )
        ? [
            {
              key: "other",
              label: "Other",
              colorToken: "var(--rm-chart-neutral-2)",
              dataKey: "series:other",
              strokeOpacity: 1,
              fillOpacity: 0.12,
            },
          ]
        : []),
    ],
  };
}

export function buildTelemetryRankingChartModel(
  response: RuntimeTelemetryAnalyticsResponse,
  input: {
    readonly title: string;
    readonly metric: RuntimeTelemetryAnalyticsMetric;
  },
): TelemetryRankingChartModel {
  const dimension = response.ranking?.dimension ?? response.breakdown ?? "sourceType";
  const usedColorTokens = new Set<string>();
  const rows =
    response.ranking?.rows.map((row) => ({
      key: row.key,
      label: resolveLabel(response, dimension, row.key),
      value: row.value,
      colorToken: pickDistinctSeriesColorToken(
        getTelemetryChartSeriesStyle(dimension, row.key).colorToken,
        usedColorTokens,
      ),
    })) ?? [];
  const state = resolveTelemetryChartState(response, {
    metrics: [input.metric],
    breakdown: dimension,
    visibleSeriesCount: rows.length,
  });

  return {
    title: input.title,
    metric: input.metric,
    isEmpty: rows.length === 0 || isBlockingTelemetryChartState(state),
    ...(state ? { state } : {}),
    rows,
  };
}
