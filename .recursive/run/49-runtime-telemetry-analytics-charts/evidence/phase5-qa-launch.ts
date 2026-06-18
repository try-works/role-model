// @ts-nocheck
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runRuntimeAdapterValidation } from "../../../../role-model-router/packages/adapter-execution/src/cli.ts";
import { createRuntimeObservationBundle } from "../../../../role-model-router/packages/runtime-observability/src/index.ts";
import {
  persistRuntimeObservationBundle,
  resolveSqliteMemoryLocation,
} from "../../../../role-model-router/packages/sqlite-memory/src/index.ts";
import {
  createRuntimeBridgeBackend,
  startBridgeServer,
} from "../../../../role-model-router/apps/runtime-host-bridge/src/index.ts";
import {
  createQaRuntimeBridgeBackendOptions,
  createQaRuntimeConfigPath,
  createQaRuntimeConfigText,
  createQaFixtureRoot,
  createQaServerOptions,
} from "../../../../role-model-router/apps/runtime-host-bridge/scripts/start-for-qa.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");
const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-qa-phase5");
const scopeId = "runtime-qa-phase5";

function createTelemetrySnapshot(input: {
  sourceType: "local" | "remote";
  providerId: string | null;
  providerAccountId: string | null;
  selectedModelId: string;
  requestedModelId: string;
  endpointKind: string;
  servingSource: string;
  region: string;
  lifecycleStateAtRequest: string;
  healthStatusAtRequest: string;
  roleIds: readonly string[];
  eligibleEndpointIds: readonly string[];
  eligibleModelIds: readonly string[];
  cacheState: "hit" | "miss" | "none";
  toolingUsed?: boolean;
  selectedUncachedCostUsd: number | null;
  baselineMaxEligibleCostUsd: number | null;
  routingCostSavingsUsd: number;
  cacheCostSavingsUsd: number;
  totalAvoidedCostUsd: number;
  dimensions?: Record<string, unknown>;
}) {
  return {
    sourceType: input.sourceType,
    providerId: input.providerId,
    providerAccountId: input.providerAccountId,
    selectedModelId: input.selectedModelId,
    requestedModelId: input.requestedModelId,
    endpointKind: input.endpointKind,
    servingSource: input.servingSource,
    region: input.region,
    lifecycleStateAtRequest: input.lifecycleStateAtRequest,
    healthStatusAtRequest: input.healthStatusAtRequest,
    requestOperation: "chat.completions",
    toolingUsed: input.toolingUsed ?? false,
    cacheState: input.cacheState,
    roleIds: input.roleIds,
    eligibleEndpointIds: input.eligibleEndpointIds,
    eligibleModelIds: input.eligibleModelIds,
    candidateCostSnapshot: {
      baselineMaxEligibleCostUsd: input.baselineMaxEligibleCostUsd,
      selectedUncachedCostUsd: input.selectedUncachedCostUsd,
    },
    selectedPricingSnapshot: {
      selectedUncachedCostUsd: input.selectedUncachedCostUsd,
    },
    selectedUncachedCostUsd: input.selectedUncachedCostUsd,
    baselineMaxEligibleCostUsd: input.baselineMaxEligibleCostUsd,
    routingCostSavingsUsd: input.routingCostSavingsUsd,
    cacheCostSavingsUsd: input.cacheCostSavingsUsd,
    totalAvoidedCostUsd: input.totalAvoidedCostUsd,
    costBaselineSource: input.baselineMaxEligibleCostUsd === null ? "none" : "eligible-max",
    costSavingsSupport:
      input.routingCostSavingsUsd > 0 || input.cacheCostSavingsUsd > 0 ? "complete" : "partial",
    dimensions: input.dimensions ?? null,
  };
}

