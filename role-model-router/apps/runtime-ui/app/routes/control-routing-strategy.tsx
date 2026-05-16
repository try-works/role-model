import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import {
  type RuntimeConfigRecord,
  type RuntimeControllerAssignment,
  fetchControllerAssignment,
  fetchRuntimeConfig,
} from "../lib/runtime-api";

export default function ControlRoutingStrategyRoute() {
  const [configRecord, setConfigRecord] = useState<RuntimeConfigRecord | null>(null);
  const [controller, setController] = useState<RuntimeControllerAssignment | null>(null);
  const [controllerLoaded, setControllerLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeConfig(), fetchControllerAssignment()])
      .then(([nextConfigRecord, nextController]) => {
        setConfigRecord(nextConfigRecord);
        setController(nextController);
        setControllerLoaded(true);
        setError(null);
      })
      .catch((value: unknown) =>
        setError(
          value instanceof Error ? value.message : "Could not load routing strategy posture.",
        ),
      );
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!configRecord || !controllerLoaded) {
    return <LoadingState label="Loading routing strategy posture…" />;
  }

  const config = configRecord.config;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control"
        title="Routing strategy"
        description="Read the current execution posture in one place, then hand off into the advanced config editor, controller assignment, chat workspace, and request ledger without treating routing strategy as raw JSON only."
        actions={
          <>
            <Link className={secondaryButtonClassName} to="/app/control/runtime-config">
              Advanced config
            </Link>
            <Link className={secondaryButtonClassName} to="/app/studio/chat">
              Open workbench
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Execution mode"
          value={config?.executionMode ?? "pending"}
          detail="Top-level runtime execution mode currently applied by the control plane."
          emphasis
        />
        <FactCard
          label="Routing strategy"
          value={config?.routingStrategy ?? "unset"}
          detail="Baseline routing policy persisted in the runtime config record."
        />
        <FactCard
          label="Controller"
          value={controller?.modelId ?? "unassigned"}
          detail={
            controller
              ? controller.endpointId
              : "Assign a controller to enable explicit controller-guided routing posture."
          }
        />
        <FactCard
          label="Config path"
          value={configRecord.path ?? "not configured"}
          detail={configRecord.applied ? "Applied" : "Pending"}
        />
      </div>

      <SectionCard
        title="Strategy reading order"
        description="This page is the structured strategy entry point. Use it to orient the runtime posture first, then move into the advanced config or request verification surfaces."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Control-plane posture</p>
            <p className="mt-3 leading-6">
              Execution mode, top-level strategy, and controller assignment stay visible here before
              you change the raw runtime config or inspect routed requests.
            </p>
          </div>
          <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
            <p className="font-medium text-[var(--rm-fg)]">Verification path</p>
            <p className="mt-3 leading-6">
              Use the workbench to exercise routing decisions and the request ledger to verify the
              resulting receipts after the structured strategy posture looks correct.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Operator handoff"
        description="The routing strategy surface stays adjacent to the concrete editing and verification routes instead of duplicating them."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            to="/app/control/runtime-config"
          >
            <span className="block font-medium text-[var(--rm-fg)]">Advanced config</span>
            Edit the raw runtime JSON when the structured posture is not enough.
          </Link>
          <Link
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            to="/app/control/controller"
          >
            <span className="block font-medium text-[var(--rm-fg)]">Controller</span>
            Review or change the current controller assignment.
          </Link>
          <Link
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            to="/app/studio/chat"
          >
            <span className="block font-medium text-[var(--rm-fg)]">Workbench</span>
            Run routed requests against the live runtime.
          </Link>
          <Link
            className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}
            to="/app/observe/requests"
          >
            <span className="block font-medium text-[var(--rm-fg)]">Requests</span>
            Inspect routing receipts and raw request observations.
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill tone={configRecord.applied ? "success" : "warning"}>
            {configRecord.applied ? "config applied" : "config pending"}
          </StatusPill>
          <StatusPill tone={controller ? "accent" : "neutral"}>
            {controller ? controller.sourceType : "controller unassigned"}
          </StatusPill>
        </div>
      </SectionCard>
    </div>
  );
}
