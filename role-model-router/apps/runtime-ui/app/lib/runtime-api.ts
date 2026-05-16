export type RuntimeFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface RuntimeSummary {
  readonly providerCount: number;
  readonly accountCount: number;
  readonly endpointCount: number;
  readonly readinessSummary?: {
    readonly pendingDeviceAuthorizationCount: number;
    readonly credentialsMissingAccountCount: number;
    readonly connectedWithoutEndpointCount: number;
    readonly readyAccountCount: number;
  };
  readonly lifecycleSummary?: {
    readonly active: number;
    readonly degraded: number;
    readonly offline: number;
  };
}

export interface RuntimeProcessConfig {
  readonly command: string | null;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly cwd: string | null;
  readonly startupTimeoutMs: number | null;
}

export interface RuntimeConfigModel {
  readonly modelId: string;
  readonly path: string;
  readonly contextWindow?: number | null;
  readonly command?: string | null;
  readonly proxyBaseUrl?: string | null;
  readonly checkEndpoint?: string | null;
  readonly useModelName?: string | null;
}

export interface RuntimeConfigProviderMapping {
  readonly modelId: string;
  readonly litellmModel?: string;
  readonly litellmParams?: Readonly<Record<string, unknown>>;
}

export interface RuntimeConfigProvider {
  readonly providerId: string;
  readonly apiKeyRef?: string | null;
  readonly modelNames?: readonly string[];
  readonly modelMappings: readonly RuntimeConfigProviderMapping[];
}

export interface RuntimeConfig {
  readonly version: string;
  readonly routingStrategy?: string | null;
  readonly executionMode?: "decision_only" | "hybrid" | "local_only" | "remote_only";
  readonly llamaSwap: {
    readonly enabled?: boolean;
    readonly models: readonly RuntimeConfigModel[];
    readonly process: RuntimeProcessConfig;
  };
  readonly liteLLM: {
    readonly enabled?: boolean;
    readonly providers: readonly RuntimeConfigProvider[];
    readonly process: RuntimeProcessConfig;
  };
}

export interface RuntimeConfigRecord {
  readonly applied: boolean;
  readonly path: string | null;
  readonly config: RuntimeConfig | null;
}

export interface ProviderVariant {
  readonly variantId: string;
  readonly label: string;
  readonly description?: string;
  readonly authMode: string;
  readonly availability: string;
  readonly baseUrl?: string;
  readonly modelIds?: readonly string[];
  readonly oauth?: {
    readonly clientId: string;
    readonly deviceAuthorizationEndpoint: string;
    readonly tokenEndpoint: string;
    readonly requiredHeaders: readonly string[];
    readonly scope?: string;
  };
}

export interface RuntimeProvider {
  readonly providerId: string;
  readonly displayName: string;
  readonly npmPackage?: string;
  readonly providerKind?: string;
  readonly authFamily?: string;
  readonly adapterFamily?: string;
  readonly apiBase?: string;
  readonly docsUrl?: string | null;
  readonly envVars?: readonly string[];
  readonly supportedAuthModes?: readonly string[];
  readonly controlPlaneRequirements?: readonly string[];
  readonly localOverrideApplied?: boolean;
  readonly modelIds?: readonly string[];
  readonly variants?: readonly ProviderVariant[];
}

export interface RuntimeAccount {
  readonly providerAccountId: string;
  readonly providerId: string;
  readonly providerKind?: string;
  readonly authMode?: string;
  readonly credentialRef?: {
    readonly backend: string;
    readonly ref: string;
  };
  readonly baseUrlOverride?: string | null;
  readonly allowedModels?: readonly string[];
  readonly modelRoleBindings?: readonly {
    readonly modelId: string;
    readonly roleIds: readonly string[];
  }[];
  readonly deniedModels?: readonly string[];
  readonly status?: string;
  readonly healthStatus?: string;
  readonly rotationState?: string;
}

