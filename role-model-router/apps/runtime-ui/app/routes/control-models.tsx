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
  bodyStrongTextClassName,
  bodyTextClassName,
  cardClassName,
  compactTitleClassName,
  foregroundEmphasisClassName,
  inlineTitleClassName,
  metaTextClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  sectionTitleClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import {
  type ModelTelemetryRollup,
  type RouterCandidate,
  type RuntimeAccount,
  type RuntimeControllerAssignment,
  type RuntimeModelRoleAssignment,
  type RuntimeRequestListItem,
  type RuntimeRolePolicy,
  type RuntimeSnapshot,
  fetchControllerAssignment,
  fetchModelTelemetryRollup,
  fetchRolePolicy,
  fetchRouterCandidates,
  fetchRuntimeAccounts,
  fetchRuntimeEndpoints,
  fetchRuntimeModels,
  removeRuntimeAccountModel,
  unloadLocalModel,
  unloadPeerModel,
  upsertRuntimeAccount,
} from "../lib/runtime-api";
import { buildConfiguredModelCards, buildConfiguredModelMetadataRows } from "../lib/view-models";

type ConfiguredModelCardLike = {
  readonly modelId: string;
  readonly displayName?: string;
  readonly controllerState: "active" | "eligible" | "inactive";
  readonly status: string;
};

type StatusPillTone = "neutral" | "accent" | "warning" | "success" | "error" | "info" | "advisory";

type ConfiguredModelInventoryPill = {
  readonly label: string;
  readonly tone: StatusPillTone;
};

type SelectedModelPreviewPayloadInput = {
  readonly modelId: string;
  readonly endpointIds: readonly string[];
};

type EvidencePillInput = {
  readonly assignedRoleRows: readonly {
    readonly roleId?: string;
    readonly label?: string;
    readonly score: number;
  }[];
  readonly groupRows: readonly {
    readonly groupId?: string;
    readonly score: number;
    readonly lowCoverage: boolean;
  }[];
  readonly suggestedRoleRows: readonly {
    readonly roleId: string;
    readonly label?: string;
    readonly score?: number;
    readonly lowCoverage: boolean;
  }[];
};

export type ConfiguredModelsSnapshot = Pick<RuntimeSnapshot, "accounts" | "endpoints" | "models">;
type RequestEvidenceStatus = "loading" | "ready" | "unavailable";

type ConfiguredModelsInitialLoadResult = {
  readonly snapshot: ConfiguredModelsSnapshot;
  readonly controller: RuntimeControllerAssignment | null;
  readonly rolePolicy: RuntimeRolePolicy;
  readonly candidates: readonly RouterCandidate[];
};

export interface DeferredConfiguredModelsBootstrapOptions<TInitialData> {
  readonly loadInitial: () => Promise<TInitialData>;
  readonly onInitialData: (data: TInitialData) => void;
  readonly onInitialError: (message: string) => void;
  readonly loadObservedRequests: () => Promise<readonly RuntimeRequestListItem[]>;
  readonly onObservedRequests: (requests: readonly RuntimeRequestListItem[]) => void;
  readonly onObservedRequestsError?: (message: string) => void;
}

export function startDeferredConfiguredModelsBootstrap<TInitialData>(
  options: DeferredConfiguredModelsBootstrapOptions<TInitialData>,
): () => void {
  let disposed = false;

  void options
    .loadInitial()
    .then((data) => {
      if (disposed) {
        return;
      }
      options.onInitialData(data);
      return options.loadObservedRequests().then(
        (requests) => {
          if (!disposed) {
            options.onObservedRequests(requests);
          }
        },
        (value: unknown) => {
          if (disposed) {
            return;
          }
          options.onObservedRequestsError?.(
            value instanceof Error ? value.message : "Could not load request evidence.",
          );
        },
      );
    })
    .catch((value: unknown) => {
      if (disposed) {
        return;
      }
      options.onInitialError(
        value instanceof Error ? value.message : "Could not load configured models.",
      );
    });

  return () => {
    disposed = true;
  };
}

