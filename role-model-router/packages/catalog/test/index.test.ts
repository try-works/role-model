import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { runCatalogExportCli } from "../src/cli.ts";
import {
  deriveLiteLLMProviders,
  deriveVendorVersionLedger,
  exportCatalogArtifacts,
  normalizeCatalogSnapshot,
} from "../src/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function createCatalogCliFixtureRepoRoot(): Promise<string> {
  const tempRepoRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-catalog-fixture-"));
  const snapshotFixture = await readFile(
    path.join(repoRoot, "testdata", "catalog", "models-dev-snapshot.json"),
    "utf8",
  );
  const overridesFixture = await readFile(
    path.join(repoRoot, "testdata", "catalog", "models-dev-local-overrides.json"),
    "utf8",
  );

  await mkdir(path.join(tempRepoRoot, "testdata", "catalog"), { recursive: true });
  await mkdir(path.join(tempRepoRoot, "role-model-router", "packages", "catalog", "data"), {
    recursive: true,
  });

  await writeFile(
    path.join(tempRepoRoot, "testdata", "catalog", "models-dev-snapshot.json"),
    snapshotFixture,
    "utf8",
  );
  await writeFile(
    path.join(tempRepoRoot, "testdata", "catalog", "models-dev-local-overrides.json"),
    overridesFixture,
    "utf8",
  );
  await writeFile(
    path.join(
      tempRepoRoot,
      "role-model-router",
      "packages",
      "catalog",
      "data",
      "normalized-catalog.json",
    ),
    '{\n  "providers": [],\n  "models": []\n}\n',
    "utf8",
  );
  await writeFile(
    path.join(
      tempRepoRoot,
      "role-model-router",
      "packages",
      "catalog",
      "data",
      "vendor-version-ledger.json",
    ),
    '{\n  "ledgerVersion": "1",\n  "vendors": []\n}\n',
    "utf8",
  );

  return tempRepoRoot;
}

async function createCatalogRefreshFixtureRepoRoot(): Promise<string> {
  const tempRepoRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-catalog-refresh-"));
  await mkdir(path.join(tempRepoRoot, "testdata", "catalog"), { recursive: true });
  return tempRepoRoot;
}

