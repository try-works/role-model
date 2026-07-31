import { useEffect, useMemo, useState } from "react";

import {
  DisclosureSection,
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
  utilityLabelClassName,
} from "../lib/design-system";
import { selectOverviewRouterCandidates } from "../lib/router-candidate-labels";
import {
  type RouterCandidate,
  type RouterSummary,
  type RuntimeConfigRecord,
  type RuntimeEndpoint,
  fetchRouterCandidates,
  fetchRouterSummary,
  fetchRuntimeConfig,
  fetchRuntimeEndpoints,
} from "../lib/runtime-api";
import { buildAliasReadinessRows } from "../lib/view-models";

export default function RouterOverviewRoute() {
  const [summary, setSummary] = useState<RouterSummary | null>(null);
  const [candidates, setCandidates] = useState<readonly RouterCandidate[]>([]);
  const [endpoints, setEndpoints] = useState<readonly RuntimeEndpoint[] | null>(null);
  const [configRecord, setConfigRecord] = useState<RuntimeConfigRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchRouterSummary(),
      fetchRouterCandidates(),
      fetchRuntimeEndpoints(),
      fetchRuntimeConfig(),
    ])
      .then(([nextSummary, nextCandidates, nextEndpoints, nextConfigRecord]) => {
        setSummary(nextSummary);
        setCandidates(nextCandidates);
        setEndpoints(nextEndpoints);
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
      endpoints ?? [],
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
  }, [configRecord, endpoints, summary]);
  if (error) {
    return <ErrorState label={error} />;
  }
  if (!summary || !endpoints || !configRecord) {
    return <LoadingState label="Loading router overview…" />;
  }
  const config = configRecord.config;
  const configuredStrategy = config?.routingStrategy ?? null;
  const configuredExecutionMode = config?.executionMode ?? summary.executionMode;
  const controllerModelId = summary.controller?.modelId ?? null;
  const configuredAliasId =
    configuredExecutionMode && configuredExecutionMode.length > 0
      ? `${configuredStrategy ?? "default"}.${configuredExecutionMode.replaceAll("_", "-")}`
      : null;
  const activeAliasRow =
    (configuredAliasId
      ? (configuredAliasRows.find((row) => row.aliasId === configuredAliasId) ?? null)
      : null) ??
    (controllerModelId
      ? (configuredAliasRows.find((row) => row.effectiveModels.includes(controllerModelId)) ?? null)
      : null);
  const activeAliasLabel = activeAliasRow?.aliasId ?? "unresolved";
  const aliasReadinessSummary = configuredAliasRows.reduce(
    (summaryValue, row) => {
      summaryValue[row.readinessLabel] += 1;
      return summaryValue;
    },
    {
      degraded: 0,
      ready: 0,
      unavailable: 0,
    },
  );
  const aliasModeSummary = configuredAliasRows.reduce<Record<string, number>>(
    (summaryValue, row) => {
      summaryValue[row.modeLabel] = (summaryValue[row.modeLabel] ?? 0) + 1;
      return summaryValue;
    },
    {},
  );
  const aliasModeSummaryLabel =
    Object.entries(aliasModeSummary)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "en"))
      .slice(0, 3)
      .map(([modeLabel, count]) => `${modeLabel} ${count}`)
      .join(" • ") || "No alias modes";
  const overviewCandidates = selectOverviewRouterCandidates(candidates);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Alias inventory"
        description="Keep the current alias posture visible, then expand the registry only when you need every pool."
      >
        {configuredAliasRows.length === 0 ? (
          <EmptyState label="No model aliases are configured yet." />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className={utilityLabelClassName}>Current active alias</p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`${bodyStrongTextClassName} break-words text-[var(--rm-fg)]`}>
                    {activeAliasLabel}
                  </p>
                  {activeAliasRow ? <StatusPill tone="accent">active</StatusPill> : null}
                </div>
                <p className={supportingTextClassName}>
                  {activeAliasRow
                    ? `${activeAliasRow.modeLabel} mode • ${activeAliasRow.candidateExpansionLabel}`
                    : "The current strategy and execution mode do not resolve to a visible alias row."}
                </p>
              </div>
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className={utilityLabelClassName}>Alias readiness</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <StatusPill tone="success">{aliasReadinessSummary.ready} ready</StatusPill>
                  <StatusPill tone="warning">{aliasReadinessSummary.degraded} degraded</StatusPill>
                  <StatusPill tone="neutral">
                    {aliasReadinessSummary.unavailable} unavailable
                  </StatusPill>
                </div>
                <p className={supportingTextClassName}>
                  Readiness is derived from matching endpoint availability, active state, and health
                  posture.
                </p>
              </div>
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className={utilityLabelClassName}>Alias modes</p>
                <p className={`${bodyStrongTextClassName} break-words text-[var(--rm-fg)]`}>
                  {aliasModeSummaryLabel}
                </p>
                <p className={supportingTextClassName}>
                  Mode mix across the full alias registry without forcing the entire table open.
                </p>
              </div>
            </div>

            <DisclosureSection summary={`Browse all alias pools (${configuredAliasRows.length})`}>
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
                        <td className="py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={bodyStrongTextClassName}>{row.aliasId}</span>
                            {activeAliasRow?.aliasId === row.aliasId ? (
                              <StatusPill tone="accent">active</StatusPill>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-3 text-[var(--rm-secondary)]">{row.modeLabel}</td>
                        <td className="py-3 text-[var(--rm-secondary)]">
                          {row.effectiveModels.length > 0 ? row.effectiveModels.join(", ") : "—"}
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
            </DisclosureSection>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Routing candidates"
        description="Concrete endpoint and model candidates currently visible to the router for this runtime posture."
      >
        {overviewCandidates.length === 0 ? (
          <EmptyState
            label={
              candidates.length === 0
                ? "No routing candidates are available."
                : "No routing candidates are currently eligible for this runtime posture."
            }
          />
        ) : (
          <div className="space-y-3 overflow-x-auto">
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
                {overviewCandidates.map((candidate) => (
                  <tr key={candidate.endpointId} className="border-t border-[var(--rm-border)]">
                    <td className={`py-3 ${bodyStrongTextClassName}`}>{candidate.modelId}</td>
                    <td className="max-w-[32rem] break-all py-3 text-[var(--rm-secondary)]">
                      {candidate.endpointId}
                    </td>
                    <td className="py-3 text-[var(--rm-secondary)]">{candidate.sourceType}</td>
                    <td className="py-3">
                      <StatusPill
                        tone={
                          candidate.healthStatus === "healthy"
                            ? "success"
                            : candidate.healthStatus === "offline" ||
                                candidate.healthStatus === "warming" ||
                                candidate.status === "warming"
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
                          <span className={supportingTextClassName}>candidate</span>
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
