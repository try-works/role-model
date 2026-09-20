import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { startBridgeServer } from "../src/index.js";

/**
 * Run 98 addendum 54 (implementing addendum 53 §3) — the operator route that makes A44-S2's live
 * sustained-breach half verifiable.
 *
 * The guardrail window/rollback behaviour exists in the knowledge store and is covered by
 * `tests/track-b/run98-a44-s2-guardrail-window.test.mjs`, but nothing in the operator or Track B route set can
 * record a breach: the capability is only reachable from the runtime's own signal loop, which has never fired one
 * (0 rows in both knowledge stores). Without this route the live half can only be claimed, not measured.
 */
const registry = {
  endpoints: [],
  diagnostics: [],
  lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
} as unknown as EndpointRegistryResult;

describe("run98 a54 operator guardrail-breach route", () => {
  test("run98 a57: the scenario restore forwards to the bound operator surface", async () => {
    const calls: Record<string, unknown>[] = [];
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      deviceOwnerTrust: "on",
      operatorContext: { channel: "stage", scope: "standalone-runtime-stage", authorizationEpoch: 98 },
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
      restoreLearningScenarioActivation: async (body) => {
        calls.push(body as Record<string, unknown>);
        return {
          schemaVersion: "role-model.guardrail-scenario-restore.v1",
          released: 2,
          releasedBreachIds: body.breachIds,
          rollout: { state: "active" },
        };
      },
    });
    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/operator/learning/scenario-restore`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scopeId: "standalone-runtime-stage",
            breachIds: ["breach:a", "breach:b"],
            restore: { packId: "pack:x", validationReceiptId: "validation:x", policyGateId: "policy:x" },
          }),
        },
      );
      expect(response.status).toBe(200);
      const payload = (await response.json()) as {
        readonly released?: number;
        readonly rollout?: unknown;
      };
      expect(payload.released).toBe(2);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ breachIds: ["breach:a", "breach:b"] });
    } finally {
      await server.close();
    }
  });

  test("run98 a57: an unwired scenario restore answers a bounded unavailable", async () => {
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      deviceOwnerTrust: "on",
      operatorContext: { channel: "stage", scope: "run98:a57", authorizationEpoch: 98 },
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
        `http://127.0.0.1:${server.port}/api/role-model/operator/learning/scenario-restore`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scopeId: "run98:a57", breachIds: ["breach:a"] }),
        },
      );
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toMatchObject({
        error: "operator_capability_unavailable",
      });
    } finally {
      await server.close();
    }
  });

  test("forwards the breach to the bound operator surface and returns its receipt", async () => {
    const calls: Record<string, unknown>[] = [];
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      deviceOwnerTrust: "on",
      operatorContext: {
        channel: "stage",
        scope: "standalone-runtime-stage-guardrail-probe",
        authorizationEpoch: 98,
      },
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
      recordLearningGuardrailBreach: async (body) => {
        calls.push(body as Record<string, unknown>);
        return {
          schemaVersion: "role-model.guardrail-breach-result.v1",
          breach: { metric: body.metric, windowMs: body.windowMs },
          pending: { remainingMs: 60_000 },
          rollback: null,
        };
      },
    });
    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/operator/learning/guardrail-breach`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            scopeId: "standalone-runtime-stage-guardrail-probe",
            metric: "quality",
            observed: -0.11,
            bound: -0.02,
            windowMs: 60_000,
          }),
        },
      );
      expect(response.status).toBe(200);
      const payload = (await response.json()) as { readonly pending?: { readonly remainingMs?: number } };
      expect(payload.pending?.remainingMs).toBe(60_000);
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ metric: "quality", windowMs: 60_000 });
    } finally {
      await server.close();
    }
  });

  test("answers a bounded unavailable rather than a success when the operator surface is not wired", async () => {
    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      deviceOwnerTrust: "on",
      operatorContext: { channel: "stage", scope: "run98:a54", authorizationEpoch: 98 },
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
        `http://127.0.0.1:${server.port}/api/role-model/operator/learning/guardrail-breach`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ metric: "quality", observed: -0.11, bound: -0.02 }),
        },
      );
      // Run 98 A44-S1/A44-S3 convention: a missing operator capability is a first-class bounded `unavailable`,
      // never a silent success and never a bare 404 from a route the surface advertises.
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toMatchObject({
        error: "operator_capability_unavailable",
      });
    } finally {
      await server.close();
    }
  });
});
