import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import {
  type CatalogSnapshot,
  type LocalCatalogOverrides,
  normalizeCatalogSnapshot,
} from "../src/index.ts";
import { mergeCatalogSnapshotWithSupplement } from "../src/refresh.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

const V41_UPSTREAM_COMMIT = "67dcd8c9a5ed55745b0beeb610287f12ee2ddc00";
const V41_FLASH_ID = "deepseek/deepseek-v4.1-flash";
const DEPRECATED_ALIAS_ID = "deepseek/deepseek-v4-flash";
const SERVED_FLASH_ID = "deepseek/deepseek-flash";

function modalitySet(values: readonly string[] | undefined): string[] {
  return [...new Set(values ?? [])].sort();
}

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8")) as T;
}

async function readShippedSnapshotAndSupplement(): Promise<{
  snapshot: CatalogSnapshot;
  supplement: CatalogSnapshot;
  overrides: LocalCatalogOverrides;
}> {
  const snapshot = await readJson<CatalogSnapshot>("testdata/catalog/models-dev-snapshot.json");
  const supplement = await readJson<CatalogSnapshot>(
    "testdata/catalog/models-dev-local-supplement.json",
  );
  const overrides = await readJson<LocalCatalogOverrides>(
    "testdata/catalog/models-dev-local-overrides.json",
  );
  return { snapshot, supplement, overrides };
}

describe("run104 R3/R4 catalog lineage and override modalities", () => {
  test("R4 a model override can set modalities", () => {
    const snapshot: CatalogSnapshot = {
      source: {
        vendor: "models.dev",
        commit: "test-commit",
        capturedAt: "2026-10-01T00:00:00.000Z",
        schemaVersion: "models.dev.v1",
      },
      providers: [
        {
          providerId: "vendor",
          displayName: "Vendor",
          npmPackage: "@ai-sdk/openai-compatible",
          apiBase: "https://api.vendor.test/v1",
          envVars: ["VENDOR_API_KEY"],
          adapterFamilyHint: "ai-sdk-openai-compatible",
        },
      ],
      models: [
        {
          modelId: "vendor/stale-modalities",
          providerId: "vendor",
          displayName: "Stale Modalities",
          modalities: ["text"],
        },
      ],
    };
    const overrides: LocalCatalogOverrides = {
      models: {
        "vendor/stale-modalities": {
          modalities: ["text", "image"],
          localNotes: ["Upstream advertises image input for this id."],
        },
      },
    };

    const normalized = normalizeCatalogSnapshot(snapshot, overrides);
    const model = normalized.models.find((row) => row.modelId === "vendor/stale-modalities");

    expect(model?.modalities).toEqual(["text", "image"]);
    expect(model?.localOverrideApplied).toBe(true);
    expect(model?.localNotes).toEqual(["Upstream advertises image input for this id."]);
  });

  test("R3 an alias whose declared modalities disagree with its base fails the export", () => {
    const snapshot: CatalogSnapshot = {
      source: {
        vendor: "models.dev",
        commit: "test-commit",
        capturedAt: "2026-10-01T00:00:00.000Z",
        schemaVersion: "models.dev.v1",
      },
      providers: [
        {
          providerId: "vendor",
          displayName: "Vendor",
          npmPackage: "@ai-sdk/openai-compatible",
          apiBase: "https://api.vendor.test/v1",
          envVars: ["VENDOR_API_KEY"],
          adapterFamilyHint: "ai-sdk-openai-compatible",
        },
      ],
      models: [
        {
          modelId: "vendor/base",
          providerId: "vendor",
          displayName: "Base",
          modalities: ["text"],
        },
        {
          modelId: "vendor/alias-drifted",
          providerId: "vendor",
          displayName: "Drifted Alias",
          extends: "vendor/base",
          modalities: ["text", "image"],
        },
        {
          // Order-insensitive equality is still equality.
          modelId: "vendor/alias-equal",
          providerId: "vendor",
          displayName: "Equal Alias",
          extends: "vendor/base",
          modalities: ["text"],
        },
        {
          // No declaration means "inherit the base", which can never drift.
          modelId: "vendor/alias-inherits",
          providerId: "vendor",
          displayName: "Inheriting Alias",
          extends: "vendor/base",
        },
      ],
    };

    expect(() => normalizeCatalogSnapshot(snapshot)).toThrow(/vendor\/alias-drifted/u);

    const withoutDrift: CatalogSnapshot = {
      ...snapshot,
      models: snapshot.models.filter((model) => model.modelId !== "vendor/alias-drifted"),
    };
    const normalized = normalizeCatalogSnapshot(withoutDrift);
    expect(
      modalitySet(normalized.models.find((row) => row.modelId === "vendor/alias-equal")?.modalities),
    ).toEqual(["text"]);
    expect(
      modalitySet(
        normalized.models.find((row) => row.modelId === "vendor/alias-inherits")?.modalities,
      ),
    ).toEqual(["text"]);
  });

  test("R3 the shipped catalog models the v4.1 base and the deprecated flash alias", async () => {
    const { snapshot, supplement, overrides } = await readShippedSnapshotAndSupplement();
    const merged = mergeCatalogSnapshotWithSupplement(snapshot, supplement);
    const normalized = normalizeCatalogSnapshot(merged, overrides);
    const byId = new Map(normalized.models.map((model) => [model.modelId, model]));

    const base = byId.get(V41_FLASH_ID);
    const alias = byId.get(DEPRECATED_ALIAS_ID);
    const served = byId.get(SERVED_FLASH_ID);
    const pro = byId.get("deepseek/deepseek-v4-pro");

    expect(base?.modalities).toEqual(["image", "text"]);
    // The lineage citation names the upstream commit and the exact files it was read from.
    const citation = [...(base?.localNotes ?? []), ...(alias?.localNotes ?? [])].join(" ");
    expect(citation).toContain(V41_UPSTREAM_COMMIT);
    expect(citation).toContain("providers/deepseek/models/deepseek-flash.toml");
    expect(citation).toContain("providers/deepseek/models/deepseek-v4-flash.toml");

    // The deprecated alias declares the same modalities as its base, and the lineage is recorded.
    expect(alias?.extendsProvenance?.baseModelId).toBe(V41_FLASH_ID);
    expect(modalitySet(alias?.modalities)).toEqual(modalitySet(base?.modalities));
    expect((alias?.localNotes ?? []).join(" ")).toMatch(/deprecated/iu);

    // The entry the runtime actually calls carries the corrected metadata.
    expect(served?.modalities).toEqual(["image", "text"]);
    expect(pro?.modalities).toEqual(["text"]);

    const deepseekModels = normalized.models.filter((model) =>
      model.modelId.startsWith("deepseek/"),
    );
    expect(deepseekModels.length).toBeGreaterThan(0);
    for (const model of deepseekModels) {
      expect(model.modalities).not.toContain("pdf");
    }
  });
});
