import { mkdir, rm, writeFile } from "node:fs/promises";
import { type Server, createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { createRuntimeBridgeBackend, startBridgeServer } from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mixedAliasId = "mixed.local-remote";
const localModelId = "lfm2.5-8b-a1b";
const remoteModelId = "moonshot/kimi-k2.6";
const validationRequestId = "req-validate-catalog-economics-001";

export interface CatalogEconomicsValidationOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly fixtureRoot?: string;
}

export interface CatalogEconomicsValidationResult {
  readonly moonshotOperatorProviderPresent: boolean;
  readonly moonshotaiHiddenFromProviders: boolean;
  readonly routedRequestId: string;
  readonly selectedEndpointId: string;
  readonly selectedModelId: string;
  readonly difficultyStrategy: string | null;
  readonly localPeerSelectedOverKimi: boolean;
  readonly catalogEconomics: {
    readonly canonicalModelId: string | null;
    readonly tokenEconomicsSource: string | null;
    readonly cost_per_1k_tokens_est: number | null;
    readonly estimatedRequestUsd: number | null;
  };
}

function createCatalogEconomicsRuntimeConfigText(): string {
  return [
    'version: "1.1"',
    "routing:",
    "  strategy: difficulty",
    "model_aliases:",
    `  ${mixedAliasId}:`,
    "    model_ids:",
    `      - ${localModelId}`,
    `      - ${remoteModelId}`,
    "    mode: difficulty",
    "llama_swap:",
    "  models: {}",
    "litellm_proxy:",
    "  providers: {}",
    "",
  ].join("\n");
}

async function waitForBootstrapIdle(
  readHealthStatus: () => Promise<{ sessionBootstrap: { status: string } }>,
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const health = await readHealthStatus();
    if (
      health.sessionBootstrap.status !== "running" &&
      health.sessionBootstrap.status !== "pending"
    ) {
      return;
    }
    await delay(50);
  }
  throw new Error("Catalog economics validation timed out waiting for session bootstrap.");
}

async function startMockPeerServer(modelId: string): Promise<{
  readonly port: number;
  readonly close: () => Promise<void>;
}> {
  let server: Server | undefined;
  const close = async (): Promise<void> => {
    if (!server) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  };

  return await new Promise((resolve, reject) => {
    server = createServer((request, response) => {
      const url = request.url ?? "";
      if (request.method === "GET" && url === "/v1/models") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            object: "list",
            data: [{ id: modelId, object: "model" }],
          }),
        );
        return;
      }
      if (request.method === "POST" && url === "/v1/chat/completions") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            id: "chatcmpl-catalog-economics-mock",
            object: "chat.completion",
            model: modelId,
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "ok" },
                finish_reason: "stop",
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 },
          }),
        );
        return;
      }
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "not found" }));
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server?.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to start mock peer server."));
        return;
      }
      resolve({ port: address.port, close });
    });
  });
}

function extractModelIdFromEndpointId(endpointId: string): string | null {
  const localMarker = ".local.";
  const index = endpointId.lastIndexOf(localMarker);
  if (index >= 0) {
    const modelId = endpointId.slice(index + localMarker.length);
    return modelId.length > 0 ? modelId : null;
  }
  return null;
}

function readObservationFields(observation: Record<string, unknown>): {
  readonly endpointId: string;
  readonly modelId: string;
  readonly difficultyStrategy: string | null;
  readonly catalogEconomics: CatalogEconomicsValidationResult["catalogEconomics"];
} {
  const routingDiagnostics = observation.routingDiagnostics as Record<string, unknown> | undefined;
  const difficultyRouting = routingDiagnostics?.difficultyRouting as
    | Record<string, unknown>
    | undefined;
  const catalogEconomics = routingDiagnostics?.catalogEconomics as
    | Record<string, unknown>
    | undefined;
  const execution = observation.execution as Record<string, unknown> | undefined;
  const target = execution?.target as Record<string, unknown> | undefined;
  const normalized = execution?.normalized as Record<string, unknown> | undefined;
  const vendorMetadata = normalized?.vendorMetadata as Record<string, unknown> | undefined;
  const usageEvent = execution?.usageEvent as Record<string, unknown> | undefined;

  const endpointId =
    (typeof observation.endpointId === "string" && observation.endpointId) ||
    (typeof target?.endpointId === "string" ? target.endpointId : "") ||
    (typeof usageEvent?.endpoint_id === "string" ? usageEvent.endpoint_id : "");

  const modelId =
    (typeof target?.modelId === "string" && target.modelId) ||
    (typeof usageEvent?.model_id === "string" ? usageEvent.model_id : "") ||
    (typeof vendorMetadata?.resolvedModelId === "string" ? vendorMetadata.resolvedModelId : "") ||
    extractModelIdFromEndpointId(endpointId) ||
    "";

  return {
    endpointId,
    modelId,
    difficultyStrategy:
      typeof difficultyRouting?.strategy === "string" ? difficultyRouting.strategy : null,
    catalogEconomics: {
      canonicalModelId:
        typeof catalogEconomics?.canonicalModelId === "string"
          ? catalogEconomics.canonicalModelId
          : null,
      tokenEconomicsSource:
        typeof catalogEconomics?.tokenEconomicsSource === "string"
          ? catalogEconomics.tokenEconomicsSource
          : null,
      cost_per_1k_tokens_est:
        typeof catalogEconomics?.cost_per_1k_tokens_est === "number"
          ? catalogEconomics.cost_per_1k_tokens_est
          : null,
      estimatedRequestUsd:
        typeof catalogEconomics?.estimatedRequestUsd === "number"
          ? catalogEconomics.estimatedRequestUsd
          : null,
    },
  };
}