function createSeededObservation(input: {
  validation: Awaited<ReturnType<typeof runRuntimeAdapterValidation>>;
  history: { byEndpointId: Record<string, unknown[]> };
  policy: Record<string, unknown>;
  requestId: string;
  routingDecisionId: string;
  conversationId: string;
  endpointId: string;
  modelId: string;
  requestedModelId: string;
  sourceType: "local" | "remote";
  providerId: string | null;
  providerKind: string;
  providerAccountId: string | null;
  endpointKind: string;
  servingSource: string;
  region: string;
  lifecycleStateAtRequest?: string;
  healthStatusAtRequest?: string;
  routingMode: "baseline" | "difficulty" | "controller" | "hybrid";
  difficultyBucket: "easy" | "medium" | "hard";
  selectedStrategy?: string | null;
  requestedRoleId?: string | null;
  actualCostUsd: number | null;
  estimatedCostUsd: number | null;
  selectedUncachedCostUsd: number | null;
  baselineMaxEligibleCostUsd: number | null;
  routingCostSavingsUsd: number;
  cacheCostSavingsUsd: number;
  totalAvoidedCostUsd: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  promptCacheUsed: boolean;
  statusCode: number;
  latencyMs: number;
  timestampMs: number;
  errorClass?: string | null;
  dimensions?: Record<string, unknown>;
}) {
  const selectedStrategy = input.selectedStrategy ?? input.routingMode;
  const baseObservation = createRuntimeObservationBundle({
    decision: {
      ...input.validation.decision,
      request_id: input.requestId,
      routing_decision_id: input.routingDecisionId,
      chosen_endpoint_id: input.endpointId,
      app_id: "runtime-ui-phase5-qa",
    },
    routingDiagnostics: {
      ...input.validation.routingDiagnostics,
      aliasResolution:
        input.requestedModelId === input.modelId
          ? undefined
          : {
              requestedModel: input.requestedModelId,
              aliasId: input.requestedModelId,
              resolvedModelIds: [input.modelId],
              allowEndpoints: [input.endpointId],
            },
      routingMode: {
        source: "phase5-qa-seed",
        effectiveMode: input.routingMode,
      },
      difficultyRouting: {
        difficulty: input.difficultyBucket,
        strategy: selectedStrategy,
      },
      controllerRouting:
        input.routingMode === "controller" || input.routingMode === "hybrid"
          ? {
              acceptedDirectives: {
                requestedRoleId: input.requestedRoleId ?? "general.chat",
                strategy: selectedStrategy,
              },
            }
          : undefined,
      hybridArbitration:
        input.routingMode === "hybrid"
          ? {
              finalStrategy: selectedStrategy,
            }
          : undefined,
      rewrite: {
        requestedModel: input.requestedModelId,
        downstreamModelId: input.modelId,
        applied: input.requestedModelId !== input.modelId,
        reason:
          input.requestedModelId === input.modelId
            ? "requested-model-matches-downstream"
            : "requested-model-rewritten-for-selected-endpoint",
      },
    },
    retrievalReceipt: input.validation.retrievalReceipt,
    contextEnvelope: input.validation.contextEnvelope,
    execution: input.validation.execution,
    priorSamples: input.history.byEndpointId[input.endpointId] ?? [],
    maintenancePolicy: {
      "redaction.level": "strict",
      "retention.class": "standard",
    },
    capturePolicy: input.policy,
    ...(input.providerAccountId
      ? {
          accountState: {
            providerAccountId: input.providerAccountId,
            status: "active",
            healthStatus: input.healthStatusAtRequest ?? "healthy",
            rotationState: "stable",
          },
        }
      : {}),
    telemetrySnapshot: createTelemetrySnapshot({
      sourceType: input.sourceType,
      providerId: input.providerId,
      providerAccountId: input.providerAccountId,
      selectedModelId: input.modelId,
      requestedModelId: input.requestedModelId,
      endpointKind: input.endpointKind,
      servingSource: input.servingSource,
      region: input.region,
      lifecycleStateAtRequest: input.lifecycleStateAtRequest ?? "active",
      healthStatusAtRequest: input.healthStatusAtRequest ?? "healthy",
      roleIds: input.requestedRoleId ? [input.requestedRoleId] : ["general.chat"],
      eligibleEndpointIds: [
        "cli.local.coder",
        "openai.personal.primary.us-east-1.fast",
        "anthropic.team.shared.us-east-1.default",
      ],
      eligibleModelIds: [
        "gpt-5.4",
        "openai/gpt-4.1-mini-fast",
        "anthropic/claude-3.7-sonnet",
      ],
      cacheState:
        input.promptCacheUsed || input.cacheReadTokens > 0
          ? "hit"
          : input.cacheWriteTokens > 0
            ? "miss"
            : "none",
      selectedUncachedCostUsd: input.selectedUncachedCostUsd,
      baselineMaxEligibleCostUsd: input.baselineMaxEligibleCostUsd,
      routingCostSavingsUsd: input.routingCostSavingsUsd,
      cacheCostSavingsUsd: input.cacheCostSavingsUsd,
      totalAvoidedCostUsd: input.totalAvoidedCostUsd,
      dimensions: input.dimensions,
    }),
  });

  return {
    ...baseObservation,
    requestId: input.requestId,
    clientRequestId: `${input.requestId}-client`,
    routingDecisionId: input.routingDecisionId,
    endpointId: input.endpointId,
    conversationId: input.conversationId,
    usageEvent: {
      ...baseObservation.usageEvent,
      request_id: input.requestId,
      routing_decision_id: input.routingDecisionId,
      endpoint_id: input.endpointId,
      model_id: input.modelId,
      provider_kind: input.providerKind,
      timestamp_ms: input.timestampMs,
      tokens_in: input.inputTokens,
      tokens_out: input.outputTokens,
      latency_ms: input.latencyMs,
      cost_actual: input.actualCostUsd,
      cost_estimate: input.estimatedCostUsd,
      currency: "USD",
      error_class: input.errorClass ?? null,
    },
    observedPerformance: {
      ...baseObservation.observedPerformance,
      sample: {
        ...baseObservation.observedPerformance.sample,
        request_id: input.requestId,
        routing_decision_id: input.routingDecisionId,
        endpoint_id: input.endpointId,
        source_type: "live_request",
        latency_ms: input.latencyMs,
        error_class: input.errorClass ?? null,
        difficulty_bucket: input.difficultyBucket,
      },
    },
    cacheObservability: {
      ...baseObservation.cacheObservability,
      promptCacheRequested: input.cacheReadTokens > 0 || input.cacheWriteTokens > 0,
      promptCacheUsed: input.promptCacheUsed,
      cacheReadTokens: input.cacheReadTokens,
      cacheWriteTokens: input.cacheWriteTokens,
      routingCacheAffinity: input.promptCacheUsed,
    },
    inspection: {
      ...baseObservation.inspection,
      request: {
        ...baseObservation.inspection.request,
        requestId: input.requestId,
        clientRequestId: `${input.requestId}-client`,
        routingDecisionId: input.routingDecisionId,
        requestCapture: {
          ...baseObservation.inspection.request.requestCapture,
          body: {
            ...baseObservation.inspection.request.requestCapture.body,
            model: input.requestedModelId,
          },
        },
        responseCapture: {
          ...baseObservation.inspection.request.responseCapture,
          statusCode: input.statusCode,
          body: {
            id: input.requestId,
            model: input.modelId,
            status: input.errorClass ? "failure" : "ok",
          },
        },
      },
      endpoint: {
        ...baseObservation.inspection.endpoint,
        endpointId: input.endpointId,
      },
    },
  };
}

