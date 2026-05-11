import type { ObservedPerformanceProfile } from "@role-model/protocol-types";
import type { RoutedExecutionResult } from "@role-model-router/adapter-execution";
import {
  aggregateObservedPerformanceSamples,
  type ObservedPerformanceSample,
} from "@role-model-router/profile-aggregator";
import type { ToolRegistryExecution } from "@role-model-router/tool-registry";

export interface RuntimeRoutingDiagnostics {
  readonly retrievalReceiptId?: string;
  readonly aliasResolution?: {
    readonly requestedModel: string;
    readonly aliasId: string;
    readonly resolvedModelIds: readonly string[];
    readonly allowEndpoints: readonly string[];
  };
  readonly difficultyRouting?: {
    readonly difficulty: "easy" | "medium" | "hard";
    readonly strategy: string;
    readonly fallbackApplied: boolean;
    readonly cacheHit?: boolean;
    readonly cacheInvalidated?: boolean;
    readonly cacheInvalidationReasons?: readonly string[];
    readonly fallbackReason?: string;
    readonly excludedEndpointIds?: readonly string[];
    readonly overrideAppliedEndpointIds?: readonly string[];
    readonly overrideRecommendedMaxDifficultyByEndpointId?: Record<string, "easy" | "medium" | "hard">;
    readonly rubricSignals: {
      readonly contextTokens: number;
      readonly toolCount: number;
      readonly historyTurnCount: number;
      readonly instructionConstraintCount: number;
      readonly decompositionKeywordCount: number;
      readonly codeOrSchemaBurden: boolean;
    };
  };
  readonly observedProfile?: {
    readonly endpointId: string;
    readonly source: "runtime-state" | "none";
    readonly readMode: "per-request";
    readonly measuredAtMs?: number;
    readonly difficultyBucket?: "easy" | "medium" | "hard";
    readonly bucketOverrideApplied?: boolean;
  };
  readonly effectiveMetrics?: {
    readonly quality?: {
      readonly value: number;
      readonly source: string;
      readonly measuredAtMs?: number;
      readonly freshnessWeight?: number;
    };
    readonly latency?: {
      readonly value: number;
      readonly source: string;
      readonly measuredAtMs?: number;
      readonly freshnessWeight?: number;
    };
    readonly throughput?: {
      readonly value: number;
      readonly source: string;
      readonly measuredAtMs?: number;
      readonly freshnessWeight?: number;
    };
    readonly reliability?: {
      readonly value: number;
      readonly source: string;
      readonly measuredAtMs?: number;
      readonly freshnessWeight?: number;
    };
    readonly cost?: {
      readonly value: number;
      readonly source: string;
      readonly measuredAtMs?: number;
      readonly freshnessWeight?: number;
    };
  };
  readonly throughputPenalty?: {
    readonly endpointId: string;
    readonly active: boolean;
    readonly penaltyFactor?: number;
    readonly activatedAtMs?: number;
    readonly expiresAtMs?: number;
    readonly minTokensPerSec?: number;
    readonly lastObservedTokensPerSec?: number;
  };
  readonly routingModel?: {
    readonly enabled: boolean;
    readonly endpointId?: string | null;
    readonly preferredEndpointIds?: readonly string[];
    readonly ignoredEndpointIds?: readonly string[];
  };
}

export interface RuntimeRetrievalReceiptSummary {
  readonly selectedTurns: number;
  readonly selectedArtifacts: number;
  readonly omittedTurns: number;
  readonly omittedArtifacts: number;
  readonly estimatedTokens: number;
}

export interface RuntimeRetrievalReceipt {
  readonly receiptId: string;
  readonly summary: RuntimeRetrievalReceiptSummary;
}

export interface RuntimeContextEnvelopeSummary {
  readonly conversationId: string;
  readonly latestHandoffId: string | null;
  readonly estimatedTokenCount: number;
}

export interface RuntimeCapturePolicy {
  readonly environment?: string;
  readonly rawCapture?: {
    readonly requestHeaders?: string;
    readonly requestBody?: string;
    readonly responseBody?: string;
  };
  readonly structuredInspection?: {
    readonly mode?: string;
    readonly redactHeaders?: readonly string[];
  };
  readonly operatorSurface?: {
    readonly preserveRawCaptures?: boolean;
  };
}

export interface RuntimeAccountState {
  readonly providerAccountId: string | null;
  readonly status: string;
  readonly healthStatus: string;
  readonly rotationState: string;
}

export interface RuntimeDiagnostic {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
}

