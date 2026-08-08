import type { DownstreamOpenAIDiscovery, DownstreamOpenAIModelRecord } from "../src/types.js";

export function createModelRecord(
  overrides: Partial<DownstreamOpenAIModelRecord> = {},
): DownstreamOpenAIModelRecord {
  return {
    id: "baseline.remote-only",
    object: "model",
    owned_by: "role-model",
    endpoint_ids: ["local"],
    type: "alias",
    routingMode: "hybrid",
    targetModelIds: ["openai/gpt-5-mini"],
    canonicalModelIds: ["openai/gpt-5-mini"],
    providerIds: ["openai"],
    limits: {
      safeContextWindow: 120000,
      safeMaxOutputTokens: 8000,
      maxContextWindow: 120000,
      maxOutputTokens: 8000,
    },
    modalities: {
      guaranteedInput: ["text"],
      availableInput: ["text"],
      conditionalInput: {},
      output: ["text"],
    },
    capabilities: {
      guaranteed: ["text.chat"],
      available: ["text.chat", "tools.function_calling"],
      conditional: {},
      tools: { functionCalling: true },
      reasoning: { supported: true, effortControl: true },
      structuredOutput: { supported: true },
      caching: { promptRead: null, promptWrite: null, source: "unknown" },
    },
    declared: { modelIds: ["openai/gpt-5-mini"], endpointIds: ["local"] },
    routable: { modelIds: ["openai/gpt-5-mini"], endpointIds: ["local"] },
    piMapping: { contextWindow: 120000, maxTokens: 8000 },
    sources: ["runtime"],
    ...overrides,
  };
}

export function createDiscovery(
  overrides: Partial<DownstreamOpenAIDiscovery> = {},
): DownstreamOpenAIDiscovery {
  return {
    contractVersion: "role-model.downstream.openai.v1",
    kind: "openai-compatible",
    providerId: "role-model-runtime",
    displayName: "Role-Model Runtime",
    baseUrl: "http://127.0.0.1:3456",
    endpoints: {
      health: "http://127.0.0.1:3456/healthz",
      models: "http://127.0.0.1:3456/v1/models",
      chatCompletions: "http://127.0.0.1:3456/v1/chat/completions",
      responses: "http://127.0.0.1:3456/v1/responses",
    },
    authentication: {
      type: "bearer",
      headerName: "Authorization",
      required: false,
      placeholderToken: "role-model-local",
      note: "placeholder only",
    },
    models: [createModelRecord()],
    setup: { recommendedModel: "baseline.remote-only", notes: ["Use discovery"] },
    freshness: {
      generatedAt: "2026-06-22T00:00:00Z",
      catalogVersion: "test",
      catalogCapturedAt: null,
      runtimeConfigHash: "test",
    },
    ...overrides,
  };
}

export function createDiscoveryResult(overrides: Partial<DownstreamOpenAIDiscovery> = {}) {
  return {
    discovery: createDiscovery(overrides),
    version: { version: "0.0.0-test" },
    health: { status: "healthy" },
    state: "ready" as const,
    warnings: [],
    providerRegistered: true,
    modelDiagnostics: [],
  };
}
