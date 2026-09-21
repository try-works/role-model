import { createHash } from "node:crypto";

import { resolveOpenAIProviderUpstreamModelId } from "@role-model-router/provider-openai";

export type RemoteHealthProbeReason =
  | "healthy"
  | "auth"
  | "timeout"
  | "model-not-found"
  | "vendor-down"
  | "credentials-missing";

export interface RemoteHealthProbeTarget {
  readonly endpointId: string;
  readonly providerAccountId: string;
  readonly modelId: string;
  readonly apiBase: string;
  readonly servingSource: string;
}

export interface RemoteHealthProbeResult {
  readonly endpointId: string;
  readonly modelId: string;
  readonly healthStatus: string;
  readonly reason: RemoteHealthProbeReason;
  readonly latencyMs?: number;
  readonly message?: string;
}

export interface RemoteHealthProbeContext {
  readonly litellmHealthy: boolean;
  readonly targets: readonly RemoteHealthProbeTarget[];
  readonly resolveAuthorization: (providerAccountId: string) => Promise<string | null>;
  readonly refreshAuthorization?: (providerAccountId: string) => Promise<string | null>;
  readonly resolveProbeHeaders?: (
    providerAccountId: string,
  ) => Promise<Readonly<Record<string, string>>>;
  readonly networkFetcher: typeof fetch;
  readonly probeTimeoutMs?: number;
  readonly probeAttempts?: number;
  readonly probeRetryDelayMs?: number;
}

/**
 * A bounded, instance-specific admission check.  Unlike the bootstrap
 * `/models` inventory probe, this exercises the exact model/effort payload
 * that will be used for routed chat-completions traffic.
 */
export interface RemoteEndpointAdmissionProbeContext {
  readonly endpointId: string;
  readonly providerAccountId: string;
  readonly modelId: string;
  readonly reasoningEffort: string | null;
  readonly apiBase: string;
  readonly servingSource: string;
  readonly litellmHealthy?: boolean;
  readonly resolveAuthorization: (providerAccountId: string) => Promise<string | null>;
  readonly refreshAuthorization?: (providerAccountId: string) => Promise<string | null>;
  readonly resolveProbeHeaders?: (
    providerAccountId: string,
  ) => Promise<Readonly<Record<string, string>>>;
  readonly networkFetcher: typeof fetch;
  readonly probeTimeoutMs?: number;
  readonly probeAttempts?: number;
  readonly probeRetryDelayMs?: number;
}

export const DEFAULT_REMOTE_PROBE_TIMEOUT_MS = 15_000;
export const DEFAULT_REMOTE_PROBE_ATTEMPTS = 3;
export const DEFAULT_REMOTE_PROBE_RETRY_DELAY_MS = 1_000;

const TRANSIENT_TRANSPORT_CODES: ReadonlySet<string> = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_CONNECT_ERROR",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EAI_AGAIN",
]);

/**
 * Transport-level failures say nothing about the provider: a stalled TCP or TLS
 * handshake raises `TypeError: fetch failed` with the real code on `cause`
 * (`UND_ERR_CONNECT_TIMEOUT`, `ECONNRESET`, ...). Those are retryable and must
 * not be reported as a vendor outage.
 */
export function isTransientTransportError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && current !== null && current !== undefined; depth += 1) {
    const record = current as {
      readonly code?: unknown;
      readonly message?: unknown;
      readonly cause?: unknown;
    };
    const code = typeof record.code === "string" ? record.code : "";
    if (TRANSIENT_TRANSPORT_CODES.has(code)) {
      return true;
    }
    const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
    if (
      message.includes("socket hang up") ||
      message.includes("econnreset") ||
      message.includes("connect timeout")
    ) {
      return true;
    }
    current = record.cause;
  }
  return false;
}

async function executeWithTransientRetry<Result>(
  execute: () => Promise<Result>,
  attempts: number,
  retryDelayMs: number,
): Promise<Result> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await execute();
    } catch (error) {
      if (attempt >= attempts || !isTransientTransportError(error)) {
        throw error;
      }
      if (retryDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt));
      }
    }
  }
}

function resolveProbeAttempts(configured: number | undefined): number {
  return Number.isSafeInteger(configured) && (configured ?? 0) >= 1
    ? (configured as number)
    : DEFAULT_REMOTE_PROBE_ATTEMPTS;
}

