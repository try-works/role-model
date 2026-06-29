import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { LocalModelRolePicker } from "../components/local-model-role-picker";
import {
  CodeBlock,
  DisclosureSection,
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import {
  type ModelTelemetryRollup,
  type RouterCandidate,
  type RuntimeAccount,
  type RuntimeControllerAssignment,
  type RuntimeModelRoleAssignment,
  type RuntimeRolePolicy,
  type RuntimeSnapshot,
  fetchControllerAssignment,
  fetchModelTelemetryRollup,
  fetchRolePolicy,
  fetchRouterCandidates,
  fetchRuntimeSnapshot,
  removeRuntimeAccountModel,
  unloadLocalModel,
  unloadPeerModel,
  upsertRuntimeAccount,
} from "../lib/runtime-api";
import { buildConfiguredModelCards, buildConfiguredModelMetadataRows } from "../lib/view-models";

function resolveRoleIdsFromAssignment(
  binding: NonNullable<RuntimeAccount["modelRoleBindings"]>[number] | undefined,
  allRoleIds: readonly string[],
): string[] {
  if (!binding || binding.roleAssignmentMode === "all") {
    return [...allRoleIds];
  }
  if (binding.roleAssignmentMode === "exclude") {
    const disabledRoleIds = new Set(binding.disabledRoleIds ?? []);
    return allRoleIds.filter((roleId) => !disabledRoleIds.has(roleId));
  }
  if (binding.roleAssignmentMode === "include" || binding.roleAssignmentMode === "custom") {
    return [...(binding.enabledRoleIds ?? binding.roleIds)];
  }
  return [...binding.roleIds];
}

function getAccountRoleIdsForModel(
  account: RuntimeAccount,
  modelId: string,
  allRoleIds: readonly string[],
): string[] {
  const binding = account.modelRoleBindings?.find((entry) => entry.modelId === modelId);
  return resolveRoleIdsFromAssignment(binding, allRoleIds);
}

export function buildModelRoleAssignmentForSelection(
  selectedRoleIds: readonly string[],
  allRoleIds: readonly string[],
): RuntimeModelRoleAssignment {
  const selected = [...new Set(selectedRoleIds)].sort((left, right) =>
    left.localeCompare(right, "en"),
  );
  const knownRoleIds = allRoleIds.filter((roleId) => selected.includes(roleId));
  if (allRoleIds.length > 0 && knownRoleIds.length === allRoleIds.length) {
    return { roleAssignmentMode: "all", enabledRoleIds: [], disabledRoleIds: [] };
  }
  if (knownRoleIds.length === 0) {
    return { roleAssignmentMode: "include", enabledRoleIds: [], disabledRoleIds: [] };
  }
  const disabledRoleIds = allRoleIds.filter((roleId) => !knownRoleIds.includes(roleId));
  return {
    roleAssignmentMode: "exclude",
    enabledRoleIds: [],
    disabledRoleIds,
  };
}

export function resolveConfiguredModelEjectLabel(hasLocalPeerEndpoint: boolean): string {
  return hasLocalPeerEndpoint ? "Eject from router" : "Eject from pool";
}

export function createAccountMutationPayload(
  account: RuntimeAccount,
  modelId: string,
  roleIds: readonly string[],
  allRoleIds: readonly string[] = [],
): Record<string, unknown> {
  const otherBindings = (account.modelRoleBindings ?? []).filter(
    (binding) => binding.modelId !== modelId,
  );
  const assignment = buildModelRoleAssignmentForSelection(roleIds, allRoleIds);
  const nextBinding = {
    modelId,
    roleIds:
      assignment.roleAssignmentMode === "include" ? [...(assignment.enabledRoleIds ?? [])] : [],
    ...assignment,
  };
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
    modelRoleBindings: [...otherBindings, nextBinding],
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
  const [removingTargetKey, setRemovingTargetKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<readonly RouterCandidate[]>([]);
  const [telemetryRollup, setTelemetryRollup] = useState<ModelTelemetryRollup | null>(null);

  useEffect(() => {
    void Promise.all([
      fetchRuntimeSnapshot(),
      fetchControllerAssignment(),
      fetchRolePolicy(),
      fetchRouterCandidates(),
    ])
      .then(([nextSnapshot, nextController, nextRolePolicy, nextCandidates]) => {
        setSnapshot(nextSnapshot);
        setController(nextController);
        setRolePolicy(nextRolePolicy);
        setCandidates(nextCandidates);
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

  useEffect(() => {
    if (selectedCard) {
      void fetchModelTelemetryRollup(selectedCard.modelId).then(setTelemetryRollup, () =>
        setTelemetryRollup(null),
      );
    } else {
      setTelemetryRollup(null);
    }
  }, [selectedCard]);
  const selectedEndpoints =
    snapshot && selectedCard
      ? snapshot.endpoints.filter((endpoint) => endpoint.modelId === selectedCard.modelId)
      : [];
  const selectedLlamaSwapEndpoints = selectedEndpoints.filter(
    (endpoint) => endpoint.sourceType === "local" && endpoint.localModelSource === "llama-swap",
  );
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
  const allRuntimeRoleIds = useMemo(
    () => (rolePolicy?.roleDefinitions ?? []).map((role) => role.role_id),
    [rolePolicy],
  );
  const selectedModelAccounts = useMemo(
    () =>
      snapshot && selectedCard
        ? snapshot.accounts.filter((account) => {
            const hasBinding = (account.modelRoleBindings ?? []).some(
              (binding) => binding.modelId === selectedCard.modelId,
            );
            const allowsModel = (account.allowedModels ?? []).includes(selectedCard.modelId);
            const wildcardPeerEndpoint =
              (account.allowedModels ?? []).length === 0 &&
              snapshot.endpoints.some(
                (endpoint) =>
                  endpoint.modelId === selectedCard.modelId &&
                  endpoint.providerAccountId === account.providerAccountId,
              );
            return allowsModel || hasBinding || wildcardPeerEndpoint;
          })
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
          getAccountRoleIdsForModel(account, selectedCard.modelId, allRuntimeRoleIds),
        ]),
      ),
    );
  }, [allRuntimeRoleIds, selectedCard, selectedModelAccounts]);

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
          allRuntimeRoleIds,
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

  const refreshModelState = async () => {
    const [nextSnapshot, nextController, nextRolePolicy, nextCandidates] = await Promise.all([
      fetchRuntimeSnapshot(),
      fetchControllerAssignment(),
      fetchRolePolicy(),
      fetchRouterCandidates(),
    ]);
    setSnapshot(nextSnapshot);
    setController(nextController);
    setRolePolicy(nextRolePolicy);
    setCandidates(nextCandidates);
  };

  const removeConfiguredModel = async (account: RuntimeAccount) => {
    if (!selectedCard) {
      return;
    }
    const removalKey = `account:${account.providerAccountId}`;
    const usesLocalPeerEndpoint = selectedEndpoints.some(
      (endpoint) =>
        endpoint.providerAccountId === account.providerAccountId && endpoint.sourceType === "local",
    );
    setRemovingTargetKey(removalKey);
    setStatusMessage(null);
    try {
      if (usesLocalPeerEndpoint) {
        await unloadPeerModel(selectedCard.modelId);
        await refreshModelState();
        setStatusMessage(`Removed ${selectedCard.modelId} from the peer-backed router pool.`);
      } else {
        const result = await removeRuntimeAccountModel(account.providerAccountId, selectedCard.modelId);
        await refreshModelState();
        setStatusMessage(
          result.removedAccount
            ? `Removed ${selectedCard.modelId} and deleted ${account.providerAccountId} because it was the last configured model on that account.`
            : `Removed ${selectedCard.modelId} from ${account.providerAccountId}.`,
        );
      }
      setError(null);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not remove the configured model.");
    } finally {
      setRemovingTargetKey(null);
    }
  };

  const unloadSelectedLocalModel = async () => {
    if (!selectedCard) {
      return;
    }
    setRemovingTargetKey(`local:${selectedCard.modelId}`);
    setStatusMessage(null);
    try {
      await unloadLocalModel(selectedCard.modelId);
      await refreshModelState();
      setStatusMessage(`Unloaded ${selectedCard.modelId} from the local runtime pool.`);
      setError(null);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not unload the local model.");
    } finally {
      setRemovingTargetKey(null);
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

  const capabilityByModelId = new Map<string, number>();
  const benchmarkCapabilityByModelId = new Map<
    string,
    NonNullable<RouterCandidate["benchmarkCapability"]>
  >();
  for (const candidate of candidates) {
    const benchmarkCapability = candidate.benchmarkCapability;
    const score = benchmarkCapability?.overallScore;
    if (typeof score !== "number") {
      continue;
    }
    const current = capabilityByModelId.get(candidate.modelId);
    if (current === undefined || score > current) {
      capabilityByModelId.set(candidate.modelId, score);
      if (benchmarkCapability) {
        benchmarkCapabilityByModelId.set(candidate.modelId, benchmarkCapability);
      }
    }
  }

  const selectedBenchmarkCapability = selectedCard
    ? (benchmarkCapabilityByModelId.get(selectedCard.modelId) ?? null)
    : null;
  const benchmarkAssignedRoleRows = (rolePolicy?.roleDefinitions ?? [])
    .filter(
      (role) =>
        selectedCard?.roleIds.includes(role.role_id) &&
        typeof selectedBenchmarkCapability?.eligibleRoleScores?.[role.role_id] === "number",
    )
    .map((role) => ({
      roleId: role.role_id,
      label: role.name,
      score: selectedBenchmarkCapability?.eligibleRoleScores?.[role.role_id] ?? 0,
    }));
  const benchmarkSuggestedRoleRows = (rolePolicy?.roleDefinitions ?? [])
    .filter(
      (role) =>
        !selectedCard?.roleIds.includes(role.role_id) &&
        typeof selectedBenchmarkCapability?.roleScores?.[role.role_id] === "number",
    )
    .map((role) => ({
      roleId: role.role_id,
      label: role.name,
      score: selectedBenchmarkCapability?.roleScores?.[role.role_id] ?? 0,
      lowCoverage: (selectedBenchmarkCapability?.coverage?.lowCoverageRoleIds ?? []).includes(
        role.role_id,
      ),
    }))
    .sort((left, right) => right.score - left.score);
  const benchmarkGroupRows = Object.entries(selectedBenchmarkCapability?.groupScores ?? {})
    .map(([groupId, score]) => ({
      groupId,
      score,
      lowCoverage: (selectedBenchmarkCapability?.coverage?.lowCoverageGroupIds ?? []).includes(
        groupId,
      ),
    }))
    .sort((left, right) => right.score - left.score);

  return (
    <>
      <div className="space-y-6">
        {statusMessage ? (
          <SectionCard
            title="Last model change"
            description="Recent inventory mutations are reported here after the runtime snapshot refreshes."
          >
            <p className="text-sm text-[var(--rm-secondary)]">{statusMessage}</p>
          </SectionCard>
        ) : null}
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
                <Link className={secondaryButtonClassName} to="/app/local/choose">
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
              {cards.map((card) => {
                const capabilityScore = capabilityByModelId.get(card.modelId);
                return (
                  <article
                    key={card.modelId}
                    className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                          {card.sourceSummary}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-[var(--rm-fg)]">
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
                      {typeof capabilityScore === "number" ? (
                        <StatusPill tone="success">
                          Capability {Math.round(capabilityScore * 100)}%
                        </StatusPill>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-[var(--rm-secondary)]">
                      <p>
                        <span className="font-semibold text-[var(--rm-fg)]">Roles:</span>{" "}
                        {card.roleIds.join(", ") || "None"}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--rm-fg)]">Endpoints:</span>{" "}
                        {card.endpointIds.join(", ") || "None"}
                      </p>
                    </div>

                    {typeof capabilityScore === "number" ? (
                      <p className="mt-3 text-xs text-[var(--rm-accent-fg,var(--rm-secondary))]">
                        Advisory: scores {Math.round(capabilityScore * 100)}% on routing capability
                        benchmark.
                        {card.requestCount > 0
                          ? ` Based on ${card.requestCount} request${card.requestCount === 1 ? "" : "s"}.`
                          : ""}
                      </p>
                    ) : null}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        className={secondaryButtonClassName}
                        type="button"
                        onClick={() => setSelectedModelId(card.modelId)}
                      >
                        Inspect
                      </button>
                      {typeof capabilityScore === "number" ? (
                        <Link className={secondaryButtonClassName} to="/app/models/benchmark">
                          View benchmark
                        </Link>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      {selectedCard ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--rm-accent-ghost)] p-4 backdrop-blur-[1px]">
          <div className="mx-auto max-w-5xl rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-6 shadow-[var(--rm-shadow-card)]">
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

            <div className="mt-6 space-y-4">
              <div className={`${mutedPanelClassName} p-4`}>
                <p className="font-semibold text-[var(--rm-fg)]">Roles and controller</p>
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
                <p className="font-semibold text-[var(--rm-fg)]">Benchmark role fit (advisory)</p>
                <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                  Benchmark evidence can recommend strong roles and groups for this model, but it
                  does not change runtime eligibility or save role assignments automatically.
                </p>
                {selectedBenchmarkCapability ? (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]">
                        Assigned role evidence
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {benchmarkAssignedRoleRows.length > 0 ? (
                          benchmarkAssignedRoleRows.map((role) => (
                            <StatusPill key={role.roleId} tone="success">
                              {role.label} • {Math.round(role.score * 100)}%
                            </StatusPill>
                          ))
                        ) : (
                          <StatusPill tone="warning">
                            No assigned-role benchmark evidence yet
                          </StatusPill>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]">
                        Unassigned recommendations
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {benchmarkSuggestedRoleRows.length > 0 ? (
                          benchmarkSuggestedRoleRows.map((role) => (
                            <StatusPill
                              key={role.roleId}
                              tone={role.lowCoverage ? "warning" : "neutral"}
                            >
                              {role.label} • {Math.round(role.score * 100)}%
                              {role.lowCoverage ? " • low coverage" : ""}
                            </StatusPill>
                          ))
                        ) : (
                          <StatusPill tone="neutral">No unassigned benchmark evidence</StatusPill>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-muted)]">
                        Group evidence
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {benchmarkGroupRows.length > 0 ? (
                          benchmarkGroupRows.map((group) => (
                            <StatusPill
                              key={group.groupId}
                              tone={group.lowCoverage ? "warning" : "neutral"}
                            >
                              {group.groupId} • {Math.round(group.score * 100)}%
                              {group.lowCoverage ? " • low coverage" : ""}
                            </StatusPill>
                          ))
                        ) : (
                          <StatusPill tone="neutral">No group benchmark evidence</StatusPill>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--rm-secondary)]">
                    No routing benchmark evidence is available for this model yet.
                  </p>
                )}
              </div>

              <div className={`${mutedPanelClassName} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--rm-fg)]">
                      Backing account role bindings
                    </p>
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
                    {selectedModelAccounts.map((account) => {
                      const hasLocalPeerEndpoint = selectedEndpoints.some(
                        (endpoint) =>
                          endpoint.providerAccountId === account.providerAccountId &&
                          endpoint.sourceType === "local",
                      );
                      return (
                        <div
                          key={account.providerAccountId}
                          className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-4"
                        >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[var(--rm-fg)]">
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
                        <div className="mt-4">
                          <LocalModelRolePicker
                            rolePolicy={rolePolicy}
                            selectedRoleIds={draftRolesByAccountId[account.providerAccountId] ?? []}
                            defaultAllRoles={allRuntimeRoleIds.length > 0}
                            benchmarkCapability={selectedBenchmarkCapability}
                            onChange={(roleIds) =>
                              setDraftRolesByAccountId((current) => ({
                                ...current,
                                [account.providerAccountId]: [...roleIds],
                              }))
                            }
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            className={primaryButtonClassName}
                            type="button"
                            disabled={
                              savingAccountId === account.providerAccountId ||
                              removingTargetKey === `account:${account.providerAccountId}`
                            }
                            onClick={() => void saveAccountRoles(account)}
                          >
                            {savingAccountId === account.providerAccountId
                              ? "Saving…"
                              : "Save bindings"}
                          </button>
                          <button
                            className={secondaryButtonClassName}
                            type="button"
                            disabled={removingTargetKey === `account:${account.providerAccountId}`}
                            onClick={() => void removeConfiguredModel(account)}
                          >
                            {removingTargetKey === `account:${account.providerAccountId}`
                              ? "Removing…"
                              : resolveConfiguredModelEjectLabel(hasLocalPeerEndpoint)}
                          </button>
                        </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedLlamaSwapEndpoints.length > 0 ? (
                <div className={`${mutedPanelClassName} p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--rm-fg)]">Local runtime pool</p>
                      <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                        This model is currently loaded through the managed local runtime pool.
                      </p>
                    </div>
                    <button
                      className={secondaryButtonClassName}
                      type="button"
                      disabled={removingTargetKey === `local:${selectedCard.modelId}`}
                      onClick={() => void unloadSelectedLocalModel()}
                    >
                      {removingTargetKey === `local:${selectedCard.modelId}`
                        ? "Unloading…"
                        : "Unload local model"}
                    </button>
                  </div>
                </div>
              ) : null}

              <DisclosureSection summary="Capabilities">
                <div className="flex flex-wrap gap-2">
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
              </DisclosureSection>

              <DisclosureSection summary="Metrics">
                <div className="grid gap-3 md:grid-cols-2 text-sm text-[var(--rm-secondary)]">
                  <p>
                    <span className="font-semibold text-[var(--rm-fg)]">Requests observed:</span>{" "}
                    {selectedCard.requestCount}
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--rm-fg)]">Configured endpoints:</span>{" "}
                    {selectedCard.endpointCount}
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--rm-fg)]">Source mix:</span>{" "}
                    {selectedCard.sourceSummary}
                  </p>
                  <p>
                    <span className="font-semibold text-[var(--rm-fg)]">Status:</span>{" "}
                    {selectedCard.status}
                  </p>
                </div>
              </DisclosureSection>

              <DisclosureSection summary="Model specifications">
                <div className="grid gap-3 md:grid-cols-2 text-sm text-[var(--rm-secondary)]">
                  {selectedMetadataRows.map((row) => (
                    <p key={row.label}>
                      <span className="font-semibold text-[var(--rm-fg)]">{row.label}:</span>{" "}
                      {row.value}
                    </p>
                  ))}
                </div>
              </DisclosureSection>

              <DisclosureSection summary="Tooling / MCP">
                <div className="flex flex-wrap gap-2">
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
              </DisclosureSection>

              <DisclosureSection summary="Telemetry taxonomy rollup (advisory)">
                {telemetryRollup && telemetryRollup.totalRequests > 0 ? (
                  <div className="space-y-3 text-sm">
                    <p className="text-xs text-[var(--rm-muted)]">
                      Based on {telemetryRollup.totalRequests} request
                      {telemetryRollup.totalRequests === 1 ? "" : "s"} over the last{" "}
                      {telemetryRollup.windowDays} days.
                    </p>
                    <div className="grid gap-4 xl:grid-cols-3">
                      <div className="space-y-2">
                        <p className="font-semibold text-[var(--rm-fg)]">Recent groups</p>
                        <div className="flex flex-wrap gap-2">
                          {telemetryRollup.groups.length > 0 ? (
                            telemetryRollup.groups.map((group) => (
                              <StatusPill key={group.groupId} tone="neutral">
                                {group.groupId} • {group.requestCount}
                              </StatusPill>
                            ))
                          ) : (
                            <StatusPill tone="warning">No recent groups</StatusPill>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-[var(--rm-fg)]">Recent roles</p>
                        <div className="flex flex-wrap gap-2">
                          {telemetryRollup.roles.length > 0 ? (
                            telemetryRollup.roles.map((role) => (
                              <StatusPill key={role.roleId} tone="neutral">
                                {role.roleId} • {role.requestCount}
                              </StatusPill>
                            ))
                          ) : (
                            <StatusPill tone="warning">No recent roles</StatusPill>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-[var(--rm-fg)]">Recent capabilities</p>
                        <div className="flex flex-wrap gap-2">
                          {telemetryRollup.capabilities.length > 0 ? (
                            telemetryRollup.capabilities.map((capability) => (
                              <StatusPill key={capability.capabilityId} tone="neutral">
                                {capability.capabilityId} • {capability.requestCount}
                              </StatusPill>
                            ))
                          ) : (
                            <StatusPill tone="warning">No recent capabilities</StatusPill>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {telemetryRollup.tasks.map((task) => (
                        <div
                          key={task.taskType}
                          className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--rm-border)] p-2"
                        >
                          <div className="min-w-0">
                            <p className="font-mono text-xs text-[var(--rm-fg)]">{task.taskType}</p>
                            <p className="text-xs text-[var(--rm-secondary)]">
                              {task.requestCount} req{" "}
                              {task.avgLatencyMs !== null ? `• avg ${task.avgLatencyMs}ms` : ""}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <StatusPill
                              tone={
                                task.successRate >= 0.95
                                  ? "success"
                                  : task.successRate < 0.8
                                    ? "warning"
                                    : "neutral"
                              }
                            >
                              {Math.round(task.successRate * 100)}%
                            </StatusPill>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <div className="space-y-2">
                        <p className="font-semibold text-[var(--rm-fg)]">Observed strengths</p>
                        {telemetryRollup.strengths.length > 0 ? (
                          telemetryRollup.strengths.map((strength) => (
                            <p key={strength} className="text-[var(--rm-secondary)]">
                              {strength}
                            </p>
                          ))
                        ) : (
                          <p className="text-[var(--rm-secondary)]">
                            No high-confidence strengths have emerged from recent telemetry yet.
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="font-semibold text-[var(--rm-fg)]">Observed warnings</p>
                        {telemetryRollup.warnings.length > 0 ? (
                          telemetryRollup.warnings.map((warning) => (
                            <p key={warning} className="text-[var(--rm-secondary)]">
                              {warning}
                            </p>
                          ))
                        ) : (
                          <p className="text-[var(--rm-secondary)]">
                            No warning-level patterns are visible in the recent telemetry slice.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--rm-secondary)]">
                    No taxonomy-tagged telemetry data available yet for this model. Send requests to
                    populate taxonomy rollups, per-task performance, and advisory warnings.
                  </p>
                )}
              </DisclosureSection>
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
            <div className="mt-4">
              <p className="mb-2 font-semibold text-[var(--rm-fg)]">Endpoint and model ids</p>
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
