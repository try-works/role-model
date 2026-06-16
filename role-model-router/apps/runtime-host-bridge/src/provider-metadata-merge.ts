import type { LiteLLMProviderInfo, NormalizedCatalog } from "@role-model-router/catalog";

export const HISTORICALLY_BROKEN_OVERLAP_PROVIDER_IDS = [
  "baseten",
  "cerebras",
  "cohere",
  "databricks",
  "deepinfra",
  "deepseek",
  "groq",
  "minimax",
  "mistral",
  "morph",
  "nebius",
  "openrouter",
  "ovhcloud",
  "perplexity",
  "sarvam",
  "v0",
  "wandb",
  "xai",
  "zai",
] as const;

export const ALIGNED_OVERLAP_PROVIDER_IDS = ["openai", "anthropic", "moonshot", "azure"] as const;

type CatalogProvider = NormalizedCatalog["providers"][number];

export type OperatorProviderMetadata = Pick<
  CatalogProvider,
  "providerId" | "providerKind" | "adapterFamily" | "apiBase"
>;

export function resolveValidationProviderMetadata(input: {
  readonly catalogProvider: CatalogProvider;
  readonly liteLLMProvider?: LiteLLMProviderInfo;
}): OperatorProviderMetadata {
  const liteLLMProvider = input.liteLLMProvider;
  if (!liteLLMProvider) {
    return {
      providerId: input.catalogProvider.providerId,
      providerKind: input.catalogProvider.providerKind,
      adapterFamily: input.catalogProvider.adapterFamily,
      apiBase: input.catalogProvider.apiBase,
    };
  }

  return {
    providerId: input.catalogProvider.providerId,
    providerKind: liteLLMProvider.providerKind,
    adapterFamily: liteLLMProvider.adapterFamily || input.catalogProvider.adapterFamily,
    apiBase: liteLLMProvider.apiBase || input.catalogProvider.apiBase,
  };
}

export function resolveLegacyListProvidersMetadata(
  catalogProvider: CatalogProvider,
): OperatorProviderMetadata {
  return {
    providerId: catalogProvider.providerId,
    providerKind: catalogProvider.providerKind,
    adapterFamily: catalogProvider.adapterFamily,
    apiBase: catalogProvider.apiBase,
  };
}

export function listOverlapProviderKindMismatches(input: {
  readonly catalogProviders: readonly CatalogProvider[];
  readonly liteLLMProviders: readonly LiteLLMProviderInfo[];
  readonly resolveOperatorMetadata?: (input: {
    readonly catalogProvider: CatalogProvider;
    readonly liteLLMProvider?: LiteLLMProviderInfo;
  }) => OperatorProviderMetadata;
}): readonly {
  providerId: string;
  operatorKind: string;
  validationKind: string;
}[] {
  const liteLLMById = new Map(
    input.liteLLMProviders.map((provider) => [provider.providerId, provider]),
  );
  const resolveOperatorMetadata =
    input.resolveOperatorMetadata ?? resolveValidationProviderMetadata;
  const mismatches: Array<{
    providerId: string;
    operatorKind: string;
    validationKind: string;
  }> = [];

  for (const catalogProvider of input.catalogProviders) {
    const liteLLMProvider = liteLLMById.get(catalogProvider.providerId);
    if (!liteLLMProvider) {
      continue;
    }
    const operatorMetadata = resolveOperatorMetadata({ catalogProvider, liteLLMProvider });
    const validationMetadata = resolveValidationProviderMetadata({
      catalogProvider,
      liteLLMProvider,
    });
    if (operatorMetadata.providerKind !== validationMetadata.providerKind) {
      mismatches.push({
        providerId: catalogProvider.providerId,
        operatorKind: operatorMetadata.providerKind,
        validationKind: validationMetadata.providerKind,
      });
    }
  }

  return mismatches.sort((left, right) => left.providerId.localeCompare(right.providerId));
}
