import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import {
  deriveLiteLLMProviders,
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
  return JSON.parse(
    readFileSync(path.join(catalogRoot, "data", "normalized-catalog.json"), "utf8"),
  ) as NormalizedCatalog;
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

describe("provider overlap metadata (R1)", () => {
  test("legacy listProviders metadata mismatches exactly the 19 known overlap ids", async () => {
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

      const operatorMetadata = resolveValidationProviderMetadata({
        catalogProvider: catalogProvider!,
        liteLLMProvider,
      });
      const validation = validateProviderAccounts({
        catalog,
        additionalProviders: liteLLMProviders,
        accounts: [
          buildUiEquivalentAccount(providerId, operatorMetadata.providerKind),
        ],
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

      const operatorMetadata = resolveValidationProviderMetadata({
        catalogProvider: catalogProvider!,
        liteLLMProvider,
      });
      expect(operatorMetadata.providerKind).toBe(catalogProvider!.providerKind);
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

        const expected = resolveValidationProviderMetadata({
          catalogProvider: catalogProvider!,
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
});
