import { describe, expect, test } from "vitest";
import {
  mapDiscoveryToProviderConfig,
  validateDownstreamOpenAIDiscovery,
} from "../src/downstream-openai.js";
import type { DownstreamOpenAIDiscovery } from "../src/types.js";

const discovery: DownstreamOpenAIDiscovery = {
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
  models: [
    {
      id: "role-model/auto",
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
        conditionalInput: [],
        output: ["text"],
      },
      capabilities: { tools: true, reasoning: true, structuredOutput: true },
      piMapping: { contextWindow: 120000, maxTokens: 8000 },
      sources: ["runtime"],
    },
  ],
  setup: { recommendedModel: "role-model/auto", notes: ["Use discovery"] },
  freshness: {
    generatedAt: "2026-06-22T00:00:00Z",
    catalogVersion: "test",
    catalogCapturedAt: null,
    runtimeConfigHash: "test",
  },
};

describe("downstream OpenAI discovery mapping", () => {
  test("validates the current Role-Model downstream discovery contract", () => {
    expect(validateDownstreamOpenAIDiscovery(discovery)).toEqual(discovery);
  });

  test("maps discovery to a Pi provider config without inventing credentials", () => {
    const provider = mapDiscoveryToProviderConfig(discovery);

    expect(provider.providerId).toBe("role-model");
    expect(provider.config.name).toBe("Role-Model Runtime");
    expect(provider.config.baseUrl).toBe("http://127.0.0.1:3456/v1");
    expect(provider.config.api).toBe("openai-completions");
    expect(provider.config.apiKey).toBe("role-model-local");
    expect(provider.config.models).toEqual([
      expect.objectContaining({
        id: "role-model/auto",
        contextWindow: 120000,
        maxTokens: 8000,
      }),
    ]);
  });

  test("maps every model with fields required by Pi list-models", () => {
    const provider = mapDiscoveryToProviderConfig(discovery);

    expect(provider.config.models[0]).toEqual(
      expect.objectContaining({
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        reasoning: true,
        contextWindow: 120000,
        maxTokens: 8000,
      }),
    );
  });
});
