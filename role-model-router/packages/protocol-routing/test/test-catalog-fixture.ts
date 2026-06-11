import type { NormalizedCatalog } from "@role-model-router/catalog";

const TEST_CATALOG_SOURCE = {
  vendor: "test",
  commit: "test",
  capturedAt: "2026-01-01T00:00:00.000Z",
  schemaVersion: "1",
} as const;

export const TEST_CATALOG: NormalizedCatalog = {
  catalogVersion: "1",
  source: TEST_CATALOG_SOURCE,
  providers: [],
  models: [
    {
      modelId: "openai/gpt-4.1-mini-fast",
      providerId: "openai",
      providerKind: "provider-openai",
      authFamily: "api-key",
      displayName: "GPT-4.1 Mini Fast",
      version: "test",
      capabilities: ["code.edit", "tools.function_calling"],
      modalities: ["text"],
      contextWindow: 32768,
      maxOutputTokens: 4096,
      pricing: {
        inputPer1M: 0.4,
        outputPer1M: 1.6,
        currency: "USD",
      },
      requestShapeHints: null,
      experimentalModes: [],
      extendsProvenance: { baseModelId: null, chain: [] },
      localOverrideApplied: false,
      localNotes: [],
      upstreamProvenance: TEST_CATALOG_SOURCE,
    },
    {
      modelId: "moonshotai/kimi-k2.6",
      providerId: "moonshotai",
      providerKind: "provider-moonshotai",
      authFamily: "api-key",
      displayName: "Kimi K2.6",
      version: "test",
      capabilities: ["text.chat", "tools.function_calling"],
      modalities: ["text"],
      contextWindow: 262144,
      maxOutputTokens: 16384,
      pricing: {
        inputPer1M: 0.95,
        outputPer1M: 4,
        currency: "USD",
      },
      requestShapeHints: null,
      experimentalModes: [],
      extendsProvenance: { baseModelId: null, chain: [] },
      localOverrideApplied: false,
      localNotes: [],
      upstreamProvenance: TEST_CATALOG_SOURCE,
    },
  ],
};
