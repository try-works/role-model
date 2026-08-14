export const EXECUTION_CIRCUIT_BREAKER_MAINTENANCE_KEY = "routing.execution-circuit-breaker.v2";
export const LEGACY_EXECUTION_FAILURE_COOLDOWN_MAINTENANCE_KEY =
  "routing.execution-failure-cooldowns.v1";

export const EXECUTION_CIRCUIT_SCHEMA_VERSION = 2 as const;
export const EXECUTION_CIRCUIT_MAX_ENDPOINTS = 512;
export const EXECUTION_CIRCUIT_RESET_AFTER_MS = 5 * 60 * 1_000;
export const EXECUTION_CONNECTION_PROBATION_WINDOW_MS = 60 * 1_000;
export const EXECUTION_HALF_OPEN_LEASE_MS = 90 * 1_000;
export const EXECUTION_RATE_LIMIT_MAX_MS = 5 * 60 * 1_000;

const CONNECTION_OPEN_DURATIONS_MS = [5_000, 15_000, 60_000, 300_000] as const;
const PROVIDER_5XX_OPEN_DURATIONS_MS = [2_000, 10_000, 30_000, 120_000] as const;
const RATE_LIMIT_DEFAULT_MS = 30_000;
const MAX_PERSISTED_BYTES = 1_048_576;
const MAX_IDENTIFIER_LENGTH = 256;
const MAX_ERROR_CLASS_LENGTH = 128;

export type ExecutionTrafficClass = "live" | "benchmark" | "health" | "synthetic";
export type ExecutionFailureCategory =
  | "connection"
  | "timeout"
  | "provider_5xx"
  | "rate_limit"
  | "auth"
  | "quota";
export type ExecutionCircuitStateName =
  | "probation"
  | "open"
  | "half_open"
  | "blocked_auth"
  | "blocked_quota";

export interface ExecutionCircuitSource {
  readonly providerId?: string;
  readonly providerFamily?: string;
  readonly vendorId?: string;
  readonly executionFamily?: string;
  readonly adapterFamily?: string;
  readonly failurePhase?: string;
  readonly statusCode?: number;
  readonly sourceAttemptId?: string;
  readonly sourceRequestId?: string;
  readonly sourceRoutingDecisionId?: string;
}

export interface ExecutionCircuitRecord extends ExecutionCircuitSource {
  readonly endpointId: string;
  readonly circuitState: ExecutionCircuitStateName;
  readonly failureCategory: ExecutionFailureCategory;
  readonly failureCount: number;
  readonly sequenceStartedAtMs: number;
  readonly lastFailureAtMs: number;
  readonly lastErrorClass: string;
  readonly nextProbeAtMs?: number;
  readonly retryAfterMs?: number;
  readonly probeOwnerId?: string;
  readonly probeStartedAtMs?: number;
}

export interface ExecutionCircuitState {
  readonly schemaVersion: typeof EXECUTION_CIRCUIT_SCHEMA_VERSION;
  readonly endpoints: Readonly<Record<string, ExecutionCircuitRecord>>;
  readonly migratedFromV1AtMs?: number;
  readonly retiredLegacyEndpointCount?: number;
}

export interface ExecutionCircuitReceipt {
  readonly schemaVersion: typeof EXECUTION_CIRCUIT_SCHEMA_VERSION;
  readonly endpointId: string;
  readonly active: boolean;
  readonly circuitState: ExecutionCircuitStateName;
  readonly failureCategory: ExecutionFailureCategory;
  readonly failureCount: number;
  readonly sequenceStartedAtMs: number;
  readonly lastFailureAtMs: number;
  readonly lastErrorClass: string;
  readonly nextProbeAtMs?: number;
  readonly retryAfterMs?: number;
  readonly cooldownUntilMs?: number;
  readonly probeStartedAtMs?: number;
  readonly sourceAttemptId?: string;
  readonly sourceRequestId?: string;
  readonly sourceRoutingDecisionId?: string;
}

export function createEmptyExecutionCircuitState(): ExecutionCircuitState {
  return {
    schemaVersion: EXECUTION_CIRCUIT_SCHEMA_VERSION,
    endpoints: {},
  };
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function boundedString(value: unknown, maxLength = MAX_IDENTIFIER_LENGTH): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : undefined;
}

