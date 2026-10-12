/**
 * Run 108 addendum-01 A2 (R3 UI surfacing, host half).
 *
 * The requirement's acceptance is "receipts surface in the operator UI", but at
 * audit time only the writer existed (cli.ts record-degradation) - there was no
 * reader, route or view for knowledge_store_degradation_receipts (nor the R6b
 * twin knowledge_worker_degradation_receipts). This suite pins the host API
 * readback surface added in index.ts: a GET operator route that lists both
 * receipt tables, an honest 503 operator_capability_unavailable when the
 * readback is not bound, and the operator authentication gate.
 */
import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { startBridgeServer } from "../src/index.js";

const registry = {
  endpoints: [],
  diagnostics: [],
  lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
} as unknown as EndpointRegistryResult;

const operatorContext = {
  channel: "development" as const,
  scope: "run108:addendum01-a2",
  authorizationEpoch: 108,
};

const authHeaders = {
  authorization: "Bearer operator-secret",
  "x-role-model-channel": operatorContext.channel,
  "x-role-model-scope": operatorContext.scope,
  "x-role-model-authorization-epoch": String(operatorContext.authorizationEpoch),
};

const json = (response: Response): Promise<unknown> => response.json();

describe("run108 addendum-01 A2 store degradation receipts readback", () => {
  test("answers 503 operator_capability_unavailable when the host has no readback bound", async () => {
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      operatorAuthToken: "operator-secret",
      deviceOwnerTrust: "off",
      operatorContext,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
    });
    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/operator/store-degradation-receipts`,
        { headers: authHeaders },
      );
      expect(response.status).toBe(503);
      expect(await json(response)).toMatchObject({
        error: "operator_capability_unavailable",
        capability: "store degradation receipt readback",
        overall: "unavailable",
      });
    } finally {
      await server.close();
    }
  });

  test("returns the bound readback payload listing both store and worker receipts", async () => {
    const payload = {
      schemaVersion: "role-model.store-degradation-receipts.v1",
      store: {
        available: true,
        receipts: [
          {
            receiptId: "store-receipt-1",
            atMs: 1728396120000,
            capability: "ladder-materialization",
            reason: "database is locked",
          },
        ],
      },
      worker: {
        available: true,
        receipts: [
          {
            receiptId: "worker-receipt-1",
            atMs: 1728396130000,
            capability: "knowledge:validate-candidate",
            reason: "development floor unsatisfiable at pool size 3 for coder.edit",
          },
        ],
      },
    };
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      operatorAuthToken: "operator-secret",
      deviceOwnerTrust: "off",
      operatorContext,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
      readStoreDegradationReceipts: async (query) => {
        expect(query).toEqual({});
        return payload;
      },
    });
    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/operator/store-degradation-receipts`,
        { headers: authHeaders },
      );
      expect(response.status).toBe(200);
      expect(await json(response)).toEqual(payload);
    } finally {
      await server.close();
    }
  });

  test("keeps the receipts readback behind the operator authentication gate", async () => {
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      operatorAuthToken: "operator-secret",
      deviceOwnerTrust: "off",
      operatorContext,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
    });
    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/operator/store-degradation-receipts`,
      );
      expect(response.status).toBe(401);
      expect(await json(response)).toMatchObject({ error: "operator_authentication_required" });
    } finally {
      await server.close();
    }
  });
});
