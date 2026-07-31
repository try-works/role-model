import { MetricStrip } from "@role-model/ui";
import { useEffect, useMemo, useState } from "react";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  cardClassName,
  primaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import {
  type RuntimeControllerAssignment,
  type RuntimeEndpoint,
  fetchControllerAssignment,
  fetchRuntimeEndpoints,
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
      preview: "—",
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
  const [endpoints, setEndpoints] = useState<readonly RuntimeEndpoint[] | null>(null);
  const [controller, setController] = useState<RuntimeControllerAssignment | null>(null);
  const [controllerLoaded, setControllerLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEndpointId, setPendingEndpointId] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeEndpoints(), fetchControllerAssignment()])
      .then(([nextEndpoints, nextController]) => {
        setEndpoints(nextEndpoints);
        setController(nextController);
        setControllerLoaded(true);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load controller state."),
      );
  }, []);

  const candidates = useMemo(() => {
    if (!endpoints) {
      return [];
    }

    return [...endpoints]
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
  }, [controller?.endpointId, endpoints]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!endpoints || !controllerLoaded) {
    return <LoadingState label="Loading controller surface…" />;
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Controller assignment"
        description="Assign the persisted routing controller. Candidate cards keep health, source type, role coverage, and tooling posture visible before promotion."
      >
        {candidates.length === 0 ? (
          <EmptyState label="No endpoints are available yet. Configure runtime config or activate a provider endpoint to continue." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {candidates.map((endpoint) => {
              const roleCoverage = summarizeRoleCoverage(endpoint.roleIds);
              const sourceLabel = [endpoint.sourceType ?? "unknown", endpoint.servingSource ?? null]
                .filter(Boolean)
                .join(" · ");

              return (
                <div key={endpoint.endpointId} className={`${cardClassName} space-y-4 p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div
                      className={`min-w-0 ${
                        endpoint.isActiveController
                          ? "border-l-2 border-[var(--rm-accent)] pl-3"
                          : "border-l-2 border-transparent pl-3"
                      }`}
                    >
                      <p className={bodyStrongTextClassName}>{toDisplayLabel(endpoint.modelId)}</p>
                    </div>
                    <Badge
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
                    </Badge>
                  </div>

                  <MetricStrip
                    aria-label={`${endpoint.modelId} controller candidate`}
                    variant="inventory"
                    className="max-w-none"
                    items={[
                      { id: "endpoint", label: "Endpoint", value: endpoint.endpointId },
                      { id: "source", label: "Source", value: sourceLabel },
                      {
                        id: "health",
                        label: "Health",
                        value: endpoint.healthStatus ?? "unknown",
                      },
                      {
                        id: "tooling",
                        label: "Tooling",
                        value: endpoint.toolCallingSupported
                          ? (endpoint.toolCallingStyle ?? "enabled")
                          : "none",
                      },
                      { id: "roles", label: "Roles", value: roleCoverage.preview },
                      { id: "role-count", label: "Role count", value: roleCoverage.countLabel },
                      {
                        id: "serving",
                        label: "Serving",
                        value: endpoint.servingSource ?? sourceLabel,
                      },
                    ]}
                  />

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
                  {endpoint.isActiveController ? null : (
                    <p className={supportingTextClassName}>
                      Promote this endpoint to the persisted routing controller.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
