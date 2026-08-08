import { describe, expect, test } from "vitest";
import { runCommand } from "../src/commands.js";
import { createDiscovery } from "./fixtures.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("codex-role-model CLI routing", () => {
  test("help command exits zero and lists core commands", async () => {
    const result = await runCommand(["help"]);
    expect(result.ok).toBe(true);
    expect(result.text).toContain("setup");
    expect(result.text).toContain("alias list");
  });

  test("unknown command returns non-zero", async () => {
    const result = await runCommand(["not-a-command"]);
    expect(result.ok).toBe(false);
  });

  test("alias use rejects foreign model ids deterministically", async () => {
    const discovery = createDiscovery();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith("/healthz")) return jsonResponse({ status: "healthy" });
      if (String(url).endsWith("/api/version")) return jsonResponse({ version: "0.0.0-test" });
      if (String(url).endsWith("/api/role-model/downstream/openai")) return jsonResponse(discovery);
      throw new Error(`unexpected ${String(url)}`);
    };
    try {
      const result = await runCommand(["alias", "use", "gpt-4o"]);
      expect(result.ok).toBe(false);
      expect(result.text).toContain("foreign-provider-model");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
