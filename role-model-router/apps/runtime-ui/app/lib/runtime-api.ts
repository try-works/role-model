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
  return fetchJson<Record<string, unknown>>("/v1/chat/completions", fetcher, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
