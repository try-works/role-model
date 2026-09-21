import { expect, test } from "vitest";

import { resolveDeviceOwnerTrust, startBridgeServer } from "../src/index.js";

/**
 * Run 98 addendum 46 — the device owner is trusted.
 *
 * Operator instruction (2026-09-20): "i shouldnt need a token to change policy on my own machine. token
 * should be automatically encoded when im on local device making changes and this should be true for every
 * path. device owner should be trusted."
 *
 * Every `/api/role-model/operator/*` path passes the same gate, so one test proves the posture for reads and
 * mutations alike: a loopback client with no credential is the device owner; a client that is not on the
 * device still needs the token; and an operator who wants token-only behaviour can say so explicitly.
 */
const registry = { endpoints: [] } as never;

const startServer = async (options: Record<string, unknown>) => {
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry,
    getRegistry: () => registry,
    executeChatCompletions: async () => {
      throw new Error("not used");
    },
    executeResponses: async () => {
      throw new Error("not used");
    },
    readRuntimeSummary: async () => ({ status: "ok" }),
    readHealthStatus: async () => ({ status: "ok" }),
    readLearningState: async () => ({ schemaVersion: "probe", state: "read" }),
    // A runtime with a single configured context accepts a header-less request, so these tests exercise the
    // credential rule rather than the context rule.
    operatorContext: { channel: "development", scope: "run98-a46", authorizationEpoch: 1 },
    ...options,
  } as never);
  return server;
};

test("run98 a46: the loopback device owner reaches an operator path with no credential", async () => {
  const server = await startServer({});
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/operator/learning`,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ schemaVersion: "probe", state: "read" });
  } finally {
    await server.close();
  }
});

test("run98 a46: device-owner trust can be turned off so the token is required again", async () => {
  const server = await startServer({
    deviceOwnerTrust: "off",
    operatorAuthToken: "expected-token",
  });
  try {
    const refused = await fetch(`http://127.0.0.1:${server.port}/api/role-model/operator/learning`);
    expect(refused.status).toBe(401);

    const authorized = await fetch(
      `http://127.0.0.1:${server.port}/api/role-model/operator/learning`,
      {
        headers: { authorization: "Bearer expected-token" },
      },
    );
    expect(authorized.status).toBe(200);
  } finally {
    await server.close();
  }
});

test("run98 a46: the trust applies only to loopback bind hosts and loopback clients", () => {
  // Binding to a loopback address is the local device; anything else keeps the token requirement by default.
  expect(resolveDeviceOwnerTrust("127.0.0.1")).toBe("on");
  expect(resolveDeviceOwnerTrust("::1")).toBe("on");
  expect(resolveDeviceOwnerTrust("localhost")).toBe("on");
  expect(resolveDeviceOwnerTrust("0.0.0.0")).toBe("off");
  expect(resolveDeviceOwnerTrust("192.168.1.10")).toBe("off");
  // An explicit choice wins in both directions.
  expect(resolveDeviceOwnerTrust("0.0.0.0", "on")).toBe("on");
  expect(resolveDeviceOwnerTrust("127.0.0.1", "off")).toBe("off");
});
