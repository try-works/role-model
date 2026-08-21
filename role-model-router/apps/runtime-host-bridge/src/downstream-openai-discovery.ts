import { createHash } from "node:crypto";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import {
  type ModelCapabilityProfile,
  resolveModelCapabilityProfile,
} from "./model-capability-resolver.js";
import { type RoutableInventory, resolveAliasAllowEndpoints } from "./routable-inventory.js";
import type { UnifiedRuntimeModelAliasConfig } from "./unified-runtime-config.js";

export interface DownstreamOpenAIDiscoveryInput {
  readonly baseUrl: string;
  readonly displayName?: string;
  readonly registry: EndpointRegistryResult;
  readonly catalog: NormalizedCatalog;
  readonly modelAliases?: readonly UnifiedRuntimeModelAliasConfig[];
  readonly inventory?: RoutableInventory | null;
  readonly recommendedModelId?: string | null;
}

export interface DownstreamOpenAIConditionalSupport {
  readonly targetModelIds: readonly string[];
  readonly endpointIds: readonly string[];
}

export interface DownstreamOpenAIModelCapabilities {
  readonly guaranteed: readonly string[];
  readonly available: readonly string[];
  readonly conditional: Readonly<Record<string, DownstreamOpenAIConditionalSupport>>;
  readonly tools: {
    readonly functionCalling: boolean;
  };
  readonly reasoning: {
    readonly supported: boolean;
    readonly effortControl: boolean;
    readonly effortLevels: readonly string[];
  };
  readonly structuredOutput: {
    readonly supported: boolean;
  };
  readonly caching: {
    readonly promptRead: boolean | null;
    readonly promptWrite: boolean | null;
    readonly source: "catalog" | "unknown" | "mixed";
  };
}

export interface DownstreamOpenAIModelRecord {
  readonly id: string;
  readonly object: "model";
  readonly owned_by: "role-model";
  readonly endpoint_ids: readonly string[];
  readonly type: "model" | "alias" | "endpoint";
  /** Present only for selectable endpoint-instance rows. */
  readonly upstream_model_id?: string;
  /** Null means the provider-default effort slot. */
  readonly fixed_effort?: string | null;
  readonly routingMode?: UnifiedRuntimeModelAliasConfig["mode"];
  readonly targetModelIds: readonly string[];
  readonly canonicalModelIds: readonly string[];
  readonly providerIds: readonly string[];
  readonly limits: {
    readonly safeContextWindow: number | null;
    readonly safeMaxOutputTokens: number | null;
    readonly maxContextWindow: number | null;
    readonly maxOutputTokens: number | null;
  };
  readonly modalities: {
    readonly guaranteedInput: readonly string[];
    readonly availableInput: readonly string[];
    readonly conditionalInput: Readonly<Record<string, DownstreamOpenAIConditionalSupport>>;
    readonly output: readonly string[];
  };
  readonly capabilities: DownstreamOpenAIModelCapabilities;
  readonly declared: {
    readonly modelIds: readonly string[];
    readonly endpointIds: readonly string[];
  };
  readonly routable: {
    readonly modelIds: readonly string[];
    readonly endpointIds: readonly string[];
  };
  readonly piMapping: {
    readonly contextWindow: number | null;
    readonly maxTokens: number | null;
    readonly compat?: {
      readonly supportsDeveloperRole?: boolean;
      readonly sendSessionAffinityHeaders?: boolean;
      readonly supportsLongCacheRetention?: boolean;
    };
  };
  readonly sources: readonly string[];
}

export interface DownstreamOpenAIDiscoveryResponse {
  readonly contractVersion: "role-model.downstream.openai.v1";
  readonly kind: "openai-compatible";
  readonly providerId: "role-model-runtime";
  readonly displayName: string;
  readonly baseUrl: string;
  readonly endpoints: {
    readonly health: string;
    readonly models: string;
    readonly chatCompletions: string;
    readonly responses: string;
  };
  readonly authentication: {
    readonly type: "bearer";
    readonly headerName: "Authorization";
    readonly required: false;
    readonly placeholderToken: "role-model-local";
    readonly note: string;
  };
  readonly models: readonly DownstreamOpenAIModelRecord[];
  readonly setup: {
    readonly recommendedModel: string | null;
    readonly notes: readonly string[];
  };
  readonly freshness: {
    readonly generatedAt: string;
    readonly catalogVersion: string;
    readonly catalogCapturedAt: string | null;
    readonly runtimeInventoryRevision: string;
  };
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].filter((value) => value.length > 0).sort(compareText);
}

