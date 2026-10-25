import { Schema } from "effect";

/**
 * Run 115 S15b (R21 UI half): the diagnostics page's wire and view-model contract.
 *
 * The wire bodies mirror role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts:
 * the schema id (:15), the state union (:37), the bounded body fields (:68-96), the four-scalar
 * record (:28-33), the staleness rule (:191-198) and the loss counters (:193, :230-231). The body
 * is parsed defensively here because the reader boundary returns unknown JSON.
 */

export interface DiagnosticsReadResult {
  readonly status: number;
  readonly body: unknown;
}

export interface DiagnosticsReaderInput {
  readonly id: string;
  /** Forwarded by Effect.tryPromise only when the thunk declares this parameter. */
  readonly signal: AbortSignal;
}

export type DiagnosticsReader = (input: DiagnosticsReaderInput) => Promise<DiagnosticsReadResult>;

export const DiagnosticsRecord = Schema.Struct({
  atMs: Schema.Number,
  code: Schema.String,
  count: Schema.Number,
  level: Schema.Literals(["info", "warn", "error"]),
});

export const DiagnosticsSnapshot = Schema.Struct({
  build: Schema.optional(Schema.String),
  buildMissing: Schema.optional(Schema.Boolean),
  conditionDropped: Schema.optional(Schema.Boolean),
  conditionStale: Schema.optional(Schema.Boolean),
  dropped: Schema.optional(Schema.Number),
  droppedWindowMs: Schema.optional(Schema.Number),
  httpStatus: Schema.optional(Schema.Number),
  instance: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.Number),
  maxCodeBytes: Schema.optional(Schema.Number),
  maxIdentityBytes: Schema.optional(Schema.Number),
  maxRecords: Schema.optional(Schema.Number),
  maxResponseBytes: Schema.optional(Schema.Number),
  message: Schema.optional(Schema.String),
  recordCount: Schema.optional(Schema.Number),
  records: Schema.Array(DiagnosticsRecord),
  routeId: Schema.String,
  staleAgeMs: Schema.optional(Schema.Number),
  staleRuleMs: Schema.optional(Schema.Number),
  status: Schema.Literals([
    "idle",
    "loading",
    "ok",
    "empty",
    "disabled",
    "stale",
    "dropped",
    "denied",
    "error",
  ]),
  totalAvailable: Schema.optional(Schema.Number),
  truncated: Schema.optional(Schema.Boolean),
});
export type DiagnosticsSnapshot = typeof DiagnosticsSnapshot.Type;

export const idleDiagnostics = (routeId = ""): DiagnosticsSnapshot => ({
  records: [],
  routeId,
  status: "idle",
});

export const loadingDiagnostics = (routeId: string): DiagnosticsSnapshot => ({
  records: [],
  routeId,
  status: "loading",
});

export const failedDiagnostics = (routeId: string, message: string): DiagnosticsSnapshot => ({
  message,
  records: [],
  routeId,
  status: "error",
});

const asRecord = (value: unknown): Readonly<Record<string, unknown>> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const asArray = (value: unknown): ReadonlyArray<unknown> => (Array.isArray(value) ? value : []);

const asLevel = (value: unknown): "info" | "warn" | "error" =>
  value === "warn" || value === "error" ? value : "info";

const asState = (value: unknown): "ok" | "empty" | "disabled" | "stale" | "dropped" | undefined =>
  value === "ok" ||
  value === "empty" ||
  value === "disabled" ||
  value === "stale" ||
  value === "dropped"
    ? value
    : undefined;

const parseRecord = (value: unknown) => {
  const record = asRecord(value);
  if (record === undefined) {
    return undefined;
  }
  return {
    atMs: asNumber(record.atMs) ?? 0,
    code: asString(record.code) ?? "unknown",
    count: asNumber(record.count) ?? 0,
    level: asLevel(record.level),
  };
};

const isMissing = (value: string | undefined): boolean =>
  value === undefined || value.trim().length === 0 || value.trim().toLowerCase() === "unknown";

