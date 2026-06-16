import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { listRowClassName, mutedPanelClassName } from "../lib/design-system";
import {
  type RuntimeSnapshot,
  type RuntimeSummary,
  type RuntimeTelemetryDashboard,
  fetchRuntimeSnapshot,
  fetchRuntimeSummary,
  fetchTelemetryDashboard,
  subscribeTelemetryStream,
} from "../lib/runtime-api";
import {
  buildDashboardLatestRequestRows,
  buildEndpointCatalogRows,
  summarizeTelemetryStats,
} from "../lib/view-models";

export default function DashboardRoute() {
  const [summary, setSummary] = useState<RuntimeSummary | null>(null);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [dashboard, setDashboard] = useState<RuntimeTelemetryDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const [nextSummary, nextSnapshot, nextDashboard] = await Promise.all([
          fetchRuntimeSummary(),
          fetchRuntimeSnapshot(),
          fetchTelemetryDashboard(),
        ]);
        if (!disposed) {
          setSummary(nextSummary);
          setSnapshot(nextSnapshot);
          setDashboard(nextDashboard);
          setError(null);
        }
      } catch (value) {
        if (!disposed) {
          setError(value instanceof Error ? value.message : "Could not load runtime overview.");
        }
      }
    };

    void load();
    const unsubscribe = subscribeTelemetryStream(() => {
      void load();
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!summary || !snapshot || !dashboard) {
    return <LoadingState label="Loading runtime overview…" />;
  }

  const endpointRows = buildEndpointCatalogRows(snapshot.endpoints);
  const telemetryCards = summarizeTelemetryStats(dashboard.summary);
  const requestRows = buildDashboardLatestRequestRows(dashboard.requests);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Recent telemetry window"
        description="These cards are the primary overview summary and reflect the recent structured request ledger."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {telemetryCards.map((card, index) => (
            <FactCard
              key={card.label}
              label={card.label}
              value={card.value}
              detail={card.detail}
              emphasis={index === 0}
            />
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard className="col-span-12 xl:col-span-8" title="Current endpoint inventory">
          {endpointRows.length === 0 ? (
            <EmptyState label="No routable endpoints are available yet." />
          ) : (
            <div className="space-y-3">
              {endpointRows.map((row) => (
                <div key={row.endpointId} className={`${listRowClassName} md:items-center`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--rm-fg)]">
                        {row.modelId}
                      </p>
                      <StatusPill tone={row.sourceLabel === "Remote" ? "accent" : "neutral"}>
                        {row.sourceLabel}
                      </StatusPill>
                      <StatusPill
                        tone={
                          row.healthStatus === "healthy" || row.status === "active"
                            ? "success"
                            : "warning"
                        }
                      >
                        {row.healthStatus}
                      </StatusPill>
                    </div>
                    <p className="text-sm text-[var(--rm-secondary)]">{row.endpointId}</p>
                    <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                      {row.providerLabel} • {row.endpointKind} • {row.servingSource}
                    </p>
                  </div>
                  <p className="text-right text-sm text-[var(--rm-secondary)]">{row.status}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="col-span-12 space-y-4 xl:col-span-4">
          <SectionCard title="Latest requests">
            {requestRows.length === 0 ? (
              <EmptyState label="No recent requests yet." />
            ) : (
              <div className="space-y-2">
                {requestRows.map((request) => (
                  <div
                    key={request.requestId}
                    className={`${mutedPanelClassName} flex flex-col gap-2 p-3 text-sm`}
                  >
                    <span className="font-medium text-[var(--rm-fg)]">{request.primaryLabel}</span>
                    {request.secondaryLabel ? (
                      <span className="text-[var(--rm-secondary)]">{request.secondaryLabel}</span>
                    ) : null}
                    <span className="text-[var(--rm-secondary)]">{request.endpointLabel}</span>
                    <span className="text-[var(--rm-secondary)]">
                      {request.statusLabel} • {request.latencyLabel} • {request.tokenLabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link
              className="mt-4 inline-block text-sm font-medium text-[var(--rm-accent)]"
              to="/app/observe/requests"
            >
              View all requests →
            </Link>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