export interface RuntimeObservationBundleInput {
  readonly decision: {
    readonly request_id: string;
    readonly routing_decision_id: string;
    readonly chosen_endpoint_id: string;
    readonly app_id: string;
    readonly org_id?: string | null;
  };
  readonly routingDiagnostics?: RuntimeRoutingDiagnostics;
  readonly retrievalReceipt: RuntimeRetrievalReceipt;
  readonly contextEnvelope: RuntimeContextEnvelopeSummary;
  readonly execution: RoutedExecutionResult;
  readonly priorSamples?: readonly ObservedPerformanceSample[];
  readonly maintenancePolicy?: Readonly<Record<string, string>>;
  readonly capturePolicy?: RuntimeCapturePolicy;
  readonly accountState?: RuntimeAccountState;
  readonly tooling?: {
    readonly executions: readonly ToolRegistryExecution[];
  };
}

export interface RedactedCaptureBody {
  readonly suppressed: true;
  readonly reason: string;
}

export interface RuntimeObservationCapturePolicyReceipt {
  readonly environment: string;
  readonly redactionLevel: string;
  readonly retentionClass: string;
  readonly structuredInspectionMode: string;
  readonly rawCaptureAvailable: boolean;
  readonly structuredInspectionAvailable: true;
  readonly redactedFields: readonly string[];
  readonly suppressedFields: readonly string[];
}

export interface RuntimeObservationBundle {
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly endpointId: string;
  readonly conversationId: string;
  readonly decision: RuntimeObservationBundleInput["decision"];
  readonly routingDiagnostics: RuntimeRoutingDiagnostics;
  readonly retrievalReceipt: RuntimeRetrievalReceipt;
  readonly contextEnvelope: RuntimeContextEnvelopeSummary;
  readonly trace: RoutedExecutionResult["trace"];
  readonly usageEvent: RoutedExecutionResult["usageEvent"];
  readonly observedPerformance: {
    readonly endpointVersion: string;
    readonly sample: ObservedPerformanceSample;
    readonly history: readonly ObservedPerformanceSample[];
    readonly profile: ObservedPerformanceProfile;
  };
  readonly diagnostics: {
    readonly routing: readonly RuntimeDiagnostic[];
    readonly execution: readonly RuntimeDiagnostic[];
    readonly authAccount: readonly RuntimeDiagnostic[];
    readonly memoryQuality: readonly RuntimeDiagnostic[];
    readonly tooling: readonly RuntimeDiagnostic[];
    readonly operator: readonly RuntimeDiagnostic[];
  };
  readonly capturePolicy: RuntimeObservationCapturePolicyReceipt;
  readonly executionTelemetry: {
    readonly providerFamily: string;
    readonly finishReason: string;
    readonly stream: {
      readonly requested: boolean;
      readonly textDeltas: number;
      readonly toolCallDeltas: number;
      readonly toolArgumentDeltas: number;
    };
    readonly streamSupport: RoutedExecutionResult["capabilities"]["streaming"];
    readonly promptCaching: RoutedExecutionResult["capabilities"]["promptCaching"];
    readonly usageSupport: RoutedExecutionResult["capabilities"]["usage"];
    readonly costProvenance: "actual" | "estimated" | "unavailable";
  };
  readonly cacheObservability: {
    readonly promptCacheRequested: boolean;
    readonly promptCacheUsed: boolean;
    readonly cacheReadTokens: number;
    readonly cacheWriteTokens: number;
    readonly routingCacheAffinity: boolean;
  };
  readonly tooling: {
    readonly toolCalls: ReadonlyArray<{
      readonly toolCallId: string;
      readonly toolName: string;
      readonly arguments: unknown;
      readonly providerToolId?: string;
    }>;
    readonly executions: readonly ToolRegistryExecution[];
    readonly diagnostics: readonly RuntimeDiagnostic[];
  };
  readonly inspection: {
    readonly request: {
      readonly requestId: string;
      readonly routingDecisionId: string;
      readonly requestCapture: {
        readonly headers: Record<string, string>;
        readonly body: Record<string, unknown> | RedactedCaptureBody;
      };
      readonly responseCapture: {
        readonly statusCode: number;
        readonly body: unknown;
      };
      readonly diagnostics: RuntimeObservationBundle["diagnostics"];
      readonly capturePolicy: RuntimeObservationCapturePolicyReceipt;
    };
    readonly endpoint: {
      readonly endpointId: string;
      readonly endpointVersion: string;
      readonly latestProfile: ObservedPerformanceProfile;
      readonly recentSamples: readonly ObservedPerformanceSample[];
    };
  };
}

