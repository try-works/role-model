import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runRuntimeAdapterValidation } from "../../../packages/adapter-execution/src/cli.js";
import { createRuntimeObservationBundle } from "../../../packages/runtime-observability/src/index.js";
import {
  persistRuntimeObservationBundle,
  resolveSqliteMemoryLocation,
} from "../../../packages/sqlite-memory/src/index.js";
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

export const qaTelemetryRequestIds = {
  measured: "qa-telemetry-measured-001",
  estimated: "qa-telemetry-estimated-001",
  unavailable: "qa-telemetry-unavailable-001",
  zero: "qa-telemetry-zero-001",
  measuredSecondary: "qa-telemetry-measured-002",
} as const;

type QaBridgeBackend = Pick<
  RuntimeBridgeBackend,
  | "registry"
  | "readVersionInfo"
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
  | "removeProviderAccountModel"
  | "activateEndpoint"
  | "readControllerAssignment"
  | "updateControllerAssignment"
  | "readRouterSummary"
  | "readRouterConfig"
  | "listRouterCandidates"
  | "listRouterDecisions"
  | "readRouterDecision"
  | "listEndpoints"
  | "listRecentRequestIds"
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

  if (process.env.DEEPSEEK_API_KEY) {
    const da = "deepseek.personal.deepseek-api-key";
    await backend.upsertProviderAccount({
      providerAccountId: da,
      providerId: "deepseek",
      providerKind: "provider-openai",
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef: { backend: "env", ref: "DEEPSEEK_API_KEY" },
      authMode: "api-key-static",
      regionPolicy: { mode: "prefer", regions: ["global"] },
      baseUrlOverride: "https://api.deepseek.com/v1",
      allowedModels: ["deepseek/deepseek-v4-flash", "deepseek/deepseek-v4-pro"],
      modelRoleBindings: [
        { modelId: "deepseek/deepseek-v4-flash", roleIds: ["general.chat"] },
        { modelId: "deepseek/deepseek-v4-pro", roleIds: ["general.chat"] },
      ],
      deniedModels: [],
      entitlementTags: ["chat", "benchmark"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    });
    await backend.activateEndpoint({
      providerAccountId: da,
      modelId: "deepseek/deepseek-v4-flash",
      region: "global",
    });
    await backend.activateEndpoint({
      providerAccountId: da,
      modelId: "deepseek/deepseek-v4-pro",
      region: "global",
    });
  }
}

