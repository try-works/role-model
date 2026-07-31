import { MetricStrip } from "@role-model/ui";
import { useEffect, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
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

  return (
    <div className="space-y-6">
      <MetricStrip
        aria-label="Session readiness summary"
        variant="panel"
        items={[
          {
            id: "bootstrap",
            label: "Bootstrap",
            value: bootstrapStatus?.label ?? "Unavailable",
          },
          { id: "health", label: "Host health", value: health.status },
          {
            id: "authority",
            label: "Authority",
            value: lifecycleBanner?.authorityLabel ?? "Unavailable",
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
                <StatusPill tone={bootstrapStatus.tone}>{bootstrapStatus.label}</StatusPill>
              ) : (
                <StatusPill tone="neutral">Bootstrap receipts unavailable</StatusPill>
              )}
              {summary.sessionBootstrap?.finishedAt ? (
                <StatusPill tone="neutral">finished</StatusPill>
              ) : null}
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
                  <StatusPill tone={lifecycleBanner.authorityTone}>
                    {lifecycleBanner.authorityLabel}
                  </StatusPill>
                  {lifecycleBanner.archivedStaleCount > 0 ? (
                    <StatusPill tone="neutral">
                      archived stale {lifecycleBanner.archivedStaleCount}
                    </StatusPill>
                  ) : null}
                </>
              ) : (
                <StatusPill tone="neutral">Lifecycle contract unavailable</StatusPill>
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
                    <StatusPill tone={primaryLifecycleRow.tone}>
                      {primaryLifecycleRow.lifecycleLabel}
                    </StatusPill>
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
                <StatusPill tone={operatorIntentSummary.tone}>
                  {summary.operatorIntent?.status ?? "unknown"}
                </StatusPill>
                <p className={supportingTextClassName}>{operatorIntentSummary.detail}</p>
                {summary.operatorIntent?.path ? (
                  <p className={supportingTextClassName}>{summary.operatorIntent.path}</p>
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
            <div className="flex flex-wrap gap-3">
              {readinessRows.length === 0 ? (
                <StatusPill tone="neutral">No credential blockers reported</StatusPill>
              ) : (
                readinessRows.map((row) => (
                  <StatusPill key={row.key} tone={row.tone}>
                    {row.label} {row.value}
                  </StatusPill>
                ))
              )}
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
                    <p className={bodyStrongTextClassName}>{stat.value}</p>
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
