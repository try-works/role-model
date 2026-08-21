import { MetricStrip } from "@role-model/ui";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  compactFieldButtonClassName,
  monoEyebrowClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { formatEndpointDisplayPath, formatModelIdentity } from "../lib/effort-identity";
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
        ["Endpoint", formatEndpointDisplayPath(controller)],
        ["Model", formatModelIdentity(controller, controller.modelId)],
        ["Source", controller.sourceType],
      ] as const)
    : [];
  const vendorHostLabel = ["role-model", version.release_version ?? version.version]
    .filter((part) => part && part.length > 0)
    .join(" ");
  const versionRows = [
    ["Vendor host", vendorHostLabel],
    ["Commit", version.commit],
    ["Build date", version.build_date],
    ["State root", summary.runtimeStateRoot ?? "—"],
    ["Summary API", "/api/role-model/runtime/summary"],
  ] as const;

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
            description="Execution mode, routing strategy, and local plus remote inventory."
          >
            <div className="space-y-3">
              {appliedPolicyRows.map(([label, value]) => (
                <div key={label} className="flex flex-wrap items-start justify-between gap-3">
                  <p className={monoEyebrowClassName}>{label}</p>
                  <p className={`${bodyStrongTextClassName} max-w-[70%] break-all text-right`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className={compactFieldButtonClassName} to="/app/system/runtime-config">
                Runtime config
              </Link>
              <Link className={compactFieldButtonClassName} to="/app/system/session-readiness">
                Session readiness
              </Link>
            </div>
          </SectionCard>

          <SectionCard
            title="Execution readiness"
            description="Lifecycle authority and blocking credential rows."
          >
            <div className="mb-4 flex flex-wrap gap-3">
              {lifecycleBanner ? (
                <>
                  <Badge tone={lifecycleBanner.authorityTone}>
                    {lifecycleBanner.authorityLabel}
                  </Badge>
                  {lifecycleBanner.archivedStaleCount > 0 ? (
                    <Badge tone="neutral">
                      archived stale {lifecycleBanner.archivedStaleCount}
                    </Badge>
                  ) : null}
                </>
              ) : (
                <Badge tone="neutral">Lifecycle contract unavailable</Badge>
              )}
              {!lifecycleBanner || lifecycleBanner.blockingRows.length === 0 ? (
                <Badge tone="neutral">no blockers</Badge>
              ) : (
                lifecycleBanner.blockingRows.map((row) => (
                  <Badge key={row.key} tone={row.tone}>
                    {row.label.toLowerCase()} {row.value}
                  </Badge>
                ))
              )}
            </div>
            {lifecycleBanner ? (
              <p className={supportingTextClassName}>{lifecycleBanner.detail}</p>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Controller posture"
            description="Pinned controller endpoint for routing decisions."
          >
            {controller ? (
              <div className="space-y-3">
                {controllerRows.map(([label, value]) => (
                  <div key={label} className="flex flex-wrap items-start justify-between gap-3">
                    <p className={monoEyebrowClassName}>{label}</p>
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

        <SectionCard title="Version facts" description="Host provenance and summary contract.">
          <div className="space-y-3">
            {versionRows.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <p className={monoEyebrowClassName}>{label}</p>
                <p className="break-all font-mono text-[12px] leading-4 text-[var(--rm-fg)]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
