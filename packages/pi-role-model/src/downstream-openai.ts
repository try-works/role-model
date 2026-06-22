import type {
  DownstreamOpenAIDiscovery,
  DownstreamOpenAIModelRecord,
  PiModelSelection,
  ProviderRegistration,
  RoleModelModelDiagnostic,
} from "./types.js";

export const CONSERVATIVE_CONTEXT_WINDOW = 8192;
export const CONSERVATIVE_MAX_TOKENS = 2048;

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
    discovery.authentication.required === true ||
    !hasString(discovery.authentication.placeholderToken)
  ) {
    if (discovery.authentication?.required === true) {
      throw new Error(
        "Role-Model downstream OpenAI discovery says auth is required; no supported Pi token source is configured.",
      );
    }
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
  const compactInput = (model as { input?: unknown }).input;
  if (Array.isArray(compactInput) && compactInput.includes("image")) {
    return ["text", "image"];
  }
  return ["text"];
}

function isReasoningSupported(model: DownstreamOpenAIModelRecord): boolean {
  const reasoning =
    typeof model.capabilities === "object" && model.capabilities !== null
      ? model.capabilities.reasoning
      : undefined;
  if (typeof reasoning === "boolean") return reasoning;
  if (typeof reasoning === "object" && reasoning !== null) return reasoning.supported === true;
  return false;
}

function resolveLimit(
  model: DownstreamOpenAIModelRecord,
  kind: "contextWindow" | "maxTokens",
): { value: number; reasons: string[] } {
  const piValue = model.piMapping[kind];
  if (typeof piValue === "number") {
    return { value: piValue, reasons: [] };
  }

  const safeValue =
    kind === "contextWindow" ? model.limits?.safeContextWindow : model.limits?.safeMaxOutputTokens;
  const reasons = [`missing piMapping.${kind}`];
  if (typeof safeValue === "number") {
    return { value: safeValue, reasons };
  }

  reasons.push(
    kind === "contextWindow"
      ? "using conservative context window default"
      : "using conservative max tokens default",
  );
  return {
    value: kind === "contextWindow" ? CONSERVATIVE_CONTEXT_WINDOW : CONSERVATIVE_MAX_TOKENS,
    reasons,
  };
}

export function createPiModelSelection(
  discovery: DownstreamOpenAIDiscovery,
  alias: string,
): PiModelSelection | undefined {
  const model = discovery.models.find((candidate) => candidate.id === alias);
  if (!model) return undefined;
  const contextWindow = resolveLimit(model, "contextWindow").value;
  const maxTokens = resolveLimit(model, "maxTokens").value;
  return {
    provider: "role-model",
    id: model.id,
    name: model.id,
    input: mapInput(model),
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow,
    maxTokens,
    reasoning: isReasoningSupported(model),
    api: "openai-completions",
    compat: { supportsDeveloperRole: false },
  };
}

export function mapDiscoveryToProviderConfig(
  discovery: DownstreamOpenAIDiscovery,
): ProviderRegistration {
  const modelDiagnostics: RoleModelModelDiagnostic[] = [];
  return {
    providerId: "role-model",
    recommendedModel: discovery.setup.recommendedModel,
    modelDiagnostics,
    config: {
      name: discovery.displayName,
      baseUrl: appendOpenAIPath(discovery.baseUrl),
      apiKey: discovery.authentication.placeholderToken,
      api: "openai-completions",
      models: discovery.models.map((model) => {
        const contextWindow = resolveLimit(model, "contextWindow");
        const maxTokens = resolveLimit(model, "maxTokens");
        const reasons = [...contextWindow.reasons, ...maxTokens.reasons];
        modelDiagnostics.push({
          id: model.id,
          degraded: reasons.length > 0,
          reasons,
        });
        return {
          id: model.id,
          name: model.id,
          input: mapInput(model),
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: contextWindow.value,
          maxTokens: maxTokens.value,
          reasoning: isReasoningSupported(model),
          compat: { supportsDeveloperRole: false },
        };
      }),
    },
  };
}
