import { DEFAULT_ROLE_MODEL_ENDPOINT, normalizeEndpoint } from "./config.js";

export interface RuntimeInspectionRequestListItem {
  readonly requestId: string;
  readonly endpointId?: string | null;
  readonly createdAtMs?: number;
  readonly sourceType?: string | null;
  readonly status?: string | null;
  readonly statusFamily?: string | null;
  readonly modelId?: string | null;
  readonly taxonomyGroupId?: string | null;
  readonly taxonomyRoleId?: string | null;
  readonly taxonomyTaskType?: string | null;
}

export interface RuntimeInspectionClientOptions {
  readonly endpoint?: string;
  readonly fetch?: typeof fetch;
  readonly requestLimit?: number;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function readString(record: JsonRecord | null, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

function readNumber(record: JsonRecord | null, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function formatDate(value: number | undefined): string {
  return typeof value === "number" ? new Date(value).toISOString() : "unknown";
}

function formatUsd(value: number | null): string | null {
  return typeof value === "number" ? `$${value.toFixed(4)}` : null;
}

async function fetchJson<TValue>(
  fetcher: typeof fetch,
  url: string,
): Promise<TValue> {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return (await response.json()) as TValue;
}

export function selectLatestRuntimeRequest(
  requests: readonly RuntimeInspectionRequestListItem[],
): RuntimeInspectionRequestListItem | null {
  if (requests.length === 0) {
    return null;
  }
  return [...requests].sort((left, right) => {
    const leftCreatedAt = typeof left.createdAtMs === "number" ? left.createdAtMs : -1;
    const rightCreatedAt = typeof right.createdAtMs === "number" ? right.createdAtMs : -1;
    if (rightCreatedAt !== leftCreatedAt) {
      return rightCreatedAt - leftCreatedAt;
    }
    return left.requestId.localeCompare(right.requestId);
  })[0] ?? null;
}

function formatRequestList(requests: readonly RuntimeInspectionRequestListItem[], endpoint: string): string {
  if (requests.length === 0) {
    return `No recent Role-Model runtime requests were found at ${endpoint}.`;
  }
  return [
    `Recent Role-Model requests (${requests.length}) from ${endpoint}:`,
    ...requests.map((request) => {
      const parts = [
        request.requestId,
        formatDate(request.createdAtMs),
        request.taxonomyTaskType ?? request.taxonomyRoleId ?? "unclassified",
        request.modelId ?? request.endpointId ?? "unknown-target",
        request.statusFamily ?? request.status ?? request.sourceType ?? "unknown",
      ];
      return `- ${parts.join(" | ")}`;
    }),
  ].join("\n");
}

function collectRuntimeSignals(detail: JsonRecord, decisionDetail: JsonRecord | null): string[] {
  const routingDiagnostics =
    asRecord(detail.routingDiagnostics) ??
    asRecord(asRecord(detail.request)?.routingDiagnostics) ??
    {};
  const decisionDiagnostics = asRecord(decisionDetail?.routingDiagnostics);
  const routingMode =
    asRecord(routingDiagnostics.routingMode) ?? asRecord(decisionDiagnostics?.routingMode);
  const controllerRouting =
    asRecord(routingDiagnostics.controllerRouting) ??
    asRecord(decisionDiagnostics?.controllerRouting);
  const acceptedDirectives = asRecord(controllerRouting?.acceptedDirectives);
  const difficultyRouting =
    asRecord(routingDiagnostics.difficultyRouting) ??
    asRecord(decisionDiagnostics?.difficultyRouting);
  const hybridArbitration =
    asRecord(routingDiagnostics.hybridArbitration) ??
    asRecord(decisionDiagnostics?.hybridArbitration);
  const rewrite =
    asRecord(routingDiagnostics.rewrite) ?? asRecord(decisionDiagnostics?.rewrite);
  const endpointProfile = asRecord(detail.endpointProfile);
  const latestProfile = asRecord(endpointProfile?.latestProfile);

  return [
    readString(routingMode, "effectiveMode")
      ? `routing mode: ${readString(routingMode, "effectiveMode")}`
      : null,
    readString(acceptedDirectives, "strategy")
      ? `controller strategy: ${readString(acceptedDirectives, "strategy")}`
      : null,
    readString(acceptedDirectives, "taskType")
      ? `controller task: ${readString(acceptedDirectives, "taskType")}`
      : null,
    readString(difficultyRouting, "difficulty")
      ? `difficulty bucket: ${readString(difficultyRouting, "difficulty")}`
      : null,
    readString(hybridArbitration, "dominantSignal")
      ? `hybrid dominant signal: ${readString(hybridArbitration, "dominantSignal")}`
      : null,
    readString(hybridArbitration, "finalStrategy")
      ? `hybrid final strategy: ${readString(hybridArbitration, "finalStrategy")}`
      : null,
    readString(rewrite, "reason") ? `rewrite reason: ${readString(rewrite, "reason")}` : null,
    typeof readNumber(latestProfile, "judge_score") === "number"
      ? `benchmark score: ${readNumber(latestProfile, "judge_score")}`
      : null,
    typeof readNumber(latestProfile, "quality_benchmark_samples") === "number"
      ? `benchmark samples: ${readNumber(latestProfile, "quality_benchmark_samples")}`
      : null,
  ].filter((value): value is string => value !== null);
}

function formatRequestExplanation(
  requestId: string,
  endpoint: string,
  detail: JsonRecord,
  decisionDetail: JsonRecord | null,
): string {
  const request = asRecord(detail.request) ?? detail;
  const usageEvent = asRecord(request.usageEvent);
  const telemetrySnapshot = asRecord(request.telemetrySnapshot);
  const taxonomyDimensions =
    asRecord(request.taxonomyDimensions) ??
    asRecord(telemetrySnapshot?.taxonomyDimensions);
  const selectedEndpointId =
    readString(decisionDetail, "selectedEndpointId") ??
    readString(request, "endpointId");
  const selectedModelId =
    readString(decisionDetail, "selectedModelId") ??
    readString(usageEvent, "model_id", "modelId");
  const strategyLabel =
    readString(decisionDetail, "strategyLabel") ??
    readString(asRecord(asRecord(request.routingDiagnostics)?.routingMode), "effectiveMode");
  const taxonomyGroupId = readString(
    taxonomyDimensions,
    "taxonomy_group_id",
    "taxonomyGroupId",
  );
  const taxonomyRoleId = readString(
    taxonomyDimensions,
    "taxonomy_role_id",
    "taxonomyRoleId",
  );
  const taxonomyTaskType = readString(
    taxonomyDimensions,
    "taxonomy_task_type",
    "taxonomyTaskType",
  );
  const latencyMs = readNumber(usageEvent, "latency_ms", "latencyMs");
  const totalAvoidedCostUsd =
    readNumber(request, "totalAvoidedCostUsd") ??
    readNumber(telemetrySnapshot, "totalAvoidedCostUsd");
  const observeRequestPath = readString(decisionDetail, "observeRequestPath");
  const runtimeSignals = collectRuntimeSignals(detail, decisionDetail);

  return [
    `Role-Model runtime explanation for ${requestId}:`,
    `- endpoint: ${selectedEndpointId ?? "unknown"}`,
    `- model: ${selectedModelId ?? "unknown"}`,
    `- strategy: ${strategyLabel ?? "unknown"}`,
    `- taxonomy group: ${taxonomyGroupId ?? "unknown"}`,
    `- taxonomy role: ${taxonomyRoleId ?? "unknown"}`,
    `- taxonomy task: ${taxonomyTaskType ?? "unknown"}`,
    `- latency ms: ${latencyMs ?? "unknown"}`,
    `- avoided cost usd: ${formatUsd(totalAvoidedCostUsd) ?? "unknown"}`,
    `- observe request: ${observeRequestPath ?? `${endpoint}/app/observe/requests/${encodeURIComponent(requestId)}`}`,
    runtimeSignals.length > 0 ? "- runtime signals:" : "- runtime signals: none reported",
    ...runtimeSignals.map((signal) => `- ${signal}`),
  ].join("\n");
}

export function createRuntimeInspectionClient(options: RuntimeInspectionClientOptions = {}) {
  const endpoint = normalizeEndpoint(
    options.endpoint ?? process.env.ROLE_MODEL_ENDPOINT ?? DEFAULT_ROLE_MODEL_ENDPOINT,
  );
  const fetcher = options.fetch ?? fetch;
  const requestLimit = options.requestLimit ?? 5;

  const listRecentRequests = async (): Promise<string> => {
    const requests = await fetchJson<RuntimeInspectionRequestListItem[]>(
      fetcher,
      `${endpoint}/api/role-model/requests`,
    );
    const normalized = [...requests]
      .sort((left, right) => {
        const leftCreatedAt = typeof left.createdAtMs === "number" ? left.createdAtMs : -1;
        const rightCreatedAt = typeof right.createdAtMs === "number" ? right.createdAtMs : -1;
        if (rightCreatedAt !== leftCreatedAt) {
          return rightCreatedAt - leftCreatedAt;
        }
        return left.requestId.localeCompare(right.requestId);
      })
      .slice(0, requestLimit);
    return formatRequestList(normalized, endpoint);
  };

  const explainLatestRuntimeRequest = async (): Promise<string> => {
    const requests = await fetchJson<RuntimeInspectionRequestListItem[]>(
      fetcher,
      `${endpoint}/api/role-model/requests`,
    );
    const latest = selectLatestRuntimeRequest(requests);
    if (!latest) {
      throw new Error(`No recent Role-Model runtime requests were found at ${endpoint}.`);
    }
    const detail = await fetchJson<JsonRecord>(
      fetcher,
      `${endpoint}/api/role-model/requests/${encodeURIComponent(latest.requestId)}`,
    );
    let decisionDetail: JsonRecord | null = null;
    try {
      decisionDetail = await fetchJson<JsonRecord>(
        fetcher,
        `${endpoint}/api/role-model/router/decisions/${encodeURIComponent(latest.requestId)}`,
      );
    } catch {
      decisionDetail = null;
    }
    return formatRequestExplanation(latest.requestId, endpoint, detail, decisionDetail);
  };

  return {
    listRuntimeRequests: listRecentRequests,
    explainLatestRuntimeRequest,
  };
}
