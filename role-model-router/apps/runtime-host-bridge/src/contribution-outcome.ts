export type RuntimeContributionOutcome =
  | { readonly success: true }
  | { readonly success: false; readonly failureClass: string };

export interface RuntimeContributionOutcomeInput {
  readonly responseStatusCode?: unknown;
  readonly usageErrorClass?: unknown;
  readonly normalizedErrorClass?: unknown;
  readonly executionFailure?: unknown;
  readonly cancelled?: unknown;
}

/**
 * The public bridge and the Track B wrapper receive different shaped records,
 * but both must classify the same authoritative observation fields. Keep the
 * extraction here so neither path has to interpret provider response bodies or
 * manufacture a success outcome.
 */
export type RuntimeContributionObservation = Readonly<Record<string, unknown>>;

const CONTRIBUTION_FAILURE_CLASS_PATTERN = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
const CANONICAL_CONTRIBUTION_FAILURE_CLASSES = new Set([
  "request_cancelled",
  "provider_auth_error",
  "provider_error",
  "provider_unavailable",
  "provider_timeout",
  "quota_exhausted",
  "blocked_quota",
  "rate_limited",
  "upstream_timeout",
  "upstream_connection_error",
  "upstream_error",
  "provider_5xx",
  "invalid_request",
  "execution_failed",
  "no_eligible_target",
  "alias_pool_empty",
  "unexpected_response_status",
  "transport_failure",
]);

function readContributionFailureClass(
  value: unknown,
  depth = 0,
): { readonly present: boolean; readonly failureClass: string | null } {
  if (typeof value === "string") {
    const candidate = value.trim();
    if (candidate.length === 0) {
      return { present: false, failureClass: null };
    }
    return {
      present: true,
      failureClass:
        CONTRIBUTION_FAILURE_CLASS_PATTERN.test(candidate) &&
        CANONICAL_CONTRIBUTION_FAILURE_CLASSES.has(candidate)
          ? candidate
          : null,
    };
  }
  if (depth >= 2 || value === null || typeof value !== "object" || Array.isArray(value)) {
    return { present: false, failureClass: null };
  }
  const record = value as Record<string, unknown>;
  for (const key of [
    "errorClass",
    "error_class",
    "failureClass",
    "failure_class",
    "code",
    "type",
    "failure",
    "error",
    "metadata",
  ]) {
    if (!(key in record) || record[key] === null || record[key] === undefined) {
      continue;
    }
    const result = readContributionFailureClass(record[key], depth + 1);
    if (result.present) {
      return result;
    }
  }
  return { present: false, failureClass: null };
}

function readRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function readStatusCode(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : null;
}

function readFirstStatusCode(
  records: readonly (Readonly<Record<string, unknown>> | null)[],
  keys: readonly string[],
): number | null {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      const statusCode = readStatusCode(record[key]);
      if (statusCode !== null) return statusCode;
    }
  }
  return null;
}

function readFirstValue(
  records: readonly (Readonly<Record<string, unknown>> | null)[],
  keys: readonly string[],
): unknown {
  for (const record of records) {
    if (!record) continue;
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== null) return record[key];
    }
  }
  return undefined;
}

function readExecutionDiagnostic(execution: unknown, normalizedErrorClass: unknown): unknown {
  const record = readRecord(execution);
  const diagnostics = Array.isArray(execution)
    ? execution
    : record && Array.isArray(record.diagnostics)
      ? record.diagnostics
      : null;
  if (!Array.isArray(diagnostics)) return undefined;
  if (typeof normalizedErrorClass === "string" && normalizedErrorClass.trim()) {
    const matching = diagnostics.find((diagnostic) => {
      const record = readRecord(diagnostic);
      return record?.code === normalizedErrorClass || record?.errorClass === normalizedErrorClass;
    });
    if (matching !== undefined) return matching;
  }
  return diagnostics.find((diagnostic) => {
    const record = readRecord(diagnostic);
    return Boolean(record?.errorClass || record?.error_class || record?.code);
  });
}

export function deriveRuntimeContributionOutcomeFromObservation(
  observation: RuntimeContributionObservation,
): RuntimeContributionOutcome | null {
  const usageEvent = readRecord(observation.usageEvent);
  const execution = readRecord(observation.execution);
  const responseCapture = readRecord(observation.responseCapture);
  const nestedResponseCapture = readRecord(execution?.responseCapture);
  const normalized = readRecord(execution?.normalized);
  const inspection = readRecord(observation.inspection);
  const inspectionRequest = readRecord(inspection?.request);
  const inspectionResponseCapture = readRecord(inspectionRequest?.responseCapture);
  const diagnostics = readRecord(observation.diagnostics);
  const records = [
    observation,
    usageEvent,
    responseCapture,
    execution,
    nestedResponseCapture,
    inspectionResponseCapture,
  ];
  const normalizedErrorClass = readFirstValue(
    [observation, normalized, execution],
    ["normalizedErrorClass", "errorClass", "error_class"],
  );
  const executionFailure =
    readFirstValue([observation, execution], ["executionFailure", "failure", "error"]) ??
    readExecutionDiagnostic(execution, normalizedErrorClass) ??
    readExecutionDiagnostic(diagnostics, normalizedErrorClass);
  const cancelled = readFirstValue(
    [observation, usageEvent, execution],
    ["cancelled", "canceled", "aborted"],
  );
  return deriveRuntimeContributionOutcome({
    responseStatusCode: readFirstStatusCode(records, [
      "responseStatusCode",
      "response_status_code",
      "statusCode",
      "status_code",
    ]),
    usageErrorClass: readFirstValue([usageEvent], ["error_class", "errorClass"]),
    normalizedErrorClass,
    executionFailure,
    cancelled,
  });
}