function resolveProbeRetryDelayMs(configured: number | undefined): number {
  return Number.isSafeInteger(configured) && (configured ?? -1) >= 0
    ? (configured as number)
    : DEFAULT_REMOTE_PROBE_RETRY_DELAY_MS;
}

const COMPARABLE_MODEL_ID_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "moonshot/kimi-k2.7-code": ["kimi-for-coding"],
  "kimi-k2.7-code": ["kimi-for-coding"],
  "kimi-for-coding": ["moonshot/kimi-k2.7-code", "kimi-k2.7-code"],
  "moonshot/kimi-k3": ["kimi-k3", "k3"],
  "kimi-k3": ["moonshot/kimi-k3", "k3"],
  k3: ["moonshot/kimi-k3", "kimi-k3"],
};

export interface RemoteHealthProbeSummary {
  readonly results: readonly RemoteHealthProbeResult[];
  readonly probed: number;
  readonly healthy: number;
  readonly degraded: number;
}

export function mapProbeReasonToHealthStatus(reason: RemoteHealthProbeReason): string {
  switch (reason) {
    case "healthy":
      return "healthy";
    case "vendor-down":
      return "provider-unavailable";
    case "timeout":
      return "offline";
    case "auth":
    case "model-not-found":
    case "credentials-missing":
      return "degraded";
    default:
      return "degraded";
  }
}

export function extractOpenAIModelIds(payload: unknown): readonly string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const id = (entry as { id?: unknown }).id;
      return typeof id === "string" ? id : null;
    })
    .filter((entry): entry is string => entry !== null);
}

function buildComparableModelIds(modelId: string): readonly string[] {
  const comparable = new Set<string>();
  const trimmed = modelId.trim();
  if (trimmed.length === 0) {
    return [];
  }
  comparable.add(trimmed);
  if (trimmed.includes("/")) {
    comparable.add(trimmed.split("/").slice(1).join("/"));
  }
  for (const alias of COMPARABLE_MODEL_ID_ALIASES[trimmed] ?? []) {
    comparable.add(alias);
  }
  return [...comparable];
}