function uniquePreservingOrder(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].filter((value) => value.length > 0);
}

const REASONING_EFFORT_ORDER = ["minimal", "low", "medium", "high", "xhigh", "max"] as const;

function compareReasoningEffort(left: string, right: string): number {
  const leftIndex = REASONING_EFFORT_ORDER.indexOf(left as (typeof REASONING_EFFORT_ORDER)[number]);
  const rightIndex = REASONING_EFFORT_ORDER.indexOf(
    right as (typeof REASONING_EFFORT_ORDER)[number],
  );
  if (leftIndex >= 0 && rightIndex >= 0 && leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }
  if (leftIndex >= 0 && rightIndex < 0) return -1;
  if (leftIndex < 0 && rightIndex >= 0) return 1;
  return compareText(left, right);
}

function uniqueReasoningEfforts(values: Iterable<string>): readonly string[] {
  return [...new Set(values)].filter((value) => value.length > 0).sort(compareReasoningEffort);
}

function compareEndpointInstances(
  left: EndpointRegistryResult["endpoints"][number],
  right: EndpointRegistryResult["endpoints"][number],
): number {
  const leftEffort = left.identity.reasoning_effort ?? null;
  const rightEffort = right.identity.reasoning_effort ?? null;
  if (leftEffort === null && rightEffort !== null) {
    return -1;
  }
  if (leftEffort !== null && rightEffort === null) {
    return 1;
  }
  if (leftEffort !== rightEffort) {
    const canonicalOrder = ["minimal", "low", "medium", "high", "xhigh", "max"];
    const leftIndex = leftEffort === null ? -1 : canonicalOrder.indexOf(leftEffort);
    const rightIndex = rightEffort === null ? -1 : canonicalOrder.indexOf(rightEffort);
    if (leftIndex !== rightIndex) {
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    }
    return compareText(leftEffort ?? "", rightEffort ?? "");
  }
  return compareText(left.identity.endpoint_id, right.identity.endpoint_id);
}

