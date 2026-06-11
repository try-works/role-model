import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  listRuntimeEndpoints,
  resolveSqliteMemoryLocation,
} from "@role-model-router/sqlite-memory";

import * as bridge from "../src/index.js";
import { readOperatorIntent, resolveOperatorIntentPath } from "../src/operator-intent.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

describe("endpoint rehydration", () => {
  test("rehydrates sqlite runtime endpoints across backend restart without re-activation", async () => {
    const runtimeStateRoot = path.join(
      os.tmpdir(),
      `runtime-host-endpoint-rehydration-${Date.now()}`,
    );
    const scopeId = "endpoint-rehydration-tests";
    const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
    const operatorIntentLocation = { runtimeStateRoot, scopeId };
    const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
    process.env.MOONSHOT_API_KEY = "moonshot-rehydration-key";

    const createBackend = async () =>
      (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint: (body: Record<string, unknown>) => Promise<{ endpointId: string }>;
            shutdown?: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
      });

    try {
      const backend = await createBackend();
      await backend.upsertProviderAccount({
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

      const activation = await backend.activateEndpoint({
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });

      expect(
        listRuntimeEndpoints({ databasePath }).map((endpoint) => endpoint.endpointId),
      ).toContain(activation.endpointId);

      const manifest = readOperatorIntent(operatorIntentLocation);
      expect(manifest?.remoteActivations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            endpointId: activation.endpointId,
            modelId: "moonshot/kimi-k2.5",
          }),
        ]),
      );
      expect(resolveOperatorIntentPath(operatorIntentLocation)).toBeTruthy();

      await backend.shutdown?.();

      const restartedBackend = await createBackend();
      const rehydratedEndpoints = listRuntimeEndpoints({ databasePath });
      expect(rehydratedEndpoints.map((endpoint) => endpoint.endpointId)).toContain(
        activation.endpointId,
      );
      await restartedBackend.shutdown?.();
    } finally {
      if (originalMoonshotApiKey === undefined) {
        process.env.MOONSHOT_API_KEY = undefined;
      } else {
        process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
      }
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
