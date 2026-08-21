import {
  type NormalizedCatalog,
  type NormalizedCatalogModel,
  collectPricingLookupIds,
  resolveCatalogPricingHints,
} from "@role-model-router/catalog";

export interface ModelCapabilityProfile {
  readonly modelId: string;
  readonly canonicalModelId: string | null;
  readonly providerId: string;
  readonly displayName: string;
  readonly limits: {
    readonly contextWindow: number | null;
    readonly maxOutputTokens: number | null;
  };
  readonly inputModalities: readonly string[];
  readonly outputModalities: readonly string[];
  readonly capabilities: readonly string[];
  readonly toolSupport: {
    readonly functionCalling: boolean;
  };
  readonly structuredOutput: {
    readonly supported: boolean;
  };
  readonly reasoning: {
    readonly supported: boolean;
    readonly effortControl: boolean;
    readonly effortLevels: readonly string[];
    readonly optionKinds: readonly string[];
  };
  readonly caching: {
    readonly promptRead: boolean | null;
    readonly promptWrite: boolean | null;
    readonly source: "catalog" | "unknown";
  };
  readonly pricing: NormalizedCatalogModel["pricing"];
  readonly sources: {
    readonly limits: string | null;
    readonly modalities: string | null;
    readonly capabilities: string | null;
  };
  readonly unknown: readonly ("limits" | "modalities" | "capabilities")[];
}

const MODALITY_ORDER = ["text", "image", "video", "audio", "pdf"] as const;

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function sortModalities(values: Iterable<string>): readonly string[] {
  const knownOrder = new Map<string, number>(MODALITY_ORDER.map((value, index) => [value, index]));
  return [...new Set(values)]
    .filter((value) => value.length > 0)
    .sort((left, right) => {
      const leftOrder = knownOrder.get(left);
      const rightOrder = knownOrder.get(right);
      if (leftOrder !== undefined && rightOrder !== undefined) {
        return leftOrder - rightOrder;
      }
      if (leftOrder !== undefined) {
        return -1;
      }
      if (rightOrder !== undefined) {
        return 1;
      }
      return compareText(left, right);
    });
}

function readDefaultDisplayNameFromModelId(modelId: string): string {
  const [, rawName] = modelId.split("/", 2);
  return rawName ?? modelId;
}

function positiveNumber(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function providerIdFromModelId(modelId: string): string {
  return modelId.includes("/") ? (modelId.split("/", 1)[0] ?? "unknown") : "unknown";
}

function findCatalogModel(
  catalog: NormalizedCatalog,
  modelId: string,
): NormalizedCatalogModel | null {
  return catalog.models.find((entry) => entry.modelId === modelId) ?? null;
}

function resolveCanonicalCatalogModel(input: {
  readonly modelId: string;
  readonly catalog: NormalizedCatalog;
}): NormalizedCatalogModel | null {
  // Prefer the exact operator row for capability/modality metadata.
  const exact = findCatalogModel(input.catalog, input.modelId);
  if (exact) {
    return exact;
  }
  // Fall back through pricing aliases (chatgpt→openai, moonshot→moonshotai, gateways).
  for (const lookupId of collectPricingLookupIds(input.modelId)) {
    if (lookupId === input.modelId) {
      continue;
    }
    const match = findCatalogModel(input.catalog, lookupId);
    if (match) {
      return match;
    }
  }
  return null;
}

function capabilitySupported(capabilities: readonly string[], capability: string): boolean {
  return (
    capabilities.includes(capability) ||
    capabilities.some((entry) => entry === capability || entry.startsWith(`${capability}.`))
  );
}

function outputModalitiesForModel(model: NormalizedCatalogModel): readonly string[] {
  const output = new Set<string>();
  if (model.capabilities.includes("text.chat") || model.modalities.includes("text")) {
    output.add("text");
  }
  if (model.capabilities.includes("image.generation")) {
    output.add("image");
  }
  if (model.capabilities.includes("audio.generation")) {
    output.add("audio");
  }
  return sortModalities(output);
}

export function resolveModelCapabilityProfile(input: {
  readonly modelId: string;
  readonly catalog: NormalizedCatalog;
}): ModelCapabilityProfile {
  const model = resolveCanonicalCatalogModel(input);
  const pricing = resolveCatalogPricingHints({
    modelId: input.modelId,
    catalog: input.catalog,
  });
  if (!model) {
    return {
      modelId: input.modelId,
      canonicalModelId: null,
      providerId: providerIdFromModelId(input.modelId),
      displayName: readDefaultDisplayNameFromModelId(input.modelId),
      limits: {
        contextWindow: null,
        maxOutputTokens: null,
      },
      inputModalities: [],
      outputModalities: [],
      capabilities: [],
      toolSupport: {
        functionCalling: false,
      },
      structuredOutput: {
        supported: false,
      },
      reasoning: {
        supported: false,
        effortControl: false,
        effortLevels: [],
        optionKinds: [],
      },
      caching: {
        promptRead: null,
        promptWrite: null,
        source: "unknown",
      },
      pricing,
      sources: {
        limits: null,
        modalities: null,
        capabilities: null,
      },
      unknown: ["limits", "modalities", "capabilities"],
    };
  }

  const source = `catalog:${model.modelId}`;
  const capabilities = [...new Set(model.capabilities)].sort(compareText);
  const hasReasoning = capabilitySupported(capabilities, "reasoning");
  return {
    modelId: input.modelId,
    canonicalModelId: model.modelId,
    providerId: model.providerId,
    displayName: model.displayName,
    limits: {
      contextWindow: positiveNumber(model.contextWindow),
      maxOutputTokens: positiveNumber(model.maxOutputTokens),
    },
    inputModalities: sortModalities(model.modalities),
    outputModalities: outputModalitiesForModel(model),
    capabilities,
    toolSupport: {
      functionCalling: capabilitySupported(capabilities, "tools.function_calling"),
    },
    structuredOutput: {
      supported: capabilitySupported(capabilities, "structured.output"),
    },
    reasoning: {
      supported: hasReasoning,
      effortControl: hasReasoning || capabilitySupported(capabilities, "reasoning.effort_control"),
      effortLevels: [...(model.reasoningEffortLevels ?? [])],
      optionKinds: [...(model.reasoningOptionKinds ?? [])],
    },
    caching: {
      promptRead: capabilitySupported(capabilities, "cache.prompt_read"),
      promptWrite: capabilitySupported(capabilities, "cache.prompt_write"),
      source: "catalog",
    },
    pricing: model.pricing ?? pricing,
    sources: {
      limits: source,
      modalities: source,
      capabilities: source,
    },
    unknown: [
      ...(positiveNumber(model.contextWindow) === null ||
      positiveNumber(model.maxOutputTokens) === null
        ? (["limits"] as const)
        : []),
      ...(model.modalities.length === 0 ? (["modalities"] as const) : []),
      ...(model.capabilities.length === 0 ? (["capabilities"] as const) : []),
    ],
  };
}
