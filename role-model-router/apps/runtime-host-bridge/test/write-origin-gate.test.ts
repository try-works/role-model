import { afterEach, describe, expect, it } from "vitest";
import { startBridgeServer } from "../src/index.js";

interface State {
  config: unknown;
  controller: unknown;
  endpoint: unknown;
}
const servers: Array<{ close(): Promise<void> }> = [];
const start = async (
  state: State,
  operatorAuthToken?: string,
  extra: Record<string, unknown> = {},
) => {
  const server = await startBridgeServer(
    {
      host: "127.0.0.1",
      port: 0,
      updateRuntimeConfig: async (body) => {
        state.config = body;
        return body;
      },
      updateControllerAssignment: async (body) => {
        state.controller = body;
        return { ...body, scope: "global" };
      },
      activateEndpoint: async (body) => {
        state.endpoint = body;
        return body;
      },
      ...(operatorAuthToken === undefined ? {} : { operatorAuthToken }),
      ...extra,
    } as Parameters<typeof startBridgeServer>[0],
    { allowTestSeamBackend: true },
  );
  servers.push(server);
  return { base: `http://127.0.0.1:${String(server.port)}`, server };
};
const send = (
  base: string,
  path: string,
  method: string,
  headers: Record<string, string> = {},
  body: unknown = {},
) =>
  fetch(base + path, {
    body:
      method === "POST" || method === "PUT" || method === "PATCH"
        ? JSON.stringify(body)
        : undefined,
    headers: { "content-type": "application/json", ...headers },
    method,
  });
afterEach(async () => {
  for (const server of servers.splice(0)) await server.close();
});

describe("S83a write origin gate", () => {
  it("rejects foreign-origin writes with 403 and no state change", async () => {
    const state: State = { config: "old", controller: "old", endpoint: "old" };
    const { base } = await start(state);
    const headers = { origin: "https://evil.example" };
    const put = await send(base, "/api/role-model/runtime/config", "PUT", headers, { evil: true });
    const patch = await send(base, "/api/role-model/controller", "PATCH", headers, {
      endpointId: "evil",
    });
    const post = await send(base, "/api/role-model/endpoints", "POST", headers, { evil: true });
    expect(put.status).toBe(403);
    expect(patch.status).toBe(403);
    expect(post.status).toBe(403);
    expect(state).toEqual({ config: "old", controller: "old", endpoint: "old" });
    for (const response of [put, patch, post])
      expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect((await put.json()).error).toBeTruthy();
  });

  it("allows same-origin and no-Origin writes, and leaves GET CORS unchanged", async () => {
    const state: State = { config: "old", controller: "old", endpoint: "old" };
    const { base } = await start(state);
    const sameOrigin = await send(
      base,
      "/api/role-model/runtime/config",
      "PUT",
      { origin: base },
      { ok: 1 },
    );
    expect(sameOrigin.status).toBe(200);
    expect(state.config).toEqual({ ok: 1 });
    const noOrigin = await send(
      base,
      "/api/role-model/controller",
      "PATCH",
      {},
      { endpointId: "ok" },
    );
    expect(noOrigin.status).toBe(200);
    expect(state.controller).toEqual({ endpointId: "ok" });
    const get = await fetch(`${base}/health`, { headers: { origin: "https://evil.example" } });
    expect(get.status).toBe(200);
    expect(get.headers.get("access-control-allow-origin")).toBe("*");
  });

  it("requires the operator credential on writes when one is configured", async () => {
    const state: State = { config: "old", controller: "old", endpoint: "old" };
    const { base } = await start(state, "secret");
    const denied = await send(
      base,
      "/api/role-model/runtime/config",
      "PUT",
      { origin: base },
      { ok: 2 },
    );
    expect(denied.status).toBe(401);
    const allowed = await send(
      base,
      "/api/role-model/runtime/config",
      "PUT",
      { authorization: "Bearer secret", origin: base },
      { ok: 3 },
    );
    expect(allowed.status).toBe(200);
    expect(state.config).toEqual({ ok: 3 });
  });
});