async function seedTelemetry(repoFixtureRoot: string): Promise<void> {
  const history = JSON.parse(
    await readFile(
      path.join(repoRoot, "testdata", "router-runtime", "observability-history.json"),
      "utf8",
    ),
  );
  const policy = JSON.parse(
    await readFile(
      path.join(repoRoot, "testdata", "router-runtime", "observability-policy.json"),
      "utf8",
    ),
  );
  const validation = await runRuntimeAdapterValidation({
    repoRoot,
    fixtureRoot: repoFixtureRoot,
    runtimeStateRoot,
    scopeId: `${scopeId}-routing-proof`,
  });

  const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
  const now = Date.now();
  const rows = [
    {
      requestId: "req-phase5-001",
      routingDecisionId: "route-phase5-001",
      conversationId: "conv-phase5-openai-1",
      endpointId: "openai.personal.primary.us-east-1.fast",
      modelId: "openai/gpt-4.1-mini-fast",
      requestedModelId: "openai/gpt-4.1-mini-fast",
      sourceType: "remote",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      endpointKind: "remote-openai-compatible",
      servingSource: "remote-service",
      region: "us-east-1",
      routingMode: "baseline",
      difficultyBucket: "easy",
      selectedStrategy: "baseline",
      requestedRoleId: "general.chat",
      actualCostUsd: 0.024,
      estimatedCostUsd: 0.024,
      selectedUncachedCostUsd: 0.024,
      baselineMaxEligibleCostUsd: 0.061,
      routingCostSavingsUsd: 0.037,
      cacheCostSavingsUsd: 0,
      totalAvoidedCostUsd: 0.037,
      inputTokens: 1800,
      outputTokens: 460,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      promptCacheUsed: false,
      statusCode: 200,
      latencyMs: 980,
      timestampMs: now - 1000 * 60 * 90,
      dimensions: { page: "overview", taskClass: "easy" },
    },
    {
      requestId: "req-phase5-002",
      routingDecisionId: "route-phase5-002",
      conversationId: "conv-phase5-local-1",
      endpointId: "cli.local.coder",
      modelId: "gpt-5.4",
      requestedModelId: "mixed.local-remote",
      sourceType: "local",
      providerId: "local-cli",
      providerKind: "provider-cli",
      providerAccountId: null,
      endpointKind: "cli-agent",
      servingSource: "local-process",
      region: "local",
      routingMode: "difficulty",
      difficultyBucket: "medium",
      selectedStrategy: "difficulty",
      requestedRoleId: "general.chat",
      actualCostUsd: 0,
      estimatedCostUsd: 0,
      selectedUncachedCostUsd: 0,
      baselineMaxEligibleCostUsd: 0.052,
      routingCostSavingsUsd: 0.052,
      cacheCostSavingsUsd: 0,
      totalAvoidedCostUsd: 0.052,
      inputTokens: 950,
      outputTokens: 280,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      promptCacheUsed: false,
      statusCode: 200,
      latencyMs: 620,
      timestampMs: now - 1000 * 60 * 70,
      dimensions: { page: "routing", taskClass: "medium" },
    },
    {
      requestId: "req-phase5-003",
      routingDecisionId: "route-phase5-003",
      conversationId: "conv-phase5-anthropic-1",
      endpointId: "anthropic.team.shared.us-east-1.default",
      modelId: "anthropic/claude-3.7-sonnet",
      requestedModelId: "anthropic/claude-3.7-sonnet",
      sourceType: "remote",
      providerId: "anthropic",
      providerKind: "provider-anthropic",
      providerAccountId: "anthropic.team.shared",
      endpointKind: "remote-anthropic",
      servingSource: "remote-service",
      region: "us-east-1",
      lifecycleStateAtRequest: "degraded",
      healthStatusAtRequest: "healthy",
      routingMode: "controller",
      difficultyBucket: "hard",
      selectedStrategy: "controller",
      requestedRoleId: "analysis.deep",
      actualCostUsd: 0.081,
      estimatedCostUsd: 0.081,
      selectedUncachedCostUsd: 0.081,
      baselineMaxEligibleCostUsd: 0.081,
      routingCostSavingsUsd: 0,
      cacheCostSavingsUsd: 0,
      totalAvoidedCostUsd: 0,
      inputTokens: 2400,
      outputTokens: 780,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      promptCacheUsed: false,
      statusCode: 503,
      latencyMs: 1840,
      timestampMs: now - 1000 * 60 * 52,
      errorClass: "upstream_error",
      dimensions: { page: "requests", taskClass: "hard" },
    },
    {
      requestId: "req-phase5-004",
      routingDecisionId: "route-phase5-004",
      conversationId: "conv-phase5-openai-cache",
      endpointId: "openai.personal.primary.us-east-1.fast",
      modelId: "openai/gpt-4.1-mini-fast",
      requestedModelId: "openai/gpt-4.1-mini-fast",
      sourceType: "remote",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      endpointKind: "remote-openai-compatible",
      servingSource: "remote-service",
      region: "us-east-1",
      routingMode: "hybrid",
      difficultyBucket: "easy",
      selectedStrategy: "controller",
      requestedRoleId: "general.chat",
      actualCostUsd: 0.009,
      estimatedCostUsd: 0.009,
      selectedUncachedCostUsd: 0.029,
      baselineMaxEligibleCostUsd: 0.061,
      routingCostSavingsUsd: 0.032,
      cacheCostSavingsUsd: 0.02,
      totalAvoidedCostUsd: 0.052,
      inputTokens: 2100,
      outputTokens: 320,
      cacheReadTokens: 1400,
      cacheWriteTokens: 200,
      promptCacheUsed: true,
      statusCode: 200,
      latencyMs: 410,
      timestampMs: now - 1000 * 60 * 34,
      dimensions: { page: "overview", taskClass: "easy", cache: "hit" },
    },
    {
      requestId: "req-phase5-005",
      routingDecisionId: "route-phase5-005",
      conversationId: "conv-phase5-local-2",
      endpointId: "cli.local.coder",
      modelId: "gpt-5.4",
      requestedModelId: "mixed.local-remote",
      sourceType: "local",
      providerId: "local-cli",
      providerKind: "provider-cli",
      providerAccountId: null,
      endpointKind: "cli-agent",
      servingSource: "local-process",
      region: "local",
      routingMode: "hybrid",
      difficultyBucket: "hard",
      selectedStrategy: "controller",
      requestedRoleId: "analysis.deep",
      actualCostUsd: 0,
      estimatedCostUsd: 0,
      selectedUncachedCostUsd: 0,
      baselineMaxEligibleCostUsd: 0.081,
      routingCostSavingsUsd: 0.081,
      cacheCostSavingsUsd: 0,
      totalAvoidedCostUsd: 0.081,
      inputTokens: 3100,
      outputTokens: 920,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      promptCacheUsed: false,
      statusCode: 200,
      latencyMs: 730,
      timestampMs: now - 1000 * 60 * 18,
      dimensions: { page: "routing", taskClass: "hard" },
    },
    {
      requestId: "req-phase5-006",
      routingDecisionId: "route-phase5-006",
      conversationId: "conv-phase5-openai-2",
      endpointId: "openai.personal.primary.us-east-1.fast",
      modelId: "openai/gpt-4.1-mini-fast",
      requestedModelId: "openai/gpt-4.1-mini-fast",
      sourceType: "remote",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      endpointKind: "remote-openai-compatible",
      servingSource: "remote-service",
      region: "us-east-1",
      routingMode: "baseline",
      difficultyBucket: "medium",
      selectedStrategy: "baseline",
      requestedRoleId: "general.chat",
      actualCostUsd: 0.031,
      estimatedCostUsd: 0.031,
      selectedUncachedCostUsd: 0.031,
      baselineMaxEligibleCostUsd: 0.061,
      routingCostSavingsUsd: 0.03,
      cacheCostSavingsUsd: 0,
      totalAvoidedCostUsd: 0.03,
      inputTokens: 2600,
      outputTokens: 610,
      cacheReadTokens: 0,
      cacheWriteTokens: 160,
      promptCacheUsed: false,
      statusCode: 200,
      latencyMs: 1080,
      timestampMs: now - 1000 * 60 * 8,
      dimensions: { page: "requests", taskClass: "medium", cache: "write" },
    },
  ];

  for (const row of rows) {
    const observation = createSeededObservation({
      validation,
      history,
      policy,
      ...row,
    });
    persistRuntimeObservationBundle({
      databasePath,
      observation,
    });
  }
}

