import { describe, expect, test } from "vitest";

import {
  type CatalogSnapshot,
  hydrateNormalizedCatalog,
  normalizeCatalogSnapshot,
  resolveReasoningEffortLevels,
  serializeNormalizedCatalog,
} from "../src/index.js";
import {
  buildCatalogSnapshotFromModelsDev,
  captureModelsDevFirstPartySource,
} from "../src/refresh.js";

const source = {
  vendor: "models.dev",
  commit: "run91-test-commit",
  capturedAt: "2026-08-15T00:00:00Z",
  schemaVersion: "models.dev.v1",
};

const provider = {
  providerId: "deepseek",
  displayName: "DeepSeek",
  npmPackage: "@ai-sdk/openai-compatible",
  apiBase: "https://api.deepseek.com",
  envVars: ["DEEPSEEK_API_KEY"],
  adapterFamilyHint: "ai-sdk-openai-compatible",
};

describe("Run 91 catalog reasoning metadata", () => {
  test("ingests effort options without losing opaque ordering or boolean reasoning", () => {
    const snapshot: CatalogSnapshot = {
      source,
      providers: [provider],
      models: [
        {
          modelId: "deepseek/deepseek-v4-pro",
          providerId: "deepseek",
          displayName: "DeepSeek V4 Pro",
          capabilities: ["text.chat", "reasoning"],
          reasoningOptions: [
            { type: "effort", values: ["low", "future.vendor-token", "MAX"] },
            { type: "toggle" },
          ],
        },
      ],
    };

    const model = normalizeCatalogSnapshot(snapshot).models[0];

    expect(model?.capabilities).toContain("reasoning");
    expect(model?.reasoningEffortLevels).toEqual(["low", "future.vendor-token", "MAX"]);
    expect(model?.reasoningOptionKinds).toEqual(["effort", "toggle"]);
  });

  test("keeps missing, empty, and toggle-only options valid without inventing levels", () => {
    const snapshot: CatalogSnapshot = {
      source,
      providers: [provider],
      models: [
        {
          modelId: "deepseek/missing",
          providerId: "deepseek",
          displayName: "Missing",
          capabilities: ["reasoning"],
        },
        {
          modelId: "deepseek/empty",
          providerId: "deepseek",
          displayName: "Empty",
          capabilities: ["reasoning"],
          reasoningOptions: [],
        },
        {
          modelId: "deepseek/toggle",
          providerId: "deepseek",
          displayName: "Toggle",
          capabilities: ["reasoning"],
          reasoningOptions: [{ type: "toggle" }],
        },
      ],
    };

    const models = normalizeCatalogSnapshot(snapshot).models;

    expect(models.map((model) => model.reasoningEffortLevels)).toEqual([[], [], []]);
    expect(models.find((model) => model.modelId.endsWith("toggle"))?.reasoningOptionKinds).toEqual([
      "toggle",
    ]);
  });

  test("preserves complete cost dimensions and provenance through serialized round trip", () => {
    const snapshot: CatalogSnapshot = {
      source,
      providers: [provider],
      models: [
        {
          modelId: "deepseek/deepseek-v4-flash",
          providerId: "deepseek",
          displayName: "DeepSeek V4 Flash",
          pricing: {
            inputPer1M: 0.14,
            outputPer1M: 0.28,
            currency: "USD",
            costDimensionsPer1M: {
              input: 0.14,
              output: 0.28,
              reasoning: 0.14,
              cacheRead: 0.028,
              future_dimension: 0.007,
            },
            costUnit: "USD per 1M tokens",
            provenance: {
              vendor: "models.dev",
              commit: "run91-source-commit",
              sourcePaths: [
                "providers/deepseek/provider.toml",
                "providers/deepseek/models/deepseek-v4-flash.toml",
              ],
              sourceHashes: ["sha-provider", "sha-model"],
              capturedAt: source.capturedAt,
            },
          },
        },
      ],
    };

    const normalized = normalizeCatalogSnapshot(snapshot);
    const hydrated = hydrateNormalizedCatalog(serializeNormalizedCatalog(normalized));
    const pricing = hydrated.models[0]?.pricing;

    expect(pricing?.costDimensionsPer1M).toEqual({
      input: 0.14,
      output: 0.28,
      reasoning: 0.14,
      cacheRead: 0.028,
      future_dimension: 0.007,
    });
    expect(pricing?.provenance).toEqual(
      expect.objectContaining({
        commit: "run91-source-commit",
        sourcePaths: expect.arrayContaining([
          "providers/deepseek/provider.toml",
          "providers/deepseek/models/deepseek-v4-flash.toml",
        ]),
      }),
    );
  });

  test("maps models.dev reasoning_options and cost dimensions into refreshed snapshot rows", () => {
    const snapshot = buildCatalogSnapshotFromModelsDev(
      {
        deepseek: {
          id: "deepseek",
          name: "DeepSeek",
          npm: "@ai-sdk/openai-compatible",
          api: "https://api.deepseek.com",
          env: ["DEEPSEEK_API_KEY"],
          models: {
            "deepseek-v4-pro": {
              id: "deepseek-v4-pro",
              name: "DeepSeek V4 Pro",
              reasoning: true,
              reasoning_options: [{ type: "effort", values: ["high", "max"] }],
              modalities: { input: ["text"], output: ["text"] },
              limit: { context: 1_000_000, output: 128_000 },
              cost: { input: 1.74, output: 3.48, reasoning: 1.74, cache_read: 0.145 },
            },
          },
        },
      },
      "run91-commit",
      source.capturedAt,
      {
        providerId: "deepseek",
        providerName: "DeepSeek",
        commit: "run91-commit",
        capturedAt: source.capturedAt,
        providerPath: "providers/deepseek/provider.toml",
        providerSha256: "sha-provider",
        modelSources: {
          "deepseek-v4-pro": {
            path: "providers/deepseek/models/deepseek-v4-pro.toml",
            sha256: "sha-pro",
          },
        },
      },
    );

    expect(snapshot.models[0]).toMatchObject({
      reasoningOptions: [{ type: "effort", values: ["high", "max"] }],
      pricing: {
        inputPer1M: 1.74,
        outputPer1M: 3.48,
        costDimensionsPer1M: {
          input: 1.74,
          output: 3.48,
          reasoning: 1.74,
          cacheRead: 0.145,
        },
      },
    });
  });

  test("resolves catalog options with additive LiteLLM deltas and adapter capability gating", () => {
    expect(
      resolveReasoningEffortLevels({
        providerId: "deepseek",
        modelId: "deepseek/deepseek-v4-pro",
        capabilities: ["reasoning"],
        reasoningEffortLevels: ["high", "future-token"],
        reasoningOptionKinds: ["effort"],
        liteLlmEffortLevels: ["high", "max"],
        adapter: {
          family: "ai-sdk-openai-compatible",
          version: "v1",
          serializers: ["high", "max", "future-token"],
        },
      }),
    ).toEqual(["high", "future-token", "max"]);
  });

  test("uses a provider-family fallback only when catalogs are empty and adapter is explicit", () => {
    expect(
      resolveReasoningEffortLevels({
        providerId: "deepseek",
        modelId: "deepseek/fallback",
        capabilities: ["reasoning"],
        reasoningEffortLevels: [],
        reasoningOptionKinds: [],
        fallback: {
          providerFamily: "deepseek",
          version: "v1",
          levels: ["high", "max"],
        },
        adapter: {
          family: "ai-sdk-openai-compatible",
          version: "v1",
          serializers: ["max"],
        },
      }),
    ).toEqual(["max"]);

    expect(
      resolveReasoningEffortLevels({
        providerId: "deepseek",
        modelId: "deepseek/no-adapter",
        capabilities: ["reasoning"],
        reasoningEffortLevels: [],
        reasoningOptionKinds: [],
        fallback: { providerFamily: "deepseek", version: "v1", levels: ["high"] },
        adapter: null,
      }),
    ).toEqual([]);
  });

  test("fails closed when a direct DeepSeek V4 row has no immutable first-party receipt", () => {
    expect(() =>
      buildCatalogSnapshotFromModelsDev(
        {
          deepseek: {
            id: "deepseek",
            name: "DeepSeek",
            models: {
              "deepseek-v4-flash": {
                id: "deepseek-v4-flash",
                reasoning: true,
                cost: { input: 0.14, output: 0.28, cache_read: 0.028 },
              },
            },
          },
        },
        "run91-commit",
        source.capturedAt,
      ),
    ).toThrow(/first-party models\.dev DeepSeek V4 source receipt/i);
  });

  test("rejects malformed or colliding cost dimensions rather than silently dropping them", () => {
    expect(() =>
      buildCatalogSnapshotFromModelsDev(
        {
          test: {
            id: "test",
            models: {
              invalid: {
                id: "invalid",
                cost: { input: 1, output: 2, reasoning: -1 },
              },
            },
          },
        },
        "run91-commit",
        source.capturedAt,
      ),
    ).toThrow(/invalid models\.dev cost dimension reasoning/i);

    expect(() =>
      buildCatalogSnapshotFromModelsDev(
        {
          test: {
            id: "test",
            models: {
              collision: {
                id: "collision",
                cost: { input: 1, output: 2, cache_read: 3, cacheRead: 4 },
              },
            },
          },
        },
        "run91-commit",
        source.capturedAt,
      ),
    ).toThrow(/normalization collision/i);
  });

  test("captures all exact first-party DeepSeek source paths at one immutable commit", async () => {
    const requested: string[] = [];
    const receipt = await captureModelsDevFirstPartySource({
      commit: "run91-source-commit",
      capturedAt: source.capturedAt,
      rawBaseUrl: "https://models.dev.test/raw",
      fetchImpl: async (input) => {
        const url = typeof input === "string" ? input : input.toString();
        requested.push(url);
        return new Response(`source:${url}`, { status: 200 });
      },
    });

    expect(requested).toEqual([
      "https://models.dev.test/raw/run91-source-commit/providers/deepseek/provider.toml",
      "https://models.dev.test/raw/run91-source-commit/providers/deepseek/models/deepseek-v4-flash.toml",
      "https://models.dev.test/raw/run91-source-commit/providers/deepseek/models/deepseek-v4-pro.toml",
    ]);
    expect(receipt).toMatchObject({
      providerId: "deepseek",
      commit: "run91-source-commit",
      providerPath: "providers/deepseek/provider.toml",
      modelSources: {
        "deepseek-v4-flash": {
          path: "providers/deepseek/models/deepseek-v4-flash.toml",
        },
        "deepseek-v4-pro": {
          path: "providers/deepseek/models/deepseek-v4-pro.toml",
        },
      },
    });
    expect(receipt.providerSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  test("retains structured future cost metadata while normalizing numeric dimensions", () => {
    const snapshot = buildCatalogSnapshotFromModelsDev(
      {
        test: {
          id: "test",
          models: {
            tiered: {
              id: "tiered",
              cost: {
                input: 1,
                output: 2,
                tiers: [{ input: 3, output: 4, tier: { type: "context", size: 272000 } }],
              },
            },
          },
        },
      },
      "run91-commit",
      source.capturedAt,
    );

    expect(snapshot.models[0]?.pricing).toMatchObject({
      costDimensionsPer1M: { input: 1, output: 2 },
      costMetadata: {
        tiers: [{ input: 3, output: 4, tier: { type: "context", size: 272000 } }],
      },
    });
  });
});
