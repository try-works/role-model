import { DEFAULT_ROLE_MODEL_ENDPOINT, normalizeEndpoint } from "./config.js";

export interface RoleModelRecentRequest {
  readonly requestId: string;
  readonly clientRequestId: string | null;
  readonly endpointId: string | null;
  readonly modelId: string | null;
  readonly providerId: string | null;
  readonly status: string | null;
  readonly createdAtMs: number | null;
  readonly normalizedIntent: Record<string, unknown> | null;
  readonly roleModel: Record<string, unknown> | null;
}

export interface RoleModelRouterDecisionInspection {
  readonly requestId: string;
  readonly selectedEndpointId: string | null;
  readonly selectedModelId: string | null;
  readonly strategyLabel: string | null;
  readonly decision: Record<string, unknown> | null;
  readonly routingDiagnostics: Record<string, unknown> | null;
  readonly observeRequestPath: string | null;
}

export interface RoleModelRequestInspection {
  readonly runtimeBaseUrl: string;
  readonly request: RoleModelRecentRequest;
  readonly routerDecision: RoleModelRouterDecisionInspection | null;
}

export interface RuntimeInspectionInput {
  readonly endpoint?: string;
  readonly fetch?: typeof fetch;
  readonly requestTimeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNullableString(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

function readNullableNumber(
  record: Record<string, unknown>,
  ...keys: readonly string[]
): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

async function fetchJson(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      keepalive: false,
      headers: { connection: "close" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOptionalJson(
  url: string,
  timeoutMs: number,
  fetchImpl: typeof fetch,
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      signal: controller.signal,
      keepalive: false,
      headers: { connection: "close" },
    });
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function parseRequestRecord(value: unknown): RoleModelRecentRequest {
  if (!isRecord(value)) {
    throw new Error("Role-Model request inspection payload is malformed.");
  }
  const requestId = readNullableString(value, "requestId", "request_id");
  if (!requestId) {
    throw new Error("Role-Model request inspection payload is malformed.");
  }
  return {
    requestId,
    clientRequestId: readNullableString(value, "clientRequestId", "client_request_id"),
    endpointId: readNullableString(value, "endpointId", "endpoint_id"),
    modelId: readNullableString(value, "modelId", "model_id"),
    providerId: readNullableString(value, "providerId", "provider_id"),
    status: readNullableString(value, "status"),
    createdAtMs: readNullableNumber(
      value,
      "createdAtMs",
      "created_at_ms",
      "timestampMs",
      "timestamp_ms",
    ),
    normalizedIntent: isRecord(value.normalizedIntent) ? value.normalizedIntent : null,
    roleModel: isRecord(value.role_model) ? value.role_model : null,
  };
}

function parseRouterDecision(value: unknown): RoleModelRouterDecisionInspection {
  if (!isRecord(value)) {
    throw new Error("Role-Model router decision payload is malformed.");
  }
  const requestId = readNullableString(value, "requestId", "request_id");
  if (!requestId) {
    throw new Error("Role-Model router decision payload is malformed.");
  }
  return {
    requestId,
    selectedEndpointId: readNullableString(value, "selectedEndpointId", "selected_endpoint_id"),
    selectedModelId: readNullableString(value, "selectedModelId", "selected_model_id"),
    strategyLabel: readNullableString(value, "strategyLabel", "strategy_label"),
    decision: isRecord(value.decision) ? value.decision : null,
    routingDiagnostics: isRecord(value.routingDiagnostics) ? value.routingDiagnostics : null,
    observeRequestPath: readNullableString(value, "observeRequestPath", "observe_request_path"),
  };
}

function resolveInspectionConfig(input: RuntimeInspectionInput) {
  return {
    endpoint: normalizeEndpoint(input.endpoint ?? DEFAULT_ROLE_MODEL_ENDPOINT),
    fetchImpl: input.fetch ?? fetch,
    timeoutMs: input.requestTimeoutMs ?? 2500,
  };
}

export async function listRecentRequests(
  input: RuntimeInspectionInput & {
    readonly limit?: number;
  } = {},
): Promise<readonly RoleModelRecentRequest[]> {
  const { endpoint, fetchImpl, timeoutMs } = resolveInspectionConfig(input);
  const payload = await fetchJson(`${endpoint}/api/role-model/requests`, timeoutMs, fetchImpl);
  if (!Array.isArray(payload)) {
    throw new Error("Role-Model request list payload is malformed.");
  }
  const requests = payload.map((entry) => parseRequestRecord(entry));
  const limit =
    typeof input.limit === "number" && Number.isFinite(input.limit) && input.limit > 0
      ? Math.floor(input.limit)
      : requests.length;
  return requests.slice(0, limit);
}

export async function inspectRequest(
  input: RuntimeInspectionInput & {
    readonly requestId: string;
  },
): Promise<RoleModelRequestInspection | null> {
  const { endpoint, fetchImpl, timeoutMs } = resolveInspectionConfig(input);
  const requestPayload = await fetchOptionalJson(
    `${endpoint}/api/role-model/requests/${encodeURIComponent(input.requestId)}`,
    timeoutMs,
    fetchImpl,
  );
  if (requestPayload === null) {
    return null;
  }
  const [request, routerDecisionPayload] = await Promise.all([
    Promise.resolve(parseRequestRecord(requestPayload)),
    fetchOptionalJson(
      `${endpoint}/api/role-model/router/decisions/${encodeURIComponent(input.requestId)}`,
      timeoutMs,
      fetchImpl,
    ),
  ]);
  return {
    runtimeBaseUrl: endpoint,
    request,
    routerDecision: routerDecisionPayload ? parseRouterDecision(routerDecisionPayload) : null,
  };
}
