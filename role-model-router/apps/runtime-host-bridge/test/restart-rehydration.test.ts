import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, test } from "vitest";

import {
  listRuntimeEndpoints,
  resolveSqliteMemoryLocation,
} from "@role-model-router/sqlite-memory";

import { createRuntimeBridgeBackend } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures-restart-rehydration");

describe("restart rehydration", () => {
  test("restores activated endpoints and session readiness summary after backend restart", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `restart-rehydration-${Date.now()}`);
    const scopeId = "restart-rehydration-tests";
    const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
    const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
    process.env.MOONSHOT_API_KEY = "moonshot-restart-rehydration-key";

    const createBackend = () =>
      createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
      });

    try {
      const firstBackend = await createBackend();
      await firstBackend.upsertProviderAccount({
        providerAccountId: "moonshot.personal.primary",
        providerId: "moonshot",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: {
          backend: "env",
          ref: "MOONSHOT_API_KEY",
        },
        authMode: "api-key-static",
        regionPolicy: {
          mode: "prefer",
          regions: ["global"],
        },
        baseUrlOverride: "https://api.moonshot.ai/v1",
        allowedModels: ["moonshot/kimi-k2.5"],
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.5",
            roleIds: ["general.chat"],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });
      const activation = await firstBackend.activateEndpoint({
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });
      await firstBackend.shutdown();

      const persistedEndpoints = listRuntimeEndpoints({ databasePath });
      expect(persistedEndpoints.map((endpoint) => endpoint.endpointId)).toContain(
        activation.endpointId,
      );

      const secondBackend = await createBackend();
      try {
        let health = await secondBackend.readHealthStatus();
        for (
          let attempt = 0;
          attempt < 20 && health.sessionBootstrap.status === "running";
          attempt += 1
        ) {
          await delay(50);
          health = await secondBackend.readHealthStatus();
        }

        const summary = await secondBackend.readRuntimeSummary();
        expect(summary.readinessSummary.connectedWithoutEndpointCount).toBe(0);
        expect(summary.inventorySummary.endpointIdCount).toBeGreaterThan(0);
        expect(summary.sessionBootstrap.stages.map((stage) => stage.stageId)).toContain(
          "endpoints",
        );

        const endpoints = await secondBackend.listEndpoints();
        expect(endpoints.map((endpoint) => endpoint.endpointId)).toContain(activation.endpointId);
      } finally {
        await secondBackend.shutdown();
      }
    } finally {
      if (originalMoonshotApiKey === undefined) {
        delete process.env.MOONSHOT_API_KEY;
      } else {
        process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
      }
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
