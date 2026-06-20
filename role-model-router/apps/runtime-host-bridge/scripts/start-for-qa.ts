import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type CreateRuntimeBridgeBackendOptions,
  type RuntimeBridgeBackend,
  type StartBridgeServerOptions,
  createRuntimeBridgeBackend,
  startBridgeServer,
} from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-qa");
const scopeId = "runtime-qa";
const host = "127.0.0.1";
const port = Number(process.env.RUNTIME_QA_PORT ?? "3456");
const qaProviderAccountId = "moonshot.personal.primary";
const qaActivatedModelId = "moonshot/kimi-k2.5";
const qaActivatedEndpointRegion = "global";
const qaMoonshotApiKeyEnv = "MOONSHOT_API_KEY";
const qaPlaceholderApiKey = "role-model-runtime-qa-placeholder";

type QaBridgeBackend = Pick<
  RuntimeBridgeBackend,
  | "registry"
  | "executeChatCompletions"
  | "executeResponses"
  | "listActivityMetrics"
  | "readActivityCapture"
  | "readRuntimeSummary"
  | "readRuntimeConfig"
  | "updateRuntimeConfig"
  | "readTelemetrySummary"
  | "listTelemetryComparisonRows"
  | "listTelemetryRequests"
  | "queryTelemetryAnalytics"
  | "subscribeTelemetry"
  | "listProviders"
  | "listRoles"
  | "listModels"
  | "readRolePolicy"
  | "createRolePolicyRole"
  | "updateRolePolicyRole"
  | "listTaskDefinitions"
  | "updateTaskDefinitions"
  | "listAccounts"
  | "listProviderDeviceAuthorizations"
  | "upsertProviderAccount"
  | "startProviderDeviceAuthorization"
  | "pollProviderDeviceAuthorization"
  | "activateEndpoint"
  | "readControllerAssignment"
  | "updateControllerAssignment"
  | "readRouterSummary"
  | "readRouterConfig"
  | "listRouterCandidates"
  | "listRouterDecisions"
  | "readRouterDecision"
  | "listEndpoints"
  | "listRecentRequestObservations"
  | "readRequestObservation"
  | "readEndpointProfile"
  | "readBenchmarkSuite"
  | "runBenchmark"
  | "readBenchmarkRun"
  | "readActiveBenchmarkRun"
  | "clearBenchmarkEndpointData"
  | "clearBenchmarkData"
  | "readBenchmarkSummary"
  | "listBenchmarkRuns"
  | "readBenchmarkSummariesByMode"
  | "readBenchmarkPreferences"
  | "updateBenchmarkPreferences"
  | "listLocalModels"
  | "listPeerLocalModels"
  | "listLlamaSwapLocalModels"
  | "loadLocalModel"
  | "loadPeerModel"
  | "loadLlamaSwapModel"
  | "setPeerModelRoles"
  | "setLlamaSwapModelRoles"
  | "unloadPeerModel"
  | "unloadLocalModel"
  | "readLocalPolicy"
  | "updateLocalPolicy"
  | "listSwapHistory"
  | "getLocalLogs"
  | "readModelOverrides"
  | "updateModelOverrides"
  | "readPeers"
  | "updatePeers"
  | "checkPeerHealth"
  | "getRoutableInventory"
  | "readHealthStatus"
  | "shutdown"
>;

export function createQaFixtureRoot(value: string): string {
  return path.join(value, "testdata", "router-runtime", "fixtures");
}

export function createQaRuntimeConfigPath(value: string): string {
  return path.join(value, "runtime-config.yaml");
}

export function createQaRuntimeBridgeBackendOptions(
  currentRepoRoot: string,
  currentRuntimeStateRoot: string,
  currentScopeId: string,
): CreateRuntimeBridgeBackendOptions {
  return {
    fixtureRoot: createQaFixtureRoot(currentRepoRoot),
    repoRoot: currentRepoRoot,
    runtimeStateRoot: currentRuntimeStateRoot,
    scopeId: currentScopeId,
    unifiedRuntimeConfigPath: createQaRuntimeConfigPath(currentRuntimeStateRoot),
    runtimeVendorStartup: "disabled",
  };
}

