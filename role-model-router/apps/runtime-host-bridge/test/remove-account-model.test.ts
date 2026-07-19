import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";

import {
  resolveSqliteMemoryLocation,
  upsertRuntimeEndpoint,
} from "@role-model-router/sqlite-memory";

import * as bridge from "../src/index.js";
import {
  persistOperatorIntent,
  readOperatorIntent,
  upsertRemoteActivation,
} from "../src/operator-intent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const fixtureRoot = path.join(__dirname, "fixtures");
const runtimeStateRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    runtimeStateRoots.splice(0).map((entry) => rm(entry, { recursive: true, force: true })),
  );
});

async function createBackend(scopeId: string, unifiedRuntimeConfigPath?: string) {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-remove-model-"));
  runtimeStateRoots.push(runtimeStateRoot);
  const backend = await bridge.createRuntimeBridgeBackend({
    repoRoot,
    fixtureRoot,
    runtimeStateRoot,
    scopeId,
    ...(unifiedRuntimeConfigPath ? { unifiedRuntimeConfigPath } : {}),
  });
  return { backend, runtimeStateRoot };
}

describe("removeProviderAccountModel", () => {
  test("removes the selected model and stale endpoint rows while preserving sibling models", async () => {
    const { backend, runtimeStateRoot } = await createBackend("runtime-remove-model-keep-account");
    const databasePath = resolveSqliteMemoryLocation({
      runtimeStateRoot,
      scopeId: "runtime-remove-model-keep-account",
    });

    await backend.upsertProviderAccount({
      providerAccountId: "moonshot.personal.primary",
      providerId: "moonshot",
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: { backend: "env", ref: "MOONSHOT_API_KEY" },
      authMode: "api-key-static",
      regionPolicy: { mode: "prefer", regions: ["global"] },
      baseUrlOverride: "https://api.moonshot.ai/v1",
      allowedModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.7-code"],
      modelRoleBindings: [
        { modelId: "moonshot/kimi-k2.5", roleIds: ["general.chat"] },
        { modelId: "moonshot/kimi-k2.7-code", roleIds: ["coder"] },
      ],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    });

    upsertRuntimeEndpoint({
      databasePath,
      endpoint: {
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
        endpointKind: "remote-openai-compatible",
        servingSource: "remote-service",
        lifecycleState: "active",
        healthStatus: "healthy",
      },
    });
    persistOperatorIntent(
      { runtimeStateRoot, scopeId: "runtime-remove-model-keep-account" },
      (intent) =>
        upsertRemoteActivation(intent, {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          region: "global",
        }),
    );
    upsertRuntimeEndpoint({
      databasePath,
      endpoint: {
        endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.7-code",
        region: "global",
        endpointKind: "remote-openai-compatible",
        servingSource: "remote-service",
        lifecycleState: "active",
        healthStatus: "healthy",
      },
    });

    await expect(
      backend.removeProviderAccountModel("moonshot.personal.primary", "moonshot/kimi-k2.5"),
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        removedAccount: false,
        alreadyAbsent: false,
      }),
    );

    expect(
      readOperatorIntent({
        runtimeStateRoot,
        scopeId: "runtime-remove-model-keep-account",
      })?.remoteActivations,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
        }),
      ]),
    );

    const remainingAccount = (await backend.listAccounts()).find(
      (entry) => entry.providerAccountId === "moonshot.personal.primary",
    );
    expect(remainingAccount).toEqual(
      expect.objectContaining({
        allowedModels: ["moonshot/kimi-k2.7-code"],
        modelRoleBindings: [{ modelId: "moonshot/kimi-k2.7-code", roleIds: ["coder"] }],
      }),
    );
    const remainingEndpoints = (await backend.listEndpoints()).filter(
      (entry) => entry.providerAccountId === "moonshot.personal.primary",
    );
    expect(remainingEndpoints).toEqual([
      expect.objectContaining({
        endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
        modelId: "moonshot/kimi-k2.7-code",
      }),
    ]);

    await expect(
      backend.removeProviderAccountModel("moonshot.personal.primary", "moonshot/kimi-k2.5"),
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        removedAccount: false,
        alreadyAbsent: true,
      }),
    );
  });

  test("deletes the backing account when its last configured model is removed", async () => {
    const { backend, runtimeStateRoot } = await createBackend("runtime-remove-model-drop-account");
    const databasePath = resolveSqliteMemoryLocation({
      runtimeStateRoot,
      scopeId: "runtime-remove-model-drop-account",
    });

    await backend.upsertProviderAccount({
      providerAccountId: "moonshot.personal.primary",
      providerId: "moonshot",
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: { backend: "env", ref: "MOONSHOT_API_KEY" },
      authMode: "api-key-static",
      regionPolicy: { mode: "prefer", regions: ["global"] },
      baseUrlOverride: "https://api.moonshot.ai/v1",
      allowedModels: ["moonshot/kimi-k2.5"],
      modelRoleBindings: [{ modelId: "moonshot/kimi-k2.5", roleIds: ["general.chat"] }],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    });

    upsertRuntimeEndpoint({
      databasePath,
      endpoint: {
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
        endpointKind: "remote-openai-compatible",
        servingSource: "remote-service",
        lifecycleState: "active",
        healthStatus: "healthy",
      },
    });

    await expect(
      backend.removeProviderAccountModel("moonshot.personal.primary", "moonshot/kimi-k2.5"),
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        removedAccount: true,
        alreadyAbsent: false,
      }),
    );

    const removedAccount = (await backend.listAccounts()).find(
      (entry) => entry.providerAccountId === "moonshot.personal.primary",
    );
    expect(removedAccount).toBeUndefined();
    const removedEndpoints = (await backend.listEndpoints()).filter(
      (entry) => entry.providerAccountId === "moonshot.personal.primary",
    );
    expect(removedEndpoints).toEqual([]);
  });

  test("reassigns the controller to a surviving manual-account model during eject", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-remove-model-controller-"));
    runtimeStateRoots.push(tempRoot);
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      `
version: "1.0"
execution_mode: remote_only
controller:
  enabled: true
  source_type: remote
  endpoint_id: moonshot.personal.primary.global.kimi-k2.5
  model_id: moonshot/kimi-k2.5
  timeout_ms: 15000
`,
      "utf8",
    );
    const { backend, runtimeStateRoot } = await createBackend(
      "runtime-remove-model-controller-reassign",
      unifiedRuntimeConfigPath,
    );
    const databasePath = resolveSqliteMemoryLocation({
      runtimeStateRoot,
      scopeId: "runtime-remove-model-controller-reassign",
    });

    await backend.upsertProviderAccount({
      providerAccountId: "moonshot.personal.primary",
      providerId: "moonshot",
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: { backend: "env", ref: "MOONSHOT_API_KEY" },
      authMode: "api-key-static",
      regionPolicy: { mode: "prefer", regions: ["global"] },
      baseUrlOverride: "https://api.moonshot.ai/v1",
      allowedModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.7-code"],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    });

    upsertRuntimeEndpoint({
      databasePath,
      endpoint: {
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
        endpointKind: "remote-openai-compatible",
        servingSource: "remote-service",
        lifecycleState: "active",
        healthStatus: "healthy",
      },
    });
    upsertRuntimeEndpoint({
      databasePath,
      endpoint: {
        endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.7-code",
        region: "global",
        endpointKind: "remote-openai-compatible",
        servingSource: "remote-service",
        lifecycleState: "active",
        healthStatus: "healthy",
      },
    });
    await backend.shutdown();
    const restartedBackend = await bridge.createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-remove-model-controller-reassign",
      unifiedRuntimeConfigPath,
    });
    await expect(
      restartedBackend.removeProviderAccountModel(
        "moonshot.personal.primary",
        "moonshot/kimi-k2.5",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        removedAccount: false,
        alreadyAbsent: false,
      }),
    );

    await expect(restartedBackend.readControllerAssignment()).resolves.toEqual(
      expect.objectContaining({
        endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
        modelId: "moonshot/kimi-k2.7-code",
        sourceType: "remote",
      }),
    );
    await expect(restartedBackend.readRuntimeConfig()).resolves.toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          controller: expect.objectContaining({
            endpointId: "moonshot.personal.primary.global.kimi-k2.7-code",
            modelId: "moonshot/kimi-k2.7-code",
            sourceType: "remote",
          }),
        }),
      }),
    );
  });

  test("clears the controller when eject removes the last surviving controller-backed manual-account model", async () => {
    const tempRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-remove-model-controller-clear-"),
    );
    runtimeStateRoots.push(tempRoot);
    const unifiedRuntimeConfigPath = path.join(tempRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      `
version: "1.0"
execution_mode: remote_only
controller:
  enabled: true
  source_type: remote
  endpoint_id: moonshot.personal.primary.global.kimi-k2.5
  model_id: moonshot/kimi-k2.5
  timeout_ms: 15000
`,
      "utf8",
    );
    const { backend, runtimeStateRoot } = await createBackend(
      "runtime-remove-model-controller-clear",
      unifiedRuntimeConfigPath,
    );
    const databasePath = resolveSqliteMemoryLocation({
      runtimeStateRoot,
      scopeId: "runtime-remove-model-controller-clear",
    });

    await backend.upsertProviderAccount({
      providerAccountId: "moonshot.personal.primary",
      providerId: "moonshot",
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: { backend: "env", ref: "MOONSHOT_API_KEY" },
      authMode: "api-key-static",
      regionPolicy: { mode: "prefer", regions: ["global"] },
      baseUrlOverride: "https://api.moonshot.ai/v1",
      allowedModels: ["moonshot/kimi-k2.5"],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    });

    upsertRuntimeEndpoint({
      databasePath,
      endpoint: {
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
        endpointKind: "remote-openai-compatible",
        servingSource: "remote-service",
        lifecycleState: "active",
        healthStatus: "healthy",
      },
    });
    await backend.shutdown();
    const restartedBackend = await bridge.createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-remove-model-controller-clear",
      unifiedRuntimeConfigPath,
    });
    await expect(
      restartedBackend.removeProviderAccountModel(
        "moonshot.personal.primary",
        "moonshot/kimi-k2.5",
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        removedAccount: true,
        alreadyAbsent: false,
      }),
    );

    await expect(restartedBackend.readControllerAssignment()).resolves.toBeNull();
    await expect(restartedBackend.readRuntimeConfig()).resolves.toEqual(
      expect.objectContaining({
        config: expect.not.objectContaining({
          controller: expect.anything(),
        }),
      }),
    );
  });
});
