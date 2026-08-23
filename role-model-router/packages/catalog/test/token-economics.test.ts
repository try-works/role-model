import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import { type NormalizedCatalog, readNormalizedCatalogFile } from "../src/index.js";
import {
  CANONICAL_MODEL_ID_ALIASES,
  OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS,
  applyAliasedCatalogPricing,
  resolveCanonicalModelId,
  resolveCatalogPricingHints,
  resolveRoutingCostEstimate,
  resolveTokenEconomics,
} from "../src/token-economics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

async function loadNormalizedCatalog(): Promise<NormalizedCatalog> {
  const catalogPath = path.join(
    repoRoot,
    "role-model-router",
    "packages",
    "catalog",
    "data",
    "normalized-catalog.json",
  );
  return readNormalizedCatalogFile(catalogPath);
}

describe("token-economics", () => {
  test("maps operator Kimi model id to models.dev pricing row", async () => {
    const catalog = await loadNormalizedCatalog();
    expect(resolveCanonicalModelId("moonshot/kimi-k2.5")).toBe("moonshotai/kimi-k2.5");
    expect(resolveCanonicalModelId("moonshot/kimi-k2.6")).toBe("moonshotai/kimi-k2.6");
    expect(CANONICAL_MODEL_ID_ALIASES["moonshot/kimi-k2.5"]).toBe("moonshotai/kimi-k2.5");
    expect(CANONICAL_MODEL_ID_ALIASES["moonshot/kimi-k2.6"]).toBe("moonshotai/kimi-k2.6");

    const economics = resolveTokenEconomics({
      modelId: "moonshot/kimi-k2.6",
      catalog,
      isLocalEndpoint: false,
    });

    expect(economics.source).toBe("catalog");
    expect(economics.inputPer1M).toBe(0.95);
    expect(economics.outputPer1M).toBe(4);

    expect(
      resolveCatalogPricingHints({
        modelId: "moonshot/kimi-k2.5",
        catalog,
      }),
    ).toEqual({
      inputPer1M: 0.6,
      outputPer1M: 3,
      currency: "USD",
    });
  });

  test("maps operator Kimi K3 model id to models.dev pricing row", async () => {
    const catalog = await loadNormalizedCatalog();
    expect(resolveCanonicalModelId("moonshot/kimi-k3")).toBe("moonshotai/kimi-k3");
    expect(CANONICAL_MODEL_ID_ALIASES["moonshot/kimi-k3"]).toBe("moonshotai/kimi-k3");

    const economics = resolveTokenEconomics({
      modelId: "moonshot/kimi-k3",
      catalog,
      isLocalEndpoint: false,
    });

    expect(economics.source).toBe("catalog");
    expect(economics.inputPer1M).toBe(3);
    expect(economics.outputPer1M).toBe(15);
  });

  test("maps operator Kimi K2.7 Code model id to models.dev pricing row", async () => {
    const catalog = await loadNormalizedCatalog();
    expect(resolveCanonicalModelId("moonshot/kimi-k2.7-code")).toBe("moonshotai/kimi-k2.7-code");
    expect(CANONICAL_MODEL_ID_ALIASES["moonshot/kimi-k2.7-code"]).toBe("moonshotai/kimi-k2.7-code");

    const economics = resolveTokenEconomics({
      modelId: "moonshot/kimi-k2.7-code",
      catalog,
      isLocalEndpoint: false,
    });

    expect(economics.source).toBe("catalog");
    expect(economics.inputPer1M).toBe(0.95);
    expect(economics.outputPer1M).toBe(4);
  });

  test("uses local-free economics for local endpoints", () => {
    const catalog = {
      catalogVersion: "1",
      source: {},
      providers: [],
      models: [],
    } as NormalizedCatalog;
    const economics = resolveTokenEconomics({
      modelId: "lfm2.5-8b-a1b",
      catalog,
      isLocalEndpoint: true,
    });

    expect(economics).toMatchObject({
      source: "local-free",
      inputPer1M: 0,
      outputPer1M: 0,
    });
  });

  test("derives catalog-based routing estimates and ranks local below Kimi", async () => {
    const catalog = await loadNormalizedCatalog();
    const contextTokens = 1000;
    const maxOutputTokens = 512;

    const local = resolveRoutingCostEstimate({
      modelId: "lfm2.5-8b-a1b",
      catalog,
      isLocalEndpoint: true,
      contextTokens,
      maxOutputTokens,
    });
    const kimi = resolveRoutingCostEstimate({
      modelId: "moonshot/kimi-k2.6",
      catalog,
      isLocalEndpoint: false,
      contextTokens,
      maxOutputTokens,
    });

    expect(local.estimatedRequestUsd).toBe(0);
    expect(local.cost_per_1k_tokens_est).toBe(0);
    expect(kimi.estimatedRequestUsd).toBeGreaterThan(0);
    expect(kimi.cost_per_1k_tokens_est).toBeGreaterThan(local.cost_per_1k_tokens_est ?? -1);
  });

  test("hides moonshotai from operator provider surfaces", () => {
    expect(OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS.has("moonshotai")).toBe(true);
    expect(OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS.has("moonshot")).toBe(false);
  });

  test("maps deepseek mirror model ids to models.dev deepseek pricing rows", async () => {
    const catalog = await loadNormalizedCatalog();
    expect(resolveCanonicalModelId("digitalocean/deepseek-v4-flash")).toBe(
      "deepseek/deepseek-v4-flash",
    );
    expect(resolveCanonicalModelId("anyapi/deepseek/deepseek-v4-flash")).toBe(
      "deepseek/deepseek-v4-flash",
    );

    const economics = resolveTokenEconomics({
      modelId: "digitalocean/deepseek-v4-flash",
      catalog,
      isLocalEndpoint: false,
    });
    expect(economics.source).toBe("catalog");
    expect(economics.inputPer1M).toBe(0.14);
    expect(economics.outputPer1M).toBe(0.28);
    expect(
      resolveCatalogPricingHints({
        modelId: "deepseek/deepseek-v4-flash",
        catalog,
      }),
    ).toEqual({
      inputPer1M: 0.14,
      outputPer1M: 0.28,
      currency: "USD",
    });
  });

  test("keeps first-party DeepSeek and explicitly priced relay rows economically isolated", async () => {
    const catalog = await loadNormalizedCatalog();
    const direct = resolveTokenEconomics({
      modelId: "deepseek/deepseek-v4-pro",
      catalog,
      isLocalEndpoint: false,
    });
    const hpcAi = resolveTokenEconomics({
      modelId: "hpc-ai/deepseek/deepseek-v4-pro",
      catalog,
      isLocalEndpoint: false,
    });

    expect(direct).toMatchObject({
      canonicalModelId: "deepseek/deepseek-v4-pro",
      inputPer1M: 0.435,
      outputPer1M: 0.87,
    });
    expect(hpcAi).toMatchObject({
      canonicalModelId: "hpc-ai/deepseek/deepseek-v4-pro",
      inputPer1M: 1.74,
      outputPer1M: 3.48,
    });
    expect(hpcAi.inputPer1M).not.toBe(direct.inputPer1M);
  });

  test("respects priced gateway rows and resolves unpriced aliases to models.dev pricing", async () => {
    const catalog = await loadNormalizedCatalog();
    expect(resolveCanonicalModelId("chatgpt/gpt-5.4")).toBe("openai/gpt-5.4");

    const nested = resolveTokenEconomics({
      modelId: "anyapi/openai/gpt-5.4",
      catalog,
      isLocalEndpoint: false,
    });
    expect(nested.source).toBe("catalog");
    expect(nested.canonicalModelId).toBe("anyapi/openai/gpt-5.4");
    expect(nested.inputPer1M).toBeTypeOf("number");

    const filled = applyAliasedCatalogPricing(
      catalog.models.map((model) =>
        model.modelId === "anyapi/openai/gpt-5.4" ? { ...model, pricing: null } : model,
      ),
    );
    expect(filled.find((model) => model.modelId === "anyapi/openai/gpt-5.4")?.pricing).toEqual(
      catalog.models.find((model) => model.modelId === "openai/gpt-5.4")?.pricing,
    );
  });

  test("copies models.dev pricing onto all operator moonshot/kimi rows", async () => {
    const catalog = await loadNormalizedCatalog();
    const operatorKimiIds = catalog.models
      .filter((model) => model.modelId.startsWith("moonshot/kimi-"))
      .map((model) => model.modelId);
    expect(operatorKimiIds.length).toBeGreaterThan(0);

    const withPricing = applyAliasedCatalogPricing(
      catalog.models.map((model) =>
        model.modelId.startsWith("moonshot/kimi-") ? { ...model, pricing: null } : model,
      ),
    );
    for (const modelId of operatorKimiIds) {
      const model = withPricing.find((entry) => entry.modelId === modelId);
      const canonical = catalog.models.find(
        (entry) => entry.modelId === resolveCanonicalModelId(modelId),
      );
      expect(model?.pricing).toEqual(canonical?.pricing ?? null);
      expect(model?.pricing).not.toBeNull();
    }
  });
});
