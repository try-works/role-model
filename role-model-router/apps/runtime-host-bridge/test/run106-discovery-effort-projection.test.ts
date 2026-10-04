import { describe, expect, test } from "vitest";

import type { NormalizedCatalog, NormalizedCatalogModel } from "@role-model-router/catalog";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import { createDownstreamOpenAIDiscovery } from "../src/downstream-openai-discovery.js";

const source = {
  vendor: "models.dev",
  commit: "test",
  capturedAt: "2026-06-22T00:00:00.000Z",
  schemaVersion: "models.dev.v1",
};

function model(overrides: Partial<NormalizedCatalogModel> & { modelId: string }): NormalizedCatalogModel {
  return {
    modelId: overrides.modelId,
    providerId: overrides.providerId ?? overrides.modelId.split("/")[0] ?? "unknown",
    providerKind: overrides.providerKind ?? "provider-openai",
    authFamily: overrides.authFamily ?? "api-key",
    displayName: overrides.displayName ?? overrides.modelId,
    version: overrides.version ?? "test",
    capabilities: overrides.capabilities ?? ["text.chat"],
    modalities: overrides.modalities ?? ["text"],
    contextWindow: overrides.contextWindow ?? 1000,
    maxOutputTokens: overrides.maxOutputTokens ?? 1000,
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
    model({ modelId: "openai/gpt-5.4", providerId: "openai" }),
    model({ modelId: "deepseek/deepseek-v4-pro", providerId: "deepseek" }),
    model({ modelId: "deepseek/deepseek-v4-flash", providerId: "deepseek" }),
  ],
};

function endpoint(
  endpointId: string,
  modelId: string,
  reasoningEffort: string | null,
  declaredLevels?: readonly string[],
) {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: modelId,
      runtime_version: "1",
      region: "global",
      ...(reasoningEffort === null ? {} : { reasoning_effort: reasoningEffort }),
    },
    declared: {
      endpoint_id: endpointId,
      capabilities: ["text.chat"],
      modalities: ["text"],
      max_context_tokens: 1000,
      tool_calling: { supported: false, style: "openai" },
      supports_embeddings: false,
      ...(declaredLevels && declaredLevels.length > 0
        ? { reasoning_effort_levels: [...declaredLevels] }
        : {}),
    },
    status: "active",
  };
}

const registry = {
  endpoints: [
    endpoint("openai.gpt-5-4.low", "openai/gpt-5.4", "low"),
    endpoint("openai.gpt-5-4.max", "openai/gpt-5.4", "max"),
    endpoint("openai.gpt-5-4.default", "openai/gpt-5.4", null),
    endpoint("deepseek.pro.low", "deepseek/deepseek-v4-pro", "low"),
    endpoint("deepseek.pro.high", "deepseek/deepseek-v4-pro", "high"),
    endpoint("deepseek.flash.low", "deepseek/deepseek-v4-flash", "low"),
  ],
  diagnostics: [],
  lifecycleSummary: { active: 6, degraded: 0, offline: 0 },
} as unknown as EndpointRegistryResult;

describe("run106 discovery effort projection (R9 integration)", () => {
  test("publishes the pool-wide effort union and portable intersection", () => {
    const discovery = createDownstreamOpenAIDiscovery({
      baseUrl: "http://127.0.0.1:3456",
      catalog,
      registry,
    });

    // union = every named effort across models; intersection = efforts shared by every model.
    expect(discovery.effort).toEqual({
      union: ["high", "low", "max"],
      portableIntersection: ["low"],
    });
  });

  test("includes provider-default declared levels in the union/intersection", () => {
    const registryWithProviderDefaultLevels = {
      endpoints: [
        endpoint("openai.gpt-5-4.low", "openai/gpt-5.4", "low"),
        endpoint("openai.gpt-5-4.max", "openai/gpt-5.4", "max"),
        endpoint("openai.gpt-5-4.default", "openai/gpt-5.4", null, ["low", "medium"]),
        endpoint("deepseek.pro.low", "deepseek/deepseek-v4-pro", "low"),
        endpoint("deepseek.pro.high", "deepseek/deepseek-v4-pro", "high"),
        endpoint("deepseek.flash.low", "deepseek/deepseek-v4-flash", "low"),
      ],
      diagnostics: [],
      lifecycleSummary: { active: 6, degraded: 0, offline: 0 },
    } as unknown as EndpointRegistryResult;

    const discovery = createDownstreamOpenAIDiscovery({
      baseUrl: "http://127.0.0.1:3456",
      catalog,
      registry: registryWithProviderDefaultLevels,
    });

    expect(discovery.effort).toEqual({
      union: ["high", "low", "max", "medium"],
      portableIntersection: ["low"],
    });
  });
});
