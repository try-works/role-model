import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { runRuntimeAdapterValidation } from "@role-model-router/adapter-execution/cli";
import { createRuntimeObservationBundle } from "@role-model-router/runtime-observability";
import {
  persistRuntimeObservationBundle,
  resolveSqliteMemoryLocation,
} from "@role-model-router/sqlite-memory";

import { createRuntimeBridgeBackend, mapChatCompletionsRequest, startBridgeServer } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

export interface RuntimeUiValidationOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly unifiedRuntimeConfigPath?: string;
  readonly fixtureRoot?: string;
}

export interface RuntimeUiValidationResult {
  readonly providerCount: number;
  readonly accountCount: number;
  readonly endpointCount: number;
  readonly runtimeConfigPath: string | null;
  readonly runtimeConfigInitialApplied: boolean;
  readonly runtimeConfigUpdatedVersion: string | null;
  readonly runtimeConfigUpdatedRoutingStrategy: string | null;
  readonly moonshotVariantIds: readonly string[];
  readonly availableRoleIds: readonly string[];
  readonly upsertedAccountId: string;
  readonly accountListIncludesUpsert: boolean;
  readonly accountRoleBindingIncludesUpsert: boolean;
  readonly activatedEndpointId: string;
  readonly endpointListIncludesActivation: boolean;
  readonly routedRequestId: string;
  readonly telemetryListIncludesRoutedRequest: boolean;
  readonly routedRequestRoutingDecisionId: string | null;
  readonly routedRequestEffectiveMode: string | null;
  readonly routedRequestRewriteReason: string | null;
  readonly mixedAliasId: string;
  readonly mixedAliasModelListIncludesAlias: boolean;
  readonly mixedAliasRequestId: string;
  readonly mixedAliasAllowEndpoints: readonly string[];
  readonly mixedAliasResolvedModelIds: readonly string[];
  readonly mixedAliasTelemetryListIncludesRequest: boolean;
  readonly mixedAliasRequestDetailAliasResolvedModelIds: readonly string[];
  readonly mixedAliasRouterDecisionMatchesRequest: boolean;
  readonly mixedAliasOverviewIncludesSelectedEndpoint: boolean;
  readonly mixedAliasEndpointsIncludeSelectedEndpoint: boolean;
}

