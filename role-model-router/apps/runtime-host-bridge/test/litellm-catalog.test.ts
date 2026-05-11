import { describe, expect, test } from "vitest";

import {
  type LiteLLMProviderInfo,
  deriveLiteLLMProviders,
  extractLiteLLMProviderIds,
  loadLiteLLMModelPrices,
} from "@role-model-router/catalog";

describe("litellm-catalog", () => {
  test("extracts provider ids from LiteLLM model prices", () => {
    const modelPrices = {
      sample_spec: { litellm_provider: "openai" },
      "gpt-4": { litellm_provider: "openai", max_tokens: 8192 },
      "claude-3": { litellm_provider: "anthropic", max_tokens: 200000 },
      "kimi-k2.5": { litellm_provider: "moonshot", max_tokens: 262144 },
      "unknown-model": { max_tokens: 1000 },
    };

    const providerIds = extractLiteLLMProviderIds(modelPrices);

    expect(providerIds).toContain("openai");
    expect(providerIds).toContain("anthropic");
    expect(providerIds).toContain("moonshot");
    expect(providerIds).not.toContain("sample_spec");
    expect(providerIds).not.toContain("unknown-model");
    expect(providerIds).toHaveLength(3);
  });

  test("returns empty array for invalid input", () => {
    expect(extractLiteLLMProviderIds(null)).toEqual([]);
    expect(extractLiteLLMProviderIds(undefined)).toEqual([]);
    expect(extractLiteLLMProviderIds("string")).toEqual([]);
    expect(extractLiteLLMProviderIds(123)).toEqual([]);
  });

  test("derives provider info with known overrides", () => {
    const modelPrices = {
      "gpt-4": { litellm_provider: "openai" },
      "claude-3": { litellm_provider: "anthropic" },
    };

    const providers = deriveLiteLLMProviders(modelPrices);

    const openai = providers.find((p) => p.providerId === "openai");
    expect(openai).toBeDefined();
    expect(openai?.displayName).toBe("OpenAI");
    expect(openai?.providerKind).toBe("provider-openai");
    expect(openai?.adapterFamily).toBe("ai-sdk-openai");
    expect(openai?.apiBase).toBe("https://api.openai.com/v1");
    expect(openai?.envVars).toContain("OPENAI_API_KEY");

    const anthropic = providers.find((p) => p.providerId === "anthropic");
    expect(anthropic).toBeDefined();
    expect(anthropic?.displayName).toBe("Anthropic");
    expect(anthropic?.providerKind).toBe("provider-anthropic");
  });

  test("derives provider info with inferred defaults for unknown providers", () => {
    const modelPrices = {
      "custom-model": { litellm_provider: "acme_ai" },
    };

    const providers = deriveLiteLLMProviders(modelPrices);

    expect(providers).toHaveLength(1);
    const acme = providers[0];
    expect(acme.providerId).toBe("acme_ai");
    expect(acme.displayName).toBe("Acme Ai");
    expect(acme.providerKind).toBe("provider-openai");
    expect(acme.authFamily).toBe("api-key");
    expect(acme.adapterFamily).toBe("ai-sdk-openai-compatible");
    expect(acme.envVars).toEqual(["ACME_AI_API_KEY"]);
  });

  test("loads real LiteLLM model prices from testdata", async () => {
    // loadLiteLLMModelPrices already imported statically above
    const repoRoot = process
      .cwd()
      .replace(/\\role-model-router[\\/]apps[\\/]runtime-host-bridge$/, "");

    const modelPrices = await loadLiteLLMModelPrices(repoRoot);

    expect(modelPrices).not.toBeNull();
    if (modelPrices) {
      const providerIds = extractLiteLLMProviderIds(modelPrices);
      expect(providerIds.length).toBeGreaterThan(10);
      expect(providerIds).toContain("openai");
      expect(providerIds).toContain("anthropic");
      expect(providerIds).toContain("bedrock");
      expect(providerIds).toContain("mistral");
      expect(providerIds).toContain("groq");
    }
  });
});
