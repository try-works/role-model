import { useEffect, useMemo, useState } from "react";

import {
  CodeBlock,
  DisclosureSection,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  foregroundEmphasisClassName,
  mutedPanelClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import { formatRoutingModeLabel } from "../lib/routing-mode";
import {
  type RouterConfig,
  type RouterSummary,
  type RuntimeConfigRecord,
  type RuntimeControllerAssignment,
  fetchControllerAssignment,
  fetchRouterConfig,
  fetchRouterSummary,
  fetchRuntimeConfig,
} from "../lib/runtime-api";

function stringifyRecord(value: unknown): string {
  return JSON.stringify(value ?? {}, null, 2);
}

const compactInspectorClassName = "max-h-[360px] overflow-auto pr-1";

export default function RouterConfigRoute() {
  const [routerConfig, setRouterConfig] = useState<RouterConfig | null>(null);
  const [runtimeConfigRecord, setRuntimeConfigRecord] = useState<RuntimeConfigRecord | null>(null);
  const [controllerAssignment, setControllerAssignment] =
    useState<RuntimeControllerAssignment | null>(null);
  const [routerSummary, setRouterSummary] = useState<RouterSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchRouterConfig(),
      fetchRuntimeConfig(),
      fetchControllerAssignment(),
      fetchRouterSummary(),
    ])
      .then(([nextRouterConfig, nextRuntimeConfigRecord, nextControllerAssignment, nextSummary]) => {
        setRouterConfig(nextRouterConfig);
        setRuntimeConfigRecord(nextRuntimeConfigRecord);
        setControllerAssignment(nextControllerAssignment);
        setRouterSummary(nextSummary);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load routing config."),
      );
  }, []);

  const policyCounts = useMemo(() => {
    return {
      roleBindingCount: routerConfig?.policySources.roleBindings?.length ?? 0,
      roleCount: routerConfig?.policySources.roles.length ?? 0,
      taskCount: routerConfig?.policySources.tasks.length ?? 0,
    };
  }, [routerConfig]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!routerConfig || !runtimeConfigRecord || !routerSummary) {
    return <LoadingState label="Loading routing config…" />;
  }

  const persistedStrategy = routerConfig.persisted.strategy ?? "unset";
  const persistedExecutionMode = routerConfig.persisted.executionMode;
  const preferredEndpoints = routerConfig.guidance.preferredEndpointIds;
  const ignoredEndpoints = routerConfig.guidance.ignoredEndpointIds;
  const appliedConfigSummary = {
    aliasCount:
      runtimeConfigRecord.config?.modelAliases?.length ??
      runtimeConfigRecord.config?.model_aliases?.length ??
      0,
    applied: runtimeConfigRecord.applied,
    executionMode: runtimeConfigRecord.config?.executionMode ?? null,
    path: runtimeConfigRecord.path,
    routingStrategy: runtimeConfigRecord.config?.routingStrategy ?? null,
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Routing provenance"
        description="Read-only routing provenance surface spanning persisted posture, controller context, guidance, and policy-source inputs."
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]">
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className={utilityLabelClassName}>Persisted strategy</p>
                <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                  {formatRoutingModeLabel(persistedStrategy)}
                </p>
                <p className={supportingTextClassName}>
                  Strategy value returned by the router config control-plane surface.
                </p>
              </div>
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className={utilityLabelClassName}>Execution mode</p>
                <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                  {persistedExecutionMode.replaceAll("_", " ")}
                </p>
                <p className={supportingTextClassName}>
                  Effective runtime mode currently paired with the persisted strategy.
                </p>
              </div>
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className={utilityLabelClassName}>Guidance endpoints</p>
                <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                  {preferredEndpoints.length} preferred / {ignoredEndpoints.length} ignored
                </p>
                <p className={supportingTextClassName}>
                  Router guidance keeps explicit endpoint inclusions and suppressions visible here.
                </p>
              </div>
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                <p className={utilityLabelClassName}>Policy inputs</p>
                <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                  {policyCounts.roleCount} roles / {policyCounts.taskCount} tasks
                </p>
                <p className={supportingTextClassName}>
                  Role, task, and optional binding inputs that shape routing policy provenance.
                </p>
              </div>
            </div>

            <SectionCard
              title="Policy inputs"
              description="Keep policy-source counts and endpoint guidance visible without requiring raw config inspection."
            >
              <div className="grid gap-4 xl:grid-cols-2">
                <div className={`${mutedPanelClassName} p-4`}>
                  <p className={foregroundEmphasisClassName}>Guidance provenance</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusPill tone="accent">
                      {routerConfig.guidance.endpointId ?? "No pinned endpoint"}
                    </StatusPill>
                    <StatusPill tone="neutral">
                      {preferredEndpoints.length} preferred endpoint
                      {preferredEndpoints.length === 1 ? "" : "s"}
                    </StatusPill>
                    <StatusPill tone="warning">
                      {ignoredEndpoints.length} ignored endpoint
                      {ignoredEndpoints.length === 1 ? "" : "s"}
                    </StatusPill>
                  </div>
                  <p className={`mt-4 ${supportingTextClassName}`}>
                    Guidance is read-only here so provenance can be audited separately from the
                    editing surfaces on Overview, Strategy, and Controller.
                  </p>
                </div>

                <div className={`${mutedPanelClassName} p-4`}>
                  <p className={foregroundEmphasisClassName}>Policy-source counts</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className={utilityLabelClassName}>Roles</p>
                      <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                        {policyCounts.roleCount}
                      </p>
                    </div>
                    <div>
                      <p className={utilityLabelClassName}>Tasks</p>
                      <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                        {policyCounts.taskCount}
                      </p>
                    </div>
                    <div>
                      <p className={utilityLabelClassName}>Bindings</p>
                      <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                        {policyCounts.roleBindingCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-4 xl:grid-cols-2">
              <SectionCard
                title="Source provenance"
                description="Keep the source map compact in the primary layout, then open the raw payload only when auditing exact config origins."
              >
                <div className={`${mutedPanelClassName} space-y-3 p-4`}>
                  {Object.entries(routerConfig.sources ?? {}).map(([key, value]) => (
                    <div
                      key={key}
                      className="grid gap-1 border-b border-[var(--rm-border)] pb-3 last:border-b-0 last:pb-0"
                    >
                      <p className={utilityLabelClassName}>{key}</p>
                      <p className={`break-all ${supportingTextClassName}`}>
                        {String(value ?? "—")}
                      </p>
                    </div>
                  ))}
                </div>
                <DisclosureSection summary="View raw source payload">
                  <div className="max-h-[360px] overflow-auto pr-1">
                    <CodeBlock>{stringifyRecord(routerConfig.sources)}</CodeBlock>
                  </div>
                </DisclosureSection>
              </SectionCard>
              <SectionCard
                title="Policy source payload"
                description="Expose compact policy-source totals first so the operator can confirm scope without paging through the entire payload."
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                    <p className={utilityLabelClassName}>Roles payload</p>
                    <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                      {routerConfig.policySources.roles.length}
                    </p>
                  </div>
                  <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                    <p className={utilityLabelClassName}>Tasks payload</p>
                    <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                      {routerConfig.policySources.tasks.length}
                    </p>
                  </div>
                  <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                    <p className={utilityLabelClassName}>Bindings payload</p>
                    <p className={`${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                      {routerConfig.policySources.roleBindings?.length ?? 0}
                    </p>
                  </div>
                </div>
                <DisclosureSection summary="View raw policy payload">
                  <div className="max-h-[360px] overflow-auto pr-1">
                    <CodeBlock>{stringifyRecord(routerConfig.policySources)}</CodeBlock>
                  </div>
                </DisclosureSection>
              </SectionCard>
            </div>
          </div>

          <div className="space-y-3">
            <div className={`${mutedPanelClassName} p-4 text-[var(--rm-secondary)]`}>
              <p className={foregroundEmphasisClassName}>Persisted config record</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={runtimeConfigRecord.applied ? "success" : "warning"}>
                  {runtimeConfigRecord.applied ? "config applied" : "config unavailable"}
                </StatusPill>
                <StatusPill tone="neutral">
                  {appliedConfigSummary.aliasCount} alias
                  {appliedConfigSummary.aliasCount === 1 ? "" : "es"}
                </StatusPill>
              </div>
              <p className={`mt-4 break-all ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                {runtimeConfigRecord.path ?? "No applied runtime config path"}
              </p>
              <p className={`mt-2 ${supportingTextClassName}`}>
                Persisted runtime config path and alias summary from the live config record.
              </p>
            </div>

            <div className={`${mutedPanelClassName} p-4 text-[var(--rm-secondary)]`}>
              <p className={foregroundEmphasisClassName}>Controller context</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill tone={controllerAssignment ? "accent" : "neutral"}>
                  {controllerAssignment ? "live controller" : "no live controller"}
                </StatusPill>
                <StatusPill tone={routerConfig.controller ? "accent" : "neutral"}>
                  {routerConfig.controller ? "router-config controller" : "no config controller"}
                </StatusPill>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <p className={utilityLabelClassName}>Live controller endpoint</p>
                  <p className={`mt-2 break-all ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {controllerAssignment?.endpointId ?? "No controller assigned"}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Config controller endpoint</p>
                  <p className={`mt-2 break-all ${supportingTextClassName}`}>
                    {routerConfig.controller?.endpointId ?? "No controller stored in router config"}
                  </p>
                </div>
              </div>
            </div>

            <div className={`${mutedPanelClassName} p-4 text-[var(--rm-secondary)]`}>
              <p className={foregroundEmphasisClassName}>Observed router posture</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={utilityLabelClassName}>Configured candidates</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {routerSummary.configuredCandidateCount}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Recent decisions</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {routerSummary.recentDecisionCount}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Summary strategy</p>
                  <p className={`mt-2 ${supportingTextClassName}`}>
                    {formatRoutingModeLabel(routerSummary.strategy ?? "unset")}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Summary mode</p>
                  <p className={`mt-2 ${supportingTextClassName}`}>
                    {routerSummary.executionMode.replaceAll("_", " ")}
                  </p>
                </div>
              </div>
            </div>

            <SectionCard
              title="Applied runtime record"
              description="Keep the runtime-config routing subset visible for direct comparison with router-config provenance."
            >
              <DisclosureSection summary="View applied routing record">
                <div className={compactInspectorClassName}>
                  <CodeBlock>{stringifyRecord(appliedConfigSummary)}</CodeBlock>
                </div>
              </DisclosureSection>
            </SectionCard>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
