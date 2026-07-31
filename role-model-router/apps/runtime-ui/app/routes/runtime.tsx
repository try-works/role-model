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

  return (
    <div className="space-y-6">
      <MetricStrip
        aria-label="Runtime lifecycle"
        variant="panel"
        items={[
          {
            id: "active",
            label: "Active",
            value: String(summary.lifecycleSummary?.active ?? 0),
          },
          {
            id: "degraded",
            label: "Degraded",
            value: String(summary.lifecycleSummary?.degraded ?? 0),
          },
          {
            id: "offline",
            label: "Offline",
            value: String(summary.lifecycleSummary?.offline ?? 0),
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <div className="space-y-4">
          <SectionCard
            title="Applied runtime policy"
            description="Runtime config remains the authority for execution mode, routing strategy, and the current local plus remote model inventory."
          >
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
        </div>

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
    </div>
  );
}
