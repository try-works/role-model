import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const runId = "70-cache-hit-token-rate-analytics-fix";
const scopeId = "phase5-cache-efficiency-qa";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..", "..", "..");
const runtimeStateRoot = path.join(
  repoRoot,
  ".recursive",
  "run",
  runId,
  "evidence",
  "manual-qa",
  "runtime-state",
);
const fixtureRoot = path.join(repoRoot, "testdata", "router-runtime", "fixtures");

const adapterCliModuleUrl = pathToFileURL(
  path.join(repoRoot, "role-model-router", "packages", "adapter-execution", "src", "cli.ts"),
).href;
const runtimeObservabilityModuleUrl = pathToFileURL(
  path.join(repoRoot, "role-model-router", "packages", "runtime-observability", "src", "index.ts"),
).href;
const sqliteMemoryModuleUrl = pathToFileURL(
  path.join(repoRoot, "role-model-router", "packages", "sqlite-memory", "src", "index.ts"),
).href;

const { createRuntimeObservationBundle } = (await import(runtimeObservabilityModuleUrl)) as {
  createRuntimeObservationBundle: (input: Record<string, unknown>) => Record<string, any>;
};
const { persistRuntimeObservationBundle, resolveSqliteMemoryLocation } = (await import(
  sqliteMemoryModuleUrl
)) as {
  persistRuntimeObservationBundle: (input: {
    databasePath: string;
    observation: Record<string, any>;
  }) => void;
  resolveSqliteMemoryLocation: (input: {
    runtimeStateRoot: string;
    scopeId: string;
  }) => string;
};
const { runRuntimeAdapterValidation } = (await import(adapterCliModuleUrl)) as {
  runRuntimeAdapterValidation: (input: {
    repoRoot: string;
    fixtureRoot: string;
    runtimeStateRoot: string;
    scopeId: string;
  }) => Promise<{
    decision: Record<string, unknown>;
    routingDiagnostics: Record<string, unknown>;
    retrievalReceipt: Record<string, unknown>;
    contextEnvelope: Record<string, unknown>;
    execution: Record<string, unknown>;
  }>;
};

await mkdir(runtimeStateRoot, { recursive: true });

const validation = await runRuntimeAdapterValidation({
  repoRoot,
  fixtureRoot,
  runtimeStateRoot,
  scopeId,
});

const databasePath = resolveSqliteMemoryLocation({
  runtimeStateRoot,
  scopeId,
});

const now = Date.now();
const firstRemoteTimestampMs = now - 20 * 60 * 60 * 1000;
const secondRemoteTimestampMs = now - 2 * 60 * 60 * 1000;
const localTimestampMs = secondRemoteTimestampMs + 60_000;

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
    "backup.policy": "wal-copy-on-demand",
    "deletion.policy": "explicit-export-delete",
  },
  capturePolicy: {},
  accountState: {
    providerAccountId: validation.execution.target.providerAccountId,
    status: "active",
    healthStatus: "healthy",
    rotationState: "stable",
  },
});

