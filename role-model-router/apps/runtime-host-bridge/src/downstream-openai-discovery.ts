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
  readonly type: "model" | "alias";
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
  };
  readonly sources: readonly string[];
}

export interface DownstreamOpenAIDiscoveryResponse {
  readonly contractVersion: "role-model.downstream.openai.v1";
  readonly kind: "openai-compatible";
  readonly providerId: "role-model-runtime";
  readonly displayName: "Role Model Runtime";
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

function toPublicEndpointId(endpointId: string): string {
  return endpointId
    .replace(/api[-_]?key/gi, "credential")
    .replace(/credentialRef/gi, "credential")
    .replace(/[a-zA-Z]:[\\/][^.\s"]+/g, "[local-path]");
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
  const byModelId = new Map<string, string[]>();
  for (const endpoint of registry.endpoints) {
    const current = byModelId.get(endpoint.identity.model_id) ?? [];
    current.push(toPublicEndpointId(endpoint.identity.endpoint_id));
    byModelId.set(endpoint.identity.model_id, current);
  }
  for (const [modelId, endpointIds] of byModelId.entries()) {
    byModelId.set(modelId, endpointIds.sort(compareText));
  }
  return byModelId;
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

function aggregateModelRecord(input: {
  readonly id: string;
  readonly type: "model" | "alias";
  readonly routingMode?: UnifiedRuntimeModelAliasConfig["mode"];
  readonly declaredModelIds: readonly string[];
  readonly routableModelIds: readonly string[];
  readonly endpointIds: readonly string[];
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

  const endpointIds = uniqueSorted(input.endpointIds.map(toPublicEndpointId));
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

  const endpointIds = input.alias.modelIds.flatMap(
    (modelId) => input.endpointIdsByModelId.get(modelId) ?? [],
  );
  return {
    endpointIds: uniqueSorted(endpointIds),
    routableModelIds: input.alias.modelIds.filter(
      (modelId) => (input.endpointIdsByModelId.get(modelId)?.length ?? 0) > 0,
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
        rows,
      }),
    );
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
    displayName: "Role Model Runtime",
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
