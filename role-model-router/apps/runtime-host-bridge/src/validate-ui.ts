import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { createRuntimeBridgeBackend, startBridgeServer } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RuntimeUiValidationOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}

export interface RuntimeUiValidationResult {
  readonly providerCount: number;
  readonly accountCount: number;
  readonly endpointCount: number;
  readonly moonshotVariantIds: readonly string[];
  readonly availableRoleIds: readonly string[];
  readonly upsertedAccountId: string;
  readonly accountListIncludesUpsert: boolean;
  readonly accountRoleBindingIncludesUpsert: boolean;
  readonly activatedEndpointId: string;
  readonly endpointListIncludesActivation: boolean;
}

export async function runRuntimeUiValidation(
  options: RuntimeUiValidationOptions,
): Promise<RuntimeUiValidationResult> {
  const backend = await createRuntimeBridgeBackend(options);
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: backend.registry,
    getRegistry: () => backend.registry,
    executeChatCompletions: backend.executeChatCompletions,
    executeResponses: backend.executeResponses,
    readRuntimeSummary: backend.readRuntimeSummary,
    listProviders: backend.listProviders,
    listRoles: backend.listRoles,
    listAccounts: backend.listAccounts,
    upsertProviderAccount: backend.upsertProviderAccount,
    startProviderDeviceAuthorization: backend.startProviderDeviceAuthorization,
    pollProviderDeviceAuthorization: backend.pollProviderDeviceAuthorization,
    activateEndpoint: backend.activateEndpoint,
    readControllerAssignment: backend.readControllerAssignment,
    updateControllerAssignment: backend.updateControllerAssignment,
    listEndpoints: backend.listEndpoints,
    listRecentRequestObservations: backend.listRecentRequestObservations,
    readRequestObservation: backend.readRequestObservation,
    readEndpointProfile: backend.readEndpointProfile,
  });

  try {
    const baseUrl = `http://127.0.0.1:${server.port}`;
    const requestHeaders = {
      connection: "close",
    };
    const summaryResponse = await fetch(`${baseUrl}/api/role-model/runtime/summary`, {
      headers: requestHeaders,
    });
    const providersResponse = await fetch(`${baseUrl}/api/role-model/providers`, {
      headers: requestHeaders,
    });
    const accountsResponse = await fetch(`${baseUrl}/api/role-model/accounts`, {
      headers: requestHeaders,
    });
    const rolesResponse = await fetch(`${baseUrl}/api/role-model/roles`, {
      headers: requestHeaders,
    });
    const endpointsResponse = await fetch(`${baseUrl}/api/role-model/endpoints`, {
      headers: requestHeaders,
    });

    if (!summaryResponse.ok || !providersResponse.ok || !accountsResponse.ok || !rolesResponse.ok || !endpointsResponse.ok) {
      throw new Error("Runtime UI validation could not read the control-plane routes.");
    }

    const summary = (await summaryResponse.json()) as {
      providerCount: number;
      accountCount: number;
      endpointCount: number;
    };
    const providers = (await providersResponse.json()) as Array<{
      providerId: string;
      variants?: Array<{ variantId: string }>;
    }>;
    const roles = (await rolesResponse.json()) as Array<{
      roleId: string;
    }>;

    const upsertedAccountId = "moonshot.personal.primary";
    const upsertResponse = await fetch(`${baseUrl}/api/role-model/accounts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        connection: "close",
      },
      body: JSON.stringify({
        providerAccountId: upsertedAccountId,
        providerId: "moonshotai",
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
        allowedModels: ["moonshotai/kimi-k2.5"],
        modelRoleBindings: [
          {
            modelId: "moonshotai/kimi-k2.5",
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
      }),
    });
    if (!upsertResponse.ok) {
      throw new Error(`Runtime UI validation account upsert failed with ${upsertResponse.status}.`);
    }

    const updatedAccountsResponse = await fetch(`${baseUrl}/api/role-model/accounts`, {
      headers: requestHeaders,
    });
    if (!updatedAccountsResponse.ok) {
      throw new Error("Runtime UI validation could not read the updated account list.");
    }
    const updatedAccounts = (await updatedAccountsResponse.json()) as Array<{
      providerAccountId: string;
      modelRoleBindings?: Array<{
        modelId: string;
        roleIds: string[];
      }>;
    }>;

    const activatedEndpointId = "moonshot.personal.primary.global.kimi-k2.5";
    const activateEndpointResponse = await fetch(`${baseUrl}/api/role-model/endpoints`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        connection: "close",
      },
      body: JSON.stringify({
        providerAccountId: upsertedAccountId,
        modelId: "moonshotai/kimi-k2.5",
        region: "global",
      }),
    });
    if (!activateEndpointResponse.ok) {
      throw new Error(`Runtime UI validation endpoint activation failed with ${activateEndpointResponse.status}.`);
    }

    const updatedEndpointsResponse = await fetch(`${baseUrl}/api/role-model/endpoints`, {
      headers: requestHeaders,
    });
    if (!updatedEndpointsResponse.ok) {
      throw new Error("Runtime UI validation could not read the updated endpoint list.");
    }
    const updatedEndpoints = (await updatedEndpointsResponse.json()) as Array<{
      endpointId: string;
    }>;

    const moonshotProvider = providers.find((provider) => provider.providerId === "moonshotai");

    return {
      providerCount: summary.providerCount,
      accountCount: summary.accountCount,
      endpointCount: summary.endpointCount,
      moonshotVariantIds: moonshotProvider?.variants?.map((variant) => variant.variantId) ?? [],
      availableRoleIds: roles.map((role) => role.roleId),
      upsertedAccountId,
      accountListIncludesUpsert: updatedAccounts.some(
        (account) => account.providerAccountId === upsertedAccountId,
      ),
      accountRoleBindingIncludesUpsert: updatedAccounts.some(
        (account) =>
          account.providerAccountId === upsertedAccountId &&
          account.modelRoleBindings?.some(
            (binding) =>
              binding.modelId === "moonshotai/kimi-k2.5" &&
              binding.roleIds.includes("general.chat"),
          ),
      ),
      activatedEndpointId,
      endpointListIncludesActivation: updatedEndpoints.some(
        (endpoint) => endpoint.endpointId === activatedEndpointId,
      ),
    };
  } finally {
    await server.close();
    await delay(10);
  }
}

if (process.argv[1] === __filename) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-ui-validation");

  console.log(
    JSON.stringify(
      await runRuntimeUiValidation({
        repoRoot,
        runtimeStateRoot,
        scopeId: "runtime-ui-validation",
      }),
      null,
      2,
    ),
  );
}