function deriveEndpointVersion(execution: RoutedExecutionResult): string {
  const identity = execution.target.candidate.identity as {
    endpoint_version?: string;
    runtime_version?: string;
    variant_id?: string;
  };
  return (
    identity.endpoint_version ??
    `${identity.runtime_version ?? "unknown"}:${identity.variant_id ?? "default"}`
  );
}

function buildObservedPerformanceSample(
  input: RuntimeObservationBundleInput,
  endpointVersion: string,
): ObservedPerformanceSample {
  return {
    endpoint_id: input.decision.chosen_endpoint_id,
    endpoint_version: endpointVersion,
    source_type: "live_request",
    ...(input.routingDiagnostics?.difficultyRouting?.difficulty
      ? { difficulty_bucket: input.routingDiagnostics.difficultyRouting.difficulty }
      : {}),
    timestamp_ms: input.execution.usageEvent.timestamp_ms,
    latency_ms: input.execution.normalized.latencyMs,
    latency_ms_p95: input.execution.normalized.latencyMs,
    tokens_per_sec:
      input.execution.normalized.usage.outputTokens > 0 && input.execution.normalized.latencyMs > 0
        ? Math.round(
            (input.execution.normalized.usage.outputTokens / input.execution.normalized.latencyMs) * 1000,
          )
        : undefined,
    cost_per_1k_tokens_est: input.execution.usageEvent.cost_estimate,
    failure: Boolean(input.execution.normalized.errorClass),
    error_class: input.execution.normalized.errorClass ?? undefined,
    request_id: input.decision.request_id,
    routing_decision_id: input.decision.routing_decision_id,
  };
}

