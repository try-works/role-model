import type { NormalizedCatalog, NormalizedCatalogModel, PricingHints } from "./index.js";

export type TokenEconomicsSource = "catalog" | "local-free" | "unknown";

export interface TokenEconomics {
  readonly canonicalModelId: string;
  readonly inputPer1M: number | null;
  readonly outputPer1M: number | null;
  readonly cacheReadInputPer1M?: number | null;
  readonly cacheWriteInputPer1M?: number | null;
  readonly costDimensionsPer1M?: Readonly<Record<string, number>>;
  readonly source: TokenEconomicsSource;
  readonly currency?: string;
}

/**
 * Operator model ids mapped to models.dev-aligned catalog rows for pricing lookup.
 * Any `moonshot/kimi-*` id also auto-aliases to `moonshotai/kimi-*` when not listed.
 */
export const CANONICAL_MODEL_ID_ALIASES: Readonly<Record<string, string>> = {
  "moonshot/kimi-k2.5": "moonshotai/kimi-k2.5",
  "moonshot/kimi-k2.6": "moonshotai/kimi-k2.6",
  "moonshot/kimi-k2.7-code": "moonshotai/kimi-k2.7-code",
  "moonshot/kimi-k3": "moonshotai/kimi-k3",
};

/** Catalog provider ids used for metadata/pricing only — hidden from operator picker. */
export const OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS: Readonly<Set<string>> = new Set(["moonshotai"]);

/** Prefer these providers when resolving ambiguous leaf-name pricing matches. */
const PREFERRED_PRICING_PROVIDER_IDS: ReadonlySet<string> = new Set([
  "openai",
  "anthropic",
  "deepseek",
  "moonshotai",
  "moonshot",
  "google",
  "xai",
  "mistral",
  "meta",
  "cohere",
]);

function resolveDeepseekCanonicalModelId(modelId: string): string | null {
  if (modelId.startsWith("deepseek/")) {
    return modelId;
  }
  // anyapi/deepseek/deepseek-v4-flash → deepseek/deepseek-v4-flash
  const nested = modelId.match(/\/deepseek\/(deepseek-[^/]+)$/);
  if (nested?.[1]) {
    return `deepseek/${nested[1]}`;
  }
  // digitalocean/deepseek-v4-flash → deepseek/deepseek-v4-flash
  const leaf = modelId.includes("/") ? (modelId.split("/").at(-1) ?? modelId) : modelId;
  if (leaf.startsWith("deepseek-")) {
    return `deepseek/${leaf}`;
  }
  return null;
}

export function resolveCanonicalModelId(modelId: string): string {
  const explicit = CANONICAL_MODEL_ID_ALIASES[modelId];
  if (explicit) {
    return explicit;
  }
  // Gateway nesting: anyapi/openai/gpt-5.4 → openai/gpt-5.4 (prefer models.dev provider row).
  const parts = modelId.split("/").filter((part) => part.length > 0);
  if (parts.length >= 3) {
    const nestedProvider = parts[1];
    if (nestedProvider && PREFERRED_PRICING_PROVIDER_IDS.has(nestedProvider)) {
      return resolveCanonicalModelId(parts.slice(1).join("/"));
    }
  }
  // ChatGPT product ids share OpenAI models.dev pricing rows.
  if (modelId.startsWith("chatgpt/")) {
    return `openai/${modelId.slice("chatgpt/".length)}`;
  }
  // models.dev publishes Moonshot Kimi under moonshotai/*; operator surface uses moonshot/*.
  if (modelId.startsWith("moonshot/kimi-")) {
    return `moonshotai/${modelId.slice("moonshot/".length)}`;
  }
  return resolveDeepseekCanonicalModelId(modelId) ?? modelId;
}

/**
 * Ordered candidate catalog ids to try when resolving models.dev pricing for a model.
 * Covers operator aliases, gateway nesting (anyapi/openai/…), and leaf remaps.
 */
