import { useEffect, useState } from "react";
import { Link } from "react-router";

import { ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import { fetchRouterSummary, type RouterSummary } from "../lib/runtime-api";

export default function RouterOverviewRoute() {
  const [summary, setSummary] = useState<RouterSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRouterSummary()
      .then((value) => {
        setSummary(value);
        setError(null);
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load router overview."));
  }, []);

  const header = (
    <PageHeader
      eyebrow="Router"
      title="Routing overview"
      description="Use the Router section as the primary explanation layer for routing posture, candidate availability, and recent decisions before dropping into raw request traces."
      actions={
        <>
          <Link className={secondaryButtonClassName} to="/app/router/config">
            View config
          </Link>
          <Link className={secondaryButtonClassName} to="/app/router/decisions">
            Open decisions
          </Link>
        </>
      }
    />
  );

  if (error) {
    return <div className="space-y-6">{header}<ErrorState label={error} /></div>;
  }
  if (!summary) {
    return <div className="space-y-6">{header}<LoadingState label="Loading router overview…" /></div>;
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Strategy" value={summary.strategy ?? "unset"} detail="Persisted routing strategy exposed through the Router control plane." emphasis />
        <FactCard label="Execution mode" value={summary.executionMode} detail="Execution posture that materially changes how routing decisions are interpreted." />
        <FactCard
          label="Controller"
          value={summary.controller?.modelId ?? "unassigned"}
          detail={summary.controller?.endpointId ?? "No controller is currently assigned."}
        />
        <FactCard label="Recent decisions" value={summary.recentDecisionCount} detail={`${summary.configuredCandidateCount} configured candidates currently visible to the Router inventory.`} />
      </div>

      <SectionCard
        title="Routing reading order"
        description="Start here for top-level posture, move into Config for policy provenance, Candidates for comparison, and Decisions for per-request explanation."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Guidance posture</p>
            <p className="mt-2 leading-6">
              Preferred endpoints: {summary.guidance?.preferredEndpointIds?.length ?? 0}. Ignored endpoints: {summary.guidance?.ignoredEndpointIds?.length ?? 0}.
            </p>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Section ownership</p>
            <p className="mt-2 leading-6">
              Control remains the editing surface, Observe remains the raw trace surface, and Router owns explanation, provenance, comparison, and decision interpretation.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill tone="accent">{summary.executionMode}</StatusPill>
          <StatusPill tone={summary.controller ? "success" : "warning"}>
            {summary.controller ? summary.controller.sourceType : "controller pending"}
          </StatusPill>
        </div>
      </SectionCard>
    </div>
  );
}
