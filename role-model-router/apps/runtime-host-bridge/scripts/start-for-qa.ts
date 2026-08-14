import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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
import { seedTrackBExtensionBridgeState } from "../src/track-b-operations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const runtimeStateRoot = process.env.RUNTIME_QA_STATE_ROOT
  ? path.resolve(process.env.RUNTIME_QA_STATE_ROOT)
  : path.join(os.tmpdir(), "role-model-runtime-qa");
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

/** Extra chart-review fixtures (cost / taxonomy / strategy / difficulty mix). */
export const qaChartReviewRequestIds = {
  strategyCost: "qa-chart-strategy-cost-001",
  strategyLatency: "qa-chart-strategy-latency-001",
  strategyBalanced: "qa-chart-strategy-balanced-001",
  taxonomySecurity: "qa-chart-taxonomy-security-001",
  taxonomyAnalyst: "qa-chart-taxonomy-analyst-001",
  difficultyHard: "qa-chart-difficulty-hard-001",
  failureTimeout: "qa-chart-failure-timeout-001",
  localEstimate: "qa-chart-local-estimate-001",
} as const;

type QaTelemetrySeedFixture = {
  readonly requestId: string;
  readonly source: "measured" | "estimated" | "unavailable" | "normalized";
  readonly available: boolean;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly promptCacheRequestSource: "explicit" | "synthesized" | null;
  readonly hoursAgo: number;
  readonly latencyMs: number;
  readonly costActualUsd?: number;
  readonly costEstimateUsd?: number;
  readonly routingSavingsUsd?: number;
  readonly cacheSavingsUsd?: number;
  readonly strategy?: "cost" | "quality" | "latency" | "balanced";
  readonly difficulty?: "easy" | "medium" | "hard";
  readonly routingMode?: "hybrid" | "local_only" | "remote_only";
  readonly requestedRoleId?: string;
  readonly appliedRoleId?: string;
  readonly taxonomy?: {
    readonly groupId: string;
    readonly roleId: string;
    readonly taskType: string;
    readonly taskVariant: string;
    readonly capabilityIds: readonly string[];
    readonly modalityIds: readonly string[];
    readonly toolClassIds: readonly string[];
  };
  readonly errorClass?: string;
  readonly statusCode?: number;
  readonly sourceType?: "remote" | "local";
  readonly modelId?: string;
  readonly endpointId?: string;
};

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
  | "listExtensions"
  | "mutateExtension"
  | "readStorageRetention"
  | "dryRunStorageRetention"
  | "updateStorageRetentionPolicy"
  | "executeStorageRetention"
  | "cancelStorageRetentionJob"
  | "rollbackStorageRetention"
  | "readContributionState"
  | "updateContributionState"
  | "listRecommendations"
  | "downloadRecommendations"
  | "applyRecommendation"
  | "readActivePack"
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
  if (process.env.RUNTIME_QA_NO_MODEL_FIXTURES === "1") {
    return `version: "1.1"
routing:
  strategy: baseline
model_aliases: {}
llama_swap:
  models: {}
litellm_proxy:
  providers: {}
`;
  }
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
  const defaultEndpointId = baseBundle.endpointId;
  const fixtures: readonly QaTelemetrySeedFixture[] = [
    {
      requestId: qaTelemetryRequestIds.measured,
      source: "measured",
      available: true,
      inputTokens: 120000,
      outputTokens: 4000,
      cacheReadTokens: 90000,
      promptCacheRequestSource: "explicit",
      hoursAgo: 5,
      latencyMs: 920,
      costActualUsd: 0.084,
      costEstimateUsd: 0.084,
      routingSavingsUsd: 0.021,
      cacheSavingsUsd: 0.012,
      strategy: "quality",
      difficulty: "easy",
      routingMode: "hybrid",
      requestedRoleId: "coder.patch",
      appliedRoleId: "coder.patch",
      taxonomy: {
        groupId: "engineering",
        roleId: "coder",
        taskType: "coder.review",
        taskVariant: "security",
        capabilityIds: ["code.read", "security.analysis"],
        modalityIds: ["json", "text"],
        toolClassIds: ["filesystem.read", "shell.execute"],
      },
      statusCode: 200,
    },
    {
      requestId: qaTelemetryRequestIds.estimated,
      source: "estimated",
      available: true,
      inputTokens: 107,
      outputTokens: 32,
      cacheReadTokens: 0,
      promptCacheRequestSource: "synthesized",
      hoursAgo: 4,
      latencyMs: 640,
      costEstimateUsd: 0.0042,
      routingSavingsUsd: 0.0054,
      cacheSavingsUsd: 0,
      strategy: "cost",
      difficulty: "medium",
      routingMode: "hybrid",
      requestedRoleId: "general.chat",
      appliedRoleId: "general.chat",
      taxonomy: {
        groupId: "engineering",
        roleId: "coder",
        taskType: "coder.implement",
        taskVariant: "default",
        capabilityIds: ["code.write"],
        modalityIds: ["text"],
        toolClassIds: ["shell.execute"],
      },
      statusCode: 200,
    },
    {
      requestId: qaTelemetryRequestIds.unavailable,
      source: "unavailable",
      available: false,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      promptCacheRequestSource: null,
      hoursAgo: 3,
      latencyMs: 480,
      costActualUsd: 0.0031,
      costEstimateUsd: 0.0031,
      routingSavingsUsd: 0.001,
      cacheSavingsUsd: 0,
      strategy: "balanced",
      difficulty: "easy",
      routingMode: "remote_only",
      requestedRoleId: "analyst",
      appliedRoleId: "analyst",
      taxonomy: {
        groupId: "research",
        roleId: "analyst",
        taskType: "analyst.summarize",
        taskVariant: "brief",
        capabilityIds: ["text.summarize"],
        modalityIds: ["text"],
        toolClassIds: ["web.fetch"],
      },
      statusCode: 200,
    },
    {
      requestId: qaTelemetryRequestIds.zero,
      source: "measured",
      available: true,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      promptCacheRequestSource: "synthesized",
      hoursAgo: 2,
      latencyMs: 210,
      costActualUsd: 0,
      costEstimateUsd: 0,
      routingSavingsUsd: 0,
      cacheSavingsUsd: 0,
      strategy: "latency",
      difficulty: "easy",
      routingMode: "hybrid",
      requestedRoleId: "general.chat",
      appliedRoleId: "general.chat",
      taxonomy: {
        groupId: "engineering",
        roleId: "coder",
        taskType: "coder.review",
        taskVariant: "lite",
        capabilityIds: ["code.read"],
        modalityIds: ["text"],
        toolClassIds: ["filesystem.read"],
      },
      statusCode: 200,
    },
    {
      requestId: qaTelemetryRequestIds.measuredSecondary,
      source: "normalized",
      available: true,
      inputTokens: 400,
      outputTokens: 80,
      cacheReadTokens: 100,
      promptCacheRequestSource: "synthesized",
      hoursAgo: 1,
      latencyMs: 710,
      costActualUsd: 0.0068,
      costEstimateUsd: 0.0068,
      routingSavingsUsd: 0.0032,
      cacheSavingsUsd: 0.0011,
      strategy: "quality",
      difficulty: "medium",
      routingMode: "hybrid",
      requestedRoleId: "coder.patch",
      appliedRoleId: "coder.patch",
      taxonomy: {
        groupId: "engineering",
        roleId: "coder",
        taskType: "coder.review",
        taskVariant: "security",
        capabilityIds: ["code.read", "security.analysis"],
        modalityIds: ["json", "text"],
        toolClassIds: ["filesystem.read"],
      },
      statusCode: 200,
    },
    {
      requestId: qaChartReviewRequestIds.strategyCost,
      source: "measured",
      available: true,
      inputTokens: 2400,
      outputTokens: 320,
      cacheReadTokens: 800,
      promptCacheRequestSource: "explicit",
      hoursAgo: 22,
      latencyMs: 1100,
      costActualUsd: 0.012,
      costEstimateUsd: 0.012,
      routingSavingsUsd: 0.008,
      cacheSavingsUsd: 0.0025,
      strategy: "cost",
      difficulty: "easy",
      routingMode: "hybrid",
      requestedRoleId: "general.chat",
      appliedRoleId: "general.chat",
      taxonomy: {
        groupId: "engineering",
        roleId: "coder",
        taskType: "coder.implement",
        taskVariant: "default",
        capabilityIds: ["code.write", "code.read"],
        modalityIds: ["text"],
        toolClassIds: ["shell.execute"],
      },
      statusCode: 200,
    },
    {
      requestId: qaChartReviewRequestIds.strategyLatency,
      source: "measured",
      available: true,
      inputTokens: 900,
      outputTokens: 140,
      cacheReadTokens: 0,
      promptCacheRequestSource: "synthesized",
      hoursAgo: 34,
      latencyMs: 340,
      costActualUsd: 0.0095,
      costEstimateUsd: 0.0095,
      routingSavingsUsd: 0.004,
      cacheSavingsUsd: 0,
      strategy: "latency",
      difficulty: "medium",
      routingMode: "remote_only",
      requestedRoleId: "analyst",
      appliedRoleId: "analyst",
      taxonomy: {
        groupId: "research",
        roleId: "analyst",
        taskType: "analyst.summarize",
        taskVariant: "brief",
        capabilityIds: ["text.summarize"],
        modalityIds: ["text"],
        toolClassIds: ["web.fetch"],
      },
      statusCode: 200,
    },
    {
      requestId: qaChartReviewRequestIds.strategyBalanced,
      source: "measured",
      available: true,
      inputTokens: 1600,
      outputTokens: 220,
      cacheReadTokens: 400,
      promptCacheRequestSource: "explicit",
      hoursAgo: 46,
      latencyMs: 760,
      costActualUsd: 0.011,
      costEstimateUsd: 0.011,
      routingSavingsUsd: 0.006,
      cacheSavingsUsd: 0.0018,
      strategy: "balanced",
      difficulty: "medium",
      routingMode: "hybrid",
      requestedRoleId: "coder.patch",
      appliedRoleId: "coder.patch",
      taxonomy: {
        groupId: "engineering",
        roleId: "coder",
        taskType: "coder.review",
        taskVariant: "default",
        capabilityIds: ["code.read"],
        modalityIds: ["text"],
        toolClassIds: ["filesystem.read", "shell.execute"],
      },
      statusCode: 200,
    },
    {
      requestId: qaChartReviewRequestIds.taxonomySecurity,
      source: "measured",
      available: true,
      inputTokens: 3200,
      outputTokens: 480,
      cacheReadTokens: 1200,
      promptCacheRequestSource: "explicit",
      hoursAgo: 58,
      latencyMs: 980,
      costActualUsd: 0.018,
      costEstimateUsd: 0.018,
      routingSavingsUsd: 0.009,
      cacheSavingsUsd: 0.003,
      strategy: "quality",
      difficulty: "hard",
      routingMode: "hybrid",
      requestedRoleId: "security.audit",
      appliedRoleId: "security.audit",
      taxonomy: {
        groupId: "governance_safety",
        roleId: "security",
        taskType: "security.audit",
        taskVariant: "deep",
        capabilityIds: ["security.analysis"],
        modalityIds: ["text"],
        toolClassIds: ["filesystem.read"],
      },
      statusCode: 200,
    },
    {
      requestId: qaChartReviewRequestIds.taxonomyAnalyst,
      source: "estimated",
      available: true,
      inputTokens: 1800,
      outputTokens: 260,
      cacheReadTokens: 0,
      promptCacheRequestSource: "synthesized",
      hoursAgo: 70,
      latencyMs: 870,
      costEstimateUsd: 0.0075,
      routingSavingsUsd: 0.0045,
      cacheSavingsUsd: 0,
      strategy: "cost",
      difficulty: "easy",
      routingMode: "hybrid",
      requestedRoleId: "analyst",
      appliedRoleId: "analyst",
      taxonomy: {
        groupId: "research",
        roleId: "analyst",
        taskType: "analyst.extract",
        taskVariant: "tables",
        capabilityIds: ["text.extract", "text.summarize"],
        modalityIds: ["json", "text"],
        toolClassIds: ["web.fetch"],
      },
      statusCode: 200,
    },
    {
      requestId: qaChartReviewRequestIds.difficultyHard,
      source: "measured",
      available: true,
      inputTokens: 5400,
      outputTokens: 900,
      cacheReadTokens: 2200,
      promptCacheRequestSource: "explicit",
      hoursAgo: 82,
      latencyMs: 1540,
      costActualUsd: 0.031,
      costEstimateUsd: 0.031,
      routingSavingsUsd: 0.014,
      cacheSavingsUsd: 0.005,
      strategy: "quality",
      difficulty: "hard",
      routingMode: "hybrid",
      requestedRoleId: "coder.patch",
      appliedRoleId: "coder.patch",
      taxonomy: {
        groupId: "engineering",
        roleId: "coder",
        taskType: "coder.implement",
        taskVariant: "complex",
        capabilityIds: ["code.write", "code.read", "security.analysis"],
        modalityIds: ["json", "text"],
        toolClassIds: ["filesystem.read", "shell.execute"],
      },
      statusCode: 200,
    },
    {
      requestId: qaChartReviewRequestIds.failureTimeout,
      source: "unavailable",
      available: false,
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      promptCacheRequestSource: null,
      hoursAgo: 16,
      latencyMs: 1200,
      costEstimateUsd: 0.0011,
      routingSavingsUsd: 0,
      cacheSavingsUsd: 0,
      strategy: "latency",
      difficulty: "medium",
      routingMode: "local_only",
      requestedRoleId: "general.chat",
      appliedRoleId: "general.chat",
      taxonomy: {
        groupId: "governance_safety",
        roleId: "security",
        taskType: "security.audit",
        taskVariant: "deep",
        capabilityIds: ["security.analysis"],
        modalityIds: ["text"],
        toolClassIds: ["filesystem.read"],
      },
      errorClass: "upstream_timeout",
      statusCode: 504,
      sourceType: "local",
      modelId: "local/mock-llama",
    },
    {
      requestId: qaChartReviewRequestIds.localEstimate,
      source: "estimated",
      available: true,
      inputTokens: 640,
      outputTokens: 120,
      cacheReadTokens: 0,
      promptCacheRequestSource: null,
      hoursAgo: 94,
      latencyMs: 1320,
      costEstimateUsd: 0.0022,
      routingSavingsUsd: 0.0015,
      cacheSavingsUsd: 0,
      strategy: "cost",
      difficulty: "easy",
      routingMode: "local_only",
      requestedRoleId: "general.chat",
      appliedRoleId: "general.chat",
      taxonomy: {
        groupId: "engineering",
        roleId: "coder",
        taskType: "coder.implement",
        taskVariant: "default",
        capabilityIds: ["code.write"],
        modalityIds: ["text"],
        toolClassIds: ["shell.execute"],
      },
      statusCode: 200,
      sourceType: "local",
      modelId: "local/mock-llama",
    },
  ];
  const databasePath = resolveSqliteMemoryLocation({
    runtimeStateRoot: currentRuntimeStateRoot,
    scopeId: currentScopeId,
  });

  for (const fixture of fixtures) {
    const timestampMs = now - fixture.hoursAgo * 60 * 60 * 1000;
    const routingDecisionId = `decision-${fixture.requestId}`;
    const endpointId = fixture.endpointId ?? defaultEndpointId;
    const modelId = fixture.modelId ?? qaActivatedModelId;
    const sourceType = fixture.sourceType ?? "remote";
    const strategy = fixture.strategy ?? "balanced";
    const difficulty = fixture.difficulty ?? "easy";
    const routingMode = fixture.routingMode ?? "hybrid";
    const routingSavings = fixture.routingSavingsUsd ?? 0;
    const cacheSavings = fixture.cacheSavingsUsd ?? 0;
    const estimatedCost = fixture.costEstimateUsd ?? fixture.costActualUsd ?? 0;
    const selectedUncached = estimatedCost + routingSavings;
    const baselineMax = selectedUncached + Math.max(routingSavings, 0.002);
    const isFailure = Boolean(fixture.errorClass) || (fixture.statusCode ?? 200) >= 400;

    persistRuntimeObservationBundle({
      databasePath,
      channel: "development",
      observation: {
        ...baseBundle,
        requestId: fixture.requestId,
        routingDecisionId,
        endpointId,
        ...(fixture.taxonomy
          ? {
              taxonomyDimensions: {
                taxonomy_group_id: fixture.taxonomy.groupId,
                taxonomy_role_id: fixture.taxonomy.roleId,
                taxonomy_task_type: fixture.taxonomy.taskType,
                taxonomy_task_variant: fixture.taxonomy.taskVariant,
                taxonomy_capability_ids: [...fixture.taxonomy.capabilityIds],
                taxonomy_modality_ids: [...fixture.taxonomy.modalityIds],
                taxonomy_tool_class_ids: [...fixture.taxonomy.toolClassIds],
              },
            }
          : {}),
        routingDiagnostics: {
          ...baseBundle.routingDiagnostics,
          routingMode: {
            source: "alias-default",
            aliasMode: routingMode,
            effectiveMode: routingMode,
          },
          difficultyRouting: {
            difficulty,
            strategy,
            fallbackApplied: false,
            rubricSignals: {
              contextTokens: fixture.inputTokens,
              toolCount: fixture.taxonomy?.toolClassIds.length ?? 0,
              historyTurnCount: 1,
              instructionConstraintCount: 0,
              decompositionKeywordCount: 0,
              codeOrSchemaBurden: difficulty === "hard",
            },
          },
          controllerRouting: {
            active: true,
            acceptedDirectives: {
              requestedRoleId: fixture.requestedRoleId ?? "general.chat",
              strategy,
              preferLocal: sourceType === "local",
            },
          },
          hybridArbitration: {
            active: routingMode === "hybrid",
            difficultyStrategy: strategy,
            finalStrategy: strategy,
            controllerChangedPlan: false,
            dominantSignal: "difficulty",
          },
          rolePolicy: {
            requestedRoleId: fixture.requestedRoleId ?? "general.chat",
            appliedRoleId: fixture.appliedRoleId ?? fixture.requestedRoleId ?? "general.chat",
            defaultSystemInstructionsApplied: true,
            toolPolicyMode: "limited",
            allowedTools: [],
            outputContracts: [],
            safetyPolicyRefs: [],
          },
        },
        usageEvent: {
          ...baseBundle.usageEvent,
          request_id: fixture.requestId,
          routing_decision_id: routingDecisionId,
          endpoint_id: endpointId,
          model_id: modelId,
          provider_kind: sourceType === "local" ? "local_openai_compat" : "remote_openai_compat",
          tokens_in: fixture.inputTokens,
          tokens_in_source: fixture.source,
          tokens_in_available: fixture.available,
          tokens_out: fixture.outputTokens,
          tokens_out_source: fixture.source,
          tokens_out_available: fixture.available,
          latency_ms: fixture.latencyMs,
          ...(typeof fixture.costActualUsd === "number"
            ? { cost_actual: fixture.costActualUsd }
            : {}),
          ...(typeof fixture.costEstimateUsd === "number"
            ? { cost_estimate: fixture.costEstimateUsd }
            : {}),
          currency: "USD",
          ...(fixture.errorClass ? { error_class: fixture.errorClass } : {}),
          timestamp_ms: timestampMs,
        },
        observedPerformance: {
          ...baseBundle.observedPerformance,
          sample: {
            ...baseBundle.observedPerformance.sample,
            request_id: fixture.requestId,
            routing_decision_id: routingDecisionId,
            endpoint_id: endpointId,
            timestamp_ms: timestampMs,
            latency_ms: fixture.latencyMs,
            latency_ms_p95: fixture.latencyMs,
            source_type: "live_request",
            difficulty_bucket: difficulty,
            ...(isFailure
              ? {
                  failure: true,
                  ...(fixture.errorClass ? { error_class: fixture.errorClass } : {}),
                }
              : {}),
          },
          profile: {
            ...baseBundle.observedPerformance.profile,
            endpoint_id: endpointId,
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
          routingCacheAffinity: fixture.cacheReadTokens > 0,
        },
        executionTelemetry: {
          ...baseBundle.executionTelemetry,
          providerFamily: sourceType === "local" ? "llama-swap" : "ai-sdk-openai",
          finishReason: isFailure ? "error" : "stop",
          promptCaching: { supported: sourceType !== "local" },
          usageSupport: {
            ...baseBundle.executionTelemetry.usageSupport,
            inputTokens: true,
            outputTokens: true,
            cacheReadTokens: true,
            cacheWriteTokens: true,
          },
          costProvenance:
            typeof fixture.costActualUsd === "number"
              ? "actual"
              : typeof fixture.costEstimateUsd === "number"
                ? "estimated"
                : "unavailable",
        },
        telemetrySnapshot: {
          providerId: sourceType === "local" ? "llama-swap" : "moonshot",
          providerAccountId: sourceType === "local" ? null : qaProviderAccountId,
          sourceType,
          endpointKind: sourceType === "local" ? "local_engine" : "remote_api",
          servingSource: sourceType === "local" ? "local-process" : "remote-service",
          region: sourceType === "local" ? "local" : "global",
          lifecycleStateAtRequest: "active",
          healthStatusAtRequest: "healthy",
          requestedModelId: modelId,
          requestOperation: "chat",
          roleIds: [fixture.appliedRoleId ?? fixture.requestedRoleId ?? "general.chat"],
          toolingUsed: (fixture.taxonomy?.toolClassIds.length ?? 0) > 0,
          cacheState:
            fixture.cacheReadTokens > 0 ? "hit" : sourceType === "local" ? "unsupported" : "miss",
          eligibleEndpointIds: [endpointId],
          eligibleModelIds: [modelId],
          candidateCostSnapshot: {
            [endpointId]: {
              modelId,
              providerId: sourceType === "local" ? "llama-swap" : "moonshot",
              sourceType,
              estimatedRequestUsd: selectedUncached,
            },
          },
          selectedPricingSnapshot: {
            modelId,
            providerId: sourceType === "local" ? "llama-swap" : "moonshot",
            sourceType,
            estimatedRequestUsd: selectedUncached,
          },
          selectedUncachedCostUsd: selectedUncached,
          baselineMaxEligibleCostUsd: baselineMax,
          routingCostSavingsUsd: routingSavings,
          cacheCostSavingsUsd: cacheSavings,
          totalAvoidedCostUsd: routingSavings + cacheSavings,
          costBaselineSource: "eligible_candidate_max",
          costSavingsSupport: routingSavings > 0 || cacheSavings > 0 ? "full" : "partial",
        },
        inspection: {
          ...baseBundle.inspection,
          request: {
            ...baseBundle.inspection.request,
            requestId: fixture.requestId,
            routingDecisionId,
            responseCapture: {
              ...baseBundle.inspection.request.responseCapture,
              statusCode: fixture.statusCode ?? 200,
            },
          },
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
    mutateExtension: backend.mutateExtension,
    readStorageRetention: backend.readStorageRetention,
    dryRunStorageRetention: backend.dryRunStorageRetention,
    updateStorageRetentionPolicy: backend.updateStorageRetentionPolicy,
    executeStorageRetention: backend.executeStorageRetention,
    cancelStorageRetentionJob: backend.cancelStorageRetentionJob,
    rollbackStorageRetention: backend.rollbackStorageRetention,
    readContributionState: backend.readContributionState,
    updateContributionState: backend.updateContributionState,
    listRecommendations: backend.listRecommendations,
    downloadRecommendations: backend.downloadRecommendations,
    applyRecommendation: backend.applyRecommendation,
    readActivePack: backend.readActivePack,
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

  if (process.env.RUNTIME_QA_RESET_STATE === "1") {
    if (!path.basename(runtimeStateRoot).startsWith("role-model-runtime-qa-"))
      throw new Error("refusing to reset a non-QA runtime state root");
    await rm(runtimeStateRoot, { recursive: true, force: true });
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
  if (process.env.DEEPSEEK_API_KEY && process.env.RUNTIME_QA_NO_MODEL_FIXTURES !== "1") {
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

  if (process.env.RUNTIME_QA_NO_MODEL_FIXTURES !== "1") {
    await seedQaTelemetry(repoRoot, runtimeStateRoot, scopeId);
    console.log(
      `[QA] Seeded chart-review telemetry (${Object.keys(qaTelemetryRequestIds).length + Object.keys(qaChartReviewRequestIds).length} requests)`,
    );
  } else {
    console.log("[QA] Skipping chart-review telemetry seed (RUNTIME_QA_NO_MODEL_FIXTURES=1).");
  }

  const productContractsPath = path.join(
    repoRoot,
    "packages",
    "protocol-types",
    "generated",
    "product-contracts.json",
  );
  const productContracts = JSON.parse(await readFile(productContractsPath, "utf8")) as {
    readonly extensions?: readonly Record<string, unknown>[];
  };
  const trackBBridgePath = path.join(runtimeStateRoot, scopeId, "track-b-production-bridge.json");
  const seeded = await seedTrackBExtensionBridgeState({
    statePath: trackBBridgePath,
    catalog: productContracts.extensions ?? [],
    channel: "production",
    scope: "global",
    authorizationEpoch: 1,
  });
  console.log(
    `[QA] Seeded Track B extension bridge: ${seeded.extensions.length} packages at ${trackBBridgePath}`,
  );

  const backend = await createRuntimeBridgeBackend(
    createQaRuntimeBridgeBackendOptions(repoRoot, runtimeStateRoot, scopeId),
  );
  if (!process.env.RUNTIME_QA_NO_PLACEHOLDERS && process.env.RUNTIME_QA_NO_MODEL_FIXTURES !== "1") {
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