function readContributionFailureStatus(value: unknown, depth = 0): number | null {
  if (depth >= 2 || value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.statusCode === "number" &&
    Number.isInteger(record.statusCode) &&
    record.statusCode >= 100 &&
    record.statusCode <= 599
  ) {
    return record.statusCode;
  }
  for (const key of ["failure", "error", "metadata"]) {
    const nested = readContributionFailureStatus(record[key], depth + 1);
    if (nested !== null) {
      return nested;
    }
  }
  return null;
}

function hasContributionFailureFlag(value: unknown, depth = 0): boolean {
  if (depth >= 2 || value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (record.failed === true || record.isError === true || record.success === false) {
    return true;
  }
  return ["failure", "error", "metadata"].some((key) =>
    hasContributionFailureFlag(record[key], depth + 1),
  );
}

function hasContributionCancellation(value: unknown, depth = 0): boolean {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return (
      normalized === "aborterror" || normalized === "abort_err" || normalized === "err_canceled"
    );
  }
  if (depth >= 2 || value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    record.cancelled === true ||
    record.canceled === true ||
    record.name === "AbortError" ||
    record.code === "ABORT_ERR" ||
    record.code === "ERR_CANCELED"
  ) {
    return true;
  }
  return ["failure", "error", "metadata"].some((key) =>
    hasContributionCancellation(record[key], depth + 1),
  );
}

function hasUnclassifiedContributionSignal(value: unknown): boolean {
  if (value === null || value === undefined || value === false) {
    return false;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (
      readContributionFailureClass(value).present ||
      readContributionFailureStatus(value) !== null
    ) {
      return false;
    }
    if (hasContributionFailureFlag(value) || hasContributionCancellation(value)) {
      return false;
    }
    return Object.keys(record).length > 0 || "message" in record || "name" in record;
  }
  return typeof value === "boolean" || typeof value === "number";
}

function contributionFailureClassForStatus(statusCode: number): string {
  if (statusCode === 499) {
    return "request_cancelled";
  }
  if (statusCode === 401 || statusCode === 403) {
    return "provider_auth_error";
  }
  if (statusCode === 402) {
    return "quota_exhausted";
  }
  if (statusCode === 408 || statusCode === 504 || statusCode === 524) {
    return "upstream_timeout";
  }
  if (statusCode === 429) {
    return "rate_limited";
  }
  if (statusCode >= 500) {
    return "upstream_error";
  }
  if (statusCode >= 400) {
    return "execution_failed";
  }
  return "unexpected_response_status";
}

export function deriveRuntimeContributionOutcome(
  input: RuntimeContributionOutcomeInput,
): RuntimeContributionOutcome | null {
  if (input.cancelled === true || hasContributionCancellation(input.executionFailure)) {
    return { success: false, failureClass: "request_cancelled" };
  }

  for (const candidate of [
    input.usageErrorClass,
    input.normalizedErrorClass,
    input.executionFailure,
  ]) {
    const result = readContributionFailureClass(candidate);
    if (result.present) {
      return {
        success: false,
        failureClass: result.failureClass ?? "execution_failed",
      };
    }
  }

  if (hasContributionFailureFlag(input.executionFailure)) {
    return { success: false, failureClass: "execution_failed" };
  }
  const executionFailureStatus = readContributionFailureStatus(input.executionFailure);
  if (executionFailureStatus !== null && executionFailureStatus >= 300) {
    return {
      success: false,
      failureClass: contributionFailureClassForStatus(executionFailureStatus),
    };
  }

  if (
    [input.usageErrorClass, input.normalizedErrorClass, input.executionFailure].some(
      hasUnclassifiedContributionSignal,
    )
  ) {
    return null;
  }

  const { responseStatusCode } = input;
  if (
    typeof responseStatusCode !== "number" ||
    !Number.isInteger(responseStatusCode) ||
    responseStatusCode < 100 ||
    responseStatusCode > 599
  ) {
    return null;
  }
  if (responseStatusCode >= 200 && responseStatusCode < 300) {
    return { success: true };
  }
  if (responseStatusCode >= 300) {
    return {
      success: false,
      failureClass: contributionFailureClassForStatus(responseStatusCode),
    };
  }
  return null;
}
