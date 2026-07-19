import type { NormalizedCatalog } from "./index.js";

export type TokenEconomicsSource = "catalog" | "local-free" | "unknown";

export interface TokenEconomics {
  readonly canonicalModelId: string;
  readonly inputPer1M: number | null;
  readonly outputPer1M: number | null;
  readonly cacheReadInputPer1M?: number | null;
  readonly cacheWriteInputPer1M?: number | null;
  readonly source: TokenEconomicsSource;
  readonly currency?: string;
}

/** Operator model ids mapped to models.dev-aligned catalog rows for pricing lookup. */
export const CANONICAL_MODEL_ID_ALIASES: Readonly<Record<string, string>> = {
  "moonshot/kimi-k2.6": "moonshotai/kimi-k2.6",
  "moonshot/kimi-k2.7-code": "moonshotai/kimi-k2.7-code",
  "moonshot/kimi-k3": "moonshotai/kimi-k3",
};

/** Catalog provider ids used for metadata/pricing only — hidden from operator picker. */
export const OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS: Readonly<Set<string>> = new Set(["moonshotai"]);

export function resolveCanonicalModelId(modelId: string): string {
  return CANONICAL_MODEL_ID_ALIASES[modelId] ?? modelId;
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

  const canonicalModelId = resolveCanonicalModelId(input.modelId);
  const model =
    input.catalog.models.find((entry) => entry.modelId === canonicalModelId) ??
    input.catalog.models.find((entry) => entry.modelId === input.modelId);

  if (!model?.pricing) {
    return {
      canonicalModelId,
      inputPer1M: null,
      outputPer1M: null,
      source: "unknown",
    };
  }

  return {
    canonicalModelId,
    inputPer1M: model.pricing.inputPer1M,
    outputPer1M: model.pricing.outputPer1M,
    source: "catalog",
    currency: model.pricing.currency,
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
