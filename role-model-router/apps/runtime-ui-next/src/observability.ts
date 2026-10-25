import { Schema } from "effect";

import { OBSERVABILITY_SNAPSHOT_PATH } from "./runtime-endpoints";

/** S26d/R13 wave 2: the first read route ported end to end. */
export const OBSERVABILITY_CLIENT_PATH = OBSERVABILITY_SNAPSHOT_PATH;

export interface ObservabilityReadResult {
  readonly status: number;
  readonly body: unknown;
}

export interface ObservabilityReaderInput {
  readonly signal: AbortSignal;
}

export type ObservabilityReader = (
  input: ObservabilityReaderInput,
) => Promise<ObservabilityReadResult>;

export const ObservabilityRow = Schema.Struct({
  count: Schema.Number,
  incremental: Schema.Boolean,
  name: Schema.String,
});
export type ObservabilityRow = typeof ObservabilityRow.Type;

export const ObservabilityState = Schema.Struct({
  message: Schema.optional(Schema.String),
  rows: Schema.Array(ObservabilityRow),
  token: Schema.Number,
  status: Schema.Literals(["idle", "loading", "ok", "empty", "error"]),
});
export type ObservabilityState = typeof ObservabilityState.Type;

export const idleObservability = (): ObservabilityState => ({
  rows: [],
  status: "idle",
  token: 0,
});
export const loadingObservability = (token = 1): ObservabilityState => ({
  rows: [],
  status: "loading",
  token,
});
export const failedObservability = (message: string, token = 0): ObservabilityState => ({
  message,
  rows: [],
  status: "error",
  token,
});

export const observabilityErrorMessage = (status: number, reason?: string): string => {
  if (reason !== undefined) {
    return `Observability read failed: HTTP ${String(status)} (${reason})`;
  }
  if (status === 401) {
    return "Observability read failed: HTTP 401 (not authorized)";
  }
  if (status === 403) {
    return "Observability read failed: HTTP 403 (forbidden)";
  }
  return `Observability read failed: HTTP ${String(status)}`;
};

const asRecord = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;

export const parseObservabilitySnapshot = (result: ObservabilityReadResult): ObservabilityState => {
  const token = 0;
  const body = asRecord(result.body) ?? {};
  const reason =
    typeof body.reason === "string"
      ? body.reason
      : typeof body.message === "string"
        ? body.message
        : undefined;
  if (result.status !== 200) {
    return failedObservability(observabilityErrorMessage(result.status, reason), token);
  }
  const metrics = asRecord(body.metrics);
  if (metrics === undefined) {
    return failedObservability("Observability read failed: invalid response", token);
  }
  const rows = Object.entries(metrics)
    .flatMap(([name, value]) => {
      const metric = asRecord(value);
      if (metric === undefined || typeof metric.count !== "number") return [];
      return [
        {
          count: metric.count,
          incremental: metric.incremental === true,
          name,
        },
      ];
    })
    .sort((left, right) => left.name.localeCompare(right.name));
  return rows.length === 0 ? { rows: [], status: "empty", token } : { rows, status: "ok", token };
};

export interface ObservabilityClientOptions {
  readonly fetchImpl?: typeof fetch;
  readonly baseUrl?: string;
  readonly token?: string;
}

export const createObservabilityClient = (
  options: ObservabilityClientOptions = {},
): ObservabilityReader => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = new URL(options.baseUrl ?? globalThis.location?.origin ?? "http://127.0.0.1");
  const url = new URL(OBSERVABILITY_CLIENT_PATH, baseUrl);
  return async (input) => {
    const headers: Record<string, string> = { accept: "application/json" };
    if (options.token !== undefined && options.token.length > 0) {
      headers.authorization = `Bearer ${options.token}`;
    }
    const response = await fetchImpl(url.toString(), {
      cache: "no-store",
      headers,
      method: "GET",
      signal: input.signal,
    });
    const text = await response.text();
    let body: unknown = {};
    if (text.trim().length > 0) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { message: "non-JSON body" };
      }
    }
    return { body, status: response.status };
  };
};
