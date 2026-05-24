import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";

import {
  CodeBlock,
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
} from "../components/page-primitives";
import { secondaryButtonClassName } from "../lib/design-system";
import { formatRoutingModeLabel } from "../lib/routing-mode";
import { type RouterDecisionDetail, fetchRouterDecisionDetail } from "../lib/runtime-api";

export default function RouterDecisionDetailRoute() {
  const { requestId = "" } = useParams();
  const [detail, setDetail] = useState<RouterDecisionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    let cancelled = false;
    setDetail(null);
    setError(null);

    void fetchRouterDecisionDetail(requestId)
      .then((value) => {
        if (cancelled) {
          return;
        }
        setDetail(value);
        setError(null);
      })
      .catch((value: unknown) => {
        if (cancelled) {
          return;
        }
        setError(value instanceof Error ? value.message : "Could not load router decision detail.");
      });

    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const observePath = detail?.observeRequestPath ?? `/app/observe/requests/${requestId}`;
  const header = (
    <PageHeader
      eyebrow="Router"
      title="Routing decision detail"
      description="Explain one routed request through the Router lens first, then hand off to Observe for the deeper telemetry and capture trace."
      actions={
        <Link className={secondaryButtonClassName} to={observePath}>
          Open Observe detail
        </Link>
      }
    />
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState label={error} />
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingState label="Loading routing decision detail…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Request"
          value={detail.requestId}
          detail="Request id that anchors the Router decision record."
          emphasis
        />
        <FactCard
          label="Decision"
          value={detail.routingDecisionId ?? "n/a"}
          detail="Routing decision id when the runtime persisted one."
        />
        <FactCard
          label="Chosen endpoint"
          value={detail.selectedEndpointId}
          detail={detail.selectedModelId ?? "unknown model"}
        />
        <FactCard
          label="Strategy"
          value={detail.strategyLabel ? formatRoutingModeLabel(detail.strategyLabel) : "n/a"}
          detail="Effective Router strategy summary for this request."
        />
      </div>

      <SectionCard
        title="Fallback endpoints"
        description="Fallback order remains visible here so Router can explain the chosen endpoint in context."
      >
        {detail.fallbackEndpointIds.length === 0 ? (
          <EmptyState label="No fallback endpoints were recorded for this decision." />
        ) : (
          <ul className="space-y-2 text-sm text-[var(--rm-secondary)]">
            {detail.fallbackEndpointIds.map((endpointId) => (
              <li key={endpointId}>{endpointId}</li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Decision bundle"
          description="Expose the raw persisted decision so scored candidates, exclusions, and tie-breaks remain auditable."
        >
          <CodeBlock>{JSON.stringify(detail.decision ?? {}, null, 2)}</CodeBlock>
        </SectionCard>
        <SectionCard
          title="Routing diagnostics"
          description="Keep the routing diagnostics adjacent to the decision so routing-mode, rewrite, difficulty, and controller details stay together."
        >
          <CodeBlock>{JSON.stringify(detail.routingDiagnostics ?? {}, null, 2)}</CodeBlock>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Linked request"
          description="Router promotes the request detail payload here, but Observe still owns the deeper trace workflow."
        >
          <CodeBlock>{JSON.stringify(detail.request, null, 2)}</CodeBlock>
        </SectionCard>
        <SectionCard
          title="Endpoint profile"
          description="Measured candidate posture remains linked so metric provenance stays visible at decision time."
        >
          <CodeBlock>{JSON.stringify(detail.endpointProfile ?? {}, null, 2)}</CodeBlock>
        </SectionCard>
      </div>
    </div>
  );
}
