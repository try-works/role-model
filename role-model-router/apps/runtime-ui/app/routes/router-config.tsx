import { useEffect, useState } from "react";
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
  mutedPanelClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import { formatRoutingModeLabel } from "../lib/routing-mode";
import { type RouterConfig, fetchRouterConfig } from "../lib/runtime-api";

function asStringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export default function RouterConfigRoute() {
  const [config, setConfig] = useState<RouterConfig | null>(null);
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

  const header = (
    <PageHeader
      eyebrow="Router"
      title="Routing config"
      description="See the low-level routing policy state, persisted posture, live guidance provenance, and the raw role/task policy inputs that shape resolved routing behavior."
      actions={
        <>
          <Link className={secondaryButtonClassName} to="/app/router/strategy">
            Edit strategy
          </Link>
          <Link className={secondaryButtonClassName} to="/app/system/runtime-config">
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
          label="Persisted strategy"
          value={config.persisted.strategy ? formatRoutingModeLabel(config.persisted.strategy) : "unset"}
          detail="Saved Strategy A/B/C or Hybrid routing mode from the runtime config."
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
        title="Editing boundary"
        description="This page explains the active routing posture. Use the dedicated Routing strategy page to change the persisted Strategy A/B/C mode or execution mode."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Where to edit</p>
            <p className="mt-3 leading-6">
              Persisted routing mode and execution mode now live on the dedicated
              {" "}
              <Link className="underline decoration-[var(--rm-border-strong)] underline-offset-4" to="/app/router/strategy">
                Routing strategy
              </Link>
              {" "}
              page so this config view stays focused on provenance and policy inputs.
            </p>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Where to test</p>
            <p className="mt-3 leading-6">
              Use the Workbench for request-level experiments and the decisions ledger to verify how
              the saved strategy, controller guidance, and policy overrides affected routing.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link className={secondaryButtonClassName} to="/app/router/strategy">
                Open routing strategy
              </Link>
              <Link className={secondaryButtonClassName} to="/app/studio/chat">
                Open workbench
              </Link>
            </div>
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
