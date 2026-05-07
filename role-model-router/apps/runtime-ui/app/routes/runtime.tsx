import { useEffect, useState } from "react";

import { ErrorState, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import {
  fetchControllerAssignment,
  fetchRuntimeSnapshot,
  fetchVersionInfo,
  type RuntimeControllerAssignment,
  type RuntimeSnapshot,
  type RuntimeVersionInfo,
} from "../lib/runtime-api";

export default function RuntimeRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [controller, setController] = useState<RuntimeControllerAssignment | null>(null);
  const [version, setVersion] = useState<RuntimeVersionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeSnapshot(), fetchControllerAssignment(), fetchVersionInfo()])
      .then(([nextSnapshot, nextController, nextVersion]) => {
        setSnapshot(nextSnapshot);
        setController(nextController);
        setVersion(nextVersion);
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load runtime summary."));
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot || !controller || !version) {
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
            <a className={secondaryButtonClassName} href="/api/role-model/runtime/summary">Runtime JSON</a>
            <a className={secondaryButtonClassName} href="/api/role-model/controller">Controller JSON</a>
          </>
        }
      />

      <SectionCard title="Lifecycle summary" description="Current endpoint lifecycle groups from the runtime control plane.">
        <div className="flex flex-wrap gap-3">
          <StatusPill tone="success">Active {snapshot.summary.lifecycleSummary?.active ?? 0}</StatusPill>
          <StatusPill tone="warning">Degraded {snapshot.summary.lifecycleSummary?.degraded ?? 0}</StatusPill>
          <StatusPill tone="neutral">Offline {snapshot.summary.lifecycleSummary?.offline ?? 0}</StatusPill>
        </div>
      </SectionCard>

      <SectionCard title="Controller posture" description="The controller remains an explicit runtime-owned assignment rather than an implicit default.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className={`${mutedPanelClassName} p-4`}>
            <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">Endpoint</p>
            <p className="mt-2 break-all text-sm font-medium text-[var(--rm-fg)]">{controller.endpointId}</p>
          </div>
          <div className={`${mutedPanelClassName} p-4`}>
            <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">Model</p>
            <p className="mt-2 text-sm font-medium text-[var(--rm-fg)]">{controller.modelId}</p>
          </div>
          <div className={`${mutedPanelClassName} p-4`}>
            <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">Source</p>
            <div className="mt-2">
              <StatusPill tone={controller.sourceType === "local" ? "accent" : "neutral"}>{controller.sourceType}</StatusPill>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Version and boundary facts" description="Version, provenance, and health-oriented references now live in the runtime page instead of a separate system route.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Vendor host version</p>
            <p className="mt-2 text-base text-[var(--rm-fg)]">{version.version}</p>
            <p className="mt-2 break-all">Commit {version.commit}</p>
            <p className="mt-1">Built {version.build_date}</p>
          </div>
          <a className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`} href="/api/role-model/runtime/summary">
            <span className="block font-medium text-[var(--rm-fg)]">/api/role-model/runtime/summary</span>
            Repo-owned runtime topology and lifecycle summary
          </a>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Health posture</p>
            <p className="mt-2">Use the lifecycle summary above as the primary shell health view; raw vendor health and provenance stay adjacent to this page rather than in a duplicate system route.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Preserved host surfaces" description="These stay operator-adjacent and are intentionally not hidden by the new app shell.">
        <div className="grid gap-3 md:grid-cols-2">
          <a className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`} href="/logs">
            <span className="block font-medium text-[var(--rm-fg)]">/logs</span>
            Raw host log output
          </a>
          <a className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`} href="/api/metrics">
            <span className="block font-medium text-[var(--rm-fg)]">/api/metrics</span>
            Vendor metrics and capture ids
          </a>
          <a className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`} href="/health">
            <span className="block font-medium text-[var(--rm-fg)]">/health</span>
            Raw host health endpoint for route-local diagnostics
          </a>
        </div>
      </SectionCard>

      <SectionCard title="Runtime contract notes" description="Tooling and MCP expectations that should remain visible from the system layer.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Tool execution</p>
            <p className="mt-2">Runtime responses may emit `tool_calls`, and request inspection now preserves execution receipts beside captures and profile data.</p>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Validation floor</p>
            <p className="mt-2">`runtime:validate-ui`, `runtime:validate-host`, and `runtime:validate-tools` stay the practical validation floor for this shell and bridge.</p>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Integration boundary</p>
            <p className="mt-2">Downstream OpenAI-compatible consumer setup and compatibility guidance now live under Integrations rather than being mixed into the core system page.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
