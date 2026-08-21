import { MetricStrip } from "@role-model/ui";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  accentActionTextClassName,
  bodyStrongTextClassName,
  cardClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { formatEndpointDisplayPath, formatModelIdentity } from "../lib/effort-identity";
import { startDeferredLiveRefresh } from "../lib/live-refresh";
import { formatRoutingModeLabel } from "../lib/routing-mode";
import {
  type RouterDecisionListItem,
  type RouterDecisionPage,
  fetchRouterDecisionPage,
  subscribeTelemetryStream,
} from "../lib/runtime-api";

export default function RouterDecisionsRoute() {
  const [page, setPage] = useState<RouterDecisionPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      try {
        const value = await fetchRouterDecisionPage({ limit: 50 });
        if (!disposed) {
          setPage(value);
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
  if (!page) {
    return <LoadingState label="Loading routing decisions…" />;
  }
  const decisions: readonly RouterDecisionListItem[] = page.items;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Decision ledger"
        description={`Showing ${page.returned} of ${page.totalMatching} routing decisions in the selected window. The page is bounded for scanability; direct drill-in links use stable request IDs.`}
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
                  <Badge tone={decision.sourceType === "local" ? "accent" : "neutral"}>
                    {decision.sourceType ?? "unknown"}
                  </Badge>
                </div>

                <MetricStrip
                  aria-label={`${decision.requestId} routing decision`}
                  variant="inventory"
                  className="max-w-none"
                  items={[
                    {
                      id: "model",
                      label: "Model",
                      value: formatModelIdentity({
                        id: decision.selectedModelId ?? "unknown model",
                        displayName: decision.displayName,
                        upstreamModelId: decision.upstreamModelId,
                        reasoningEffort: decision.reasoningEffort,
                      }),
                    },
                    {
                      id: "endpoint",
                      label: "Endpoint",
                      value: formatEndpointDisplayPath({
                        endpointId: decision.selectedEndpointId,
                        reasoningEffort: decision.reasoningEffort,
                      }),
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
