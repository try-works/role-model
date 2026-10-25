/**
 * Run 115 S15a/S15c (R21 server half): the bounded local diagnostics READ contract.
 *
 * SERVER HALF ONLY. The collector that writes diagnostic records is R20's boundary; this slice owns
 * the read: instance/build identity, record loss counters, an opaque cursor, explicit record/byte
 * caps and a stated staleness rule. It never dumps fibers, stacks or unbounded runtime state.
 *
 * STATES. Distinct and honest: `disabled` (200, explicit - never an error, and it wins over ANY
 * query, including an invalid cursor), `stale` (newest record older than the rule), `dropped` (the
 * bounded collector lost records), `empty` (no records, or a cursor past the end) and `ok`.
 * `denied` is the handler's 401 and never reaches this module. `state` is precedence-ordered
 * (disabled > stale > dropped > empty > ok); the independent `conditions` object reports stale and
 * dropped TOGETHER, so a stale read that also lost records is not hidden behind one word.
 *
 * ORDERING CONTRACT for `LocalDiagnosticsSource.records()`: the returned order is the read order and
 * the cursor is an offset into it (newest-first is the intended order). Staleness does NOT depend on
 * that order: when `lastRecordAtMs` is absent, the newest record is found by the maximum `atMs` over
 * the supplied records, never by position. `lastRecordAtMs`, when supplied, is authoritative.
 *
 * DEFERRED WIRE (S15c defect E): the production `readDiagnosticsSource` is NOT wired yet - no runtime
 * composition root supplies records, so outside tests the route answers the explicit `disabled`
 * state. The writer (what gets recorded, retention and loss accounting) is R20's module-health/Cause
 * boundary; wiring it is deliberately deferred to that slice rather than fabricated here.
 */
export const LOCAL_DIAGNOSTICS_SCHEMA = "role-model.local-diagnostics-read.v1";
export const LOCAL_DIAGNOSTICS_PATH = "/api/role-model/operator/diagnostics";
export const MAX_DIAGNOSTICS_RECORDS = 50;
export const MAX_DIAGNOSTICS_RESPONSE_BYTES = 16_384;
export const DIAGNOSTICS_STALENESS_MS = 300_000;
/** Bounds on the formatting itself: identity strings and code labels count in BYTES, not UTF-16 units. */
const IDENTITY_BYTE_CAP = 256;
const CODE_BYTE_CAP = 512;
/** Reserved for a possible cursor value so a truncated page still fits the cap. */
const CURSOR_BYTE_RESERVE = 64;

export type LocalDiagnosticLevel = "info" | "warn" | "error";

/** One bounded record: four scalar fields, nothing raw (no messages, fibers or stacks). */
export interface LocalDiagnosticRecord {
  readonly atMs: number;
  readonly level: LocalDiagnosticLevel;
  readonly code: string;
  readonly count: number;
}

export interface LocalDiagnosticsLoss {
  readonly dropped: number;
  readonly windowMs: number;
}

/**
 * The collector-supplied diagnostics source (R20 owns the writer). Its list is already bounded by
 * the collector.
 *
 * ORDERING: `records()` returns the read order; a page is a slice of that order and the cursor is an
 * offset into it (newest-first is intended). Staleness is order-independent: without
 * `lastRecordAtMs` the newest record is the maximum `atMs`, never `records()[0]`.
 */
export interface LocalDiagnosticsSource {
  readonly instanceId: string;
  readonly buildId: string;
  /** Explicit disable switch: disabled is a STATE, never an error. */
  readonly enabled?: boolean;
  readonly records: () => readonly LocalDiagnosticRecord[];
  readonly loss?: () => LocalDiagnosticsLoss;
  /** Authoritative newest-record time when the collector tracks it; otherwise max(atMs) is used. */
  readonly lastRecordAtMs?: () => number | null;
}

export interface LocalDiagnosticsQuery {
  readonly limit?: number;
  readonly cursor?: string | null;
}

export type LocalDiagnosticsState = "ok" | "empty" | "stale" | "dropped" | "disabled";

export interface LocalDiagnosticsIdentity {
  readonly instanceId: string;
  readonly buildId: string;
}

export interface LocalDiagnosticsBounds {
  readonly maxRecords: number;
  readonly maxResponseBytes: number;
  readonly maxIdentityBytes: number;
  readonly maxCodeBytes: number;
  readonly limit: number;
}

export interface LocalDiagnosticsStaleness {
  readonly ruleMs: number;
  readonly ageMs: number | null;
  readonly stale: boolean;
}