export async function runCatalogEconomicsValidation(
  options: CatalogEconomicsValidationOptions,
): Promise<CatalogEconomicsValidationResult> {
  const previousMoonshotApiKey = process.env.MOONSHOT_API_KEY;
  process.env.MOONSHOT_API_KEY = previousMoonshotApiKey || "catalog-economics-validation-key";
  const fixtureRoot =
    options.fixtureRoot ?? path.join(options.repoRoot, "testdata", "router-runtime", "fixtures");
  const unifiedRuntimeConfigPath = path.join(options.runtimeStateRoot, "runtime-config.yaml");
  const mockPeer = await startMockPeerServer(localModelId);

  await mkdir(options.runtimeStateRoot, { recursive: true });
  await writeFile(unifiedRuntimeConfigPath, createCatalogEconomicsRuntimeConfigText(), "utf8");

  try {
    const backend = await createRuntimeBridgeBackend({
      repoRoot: options.repoRoot,
      fixtureRoot,
      runtimeStateRoot: options.runtimeStateRoot,
      scopeId: options.scopeId,
      unifiedRuntimeConfigPath,
    });

    try {
      await waitForBootstrapIdle(() => backend.readHealthStatus());

      await backend.updatePeers([
        {
          id: "catalog-economics-peer",
          url: `http://127.0.0.1:${mockPeer.port}/v1`,
          authToken: "role-model-local",
        },
      ]);
      await backend.loadPeerModel(localModelId, {
        roleIds: ["general.chat"],
        roleAssignmentMode: "include",
        enabledRoleIds: ["general.chat"],
        disabledRoleIds: [],
      });

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
        allowedModels: [remoteModelId],
        modelRoleBindings: [
          {
            modelId: remoteModelId,
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
      await backend.activateEndpoint({
        providerAccountId: "moonshot.personal.primary",
        modelId: remoteModelId,
        region: "global",
      });

      await waitForBootstrapIdle(() => backend.readHealthStatus());

      const server = await startBridgeServer({
        host: "127.0.0.1",
        port: 0,
        registry: backend.effectiveRegistry,
        getRegistry: () => backend.effectiveRegistry,
        executeChatCompletions: backend.executeChatCompletions,
        executeResponses: backend.executeResponses,
        readRuntimeSummary: backend.readRuntimeSummary,
        readRuntimeConfig: backend.readRuntimeConfig,
        updateRuntimeConfig: backend.updateRuntimeConfig,
        readHealthStatus: backend.readHealthStatus,
        getRoutableInventory: backend.getEffectiveRoutableInventory,
        listEndpoints: backend.listEndpoints,
        listProviders: backend.listProviders,
        listRecentRequestObservations: backend.listRecentRequestObservations,
        readRequestObservation: backend.readRequestObservation,
      });

      try {
        const baseUrl = `http://127.0.0.1:${server.port}`;
        const requestHeaders = {
          connection: "close",
        };

        const providersResponse = await fetch(`${baseUrl}/api/role-model/providers`, {
          headers: requestHeaders,
        });
        if (!providersResponse.ok) {
          throw new Error(
            `Catalog economics validation could not read providers (${providersResponse.status}).`,
          );
        }
        const providers = (await providersResponse.json()) as Array<{ providerId?: string }>;
        const moonshotOperatorProviderPresent = providers.some(
          (provider) => provider.providerId === "moonshot",
        );
        const moonshotaiHiddenFromProviders = !providers.some(
          (provider) => provider.providerId === "moonshotai",
        );
        if (!moonshotOperatorProviderPresent) {
          throw new Error("Expected operator provider moonshot in provider list.");
        }
        if (!moonshotaiHiddenFromProviders) {
          throw new Error("Expected moonshotai to be hidden from provider list.");
        }

        const modelsResponse = await fetch(`${baseUrl}/v1/models`, {
          headers: requestHeaders,
        });
        if (!modelsResponse.ok) {
          throw new Error(
            `Catalog economics validation could not read model aliases (${modelsResponse.status}).`,
          );
        }
        const modelsPayload = (await modelsResponse.json()) as {
          data?: Array<{ id?: string; endpoint_ids?: unknown }>;
        };
        const runtimeAliasId =
          modelsPayload.data?.find(
            (model) =>
              model.id &&
              model.id !== localModelId &&
              model.id !== remoteModelId &&
              Array.isArray(model.endpoint_ids) &&
              model.endpoint_ids.length > 1,
          )?.id ?? mixedAliasId;

        const completionResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-request-id": validationRequestId,
            connection: "close",
          },
          body: JSON.stringify({
            model: runtimeAliasId,
            messages: [{ role: "user", content: "hello" }],
            max_tokens: 64,
          }),
        });
        if (!completionResponse.ok) {
          throw new Error(
            `Catalog economics validation chat completion failed (${completionResponse.status}): ${await completionResponse.text()}`,
          );
        }

        let observationResponse: Response | null = null;
        let routedRequestId: string | null = null;
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const recentResponse = await fetch(`${baseUrl}/api/role-model/requests`, {
            headers: requestHeaders,
          });
          if (!recentResponse.ok) {
            throw new Error(
              `Catalog economics validation could not list request observations (${recentResponse.status}).`,
            );
          }
          const recentRequests = (await recentResponse.json()) as Array<Record<string, unknown>>;
          const matchingRequest = recentRequests.find(
            (request) =>
              request.clientRequestId === validationRequestId ||
              request.requestId === validationRequestId,
          );
          routedRequestId =
            matchingRequest && typeof matchingRequest.requestId === "string"
              ? matchingRequest.requestId
              : null;
          if (routedRequestId) {
            observationResponse = await fetch(
              `${baseUrl}/api/role-model/requests/${encodeURIComponent(routedRequestId)}`,
              { headers: requestHeaders },
            );
            if (observationResponse.ok) {
              break;
            }
            if (observationResponse.status !== 404) {
              throw new Error(
                `Catalog economics validation could not read request observation (${observationResponse.status}).`,
              );
            }
          }
          await delay(100);
        }
        if (!observationResponse?.ok) {
          throw new Error("Catalog economics validation could not read request observation (404).");
        }
        const observation = (await observationResponse.json()) as Record<string, unknown>;
        const fields = readObservationFields(observation);

        const localPeerSelectedOverKimi =
          fields.modelId === localModelId ||
          fields.endpointId.includes("lfm2.5-8b-a1b") ||
          fields.catalogEconomics.tokenEconomicsSource === "local-free";

        if (fields.difficultyStrategy !== "cost") {
          throw new Error(
            `Expected difficulty routing strategy cost, received ${fields.difficultyStrategy ?? "null"}.`,
          );
        }
        if (!localPeerSelectedOverKimi) {
          throw new Error(
            `Expected local peer ${localModelId} to win cost routing; selected ${fields.modelId || fields.endpointId}.`,
          );
        }
        if (fields.catalogEconomics.tokenEconomicsSource !== "local-free") {
          throw new Error(
            `Expected catalogEconomics.tokenEconomicsSource local-free, received ${fields.catalogEconomics.tokenEconomicsSource ?? "null"}.`,
          );
        }

        return {
          moonshotOperatorProviderPresent,
          moonshotaiHiddenFromProviders,
          routedRequestId: routedRequestId ?? validationRequestId,
          selectedEndpointId: fields.endpointId,
          selectedModelId: fields.modelId,
          difficultyStrategy: fields.difficultyStrategy,
          localPeerSelectedOverKimi,
          catalogEconomics: fields.catalogEconomics,
        };
      } finally {
        await server.close();
      }
    } finally {
      await backend.shutdown?.();
    }
  } finally {
    await mockPeer.close();
    if (previousMoonshotApiKey === undefined) {
      delete process.env.MOONSHOT_API_KEY;
    } else {
      process.env.MOONSHOT_API_KEY = previousMoonshotApiKey;
    }
    await rm(options.runtimeStateRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] === __filename) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const runtimeStateRoot = path.join(os.tmpdir(), "role-model-catalog-economics-validation");
  console.log(
    JSON.stringify(
      await runCatalogEconomicsValidation({
        repoRoot,
        runtimeStateRoot,
        scopeId: "catalog-economics-validation",
        fixtureRoot: path.join(__dirname, "..", "test", "fixtures"),
      }),
      null,
      2,
    ),
  );
}
