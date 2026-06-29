import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";

import { resolveSqliteMemoryLocation, upsertRuntimeEndpoint } from "@role-model-router/sqlite-memory";

import * as bridge from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const fixtureRoot = path.join(__dirname, "fixtures");
const runtimeStateRoots: string[] = [];

afterEach(async () => {
  await Promise.all(runtimeStateRoots.splice(0).map((entry) => rm(entry, { recursive: true, force: true })));
});

async function createBackend(scopeId: string) {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-remove-model-"));
  runtimeStateRoots.push(runtimeStateRoot);
  const backend = await bridge.createRuntimeBridgeBackend({
    repoRoot,
    fixtureRoot,
    runtimeStateRoot,
    scopeId,
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
    ).resolves.toEqual({
      success: true,
      removedAccount: false,
    });

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
    ).resolves.toEqual({
      success: true,
      removedAccount: true,
    });

    const removedAccount = (await backend.listAccounts()).find(
      (entry) => entry.providerAccountId === "moonshot.personal.primary",
    );
    expect(removedAccount).toBeUndefined();
    const removedEndpoints = (await backend.listEndpoints()).filter(
      (entry) => entry.providerAccountId === "moonshot.personal.primary",
    );
    expect(removedEndpoints).toEqual([]);
  });
});