export function describeConfiguredModelRequestEvidence(
  requestCount: number | null,
  status: RequestEvidenceStatus,
): string {
  if (status === "loading") {
    return "Request evidence loading";
  }
  if (status === "unavailable") {
    return "Request evidence unavailable";
  }
  return `${requestCount ?? 0} request${requestCount === 1 ? "" : "s"}`;
}

function buildObservedRequestFact(input: {
  readonly requests: readonly RuntimeRequestListItem[];
  readonly status: RequestEvidenceStatus;
}): { value: string; detail: string } {
  if (input.status === "loading") {
    return {
      value: "Loading…",
      detail: "The model inventory is visible. Request evidence is loading in the background now.",
    };
  }
  if (input.status === "unavailable") {
    return {
      value: "Unavailable",
      detail:
        "Deferred request evidence is unavailable, but the model inventory remains visible and usable.",
    };
  }
  return {
    value: input.requests.length.toLocaleString("en-US"),
    detail: "Request count available as deferred runtime context.",
  };
}

export function resolveConfiguredModelStatusTone(
  controllerState: ConfiguredModelCardLike["controllerState"],
  status: ConfiguredModelCardLike["status"],
): StatusPillTone {
  if (controllerState === "active") {
    return "accent";
  }
  if (status === "active" || status === "healthy") {
    return "success";
  }
  if (status === "inactive") {
    return "neutral";
  }
  return "warning";
}

export function buildConfiguredModelInventoryPills(input: {
  readonly toolCallingSupported: boolean;
  readonly endpointCount: number;
  readonly capabilityScore: number | null | undefined;
}): ConfiguredModelInventoryPill[] {
  return [
    {
      label: input.toolCallingSupported ? "tool calling" : "no tool calling",
      tone: input.toolCallingSupported ? "info" : "neutral",
    },
    {
      label: `${input.endpointCount} endpoint${input.endpointCount === 1 ? "" : "s"}`,
      tone: "neutral",
    },
    ...(typeof input.capabilityScore === "number"
      ? [
          {
            label: `${Math.round(input.capabilityScore * 100)}% capability`,
            tone: "advisory" as const,
          },
        ]
      : []),
  ];
}

export function buildSelectedModelEvidencePills(
  input: EvidencePillInput,
): ConfiguredModelInventoryPill[] {
  const pills: ConfiguredModelInventoryPill[] = [];
  const strongestAssignedRoleScore = input.assignedRoleRows.reduce<number | null>(
    (current, row) => (current === null || row.score > current ? row.score : current),
    null,
  );
  if (strongestAssignedRoleScore !== null) {
    pills.push({
      label: `assigned role evidence ${Math.round(strongestAssignedRoleScore * 100)}%`,
      tone: "info",
    });
  }

  const strongestGroup = input.groupRows.slice().sort((left, right) => right.score - left.score)[0];
  if (strongestGroup) {
    pills.push({
      label: `group evidence ${Math.round(strongestGroup.score * 100)}%`,
      tone: strongestGroup.lowCoverage ? "warning" : "advisory",
    });
  }

  const lowCoverageRole = input.suggestedRoleRows.find((row) => row.lowCoverage);
  if (lowCoverageRole) {
    pills.push({
      label: `low coverage on ${lowCoverageRole.roleId}`,
      tone: "warning",
    });
  }

  if (pills.length === 0) {
    pills.push({
      label: "No benchmark evidence yet",
      tone: "neutral",
    });
  }

  return pills;
}

export function buildSelectedModelPreviewPayload(
  input: SelectedModelPreviewPayloadInput,
): SelectedModelPreviewPayloadInput {
  return {
    modelId: input.modelId,
    endpointIds: [...input.endpointIds],
  };
}

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

