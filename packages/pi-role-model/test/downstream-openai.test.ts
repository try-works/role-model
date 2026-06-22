import { describe, expect, test } from "vitest";
import {
  mapDiscoveryToProviderConfig,
  validateDownstreamOpenAIDiscovery,
} from "../src/downstream-openai.js";
import type { DownstreamOpenAIDiscovery } from "../src/types.js";
import { createDiscovery, createModelRecord } from "./fixtures.js";

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
        compat: expect.objectContaining({
          supportsDeveloperRole: false,
        }),
      }),
    );
  });

  test("fails closed when the runtime says bearer auth is required", () => {
    expect(() =>
      validateDownstreamOpenAIDiscovery(
        createDiscovery({
          authentication: {
            type: "bearer",
            headerName: "Authorization",
            required: true,
            placeholderToken: "secret-placeholder",
            note: "auth required",
          },
        }),
      ),
    ).toThrow(/auth.*required/i);
  });

  test("falls back from missing piMapping to safe limits and marks degraded records", () => {
    const provider = mapDiscoveryToProviderConfig(
      createDiscovery({
        models: [
          createModelRecord({
            piMapping: { contextWindow: null, maxTokens: null },
            limits: {
              safeContextWindow: 64000,
              safeMaxOutputTokens: 2048,
              maxContextWindow: 128000,
              maxOutputTokens: 4096,
            },
          }),
        ],
      }),
    );

    expect(provider.config.models[0]).toEqual(
      expect.objectContaining({
        contextWindow: 64000,
        maxTokens: 2048,
      }),
    );
    expect(provider.modelDiagnostics).toEqual([
      expect.objectContaining({
        id: "role-model/auto",
        degraded: true,
        reasons: expect.arrayContaining(["missing piMapping.contextWindow", "missing piMapping.maxTokens"]),
      }),
    ]);
  });

  test("uses explicit conservative defaults only when no Role-Model limits are available", () => {
    const provider = mapDiscoveryToProviderConfig(
      createDiscovery({
        models: [
          createModelRecord({
            piMapping: { contextWindow: null, maxTokens: null },
            limits: {
              safeContextWindow: null,
              safeMaxOutputTokens: null,
              maxContextWindow: null,
              maxOutputTokens: null,
            },
          }),
        ],
      }),
    );

    expect(provider.config.models[0]).toEqual(
      expect.objectContaining({
        contextWindow: 8192,
        maxTokens: 2048,
      }),
    );
    expect(provider.modelDiagnostics[0]?.reasons).toEqual(
      expect.arrayContaining(["using conservative context window default", "using conservative max tokens default"]),
    );
  });

  test("maps rich reasoning and image modality shapes without leaking diagnostics into Pi model config", () => {
    const provider = mapDiscoveryToProviderConfig(
      createDiscovery({
        models: [
          createModelRecord({
            modalities: {
              guaranteedInput: ["text"],
              availableInput: ["text", "image"],
              conditionalInput: {},
              output: ["text"],
            },
            capabilities: {
              guaranteed: [],
              available: [],
              conditional: {},
              tools: { functionCalling: false },
              reasoning: { supported: true, effortControl: false },
              structuredOutput: { supported: false },
              caching: { promptRead: null, promptWrite: null, source: "unknown" },
            },
          }),
        ],
      }),
    );

    expect(provider.config.models[0]).toEqual(
      expect.objectContaining({
        input: ["text", "image"],
        reasoning: true,
      }),
    );
    expect(provider.config.models[0]).not.toHaveProperty("degraded");
    expect(provider.config.models[0]).not.toHaveProperty("reasons");
  });
});
