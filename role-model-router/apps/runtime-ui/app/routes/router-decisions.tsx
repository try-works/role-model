import { useEffect, useState } from "react";
import { Link } from "react-router";

import { EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard } from "../components/page-primitives";
import { listRowClassName } from "../lib/design-system";
import { fetchRouterDecisions, type RouterDecisionListItem, subscribeTelemetryStream } from "../lib/runtime-api";

export default function RouterDecisionsRoute() {
  const [decisions, setDecisions] = useState<readonly RouterDecisionListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const value = await fetchRouterDecisions();
        if (!disposed) {
          setDecisions(value);
          setError(null);
        }
      } catch (nextError) {
        if (!disposed) {
          setError(nextError instanceof Error ? nextError.message : "Could not load router decisions.");
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

  const header = (
    <PageHeader
      eyebrow="Router"
      title="Routing decisions"
      description="Follow recent routing outcomes as explainable records, then drill into the decision detail or jump to Observe when you need the deeper request trace."
    />
  );

  if (error) {
    return <div className="space-y-6">{header}<ErrorState label={error} /></div>;
  }
  if (!decisions) {
    return <div className="space-y-6">{header}<LoadingState label="Loading routing decisions…" /></div>;
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-4 md:grid-cols-3">
        <FactCard label="Decisions" value={decisions.length} detail="Recent request-backed routing decisions in the canonical Router ledger." emphasis />
        <FactCard label="Local" value={decisions.filter((decision) => decision.sourceType === "local").length} detail="Recent decisions resolved to local execution surfaces." />
        <FactCard label="Remote" value={decisions.filter((decision) => decision.sourceType === "remote").length} detail="Recent decisions resolved to remote execution surfaces." />
      </div>

      <SectionCard title="Decision ledger" description="Keep the list scanable: request, chosen endpoint/model, strategy summary, and direct drill-in links.">
        {decisions.length === 0 ? (
          <EmptyState label="No routing decisions have been recorded yet." />
        ) : (
          <div className="space-y-3">
            {decisions.map((decision) => (
              <div key={decision.requestId} className={`${listRowClassName} md:items-center`}>
                <div>
                  <p className="font-medium text-[var(--rm-fg)]">{decision.requestId}</p>
                  <p className="text-sm text-[var(--rm-secondary)]">{decision.selectedEndpointId}</p>
                  <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                    {decision.selectedModelId ?? "unknown model"} • {decision.strategyLabel ?? "no strategy label"} • {decision.sourceType ?? "unknown source"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right">
                  <p className="text-xs uppercase tracking-[0.24em] text-[var(--rm-muted)]">
                    {decision.decidedAtMs ? new Date(decision.decidedAtMs).toLocaleString() : "n/a"}
                  </p>
                  <Link className="text-sm font-medium text-[var(--rm-accent)]" to={`/app/router/decisions/${decision.requestId}`}>
                    Open Router detail
                  </Link>
                  <Link className="text-sm text-[var(--rm-secondary)]" to={`/app/observe/requests/${decision.requestId}`}>
                    Open Observe detail
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