export async function runRuntimeUiValidation(
  options: RuntimeUiValidationOptions,
): Promise<RuntimeUiValidationResult> {
  const previousMoonshotApiKey = process.env.MOONSHOT_API_KEY;
  process.env.MOONSHOT_API_KEY = previousMoonshotApiKey || "runtime-ui-validation-key";
  const backend = await createRuntimeBridgeBackend(options);
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: backend.registry,
    getRegistry: () => backend.registry,
    executeChatCompletions: backend.executeChatCompletions,
    executeResponses: backend.executeResponses,
    readRuntimeSummary: backend.readRuntimeSummary,
    readRuntimeConfig: backend.readRuntimeConfig,
    updateRuntimeConfig: backend.updateRuntimeConfig,
    readTelemetrySummary: backend.readTelemetrySummary,
    listTelemetryComparisonRows: backend.listTelemetryComparisonRows,
    listTelemetryRequests: backend.listTelemetryRequests,
    subscribeTelemetry: backend.subscribeTelemetry,
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
    listRouterDecisions: backend.listRouterDecisions,
    readRouterDecision: backend.readRouterDecision,
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

    if (
      !summaryResponse.ok ||
      !providersResponse.ok ||
      !accountsResponse.ok ||
      !rolesResponse.ok ||
      !endpointsResponse.ok
    ) {
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
    let runtimeConfigPath: string | null = null;
    let runtimeConfigInitialApplied = false;
    let runtimeConfigUpdatedVersion: string | null = null;
    let runtimeConfigUpdatedRoutingStrategy: string | null = null;
    const mixedAliasId = "mixed.local-remote";
    const mixedAliasModelIds = ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.5"] as const;

    if (options.unifiedRuntimeConfigPath) {
      const runtimeConfigResponse = await fetch(`${baseUrl}/api/role-model/runtime/config`, {
        headers: requestHeaders,
      });
      if (!runtimeConfigResponse.ok) {
        throw new Error("Runtime UI validation could not read the runtime config.");
      }

      const runtimeConfigRecord = (await runtimeConfigResponse.json()) as {
        applied: boolean;
        path: string | null;
        config: Record<string, unknown> | null;
      };
      runtimeConfigPath = runtimeConfigRecord.path;
      runtimeConfigInitialApplied = runtimeConfigRecord.applied;

      const runtimeConfigUpdateResponse = await fetch(`${baseUrl}/api/role-model/runtime/config`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          connection: "close",
        },
        body: JSON.stringify({
          ...(runtimeConfigRecord.config ?? {
            version: "1.0",
            llamaSwap: {
              enabled: true,
              models: [],
              process: {
                command: null,
                args: [],
                env: {},
                cwd: null,
                startupTimeoutMs: null,
              },
            },
            liteLLM: {
              providers: [],
              process: {
                command: null,
                args: [],
                env: {},
                cwd: null,
                startupTimeoutMs: null,
              },
            },
          }),
          version: "1.1",
          executionMode: "hybrid",
          routingStrategy: "baseline",
          llamaSwap: {
            ...((runtimeConfigRecord.config as { llamaSwap?: Record<string, unknown> } | null)?.llamaSwap ??
              {}),
            enabled: true,
            models: [
              {
                modelId: "lfm2.5-1.2b-instruct",
                path: "./models/lfm2.5-1.2b-instruct.gguf",
              },
            ],
          },
          modelAliases: [
            {
              aliasId: mixedAliasId,
              modelIds: mixedAliasModelIds,
              mode: "hybrid",
            },
          ],
        }),
      });
      if (!runtimeConfigUpdateResponse.ok) {
        throw new Error(
          `Runtime UI validation runtime-config update failed with ${runtimeConfigUpdateResponse.status}.`,
        );
      }

      const updatedRuntimeConfigRecord = (await runtimeConfigUpdateResponse.json()) as {
        config?: {
          version?: string;
          routingStrategy?: string | null;
        };
      };
      runtimeConfigUpdatedVersion = updatedRuntimeConfigRecord.config?.version ?? null;
      runtimeConfigUpdatedRoutingStrategy =
        updatedRuntimeConfigRecord.config?.routingStrategy ?? null;
    }

    const upsertedAccountId = "moonshot.personal.primary";
    const upsertResponse = await fetch(`${baseUrl}/api/role-model/accounts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        connection: "close",
      },
      body: JSON.stringify({
        providerAccountId: upsertedAccountId,
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
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      }),
    });
    if (!activateEndpointResponse.ok) {
      throw new Error(
        `Runtime UI validation endpoint activation failed with ${activateEndpointResponse.status}.`,
      );
    }

    const updatedEndpointsResponse = await fetch(`${baseUrl}/api/role-model/endpoints`, {
      headers: requestHeaders,
    });
    if (!updatedEndpointsResponse.ok) {
      throw new Error("Runtime UI validation could not read the updated endpoint list.");
    }
    const finalSummaryResponse = await fetch(`${baseUrl}/api/role-model/runtime/summary`, {
      headers: requestHeaders,
    });
    if (!finalSummaryResponse.ok) {
      throw new Error("Runtime UI validation could not read the updated runtime summary.");
    }
    const updatedEndpoints = (await updatedEndpointsResponse.json()) as Array<{
      endpointId: string;
      modelId?: string;
      providerId?: string;
      providerKind?: string;
      sourceType?: string;
      servingSource?: string | null;
    }>;
    const finalSummary = (await finalSummaryResponse.json()) as {
      providerCount: number;
      accountCount: number;
      endpointCount: number;
    };
    const activatedEndpoint =
      updatedEndpoints.find((endpoint) => endpoint.endpointId === activatedEndpointId) ?? null;

    const modelsResponse = await fetch(`${baseUrl}/v1/models`, {
      headers: requestHeaders,
    });
    if (!modelsResponse.ok) {
      throw new Error("Runtime UI validation could not read the routed model list.");
    }
    const modelsPayload = (await modelsResponse.json()) as {
      data?: Array<{ id?: string }>;
    };
    const mixedAliasModelListIncludesAlias =
      modelsPayload.data?.some((model) => model.id === mixedAliasId) ?? false;

    const mixedAliasRequestId = "req-runtime-ui-mixed-alias-001";
    const mixedAliasPlan = mapChatCompletionsRequest(
      backend.registry,
      {
        model: mixedAliasId,
        messages: [{ role: "user", content: "Summarize mixed alias routing." }],
      },
      mixedAliasRequestId,
      [{ aliasId: mixedAliasId, modelIds: mixedAliasModelIds }],
    );

    const moonshotProvider = providers.find((provider) => provider.providerId === "moonshot");
    const fixtureRoot =
      options.fixtureRoot ?? path.join(options.repoRoot, "testdata", "router-runtime", "fixtures");
    const history = await readJson<{
      byEndpointId: Record<
        string,
        Parameters<typeof createRuntimeObservationBundle>[0]["priorSamples"]
      >;
    }>(path.join(options.repoRoot, "testdata", "router-runtime", "observability-history.json"));
    const policy = await readJson<
      Parameters<typeof createRuntimeObservationBundle>[0]["capturePolicy"]
    >(path.join(options.repoRoot, "testdata", "router-runtime", "observability-policy.json"));
    const validation = await runRuntimeAdapterValidation({
      repoRoot: options.repoRoot,
      fixtureRoot,
      runtimeStateRoot: options.runtimeStateRoot,
      scopeId: `${options.scopeId}-routing-proof`,
    });
    const routedRequestId = "req-runtime-ui-routing-001";
    const routedObservation = createRuntimeObservationBundle({
      decision: {
        ...validation.decision,
        request_id: routedRequestId,
        routing_decision_id: "route-runtime-ui-routing-001",
      },
      routingDiagnostics: {
        ...validation.routingDiagnostics,
        routingMode: {
          source: "request-override",
          requestedOverride: "baseline",
          effectiveMode: "baseline",
        },
        rewrite: {
          requestedModel: "openai/gpt-4.1-mini-fast",
          downstreamModelId: "openai/gpt-4.1-mini-fast",
          applied: false,
          reason: "requested-model-matches-downstream",
        },
      },
      retrievalReceipt: validation.retrievalReceipt,
      contextEnvelope: validation.contextEnvelope,
      execution: validation.execution,
      priorSamples: history.byEndpointId[validation.decision.chosen_endpoint_id] ?? [],
      maintenancePolicy: {
        "redaction.level": "strict",
        "retention.class": "standard",
      },
      capturePolicy: policy,
      accountState: {
        providerAccountId: validation.execution.target.providerAccountId,
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      },
    });
    persistRuntimeObservationBundle({
      databasePath: resolveSqliteMemoryLocation({
        runtimeStateRoot: options.runtimeStateRoot,
        scopeId: options.scopeId,
      }),
      observation: routedObservation,
    });

    const mixedAliasRoutingDecisionId = "route-runtime-ui-mixed-alias-001";
    const mixedAliasSelectedModelId = activatedEndpoint?.modelId ?? "moonshot/kimi-k2.5";
    const mixedAliasResponseVendorMetadata = validation.execution.responseCapture.vendorMetadata
      ? {
          ...validation.execution.responseCapture.vendorMetadata,
          resolvedModelId: mixedAliasSelectedModelId,
        }
      : {
          vendorId: validation.execution.responseCapture.providerFamily,
          resolvedModelId: mixedAliasSelectedModelId,
        };
    const mixedAliasRequestCapture = {
      ...validation.execution.requestCapture,
      endpointId: activatedEndpointId,
      body: {
        ...validation.execution.requestCapture.body,
        model: mixedAliasId,
      },
    };
    const mixedAliasResponseCapture = {
      ...validation.execution.responseCapture,
      endpointId: activatedEndpointId,
      vendorMetadata: mixedAliasResponseVendorMetadata,
    };
    const mixedAliasExecution = {
      ...validation.execution,
      target: {
        ...validation.execution.target,
        endpointId: activatedEndpointId,
        modelId: mixedAliasSelectedModelId,
        providerId: activatedEndpoint?.providerId ?? validation.execution.target.providerId,
        providerAccountId: upsertedAccountId,
        candidate: {
          ...validation.execution.target.candidate,
          identity: {
            ...validation.execution.target.candidate.identity,
            endpoint_id: activatedEndpointId,
            model_id: mixedAliasSelectedModelId,
            endpoint_kind:
              activatedEndpoint?.sourceType === "remote"
                ? "remote_api"
                : validation.execution.target.candidate.identity.endpoint_kind,
            serving_source:
              activatedEndpoint?.servingSource ??
              validation.execution.target.candidate.identity.serving_source,
          },
        },
      },
      requestCapture: mixedAliasRequestCapture,
      responseCapture: mixedAliasResponseCapture,
      normalized: {
        ...validation.execution.normalized,
        requestCapture: mixedAliasRequestCapture,
        responseCapture: mixedAliasResponseCapture,
        vendorMetadata: {
          ...validation.execution.normalized.vendorMetadata,
          resolvedModelId: mixedAliasSelectedModelId,
        },
      },
      usageEvent: {
        ...validation.execution.usageEvent,
        request_id: mixedAliasRequestId,
        routing_decision_id: mixedAliasRoutingDecisionId,
        endpoint_id: activatedEndpointId,
        model_id: mixedAliasSelectedModelId,
      },
    };
    const mixedAliasObservation = createRuntimeObservationBundle({
      decision: {
        ...validation.decision,
        request_id: mixedAliasRequestId,
        routing_decision_id: mixedAliasRoutingDecisionId,
        chosen_endpoint_id: activatedEndpointId,
      },
      routingDiagnostics: {
        ...validation.routingDiagnostics,
        aliasResolution: {
          requestedModel: mixedAliasId,
          aliasId: mixedAliasId,
          resolvedModelIds: mixedAliasModelIds,
          allowEndpoints: mixedAliasPlan.routingRequest.allowEndpoints ?? [],
        },
        routingMode: {
          source: "alias-default",
          aliasMode: "hybrid",
          effectiveMode: "hybrid",
        },
        rewrite: {
          requestedModel: mixedAliasId,
          downstreamModelId: mixedAliasSelectedModelId,
          applied: true,
          reason: "requested-model-rewritten-for-selected-endpoint",
        },
      },
      retrievalReceipt: validation.retrievalReceipt,
      contextEnvelope: validation.contextEnvelope,
      execution: mixedAliasExecution,
      priorSamples: history.byEndpointId[activatedEndpointId] ?? [],
      maintenancePolicy: {
        "redaction.level": "strict",
        "retention.class": "standard",
      },
      capturePolicy: policy,
      accountState: {
        providerAccountId: upsertedAccountId,
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      },
    });
    persistRuntimeObservationBundle({
      databasePath: resolveSqliteMemoryLocation({
        runtimeStateRoot: options.runtimeStateRoot,
        scopeId: options.scopeId,
      }),
      observation: mixedAliasObservation,
    });

    const telemetryRequestsResponse = await fetch(
      `${baseUrl}/api/role-model/telemetry/requests?limit=10`,
      {
        headers: requestHeaders,
      },
    );
    if (!telemetryRequestsResponse.ok) {
      throw new Error("Runtime UI validation could not read telemetry requests.");
    }
    const telemetryRequests = (await telemetryRequestsResponse.json()) as Array<{
      requestId: string;
      routingDecisionId?: string | null;
    }>;
    const routedTelemetryRequest =
      telemetryRequests.find((request) => request.requestId === routedRequestId) ?? null;

    const routedRequestDetailResponse = await fetch(
      `${baseUrl}/api/role-model/requests/${routedRequestId}`,
      {
        headers: requestHeaders,
      },
    );
    if (!routedRequestDetailResponse.ok) {
      throw new Error("Runtime UI validation could not read the routed request detail.");
    }
    const routedRequestDetail = (await routedRequestDetailResponse.json()) as {
      endpointId?: string | null;
      routingDecisionId?: string | null;
      routingDiagnostics?: {
        routingMode?: {
          effectiveMode?: string | null;
        };
        rewrite?: {
          reason?: string | null;
        };
      };
    };
    const telemetryRowsResponse = await fetch(`${baseUrl}/api/role-model/telemetry/rows`, {
      headers: requestHeaders,
    });
    if (!telemetryRowsResponse.ok) {
      throw new Error("Runtime UI validation could not read telemetry comparison rows.");
    }
    const telemetryRows = (await telemetryRowsResponse.json()) as Array<{
      endpointId?: string | null;
    }>;
    const mixedAliasRequestDetailResponse = await fetch(
      `${baseUrl}/api/role-model/requests/${mixedAliasRequestId}`,
      {
        headers: requestHeaders,
      },
    );
    if (!mixedAliasRequestDetailResponse.ok) {
      throw new Error("Runtime UI validation could not read the mixed alias request detail.");
    }
    const mixedAliasRequestDetail = (await mixedAliasRequestDetailResponse.json()) as {
      endpointId?: string | null;
      routingDecisionId?: string | null;
      routingDiagnostics?: {
        aliasResolution?: {
          resolvedModelIds?: readonly string[];
        };
      };
    };
    const mixedAliasRouterDecisionsResponse = await fetch(`${baseUrl}/api/role-model/router/decisions`, {
      headers: requestHeaders,
    });
    if (!mixedAliasRouterDecisionsResponse.ok) {
      throw new Error("Runtime UI validation could not read the mixed alias router decisions ledger.");
    }
    const mixedAliasRouterDecision =
      (
        (await mixedAliasRouterDecisionsResponse.json()) as Array<{
          requestId: string;
          routingDecisionId?: string | null;
          selectedEndpointId?: string | null;
        }>
      ).find((decision) => decision.requestId === mixedAliasRequestId) ?? null;
    const mixedAliasTelemetryRequest =
      telemetryRequests.find((request) => request.requestId === mixedAliasRequestId) ?? null;

    return {
      providerCount: finalSummary.providerCount,
      accountCount: finalSummary.accountCount,
      endpointCount: finalSummary.endpointCount,
      runtimeConfigPath,
      runtimeConfigInitialApplied,
      runtimeConfigUpdatedVersion,
      runtimeConfigUpdatedRoutingStrategy,
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
              binding.modelId === "moonshot/kimi-k2.5" && binding.roleIds.includes("general.chat"),
          ),
      ),
      activatedEndpointId,
      endpointListIncludesActivation: updatedEndpoints.some(
        (endpoint) => endpoint.endpointId === activatedEndpointId,
      ),
      routedRequestId,
      telemetryListIncludesRoutedRequest: routedTelemetryRequest !== null,
      routedRequestRoutingDecisionId: routedTelemetryRequest?.routingDecisionId ?? null,
      routedRequestEffectiveMode:
        routedRequestDetail.routingDiagnostics?.routingMode?.effectiveMode ?? null,
      routedRequestRewriteReason: routedRequestDetail.routingDiagnostics?.rewrite?.reason ?? null,
      mixedAliasId,
      mixedAliasModelListIncludesAlias,
      mixedAliasRequestId,
      mixedAliasAllowEndpoints: mixedAliasPlan.routingRequest.allowEndpoints ?? [],
      mixedAliasResolvedModelIds:
        mixedAliasPlan.routingDiagnostics?.aliasResolution?.resolvedModelIds ?? [],
      mixedAliasTelemetryListIncludesRequest: mixedAliasTelemetryRequest !== null,
      mixedAliasRequestDetailAliasResolvedModelIds:
        mixedAliasRequestDetail.routingDiagnostics?.aliasResolution?.resolvedModelIds ?? [],
      mixedAliasRouterDecisionMatchesRequest:
        mixedAliasRouterDecision?.requestId === mixedAliasRequestId &&
        mixedAliasRouterDecision?.routingDecisionId === mixedAliasRequestDetail.routingDecisionId &&
        mixedAliasRouterDecision?.selectedEndpointId === mixedAliasRequestDetail.endpointId,
      mixedAliasOverviewIncludesSelectedEndpoint: telemetryRows.some(
        (row) => row.endpointId === mixedAliasRouterDecision?.selectedEndpointId,
      ),
      mixedAliasEndpointsIncludeSelectedEndpoint: updatedEndpoints.some(
        (endpoint) => endpoint.endpointId === mixedAliasRouterDecision?.selectedEndpointId,
      ),
    };
  } finally {
    await server.close();
    await delay(10);
    if (previousMoonshotApiKey === undefined) {
      process.env.MOONSHOT_API_KEY = undefined;
    } else {
      process.env.MOONSHOT_API_KEY = previousMoonshotApiKey;
    }
  }
}

if (process.argv[1] === __filename) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-ui-validation");

  let unifiedRuntimeConfigPath: string | undefined;
  const fs = await import("node:fs/promises");
  try {
    unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await fs.mkdir(runtimeStateRoot, { recursive: true });
    await fs.writeFile(
      unifiedRuntimeConfigPath,
      [
        "version: 1.0",
        "routing:",
        "  strategy: baseline",
        "llama_swap:",
        "  models: {}",
        "litellm_proxy:",
        "  providers: {}",
        "",
      ].join("\n"),
      "utf8",
    );
  } catch {
    // If temp config creation fails, fall back to running without it
    unifiedRuntimeConfigPath = undefined;
  }

  console.log(
    JSON.stringify(
      await runRuntimeUiValidation({
        repoRoot,
        fixtureRoot: path.join(__dirname, "..", "test", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-ui-validation",
        unifiedRuntimeConfigPath,
      }),
      null,
      2,
    ),
  );
}
