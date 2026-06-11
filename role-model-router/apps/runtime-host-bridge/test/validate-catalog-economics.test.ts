import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import { runCatalogEconomicsValidation } from "../src/validate-catalog-economics.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

describe("runCatalogEconomicsValidation", () => {
  test("hides moonshotai, routes easy cost work to local peer, and emits catalogEconomics", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-catalog-economics-"),
    );

    const result = await runCatalogEconomicsValidation({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "catalog-economics-validation-tests",
    });

    expect(result.moonshotOperatorProviderPresent).toBe(true);
    expect(result.moonshotaiHiddenFromProviders).toBe(true);
    expect(result.difficultyStrategy).toBe("cost");
    expect(result.localPeerSelectedOverKimi).toBe(true);
    expect(result.selectedModelId).toBe("lfm2.5-8b-a1b");
    expect(result.catalogEconomics.tokenEconomicsSource).toBe("local-free");
    expect(result.catalogEconomics.estimatedRequestUsd).toBe(0);
  }, 180_000);
});
