import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
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
import { usePageActions } from "../lib/shell-header-context";
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

  const aliasRows = useMemo(() => {
    const aliasInventory = summary?.aliasInventory;
    if (aliasInventory && aliasInventory.length > 0) {
      return aliasInventory.map((alias) => ({
        aliasId: alias.aliasId,
        modeLabel: alias.mode,
        configuredHints: [...alias.configuredHintModelIds],
        resolvedModelIds: [...alias.resolvedModelIds],
        allowedEndpoints: [...alias.allowEndpointIds],
        endpointCount: alias.allowEndpointIds.length,
        localEndpointCount: alias.localEndpointCount,
        remoteEndpointCount: alias.remoteEndpointCount,
        activeEndpointCount: alias.activeEndpointCount,
        healthyEndpointCount: alias.healthyEndpointCount,
        readinessLabel: alias.readiness,
        driftWarnings: alias.driftWarnings,
      }));
    }
    return buildAliasReadinessRows(
      configRecord?.config?.modelAliases ?? configRecord?.config?.model_aliases ?? [],
      snapshot?.endpoints ?? [],
    ).map((alias) => ({
      aliasId: alias.aliasId,
      modeLabel: alias.modeLabel,
      configuredHints: [...alias.modelIds],
      resolvedModelIds: [...alias.modelIds],
      allowedEndpoints: [],
      endpointCount: alias.endpointCount,
      localEndpointCount: alias.localEndpointCount,
      remoteEndpointCount: alias.remoteEndpointCount,
      activeEndpointCount: alias.activeEndpointCount,
      healthyEndpointCount: alias.healthyEndpointCount,
      readinessLabel: alias.readinessLabel,
      driftWarnings: [],
    }));
  }, [configRecord, snapshot, summary]);
  usePageActions(
    <>
      <Link className={secondaryButtonClassName} to="/app/router/strategy">
        Edit strategy
      </Link>
      <Link className={secondaryButtonClassName} to="/app/router/decisions">
        Open decisions
      </Link>
    </>,
    [],
  );

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!summary || !snapshot || !configRecord) {
    return <LoadingState label="Loading router overview…" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Strategy" value={summary.strategy ?? "unset"} emphasis />
        <FactCard label="Execution mode" value={summary.executionMode} />
        <FactCard label="Controller" value={summary.controller?.modelId ?? "unassigned"} />
        <FactCard label="Alias pools" value={String(aliasRows.length)} />
      </div>

      <SectionCard title="Alias inventory">
        {aliasRows.length === 0 ? (
          <EmptyState label="No model aliases are configured yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--rm-muted)]">
                <tr>
                  <th className="pb-3 font-medium">Alias</th>
                  <th className="pb-3 font-medium">Mode</th>
                  <th className="pb-3 font-medium">Configured hints</th>
                  <th className="pb-3 font-medium">Resolved models</th>
                  <th className="pb-3 font-medium">Readiness</th>
                </tr>
              </thead>
              <tbody>
                {aliasRows.map((row) => (
                  <tr key={row.aliasId} className="border-t border-[var(--rm-border)]">
                    <td className="py-3 font-medium text-[var(--rm-fg)]">{row.aliasId}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.modeLabel}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">
                      {row.configuredHints.length > 0 ? (
                        <div className="space-y-1">
                          {row.configuredHints.map((modelId) => (
                            <div key={`${row.aliasId}-hint-${modelId}`}>{modelId}</div>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 text-[var(--rm-secondary)]">
                      {row.resolvedModelIds.length > 0 ? (
                        <div className="space-y-1">
                          {row.resolvedModelIds.map((modelId) => (
                            <div key={`${row.aliasId}-resolved-${modelId}`}>{modelId}</div>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3">
                      <div className="space-y-1">
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
                        {"driftWarnings" in row && row.driftWarnings.length > 0 ? (
                          <div className="text-xs text-[var(--rm-muted)]">
                            {row.driftWarnings.length} drift warning
                            {row.driftWarnings.length === 1 ? "" : "s"}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
