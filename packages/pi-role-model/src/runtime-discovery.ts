import {
  type RoleModelPackageConfig,
  assessEndpointTrust,
  createRoleModelConfig,
} from "./config.js";
import {
  CONSERVATIVE_CONTEXT_WINDOW,
  CONSERVATIVE_MAX_TOKENS,
  validateDownstreamOpenAIDiscovery,
} from "./downstream-openai.js";
import type {
  DiscoveryResult,
  DownstreamOpenAIDiscovery,
  DownstreamOpenAIModelRecord,
} from "./types.js";

export type RoleModelDiscoveryFailureState =
  | "unavailable"
  | "timeout"
  | "malformed"
  | "incompatible"
  | "blocked-remote"
  | "auth-required";

export class RoleModelDiscoveryError extends Error {
  readonly state: RoleModelDiscoveryFailureState;
  readonly endpoint: string;
  readonly remediation: string;

  constructor(input: {
    state: RoleModelDiscoveryFailureState;
    endpoint: string;
    message: string;
    remediation: string;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = "RoleModelDiscoveryError";
    this.state = input.state;
    this.endpoint = input.endpoint;
    this.remediation = input.remediation;
    this.cause = input.cause;
  }
}

class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
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
      throw new HttpStatusError(response.status, `Request failed with HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new RoleModelDiscoveryError({
        state: "timeout",
        endpoint: url,
        message: `Timed out while reading Role-Model endpoint ${url}.`,
        remediation: "Confirm the external Role-Model runtime is running and responsive.",
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createFallbackModelRecord(
  record: Record<string, unknown>,
): DownstreamOpenAIModelRecord | undefined {
  if (
    typeof record.id !== "string" ||
    record.object !== "model" ||
    record.owned_by !== "role-model"
  ) {
    return undefined;
  }
  const roleModel = isObject(record.role_model) ? record.role_model : {};
  const contextWindow =
    typeof record.context_window === "number"
      ? record.context_window
      : typeof roleModel.context_window === "number"
        ? roleModel.context_window
        : null;
  const maxTokens =
    typeof record.max_tokens === "number"
      ? record.max_tokens
      : typeof roleModel.max_tokens === "number"
        ? roleModel.max_tokens
        : null;
  const input = Array.isArray(record.input)
    ? record.input.filter((item): item is string => typeof item === "string")
    : ["text"];
  const endpointIds = Array.isArray(record.endpoint_ids)
    ? record.endpoint_ids.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id: record.id,
    object: "model",
    owned_by: "role-model",
    endpoint_ids: endpointIds,
    type: roleModel.type === "model" ? "model" : "alias",
    targetModelIds: [record.id],
    canonicalModelIds: [record.id],
    providerIds: ["role-model"],
    limits: {
      safeContextWindow: contextWindow,
      safeMaxOutputTokens: maxTokens,
      maxContextWindow: contextWindow,
      maxOutputTokens: maxTokens,
    },
    modalities: {
      guaranteedInput: ["text"],
      availableInput: input,
      conditionalInput: {},
      output: ["text"],
    },
    capabilities: {
      guaranteed: ["text.chat"],
      available: ["text.chat"],
      conditional: {},
      tools: { functionCalling: false },
      reasoning: { supported: false, effortControl: false },
      structuredOutput: { supported: false },
      caching: { promptRead: null, promptWrite: null, source: "unknown" },
    },
    declared: { modelIds: [record.id], endpointIds },
    routable: { modelIds: [record.id], endpointIds },
    piMapping: {
      contextWindow: contextWindow ?? CONSERVATIVE_CONTEXT_WINDOW,
      maxTokens: maxTokens ?? CONSERVATIVE_MAX_TOKENS,
    },
    sources: ["compact-models-fallback"],
  };
}

function createDiscoveryFromCompactModels(
  baseUrl: string,
  payload: unknown,
): DownstreamOpenAIDiscovery {
  if (!isObject(payload) || !Array.isArray(payload.data)) {
    throw new Error("Role-Model compact /v1/models response is invalid.");
  }
  const models = payload.data
    .map((record) => (isObject(record) ? createFallbackModelRecord(record) : undefined))
    .filter((record): record is DownstreamOpenAIModelRecord => Boolean(record));
  if (models.length === 0) {
    throw new Error("Role-Model compact /v1/models response did not include usable models.");
  }
  const recommendedModel =
    models.find((model) => model.type === "alias")?.id ?? models[0]?.id ?? null;
  return {
    contractVersion: "role-model.downstream.openai.v1",
    kind: "openai-compatible",
    providerId: "role-model-runtime",
    displayName: "Role-Model Runtime",
    baseUrl,
    endpoints: {
      health: `${baseUrl}/healthz`,
      models: `${baseUrl}/v1/models`,
      chatCompletions: `${baseUrl}/v1/chat/completions`,
      responses: `${baseUrl}/v1/responses`,
    },
    authentication: {
      type: "bearer",
      headerName: "Authorization",
      required: false,
      placeholderToken: "role-model-local",
      note: "Fallback compact /v1/models discovery uses the local Role-Model placeholder token.",
    },
    models: models as [DownstreamOpenAIModelRecord, ...DownstreamOpenAIModelRecord[]],
    setup: {
      recommendedModel,
      notes: [
        "Using compact /v1/models fallback because rich downstream discovery was unavailable.",
      ],
    },
    freshness: { generatedAt: new Date().toISOString(), catalogVersion: "compact-fallback" },
  };
}

function toDiscoveryError(endpoint: string, error: unknown): RoleModelDiscoveryError {
  if (error instanceof RoleModelDiscoveryError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (/auth is required/i.test(message)) {
    return new RoleModelDiscoveryError({
      state: "auth-required",
      endpoint,
      message,
      remediation:
        "Use a Role-Model runtime that does not require inbound auth, or add an explicit supported token source.",
      cause: error,
    });
  }
  return new RoleModelDiscoveryError({
    state: "incompatible",
    endpoint,
    message: "Role-Model downstream OpenAI discovery response is incompatible.",
    remediation:
      "Upgrade Role-Model or verify /api/role-model/downstream/openai returns the current downstream OpenAI discovery contract.",
    cause: error,
  });
}

export async function discoverRoleModelRuntime(
  input: Partial<RoleModelPackageConfig> = {},
): Promise<DiscoveryResult> {
  const config = createRoleModelConfig(input);
  const trust = assessEndpointTrust(config.endpoint, {
    allowRemote: config.allowRemote,
    isProjectTrusted: config.isProjectTrusted,
  });
  if (!trust.allowed) {
    throw new RoleModelDiscoveryError({
      state: "blocked-remote",
      endpoint: config.endpoint,
      message: trust.message,
      remediation:
        "Set allowRemote only for a trusted Role-Model endpoint and run from a trusted Pi project.",
    });
  }

  const fetchImpl = config.fetch ?? fetch;
  const healthUrl = `${config.endpoint}/healthz`;
  const versionUrl = `${config.endpoint}/api/version`;
  const discoveryUrl = `${config.endpoint}/api/role-model/downstream/openai`;

  let health: Record<string, unknown> | undefined;
  let version: Record<string, unknown> | undefined;
  try {
    const healthPayload = await fetchJson(healthUrl, config.requestTimeoutMs, fetchImpl);
    health = isObject(healthPayload) ? healthPayload : undefined;
    const versionPayload = await fetchJson(versionUrl, config.requestTimeoutMs, fetchImpl).catch(
      () => undefined,
    );
    version = isObject(versionPayload) ? versionPayload : undefined;
  } catch (error) {
    if (error instanceof RoleModelDiscoveryError) throw error;
    throw new RoleModelDiscoveryError({
      state: "unavailable",
      endpoint: config.endpoint,
      message: `Role-Model runtime unavailable: ${error instanceof Error ? error.message : String(error)}`,
      remediation: "Start the external Role-Model runtime and confirm /healthz responds.",
      cause: error,
    });
  }

  try {
    const discoveryPayload = await fetchJson(discoveryUrl, config.requestTimeoutMs, fetchImpl);
    return {
      discovery: validateDownstreamOpenAIDiscovery(discoveryPayload),
      version,
      health,
      state: "ready",
      warnings: [],
      providerRegistered: true,
      modelDiagnostics: [],
    };
  } catch (error) {
    if (!(error instanceof HttpStatusError) || error.status !== 404) {
      throw toDiscoveryError(discoveryUrl, error);
    }
  }

  try {
    const compactPayload = await fetchJson(
      `${config.endpoint}/v1/models`,
      config.requestTimeoutMs,
      fetchImpl,
    );
    const discovery = createDiscoveryFromCompactModels(config.endpoint, compactPayload);
    return {
      discovery,
      version,
      health,
      state: "fallback",
      warnings: [
        "Using compact /v1/models fallback because rich downstream discovery was unavailable.",
      ],
      providerRegistered: true,
      modelDiagnostics: discovery.models.map((model) => ({
        id: model.id,
        degraded: true,
        reasons: ["compact /v1/models fallback"],
      })),
    };
  } catch (error) {
    throw new RoleModelDiscoveryError({
      state: "unavailable",
      endpoint: config.endpoint,
      message: `Role-Model fallback discovery unavailable: ${error instanceof Error ? error.message : String(error)}`,
      remediation:
        "Confirm /api/role-model/downstream/openai or /v1/models is exposed by the external Role-Model runtime.",
      cause: error,
    });
  }
}
