import type { ObservedPerformanceProfile } from "@role-model/protocol-types";
import type { RoutedExecutionResult } from "@role-model-router/adapter-execution";
import {
  aggregateObservedPerformanceSamples,
  type ObservedPerformanceSample,
} from "@role-model-router/profile-aggregator";

export interface RuntimeRoutingDiagnostics {
  readonly retrievalReceiptId?: string;
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
    readonly operator: readonly RuntimeDiagnostic[];
  };
  readonly capturePolicy: RuntimeObservationCapturePolicyReceipt;
  readonly cacheObservability: {
    readonly promptCacheRequested: boolean;
    readonly promptCacheUsed: boolean;
    readonly cacheReadTokens: number;
    readonly cacheWriteTokens: number;
    readonly routingCacheAffinity: boolean;
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
    operator: buildOperatorDiagnostics(capturePolicy),
  } as const;

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
    cacheObservability: {
      promptCacheRequested: input.execution.normalized.promptCache.requested,
      promptCacheUsed: input.execution.normalized.promptCache.used,
      cacheReadTokens: input.execution.normalized.promptCache.readTokens,
      cacheWriteTokens: input.execution.normalized.promptCache.writeTokens,
      routingCacheAffinity:
        input.execution.normalized.promptCache.requested &&
        Boolean(input.routingDiagnostics?.routingModel?.enabled),
    },
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