export function resolveDefaultSelectedModelId(
  cards: readonly ConfiguredModelCardLike[],
): string | null {
  return (
    cards.find((card) => card.controllerState === "active")?.modelId ??
    cards.find((card) => card.status === "active" || card.status === "healthy")?.modelId ??
    cards[0]?.modelId ??
    null
  );
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

export async function convergeSavedRuntimeAccount(input: {
  readonly currentSnapshot: ConfiguredModelsSnapshot;
  readonly mutate: () => Promise<RuntimeAccount>;
}): Promise<ConfiguredModelsSnapshot> {
  const updatedAccount = await input.mutate();
  const hasExistingAccount = input.currentSnapshot.accounts.some(
    (account) => account.providerAccountId === updatedAccount.providerAccountId,
  );
  return {
    accounts: hasExistingAccount
      ? input.currentSnapshot.accounts.map((account) =>
          account.providerAccountId === updatedAccount.providerAccountId ? updatedAccount : account,
        )
      : [...input.currentSnapshot.accounts, updatedAccount],
    endpoints: input.currentSnapshot.endpoints,
    models: input.currentSnapshot.models,
  };
}

export async function loadConfiguredModelsMutationState(input: {
  readonly loadAccounts: () => Promise<ConfiguredModelsSnapshot["accounts"]>;
  readonly loadEndpoints: () => Promise<ConfiguredModelsSnapshot["endpoints"]>;
  readonly loadModels: () => Promise<ConfiguredModelsSnapshot["models"]>;
  readonly loadController: () => Promise<RuntimeControllerAssignment | null>;
}): Promise<{
  readonly snapshot: ConfiguredModelsSnapshot;
  readonly controller: RuntimeControllerAssignment | null;
}> {
  const [accounts, endpoints, models, controller] = await Promise.all([
    input.loadAccounts(),
    input.loadEndpoints(),
    input.loadModels(),
    input.loadController(),
  ]);
  return { snapshot: { accounts, endpoints, models }, controller };
}

export default function ControlModelsRoute() {
  const [snapshot, setSnapshot] = useState<ConfiguredModelsSnapshot | null>(null);
  const [requests, setRequests] = useState<readonly RuntimeRequestListItem[]>([]);
  const [requestEvidenceStatus, setRequestEvidenceStatus] =
    useState<RequestEvidenceStatus>("loading");
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
    return startDeferredConfiguredModelsBootstrap({
      loadInitial: async (): Promise<ConfiguredModelsInitialLoadResult> => {
        const [accounts, endpoints, models, nextController, nextRolePolicy, nextCandidates] =
          await Promise.all([
            fetchRuntimeAccounts(),
            fetchRuntimeEndpoints(),
            fetchRuntimeModels(),
            fetchControllerAssignment(),
            fetchRolePolicy(),
            fetchRouterCandidates(),
          ]);
        return {
          snapshot: {
            accounts,
            endpoints,
            models,
          },
          controller: nextController,
          rolePolicy: nextRolePolicy,
          candidates: nextCandidates,
        };
      },
      onInitialData: (loaded) => {
        setSnapshot(loaded.snapshot);
        setController(loaded.controller);
        setRolePolicy(loaded.rolePolicy);
        setCandidates(loaded.candidates);
        setRequests([]);
        setRequestEvidenceStatus("loading");
        setControllerLoaded(true);
        setError(null);
      },
      onInitialError: (message) => {
        setError(message);
      },
      loadObservedRequests: async () => [],
      onObservedRequests: () => {
        setRequests([]);
        setRequestEvidenceStatus("unavailable");
      },
      onObservedRequestsError: () => {
        setRequests([]);
        setRequestEvidenceStatus("unavailable");
      },
    });
  }, []);

  const cards = useMemo(
    () =>
      snapshot
        ? buildConfiguredModelCards({
            models: snapshot.models,
            endpoints: snapshot.endpoints,
            accounts: snapshot.accounts,
            requests: requestEvidenceStatus === "ready" ? requests : null,
            controller,
          })
        : [],
    [controller, requestEvidenceStatus, requests, snapshot],
  );

  const selectedCard = cards.find((card) => card.modelId === selectedModelId) ?? null;

  useEffect(() => {
    const defaultSelectedModelId = resolveDefaultSelectedModelId(cards);
    if (!defaultSelectedModelId) {
      if (selectedModelId !== null) {
        setSelectedModelId(null);
      }
      return;
    }
    if (!selectedModelId || !cards.some((card) => card.modelId === selectedModelId)) {
      setSelectedModelId(defaultSelectedModelId);
    }
  }, [cards, selectedModelId]);

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
    if (!selectedCard || !snapshot) {
      return;
    }
    setSavingAccountId(account.providerAccountId);
    setStatusMessage(null);
    try {
      const nextSnapshot = await convergeSavedRuntimeAccount({
        currentSnapshot: snapshot,
        mutate: () =>
          upsertRuntimeAccount(
            createAccountMutationPayload(
              account,
              selectedCard.modelId,
              draftRolesByAccountId[account.providerAccountId] ?? [],
              allRuntimeRoleIds,
            ),
          ),
      });
      setSnapshot(nextSnapshot);
      setError(null);
      setStatusMessage(`Updated roles for ${account.providerAccountId}.`);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not update model roles.");
    } finally {
      setSavingAccountId(null);
    }
  };

  const refreshModelState = async () => {
    const loaded = await loadConfiguredModelsMutationState({
      loadAccounts: fetchRuntimeAccounts,
      loadEndpoints: fetchRuntimeEndpoints,
      loadModels: fetchRuntimeModels,
      loadController: fetchControllerAssignment,
    });
    setSnapshot(loaded.snapshot);
    setController(loaded.controller);
    setControllerLoaded(true);
    setError(null);
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
        const result = await removeRuntimeAccountModel(
          account.providerAccountId,
          selectedCard.modelId,
        );
        await refreshModelState();
        setStatusMessage(
          result.alreadyAbsent
            ? `${selectedCard.modelId} was already absent from ${account.providerAccountId}; the pool is converged.`
            : result.removedAccount
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
  const activeModelCount = cards.filter(
    (card) => card.status === "active" || card.status === "healthy",
  ).length;
  const observedRequestsFact = buildObservedRequestFact({
    requests,
    status: requestEvidenceStatus,
  });

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
  const selectedCapabilityScore = selectedCard
    ? (capabilityByModelId.get(selectedCard.modelId) ?? null)
    : null;
  const selectedPrimaryAccount = selectedModelAccounts[0] ?? null;
  const selectedPrimaryAccountHasLocalPeerEndpoint = selectedPrimaryAccount
    ? selectedEndpoints.some(
        (endpoint) =>
          endpoint.providerAccountId === selectedPrimaryAccount.providerAccountId &&
          endpoint.sourceType === "local",
      )
    : false;
  const selectedPrimaryAccountRoleIds = selectedPrimaryAccount
    ? (draftRolesByAccountId[selectedPrimaryAccount.providerAccountId] ??
      getAccountRoleIdsForModel(
        selectedPrimaryAccount,
        selectedCard?.modelId ?? "",
        allRuntimeRoleIds,
      ))
    : [];
  const selectedModelEvidencePills = buildSelectedModelEvidencePills({
    assignedRoleRows: benchmarkAssignedRoleRows,
    groupRows: benchmarkGroupRows,
    suggestedRoleRows: benchmarkSuggestedRoleRows,
  });

  return (
    <div className="space-y-6">
      {statusMessage ? (
        <section className={`${mutedPanelClassName} p-4`}>
          <p className={utilityLabelClassName}>Last model change</p>
          <p className={`mt-2 ${supportingTextClassName}`}>{statusMessage}</p>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Configured models"
          value={cards.length}
          detail="Every configured model appears once in the merged inventory."
          emphasis
        />
        <FactCard
          label="Healthy models"
          value={activeModelCount}
          detail="Endpoint summaries currently resolve to active."
        />
        <FactCard
          label="Tool-capable"
          value={toolCapableCount}
          detail="Models with at least one tool-capable endpoint."
        />
        <FactCard
          label="Observed requests"
          value={observedRequestsFact.value}
          detail={observedRequestsFact.detail}
        />
      </div>

      {!controller ? (
        <section className={`${mutedPanelClassName} p-5`}>
          <p className={foregroundEmphasisClassName}>Controller pending</p>
          <p className={`mt-2 ${supportingTextClassName}`}>
            Activate a local or remote endpoint, then assign it from Router &gt; Controller.
          </p>
        </section>
      ) : null}

      <div className="grid gap-4 xl:items-start xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)] 2xl:grid-cols-[minmax(0,760px)_minmax(0,1fr)]">
        <section className={`${mutedPanelClassName} min-w-0 p-5`}>
          <div className="space-y-2">
            <h2 className={sectionTitleClassName}>Model inventory</h2>
            <p className={supportingTextClassName}>
              Every configured model appears once, with local and remote endpoint state merged into
              a card-based registry.
            </p>
          </div>

          {cards.length === 0 ? (
            <>
              <div className="mt-4">
                <EmptyState label="No configured models are available yet." />
              </div>
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
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {cards.map((card) => {
                const capabilityScore = capabilityByModelId.get(card.modelId);
                const inventoryPills = buildConfiguredModelInventoryPills({
                  toolCallingSupported: card.toolCallingSupported,
                  endpointCount: card.endpointCount,
                  capabilityScore,
                });
                return (
                  <article
                    key={card.modelId}
                    className={`${cardClassName} min-w-0 p-4 ${
                      selectedModelId === card.modelId ? "border-[var(--rm-accent)]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={metaTextClassName}>{card.sourceSummary}</p>
                        <h3 className={`mt-2 truncate ${inlineTitleClassName}`}>
                          {card.displayName}
                        </h3>
                        <p className={`mt-2 break-all ${supportingTextClassName}`}>
                          {card.modelId}
                        </p>
                      </div>
                      <StatusPill
                        tone={resolveConfiguredModelStatusTone(card.controllerState, card.status)}
                      >
                        {card.controllerState === "active" ? "controller" : card.status}
                      </StatusPill>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {inventoryPills.map((pill) => (
                        <StatusPill key={pill.label} tone={pill.tone}>
                          {pill.label}
                        </StatusPill>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        className={secondaryButtonClassName}
                        type="button"
                        onClick={() => setSelectedModelId(card.modelId)}
                      >
                        {selectedModelId === card.modelId ? "Selected" : "Inspect"}
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
        </section>

        <section className={`${mutedPanelClassName} min-w-0 p-5`}>
          {selectedCard ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className={sectionTitleClassName}>Selected model detail</h2>
                <p className={supportingTextClassName}>
                  The production page opens role bindings, benchmark evidence, disclosures, and
                  endpoint ids for the selected model.
                </p>
              </div>

              <section className={`${cardClassName} p-4`}>
                <h3 className={compactTitleClassName}>{selectedCard.displayName}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedModelEvidencePills.map((pill) => (
                    <StatusPill key={pill.label} tone={pill.tone}>
                      {pill.label}
                    </StatusPill>
                  ))}
                </div>
              </section>

              <section className={`${cardClassName} p-4`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={foregroundEmphasisClassName}>Backing account role bindings</p>
                    <p className={`mt-2 ${supportingTextClassName}`}>
                      {selectedPrimaryAccount
                        ? `${selectedPrimaryAccount.providerAccountId} • ${
                            selectedPrimaryAccount.healthStatus ?? "unknown"
                          }`
                        : "No backing provider accounts currently expose this model."}
                    </p>
                  </div>
                  {selectedPrimaryAccount ? (
                    <StatusPill
                      tone={
                        selectedPrimaryAccount.healthStatus === "healthy" ? "success" : "warning"
                      }
                    >
                      {selectedPrimaryAccount.healthStatus ?? "unknown"}
                    </StatusPill>
                  ) : null}
                </div>

                {selectedPrimaryAccount ? (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedPrimaryAccountRoleIds.length > 0 ? (
                        selectedPrimaryAccountRoleIds.map((roleId) => (
                          <StatusPill key={roleId} tone="neutral">
                            {roleId}
                          </StatusPill>
                        ))
                      ) : (
                        <StatusPill tone="warning">No role bindings yet</StatusPill>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        className={primaryButtonClassName}
                        type="button"
                        disabled={
                          savingAccountId === selectedPrimaryAccount.providerAccountId ||
                          removingTargetKey ===
                            `account:${selectedPrimaryAccount.providerAccountId}`
                        }
                        onClick={() => void saveAccountRoles(selectedPrimaryAccount)}
                      >
                        {savingAccountId === selectedPrimaryAccount.providerAccountId
                          ? "Saving…"
                          : "Save bindings"}
                      </button>
                      <button
                        className={secondaryButtonClassName}
                        type="button"
                        disabled={
                          removingTargetKey ===
                          `account:${selectedPrimaryAccount.providerAccountId}`
                        }
                        onClick={() => void removeConfiguredModel(selectedPrimaryAccount)}
                      >
                        {removingTargetKey === `account:${selectedPrimaryAccount.providerAccountId}`
                          ? "Removing…"
                          : resolveConfiguredModelEjectLabel(
                              selectedPrimaryAccountHasLocalPeerEndpoint,
                            )}
                      </button>
                    </div>
                  </>
                ) : null}
              </section>

              <section className={`${cardClassName} p-4`}>
                <p className={supportingTextClassName}>
                  Capabilities: {selectedCapabilities.join(", ") || "none"} • Metrics:{" "}
                  {describeConfiguredModelRequestEvidence(
                    selectedCard.requestCount,
                    requestEvidenceStatus,
                  )}
                  , {selectedCard.endpointCount} endpoints, {selectedCard.sourceSummary} • Tooling /
                  MCP: {selectedCard.toolCallingSupported ? "enabled" : "unavailable"}
                  {selectedCapabilityScore !== null
                    ? ` • Benchmark: ${Math.round(selectedCapabilityScore * 100)}%`
                    : ""}
                </p>
              </section>

              <div>
                <CodeBlock className="max-h-[208px] overflow-auto">
                  {JSON.stringify(
                    buildSelectedModelPreviewPayload({
                      modelId: selectedCard.modelId,
                      endpointIds: selectedCard.endpointIds,
                    }),
                    null,
                    2,
                  )}
                </CodeBlock>
              </div>

              <DisclosureSection summary="Edit role bindings">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={foregroundEmphasisClassName}>Manage role definitions</p>
                      <p className={`mt-2 ${supportingTextClassName}`}>
                        Assign live runtime roles per provider account for this model. These
                        bindings feed router-visible endpoint role coverage directly.
                      </p>
                    </div>
                    <Link className={secondaryButtonClassName} to="/app/models/roles">
                      Manage role definitions
                    </Link>
                  </div>

                  {selectedModelAccounts.length === 0 ? (
                    <p className={supportingTextClassName}>
                      No backing provider accounts currently expose this model.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {selectedModelAccounts.map((account) => {
                        const hasLocalPeerEndpoint = selectedEndpoints.some(
                          (endpoint) =>
                            endpoint.providerAccountId === account.providerAccountId &&
                            endpoint.sourceType === "local",
                        );
                        return (
                          <div key={account.providerAccountId} className={`${cardClassName} p-4`}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className={foregroundEmphasisClassName}>
                                  {account.providerAccountId}
                                </p>
                                <p className={`mt-1 ${supportingTextClassName}`}>
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
                                selectedRoleIds={
                                  draftRolesByAccountId[account.providerAccountId] ?? []
                                }
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
                                disabled={
                                  removingTargetKey === `account:${account.providerAccountId}`
                                }
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
              </DisclosureSection>

              <DisclosureSection summary="Model diagnostics">
                <div className="space-y-4">
                  {selectedLlamaSwapEndpoints.length > 0 ? (
                    <div className={`${cardClassName} p-4`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className={foregroundEmphasisClassName}>Local runtime pool</p>
                          <p className={`mt-2 ${supportingTextClassName}`}>
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

                  <div className={`${cardClassName} p-4`}>
                    <p className={foregroundEmphasisClassName}>Capabilities</p>
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

                  <div className={`${cardClassName} p-4`}>
                    <p className={foregroundEmphasisClassName}>Metrics</p>
                    <div className={`mt-3 grid gap-3 md:grid-cols-2 ${supportingTextClassName}`}>
                      <p>
                        <span className={foregroundEmphasisClassName}>Requests observed:</span>{" "}
                        {describeConfiguredModelRequestEvidence(
                          selectedCard.requestCount,
                          requestEvidenceStatus,
                        )}
                      </p>
                      <p>
                        <span className={foregroundEmphasisClassName}>Configured endpoints:</span>{" "}
                        {selectedCard.endpointCount}
                      </p>
                      <p>
                        <span className={foregroundEmphasisClassName}>Source mix:</span>{" "}
                        {selectedCard.sourceSummary}
                      </p>
                      <p>
                        <span className={foregroundEmphasisClassName}>Status:</span>{" "}
                        {selectedCard.status}
                      </p>
                    </div>
                  </div>

                  <div className={`${cardClassName} p-4`}>
                    <p className={foregroundEmphasisClassName}>Model specifications</p>
                    <div className={`mt-3 grid gap-3 md:grid-cols-2 ${supportingTextClassName}`}>
                      {selectedMetadataRows.map((row) => (
                        <p key={row.label}>
                          <span className={foregroundEmphasisClassName}>{row.label}:</span>{" "}
                          {row.value}
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className={`${cardClassName} p-4`}>
                    <p className={foregroundEmphasisClassName}>Tooling / MCP</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusPill tone={selectedCard.toolCallingSupported ? "accent" : "neutral"}>
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
                  </div>

                  <div className={`${cardClassName} p-4`}>
                    <p className={foregroundEmphasisClassName}>
                      Telemetry taxonomy rollup (advisory)
                    </p>
                    {telemetryRollup && telemetryRollup.totalRequests > 0 ? (
                      <div className={`mt-3 space-y-3 ${bodyTextClassName}`}>
                        <p className={`${supportingTextClassName} text-[var(--rm-muted)]`}>
                          Based on {telemetryRollup.totalRequests} request
                          {telemetryRollup.totalRequests === 1 ? "" : "s"} over the last{" "}
                          {telemetryRollup.windowDays} days.
                        </p>
                        <div className="grid gap-4 xl:grid-cols-3">
                          <div className="space-y-2">
                            <p className={foregroundEmphasisClassName}>Recent groups</p>
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
                            <p className={foregroundEmphasisClassName}>Recent roles</p>
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
                            <p className={foregroundEmphasisClassName}>Recent capabilities</p>
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
                              className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--rm-radius-md)] border border-[var(--rm-border)] p-2"
                            >
                              <div className="min-w-0">
                                <p className={bodyStrongTextClassName}>{task.taskType}</p>
                                <p className={supportingTextClassName}>
                                  {task.requestCount} req{" "}
                                  {task.avgLatencyMs !== null ? `• avg ${task.avgLatencyMs}ms` : ""}
                                </p>
                              </div>
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
                          ))}
                        </div>
                        <div className="grid gap-4 xl:grid-cols-2">
                          <div className="space-y-2">
                            <p className={foregroundEmphasisClassName}>Observed strengths</p>
                            {telemetryRollup.strengths.length > 0 ? (
                              telemetryRollup.strengths.map((strength) => (
                                <p key={strength} className={supportingTextClassName}>
                                  {strength}
                                </p>
                              ))
                            ) : (
                              <p className={supportingTextClassName}>
                                No high-confidence strengths have emerged from recent telemetry yet.
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <p className={foregroundEmphasisClassName}>Observed warnings</p>
                            {telemetryRollup.warnings.length > 0 ? (
                              telemetryRollup.warnings.map((warning) => (
                                <p key={warning} className={supportingTextClassName}>
                                  {warning}
                                </p>
                              ))
                            ) : (
                              <p className={supportingTextClassName}>
                                No warning-level patterns are visible in the recent telemetry slice.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className={`mt-3 ${supportingTextClassName}`}>
                        No taxonomy-tagged telemetry data available yet for this model. Send
                        requests to populate taxonomy rollups, per-task performance, and advisory
                        warnings.
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
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
                </div>
              </DisclosureSection>
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className={sectionTitleClassName}>Selected model detail</h2>
              <p className={supportingTextClassName}>
                Select a model from the inventory to inspect bindings, benchmark evidence, and
                endpoint ids.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
