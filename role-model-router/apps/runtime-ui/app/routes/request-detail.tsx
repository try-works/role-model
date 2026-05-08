import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { CodeBlock, EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { fetchRequestDetail } from "../lib/runtime-api";

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

function renderMetricValue(value: string | number | null): string | number {
  return value ?? "n/a";
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
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load request detail."));
  }, [requestId]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!detail) {
    return <LoadingState label="Loading request inspector…" />;
  }

  const request = asRecord(detail.request) ?? {};
  const endpointProfile = asRecord(detail.endpointProfile) ?? {};
  const latestProfile = asRecord(endpointProfile.latestProfile) ?? {};
  const recentSamples = Array.isArray(endpointProfile.recentSamples) ? endpointProfile.recentSamples : [];
  const endpointIdentity = asRecord(latestProfile.endpoint_identity ?? latestProfile.endpointIdentity) ?? {};
  const usageEvent = asRecord(request.usageEvent) ?? {};
  const executionTelemetry = asRecord(request.executionTelemetry) ?? {};
  const executionStream = asRecord(executionTelemetry.stream) ?? {};
  const executionStreamSupport = asRecord(executionTelemetry.streamSupport) ?? {};
  const executionPromptCaching = asRecord(executionTelemetry.promptCaching) ?? {};
  const observedPerformance = asRecord(request.observedPerformance) ?? {};
  const observedSample = asRecord(observedPerformance.sample) ?? {};
  const cacheObservability = asRecord(request.cacheObservability) ?? {};
  const tooling = asRecord(request.tooling) ?? {};
  const inspection = asRecord(request.inspection) ?? {};
  const inspectionRequest = asRecord(inspection.request) ?? {};
  const inspectionEndpoint = asRecord(inspection.endpoint) ?? {};
  const requestCapture = asRecord(inspectionRequest.requestCapture) ?? {};
  const responseCapture = asRecord(inspectionRequest.responseCapture) ?? {};
  const toolCalls = Array.isArray(tooling.toolCalls) ? tooling.toolCalls : [];
  const toolExecutions = Array.isArray(tooling.executions) ? tooling.executions : [];
  const toolDiagnostics = Array.isArray(tooling.diagnostics) ? tooling.diagnostics : [];
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
  const actualCostUsd = pickNumber(usageEvent, "cost_actual", "actualCostUsd");
  const estimatedCostUsd = pickNumber(usageEvent, "cost_estimate", "estimatedCostUsd");
  const providerFamily = pickString(executionTelemetry, "providerFamily");
  const finishReason = pickString(executionTelemetry, "finishReason");
  const promptCacheSupported =
    pickBoolean(request, "promptCacheSupported") ??
    pickBoolean(executionPromptCaching, "supported") ??
    false;
  const promptCacheRequested = pickBoolean(cacheObservability, "promptCacheRequested") ?? pickBoolean(request, "promptCacheRequested");
  const promptCacheUsed = pickBoolean(cacheObservability, "promptCacheUsed") ?? pickBoolean(request, "promptCacheUsed");
  const cacheStatus = !promptCacheSupported
    ? "unavailable"
    : promptCacheUsed
      ? "hit"
      : promptCacheRequested
        ? "miss"
        : "ready";
  const responseStatus = asNumber(responseCapture.statusCode);
  const createdAtMs = pickNumber(request, "createdAtMs") ?? pickNumber(usageEvent, "timestamp_ms", "timestampMs");
  const measuredAtMs =
    pickNumber(latestProfile, "measured_at_ms", "measuredAtMs") ??
    pickNumber(observedSample, "timestamp_ms", "timestampMs");
  const modelId = pickString(usageEvent, "model_id", "modelId") ?? pickString(endpointIdentity, "model_id", "modelId");
  const providerKind =
    pickString(usageEvent, "provider_kind", "providerKind") ??
    pickString(endpointIdentity, "provider_kind", "providerKind");
  const endpointId = pickString(request, "endpointId") ?? "unknown";
  const streamTextDeltaCount = pickNumber(request, "streamTextDeltaCount") ?? pickNumber(executionStream, "textDeltas") ?? 0;
  const streamToolCallDeltaCount =
    pickNumber(request, "streamToolCallDeltaCount") ?? pickNumber(executionStream, "toolCallDeltas") ?? 0;
  const streamToolArgumentDeltaCount =
    pickNumber(request, "streamToolArgumentDeltaCount") ?? pickNumber(executionStream, "toolArgumentDeltas") ?? 0;
  const streamTextSupported =
    pickBoolean(request, "streamTextSupported") ??
    (pickString(executionStreamSupport, "text") !== "unsupported");
  const streamToolCallSupported =
    pickBoolean(request, "streamToolCallSupported") ??
    (pickString(executionStreamSupport, "toolCalls") !== "unsupported");
  const streamToolArgumentSupported =
    pickBoolean(request, "streamToolArgumentSupported") ??
    (pickString(executionStreamSupport, "toolArguments") !== "unsupported");
  const streamSummary = [
    streamTextSupported ? `${streamTextDeltaCount} text delta${streamTextDeltaCount === 1 ? "" : "s"}` : null,
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Observe"
        title={requestId}
        description="Telemetry-first request inspection leads with usage, cache, and endpoint facts, while keeping raw captures and the full observation bundle available for debugging."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <FactCard label="Endpoint" value={endpointId} detail="Endpoint id currently associated with the captured request." emphasis />
        <FactCard label="Source" value={renderMetricValue(sourceType)} detail="Canonical source family used by the telemetry ledger." />
        <FactCard label="Provider family" value={renderMetricValue(providerFamily)} detail="Execution adapter family preserved in the canonical telemetry contract." />
        <FactCard label="Latency" value={latencyMs === null ? "n/a" : `${latencyMs} ms`} detail="Observed request latency from the persisted usage event." />
        <FactCard label="Tokens" value={renderMetricValue(totalTokens)} detail="Total token usage when the provider exposed prompt/completion accounting." />
        <FactCard
          label="Cost"
          value={formatUsd(actualCostUsd ?? estimatedCostUsd)}
          detail={actualCostUsd !== null ? "Actual USD cost from the execution receipt." : "Estimated USD cost from the persisted runtime usage event."}
        />
        <FactCard label="Cache" value={renderMetricValue(cacheStatus)} detail="Captured cache posture using explicit support semantics rather than zero-only inference." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Telemetry summary" description="Canonical request facts for source, usage, timings, and endpoint identity.">
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
              <div key={label} className="border-b border-[var(--rm-border)] pb-3">
                <dt className="text-xs uppercase tracking-[0.24em] text-[var(--rm-muted)]">{label}</dt>
                <dd className="mt-1 font-medium text-[var(--rm-fg)]">{renderMetricValue(value)}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard title="Observed performance" description="Request-level execution telemetry and profile-history posture stay adjacent to tooling and captures.">
          <dl className="grid gap-x-6 gap-y-3 text-sm md:grid-cols-2">
            {[
              ["Recent samples", String(profileSampleCount)],
              ["Profile failure rate", latestProfileFailureRate === null ? null : String(latestProfileFailureRate)],
              ["Latest profile error class", latestProfileErrorClass],
              ["Recent sample bundle", recentEndpointSamples.length > 0 ? `${recentEndpointSamples.length} samples available` : "No recent samples"],
            ].map(([label, value]) => (
              <div key={label} className="border-b border-[var(--rm-border)] pb-3">
                <dt className="text-xs uppercase tracking-[0.24em] text-[var(--rm-muted)]">{label}</dt>
                <dd className="mt-1 font-medium text-[var(--rm-fg)]">{renderMetricValue(value)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <p className="mb-2 font-medium text-[var(--rm-fg)]">Latest profile snapshot</p>
            <CodeBlock>{JSON.stringify(latestProfile, null, 2)}</CodeBlock>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Tooling" description="Tool calls, execution receipts, and tooling diagnostics from persisted runtime observability.">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <p className="font-medium text-[var(--rm-fg)]">Tool calls</p>
                <StatusPill tone={toolCalls.length > 0 ? "accent" : "neutral"}>{toolCalls.length}</StatusPill>
              </div>
              <div className="mt-3 space-y-3">
                {toolCalls.length === 0 ? (
                  <EmptyState label="No tool calls were recorded for this request." />
                ) : (
                  toolCalls.map((toolCall, index) => (
                    <div key={String((asRecord(toolCall)?.toolCallId as string | undefined) ?? index)} className="rounded-none border border-[var(--rm-border)] bg-[var(--rm-panel)] p-3">
                      <p className="font-medium text-[var(--rm-fg)]">
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
                <p className="font-medium text-[var(--rm-fg)]">Execution receipts</p>
                <StatusPill tone={toolExecutions.length > 0 ? "success" : "neutral"}>{toolExecutions.length}</StatusPill>
              </div>
              <div className="mt-3 space-y-3">
                {toolExecutions.length === 0 ? (
                  <EmptyState label="No runtime tool executions were persisted for this request." />
                ) : (
                  toolExecutions.map((execution, index) => {
                    const executionRecord = asRecord(execution) ?? {};
                    return (
                      <div key={String(executionRecord.executionId ?? index)} className="rounded-none border border-[var(--rm-border)] bg-[var(--rm-panel)] p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-[var(--rm-fg)]">{String(executionRecord.toolName ?? "Unnamed tool")}</p>
                          {executionRecord.status ? (
                            <StatusPill tone={executionRecord.status === "success" ? "success" : "warning"}>
                              {String(executionRecord.status)}
                            </StatusPill>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm text-[var(--rm-secondary)]">
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
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Captures and profile" description="Preserved request/response captures plus the linked endpoint profile remain available as secondary debug surfaces.">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <div>
                <p className="mb-2 font-medium text-[var(--rm-fg)]">Request capture</p>
                <CodeBlock>{JSON.stringify(requestCapture, null, 2)}</CodeBlock>
              </div>
              <div>
                <p className="mb-2 font-medium text-[var(--rm-fg)]">Response capture</p>
                <CodeBlock>{JSON.stringify(responseCapture, null, 2)}</CodeBlock>
              </div>
            </div>
            <div>
              <p className="mb-2 font-medium text-[var(--rm-fg)]">Endpoint profile history</p>
              <CodeBlock>{JSON.stringify({ latestProfile, recentSamples }, null, 2)}</CodeBlock>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Raw observation bundle" description="The full persisted request observation stays visible for low-level debugging and audit trails.">
          <CodeBlock>{JSON.stringify(detail.request, null, 2)}</CodeBlock>
        </SectionCard>
      </div>
    </div>
  );
}