export function collectPricingLookupIds(modelId: string): readonly string[] {
  const ids: string[] = [];
  const add = (value: string | null | undefined): void => {
    if (!value || ids.includes(value)) {
      return;
    }
    ids.push(value);
  };

  add(modelId);
  // An exact provider row is authoritative for that provider. Alias/canonical
  // lookup is fallback-only so a relay's explicit price is never overwritten.
  add(resolveCanonicalModelId(modelId));

  const parts = modelId.split("/").filter((part) => part.length > 0);
  for (let index = 1; index < parts.length; index += 1) {
    add(parts.slice(index).join("/"));
  }

  const leaf = parts.at(-1) ?? modelId;
  if (leaf.startsWith("kimi-")) {
    add(`moonshotai/${leaf}`);
    add(`moonshot/${leaf}`);
  }
  if (leaf.startsWith("deepseek-")) {
    add(`deepseek/${leaf}`);
  }
  // digitalocean/openai-gpt-5.4 → openai/gpt-5.4
  if (leaf.startsWith("openai-gpt-") || leaf.startsWith("openai-o")) {
    add(`openai/${leaf.replace(/^openai-/, "")}`);
  }
  if (leaf.startsWith("claude-")) {
    add(`anthropic/${leaf}`);
  }
  if (leaf.startsWith("gemini-")) {
    add(`google/${leaf}`);
  }
  if (leaf.startsWith("grok-")) {
    add(`xai/${leaf}`);
  }

  return ids;
}

function findPricedModelByLookupIds(
  catalog: NormalizedCatalog,
  lookupIds: readonly string[],
): NormalizedCatalogModel | null {
  for (const lookupId of lookupIds) {
    const model = catalog.models.find((entry) => entry.modelId === lookupId);
    if (model?.pricing) {
      return model;
    }
  }
  return null;
}

function findPricedModelByUniqueLeaf(
  catalog: NormalizedCatalog,
  modelId: string,
): NormalizedCatalogModel | null {
  const leaf = modelId.includes("/") ? (modelId.split("/").at(-1) ?? modelId) : modelId;
  if (!leaf || leaf.length < 3) {
    return null;
  }
  const matches = catalog.models.filter(
    (entry) =>
      entry.pricing != null && (entry.modelId === leaf || entry.modelId.endsWith(`/${leaf}`)),
  );
  if (matches.length === 1) {
    return matches[0] ?? null;
  }
  const preferred = matches.filter((entry) => PREFERRED_PRICING_PROVIDER_IDS.has(entry.providerId));
  if (preferred.length === 1) {
    return preferred[0] ?? null;
  }
  return null;
}

function findPricedCatalogModel(
  catalog: NormalizedCatalog,
  modelId: string,
): NormalizedCatalogModel | null {
  return (
    findPricedModelByLookupIds(catalog, collectPricingLookupIds(modelId)) ??
    findPricedModelByUniqueLeaf(catalog, modelId)
  );
}

/** Resolve models.dev pricing hints for a model id (including gateway / operator aliases). */
export function resolveCatalogPricingHints(input: {
  readonly modelId: string;
  readonly catalog: NormalizedCatalog;
  readonly isLocalEndpoint?: boolean;
}): PricingHints | null {
  const economics = resolveTokenEconomics({
    modelId: input.modelId,
    catalog: input.catalog,
    isLocalEndpoint: input.isLocalEndpoint ?? false,
  });
  if (
    economics.source !== "catalog" ||
    economics.inputPer1M == null ||
    economics.outputPer1M == null
  ) {
    return null;
  }
  return {
    inputPer1M: economics.inputPer1M,
    outputPer1M: economics.outputPer1M,
    currency: economics.currency ?? "USD",
  };
}

/**
 * Fill null pricing from models.dev rows via alias / gateway / leaf lookup.
 */