function toUpperSnake(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

function buildRoutingDiagnostics(input: RuntimeObservationBundleInput): RuntimeDiagnostic[] {
  const diagnostics: RuntimeDiagnostic[] = [];
  if (input.routingDiagnostics?.routingModel?.enabled) {
    diagnostics.push({
      code: "ROUTING_MODEL_ENABLED",
      severity: "info",
      message: `Routing-model guidance remained enabled for request ${input.decision.request_id}.`,
    });
  }
  if (input.routingDiagnostics?.retrievalReceiptId) {
    diagnostics.push({
      code: "ROUTING_RETRIEVAL_RECEIPT_LINKED",
      severity: "info",
      message: `Routing diagnostics link request ${input.decision.request_id} to retrieval receipt ${input.routingDiagnostics.retrievalReceiptId}.`,
    });
  }
  return diagnostics;
}

function buildExecutionDiagnostics(input: RuntimeObservationBundleInput): RuntimeDiagnostic[] {
  const diagnostics = input.execution.diagnostics.map<RuntimeDiagnostic>((diagnostic) => ({
    code: diagnostic.code,
    severity: "warning",
    message: diagnostic.message,
  }));
  if (input.execution.normalized.errorClass) {
    diagnostics.push({
      code: `EXECUTION_${toUpperSnake(input.execution.normalized.errorClass)}`,
      severity: "error",
      message: `Execution completed with error class ${input.execution.normalized.errorClass}.`,
    });
  }
  return diagnostics;
}

function buildAuthAccountDiagnostics(accountState?: RuntimeAccountState): RuntimeDiagnostic[] {
  if (!accountState) {
    return [];
  }

  const diagnostics: RuntimeDiagnostic[] = [];
  if (accountState.status !== "active") {
    diagnostics.push({
      code: `AUTH_ACCOUNT_STATUS_${toUpperSnake(accountState.status)}`,
      severity: "error",
      message: `Provider account ${accountState.providerAccountId ?? "unknown"} is ${accountState.status}.`,
    });
  }
  if (accountState.healthStatus !== "healthy") {
    diagnostics.push({
      code: `AUTH_ACCOUNT_${toUpperSnake(accountState.healthStatus)}`,
      severity: "error",
      message: `Provider account ${accountState.providerAccountId ?? "unknown"} reports health status ${accountState.healthStatus}.`,
    });
  }
  if (accountState.rotationState === "failed") {
    diagnostics.push({
      code: "AUTH_ACCOUNT_ROTATION_FAILED",
      severity: "warning",
      message: `Provider account ${accountState.providerAccountId ?? "unknown"} has a failed credential rotation state.`,
    });
  }
  return diagnostics;
}

function buildMemoryDiagnostics(input: RuntimeObservationBundleInput): RuntimeDiagnostic[] {
  const diagnostics: RuntimeDiagnostic[] = [];
  if (
    input.retrievalReceipt.summary.omittedTurns > 0 ||
    input.retrievalReceipt.summary.omittedArtifacts > 0
  ) {
    diagnostics.push({
      code: "MEMORY_CONTEXT_OMITTED",
      severity: "warning",
      message: `Context assembly omitted ${input.retrievalReceipt.summary.omittedTurns} turns and ${input.retrievalReceipt.summary.omittedArtifacts} artifacts.`,
    });
  }
  if (input.contextEnvelope.latestHandoffId) {
    diagnostics.push({
      code: "MEMORY_LATEST_HANDOFF_LINKED",
      severity: "info",
      message: `Context inspection preserves latest handoff ${input.contextEnvelope.latestHandoffId}.`,
    });
  }
  return diagnostics;
}

function buildToolingDiagnostics(input: RuntimeObservationBundleInput): RuntimeDiagnostic[] {
  const diagnostics = (input.tooling?.executions ?? []).flatMap((execution) =>
    execution.diagnostics.map<RuntimeDiagnostic>((diagnostic) => ({
      code: diagnostic.code,
      severity: execution.status === "failed" ? "error" : "warning",
      message: diagnostic.message,
    })),
  );
  if (input.execution.normalized.toolCalls.length > 0 && (input.tooling?.executions.length ?? 0) === 0) {
    diagnostics.push({
      code: "TOOL_EXECUTION_MISSING",
      severity: "warning",
      message: `Runtime observation captured ${input.execution.normalized.toolCalls.length} tool calls without execution receipts.`,
    });
  }
  return diagnostics;
}

function buildTooling(
  input: RuntimeObservationBundleInput,
  diagnostics: readonly RuntimeDiagnostic[],
): RuntimeObservationBundle["tooling"] {
  return {
    toolCalls: input.execution.normalized.toolCalls.map((toolCall, index) => ({
      toolCallId: toolCall.providerToolId ?? `${toolCall.name}-${index + 1}`,
      toolName: toolCall.name,
      arguments: toolCall.arguments,
      ...(toolCall.providerToolId ? { providerToolId: toolCall.providerToolId } : {}),
    })),
    executions: input.tooling?.executions ?? [],
    diagnostics,
  };
}

function buildCapturePolicyReceipt(
  maintenancePolicy: Readonly<Record<string, string>> | undefined,
  capturePolicy: RuntimeCapturePolicy | undefined,
): RuntimeObservationCapturePolicyReceipt {
  const redactedFields: string[] = [];
  const suppressedFields: string[] = [];

  if (capturePolicy?.rawCapture?.requestHeaders === "redact-secrets") {
    redactedFields.push("request.headers.authorization");
  }
  if (capturePolicy?.rawCapture?.requestBody === "disabled") {
    suppressedFields.push("request.body");
  }
  if (capturePolicy?.rawCapture?.responseBody === "disabled") {
    suppressedFields.push("response.body");
  }

  return {
    environment: capturePolicy?.environment ?? "local-dev",
    redactionLevel: maintenancePolicy?.["redaction.level"] ?? "strict",
    retentionClass: maintenancePolicy?.["retention.class"] ?? "standard",
    structuredInspectionMode: capturePolicy?.structuredInspection?.mode ?? "redacted",
    rawCaptureAvailable: capturePolicy?.operatorSurface?.preserveRawCaptures !== false,
    structuredInspectionAvailable: true,
    redactedFields,
    suppressedFields,
  };
}

function cloneHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers));
}

function redactRequestCapture(
  input: RuntimeObservationBundleInput,
  capturePolicy: RuntimeObservationCapturePolicyReceipt,
): {
  readonly headers: Record<string, string>;
  readonly body: Record<string, unknown> | RedactedCaptureBody;
} {
  const headers = cloneHeaders(input.execution.requestCapture.headers);
  if (capturePolicy.redactedFields.includes("request.headers.authorization") && headers.authorization) {
    headers.authorization = "[redacted]";
  }

  return {
    headers,
    body: capturePolicy.suppressedFields.includes("request.body")
      ? {
          suppressed: true,
          reason: "policy.rawCapture.requestBody.disabled",
        }
      : input.execution.requestCapture.body,
  };
}

function redactResponseCapture(
  input: RuntimeObservationBundleInput,
  capturePolicy: RuntimeObservationCapturePolicyReceipt,
): {
  readonly statusCode: number;
  readonly body: unknown;
} {
  return {
    statusCode: input.execution.responseCapture.statusCode,
    body: capturePolicy.suppressedFields.includes("response.body")
      ? {
          suppressed: true,
          reason: "policy.rawCapture.responseBody.disabled",
        }
      : input.execution.responseCapture.body,
  };
}

