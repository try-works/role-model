import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { createRuntimeConfigClient } from "../src/runtime-config";

/**
 * S222: the runtime-config PUT itself, pinned against a stub fetch.
 *
 * S219 proved the end-to-end save by hand and S221 pinned the command; neither asserts the network
 * request. This does: method, path, body, content-type and the parsed response.
 */
interface Call {
  body?: string;
  headers?: Record<string, string>;
  method?: string;
  url: string;
}

const clientWith = (calls: Call[], response: unknown, status = 200) =>
  createRuntimeConfigClient({
    baseUrl: "http://localhost",
    fetchImpl: (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({
        body: init?.body === undefined ? undefined : String(init.body),
        headers: (init?.headers ?? {}) as Record<string, string>,
        method: init?.method,
        url: String(input),
      });
      return new Response(JSON.stringify(response), { status });
    }) as unknown as typeof fetch,
    token: "op-token",
  });

describe("S222 runtime config client", () => {
  it("save issues exactly one PUT to the documented path with the config body", async () => {
    const calls: Call[] = [];
    const client = clientWith(calls, { applied: true, config: { version: "1.0" } });
    const result = await client.save({ execution_mode: "decision_only", version: "1.0" });
    assert.equal(calls.length, 1, "one request");
    assert.equal(calls[0]?.method, "PUT");
    assert.equal(calls[0]?.url, "http://localhost/api/role-model/runtime/config");
    assert.equal(calls[0]?.headers?.["content-type"], "application/json");
    assert.equal(calls[0]?.headers?.authorization, "Bearer op-token");
    assert.deepEqual(JSON.parse(calls[0]?.body ?? "{}"), {
      execution_mode: "decision_only",
      version: "1.0",
    });
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, { applied: true, config: { version: "1.0" } });
  });

  it("read issues a GET and returns the status unchanged (a 400 must not look like success)", async () => {
    const calls: Call[] = [];
    const client = clientWith(calls, { error: "invalid" }, 400);
    const result = await client.read();
    assert.equal(calls[0]?.method, undefined, "read uses the default GET");
    assert.equal(result.status, 400, "the status reaches the caller");
  });
});
