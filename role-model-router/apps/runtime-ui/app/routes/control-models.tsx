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
import {
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import {
  type RuntimeAccount,
  type RuntimeControllerAssignment,
  type RuntimeRolePolicy,
  type RuntimeSnapshot,
  fetchControllerAssignment,
  fetchRolePolicy,
  fetchRuntimeSnapshot,
  upsertRuntimeAccount,
} from "../lib/runtime-api";
import { buildConfiguredModelCards, buildConfiguredModelMetadataRows } from "../lib/view-models";

function getAccountRoleIdsForModel(account: RuntimeAccount, modelId: string): string[] {
  const binding = account.modelRoleBindings?.find((entry) => entry.modelId === modelId);
  return binding ? [...binding.roleIds] : [];
}

function createAccountMutationPayload(
  account: RuntimeAccount,
  modelId: string,
  roleIds: readonly string[],
): Record<string, unknown> {
  const otherBindings = (account.modelRoleBindings ?? []).filter(
    (binding) => binding.modelId !== modelId,
  );
  return {
    providerAccountId: account.providerAccountId,
    providerId: account.providerId,
    providerKind: account.providerKind,
    orgScope: account.orgScope ?? "personal",
    accountScope: account.accountScope ?? "workspace-default",
    credentialRef: account.credentialRef,
    authMode: account.authMode,
    regionPolicy: account.regionPolicy ?? { mode: "prefer", regions: ["global"] },
    baseUrlOverride: account.baseUrlOverride ?? null,
    allowedModels: [...(account.allowedModels ?? [])],
    modelRoleBindings:
      roleIds.length > 0 ? [...otherBindings, { modelId, roleIds: [...roleIds] }] : otherBindings,
    deniedModels: [...(account.deniedModels ?? [])],
    entitlementTags: [...(account.entitlementTags ?? [])],
    budgetPolicyRef: account.budgetPolicyRef ?? "budget.default",
    quotaPolicyRef: account.quotaPolicyRef ?? "quota.default",
    status: account.status ?? "active",
    healthStatus: account.healthStatus ?? "healthy",
    rotationState: account.rotationState ?? "stable",
  };
}

export default function ControlModelsRoute() {
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [controller, setController] = useState<RuntimeControllerAssignment | null>(null);
  const [rolePolicy, setRolePolicy] = useState<RuntimeRolePolicy | null>(null);
  const [controllerLoaded, setControllerLoaded] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [draftRolesByAccountId, setDraftRolesByAccountId] = useState<Record<string, string[]>>({});
  const [savingAccountId, setSavingAccountId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([fetchRuntimeSnapshot(), fetchControllerAssignment(), fetchRolePolicy()])
      .then(([nextSnapshot, nextController, nextRolePolicy]) => {
        setSnapshot(nextSnapshot);
        setController(nextController);
        setRolePolicy(nextRolePolicy);
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
  const selectedModelAccounts = useMemo(
    () =>
      snapshot && selectedCard
        ? snapshot.accounts.filter(
            (account) =>
              (account.allowedModels ?? []).includes(selectedCard.modelId) ||
              (account.modelRoleBindings ?? []).some(
                (binding) => binding.modelId === selectedCard.modelId,
              ),
          )
        : [],
    [selectedCard, snapshot],
  );

  useEffect(() => {
    if (!selectedCard) {
      setDraftRolesByAccountId({});
      return;
    }
    setDraftRolesByAccountId(
      Object.fromEntries(
        selectedModelAccounts.map((account) => [
          account.providerAccountId,
          getAccountRoleIdsForModel(account, selectedCard.modelId),
        ]),
      ),
    );
  }, [selectedCard, selectedModelAccounts]);

  const toggleAccountRole = (providerAccountId: string, roleId: string) => {
    setDraftRolesByAccountId((current) => {
      const next = new Set(current[providerAccountId] ?? []);
      if (next.has(roleId)) {
        next.delete(roleId);
      } else {
        next.add(roleId);
      }
      return {
        ...current,
        [providerAccountId]: [...next].sort((left, right) => left.localeCompare(right, "en")),
      };
    });
  };

  const saveAccountRoles = async (account: RuntimeAccount) => {
    if (!selectedCard) {
      return;
    }
    setSavingAccountId(account.providerAccountId);
    setStatusMessage(null);
    try {
      await upsertRuntimeAccount(
        createAccountMutationPayload(
          account,
          selectedCard.modelId,
          draftRolesByAccountId[account.providerAccountId] ?? [],
        ),
      );
      const [nextSnapshot, nextRolePolicy] = await Promise.all([
        fetchRuntimeSnapshot(),
        fetchRolePolicy(),
      ]);
      setSnapshot(nextSnapshot);
      setRolePolicy(nextRolePolicy);
      setError(null);
      setStatusMessage(`Updated roles for ${account.providerAccountId}.`);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not update model roles.");
    } finally {
      setSavingAccountId(null);
    }
  };

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
          eyebrow="Models"
          title="Configured models"
          description="Unified local and remote model cards with controller status, live role bindings, capabilities, request metrics, and backing-account role assignment."
          actions={
            <Link className={secondaryButtonClassName} to="/app/models/roles">
              Edit runtime roles
            </Link>
          }
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
            <EmptyState label="Activate a local or remote endpoint, then assign it from Router > Controller." />
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
                <Link className={secondaryButtonClassName} to="/app/local/endpoints">
                  Open Local Endpoints
                </Link>
                <Link className={secondaryButtonClassName} to="/app/remote/providers">
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
                <p className="mt-3 text-sm text-[var(--rm-secondary)]">
                  Runtime roles are authored in Control &gt; Roles and assigned per backing account
                  here.
                </p>
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

              <div className={`${mutedPanelClassName} p-4 xl:col-span-2`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--rm-fg)]">Backing account role bindings</p>
                    <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                      Assign live runtime roles per provider account for this model. These bindings
                      feed router-visible endpoint role coverage directly.
                    </p>
                  </div>
                  <Link className={secondaryButtonClassName} to="/app/models/roles">
                    Manage role definitions
                  </Link>
                </div>
                {selectedModelAccounts.length === 0 ? (
                  <p className="mt-4 text-sm text-[var(--rm-secondary)]">
                    No backing provider accounts currently expose this model.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {selectedModelAccounts.map((account) => (
                      <div
                        key={account.providerAccountId}
                        className="rounded-none border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-[var(--rm-fg)]">
                              {account.providerAccountId}
                            </p>
                            <p className="mt-1 text-sm text-[var(--rm-secondary)]">
                              {account.providerId} · {account.authMode ?? "unknown auth"}
                            </p>
                          </div>
                          <StatusPill
                            tone={account.healthStatus === "healthy" ? "success" : "warning"}
                          >
                            {account.healthStatus ?? "unknown"}
                          </StatusPill>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          {(rolePolicy?.roleDefinitions ?? []).map((role) => (
                            <label
                              key={`${account.providerAccountId}:${role.role_id}`}
                              className="flex items-center gap-2 rounded-none border border-[var(--rm-border)] px-3 py-2 text-sm text-[var(--rm-secondary)]"
                            >
                              <input
                                checked={(
                                  draftRolesByAccountId[account.providerAccountId] ?? []
                                ).includes(role.role_id)}
                                type="checkbox"
                                onChange={() =>
                                  toggleAccountRole(account.providerAccountId, role.role_id)
                                }
                              />
                              <span>{role.name}</span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            className={primaryButtonClassName}
                            type="button"
                            disabled={savingAccountId === account.providerAccountId}
                            onClick={() => void saveAccountRoles(account)}
                          >
                            {savingAccountId === account.providerAccountId
                              ? "Saving…"
                              : "Save bindings"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link className={secondaryButtonClassName} to="/app/system/runtime-config">
                Edit runtime config
              </Link>
              <Link className={secondaryButtonClassName} to="/app/models/roles">
                Edit runtime roles
              </Link>
              <Link className={secondaryButtonClassName} to="/app/remote/providers">
                Review providers
              </Link>
            </div>
            {statusMessage ? (
              <p className="mt-4 text-sm text-[var(--rm-secondary)]">{statusMessage}</p>
            ) : null}

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
