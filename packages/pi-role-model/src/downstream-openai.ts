import type {
  DownstreamOpenAIDiscovery,
  DownstreamOpenAIModelRecord,
  ProviderRegistration,
} from "./types.js";

function hasString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isModelRecord(value: unknown): value is DownstreamOpenAIModelRecord {
  const record = value as Partial<DownstreamOpenAIModelRecord>;
  return (
    typeof value === "object" &&
    value !== null &&
    hasString(record.id) &&
    record.object === "model" &&
    record.owned_by === "role-model" &&
    (record.type === "model" || record.type === "alias") &&
    typeof record.piMapping === "object" &&
    record.piMapping !== null
  );
}

export function validateDownstreamOpenAIDiscovery(value: unknown): DownstreamOpenAIDiscovery {
  const discovery = value as Partial<DownstreamOpenAIDiscovery>;
  if (
    typeof value !== "object" ||
    value === null ||
    discovery.contractVersion !== "role-model.downstream.openai.v1" ||
    discovery.kind !== "openai-compatible" ||
    discovery.providerId !== "role-model-runtime" ||
    !hasString(discovery.displayName) ||
    !hasString(discovery.baseUrl) ||
    !Array.isArray(discovery.models) ||
    discovery.models.length === 0 ||
    !discovery.models.every(isModelRecord) ||
    discovery.authentication?.type !== "bearer" ||
    !hasString(discovery.authentication.placeholderToken)
  ) {
    throw new Error("Role-Model downstream OpenAI discovery response is invalid.");
  }

  return discovery as DownstreamOpenAIDiscovery;
}

function appendOpenAIPath(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

function mapInput(model: DownstreamOpenAIModelRecord): ("text" | "image")[] {
  const available = model.modalities?.availableInput;
  if (Array.isArray(available) && available.includes("image")) {
    return ["text", "image"];
  }
  return ["text"];
}

export function mapDiscoveryToProviderConfig(discovery: DownstreamOpenAIDiscovery): ProviderRegistration {
  return {
    providerId: "role-model",
    recommendedModel: discovery.setup.recommendedModel,
    config: {
      name: discovery.displayName,
      baseUrl: appendOpenAIPath(discovery.baseUrl),
      apiKey: discovery.authentication.placeholderToken,
      api: "openai-completions",
      models: discovery.models.map((model) => ({
        id: model.id,
        name: model.id,
        input: mapInput(model),
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: model.piMapping.contextWindow ?? undefined,
        maxTokens: model.piMapping.maxTokens ?? undefined,
        reasoning: model.capabilities?.reasoning === true,
      })),
    },
  };
}
