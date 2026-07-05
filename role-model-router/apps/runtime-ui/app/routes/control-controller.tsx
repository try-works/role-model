import { useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  cardClassName,
  foregroundEmphasisClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import {
  type RuntimeControllerAssignment,
  type RuntimeEndpoint,
  type RuntimeSnapshot,
  fetchControllerAssignment,
  fetchRuntimeSnapshot,
  updateControllerAssignment,
} from "../lib/runtime-api";

function toDisplayLabel(modelId: string): string {
  const segment = modelId.includes("/") ? (modelId.split("/").at(-1) ?? modelId) : modelId;
  return segment.replace(/[-_]+/g, " ");
}

function summarizeRoleCoverage(roleIds: readonly string[] | undefined): {
  readonly countLabel: string;
  readonly preview: string;
} {
  if (!roleIds || roleIds.length === 0) {
    return {
      countLabel: "No roles",
      preview: "This endpoint does not currently advertise runtime role coverage.",
    };
  }
  const visibleRoles = roleIds.slice(0, 4);
  const remainingCount = Math.max(roleIds.length - visibleRoles.length, 0);
  return {
    countLabel: `${roleIds.length} role${roleIds.length === 1 ? "" : "s"}`,
    preview:
      remainingCount > 0
        ? `${visibleRoles.join(", ")}, +${remainingCount} more`
        : visibleRoles.join(", "),
  };
}

export default function ControlControllerRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [controller, setController] = useState<RuntimeControllerAssignment | null>(null);
  const [controllerLoaded, setControllerLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEndpointId, setPendingEndpointId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeSnapshot(), fetchControllerAssignment()])
      .then(([nextSnapshot, nextController]) => {
        setSnapshot(nextSnapshot);
        setController(nextController);
        setControllerLoaded(true);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load controller state."),
      );
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

  const candidatePosture = useMemo(() => {
    return candidates.reduce(
      (summary, endpoint) => {
        summary.localCount += endpoint.sourceType === "local" ? 1 : 0;
        summary.remoteCount += endpoint.sourceType === "remote" ? 1 : 0;
        summary.healthyCount += endpoint.healthStatus === "healthy" ? 1 : 0;
        summary.toolReadyCount += endpoint.toolCallingSupported ? 1 : 0;
        return summary;
      },
      {
        healthyCount: 0,
        localCount: 0,
        remoteCount: 0,
        toolReadyCount: 0,
      },
    );
  }, [candidates]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot || !controllerLoaded) {
    return <LoadingState label="Loading controller surface…" />;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Controller assignment"
        description={`Assign the persisted routing controller here. Candidate cards keep health, source type, role coverage, and tooling posture visible before promotion. ${candidates.length} endpoints are currently available for review.`}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,372px)]">
          <div className="space-y-4">
            {candidates.length === 0 ? (
              <EmptyState label="No endpoints are available yet. Configure runtime config or activate a provider endpoint to continue." />
            ) : (
              <div className="grid gap-3 xl:grid-cols-2">
                {candidates.map((endpoint) => {
                  const roleCoverage = summarizeRoleCoverage(endpoint.roleIds);

                  return (
                    <div key={endpoint.endpointId} className={`${cardClassName} p-4`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={utilityLabelClassName}>
                            {endpoint.sourceType ?? "unknown source"}
                          </p>
                          <p className={`mt-2 ${foregroundEmphasisClassName}`}>
                            {toDisplayLabel(endpoint.modelId)}
                          </p>
                          <p className={`mt-2 break-all ${supportingTextClassName}`}>
                            {endpoint.endpointId}
                          </p>
                        </div>
                        <StatusPill
                          tone={
                            endpoint.isActiveController
                              ? "accent"
                              : endpoint.status === "active"
                                ? "success"
                                : "warning"
                          }
                        >
                          {endpoint.isActiveController
                            ? "controller"
                            : (endpoint.status ?? "candidate")}
                        </StatusPill>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <StatusPill tone={endpoint.toolCallingSupported ? "accent" : "neutral"}>
                          {endpoint.toolCallingSupported
                            ? `tooling ${endpoint.toolCallingStyle ?? "enabled"}`
                            : "no tool calling"}
                        </StatusPill>
                        <StatusPill
                          tone={endpoint.healthStatus === "healthy" ? "success" : "warning"}
                        >
                          {endpoint.healthStatus ?? "unknown health"}
                        </StatusPill>
                        <StatusPill tone="neutral">{roleCoverage.countLabel}</StatusPill>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className={utilityLabelClassName}>Role coverage</p>
                          <p className={`mt-2 ${supportingTextClassName}`}>
                            {roleCoverage.preview}
                          </p>
                        </div>
                        <div>
                          <p className={utilityLabelClassName}>Serving source</p>
                          <p className={`mt-2 ${supportingTextClassName}`}>
                            {endpoint.servingSource ?? "unknown"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <button
                          className={primaryButtonClassName}
                          type="button"
                          disabled={
                            endpoint.isActiveController || pendingEndpointId === endpoint.endpointId
                          }
                          onClick={() => {
                            setPendingEndpointId(endpoint.endpointId);
                            setError(null);
                            void updateControllerAssignment({ endpointId: endpoint.endpointId })
                              .then((nextController) => setController(nextController))
                              .catch((value: unknown) =>
                                setError(
                                  value instanceof Error
                                    ? value.message
                                    : "Could not update the controller assignment.",
                                ),
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
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className={`${mutedPanelClassName} p-4 text-[var(--rm-secondary)]`}>
              <p className={foregroundEmphasisClassName}>Current controller</p>
              {controller ? (
                <>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusPill tone="success">controller assigned</StatusPill>
                    <StatusPill tone={controller.sourceType === "local" ? "accent" : "neutral"}>
                      {controller.sourceType ?? "unknown source"}
                    </StatusPill>
                  </div>
                  <p className={`mt-4 break-all ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {controller.endpointId}
                  </p>
                  <p className={`mt-2 ${supportingTextClassName}`}>{controller.modelId}</p>
                </>
              ) : (
                <p className={`mt-3 ${supportingTextClassName}`}>
                  No controller is assigned yet. Activate an endpoint first, then return here to pin
                  the controller.
                </p>
              )}
            </div>

            <div className={`${mutedPanelClassName} p-4 text-[var(--rm-secondary)]`}>
              <p className={foregroundEmphasisClassName}>Candidate posture</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className={utilityLabelClassName}>Available endpoints</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {candidates.length}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Healthy endpoints</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {candidatePosture.healthyCount}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Local / Remote</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {candidatePosture.localCount} / {candidatePosture.remoteCount}
                  </p>
                </div>
                <div>
                  <p className={utilityLabelClassName}>Tool-ready endpoints</p>
                  <p className={`mt-2 ${bodyStrongTextClassName} text-[var(--rm-fg)]`}>
                    {candidatePosture.toolReadyCount}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
