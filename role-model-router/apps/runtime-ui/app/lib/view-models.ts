import type {
  RuntimeAccount,
  RuntimeDownstreamOpenAIProviderConfig,
  RuntimeModelRecord,
  RuntimeProvider,
  RuntimeSummary,
} from "./runtime-api";

function toTitleLabel(modelId: string): string {
  const raw = modelId.includes("/") ? modelId.split("/").at(-1) ?? modelId : modelId;
  return raw
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.toLowerCase() === "gpt") {
        return "GPT";
      }
      if (/^k\d/i.test(part)) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export function buildProviderCards(
  providers: readonly RuntimeProvider[],
  accounts: readonly RuntimeAccount[],
): Array<{
  providerId: string;
  title: string;
  accountCount: number;
  variants: Array<{
    variantId: string;
    label: string;
    authMode: string;
    availability: string;
  }>;
}> {
  return providers.map((provider) => ({
    providerId: provider.providerId,
    title: provider.displayName,
    accountCount: accounts.filter((account) => account.providerId === provider.providerId).length,
    variants: (provider.variants ?? []).map((variant) => ({
      variantId: variant.variantId,
      label: variant.label,
      authMode: variant.authMode,
      availability: variant.availability,
    })),
  }));
}

export function summarizeRuntimeStats(
  summary: Pick<RuntimeSummary, "providerCount" | "accountCount" | "endpointCount">,
): Array<{ label: string; value: string }> {
  return [
    { label: "Providers", value: String(summary.providerCount) },
    { label: "Accounts", value: String(summary.accountCount) },
    { label: "Endpoints", value: String(summary.endpointCount) },
  ];
}

export function buildWorkbenchModelOptions(
  models: ReadonlyArray<
    Pick<RuntimeModelRecord, "id"> & Partial<Pick<RuntimeModelRecord, "endpoint_ids">>
  >,
): Array<{ label: string; value: string }> {
  return [...new Set(models.map((model) => model.id))]
    .sort((left, right) => left.localeCompare(right))
    .map((modelId) => ({
      label: toTitleLabel(modelId),
      value: modelId,
    }));
}

export function buildDownstreamProviderGuide(
  provider: RuntimeDownstreamOpenAIProviderConfig,
): {
  connectionRows: Array<{ label: string; value: string }>;
  availableModels: string[];
  opencodeSteps: string[];
  examples: {
    modelsCurl: string;
    chatCurl: string;
  };
} {
  const recommendedModel = provider.setup.recommendedModel ?? provider.models[0]?.id ?? "model-id";
  const placeholderToken = provider.authentication.placeholderToken;

  return {
    connectionRows: [
      { label: "Provider type", value: "OpenAI-compatible" },
      { label: "Base URL", value: provider.baseUrl },
      { label: "Models endpoint", value: provider.endpoints.models },
      { label: "Chat endpoint", value: provider.endpoints.chatCompletions },
      { label: "Auth header", value: `${provider.authentication.headerName}: Bearer ${placeholderToken}` },
    ],
    availableModels: provider.models.map((model) => model.id),
    opencodeSteps: [
      "Choose an OpenAI-compatible provider entry in the downstream client.",
      `Set the base URL to ${provider.baseUrl}.`,
      `If the client requires an API key, use ${placeholderToken} as the bearer token.`,
      `Select a model returned by ${provider.endpoints.models}.`,
    ],
    examples: {
      modelsCurl: `curl ${provider.endpoints.models}`,
      chatCurl: `curl ${provider.endpoints.chatCompletions} -H "content-type: application/json" -H "${provider.authentication.headerName}: Bearer ${placeholderToken}" -d '{"model":"${recommendedModel}","messages":[{"role":"user","content":"Reply with ok."}]}'`,
    },
  };
}
