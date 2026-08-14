import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { buildModelsCatalog } from "../src/catalog.js";
import {
  buildNativeAliasAssignments,
  buildPickerExternalModels,
  loadDefaultNativeListSlots,
  readNativeAliases,
  resolveNativeAliasedModelId,
  writeNativeAliases,
} from "../src/native-alias.js";
import { createDiscoveryResult, createModelRecord } from "./fixtures.js";

describe("native-alias picker assignments", () => {
  test("picker order is selected strategy then configured model ids", () => {
    const discovery = createDiscoveryResult({
      models: [
        createModelRecord({ id: "baseline.remote-only", type: "alias" }),
        createModelRecord({ id: "baseline.hybrid", type: "alias" }),
        createModelRecord({ id: "deepseek/deepseek-v4-flash", type: "model" }),
        createModelRecord({ id: "deepseek/deepseek-v4-pro", type: "model" }),
      ],
      setup: { recommendedModel: "baseline.hybrid", notes: [] },
    });
    const picked = buildPickerExternalModels(discovery.discovery, "baseline.remote-only");
    expect(picked.map((m) => m.id)).toEqual([
      "baseline.remote-only",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
    ]);
  });

  test("assigns external models onto native list slots by priority", () => {
    const slots = loadDefaultNativeListSlots();
    expect(slots.length).toBeGreaterThanOrEqual(3);
    const assignments = buildNativeAliasAssignments(slots, [
      createModelRecord({ id: "baseline.remote-only", type: "alias" }),
      createModelRecord({ id: "deepseek/deepseek-v4-flash", type: "model" }),
    ]);
    expect(assignments).toHaveLength(2);
    expect(assignments[0]?.nativeModel.slug).toBe(slots[0]?.slug);
    expect(assignments[0]?.externalId).toBe("baseline.remote-only");
    expect(assignments[1]?.externalId).toBe("deepseek/deepseek-v4-flash");
  });

  test("catalog lists native slugs with external display names and hides canonical ids", () => {
    const discovery = createDiscoveryResult({
      models: [
        createModelRecord({ id: "baseline.remote-only", type: "alias" }),
        createModelRecord({ id: "deepseek/deepseek-v4-flash", type: "model" }),
        createModelRecord({ id: "deepseek/deepseek-v4-pro", type: "model" }),
      ],
    });
    const { catalog, aliases } = buildModelsCatalog(discovery, {
      selectedModelId: "baseline.remote-only",
      integrationMode: "login-free",
    });
    const models = catalog.models as Array<{
      slug: string;
      display_name: string;
      visibility: string;
      truncation_policy?: { mode?: string; type?: string; limit?: number };
      priority?: number;
    }>;
    const listed = models.filter((m) => m.visibility === "list");
    expect(listed.map((m) => m.display_name)).toEqual([
      "baseline.remote-only",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
    ]);
    expect(listed.every((m) => m.slug.startsWith("gpt-"))).toBe(true);
    const firstListed = listed[0];
    expect(firstListed).toBeDefined();
    if (!firstListed) throw new Error("Expected at least one listed native alias.");
    expect(aliases[firstListed.slug]).toBe("baseline.remote-only");
    expect(models.every((m) => m.truncation_policy?.mode === "tokens")).toBe(true);
    expect(models.every((m) => m.truncation_policy?.type === undefined)).toBe(true);

    const hidden = models.filter((m) => m.visibility === "hide");
    expect(hidden.map((m) => m.slug).sort()).toEqual([
      "baseline.remote-only",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
    ]);
    expect(models.every((m) => m.visibility !== "listable")).toBe(true);
  });

  test("native alias file round-trips and remaps request model ids", () => {
    const dir = mkdtempSync(join(tmpdir(), "native-alias-"));
    mkdirSync(join(dir, "role-model"), { recursive: true });
    const path = join(dir, "role-model", "native-aliases.json");
    writeNativeAliases(path, { "gpt-5.6-sol": "baseline.remote-only" });
    expect(readNativeAliases(path)).toEqual({ "gpt-5.6-sol": "baseline.remote-only" });
    expect(resolveNativeAliasedModelId("gpt-5.6-sol", path)).toBe("baseline.remote-only");
    expect(resolveNativeAliasedModelId("baseline.remote-only", path)).toBe("baseline.remote-only");
    expect(JSON.parse(readFileSync(path, "utf8")).version).toBe(1);
  });
});
