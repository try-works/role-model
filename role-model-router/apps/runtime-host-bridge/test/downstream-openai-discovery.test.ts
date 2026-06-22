import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import type { NormalizedCatalog, NormalizedCatalogModel } from "@role-model-router/catalog";

import { createDownstreamOpenAIDiscovery } from "../src/downstream-openai-discovery.js";
import { buildRoutableInventory } from "../src/routable-inventory.js";

const source = {
  vendor: "models.dev",
  commit: "test",
  capturedAt: "2026-06-22T00:00:00.000Z",
  schemaVersion: "models.dev.v1",
};

function model(
  overrides: Partial<NormalizedCatalogModel> & { modelId: string },
): NormalizedCatalogModel {
  return {
    modelId: overrides.modelId,
    providerId: overrides.providerId ?? overrides.modelId.split("/")[0] ?? "unknown",
    providerKind: overrides.providerKind ?? "provider-openai",
    authFamily: overrides.authFamily ?? "api-key",
    displayName: overrides.displayName ?? overrides.modelId,
    version: overrides.version ?? "test",
    capabilities: overrides.capabilities ?? ["text.chat"],
    modalities: overrides.modalities ?? ["text"],
    contextWindow: overrides.contextWindow ?? 0,
    maxOutputTokens: overrides.maxOutputTokens ?? 0,
    pricing: null,
    requestShapeHints: null,
    experimentalModes: [],
    extendsProvenance: { baseModelId: null, chain: [] },
    localOverrideApplied: false,
    localNotes: [],
    upstreamProvenance: source,
  };
}

const catalog: NormalizedCatalog = {
  catalogVersion: "1",
  source,
  providers: [],
  models: [
    model({
      modelId: "openai/gpt-5.4",
      providerId: "openai",
      capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
      modalities: ["image", "text"],
      contextWindow: 1_050_000,
      maxOutputTokens: 128_000,
    }),
    model({
      modelId: "deepseek/deepseek-v4-flash",
      providerId: "deepseek",
      capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
      modalities: ["text"],
      contextWindow: 1_000_000,
      maxOutputTokens: 384_000,
    }),
    model({
      modelId: "deepseek/deepseek-v4-pro",
      providerId: "deepseek",
      capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
      modalities: ["text"],
      contextWindow: 1_000_000,
      maxOutputTokens: 384_000,
    }),
    model({
      modelId: "moonshot/kimi-k2.7-code",
      providerId: "moonshot",
      capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
      modalities: ["text", "image", "video"],
      contextWindow: 262_144,
      maxOutputTokens: 262_144,
    }),
  ],
};

const registry = {
  endpoints: [
    endpoint("openai.personal.codex.global.gpt-5-4", "chatgpt/gpt-5.4", ["text", "image"]),
    endpoint("deepseek.personal.primary.global.deepseek-v4-flash", "deepseek/deepseek-v4-flash", [
      "text",
    ]),
    endpoint("deepseek.personal.primary.global.deepseek-v4-pro", "deepseek/deepseek-v4-pro", [
      "text",
    ]),
    endpoint("moonshot.personal.kimi-code.global.kimi-k2-7-code", "moonshot/kimi-k2.7-code", [
      "text",
      "image",
      "video",
    ]),
  ],
  diagnostics: [],
  lifecycleSummary: { active: 4, degraded: 0, offline: 0 },
} as unknown as EndpointRegistryResult;

function endpoint(endpointId: string, modelId: string, modalities: readonly string[]) {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: modelId,
      runtime_version: "1",
      region: "global",
    },
    declared: {
      endpoint_id: endpointId,
      capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
      modalities,
      max_context_tokens: 1,
      tool_calling: { supported: true, style: "openai" },
      supports_embeddings: false,
    },
    status: "active",
  };
}