function toPublicEndpointId(endpointId: string): string {
  return endpointId.replace(/[a-zA-Z]:[\\/][^.\s"]+/g, "[local-path]");
}

function minNumber(values: readonly (number | null)[]): number | null {
  const known = values.filter((value): value is number => typeof value === "number");
  return known.length > 0 ? Math.min(...known) : null;
}

function maxNumber(values: readonly (number | null)[]): number | null {
  const known = values.filter((value): value is number => typeof value === "number");
  return known.length > 0 ? Math.max(...known) : null;
}

function intersectSorted(lists: readonly (readonly string[])[]): readonly string[] {
  if (lists.length === 0) {
    return [];
  }
  const [first, ...rest] = lists;
  return first.filter((value) => rest.every((list) => list.includes(value))).sort(compareText);
}

function buildEndpointIdsByModelId(registry: EndpointRegistryResult): Map<string, string[]> {
  const byModelId = new Map<string, EndpointRegistryResult["endpoints"][number][]>();
  for (const endpoint of registry.endpoints) {
    const current = byModelId.get(endpoint.identity.model_id) ?? [];
    current.push(endpoint);
    byModelId.set(endpoint.identity.model_id, current);
  }
  const endpointIdsByModelId = new Map<string, string[]>();
  for (const [modelId, endpoints] of byModelId.entries()) {
    endpointIdsByModelId.set(
      modelId,
      endpoints
        .slice()
        .sort(compareEndpointInstances)
        .map((endpoint) => toPublicEndpointId(endpoint.identity.endpoint_id)),
    );
  }
  return endpointIdsByModelId;
}

function buildEffortLevelsByModelId(
  registry: EndpointRegistryResult,
  catalog: NormalizedCatalog,
): Map<string, string[]> {
  const levelsByModelId = new Map<string, string[]>();
  for (const endpoint of registry.endpoints) {
    const profile = resolveModelCapabilityProfile({
      modelId: endpoint.identity.model_id,
      catalog,
    });
    const levels = levelsByModelId.get(endpoint.identity.model_id) ?? [];
    levels.push(...profile.reasoning.effortLevels);
    if (endpoint.identity.reasoning_effort) {
      levels.push(endpoint.identity.reasoning_effort);
    }
    levelsByModelId.set(endpoint.identity.model_id, [...new Set(levels)]);
  }
  for (const levels of levelsByModelId.values()) {
    levels.sort(compareReasoningEffort);
  }
  return levelsByModelId;
}

function targetRows(input: {
  readonly targetModelIds: readonly string[];
  readonly endpointIdsByModelId: ReadonlyMap<string, readonly string[]>;
  readonly catalog: NormalizedCatalog;
}): readonly {
  readonly modelId: string;
  readonly endpointIds: readonly string[];
  readonly profile: ModelCapabilityProfile;
}[] {
  return input.targetModelIds.map((modelId) => ({
    modelId,
    endpointIds: input.endpointIdsByModelId.get(modelId) ?? [],
    profile: resolveModelCapabilityProfile({ modelId, catalog: input.catalog }),
  }));
}

function buildConditionalSupport(input: {
  readonly rows: readonly {
    readonly modelId: string;
    readonly endpointIds: readonly string[];
    readonly values: readonly string[];
  }[];
  readonly guaranteed: readonly string[];
  readonly available: readonly string[];
}): Readonly<Record<string, DownstreamOpenAIConditionalSupport>> {
  const conditional: Record<string, DownstreamOpenAIConditionalSupport> = {};
  for (const value of input.available) {
    if (input.guaranteed.includes(value)) {
      continue;
    }
    const rows = input.rows.filter((row) => row.values.includes(value));
    conditional[value] = {
      targetModelIds: uniqueSorted(rows.map((row) => row.modelId)),
      endpointIds: uniqueSorted(rows.flatMap((row) => row.endpointIds)),
    };
  }
  return conditional;
}

const PI_PROMPT_CACHE_PROVIDER_IDS = new Set(["deepseek", "moonshot", "openai"]);

function supportsPiPromptCacheContinuity(input: {
  readonly rows: readonly {
    readonly profile: ModelCapabilityProfile;
  }[];
}): boolean {
  return (
    input.rows.length > 0 &&
    input.rows.every((row) => PI_PROMPT_CACHE_PROVIDER_IDS.has(row.profile.providerId))
  );
}

function aggregateModelRecord(input: {
  readonly id: string;
  readonly type: "model" | "alias" | "endpoint";
  readonly routingMode?: UnifiedRuntimeModelAliasConfig["mode"];
  readonly declaredModelIds: readonly string[];
  readonly routableModelIds: readonly string[];
  readonly endpointIds: readonly string[];
  readonly effortLevels?: readonly string[];
  readonly rows: readonly {
    readonly modelId: string;
    readonly endpointIds: readonly string[];
    readonly profile: ModelCapabilityProfile;
  }[];
}): DownstreamOpenAIModelRecord {
  const inputLists = input.rows.map((row) => row.profile.inputModalities);
  const capabilityLists = input.rows.map((row) => row.profile.capabilities);
  const outputLists = input.rows.map((row) => row.profile.outputModalities);
  const guaranteedInput = intersectSorted(inputLists);
  const availableInput = uniqueSorted(inputLists.flat());
  const guaranteedCapabilities = intersectSorted(capabilityLists);
  const availableCapabilities = uniqueSorted(capabilityLists.flat());
  const output = uniqueSorted(outputLists.flat());
  const limits = {
    safeContextWindow: minNumber(input.rows.map((row) => row.profile.limits.contextWindow)),
    safeMaxOutputTokens: minNumber(input.rows.map((row) => row.profile.limits.maxOutputTokens)),
    maxContextWindow: maxNumber(input.rows.map((row) => row.profile.limits.contextWindow)),
    maxOutputTokens: maxNumber(input.rows.map((row) => row.profile.limits.maxOutputTokens)),
  };
  const supportsPiCompat = supportsPiPromptCacheContinuity({ rows: input.rows });

  const endpointIds = uniquePreservingOrder(input.endpointIds.map(toPublicEndpointId));
  return {
    id: input.id,
    object: "model",
    owned_by: "role-model",
    endpoint_ids: endpointIds,
    type: input.type,
    ...(input.routingMode ? { routingMode: input.routingMode } : {}),
    targetModelIds: uniqueSorted(input.declaredModelIds),
    canonicalModelIds: uniqueSorted(
      input.rows
        .map((row) => row.profile.canonicalModelId)
        .filter((modelId): modelId is string => modelId !== null),
    ),
    providerIds: uniqueSorted(input.rows.map((row) => row.profile.providerId)),
    limits,
    modalities: {
      guaranteedInput,
      availableInput,
      conditionalInput: buildConditionalSupport({
        rows: input.rows.map((row) => ({
          modelId: row.modelId,
          endpointIds: row.endpointIds,
          values: row.profile.inputModalities,
        })),
        guaranteed: guaranteedInput,
        available: availableInput,
      }),
      output,
    },
    capabilities: {
      guaranteed: guaranteedCapabilities,
      available: availableCapabilities,
      conditional: buildConditionalSupport({
        rows: input.rows.map((row) => ({
          modelId: row.modelId,
          endpointIds: row.endpointIds,
          values: row.profile.capabilities,
        })),
        guaranteed: guaranteedCapabilities,
        available: availableCapabilities,
      }),
      tools: {
        functionCalling: input.rows.some((row) => row.profile.toolSupport.functionCalling),
      },
      reasoning: {
        supported: input.rows.some((row) => row.profile.reasoning.supported),
        effortControl: input.rows.some((row) => row.profile.reasoning.effortControl),
        effortLevels: uniqueReasoningEfforts(input.effortLevels ?? []),
      },
      structuredOutput: {
        supported: input.rows.some((row) => row.profile.structuredOutput.supported),
      },
      caching: aggregateCaching(input.rows.map((row) => row.profile)),
    },
    declared: {
      modelIds: uniqueSorted(input.declaredModelIds),
      endpointIds: endpointIds,
    },
    routable: {
      modelIds: uniqueSorted(input.routableModelIds),
      endpointIds,
    },
    piMapping: {
      contextWindow: limits.safeContextWindow,
      maxTokens: limits.safeMaxOutputTokens,
      compat: {
        supportsDeveloperRole: false,
        sendSessionAffinityHeaders: supportsPiCompat,
        supportsLongCacheRetention: supportsPiCompat,
      },
    },
    sources: uniqueSorted(
      input.rows.flatMap((row) =>
        [
          row.profile.sources.limits,
          row.profile.sources.modalities,
          row.profile.sources.capabilities,
        ].filter((source): source is string => source !== null),
      ),
    ),
  };
}

function aggregateCaching(
  profiles: readonly ModelCapabilityProfile[],
): DownstreamOpenAIModelCapabilities["caching"] {
  if (profiles.length === 0) {
    return {
      promptRead: null,
      promptWrite: null,
      source: "unknown",
    };
  }
  const promptRead = profiles.map((profile) => profile.caching.promptRead);
  const promptWrite = profiles.map((profile) => profile.caching.promptWrite);
  const sources = uniqueSorted(profiles.map((profile) => profile.caching.source));
  return {
    promptRead: promptRead.every((value) => value === true)
      ? true
      : promptRead.every((value) => value === false)
        ? false
        : null,
    promptWrite: promptWrite.every((value) => value === true)
      ? true
      : promptWrite.every((value) => value === false)
        ? false
        : null,
    source: sources.length === 1 ? (sources[0] as "catalog" | "unknown") : "mixed",
  };
}

function resolveAliasEndpointIds(input: {
  readonly alias: UnifiedRuntimeModelAliasConfig;
  readonly inventory: RoutableInventory | null;
  readonly registry: EndpointRegistryResult;
  readonly endpointIdsByModelId: ReadonlyMap<string, readonly string[]>;
}): {
  readonly endpointIds: readonly string[];
  readonly routableModelIds: readonly string[];
} {
  if (input.inventory) {
    const resolution = resolveAliasAllowEndpoints(input.alias, input.inventory, input.registry);
    return {
      endpointIds: resolution.allowEndpoints,
      routableModelIds: resolution.resolvedModelIds,
    };
  }

  const expandedEndpointIds = input.alias.modelIds.flatMap(
    (modelId) => input.endpointIdsByModelId.get(modelId) ?? [],
  );
  const allowlistedEndpointIds =
    input.alias.endpointIds === undefined
      ? expandedEndpointIds
      : expandedEndpointIds.filter((endpointId) => input.alias.endpointIds?.includes(endpointId));
  return {
    endpointIds: uniqueSorted(allowlistedEndpointIds),
    routableModelIds: input.alias.modelIds.filter((modelId) =>
      (input.endpointIdsByModelId.get(modelId) ?? []).some((endpointId) =>
        allowlistedEndpointIds.includes(endpointId),
      ),
    ),
  };
}

function buildRuntimeInventoryRevision(input: {
  readonly registry: EndpointRegistryResult;
  readonly modelAliases: readonly UnifiedRuntimeModelAliasConfig[];
  readonly catalog: NormalizedCatalog;
  readonly inventory: RoutableInventory | null;
}): string {
  const digestInput = {
    catalogVersion: input.catalog.catalogVersion,
    catalogSource: input.catalog.source,
    endpoints: input.registry.endpoints
      .map((endpoint) => ({
        endpointId: endpoint.identity.endpoint_id,
        modelId: endpoint.identity.model_id,
        status: endpoint.status,
        declared: endpoint.declared,
      }))
      .sort((left, right) => compareText(left.endpointId, right.endpointId)),
    aliases: input.modelAliases
      .map((alias) => ({
        aliasId: alias.aliasId,
        mode: alias.mode ?? null,
        modelIds: [...alias.modelIds].sort(compareText),
        endpointIds: alias.endpointIds ? [...alias.endpointIds].sort(compareText) : null,
      }))
      .sort((left, right) => compareText(left.aliasId, right.aliasId)),
    inventory: input.inventory
      ? {
          modelIds: input.inventory.modelIds,
          endpointIds: input.inventory.endpointIds,
        }
      : null,
  };
  return createHash("sha256").update(JSON.stringify(digestInput)).digest("hex").slice(0, 16);
}

export function createDownstreamOpenAIDiscovery(
  input: DownstreamOpenAIDiscoveryInput,
): DownstreamOpenAIDiscoveryResponse {
  const modelAliases = input.modelAliases ?? [];
  const inventory = input.inventory ?? null;
  const endpointIdsByModelId = buildEndpointIdsByModelId(input.registry);
  const effortLevelsByModelId = buildEffortLevelsByModelId(input.registry, input.catalog);
  const modelRecords: DownstreamOpenAIModelRecord[] = [];

  for (const [modelId, endpointIds] of endpointIdsByModelId.entries()) {
    const rows = targetRows({
      targetModelIds: [modelId],
      endpointIdsByModelId,
      catalog: input.catalog,
    });
    modelRecords.push(
      aggregateModelRecord({
        id: modelId,
        type: "model",
        declaredModelIds: [modelId],
        routableModelIds: endpointIds.length > 0 ? [modelId] : [],
        endpointIds,
        effortLevels: [
          ...(resolveModelCapabilityProfile({ modelId, catalog: input.catalog }).reasoning
            .effortLevels ?? []),
          ...endpointIds.flatMap((endpointId) =>
            input.registry.endpoints
              .filter((endpoint) => endpoint.identity.endpoint_id === endpointId)
              .map((endpoint) => endpoint.identity.reasoning_effort ?? "")
              .filter((effort) => effort.length > 0),
          ),
        ],
        rows,
      }),
    );
  }

  for (const endpoint of input.registry.endpoints) {
    const endpointId = toPublicEndpointId(endpoint.identity.endpoint_id);
    const profile = resolveModelCapabilityProfile({
      modelId: endpoint.identity.model_id,
      catalog: input.catalog,
    });
    modelRecords.push({
      ...aggregateModelRecord({
        id: endpointId,
        type: "endpoint",
        declaredModelIds: [endpoint.identity.model_id],
        routableModelIds: [endpoint.identity.model_id],
        endpointIds: [endpoint.identity.endpoint_id],
        effortLevels:
          endpoint.identity.reasoning_effort === undefined ||
          endpoint.identity.reasoning_effort === null
            ? profile.reasoning.effortLevels
            : [...profile.reasoning.effortLevels, endpoint.identity.reasoning_effort],
        rows: [
          {
            modelId: endpoint.identity.model_id,
            endpointIds: [endpoint.identity.endpoint_id],
            profile,
          },
        ],
      }),
      upstream_model_id: endpoint.identity.model_id,
      fixed_effort: endpoint.identity.reasoning_effort ?? null,
    });
  }

  for (const alias of modelAliases) {
    const resolution = resolveAliasEndpointIds({
      alias,
      inventory,
      registry: input.registry,
      endpointIdsByModelId,
    });
    const routableModelIds =
      resolution.routableModelIds.length > 0
        ? resolution.routableModelIds
        : resolution.endpointIds.length > 0
          ? alias.modelIds
          : [];
    const aggregateModelIds = routableModelIds.length > 0 ? routableModelIds : alias.modelIds;
    const rows = targetRows({
      targetModelIds: aggregateModelIds,
      endpointIdsByModelId,
      catalog: input.catalog,
    });
    modelRecords.push(
      aggregateModelRecord({
        id: alias.aliasId,
        type: "alias",
        routingMode: alias.mode,
        declaredModelIds: alias.modelIds,
        routableModelIds,
        endpointIds: resolution.endpointIds,
        effortLevels: aggregateModelIds.flatMap(
          (modelId) => effortLevelsByModelId.get(modelId) ?? [],
        ),
        rows,
      }),
    );
  }

  const models = modelRecords.sort((left, right) => compareText(left.id, right.id));
  const recommendedModel =
    (input.recommendedModelId && models.some((model) => model.id === input.recommendedModelId)
      ? input.recommendedModelId
      : null) ??
    modelAliases.find((alias) => models.some((model) => model.id === alias.aliasId))?.aliasId ??
    models[0]?.id ??
    null;

  return {
    contractVersion: "role-model.downstream.openai.v1",
    kind: "openai-compatible",
    providerId: "role-model-runtime",
    displayName: input.displayName ?? "role-model",
    baseUrl: input.baseUrl,
    endpoints: {
      health: `${input.baseUrl}/healthz`,
      models: `${input.baseUrl}/v1/models`,
      chatCompletions: `${input.baseUrl}/v1/chat/completions`,
      responses: `${input.baseUrl}/v1/responses`,
    },
    authentication: {
      type: "bearer",
      headerName: "Authorization",
      required: false,
      placeholderToken: "role-model-local",
      note: "Inbound bearer validation is not enforced yet. If a downstream client requires a token field, use this placeholder value.",
    },
    models,
    setup: {
      recommendedModel,
      notes: [
        "Configure downstream tooling as an OpenAI-compatible provider.",
        "Use /api/role-model/downstream/openai for alias capability metadata.",
        "Use GET /v1/models for the compact OpenAI-compatible model list.",
        "Use conservative piMapping limits unless the request is routed with explicit conditional capability support.",
      ],
    },
    freshness: {
      generatedAt: new Date().toISOString(),
      catalogVersion: input.catalog.catalogVersion,
      catalogCapturedAt:
        typeof input.catalog.source.capturedAt === "string"
          ? input.catalog.source.capturedAt
          : null,
      runtimeInventoryRevision: buildRuntimeInventoryRevision({
        registry: input.registry,
        modelAliases,
        catalog: input.catalog,
        inventory,
      }),
    },
  };
}
