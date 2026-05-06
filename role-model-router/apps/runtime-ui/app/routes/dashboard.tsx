import { useEffect, useState } from "react";
import { Link } from "react-router";

import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard, StatCard, StatusPill } from "../components/page-primitives";
import { listRowClassName, mutedPanelClassName } from "../lib/design-system";
import { fetchRuntimeSnapshot, type RuntimeSnapshot } from "../lib/runtime-api";
import { buildProviderCards, summarizeRuntimeStats } from "../lib/view-models";

export default function DashboardRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then(setSnapshot)
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load runtime snapshot."));
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading runtime dashboard…" />;
  }

  const providerCards = buildProviderCards(snapshot.providers, snapshot.accounts);
  const statCards = summarizeRuntimeStats(snapshot.summary);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Runtime overview"
        description="A repo-owned summary of the live runtime, provider onboarding status, and recent request activity."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {statCards.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Recent requests" description="Structured observation reads from the runtime host bridge.">
          {snapshot.requests.length === 0 ? (
            <EmptyState label="No structured requests have been captured yet." />
          ) : (
              <div className="space-y-3">
                {snapshot.requests.slice(0, 5).map((request) => (
                <div key={request.requestId} className={`${listRowClassName} md:items-center`}>
                  <div>
                    <p className="font-medium text-[var(--rm-fg)]">{request.requestId}</p>
                    <p className="text-sm text-[var(--rm-secondary)]">{request.endpointId ?? "No endpoint recorded yet"}</p>
                  </div>
                  <Link className="text-sm font-medium text-[var(--rm-accent)]" to={`/app/requests/${request.requestId}`}>
                    Open inspector
                  </Link>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Provider surfaces" description="The first operator-visible onboarding cards from the control-plane data model.">
          <div className="space-y-3">
            {providerCards.map((card) => (
              <div key={card.providerId} className={`${mutedPanelClassName} p-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{card.title}</h3>
                    <p className="text-sm text-[var(--rm-secondary)]">{card.accountCount} account(s)</p>
                  </div>
                  <StatusPill tone="neutral">{card.providerId}</StatusPill>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.variants.map((variant) => (
                    <StatusPill key={variant.variantId} tone={variant.availability === "ready" ? "success" : "warning"}>
                      {variant.label}
                    </StatusPill>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
