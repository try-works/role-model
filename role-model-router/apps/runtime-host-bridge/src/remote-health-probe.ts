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

/**
 * Resolve the wire model id used by the chat-completions admission probe.
 *
 * Catalog model ids are provider-prefixed (e.g. ``deepseek/deepseek-v4-flash``),
 * but OpenAI-compatible vendors expect the bare upstream id on the wire
 * (``deepseek-v4-flash``). Sending the prefixed form makes the vendor reject
 * the probe with a 400 that we previously misclassified as ``vendor-down``.
 * Mirrors ``resolveProviderLocalModelId`` in the OpenAI execution adapter.
 */
function resolveProbeModelId(modelId: string): string {
  const trimmed = modelId.trim();
  return trimmed.includes("/") ? trimmed.split("/").slice(1).join("/") : trimmed;
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
        signal: AbortSignal.timeout(context.probeTimeoutMs ?? 5000),
      });
      return {
        response,
        latencyMs: Date.now() - probeStartedAt,
      };
    };

    let { response, latencyMs } = await executeProbe(authorization);
    if ((response.status === 401 || response.status === 403) && context.refreshAuthorization) {
      try {
        const refreshedAuthorization = await context.refreshAuthorization(target.providerAccountId);
        if (refreshedAuthorization && refreshedAuthorization.trim().length > 0) {
          ({ response, latencyMs } = await executeProbe(refreshedAuthorization));
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
    const targetComparableIds = new Set(buildComparableModelIds(target.modelId));
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
        message: `Model ${target.modelId} was not listed by ${probeUrl}.`,
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
    if (isTimeoutError(error)) {
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
  const results: RemoteHealthProbeResult[] = [];
  for (const target of context.targets) {
    results.push(await probeTarget(target, context));
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
    model: resolveProbeModelId(context.modelId),
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
      signal: AbortSignal.timeout(context.probeTimeoutMs ?? 5_000),
      body: JSON.stringify(body),
    });

  try {
    let response = await executeProbe(authorization);
    if ((response.status === 401 || response.status === 403) && context.refreshAuthorization) {
      const refreshed = await context.refreshAuthorization(context.providerAccountId);
      if (refreshed?.trim()) {
        response = await executeProbe(refreshed);
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
    const reason: RemoteHealthProbeReason = isTimeoutError(error) ? "timeout" : "vendor-down";
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