export interface RuntimeEndpoint {
  readonly endpointId: string;
  readonly modelId: string;
  readonly providerId: string | null;
  readonly providerAccountId?: string;
  readonly localModelSource?: "llama-swap" | "peer-backed";
  readonly region?: string;
  readonly roleIds?: readonly string[];
  readonly status?: string;
  readonly endpointKind?: string;
  readonly servingSource?: string;
  readonly sourceType?: "local" | "remote";
  readonly healthStatus?: string;
  readonly capabilities?: readonly string[];
  readonly toolCallingSupported?: boolean;
  readonly toolCallingStyle?: string;
}

export interface RuntimeLocalModel {
  readonly modelId: string;
  readonly loadedAt: string;
  readonly engine: string;
  readonly localModelSource?: "llama-swap" | "peer-backed";
  readonly contextWindow?: number | null;
  readonly proxyBaseUrl?: string | null;
  readonly checkEndpoint?: string | null;
  readonly useModelName?: string | null;
}

export interface RuntimeRoleDefinition {
  readonly roleId: string;
  readonly label: string;
  readonly description?: string;
  readonly taskTypes?: readonly string[];
}

export interface RuntimeDeviceAuthorization {
  readonly authRequestId: string;
  readonly providerAccountId: string;
  readonly providerId?: string;
  readonly variantId?: string;
  readonly status: string;
  readonly userCode?: string;
  readonly verificationUri?: string;
  readonly verificationUriComplete?: string;
  readonly intervalSeconds?: number;
  readonly expiresAtMs?: number;
  readonly lastError?: string;
}

export interface RuntimeRequestListItem {
  readonly requestId: string;
  readonly endpointId?: string;
  readonly createdAtMs?: number;
}

export interface RuntimeTelemetrySourceSummary {
  readonly requestCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalTokens: number;
  readonly cachedRequestCount: number;
  readonly totalActualCostUsd: number;
  readonly totalEstimatedCostUsd: number;
  readonly averageLatencyMs: number | null;
  readonly p95LatencyMs: number | null;
  readonly lastSeenAtMs: number | null;
}

export interface RuntimeTelemetrySummary extends RuntimeTelemetrySourceSummary {
  readonly sourceBreakdown: {
    readonly local: RuntimeTelemetrySourceSummary;
    readonly remote: RuntimeTelemetrySourceSummary;
  };
}

export interface RuntimeTelemetryComparisonRow extends RuntimeTelemetrySourceSummary {
  readonly endpointId: string;
  readonly modelId: string | null;
  readonly providerKind?: string | null;
  readonly providerFamily?: string | null;
  readonly promptCacheSupported?: boolean;
  readonly sourceType: "local" | "remote";
  readonly providerId?: string | null;
  readonly endpointKind?: string | null;
  readonly servingSource?: string | null;
  readonly healthStatus?: string;
  readonly status?: string;
  readonly roleIds?: readonly string[];
}

export interface RuntimeTelemetryRequestRecord {
  readonly requestId: string;
  readonly routingDecisionId?: string;
  readonly endpointId: string;
  readonly conversationId?: string;
  readonly createdAtMs: number;
  readonly modelId?: string | null;
  readonly providerKind?: string | null;
  readonly providerFamily?: string | null;
  readonly sourceType: "local" | "remote";
  readonly providerId?: string | null;
  readonly endpointKind?: string | null;
  readonly servingSource?: string | null;
  readonly healthStatus?: string;
  readonly status?: string;
  readonly roleIds?: readonly string[];
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
  readonly latencyMs?: number | null;
  readonly errorClass?: string | null;
  readonly statusCode?: number | null;
  readonly finishReason?: string | null;
  readonly promptCacheRequested?: boolean;
  readonly promptCacheSupported?: boolean;
  readonly promptCacheUsed?: boolean;
  readonly cacheReadTokens?: number;
  readonly cacheReadTokensSupported?: boolean;
  readonly cacheWriteTokens?: number;
  readonly cacheWriteTokensSupported?: boolean;
  readonly streamTextDeltaCount?: number;
  readonly streamTextSupported?: boolean;
  readonly streamToolCallDeltaCount?: number;
  readonly streamToolCallSupported?: boolean;
  readonly streamToolArgumentDeltaCount?: number;
  readonly streamToolArgumentSupported?: boolean;
  readonly toolCallCount?: number;
  readonly toolExecutionCount?: number;
  readonly costProvenance?: "actual" | "estimated" | "unavailable";
  readonly actualCostUsd?: number | null;
  readonly estimatedCostUsd?: number | null;
  readonly currency?: string | null;
}