describe("normalizeCatalogSnapshot", () => {
  test("preserves upstream provenance while layering role-model enrichment", () => {
    const snapshot = JSON.parse(`{
      "source": {
        "vendor": "models.dev",
        "commit": "8f3c2d1",
        "capturedAt": "2026-05-04T12:00:00Z",
        "schemaVersion": "models.dev.v1"
      },
      "providers": [
        {
          "providerId": "openai",
          "displayName": "OpenAI",
          "npmPackage": "@ai-sdk/openai",
          "apiBase": "https://api.openai.com/v1",
          "envVars": ["OPENAI_API_KEY"],
          "adapterFamilyHint": "ai-sdk-openai"
        }
      ],
      "models": [
        {
          "modelId": "gpt-4.1-mini",
          "providerId": "openai",
          "displayName": "GPT-4.1 Mini",
          "version": "2025-04-14",
          "capabilities": ["text.chat", "tools.function_calling", "structured.output"],
          "modalities": ["text"],
          "contextWindow": 1047576,
          "maxOutputTokens": 32768,
          "pricing": {
            "inputPer1M": 0.4,
            "outputPer1M": 1.6,
            "currency": "USD"
          },
          "requestShapeHints": {
            "providerShape": "openai.responses",
            "bodyKeys": ["temperature", "max_output_tokens"],
            "headerKeys": ["OpenAI-Beta"]
          },
          "experimentalModes": [
            {
              "modeId": "reasoning.high",
              "label": "High reasoning depth"
            }
          ]
        },
        {
          "modelId": "openai/gpt-4.1-mini-fast",
          "providerId": "openai",
          "displayName": "GPT-4.1 Mini Fast",
          "extends": "gpt-4.1-mini",
          "version": "2025-04-14-fast",
          "experimentalModes": [
            {
              "modeId": "reasoning.high",
              "label": "High reasoning depth"
            }
          ]
        }
      ]
    }`);
    const overrides = JSON.parse(`{
      "providers": {
        "openai": {
          "providerKind": "provider-openai",
          "authFamily": "api-key",
          "adapterFamily": "ai-sdk-openai"
        }
      },
      "models": {
        "openai/gpt-4.1-mini-fast": {
          "capabilities": ["latency.optimized"]
        }
      }
    }`);

    const catalog = normalizeCatalogSnapshot(snapshot, overrides);
    const ledger = deriveVendorVersionLedger(snapshot);
    const openaiProvider = catalog.providers.find((provider) => provider.providerId === "openai");
    const fastVariant = catalog.models.find(
      (model) => model.modelId === "openai/gpt-4.1-mini-fast",
    );

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

  test("normalizes a moonshot slice with explicit auth-mode support", () => {
    const snapshot = JSON.parse(`{
      "source": {
        "vendor": "models.dev",
        "commit": "moonshot-test",
        "capturedAt": "2026-05-04T12:00:00Z",
        "schemaVersion": "models.dev.v1"
      },
      "providers": [
        {
          "providerId": "moonshot",
          "displayName": "Moonshot AI",
          "npmPackage": "@ai-sdk/openai-compatible",
          "apiBase": "https://api.moonshot.ai/v1",
          "envVars": ["MOONSHOT_API_KEY"],
          "adapterFamilyHint": "ai-sdk-openai-compatible"
        }
      ],
      "models": [
        {
          "modelId": "moonshot/kimi-k2.5",
          "providerId": "moonshot",
          "displayName": "Kimi K2.5",
          "version": "2026-04-01",
          "capabilities": ["text.chat", "tools.function_calling", "structured.output"],
          "modalities": ["text"],
          "contextWindow": 262144,
          "maxOutputTokens": 16384
        }
      ]
    }`);
    const overrides = JSON.parse(`{
      "providers": {
        "moonshot": {
          "providerKind": "provider-openai",
          "authFamily": "api-key",
          "adapterFamily": "ai-sdk-openai-compatible",
          "supportedAuthModes": ["api-key-static", "oauth2-device-code"]
        }
      }
    }`);

    const catalog = normalizeCatalogSnapshot(snapshot, overrides);
    const moonshotProvider = catalog.providers.find(
      (provider) => provider.providerId === "moonshot",
    );
    const kimiModel = catalog.models.find((model) => model.modelId === "moonshot/kimi-k2.5");

    expect(moonshotProvider).toMatchObject({
      providerId: "moonshot",
      displayName: "Moonshot AI",
      providerKind: "provider-openai",
      authFamily: "api-key",
      adapterFamily: "ai-sdk-openai-compatible",
      supportedAuthModes: ["api-key-static", "oauth2-device-code"],
      apiBase: "https://api.moonshot.ai/v1",
      localOverrideApplied: true,
    });
    expect(kimiModel).toMatchObject({
      modelId: "moonshot/kimi-k2.5",
      providerId: "moonshot",
      providerKind: "provider-openai",
      authFamily: "api-key",
      displayName: "Kimi K2.5",
    });
  });

  test("preserves provider docs and npm compatibility metadata for downstream consumers", () => {
    const snapshot = JSON.parse(`{
      "source": {
        "vendor": "models.dev",
        "commit": "refresh-commit",
        "capturedAt": "2026-05-15T03:40:39Z",
        "schemaVersion": "models.dev.v1"
      },
      "providers": [
        {
          "providerId": "fireworks_ai",
          "displayName": "Fireworks AI",
          "npmPackage": "@ai-sdk/openai-compatible",
          "apiBase": "https://api.fireworks.ai/inference/v1",
          "envVars": ["FIREWORKS_API_KEY"],
          "adapterFamilyHint": "ai-sdk-openai-compatible",
          "docsUrl": "https://fireworks.ai/docs/"
        }
      ],
      "models": [
        {
          "modelId": "fireworks_ai/accounts/fireworks/models/deepseek-v3",
          "providerId": "fireworks_ai",
          "displayName": "DeepSeek V3",
          "capabilities": ["text.chat", "tools.function_calling"],
          "modalities": ["text"],
          "contextWindow": 131072,
          "maxOutputTokens": 16384
        }
      ]
    }`);

    const catalog = normalizeCatalogSnapshot(snapshot);

    expect(catalog.providers).toContainEqual(
      expect.objectContaining({
        providerId: "fireworks_ai",
        npmPackage: "@ai-sdk/openai-compatible",
        docsUrl: "https://fireworks.ai/docs/",
      }),
    );
  });
});

describe("deriveLiteLLMProviders", () => {
  test("preserves fallback SDK metadata for LiteLLM-only providers", () => {
    const providers = deriveLiteLLMProviders({
      "azure-ai/gpt-4.1-mini": {
        litellm_provider: "azure_ai",
      },
    });

    expect(providers).toContainEqual(
      expect.objectContaining({
        providerId: "azure_ai",
        displayName: "Azure AI",
        npmPackage: "@ai-sdk/azure",
        adapterFamily: "ai-sdk-azure",
        apiBase: "https://services.ai.azure.com/models",
      }),
    );
  });
});

describe("exportCatalogArtifacts", () => {
  test("writes stable normalized catalog and vendor ledger artifacts for local validation", async () => {
    const outputDir = await mkdtemp(path.join(os.tmpdir(), "role-model-catalog-"));
    const snapshot = await readJson<{
      source: {
        commit: string;
      };
    }>("testdata/catalog/models-dev-snapshot.json");

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

    expect(normalizedCatalog.source.commit).toBe(snapshot.source.commit);
    expect(normalizedCatalog.providers).toContainEqual(
      expect.objectContaining({
        providerId: "openai",
      }),
    );
    expect(vendorLedger.vendors).toContainEqual(
      expect.objectContaining({
        vendor: "models.dev",
        commit: snapshot.source.commit,
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

  test("rewrites tracked package-data catalog artifacts alongside the runtime-output export", async () => {
    const tempRepoRoot = await createCatalogCliFixtureRepoRoot();

    const result = await runCatalogExportCli({
      repoRoot: tempRepoRoot,
    });

    const trackedNormalizedCatalogPath = path.join(
      tempRepoRoot,
      "role-model-router",
      "packages",
      "catalog",
      "data",
      "normalized-catalog.json",
    );
    const trackedVendorLedgerPath = path.join(
      tempRepoRoot,
      "role-model-router",
      "packages",
      "catalog",
      "data",
      "vendor-version-ledger.json",
    );

    const trackedNormalizedCatalog = await readFile(trackedNormalizedCatalogPath, "utf8");
    const trackedVendorLedger = await readFile(trackedVendorLedgerPath, "utf8");
    const exportedNormalizedCatalog = await readFile(result.normalizedCatalogPath, "utf8");
    const exportedVendorLedger = await readFile(result.vendorLedgerPath, "utf8");

    expect(trackedNormalizedCatalog).toBe(exportedNormalizedCatalog);
    expect(trackedVendorLedger).toBe(exportedVendorLedger);
    expect(JSON.parse(trackedNormalizedCatalog).providers.length).toBeGreaterThan(0);
    expect(JSON.parse(trackedVendorLedger).vendors.length).toBeGreaterThan(0);
  });
});

describe("runCatalogRefreshCli", () => {
  test("writes the pinned snapshot fixture from live models.dev provider and model metadata", async () => {
    const tempRepoRoot = await createCatalogRefreshFixtureRepoRoot();
    const { runCatalogRefreshCli } = await import("../src/refresh.ts");
    const capturedAt = "2026-05-15T03:40:39Z";

    const result = await runCatalogRefreshCli({
      repoRoot: tempRepoRoot,
      capturedAt,
      fetchImpl: async (input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://models.dev/api.json") {
          return new Response(
            JSON.stringify({
              fireworks_ai: {
                id: "fireworks_ai",
                env: ["FIREWORKS_API_KEY"],
                npm: "@ai-sdk/openai-compatible",
                api: "https://api.fireworks.ai/inference/v1/",
                name: "Fireworks AI",
                doc: "https://fireworks.ai/docs/",
                models: {
                  "accounts/fireworks/models/deepseek-v3": {
                    id: "accounts/fireworks/models/deepseek-v3",
                    name: "DeepSeek V3",
                    tool_call: true,
                    reasoning: false,
                    temperature: true,
                    release_date: "2026-04-01",
                    last_updated: "2026-04-03",
                    modalities: {
                      input: ["text", "image"],
                      output: ["text"],
                    },
                    limit: {
                      context: 131072,
                      output: 16384,
                    },
                    cost: {
                      input: 0.9,
                      output: 3.6,
                    },
                  },
                },
              },
            }),
            {
              headers: {
                "content-type": "application/json",
              },
            },
          );
        }

        if (url === "https://api.github.com/repos/anomalyco/models.dev/commits/dev") {
          return new Response(
            JSON.stringify({
              sha: "a75cf2ed1c76c9502a19ed027c8e4b2a21846055",
            }),
            {
              headers: {
                "content-type": "application/json",
              },
            },
          );
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      },
    });

    const snapshot = JSON.parse(await readFile(result.snapshotPath, "utf8"));

    expect(result).toMatchObject({
      snapshotPath: path.join(tempRepoRoot, "testdata", "catalog", "models-dev-snapshot.json"),
      providerCount: 1,
      modelCount: 1,
    });
    expect(snapshot).toMatchObject({
      source: {
        vendor: "models.dev",
        commit: "a75cf2ed1c76c9502a19ed027c8e4b2a21846055",
        capturedAt,
        schemaVersion: "models.dev.v1",
      },
      providers: [
        expect.objectContaining({
          providerId: "fireworks_ai",
          displayName: "Fireworks AI",
          npmPackage: "@ai-sdk/openai-compatible",
          apiBase: "https://api.fireworks.ai/inference/v1",
          docsUrl: "https://fireworks.ai/docs/",
          envVars: ["FIREWORKS_API_KEY"],
          adapterFamilyHint: "ai-sdk-openai-compatible",
        }),
      ],
      models: [
        expect.objectContaining({
          modelId: "fireworks_ai/accounts/fireworks/models/deepseek-v3",
          providerId: "fireworks_ai",
          displayName: "DeepSeek V3",
          version: "2026-04-01",
          capabilities: ["text.chat", "tools.function_calling"],
          modalities: ["image", "text"],
          contextWindow: 131072,
          maxOutputTokens: 16384,
          pricing: {
            inputPer1M: 0.9,
            outputPer1M: 3.6,
            currency: "USD",
          },
        }),
      ],
    });
  });

  test("merges local supplemental alias models into the refreshed snapshot", async () => {
    const tempRepoRoot = await createCatalogRefreshFixtureRepoRoot();
    const { runCatalogRefreshCli } = await import("../src/refresh.ts");

    await writeFile(
      path.join(tempRepoRoot, "testdata", "catalog", "models-dev-local-supplement.json"),
      `{
  "providers": [
    {
      "providerId": "anthropic",
      "displayName": "Anthropic",
      "npmPackage": "@ai-sdk/anthropic",
      "apiBase": "https://api.anthropic.com/v1",
      "envVars": ["ANTHROPIC_API_KEY"],
      "adapterFamilyHint": "ai-sdk-anthropic"
    }
  ],
  "models": [
    {
      "modelId": "claude-3.7-sonnet",
      "providerId": "anthropic",
      "displayName": "Claude 3.7 Sonnet",
      "version": "2025-02-24",
      "capabilities": ["text.chat", "tools.function_calling"],
      "modalities": ["text"],
      "contextWindow": 200000,
      "maxOutputTokens": 8192
    },
    {
      "modelId": "openai/gpt-4.1-mini-fast",
      "providerId": "openai",
      "displayName": "GPT-4.1 Mini Fast",
      "extends": "gpt-4.1-mini",
      "version": "2025-04-14-fast",
      "experimentalModes": [
        {
          "modeId": "reasoning.high",
          "label": "High reasoning depth"
        }
      ]
    }
  ]
}
`,
      "utf8",
    );

    await runCatalogRefreshCli({
      repoRoot: tempRepoRoot,
      capturedAt: "2026-05-15T03:40:39Z",
      fetchImpl: async (input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://models.dev/api.json") {
          return new Response(
            JSON.stringify({
              openai: {
                id: "openai",
                env: ["OPENAI_API_KEY"],
                npm: "@ai-sdk/openai",
                api: "https://api.openai.com/v1",
                name: "OpenAI",
                doc: "https://platform.openai.com/docs",
                models: {
                  "gpt-4.1-mini": {
                    id: "gpt-4.1-mini",
                    name: "GPT-4.1 Mini",
                    tool_call: true,
                    reasoning: false,
                    release_date: "2025-04-14",
                    modalities: {
                      input: ["text"],
                      output: ["text"],
                    },
                    limit: {
                      context: 1047576,
                      output: 32768,
                    },
                    cost: {
                      input: 0.4,
                      output: 1.6,
                    },
                  },
                },
              },
            }),
            {
              headers: {
                "content-type": "application/json",
              },
            },
          );
        }

        if (url === "https://api.github.com/repos/anomalyco/models.dev/commits/dev") {
          return new Response(
            JSON.stringify({
              sha: "a75cf2ed1c76c9502a19ed027c8e4b2a21846055",
            }),
            {
              headers: {
                "content-type": "application/json",
              },
            },
          );
        }

        throw new Error(`Unexpected fetch URL: ${url}`);
      },
    });

    const snapshot = JSON.parse(
      await readFile(
        path.join(tempRepoRoot, "testdata", "catalog", "models-dev-snapshot.json"),
        "utf8",
      ),
    );

    expect(snapshot.providers).toContainEqual(
      expect.objectContaining({
        providerId: "anthropic",
      }),
    );
    expect(snapshot.models).toContainEqual(
      expect.objectContaining({
        modelId: "claude-3.7-sonnet",
        providerId: "anthropic",
      }),
    );
    expect(snapshot.models).toContainEqual(
      expect.objectContaining({
        modelId: "openai/gpt-4.1-mini-fast",
        providerId: "openai",
      }),
    );
  });
});
