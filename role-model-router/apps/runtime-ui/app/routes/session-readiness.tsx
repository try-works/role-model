import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { listRowClassName, mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import { usePageActions } from "../lib/shell-header-context";
import {
  type RuntimeHealthStatus,
  type RuntimeSummary,
  fetchHealthStatus,
  fetchRuntimeSummary,
} from "../lib/runtime-api";
import {
  buildAliasDriftRows,
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

  usePageActions(
    <>
      <a className={secondaryButtonClassName} href="/healthz">
        Health JSON
      </a>
      <a className={secondaryButtonClassName} href="/api/role-model/runtime/summary">
        Runtime JSON
      </a>
    </>,
    [],
  );

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!summary || !health) {
    return <LoadingState label="Loading session readiness…" />;
  }

  const bootstrapStatus = summarizeSessionBootstrapStatus(summary);
  const bootstrapRows = buildSessionBootstrapRows(summary);
  const readinessRows = buildCredentialReadinessRows(summary).filter((row) => row.value > 0);
  const inventoryStats = buildInventorySummaryStats(summary);
  const driftRows = buildAliasDriftRows(summary);
  const operatorIntentSummary = buildOperatorIntentSummary(summary);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Bootstrap status"
          value={bootstrapStatus?.label ?? "Unavailable"}
          emphasis
        />
        <FactCard label="Host health" value={health.status} />
        <FactCard label="Execution mode" value={summary.executionMode ?? "unknown"} />
        <FactCard
          label="Routable endpoints"
          value={String(summary.inventorySummary?.endpointIdCount ?? summary.endpointCount)}
        />
      </div>

      <SectionCard title="Session bootstrap">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {bootstrapStatus ? (
            <StatusPill tone={bootstrapStatus.tone}>{bootstrapStatus.label}</StatusPill>
          ) : (
            <StatusPill tone="neutral">Bootstrap receipts unavailable</StatusPill>
          )}
          {summary.sessionBootstrap?.startedAt ? (
            <p className="text-sm text-[var(--rm-secondary)]">
              Started {summary.sessionBootstrap.startedAt}
              {summary.sessionBootstrap.finishedAt
                ? ` • Finished ${summary.sessionBootstrap.finishedAt}`
                : ""}
            </p>
          ) : null}
        </div>
        {bootstrapRows.length === 0 ? (
          <EmptyState label="Bootstrap stages have not been recorded yet." />
        ) : (
          <div className="space-y-3">
            {bootstrapRows.map((row) => (
              <div key={row.stageId} className={listRowClassName}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--rm-fg)]">{row.label}</p>
                    <StatusPill tone={row.tone}>{row.status}</StatusPill>
                  </div>
                  {row.message ? (
                    <p className="mt-2 text-sm text-[var(--rm-secondary)]">{row.message}</p>
                  ) : null}
                </div>
                <p className="text-sm text-[var(--rm-secondary)]">{row.stageId}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Credential readiness">
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

      <SectionCard title="Operator intent manifest">
        {operatorIntentSummary ? (
          <div className={mutedPanelClassName + " p-4"}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-[var(--rm-fg)]">{operatorIntentSummary.label}</p>
              <StatusPill tone={operatorIntentSummary.tone}>
                {summary.operatorIntent?.status ?? "unknown"}
              </StatusPill>
            </div>
            <p className="mt-2 text-sm text-[var(--rm-secondary)]">{operatorIntentSummary.detail}</p>
            {summary.operatorIntent?.path ? (
              <p className="mt-2 text-xs text-[var(--rm-muted)]">{summary.operatorIntent.path}</p>
            ) : null}
          </div>
        ) : (
          <EmptyState label="Operator-intent diagnostics are not available yet." />
        )}
      </SectionCard>

      <SectionCard title="Routable inventory">
        {inventoryStats.length === 0 ? (
          <EmptyState label="Inventory summary is not available yet." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {inventoryStats.map((stat) => (
              <div key={stat.label} className={`${mutedPanelClassName} p-4`}>
                <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                  {stat.label}
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--rm-fg)]">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Alias drift warnings">
        {driftRows.length === 0 ? (
          <EmptyState label="No alias hint drift warnings." />
        ) : (
          <div className="space-y-3">
            {driftRows.map((row) => (
              <div
                key={`${row.aliasId}:${row.hintModelId}`}
                className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
              >
                <p className="font-medium text-[var(--rm-fg)]">
                  {row.aliasId} • hint {row.hintModelId}
                </p>
                <p className="mt-2">{row.message}</p>
                {row.suggestedModelIds.length > 0 ? (
                  <p className="mt-2 break-all">
                    Suggested live ids: {row.suggestedModelIds.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Related surfaces">
        <div className="grid gap-3 md:grid-cols-2">
          <Link className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`} to="/app/system/runtime">
            <span className="block font-medium text-[var(--rm-fg)]">Runtime topology</span>
            Lifecycle, controller posture, and preserved host diagnostics
          </Link>
          <Link className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`} to="/app/remote/providers">
            <span className="block font-medium text-[var(--rm-fg)]">Remote providers</span>
            OAuth, credentials, and remote endpoint activation
          </Link>
        </div>
      </SectionCard>
    </div>
  );
}