function isCircuitStateName(value: unknown): value is ExecutionCircuitStateName {
  return (
    value === "probation" ||
    value === "open" ||
    value === "half_open" ||
    value === "blocked_auth" ||
    value === "blocked_quota"
  );
}

function isFailureCategory(value: unknown): value is ExecutionFailureCategory {
  return (
    value === "connection" ||
    value === "timeout" ||
    value === "provider_5xx" ||
    value === "rate_limit" ||
    value === "auth" ||
    value === "quota"
  );
}

function optionalSource(input: Record<string, unknown>): ExecutionCircuitSource {
  const providerId = boundedString(input.providerId);
  const providerFamily = boundedString(input.providerFamily);
  const vendorId = boundedString(input.vendorId);
  const executionFamily = boundedString(input.executionFamily);
  const adapterFamily = boundedString(input.adapterFamily);
  const failurePhase = boundedString(input.failurePhase);
  const sourceAttemptId = boundedString(input.sourceAttemptId);
  const sourceRequestId = boundedString(input.sourceRequestId);
  const sourceRoutingDecisionId = boundedString(input.sourceRoutingDecisionId);
  const statusCode =
    isSafeInteger(input.statusCode) && input.statusCode <= 999 ? input.statusCode : undefined;
  return {
    ...(providerId ? { providerId } : {}),
    ...(providerFamily ? { providerFamily } : {}),
    ...(vendorId ? { vendorId } : {}),
    ...(executionFamily ? { executionFamily } : {}),
    ...(adapterFamily ? { adapterFamily } : {}),
    ...(failurePhase ? { failurePhase } : {}),
    ...(statusCode === undefined ? {} : { statusCode }),
    ...(sourceAttemptId ? { sourceAttemptId } : {}),
    ...(sourceRequestId ? { sourceRequestId } : {}),
    ...(sourceRoutingDecisionId ? { sourceRoutingDecisionId } : {}),
  };
}

function parseRecord(endpointKey: string, value: unknown): ExecutionCircuitRecord | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const endpointId = boundedString(record.endpointId) ?? boundedString(endpointKey);
  const circuitState = record.circuitState;
  const failureCategory = record.failureCategory;
  const failureCount = record.failureCount;
  const sequenceStartedAtMs = record.sequenceStartedAtMs;
  const lastFailureAtMs = record.lastFailureAtMs;
  const lastErrorClass = boundedString(record.lastErrorClass, MAX_ERROR_CLASS_LENGTH);
  if (
    !endpointId ||
    endpointId !== endpointKey ||
    !isCircuitStateName(circuitState) ||
    !isFailureCategory(failureCategory) ||
    !isSafeInteger(failureCount) ||
    failureCount < 1 ||
    !isSafeInteger(sequenceStartedAtMs) ||
    !isSafeInteger(lastFailureAtMs) ||
    !lastErrorClass
  ) {
    return undefined;
  }
  const nextProbeAtMs = isSafeInteger(record.nextProbeAtMs) ? record.nextProbeAtMs : undefined;
  const retryAfterMs = isSafeInteger(record.retryAfterMs) ? record.retryAfterMs : undefined;
  const probeOwnerId = boundedString(record.probeOwnerId);
  const probeStartedAtMs = isSafeInteger(record.probeStartedAtMs)
    ? record.probeStartedAtMs
    : undefined;
  if (
    (circuitState === "open" && nextProbeAtMs === undefined) ||
    (circuitState === "half_open" && (!probeOwnerId || probeStartedAtMs === undefined))
  ) {
    return undefined;
  }
  return {
    endpointId,
    circuitState,
    failureCategory,
    failureCount,
    sequenceStartedAtMs,
    lastFailureAtMs,
    lastErrorClass,
    ...(nextProbeAtMs === undefined ? {} : { nextProbeAtMs }),
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    ...(probeOwnerId ? { probeOwnerId } : {}),
    ...(probeStartedAtMs === undefined ? {} : { probeStartedAtMs }),
    ...optionalSource(record),
  };
}