export interface RuntimeTelemetryDashboard {
  readonly summary: RuntimeTelemetrySummary;
  readonly rows: readonly RuntimeTelemetryComparisonRow[];
  readonly requests: readonly RuntimeTelemetryRequestRecord[];
}

export interface RuntimeTelemetryStreamEvent {
  readonly eventName: "telemetry.update";
  readonly emittedAtMs: number;
  readonly summary?: RuntimeTelemetrySummary;
  readonly request: RuntimeTelemetryRequestRecord;
}

export interface RuntimeEventSourceLike {
  addEventListener(type: string, listener: (event: MessageEvent<string>) => void): void;
  close(): void;
}

export type RuntimeEventSourceFactory = (url: string) => RuntimeEventSourceLike;

export interface RuntimeModelRecord {
  readonly id: string;
  readonly object?: string;
  readonly owned_by?: string;
  readonly providerId?: string;
  readonly displayName?: string;
  readonly endpoint_ids?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly modalities?: readonly string[];
  readonly contextWindow?: number | null;
  readonly maxOutputTokens?: number | null;
  readonly pricing?: {
    readonly inputPer1M: number;
    readonly outputPer1M: number;
    readonly currency: string;
  } | null;
  readonly peerID?: string;
}

export interface RuntimeControllerAssignment {
  readonly scope: string;
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType: "local" | "remote";
  readonly status?: string;
  readonly updatedAtMs?: number;
}

export interface RuntimeDownstreamOpenAIProviderConfig {
  readonly kind: "openai-compatible";
  readonly providerId: string;
  readonly displayName: string;
  readonly baseUrl: string;
  readonly endpoints: {
    readonly health: string;
    readonly models: string;
    readonly chatCompletions: string;
  };
  readonly authentication: {
    readonly type: "bearer";
    readonly headerName: string;
    readonly required: boolean;
    readonly placeholderToken: string;
    readonly note: string;
  };
  readonly models: readonly RuntimeModelRecord[];
  readonly setup: {
    readonly recommendedModel: string | null;
    readonly notes: readonly string[];
  };
}

export interface RuntimeTokenMetrics {
  readonly cache_tokens: number;
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly prompt_per_second: number;
  readonly tokens_per_second: number;
}

export interface RuntimeActivityLogEntry {
  readonly id: number;
  readonly timestamp: string;
  readonly model: string;
  readonly req_path: string;
  readonly resp_content_type: string;
  readonly resp_status_code: number;
  readonly tokens: RuntimeTokenMetrics;
  readonly duration_ms: number;
  readonly has_capture: boolean;
}

export interface RuntimeActivityCapture {
  readonly id: number;
  readonly req_path: string;
  readonly req_headers: Record<string, string>;
  readonly req_body: string;
  readonly resp_headers: Record<string, string>;
  readonly resp_body: string;
}

export interface RuntimeVersionInfo {
  readonly build_date: string;
  readonly commit: string;
  readonly version: string;
}

export interface RuntimeImageGenerationRequest {
  readonly model: string;
  readonly prompt: string;
  readonly n?: number;
  readonly size?: string;
}

export interface RuntimeImageGenerationResponse {
  readonly created: number;
  readonly data: ReadonlyArray<{
    readonly url?: string;
    readonly b64_json?: string;
  }>;
}

export interface RuntimeSdApiTxt2ImgRequest {
  readonly model?: string;
  readonly prompt: string;
  readonly negative_prompt?: string;
  readonly width?: number;
  readonly height?: number;
  readonly steps?: number;
  readonly cfg_scale?: number;
  readonly seed?: number;
  readonly batch_size?: number;
  readonly sampler_name?: string;
  readonly scheduler?: string;
}

