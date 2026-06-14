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
  type RuntimeTelemetryDashboard,
  fetchTelemetryDashboard,
  subscribeTelemetryStream,
} from "../lib/runtime-api";
import {
  buildTelemetryComparisonCards,
  buildTelemetryRequestRows,
  summarizeTelemetryStats,
} from "../lib/view-models";

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
        <SectionCard className="col-span-12 xl:col-span-8" title="Endpoint comparison">
          {comparisonCards.length === 0 ? (
            <EmptyState label="No telemetry comparison rows are available yet." />
          ) : (
            <div className="space-y-3">
              {comparisonCards.map((row) => (
                <div key={row.endpointId} className={`${listRowClassName} md:items-center`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-[var(--rm-fg)]">
                        {row.modelId ?? row.endpointId}
                      </p>
                      <StatusPill tone={row.sourceLabel === "Remote" ? "accent" : "neutral"}>
                        {row.sourceLabel}
                      </StatusPill>
                      <StatusPill
                        tone={
                          row.statusLabel === "healthy" || row.statusLabel === "active"
                            ? "success"
                            : "warning"
                        }
                      >
                        {row.statusLabel}
                      </StatusPill>
                    </div>
                    <p className="text-sm text-[var(--rm-secondary)]">{row.endpointId}</p>
                    <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                      {row.requestCountLabel} • {row.latencyLabel} • {row.tokenLabel} •{" "}
                      {row.costLabel}
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
          <SectionCard title="Latest requests">
            {requestRows.length === 0 ? (
              <EmptyState label="No recent requests yet." />
            ) : (
              <div className="space-y-2">
                {requestRows.slice(0, 3).map((request) => (
                  <div
                    key={request.requestId}
                    className={`${mutedPanelClassName} flex items-center justify-between gap-3 p-3 text-sm`}
                  >
                    <span className="font-medium text-[var(--rm-fg)]">{request.requestId}</span>
                    <span className="text-[var(--rm-secondary)]">
                      {request.statusLabel} • {request.latencyLabel}
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
