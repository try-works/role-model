import type { ModelStatus, SidebarModel } from "@role-model/ui";

import {
  formatCompactEndpointDisplayName,
  hasReasoningEffort,
  readReasoningEffort,
  readUpstreamModelId,
} from "./effort-identity";
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

/**
 * Build sidebar rows for the active routing pool.
 *
 * A discovered vendor endpoint can be healthy enough to inspect while still being
 * excluded from routing. Do not present that inventory as a pool member: every
 * configured endpoint shown here must satisfy the same routing-eligibility
 * boundary as the candidate-space chart. Historical telemetry with no longer
 * known endpoint remains visible as a model-only row.
 */
export function buildSidebarModels(input: {
  readonly models: readonly RuntimeModelRecord[];
  readonly endpoints: readonly RuntimeEndpoint[];
  readonly telemetryRows: readonly RuntimeTelemetryComparisonRow[];
  readonly limit?: number;
}): SidebarModel[] {
  const limit = input.limit ?? SIDEBAR_MODEL_LIMIT;
  const allEndpointsByModel = new Map<string, RuntimeEndpoint[]>();
  const endpointsByModel = new Map<string, RuntimeEndpoint[]>();
  for (const endpoint of input.endpoints) {
    const modelId = endpoint.modelId;
    if (!modelId) {
      continue;
    }
    const allBucket = allEndpointsByModel.get(modelId) ?? [];
    allBucket.push(endpoint);
    allEndpointsByModel.set(modelId, allBucket);
    if (endpoint.routingEligible !== false) {
      const routableBucket = endpointsByModel.get(modelId) ?? [];
      routableBucket.push(endpoint);
      endpointsByModel.set(modelId, routableBucket);
    }
  }

  const requestCounts = new Map<string, number>();
  const requestCountsByEndpoint = new Map<string, number>();
  for (const row of input.telemetryRows) {
    const modelId = row.modelId;
    if (!modelId) {
      continue;
    }
    requestCounts.set(modelId, (requestCounts.get(modelId) ?? 0) + (row.requestCount ?? 0));
    requestCountsByEndpoint.set(
      row.endpointId,
      (requestCountsByEndpoint.get(row.endpointId) ?? 0) + (row.requestCount ?? 0),
    );
  }

  const modelIds = new Set<string>();
  for (const model of input.models) {
    const knownEndpoints = allEndpointsByModel.get(model.id) ?? [];
    const routableEndpoints = endpointsByModel.get(model.id) ?? [];
    if (model.id && (knownEndpoints.length === 0 || routableEndpoints.length > 0)) {
      modelIds.add(model.id);
    }
  }
  for (const modelId of endpointsByModel.keys()) {
    modelIds.add(modelId);
  }
  for (const modelId of requestCounts.keys()) {
    const knownEndpoints = allEndpointsByModel.get(modelId) ?? [];
    const routableEndpoints = endpointsByModel.get(modelId) ?? [];
    if (knownEndpoints.length === 0 || routableEndpoints.length > 0) {
      modelIds.add(modelId);
    }
  }

  const modelById = new Map(input.models.map((model) => [model.id, model] as const));
  const rows: SidebarModel[] = [];
  for (const id of modelIds) {
    const endpoints = endpointsByModel.get(id) ?? [];
    const model = modelById.get(id);
    const modelEffort = readReasoningEffort(model);
    const effortSiblings =
      endpoints.some((endpoint) => hasReasoningEffort(endpoint)) || modelEffort;
    if (effortSiblings && endpoints.length > 0) {
      const base = model?.displayName ?? (readUpstreamModelId(model) ?? id).split("/").at(-1) ?? id;
      for (const endpoint of endpoints) {
        const endpointEffort = readReasoningEffort(endpoint) ?? modelEffort;
        rows.push({
          id: formatCompactEndpointDisplayName({
            base: endpoint.displayName ?? base,
            reasoningEffort: endpointEffort,
          }),
          status: summarizeSidebarModelStatus([endpoint]),
          requestCount: requestCountsByEndpoint.get(endpoint.endpointId) ?? 0,
        });
      }
      continue;
    }
    rows.push({
      id,
      status: summarizeSidebarModelStatus(endpoints),
      requestCount:
        endpoints.length > 0
          ? endpoints.reduce(
              (count, endpoint) => count + (requestCountsByEndpoint.get(endpoint.endpointId) ?? 0),
              0,
            )
          : (requestCounts.get(id) ?? 0),
    });
  }

  return rows
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
