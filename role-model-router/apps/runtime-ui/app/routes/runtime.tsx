import { useEffect, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import {
  type RuntimeControllerAssignment,
  type RuntimeSnapshot,
  type RuntimeVersionInfo,
  fetchControllerAssignment,
  fetchRuntimeSnapshot,
  fetchVersionInfo,
} from "../lib/runtime-api";

export default function RuntimeRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [controller, setController] = useState<RuntimeControllerAssignment | null>(null);
  const [controllerLoaded, setControllerLoaded] = useState(false);
  const [version, setVersion] = useState<RuntimeVersionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeSnapshot(), fetchControllerAssignment(), fetchVersionInfo()])
      .then(([nextSnapshot, nextController, nextVersion]) => {
        setSnapshot(nextSnapshot);
        setController(nextController);
        setControllerLoaded(true);
        setVersion(nextVersion);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load runtime summary."),
      );
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot || !controllerLoaded || !version) {
    return <LoadingState label="Loading runtime summary…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System"
        title="Runtime topology"
        description="Bridge lifecycle, controller posture, version facts, tooling-aware validation links, and preserved host boundaries in one system view."
        actions={
          <>
            <a className={secondaryButtonClassName} href="/api/role-model/runtime/summary">
              Runtime JSON
            </a>
            <a className={secondaryButtonClassName} href="/api/role-model/controller">
              Controller JSON
            </a>
          </>
        }
      />

      <SectionCard
        title="Lifecycle summary"
        description="Current endpoint lifecycle groups from the runtime control plane."
      >
        <div className="flex flex-wrap gap-3">
          <StatusPill tone="success">
            Active {snapshot.summary.lifecycleSummary?.active ?? 0}
          </StatusPill>
          <StatusPill tone="warning">
            Degraded {snapshot.summary.lifecycleSummary?.degraded ?? 0}
          </StatusPill>
          <StatusPill tone="neutral">
            Offline {snapshot.summary.lifecycleSummary?.offline ?? 0}
          </StatusPill>
        </div>
      </SectionCard>

      <SectionCard
        title="Controller posture"
        description="The controller remains an explicit runtime-owned assignment rather than an implicit default."
      >
        {controller ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div className={`${mutedPanelClassName} p-4`}>
              <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                Endpoint
              </p>
              <p className="mt-2 break-all text-sm font-medium text-[var(--rm-fg)]">
                {controller.endpointId}
              </p>
            </div>
            <div className={`${mutedPanelClassName} p-4`}>
              <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                Model
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--rm-fg)]">{controller.modelId}</p>
            </div>
            <div className={`${mutedPanelClassName} p-4`}>
              <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                Source
              </p>
              <div className="mt-2">
                <StatusPill tone={controller.sourceType === "local" ? "accent" : "neutral"}>
                  {controller.sourceType}
                </StatusPill>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState label="No controller assigned yet. Activate a local or remote endpoint before pinning a controller." />
        )}
      </SectionCard>

      <SectionCard
        title="Version and boundary facts"
        description="Version, provenance, and health-oriented references now live in the runtime page instead of a separate system route."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Vendor host version</p>
            <p className="mt-2 text-base text-[var(--rm-fg)]">{version.version}</p>
            <p className="mt-2 break-all">Commit {version.commit}</p>
            <p className="mt-1">Built {version.build_date}</p>
          </div>
          <a
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            href="/api/role-model/runtime/summary"
          >
            <span className="block font-medium text-[var(--rm-fg)]">
              /api/role-model/runtime/summary
            </span>
            Repo-owned runtime topology and lifecycle summary
          </a>
        </div>
      </SectionCard>

      <SectionCard
        title="Preserved host surfaces"
        description="These stay operator-adjacent and are intentionally not hidden by the new app shell."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <a
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            href="/logs"
          >
            <span className="block font-medium text-[var(--rm-fg)]">/logs</span>
            Raw host log output
          </a>
          <a
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            href="/api/metrics"
          >
            <span className="block font-medium text-[var(--rm-fg)]">/api/metrics</span>
            Vendor metrics and capture ids
          </a>
          <a
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            href="/health"
          >
            <span className="block font-medium text-[var(--rm-fg)]">/health</span>
            Raw host health endpoint for route-local diagnostics
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