export function parseExecutionCircuitState(rawValue: string | undefined): ExecutionCircuitState {
  if (!rawValue || rawValue.trim().length === 0 || rawValue.length > MAX_PERSISTED_BYTES) {
    return createEmptyExecutionCircuitState();
  }
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return createEmptyExecutionCircuitState();
    }
    const envelope = parsed as Record<string, unknown>;
    if (envelope.schemaVersion !== EXECUTION_CIRCUIT_SCHEMA_VERSION) {
      return createEmptyExecutionCircuitState();
    }
    const rawEndpoints =
      typeof envelope.endpoints === "object" && envelope.endpoints !== null
        ? (envelope.endpoints as Record<string, unknown>)
        : {};
    const endpoints = Object.fromEntries(
      Object.entries(rawEndpoints)
        .sort(([left], [right]) => left.localeCompare(right))
        .slice(0, EXECUTION_CIRCUIT_MAX_ENDPOINTS)
        .flatMap(([endpointId, value]) => {
          const record = parseRecord(endpointId, value);
          return record ? [[endpointId, record] as const] : [];
        }),
    );
    const migratedFromV1AtMs = isSafeInteger(envelope.migratedFromV1AtMs)
      ? envelope.migratedFromV1AtMs
      : undefined;
    const retiredLegacyEndpointCount = isSafeInteger(envelope.retiredLegacyEndpointCount)
      ? envelope.retiredLegacyEndpointCount
      : undefined;
    return {
      schemaVersion: EXECUTION_CIRCUIT_SCHEMA_VERSION,
      endpoints,
      ...(migratedFromV1AtMs === undefined ? {} : { migratedFromV1AtMs }),
      ...(retiredLegacyEndpointCount === undefined ? {} : { retiredLegacyEndpointCount }),
    };
  } catch {
    return createEmptyExecutionCircuitState();
  }
}

function hasV2Envelope(rawValue: string | undefined): boolean {
  if (!rawValue || rawValue.length > MAX_PERSISTED_BYTES) {
    return false;
  }
  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;
    return parsed?.schemaVersion === EXECUTION_CIRCUIT_SCHEMA_VERSION;
  } catch {
    return false;
  }
}

function countLegacyEndpoints(rawValue: string | undefined): number {
  if (!rawValue || rawValue.length > MAX_PERSISTED_BYTES) {
    return 0;
  }
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? Math.min(Object.keys(parsed).length, EXECUTION_CIRCUIT_MAX_ENDPOINTS)
      : 0;
  } catch {
    return 0;
  }
}

export function migrateLegacyExecutionCooldownState(
  v2RawValue: string | undefined,
  legacyRawValue: string | undefined,
  nowMs: number,
): ExecutionCircuitState {
  if (hasV2Envelope(v2RawValue)) {
    return parseExecutionCircuitState(v2RawValue);
  }
  const retiredLegacyEndpointCount = countLegacyEndpoints(legacyRawValue);
  return {
    schemaVersion: EXECUTION_CIRCUIT_SCHEMA_VERSION,
    endpoints: {},
    ...(retiredLegacyEndpointCount > 0
      ? {
          migratedFromV1AtMs: Math.max(0, Math.trunc(nowMs)),
          retiredLegacyEndpointCount,
        }
      : {}),
  };
}

export function serializeExecutionCircuitState(state: ExecutionCircuitState): string {
  const parsed = parseExecutionCircuitState(JSON.stringify(state));
  return JSON.stringify({
    schemaVersion: EXECUTION_CIRCUIT_SCHEMA_VERSION,
    endpoints: Object.fromEntries(
      Object.entries(parsed.endpoints).sort(([left], [right]) => left.localeCompare(right)),
    ),
    ...(parsed.migratedFromV1AtMs === undefined
      ? {}
      : { migratedFromV1AtMs: parsed.migratedFromV1AtMs }),
    ...(parsed.retiredLegacyEndpointCount === undefined
      ? {}
      : { retiredLegacyEndpointCount: parsed.retiredLegacyEndpointCount }),
  });
}

