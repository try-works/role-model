import { describe, expect, test } from "vitest";

import type { NormalizedCatalog, NormalizedCatalogModel } from "@role-model-router/catalog";

import { resolveModelCapabilityProfile } from "../src/model-capability-resolver.js";

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
    pricing: overrides.pricing ?? null,
    requestShapeHints: overrides.requestShapeHints ?? null,
    experimentalModes: overrides.experimentalModes ?? [],
    extendsProvenance: overrides.extendsProvenance ?? { baseModelId: null, chain: [] },
    localOverrideApplied: overrides.localOverrideApplied ?? false,
    localNotes: overrides.localNotes ?? [],
    upstreamProvenance: overrides.upstreamProvenance ?? source,
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
      modalities: ["image", "pdf", "text"],
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
      modelId: "moonshot/kimi-k2.7-code",
      providerId: "moonshot",
      capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
      modalities: ["text", "image", "video"],
      contextWindow: 262_144,
      maxOutputTokens: 262_144,
    }),
    model({
      modelId: "moonshot/kimi-k3",
      providerId: "moonshot",
      capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
      modalities: ["text", "image", "video"],
      contextWindow: 1_048_576,
      maxOutputTokens: 131_072,
      pricing: null,
    }),
    model({
      modelId: "moonshotai/kimi-k3",
      providerId: "moonshotai",
      displayName: "Kimi K3",
      capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
      modalities: ["text", "image", "video"],
      contextWindow: 1_048_576,
      maxOutputTokens: 131_072,
      pricing: {
        inputPer1M: 3,
        outputPer1M: 15,
        currency: "USD",
      },
    }),
    model({
      modelId: "moonshotai/kimi-k2.7-code",
      providerId: "moonshotai",
      pricing: {
        inputPer1M: 0.95,
        outputPer1M: 4,
        currency: "USD",
      },
    }),
  ],
};

describe("resolveModelCapabilityProfile", () => {
  test("resolves chatgpt runtime model ids through canonical OpenAI metadata", () => {
    const profile = resolveModelCapabilityProfile({
      modelId: "chatgpt/gpt-5.4",
      catalog,
    });

    expect(profile.modelId).toBe("chatgpt/gpt-5.4");
    expect(profile.canonicalModelId).toBe("openai/gpt-5.4");
    expect(profile.providerId).toBe("openai");
    expect(profile.limits.contextWindow).toBe(1_050_000);
    expect(profile.limits.maxOutputTokens).toBe(128_000);
    expect(profile.inputModalities).toEqual(expect.arrayContaining(["text", "image"]));
    expect(profile.outputModalities).toContain("text");
    expect(profile.capabilities).toEqual(
      expect.arrayContaining([
        "text.chat",
        "tools.function_calling",
        "reasoning",
        "structured.output",
      ]),
    );
    expect(profile.sources.limits).toBe("catalog:openai/gpt-5.4");
  });

  test("keeps DeepSeek text-only and Kimi image/video metadata distinct", () => {
    const deepseek = resolveModelCapabilityProfile({
      modelId: "deepseek/deepseek-v4-flash",
      catalog,
    });
    const kimi = resolveModelCapabilityProfile({
      modelId: "moonshot/kimi-k2.7-code",
      catalog,
    });

    expect(deepseek.inputModalities).toEqual(["text"]);
    expect(deepseek.limits.maxOutputTokens).toBe(384_000);
    expect(kimi.inputModalities).toEqual(expect.arrayContaining(["text", "image", "video"]));
    expect(kimi.limits.contextWindow).toBe(262_144);
    expect(kimi.limits.maxOutputTokens).toBe(262_144);
  });

  test("marks unknown model metadata explicitly instead of converting unknown limits to zero", () => {
    const profile = resolveModelCapabilityProfile({
      modelId: "unknown/provider-model",
      catalog,
    });

    expect(profile.canonicalModelId).toBeNull();
    expect(profile.limits.contextWindow).toBeNull();
    expect(profile.limits.maxOutputTokens).toBeNull();
    expect(profile.unknown).toEqual(
      expect.arrayContaining(["limits", "modalities", "capabilities"]),
    );
  });

  test("fills moonshot/kimi pricing from models.dev moonshotai rows", () => {
    const kimiK3 = resolveModelCapabilityProfile({
      modelId: "moonshot/kimi-k3",
      catalog,
    });
    const kimiCode = resolveModelCapabilityProfile({
      modelId: "moonshot/kimi-k2.7-code",
      catalog,
    });

    expect(kimiK3.pricing).toEqual({
      inputPer1M: 3,
      outputPer1M: 15,
      currency: "USD",
    });
    expect(kimiCode.pricing).toEqual({
      inputPer1M: 0.95,
      outputPer1M: 4,
      currency: "USD",
    });
  });
});
