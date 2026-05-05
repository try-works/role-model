import path from "node:path";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { deriveVendorVersionLedger, exportCatalogArtifacts, normalizeCatalogSnapshot } from "../src/index.ts";
import { runCatalogExportCli } from "../src/cli.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

describe("normalizeCatalogSnapshot", () => {
  test("preserves upstream provenance while layering role-model enrichment", async () => {
    const snapshot = await readJson("testdata/catalog/models-dev-snapshot.json");
    const overrides = await readJson("testdata/catalog/models-dev-local-overrides.json");

    const catalog = normalizeCatalogSnapshot(snapshot, overrides);
    const ledger = deriveVendorVersionLedger(snapshot);
    const openaiProvider = catalog.providers.find((provider) => provider.providerId === "openai");
    const fastVariant = catalog.models.find((model) => model.modelId === "openai/gpt-4.1-mini-fast");

    expect(ledger).toMatchObject({
      ledgerVersion: "1",
      vendors: [
        expect.objectContaining({
          vendor: "models.dev",
          role: "catalog-source",
          commit: "8f3c2d1",
        }),
      ],
    });
    expect(openaiProvider).toMatchObject({
      providerId: "openai",
      providerKind: "provider-openai",
      authFamily: "api-key",
      adapterFamily: "ai-sdk-openai",
      localOverrideApplied: true,
    });
    expect(fastVariant).toMatchObject({
      modelId: "openai/gpt-4.1-mini-fast",
      providerId: "openai",
      providerKind: "provider-openai",
      authFamily: "api-key",
      version: "2025-04-14-fast",
      extendsProvenance: {
        baseModelId: "gpt-4.1-mini",
        chain: ["gpt-4.1-mini"],
      },
      localOverrideApplied: true,
    });
    expect(fastVariant?.capabilities).toContain("text.chat");
    expect(fastVariant?.capabilities).toContain("latency.optimized");
    expect(fastVariant?.experimentalModes).toEqual([
      expect.objectContaining({
        modeId: "reasoning.high",
      }),
    ]);
    expect(fastVariant).not.toHaveProperty("credentials");
    expect(fastVariant).not.toHaveProperty("endpointId");
  });
});

describe("exportCatalogArtifacts", () => {
  test("writes stable normalized catalog and vendor ledger artifacts for local validation", async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), "role-model-catalog-"));

    const result = await exportCatalogArtifacts({
      snapshotPath: path.join(repoRoot, "testdata", "catalog", "models-dev-snapshot.json"),
      overridesPath: path.join(repoRoot, "testdata", "catalog", "models-dev-local-overrides.json"),
      outputDir,
    });

    const normalizedCatalog = JSON.parse(await readFile(result.normalizedCatalogPath, "utf8")) as {
      source: {
        commit: string;
      };
      providers: Array<{
        providerId: string;
        providerKind: string;
      }>;
    };
    const vendorLedger = JSON.parse(await readFile(result.vendorLedgerPath, "utf8")) as {
      vendors: Array<{
        vendor: string;
        commit: string;
      }>;
    };

    expect(normalizedCatalog.source.commit).toBe("8f3c2d1");
    expect(normalizedCatalog.providers).toContainEqual(
      expect.objectContaining({
        providerId: "openai",
        providerKind: "provider-openai",
      }),
    );
    expect(vendorLedger.vendors).toContainEqual(
      expect.objectContaining({
        vendor: "models.dev",
        commit: "8f3c2d1",
      }),
    );
  });
});

describe("runCatalogExportCli", () => {
  test("derives the repo-local catalog export paths for the validation command", async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), "role-model-catalog-cli-"));

    const result = await runCatalogExportCli({
      repoRoot,
      outputDir,
    });

    expect(result.normalizedCatalogPath).toBe(path.join(outputDir, "normalized-catalog.json"));
    expect(result.vendorLedgerPath).toBe(path.join(outputDir, "vendor-version-ledger.json"));
  });
});