/** Independent flags: a stale page can ALSO have lost records; neither masks the other. */
export interface LocalDiagnosticsConditions {
  readonly stale: boolean;
  readonly dropped: boolean;
}

export interface LocalDiagnosticsReadBody {
  readonly schemaVersion: string;
  readonly state?: LocalDiagnosticsState;
  readonly error?: string;
  readonly field?: string;
  readonly message?: string;
  readonly identity?: LocalDiagnosticsIdentity | null;
  readonly records?: readonly LocalDiagnosticRecord[];
  readonly recordCount?: number;
  readonly totalAvailable?: number;
  readonly truncated?: boolean;
  readonly cursor?: string | null;
  readonly loss?: LocalDiagnosticsLoss | null;
  readonly staleness?: LocalDiagnosticsStaleness | null;
  readonly conditions?: LocalDiagnosticsConditions | null;
  readonly bounds?: LocalDiagnosticsBounds;
}

export interface LocalDiagnosticsReadResult {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: LocalDiagnosticsReadBody;
}

/** Structural request: the handler (and tests) provide only what the gate reads. */
export interface LocalDiagnosticsReadRequest {
  readonly method?: string;
  readonly url?: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  readonly socket?: { readonly remoteAddress?: string };
}

const DIAGNOSTICS_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
});

/** Opaque to the caller: base64url of the decimal record offset. */
const encodeCursor = (offset: number): string =>
  Buffer.from(String(offset), "utf8").toString("base64url");

const decodeCursor = (cursor: string): number | null => {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  if (!/^[0-9]{1,9}$/u.test(decoded)) return null;
  const offset = Number(decoded);
  return Number.isSafeInteger(offset) ? offset : null;
};

const boundedCount = (value: number): number =>
  Number.isSafeInteger(value) && value >= 0 ? value : 0;

const boundedTime = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

const boundedLevel = (value: LocalDiagnosticLevel): LocalDiagnosticLevel =>
  value === "warn" || value === "error" ? value : "info";

/** Truncate a string to at most `maxBytes` UTF-8 bytes without splitting a code point. */
const boundedUtf8 = (value: string, maxBytes: number): string => {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;
  let out = "";
  let used = 0;
  for (const character of value) {
    const size = Buffer.byteLength(character, "utf8");
    if (used + size > maxBytes) break;
    out += character;
    used += size;
  }
  return out;
};

const serializedBytes = (value: LocalDiagnosticsReadBody): number =>
  Buffer.byteLength(JSON.stringify(value), "utf8");

/** Keep exactly the four scalar fields; the code is a bounded label, never a message blob. */
const boundedRecord = (record: LocalDiagnosticRecord, fallbackAtMs: number): LocalDiagnosticRecord => ({
  atMs: boundedTime(record.atMs, fallbackAtMs),
  level: boundedLevel(record.level),
  code: boundedUtf8(record.code, CODE_BYTE_CAP),
  count: boundedCount(record.count),
});

const errorResult = (status: number, error: string): LocalDiagnosticsReadResult => ({
  status,
  headers: DIAGNOSTICS_HEADERS,
  body: { schemaVersion: LOCAL_DIAGNOSTICS_SCHEMA, error },
});

const boundsFor = (limit: number): LocalDiagnosticsBounds => ({
  maxRecords: MAX_DIAGNOSTICS_RECORDS,
  maxResponseBytes: MAX_DIAGNOSTICS_RESPONSE_BYTES,
  maxIdentityBytes: IDENTITY_BYTE_CAP,
  maxCodeBytes: CODE_BYTE_CAP,
  limit,
});