function buildRemoteBundle(input: {
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly timestampMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly latencyMs: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly actualCostUsd: number;
  readonly estimatedCostUsd: number;
  readonly selectedUncachedCostUsd: number;
  readonly baselineMaxEligibleCostUsd: number;
  readonly routingCostSavingsUsd: number;
  readonly cacheCostSavingsUsd: number;
  readonly totalAvoidedCostUsd: number;
}) {
  return {
    ...baseBundle,
    requestId: input.requestId,
    routingDecisionId: input.routingDecisionId,
    endpointId: "openai.personal.primary.us-east-1.fast",
    taxonomyDimensions: {
      taxonomy_group_id: "engineering",
      taxonomy_role_id: "coder",
      taxonomy_task_type: "coder.review",
      taxonomy_task_variant: "security",
      taxonomy_capability_ids: ["code.read", "security.analysis"],
      taxonomy_modality_ids: ["json", "text"],
      taxonomy_tool_class_ids: ["filesystem.read", "shell.execute"],
    },
    usageEvent: {
      ...baseBundle.usageEvent,
      request_id: input.requestId,
      routing_decision_id: input.routingDecisionId,
      endpoint_id: "openai.personal.primary.us-east-1.fast",
      model_id: "openai/gpt-4.1-mini-fast",
      provider_kind: "remote_openai_compat",
      tokens_in: input.inputTokens,
      tokens_out: input.outputTokens,
      latency_ms: input.latencyMs,
      cost_actual: input.actualCostUsd,
      cost_estimate: input.estimatedCostUsd,
      currency: "USD",
      timestamp_ms: input.timestampMs,
    },
    observedPerformance: {
      ...baseBundle.observedPerformance,
      sample: {
        ...baseBundle.observedPerformance.sample,
        request_id: input.requestId,
        routing_decision_id: input.routingDecisionId,
        endpoint_id: "openai.personal.primary.us-east-1.fast",
        timestamp_ms: input.timestampMs,
        latency_ms: input.latencyMs,
        latency_ms_p95: input.latencyMs,
        source_type: "live_request",
        difficulty_bucket: "easy",
      },
      profile: {
        ...baseBundle.observedPerformance.profile,
        endpoint_id: "openai.personal.primary.us-east-1.fast",
        measured_at_ms: input.timestampMs,
      },
    },
    cacheObservability: {
      promptCacheRequested: true,
      promptCacheUsed: true,
      cacheReadTokens: input.cacheReadTokens,
      cacheWriteTokens: input.cacheWriteTokens,
      routingCacheAffinity: true,
    },
    executionTelemetry: {
      providerFamily: "ai-sdk-openai",
      finishReason: "stop",
      stream: {
        requested: true,
        textDeltas: 4,
        toolCallDeltas: 1,
        toolArgumentDeltas: 2,
      },
      streamSupport: {
        text: "delta",
        toolCalls: "delta",
        toolArguments: "delta",
      },
      promptCaching: {
        supported: true,
        mode: "provider-managed",
      },
      usageSupport: {
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: true,
        cacheWriteTokens: true,
      },
      costProvenance: "actual",
    },
    tooling: {
      ...baseBundle.tooling,
      toolCalls: [],
      executions: [],
    },
    telemetrySnapshot: {
      providerId: "openai",
      providerAccountId: "openai.personal",
      sourceType: "remote",
      endpointKind: "remote_api",
      servingSource: "remote-service",
      region: "us-east-1",
      lifecycleStateAtRequest: "active",
      healthStatusAtRequest: "healthy",
      requestedModelId: "mixed.local-remote",
      requestOperation: "chat",
      roleIds: ["coder.patch", "general.chat"],
      toolingUsed: false,
      cacheState: "hit",
      eligibleEndpointIds: [
        "openai.personal.primary.us-east-1.fast",
        "llama-swap.local.local-mock-llama",
      ],
      eligibleModelIds: ["openai/gpt-4.1-mini-fast", "local/mock-llama"],
      candidateCostSnapshot: {
        "openai.personal.primary.us-east-1.fast": {
          modelId: "openai/gpt-4.1-mini-fast",
          providerId: "openai",
          sourceType: "remote",
          estimatedRequestUsd: input.selectedUncachedCostUsd,
        },
        "llama-swap.local.local-mock-llama": {
          modelId: "local/mock-llama",
          providerId: "llama-swap",
          sourceType: "local",
          estimatedRequestUsd: input.baselineMaxEligibleCostUsd,
        },
      },
      selectedPricingSnapshot: {
        modelId: "openai/gpt-4.1-mini-fast",
        providerId: "openai",
        sourceType: "remote",
        estimatedRequestUsd: input.selectedUncachedCostUsd,
      },
      selectedUncachedCostUsd: input.selectedUncachedCostUsd,
      baselineMaxEligibleCostUsd: input.baselineMaxEligibleCostUsd,
      routingCostSavingsUsd: input.routingCostSavingsUsd,
      cacheCostSavingsUsd: input.cacheCostSavingsUsd,
      totalAvoidedCostUsd: input.totalAvoidedCostUsd,
      costBaselineSource: "eligible_candidate_max",
      costSavingsSupport: "full",
    },
    inspection: {
      ...baseBundle.inspection,
      request: {
        ...baseBundle.inspection.request,
        requestId: input.requestId,
        routingDecisionId: input.routingDecisionId,
        responseCapture: {
          ...baseBundle.inspection.request.responseCapture,
          statusCode: 200,
        },
      },
    },
  };
}

