import { useEffect, useState } from "react";
import { Link } from "react-router";

import { EmptyState, ErrorState, LoadingState, PageHeader, SectionCard } from "../components/page-primitives";
import { listRowClassName } from "../lib/design-system";
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Requests"
        title="Request ledger"
        description="Structured runtime requests remain backed by the existing role-model observation APIs."
      />

      <SectionCard title="Recent request ids" description="Open any item to inspect the request artifact and endpoint profile.">
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
                <Link className="text-sm font-medium text-[var(--rm-accent)]" to={`/app/requests/${request.requestId}`}>
                  Inspect
                </Link>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