export function readLocalDiagnostics(input: {
  readonly source?: LocalDiagnosticsSource;
  readonly query?: LocalDiagnosticsQuery;
  readonly nowMs: number;
}): LocalDiagnosticsReadResult {
  const nowMs = boundedTime(input.nowMs, 0);
  const source = input.source;

  // DEFECT B (S15c): disabled is answered BEFORE any query validation. A disabled runtime must never
  // return a query error; every query ends in the explicit disabled state.
  if (source === undefined || source.enabled === false) {
    return {
      status: 200,
      headers: DIAGNOSTICS_HEADERS,
      body: {
        schemaVersion: LOCAL_DIAGNOSTICS_SCHEMA,
        state: "disabled",
        identity:
          source === undefined
            ? null
            : {
                instanceId: boundedUtf8(String(source.instanceId), IDENTITY_BYTE_CAP),
                buildId: boundedUtf8(String(source.buildId), IDENTITY_BYTE_CAP),
              },
        records: [],
        recordCount: 0,
        totalAvailable: 0,
        truncated: false,
        cursor: null,
        loss: null,
        staleness: null,
        conditions: null,
        bounds: boundsFor(0),
      },
    };
  }

  const queriedLimit = input.query?.limit;
  if (queriedLimit !== undefined && (!Number.isSafeInteger(queriedLimit) || queriedLimit < 1)) {
    return errorResult(400, "diagnostics_query_invalid");
  }
  const limit = Math.min(queriedLimit ?? 20, MAX_DIAGNOSTICS_RECORDS);

  const cursor = input.query?.cursor;
  const offset = cursor === undefined || cursor === null || cursor === "" ? 0 : decodeCursor(cursor);
  if (offset === null) return errorResult(400, "diagnostics_cursor_invalid");

  const identity: LocalDiagnosticsIdentity = {
    instanceId: boundedUtf8(String(source.instanceId), IDENTITY_BYTE_CAP),
    buildId: boundedUtf8(String(source.buildId), IDENTITY_BYTE_CAP),
  };

  const all = source.records();
  const total = all.length;
  const loss = source.loss?.() ?? { dropped: 0, windowMs: 0 };
  const dropped = boundedCount(loss.dropped) > 0;
  // DEFECT C (S15c): never take all[0] - the source may be oldest-first. Prefer the collector's
  // authoritative timestamp, otherwise find the newest record by max(atMs).
  const newestAtMs = all.reduce(
    (newest, record) => (Number.isFinite(record.atMs) && record.atMs > newest ? record.atMs : newest),
    Number.NEGATIVE_INFINITY,
  );
  const authoredLastAt = source.lastRecordAtMs?.() ?? null;
  const lastAt = authoredLastAt !== null && Number.isFinite(authoredLastAt)
    ? authoredLastAt
    : Number.isFinite(newestAtMs)
      ? newestAtMs
      : null;
  const ageMs = lastAt === null ? null : Math.max(0, nowMs - lastAt);
  const stale = ageMs !== null && ageMs > DIAGNOSTICS_STALENESS_MS;

  const start = Math.min(offset, total);
  // A cursor past the end is an EMPTY page, not ok.
  const pastEnd = total > 0 && start >= total;
  const state: LocalDiagnosticsState = stale
    ? "stale"
    : dropped
      ? "dropped"
      : total === 0 || pastEnd
        ? "empty"
        : "ok";
  const conditions: LocalDiagnosticsConditions = { stale, dropped };

  const buildBody = (
    page: readonly LocalDiagnosticRecord[],
    nextCursor: string | null,
  ): LocalDiagnosticsReadBody => ({
    schemaVersion: LOCAL_DIAGNOSTICS_SCHEMA,
    state,
    identity,
    records: page,
    recordCount: page.length,
    totalAvailable: total,
    truncated: start + page.length < total,
    cursor: nextCursor,
    loss: { dropped: boundedCount(loss.dropped), windowMs: boundedCount(loss.windowMs) },
    staleness: { ruleMs: DIAGNOSTICS_STALENESS_MS, ageMs, stale },
    conditions,
    bounds: boundsFor(limit),
  });

  // DEFECT A (S15c): budget the WHOLE serialized body in UTF-8 BYTES - identity + envelope + records.
  // The cursor is added after selection, so a possible cursor is reserved while shrinking records.
  const page: LocalDiagnosticRecord[] = [];
  for (let index = start; index < total && page.length < limit; index += 1) {
    page.push(boundedRecord(all[index]!, nowMs));
    if (serializedBytes(buildBody(page, null)) + CURSOR_BYTE_RESERVE > MAX_DIAGNOSTICS_RESPONSE_BYTES) {
      page.pop();
      break;
    }
  }
  let truncated = start + page.length < total;
  while (page.length > 0) {
    const body = buildBody(page, truncated ? encodeCursor(start + page.length) : null);
    if (serializedBytes(body) <= MAX_DIAGNOSTICS_RESPONSE_BYTES) {
      return { status: 200, headers: DIAGNOSTICS_HEADERS, body };
    }
    page.pop();
    truncated = true;
  }
  // The envelope alone must fit; identity is byte-capped so this is reachable only with a tiny cap.
  return {
    status: 200,
    headers: DIAGNOSTICS_HEADERS,
    body: buildBody([], truncated && total > start ? encodeCursor(start) : null),
  };
}
