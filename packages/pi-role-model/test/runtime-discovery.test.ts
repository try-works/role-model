import { describe, expect, test } from "vitest";
import { discoverRoleModelRuntime, RoleModelDiscoveryError } from "../src/runtime-discovery.js";
import { createDiscovery } from "./fixtures.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Role-Model runtime discovery", () => {
  test("fetches health, version, and downstream discovery during normal discovery", async () => {
    const calls: string[] = [];
    const discovery = createDiscovery();
    const result = await discoverRoleModelRuntime({
      fetch: async (url) => {
        calls.push(String(url));
        if (String(url).endsWith("/healthz")) return jsonResponse({ status: "healthy" });
        if (String(url).endsWith("/api/version")) return jsonResponse({ version: "0.0.0-test" });
        if (String(url).endsWith("/api/role-model/downstream/openai")) return jsonResponse(discovery);
        throw new Error(`unexpected url ${String(url)}`);
      },
    });

    expect(calls).toEqual([
      "http://127.0.0.1:3456/healthz",
      "http://127.0.0.1:3456/api/version",
      "http://127.0.0.1:3456/api/role-model/downstream/openai",
    ]);
    expect(result.state).toBe("ready");
    expect(result.health).toEqual({ status: "healthy" });
    expect(result.version?.version).toBe("0.0.0-test");
  });

  test("blocks remote endpoints before issuing network calls", async () => {
    const calls: string[] = [];
    await expect(
      discoverRoleModelRuntime({
        endpoint: "https://role-model.example.test",
        fetch: async (url) => {
          calls.push(String(url));
          return jsonResponse({});
        },
      }),
    ).rejects.toMatchObject({
      state: "blocked-remote",
      remediation: expect.stringContaining("allowRemote"),
    });
    expect(calls).toEqual([]);
  });

  test("uses compact /v1/models fallback when rich discovery is unavailable", async () => {
    const calls: string[] = [];
    const result = await discoverRoleModelRuntime({
      fetch: async (url) => {
        calls.push(String(url));
        if (String(url).endsWith("/healthz")) return jsonResponse({ status: "healthy" });
        if (String(url).endsWith("/api/version")) return jsonResponse({ version: "0.0.0-test" });
        if (String(url).endsWith("/api/role-model/downstream/openai")) return jsonResponse({ error: "missing" }, 404);
        if (String(url).endsWith("/v1/models")) {
          return jsonResponse({
            object: "list",
            data: [
              {
                id: "role-model/auto",
                object: "model",
                owned_by: "role-model",
                endpoint_ids: ["local"],
                context_window: 32000,
                max_tokens: 4096,
                input: ["text"],
                role_model: { type: "alias" },
              },
            ],
          });
        }
        throw new Error(`unexpected url ${String(url)}`);
      },
    });

    expect(calls).toContain("http://127.0.0.1:3456/v1/models");
    expect(result.state).toBe("fallback");
    expect(result.warnings?.join("\n")).toContain("compact /v1/models fallback");
    expect(result.discovery.models[0]?.id).toBe("role-model/auto");
  });

  test("reports malformed rich discovery as incompatible without fallback", async () => {
    await expect(
      discoverRoleModelRuntime({
        fetch: async (url) => {
          if (String(url).endsWith("/healthz")) return jsonResponse({ status: "healthy" });
          if (String(url).endsWith("/api/version")) return jsonResponse({ version: "0.0.0-test" });
          return jsonResponse({ contractVersion: "wrong" });
        },
      }),
    ).rejects.toBeInstanceOf(RoleModelDiscoveryError);

    await expect(
      discoverRoleModelRuntime({
        fetch: async (url) => {
          if (String(url).endsWith("/healthz")) return jsonResponse({ status: "healthy" });
          if (String(url).endsWith("/api/version")) return jsonResponse({ version: "0.0.0-test" });
          return jsonResponse({ contractVersion: "wrong" });
        },
      }),
    ).rejects.toMatchObject({
      state: "incompatible",
      remediation: expect.stringContaining("downstream OpenAI discovery"),
    });
  });
});