export function buildModelsProbeUrl(apiBase: string): string {
  const trimmed = apiBase.trim().replace(/\/+$/u, "");
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/models`;
  }
  return `${trimmed}/v1/models`;
}

export function buildChatCompletionsProbeUrl(apiBase: string): string {
  const trimmed = apiBase.trim().replace(/\/+$/u, "");
  return trimmed.endsWith("/v1") ? `${trimmed}/chat/completions` : `${trimmed}/v1/chat/completions`;
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      error.message.toLowerCase().includes("timeout"))
  );
}

async function probeTarget(
  target: RemoteHealthProbeTarget,
  context: RemoteHealthProbeContext,
): Promise<RemoteHealthProbeResult> {
  if (target.servingSource === "vendor-litellm" && !context.litellmHealthy) {
    return {
      endpointId: target.endpointId,
      modelId: target.modelId,
      reason: "vendor-down",
      healthStatus: mapProbeReasonToHealthStatus("vendor-down"),
      message: "LiteLLM vendor is not healthy.",
    };
  }

  const authorization = await context.resolveAuthorization(target.providerAccountId);
  if (!authorization) {
    return {
      endpointId: target.endpointId,
      modelId: target.modelId,
      reason: "credentials-missing",
      healthStatus: mapProbeReasonToHealthStatus("credentials-missing"),
      message: "No authorization credential is available for remote probe.",
    };
  }

  const startedAt = Date.now();
  const probeUrl = buildModelsProbeUrl(target.apiBase);
  try {
    const probeHeaders = context.resolveProbeHeaders
      ? await context.resolveProbeHeaders(target.providerAccountId)
      : {};
    const executeProbe = async (
      resolvedAuthorization: string,
    ): Promise<{ readonly response: Response; readonly latencyMs: number }> => {
      const probeStartedAt = Date.now();
      const response = await context.networkFetcher(probeUrl, {
        method: "GET",
        headers: {
          ...probeHeaders,
          accept: "application/json",
          authorization: resolvedAuthorization.startsWith("Bearer ")
            ? resolvedAuthorization
            : `Bearer ${resolvedAuthorization}`,
        },
        signal: AbortSignal.timeout(context.probeTimeoutMs ?? DEFAULT_REMOTE_PROBE_TIMEOUT_MS),
      });
      return {
        response,
        latencyMs: Date.now() - probeStartedAt,
      };
    };

    let { response, latencyMs } = await executeWithTransientRetry(
      () => executeProbe(authorization),
      resolveProbeAttempts(context.probeAttempts),
      resolveProbeRetryDelayMs(context.probeRetryDelayMs),
    );
    if ((response.status === 401 || response.status === 403) && context.refreshAuthorization) {
      try {
        const refreshedAuthorization = await context.refreshAuthorization(target.providerAccountId);
        if (refreshedAuthorization && refreshedAuthorization.trim().length > 0) {
          ({ response, latencyMs } = await executeWithTransientRetry(
            () => executeProbe(refreshedAuthorization),
            resolveProbeAttempts(context.probeAttempts),
            resolveProbeRetryDelayMs(context.probeRetryDelayMs),
          ));
        }
      } catch {
        // Preserve the original auth failure classification if refresh also fails.
      }
    }

    if (response.status === 401 || response.status === 403) {
      return {
        endpointId: target.endpointId,
        modelId: target.modelId,
        reason: "auth",
        healthStatus: mapProbeReasonToHealthStatus("auth"),
        latencyMs,
        message: `Remote probe returned HTTP ${response.status}.`,
      };
    }

    if (response.status >= 500) {
      return {
        endpointId: target.endpointId,
        modelId: target.modelId,
        reason: "vendor-down",
        healthStatus: mapProbeReasonToHealthStatus("vendor-down"),
        latencyMs,
        message: `Remote probe returned HTTP ${response.status}.`,
      };
    }

    if (!response.ok) {
      return {
        endpointId: target.endpointId,
        modelId: target.modelId,
        reason: "vendor-down",
        healthStatus: mapProbeReasonToHealthStatus("vendor-down"),
        latencyMs,
        message: `Remote probe returned HTTP ${response.status}.`,
      };
    }

    const payload = (await response.json()) as unknown;
    const modelIds = extractOpenAIModelIds(payload);
    // The provider advertises its own model id, which can differ from the
    // catalog's canonical id when a provider renames a first-party model. The
    // probe must compare and report the id the provider actually serves.
    const upstreamModelId = resolveOpenAIProviderUpstreamModelId(target.modelId);
    const targetComparableIds = new Set(buildComparableModelIds(upstreamModelId));
    const matchesTargetModel = modelIds.some((modelId) =>
      buildComparableModelIds(modelId).some((candidate) => targetComparableIds.has(candidate)),
    );
    if (!matchesTargetModel) {
      return {
        endpointId: target.endpointId,
        modelId: target.modelId,
        reason: "model-not-found",
        healthStatus: mapProbeReasonToHealthStatus("model-not-found"),
        latencyMs,
        message: `Model ${upstreamModelId} was not listed by ${probeUrl}.`,
      };
    }

    return {
      endpointId: target.endpointId,
      modelId: target.modelId,
      reason: "healthy",
      healthStatus: mapProbeReasonToHealthStatus("healthy"),
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    if (isTimeoutError(error) || isTransientTransportError(error)) {
      return {
        endpointId: target.endpointId,
        modelId: target.modelId,
        reason: "timeout",
        healthStatus: mapProbeReasonToHealthStatus("timeout"),
        latencyMs,
        message: error instanceof Error ? error.message : "Remote probe timed out.",
      };
    }

    return {
      endpointId: target.endpointId,
      modelId: target.modelId,
      reason: "vendor-down",
      healthStatus: mapProbeReasonToHealthStatus("vendor-down"),
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Remote probe failed.",
    };
  }
}

export async function probeRemoteEndpoints(
  context: RemoteHealthProbeContext,
): Promise<RemoteHealthProbeSummary> {
  const modelListRequests = new Map<string, Promise<Response>>();
  const sharedNetworkFetcher: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    const authorizationSha256 = createHash("sha256")
      .update(headers.get("authorization") ?? "")
      .digest("hex");
    headers.delete("authorization");
    const requestKey = JSON.stringify([
      method,
      url,
      authorizationSha256,
      [...headers.entries()].sort(([left], [right]) => left.localeCompare(right)),
    ]);

    let responsePromise = modelListRequests.get(requestKey);
    if (!responsePromise) {
      responsePromise = context.networkFetcher(input, init).then(
        (response) => response,
        (error: unknown) => {
          // A failed probe must not be cached: transient transport failures are
          // retried, and a cached rejection would replay the failure instead of
          // reconnecting.
          modelListRequests.delete(requestKey);
          throw error;
        },
      );
      modelListRequests.set(requestKey, responsePromise);
    }
    return (await responsePromise).clone();
  };

  const results: RemoteHealthProbeResult[] = [];
  for (const target of context.targets) {
    results.push(
      await probeTarget(target, {
        ...context,
        networkFetcher: sharedNetworkFetcher,
      }),
    );
  }

  const healthy = results.filter((result) => result.reason === "healthy").length;
  const degraded = results.length - healthy;

  return {
    results,
    probed: results.length,
    healthy,
    degraded,
  };
}

export async function probeRemoteEndpointAdmission(
  context: RemoteEndpointAdmissionProbeContext,
): Promise<RemoteHealthProbeResult> {
  if (context.servingSource === "vendor-litellm" && context.litellmHealthy === false) {
    return {
      endpointId: context.endpointId,
      modelId: context.modelId,
      reason: "vendor-down",
      healthStatus: mapProbeReasonToHealthStatus("vendor-down"),
      message: "LiteLLM vendor is not healthy.",
    };
  }

  const authorization = await context.resolveAuthorization(context.providerAccountId);
  if (!authorization) {
    return {
      endpointId: context.endpointId,
      modelId: context.modelId,
      reason: "credentials-missing",
      healthStatus: mapProbeReasonToHealthStatus("credentials-missing"),
      message: "No authorization credential is available for remote admission probe.",
    };
  }

  const probeUrl = buildChatCompletionsProbeUrl(context.apiBase);
  const body = {
    model: resolveOpenAIProviderUpstreamModelId(context.modelId),
    messages: [{ role: "user", content: "role-model admission readiness probe" }],
    max_tokens: 1,
    stream: false,
    ...(context.reasoningEffort === null ? {} : { reasoning_effort: context.reasoningEffort }),
  };
  const startedAt = Date.now();
  const probeHeaders = context.resolveProbeHeaders
    ? await context.resolveProbeHeaders(context.providerAccountId)
    : {};
  const executeProbe = async (credential: string): Promise<Response> =>
    context.networkFetcher(probeUrl, {
      method: "POST",
      headers: {
        ...probeHeaders,
        accept: "application/json",
        "content-type": "application/json",
        authorization: credential.startsWith("Bearer ") ? credential : `Bearer ${credential}`,
      },
      signal: AbortSignal.timeout(context.probeTimeoutMs ?? DEFAULT_REMOTE_PROBE_TIMEOUT_MS),
      body: JSON.stringify(body),
    });

  try {
    let response = await executeWithTransientRetry(
      () => executeProbe(authorization),
      resolveProbeAttempts(context.probeAttempts),
      resolveProbeRetryDelayMs(context.probeRetryDelayMs),
    );
    if ((response.status === 401 || response.status === 403) && context.refreshAuthorization) {
      const refreshed = await context.refreshAuthorization(context.providerAccountId);
      if (refreshed?.trim()) {
        response = await executeWithTransientRetry(
          () => executeProbe(refreshed),
          resolveProbeAttempts(context.probeAttempts),
          resolveProbeRetryDelayMs(context.probeRetryDelayMs),
        );
      }
    }
    const latencyMs = Date.now() - startedAt;
    if (response.ok) {
      return {
        endpointId: context.endpointId,
        modelId: context.modelId,
        reason: "healthy",
        healthStatus: mapProbeReasonToHealthStatus("healthy"),
        latencyMs,
      };
    }
    const reason: RemoteHealthProbeReason =
      response.status === 401 || response.status === 403
        ? "auth"
        : response.status === 404
          ? "model-not-found"
          : "vendor-down";
    return {
      endpointId: context.endpointId,
      modelId: context.modelId,
      reason,
      healthStatus: mapProbeReasonToHealthStatus(reason),
      latencyMs,
      message: `Remote admission probe returned HTTP ${response.status}.`,
    };
  } catch (error) {
    const reason: RemoteHealthProbeReason =
      isTimeoutError(error) || isTransientTransportError(error) ? "timeout" : "vendor-down";
    return {
      endpointId: context.endpointId,
      modelId: context.modelId,
      reason,
      healthStatus: mapProbeReasonToHealthStatus(reason),
      latencyMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : "Remote admission probe failed.",
    };
  }
}
