import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import { usePageActions } from "../lib/shell-header-context";
import {
  type RuntimeControllerAssignment,
  type RuntimeSnapshot,
  type RuntimeVersionInfo,
  fetchControllerAssignment,
  fetchRuntimeSnapshot,
  fetchVersionInfo,
} from "../lib/runtime-api";
import { buildCredentialLifecycleBanner } from "../lib/view-models";

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

  usePageActions(
    <>
      <a className={secondaryButtonClassName} href="/api/role-model/runtime/summary">
        Runtime JSON
      </a>
      <a className={secondaryButtonClassName} href="/api/role-model/controller">
        Controller JSON
      </a>
    </>,
    [],
  );

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot || !controllerLoaded || !version) {
    return <LoadingState label="Loading runtime summary…" />;
  }

  const lifecycleBanner = buildCredentialLifecycleBanner(snapshot.summary);

  return (
    <div className="space-y-6">
      <SectionCard title="Session readiness">
        <p className="text-sm text-[var(--rm-secondary)]">
          Bootstrap receipts, routable inventory, and alias drift warnings live on the dedicated
          session readiness surface.
        </p>
        <div className="mt-4">
          <Link className={secondaryButtonClassName} to="/app/system/session-readiness">
            Open session readiness
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Lifecycle summary">
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

      <SectionCard title="Execution readiness">
        <div className="mb-4 flex flex-wrap gap-3">
          {lifecycleBanner ? (
            <>
              <StatusPill tone={lifecycleBanner.authorityTone}>
                {lifecycleBanner.authorityLabel}
              </StatusPill>
              {lifecycleBanner.archivedStaleCount > 0 ? (
                <StatusPill tone="neutral">
                  Archived stale {lifecycleBanner.archivedStaleCount}
                </StatusPill>
              ) : null}
            </>
          ) : (
            <StatusPill tone="neutral">Lifecycle contract unavailable</StatusPill>
          )}
        </div>
        {lifecycleBanner ? (
          <p className="mb-4 text-sm text-[var(--rm-secondary)]">{lifecycleBanner.detail}</p>
        ) : null}
        <div className="flex flex-wrap gap-3">
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

      <SectionCard title="Version and boundary facts">
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

      <SectionCard title="Preserved host surfaces">
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
