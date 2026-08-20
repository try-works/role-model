import { readFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type NormalizedCatalog,
  deriveLiteLLMProviders,
  hydrateNormalizedCatalog,
  loadLiteLLMModelPrices,
} from "@role-model-router/catalog";
import { validateProviderAccounts } from "@role-model-router/provider-account";
import { describe, expect, test } from "vitest";

import { createRuntimeBridgeBackend } from "../src/index.js";
import {
  ALIGNED_OVERLAP_PROVIDER_IDS,
  HISTORICALLY_BROKEN_OVERLAP_PROVIDER_IDS,
  listOverlapProviderKindMismatches,
  resolveLegacyListProvidersMetadata,
  resolveValidationProviderMetadata,
} from "../src/provider-metadata-merge.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..", "..", "..");
const catalogRoot = path.join(repoRoot, "role-model-router", "packages", "catalog");

function loadCatalog(): NormalizedCatalog {
  return hydrateNormalizedCatalog(
    JSON.parse(readFileSync(path.join(catalogRoot, "data", "normalized-catalog.json"), "utf8")),
  );
}

function buildUiEquivalentAccount(providerId: string, providerKind: string) {
  return {
    providerAccountId: `${providerId}.personal.workspace-default`,
    providerId,
    providerKind,
    orgScope: "personal",
    accountScope: "workspace-default",
    credentialRef: {
      backend: "env",
      ref: `${providerId.toUpperCase()}_API_KEY`,
    },
    authMode: "api-key-static",
    regionPolicy: {
      mode: "prefer",
      regions: ["global"],
    },
    baseUrlOverride: "https://example.invalid/v1",
    allowedModels: [`${providerId}/test-model`],
    deniedModels: [],
    entitlementTags: ["chat"],
    budgetPolicyRef: "budget.default",
    quotaPolicyRef: "quota.default",
    status: "active",
    healthStatus: "healthy",
    rotationState: "stable",
  };
}

function expectDefinedProvider<TValue>(
  value: TValue | undefined,
  providerId: string,
  source: string,
): TValue {
  if (value === undefined) {
    throw new Error(`Expected provider ${providerId} in ${source}.`);
  }
  return value;
}

describe("provider overlap metadata (R1)", () => {
  test("legacy listProviders metadata mismatches exactly the reviewed overlap ids", async () => {
    const catalog = loadCatalog();
    const liteLLMProviders = deriveLiteLLMProviders(await loadLiteLLMModelPrices(repoRoot));
    const mismatches = listOverlapProviderKindMismatches({
      catalogProviders: catalog.providers,
      liteLLMProviders,
      resolveOperatorMetadata: ({ catalogProvider }) =>
        resolveLegacyListProvidersMetadata(catalogProvider),
    });

    expect(mismatches.map((entry) => entry.providerId)).toEqual([
      ...HISTORICALLY_BROKEN_OVERLAP_PROVIDER_IDS,
    ]);
  });

  test("merged operator metadata aligns with validateProviderAccounts for all overlap ids", async () => {
    const catalog = loadCatalog();
    const liteLLMProviders = deriveLiteLLMProviders(await loadLiteLLMModelPrices(repoRoot));
    const mismatches = listOverlapProviderKindMismatches({
      catalogProviders: catalog.providers,
      liteLLMProviders,
      resolveOperatorMetadata: resolveValidationProviderMetadata,
    });

    expect(mismatches).toEqual([]);
  });

  test.each(HISTORICALLY_BROKEN_OVERLAP_PROVIDER_IDS)(
    "upsert validation accepts UI-equivalent payload for overlap provider %s",
    async (providerId) => {
      const catalog = loadCatalog();
      const liteLLMProviders = deriveLiteLLMProviders(await loadLiteLLMModelPrices(repoRoot));
      const catalogProvider = catalog.providers.find((entry) => entry.providerId === providerId);
      const liteLLMProvider = liteLLMProviders.find((entry) => entry.providerId === providerId);
      expect(catalogProvider).toBeDefined();
      expect(liteLLMProvider).toBeDefined();
      const resolvedCatalogProvider = expectDefinedProvider(
        catalogProvider,
        providerId,
        "catalog providers",
      );

      const operatorMetadata = resolveValidationProviderMetadata({
        catalogProvider: resolvedCatalogProvider,
        liteLLMProvider,
      });
      const validation = validateProviderAccounts({
        catalog,
        additionalProviders: liteLLMProviders,
        accounts: [buildUiEquivalentAccount(providerId, operatorMetadata.providerKind)],
      });

      expect(validation.diagnostics).toEqual([]);
      expect(validation.accounts).toHaveLength(1);
    },
  );

  test.each(ALIGNED_OVERLAP_PROVIDER_IDS)(
    "aligned overlap provider %s keeps stable providerKind",
    async (providerId) => {
      const catalog = loadCatalog();
      const liteLLMProviders = deriveLiteLLMProviders(await loadLiteLLMModelPrices(repoRoot));
      const catalogProvider = catalog.providers.find((entry) => entry.providerId === providerId);
      const liteLLMProvider = liteLLMProviders.find((entry) => entry.providerId === providerId);
      expect(catalogProvider).toBeDefined();
      expect(liteLLMProvider).toBeDefined();
      const resolvedCatalogProvider = expectDefinedProvider(
        catalogProvider,
        providerId,
        "catalog providers",
      );

      const operatorMetadata = resolveValidationProviderMetadata({
        catalogProvider: resolvedCatalogProvider,
        liteLLMProvider,
      });
      expect(operatorMetadata.providerKind).toBe(resolvedCatalogProvider.providerKind);
    },
  );
});

