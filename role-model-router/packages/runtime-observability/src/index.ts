import type { RoutedExecutionResult } from "@role-model-router/adapter-execution";
import {
  type ObservedPerformanceSample,
  aggregateOperationalPerformanceSamples,
} from "@role-model-router/profile-aggregator";
import type { ToolRegistryExecution } from "@role-model-router/tool-registry";
import type { ObservedPerformanceProfile } from "@role-model/protocol-types";
import { extractTaxonomyDimensions } from "@role-model/protocol-types";

export type RuntimeRoutingMode = "baseline" | "difficulty" | "controller" | "hybrid";

export interface RuntimeRoutingDiagnostics {
  readonly retrievalReceiptId?: string;
  readonly aliasResolution?: {
    readonly requestedModel: string;
    readonly aliasId: string;
    readonly resolvedModelIds: readonly string[];
    readonly allowEndpoints: readonly string[];
    readonly poolEmptyReason?: "ALIAS_POOL_EMPTY";
    readonly driftWarnings?: readonly {
      readonly aliasId: string;
      readonly hintModelId: string;
      readonly suggestedModelIds: readonly string[];
      readonly message: string;
    }[];
  };
  readonly capabilityEligibility?: {
    readonly requiredInputModalities: readonly string[];
    readonly requiredOutputModalities: readonly string[];
    readonly requiredCapabilities: readonly string[];
    readonly advisoryCapabilities: readonly string[];
    readonly includedEndpoints: readonly string[];
    readonly excludedTargets: readonly {
      readonly endpointId: string;
      readonly modelId: string;
      readonly reasons: readonly string[];
    }[];
  };
  readonly roleModelIntent?: {
    readonly diagnostics: readonly {
      readonly code: string;
      readonly severity: "info" | "warning" | "error";
      readonly field: string;
      readonly id: string;
      readonly message: string;
    }[];
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
    readonly overrideRecommendedMaxDifficultyByEndpointId?: Record<
      string,
      "easy" | "medium" | "hard"
    >;
    readonly rubricSignals: {
      readonly contextTokens: number;
      readonly toolCount: number;
      readonly historyTurnCount: number;
      readonly instructionConstraintCount: number;
      readonly decompositionKeywordCount: number;
      readonly codeOrSchemaBurden: boolean;
    };
  };
  readonly controllerRouting?: {
    readonly active: boolean;
    readonly fallbackApplied?: boolean;
    readonly fallbackReason?: string;
    readonly acceptedDirectives?: {
      readonly requestedRoleId?: string;
      readonly taskType?: string;
      readonly requiredCapabilities?: readonly string[];
      readonly preferredCapabilities?: readonly string[];
      readonly strategy?: string;
      readonly preferLocal?: boolean;
      readonly preferredEndpointIds?: readonly string[];
    };
  };
  readonly hybridArbitration?: {
    readonly active: boolean;
    readonly difficultyStrategy: string;
    readonly finalStrategy: string;
    readonly controllerChangedPlan: boolean;
    readonly dominantSignal: "difficulty" | "controller" | "aligned";
    readonly preferredEndpointIds?: readonly string[];
  };
  readonly routingMode?: {
    readonly source: "request-override" | "alias-default" | "runtime-config";
    readonly requestedOverride?: RuntimeRoutingMode;
    readonly aliasMode?: RuntimeRoutingMode;
    readonly effectiveMode: RuntimeRoutingMode;
  };
  readonly rolePolicy?: {
    readonly requestedRoleId: string;
    readonly appliedRoleId: string;
    readonly defaultSystemInstructionsApplied: boolean;
    readonly toolPolicyMode: "allowed" | "limited" | "disabled";
    readonly allowedTools?: readonly string[];
    readonly outputContracts: readonly string[];
    readonly safetyPolicyRefs: readonly string[];
  };
  readonly rewrite?: {
    readonly requestedModel: string;
    readonly downstreamModelId: string;
    readonly applied: boolean;
    readonly reason:
      | "requested-model-matches-downstream"
      | "requested-model-rewritten-for-selected-endpoint";
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
      readonly freshnessSource?: string;
      readonly timeDecayApplied?: boolean;
    };
    readonly latency?: {
      readonly value: number;
      readonly source: string;
      readonly measuredAtMs?: number;
      readonly freshnessWeight?: number;
      readonly freshnessSource?: string;
      readonly timeDecayApplied?: boolean;
    };
    readonly throughput?: {
      readonly value: number;
      readonly source: string;
      readonly measuredAtMs?: number;
      readonly freshnessWeight?: number;
      readonly freshnessSource?: string;
      readonly timeDecayApplied?: boolean;
    };
    readonly reliability?: {
      readonly value: number;
      readonly source: string;
      readonly measuredAtMs?: number;
      readonly freshnessWeight?: number;
      readonly freshnessSource?: string;
      readonly timeDecayApplied?: boolean;
    };
    readonly cost?: {
      readonly value: number;
      readonly source: string;
      readonly measuredAtMs?: number;
      readonly freshnessWeight?: number;
      readonly freshnessSource?: string;
      readonly timeDecayApplied?: boolean;
    };
  };
  readonly selection?: {
    readonly mode: "best-total-score" | "tie-break";
    readonly scoreTieEpsilon: number;
    readonly scoreDelta?: number;
    readonly winnerEndpointId: string;
    readonly winnerTotalScore: number;
    readonly runnerUpEndpointId?: string;
    readonly runnerUpTotalScore?: number;
    readonly tieBreakOrder?: readonly string[];
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
  readonly catalogEconomics?: {
    readonly canonicalModelId: string;
    readonly tokenEconomicsSource: "catalog" | "local-free" | "unknown";
    readonly inputPer1M: number | null;
    readonly outputPer1M: number | null;
    readonly estimatedRequestUsd: number | null;
    readonly cost_per_1k_tokens_est: number | null;
  };
  readonly routingModel?: {
    readonly enabled: boolean;
    readonly endpointId?: string | null;
    readonly preferredEndpointIds?: readonly string[];
    readonly ignoredEndpointIds?: readonly string[];
  };
  readonly cacheContinuity?: {
    readonly enabled?: boolean;
    readonly scopeSource?: "session_affinity" | "prompt_cache_key";
    readonly activeEndpointId?: string | null;
    readonly warmedEndpointIds?: readonly string[];
    readonly advisoryWarmedEndpointIds?: readonly string[];
    readonly previousActiveEndpointId?: string | null;
    readonly selectedEndpointId?: string;
    readonly selectedDomainState?: "created" | "restored";
    readonly advisorySelectionApplied?: boolean;
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

export interface RuntimeTelemetrySnapshot {
  readonly providerId: string | null;
  readonly providerAccountId: string | null;
  readonly sourceType: "local" | "remote";
  readonly endpointKind: string;
  readonly servingSource: string;
  readonly region: string | null;
  readonly lifecycleStateAtRequest: string;
  readonly healthStatusAtRequest: string | null;
  readonly requestedModelId: string | null;
  readonly selectedModelId?: string | null;
  readonly requestOperation: string;
  readonly roleIds: readonly string[];
  readonly toolingUsed: boolean;
  readonly cacheState: string;
  readonly eligibleEndpointIds: readonly string[];
  readonly eligibleModelIds: readonly string[];
  readonly candidateCostSnapshot: Record<string, unknown>;
  readonly selectedPricingSnapshot: Record<string, unknown> | null;
  readonly selectedUncachedCostUsd: number | null;
  readonly baselineMaxEligibleCostUsd: number | null;
  readonly routingCostSavingsUsd: number;
  readonly cacheCostSavingsUsd: number;
  readonly totalAvoidedCostUsd: number;
  readonly costBaselineSource: string | null;
  readonly costSavingsSupport: string | null;
  readonly dimensions?: Record<string, unknown>;
}

export interface RuntimeExecutionFailedAttemptReceipt {
  readonly attemptId: string;
  readonly routedAttemptId?: string;
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly failedEndpointId: string;
  readonly providerId: string;
  readonly providerFamily: string;
  readonly vendorId?: string;
  readonly executionFamily: string;
  readonly adapterFamily: string;
  readonly statusCode: number;
  readonly failureClass: string;
  readonly retryable: boolean;
  readonly fallbackEligible: boolean;
  readonly failurePhase: string;
  readonly cooldownRecorded: boolean;
  readonly cooldownFailureCount?: number;
  readonly cooldownUntilMs?: number;
  readonly errorPreview?: Readonly<Record<string, unknown>>;
}

export interface RuntimeExecutionCooldownReceipt {
  readonly schemaVersion?: 2;
  readonly endpointId: string;
  readonly active: boolean;
  readonly failureCount: number;
  readonly cooldownUntilMs?: number;
  readonly circuitState?: "probation" | "open" | "half_open" | "blocked_auth" | "blocked_quota";
  readonly failureCategory?:
    | "connection"
    | "timeout"
    | "provider_5xx"
    | "rate_limit"
    | "auth"
    | "quota";
  readonly sequenceStartedAtMs?: number;
  readonly nextProbeAtMs?: number;
  readonly retryAfterMs?: number;
  readonly probeStartedAtMs?: number;
  readonly lastFailureAtMs?: number;
  readonly lastErrorClass: string;
  readonly sourceAttemptId?: string;
  readonly sourceRequestId?: string;
  readonly sourceRoutingDecisionId?: string;
  readonly errorPreview?: Readonly<Record<string, unknown>>;
}

export interface RuntimeReasoningStreamReceipt {
  readonly requested: boolean;
  readonly controlForwarded: boolean;
  readonly deltaCount: number;
  readonly outputTokens?: number;
  readonly streamSuppressed: boolean;
  readonly unavailableReason?: string;
}

export type RuntimeEffortSource = "none" | "client" | "variant" | "variant_coerced";

export interface RuntimeEffortReceipt {
  readonly reasoningEffort: string | null;
  readonly effortSource: RuntimeEffortSource;
}

export interface RuntimeEffortReceiptInput {
  readonly reasoningEffort?: string | null;
  readonly effortSource?: RuntimeEffortSource;
  readonly reasoning_effort?: string | null;
  readonly effort_source?: RuntimeEffortSource;
}

/** Normalize new and historical receipt shapes without inferring effort from endpoint identity. */
export function normalizeRuntimeEffortReceipt(
  input: RuntimeEffortReceiptInput = {},
): RuntimeEffortReceipt {
  const reasoningEffort = input.reasoningEffort ?? input.reasoning_effort ?? null;
  const effortSource = input.effortSource ?? input.effort_source ?? "none";
  if (reasoningEffort !== null && !reasoningEffort) {
    throw new Error("reasoningEffort must be null or a non-empty value.");
  }
  if (reasoningEffort === null && effortSource !== "none") {
    throw new Error("effortSource must be none when reasoningEffort is null.");
  }
  if (reasoningEffort !== null && effortSource === "none") {
    throw new Error("effortSource is required for an efforted request.");
  }
  return { reasoningEffort, effortSource };
}

export interface RuntimeDiagnostic {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
}

export interface RuntimeParameterSanitizationDecision {
  readonly field: string;
  readonly sourceSurface: string;
  readonly targetSurface: string;
  readonly action: string;
  readonly reason: string;
  readonly sourceValueKind: string;
  readonly forwardedField?: string;
  readonly adapterFamily: string;
  readonly providerId: string;
  readonly vendorId: string;
}

export interface RuntimeObservationBundleInput {
  readonly decision: {
    readonly request_id: string;
    readonly routing_decision_id: string;
    readonly chosen_endpoint_id: string;
    readonly app_id: string;
    readonly org_id?: string | null;
    /** Immutable membership/profile evidence selected at route time. */
    readonly membership_revision?: string | null;
    readonly profile_revision?: string | null;
  };
  readonly clientRequestId?: string;
  /** Explicit request effort; null means the provider-default instance. */
  readonly reasoningEffort?: string | null;
  readonly effortSource?: RuntimeEffortSource;
  readonly normalizedIntent?: Readonly<Record<string, unknown>>;
  readonly routingDiagnostics?: RuntimeRoutingDiagnostics;
  readonly retrievalReceipt: RuntimeRetrievalReceipt;
  readonly contextEnvelope: RuntimeContextEnvelopeSummary;
  readonly execution: RoutedExecutionResult;
  readonly priorSamples?: readonly ObservedPerformanceSample[];
  readonly maintenancePolicy?: Readonly<Record<string, string>>;
  readonly capturePolicy?: RuntimeCapturePolicy;
  readonly accountState?: RuntimeAccountState;
  readonly tooling?: {
    readonly toolCalls?: readonly {
      readonly name: string;
      readonly arguments: unknown;
      readonly providerToolId?: string;
    }[];
    readonly executions: readonly ToolRegistryExecution[];
  };
  readonly telemetrySnapshot?: RuntimeTelemetrySnapshot;
  readonly telemetryConfig?: {
    readonly samplingRate?: number;
    readonly retentionTtlHours?: number;
  };
  readonly executionSemantics?: {
    readonly sourceClient?: string;
    readonly executionFamily?: string;
    readonly adapterFamily?: string;
    readonly payloadBytes?: {
      readonly ingress?: number;
      readonly translated?: number;
      readonly providerCanonical?: number;
      readonly providerWire?: number;
      readonly providerResponse?: number;
    };
    readonly retryCount?: number;
    readonly rerouteCount?: number;
    readonly cooldownDecision?: string;
    readonly idempotencyDecision?: string;
    readonly toolSideEffectState?: string;
    readonly reasoning?: RuntimeReasoningStreamReceipt;
    readonly failedAttempts?: readonly RuntimeExecutionFailedAttemptReceipt[];
    readonly executionCooldowns?: readonly RuntimeExecutionCooldownReceipt[];
    readonly parameterSanitization?: readonly RuntimeParameterSanitizationDecision[];
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
  readonly structuredInspectionAvailable: boolean;
  readonly redactedFields: readonly string[];
  readonly suppressedFields: readonly string[];
}

export interface RuntimeObservationBundle {
  readonly requestId: string;
  readonly clientRequestId?: string;
  readonly reasoningEffort: string | null;
  readonly effortSource: RuntimeEffortSource;
  readonly routingDecisionId: string;
  readonly endpointId: string;
  readonly conversationId: string;
  readonly decision: RuntimeObservationBundleInput["decision"];
  readonly normalizedIntent?: RuntimeObservationBundleInput["normalizedIntent"];
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
  readonly taxonomyDimensions?: {
    readonly taxonomy_original_role_hint_id: unknown;
    readonly taxonomy_original_task_type: unknown;
    readonly taxonomy_group_id: unknown;
    readonly taxonomy_role_id: unknown;
    readonly taxonomy_task_type: unknown;
    readonly taxonomy_task_action: unknown;
    readonly taxonomy_task_variant: unknown;
    readonly taxonomy_capability_ids: unknown;
    readonly taxonomy_modality_ids: unknown;
    readonly taxonomy_tool_class_ids: unknown;
    readonly taxonomy_role_source: unknown;
    readonly taxonomy_task_source: unknown;
    readonly taxonomy_classification_source: unknown;
    readonly taxonomy_confidence: unknown;
    readonly taxonomy_task_confidence: unknown;
    readonly taxonomy_alternative_count: unknown;
    readonly taxonomy_alternative_role_ids: unknown;
    readonly taxonomy_alternative_task_types: unknown;
    readonly taxonomy_version: unknown;
    readonly taxonomy_content_revision: unknown;
    readonly classification_contract_version: unknown;
  };
  readonly privacyReceipt: {
    readonly samplingRate: number;
    readonly retentionTtlHours: number;
    readonly retainUntil: number;
  };
  readonly executionTelemetry: {
    readonly providerFamily: string;
    readonly vendorId?: string;
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
  readonly executionSemantics: {
    readonly sourceClient?: string;
    readonly executionFamily: string;
    readonly adapterFamily: string;
    readonly payloadBytes: {
      readonly ingress: number;
      readonly translated: number;
      readonly providerCanonical: number;
      readonly providerWire: number;
      readonly providerResponse: number;
    };
    readonly retryCount: number;
    readonly rerouteCount: number;
    readonly cooldownDecision: string;
    readonly idempotencyDecision: string;
    readonly toolSideEffectState: string;
    readonly reasoning?: RuntimeReasoningStreamReceipt;
    readonly failedAttempts?: readonly RuntimeExecutionFailedAttemptReceipt[];
    readonly executionCooldowns?: readonly RuntimeExecutionCooldownReceipt[];
    readonly parameterSanitization?: readonly RuntimeParameterSanitizationDecision[];
  };
  readonly cacheObservability: {
    readonly promptCacheRequested: boolean;
    readonly promptCacheRequestSource?: "explicit" | "synthesized";
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
      readonly sideEffectState: string;
    }>;
    readonly executions: readonly ToolRegistryExecution[];
    readonly diagnostics: readonly RuntimeDiagnostic[];
  };
  readonly telemetrySnapshot?: RuntimeTelemetrySnapshot;
  readonly inspection: {
    readonly request: {
      readonly requestId: string;
      readonly clientRequestId?: string;
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
  effort: { readonly reasoningEffort: string | null; readonly effortSource: RuntimeEffortSource },
): ObservedPerformanceSample {
  const identity = input.execution.target.candidate.identity;
  return {
    endpoint_id: input.decision.chosen_endpoint_id,
    endpoint_version: endpointVersion,
    model_id: identity.model_id,
    reasoning_effort: effort.reasoningEffort,
    effort_source: effort.effortSource,
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
            (input.execution.normalized.usage.outputTokens / input.execution.normalized.latencyMs) *
              1000,
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
  return value
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
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
  const toolCalls = input.tooling?.toolCalls ?? input.execution.normalized.toolCalls;
  const diagnostics = (input.tooling?.executions ?? []).flatMap((execution) =>
    execution.diagnostics.map<RuntimeDiagnostic>((diagnostic) => ({
      code: diagnostic.code,
      severity: execution.status === "failed" ? "error" : "warning",
      message: diagnostic.message,
    })),
  );
  if (toolCalls.length > 0 && (input.tooling?.executions.length ?? 0) === 0) {
    diagnostics.push({
      code: "TOOL_EXECUTION_MISSING",
      severity: "warning",
      message: `Runtime observation captured ${toolCalls.length} tool calls without execution receipts.`,
    });
  }
  return diagnostics;
}

function buildTooling(
  input: RuntimeObservationBundleInput,
  diagnostics: readonly RuntimeDiagnostic[],
): RuntimeObservationBundle["tooling"] {
  const toolCalls = input.tooling?.toolCalls ?? input.execution.normalized.toolCalls;
  const executions = input.tooling?.executions ?? [];
  return {
    toolCalls: toolCalls.map((toolCall, index) => ({
      toolCallId: toolCall.providerToolId ?? `${toolCall.name}-${index + 1}`,
      toolName: toolCall.name,
      arguments: toolCall.arguments,
      ...(toolCall.providerToolId ? { providerToolId: toolCall.providerToolId } : {}),
      sideEffectState: deriveToolCallSideEffectState(
        toolCall.providerToolId ?? `${toolCall.name}-${index + 1}`,
        executions,
      ),
    })),
    executions,
    diagnostics,
  };
}

function deriveToolCallSideEffectState(
  toolCallId: string,
  executions: readonly ToolRegistryExecution[],
): string {
  const execution = executions.find((entry) => entry.toolCallId === toolCallId);
  if (!execution) {
    return "not_executed";
  }
  switch (execution.status) {
    case "succeeded":
      return "executed";
    case "failed":
      return "attempted_failed";
    case "rejected":
      return "rejected";
    default:
      return "not_executed";
  }
}

function deriveToolSideEffectState(tooling: RuntimeObservationBundle["tooling"]): string {
  if (tooling.toolCalls.length === 0 && tooling.executions.length === 0) {
    return "none";
  }
  const states = new Set(tooling.toolCalls.map((toolCall) => toolCall.sideEffectState));
  if (states.size === 1) {
    return tooling.toolCalls[0]?.sideEffectState ?? "none";
  }
  return "mixed";
}

function measurePayloadBytes(value: unknown): number {
  return Buffer.byteLength(
    typeof value === "string" ? value : JSON.stringify(value ?? null),
    "utf8",
  );
}

function readNonNegativeCount(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
}

function readMeasuredPayloadBytes(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
}

function buildReasoningStreamReceipt(
  value: RuntimeReasoningStreamReceipt | undefined,
): RuntimeReasoningStreamReceipt | undefined {
  if (!value) {
    return undefined;
  }
  return {
    requested: Boolean(value.requested),
    controlForwarded: Boolean(value.controlForwarded),
    deltaCount: readNonNegativeCount(value.deltaCount),
    ...(typeof value.outputTokens === "number" && Number.isFinite(value.outputTokens)
      ? { outputTokens: readNonNegativeCount(value.outputTokens) }
      : {}),
    streamSuppressed: Boolean(value.streamSuppressed),
    ...(typeof value.unavailableReason === "string" && value.unavailableReason.length > 0
      ? { unavailableReason: value.unavailableReason }
      : {}),
  };
}

function cloneReadonlyRecord(
  value: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> | undefined {
  return value ? { ...value } : undefined;
}

function buildExecutionSemantics(
  input: RuntimeObservationBundleInput,
  tooling: RuntimeObservationBundle["tooling"],
): RuntimeObservationBundle["executionSemantics"] {
  const toolSideEffectState =
    input.executionSemantics?.toolSideEffectState ?? deriveToolSideEffectState(tooling);
  const executionFamily =
    input.executionSemantics?.executionFamily ??
    input.telemetrySnapshot?.servingSource ??
    input.execution.target.candidate.identity.serving_source ??
    input.execution.target.adapterFamily;
  const adapterFamily =
    input.executionSemantics?.adapterFamily ?? input.execution.target.adapterFamily;
  const providerCanonicalBytes =
    readMeasuredPayloadBytes(input.executionSemantics?.payloadBytes?.providerCanonical) ??
    measurePayloadBytes(input.execution.requestCapture.body);
  const providerResponseBytes =
    readMeasuredPayloadBytes(input.executionSemantics?.payloadBytes?.providerResponse) ??
    measurePayloadBytes(input.execution.responseCapture.body);
  const failedAttempts = input.executionSemantics?.failedAttempts
    ?.filter((attempt) => typeof attempt.attemptId === "string" && attempt.attemptId.length > 0)
    .map((attempt) => ({
      ...attempt,
      ...(attempt.errorPreview ? { errorPreview: cloneReadonlyRecord(attempt.errorPreview) } : {}),
    }));
  const executionCooldowns = input.executionSemantics?.executionCooldowns
    ?.filter(
      (cooldown) => typeof cooldown.endpointId === "string" && cooldown.endpointId.length > 0,
    )
    .map((cooldown) => ({
      ...cooldown,
      ...(cooldown.errorPreview
        ? { errorPreview: cloneReadonlyRecord(cooldown.errorPreview) }
        : {}),
    }));
  const parameterSanitization = input.executionSemantics?.parameterSanitization
    ?.filter((decision) => typeof decision.field === "string" && decision.field.length > 0)
    .map((decision) => ({ ...decision }));
  const reasoning = buildReasoningStreamReceipt(input.executionSemantics?.reasoning);
  return {
    ...(input.executionSemantics?.sourceClient
      ? { sourceClient: input.executionSemantics.sourceClient }
      : {}),
    executionFamily,
    adapterFamily,
    payloadBytes: {
      ingress:
        readMeasuredPayloadBytes(input.executionSemantics?.payloadBytes?.ingress) ??
        providerCanonicalBytes,
      translated:
        readMeasuredPayloadBytes(input.executionSemantics?.payloadBytes?.translated) ??
        providerCanonicalBytes,
      providerCanonical: providerCanonicalBytes,
      providerWire:
        readMeasuredPayloadBytes(input.executionSemantics?.payloadBytes?.providerWire) ??
        providerCanonicalBytes,
      providerResponse: providerResponseBytes,
    },
    retryCount: readNonNegativeCount(input.executionSemantics?.retryCount),
    rerouteCount: readNonNegativeCount(input.executionSemantics?.rerouteCount),
    cooldownDecision: input.executionSemantics?.cooldownDecision ?? "not_applied",
    idempotencyDecision:
      input.executionSemantics?.idempotencyDecision ??
      (toolSideEffectState === "none" ? "not_needed" : "tool_replay_guard_required"),
    toolSideEffectState,
    ...(reasoning ? { reasoning } : {}),
    ...(failedAttempts && failedAttempts.length > 0 ? { failedAttempts } : {}),
    ...(executionCooldowns && executionCooldowns.length > 0 ? { executionCooldowns } : {}),
    ...(parameterSanitization && parameterSanitization.length > 0 ? { parameterSanitization } : {}),
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
  if (
    capturePolicy.redactedFields.includes("request.headers.authorization") &&
    headers.authorization
  ) {
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
      code: capturePolicy.rawCaptureAvailable
        ? "OPERATOR_RAW_CAPTURE_AVAILABLE"
        : "OPERATOR_RAW_CAPTURE_DISABLED",
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

/**
 * Extract taxonomy dimensions from normalizedIntent for telemetry recording.
 * Delegates to the canonical implementation in @role-model/protocol-types.
 * @deprecated Use extractTaxonomyDimensions from @role-model/protocol-types directly.
 */
export const extractTaxonomyFields = extractTaxonomyDimensions;

export function createRuntimeObservationBundle(
  input: RuntimeObservationBundleInput,
): RuntimeObservationBundle {
  const effort = normalizeRuntimeEffortReceipt(input);
  const endpointVersion = deriveEndpointVersion(input.execution);
  const currentSample = buildObservedPerformanceSample(input, endpointVersion, effort);
  const priorSamples = (input.priorSamples ?? []).filter(
    (sample) =>
      sample.endpoint_id === input.decision.chosen_endpoint_id &&
      sample.endpoint_version === endpointVersion,
  );
  const history = [...priorSamples, currentSample];
  const profile = aggregateOperationalPerformanceSamples(history, {
    nowMs: currentSample.timestamp_ms,
  });
  if (!profile) {
    throw new Error("A live runtime observation must produce an operational profile.");
  }
  const capturePolicy = buildCapturePolicyReceipt(input.maintenancePolicy, input.capturePolicy);
  const telemetryConfig = input.telemetryConfig ?? {};
  const samplingRate = telemetryConfig.samplingRate ?? 1.0;
  const retentionTtlHours = telemetryConfig.retentionTtlHours ?? 720;
  const retainUntil = Date.now() + retentionTtlHours * 3600 * 1000;
  const diagnostics = {
    routing: buildRoutingDiagnostics(input),
    execution: buildExecutionDiagnostics(input),
    authAccount: buildAuthAccountDiagnostics(input.accountState),
    memoryQuality: buildMemoryDiagnostics(input),
    tooling: buildToolingDiagnostics(input),
    operator: buildOperatorDiagnostics(capturePolicy),
  } as const;
  const tooling = buildTooling(input, diagnostics.tooling);
  const executionSemantics = buildExecutionSemantics(input, tooling);

  return {
    requestId: input.decision.request_id,
    ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {}),
    reasoningEffort: effort.reasoningEffort,
    effortSource: effort.effortSource,
    routingDecisionId: input.decision.routing_decision_id,
    endpointId: input.decision.chosen_endpoint_id,
    conversationId: input.contextEnvelope.conversationId,
    decision: input.decision,
    ...(input.normalizedIntent ? { normalizedIntent: input.normalizedIntent } : {}),
    routingDiagnostics: input.routingDiagnostics ?? {},
    retrievalReceipt: input.retrievalReceipt,
    contextEnvelope: input.contextEnvelope,
    trace: input.execution.trace,
    usageEvent: {
      ...input.execution.usageEvent,
      reasoning_effort: effort.reasoningEffort,
      effort_source: effort.effortSource,
    },
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
      ...((input.execution.responseCapture.vendorMetadata?.vendorId ??
      input.execution.normalized.vendorMetadata?.vendorId)
        ? {
            vendorId:
              input.execution.responseCapture.vendorMetadata?.vendorId ??
              input.execution.normalized.vendorMetadata?.vendorId,
          }
        : {}),
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
    executionSemantics,
    cacheObservability: {
      promptCacheRequested: input.execution.normalized.promptCache.requested,
      ...(input.execution.normalized.promptCache.requestSource
        ? { promptCacheRequestSource: input.execution.normalized.promptCache.requestSource }
        : {}),
      promptCacheUsed: input.execution.normalized.promptCache.used,
      cacheReadTokens: input.execution.normalized.promptCache.readTokens,
      cacheWriteTokens: input.execution.normalized.promptCache.writeTokens,
      routingCacheAffinity: Boolean(
        input.routingDiagnostics?.cacheContinuity?.advisorySelectionApplied,
      ),
    },
    tooling,
    ...(input.telemetrySnapshot ? { telemetrySnapshot: input.telemetrySnapshot } : {}),
    ...(input.normalizedIntent
      ? {
          taxonomyDimensions: extractTaxonomyFields(
            input.normalizedIntent,
          ) as RuntimeObservationBundle["taxonomyDimensions"],
        }
      : {}),
    privacyReceipt: {
      samplingRate,
      retentionTtlHours,
      retainUntil,
    },
    inspection: {
      request: {
        requestId: input.decision.request_id,
        ...(input.clientRequestId ? { clientRequestId: input.clientRequestId } : {}),
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
