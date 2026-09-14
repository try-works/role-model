import { describe, expect, test } from "vitest";

import { startBridgeServer } from "../src/index.js";

/**
 * Run 99 - the Learning page is served by the runtime itself, so its readbacks must work on the
 * loopback origin without the operator pasting a bearer token (that was the observed "all the APIs
 * are 401" report). Mutations and every other operator surface stay token-gated, and a request that
 * presents a credential must still present a valid one.
 */

const registry = {
  defaultEndpointId: "endpoint-local",
  endpoints: [
    {
      id: "endpoint-local",
      providerId: "local",
      modelId: "test-model",
      endpoint: "http://127.0.0.1:1",
      capabilities: ["chat"],
      enabled: true,
      status: "ready",
    },
  ],
} as never;

const operatorContext = { channel: "stage", scope: "standalone-runtime-stage", authorizationEpoch: 1 };

const start = () =>
  startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    operatorAuthToken: "operator-secret",
    operatorContext,
    registry,
    executeChatCompletions: async () => {
      throw new Error("not used");
    },
    executeResponses: async () => {
      throw new Error("not used");
    },
    readLearningActivity: async () => ({ schemaVersion: "role-model.learning-activity.v1", scannedStores: 4 }),
    readLearningHistory: async () => ({ schemaVersion: "role-model.learning-history.v1", scannedStores: 4 }),
    readLearningPolicy: async () => ({ policyVersion: 21 }),
  });

describe("run99 anonymous loopback Learning readbacks", () => {
  test("serves the Learning readbacks without a token and keeps everything else gated", async () => {
    const server = await start();
    const baseUrl = `http://127.0.0.1:${server.port}`;
    try {
      const activity = await fetch(`${baseUrl}/api/role-model/operator/learning/activity?windowMinutes=60`);
      expect(activity.status).toBe(200);
      expect(await activity.json()).toMatchObject({ schemaVersion: "role-model.learning-activity.v1" });

      const history = await fetch(`${baseUrl}/api/role-model/operator/learning/history?hours=168&bucketHours=6`);
      expect(history.status).toBe(200);
      expect(await history.json()).toMatchObject({ schemaVersion: "role-model.learning-history.v1" });

      const policy = await fetch(`${baseUrl}/api/role-model/operator/learning/policy`);
      expect(policy.status).toBe(200);

      // Still gated: other operator surfaces and every mutation.
      const otherSurface = await fetch(`${baseUrl}/api/role-model/operator/trace-roots`);
      expect(otherSurface.status).toBe(401);
      expect(await otherSurface.json()).toMatchObject({ error: "operator_authentication_required" });

      const mutation = await fetch(`${baseUrl}/api/role-model/operator/learning/policy`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changes: { stage: "S2" }, expectedPolicyVersion: 21, operator: "test" }),
      });
      expect(mutation.status).toBe(401);

      // A presented credential must still be valid.
      const wrongToken = await fetch(`${baseUrl}/api/role-model/operator/learning/activity`, {
        headers: { authorization: "Bearer not-the-token" },
      });
      expect(wrongToken.status).toBe(401);

      const withToken = await fetch(`${baseUrl}/api/role-model/operator/learning/activity`, {
        headers: { authorization: "Bearer operator-secret" },
      });
      expect(withToken.status).toBe(200);
    } finally {
      await server.close();
    }
  });
});
