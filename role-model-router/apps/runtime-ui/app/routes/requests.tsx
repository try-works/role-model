import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
} from "../components/page-primitives";
import { listRowClassName, mutedPanelClassName } from "../lib/design-system";
import {
  type RuntimeTelemetryRequestRecord,
  fetchTelemetryRequests,
  subscribeTelemetryStream,
} from "../lib/runtime-api";
import { buildTelemetryRequestRows } from "../lib/view-models";

export default function RequestsRoute() {
  const [requests, setRequests] = useState<readonly RuntimeTelemetryRequestRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const result = await fetchTelemetryRequests({ limit: 50 });
        if (!disposed) {
          setRequests(result);
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
  if (!requests) {
    return <LoadingState label="Loading telemetry ledger…" />;
  }

  const ledgerRows = buildTelemetryRequestRows(requests);
  const requestsWithEndpoint = requests.filter((request) => request.endpointId).length;
  const distinctEndpoints = new Set(requests.map((request) => request.endpointId).filter(Boolean))
    .size;
  const localRequests = requests.filter((request) => request.sourceType === "local").length;
  const remoteRequests = requests.filter((request) => request.sourceType === "remote").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Observe"
        title="Telemetry ledger"
        description="Structured local and remote request rows, ordered by newest activity and refreshed from the canonical telemetry stream."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <FactCard
          label="Requests"
          value={requests.length}
          detail="Structured requests currently available in the telemetry ledger."
          emphasis
        />
        <FactCard
          label="Endpoint-linked"
          value={requestsWithEndpoint}
          detail="Requests already tied to a concrete endpoint profile."
        />
        <FactCard
          label="Distinct endpoints"
          value={distinctEndpoints}
          detail={`${localRequests} local / ${remoteRequests} remote requests represented in the current ledger.`}
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard
          className="col-span-12 xl:col-span-8"
          title="Recent telemetry requests"
          description="Open any item to inspect the structured request artifact, endpoint profile, and captures."
        >
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

        <SectionCard
          className="col-span-12 xl:col-span-4"
          title="Inspection path"
          description="Keep the request ledger narrow in scope so the detail page can own deep debugging."
        >
          <div className="space-y-3">
            <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
              <p className="font-medium text-[var(--rm-fg)]">Reading order</p>
              <p className="mt-2">
                Scan routing decision, source type, status, latency, tokens, and endpoint links
                here, then move into Request detail for receipts, captures, diagnostics, and profile
                data.
              </p>
            </div>
            <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
              <p className="font-medium text-[var(--rm-fg)]">Adjacent surfaces</p>
              <p className="mt-2">
                Use Activity for broader raw host activity and Logs for proxy/upstream output when
                the telemetry ledger is still too narrow.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
