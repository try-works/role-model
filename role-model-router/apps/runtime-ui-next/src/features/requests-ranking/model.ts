import { Schema } from "effect";

/**
 * S413: Requests ranking metric/target filters. The original Requests page wrote metric/rankBy
 * into the URL and fed buildObserveRequestsChartDefinitions -> POST /telemetry/query with
 * {windowMs, granularity, metrics, breakdown:null, filters, ranking:{dimension, metric, limit:8}}.
 * This slice keeps the GET /telemetry/requests readback untouched and adds the ranking query.
 */

export const REQUESTS_RANKING_METRIC_OPTIONS = [
  { label: "Requests", value: "requestCount" },
  { label: "Total tokens", value: "totalTokens" },
  { label: "Effective cost", value: "effectiveCostUsd" },
  { label: "Average latency", value: "averageLatencyMs" },
  { label: "Cache hit rate", value: "cacheHitTokenRate" },
] as const;

export const REQUESTS_RANKING_TARGET_OPTIONS = [
  { label: "Endpoint variants", value: "endpointId" },
  { label: "Upstream models", value: "modelId" },
  { label: "Reasoning efforts", value: "reasoningEffort" },
  { label: "Effort sources", value: "effortSource" },
  { label: "Providers", value: "providerId" },
  { label: "Taxonomy groups", value: "taxonomyGroupId" },
  { label: "Taxonomy roles", value: "taxonomyRoleId" },
  { label: "Taxonomy tasks", value: "taxonomyTaskType" },
  { label: "Task variants", value: "taxonomyTaskVariant" },
  { label: "Capabilities", value: "taxonomyCapabilityId" },
  { label: "Modalities", value: "taxonomyModalityId" },
  { label: "Tool classes", value: "taxonomyToolClassId" },
] as const;

export type RequestsRankingMetric = (typeof REQUESTS_RANKING_METRIC_OPTIONS)[number]["value"];
export type RequestsRankingTarget = (typeof REQUESTS_RANKING_TARGET_OPTIONS)[number]["value"];

export const RequestsRankingFieldSchema = Schema.Literals(["metric", "rankingTarget"]);
export type RequestsRankingField = typeof RequestsRankingFieldSchema.Type;

export const requestsRankingMetricOf = (value: string): RequestsRankingMetric | undefined =>
  REQUESTS_RANKING_METRIC_OPTIONS.find((option) => option.value === value)?.value;

export const requestsRankingTargetOf = (value: string): RequestsRankingTarget | undefined =>
  REQUESTS_RANKING_TARGET_OPTIONS.find((option) => option.value === value)?.value;

export const RequestsRankingRowSchema = Schema.Struct({
  key: Schema.String,
  label: Schema.String,
  value: Schema.NullOr(Schema.Number),
});
export type RequestsRankingRow = typeof RequestsRankingRowSchema.Type;
export const RequestsRankingRowsSchema = Schema.Array(RequestsRankingRowSchema);

export const RequestsRankingStateSchema = Schema.Struct({
  message: Schema.optional(Schema.String),
  metric: Schema.String,
  rankingTarget: Schema.String,
  rows: Schema.Array(RequestsRankingRowSchema),
  status: Schema.Literals(["idle", "loading", "ok", "empty", "error"]),
  token: Schema.Number,
});
export type RequestsRankingState = typeof RequestsRankingStateSchema.Type;

export const initialRequestsRankingState = (): RequestsRankingState => ({
  metric: "averageLatencyMs",
  rankingTarget: "endpointId",
  rows: [],
  status: "idle",
  token: 0,
});

export interface RequestsRankingQuery {
  readonly breakdown: null;
  readonly filters: Readonly<Record<string, never>>;
  readonly granularity: "day";
  readonly metrics: readonly RequestsRankingMetric[];
  readonly ranking: {
    readonly dimension: RequestsRankingTarget;
    readonly limit: 8;
    readonly metric: RequestsRankingMetric;
  };
  readonly windowMs: number;
}

const WEEK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const buildRequestsRankingQuery = (input: {
  readonly metric: RequestsRankingMetric;
  readonly rankingTarget: RequestsRankingTarget;
}): RequestsRankingQuery => ({
  breakdown: null,
  filters: {},
  granularity: "day",
  metrics: [input.metric],
  ranking: { dimension: input.rankingTarget, limit: 8, metric: input.metric },
  windowMs: WEEK_WINDOW_MS,
});

const TelemetryErrorSchema = Schema.Struct({
  error: Schema.optional(Schema.String),
});

const AnalyticsResponseSchema = Schema.Struct({
  ranking: Schema.NullOr(
    Schema.Struct({
      rows: Schema.Array(RequestsRankingRowSchema),
    }),
  ),
});

export interface RequestsRankingClient {
  readonly query: (payload: RequestsRankingQuery) => Promise<readonly RequestsRankingRow[]>;
}

interface RequestsRankingClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly token?: string;
}

export const createRequestsRankingClient = (
  options: RequestsRankingClientOptions = {},
): RequestsRankingClient => ({
  query: async (payload) => {
    const fetchImpl = options.fetchImpl ?? fetch;
    const headers: HeadersInit =
      options.token === undefined
        ? { accept: "application/json", "content-type": "application/json" }
        : {
            accept: "application/json",
            authorization: `Bearer ${options.token}`,
            "content-type": "application/json",
          };
    const response = await fetchImpl(`${options.baseUrl ?? ""}/api/role-model/telemetry/query`, {
      body: JSON.stringify(payload),
      headers,
      method: "POST",
    });
    const parsed: unknown = await response.json();
    if (!response.ok) {
      let detail = "telemetry ranking query failed";
      try {
        // SAFETY: TelemetryErrorSchema decodes exactly this optional error string.
        const decoded = Schema.decodeUnknownSync(TelemetryErrorSchema)(parsed) as {
          readonly error?: string;
        };
        detail = decoded.error ?? detail;
      } catch {
        // keep the bounded default
      }
      throw new Error(detail);
    }
    try {
      const decoded = Schema.decodeUnknownSync(AnalyticsResponseSchema)(parsed);
      return decoded.ranking === null ? [] : decoded.ranking.rows;
    } catch {
      throw new Error("telemetry ranking response has an unknown shape");
    }
  },
});
