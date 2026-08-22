import { MetricStrip } from "@role-model/ui";
import { useEffect, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import { accentActionTextClassName } from "../lib/design-system";
import { startDeferredLiveRefresh } from "../lib/live-refresh";
import {
  type RuntimeActivityCapture,
  type RuntimeActivityLogEntry,
  type RuntimeActivityMetricsPage,
  type RuntimeTelemetrySummary,
  fetchActivityCapture,
  fetchActivityMetricsPage,
  fetchTelemetrySummary,
  subscribeRuntimeRefreshStream,
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
  const [activityPage, setActivityPage] = useState<RuntimeActivityMetricsPage | null>(null);
  const [telemetrySummary, setTelemetrySummary] = useState<RuntimeTelemetrySummary | null>(null);
  const [telemetrySummaryError, setTelemetrySummaryError] = useState<string | null>(null);
  const [selectedCaptureId, setSelectedCaptureId] = useState<number | string | null>(null);
  const [selectedCapture, setSelectedCapture] = useState<RuntimeActivityCapture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [captureLoading, setCaptureLoading] = useState(false);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const [metricsResult, aggregateResult] = await Promise.allSettled([
          fetchActivityMetricsPage({ limit: 50 }),
          fetchTelemetrySummary(),
        ]);
        if (disposed) {
          return;
        }
        if (metricsResult.status === "rejected") {
          throw metricsResult.reason;
        }
        setActivityPage(metricsResult.value);
        setMetrics([...metricsResult.value.items]);
        if (aggregateResult.status === "fulfilled") {
          setTelemetrySummary(aggregateResult.value);
          setTelemetrySummaryError(null);
        } else {
          setTelemetrySummary(null);
          setTelemetrySummaryError(
            aggregateResult.reason instanceof Error
              ? aggregateResult.reason.message
              : "Aggregate telemetry is temporarily unavailable.",
          );
        }
        setSelectedCaptureId(
          (current) =>
            current ??
            metricsResult.value.items.find((entry) => entry.has_capture)?.request_id ??
            metricsResult.value.items.find((entry) => entry.has_capture)?.id ??
            null,
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
      subscribe: (onEvent) => subscribeRuntimeRefreshStream(onEvent),
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

  const summary = buildActivitySummary(metrics, telemetrySummary ?? undefined, {
    aggregateUnavailable: telemetrySummaryError !== null,
  });

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
      {telemetrySummaryError ? (
        <div className="rounded-md border border-[var(--rm-warning)]/40 bg-[var(--rm-warning)]/10 px-4 py-3 text-sm text-[var(--rm-muted)]">
          Aggregate totals are unavailable; the list below is only the bounded recent page.{" "}
          {telemetrySummaryError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <SectionCard
          title="Recent host activity"
          description={
            telemetrySummary
              ? `Showing ${summary.rows.length} of ${telemetrySummary.requestCount} requests in the last 24 hours`
              : activityPage
                ? `Showing ${activityPage.returned} of ${activityPage.totalMatching} requests in the selected window`
                : `Showing ${summary.rows.length} recent requests; total unavailable`
          }
        >
          {summary.rows.length === 0 ? (
            <EmptyState label="No host activity is available yet." />
          ) : (
            <ul className="-mx-5 -mb-5 divide-y divide-[var(--rm-border)]">
              {summary.rows.map((row) => {
                const captureIdentity = row.requestId ?? row.id;
                const active = selectedCaptureId === captureIdentity;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={`flex w-full flex-col gap-1 px-5 py-3 text-left transition-colors ${
                        active
                          ? "bg-[var(--rm-accent-ghost)]"
                          : "hover:bg-[var(--rm-surface-strong)]"
                      }`}
                      onClick={() => {
                        if (row.hasCapture) {
                          setSelectedCaptureId(captureIdentity);
                        }
                      }}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-mono text-[12px] font-semibold text-[var(--rm-fg)]">
                          {row.model}
                        </span>
                        <span className="shrink-0 font-mono text-[11px] text-[var(--rm-muted)]">
                          {new Date(row.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-[13px] text-[var(--rm-muted)]">{row.path}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={Number(row.status) >= 400 ? "warning" : "success"}>
                          {row.status}
                        </Badge>
                        <span className="font-mono text-[11px] text-[var(--rm-muted)]">
                          {row.durationLabel}
                        </span>
                        {row.hasCapture ? (
                          <span className={`ml-auto ${accentActionTextClassName}`}>
                            Inspect capture
                          </span>
                        ) : (
                          <span className="ml-auto text-[12px] text-[var(--rm-muted)]">
                            {row.captureLabel}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Capture inspector">
          <div className="space-y-3">
            {selectedCaptureId === null ? (
              <EmptyState label="Choose a ledger row with a capture to inspect." />
            ) : captureLoading ? (
              <LoadingState label={`Loading capture ${selectedCaptureId}…`} />
            ) : captureError ? (
              <ErrorState label={captureError} />
            ) : !selectedCapture ? (
              <EmptyState label={`Capture ${selectedCaptureId} is not available.`} />
            ) : (
              <>
                <p className="font-mono text-[12px] font-semibold text-[var(--rm-fg)]">
                  capture · {selectedCapture.req_path}
                </p>
                <pre className="max-h-[360px] overflow-auto rounded-md border border-[var(--rm-border)] bg-[var(--rm-panel)] p-3 font-mono text-[11px] leading-4 text-[var(--rm-fg)] whitespace-pre-wrap">
                  {JSON.stringify(
                    {
                      id: selectedCapture.id,
                      req_path: selectedCapture.req_path,
                      req_headers: selectedCapture.req_headers,
                      req_body: decodeCaptureBody(selectedCapture.req_body),
                      resp_headers: selectedCapture.resp_headers,
                      resp_body: decodeCaptureBody(selectedCapture.resp_body),
                    },
                    null,
                    2,
                  )}
                </pre>
              </>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
