import { useEffect, useState } from "react";

import {
  CodeBlock,
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  listRowClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import {
  type RuntimeActivityCapture,
  type RuntimeActivityLogEntry,
  fetchActivityCapture,
  fetchActivityMetrics,
} from "../lib/runtime-api";
import { buildActivitySummary } from "../lib/view-models";

function decodeCaptureBody(encoded: string): string {
  try {
    return typeof globalThis.atob === "function" ? globalThis.atob(encoded) : encoded;
  } catch {
    return encoded;
  }
}

export default function ObserveActivityRoute() {
  const [metrics, setMetrics] = useState<RuntimeActivityLogEntry[] | null>(null);
  const [selectedCaptureId, setSelectedCaptureId] = useState<number | null>(null);
  const [selectedCapture, setSelectedCapture] = useState<RuntimeActivityCapture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureLoading, setCaptureLoading] = useState(false);

  useEffect(() => {
    void fetchActivityMetrics()
      .then((value) => {
        setMetrics(value);
        setSelectedCaptureId(
          (current) => current ?? value.find((entry) => entry.has_capture)?.id ?? null,
        );
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load activity metrics."),
      );
  }, []);

  useEffect(() => {
    if (selectedCaptureId === null) {
      setSelectedCapture(null);
      setCaptureError(null);
      setCaptureLoading(false);
      return;
    }

    setCaptureLoading(true);
    setCaptureError(null);
    void fetchActivityCapture(selectedCaptureId)
      .then((value) => {
        setSelectedCapture(value);
        if (!value) {
          setCaptureError(`Capture ${selectedCaptureId} is no longer available.`);
        }
      })
      .catch((value: unknown) =>
        setCaptureError(
          value instanceof Error ? value.message : `Could not load capture ${selectedCaptureId}.`,
        ),
      )
      .finally(() => setCaptureLoading(false));
  }, [selectedCaptureId]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!metrics) {
    return <LoadingState label="Loading activity ledger…" />;
  }

  const summary = buildActivitySummary(metrics);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Observe"
        title="Activity and metrics"
        description="Host request activity, capture drill-ins, and raw vendor observability stay in one compact operator ledger instead of being split across duplicate pages."
        actions={
          <>
            <a className={secondaryButtonClassName} href="/api/metrics">
              Raw metrics
            </a>
            <a className={secondaryButtonClassName} href="/api/events">
              Event stream
            </a>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summary.facts.map((fact) => (
          <FactCard
            key={fact.label}
            label={fact.label}
            value={fact.value}
            detail={fact.detail}
            emphasis={fact.label === "Entries"}
          />
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard
          className="col-span-12 xl:col-span-8"
          title="Recent host activity"
          description="Scan the latest vendor metrics first, then pull a concrete capture into the inspector when you need payload-level detail."
        >
          {summary.rows.length === 0 ? (
            <EmptyState label="No host activity is available yet." />
          ) : (
            <div className="space-y-3">
              {summary.rows.map((row) => (
                <div key={row.id} className={listRowClassName}>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--rm-fg)]">{row.model}</p>
                      <StatusPill tone={Number(row.status) >= 400 ? "warning" : "success"}>
                        {row.status}
                      </StatusPill>
                    </div>
                    <p className="text-sm text-[var(--rm-secondary)]">{row.path}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-[var(--rm-muted)]">
                      <span>Id {row.id}</span>
                      <span>{row.durationLabel}</span>
                      <span>{row.inputTokens} input</span>
                      <span>{row.outputTokens} output</span>
                      <span>{row.cacheTokens} cached</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <p className="text-xs uppercase tracking-[0.16em] text-[var(--rm-muted)]">
                      {new Date(row.timestamp).toLocaleString()}
                    </p>
                    {row.hasCapture ? (
                      <button
                        className="text-sm font-medium text-[var(--rm-accent)]"
                        onClick={() => setSelectedCaptureId(row.id)}
                        type="button"
                      >
                        Inspect capture
                      </button>
                    ) : (
                      <span className="text-sm text-[var(--rm-secondary)]">{row.captureLabel}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          className="col-span-12 xl:col-span-4"
          title="Capture inspector"
          description="Request and response bodies remain secondary to the ledger, but stay one click away when raw payload audit is needed."
        >
          <div className="space-y-3">
            <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
              <p className="font-medium text-[var(--rm-fg)]">Reading order</p>
              <p className="mt-2">
                Use the ledger to spot failing paths or suspicious latencies, then move into
                captures only for the entries that need raw payload inspection.
              </p>
            </div>
            {selectedCaptureId === null ? (
              <EmptyState label="Choose a ledger row with a capture to inspect raw request and response bodies." />
            ) : captureLoading ? (
              <LoadingState label={`Loading capture ${selectedCaptureId}…`} />
            ) : captureError ? (
              <ErrorState label={captureError} />
            ) : !selectedCapture ? (
              <EmptyState label={`Capture ${selectedCaptureId} is not available.`} />
            ) : (
              <>
                <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                  <p className="font-medium text-[var(--rm-fg)]">{selectedCapture.req_path}</p>
                  <p className="mt-2">Capture {selectedCapture.id}</p>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--rm-muted)]">
                    Request headers
                  </p>
                  <CodeBlock>{JSON.stringify(selectedCapture.req_headers, null, 2)}</CodeBlock>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--rm-muted)]">
                    Request body
                  </p>
                  <CodeBlock>{decodeCaptureBody(selectedCapture.req_body) || "(empty)"}</CodeBlock>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--rm-muted)]">
                    Response headers
                  </p>
                  <CodeBlock>{JSON.stringify(selectedCapture.resp_headers, null, 2)}</CodeBlock>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--rm-muted)]">
                    Response body
                  </p>
                  <CodeBlock>{decodeCaptureBody(selectedCapture.resp_body) || "(empty)"}</CodeBlock>
                </div>
              </>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