describe("listProviders overlap metadata (R1 integration)", () => {
  test.each(HISTORICALLY_BROKEN_OVERLAP_PROVIDER_IDS)(
    "listProviders exposes validation-canonical providerKind for %s",
    async (providerId) => {
      const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run42-overlap-"));
      const runtimeStateRoot = path.join(tempRoot, "state");
      const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");
      await writeFile(unifiedRuntimeConfigPath, 'version: "1.0"\n', "utf8");

      const backend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-host-run42-overlap",
        unifiedRuntimeConfigPath,
      });

      try {
        const catalog = loadCatalog();
        const liteLLMProviders = deriveLiteLLMProviders(await loadLiteLLMModelPrices(repoRoot));
        const catalogProvider = catalog.providers.find((entry) => entry.providerId === providerId);
        const liteLLMProvider = liteLLMProviders.find((entry) => entry.providerId === providerId);
        expect(catalogProvider).toBeDefined();
        expect(liteLLMProvider).toBeDefined();
        const resolvedCatalogProvider = expectDefinedProvider(
          catalogProvider,
          providerId,
          "catalog providers",
        );

        const expected = resolveValidationProviderMetadata({
          catalogProvider: resolvedCatalogProvider,
          liteLLMProvider,
        });
        const providers = await backend.listProviders();
        const listed = providers.find((entry) => entry.providerId === providerId);
        expect(listed?.providerKind).toBe(expected.providerKind);
      } finally {
        await backend.shutdown();
      }
    },
  );

  test("listProviders exposes one OpenAI provider with API Key and Codex Subscription variants", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run50-openai-provider-"));
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");
    await writeFile(unifiedRuntimeConfigPath, 'version: "1.0"\n', "utf8");

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-run50-openai-provider",
      unifiedRuntimeConfigPath,
    });

    try {
      const providers = await backend.listProviders();
      const openaiProviders = providers.filter((entry) => entry.providerId === "openai");
      const chatgptProviders = providers.filter((entry) => entry.providerId === "chatgpt");

      expect(openaiProviders).toHaveLength(1);
      expect(chatgptProviders).toHaveLength(0);

      expect(openaiProviders[0]?.displayName).toBe("OpenAI");
      expect(openaiProviders[0]?.variants.map((variant) => variant.label)).toEqual([
        "API Key",
        "Codex Subscription",
      ]);
    } finally {
      await backend.shutdown();
    }
  });

  test("every remote connection method resolves its allowed models through the same effort-aware catalog", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-run91-provider-catalog-"));
    const runtimeStateRoot = path.join(tempRoot, "state");
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");
    await writeFile(unifiedRuntimeConfigPath, 'version: "1.0"\n', "utf8");

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-run91-provider-catalog",
      unifiedRuntimeConfigPath,
    });

    try {
      const providers = await backend.listProviders();
      for (const provider of providers.filter(
        (entry) => entry.providerKind !== "local-engine" && entry.modelIds.length > 0,
      )) {
        const catalogById = new Map(
          (await backend.listModels({ providerId: provider.providerId })).map((model) => [
            model.id,
            model,
          ]),
        );
        for (const variant of provider.variants) {
          for (const modelId of variant.modelIds) {
            expect(
              catalogById.get(modelId),
              `${provider.providerId}/${variant.variantId} dropped catalog metadata for ${modelId}`,
            ).toBeDefined();
          }
        }
      }

      const moonshot = await backend.listModels({ providerId: "moonshot" });
      expect(
        moonshot.find((model) => model.id === "moonshot/kimi-k3")?.reasoningEffortLevels,
      ).toEqual(["low", "high", "max"]);
      const kimiCoding = await backend.listModels({ providerId: "kimi-for-coding" });
      expect(
        kimiCoding.find((model) => model.id === "kimi-for-coding/k3")?.reasoningEffortLevels,
      ).toEqual(["low", "high", "max"]);
    } finally {
      await backend.shutdown();
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
