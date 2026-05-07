import { useEffect, useState } from "react";
import { Link } from "react-router";

import { EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard } from "../components/page-primitives";
import { listRowClassName, mutedPanelClassName } from "../lib/design-system";
import { fetchRuntimeSnapshot, type RuntimeSnapshot } from "../lib/runtime-api";

export default function RequestsRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuntimeSnapshot()
      .then(setSnapshot)
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load request ledger."));
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading request ledger…" />;
  }

  const requestsWithEndpoint = snapshot.requests.filter((request) => request.endpointId).length;
  const distinctEndpoints = new Set(snapshot.requests.map((request) => request.endpointId).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Observe"
        title="Request ledger"
        description="Structured runtime requests remain backed by the existing role-model observation APIs."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <FactCard label="Requests" value={snapshot.requests.length} detail="Structured requests currently available in the observation ledger." emphasis />
        <FactCard label="Endpoint-linked" value={requestsWithEndpoint} detail="Requests already tied to a concrete endpoint profile." />
        <FactCard label="Distinct endpoints" value={distinctEndpoints} detail="Unique endpoint ids represented in the current request list." />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard className="col-span-12 xl:col-span-8" title="Recent request ids" description="Open any item to inspect the request artifact and endpoint profile.">
          {snapshot.requests.length === 0 ? (
            <EmptyState label="No requests are available yet." />
          ) : (
            <div className="space-y-3">
              {snapshot.requests.map((request) => (
                <div key={request.requestId} className={`${listRowClassName} md:items-center`}>
                  <div>
                    <p className="font-medium text-[var(--rm-fg)]">{request.requestId}</p>
                    <p className="text-sm text-[var(--rm-secondary)]">{request.endpointId ?? "No endpoint id recorded"}</p>
                  </div>
                  <Link className="text-sm font-medium text-[var(--rm-accent)]" to={`/app/observe/requests/${request.requestId}`}>
                    Inspect
                  </Link>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard className="col-span-12 xl:col-span-4" title="Inspection path" description="Keep the request ledger narrow in scope so the detail page can own deep debugging.">
          <div className="space-y-3">
            <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
              <p className="font-medium text-[var(--rm-fg)]">Reading order</p>
              <p className="mt-2">Scan ids and endpoint links here, then move into Request detail for captures, receipts, and profile data.</p>
            </div>
            <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
              <p className="font-medium text-[var(--rm-fg)]">Adjacent surfaces</p>
              <p className="mt-2">Use Activity for broader host activity and Logs for raw proxy/upstream output when the request ledger is too narrow.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
