import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { secondaryButtonClassName } from "../lib/design-system";
import {
  type RouterSummary,
  type RuntimeConfigRecord,
  type RuntimeSnapshot,
  fetchRouterSummary,
  fetchRuntimeConfig,
  fetchRuntimeSnapshot,
} from "../lib/runtime-api";
import { buildAliasReadinessRows } from "../lib/view-models";

export default function RouterOverviewRoute() {
  const [summary, setSummary] = useState<RouterSummary | null>(null);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [configRecord, setConfigRecord] = useState<RuntimeConfigRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRouterSummary(), fetchRuntimeSnapshot(), fetchRuntimeConfig()])
      .then(([nextSummary, nextSnapshot, nextConfigRecord]) => {
        setSummary(nextSummary);
        setSnapshot(nextSnapshot);
        setConfigRecord(nextConfigRecord);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load router overview."),
      );
  }, []);

  const aliasRows = useMemo(
    () =>
      buildAliasReadinessRows(
        configRecord?.config?.modelAliases ?? configRecord?.config?.model_aliases ?? [],
        snapshot?.endpoints ?? [],
      ),
    [configRecord, snapshot],
  );
  const readyAliasCount = aliasRows.filter((row) => row.readinessLabel === "ready").length;

  const header = (
    <PageHeader
      eyebrow="Router"
      title="Routing overview"
      description="Use Router to inspect active strategy, alias coverage, and decision posture before drilling into per-request receipts."
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
    return (
      <div className="space-y-6">
        {header}
        <ErrorState label={error} />
      </div>
    );
  }
  if (!summary || !snapshot || !configRecord) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingState label="Loading router overview…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Strategy"
          value={summary.strategy ?? "unset"}
          detail="Persisted routing strategy currently applied by the runtime."
          emphasis
        />
        <FactCard
          label="Execution mode"
          value={summary.executionMode}
          detail="Execution posture that changes how local and remote candidates are considered."
        />
        <FactCard
          label="Controller"
          value={summary.controller?.modelId ?? "unassigned"}
          detail={summary.controller?.endpointId ?? "No controller is currently assigned."}
        />
        <FactCard
          label="Alias pools"
          value={String(aliasRows.length)}
          detail={`${readyAliasCount} execution-ready aliases mapped across ${snapshot.endpoints.length} runtime endpoints.`}
        />
      </div>

      <SectionCard
        title="Alias inventory"
        description="Each alias expands into one or more model ids. Router readiness reflects whether those models currently resolve to healthy local and remote endpoints."
      >
        {aliasRows.length === 0 ? (
          <EmptyState label="No model aliases are configured yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--rm-muted)]">
                <tr>
                  <th className="pb-3 font-medium">Alias</th>
                  <th className="pb-3 font-medium">Mode</th>
                  <th className="pb-3 font-medium">Alias coverage</th>
                  <th className="pb-3 font-medium">Endpoints</th>
                  <th className="pb-3 font-medium">Readiness</th>
                </tr>
              </thead>
              <tbody>
                {aliasRows.map((row) => (
                  <tr key={row.aliasId} className="border-t border-[var(--rm-border)]">
                    <td className="py-3 font-medium text-[var(--rm-fg)]">{row.aliasId}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.modeLabel}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">
                      {row.modelIds.join(", ") || "—"}
                    </td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.sourceSummary}</td>
                    <td className="py-3">
                      <StatusPill
                        tone={
                          row.readinessLabel === "ready"
                            ? "success"
                            : row.readinessLabel === "degraded"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {row.readinessLabel}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Execution-ready aliases"
        description="These alias pools currently have at least one active endpoint behind them and can participate in routing strategy evaluation."
      >
        {readyAliasCount === 0 ? (
          <EmptyState label="No aliases are execution-ready yet. Activate matching local or remote endpoints first." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {aliasRows
              .filter((row) => row.readinessLabel === "ready")
              .map((row) => (
                <StatusPill key={row.aliasId} tone="success">
                  {row.aliasId}
                </StatusPill>
              ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
