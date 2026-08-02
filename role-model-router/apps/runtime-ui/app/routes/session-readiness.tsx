import { MetricStrip } from "@role-model/ui";
import { useEffect, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  mutedPanelClassName,
  supportingTextClassName,
} from "../lib/design-system";
import {
  type RuntimeHealthStatus,
  type RuntimeSummary,
  fetchHealthStatus,
  fetchRuntimeSummary,
} from "../lib/runtime-api";
import {
  buildAliasDriftRows,
  buildCredentialLifecycleAccountRows,
  buildCredentialLifecycleBanner,
  buildCredentialReadinessRows,
  buildInventorySummaryStats,
  buildOperatorIntentSummary,
  buildSessionBootstrapRows,
  summarizeSessionBootstrapStatus,
} from "../lib/view-models";

const monoPathClassName =
  "break-all font-mono text-[12px] font-normal leading-4 text-[var(--rm-fg)]";

const inventoryValueClassName =
  "font-mono text-[12px] font-normal leading-4 tabular-nums text-[var(--rm-fg)]";

function hostHealthLabel(status: RuntimeHealthStatus["status"]): string {
  return status === "healthy" ? "ok" : status;
}

function operatorIntentBadgeLabel(
  status: NonNullable<RuntimeSummary["operatorIntent"]>["status"] | undefined,
): string {
  switch (status) {
    case "ok":
      return "applied";
    case "missing":
      return "missing";
    case "corrupt":
      return "corrupt";
    default:
      return "unknown";
  }
}