export interface RuntimeSdApiResponse {
  readonly images: readonly string[];
  readonly parameters: Record<string, unknown>;
  readonly info: string;
}

export interface RuntimeAudioVoiceRecord {
  readonly id?: string;
  readonly voice?: string;
  readonly name?: string;
  readonly label?: string;
  readonly description?: string;
  readonly [key: string]: unknown;
}

export interface RuntimeSpeechGenerationRequest {
  readonly model: string;
  readonly input: string;
  readonly voice: string;
}

export interface RuntimeAudioTranscriptionResponse {
  readonly text: string;
}

export interface RuntimeRerankRequest {
  readonly model: string;
  readonly query: string;
  readonly documents: readonly string[];
}

export interface RuntimeRerankResponse {
  readonly results: ReadonlyArray<{
    readonly index: number;
    readonly relevance_score: number;
  }>;
  readonly usage?: Record<string, number>;
}

export interface RuntimeSnapshot {
  readonly summary: RuntimeSummary;
  readonly providers: readonly RuntimeProvider[];
  readonly accounts: readonly RuntimeAccount[];
  readonly deviceAuthorizations: readonly RuntimeDeviceAuthorization[];
  readonly endpoints: readonly RuntimeEndpoint[];
  readonly requests: readonly RuntimeRequestListItem[];
  readonly models: readonly RuntimeModelRecord[];
  readonly roles: readonly RuntimeRoleDefinition[];
}

export interface RuntimeRequestDetail {
  readonly requestId: string;
  readonly endpointId: string;
  readonly [key: string]: unknown;
}

export interface RouterSummary {
  readonly strategy: string | null;
  readonly executionMode: "decision_only" | "hybrid" | "local_only" | "remote_only";
  readonly controller: RuntimeControllerAssignment | null;
  readonly configuredCandidateCount: number;
  readonly recentDecisionCount: number;
  readonly guidance?: {
    readonly endpointId?: string | null;
    readonly preferredEndpointIds?: readonly string[];
    readonly ignoredEndpointIds?: readonly string[];
  };
}

export interface RouterConfig {
  readonly persisted: {
    readonly strategy: string | null;
    readonly executionMode: "decision_only" | "hybrid" | "local_only" | "remote_only";
  };
  readonly controller: RuntimeControllerAssignment | null;
  readonly guidance: {
    readonly endpointId?: string | null;
    readonly preferredEndpointIds: readonly string[];
    readonly ignoredEndpointIds: readonly string[];
  };
  readonly sources?: Record<string, unknown>;
  readonly policySources: {
    readonly roles: readonly Record<string, unknown>[];
    readonly tasks: readonly Record<string, unknown>[];
    readonly roleBindings?: readonly Record<string, unknown>[];
  };
}

export interface RouterCandidate {
  readonly endpointId: string;
  readonly modelId: string;
  readonly providerId: string | null;
  readonly sourceType: "local" | "remote";
  readonly endpointKind?: string;
  readonly servingSource?: string;
  readonly healthStatus?: string;
  readonly status?: string;
  readonly controllerEligible?: boolean;
  readonly preferred?: boolean;
  readonly ignored?: boolean;
  readonly roleBindings?: readonly string[];
  readonly capabilities?: readonly string[];
  readonly toolCallingSupported?: boolean;
  readonly toolCallingStyle?: string;
  readonly latestProfile?: Record<string, unknown> | null;
  readonly recentSamples?: readonly unknown[];
  readonly difficultyProfiles?: Record<string, unknown>;
  readonly advisoryMaxDifficultyRecommendation?: Record<string, unknown> | null;
}

export interface RouterDecisionListItem {
  readonly requestId: string;
  readonly routingDecisionId: string | null;
  readonly selectedEndpointId: string;
  readonly selectedModelId: string | null;
  readonly strategyLabel: string | null;
  readonly decidedAtMs?: number;
  readonly sourceType?: "local" | "remote";
  readonly providerId?: string | null;
  readonly finishReason?: string | null;
}

