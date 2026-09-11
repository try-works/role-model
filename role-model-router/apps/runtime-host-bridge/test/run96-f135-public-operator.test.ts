import { afterEach, describe, expect, test } from "vitest";

import { startBridgeServer } from "../src/index.js";

const servers: Array<{ close: () => Promise<void> }> = [];
const operatorContext = {
  channel: "development" as const,
  scope: "run96:public-operator",
  authorizationEpoch: 96,
};

function baseOptions(overrides: Record<string, unknown> = {}) {
  return {
    host: "127.0.0.1",
    port: 0,
    registry: {} as never,
    executeChatCompletions: async () => ({}) as never,
    executeResponses: async () => ({}) as never,
    operatorAuthToken: "operator-secret",
    operatorContext,
    ...overrides,
  } as never;
}

async function startTestServer(overrides: Record<string, unknown> = {}) {
  const server = await startBridgeServer(baseOptions(overrides));
  servers.push(server);
  return server;
}

function operatorHeaders(
  capability: string,
  overrides: Record<string, string> = {},
): Record<string, string> {
  return {
    authorization: "Bearer operator-secret",
    "x-role-model-channel": operatorContext.channel,
    "x-role-model-scope": operatorContext.scope,
    "x-role-model-authorization-epoch": String(operatorContext.authorizationEpoch),
    "x-role-model-capability": capability,
    ...overrides,
  };
}

afterEach(async () => {
  while (servers.length > 0) await servers.pop()?.close();
});

describe("Run 96 F135 public operator boundary", () => {
  test("requires the exact channel, scope, epoch, and route capability", async () => {
    const calls: string[] = [];
    const server = await startTestServer({
      readOperatorStatus: async () => {
        calls.push("status");
        return {
          schemaVersion: "role-model.operator-status.v1",
          overall: "available",
          observedAtMs: 1,
          capabilities: {},
        };
      },
    });
    const url = `http://127.0.0.1:${server.port}/api/role-model/operator/status`;

    const missingContext = await fetch(url, {
      headers: { authorization: "Bearer operator-secret" },
    });
    expect(missingContext.status).toBe(403);
    expect(await missingContext.json()).toMatchObject({
      error: "operator_context_required",
      field: "channel",
    });

    const wrongScope = await fetch(url, {
      headers: operatorHeaders("status", { "x-role-model-scope": "other-scope" }),
    });
    expect(wrongScope.status).toBe(403);
    expect(await wrongScope.json()).toMatchObject({
      error: "operator_context_mismatch",
      field: "scope",
    });

    const wrongEpoch = await fetch(url, {
      headers: operatorHeaders("status", { "x-role-model-authorization-epoch": "95" }),
    });
    expect(wrongEpoch.status).toBe(403);
    expect(await wrongEpoch.json()).toMatchObject({
      error: "operator_context_mismatch",
      field: "authorizationEpoch",
    });

    const missingCapability = await fetch(url, {
      headers: {
        authorization: "Bearer operator-secret",
        "x-role-model-channel": operatorContext.channel,
        "x-role-model-scope": operatorContext.scope,
        "x-role-model-authorization-epoch": String(operatorContext.authorizationEpoch),
      },
    });
    expect(missingCapability.status).toBe(403);
    expect(await missingCapability.json()).toMatchObject({
      error: "operator_capability_required",
      capability: "status",
    });

    const wrongCapability = await fetch(url, {
      headers: operatorHeaders("replay"),
    });
    expect(wrongCapability.status).toBe(403);
    expect(await wrongCapability.json()).toMatchObject({
      error: "operator_context_mismatch",
      field: "capability",
    });

    const valid = await fetch(url, { headers: operatorHeaders("status") });
    expect(valid.status).toBe(200);
    expect(calls).toEqual(["status"]);
  });

  test("rejects an oversized operator body before invoking the callback", async () => {
    let called = false;
    const server = await startTestServer({
      createReplayJob: async () => {
        called = true;
        return { jobId: "replay-1", status: "queued" };
      },
    });
    const body = JSON.stringify({ traceRootId: "trace-1", padding: "x".repeat(256 * 1024) });
    const response = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/operator/replay/jobs`,
      {
        method: "POST",
        headers: { ...operatorHeaders("replay"), "content-type": "application/json" },
        body,
      },
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({
      error: "operator_body_too_large",
      maxBytes: 256 * 1024,
    });
    expect(called).toBe(false);
  });

  test("does not report healthy when dependency-derived health is absent or degraded", async () => {
    const unavailable = await startTestServer();
    const unavailableResponse = await fetch(`http://127.0.0.1:${unavailable.port}/healthz`);
    expect(unavailableResponse.status).toBe(503);
    expect(await unavailableResponse.json()).toMatchObject({
      status: "unavailable",
      ready: false,
    });

    const degraded = await startTestServer({
      readHealthStatus: async () => ({ status: "degraded", executionMode: "decision_only" }),
    });
    const degradedResponse = await fetch(`http://127.0.0.1:${degraded.port}/healthz`);
    expect(degradedResponse.status).toBe(503);
    expect(await degradedResponse.json()).toMatchObject({
      status: "degraded",
      ready: false,
    });
  });
});
