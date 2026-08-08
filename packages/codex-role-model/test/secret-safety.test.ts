import { describe, expect, test } from "vitest";
import { runCommand } from "../src/commands.js";
import { createDiscovery } from "./fixtures.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("secret safety", () => {
  test("redacts bearer tokens and env key assignments in explain output path", async () => {
    const discovery = createDiscovery();
    const secret = "codex-local-secret-value";
    process.env.ROLE_MODEL_CODEX_API_KEY = secret;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url) => {
      if (String(url).endsWith("/healthz")) return jsonResponse({ status: "healthy" });
      if (String(url).endsWith("/api/version")) return jsonResponse({ version: "0.0.0-test" });
      if (String(url).endsWith("/api/role-model/downstream/openai")) return jsonResponse(discovery);
      if (String(url).includes("/api/role-model/requests")) {
        return jsonResponse([
          {
            requestId: "req-1",
            status: "ok",
            modelId: "baseline.remote-only",
            role_model: { intent: { role_hint_id: "coder" } },
          },
        ]);
      }
      if (String(url).includes("/router/decisions/")) {
        return jsonResponse({ requestId: "req-1", strategyLabel: "test" });
      }
      throw new Error(`unexpected ${String(url)}`);
    };
    try {
      const result = await runCommand(["explain", "req-1"]);
      expect(result.text).not.toContain(secret);
      expect(result.text).not.toContain(`Bearer ${secret}`);
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.ROLE_MODEL_CODEX_API_KEY;
    }
  });
});