const sources = {
  cloud: registry.endpoints.map((entry) => ({
    endpointId: entry.identity.endpoint_id,
    providerAccountId: entry.identity.endpoint_id.split(".").slice(0, 3).join("."),
    modelId: entry.identity.model_id,
    region: "global",
    endpointKind: "remote-openai-compatible",
    servingSource: "remote-service",
    lifecycleState: "active",
    healthStatus: "healthy",
  })),
  local: [],
};

describe("createDownstreamOpenAIDiscovery", () => {
  test("exposes rich, sanitized alias capabilities for hybrid.hybrid", () => {
    const discovery = createDownstreamOpenAIDiscovery({
      baseUrl: "http://127.0.0.1:3456",
      catalog,
      registry,
      inventory: buildRoutableInventory(registry, sources),
      modelAliases: [
        {
          aliasId: "hybrid.hybrid",
          mode: "hybrid",
          modelIds: [
            "chatgpt/gpt-5.4",
            "deepseek/deepseek-v4-flash",
            "deepseek/deepseek-v4-pro",
            "moonshot/kimi-k2.7-code",
          ],
        },
        {
          aliasId: "baseline.remote-only",
          mode: "basic",
          modelIds: ["chatgpt/gpt-5.4"],
        },
      ],
    });

    expect(discovery.contractVersion).toBe("role-model.downstream.openai.v1");
    expect(discovery.freshness.runtimeInventoryRevision).toEqual(expect.any(String));
    expect(discovery.models.map((entry) => entry.id)).toEqual(
      expect.arrayContaining(["hybrid.hybrid", "baseline.remote-only", "chatgpt/gpt-5.4"]),
    );

    const alias = discovery.models.find((entry) => entry.id === "hybrid.hybrid");
    expect(alias).toMatchObject({
      type: "alias",
      routingMode: "hybrid",
      limits: {
        safeContextWindow: 262_144,
        safeMaxOutputTokens: 128_000,
        maxContextWindow: 1_050_000,
        maxOutputTokens: 384_000,
      },
      modalities: {
        guaranteedInput: ["text"],
        availableInput: expect.arrayContaining(["text", "image", "video"]),
      },
      piMapping: {
        contextWindow: 262_144,
        maxTokens: 128_000,
      },
    });
    expect(alias?.modalities.conditionalInput.image.targetModelIds).toEqual(
      expect.arrayContaining(["chatgpt/gpt-5.4", "moonshot/kimi-k2.7-code"]),
    );
    expect(alias?.modalities.conditionalInput.video.targetModelIds).toEqual([
      "moonshot/kimi-k2.7-code",
    ]);
    expect(alias?.capabilities.available).toEqual(
      expect.arrayContaining(["tools.function_calling", "structured.output", "reasoning"]),
    );
    expect(alias?.declared).toBeDefined();
    expect(alias?.routable).toBeDefined();
    expect(JSON.stringify(discovery)).not.toMatch(/api[_-]?key|credentialRef|C:\\\\|D:\\\\/i);
  });

  test("keeps every configured alias visible even when its current routable pool is empty", () => {
    const discovery = createDownstreamOpenAIDiscovery({
      baseUrl: "http://127.0.0.1:3456",
      catalog,
      registry,
      inventory: buildRoutableInventory(registry, sources),
      modelAliases: [
        {
          aliasId: "catalog-only.openai",
          mode: "basic",
          modelIds: ["openai/gpt-5.4"],
        },
      ],
    });

    const alias = discovery.models.find((entry) => entry.id === "catalog-only.openai");
    expect(alias).toMatchObject({
      id: "catalog-only.openai",
      type: "alias",
      targetModelIds: ["openai/gpt-5.4"],
      endpoint_ids: [],
      declared: {
        modelIds: ["openai/gpt-5.4"],
        endpointIds: [],
      },
      routable: {
        modelIds: [],
        endpointIds: [],
      },
      limits: {
        safeContextWindow: 1_050_000,
        safeMaxOutputTokens: 128_000,
      },
      modalities: {
        availableInput: expect.arrayContaining(["text", "image"]),
      },
    });
  });
});