function buildUnsupportedLocalBundle() {
  return {
    ...baseBundle,
    requestId: "req-telemetry-analytics-local-001",
    routingDecisionId: "decision-telemetry-analytics-local-001",
    endpointId: "llama-swap.local.local-mock-llama",
    taxonomyDimensions: {
      taxonomy_group_id: "governance_safety",
      taxonomy_role_id: "security",
      taxonomy_task_type: "security.audit",
      taxonomy_task_variant: "deep",
      taxonomy_capability_ids: ["security.analysis"],
      taxonomy_modality_ids: ["text"],
      taxonomy_tool_class_ids: ["filesystem.read"],
    },
    usageEvent: {
      ...baseBundle.usageEvent,
      request_id: "req-telemetry-analytics-local-001",
      routing_decision_id: "decision-telemetry-analytics-local-001",
      endpoint_id: "llama-swap.local.local-mock-llama",
      model_id: "local/mock-llama",
      provider_kind: "local_openai_compat",
      tokens_in: 32,
      tokens_out: 0,
      latency_ms: 1200,
      cost_actual: undefined,
      cost_estimate: 0.0011,
      currency: "USD",
      error_class: "upstream_timeout",
      timestamp_ms: localTimestampMs,
    },
    observedPerformance: {
      ...baseBundle.observedPerformance,
      sample: {
        ...baseBundle.observedPerformance.sample,
        request_id: "req-telemetry-analytics-local-001",
        routing_decision_id: "decision-telemetry-analytics-local-001",
        endpoint_id: "llama-swap.local.local-mock-llama",
        timestamp_ms: localTimestampMs,
        latency_ms: 1200,
        latency_ms_p95: 1200,
        source_type: "live_request",
        failure: true,
        error_class: "upstream_timeout",
      },
      profile: {
        ...baseBundle.observedPerformance.profile,
        endpoint_id: "llama-swap.local.local-mock-llama",
        measured_at_ms: localTimestampMs,
      },
    },
    cacheObservability: {
      promptCacheRequested: false,
      promptCacheUsed: false,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      routingCacheAffinity: false,
    },
    executionTelemetry: {
      providerFamily: "llama-swap",
      finishReason: "error",
      stream: {
        requested: true,
        textDeltas: 2,
        toolCallDeltas: 0,
        toolArgumentDeltas: 0,
      },
      streamSupport: {
        text: "delta",
        toolCalls: "unsupported",
        toolArguments: "unsupported",
      },
      promptCaching: {
        supported: false,
        mode: "unsupported",
      },
      usageSupport: {
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: false,
        cacheWriteTokens: false,
      },
      costProvenance: "estimated",
    },
    tooling: {
      ...baseBundle.tooling,
      toolCalls: [],
      executions: [],
    },
    telemetrySnapshot: {
      providerId: "llama-swap",
      providerAccountId: null,
      sourceType: "local",
      endpointKind: "local_engine",
      servingSource: "local-process",
      region: "local",
      lifecycleStateAtRequest: "active",
      healthStatusAtRequest: "healthy",
      requestedModelId: "local/mock-llama",
      requestOperation: "chat",
      roleIds: ["general.chat"],
      toolingUsed: false,
      cacheState: "unsupported",
      eligibleEndpointIds: ["llama-swap.local.local-mock-llama"],
      eligibleModelIds: ["local/mock-llama"],
      candidateCostSnapshot: {
        "llama-swap.local.local-mock-llama": {
          modelId: "local/mock-llama",
          providerId: "llama-swap",
          sourceType: "local",
          estimatedRequestUsd: 0.0011,
        },
      },
      selectedPricingSnapshot: {
        modelId: "local/mock-llama",
        providerId: "llama-swap",
        sourceType: "local",
        estimatedRequestUsd: 0.0011,
      },
      selectedUncachedCostUsd: 0.0011,
      baselineMaxEligibleCostUsd: 0.0011,
      routingCostSavingsUsd: 0,
      cacheCostSavingsUsd: 0,
      totalAvoidedCostUsd: 0,
      costBaselineSource: "selected_only",
      costSavingsSupport: "partial",
    },
    inspection: {
      ...baseBundle.inspection,
      request: {
        ...baseBundle.inspection.request,
        requestId: "req-telemetry-analytics-local-001",
        routingDecisionId: "decision-telemetry-analytics-local-001",
        responseCapture: {
          ...baseBundle.inspection.request.responseCapture,
          statusCode: 504,
        },
      },
    },
  };
}

persistRuntimeObservationBundle({
  databasePath,
  observation: buildRemoteBundle({
    requestId: "req-telemetry-analytics-remote-001",
    routingDecisionId: "decision-telemetry-analytics-remote-001",
    timestampMs: firstRemoteTimestampMs,
    inputTokens: 120,
    outputTokens: 48,
    latencyMs: 840,
    cacheReadTokens: 16,
    cacheWriteTokens: 8,
    actualCostUsd: 0.0042,
    estimatedCostUsd: 0.0042,
    selectedUncachedCostUsd: 0.0062,
    baselineMaxEligibleCostUsd: 0.0116,
    routingCostSavingsUsd: 0.0054,
    cacheCostSavingsUsd: 0.002,
    totalAvoidedCostUsd: 0.0074,
  }),
});

persistRuntimeObservationBundle({
  databasePath,
  observation: buildRemoteBundle({
    requestId: "req-telemetry-analytics-remote-002",
    routingDecisionId: "decision-telemetry-analytics-remote-002",
    timestampMs: secondRemoteTimestampMs,
    inputTokens: 240,
    outputTokens: 96,
    latencyMs: 620,
    cacheReadTokens: 32,
    cacheWriteTokens: 16,
    actualCostUsd: 0.0084,
    estimatedCostUsd: 0.0084,
    selectedUncachedCostUsd: 0.0124,
    baselineMaxEligibleCostUsd: 0.0232,
    routingCostSavingsUsd: 0.0108,
    cacheCostSavingsUsd: 0.004,
    totalAvoidedCostUsd: 0.0148,
  }),
});

persistRuntimeObservationBundle({
  databasePath,
  observation: buildUnsupportedLocalBundle(),
});

console.log(
  JSON.stringify(
    {
      scopeId,
      runtimeStateRoot,
      databasePath,
      firstRemoteTimestampMs,
      secondRemoteTimestampMs,
      localTimestampMs,
      expectedCacheHitTokenRate: 0.133333,
      expectedCacheBackedRequestRate: 0.666667,
    },
    null,
    2,
  ),
);
