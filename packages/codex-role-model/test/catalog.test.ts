import { describe, expect, test } from "vitest";
import { buildModelsCatalog, loadGoldenModelsResponse } from "../src/catalog.js";
import { createDiscoveryResult } from "./fixtures.js";

describe("Codex ModelsResponse catalog generation", () => {
  test("builds non-empty catalog from golden fixture and aliases", () => {
    const golden = loadGoldenModelsResponse();
    expect(Array.isArray(golden.models)).toBe(true);
    const { catalog } = buildModelsCatalog(createDiscoveryResult(), {
      integrationMode: "signed-in",
    });
    expect(Array.isArray(catalog.models)).toBe(true);
    expect((catalog.models as unknown[]).length).toBeGreaterThan(0);
    const models = catalog.models as Array<{
      slug: string;
      prefer_websockets: boolean;
      visibility: string;
      tool_mode?: string | null;
      use_responses_lite?: boolean;
    }>;
    expect(models.some((m) => m.slug === "baseline.remote-only")).toBe(true);
    expect(models.some((m) => m.slug.startsWith("gpt-"))).toBe(true);
    expect(models.every((m) => m.prefer_websockets === false)).toBe(true);
    const roleModel = models.filter(
      (m) => !m.slug.startsWith("gpt-") && m.slug !== "codex-auto-review",
    );
    expect(roleModel.length).toBeGreaterThan(0);
    expect(roleModel.every((m) => m.tool_mode === null)).toBe(true);
    expect(roleModel.every((m) => m.use_responses_lite === false)).toBe(true);
  });

  test("rejects empty alias lists", () => {
    expect(() =>
      buildModelsCatalog({
        discovery: { ...createDiscoveryResult().discovery, models: [] as never },
        version: undefined,
        health: undefined,
        state: "ready",
        warnings: [],
        providerRegistered: true,
        modelDiagnostics: [],
      }),
    ).toThrow(/empty Codex model catalog/);
  });
});
