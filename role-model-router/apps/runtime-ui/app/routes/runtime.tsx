import { useEffect, useState } from "react";
import { Link } from "react-router";

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
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import {
  type RuntimeConfigRecord,
  type RuntimeControllerAssignment,
  type RuntimeSummary,
  type RuntimeVersionInfo,
  fetchRuntimeShellSnapshot,
} from "../lib/runtime-api";
import { buildCredentialLifecycleBanner } from "../lib/view-models";

export default function RuntimeRoute() {
  const [summary, setSummary] = useState<RuntimeSummary | null>(null);
  const [controller, setController] = useState<RuntimeControllerAssignment | null>(null);
  const [configRecord, setConfigRecord] = useState<RuntimeConfigRecord | null>(null);
  const [version, setVersion] = useState<RuntimeVersionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRuntimeShellSnapshot()
      .then(({ summary, controller, configRecord, version }) => {
        setSummary(summary);
        setController(controller);
        setConfigRecord(configRecord);
        setVersion(version);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load runtime summary."),
      );
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!summary || !configRecord || !version) {
    return <LoadingState label="Loading runtime summary…" />;
  }

  const lifecycleBanner = buildCredentialLifecycleBanner(summary);
  const currentConfig = configRecord.config;
  const remoteMappingCount =
    currentConfig?.liteLLM.providers.reduce(
      (count, provider) => count + provider.modelMappings.length,
      0,
    ) ?? 0;
  const lifecycleSummaryRows = [
    { label: "active endpoints", value: summary.lifecycleSummary?.active ?? 0 },
    { label: "degraded routes", value: summary.lifecycleSummary?.degraded ?? 0 },
    { label: "offline records", value: summary.lifecycleSummary?.offline ?? 0 },
  ];
  const appliedPolicyRows = [
    ["Config path", configRecord.path ?? "not configured"],
    ["Execution mode", currentConfig?.executionMode ?? summary.executionMode ?? "pending"],
    ["Routing strategy", currentConfig?.routingStrategy ?? "pending"],
    ["Local models", String(currentConfig?.llamaSwap.models.length ?? 0)],
    ["Remote mappings", String(remoteMappingCount)],
  ] as const;
  const controllerRows = controller
    ? ([
        ["Endpoint", controller.endpointId],
        ["Model", controller.modelId],
        ["Source", controller.sourceType],
      ] as const)
    : [];
  const versionRows = [
    ["Vendor host", version.version],
    ["Commit", version.commit],
    ["Build date", version.build_date],
    ["Runtime state root", summary.runtimeStateRoot ?? "unavailable"],
    ["Summary endpoint", "/api/role-model/runtime/summary"],
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <StatusPill tone="success">Active {summary.lifecycleSummary?.active ?? 0}</StatusPill>
        <StatusPill tone="warning">Degraded {summary.lifecycleSummary?.degraded ?? 0}</StatusPill>
        <StatusPill tone="neutral">Offline {summary.lifecycleSummary?.offline ?? 0}</StatusPill>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.72fr)]">
        <div className="space-y-4">
          <SectionCard title="Applied runtime policy">
            <div className={`${mutedPanelClassName} space-y-3 p-4`}>
              {appliedPolicyRows.map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-start justify-between gap-3">
                  <p className={utilityLabelClassName}>{label}</p>
                  <p className={`${bodyStrongTextClassName} max-w-[70%] break-all text-right`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <p className={`mt-4 ${supportingTextClassName}`}>
              Runtime config remains the authority for execution mode, routing strategy, and the
              current local plus remote model inventory.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className={secondaryButtonClassName} to="/app/system/runtime-config">
                Runtime config
              </Link>
              <Link className={secondaryButtonClassName} to="/app/system/session-readiness">
                Readiness diagnostics
              </Link>
            </div>
          </SectionCard>

          <SectionCard title="Execution readiness">
            <div className="mb-4 flex flex-wrap gap-3">
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
            <div className="mt-4 flex flex-wrap gap-3">
              {!lifecycleBanner || lifecycleBanner.blockingRows.length === 0 ? (
                <StatusPill tone="neutral">No blocking credential lifecycle rows</StatusPill>
              ) : (
                lifecycleBanner.blockingRows.map((row) => (
                  <StatusPill key={row.key} tone={row.tone}>
                    {row.label} {row.value}
                  </StatusPill>
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard title="Controller posture">
            {controller ? (
              <div className={`${mutedPanelClassName} space-y-3 p-4`}>
                {controllerRows.map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-start justify-between gap-3">
                    <p className={utilityLabelClassName}>{label}</p>
                    <p className={`${bodyStrongTextClassName} max-w-[70%] break-all text-right`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState label="No controller assigned yet. Activate a local or remote endpoint before pinning a controller." />
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Lifecycle summary">
            <div className="space-y-3">
              {lifecycleSummaryRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <p className={supportingTextClassName}>{row.label}</p>
                  <p className={bodyStrongTextClassName}>{row.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Version facts">
            <div className="space-y-3">
              {versionRows.map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-start justify-between gap-3">
                  <p className={utilityLabelClassName}>{label}</p>
                  <p className={`${bodyStrongTextClassName} max-w-[70%] break-all text-right`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