function buildOperatorDiagnostics(
  capturePolicy: RuntimeObservationCapturePolicyReceipt,
): RuntimeDiagnostic[] {
  return [
    {
      code: capturePolicy.rawCaptureAvailable ? "OPERATOR_RAW_CAPTURE_AVAILABLE" : "OPERATOR_RAW_CAPTURE_DISABLED",
      severity: "info",
      message: capturePolicy.rawCaptureAvailable
        ? "Raw operator captures remain available through the preserved host capture surface."
        : "Raw operator captures are disabled for this inspection policy.",
    },
  ];
}

function deriveCostProvenance(
  usageEvent: RoutedExecutionResult["usageEvent"],
): RuntimeObservationBundle["executionTelemetry"]["costProvenance"] {
  if (typeof usageEvent.cost_actual === "number") {
    return "actual";
  }
  if (typeof usageEvent.cost_estimate === "number") {
    return "estimated";
  }
  return "unavailable";
}

export function createRuntimeObservationBundle(
  input: RuntimeObservationBundleInput,
): RuntimeObservationBundle {
  const endpointVersion = deriveEndpointVersion(input.execution);
  const currentSample = buildObservedPerformanceSample(input, endpointVersion);
  const priorSamples = (input.priorSamples ?? []).filter(
    (sample) =>
      sample.endpoint_id === input.decision.chosen_endpoint_id &&
      sample.endpoint_version === endpointVersion,
  );
  const history = [...priorSamples, currentSample];
  const profile = aggregateObservedPerformanceSamples(history, {
    nowMs: currentSample.timestamp_ms,
  });
  const capturePolicy = buildCapturePolicyReceipt(input.maintenancePolicy, input.capturePolicy);
  const diagnostics = {
    routing: buildRoutingDiagnostics(input),
    execution: buildExecutionDiagnostics(input),
    authAccount: buildAuthAccountDiagnostics(input.accountState),
    memoryQuality: buildMemoryDiagnostics(input),
    tooling: buildToolingDiagnostics(input),
    operator: buildOperatorDiagnostics(capturePolicy),
  } as const;
  const tooling = buildTooling(input, diagnostics.tooling);

  return {
    requestId: input.decision.request_id,
    routingDecisionId: input.decision.routing_decision_id,
    endpointId: input.decision.chosen_endpoint_id,
    conversationId: input.contextEnvelope.conversationId,
    decision: input.decision,
    routingDiagnostics: input.routingDiagnostics ?? {},
    retrievalReceipt: input.retrievalReceipt,
    contextEnvelope: input.contextEnvelope,
    trace: input.execution.trace,
    usageEvent: input.execution.usageEvent,
    observedPerformance: {
      endpointVersion,
      sample: currentSample,
      history,
      profile,
    },
    diagnostics,
    capturePolicy,
    executionTelemetry: {
      providerFamily: input.execution.normalized.providerFamily,
      finishReason: input.execution.normalized.finishReason,
      stream: {
        requested: input.execution.normalized.stream.requested,
        textDeltas: input.execution.normalized.stream.textDeltas,
        toolCallDeltas: input.execution.normalized.stream.toolCallDeltas,
        toolArgumentDeltas: input.execution.normalized.stream.toolArgumentDeltas,
      },
      streamSupport: input.execution.capabilities.streaming,
      promptCaching: input.execution.capabilities.promptCaching,
      usageSupport: input.execution.capabilities.usage,
      costProvenance: deriveCostProvenance(input.execution.usageEvent),
    },
    cacheObservability: {
      promptCacheRequested: input.execution.normalized.promptCache.requested,
      promptCacheUsed: input.execution.normalized.promptCache.used,
      cacheReadTokens: input.execution.normalized.promptCache.readTokens,
      cacheWriteTokens: input.execution.normalized.promptCache.writeTokens,
      routingCacheAffinity:
        input.execution.normalized.promptCache.requested &&
        Boolean(input.routingDiagnostics?.routingModel?.enabled),
    },
    tooling,
    inspection: {
      request: {
        requestId: input.decision.request_id,
        routingDecisionId: input.decision.routing_decision_id,
        requestCapture: redactRequestCapture(input, capturePolicy),
        responseCapture: redactResponseCapture(input, capturePolicy),
        diagnostics,
        capturePolicy,
      },
      endpoint: {
        endpointId: input.decision.chosen_endpoint_id,
        endpointVersion,
        latestProfile: profile,
        recentSamples: history,
      },
    },
  };
}
