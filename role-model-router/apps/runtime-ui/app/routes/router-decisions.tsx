import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { EmptyState, ErrorState, LoadingState, SectionCard } from "../components/page-primitives";
import {
  accentActionTextClassName,
  bodyStrongTextClassName,
  foregroundEmphasisClassName,
  metaTextClassName,
  mutedPanelClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import { formatRoutingModeLabel } from "../lib/routing-mode";
import {
  type RouterDecisionListItem,
  fetchRouterDecisions,
  subscribeTelemetryStream,
} from "../lib/runtime-api";

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
          setError(
            nextError instanceof Error ? nextError.message : "Could not load router decisions.",
          );
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

  const decisionPosture = useMemo(() => {
    return (decisions ?? []).reduce(
      (summary, decision) => {
        summary.localCount += decision.sourceType === "local" ? 1 : 0;
        summary.remoteCount += decision.sourceType === "remote" ? 1 : 0;
        summary.controllerCount += decision.strategyLabel?.toLowerCase().includes("controller")
          ? 1
          : 0;
        return summary;
      },
      {
        controllerCount: 0,
        localCount: 0,
        remoteCount: 0,
      },
    );
  }, [decisions]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!decisions) {
    return <LoadingState label="Loading routing decisions…" />;
  }
  const latestDecision = decisions[0] ?? null;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Decision ledger"
        description="Keep the list scanable: request, chosen endpoint/model, strategy summary, and direct drill-in links."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]">
          <div className="space-y-3">
            {decisions.length === 0 ? (
              <EmptyState label="No routing decisions have been recorded yet." />
            ) : (
              decisions.map((decision) => (
                <div
                  key={decision.requestId}
                  className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-panel)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={foregroundEmphasisClassName}>{decision.requestId}</p>
                      <p className={`mt-2 break-all ${supportingTextClassName}`}>
                        {decision.selectedEndpointId}
                      </p>
                      <p className={`mt-2 ${supportingTextClassName}`}>
                        {decision.selectedModelId ?? "unknown model"} •{" "}
                        {decision.strategyLabel
                          ? formatRoutingModeLabel(decision.strategyLabel)
                          : "no strategy label"}{" "}
                        • {decision.sourceType ?? "unknown source"}
                      </p>
                    </div>
                    <p className={metaTextClassName}>
                      {decision.decidedAtMs
                        ? new Date(decision.decidedAtMs).toLocaleString()
                        : "n/a"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4">
                    <Link
                      className={accentActionTextClassName}
                      to={`/app/router/decisions/${decision.requestId}`}
                    >
                      Open Router detail
                    </Link>
                    <Link
                      className={supportingTextClassName}
                      to={`/app/observe/requests/${decision.requestId}`}
                    >
                      Open Observe detail
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <div className={`${mutedPanelClassName} p-4 text-[var(--rm-secondary)]`}>
              <p className={foregroundEmphasisClassName}>Decision posture</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={utilityLabelClassName}>Recent decisions</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {decisions.length}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Local / Remote</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {decisionPosture.localCount} / {decisionPosture.remoteCount}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Controller-guided</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {decisionPosture.controllerCount}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-[var(--rm-border)] pt-4">
                <p className={utilityLabelClassName}>Latest decision</p>
                <p className={`mt-2 ${bodyStrongTextClassName} break-all text-[var(--rm-fg)]`}>
                  {latestDecision?.selectedModelId ?? "No decisions yet"}
                </p>
                <p className={`mt-2 ${supportingTextClassName}`}>
                  {latestDecision?.selectedEndpointId ??
                    "A routed request will appear here once a decision is recorded."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
