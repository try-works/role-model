import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import type { NormalizedCatalog } from "../src/index.js";
import {
  CANONICAL_MODEL_ID_ALIASES,
  OPERATOR_HIDDEN_CATALOG_PROVIDER_IDS,
  resolveCanonicalModelId,
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
  return JSON.parse(await readFile(catalogPath, "utf8")) as NormalizedCatalog;
}

describe("token-economics", () => {
  test("maps operator Kimi model id to models.dev pricing row", async () => {
    const catalog = await loadNormalizedCatalog();
    expect(resolveCanonicalModelId("moonshot/kimi-k2.6")).toBe("moonshotai/kimi-k2.6");
    expect(CANONICAL_MODEL_ID_ALIASES["moonshot/kimi-k2.6"]).toBe("moonshotai/kimi-k2.6");

    const economics = resolveTokenEconomics({
      modelId: "moonshot/kimi-k2.6",
      catalog,
      isLocalEndpoint: false,
    });

    expect(economics.source).toBe("catalog");
    expect(economics.inputPer1M).toBe(0.95);
    expect(economics.outputPer1M).toBe(4);
  });

  test("uses local-free economics for local endpoints", () => {
    const catalog = { catalogVersion: "1", source: {}, providers: [], models: [] } as NormalizedCatalog;
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
});
