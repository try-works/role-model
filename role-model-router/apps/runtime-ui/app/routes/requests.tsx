import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import { listRowClassName, secondaryButtonClassName } from "../lib/design-system";
import {
  type RuntimeTelemetryDashboard,
  fetchTelemetryDashboard,
  subscribeTelemetryStream,
} from "../lib/runtime-api";
import { buildTelemetryRequestRows, summarizeTelemetryStats } from "../lib/view-models";

export default function RequestsRoute() {
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
          setError(value instanceof Error ? value.message : "Could not load telemetry ledger.");
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
    return <LoadingState label="Loading telemetry ledger…" />;
  }

  const statCards = summarizeTelemetryStats(dashboard.summary);
  const ledgerRows = buildTelemetryRequestRows(dashboard.requests);

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

      <SectionCard
        title="Adjacent raw-host tools"
        description="Use preserved host surfaces when you need raw metrics, captures, or combined logs beyond the canonical request ledger."
      >
        <div className="flex flex-wrap gap-3">
          <Link className={secondaryButtonClassName} to="/app/observe/activity">
            Host activity & captures
          </Link>
          <Link className={secondaryButtonClassName} to="/app/observe/logs">
            Host logs
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Recent telemetry requests">
        {ledgerRows.length === 0 ? (
          <EmptyState label="No requests are available yet." />
        ) : (
          <div className="space-y-3">
            {ledgerRows.map((request) => (
              <div key={request.requestId} className={`${listRowClassName} md:items-center`}>
                <div>
                  <p className="font-medium text-[var(--rm-fg)]">{request.requestId}</p>
                  <p className="text-sm text-[var(--rm-secondary)]">{request.endpointId}</p>
                  <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                    Routing decision • {request.routingDecisionLabel}
                  </p>
                  <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                    {request.sourceLabel} • {request.statusLabel} • {request.latencyLabel} •{" "}
                    {request.tokenLabel} • {request.costLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                    {request.createdAtLabel}
                  </p>
                  <Link
                    className="mt-2 inline-block text-sm font-medium text-[var(--rm-accent)]"
                    to={`/app/observe/requests/${request.requestId}`}
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