export function classifyExecutionFailureCategory(
  errorClass: string,
  statusCode?: number,
): ExecutionFailureCategory | undefined {
  const normalized = errorClass.trim().toLowerCase();
  if (normalized === "upstream_connection_error") {
    return "connection";
  }
  if (normalized === "upstream_timeout") {
    return "timeout";
  }
  if (normalized === "rate_limited" || statusCode === 429) {
    return "rate_limit";
  }
  if (normalized === "provider_auth_error" || statusCode === 401 || statusCode === 403) {
    return "auth";
  }
  if (normalized === "quota_exhausted" || statusCode === 402) {
    return "quota";
  }
  if (normalized === "upstream_error" || (typeof statusCode === "number" && statusCode >= 500)) {
    return "provider_5xx";
  }
  return undefined;
}

function boundedDuration(schedule: readonly number[], failureCount: number): number {
  const duration = schedule[Math.min(Math.max(failureCount - 1, 0), schedule.length - 1)];
  if (duration === undefined) {
    throw new Error("execution circuit duration schedule must not be empty");
  }
  return duration;
}

function replaceEndpoint(
  state: ExecutionCircuitState,
  endpointId: string,
  record: ExecutionCircuitRecord | undefined,
): ExecutionCircuitState {
  const { [endpointId]: _removed, ...remaining } = state.endpoints;
  return {
    ...state,
    endpoints: record ? { ...remaining, [endpointId]: record } : remaining,
  };
}

export function recordExecutionCircuitFailure(input: {
  readonly state: ExecutionCircuitState;
  readonly endpointId: string;
  readonly errorClass: string;
  readonly nowMs: number;
  readonly trafficClass: ExecutionTrafficClass;
  readonly statusCode?: number;
  readonly retryAfterMs?: number;
  readonly source?: ExecutionCircuitSource;
}): {
  readonly state: ExecutionCircuitState;
  readonly record?: ExecutionCircuitRecord;
  readonly changed: boolean;
} {
  if (input.trafficClass !== "live") {
    return { state: input.state, changed: false };
  }
  const endpointId = boundedString(input.endpointId);
  const errorClass = boundedString(input.errorClass, MAX_ERROR_CLASS_LENGTH);
  const category = errorClass
    ? classifyExecutionFailureCategory(errorClass, input.statusCode)
    : undefined;
  if (!endpointId || !errorClass || !category) {
    return { state: input.state, changed: false };
  }
  const nowMs = Math.max(0, Math.trunc(input.nowMs));
  const previous = input.state.endpoints[endpointId];
  const resetSequence =
    !previous ||
    previous.failureCategory !== category ||
    nowMs - previous.lastFailureAtMs >= EXECUTION_CIRCUIT_RESET_AFTER_MS ||
    ((category === "connection" || category === "timeout") &&
      previous.circuitState === "probation" &&
      nowMs - previous.lastFailureAtMs >= EXECUTION_CONNECTION_PROBATION_WINDOW_MS);
  const failureCount = resetSequence ? 1 : previous.failureCount + 1;
  const sequenceStartedAtMs = resetSequence ? nowMs : previous.sequenceStartedAtMs;
  const source = optionalSource({
    ...(input.source ?? {}),
    ...(input.statusCode === undefined ? {} : { statusCode: input.statusCode }),
  });
  let circuitState: ExecutionCircuitStateName;
  let nextProbeAtMs: number | undefined;
  let effectiveRetryAfterMs: number | undefined;
  if (category === "auth") {
    circuitState = "blocked_auth";
  } else if (category === "quota") {
    circuitState = "blocked_quota";
  } else if ((category === "connection" || category === "timeout") && failureCount === 1) {
    circuitState = "probation";
  } else {
    circuitState = "open";
    const durationMs =
      category === "connection" || category === "timeout"
        ? boundedDuration(CONNECTION_OPEN_DURATIONS_MS, failureCount - 1)
        : category === "provider_5xx"
          ? boundedDuration(PROVIDER_5XX_OPEN_DURATIONS_MS, failureCount)
          : Math.min(
              EXECUTION_RATE_LIMIT_MAX_MS,
              Math.max(0, Math.trunc(input.retryAfterMs ?? RATE_LIMIT_DEFAULT_MS)),
            );
    nextProbeAtMs = nowMs + durationMs;
    if (category === "rate_limit") {
      effectiveRetryAfterMs = durationMs;
    }
  }
  const record: ExecutionCircuitRecord = {
    endpointId,
    circuitState,
    failureCategory: category,
    failureCount,
    sequenceStartedAtMs,
    lastFailureAtMs: nowMs,
    lastErrorClass: errorClass,
    ...(nextProbeAtMs === undefined ? {} : { nextProbeAtMs }),
    ...(effectiveRetryAfterMs === undefined ? {} : { retryAfterMs: effectiveRetryAfterMs }),
    ...source,
  };
  return {
    state: replaceEndpoint(input.state, endpointId, record),
    record,
    changed: true,
  };
}