async function main(): Promise<void> {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || "phase5-openai-key";
  process.env.MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY || "phase5-moonshot-key";

  console.log("[Phase5QA] Resetting runtime state...");
  await rm(runtimeStateRoot, { recursive: true, force: true });
  await mkdir(runtimeStateRoot, { recursive: true });

  const fixtureRoot = createQaFixtureRoot(repoRoot);
  const unifiedRuntimeConfigPath = createQaRuntimeConfigPath(runtimeStateRoot);
  await writeFile(unifiedRuntimeConfigPath, createQaRuntimeConfigText(), "utf8");
  console.log(`[Phase5QA] repoRoot: ${repoRoot}`);
  console.log(`[Phase5QA] runtimeStateRoot: ${runtimeStateRoot}`);
  console.log(`[Phase5QA] fixtureRoot: ${fixtureRoot}`);
  console.log(`[Phase5QA] runtimeConfigPath: ${unifiedRuntimeConfigPath}`);

  const backend = await createRuntimeBridgeBackend({
    ...createQaRuntimeBridgeBackendOptions(repoRoot, runtimeStateRoot, scopeId),
    fixtureRoot,
  });

  await seedTelemetry(fixtureRoot);

  const server = await startBridgeServer({
    ...createQaServerOptions(repoRoot, backend),
    repoRoot,
    runtimeStateRoot,
    scopeId,
  });

  const baseUrl = `http://127.0.0.1:${server.port}`;
  console.log(`[Phase5QA] Ready at ${baseUrl}`);
  console.log("[Phase5QA] Routes:");
  console.log(`  ${baseUrl}/app`);
  console.log(`  ${baseUrl}/app/observe/requests`);
  console.log(`  ${baseUrl}/app/observe/routing`);

  process.on("SIGINT", async () => {
    console.log("\n[Phase5QA] Shutting down...");
    await server.close();
    await backend.shutdown();
    process.exit(0);
  });

  await new Promise(() => {});
}

await main();
