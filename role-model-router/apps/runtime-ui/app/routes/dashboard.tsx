import { useEffect, useState } from "react";
import { Link } from "react-router";

import { EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { listRowClassName, mutedPanelClassName } from "../lib/design-system";
import { fetchRuntimeSnapshot, type RuntimeSnapshot } from "../lib/runtime-api";
import { buildProviderCards } from "../lib/view-models";

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
  const lifecycleSummary = snapshot.summary.lifecycleSummary;
  const distinctRequestEndpoints = new Set(snapshot.requests.map((request) => request.endpointId).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Runtime overview"
        description="A repo-owned summary of the live runtime, provider onboarding status, and recent request activity."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Providers" value={snapshot.summary.providerCount} detail="Catalog-backed provider families currently surfaced in Control." emphasis />
        <FactCard label="Accounts" value={snapshot.summary.accountCount} detail="Persisted provider accounts available for endpoint activation." />
        <FactCard label="Endpoints" value={snapshot.summary.endpointCount} detail="Live registry entries across local and runtime-managed sources." />
        <FactCard
          label="Observed requests"
          value={snapshot.requests.length}
          detail={`${distinctRequestEndpoints} endpoint${distinctRequestEndpoints === 1 ? "" : "s"} represented in the recent observation ledger.`}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard className="col-span-12 xl:col-span-8" title="Recent requests" description="Structured observation reads from the runtime host bridge.">
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
                  <Link className="text-sm font-medium text-[var(--rm-accent)]" to={`/app/observe/requests/${request.requestId}`}>
                    Open inspector
                  </Link>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="col-span-12 space-y-4 xl:col-span-4">
          <SectionCard title="Runtime pulse" description="Keep the high-attention lifecycle read in a narrow rail beside the dominant request ledger.">
            <div className="space-y-3">
              <div className={`${mutedPanelClassName} p-4`}>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">Lifecycle</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill tone="success">Active {lifecycleSummary?.active ?? 0}</StatusPill>
                  <StatusPill tone="warning">Degraded {lifecycleSummary?.degraded ?? 0}</StatusPill>
                  <StatusPill tone="neutral">Offline {lifecycleSummary?.offline ?? 0}</StatusPill>
                </div>
              </div>
              <div className={`${mutedPanelClassName} p-4`}>
                <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">Observation path</p>
                <p className="mt-3 max-w-[28ch] text-sm leading-6 text-[var(--rm-secondary)]">
                  Use Overview for the fast runtime read, then move into Requests for the full ledger and detail inspectors.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Provider surfaces" description="The operator-facing provider rail keeps onboarding readiness subordinate to the main activity view.">
            <div className="space-y-3">
              {providerCards.map((card) => (
                <div key={card.providerId} className={`${mutedPanelClassName} p-4`}>
                  <div className="flex items-center justify-between gap-3">
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
    </div>
  );
}