export function clearExecutionCircuitEndpoint(
  state: ExecutionCircuitState,
  endpointId: string,
): ExecutionCircuitState {
  return replaceEndpoint(state, endpointId, undefined);
}

export function evaluateExecutionCircuitEligibility(
  state: ExecutionCircuitState,
  endpointId: string,
  nowMs: number,
): { readonly eligible: boolean; readonly probeRequired: boolean } {
  const record = state.endpoints[endpointId];
  if (!record || record.circuitState === "probation") {
    return { eligible: true, probeRequired: false };
  }
  if (
    record.circuitState === "open" &&
    (record.nextProbeAtMs ?? Number.MAX_SAFE_INTEGER) <= nowMs
  ) {
    return { eligible: true, probeRequired: true };
  }
  return { eligible: false, probeRequired: false };
}

export function claimExecutionCircuitProbe(input: {
  readonly state: ExecutionCircuitState;
  readonly endpointId: string;
  readonly nowMs: number;
  readonly probeOwnerId: string;
}): {
  readonly claimed: boolean;
  readonly required: boolean;
  readonly state: ExecutionCircuitState;
} {
  const eligibility = evaluateExecutionCircuitEligibility(
    input.state,
    input.endpointId,
    input.nowMs,
  );
  if (!eligibility.probeRequired) {
    const sameOwner =
      input.state.endpoints[input.endpointId]?.circuitState === "half_open" &&
      input.state.endpoints[input.endpointId]?.probeOwnerId === input.probeOwnerId;
    return {
      claimed: eligibility.eligible || sameOwner,
      required: false,
      state: input.state,
    };
  }
  const owner = boundedString(input.probeOwnerId);
  const record = input.state.endpoints[input.endpointId];
  if (!owner || !record || record.circuitState !== "open") {
    return { claimed: false, required: true, state: input.state };
  }
  return {
    claimed: true,
    required: true,
    state: replaceEndpoint(input.state, input.endpointId, {
      ...record,
      circuitState: "half_open",
      probeOwnerId: owner,
      probeStartedAtMs: Math.max(0, Math.trunc(input.nowMs)),
    }),
  };
}

export function releaseExecutionCircuitProbe(input: {
  readonly state: ExecutionCircuitState;
  readonly endpointId: string;
  readonly probeOwnerId: string;
  readonly nowMs: number;
}): { readonly released: boolean; readonly state: ExecutionCircuitState } {
  const record = input.state.endpoints[input.endpointId];
  if (
    !record ||
    record.circuitState !== "half_open" ||
    record.probeOwnerId !== input.probeOwnerId
  ) {
    return { released: false, state: input.state };
  }
  const { probeOwnerId: _owner, probeStartedAtMs: _started, ...rest } = record;
  return {
    released: true,
    state: replaceEndpoint(input.state, input.endpointId, {
      ...rest,
      circuitState: "open",
      nextProbeAtMs: Math.max(0, Math.trunc(input.nowMs)),
    }),
  };
}

