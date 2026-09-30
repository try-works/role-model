/**
 * Runtime request inspection: the data behind `/role-model requests` and
 * `/role-model explain`.
 *
 * Reads are best-effort and never destructive. A 404 means "absent" (the request
 * aged out), not an error, and an unreachable runtime yields an empty list so the
 * command surface can report the runtime problem itself rather than a stack trace.
 *
 * @module @try-works/dsh-role-model/runtime-inspection
 */

import { type RoleModelConfigInput, createRoleModelConfig } from "./config.js";

/** One recent runtime request, normalized across the runtime's field spellings. */
export interface RuntimeRequestRecord {
  readonly requestId: string;
  readonly endpointId?: string;
  readonly modelId?: string;
  readonly providerId?: string;
  readonly status?: string;
  readonly createdAtMs?: number;
  readonly roleId?: string;
  readonly taskType?: string;
}

/** One request joined with its router decision. */
export interface InspectedRequest extends RuntimeRequestRecord {
  readonly selectedEndpointId?: string;
  readonly selectedModelId?: string;
  readonly strategyLabel?: string;
  readonly selectionReasons?: readonly string[];
  readonly observeRequestPath?: string;
}

/** Inputs common to both inspection calls. */
export interface RuntimeInspectionInput extends RoleModelConfigInput {
  readonly fetch?: typeof fetch | undefined;
}

/** True for a plain object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read the first non-blank string among the candidate values. */
function firstString(...values: readonly unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

/** Read the first finite number among the candidate values. */
function firstNumber(...values: readonly unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

/** Read a string list, or undefined when the value is not one. */
function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const values = value.filter((entry): entry is string => typeof entry === "string");
  return values.length === 0 ? undefined : values;
}

/** Read the role/task hints out of a request's injected intent, if present. */
function intentOf(record: Record<string, unknown>): { roleId?: string; taskType?: string } {
  const normalized = isRecord(record.normalized_intent)
    ? record.normalized_intent
    : isRecord(record.normalizedIntent)
      ? record.normalizedIntent
      : undefined;
  const roleModel = isRecord(record.role_model) ? record.role_model : undefined;
  const intent = isRecord(roleModel?.intent)
    ? roleModel.intent
    : isRecord(record.intent)
      ? record.intent
      : undefined;
  const roleId = firstString(
    normalized?.roleId,
    normalized?.role_id,
    normalized?.requestedRoleId,
    normalized?.requested_role_id,
    intent?.role_hint_id,
    intent?.requested_role_id,
  );
  const taskType = firstString(
    normalized?.taskType,
    normalized?.task_type,
    normalized?.requestedTaskType,
    normalized?.requested_task_type,
    intent?.task_type,
  );
  return {
    ...(roleId === undefined ? {} : { roleId }),
    ...(taskType === undefined ? {} : { taskType }),
  };
}

/** Normalize one raw request record, or undefined when it carries no id. */
function toRequestRecord(value: unknown): RuntimeRequestRecord | undefined {
  if (!isRecord(value)) return undefined;
  const requestId = firstString(value.request_id, value.requestId);
  if (requestId === undefined) return undefined;
  const intent = intentOf(value);
  const endpointId = firstString(value.endpoint_id, value.endpointId);
  const modelId = firstString(value.model_id, value.modelId);
  const providerId = firstString(value.provider_id, value.providerId);
  const status = firstString(value.status);
  const createdAtMs = firstNumber(
    value.created_at_ms,
    value.createdAtMs,
    value.timestamp_ms,
    value.timestampMs,
  );
  return {
    requestId,
    ...(endpointId === undefined ? {} : { endpointId }),
    ...(modelId === undefined ? {} : { modelId }),
    ...(providerId === undefined ? {} : { providerId }),
    ...(status === undefined ? {} : { status }),
    ...(createdAtMs === undefined ? {} : { createdAtMs }),
    ...(intent.roleId === undefined ? {} : { roleId: intent.roleId }),
    ...(intent.taskType === undefined ? {} : { taskType: intent.taskType }),
  };
}

/**
 * Fetch and decode JSON, treating any failure as "no answer".
 * @param url - absolute URL.
 * @param timeoutMs - request timeout.
 * @param fetchImpl - fetch implementation.
 * @returns the decoded value, or undefined (including for HTTP 404).
 */
async function fetchJsonQuiet(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      keepalive: false,
      redirect: "error",
      headers: { connection: "close" },
    });
    if (!response.ok) return undefined;
    return await response.json();
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * List recent runtime requests, newest first as the runtime reports them.
 * @param input - endpoint, optional limit, and an optional fetch.
 * @returns the normalized requests; empty when unavailable or malformed.
 */
export async function listRecentRequests(
  input: RuntimeInspectionInput & { readonly limit?: number | undefined } = {},
): Promise<RuntimeRequestRecord[]> {
  const config = createRoleModelConfig(input);
  const fetchImpl = input.fetch ?? fetch;
  const payload = await fetchJsonQuiet(
    `${config.endpoint}/api/role-model/requests`,
    config.requestTimeoutMs,
    fetchImpl,
  );
  if (!Array.isArray(payload)) return [];
  const requests = payload
    .map(toRequestRecord)
    .filter((record): record is RuntimeRequestRecord => record !== undefined);
  const limit = input.limit;
  return typeof limit === "number" && Number.isFinite(limit) && limit > 0
    ? requests.slice(0, Math.trunc(limit))
    : requests;
}

/**
 * Inspect one request together with its router decision.
 * @param input - endpoint, the request id, and an optional fetch.
 * @returns the joined record, or null when the request is unknown.
 */
export async function inspectRequest(
  input: RuntimeInspectionInput & { readonly requestId: string },
): Promise<InspectedRequest | null> {
  const config = createRoleModelConfig(input);
  const fetchImpl = input.fetch ?? fetch;
  const encoded = encodeURIComponent(input.requestId);

  const raw = await fetchJsonQuiet(
    `${config.endpoint}/api/role-model/requests/${encoded}`,
    config.requestTimeoutMs,
    fetchImpl,
  );
  const record = toRequestRecord(raw);
  if (record === undefined) return null;

  const decisionRaw = await fetchJsonQuiet(
    `${config.endpoint}/api/role-model/router/decisions/${encoded}`,
    config.requestTimeoutMs,
    fetchImpl,
  );
  if (!isRecord(decisionRaw)) return record;

  const decision = isRecord(decisionRaw.decision) ? decisionRaw.decision : undefined;
  const selectedEndpointId = firstString(
    decisionRaw.selected_endpoint_id,
    decisionRaw.selectedEndpointId,
  );
  const selectedModelId = firstString(decisionRaw.selected_model_id, decisionRaw.selectedModelId);
  const strategyLabel = firstString(decisionRaw.strategy_label, decisionRaw.strategyLabel);
  const selectionReasons =
    stringList(decision?.selection_reasons) ?? stringList(decision?.selectionReasons);
  const observeRequestPath = firstString(
    decisionRaw.observe_request_path,
    decisionRaw.observeRequestPath,
  );

  return {
    ...record,
    ...(selectedEndpointId === undefined ? {} : { selectedEndpointId }),
    ...(selectedModelId === undefined ? {} : { selectedModelId }),
    ...(strategyLabel === undefined ? {} : { strategyLabel }),
    ...(selectionReasons === undefined ? {} : { selectionReasons }),
    ...(observeRequestPath === undefined ? {} : { observeRequestPath }),
  };
}
