import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { CodeBlock, EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { fetchRequestDetail } from "../lib/runtime-api";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
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
  const tooling = asRecord(request.tooling) ?? {};
  const inspection = asRecord(request.inspection) ?? {};
  const inspectionRequest = asRecord(inspection.request) ?? {};
  const requestCapture = asRecord(inspectionRequest.requestCapture) ?? {};
  const responseCapture = asRecord(inspectionRequest.responseCapture) ?? {};
  const toolCalls = Array.isArray(tooling.toolCalls) ? tooling.toolCalls : [];
  const toolExecutions = Array.isArray(tooling.executions) ? tooling.executions : [];
  const toolDiagnostics = Array.isArray(tooling.diagnostics) ? tooling.diagnostics : [];
  const requestCaptureCount = Object.keys(requestCapture).length;
  const responseCaptureCount = Object.keys(responseCapture).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Observe"
        title={requestId}
        description="Structured request inspection now breaks tooling, captures, diagnostics, and endpoint profile data into separate operator panels."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Endpoint" value={String(request.endpointId ?? "unknown")} detail="Endpoint id currently associated with the captured request." emphasis />
        <FactCard label="Tool calls" value={toolCalls.length} detail="Declared tool calls emitted during this request." />
        <FactCard label="Executions" value={toolExecutions.length} detail="Persisted runtime execution receipts linked to the request." />
        <FactCard label="Capture fields" value={requestCaptureCount + responseCaptureCount} detail="Combined request and response capture field count surfaced by inspection." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
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

        <SectionCard title="Inspection and profile" description="Raw capture payloads and the linked endpoint profile remain available for deeper debugging.">
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
              <p className="mb-2 font-medium text-[var(--rm-fg)]">Endpoint profile</p>
              <CodeBlock>{JSON.stringify(detail.endpointProfile, null, 2)}</CodeBlock>
            </div>
            <div>
              <p className="mb-2 font-medium text-[var(--rm-fg)]">Raw observation bundle</p>
              <CodeBlock>{JSON.stringify(detail.request, null, 2)}</CodeBlock>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