export interface RouterDecisionDetail {
  readonly requestId: string;
  readonly routingDecisionId: string | null;
  readonly selectedEndpointId: string;
  readonly selectedModelId: string | null;
  readonly fallbackEndpointIds: readonly string[];
  readonly strategyLabel: string | null;
  readonly decision?: Record<string, unknown> | null;
  readonly routingDiagnostics?: Record<string, unknown> | null;
  readonly retrievalReceipt?: Record<string, unknown> | null;
  readonly contextEnvelope?: Record<string, unknown> | null;
  readonly request: RuntimeRequestDetail;
  readonly endpointProfile: RuntimeEndpointProfile | null;
  readonly observeRequestPath: string;
}
export interface RuntimeEndpointProfile {
  readonly endpointId: string;
  readonly latestProfile: Record<string, unknown> | null;
  readonly recentSamples: readonly unknown[];
}

export interface WorkbenchChatInput {
  readonly model: string;
  readonly messages: readonly {
    readonly role: string;
    readonly content: string;
  }[];
  readonly endpointId?: string;
  readonly routingModeOverride?: "baseline" | "difficulty" | "controller" | "hybrid";
}

async function extractErrorMessage(response: Response, path: string): Promise<string> {
  const status = response.status;
  try {
    const body = await response.json();
    const detail =
      typeof body.error === "string"
        ? body.error
        : typeof body.error?.message === "string"
          ? body.error.message
          : JSON.stringify(body);
    return `Request to ${path} failed with ${status}: ${detail}`;
  } catch {
    try {
      const text = await response.text();
      return `Request to ${path} failed with ${status}: ${text || "No details"}`;
    } catch {
      return `Request to ${path} failed with ${status}`;
    }
  }
}

async function fetchJson<TValue>(
  path: string,
  fetcher: RuntimeFetcher,
  init?: RequestInit,
): Promise<TValue> {
  const response = await fetcher(path, init);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response.clone(), path));
  }
  return (await response.json()) as TValue;
}

async function fetchText(
  path: string,
  fetcher: RuntimeFetcher,
  init?: RequestInit,
): Promise<string> {
  const response = await fetcher(path, init);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response.clone(), path));
  }
  return response.text();
}

async function fetchBlob(path: string, fetcher: RuntimeFetcher, init?: RequestInit): Promise<Blob> {
  const response = await fetcher(path, init);
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response.clone(), path));
  }
  return response.blob();
}

