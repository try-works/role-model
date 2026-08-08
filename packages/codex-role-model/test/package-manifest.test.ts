import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(packageRoot, "..", "..");

describe("codex-role-model package scaffold", () => {
  test("package.json exposes public publishable codex-role-model bin", async () => {
    const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8")) as {
      name: string;
      private?: boolean;
      bin: Record<string, string>;
      publishConfig?: { access?: string };
      files?: string[];
    };
    expect(manifest.name).toBe("@try-works/codex-role-model");
    expect(manifest.private).toBeUndefined();
    expect(manifest.publishConfig?.access).toBe("public");
    expect(manifest.bin["codex-role-model"]).toBe("bin/codex-role-model.js");
    expect(manifest.files).toEqual(
      expect.arrayContaining(["dist", ".codex-plugin", "plugin.json", "marketplace.npm.json"]),
    );
  });

  test("README documents quick start, marketplace, and compaction ownership", async () => {
    const readme = await readFile(join(packageRoot, "README.md"), "utf8");
    expect(readme).toContain("## Quick start");
    expect(readme).toContain("npx --yes @try-works/codex-role-model@latest setup");
    expect(readme).toContain("## Codex plugin");
    expect(readme).toContain("codex plugin add role-model@role-model");
    expect(readme).toContain("ROLE_MODEL_ENDPOINT");
    expect(readme).toContain("ROLE_MODEL_CODEX_ADAPTER_PORT");
    expect(readme).toContain("ROLE_MODEL_CODEX_API_KEY");
    expect(readme).toContain("Compaction is **Codex-managed**");
    expect(readme).toContain("integrations/codex");
    expect(readme).toContain("## Packaging");
    expect(readme).toContain("Agent Plugins");
  });

  test("repo marketplace points at the package plugin root", async () => {
    const raw = await readFile(join(repoRoot, ".agents", "plugins", "marketplace.json"), "utf8");
    const market = JSON.parse(raw) as {
      name: string;
      plugins: Array<{
        name: string;
        source: { source: string; package?: string; registry?: string; version?: string };
      }>;
    };
    expect(market.name).toBe("role-model");
    expect(market.plugins[0]?.name).toBe("role-model");
    expect(market.plugins[0]?.source).toEqual({
      source: "npm",
      package: "@try-works/codex-role-model",
      registry: "https://registry.npmjs.org",
      version: "^0.1.1",
    });
  });
});
