import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import {
  createRuntimeBridgeBackend,
  startBridgeServer,
} from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface RestartRehydrationValidationOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly fixtureRoot?: string;
}

export interface RestartRehydrationValidationResult {
  readonly activatedEndpointId: string;
  readonly connectedWithoutEndpointCount: number;
  readonly mixedAliasModelListIncludesAlias: boolean;
  readonly rehydratedEndpointCount: number;
  readonly modelIdsAfterRestart: readonly string[];
}

function createRestartValidationRuntimeConfigText(): string {
  return [
    'version: "1.1"',
    "routing:",
    "  strategy: baseline",
    "model_aliases:",
    "  mixed.local-remote:",
    "    model_ids:",
    "      - lfm2.5-1.2b-instruct",
    "      - moonshot/kimi-k2.5",
    "    mode: hybrid",
    "llama_swap:",
    "  models:",
    "    lfm2.5-1.2b-instruct:",
    "      path: ./models/lfm2.5-1.2b-instruct.gguf",
    "litellm_proxy:",
    "  providers: {}",
    "",
  ].join("\n");
}

async function waitForBootstrapIdle(
  readHealthStatus: () => Promise<{ sessionBootstrap: { status: string } }>,
  timeoutMs = 30_000,
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
  throw new Error("Restart rehydration validation timed out waiting for session bootstrap.");
}

export async function runRestartRehydrationValidation(
  options: RestartRehydrationValidationOptions,
): Promise<RestartRehydrationValidationResult> {
  const previousMoonshotApiKey = process.env.MOONSHOT_API_KEY;
  process.env.MOONSHOT_API_KEY = previousMoonshotApiKey || "restart-rehydration-validation-key";
  const fixtureRoot =
    options.fixtureRoot ?? path.join(options.repoRoot, "testdata", "router-runtime", "fixtures");
  const unifiedRuntimeConfigPath = path.join(options.runtimeStateRoot, "runtime-config.yaml");

  await mkdir(options.runtimeStateRoot, { recursive: true });
  await writeFile(
    unifiedRuntimeConfigPath,
    createRestartValidationRuntimeConfigText(),
    "utf8",
  );

  const createBackend = () =>
    createRuntimeBridgeBackend({
      repoRoot: options.repoRoot,
      fixtureRoot,
      runtimeStateRoot: options.runtimeStateRoot,
      scopeId: options.scopeId,
      unifiedRuntimeConfigPath,
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
    const activation = (await firstBackend.activateEndpoint({
      providerAccountId: "moonshot.personal.primary",
      modelId: "moonshot/kimi-k2.5",
      region: "global",
    })) as { endpointId: string };
    await firstBackend.shutdown?.();

    const restartedBackend = await createBackend();
    try {
      await waitForBootstrapIdle(() => restartedBackend.readHealthStatus());

      const summary = await restartedBackend.readRuntimeSummary();
      const endpoints = await restartedBackend.listEndpoints();
      const mixedAliasId = "mixed.local-remote";

      const server = await startBridgeServer({
        host: "127.0.0.1",
        port: 0,
        registry: restartedBackend.registry,
        getRegistry: () => restartedBackend.registry,
        executeChatCompletions: restartedBackend.executeChatCompletions,
        executeResponses: restartedBackend.executeResponses,
        readRuntimeSummary: restartedBackend.readRuntimeSummary,
        readRuntimeConfig: restartedBackend.readRuntimeConfig,
        updateRuntimeConfig: restartedBackend.updateRuntimeConfig,
        readHealthStatus: restartedBackend.readHealthStatus,
        getRoutableInventory: restartedBackend.getRoutableInventory,
        listEndpoints: restartedBackend.listEndpoints,
      });

      try {
        const baseUrl = `http://127.0.0.1:${server.port}`;
        const modelsResponse = await fetch(`${baseUrl}/v1/models`, {
          headers: { connection: "close" },
        });
        if (!modelsResponse.ok) {
          throw new Error(
            `Restart rehydration validation could not read /v1/models (${modelsResponse.status}).`,
          );
        }
        const modelsPayload = (await modelsResponse.json()) as {
          data?: Array<{ id?: string }>;
        };
        const modelIdsAfterRestart = (modelsPayload.data ?? [])
          .map((entry) => entry.id)
          .filter((entry): entry is string => typeof entry === "string");

        return {
          activatedEndpointId: activation.endpointId,
          connectedWithoutEndpointCount: summary.readinessSummary.connectedWithoutEndpointCount,
          mixedAliasModelListIncludesAlias: modelIdsAfterRestart.includes(mixedAliasId),
          rehydratedEndpointCount: endpoints.length,
          modelIdsAfterRestart,
        };
      } finally {
        await server.close();
      }
    } finally {
      await restartedBackend.shutdown?.();
    }
  } finally {
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
  const runtimeStateRoot = path.join(os.tmpdir(), "role-model-restart-rehydration-validation");
  console.log(
    JSON.stringify(
      await runRestartRehydrationValidation({
        repoRoot,
        runtimeStateRoot,
        scopeId: "restart-rehydration-validation",
        fixtureRoot: path.join(__dirname, "..", "test", "fixtures"),
      }),
      null,
      2,
    ),
  );
}
