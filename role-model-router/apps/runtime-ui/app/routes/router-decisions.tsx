import { MetricStrip } from "@role-model/ui";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { EmptyState, ErrorState, LoadingState, SectionCard, StatusPill } from "../components/page-primitives";
import {
  accentActionTextClassName,
  bodyStrongTextClassName,
  cardClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { startDeferredLiveRefresh } from "../lib/live-refresh";
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

    const dispose = startDeferredLiveRefresh({
      load: async () => {
        await load();
      },
      subscribe: (onEvent) => subscribeTelemetryStream(onEvent),
    });
    return () => {
      disposed = true;
      dispose();
    };
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!decisions) {
    return <LoadingState label="Loading routing decisions…" />;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Decision ledger"
        description="Keep the list scanable: request, chosen endpoint and model, strategy summary, and direct drill-in links."
      >
        {decisions.length === 0 ? (
          <EmptyState label="No routing decisions have been recorded yet." />
        ) : (
          <div className="space-y-4">
            {decisions.map((decision) => (
              <div key={decision.requestId} className={`${cardClassName} space-y-4 p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 border-l-2 border-[var(--rm-accent)] pl-3">
                    <p className={bodyStrongTextClassName}>{decision.requestId}</p>
                  </div>
                  <StatusPill tone={decision.sourceType === "local" ? "accent" : "neutral"}>
                    {decision.sourceType ?? "unknown"}
                  </StatusPill>
                </div>

                <MetricStrip
                  aria-label={`${decision.requestId} routing decision`}
                  variant="inventory"
                  className="max-w-none"
                  items={[
                    {
                      id: "model",
                      label: "Model",
                      value: decision.selectedModelId ?? "unknown model",
                    },
                    {
                      id: "endpoint",
                      label: "Endpoint",
                      value: decision.selectedEndpointId,
                    },
                    {
                      id: "strategy",
                      label: "Strategy",
                      value: decision.strategyLabel
                        ? formatRoutingModeLabel(decision.strategyLabel)
                        : "no strategy label",
                    },
                    {
                      id: "source",
                      label: "Source",
                      value: decision.sourceType ?? "unknown",
                    },
                    {
                      id: "decided",
                      label: "Decided",
                      value: decision.decidedAtMs
                        ? new Date(decision.decidedAtMs).toLocaleString()
                        : "n/a",
                    },
                  ]}
                />

                <div className="flex flex-wrap gap-4">
                  <Link
                    className={accentActionTextClassName}
                    to={`/app/router/decisions/${decision.requestId}`}
                  >
                    Router · Open detail
                  </Link>
                  <Link
                    className={supportingTextClassName}
                    to={`/app/observe/requests/${decision.requestId}`}
                  >
                    Observe · Open detail
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
