export type RuntimeFetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export interface RuntimeSummary {
  readonly providerCount: number;
  readonly accountCount: number;
  readonly endpointCount: number;
  readonly lifecycleSummary?: {
    readonly active: number;
    readonly degraded: number;
    readonly offline: number;
  };
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
    readonly oauthHost: string;
    readonly clientId: string;
    readonly deviceAuthorizationEndpoint: string;
    readonly tokenEndpoint: string;
    readonly requiredHeaders: readonly string[];
  };
}

export interface RuntimeProvider {
  readonly providerId: string;
  readonly displayName: string;
  readonly providerKind?: string;
  readonly authFamily?: string;
  readonly adapterFamily?: string;
  readonly apiBase?: string;
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

export interface RuntimeRoleDefinition {
  readonly roleId: string;
  readonly label: string;
  readonly description?: string;
  readonly taskTypes?: readonly string[];
}

export interface RuntimeDeviceAuthorization {
  readonly authRequestId: string;
  readonly providerAccountId: string;
  readonly status: string;
  readonly userCode?: string;
  readonly verificationUri?: string;
  readonly verificationUriComplete?: string;
  readonly intervalSeconds?: number;
  readonly expiresAtMs?: number;
}

export interface RuntimeRequestListItem {
  readonly requestId: string;
  readonly endpointId?: string;
  readonly createdAtMs?: number;
}

export interface RuntimeModelRecord {
  readonly id: string;
  readonly object?: string;
  readonly owned_by?: string;
  readonly endpoint_ids?: readonly string[];
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
}

async function fetchJson<TValue>(
  path: string,
  fetcher: RuntimeFetcher,
  init?: RequestInit,
): Promise<TValue> {
  const response = await fetcher(path, init);
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with ${response.status}`);
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
    throw new Error(`Request to ${path} failed with ${response.status}`);
  }
  return response.text();
}

async function fetchBlob(
  path: string,
  fetcher: RuntimeFetcher,
  init?: RequestInit,
): Promise<Blob> {
  const response = await fetcher(path, init);
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with ${response.status}`);
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

export async function fetchRuntimeSnapshot(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeSnapshot> {
  const [summary, providers, accounts, endpoints, roles, requests, modelsResponse] = await Promise.all([
    fetchJson<RuntimeSummary>("/api/role-model/runtime/summary", fetcher),
    fetchJson<RuntimeProvider[]>("/api/role-model/providers", fetcher),
    fetchJson<RuntimeAccount[]>("/api/role-model/accounts", fetcher),
    fetchJson<RuntimeEndpoint[]>("/api/role-model/endpoints", fetcher),
    fetchJson<RuntimeRoleDefinition[]>("/api/role-model/roles", fetcher),
    fetchJson<RuntimeRequestListItem[]>("/api/role-model/requests", fetcher),
    fetchJson<{ data: RuntimeModelRecord[] }>("/v1/models", fetcher),
  ]);

  return {
    summary,
    providers,
    accounts,
    endpoints,
    roles,
    requests,
    models: modelsResponse.data,
  };
}

export async function fetchDownstreamOpenAIProviderConfig(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeDownstreamOpenAIProviderConfig> {
  return fetchJson<RuntimeDownstreamOpenAIProviderConfig>("/api/role-model/downstream/openai", fetcher);
}

export async function fetchControllerAssignment(
  fetcher: RuntimeFetcher = fetch,
): Promise<RuntimeControllerAssignment> {
  return fetchJson<RuntimeControllerAssignment>("/api/role-model/controller", fetcher);
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
  const request = await fetchJson<RuntimeRequestDetail>(`/api/role-model/requests/${requestId}`, fetcher);

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
    throw new Error(`Request to /api/captures/${id} failed with ${response.status}`);
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
  return postJson<Record<string, unknown>>("/v1/chat/completions", payload, fetcher);
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