export function createQaRuntimeConfigText(): string {
  return `version: "1.1"
routing:
  strategy: baseline
model_aliases:
  mixed.local-remote:
    model_ids:
      - lfm2.5-1.2b-instruct
      - openai/gpt-4.1-mini-fast
llama_swap:
  models:
    lfm2.5-1.2b-instruct:
      path: ./models/lfm2.5-1.2b-instruct.gguf
litellm_proxy:
  providers: {}
`;
}

export async function bootstrapQaControlPlane(
  backend: Pick<QaBridgeBackend, "upsertProviderAccount" | "activateEndpoint">,
): Promise<void> {
  await backend.upsertProviderAccount({
    providerAccountId: qaProviderAccountId,
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
    allowedModels: [qaActivatedModelId],
    modelRoleBindings: [
      {
        modelId: qaActivatedModelId,
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
    providerAccountId: qaProviderAccountId,
    modelId: qaActivatedModelId,
    region: qaActivatedEndpointRegion,
  });
}

export function createQaServerOptions(
  currentRepoRoot: string,
  backend: QaBridgeBackend,
): StartBridgeServerOptions {
  return {
    host,
    port,
    staticRoot: path.join(
      currentRepoRoot,
      "role-model-router",
      "apps",
      "runtime-ui",
      "build",
      "client",
    ),
    registry: backend.effectiveRegistry,
    getRegistry: () => backend.effectiveRegistry,
    executeChatCompletions: backend.executeChatCompletions,
    executeResponses: backend.executeResponses,
    readVersionInfo: async () => ({ version: "0.0.0-qa", build: "dev" }),
    listActivityMetrics: backend.listActivityMetrics,
    readActivityCapture: backend.readActivityCapture,
    readLogs: async () => "No logs available in QA mode.",
    readRuntimeSummary: backend.readRuntimeSummary,
    readHealthStatus: backend.readHealthStatus,
    readRuntimeConfig: backend.readRuntimeConfig,
    updateRuntimeConfig: backend.updateRuntimeConfig,
    readTelemetrySummary: backend.readTelemetrySummary,
    listTelemetryComparisonRows: backend.listTelemetryComparisonRows,
    listTelemetryRequests: backend.listTelemetryRequests,
    queryTelemetryAnalytics: backend.queryTelemetryAnalytics,
    subscribeTelemetry: backend.subscribeTelemetry,
    listProviders: backend.listProviders,
    listRoles: backend.listRoles,
    listModels: backend.listModels,
    readRolePolicy: backend.readRolePolicy,
    createRolePolicyRole: backend.createRolePolicyRole,
    updateRolePolicyRole: backend.updateRolePolicyRole,
    listTaskDefinitions: backend.listTaskDefinitions,
    updateTaskDefinitions: backend.updateTaskDefinitions,
    listAccounts: backend.listAccounts,
    listProviderDeviceAuthorizations: backend.listProviderDeviceAuthorizations,
    upsertProviderAccount: backend.upsertProviderAccount,
    startProviderDeviceAuthorization: backend.startProviderDeviceAuthorization,
    pollProviderDeviceAuthorization: backend.pollProviderDeviceAuthorization,
    activateEndpoint: backend.activateEndpoint,
    readControllerAssignment: backend.readControllerAssignment,
    updateControllerAssignment: backend.updateControllerAssignment,
    readRouterSummary: backend.readRouterSummary,
    readRouterConfig: backend.readRouterConfig,
    listRouterCandidates: backend.listRouterCandidates,
    listRouterDecisions: backend.listRouterDecisions,
    readRouterDecision: backend.readRouterDecision,
    listEndpoints: backend.listEndpoints,
    listRecentRequestObservations: backend.listRecentRequestObservations,
    readRequestObservation: backend.readRequestObservation,
    readEndpointProfile: backend.readEndpointProfile,
    readBenchmarkSuite: backend.readBenchmarkSuite,
    runBenchmark: backend.runBenchmark,
    readBenchmarkRun: backend.readBenchmarkRun,
    readActiveBenchmarkRun: backend.readActiveBenchmarkRun,
    clearBenchmarkEndpointData: backend.clearBenchmarkEndpointData,
    clearBenchmarkData: backend.clearBenchmarkData,
    readBenchmarkSummary: backend.readBenchmarkSummary,
    listBenchmarkRuns: backend.listBenchmarkRuns,
    readBenchmarkSummariesByMode: backend.readBenchmarkSummariesByMode,
    readBenchmarkPreferences: backend.readBenchmarkPreferences,
    updateBenchmarkPreferences: backend.updateBenchmarkPreferences,
    listLocalModels: backend.listLocalModels,
    listPeerLocalModels: backend.listPeerLocalModels,
    listLlamaSwapLocalModels: backend.listLlamaSwapLocalModels,
    loadLocalModel: backend.loadLocalModel,
    loadPeerModel: backend.loadPeerModel,
    loadLlamaSwapModel: backend.loadLlamaSwapModel,
    setPeerModelRoles: backend.setPeerModelRoles,
    setLlamaSwapModelRoles: backend.setLlamaSwapModelRoles,
    unloadPeerModel: backend.unloadPeerModel,
    unloadLocalModel: backend.unloadLocalModel,
    readLocalPolicy: backend.readLocalPolicy,
    updateLocalPolicy: backend.updateLocalPolicy,
    listSwapHistory: backend.listSwapHistory,
    getLocalLogs: backend.getLocalLogs,
    readModelOverrides: backend.readModelOverrides,
    updateModelOverrides: backend.updateModelOverrides,
    readPeers: backend.readPeers,
    updatePeers: backend.updatePeers,
    checkPeerHealth: backend.checkPeerHealth,
    getRoutableInventory: backend.getEffectiveRoutableInventory,
  };
}

export async function main(): Promise<void> {
  console.log("[QA] Starting Role Model Runtime Bridge...");
  console.log(`[QA] repoRoot: ${repoRoot}`);
  console.log(`[QA] runtimeStateRoot: ${runtimeStateRoot}`);
  console.log(`[QA] scopeId: ${scopeId}`);
  if (!process.env[qaMoonshotApiKeyEnv]) {
    process.env[qaMoonshotApiKeyEnv] = qaPlaceholderApiKey;
    console.log(`[QA] Seeded placeholder ${qaMoonshotApiKeyEnv} for local UI QA.`);
  }

  // Clear any stale SQLite state from previous runs to ensure clean startup
  console.log("[QA] Clearing stale runtime state...");
  try {
    await rm(runtimeStateRoot, { recursive: true, force: true });
    console.log("[QA] Stale runtime state cleared.");
  } catch {
    // Directory may not exist; that's fine
  }

  await mkdir(runtimeStateRoot, { recursive: true });
  const unifiedRuntimeConfigPath = createQaRuntimeConfigPath(runtimeStateRoot);
  await writeFile(unifiedRuntimeConfigPath, createQaRuntimeConfigText(), "utf8");
  console.log(`[QA] Seeded runtime config: ${unifiedRuntimeConfigPath}`);

  const backend = await createRuntimeBridgeBackend(
    createQaRuntimeBridgeBackendOptions(repoRoot, runtimeStateRoot, scopeId),
  );
  await bootstrapQaControlPlane(backend);

  const server = await startBridgeServer(createQaServerOptions(repoRoot, backend));

  const baseUrl = `http://${host}:${server.port}`;
  console.log(`[QA] Bridge server running at ${baseUrl}`);
  console.log("[QA] API docs:");
  console.log(`  GET ${baseUrl}/api/role-model/runtime/summary`);
  console.log(`  GET ${baseUrl}/api/role-model/providers`);
  console.log(`  GET ${baseUrl}/api/role-model/accounts`);
  console.log(`  GET ${baseUrl}/api/role-model/endpoints`);
  console.log(`  GET ${baseUrl}/api/role-model/roles`);
  console.log(`  GET ${baseUrl}/api/role-model/runtime/config`);
  console.log(`  GET ${baseUrl}/api/role-model/router/summary`);
  console.log(`  GET ${baseUrl}/api/role-model/router/config`);
  console.log(`  GET ${baseUrl}/api/role-model/router/candidates`);
  console.log(`  GET ${baseUrl}/api/role-model/router/decisions`);
  console.log(`  GET ${baseUrl}/api/role-model/local/models`);
  console.log(`  GET ${baseUrl}/api/role-model/local/policy`);
  console.log(`  GET ${baseUrl}/api/role-model/local/swap`);
  console.log(`  GET ${baseUrl}/api/role-model/local/logs`);
  console.log(`  GET ${baseUrl}/v1/models`);
  console.log(`  POST ${baseUrl}/v1/chat/completions`);
  console.log("[QA] Press Ctrl+C to stop");

  process.on("SIGINT", async () => {
    console.log("\n[QA] Shutting down...");
    await server.close();
    await backend.shutdown();
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  await main();
}
