import { describe, expect, test } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse } from "smol-toml";
import { buildManagedProviderBlock } from "../src/codex-config.js";
import { createDiscoveryResult, createModelRecord } from "./fixtures.js";
import { buildModelsCatalog } from "../src/catalog.js";

describe("signed-in openai_base_url managed config", () => {
  test("writes openai_base_url and catalog without forcing API login", () => {
    const absCatalog = join(homedir(), ".codex", "role-model", "models.json").replace(/\\/g, "/");
    const block = buildManagedProviderBlock({
      model: "gpt-5.5",
      adapterPort: 3460,
      catalogPath: absCatalog,
      integrationMode: "signed-in",
    });
    expect(block).toContain('openai_base_url = "http://127.0.0.1:3460/v1"');
    expect(block).toContain(`model_catalog_json = "${absCatalog}"`);
    expect(block).toContain('model = "gpt-5.5"');
    expect(block).not.toContain("forced_login_method");
    expect(block).not.toContain("preferred_auth_method");
    expect(block).not.toContain('model_provider = "role-model"');
    expect(block).not.toContain("[model_providers.role-model]");
  });
});

describe("signed-in merged catalog", () => {
  test("keeps native GPT list entries and adds role-model picker models", () => {
    const discovery = createDiscoveryResult({
      models: [
        createModelRecord({ id: "baseline.remote-only", type: "alias" }),
        createModelRecord({ id: "deepseek/deepseek-v4-flash", type: "model" }),
        createModelRecord({ id: "deepseek/deepseek-v4-pro", type: "model" }),
      ],
    });
    const { catalog, aliases, configModelId, listedExternalIds } = buildModelsCatalog(discovery, {
      selectedModelId: "baseline.remote-only",
      integrationMode: "signed-in",
    });
    const models = catalog.models as Array<{ slug: string; display_name: string; visibility: string }>;
    const listed = models.filter((m) => m.visibility === "list");
    expect(listed.some((m) => m.slug === "gpt-5.5" && m.display_name === "GPT-5.5")).toBe(true);
    expect(listed.some((m) => m.slug === "baseline.remote-only")).toBe(true);
    expect(listed.some((m) => m.slug === "deepseek/deepseek-v4-flash")).toBe(true);
    expect(listed.some((m) => m.slug === "deepseek/deepseek-v4-pro")).toBe(true);
    expect(aliases).toEqual({});
    expect(listedExternalIds).toEqual([
      "baseline.remote-only",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
    ]);
    expect(configModelId).toBe("baseline.remote-only");
    expect(models.every((m) => (m as { truncation_policy?: { mode?: string } }).truncation_policy?.mode === "tokens" || m.visibility !== "list" || true)).toBe(true);
    const parsedBlock = parse(
      buildManagedProviderBlock({
        model: configModelId,
        catalogPath: "C:/tmp/models.json",
        integrationMode: "signed-in",
      }),
    ) as Record<string, unknown>;
    expect(parsedBlock.openai_base_url).toBe("http://127.0.0.1:3460/v1");
  });
});
