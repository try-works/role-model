import { useEffect, useMemo, useState } from "react";

import { EmptyState, ErrorState, FactCard, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
import { mutedPanelClassName, primaryButtonClassName } from "../lib/design-system";
import {
  fetchControllerAssignment,
  fetchRuntimeSnapshot,
  updateControllerAssignment,
  type RuntimeControllerAssignment,
  type RuntimeEndpoint,
  type RuntimeSnapshot,
} from "../lib/runtime-api";

function toDisplayLabel(modelId: string): string {
  const segment = modelId.includes("/") ? modelId.split("/").at(-1) ?? modelId : modelId;
  return segment.replace(/[-_]+/g, " ");
}

export default function ControlControllerRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [controller, setController] = useState<RuntimeControllerAssignment | null>(null);
  const [controllerLoaded, setControllerLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEndpointId, setPendingEndpointId] = useState<string | null>(null);

  const load = () =>
    Promise.all([fetchRuntimeSnapshot(), fetchControllerAssignment()])
      .then(([nextSnapshot, nextController]) => {
        setSnapshot(nextSnapshot);
        setController(nextController);
        setControllerLoaded(true);
        setError(null);
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load controller state."));

  useEffect(() => {
    void load();
  }, []);

  const candidates = useMemo(() => {
    if (!snapshot) {
      return [];
    }

    return [...snapshot.endpoints]
      .sort((left, right) => {
        const activeWeight = (endpoint: RuntimeEndpoint) =>
          controller?.endpointId === endpoint.endpointId ? 0 : endpoint.status === "active" ? 1 : 2;
        return (
          activeWeight(left) - activeWeight(right) ||
          left.modelId.localeCompare(right.modelId, "en") ||
          left.endpointId.localeCompare(right.endpointId, "en")
        );
      })
      .map((endpoint) => ({
        ...endpoint,
        isActiveController: controller?.endpointId === endpoint.endpointId,
      }));
  }, [controller?.endpointId, snapshot]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot || !controllerLoaded) {
    return <LoadingState label="Loading controller surface…" />;
  }

  const healthyCandidateCount = candidates.filter((endpoint) => endpoint.healthStatus === "healthy").length;
  const toolingCandidateCount = candidates.filter((endpoint) => endpoint.toolCallingSupported).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control"
        title="Routing controller"
        description="Choose the explicit endpoint/model pair that adjudicates routed requests, with local and remote candidates shown in one list."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Current source"
          value={controller?.sourceType ?? "unassigned"}
          detail="The explicit runtime-owned controller assignment stays visible at the top of the page."
          emphasis
        />
        <FactCard label="Candidates" value={candidates.length} detail="Every endpoint remains eligible for controller review here." />
        <FactCard label="Healthy" value={healthyCandidateCount} detail="Candidates whose current health posture is already marked healthy." />
        <FactCard label="Tool-capable" value={toolingCandidateCount} detail="Candidates that can participate in tool-calling controller work." />
      </div>

      <SectionCard title="Current assignment" description="The controller is persisted in the runtime control plane and can be changed without editing fixtures.">
        {controller ? (
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
        ) : (
          <EmptyState label="No controller is assigned yet. Activate an endpoint first, then return here to pin the controller." />
        )}
      </SectionCard>

      <SectionCard title="Controller candidates" description="Candidates show source type, health, role coverage, and tooling posture before you promote them.">
        {candidates.length === 0 ? (
          <EmptyState label="No endpoints are available yet. Configure runtime config or activate a provider endpoint to continue." />
        ) : (
          <div className="grid grid-cols-12 gap-4">
            {candidates.map((endpoint) => (
              <div key={endpoint.endpointId} className="col-span-12 rounded-none border border-[var(--rm-border)] bg-[var(--rm-surface)] p-5 xl:col-span-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">{endpoint.sourceType ?? "unknown"}</p>
                    <h3 className="mt-2 text-lg font-medium text-[var(--rm-fg)]">{toDisplayLabel(endpoint.modelId)}</h3>
                    <p className="mt-2 break-all text-sm text-[var(--rm-secondary)]">{endpoint.endpointId}</p>
                  </div>
                  <StatusPill tone={endpoint.isActiveController ? "accent" : endpoint.status === "active" ? "success" : "warning"}>
                    {endpoint.isActiveController ? "controller" : endpoint.status ?? "candidate"}
                  </StatusPill>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusPill tone={endpoint.toolCallingSupported ? "success" : "neutral"}>
                    {endpoint.toolCallingSupported ? `tooling ${endpoint.toolCallingStyle ?? "enabled"}` : "no tool calling"}
                  </StatusPill>
                  <StatusPill tone={endpoint.healthStatus === "healthy" ? "success" : "warning"}>
                    {endpoint.healthStatus ?? "unknown health"}
                  </StatusPill>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[var(--rm-secondary)]">
                  <p><span className="font-medium text-[var(--rm-fg)]">Roles:</span> {endpoint.roleIds?.join(", ") || "None"}</p>
                  <p><span className="font-medium text-[var(--rm-fg)]">Serving source:</span> {endpoint.servingSource ?? "unknown"}</p>
                </div>

                <div className="mt-5">
                  <button
                    className={primaryButtonClassName}
                    type="button"
                    disabled={endpoint.isActiveController || pendingEndpointId === endpoint.endpointId}
                    onClick={() => {
                      setPendingEndpointId(endpoint.endpointId);
                      setError(null);
                      void updateControllerAssignment({ endpointId: endpoint.endpointId })
                        .then((nextController) => setController(nextController))
                        .catch((value: unknown) =>
                          setError(value instanceof Error ? value.message : "Could not update the controller assignment."),
                        )
                        .finally(() => setPendingEndpointId(null));
                    }}
                  >
                    {endpoint.isActiveController
                      ? "Current controller"
                      : pendingEndpointId === endpoint.endpointId
                        ? "Saving…"
                        : "Use as controller"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
