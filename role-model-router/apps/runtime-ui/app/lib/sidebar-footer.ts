import type { ModelStatus, SidebarModel } from "@role-model/ui";

import type {
  RouterSummary,
  RuntimeConfig,
  RuntimeDownstreamOpenAIProviderConfig,
  RuntimeEndpoint,
  RuntimeModelRecord,
  RuntimeTelemetryComparisonRow,
  RuntimeTelemetryRequestRecord,
} from "./runtime-api";

const SIDEBAR_MODEL_LIMIT = 8;

export function mapEndpointHealthToSidebarStatus(
  healthStatus: string | undefined,
  status: string | undefined,
): ModelStatus {
  const token = (healthStatus && healthStatus.length > 0 ? healthStatus : status) ?? "unknown";
  if (token === "healthy" || token === "active") {
    return "active";
  }
  if (token === "degraded") {
    return "degraded";
  }
  return "offline";
}

function summarizeSidebarModelStatus(
  endpoints: readonly Pick<RuntimeEndpoint, "healthStatus" | "status">[],
): ModelStatus {
  if (endpoints.length === 0) {
    return "offline";
  }
  const statuses = endpoints.map((endpoint) =>
    mapEndpointHealthToSidebarStatus(endpoint.healthStatus, endpoint.status),
  );
  if (statuses.every((status) => status === "active")) {
    return "active";
  }
  if (statuses.every((status) => status === "offline")) {
    return "offline";
  }
  return "degraded";
}

/** Build sidebar model inventory rows (request counts from telemetry comparison rows). */
export function buildSidebarModels(input: {
  readonly models: readonly RuntimeModelRecord[];
  readonly endpoints: readonly RuntimeEndpoint[];
  readonly telemetryRows: readonly RuntimeTelemetryComparisonRow[];
  readonly limit?: number;
}): SidebarModel[] {
  const limit = input.limit ?? SIDEBAR_MODEL_LIMIT;
  const endpointsByModel = new Map<string, RuntimeEndpoint[]>();
  for (const endpoint of input.endpoints) {
    const modelId = endpoint.modelId;
    if (!modelId) {
      continue;
    }
    const bucket = endpointsByModel.get(modelId) ?? [];
    bucket.push(endpoint);
    endpointsByModel.set(modelId, bucket);
  }

  const requestCounts = new Map<string, number>();
  for (const row of input.telemetryRows) {
    const modelId = row.modelId;
    if (!modelId) {
      continue;
    }
    requestCounts.set(modelId, (requestCounts.get(modelId) ?? 0) + (row.requestCount ?? 0));
  }

  const modelIds = new Set<string>();
  for (const model of input.models) {
    if (model.id) {
      modelIds.add(model.id);
    }
  }
  for (const modelId of endpointsByModel.keys()) {
    modelIds.add(modelId);
  }
  for (const modelId of requestCounts.keys()) {
    modelIds.add(modelId);
  }

  return [...modelIds]
    .map((id) => {
      const endpoints = endpointsByModel.get(id) ?? [];
      return {
        id,
        status: summarizeSidebarModelStatus(endpoints),
        requestCount: requestCounts.get(id) ?? 0,
      } satisfies SidebarModel;
    })
    .sort(
      (left, right) =>
        right.requestCount - left.requestCount || left.id.localeCompare(right.id, "en"),
    )
    .slice(0, limit);
}

/** Most recent request’s cache hit rate, 0–100 (RM3 sidebar footer rule). */
export function cacheHitRateFromRequest(
  request: RuntimeTelemetryRequestRecord | null | undefined,
): number {
  if (!request) {
    return 0;
  }
  if (!request.promptCacheSupported) {
    return 0;
  }
  if (request.cacheReadTokensSupported) {
    const inputTokens = request.inputTokens ?? 0;
    if (inputTokens > 0) {
      return Math.round(((request.cacheReadTokens ?? 0) / inputTokens) * 100);
    }
  }
  return request.promptCacheUsed ? 100 : 0;
}

export function resolveActiveRouterAlias(input: {
  readonly config: RuntimeConfig | null | undefined;
  readonly summary: RouterSummary | null | undefined;
}): string {
  const strategy = input.config?.routingStrategy ?? "baseline";
  const executionMode = input.config?.executionMode ?? input.summary?.executionMode;
  if (executionMode && executionMode.length > 0) {
    return `${strategy}.${executionMode.replaceAll("_", "-")}`;
  }
  const controllerModelId = input.summary?.controller?.modelId;
  if (controllerModelId) {
    const match = (input.summary?.aliasInventory ?? []).find((alias) =>
      alias.resolvedModelIds.includes(controllerModelId),
    );
    if (match?.aliasId) {
      return match.aliasId;
    }
  }
  return "—";
}

export function formatRouterEndpointHost(
  config: RuntimeDownstreamOpenAIProviderConfig | null | undefined,
  fallbackHost = typeof window !== "undefined" ? window.location.host : "127.0.0.1:3456",
): string {
  const raw = config?.baseUrl?.trim();
  if (!raw) {
    return `${fallbackHost.replace(/\/$/, "")}/v1`;
  }
  try {
    const url = new URL(raw);
    return `${url.host}/v1`;
  } catch {
    const stripped = raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return stripped.endsWith("/v1") ? stripped : `${stripped}/v1`;
  }
}

export type SidebarFooterState = {
  readonly models: readonly SidebarModel[];
  readonly cacheHitRate: number;
  readonly routerEndpoint: string;
  readonly routerAlias: string;
};

/** Empty footer before the first successful load (host from the current origin when available). */
export function createEmptySidebarFooter(
  fallbackHost = typeof window !== "undefined" ? window.location.host : "127.0.0.1:3456",
): SidebarFooterState {
  return {
    models: [],
    cacheHitRate: 0,
    routerEndpoint: formatRouterEndpointHost(null, fallbackHost),
    routerAlias: "—",
  };
}

export const EMPTY_SIDEBAR_FOOTER: SidebarFooterState = createEmptySidebarFooter("127.0.0.1:3456");