export function normalizeExecutionCircuitStateForRestart(
  state: ExecutionCircuitState,
  nowMs: number,
): ExecutionCircuitState {
  const normalizedNowMs = Math.max(0, Math.trunc(nowMs));
  return Object.entries(state.endpoints).reduce((nextState, [endpointId, record]) => {
    if (record.circuitState !== "half_open") {
      return nextState;
    }
    const { probeOwnerId: _owner, probeStartedAtMs: _started, ...rest } = record;
    return replaceEndpoint(nextState, endpointId, {
      ...rest,
      circuitState: "open",
      nextProbeAtMs: normalizedNowMs,
    });
  }, state);
}

export function toExecutionCircuitReceipt(
  record: ExecutionCircuitRecord,
  nowMs: number,
): ExecutionCircuitReceipt {
  const nextProbeAtMs = record.nextProbeAtMs;
  const retryAfterMs =
    nextProbeAtMs === undefined ? undefined : Math.max(0, nextProbeAtMs - Math.trunc(nowMs));
  const active =
    record.circuitState === "blocked_auth" ||
    record.circuitState === "blocked_quota" ||
    record.circuitState === "half_open" ||
    (record.circuitState === "open" && (nextProbeAtMs ?? Number.MAX_SAFE_INTEGER) > nowMs);
  return {
    schemaVersion: EXECUTION_CIRCUIT_SCHEMA_VERSION,
    endpointId: record.endpointId,
    active,
    circuitState: record.circuitState,
    failureCategory: record.failureCategory,
    failureCount: record.failureCount,
    sequenceStartedAtMs: record.sequenceStartedAtMs,
    lastFailureAtMs: record.lastFailureAtMs,
    lastErrorClass: record.lastErrorClass,
    ...(nextProbeAtMs === undefined ? {} : { nextProbeAtMs, cooldownUntilMs: nextProbeAtMs }),
    ...(retryAfterMs === undefined ? {} : { retryAfterMs }),
    ...(record.probeStartedAtMs === undefined ? {} : { probeStartedAtMs: record.probeStartedAtMs }),
    ...(record.sourceAttemptId ? { sourceAttemptId: record.sourceAttemptId } : {}),
    ...(record.sourceRequestId ? { sourceRequestId: record.sourceRequestId } : {}),
    ...(record.sourceRoutingDecisionId
      ? { sourceRoutingDecisionId: record.sourceRoutingDecisionId }
      : {}),
  };
}

export function resolveExecutionCircuitRefusal(
  receipts: readonly {
    readonly circuitState?: ExecutionCircuitStateName;
    readonly nextProbeAtMs?: number;
  }[],
  nowMs: number,
):
  | {
      readonly statusCode: 400 | 503;
      readonly code: "endpoint_configuration_blocked" | "endpoint_temporarily_unavailable";
      readonly nextProbeAtMs?: number;
      readonly retryAfterMs?: number;
    }
  | undefined {
  if (receipts.length === 0) {
    return undefined;
  }
  const configurationBlocked = receipts.every(
    (receipt) =>
      receipt.circuitState === "blocked_auth" || receipt.circuitState === "blocked_quota",
  );
  if (configurationBlocked) {
    return { statusCode: 400, code: "endpoint_configuration_blocked" };
  }
  const nextProbeAtMs = receipts
    .flatMap((receipt) =>
      (receipt.circuitState === "open" || receipt.circuitState === "half_open") &&
      typeof receipt.nextProbeAtMs === "number"
        ? [receipt.nextProbeAtMs]
        : [],
    )
    .sort((left, right) => left - right)[0];
  return {
    statusCode: 503,
    code: "endpoint_temporarily_unavailable",
    ...(nextProbeAtMs === undefined
      ? {}
      : {
          nextProbeAtMs,
          retryAfterMs: Math.max(0, nextProbeAtMs - Math.max(0, Math.trunc(nowMs))),
        }),
  };
}

export function parseRetryAfterMs(
  value: string | null | undefined,
  nowMs: number,
): number | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  const normalized = value.trim();
  const seconds = Number(normalized);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(EXECUTION_RATE_LIMIT_MAX_MS, Math.round(seconds * 1_000));
  }
  const targetMs = Date.parse(normalized);
  if (!Number.isFinite(targetMs)) {
    return undefined;
  }
  return Math.min(EXECUTION_RATE_LIMIT_MAX_MS, Math.max(0, targetMs - nowMs));
}
