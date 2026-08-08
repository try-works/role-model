import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "..", "..");

const AGENT_PLUGINS_SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json";
const AGENT_PLUGINS_NAME_RE = /^(?!.*(?:--|\\.\\.))[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

describe("Codex docs, skill, plugin, and safety guardrails", () => {
  test("ships skill, plugin manifest, and docs with compaction ownership", async () => {
    const skill = await readFile(join(packageRoot, "skills", "role-model", "SKILL.md"), "utf8");
    const plugin = await readFile(join(packageRoot, ".codex-plugin", "plugin.json"), "utf8");
    const docs = await readFile(
      join(repoRoot, "apps", "docs-site", "content", "docs", "integrations", "codex.mdx"),
      "utf8",
    );
    expect(skill).toContain("role-model");
    expect(skill).toContain("codex-role-model setup");
    expect(skill).toContain("user-level");
    expect(skill).toContain("hooks");
    expect(skill).toContain("Never paste");
    expect(skill).toContain("Compaction is **Codex-managed**");
    expect(plugin).toContain("role-model");
    expect(docs).toContain("role-model");
    expect(docs).toContain("Compaction is **Codex-managed**");
    expect(docs).toContain("npx --yes @try-works/codex-role-model@latest setup");
    expect(docs).toContain("ROLE_MODEL_CODEX_API_KEY");
  });

  test("root plugin.json conforms to Agent Plugins 1.0.0 portable contract", async () => {
    const raw = await readFile(join(packageRoot, "plugin.json"), "utf8");
    const manifest = JSON.parse(raw) as Record<string, unknown>;
    expect(manifest.$schema).toBe(AGENT_PLUGINS_SCHEMA);
    expect(typeof manifest.name).toBe("string");
    expect(manifest.name).toMatch(AGENT_PLUGINS_NAME_RE);
    expect(String(manifest.name).length).toBeLessThanOrEqual(64);

    // Closed schema: only known top-level fields.
    const allowed = new Set([
      "$schema",
      "name",
      "version",
      "description",
      "author",
      "homepage",
      "repository",
      "license",
      "keywords",
      "extensions",
    ]);
    for (const key of Object.keys(manifest)) {
      expect(allowed.has(key)).toBe(true);
    }
    // Skills are discovered from skills/, not declared in the portable manifest.
    expect(manifest).not.toHaveProperty("skills");
    expect(manifest).not.toHaveProperty("mcpServers");

    if (manifest.extensions !== undefined) {
      expect(manifest.extensions).not.toBeNull();
      expect(typeof manifest.extensions).toBe("object");
      expect(Array.isArray(manifest.extensions)).toBe(false);
      for (const [ns, value] of Object.entries(manifest.extensions as Record<string, unknown>)) {
        expect(ns).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/i);
        expect(value).not.toBeNull();
        expect(typeof value).toBe("object");
        expect(Array.isArray(value)).toBe(false);
      }
    }

    const skillMd = await readFile(join(packageRoot, "skills", "role-model", "SKILL.md"), "utf8");
    expect(skillMd.startsWith("---")).toBe(true);
  });

  test("Codex plugin manifest keeps Codex-native skills path and install surface", async () => {
    const raw = await readFile(join(packageRoot, ".codex-plugin", "plugin.json"), "utf8");
    const codex = JSON.parse(raw) as {
      name: string;
      skills: string;
      interface?: { displayName?: string };
    };
    expect(codex.name).toBe("role-model");
    expect(codex.skills).toBe("./skills/");
    expect(codex.interface?.displayName).toBe("role-model");
  });
});
