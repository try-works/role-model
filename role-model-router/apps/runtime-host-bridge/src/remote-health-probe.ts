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
  readonly networkFetcher: typeof fetch;
  readonly probeTimeoutMs?: number;
}

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

export function buildModelsProbeUrl(apiBase: string): string {
  const trimmed = apiBase.trim().replace(/\/+$/u, "");
  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/models`;
  }
  return `${trimmed}/v1/models`;
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
    const response = await context.networkFetcher(probeUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: authorization.startsWith("Bearer ")
          ? authorization
          : `Bearer ${authorization}`,
      },
      signal: AbortSignal.timeout(context.probeTimeoutMs ?? 5000),
    });
    const latencyMs = Date.now() - startedAt;

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
    if (!modelIds.includes(target.modelId)) {
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
      latencyMs,
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
