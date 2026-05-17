import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  CodeBlock,
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
} from "../components/page-primitives";
import {
  fieldClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import { type RouterConfig, type WorkbenchChatInput, fetchRouterConfig } from "../lib/runtime-api";

const ROUTING_MODE_OPTIONS: Array<{
  value: NonNullable<WorkbenchChatInput["routingModeOverride"]>;
  label: string;
  detail: string;
}> = [
  {
    value: "baseline",
    label: "Strategy A - Baseline",
    detail: "Use the deterministic baseline route without controller or difficulty guidance.",
  },
  {
    value: "controller",
    label: "Strategy B - Intelligent",
    detail: "Use controller-guided endpoint selection when the routing controller is available.",
  },
  {
    value: "difficulty",
    label: "Strategy C - Difficulty",
    detail: "Use difficulty-aware routing that matches the request to endpoint difficulty bounds.",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    detail: "Blend controller guidance with difficulty-aware fallback behavior.",
  },
] as const;

function asStringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export default function RouterConfigRoute() {
  const [config, setConfig] = useState<RouterConfig | null>(null);
  const [selectedRoutingMode, setSelectedRoutingMode] =
    useState<NonNullable<WorkbenchChatInput["routingModeOverride"]>>("baseline");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchRouterConfig()
      .then((routerConfig) => {
        setConfig(routerConfig);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load router config."),
      );
  }, []);

  const selectedRoutingModeDetails = useMemo(
    () =>
      ROUTING_MODE_OPTIONS.find((option) => option.value === selectedRoutingMode) ??
      ROUTING_MODE_OPTIONS[0],
    [selectedRoutingMode],
  );

  const header = (
    <PageHeader
      eyebrow="Router"
      title="Routing config"
      description="See low-level routing policy state, proposal routing modes, live guidance provenance, and the raw role/task policy inputs that shape resolved routing behavior."
      actions={
        <>
          <Link className={secondaryButtonClassName} to="/app/control/runtime-config">
            Advanced config
          </Link>
          <Link className={secondaryButtonClassName} to="/app/router/decisions">
            Open decisions
          </Link>
        </>
      }
    />
  );

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <ErrorState label={error} />
      </div>
    );
  }
  if (!config) {
    return (
      <div className="space-y-6">
        {header}
        <LoadingState label="Loading routing config…" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Scoring policy"
          value={config.persisted.strategy ?? "unset"}
          detail="Low-level balanced/latency/quality/cost policy if the runtime config sets one."
          emphasis
        />
        <FactCard
          label="Execution mode"
          value={config.persisted.executionMode}
          detail="Resolved runtime execution mode."
        />
        <FactCard
          label="Controller"
          value={config.controller?.modelId ?? "unassigned"}
          detail={config.controller?.endpointId ?? "No controller is assigned."}
        />
        <FactCard
          label="Policy inputs"
          value={config.policySources.roles.length + config.policySources.tasks.length}
          detail={`${config.policySources.roles.length} roles and ${config.policySources.tasks.length} tasks currently shape Router policy inputs.`}
        />
      </div>

      <SectionCard
        title="Choose routing strategy"
        description="Choose the proposal routing mode here, then open the Workbench with that mode preselected for the next request."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,280px)_1fr]">
          <div className="space-y-3">
            <label
              className="block text-sm font-medium text-[var(--rm-fg)]"
              htmlFor="router-strategy-select"
            >
              Strategy
            </label>
            <select
              id="router-strategy-select"
              className={fieldClassName}
              value={selectedRoutingMode}
              onChange={(event) =>
                setSelectedRoutingMode(
                  event.target.value as NonNullable<WorkbenchChatInput["routingModeOverride"]>,
                )
              }
            >
              {ROUTING_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-3">
              <Link
                className={primaryButtonClassName}
                to="/app/studio/chat"
                state={{ routingModeOverride: selectedRoutingMode }}
              >
                Open workbench with strategy
              </Link>
              <Link className={secondaryButtonClassName} to="/app/control/runtime-config">
                Advanced config
              </Link>
            </div>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">{selectedRoutingModeDetails.label}</p>
            <p className="mt-3 leading-6">{selectedRoutingModeDetails.detail}</p>
            <p className="mt-3 leading-6">
              This proposal routing mode is separate from the low-level scoring policy above. The
              Workbench sends it as a per-request routing override so you can test the mode
              directly.
            </p>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard
          title="Guidance provenance"
          description="Keep persisted config separate from advisory guidance so unavailable values stay honest."
        >
          <div className="space-y-4">
            <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
              <p className="font-medium text-[var(--rm-fg)]">Guidance endpoint</p>
              <p className="mt-2">
                {config.guidance.endpointId ?? "No routing-model endpoint is configured."}
              </p>
            </div>
            {config.guidance.preferredEndpointIds.length === 0 &&
            config.guidance.ignoredEndpointIds.length === 0 ? (
              <EmptyState label="No preferred or ignored endpoints are currently configured." />
            ) : (
              <dl className="grid gap-4 text-sm md:grid-cols-2">
                <div className={`${mutedPanelClassName} p-4`}>
                  <dt className="font-medium text-[var(--rm-fg)]">Preferred endpoints</dt>
                  <dd className="mt-2 whitespace-pre-wrap text-[var(--rm-secondary)]">
                    {config.guidance.preferredEndpointIds.join("\n") || "n/a"}
                  </dd>
                </div>
                <div className={`${mutedPanelClassName} p-4`}>
                  <dt className="font-medium text-[var(--rm-fg)]">Ignored endpoints</dt>
                  <dd className="mt-2 whitespace-pre-wrap text-[var(--rm-secondary)]">
                    {config.guidance.ignoredEndpointIds.join("\n") || "n/a"}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Policy inputs"
          description="Router config exposes the full role/task inputs so routing-policy overrides stay inspectable without leaving the runtime UI."
        >
          <div className="space-y-4">
            {config.policySources.roles.length === 0 ? (
              <EmptyState label="No role policy inputs are currently available." />
            ) : (
              config.policySources.roles.map((role, index) => (
                <div
                  key={`${asStringValue(role.role_id) ?? "role"}-${index}`}
                  className={`${mutedPanelClassName} p-4`}
                >
                  <p className="font-medium text-[var(--rm-fg)]">
                    {asStringValue(role.role_id) ?? "Unnamed role"}
                  </p>
                  <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                    {asStringValue(role.description) ?? "No role description provided."}
                  </p>
                  <div className="mt-3">
                    <CodeBlock>
                      {JSON.stringify(role.routing_policy_overrides ?? {}, null, 2)}
                    </CodeBlock>
                  </div>
                </div>
              ))
            )}
            <div className={`${mutedPanelClassName} p-4`}>
              <p className="font-medium text-[var(--rm-fg)]">Task definitions</p>
              <CodeBlock>{JSON.stringify(config.policySources.tasks, null, 2)}</CodeBlock>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
