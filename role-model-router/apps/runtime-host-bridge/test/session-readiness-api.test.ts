import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, test } from "vitest";

import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

describe("session readiness API", () => {
  test("exposes bootstrap, inventory, and readiness fields over HTTP", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `session-readiness-api-${Date.now()}`);
    const scopeId = "session-readiness-api-tests";

    try {
      const backend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
      });

      const server = await startBridgeServer({
        host: "127.0.0.1",
        port: 0,
        registry: backend.registry,
        getRegistry: () => backend.registry,
        executeChatCompletions: backend.executeChatCompletions,
        executeResponses: backend.executeResponses,
        readRuntimeSummary: backend.readRuntimeSummary,
        readHealthStatus: backend.readHealthStatus,
        getRoutableInventory: backend.getRoutableInventory,
      });

      try {
        let health = await backend.readHealthStatus();
        for (
          let attempt = 0;
          attempt < 20 && health.sessionBootstrap.status === "running";
          attempt += 1
        ) {
          await delay(50);
          health = await backend.readHealthStatus();
        }

        const summaryResponse = await fetch(
          `http://127.0.0.1:${server.port}/api/role-model/runtime/summary`,
        );
        expect(summaryResponse.ok).toBe(true);
        const summary = (await summaryResponse.json()) as {
          readinessSummary: {
            readyAccountCount: number;
            connectedWithoutEndpointCount: number;
            pendingDeviceAuthorizationCount: number;
            credentialsMissingAccountCount: number;
          };
          credentialLifecycle?: {
            authority: {
              state: string;
              bootstrapStatus: string;
            };
            counts: {
              executionReady: number;
              connectedNoEndpoint: number;
              pendingAuthorization: number;
              credentialsMissing: number;
            };
            providerRollups: readonly unknown[];
            archivedArtifacts: readonly unknown[];
          };
          sessionBootstrap: {
            status: string;
            stages: readonly { stageId: string }[];
          };
          inventorySummary: {
            endpointIdCount: number;
          };
          aliasDrift: readonly unknown[];
        };

        expect(summary.readinessSummary).toBeDefined();
        expect(summary.credentialLifecycle).toBeDefined();
        expect(summary.credentialLifecycle?.authority.bootstrapStatus).toBe(
          summary.sessionBootstrap.status,
        );
        expect(["provisional", "authoritative"]).toContain(
          summary.credentialLifecycle?.authority.state,
        );
        expect(summary.credentialLifecycle?.counts.executionReady).toBe(
          summary.readinessSummary.readyAccountCount,
        );
        expect(summary.credentialLifecycle?.counts.connectedNoEndpoint).toBe(
          summary.readinessSummary.connectedWithoutEndpointCount,
        );
        expect(summary.credentialLifecycle?.counts.pendingAuthorization).toBe(
          summary.readinessSummary.pendingDeviceAuthorizationCount,
        );
        expect(summary.credentialLifecycle?.counts.credentialsMissing).toBe(
          summary.readinessSummary.credentialsMissingAccountCount,
        );
        expect(Array.isArray(summary.credentialLifecycle?.providerRollups)).toBe(true);
        expect(Array.isArray(summary.credentialLifecycle?.archivedArtifacts)).toBe(true);
        expect(summary.sessionBootstrap.stages.map((stage) => stage.stageId)).toContain(
          "inventory",
        );
        expect(summary.inventorySummary.endpointIdCount).toBeGreaterThan(0);
        expect(Array.isArray(summary.aliasDrift)).toBe(true);

        const healthResponse = await fetch(`http://127.0.0.1:${server.port}/healthz`);
        expect(healthResponse.ok).toBe(true);
        const healthPayload = (await healthResponse.json()) as {
          sessionBootstrap: { status: string };
          credentialLifecycleAuthority?: {
            state: string;
            bootstrapStatus: string;
          };
        };
        expect(["ready", "degraded", "blocked"]).toContain(healthPayload.sessionBootstrap.status);
        expect(healthPayload.credentialLifecycleAuthority).toEqual(
          summary.credentialLifecycle?.authority,
        );
      } finally {
        await server.close();
        await backend.shutdown();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