export async function seedQaTelemetry(
  currentRepoRoot: string,
  currentRuntimeStateRoot: string,
  currentScopeId: string,
): Promise<void> {
  const validation = await runRuntimeAdapterValidation({
    repoRoot: currentRepoRoot,
    fixtureRoot: createQaFixtureRoot(currentRepoRoot),
    runtimeStateRoot: currentRuntimeStateRoot,
    scopeId: currentScopeId,
  });
  const baseBundle = createRuntimeObservationBundle({
    decision: validation.decision,
    routingDiagnostics: validation.routingDiagnostics,
    retrievalReceipt: validation.retrievalReceipt,
    contextEnvelope: validation.contextEnvelope,
    execution: validation.execution,
    priorSamples: [],
    maintenancePolicy: {
      "redaction.level": "strict",
      "retention.class": "standard",
    },
    capturePolicy: {},
    accountState: {
      providerAccountId: validation.execution.target.providerAccountId,
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    },
  });
  const now = Date.now();
  const fixtures = [
    {
      requestId: qaTelemetryRequestIds.measured,
      source: "measured" as const,
      available: true,
      inputTokens: 120000,
      outputTokens: 4000,
      cacheReadTokens: 90000,
      promptCacheRequestSource: "explicit" as const,
      hoursAgo: 5,
    },
    {
      requestId: qaTelemetryRequestIds.estimated,
      source: "estimated" as const,
      available: true,
      inputTokens: 107,
      outputTokens: 32,
      cacheReadTokens: 0,
      promptCacheRequestSource: "synthesized" as const,
      hoursAgo: 4,
    },
    {
      requestId: qaTelemetryRequestIds.unavailable,
      source: "unavailable" as const,
      available: false,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      promptCacheRequestSource: null,
      hoursAgo: 3,
    },
    {
      requestId: qaTelemetryRequestIds.zero,
      source: "measured" as const,
      available: true,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      promptCacheRequestSource: "synthesized" as const,
      hoursAgo: 2,
    },
    {
      requestId: qaTelemetryRequestIds.measuredSecondary,
      source: "normalized" as const,
      available: true,
      inputTokens: 400,
      outputTokens: 80,
      cacheReadTokens: 100,
      promptCacheRequestSource: "synthesized" as const,
      hoursAgo: 1,
    },
  ];
  const databasePath = resolveSqliteMemoryLocation({
    runtimeStateRoot: currentRuntimeStateRoot,
    scopeId: currentScopeId,
  });

  for (const fixture of fixtures) {
    const timestampMs = now - fixture.hoursAgo * 60 * 60 * 1000;
    const routingDecisionId = `decision-${fixture.requestId}`;
    persistRuntimeObservationBundle({
      databasePath,
      observation: {
        ...baseBundle,
        requestId: fixture.requestId,
        routingDecisionId,
        usageEvent: {
          ...baseBundle.usageEvent,
          request_id: fixture.requestId,
          routing_decision_id: routingDecisionId,
          tokens_in: fixture.inputTokens,
          tokens_in_source: fixture.source,
          tokens_in_available: fixture.available,
          tokens_out: fixture.outputTokens,
          tokens_out_source: fixture.source,
          tokens_out_available: fixture.available,
          timestamp_ms: timestampMs,
        },
        observedPerformance: {
          ...baseBundle.observedPerformance,
          sample: {
            ...baseBundle.observedPerformance.sample,
            request_id: fixture.requestId,
            routing_decision_id: routingDecisionId,
            timestamp_ms: timestampMs,
          },
          profile: {
            ...baseBundle.observedPerformance.profile,
            measured_at_ms: timestampMs,
          },
        },
        cacheObservability: {
          ...baseBundle.cacheObservability,
          promptCacheRequested: fixture.promptCacheRequestSource !== null,
          ...(fixture.promptCacheRequestSource
            ? { promptCacheRequestSource: fixture.promptCacheRequestSource }
            : {}),
          promptCacheUsed: fixture.cacheReadTokens > 0,
          cacheReadTokens: fixture.cacheReadTokens,
          cacheWriteTokens: 0,
        },
        executionTelemetry: {
          ...baseBundle.executionTelemetry,
          promptCaching: { supported: true },
          usageSupport: {
            ...baseBundle.executionTelemetry.usageSupport,
            inputTokens: true,
            outputTokens: true,
            cacheReadTokens: true,
            cacheWriteTokens: true,
          },
        },
        telemetrySnapshot: {
          providerId: "moonshot",
          providerAccountId: qaProviderAccountId,
          sourceType: "remote",
          endpointKind: "remote_api",
          servingSource: "remote-service",
          region: "global",
          lifecycleStateAtRequest: "active",
          healthStatusAtRequest: "healthy",
          requestedModelId: qaActivatedModelId,
          requestOperation: "chat",
          roleIds: ["general.chat"],
          toolingUsed: false,
          cacheState: fixture.cacheReadTokens > 0 ? "hit" : "miss",
          eligibleEndpointIds: [baseBundle.endpointId],
          eligibleModelIds: [qaActivatedModelId],
          candidateCostSnapshot: null,
          selectedPricingSnapshot: null,
          selectedUncachedCostUsd: null,
          baselineMaxEligibleCostUsd: null,
          routingCostSavingsUsd: 0,
          cacheCostSavingsUsd: 0,
          totalAvoidedCostUsd: 0,
          costBaselineSource: null,
          costSavingsSupport: null,
        },
      },
    });
  }
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
    readVersionInfo: backend.readVersionInfo,
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
    listExtensions: backend.listExtensions,
    readStorageRetention: backend.readStorageRetention,
    dryRunStorageRetention: backend.dryRunStorageRetention,
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
    removeProviderAccountModel: backend.removeProviderAccountModel,
    activateEndpoint: backend.activateEndpoint,
    readControllerAssignment: backend.readControllerAssignment,
    updateControllerAssignment: backend.updateControllerAssignment,
    readRouterSummary: backend.readRouterSummary,
    readRouterConfig: backend.readRouterConfig,
    listRouterCandidates: backend.listRouterCandidates,
    listRouterDecisions: backend.listRouterDecisions,
    readRouterDecision: backend.readRouterDecision,
    listEndpoints: backend.listEndpoints,
    listRecentRequestIds: backend.listRecentRequestIds,
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
  if (!process.env[qaMoonshotApiKeyEnv] && !process.env.RUNTIME_QA_NO_PLACEHOLDERS) {
    process.env[qaMoonshotApiKeyEnv] = qaPlaceholderApiKey;
    console.log(`[QA] Seeded placeholder ${qaMoonshotApiKeyEnv} for local UI QA.`);
  }

  await mkdir(runtimeStateRoot, { recursive: true });
  const unifiedRuntimeConfigPath = createQaRuntimeConfigPath(runtimeStateRoot);

  // Only clear config, keep runtime state for observation persistence
  console.log("[QA] Keeping runtime state for observation persistence...");
  try {
    await rm(unifiedRuntimeConfigPath, { force: true });
  } catch {
    // File may not exist; that's fine
  }

  await writeFile(unifiedRuntimeConfigPath, createQaRuntimeConfigText(), "utf8");
  console.log(`[QA] Seeded runtime config: ${unifiedRuntimeConfigPath}`);

  // Pre-register deepseek.litellm account so LiteLLM endpoint validation passes
  if (process.env.DEEPSEEK_API_KEY) {
    const { DatabaseSync } = await import("node:sqlite");
    const dbPath = path.join(runtimeStateRoot, scopeId, "memory", "memory.sqlite");
    await mkdir(path.dirname(dbPath), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec(`CREATE TABLE IF NOT EXISTS provider_accounts (
      provider_account_id TEXT PRIMARY KEY, provider_id TEXT NOT NULL, provider_kind TEXT NOT NULL,
      org_scope TEXT NOT NULL, account_scope TEXT NOT NULL,
      credential_backend TEXT NOT NULL, credential_ref TEXT NOT NULL, auth_mode TEXT NOT NULL,
      region_policy_json TEXT NOT NULL, base_url_override TEXT,
      allowed_models_json TEXT NOT NULL, model_role_bindings_json TEXT NOT NULL DEFAULT '[]',
      denied_models_json TEXT NOT NULL, entitlement_tags_json TEXT NOT NULL,
      budget_policy_ref TEXT NOT NULL, quota_policy_ref TEXT NOT NULL,
      status TEXT NOT NULL, health_status TEXT NOT NULL, rotation_state TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL)`);
    const now = Date.now();
    const stmt = db.prepare(`INSERT OR REPLACE INTO provider_accounts (
      provider_account_id, provider_id, provider_kind, org_scope, account_scope,
      credential_backend, credential_ref, auth_mode, region_policy_json, base_url_override,
      allowed_models_json, model_role_bindings_json, denied_models_json, entitlement_tags_json,
      budget_policy_ref, quota_policy_ref, status, health_status, rotation_state,
      created_at_ms, updated_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(
      "deepseek.personal.deepseek-api-key",
      "deepseek",
      "provider-openai",
      "personal",
      "workspace-default",
      "env",
      "DEEPSEEK_API_KEY",
      "api-key-static",
      JSON.stringify({ mode: "prefer", regions: ["global"] }),
      "https://api.deepseek.com/v1",
      JSON.stringify(["deepseek/deepseek-v4-flash", "deepseek/deepseek-v4-pro"]),
      JSON.stringify([
        { modelId: "deepseek/deepseek-v4-flash", roleIds: ["general.chat"] },
        { modelId: "deepseek/deepseek-v4-pro", roleIds: ["general.chat"] },
      ]),
      "[]",
      '["chat","benchmark"]',
      "budget.default",
      "quota.default",
      "active",
      "healthy",
      "stable",
      now,
      now,
    );
    db.close();
    console.log("[QA] Pre-registered DeepSeek account.");
  }

  await seedQaTelemetry(repoRoot, runtimeStateRoot, scopeId);
  console.log(`[QA] Seeded deterministic telemetry request: ${qaTelemetryRequestIds.measured}`);

  const backend = await createRuntimeBridgeBackend(
    createQaRuntimeBridgeBackendOptions(repoRoot, runtimeStateRoot, scopeId),
  );
  if (!process.env.RUNTIME_QA_NO_PLACEHOLDERS) {
    await bootstrapQaControlPlane(backend);
  }

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

export function createQaCanonicalRoleIds(): string[] {
  return [
    "analyst",
    "architect",
    "coder",
    "coordinator",
    "creative",
    "data",
    "designer",
    "educator",
    "finance",
    "health",
    "knowledge",
    "legal",
    "marketer",
    "mathematician",
    "operator",
    "planner",
    "procurement",
    "product",
    "recruiter",
    "researcher",
    "scientist",
    "security",
    "seller",
    "strategist",
    "support",
    "tester",
    "translator",
    "writer",
  ];
}

export function shouldBootstrapQaPlaceholderControlPlane(
  env: Record<string, string | undefined>,
): boolean {
  return env.RUNTIME_QA_BOOTSTRAP_PLACEHOLDER_CONTROL_PLANE === "1";
}
