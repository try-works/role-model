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
  StatusPill,
} from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import {
  type RuntimeControllerAssignment,
  type RuntimeSnapshot,
  fetchControllerAssignment,
  fetchRuntimeSnapshot,
} from "../lib/runtime-api";
import { buildConfiguredModelCards, buildConfiguredModelMetadataRows } from "../lib/view-models";

export default function ControlModelsRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [controller, setController] = useState<RuntimeControllerAssignment | null>(null);
  const [controllerLoaded, setControllerLoaded] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeSnapshot(), fetchControllerAssignment()])
      .then(([nextSnapshot, nextController]) => {
        setSnapshot(nextSnapshot);
        setController(nextController);
        setControllerLoaded(true);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load configured models."),
      );
  }, []);

  const cards = useMemo(
    () =>
      snapshot
        ? buildConfiguredModelCards({
            models: snapshot.models,
            endpoints: snapshot.endpoints,
            accounts: snapshot.accounts,
            requests: snapshot.requests,
            controller,
          })
        : [],
    [controller, snapshot],
  );

  const selectedCard = cards.find((card) => card.modelId === selectedModelId) ?? null;
  const selectedEndpoints =
    snapshot && selectedCard
      ? snapshot.endpoints.filter((endpoint) => endpoint.modelId === selectedCard.modelId)
      : [];
  const selectedCapabilities = [
    ...new Set([
      ...(selectedCard?.capabilities ?? []),
      ...selectedEndpoints.flatMap((endpoint) => endpoint.capabilities ?? []),
    ]),
  ].sort((left, right) => left.localeCompare(right, "en"));
  const selectedToolStyles = [
    ...new Set(
      selectedEndpoints
        .filter((endpoint) => endpoint.toolCallingSupported)
        .map((endpoint) => endpoint.toolCallingStyle ?? "unknown"),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
  const selectedMetadataRows = selectedCard ? buildConfiguredModelMetadataRows(selectedCard) : [];

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot || !controllerLoaded) {
    return <LoadingState label="Loading configured model cards…" />;
  }

  const toolCapableCount = cards.filter((card) => card.toolCallingSupported).length;
  const activeModelCount = cards.filter((card) => card.status === "active").length;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Control"
          title="Configured models"
          description="Unified local and remote model cards with controller status, roles, capabilities, request metrics, and inspect-first drill-ins."
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FactCard
            label="Configured models"
            value={cards.length}
            detail="Every configured model appears once in the merged inventory."
            emphasis
          />
          <FactCard
            label="Active models"
            value={activeModelCount}
            detail="Models whose endpoint summary currently resolves to active."
          />
          <FactCard
            label="Tool-capable"
            value={toolCapableCount}
            detail="Models with at least one tool-calling capable endpoint."
          />
          <FactCard
            label="Observed requests"
            value={snapshot.requests.length}
            detail="Request count currently available to the inventory as runtime context."
          />
        </div>

        {!controller ? (
          <SectionCard
            title="Controller pending"
            description="The runtime-config editor can leave the system in a valid pre-activation state before any controller candidate exists."
          >
            <EmptyState label="Activate a local or remote endpoint, then assign it from Control > Controller." />
          </SectionCard>
        ) : null}

        <SectionCard
          title="Model inventory"
          description="Every configured model appears once, with local and remote endpoint state merged into a card-based registry."
        >
          {cards.length === 0 ? (
            <>
              <EmptyState label="No configured models are available yet." />
              <div className="mt-4 flex flex-wrap gap-3">
                <Link className={secondaryButtonClassName} to="/app/local/models">
                  Open Local Models
                </Link>
                <Link className={secondaryButtonClassName} to="/app/local/peers">
                  Open Local Endpoints
                </Link>
                <Link className={secondaryButtonClassName} to="/app/control/providers">
                  Open Providers
                </Link>
              </div>
            </>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {cards.map((card) => (
                <article
                  key={card.modelId}
                  className="rounded-none border border-[var(--rm-border)] bg-[var(--rm-surface)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                        {card.sourceSummary}
                      </p>
                      <h3 className="mt-2 text-lg font-medium text-[var(--rm-fg)]">
                        {card.displayName}
                      </h3>
                      <p className="mt-2 break-all text-sm text-[var(--rm-secondary)]">
                        {card.modelId}
                      </p>
                    </div>
                    <StatusPill
                      tone={
                        card.controllerState === "active"
                          ? "accent"
                          : card.status === "active"
                            ? "success"
                            : "warning"
                      }
                    >
                      {card.controllerState === "active" ? "controller" : card.status}
                    </StatusPill>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusPill tone={card.toolCallingSupported ? "success" : "neutral"}>
                      {card.toolCallingSupported ? "tool calling" : "no tool calling"}
                    </StatusPill>
                    <StatusPill tone={card.endpointCount > 0 ? "neutral" : "warning"}>
                      {card.endpointCount} endpoint{card.endpointCount === 1 ? "" : "s"}
                    </StatusPill>
                    <StatusPill tone={card.requestCount > 0 ? "neutral" : "warning"}>
                      {card.requestCount} request{card.requestCount === 1 ? "" : "s"}
                    </StatusPill>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[var(--rm-secondary)]">
                    <p>
                      <span className="font-medium text-[var(--rm-fg)]">Roles:</span>{" "}
                      {card.roleIds.join(", ") || "None"}
                    </p>
                    <p>
                      <span className="font-medium text-[var(--rm-fg)]">Endpoints:</span>{" "}
                      {card.endpointIds.join(", ") || "None"}
                    </p>
                  </div>

                  <div className="mt-5">
                    <button
                      className={secondaryButtonClassName}
                      type="button"
                      onClick={() => setSelectedModelId(card.modelId)}
                    >
                      Inspect
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {selectedCard ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--rm-accent-ghost)] p-4 backdrop-blur-[1px]">
          <div className="mx-auto max-w-5xl rounded-none border border-[var(--rm-border)] bg-[var(--rm-surface)] p-6 shadow-[var(--rm-shadow-card)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                  Model inspection
                </p>
                <h2 className="mt-2 text-2xl font-light tracking-tight text-[var(--rm-fg)]">
                  {selectedCard.displayName}
                </h2>
                <p className="mt-2 break-all text-sm text-[var(--rm-secondary)]">
                  {selectedCard.modelId}
                </p>
              </div>
              <button
                className={secondaryButtonClassName}
                type="button"
                onClick={() => setSelectedModelId(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <div className={`${mutedPanelClassName} p-4`}>
                <p className="font-medium text-[var(--rm-fg)]">Roles and controller</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCard.roleIds.length === 0 ? (
                    <StatusPill tone="warning">No roles</StatusPill>
                  ) : (
                    selectedCard.roleIds.map((roleId) => (
                      <StatusPill key={roleId} tone="neutral">
                        {roleId}
                      </StatusPill>
                    ))
                  )}
                  <StatusPill
                    tone={selectedCard.controllerState === "active" ? "accent" : "neutral"}
                  >
                    {selectedCard.controllerState}
                  </StatusPill>
                </div>
              </div>

              <div className={`${mutedPanelClassName} p-4`}>
                <p className="font-medium text-[var(--rm-fg)]">Capabilities</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCapabilities.length === 0 ? (
                    <StatusPill tone="warning">No declared capabilities</StatusPill>
                  ) : (
                    selectedCapabilities.map((capability) => (
                      <StatusPill key={capability} tone="neutral">
                        {capability}
                      </StatusPill>
                    ))
                  )}
                </div>
              </div>

              <div className={`${mutedPanelClassName} p-4`}>
                <p className="font-medium text-[var(--rm-fg)]">Metrics</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm text-[var(--rm-secondary)]">
                  <p>
                    <span className="font-medium text-[var(--rm-fg)]">Requests observed:</span>{" "}
                    {selectedCard.requestCount}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--rm-fg)]">Configured endpoints:</span>{" "}
                    {selectedCard.endpointCount}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--rm-fg)]">Source mix:</span>{" "}
                    {selectedCard.sourceSummary}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--rm-fg)]">Status:</span>{" "}
                    {selectedCard.status}
                  </p>
                </div>
              </div>

              <div className={`${mutedPanelClassName} p-4`}>
                <p className="font-medium text-[var(--rm-fg)]">Model specifications</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2 text-sm text-[var(--rm-secondary)]">
                  {selectedMetadataRows.map((row) => (
                    <p key={row.label}>
                      <span className="font-medium text-[var(--rm-fg)]">{row.label}:</span>{" "}
                      {row.value}
                    </p>
                  ))}
                </div>
              </div>

              <div className={`${mutedPanelClassName} p-4`}>
                <p className="font-medium text-[var(--rm-fg)]">Tooling / MCP</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill tone={selectedCard.toolCallingSupported ? "success" : "warning"}>
                    {selectedCard.toolCallingSupported
                      ? "tool calling enabled"
                      : "tool calling unavailable"}
                  </StatusPill>
                  {selectedToolStyles.map((style) => (
                    <StatusPill key={style} tone="neutral">
                      {style}
                    </StatusPill>
                  ))}
                </div>
                <p className="mt-3 text-sm text-[var(--rm-secondary)]">
                  MCP-backed execution is reflected through runtime tool receipts when the selected
                  endpoint supports tool calling.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link className={secondaryButtonClassName} to="/app/control/runtime-config">
                Edit runtime config
              </Link>
              <Link className={secondaryButtonClassName} to="/app/control/providers">
                Review providers
              </Link>
            </div>

            <div className="mt-4">
              <p className="mb-2 font-medium text-[var(--rm-fg)]">Endpoint and model ids</p>
              <CodeBlock>
                {JSON.stringify(
                  {
                    modelId: selectedCard.modelId,
                    endpointIds: selectedCard.endpointIds,
                    endpoints: selectedEndpoints,
                  },
                  null,
                  2,
                )}
              </CodeBlock>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
