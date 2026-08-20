import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
import {
  compactFieldButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { ModelRoleBindingTree } from "../lib/role-task-hierarchy";
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
  removeRuntimeEndpoint,
  unloadLocalModel,
  unloadPeerModel,
  updateControllerAssignment,
  upsertRuntimeAccount,
} from "../lib/runtime-api";
import { buildConfiguredModelCards, buildSelectedModelMetaPanel } from "../lib/view-models";

type ConfiguredModelCardLike = {
  readonly modelId: string;
  readonly identityKey?: string;
  readonly endpointId?: string;
  readonly displayName?: string;
  readonly controllerState: "active" | "eligible" | "inactive";
  readonly status: string;
};

type BadgeTone = "neutral" | "accent" | "warning" | "success" | "error" | "info" | "advisory";

type ConfiguredModelInventoryPill = {
  readonly label: string;
  readonly tone: BadgeTone;
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

/** Paper Models inventory — section eyebrows (Runtime / Cost / Benchmark / Models / Roles). */
const inventoryEyebrowClassName =
  "font-sans text-[11px] font-semibold uppercase leading-[14px] tracking-[0.04em] text-[var(--rm-muted)]";
const inventoryFactLabelClassName = "font-sans text-[13px] leading-[18px] text-[var(--rm-muted)]";
const inventoryFactValueClassName =
  "text-right font-sans text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]";
const inventoryMonoValueClassName =
  "text-right font-mono text-[12px] font-semibold leading-4 text-[var(--rm-fg)]";
export const configuredModelRoleSectionClassName = "flex flex-col gap-3";
export const configuredModelRoleListClassName = "space-y-2 pr-1";

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
): BadgeTone {
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
      label: input.toolCallingSupported ? "tools" : "no tools",
      tone: input.toolCallingSupported ? "info" : "neutral",
    },
    {
      label: `${input.endpointCount} endpoint${input.endpointCount === 1 ? "" : "s"}`,
      tone: "neutral",
    },
    ...(typeof input.capabilityScore === "number"
      ? [
          {
            label: `score ${input.capabilityScore.toFixed(2)}`,
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
  endpointId?: string,
): string[] {
  const binding =
    (endpointId
      ? account.modelRoleBindings?.find((entry) => entry.endpointId === endpointId)
      : undefined) ??
    account.modelRoleBindings?.find(
      (entry) => entry.endpointId === undefined && entry.modelId === modelId,
    );
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

export function resolveConfiguredModelEjectLabel(
  hasLocalPeerEndpoint: boolean,
): "Eject from router" | "Eject from pool" {
  return hasLocalPeerEndpoint ? "Eject from router" : "Eject from pool";
}

export type ConfiguredModelFooterAction = {
  readonly kind: "unload-local" | "eject-configured" | "none";
  readonly label: "Unload" | "Eject from router" | "Eject from pool";
  readonly disabled: boolean;
};

export function resolveConfiguredModelFooterAction(input: {
  readonly hasSelectedCard: boolean;
  readonly isController: boolean;
  readonly hasLlamaSwapEndpoint: boolean;
  readonly hasPrimaryAccount: boolean;
  readonly hasLocalPeerEndpoint: boolean;
  readonly isRemoving: boolean;
}): ConfiguredModelFooterAction {
  const kind = input.hasLlamaSwapEndpoint
    ? "unload-local"
    : input.hasPrimaryAccount
      ? "eject-configured"
      : "none";
  return {
    kind,
    label:
      kind === "unload-local"
        ? "Unload"
        : resolveConfiguredModelEjectLabel(input.hasLocalPeerEndpoint),
    disabled: !input.hasSelectedCard || kind === "none" || input.isController || input.isRemoving,
  };
}

export function resolveConfiguredModelRemovalClick(input: {
  readonly actionKind: ConfiguredModelFooterAction["kind"];
  readonly targetKey: string;
  readonly pendingConfirmationKey: string | null;
}): "request-confirmation" | "execute" | "none" {
  if (input.actionKind === "none") {
    return "none";
  }
  if (input.actionKind === "eject-configured" && input.pendingConfirmationKey !== input.targetKey) {
    return "request-confirmation";
  }
  return "execute";
}

export async function saveConfiguredModelRoleEligibility<TAccount, TCanonicalState>(input: {
  readonly mutate: () => Promise<TAccount>;
  readonly reloadCanonicalState: () => Promise<TCanonicalState>;
}): Promise<TCanonicalState> {
  await input.mutate();
  return input.reloadCanonicalState();
}

export function describeSavedModelRoleEligibility(input: {
  readonly displayName: string;
  readonly providerAccountId: string;
  readonly selectedRoleIds: readonly string[];
  readonly roleDefinitions: readonly {
    readonly role_id: string;
    readonly primaryGroupId?: string;
    readonly secondaryGroupIds?: readonly string[];
    readonly task_types_supported?: readonly string[];
  }[];
  readonly endpointVariantCount: number;
}): string {
  const selectedRoleIds = new Set(input.selectedRoleIds);
  const selectedRoles = input.roleDefinitions.filter((role) => selectedRoleIds.has(role.role_id));
  const taskTypes = new Set(selectedRoles.flatMap((role) => role.task_types_supported ?? []));
  const groupIds = new Set(
    selectedRoles.flatMap((role) => [
      ...(role.primaryGroupId ? [role.primaryGroupId] : []),
      ...(role.secondaryGroupIds ?? []),
    ]),
  );
  return `Saved eligibility for ${input.displayName} on ${input.providerAccountId}: ${selectedRoles.length} role${selectedRoles.length === 1 ? "" : "s"} derive ${taskTypes.size} task type${taskTypes.size === 1 ? "" : "s"} across ${groupIds.size} group${groupIds.size === 1 ? "" : "s"} for this endpoint instance.`;
}

export function resolveSelectedModelAccount<
  TAccount extends { readonly providerAccountId: string },
  TEndpoint extends { readonly providerAccountId?: string },
>(accounts: readonly TAccount[], selectedEndpoints: readonly TEndpoint[]): TAccount | null {
  const selectedEndpointAccountIds = new Set(
    selectedEndpoints
      .map((endpoint) => endpoint.providerAccountId)
      .filter((providerAccountId): providerAccountId is string => Boolean(providerAccountId)),
  );
  return (
    accounts.find((account) => selectedEndpointAccountIds.has(account.providerAccountId)) ??
    accounts[0] ??
    null
  );
}

export function resolveDefaultSelectedModelId(
  cards: readonly ConfiguredModelCardLike[],
): string | null {
  return (
    cards.find((card) => card.controllerState === "active")?.identityKey ??
    cards.find((card) => card.controllerState === "active")?.modelId ??
    cards.find((card) => card.status === "active" || card.status === "healthy")?.identityKey ??
    cards.find((card) => card.status === "active" || card.status === "healthy")?.modelId ??
    cards[0]?.identityKey ??
    cards[0]?.modelId ??
    null
  );
}

function configuredModelCardKey(card: ConfiguredModelCardLike): string {
  return card.identityKey ?? card.modelId;
}

export function configuredModelRoleDraftKey(
  providerAccountId: string,
  endpointId: string | undefined,
): string {
  return `${providerAccountId}\u0000${endpointId ?? "legacy-model-default"}`;
}

export function createAccountMutationPayload(
  account: RuntimeAccount,
  modelId: string,
  roleIds: readonly string[],
  allRoleIds: readonly string[] = [],
  endpointId?: string,
): Record<string, unknown> {
  const otherBindings = (account.modelRoleBindings ?? []).filter((binding) =>
    endpointId
      ? binding.endpointId !== endpointId
      : binding.endpointId !== undefined || binding.modelId !== modelId,
  );
  const assignment = buildModelRoleAssignmentForSelection(roleIds, allRoleIds);
  const nextBinding = {
    modelId,
    ...(endpointId ? { endpointId } : {}),
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
  const [pendingRemovalConfirmationKey, setPendingRemovalConfirmationKey] = useState<string | null>(
    null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<readonly RouterCandidate[]>([]);
  const [telemetryRollup, setTelemetryRollup] = useState<ModelTelemetryRollup | null>(null);
  const [pendingControllerEndpointId, setPendingControllerEndpointId] = useState<string | null>(
    null,
  );
  const [expandedBindingRoleId, setExpandedBindingRoleId] = useState<string | null>(null);

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

  const selectedCard =
    cards.find((card) => configuredModelCardKey(card) === selectedModelId) ?? null;

  useEffect(() => {
    const defaultSelectedModelId = resolveDefaultSelectedModelId(cards);
    if (!defaultSelectedModelId) {
      if (selectedModelId !== null) {
        setSelectedModelId(null);
      }
      return;
    }
    if (
      !selectedModelId ||
      !cards.some((card) => configuredModelCardKey(card) === selectedModelId)
    ) {
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
      ? selectedCard.endpointId
        ? snapshot.endpoints.filter((endpoint) => endpoint.endpointId === selectedCard.endpointId)
        : snapshot.endpoints.filter((endpoint) => endpoint.modelId === selectedCard.modelId)
      : [];
  const selectedLlamaSwapEndpoints = selectedEndpoints.filter(
    (endpoint) => endpoint.sourceType === "local" && endpoint.localModelSource === "llama-swap",
  );
  const selectedToolStyles = [
    ...new Set(
      selectedEndpoints
        .filter((endpoint) => endpoint.toolCallingSupported)
        .map((endpoint) => endpoint.toolCallingStyle ?? "unknown"),
    ),
  ].sort((left, right) => left.localeCompare(right, "en"));
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
          configuredModelRoleDraftKey(account.providerAccountId, selectedCard.endpointId),
          getAccountRoleIdsForModel(
            account,
            selectedCard.modelId,
            allRuntimeRoleIds,
            selectedCard.endpointId,
          ),
        ]),
      ),
    );
  }, [allRuntimeRoleIds, selectedCard, selectedModelAccounts]);

  const saveAccountRoles = async (account: RuntimeAccount, nextRoleIds?: readonly string[]) => {
    if (!selectedCard || !snapshot) {
      return;
    }
    setSavingAccountId(account.providerAccountId);
    setStatusMessage(`Saving role eligibility for ${account.providerAccountId}…`);
    try {
      const roleIds =
        nextRoleIds ??
        draftRolesByAccountId[
          configuredModelRoleDraftKey(account.providerAccountId, selectedCard.endpointId)
        ] ??
        [];
      const loaded = await saveConfiguredModelRoleEligibility({
        mutate: () =>
          upsertRuntimeAccount(
            createAccountMutationPayload(
              account,
              selectedCard.modelId,
              roleIds,
              allRuntimeRoleIds,
              selectedCard.endpointId,
            ),
          ),
        reloadCanonicalState: () =>
          loadConfiguredModelsMutationState({
            loadAccounts: fetchRuntimeAccounts,
            loadEndpoints: fetchRuntimeEndpoints,
            loadModels: fetchRuntimeModels,
            loadController: fetchControllerAssignment,
          }),
      });
      setSnapshot(loaded.snapshot);
      setController(loaded.controller);
      setControllerLoaded(true);
      const endpointVariantCount = loaded.snapshot.endpoints.filter(
        (endpoint) =>
          endpoint.modelId === selectedCard.modelId &&
          endpoint.providerAccountId === account.providerAccountId,
      ).length;
      setStatusMessage(
        describeSavedModelRoleEligibility({
          displayName: selectedCard.displayName,
          providerAccountId: account.providerAccountId,
          selectedRoleIds: roleIds,
          roleDefinitions: rolePolicy?.roleDefinitions ?? [],
          endpointVariantCount,
        }),
      );
      setError(null);
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
      } else if (selectedCard.endpointId) {
        const result = await removeRuntimeEndpoint(selectedCard.endpointId);
        await refreshModelState();
        setStatusMessage(
          result.status === "absent"
            ? `${selectedCard.displayName ?? selectedCard.modelId} was already absent; sibling instances are unchanged.`
            : `Removed ${selectedCard.displayName ?? selectedCard.modelId}; sibling instances are unchanged.`,
        );
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
  const selectedPrimaryAccount = resolveSelectedModelAccount(
    selectedModelAccounts,
    selectedEndpoints,
  );
  const selectedPrimaryAccountHasLocalPeerEndpoint = selectedPrimaryAccount
    ? selectedEndpoints.some(
        (endpoint) =>
          endpoint.providerAccountId === selectedPrimaryAccount.providerAccountId &&
          endpoint.sourceType === "local",
      )
    : false;
  const selectedPrimaryAccountRoleIds = selectedPrimaryAccount
    ? (draftRolesByAccountId[
        configuredModelRoleDraftKey(
          selectedPrimaryAccount.providerAccountId,
          selectedCard?.endpointId,
        )
      ] ??
      getAccountRoleIdsForModel(
        selectedPrimaryAccount,
        selectedCard?.modelId ?? "",
        allRuntimeRoleIds,
        selectedCard?.endpointId,
      ))
    : [];
  const selectedFooterAction = resolveConfiguredModelFooterAction({
    hasSelectedCard: selectedCard !== null,
    isController: selectedCard?.controllerState === "active",
    hasLlamaSwapEndpoint: selectedLlamaSwapEndpoints.length > 0,
    hasPrimaryAccount: selectedPrimaryAccount !== null,
    hasLocalPeerEndpoint: selectedPrimaryAccountHasLocalPeerEndpoint,
    isRemoving: removingTargetKey !== null,
  });
  const selectedRemovalTargetKey = selectedCard
    ? selectedFooterAction.kind === "unload-local"
      ? `local:${selectedCard.modelId}`
      : selectedCard.endpointId
        ? `endpoint:${selectedCard.endpointId}`
        : `account:${selectedPrimaryAccount?.providerAccountId ?? "none"}:${selectedCard.modelId}`
    : "none";
  const removalConfirmationPending =
    selectedFooterAction.kind === "eject-configured" &&
    pendingRemovalConfirmationKey === selectedRemovalTargetKey;
  const selectedModelEvidencePills = buildSelectedModelEvidencePills({
    assignedRoleRows: benchmarkAssignedRoleRows,
    groupRows: benchmarkGroupRows,
    suggestedRoleRows: benchmarkSuggestedRoleRows,
  });
  const selectedHealthyEndpointCount = selectedEndpoints.filter(
    (endpoint) =>
      endpoint.healthStatus === "healthy" ||
      (!endpoint.healthStatus && endpoint.status === "active"),
  ).length;
  const selectedMeanLatencyMs = (() => {
    if (!telemetryRollup || telemetryRollup.tasks.length === 0) {
      return null;
    }
    const samples = telemetryRollup.tasks
      .map((task) => task.avgLatencyMs)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (samples.length === 0) {
      return null;
    }
    return samples.reduce((sum, value) => sum + value, 0) / samples.length;
  })();
  const selectedCandidateProfiles = selectedCard
    ? candidates.filter((candidate) => candidate.modelId === selectedCard.modelId)
    : [];
  const selectedLatencyProfile = (() => {
    for (const candidate of selectedCandidateProfiles) {
      const profile =
        typeof candidate.latestProfile === "object" && candidate.latestProfile !== null
          ? (candidate.latestProfile as Record<string, unknown>)
          : null;
      const p50 = profile?.latency_ms_p50 ?? profile?.latencyMsP50;
      const p95 = profile?.latency_ms_p95 ?? profile?.latencyMsP95;
      if (
        (typeof p50 === "number" && Number.isFinite(p50)) ||
        (typeof p95 === "number" && Number.isFinite(p95))
      ) {
        return {
          p50: typeof p50 === "number" && Number.isFinite(p50) ? p50 : null,
          p95: typeof p95 === "number" && Number.isFinite(p95) ? p95 : null,
        };
      }
    }
    return { p50: null as number | null, p95: null as number | null };
  })();
  const selectedDifficultyMix = (() => {
    for (const candidate of selectedCandidateProfiles) {
      const buckets = candidate.benchmarkCapability?.scoresByBucket;
      if (!buckets) {
        continue;
      }
      const easy = buckets.easy?.score;
      const medium = buckets.medium?.score;
      const hard = buckets.hard?.score;
      if (typeof easy === "number" && typeof medium === "number" && typeof hard === "number") {
        return `${Math.round(easy * 100)} / ${Math.round(medium * 100)} / ${Math.round(hard * 100)}`;
      }
    }
    return null;
  })();
  const selectedMetaPanel = selectedCard
    ? buildSelectedModelMetaPanel({
        modelId: selectedCard.modelId,
        displayName: selectedCard.displayName,
        sourceSummary: selectedCard.sourceSummary,
        status: selectedCard.status,
        controllerState: selectedCard.controllerState,
        endpointCount: selectedCard.endpointCount,
        healthyEndpointCount: selectedHealthyEndpointCount,
        toolCallingSupported: selectedCard.toolCallingSupported,
        toolStyles: selectedToolStyles,
        contextWindow: selectedCard.contextWindow,
        modalities: selectedCard.modalities,
        pricing: selectedCard.pricing,
        overallScore: selectedCapabilityScore,
        latencyP50Ms: selectedLatencyProfile.p50,
        latencyP95Ms: selectedLatencyProfile.p95,
        meanLatencyMs: selectedMeanLatencyMs,
        difficultyMix: selectedDifficultyMix,
        routingHint: telemetryRollup?.strengths[0] ?? selectedModelEvidencePills[0]?.label ?? null,
      })
    : null;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Model inventory"
        description="Select a model to inspect and configure. Controller is the badge — change it from the footer."
      >
        {cards.length === 0 ? (
          <div className="space-y-4">
            <EmptyState label="No configured models are available yet." />
            <div className="flex flex-wrap gap-3">
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
          </div>
        ) : (
          <div className="space-y-5">
            {statusMessage ? (
              <p className={supportingTextClassName} aria-live="polite">
                {statusMessage}
              </p>
            ) : null}
            {!controller ? (
              <p className={supportingTextClassName}>
                Controller pending — activate a local or remote endpoint, then assign it from Router
                → Controller.
              </p>
            ) : null}
            <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
              <div className="min-w-0 space-y-4">
                <div className="space-y-2">
                  <p className={inventoryEyebrowClassName}>Models</p>
                  <div className="overflow-hidden rounded-[var(--rm-radius-field)] border border-[var(--rm-border)]">
                    {cards.map((card) => {
                      const cardKey = configuredModelCardKey(card);
                      const selected = selectedModelId === cardKey;
                      const capabilityScore = capabilityByModelId.get(card.modelId);
                      const inventoryPills = buildConfiguredModelInventoryPills({
                        toolCallingSupported: card.toolCallingSupported,
                        endpointCount: card.endpointCount,
                        capabilityScore,
                      });
                      return (
                        <button
                          key={cardKey}
                          type="button"
                          className={`flex w-full items-start gap-2.5 border-b border-[var(--rm-border)] px-3 py-2.5 text-left last:border-b-0 ${
                            selected
                              ? "border-l-[3px] border-l-[var(--rm-accent)] bg-[var(--rm-surface-strong)]"
                              : "border-l-[3px] border-l-transparent hover:bg-[var(--rm-surface-strong)]"
                          }`}
                          onClick={() => {
                            setPendingRemovalConfirmationKey(null);
                            setSelectedModelId(cardKey);
                          }}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate font-mono text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                                {card.displayName}
                              </span>
                              <Badge
                                tone={resolveConfiguredModelStatusTone(
                                  card.controllerState,
                                  card.status,
                                )}
                              >
                                {card.controllerState === "active" ? "controller" : card.status}
                              </Badge>
                            </div>
                            <p className="text-[12px] leading-4 text-[var(--rm-muted)]">
                              {[
                                card.sourceSummary,
                                ...inventoryPills.map((pill) => pill.label),
                              ].join(" · ")}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedCard && selectedMetaPanel ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className={inventoryEyebrowClassName}>{selectedMetaPanel.title}</p>
                      <dl className="space-y-2">
                        {selectedMetaPanel.facts.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <dt className={inventoryFactLabelClassName}>{row.label}</dt>
                            <dd className={inventoryFactValueClassName}>{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div className="h-px w-full bg-[var(--rm-border)]" />
                    <div className="space-y-2">
                      <p className={inventoryEyebrowClassName}>Cost</p>
                      <dl className="space-y-2">
                        {selectedMetaPanel.cost.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <dt className={inventoryFactLabelClassName}>{row.label}</dt>
                            <dd className={inventoryMonoValueClassName}>{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                    <div className="h-px w-full bg-[var(--rm-border)]" />
                    <div className="space-y-2">
                      <p className={inventoryEyebrowClassName}>Benchmark</p>
                      <dl className="space-y-2">
                        {selectedMetaPanel.benchmark.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <dt className={inventoryFactLabelClassName}>{row.label}</dt>
                            <dd
                              className={
                                row.label === "Overall" || row.label === "Routing"
                                  ? inventoryFactValueClassName
                                  : inventoryMonoValueClassName
                              }
                            >
                              {row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                ) : (
                  <p
                    className={`${supportingTextClassName} border-t border-[var(--rm-border)] pt-4`}
                  >
                    Select a model from the inventory to inspect bindings, benchmark evidence, and
                    endpoint ids.
                  </p>
                )}
              </div>

              <div className="min-w-0">
                {selectedCard ? (
                  <section className={configuredModelRoleSectionClassName}>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <p className={inventoryEyebrowClassName}>Roles</p>
                      <p className="text-[12px] leading-4 text-[var(--rm-muted)]">
                        {selectedCard.displayName} · tasks under each role
                      </p>
                    </div>
                    {rolePolicy && selectedPrimaryAccount ? (
                      <div className={configuredModelRoleListClassName}>
                        <p className="text-[12px] leading-4 text-[var(--rm-muted)]">
                          Saved immediately for {selectedPrimaryAccount.providerAccountId}. Task and
                          group eligibility is derived from these roles for this exact endpoint
                          instance. A legacy model default is inherited only until this instance is
                          edited.
                        </p>
                        <ModelRoleBindingTree
                          roleDefinitions={rolePolicy.roleDefinitions}
                          taskDefinitions={rolePolicy.taskDefinitions}
                          selectedRoleIds={selectedPrimaryAccountRoleIds}
                          expandedRoleId={expandedBindingRoleId}
                          disabled={savingAccountId === selectedPrimaryAccount.providerAccountId}
                          onToggleRole={(roleId, nextChecked) => {
                            const accountId = selectedPrimaryAccount.providerAccountId;
                            const draftKey = configuredModelRoleDraftKey(
                              accountId,
                              selectedCard.endpointId,
                            );
                            const existing = new Set(
                              draftRolesByAccountId[draftKey] ?? selectedPrimaryAccountRoleIds,
                            );
                            if (nextChecked) {
                              existing.add(roleId);
                            } else {
                              existing.delete(roleId);
                            }
                            const nextRoleIds = [...existing].sort((left, right) =>
                              left.localeCompare(right, "en"),
                            );
                            setDraftRolesByAccountId((current) => ({
                              ...current,
                              [draftKey]: nextRoleIds,
                            }));
                            void saveAccountRoles(selectedPrimaryAccount, nextRoleIds);
                          }}
                          onToggleExpandedRole={(roleId) =>
                            setExpandedBindingRoleId((current) =>
                              current === roleId ? null : roleId,
                            )
                          }
                        />
                      </div>
                    ) : (
                      <p className={supportingTextClassName}>
                        No backing provider accounts currently expose this model.
                      </p>
                    )}
                  </section>
                ) : (
                  <p className={supportingTextClassName}>
                    Roles and task bindings appear when a model is selected.
                  </p>
                )}
              </div>
            </div>

            <div className="-mx-5 -mb-5 mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--rm-border)] px-5 py-3">
              <button
                type="button"
                className={compactFieldButtonClassName}
                disabled={
                  !selectedCard ||
                  selectedCard.controllerState === "active" ||
                  selectedCard.endpointIds.length === 0 ||
                  pendingControllerEndpointId !== null
                }
                onClick={() => {
                  const endpointId = selectedCard?.endpointIds[0];
                  if (!endpointId) {
                    return;
                  }
                  setPendingControllerEndpointId(endpointId);
                  setError(null);
                  void updateControllerAssignment({ endpointId })
                    .then(async (nextController) => {
                      setController(nextController);
                      await refreshModelState();
                      setStatusMessage(`Made ${selectedCard.displayName} the primary controller.`);
                    })
                    .catch((value: unknown) =>
                      setError(
                        value instanceof Error
                          ? value.message
                          : "Could not update the controller assignment.",
                      ),
                    )
                    .finally(() => setPendingControllerEndpointId(null));
                }}
              >
                {pendingControllerEndpointId ? "Saving…" : "Make primary controller"}
              </button>
              <Link className={compactFieldButtonClassName} to="/app/models/roles">
                Open Roles
              </Link>
              <Link className={compactFieldButtonClassName} to="/app/models/benchmark">
                Open Benchmark
              </Link>
              <button
                type="button"
                className={`${compactFieldButtonClassName} text-[var(--rm-error)]`}
                disabled={selectedFooterAction.disabled}
                title={
                  selectedCard?.controllerState === "active"
                    ? "Assign another primary controller before removing this model."
                    : undefined
                }
                onClick={() => {
                  if (!selectedCard || selectedFooterAction.kind === "none") {
                    return;
                  }
                  const clickDisposition = resolveConfiguredModelRemovalClick({
                    actionKind: selectedFooterAction.kind,
                    targetKey: selectedRemovalTargetKey,
                    pendingConfirmationKey: pendingRemovalConfirmationKey,
                  });
                  if (clickDisposition === "request-confirmation") {
                    setPendingRemovalConfirmationKey(selectedRemovalTargetKey);
                    setStatusMessage(
                      `Confirm ${selectedFooterAction.label.toLowerCase()} for ${selectedCard.displayName}. Other effort variants remain configured unless they share this peer-backed model.`,
                    );
                    return;
                  }
                  setPendingRemovalConfirmationKey(null);
                  if (selectedFooterAction.kind === "unload-local") {
                    void unloadSelectedLocalModel();
                    return;
                  }
                  if (!selectedPrimaryAccount) {
                    return;
                  }
                  void removeConfiguredModel(selectedPrimaryAccount);
                }}
              >
                {removingTargetKey
                  ? selectedFooterAction.kind === "unload-local"
                    ? "Unloading…"
                    : "Ejecting…"
                  : removalConfirmationPending
                    ? `Confirm ${selectedFooterAction.label.toLowerCase()}`
                    : selectedFooterAction.label}
              </button>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
