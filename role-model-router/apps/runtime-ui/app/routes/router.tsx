import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  CodeBlock,
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import { usePageActions } from "../lib/shell-header-context";
import {
  type RouterConfig,
  type RouterSummary,
  type RuntimeConfigRecord,
  type RuntimeSnapshot,
  fetchRouterConfig,
  fetchRouterSummary,
  fetchRuntimeConfig,
  fetchRuntimeSnapshot,
} from "../lib/runtime-api";
import { buildAliasReadinessRows } from "../lib/view-models";

function asStringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export default function RouterOverviewRoute() {
  const [summary, setSummary] = useState<RouterSummary | null>(null);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [configRecord, setConfigRecord] = useState<RuntimeConfigRecord | null>(null);
  const [routerConfig, setRouterConfig] = useState<RouterConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchRouterSummary(),
      fetchRuntimeSnapshot(),
      fetchRuntimeConfig(),
      fetchRouterConfig(),
    ])
      .then(([nextSummary, nextSnapshot, nextConfigRecord, nextRouterConfig]) => {
        setSummary(nextSummary);
        setSnapshot(nextSnapshot);
        setConfigRecord(nextConfigRecord);
        setRouterConfig(nextRouterConfig);
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
  if (!summary || !snapshot || !configRecord || !routerConfig) {
    return <LoadingState label="Loading router overview…" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard label="Strategy" value={summary.strategy ?? "unset"} emphasis />
        <FactCard label="Execution mode" value={summary.executionMode} />
        <FactCard
          label="Controller"
          value={summary.controller?.modelId ?? "unassigned"}
        />
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

      <SectionCard title="Execution-ready aliases">
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

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="Guidance provenance">
          <div className="space-y-4">
            <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
              <p className="font-medium text-[var(--rm-fg)]">Guidance endpoint</p>
              <p className="mt-2">
                {routerConfig.guidance.endpointId ?? "No routing-model endpoint is configured."}
              </p>
            </div>
            {routerConfig.guidance.preferredEndpointIds.length === 0 &&
            routerConfig.guidance.ignoredEndpointIds.length === 0 ? (
              <EmptyState label="No preferred or ignored endpoints are currently configured." />
            ) : (
              <dl className="grid gap-4 text-sm md:grid-cols-2">
                <div className={`${mutedPanelClassName} p-4`}>
                  <dt className="font-medium text-[var(--rm-fg)]">Preferred endpoints</dt>
                  <dd className="mt-2 whitespace-pre-wrap text-[var(--rm-secondary)]">
                    {routerConfig.guidance.preferredEndpointIds.join("\n") || "n/a"}
                  </dd>
                </div>
                <div className={`${mutedPanelClassName} p-4`}>
                  <dt className="font-medium text-[var(--rm-fg)]">Ignored endpoints</dt>
                  <dd className="mt-2 whitespace-pre-wrap text-[var(--rm-secondary)]">
                    {routerConfig.guidance.ignoredEndpointIds.join("\n") || "n/a"}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Policy inputs">
          <div className="space-y-4">
            {routerConfig.policySources.roles.length === 0 ? (
              <EmptyState label="No role policy inputs are currently available." />
            ) : (
              routerConfig.policySources.roles.map((role, index) => (
                <div
                  key={`${asStringValue(role.role_id) ?? "role"}-${index}`}
                  className={`${mutedPanelClassName} p-4`}
                >
                  <p className="font-medium text-[var(--rm-fg)]">
                    {asStringValue(role.role_id) ?? "Unnamed role"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                    {asStringValue(role.description) ?? "No role description provided."}
                  </p>
                  <div className="mt-3">
                    <CodeBlock>
                      {JSON.stringify(role.routing_policy_overrides ?? {}, null, 2)}
                    </CodeBlock>
                  </div>
                </div>
              ))
            )}
            <div className={`${mutedPanelClassName} p-4`}>
              <p className="font-medium text-[var(--rm-fg)]">Task definitions</p>
              <CodeBlock>{JSON.stringify(routerConfig.policySources.tasks, null, 2)}</CodeBlock>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
