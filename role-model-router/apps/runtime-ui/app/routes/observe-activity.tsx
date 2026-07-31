import { useEffect, useState } from "react";
import { MetricStrip } from "@role-model/ui";

import {
  CodeBlock,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  accentActionTextClassName,
  bodyStrongTextClassName,
  compactTitleClassName,
  listRowClassName,
  metaTextClassName,
  mutedPanelClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { startDeferredLiveRefresh } from "../lib/live-refresh";
import {
  type RuntimeActivityCapture,
  type RuntimeActivityLogEntry,
  fetchActivityCapture,
  fetchActivityMetrics,
  subscribeTelemetryStream,
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
    let disposed = false;
    const load = async () => {
      try {
        const value = await fetchActivityMetrics();
        if (disposed) {
          return;
        }
        setMetrics(value);
        setSelectedCaptureId(
          (current) => current ?? value.find((entry) => entry.has_capture)?.id ?? null,
        );
        setError(null);
      } catch (value) {
        if (!disposed) {
          setError(value instanceof Error ? value.message : "Could not load activity metrics.");
        }
      }
    };

    const dispose = startDeferredLiveRefresh({
      load: async () => {
        await load();
      },
      subscribe: (onEvent) => subscribeTelemetryStream(onEvent),
    });

    return () => {
      disposed = true;
      dispose();
    };
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
      <MetricStrip
        variant="panel"
        items={summary.facts.map((fact) => ({
          id: fact.label,
          label: fact.label,
          value: fact.value,
        }))}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <SectionCard title="Recent host activity">
          {summary.rows.length === 0 ? (
            <EmptyState label="No host activity is available yet." />
          ) : (
            <div className="space-y-3">
              {summary.rows.map((row) => (
                <div key={row.id} className={listRowClassName}>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={compactTitleClassName}>{row.model}</p>
                      <StatusPill tone={Number(row.status) >= 400 ? "warning" : "success"}>
                        {row.status}
                      </StatusPill>
                    </div>
                    <p className={supportingTextClassName}>{row.path}</p>
                    <div className={`flex flex-wrap gap-x-4 gap-y-2 ${metaTextClassName}`}>
                      <span>Id {row.id}</span>
                      <span>{row.durationLabel}</span>
                      <span>{row.inputTokens} input</span>
                      <span>{row.outputTokens} output</span>
                      <span>{row.cacheTokens} cached</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-start gap-2 md:items-end">
                    <p className={metaTextClassName}>{new Date(row.timestamp).toLocaleString()}</p>
                    {row.hasCapture ? (
                      <button
                        className={accentActionTextClassName}
                        onClick={() => setSelectedCaptureId(row.id)}
                        type="button"
                      >
                        Inspect capture
                      </button>
                    ) : (
                      <span className={supportingTextClassName}>{row.captureLabel}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Capture inspector">
          <div className="space-y-3">
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
                <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                  <p className={compactTitleClassName}>{selectedCapture.req_path}</p>
                  <p className={bodyStrongTextClassName}>Capture {selectedCapture.id}</p>
                </div>
                <div>
                  <p className={`mb-2 ${metaTextClassName}`}>Request headers</p>
                  <CodeBlock>{JSON.stringify(selectedCapture.req_headers, null, 2)}</CodeBlock>
                </div>
                <div>
                  <p className={`mb-2 ${metaTextClassName}`}>Request body</p>
                  <CodeBlock>{decodeCaptureBody(selectedCapture.req_body) || "(empty)"}</CodeBlock>
                </div>
                <div>
                  <p className={`mb-2 ${metaTextClassName}`}>Response headers</p>
                  <CodeBlock>{JSON.stringify(selectedCapture.resp_headers, null, 2)}</CodeBlock>
                </div>
                <div>
                  <p className={`mb-2 ${metaTextClassName}`}>Response body</p>
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
