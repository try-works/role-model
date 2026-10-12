import { useCallback, useEffect, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  compactTitleClassName,
  monoEyebrowClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { useOperatorToken } from "../lib/learning-api";
import {
  type ObservabilitySnapshotReadbackState,
  buildObservabilitySnapshotRows,
  fetchObservabilitySnapshot,
} from "../lib/runtime-api";

/**
 * Run 108 addendum-01 A5.2 (R7 readback consumers; 03.5 review MJ-1): the observability snapshot
 * surfaces in the operator UI. The host reads its own metric registry and answers the four run-108
 * metric families the runtime records; this view renders that projection - one row per metric with
 * its count - and says honestly when the readback is unavailable instead of showing a fabricated
 * zero. The readback is the point of the requirement: before this page the metrics were write-only.
 */
export function ObservabilitySnapshotRouteView() {
  // 03.5 review MN-3: the operator readbacks carry the house operator credential. This route is
  // gated by the same auth check as every other /api/role-model/operator/* path, so without the
  // token a non-loopback bind answers 401 and the page renders an error instead of the metrics.
  // useOperatorToken is the shared convention (learning-api -> the local-storage token the
  // Learning and Control pages already use); with no token configured the request shape is the
  // anonymous loopback one, unchanged.
  const { token } = useOperatorToken();
  const [state, setState] = useState<ObservabilitySnapshotReadbackState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(() => {
    setError(null);
    return fetchObservabilitySnapshot(fetch, token || undefined)
      .then(setState)
      .catch((value: unknown) => setError(value instanceof Error ? value.message : String(value)));
  }, [token]);
  useEffect(() => {
    void load();
  }, [load]);
  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };
  const rows = state === null ? [] : buildObservabilitySnapshotRows(state);
  return (
    <div className="space-y-4">
      <SectionCard
        title="Observability snapshot"
        description="What this runtime has measured: routing decisions served, captures admitted for replay, evaluation finalise refusals, and learner candidates examined. The readback is the live metric registry of the running host, not a stored projection."
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <p className={supportingTextClassName}>
            {state === null
              ? "Reading metrics..."
              : state.available
                ? `${rows.length} metric row(s) in the registry`
                : "Readback unavailable"}
          </p>
          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {error ? <ErrorState label={error} /> : null}
        {state === null && !error ? <LoadingState label="Loading observability snapshot" /> : null}
        {state !== null && !state.available ? (
          <div className={`${mutedPanelClassName} p-4`}>
            <p className={compactTitleClassName}>Readback unavailable</p>
            <p className={supportingTextClassName}>{state.reason}</p>
            <p className={supportingTextClassName}>
              The metrics keep recording in the host process; this page only shows what the host
              answered.
            </p>
          </div>
        ) : null}
        {state?.available ? (
          <div className="space-y-4">
            {rows.length === 0 ? (
              <EmptyState label="No metrics recorded yet" />
            ) : (
              rows.map((row) => (
                <div key={row.id} className={`${mutedPanelClassName} p-4`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={row.count > 0 ? "success" : "neutral"}>{row.count}</Badge>
                    <p className={monoEyebrowClassName}>{row.name}</p>
                    {row.incremental ? (
                      <p className={supportingTextClassName}>incremental counter</p>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

export default ObservabilitySnapshotRouteView;
