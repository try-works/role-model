import { describe, expect, test } from "vitest";
import { mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "smol-toml";
import {
  assertUserLevelConfigPath,
  buildManagedProviderBlock,
  removeManagedBlock,
  upsertManagedBlock,
} from "../src/codex-config.js";

describe("codex config manager", () => {
  test("builds managed provider block with responses wire and adapter base_url", () => {
    const absCatalog = join(homedir(), ".codex", "role-model", "models.json").replace(/\\/g, "/");
    const block = buildManagedProviderBlock({
      model: "baseline.remote-only",
      adapterPort: 3460,
      catalogPath: absCatalog,
      integrationMode: "signed-in",
    });
    expect(block).toContain("# BEGIN role-model-provider-managed");
    expect(block).toContain('openai_base_url = "http://127.0.0.1:3460/v1"');
    expect(block).toContain(`model_catalog_json = "${absCatalog}"`);
    expect(block).not.toContain("forced_login_method");
    expect(block).not.toContain("[model_providers.role-model]");
  });

  test("default catalog path is absolute under ~/.codex/role-model", async () => {
    const { catalogPathForHome } = await import("../src/codex-config.js");
    const home = join(homedir(), ".codex");
    expect(catalogPathForHome(home, {})).toBe(
      join(home, "role-model", "models.json").replace(/\\/g, "/"),
    );
  });

  test("round-trips managed block and preserves unrelated settings", () => {
    const existing = 'model = "gpt-5"\n\n[mcp_servers.demo]\ncommand = "echo"\n';
    const managed = buildManagedProviderBlock({
      model: "baseline.remote-only",
      catalogPath: join(homedir(), ".codex", "role-model", "models.json").replace(/\\/g, "/"),
    });
    const next = upsertManagedBlock(existing, managed);
    expect(next).toContain("[mcp_servers.demo]");
    expect(next).toContain("# BEGIN role-model-provider-managed");
    expect(next.indexOf("# BEGIN role-model-provider-managed")).toBeLessThan(next.indexOf("[mcp_servers.demo]"));
    const removed = removeManagedBlock(next);
    expect(removed).toContain("[mcp_servers.demo]");
    expect(removed).not.toContain("# BEGIN role-model-provider-managed");
  });

  test("places managed root keys before existing tables so TOML does not nest them", () => {
    const existing = [
      'notify = ["demo"]',
      "",
      "[shell_environment_policy.set]",
      'FOO = "bar"',
      "",
    ].join("\n");
    const managed = buildManagedProviderBlock({
      model: "baseline.remote-only",
      catalogPath: "C:/Users/demo/.codex/role-model/models.json",
      integrationMode: "signed-in",
    });
    const next = upsertManagedBlock(existing, managed);
    expect(next.indexOf("model_catalog_json")).toBeLessThan(next.indexOf("[shell_environment_policy.set]"));
    expect(next).toMatch(/^# BEGIN role-model-provider-managed/m);
    const parsed = parse(next) as Record<string, unknown>;
    expect(parsed.model).toBe("baseline.remote-only");
    expect(parsed.model_catalog_json).toBe("C:/Users/demo/.codex/role-model/models.json");
    expect(parsed.openai_base_url).toBe("http://127.0.0.1:3460/v1");
    expect((parsed.shell_environment_policy as { set?: { FOO?: string } })?.set?.FOO).toBe("bar");
  });

  test("refuses non-user-level config paths", () => {
    const home = mkdtempSync(join(tmpdir(), "codex-home-"));
    expect(() => assertUserLevelConfigPath(join(home, "project", ".codex", "config.toml"), home)).toThrow(
      /Refusing to write role-model provider keys/,
    );
  });
});