export function applyAliasedCatalogPricing(
  models: readonly NormalizedCatalogModel[],
): NormalizedCatalogModel[] {
  const catalog = {
    catalogVersion: "1" as const,
    source: models[0]?.upstreamProvenance ?? {
      vendor: "models.dev",
      commit: "unknown",
      capturedAt: new Date(0).toISOString(),
      schemaVersion: "models.dev.v1",
    },
    providers: [],
    models,
  };
  return models.map((model) => {
    if (model.pricing) {
      return model;
    }
    const priced = findPricedCatalogModel(catalog, model.modelId);
    if (!priced?.pricing || priced.modelId === model.modelId) {
      return model;
    }
    return {
      ...model,
      pricing: priced.pricing,
    };
  });
}

export function resolveTokenEconomics(input: {
  readonly modelId: string;
  readonly catalog: NormalizedCatalog;
  readonly isLocalEndpoint: boolean;
}): TokenEconomics {
  if (input.isLocalEndpoint) {
    return {
      canonicalModelId: input.modelId,
      inputPer1M: 0,
      outputPer1M: 0,
      source: "local-free",
      currency: "USD",
    };
  }

  const priced = findPricedCatalogModel(input.catalog, input.modelId);
  if (!priced?.pricing) {
    return {
      canonicalModelId: resolveCanonicalModelId(input.modelId),
      inputPer1M: null,
      outputPer1M: null,
      source: "unknown",
    };
  }

  return {
    canonicalModelId: priced.modelId,
    inputPer1M: priced.pricing.inputPer1M,
    outputPer1M: priced.pricing.outputPer1M,
    costDimensionsPer1M: priced.pricing.costDimensionsPer1M,
    source: "catalog",
    currency: priced.pricing.currency,
  };
}

export function estimateRequestCostUsd(input: {
  readonly economics: TokenEconomics;
  readonly contextTokens: number;
  readonly maxOutputTokens: number;
}): number | null {
  if (input.economics.source === "local-free") {
    return 0;
  }
  if (input.economics.inputPer1M == null || input.economics.outputPer1M == null) {
    return null;
  }

  const inputCost = (Math.max(0, input.contextTokens) / 1_000_000) * input.economics.inputPer1M;
  const outputCost = (Math.max(0, input.maxOutputTokens) / 1_000_000) * input.economics.outputPer1M;
  return inputCost + outputCost;
}

export function estimateCostPer1kTokens(input: {
  readonly economics: TokenEconomics;
  readonly contextTokens: number;
  readonly maxOutputTokens: number;
}): number | null {
  const totalTokens = Math.max(0, input.contextTokens) + Math.max(0, input.maxOutputTokens);
  if (totalTokens <= 0) {
    return null;
  }

  const requestUsd = estimateRequestCostUsd(input);
  if (requestUsd == null) {
    return null;
  }

  return (requestUsd / totalTokens) * 1000;
}

export function resolveRoutingCostEstimate(input: {
  readonly modelId: string;
  readonly catalog: NormalizedCatalog;
  readonly isLocalEndpoint: boolean;
  readonly contextTokens: number;
  readonly maxOutputTokens: number;
}): {
  readonly economics: TokenEconomics;
  readonly estimatedRequestUsd: number | null;
  readonly cost_per_1k_tokens_est: number | null;
} {
  const economics = resolveTokenEconomics({
    modelId: input.modelId,
    catalog: input.catalog,
    isLocalEndpoint: input.isLocalEndpoint,
  });
  const estimatedRequestUsd = estimateRequestCostUsd({
    economics,
    contextTokens: input.contextTokens,
    maxOutputTokens: input.maxOutputTokens,
  });
  const cost_per_1k_tokens_est = estimateCostPer1kTokens({
    economics,
    contextTokens: input.contextTokens,
    maxOutputTokens: input.maxOutputTokens,
  });

  return {
    economics,
    estimatedRequestUsd,
    cost_per_1k_tokens_est,
  };
}
