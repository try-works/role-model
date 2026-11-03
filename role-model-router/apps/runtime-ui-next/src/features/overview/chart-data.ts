import type { ChartSeries } from "@role-model/ui/foldkit-chart";

import type { ReadbackState } from "../../readback";

export interface OverviewItem {
  readonly duration_ms?: unknown;
  readonly modelId?: unknown;
  readonly resp_status_code?: unknown;
  readonly timestamp?: unknown;
  readonly tokens?: unknown;
}

export interface Bucket {
  readonly avg: number;
  readonly cacheTokens: number;
  readonly empty: boolean;
  readonly failure: number;
  readonly inputTokens: number;
  readonly label: string;
  readonly outputTokens: number;
  readonly p95: number;
  readonly success: number;
  readonly tokens: number;
}

export const percentile = (values: readonly number[], p: number): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
};

const bucketRule = (windowMs: number): { bucketMs: number; label: (ms: number) => string } => {
  if (windowMs <= 86_400_000) return { bucketMs: 3_600_000, label: (ms) => new Date(ms).toISOString().slice(11, 13) + ":00" };
  if (windowMs <= 604_800_000) return { bucketMs: 86_400_000, label: (ms) => new Date(ms).toISOString().slice(5, 10) };
  if (windowMs <= 2_592_000_000) return { bucketMs: 86_400_000, label: (ms) => new Date(ms).toISOString().slice(5, 10) };
  return { bucketMs: 604_800_000, label: (ms) => new Date(ms).toISOString().slice(5, 10) };
};

/** Range labels used by the Requests and Observe routing filter bars. */
export const WINDOW_FOR_RANGE: Readonly<Record<string, number>> = {
  "90 days": 7_776_000_000,
  Day: 86_400_000,
  Month: 2_592_000_000,
  Week: 604_800_000,
};

export const windowForRange = (range: string | undefined): number =>
  WINDOW_FOR_RANGE[range ?? "Day"] ?? 86_400_000;

export const bucketsFor = (
  state: ReadbackState,
  windowMs: number,
): { buckets: readonly Bucket[]; models: ReadonlyMap<string, number>; period: number } => {
  const rowData = state.rows[0];
  if (rowData === undefined) return { buckets: [], models: new Map(), period: windowMs };
  const parsed = JSON.parse(rowData.meta) as { items: readonly OverviewItem[]; window: { startAtMs: number; endAtMs: number } };
  const rule = bucketRule(windowMs);
  const start = parsed.window.startAtMs;
  const end = parsed.window.endAtMs;
  const count = Math.max(1, Math.ceil((end - start) / rule.bucketMs));
  const grouped = new Map<number, { cacheTokens: number; durations: number[]; inputTokens: number; outputTokens: number; success: number; failure: number; tokens: number }>();
  const models = new Map<string, number>();
  for (const item of parsed.items) {
    const raw = typeof item.timestamp === "string" ? Date.parse(item.timestamp) : Number.NaN;
    if (!Number.isFinite(raw)) continue;
    const index = Math.min(count - 1, Math.max(0, Math.floor((raw - start) / rule.bucketMs)));
    const bucket = grouped.get(index) ?? { cacheTokens: 0, durations: [], inputTokens: 0, outputTokens: 0, success: 0, failure: 0, tokens: 0 };
    const duration = Number(item.duration_ms);
    const tokenShape = item.tokens as { cache_tokens?: unknown; input_tokens?: unknown; output_tokens?: unknown } | undefined;
    if (typeof tokenShape === "object" && tokenShape !== null) {
      const inputTokens = Number(tokenShape.input_tokens);
      const outputTokens = Number(tokenShape.output_tokens);
      const cacheTokens = Number(tokenShape.cache_tokens);
      if (Number.isFinite(inputTokens)) { bucket.inputTokens += inputTokens; bucket.tokens += inputTokens; }
      if (Number.isFinite(outputTokens)) { bucket.outputTokens += outputTokens; bucket.tokens += outputTokens; }
      if (Number.isFinite(cacheTokens)) bucket.cacheTokens += cacheTokens;
    }
    if (Number.isFinite(duration)) bucket.durations.push(duration);
    const status = Number(item.resp_status_code);
    if (status >= 200 && status < 400) bucket.success += 1;
    else bucket.failure += 1;
    grouped.set(index, bucket);
    const model = typeof item.modelId === "string" && item.modelId.length > 0 ? item.modelId : "unknown";
    models.set(model, (models.get(model) ?? 0) + 1);
  }
  const buckets = Array.from({ length: count }, (_, index) => {
    const bucket = grouped.get(index);
    return {
      avg: bucket === undefined || bucket.durations.length === 0 ? 0 : bucket.durations.reduce((sum, value) => sum + value, 0) / bucket.durations.length,
      cacheTokens: bucket?.cacheTokens ?? 0,
      empty: bucket === undefined,
      failure: bucket?.failure ?? 0,
      inputTokens: bucket?.inputTokens ?? 0,
      label: rule.label(start + index * rule.bucketMs),
      outputTokens: bucket?.outputTokens ?? 0,
      p95: bucket === undefined ? 0 : percentile(bucket.durations, 95),
      success: bucket?.success ?? 0,
      tokens: bucket?.tokens ?? 0,
    };
  });
  return { buckets, models, period: count };
};

export const seriesHasValues = (series: ReadonlyArray<ChartSeries>): boolean =>
  series.some((entry) => entry.points.some((point) => point.value !== null && Number.isFinite(point.value)));

/** Requests/Routing volume series derived from the same metrics buckets as the overview charts. */
export const volumeSeriesFor = (
  state: ReadbackState,
  windowMs: number,
  options: { readonly failures?: boolean; readonly routeReadbackRows?: number } = {},
): { readonly buckets: readonly Bucket[]; readonly series: ReadonlyArray<ChartSeries> } => {
  const { buckets } = bucketsFor(state, windowMs);
  const points = (value: (bucket: Bucket) => number) =>
    buckets.length === 0
      ? [{ label: "No data", value: null as number | null }]
      : buckets.map((bucket) => ({ label: bucket.label, value: bucket.empty ? null : value(bucket) }));
  const series: ChartSeries[] = [
    { id: "requests", label: "Requests", points: points((bucket) => bucket.success + bucket.failure) },
    ...(options.failures === true ? [{ id: "failures", label: "Failures", points: points((bucket) => bucket.failure) }] : []),
  ];
  return { buckets, series };
};
