import { useEffect, useState } from "react";
import { Link } from "react-router";

import { EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { listRowClassName, mutedPanelClassName } from "../lib/design-system";
import { fetchTelemetryDashboard, subscribeTelemetryStream, type RuntimeTelemetryDashboard } from "../lib/runtime-api";
import { buildTelemetryComparisonCards, buildTelemetryRequestRows, summarizeTelemetryStats } from "../lib/view-models";

export default function DashboardRoute() {
  const [dashboard, setDashboard] = useState<RuntimeTelemetryDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const result = await fetchTelemetryDashboard();
        if (!disposed) {
          setDashboard(result);
          setError(null);
        }
      } catch (value) {
        if (!disposed) {
          setError(value instanceof Error ? value.message : "Could not load runtime telemetry.");
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
  if (!dashboard) {
    return <LoadingState label="Loading runtime telemetry…" />;
  }

  const statCards = summarizeTelemetryStats(dashboard.summary);
  const comparisonCards = buildTelemetryComparisonCards(dashboard.rows);
  const requestRows = buildTelemetryRequestRows(dashboard.requests);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Unified telemetry"
        description="One structured local-plus-remote telemetry surface for the runtime summary, comparison rows, and freshest request activity."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card, index) => (
          <FactCard
            key={card.label}
            label={card.label}
            value={card.value}
            detail={card.detail}
            emphasis={index === 0}
          />
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard
          className="col-span-12 xl:col-span-8"
          title="Endpoint comparison"
          description="Canonical telemetry rows group local and remote request volume, latency, cache posture, and cost into one comparison rail."
        >
          {comparisonCards.length === 0 ? (
            <EmptyState label="No telemetry comparison rows are available yet." />
          ) : (
            <div className="space-y-3">
              {comparisonCards.map((row) => (
                <div key={row.endpointId} className={`${listRowClassName} md:items-center`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--rm-fg)]">{row.modelId ?? row.endpointId}</p>
                      <StatusPill tone={row.sourceLabel === "Remote" ? "accent" : "neutral"}>{row.sourceLabel}</StatusPill>
                      <StatusPill tone={row.statusLabel === "healthy" || row.statusLabel === "active" ? "success" : "warning"}>
                        {row.statusLabel}
                      </StatusPill>
                    </div>
                    <p className="text-sm text-[var(--rm-secondary)]">{row.endpointId}</p>
                    <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                      {row.requestCountLabel} • {row.latencyLabel} • {row.tokenLabel} • {row.costLabel}
                    </p>
                    <p className="mt-1 text-sm text-[var(--rm-secondary)]">
                      {row.providerLabel} • {row.cacheLabel} • {row.reliabilityLabel}
                    </p>
                  </div>
                  <p className="text-right text-sm text-[var(--rm-secondary)]">{row.roleSummary}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="col-span-12 space-y-4 xl:col-span-4">
          <SectionCard title="Latest requests" description="The freshest structured request rows stay adjacent to the comparison board and refresh via SSE.">
            <div className="space-y-3">
              {requestRows.slice(0, 5).map((request) => (
                <div key={request.requestId} className={`${mutedPanelClassName} p-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--rm-fg)]">{request.requestId}</p>
                      <p className="text-sm text-[var(--rm-secondary)]">{request.endpointId}</p>
                    </div>
                    <StatusPill tone={request.sourceLabel === "Remote" ? "accent" : "neutral"}>
                      {request.sourceLabel}
                    </StatusPill>
                   </div>
                   <p className="mt-3 text-sm text-[var(--rm-secondary)]">
                     {request.statusLabel} • {request.latencyLabel} • {request.tokenLabel}
                   </p>
                   <p className="mt-1 text-sm text-[var(--rm-secondary)]">
                     {request.providerFamilyLabel} • {request.finishReasonLabel} • {request.cacheLabel}
                   </p>
                   <div className="mt-3 flex items-center justify-between gap-3">
                     <span className="text-xs uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                       {request.createdAtLabel}
                    </span>
                    <Link className="text-sm font-medium text-[var(--rm-accent)]" to={`/app/observe/requests/${request.requestId}`}>
                      Inspect
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Reading order" description="Structured telemetry leads; preserved raw host tooling remains adjacent.">
            <div className="space-y-3">
              <div className={`${mutedPanelClassName} p-4`}>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">Canonical first</p>
                <p className="mt-3 max-w-[28ch] text-sm leading-6 text-[var(--rm-secondary)]">
                  Overview now leads with structured role-model telemetry. Use Requests for the full ledger and request inspector.
                </p>
              </div>
              <div className={`${mutedPanelClassName} p-4`}>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">Raw adjacency</p>
                <p className="mt-3 max-w-[28ch] text-sm leading-6 text-[var(--rm-secondary)]">
                  Observe &gt; Activity stays available for raw host metrics and captures when you need preserved llama-swap operator detail.
                </p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
