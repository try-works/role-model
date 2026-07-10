import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import {
  CodeBlock,
  DisclosureSection,
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  compactTitleClassName,
  inlineTitleClassName,
  metaTextClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import { formatRoutingModeLabel } from "../lib/routing-mode";
import { fetchRequestDetail } from "../lib/runtime-api";
import { useShellHeaderOverride } from "../lib/shell-header-context";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asStringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function pickNumber(record: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(record[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function pickString(record: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = asStringValue(record[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function pickBoolean(record: Record<string, unknown>, ...keys: string[]): boolean | null {
  for (const key of keys) {
    const value = asBoolean(record[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function formatDateTime(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  return new Date(value).toLocaleString();
}

function formatUsd(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  return `$${value.toFixed(4)}`;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  return `${(value * 100).toFixed(0)}%`;
}

function renderMetricValue(value: string | number | null): string | number {
  return value ?? "n/a";
}

function readStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0);
}

function readTaxonomyStringList(...values: unknown[]): string[] {
  for (const value of values) {
    const list = readStringList(value);
    if (list.length > 0) {
      return list;
    }
  }
  return [];
}

export default function RequestDetailRoute() {
  const { requestId = "" } = useParams();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchRequestDetail>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    void fetchRequestDetail(requestId)
      .then(setDetail)
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load request detail."),
      );
  }, [requestId]);

  useShellHeaderOverride({ title: requestId }, [requestId]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!detail) {
    return <LoadingState label="Loading request inspector…" />;
  }

  const request = asRecord(detail.request) ?? {};
  const endpointProfile = asRecord(detail.endpointProfile) ?? {};
  const latestProfile = asRecord(endpointProfile.latestProfile) ?? {};
  const recentSamples = Array.isArray(endpointProfile.recentSamples)
    ? endpointProfile.recentSamples
    : [];
  const endpointIdentity =
    asRecord(latestProfile.endpoint_identity ?? latestProfile.endpointIdentity) ?? {};
  const usageEvent = asRecord(request.usageEvent) ?? {};
  const telemetrySnapshot = asRecord(request.telemetrySnapshot) ?? {};
  const executionTelemetry = asRecord(request.executionTelemetry) ?? {};
  const executionSemantics = asRecord(request.executionSemantics) ?? {};
  const executionStream = asRecord(executionTelemetry.stream) ?? {};
  const executionStreamSupport = asRecord(executionTelemetry.streamSupport) ?? {};
  const executionPromptCaching = asRecord(executionTelemetry.promptCaching) ?? {};
  const observedPerformance = asRecord(request.observedPerformance) ?? {};
  const observedSample = asRecord(observedPerformance.sample) ?? {};
  const cacheObservability = asRecord(request.cacheObservability) ?? {};
  const tooling = asRecord(request.tooling) ?? {};
  const routingDiagnostics = asRecord(request.routingDiagnostics) ?? {};
  const routingMode = asRecord(routingDiagnostics.routingMode) ?? {};
  const rewrite = asRecord(routingDiagnostics.rewrite) ?? {};
  const difficultyRouting = asRecord(routingDiagnostics.difficultyRouting) ?? {};
  const difficultySignals = asRecord(difficultyRouting.rubricSignals) ?? {};
  const controllerRouting = asRecord(routingDiagnostics.controllerRouting) ?? {};
  const acceptedDirectives = asRecord(controllerRouting.acceptedDirectives) ?? {};
  const hybridArbitration = asRecord(routingDiagnostics.hybridArbitration) ?? {};
  const inspection = asRecord(request.inspection) ?? {};
  const inspectionRequest = asRecord(inspection.request) ?? {};
  const inspectionEndpoint = asRecord(inspection.endpoint) ?? {};
  const capturePolicy =
    asRecord(request.capturePolicy) ?? asRecord(inspectionRequest.capturePolicy) ?? {};
  const privacyReceipt = asRecord(request.privacyReceipt) ?? {};
  const observationAvailability = asRecord(request.observationAvailability) ?? {};
  const requestCapture = asRecord(inspectionRequest.requestCapture) ?? {};
  const responseCapture = asRecord(inspectionRequest.responseCapture) ?? {};
  const toolCalls = Array.isArray(tooling.toolCalls) ? tooling.toolCalls : [];
  const toolExecutions = Array.isArray(tooling.executions) ? tooling.executions : [];
  const toolDiagnostics = Array.isArray(tooling.diagnostics) ? tooling.diagnostics : [];
  const captureRedactedFields = readStringList(capturePolicy.redactedFields);
  const captureSuppressedFields = readStringList(capturePolicy.suppressedFields);
  const sourceType =
    pickString(request, "sourceType") ??
    (pickString(endpointIdentity, "endpoint_kind", "endpointKind") === "remote_api"
      ? "remote"
      : pickString(endpointIdentity, "endpoint_kind", "endpointKind")
        ? "local"
        : null);
  const latencyMs = pickNumber(usageEvent, "latency_ms", "latencyMs");
  const inputTokens = pickNumber(usageEvent, "tokens_in", "inputTokens", "promptTokens");
  const outputTokens = pickNumber(usageEvent, "tokens_out", "outputTokens", "completionTokens");
  const totalTokens =
    pickNumber(usageEvent, "total_tokens", "totalTokens") ??
    (() => {
      const promptTokens = inputTokens ?? 0;
      const completionTokens = outputTokens ?? 0;
      return promptTokens > 0 || completionTokens > 0 ? promptTokens + completionTokens : null;
    })();
  const pickCostNumber = (...keys: string[]): number | null =>
    pickNumber(request, ...keys) ??
    pickNumber(telemetrySnapshot, ...keys) ??
    pickNumber(usageEvent, ...keys);
  const pickCostString = (...keys: string[]): string | null =>
    pickString(request, ...keys) ?? pickString(telemetrySnapshot, ...keys);
  const actualCostUsd = pickNumber(usageEvent, "cost_actual", "actualCostUsd");
  const estimatedCostUsd = pickNumber(usageEvent, "cost_estimate", "estimatedCostUsd");
  const effectiveCostUsd = pickCostNumber("effectiveCostUsd", "effective_cost_usd");
  const selectedUncachedCostUsd = pickCostNumber(
    "selectedUncachedCostUsd",
    "selected_uncached_cost_usd",
  );
  const baselineMaxEligibleCostUsd = pickCostNumber(
    "baselineMaxEligibleCostUsd",
    "baseline_max_eligible_cost_usd",
  );
  const routingCostSavingsUsd = pickCostNumber("routingCostSavingsUsd", "routing_cost_savings_usd");
  const cacheCostSavingsUsd = pickCostNumber("cacheCostSavingsUsd", "cache_cost_savings_usd");
  const totalAvoidedCostUsd = pickCostNumber("totalAvoidedCostUsd", "total_avoided_cost_usd");
  const costCalculationBasis = pickCostString("costCalculationBasis", "cost_calculation_basis");
  const costCalculationVersion = pickCostString(
    "costCalculationVersion",
    "cost_calculation_version",
  );
  const costBaselineSource = pickCostString("costBaselineSource", "cost_baseline_source");
  const costSavingsSupport = pickCostString("costSavingsSupport", "cost_savings_support");
  const providerId =
    pickString(request, "providerId") ?? pickString(telemetrySnapshot, "providerId");
  const providerFamily = pickString(executionTelemetry, "providerFamily");
  const vendorId =
    pickString(executionTelemetry, "vendorId") ??
    pickString(asRecord(responseCapture.vendorMetadata) ?? {}, "vendorId");
  const executionFamily = pickString(executionSemantics, "executionFamily");
  const adapterFamily = pickString(executionSemantics, "adapterFamily");
  const finishReason = pickString(executionTelemetry, "finishReason");
  const promptCacheSupported =
    pickBoolean(request, "promptCacheSupported") ??
    pickBoolean(executionPromptCaching, "supported") ??
    false;
  const promptCacheRequested =
    pickBoolean(cacheObservability, "promptCacheRequested") ??
    pickBoolean(request, "promptCacheRequested");
  const promptCacheUsed =
    pickBoolean(cacheObservability, "promptCacheUsed") ?? pickBoolean(request, "promptCacheUsed");
  const cacheStatus = !promptCacheSupported
    ? "unavailable"
    : promptCacheUsed
      ? "hit"
      : promptCacheRequested
        ? "miss"
        : "ready";
  const responseStatus = asNumber(responseCapture.statusCode);
  const samplingRate = pickNumber(privacyReceipt, "samplingRate");
  const retentionTtlHours = pickNumber(privacyReceipt, "retentionTtlHours");
  const retainUntil = pickNumber(privacyReceipt, "retainUntil");
  const createdAtMs =
    pickNumber(request, "createdAtMs") ?? pickNumber(usageEvent, "timestamp_ms", "timestampMs");
  const measuredAtMs =
    pickNumber(latestProfile, "measured_at_ms", "measuredAtMs") ??
    pickNumber(observedSample, "timestamp_ms", "timestampMs");
  const modelId =
    pickString(usageEvent, "model_id", "modelId") ??
    pickString(endpointIdentity, "model_id", "modelId");
  const providerKind =
    pickString(usageEvent, "provider_kind", "providerKind") ??
    pickString(endpointIdentity, "provider_kind", "providerKind");
  const endpointId = pickString(request, "endpointId") ?? "unknown";
  const clientRequestId =
    pickString(request, "clientRequestId") ??
    pickString(inspectionRequest, "clientRequestId") ??
    null;
  const streamTextDeltaCount =
    pickNumber(request, "streamTextDeltaCount") ?? pickNumber(executionStream, "textDeltas") ?? 0;
  const streamToolCallDeltaCount =
    pickNumber(request, "streamToolCallDeltaCount") ??
    pickNumber(executionStream, "toolCallDeltas") ??
    0;
  const streamToolArgumentDeltaCount =
    pickNumber(request, "streamToolArgumentDeltaCount") ??
    pickNumber(executionStream, "toolArgumentDeltas") ??
    0;
  const streamTextSupported =
    pickBoolean(request, "streamTextSupported") ??
    pickString(executionStreamSupport, "text") !== "unsupported";
  const streamToolCallSupported =
    pickBoolean(request, "streamToolCallSupported") ??
    pickString(executionStreamSupport, "toolCalls") !== "unsupported";
  const streamToolArgumentSupported =
    pickBoolean(request, "streamToolArgumentSupported") ??
    pickString(executionStreamSupport, "toolArguments") !== "unsupported";
  const streamSummary = [
    streamTextSupported
      ? `${streamTextDeltaCount} text delta${streamTextDeltaCount === 1 ? "" : "s"}`
      : null,
    streamToolCallSupported
      ? `${streamToolCallDeltaCount} tool-call delta${streamToolCallDeltaCount === 1 ? "" : "s"}`
      : null,
    streamToolArgumentSupported
      ? `${streamToolArgumentDeltaCount} tool-arg delta${streamToolArgumentDeltaCount === 1 ? "" : "s"}`
      : null,
  ]
    .filter((value): value is string => value !== null)
    .join(" / ");
  const profileSampleCount = recentSamples.length;
  const latestProfileErrorClass = pickString(latestProfile, "error_class", "errorClass");
  const latestProfileFailureRate = pickNumber(latestProfile, "failure_rate", "failureRate");
  const recentEndpointSamples = Array.isArray(inspectionEndpoint.recentSamples)
    ? inspectionEndpoint.recentSamples
    : recentSamples;
  const routingModeSummary = pickString(routingMode, "effectiveMode");
  const routingModeSource = pickString(routingMode, "source");
  const routingRequestedOverride = pickString(routingMode, "requestedOverride");
  const routingAliasMode = pickString(routingMode, "aliasMode");
  const rewriteSummary =
    pickString(rewrite, "requestedModel") && pickString(rewrite, "downstreamModelId")
      ? `${pickString(rewrite, "requestedModel")} -> ${pickString(rewrite, "downstreamModelId")}`
      : null;
  const rewriteReason = pickString(rewrite, "reason");
  const difficultyBucket = pickString(difficultyRouting, "difficulty");
  const difficultyStrategy = pickString(difficultyRouting, "strategy");
  const controllerActive = pickBoolean(controllerRouting, "active");
  const controllerStrategy = pickString(acceptedDirectives, "strategy");
  const controllerTaskType = pickString(acceptedDirectives, "taskType");
  const hybridSignal = pickString(hybridArbitration, "dominantSignal");
  const hybridStrategy = pickString(hybridArbitration, "finalStrategy");
  const rubricSignalSummary = [
    pickNumber(difficultySignals, "contextTokens"),
    pickNumber(difficultySignals, "toolCount"),
    pickNumber(difficultySignals, "historyTurnCount"),
    pickNumber(difficultySignals, "instructionConstraintCount"),
    pickNumber(difficultySignals, "decompositionKeywordCount"),
  ].some((value) => value !== null)
    ? [
        `context ${pickNumber(difficultySignals, "contextTokens") ?? 0}`,
        `tools ${pickNumber(difficultySignals, "toolCount") ?? 0}`,
        `history ${pickNumber(difficultySignals, "historyTurnCount") ?? 0}`,
        `constraints ${pickNumber(difficultySignals, "instructionConstraintCount") ?? 0}`,
        `decomposition ${pickNumber(difficultySignals, "decompositionKeywordCount") ?? 0}`,
      ].join(" • ")
    : null;
  const taxonomyDimensions =
    asRecord(request.taxonomyDimensions) ??
    asRecord(telemetrySnapshot.taxonomyDimensions) ??
    asRecord(request.taxonomy_dimensions) ??
    null;
  const normalizedIntent =
    asRecord(request.normalizedIntent) ?? asRecord(request.normalized_intent) ?? {};
  const originalRoleHint =
    pickString(taxonomyDimensions ?? {}, "taxonomy_original_role_hint_id") ??
    pickString(normalizedIntent, "originalRoleHintId");
  const originalTaskType =
    pickString(taxonomyDimensions ?? {}, "taxonomy_original_task_type") ??
    pickString(normalizedIntent, "originalTaskType");
  const taxonomyGroupId =
    pickString(taxonomyDimensions ?? {}, "taxonomy_group_id") ??
    pickString(request, "taxonomyGroupId") ??
    pickString(normalizedIntent, "groupId");
  const taxonomyRoleId =
    pickString(taxonomyDimensions ?? {}, "taxonomy_role_id") ??
    pickString(request, "taxonomyRoleId") ??
    pickString(normalizedIntent, "roleId");
  const taxonomyTaskType =
    pickString(taxonomyDimensions ?? {}, "taxonomy_task_type") ??
    pickString(request, "taxonomyTaskType") ??
    pickString(normalizedIntent, "taskType");
  const taxonomyTaskVariant =
    pickString(taxonomyDimensions ?? {}, "taxonomy_task_variant") ??
    pickString(request, "taxonomyTaskVariant") ??
    pickString(normalizedIntent, "taskVariant");
  const taxonomyCapabilityIds = readTaxonomyStringList(
    taxonomyDimensions?.taxonomy_capability_ids,
    request.taxonomyCapabilityIds,
  );
  const taxonomyModalityIds = readTaxonomyStringList(
    taxonomyDimensions?.taxonomy_modality_ids,
    request.taxonomyModalityIds,
  );
  const taxonomyToolClassIds = readTaxonomyStringList(
    taxonomyDimensions?.taxonomy_tool_class_ids,
    request.taxonomyToolClassIds,
  );
  const taxonomyRoleSource = pickString(taxonomyDimensions ?? {}, "taxonomy_role_source");
  const taxonomyTaskSource = pickString(taxonomyDimensions ?? {}, "taxonomy_task_source");
  const taxonomyClassificationSource = pickString(
    taxonomyDimensions ?? {},
    "taxonomy_classification_source",
  );
  const taxonomyConfidence = pickNumber(taxonomyDimensions ?? {}, "taxonomy_confidence");
  const taxonomyTaskConfidence = pickNumber(taxonomyDimensions ?? {}, "taxonomy_task_confidence");
  const taxonomyAlternativeRoleIds = readStringList(
    taxonomyDimensions?.taxonomy_alternative_role_ids,
  );
  const taxonomyAlternativeTaskTypes = readStringList(
    taxonomyDimensions?.taxonomy_alternative_task_types,
  );
  const taxonomyVersion = pickString(taxonomyDimensions ?? {}, "taxonomy_version");
  const taxonomyContentRevision = pickString(taxonomyDimensions ?? {}, "taxonomy_content_revision");
  const classificationContractVersion = pickString(
    taxonomyDimensions ?? {},
    "classification_contract_version",
  );
  const observationSource = pickString(observationAvailability, "source");
  const observationReason = pickString(observationAvailability, "reason");
  const rawObservationAvailable =
    pickBoolean(observationAvailability, "rawObservationAvailable") ??
    Object.keys(inspectionRequest).length > 0;
  const structuredInspectionAvailable =
    pickBoolean(observationAvailability, "structuredInspectionAvailable") ??
    pickBoolean(capturePolicy, "structuredInspectionAvailable");
  const rawCaptureAvailable = pickBoolean(capturePolicy, "rawCaptureAvailable");
  const captureEnvironment = pickString(capturePolicy, "environment");
  const captureRedactionLevel = pickString(capturePolicy, "redactionLevel");
  const captureRetentionClass = pickString(capturePolicy, "retentionClass");
  const captureStructuredInspectionMode = pickString(capturePolicy, "structuredInspectionMode");
  const hasRequestCapture = Object.keys(requestCapture).length > 0;
  const hasResponseCapture = Object.keys(responseCapture).length > 0;
  const taxonomyPresent =
    [
      originalRoleHint,
      originalTaskType,
      taxonomyGroupId,
      taxonomyRoleId,
      taxonomyTaskType,
      taxonomyTaskVariant,
      taxonomyRoleSource,
      taxonomyTaskSource,
      taxonomyClassificationSource,
      taxonomyVersion,
      taxonomyContentRevision,
      classificationContractVersion,
    ].some((value) => value !== null) ||
    taxonomyCapabilityIds.length > 0 ||
    taxonomyModalityIds.length > 0 ||
    taxonomyToolClassIds.length > 0 ||
    taxonomyAlternativeRoleIds.length > 0 ||
    taxonomyAlternativeTaskTypes.length > 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Endpoint"
          value={endpointId}
          className="xl:col-span-2"
          detail="Endpoint id currently associated with the captured request."
          emphasis
          valueClassName={inlineTitleClassName}
        />
        <FactCard
          label="Correlation"
          value={renderMetricValue(clientRequestId)}
          className="xl:col-span-2"
          detail="Caller-supplied correlation id preserved alongside the canonical request ledger id."
          valueClassName={inlineTitleClassName}
        />
        <FactCard
          label="Source"
          value={renderMetricValue(sourceType)}
          detail="Canonical source family used by the telemetry ledger."
        />
        <FactCard
          label="Provider"
          value={renderMetricValue(providerId)}
          detail="Actual provider identity for the selected endpoint."
        />
        <FactCard
          label="Provider family"
          value={renderMetricValue(providerFamily)}
          detail="Provider semantic family preserved in the canonical telemetry contract."
        />
        <FactCard
          label="Vendor"
          value={renderMetricValue(vendorId)}
          detail="Optional intermediary execution vendor such as LiteLLM."
        />
        <FactCard
          label="Execution path"
          value={renderMetricValue(executionFamily)}
          detail="High-level routed execution family selected for this request."
        />
        <FactCard
          label="Adapter"
          value={renderMetricValue(adapterFamily)}
          detail="Concrete adapter implementation used to shape and execute the provider request."
        />
        <FactCard
          label="Latency"
          value={latencyMs === null ? "n/a" : `${latencyMs} ms`}
          detail="Observed request latency from the persisted usage event."
        />
        <FactCard
          label="Tokens"
          value={renderMetricValue(totalTokens)}
          detail="Total token usage when the provider exposed prompt/completion accounting."
        />
        <FactCard
          label="Cost"
          value={formatUsd(effectiveCostUsd)}
          detail={
            costCalculationBasis || costCalculationVersion
              ? `Stored effective cost • ${costCalculationBasis ?? "unknown basis"} • ${
                  costCalculationVersion ?? "unknown version"
                }`
              : "Stored authoritative per-request effective cost."
          }
        />
        <FactCard
          label="Cache"
          value={renderMetricValue(cacheStatus)}
          detail="Captured cache posture using explicit support semantics rather than zero-only inference."
        />
      </div>

      <SectionCard
        title="Adjacent raw-host tools"
        description="Structured telemetry is canonical here; preserved host surfaces are available when you need raw metrics, captures, or combined logs."
      >
        <div className="flex flex-wrap gap-3">
          <Link className={secondaryButtonClassName} to="/app/observe/requests">
            Back to request ledger
          </Link>
          <Link className={secondaryButtonClassName} to="/app/observe/activity">
            Host activity & captures
          </Link>
          <Link className={secondaryButtonClassName} to="/app/observe/logs">
            Host logs
          </Link>
        </div>
      </SectionCard>

      <SectionCard
        title="Taxonomy classification"
        description="Structured original, normalized, and derived taxonomy evidence captured with this request."
      >
        {taxonomyPresent ? (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-[var(--rm-radius-md)] bg-[var(--rm-panel)] p-4">
                <p className={compactTitleClassName}>Original request hints</p>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className={utilityLabelClassName}>Original role hint</dt>
                    <dd className={`mt-1 ${supportingTextClassName}`}>
                      {renderMetricValue(originalRoleHint)}
                    </dd>
                  </div>
                  <div>
                    <dt className={utilityLabelClassName}>Original task type</dt>
                    <dd className={`mt-1 ${supportingTextClassName}`}>
                      {renderMetricValue(originalTaskType)}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-[var(--rm-radius-md)] bg-[var(--rm-panel)] p-4">
                <p className={compactTitleClassName}>Normalized classification</p>
                <dl className="mt-3 space-y-3 text-sm">
                  {[
                    ["Taxonomy group", taxonomyGroupId],
                    ["Taxonomy role", taxonomyRoleId],
                    ["Taxonomy task", taxonomyTaskType],
                    ["Task variant", taxonomyTaskVariant],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className={utilityLabelClassName}>{label}</dt>
                      <dd className={`mt-1 ${supportingTextClassName}`}>
                        {renderMetricValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="rounded-[var(--rm-radius-md)] bg-[var(--rm-panel)] p-4">
                <p className={compactTitleClassName}>Derived analytics tags</p>
                <dl className="mt-3 space-y-3 text-sm">
                  {[
                    [
                      "Derived capabilities",
                      taxonomyCapabilityIds.length > 0 ? taxonomyCapabilityIds.join(", ") : null,
                    ],
                    [
                      "Derived modalities",
                      taxonomyModalityIds.length > 0 ? taxonomyModalityIds.join(", ") : null,
                    ],
                    [
                      "Derived tool classes",
                      taxonomyToolClassIds.length > 0 ? taxonomyToolClassIds.join(", ") : null,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className={utilityLabelClassName}>{label}</dt>
                      <dd className={`mt-1 ${supportingTextClassName}`}>
                        {renderMetricValue(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
              {[
                ["Classification source", taxonomyClassificationSource],
                ["Role source", taxonomyRoleSource],
                ["Task source", taxonomyTaskSource],
                ["Confidence", taxonomyConfidence === null ? null : String(taxonomyConfidence)],
                [
                  "Task confidence",
                  taxonomyTaskConfidence === null ? null : String(taxonomyTaskConfidence),
                ],
                [
                  "Alternative roles",
                  taxonomyAlternativeRoleIds.length > 0
                    ? taxonomyAlternativeRoleIds.join(", ")
                    : null,
                ],
                [
                  "Alternative tasks",
                  taxonomyAlternativeTaskTypes.length > 0
                    ? taxonomyAlternativeTaskTypes.join(", ")
                    : null,
                ],
                ["Taxonomy version", taxonomyVersion],
                ["Content revision", taxonomyContentRevision],
                ["Classification contract", classificationContractVersion],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] p-3"
                >
                  <dt className={utilityLabelClassName}>{label}</dt>
                  <dd className={`mt-1 ${bodyStrongTextClassName}`}>{renderMetricValue(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <EmptyState label="This request predates the richer taxonomy contract." />
        )}
      </SectionCard>

      <SectionCard
        title="Cost audit"
        description="Stored per-request cost calculation and savings metadata used by analytics and request detail surfaces."
      >
        <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Effective cost", formatUsd(effectiveCostUsd)],
            ["Selected uncached cost", formatUsd(selectedUncachedCostUsd)],
            ["Baseline max eligible", formatUsd(baselineMaxEligibleCostUsd)],
            ["Routing savings", formatUsd(routingCostSavingsUsd)],
            ["Cache savings", formatUsd(cacheCostSavingsUsd)],
            ["Total avoided cost", formatUsd(totalAvoidedCostUsd)],
            ["Calculation basis", costCalculationBasis],
            ["Calculation version", costCalculationVersion],
            ["Baseline source", costBaselineSource],
            ["Savings support", costSavingsSupport],
            [
              "Raw actual cost",
              actualCostUsd === null ? null : `${formatUsd(actualCostUsd)} provenance`,
            ],
            [
              "Raw estimated cost",
              estimatedCostUsd === null ? null : `${formatUsd(estimatedCostUsd)} provenance`,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel-muted)] p-3"
            >
              <dt className={utilityLabelClassName}>{label}</dt>
              <dd className={`mt-1 ${bodyStrongTextClassName}`}>{renderMetricValue(value)}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>

      <SectionCard
        title="Telemetry handling"
        description="Sampling, retention, redaction, and inspection-availability receipts for this request."
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone={rawObservationAvailable ? "success" : "warning"}>
              {rawObservationAvailable ? "Raw observation retained" : "Ledger fallback only"}
            </StatusPill>
            <StatusPill tone={structuredInspectionAvailable ? "accent" : "neutral"}>
              {structuredInspectionAvailable
                ? "Structured inspection available"
                : "No structured inspection"}
            </StatusPill>
            <StatusPill tone={rawCaptureAvailable ? "accent" : "neutral"}>
              {rawCaptureAvailable ? "Raw capture allowed" : "Raw capture unavailable"}
            </StatusPill>
          </div>
          <dl className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Observation source", observationSource],
              ["Capture environment", captureEnvironment],
              ["Sampling rate", formatPercent(samplingRate)],
              [
                "Retention TTL",
                retentionTtlHours === null
                  ? null
                  : `${retentionTtlHours} hour${retentionTtlHours === 1 ? "" : "s"}`,
              ],
              ["Retain until", formatDateTime(retainUntil)],
              ["Redaction level", captureRedactionLevel],
              ["Retention class", captureRetentionClass],
              ["Inspection mode", captureStructuredInspectionMode],
              [
                "Redacted fields",
                captureRedactedFields.length > 0 ? captureRedactedFields.join(", ") : null,
              ],
              [
                "Suppressed fields",
                captureSuppressedFields.length > 0 ? captureSuppressedFields.join(", ") : null,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-panel)] p-3"
              >
                <dt className={utilityLabelClassName}>{label}</dt>
                <dd className={`mt-1 ${bodyStrongTextClassName}`}>{renderMetricValue(value)}</dd>
              </div>
            ))}
          </dl>
          <p className={supportingTextClassName}>
            {observationReason ??
              "This request detail view combines canonical telemetry ledger facts with any preserved runtime observation bundle still inside retention."}
          </p>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard
          title="Telemetry summary"
          description="Canonical request facts for source, usage, timings, and endpoint identity."
        >
          <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
            {[
              ["Provider", providerKind],
              ["Model", modelId],
              ["Finish reason", finishReason],
              ["Input tokens", inputTokens === null ? null : String(inputTokens)],
              ["Output tokens", outputTokens === null ? null : String(outputTokens)],
              ["Response status", responseStatus === null ? null : String(responseStatus)],
              ["Recorded", formatDateTime(createdAtMs)],
              ["Profile measured", formatDateTime(measuredAtMs)],
              ["Stream deltas", streamSummary.length > 0 ? streamSummary : null],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[var(--rm-radius-md)] bg-[var(--rm-panel)] p-3">
                <dt className={utilityLabelClassName}>{label}</dt>
                <dd className={`mt-1 ${bodyStrongTextClassName}`}>{renderMetricValue(value)}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard
          title="Observed performance"
          description="Request-level execution telemetry and profile-history posture stay adjacent to tooling and captures."
        >
          <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
            {[
              ["Recent samples", String(profileSampleCount)],
              [
                "Profile failure rate",
                latestProfileFailureRate === null ? null : String(latestProfileFailureRate),
              ],
              ["Latest profile error class", latestProfileErrorClass],
              [
                "Recent sample bundle",
                recentEndpointSamples.length > 0
                  ? `${recentEndpointSamples.length} samples available`
                  : "No recent samples",
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[var(--rm-radius-md)] bg-[var(--rm-panel)] p-3">
                <dt className={utilityLabelClassName}>{label}</dt>
                <dd className={`mt-1 ${bodyStrongTextClassName}`}>{renderMetricValue(value)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <p className={`mb-2 ${compactTitleClassName}`}>Latest profile snapshot</p>
            <CodeBlock>{JSON.stringify(latestProfile, null, 2)}</CodeBlock>
          </div>
        </SectionCard>
      </div>

      <div className="space-y-4">
        <DisclosureSection summary="Routing receipts">
          <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
            {[
              [
                "Effective mode",
                routingModeSummary
                  ? formatRoutingModeLabel(routingModeSummary)
                  : routingModeSummary,
              ],
              ["Mode source", routingModeSource],
              ["Requested override", routingRequestedOverride],
              [
                "Alias mode",
                routingAliasMode ? formatRoutingModeLabel(routingAliasMode) : routingAliasMode,
              ],
              ["Rewrite", rewriteSummary],
              ["Rewrite reason", rewriteReason],
              ["Difficulty bucket", difficultyBucket],
              ["Difficulty strategy", difficultyStrategy],
              ["Controller active", controllerActive === null ? null : String(controllerActive)],
              ["Controller strategy", controllerStrategy],
              ["Controller task type", controllerTaskType],
              ["Hybrid dominant signal", hybridSignal],
              ["Hybrid final strategy", hybridStrategy],
              ["Rubric signals", rubricSignalSummary],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[var(--rm-radius-md)] bg-[var(--rm-panel)] p-3">
                <dt className={utilityLabelClassName}>{label}</dt>
                <dd className={`mt-1 ${bodyStrongTextClassName}`}>{renderMetricValue(value)}</dd>
              </div>
            ))}
          </dl>
        </DisclosureSection>

        <DisclosureSection summary="Routing diagnostics bundle">
          <CodeBlock>
            {JSON.stringify({ routingDiagnostics, hybridArbitration }, null, 2)}
          </CodeBlock>
        </DisclosureSection>
      </div>

      <DisclosureSection summary="Tooling">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <p className={compactTitleClassName}>Tool calls</p>
              <StatusPill tone={toolCalls.length > 0 ? "accent" : "neutral"}>
                {toolCalls.length}
              </StatusPill>
            </div>
            <div className="mt-3 space-y-3">
              {toolCalls.length === 0 ? (
                <EmptyState label="No tool calls were recorded for this request." />
              ) : (
                toolCalls.map((toolCall, index) => (
                  <div
                    key={String((asRecord(toolCall)?.toolCallId as string | undefined) ?? index)}
                    className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-panel)] p-3"
                  >
                    <p className={compactTitleClassName}>
                      {String(asRecord(toolCall)?.toolName ?? "unknown")}
                    </p>
                    <CodeBlock className="mt-3 text-xs">
                      {JSON.stringify(asRecord(toolCall)?.arguments ?? {}, null, 2)}
                    </CodeBlock>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className={compactTitleClassName}>Execution receipts</p>
              <StatusPill tone={toolExecutions.length > 0 ? "success" : "neutral"}>
                {toolExecutions.length}
              </StatusPill>
            </div>
            <div className="mt-3 space-y-3">
              {toolExecutions.length === 0 ? (
                <EmptyState label="No runtime tool executions were persisted for this request." />
              ) : (
                toolExecutions.map((execution, index) => {
                  const executionRecord = asRecord(execution) ?? {};
                  return (
                    <div
                      key={String(executionRecord.executionId ?? index)}
                      className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-panel)] p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={compactTitleClassName}>
                          {String(executionRecord.toolName ?? "Unnamed tool")}
                        </p>
                        {executionRecord.status ? (
                          <StatusPill
                            tone={executionRecord.status === "success" ? "success" : "warning"}
                          >
                            {String(executionRecord.status)}
                          </StatusPill>
                        ) : null}
                      </div>
                      <p className={`mt-2 ${supportingTextClassName}`}>
                        {String(executionRecord.connectorId ?? "Unknown connector")}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {toolDiagnostics.length > 0 ? (
            <CodeBlock>{JSON.stringify(toolDiagnostics, null, 2)}</CodeBlock>
          ) : null}
        </div>
      </DisclosureSection>

      <DisclosureSection summary="Captures and profile">
        <div className="space-y-4">
          {!rawObservationAvailable ? (
            <EmptyState label="Raw observation capture has expired; request detail is reconstructed from the canonical telemetry ledger." />
          ) : null}
          <div className="grid gap-4 xl:grid-cols-2">
            <div>
              <p className={`mb-2 ${compactTitleClassName}`}>Request capture</p>
              {hasRequestCapture ? (
                <CodeBlock>{JSON.stringify(requestCapture, null, 2)}</CodeBlock>
              ) : (
                <EmptyState label="No preserved request capture is available for this request." />
              )}
            </div>
            <div>
              <p className={`mb-2 ${compactTitleClassName}`}>Response capture</p>
              {hasResponseCapture ? (
                <CodeBlock>{JSON.stringify(responseCapture, null, 2)}</CodeBlock>
              ) : (
                <EmptyState label="No preserved response capture is available for this request." />
              )}
            </div>
          </div>
          <div>
            <p className={`mb-2 ${compactTitleClassName}`}>Endpoint profile history</p>
            <CodeBlock>{JSON.stringify({ latestProfile, recentSamples }, null, 2)}</CodeBlock>
          </div>
        </div>
      </DisclosureSection>

      <DisclosureSection summary="Raw observation bundle">
        <CodeBlock>{JSON.stringify(detail.request, null, 2)}</CodeBlock>
      </DisclosureSection>
    </div>
  );
}
