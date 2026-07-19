import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import type { RegistrySources } from "@role-model-router/endpoint-registry";

import type { UnifiedRuntimeModelAliasConfig } from "./unified-runtime-config.js";

export interface RoutableInventoryEntry {
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType: "local" | "remote";
  readonly healthStatus: string;
  readonly servingSource: string;
}

export interface RoutableInventory {
  readonly modelIds: readonly string[];
  readonly endpointIds: readonly string[];
  readonly entries: readonly RoutableInventoryEntry[];
  readonly bySourceType: {
    readonly local: readonly RoutableInventoryEntry[];
    readonly remote: readonly RoutableInventoryEntry[];
  };
}

export interface AliasDriftWarning {
  readonly aliasId: string;
  readonly hintModelId: string;
  readonly suggestedModelIds: readonly string[];
  readonly message: string;
}

export interface AliasAllowEndpointResolution {
  readonly allowEndpoints: readonly string[];
  readonly resolvedModelIds: readonly string[];
  readonly driftWarnings: readonly AliasDriftWarning[];
  readonly poolEmpty: boolean;
  readonly poolEmptyReason?: "ALIAS_POOL_EMPTY";
}

const UNROUTABLE_HEALTH_STATUSES = new Set([
  "offline",
  "provider-unavailable",
  "provider-outage",
  "degraded",
]);

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function classifySourceType(
  endpoint: EndpointRegistryResult["endpoints"][number],
): "local" | "remote" {
  return endpoint.identity.endpoint_kind === "remote_api" ? "remote" : "local";
}

function lookupRegistrySourceHealth(
  endpointId: string,
  sources: RegistrySources,
): string | undefined {
  const cloudSource = sources.cloud.find((entry) => entry.endpointId === endpointId);
  if (cloudSource) {
    return cloudSource.healthStatus;
  }
  const localSource = sources.local.find((entry) => entry.endpointId === endpointId);
  if (localSource) {
    return localSource.lifecycleState === "active" ? "healthy" : "offline";
  }
  return undefined;
}

function hasBlockingRuntimeEligibility(
  endpoint: EndpointRegistryResult["endpoints"][number],
): boolean {
  const eligibility = endpoint.runtimeEligibility;
  if (!eligibility) {
    return false;
  }
  return Boolean(
    eligibility.accountDisabled ||
      eligibility.authUnavailable ||
      eligibility.providerUnavailable ||
      eligibility.quotaExhausted ||
      eligibility.budgetExceeded ||
      eligibility.regionDisallowed ||
      eligibility.entitlementMissing,
  );
}

function isRoutableEndpoint(
  endpoint: EndpointRegistryResult["endpoints"][number],
  healthStatus: string,
): boolean {
  if (endpoint.deniedByPolicy) {
    return false;
  }
  if (endpoint.status === "offline") {
    return false;
  }
  if (UNROUTABLE_HEALTH_STATUSES.has(healthStatus)) {
    return false;
  }
  if (hasBlockingRuntimeEligibility(endpoint)) {
    return false;
  }
  return true;
}

export function buildRoutableInventory(
  registry: EndpointRegistryResult,
  sources: RegistrySources,
): RoutableInventory {
  const entries: RoutableInventoryEntry[] = [];

  for (const endpoint of registry.endpoints) {
    const endpointId = endpoint.identity.endpoint_id;
    const healthStatus = lookupRegistrySourceHealth(endpointId, sources) ?? "healthy";
    if (!isRoutableEndpoint(endpoint, healthStatus)) {
      continue;
    }
    entries.push({
      endpointId,
      modelId: endpoint.identity.model_id,
      sourceType: classifySourceType(endpoint),
      healthStatus,
      servingSource: endpoint.identity.serving_source,
    });
  }

  entries.sort((left, right) => compareText(left.endpointId, right.endpointId));

  const modelIds = [...new Set(entries.map((entry) => entry.modelId))].sort(compareText);
  const endpointIds = entries.map((entry) => entry.endpointId);

  return {
    modelIds,
    endpointIds,
    entries,
    bySourceType: {
      local: entries.filter((entry) => entry.sourceType === "local"),
      remote: entries.filter((entry) => entry.sourceType === "remote"),
    },
  };
}

export function warnAliasModelIdDrift(
  alias: UnifiedRuntimeModelAliasConfig,
  inventory: RoutableInventory,
): readonly AliasDriftWarning[] {
  return alias.modelIds
    .filter((hintModelId) => !inventory.modelIds.includes(hintModelId))
    .map((hintModelId) => ({
      aliasId: alias.aliasId,
      hintModelId,
      suggestedModelIds: [...inventory.modelIds],
      message: `Alias ${alias.aliasId} references hint model id ${hintModelId} that is not in routable inventory.`,
    }));
}

function inventoryEntriesForAlias(
  alias: UnifiedRuntimeModelAliasConfig,
  inventory: RoutableInventory,
): readonly RoutableInventoryEntry[] {
  const aliasModelIds = new Set(alias.modelIds);
  return inventory.entries.filter((entry) => aliasModelIds.has(entry.modelId));
}

export function resolveAliasAllowEndpoints(
  alias: UnifiedRuntimeModelAliasConfig,
  inventory: RoutableInventory,
  _registry: EndpointRegistryResult,
): AliasAllowEndpointResolution {
  const driftWarnings = warnAliasModelIdDrift(alias, inventory);
  const candidateEntries = inventoryEntriesForAlias(alias, inventory);
  const allowEndpoints = [...new Set(candidateEntries.map((entry) => entry.endpointId))].sort(
    compareText,
  );
  const resolvedModelIds = [...new Set(candidateEntries.map((entry) => entry.modelId))].sort(
    compareText,
  );

  if (allowEndpoints.length === 0) {
    return {
      allowEndpoints,
      resolvedModelIds,
      driftWarnings,
      poolEmpty: true,
      poolEmptyReason: "ALIAS_POOL_EMPTY",
    };
  }

  return {
    allowEndpoints,
    resolvedModelIds,
    driftWarnings,
    poolEmpty: false,
  };
}

export function validateAliasInventoryResolution(
  aliases: readonly UnifiedRuntimeModelAliasConfig[],
  inventory: RoutableInventory,
): { readonly valid: boolean; readonly errors: readonly string[] } {
  const errors: string[] = [];
  for (const alias of aliases) {
    const resolution = resolveAliasAllowEndpoints(alias, inventory, {
      endpoints: [],
      diagnostics: [],
      lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
    });
    if (resolution.poolEmpty) {
      errors.push(
        `Alias ${alias.aliasId} cannot resolve to any routable inventory endpoints (ALIAS_POOL_EMPTY).`,
      );
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