async function postJson<TValue>(
  path: string,
  payload: unknown,
  fetcher: RuntimeFetcher,
): Promise<TValue> {
  return fetchJson<TValue>(path, fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

async function putJson<TValue>(
  path: string,
  payload: unknown,
  fetcher: RuntimeFetcher,
): Promise<TValue> {
  return fetchJson<TValue>(path, fetcher, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchRuntimeSnapshot(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeSnapshot> {
  const [summary, providers, accounts, deviceAuthorizations, endpoints, roles, requests, models] =
    await Promise.all([
      fetchJson<RuntimeSummary>("/api/role-model/runtime/summary", fetcher),
      fetchJson<RuntimeProvider[]>("/api/role-model/providers", fetcher),
      fetchJson<RuntimeAccount[]>("/api/role-model/accounts", fetcher),
      fetchJson<RuntimeDeviceAuthorization[]>("/api/role-model/accounts/device", fetcher),
      fetchJson<RuntimeEndpoint[]>("/api/role-model/endpoints", fetcher),
      fetchJson<RuntimeRoleDefinition[]>("/api/role-model/roles", fetcher),
      fetchJson<RuntimeRequestListItem[]>("/api/role-model/requests", fetcher),
      (async () => {
        try {
          return await fetchJson<RuntimeModelRecord[]>("/api/role-model/models", fetcher);
        } catch {
          const modelsResponse = await fetchJson<{ data: RuntimeModelRecord[] }>(
            "/v1/models",
            fetcher,
          );
          return modelsResponse.data;
        }
      })(),
    ]);

  return {
    summary,
    providers,
    accounts,
    deviceAuthorizations,
    endpoints,
    roles,
    requests,
    models,
  };
}

function buildTelemetryQueryString(input?: {
  readonly limit?: number;
  readonly windowMs?: number;
  readonly endAtMs?: number;
}): string {
  const params = new URLSearchParams();
  if (typeof input?.limit === "number") {
    params.set("limit", String(input.limit));
  }
  if (typeof input?.windowMs === "number") {
    params.set("windowMs", String(input.windowMs));
  }
  if (typeof input?.endAtMs === "number") {
    params.set("endAtMs", String(input.endAtMs));
  }
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

export async function fetchTelemetryDashboard(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeTelemetryDashboard> {
  const [summary, rows, requests] = await Promise.all([
    fetchJson<RuntimeTelemetrySummary>("/api/role-model/telemetry/summary", fetcher),
    fetchJson<RuntimeTelemetryComparisonRow[]>("/api/role-model/telemetry/rows", fetcher),
    fetchJson<RuntimeTelemetryRequestRecord[]>("/api/role-model/telemetry/requests", fetcher),
  ]);

  return {
    summary,
    rows,
    requests,
  };
}

export async function fetchTelemetryRequests(
  input: {
    readonly limit?: number;
    readonly windowMs?: number;
    readonly endAtMs?: number;
  } = {},
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeTelemetryRequestRecord[]> {
  return fetchJson<RuntimeTelemetryRequestRecord[]>(
    `/api/role-model/telemetry/requests${buildTelemetryQueryString(input)}`,
    fetcher,
  );
}

export function subscribeTelemetryStream(
  onEvent: (event: RuntimeTelemetryStreamEvent) => void,
  createSource: RuntimeEventSourceFactory = (url) => new EventSource(url),
): () => void {
  const source = createSource("/api/role-model/telemetry/stream");
  source.addEventListener("telemetry.update", (event) => {
    onEvent(JSON.parse(event.data) as RuntimeTelemetryStreamEvent);
  });
  return () => {
    source.close();
  };
}

export async function fetchDownstreamOpenAIProviderConfig(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeDownstreamOpenAIProviderConfig> {
  return fetchJson<RuntimeDownstreamOpenAIProviderConfig>(
    "/api/role-model/downstream/openai",
    fetcher,
  );
}

export async function fetchControllerAssignment(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeControllerAssignment | null> {
  return fetchJson<RuntimeControllerAssignment | null>("/api/role-model/controller", fetcher);
}

export async function fetchRuntimeConfig(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeConfigRecord> {
  return fetchJson<RuntimeConfigRecord>("/api/role-model/runtime/config", fetcher);
}

export async function updateRuntimeConfig(
  payload: RuntimeConfig,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeConfigRecord> {
  return putJson<RuntimeConfigRecord>("/api/role-model/runtime/config", payload, fetcher);
}

export async function updateControllerAssignment(
  payload: {
    readonly endpointId: string;
  },
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeControllerAssignment> {
  return fetchJson<RuntimeControllerAssignment>("/api/role-model/controller", fetcher, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function fetchRequestDetail(
  requestId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{
  request: RuntimeRequestDetail;
  endpointProfile: RuntimeEndpointProfile | null;
}> {
  const request = await fetchJson<RuntimeRequestDetail>(
    `/api/role-model/requests/${requestId}`,
    fetcher,
  );

  const endpointProfile =
    typeof request.endpointId === "string" && request.endpointId.length > 0
      ? await fetchJson<RuntimeEndpointProfile>(
          `/api/role-model/endpoints/${encodeURIComponent(request.endpointId)}/profile`,
          fetcher,
        )
      : null;

  return {
    request,
    endpointProfile,
  };
}

export async function fetchRouterSummary(fetcher: RuntimeFetcher = fetch): Promise<RouterSummary> {
  return fetchJson<RouterSummary>("/api/role-model/router/summary", fetcher);
}

export async function fetchRouterConfig(fetcher: RuntimeFetcher = fetch): Promise<RouterConfig> {
  return fetchJson<RouterConfig>("/api/role-model/router/config", fetcher);
}

export async function fetchRouterCandidates(
  fetcher: RuntimeFetcher = fetch,
): Promise<RouterCandidate[]> {
  return fetchJson<RouterCandidate[]>("/api/role-model/router/candidates", fetcher);
}

export async function fetchRouterDecisions(
  fetcher: RuntimeFetcher = fetch,
): Promise<RouterDecisionListItem[]> {
  return fetchJson<RouterDecisionListItem[]>("/api/role-model/router/decisions", fetcher);
}

export async function fetchRouterDecisionDetail(
  requestId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<RouterDecisionDetail> {
  return fetchJson<RouterDecisionDetail>(
    `/api/role-model/router/decisions/${encodeURIComponent(requestId)}`,
    fetcher,
  );
}
export async function fetchActivityMetrics(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeActivityLogEntry[]> {
  return fetchJson<RuntimeActivityLogEntry[]>("/api/metrics", fetcher);
}

export async function fetchActivityCapture(
  id: number,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeActivityCapture | null> {
  const response = await fetcher(`/api/captures/${id}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response.clone(), `/api/captures/${id}`));
  }
  return (await response.json()) as RuntimeActivityCapture;
}

export async function fetchTextLogs(
  path: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<string> {
  return fetchText(path, fetcher);
}

export async function fetchVersionInfo(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeVersionInfo> {
  return fetchJson<RuntimeVersionInfo>("/api/version", fetcher);
}

export async function upsertRuntimeAccount(
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeAccount> {
  return fetchJson<RuntimeAccount>("/api/role-model/accounts", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function startRuntimeDeviceAuthorization(
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeDeviceAuthorization> {
  return fetchJson<RuntimeDeviceAuthorization>("/api/role-model/accounts/device/start", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function pollRuntimeDeviceAuthorization(
  authRequestId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeDeviceAuthorization> {
  return fetchJson<RuntimeDeviceAuthorization>("/api/role-model/accounts/device/poll", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ authRequestId }),
  });
}

export async function activateRuntimeEndpoint(
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeEndpoint> {
  return fetchJson<RuntimeEndpoint>("/api/role-model/endpoints", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function submitWorkbenchChat(
  payload: WorkbenchChatInput,
  fetcher: RuntimeFetcher = fetch,
): Promise<Record<string, unknown>> {
  const { routingModeOverride, endpointId, ...body } = payload;
  return fetchJson<Record<string, unknown>>("/v1/chat/completions", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(endpointId ? { "x-role-model-endpoint-id": endpointId } : {}),
      ...(routingModeOverride ? { "x-role-model-routing-mode": routingModeOverride } : {}),
    },
    body: JSON.stringify(body),
  });
}

export async function submitImageGeneration(
  payload: RuntimeImageGenerationRequest,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeImageGenerationResponse> {
  return postJson<RuntimeImageGenerationResponse>("/v1/images/generations", payload, fetcher);
}

export async function submitSdApiTxt2Img(
  payload: RuntimeSdApiTxt2ImgRequest,
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeSdApiResponse> {
  return postJson<RuntimeSdApiResponse>("/sdapi/v1/txt2img", payload, fetcher);
}

export async function fetchAudioVoices(
  model: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeAudioVoiceRecord[]> {
  return fetchJson<readonly RuntimeAudioVoiceRecord[]>(
    `/v1/audio/voices?model=${encodeURIComponent(model)}`,
    fetcher,
  );
}

export async function submitSpeechGeneration(
  payload: RuntimeSpeechGenerationRequest,
  fetcher: RuntimeFetcher = fetch,
): Promise<Blob> {
  return fetchBlob("/v1/audio/speech", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function submitAudioTranscription(
  payload: {
    readonly file: File;
    readonly model: string;
  },
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeAudioTranscriptionResponse> {
  const formData = new FormData();
  formData.set("file", payload.file);
  formData.set("model", payload.model);
  return fetchJson<RuntimeAudioTranscriptionResponse>("/v1/audio/transcriptions", fetcher, {
    method: "POST",
    body: formData,
  });
}

export async function submitRerankRequest(
  payload: RuntimeRerankRequest,
  path: "/v1/rerank" | "/v1/reranking" = "/v1/rerank",
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeRerankResponse> {
  return postJson<RuntimeRerankResponse>(path, payload, fetcher);
}

export async function submitAdvancedRequest(
  path:
    | "/v1/responses"
    | "/v1/messages"
    | "/v1/messages/count_tokens"
    | "/v1/embeddings"
    | "/completion"
    | "/infill",
  payload: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<Record<string, unknown>> {
  return postJson<Record<string, unknown>>(path, payload, fetcher);
}

// ─── Local Runtime APIs ──────────────────────────────────────────────

export async function fetchLocalModels(
  fetcher: RuntimeFetcher = fetch,
): Promise<readonly RuntimeLocalModel[]> {
  return fetchJson<readonly RuntimeLocalModel[]>("/api/role-model/local/models", fetcher);
}

export async function loadLocalModel(
  modelId: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{ success: boolean }> {
  return postJson<{ success: boolean }>(
    `/api/role-model/local/models/${encodeURIComponent(modelId)}/load`,
    {},
    fetcher,
  );
}

export async function unloadLocalModel(
  modelId?: string,
  fetcher: RuntimeFetcher = fetch,
): Promise<{ success: boolean }> {
  if (modelId) {
    return postJson<{ success: boolean }>(
      `/api/role-model/local/models/${encodeURIComponent(modelId)}/unload`,
      {},
      fetcher,
    );
  }
  return postJson<{ success: boolean }>("/api/role-model/local/models/unload", {}, fetcher);
}

export async function fetchLocalPolicy(
  fetcher: RuntimeFetcher = fetch,
): Promise<Record<string, unknown>> {
  return fetchJson<Record<string, unknown>>("/api/role-model/local/policy", fetcher);
}

export async function updateLocalPolicy(
  body: Record<string, unknown>,
  fetcher: RuntimeFetcher = fetch,
): Promise<Record<string, unknown>> {
  return putJson<Record<string, unknown>>("/api/role-model/local/policy", body, fetcher);
}

export async function fetchSwapHistory(
  fetcher: RuntimeFetcher = fetch,
): Promise<
  readonly { timestamp: string; oldModel: string | null; newModel: string; reason: string }[]
> {
  return fetchJson<
    readonly { timestamp: string; oldModel: string | null; newModel: string; reason: string }[]
  >("/api/role-model/local/swap", fetcher);
}

export async function fetchLocalLogs(fetcher: RuntimeFetcher = fetch): Promise<{ logs: string }> {
  return fetchJson<{ logs: string }>("/api/role-model/local/logs", fetcher);
}

export interface ModelOverride {
  ttl?: number;
  contextWindow?: number;
  concurrencyLimit?: number;
}

export async function fetchModelOverrides(
  fetcher: typeof fetch = fetch,
): Promise<Record<string, ModelOverride>> {
  return fetchJson<Record<string, ModelOverride>>("/api/role-model/local/overrides", fetcher);
}

export async function updateModelOverrides(
  body: Record<string, ModelOverride>,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, ModelOverride>> {
  return putJson<Record<string, ModelOverride>>("/api/role-model/local/overrides", body, fetcher);
}

export interface PeerConfig {
  id: string;
  url: string;
  authToken?: string;
}

export async function fetchPeers(fetcher: typeof fetch = fetch): Promise<readonly PeerConfig[]> {
  return fetchJson<readonly PeerConfig[]>("/api/role-model/local/peers", fetcher);
}

export async function updatePeers(
  body: readonly PeerConfig[],
  fetcher: typeof fetch = fetch,
): Promise<readonly PeerConfig[]> {
  return putJson<readonly PeerConfig[]>(
    "/api/role-model/local/peers",
    body as unknown as Record<string, unknown>,
    fetcher,
  );
}

export async function checkPeerHealth(
  url: string,
  fetcher: typeof fetch = fetch,
): Promise<{ healthy: boolean }> {
  return fetchJson<{ healthy: boolean }>(
    `/api/role-model/local/peers/health?url=${encodeURIComponent(url)}`,
    fetcher,
  );
}