/** Maps one read result onto the page's view model. Denied is checked before any state/empty branch. */
export const parseDiagnosticsSnapshot = (
  routeId: string,
  result: DiagnosticsReadResult,
): DiagnosticsSnapshot => {
  const body = asRecord(result.body) ?? {};
  const error = asString(body.error);
  const bodyMessage = asString(body.message);
  const field = asString(body.field);

  if (result.status === 401 || result.status === 403) {
    return {
      // Keep the HTTP status so the page can label a 403 rejection without calling it
      // "not authorized" and without inventing a cause it cannot know.
      httpStatus: result.status,
      message: error ?? bodyMessage ?? "unauthorized",
      records: [],
      routeId,
      status: "denied",
    };
  }

  if (error !== undefined || (result.status !== 200 && result.status !== 0)) {
    const detail =
      error ?? bodyMessage ?? `diagnostics read returned HTTP ${String(result.status)}`;
    return {
      message: field === undefined ? detail : `${detail} (${field})`,
      records: [],
      routeId,
      status: "error",
    };
  }

  const identity = asRecord(body.identity);
  const instance = asString(identity?.instanceId)?.trim() || undefined;
  const build = asString(identity?.buildId);
  const buildMissing = isMissing(build);

  const records = asArray(body.records).flatMap((value) => {
    const parsed = parseRecord(value);
    return parsed === undefined ? [] : [parsed];
  });

  const declaredState = asState(body.state);
  const status = declaredState ?? (records.length === 0 ? ("empty" as const) : ("ok" as const));

  const staleness = asRecord(body.staleness);
  const loss = asRecord(body.loss);
  const conditions = asRecord(body.conditions);
  const bounds = asRecord(body.bounds);
  const declaredStale = asBoolean(conditions?.stale);
  const declaredDropped = asBoolean(conditions?.dropped);
  const staleCondition =
    declaredStale ?? (status === "stale" || asBoolean(staleness?.stale) === true);
  const droppedCondition = declaredDropped ?? (asNumber(loss?.dropped) ?? 0) > 0;

  return {
    build: buildMissing ? undefined : build,
    buildMissing,
    conditionDropped: droppedCondition,
    conditionStale: staleCondition,
    dropped: asNumber(loss?.dropped),
    droppedWindowMs: asNumber(loss?.windowMs),
    instance,
    limit: asNumber(bounds?.limit),
    maxCodeBytes: asNumber(bounds?.maxCodeBytes),
    maxIdentityBytes: asNumber(bounds?.maxIdentityBytes),
    maxRecords: asNumber(bounds?.maxRecords),
    maxResponseBytes: asNumber(bounds?.maxResponseBytes),
    message: bodyMessage,
    recordCount: asNumber(body.recordCount) ?? records.length,
    records,
    routeId,
    staleAgeMs: asNumber(staleness?.ageMs),
    staleRuleMs: asNumber(staleness?.ruleMs),
    status,
    totalAvailable: asNumber(body.totalAvailable) ?? records.length,
    truncated: asBoolean(body.truncated) ?? false,
  };
};

export const formatAge = (milliseconds: number | undefined): string => {
  if (milliseconds === undefined || !Number.isFinite(milliseconds)) {
    return "unknown age";
  }
  const millis = Math.max(0, milliseconds);
  if (millis < 60_000) {
    return `${String(Math.round(millis / 1_000))}s`;
  }
  if (millis < 3_600_000) {
    return `${String(Math.round(millis / 60_000))}m`;
  }
  return `${(millis / 3_600_000).toFixed(1)}h`;
};

export const describeCause = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

export const diagnosticsBuildLabel = (snapshot: DiagnosticsSnapshot): string =>
  snapshot.buildMissing === true || snapshot.build === undefined || snapshot.build === ""
    ? "missing"
    : snapshot.build;

export const diagnosticsInstanceLabel = (snapshot: DiagnosticsSnapshot): string =>
  snapshot.instance === undefined || snapshot.instance === "" ? "missing" : snapshot.instance;

export const diagnosticsRenderText = (snapshot: DiagnosticsSnapshot): string => {
  switch (snapshot.status) {
    case "loading":
      return "Loading diagnostics…";
    case "ok":
      return `ok — ${String(snapshot.recordCount ?? snapshot.records.length)} of ${String(snapshot.totalAvailable ?? snapshot.records.length)} record(s)`;
    case "empty":
      return "No diagnostics records yet.";
    case "disabled":
      return "Diagnostics are disabled. This is a state, not an error.";
    case "stale":
      return `Stale: the newest record is ${formatAge(snapshot.staleAgeMs)} old (rule ${formatAge(snapshot.staleRuleMs)}).`;
    case "dropped":
      return `Dropped: ${String(snapshot.dropped ?? 0)} record(s) lost in the last ${formatAge(snapshot.droppedWindowMs)}.`;
    case "denied": {
      // Status-accurate: a 401 is an authorization failure; a 403 is a rejected request whose cause
      // the server states (e.g. a forbidden owner header). Do not invent a cause the page cannot know.
      const reason =
        snapshot.httpStatus === 403
          ? "the server rejected this diagnostics read"
          : "this diagnostics read is not authorized";
      return `Access denied: ${reason} (HTTP ${String(snapshot.httpStatus ?? 401)}).`;
    }
    case "error":
      return `Diagnostics read failed: ${snapshot.message ?? "unknown transport error"}`;
    case "idle":
      return "Diagnostics idle.";
  }
};