export default function SessionReadinessRoute() {
  const [summary, setSummary] = useState<RuntimeSummary | null>(null);
  const [health, setHealth] = useState<RuntimeHealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeSummary(), fetchHealthStatus()])
      .then(([nextSummary, nextHealth]) => {
        setSummary(nextSummary);
        setHealth(nextHealth);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load session readiness."),
      );
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!summary || !health) {
    return <LoadingState label="Loading session readiness…" />;
  }

  const bootstrapStatus = summarizeSessionBootstrapStatus(summary);
  const bootstrapRows = buildSessionBootstrapRows(summary);
  const readinessRows = buildCredentialReadinessRows(summary).filter((row) => row.value > 0);
  const lifecycleBanner = buildCredentialLifecycleBanner(summary);
  const lifecycleAccountRows = buildCredentialLifecycleAccountRows(summary).filter(
    (row) => row.blocking,
  );
  const inventoryStats = buildInventorySummaryStats(summary);
  const driftRows = buildAliasDriftRows(summary);
  const operatorIntentSummary = buildOperatorIntentSummary(summary);
  const bootstrapSummary =
    bootstrapRows.length > 0
      ? `${bootstrapRows.map((row) => row.label.toLowerCase()).join(", ")} were all persisted in the current session.`
      : "Bootstrap stages have not been recorded yet.";
  const primaryLifecycleRow = lifecycleAccountRows[0] ?? null;
  const primaryDriftRow = driftRows[0] ?? null;
  const routableCount = summary.inventorySummary?.endpointIdCount ?? summary.endpointCount;
  const blockingReadinessRows = readinessRows.filter((row) => row.key !== "ready");

  return (
    <div className="space-y-6">
      <MetricStrip
        aria-label="Session readiness summary"
        variant="panel"
        items={[
          {
            id: "bootstrap",
            label: "Bootstrap",
            value: bootstrapStatus?.label ?? "unavailable",
          },
          { id: "health", label: "Host health", value: hostHealthLabel(health.status) },
          {
            id: "authority",
            label: "Authority",
            value: lifecycleBanner?.authorityLabel ?? "unavailable",
          },
          {
            id: "routable",
            label: "Routable",
            value: String(routableCount),
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="space-y-4">
          <SectionCard
            title="Session bootstrap"
            description="Persisted bootstrap ladder for the current host session."
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {bootstrapStatus ? (
                <Badge tone={bootstrapStatus.tone}>{bootstrapStatus.label}</Badge>
              ) : (
                <Badge tone="neutral">unavailable</Badge>
              )}
              {summary.sessionBootstrap?.finishedAt ? <Badge tone="neutral">finished</Badge> : null}
            </div>
            <p className={supportingTextClassName}>{bootstrapSummary}</p>
          </SectionCard>

          <SectionCard
            title="Canonical lifecycle"
            description="Authority posture and blocking credential accounts."
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              {lifecycleBanner ? (
                <>
                  <Badge tone={lifecycleBanner.authorityTone}>
                    {lifecycleBanner.authorityLabel}
                  </Badge>
                  {lifecycleBanner.archivedStaleCount > 0 ? (
                    <Badge tone="neutral">
                      archived stale {lifecycleBanner.archivedStaleCount}
                    </Badge>
                  ) : null}
                </>
              ) : (
                <Badge tone="neutral">unavailable</Badge>
              )}
            </div>
            {lifecycleBanner ? (
              <p className={supportingTextClassName}>{lifecycleBanner.detail}</p>
            ) : null}
            <div className="mt-4">
              {primaryLifecycleRow ? (
                <div className={`${mutedPanelClassName} space-y-3 p-4`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={bodyStrongTextClassName}>
                      {primaryLifecycleRow.providerAccountId}
                    </p>
                    <Badge tone={primaryLifecycleRow.tone}>
                      {primaryLifecycleRow.lifecycleLabel.toLowerCase()}
                    </Badge>
                  </div>
                  <div className={`space-y-2 ${supportingTextClassName}`}>
                    <p>providerAccountId {primaryLifecycleRow.providerAccountId}</p>
                    <p>reason {primaryLifecycleRow.reasonLabel}</p>
                    <p>actions {primaryLifecycleRow.availableActionsLabel}</p>
                  </div>
                </div>
              ) : (
                <EmptyState label="No blocking account lifecycle rows." />
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Operator intent manifest"
            description="Declared operator intent for this runtime session."
          >
            {operatorIntentSummary ? (
              <div className="space-y-4">
                <Badge tone={operatorIntentSummary.tone}>
                  {operatorIntentBadgeLabel(summary.operatorIntent?.status)}
                </Badge>
                <p className={supportingTextClassName}>{operatorIntentSummary.detail}</p>
                {summary.operatorIntent?.path ? (
                  <p className={monoPathClassName}>{summary.operatorIntent.path}</p>
                ) : null}
              </div>
            ) : (
              <EmptyState label="Operator-intent diagnostics are not available yet." />
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Credential readiness"
            description="Blocking credential counts by class."
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                {blockingReadinessRows.length === 0 ? (
                  <Badge tone="neutral">no blockers</Badge>
                ) : (
                  blockingReadinessRows.map((row) => (
                    <Badge key={row.key} tone={row.tone}>
                      {row.label.toLowerCase()} {row.value}
                    </Badge>
                  ))
                )}
              </div>
              {blockingReadinessRows.length === 0 ? (
                <p className={supportingTextClassName}>
                  No credential blockers reported for the current session.
                </p>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Routable inventory"
            description="Endpoints and models available to routing."
          >
            {inventoryStats.length === 0 ? (
              <EmptyState label="Inventory summary is not available yet." />
            ) : (
              <div className="space-y-3">
                {inventoryStats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between gap-3">
                    <p className={supportingTextClassName}>{stat.label}</p>
                    <p className={inventoryValueClassName}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Alias drift warnings"
            description="Hint models that no longer resolve live."
          >
            {primaryDriftRow ? (
              <div className="space-y-3">
                <p className={bodyStrongTextClassName}>
                  {primaryDriftRow.aliasId} hint drift on {primaryDriftRow.hintModelId}
                </p>
                <p className={supportingTextClassName}>{primaryDriftRow.message}</p>
                {primaryDriftRow.suggestedModelIds.length > 0 ? (
                  <p className={supportingTextClassName}>
                    Suggested live ids: {primaryDriftRow.suggestedModelIds.join(", ")}
                  </p>
                ) : null}
              </div>
            ) : (
              <EmptyState label="No alias hint drift warnings." />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
