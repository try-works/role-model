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
  type RouterCandidate,
  type RouterSummary,
  type RuntimeConfigRecord,
  type RuntimeSnapshot,
  fetchRouterCandidates,
  fetchRouterSummary,
  fetchRuntimeConfig,
  fetchRuntimeSnapshot,
} from "../lib/runtime-api";
import { usePageActions } from "../lib/shell-header-context";
import { buildAliasReadinessRows } from "../lib/view-models";

export default function RouterOverviewRoute() {
  const [summary, setSummary] = useState<RouterSummary | null>(null);
  const [candidates, setCandidates] = useState<readonly RouterCandidate[]>([]);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [configRecord, setConfigRecord] = useState<RuntimeConfigRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchRouterSummary(),
      fetchRouterCandidates(),
      fetchRuntimeSnapshot(),
      fetchRuntimeConfig(),
    ])
      .then(([nextSummary, nextCandidates, nextSnapshot, nextConfigRecord]) => {
        setSummary(nextSummary);
        setCandidates(nextCandidates);
        setSnapshot(nextSnapshot);
        setConfigRecord(nextConfigRecord);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load router overview."),
      );
  }, []);

  const configuredAliasRows = useMemo(() => {
    const runtimeAliasRows = buildAliasReadinessRows(
      configRecord?.config?.modelAliases ?? configRecord?.config?.model_aliases ?? [],
      snapshot?.endpoints ?? [],
    );
    const runtimeAliasRowsById = new Map(runtimeAliasRows.map((alias) => [alias.aliasId, alias]));
    const summaryAliasRowsById = new Map(
      (summary?.aliasInventory ?? []).map((alias) => [alias.aliasId, alias]),
    );

    if ((summary?.aliasInventory ?? []).length > 0) {
      return (summary?.aliasInventory ?? []).map((alias) => {
        const runtimeAlias = runtimeAliasRowsById.get(alias.aliasId);
        return {
          aliasId: alias.aliasId,
          modeLabel: runtimeAlias?.modeLabel ?? alias.mode,
          effectiveModels: [...alias.resolvedModelIds],
          candidateExpansionLabel: `${alias.resolvedModelIds.length} model${
            alias.resolvedModelIds.length === 1 ? "" : "s"
          } / ${alias.allowEndpointIds.length} endpoint${
            alias.allowEndpointIds.length === 1 ? "" : "s"
          }`,
          localEndpointCount: alias.localEndpointCount,
          remoteEndpointCount: alias.remoteEndpointCount,
          activeEndpointCount: alias.activeEndpointCount,
          healthyEndpointCount: alias.healthyEndpointCount,
          readinessLabel: alias.readiness,
          driftWarnings: alias.driftWarnings,
        };
      });
    }

    return runtimeAliasRows.map((alias) => {
      const summaryAlias = summaryAliasRowsById.get(alias.aliasId);
      return {
        aliasId: alias.aliasId,
        modeLabel: alias.modeLabel,
        effectiveModels: [...alias.modelIds],
        candidateExpansionLabel: summaryAlias
          ? `${summaryAlias.resolvedModelIds.length} model${
              summaryAlias.resolvedModelIds.length === 1 ? "" : "s"
            } / ${summaryAlias.allowEndpointIds.length} endpoint${
              summaryAlias.allowEndpointIds.length === 1 ? "" : "s"
            }`
          : `${alias.endpointCount} endpoint${alias.endpointCount === 1 ? "" : "s"}`,
        localEndpointCount: alias.localEndpointCount,
        remoteEndpointCount: alias.remoteEndpointCount,
        activeEndpointCount: alias.activeEndpointCount,
        healthyEndpointCount: alias.healthyEndpointCount,
        readinessLabel: alias.readinessLabel,
        driftWarnings: summaryAlias?.driftWarnings ?? [],
      };
    });
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
  const config = configRecord.config;
  const configuredStrategy = config?.routingStrategy ?? null;
  const configuredExecutionMode = config?.executionMode ?? summary.executionMode;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Strategy" value={configuredStrategy ?? "unset"} emphasis />
        <FactCard label="Execution mode" value={configuredExecutionMode ?? "decision_only"} />
        <FactCard label="Controller" value={summary.controller?.modelId ?? "unassigned"} />
        <FactCard label="Alias pools" value={String(configuredAliasRows.length)} />
      </div>

      <SectionCard title="Alias inventory">
        {configuredAliasRows.length === 0 ? (
          <EmptyState label="No model aliases are configured yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--rm-muted)]">
                <tr>
                  <th className="pb-3 font-semibold">Alias</th>
                  <th className="pb-3 font-semibold">Mode</th>
                  <th className="pb-3 font-semibold">Effective models</th>
                  <th className="pb-3 font-semibold">Candidate expansion</th>
                  <th className="pb-3 font-semibold">Readiness</th>
                </tr>
              </thead>
              <tbody>
                {configuredAliasRows.map((row) => (
                  <tr key={row.aliasId} className="border-t border-[var(--rm-border)]">
                    <td className="py-3 font-semibold text-[var(--rm-fg)]">{row.aliasId}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">{row.modeLabel}</td>
                    <td className="py-3 text-[var(--rm-secondary)]">
                      {row.effectiveModels.length > 0 ? (
                        <div className="space-y-1">
                          {row.effectiveModels.map((modelId) => (
                            <div key={`${row.aliasId}-effective-${modelId}`}>{modelId}</div>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 text-[var(--rm-secondary)]">
                      {row.candidateExpansionLabel}
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

      <SectionCard
        title="Routing candidates"
        description="Concrete endpoint and model candidates currently visible to the router for this runtime posture."
      >
        {candidates.length === 0 ? (
          <EmptyState label="No routing candidates are available." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--rm-muted)]">
                <tr>
                  <th className="pb-3 font-semibold">Model</th>
                  <th className="pb-3 font-semibold">Endpoint</th>
                  <th className="pb-3 font-semibold">Source</th>
                  <th className="pb-3 font-semibold">Health</th>
                  <th className="pb-3 font-semibold">Routing</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.endpointId} className="border-t border-[var(--rm-border)]">
                    <td className="py-3 font-semibold text-[var(--rm-fg)]">{candidate.modelId}</td>
                    <td className="max-w-[32rem] break-all py-3 text-[var(--rm-secondary)]">
                      {candidate.endpointId}
                    </td>
                    <td className="py-3 text-[var(--rm-secondary)]">{candidate.sourceType}</td>
                    <td className="py-3">
                      <StatusPill
                        tone={
                          candidate.healthStatus === "healthy"
                            ? "success"
                            : candidate.healthStatus === "offline"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {candidate.healthStatus ?? candidate.status ?? "unknown"}
                      </StatusPill>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        {candidate.controllerEligible ? (
                          <StatusPill tone="accent">controller</StatusPill>
                        ) : null}
                        {candidate.preferred ? (
                          <StatusPill tone="accent">preferred</StatusPill>
                        ) : null}
                        {candidate.ignored ? <StatusPill tone="neutral">ignored</StatusPill> : null}
                        {candidate.executionModeEligible === false ? (
                          <StatusPill tone="neutral">excluded by mode</StatusPill>
                        ) : null}
                        {!candidate.controllerEligible &&
                        !candidate.preferred &&
                        !candidate.ignored &&
                        candidate.executionModeEligible !== false ? (
                          <span className="text-[var(--rm-muted)]">candidate</span>
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
