import path from "node:path";
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

const missTimestampMs = Date.now() - 12 * 60 * 60 * 1000;

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

persistRuntimeObservationBundle({
  databasePath,
  observation: {
    ...baseBundle,
    requestId: "req-telemetry-analytics-remote-supported-zero-001",
    routingDecisionId: "decision-telemetry-analytics-remote-supported-zero-001",
    endpointId: "openai.personal.primary.us-east-1.fast",
    taxonomyDimensions: {
      taxonomy_group_id: "engineering",
      taxonomy_role_id: "coder",
      taxonomy_task_type: "coder.review",
      taxonomy_task_variant: "maintainability",
      taxonomy_capability_ids: ["code.read"],
      taxonomy_modality_ids: ["text"],
      taxonomy_tool_class_ids: ["filesystem.read"],
    },
    usageEvent: {
      ...baseBundle.usageEvent,
      request_id: "req-telemetry-analytics-remote-supported-zero-001",
      routing_decision_id: "decision-telemetry-analytics-remote-supported-zero-001",
      endpoint_id: "openai.personal.primary.us-east-1.fast",
      model_id: "openai/gpt-4.1-mini-fast",
      provider_kind: "remote_openai_compat",
      tokens_in: 96,
      tokens_out: 24,
      latency_ms: 510,
      cost_actual: 0.0038,
      cost_estimate: 0.0038,
      currency: "USD",
      timestamp_ms: missTimestampMs,
    },
    observedPerformance: {
      ...baseBundle.observedPerformance,
      sample: {
        ...baseBundle.observedPerformance.sample,
        request_id: "req-telemetry-analytics-remote-supported-zero-001",
        routing_decision_id: "decision-telemetry-analytics-remote-supported-zero-001",
        endpoint_id: "openai.personal.primary.us-east-1.fast",
        timestamp_ms: missTimestampMs,
        latency_ms: 510,
        latency_ms_p95: 510,
        source_type: "live_request",
        difficulty_bucket: "easy",
      },
      profile: {
        ...baseBundle.observedPerformance.profile,
        endpoint_id: "openai.personal.primary.us-east-1.fast",
        measured_at_ms: missTimestampMs,
      },
    },
    cacheObservability: {
      promptCacheRequested: true,
      promptCacheUsed: false,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      routingCacheAffinity: true,
    },
    executionTelemetry: {
      providerFamily: "ai-sdk-openai",
      finishReason: "stop",
      stream: {
        requested: true,
        textDeltas: 3,
        toolCallDeltas: 0,
        toolArgumentDeltas: 0,
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
      roleIds: ["coder.review", "general.chat"],
      toolingUsed: false,
      cacheState: "miss",
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
          estimatedRequestUsd: 0.0058,
        },
        "llama-swap.local.local-mock-llama": {
          modelId: "local/mock-llama",
          providerId: "llama-swap",
          sourceType: "local",
          estimatedRequestUsd: 0.0098,
        },
      },
      selectedPricingSnapshot: {
        modelId: "openai/gpt-4.1-mini-fast",
        providerId: "openai",
        sourceType: "remote",
        estimatedRequestUsd: 0.0058,
      },
      selectedUncachedCostUsd: 0.0058,
      baselineMaxEligibleCostUsd: 0.0098,
      routingCostSavingsUsd: 0.004,
      cacheCostSavingsUsd: 0,
      totalAvoidedCostUsd: 0.004,
      costBaselineSource: "eligible_candidate_max",
      costSavingsSupport: "full",
    },
    inspection: {
      ...baseBundle.inspection,
      request: {
        ...baseBundle.inspection.request,
        requestId: "req-telemetry-analytics-remote-supported-zero-001",
        routingDecisionId: "decision-telemetry-analytics-remote-supported-zero-001",
        responseCapture: {
          ...baseBundle.inspection.request.responseCapture,
          statusCode: 200,
        },
      },
    },
  },
});

console.log(
  JSON.stringify(
    {
      scopeId,
      databasePath,
      missTimestampMs,
      expectedCacheHitTokens: 0,
      expectedCacheHitTokenRate: 0,
      expectedCacheBackedRequestRate: 0,
    },
    null,
    2,
  ),
);
