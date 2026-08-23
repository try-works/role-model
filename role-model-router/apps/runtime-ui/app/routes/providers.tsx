import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { DeviceAuthorizationCard } from "../components/device-authorization-card";
import { DeviceAuthorizationModal } from "../components/device-authorization-modal";
import { LocalModelRolePicker } from "../components/local-model-role-picker";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
} from "../components/page-primitives";
import {
  compactFieldButtonEmphasisClassName,
  fieldClassName,
  fieldLabelClassName,
  insetPanelClassName,
  mutedPanelClassName,
  secondaryButtonClassName,
  successNoticeClassName,
} from "../lib/design-system";
import {
  getDeviceAuthorizationPollDelayMs,
  isCodexSubscriptionDeviceAuthorization,
  resolveVerificationWindowUrl,
  restorePersistedDeviceAuthorization,
  shouldAutoOpenDeviceAuthorizationWindow,
  shouldAutoPollDeviceAuthorization,
  shouldFallbackToCurrentBrowserForDeviceAuthorization,
  syncConnectedDeviceAuthorizationEndpoints,
} from "../lib/device-authorization";
import {
  formatEndpointDisplayName,
  formatModelIdentity,
  formatReasoningEffortLabel,
  readReasoningEffort,
  readReasoningEffortLevels,
} from "../lib/effort-identity";
import { resolveProviderAccountLifecycle } from "../lib/provider-account-state";
import {
  type ProvidersSnapshot,
  type RuntimeAccount,
  type RuntimeDeviceAuthorization,
  type RuntimeEndpoint,
  type RuntimeModelRecord,
  type RuntimeProvider,
  type RuntimeRolePolicy,
  activateRuntimeEndpoint,
  activateRuntimeEndpointBatch,
  fetchProvidersSnapshot,
  fetchRecentRequestIds,
  fetchRolePolicy,
  fetchRuntimeCatalogModels,
  openRuntimeExternalUrl,
  pollRuntimeDeviceAuthorization,
  reconnectRuntimeAccount,
  roleIdsToExplicitAssignment,
  startRuntimeDeviceAuthorization,
  upsertRuntimeAccount,
} from "../lib/runtime-api";
import {
  buildAccountModelCatalogIds,
  buildConfiguredRemoteConnectionRows,
} from "../lib/view-models";

const inputClass = fieldClassName;
const buttonClass = compactFieldButtonEmphasisClassName;

type ModelRoleSelection = Record<string, string[]>;

type ProviderModelRoleCoverageSummary = {
  readonly totalSelectedCount: number;
  readonly totalRoleCount: number;
  readonly allRolesSelected: boolean;
  readonly groupPreviewLabels: readonly string[];
  readonly hiddenGroupCount: number;
};

export function resolveProviderCatalogModel(input: {
  readonly selectedModel: string;
  readonly providerCatalogModels: readonly RuntimeModelRecord[];
  readonly activeModels: readonly RuntimeModelRecord[];
}): RuntimeModelRecord | null {
  if (!input.selectedModel) {
    return null;
  }
  return (
    input.providerCatalogModels.find((model) => model.id === input.selectedModel) ??
    input.activeModels.find((model) => model.id === input.selectedModel) ??
    null
  );
}

export function buildProviderActionFeedback(
  input:
    | {
        readonly action: "saved";
        readonly modelId: string;
        readonly endpointActivated: boolean;
      }
    | {
        readonly action: "oauth";
        readonly modelId: string;
        readonly providerLabel: string;
        readonly authorizationStatus: RuntimeDeviceAuthorization["status"];
      },
): string {
  if (input.action === "saved") {
    return input.endpointActivated
      ? `Saved ${input.modelId} and activated its runtime endpoint.`
      : `Saved ${input.modelId}. Complete authentication to activate its runtime endpoint.`;
  }

  return input.authorizationStatus === "connected"
    ? `OAuth is connected and ${input.modelId} is active.`
    : `OAuth started for ${input.modelId}. Complete authorization in the ${input.providerLabel} window.`;
}

export function shouldActivateSavedProviderEndpoint(input: {
  readonly authMode: string;
  readonly oauthConnected: boolean;
  readonly existingAccount?: Pick<RuntimeAccount, "authMode" | "status" | "healthStatus"> | null;
}): boolean {
  if (input.authMode === "api-key-static" || input.oauthConnected) {
    return true;
  }

  return (
    input.authMode === "oauth2-device-code" &&
    input.existingAccount?.authMode === "oauth2-device-code" &&
    input.existingAccount.status === "active" &&
    input.existingAccount.healthStatus === "healthy"
  );
}

export async function syncStartedProviderAuthorization(input: {
  readonly session: RuntimeDeviceAuthorization;
  readonly selectedModels: readonly string[];
  readonly activateEndpoint: (payload: {
    readonly providerAccountId: string;
    readonly modelId: string;
    readonly region: string;
  }) => Promise<unknown>;
}): Promise<boolean> {
  await syncConnectedDeviceAuthorizationEndpoints(input);
  return input.session.status === "connected";
}

type ProvidersInitialLoadResult = {
  readonly snapshot: ProvidersSnapshot;
  readonly rolePolicy: RuntimeRolePolicy;
};

export interface DeferredProvidersBootstrapOptions<TInitialData> {
  readonly loadInitial: () => Promise<TInitialData>;
  readonly onInitialData: (data: TInitialData) => void;
  readonly onInitialError: (message: string) => void;
  readonly loadRecentRequestIds: () => Promise<readonly string[]>;
  readonly onRecentRequestIds: (requestIds: readonly string[]) => void;
  readonly onRecentRequestIdsError?: (message: string) => void;
}

export function startDeferredProvidersBootstrap<TInitialData>(
  options: DeferredProvidersBootstrapOptions<TInitialData>,
): () => void {
  let disposed = false;

  void options
    .loadInitial()
    .then((data) => {
      if (disposed) {
        return;
      }
      options.onInitialData(data);
      return options.loadRecentRequestIds().then(
        (requestIds) => {
          if (!disposed) {
            options.onRecentRequestIds(requestIds);
          }
        },
        (value: unknown) => {
          if (disposed) {
            return;
          }
          options.onRecentRequestIdsError?.(
            value instanceof Error ? value.message : "Could not load recent request ids.",
          );
        },
      );
    })
    .catch((value: unknown) => {
      if (disposed) {
        return;
      }
      options.onInitialError(value instanceof Error ? value.message : "Could not load providers.");
    });

  return () => {
    disposed = true;
  };
}

function defaultVariantId(provider?: RuntimeProvider): string {
  return provider?.variants?.[0]?.variantId ?? "";
}

function slugifyAccountSegment(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.length > 0 ? normalized : "primary";
}

function defaultProviderAccountId(providerId: string, variantId: string): string {
  return `${providerId}.personal.${slugifyAccountSegment(variantId)}`;
}

function defaultCredentialRef(provider?: RuntimeProvider): string {
  return provider?.envVars?.[0] ?? "API_KEY";
}

function formatRuntimeRoleGroupLabel(groupId: string): string {
  return groupId
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function resolveConfiguredEndpointRoleIds(input: {
  readonly endpointRoleIds: readonly string[];
  readonly draftRoleIds?: readonly string[];
  readonly availableRoleIds: readonly string[];
}): string[] {
  if (input.draftRoleIds !== undefined) {
    return [...input.draftRoleIds];
  }
  // Missing/empty assignment means all roles for configured Remote endpoints.
  if (input.endpointRoleIds.length === 0) {
    return [...input.availableRoleIds];
  }
  return [...input.endpointRoleIds];
}

export function buildModelRoleSelection(
  modelIds: readonly string[],
  allRoleIds: readonly string[],
  bindings?: readonly {
    readonly modelId: string;
    readonly roleIds: readonly string[];
    readonly roleAssignmentMode?: "all" | "include" | "exclude" | "custom";
    readonly enabledRoleIds?: readonly string[];
    readonly disabledRoleIds?: readonly string[];
  }[],
): ModelRoleSelection {
  const byModelId = new Map((bindings ?? []).map((binding) => [binding.modelId, binding]));
  return Object.fromEntries(
    modelIds.map((modelId) => {
      const binding = byModelId.get(modelId);
      if (!binding || binding.roleAssignmentMode === "all") {
        return [modelId, [...allRoleIds]];
      }
      if (binding.roleAssignmentMode === "exclude") {
        const disabled = new Set(binding.disabledRoleIds ?? []);
        return [modelId, allRoleIds.filter((roleId) => !disabled.has(roleId))];
      }
      if (binding.roleAssignmentMode === "include" || binding.roleAssignmentMode === "custom") {
        return [modelId, [...(binding.enabledRoleIds ?? binding.roleIds)].sort()];
      }
      return [modelId, [...binding.roleIds].sort()];
    }),
  );
}

export function buildModelRoleBindings(
  selectedModels: readonly (string | { readonly modelId: string; readonly endpointId: string })[],
  selection: ModelRoleSelection,
  allRoleIds: readonly string[],
) {
  return selectedModels.map((target) => {
    const modelId = typeof target === "string" ? target : target.modelId;
    const endpointId = typeof target === "string" ? undefined : target.endpointId;
    const selectionKey = endpointId ?? modelId;
    const roleIds = [...new Set(selection[selectionKey] ?? [])].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
    const assignment =
      allRoleIds.length > 0 && roleIds.length === allRoleIds.length
        ? { roleAssignmentMode: "all" as const, enabledRoleIds: [], disabledRoleIds: [] }
        : roleIdsToExplicitAssignment(roleIds, false);
    return {
      modelId,
      ...(endpointId ? { endpointId } : {}),
      roleIds:
        assignment.roleAssignmentMode === "include" ? [...(assignment.enabledRoleIds ?? [])] : [],
      roleAssignmentMode: assignment.roleAssignmentMode,
      enabledRoleIds: [...(assignment.enabledRoleIds ?? [])],
      disabledRoleIds: [...(assignment.disabledRoleIds ?? [])],
    };
  });
}

export function buildProviderModelRoleCoverageSummary(input: {
  readonly selectedRoleIds: readonly string[];
  readonly allRoleIds: readonly string[];
  readonly rolePolicy: RuntimeRolePolicy | null;
  readonly previewGroupLimit?: number;
}): ProviderModelRoleCoverageSummary {
  const previewGroupLimit = Math.max(1, input.previewGroupLimit ?? 3);
  const totalRoleCount = input.allRoleIds.length;
  const totalSelectedRoleIds = [...new Set(input.selectedRoleIds)];
  const allRolesSelected = totalRoleCount > 0 && totalSelectedRoleIds.length === totalRoleCount;

  if (!input.rolePolicy || input.rolePolicy.roleDefinitions.length === 0) {
    return {
      totalSelectedCount: totalSelectedRoleIds.length,
      totalRoleCount,
      allRolesSelected,
      groupPreviewLabels:
        totalSelectedRoleIds.length > 0 ? [`${totalSelectedRoleIds.length} selected`] : [],
      hiddenGroupCount: 0,
    };
  }

  const selectedRoleSet = new Set(totalSelectedRoleIds);
  const groupedCoverage = input.rolePolicy.roleDefinitions.reduce((groups, roleDefinition) => {
    const groupId = roleDefinition.primaryGroupId ?? "ungrouped";
    const current = groups.get(groupId) ?? {
      label: formatRuntimeRoleGroupLabel(groupId),
      selectedCount: 0,
      totalCount: 0,
    };
    current.totalCount += 1;
    if (selectedRoleSet.has(roleDefinition.role_id)) {
      current.selectedCount += 1;
    }
    groups.set(groupId, current);
    return groups;
  }, new Map<string, { label: string; selectedCount: number; totalCount: number }>());

  const selectedGroups = [...groupedCoverage.values()]
    .filter((group) => group.selectedCount > 0)
    .sort(
      (left, right) =>
        right.selectedCount - left.selectedCount || left.label.localeCompare(right.label, "en"),
    );

  const groupPreviewLabels = selectedGroups
    .slice(0, previewGroupLimit)
    .map((group) => `${group.label} ${group.selectedCount}/${group.totalCount}`);

  return {
    totalSelectedCount: totalSelectedRoleIds.length,
    totalRoleCount,
    allRolesSelected,
    groupPreviewLabels,
    hiddenGroupCount: Math.max(0, selectedGroups.length - groupPreviewLabels.length),
  };
}

function buildAvailableModels(input: {
  readonly snapshot: ProvidersSnapshot;
  readonly provider: RuntimeProvider | undefined;
  readonly variantId: string | undefined;
}): string[] {
  if (!input.provider) {
    return [];
  }

  const variant =
    input.provider.variants?.find((entry) => entry.variantId === input.variantId) ??
    input.provider.variants?.[0];
  return buildAccountModelCatalogIds({
    account: {
      providerId: input.provider.providerId,
      allowedModels: variant?.modelIds ?? input.provider.modelIds ?? [],
    },
    providers: input.snapshot.providers,
    models: input.snapshot.models,
  });
}

export function buildReasoningEffortOptions(input: {
  readonly model: Pick<RuntimeModelRecord, "id"> &
    Partial<
      Pick<
        RuntimeModelRecord,
        | "displayName"
        | "reasoningEffort"
        | "reasoning_effort"
        | "fixedEffort"
        | "fixed_effort"
        | "reasoningEffortLevels"
        | "reasoning_effort_levels"
      >
    >;
  readonly endpoints: readonly Pick<
    RuntimeEndpoint,
    "modelId" | "reasoningEffortLevels" | "reasoning_effort_levels"
  >[];
}): Array<{ value: string; label: string }> {
  const values = [
    ...readReasoningEffortLevels(input.model),
    ...input.endpoints
      .filter((endpoint) => endpoint.modelId === input.model.id)
      .flatMap((endpoint) => readReasoningEffortLevels(endpoint)),
  ];
  return [...new Set(values)].map((value) => ({
    value,
    label: formatReasoningEffortLabel(value) ?? value,
  }));
}

/** Resolve the Paper multi-select into endpoint instances without collapsing the default slot. */
export function buildReasoningEffortActivationPlan(input: {
  readonly selectedEfforts: readonly string[];
  readonly activeEfforts: ReadonlySet<string>;
}): { readonly selectedEfforts: readonly string[]; readonly newEfforts: readonly string[] } {
  const selectedEfforts = [...new Set(input.selectedEfforts)];
  const newEfforts = selectedEfforts.filter((effort) => !input.activeEfforts.has(effort));
  return { selectedEfforts, newEfforts };
}

export function buildReasoningEffortSaveAction(input: {
  readonly newEffortCount: number;
  readonly submitting: boolean;
  readonly selectionReady: boolean;
}): { readonly disabled: boolean; readonly label: string } {
  return {
    disabled: input.submitting || !input.selectionReady,
    label: input.submitting
      ? "Saving…"
      : input.newEffortCount === 0
        ? "Save configuration"
        : `Save ${input.newEffortCount} instance${input.newEffortCount === 1 ? "" : "s"}`,
  };
}

export function buildReasoningEffortActivationBatch(input: {
  readonly activationBatchId: string;
  readonly providerAccountId: string;
  readonly modelId: string;
  readonly efforts: readonly string[];
}): {
  readonly activationBatchId: string;
  readonly activations: readonly Record<string, unknown>[];
} {
  return {
    activationBatchId: input.activationBatchId,
    activations: input.efforts.map((effort) => ({
      providerAccountId: input.providerAccountId,
      modelId: input.modelId,
      region: "global",
      ...(effort ? { reasoningEffort: effort } : {}),
    })),
  };
}

function buildPendingDeviceAuthorizationModalKey(
  session: RuntimeDeviceAuthorization | null,
): string | null {
  if (
    !session ||
    session.status !== "pending" ||
    !isCodexSubscriptionDeviceAuthorization(session)
  ) {
    return null;
  }

  const userCode = session.userCode?.trim();
  if (!userCode) {
    return null;
  }

  return `${session.authRequestId}:${userCode}`;
}

export default function ProvidersRoute() {
  const [searchParams] = useSearchParams();
  const initializedRef = useRef(false);
  const allowPersistedOauthRestoreRef = useRef(false);
  const shownDeviceAuthorizationModalKeyRef = useRef<string | null>(null);
  const recentRequestIdsRef = useRef<readonly string[]>([]);
  const recentRequestIdsErrorRef = useRef<string | null>(null);
  const activationBatchAttemptRef = useRef<{ key: string; id: string } | null>(null);
  const [snapshot, setSnapshot] = useState<ProvidersSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [providerAccountId, setProviderAccountId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [credentialRef, setCredentialRef] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [providerCatalogModels, setProviderCatalogModels] = useState<readonly RuntimeModelRecord[]>(
    [],
  );
  const [providerCatalogLoading, setProviderCatalogLoading] = useState(false);
  const [providerCatalogError, setProviderCatalogError] = useState<string | null>(null);
  const [selectedReasoningEfforts, setSelectedReasoningEfforts] = useState<string[]>([]);
  const [selectedModelRoles, setSelectedModelRoles] = useState<ModelRoleSelection>({});
  const [rolePolicy, setRolePolicy] = useState<RuntimeRolePolicy | null>(null);
  const [oauthState, setOauthState] = useState<RuntimeDeviceAuthorization | null>(null);
  const [oauthConnected, setOauthConnected] = useState(false);
  const [copiedUserCode, setCopiedUserCode] = useState(false);
  const [deviceAuthorizationModalSession, setDeviceAuthorizationModalSession] =
    useState<RuntimeDeviceAuthorization | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(null);
  const [draftRolesByEndpointId, setDraftRolesByEndpointId] = useState<Record<string, string[]>>(
    {},
  );
  const [savingRolesEndpointId, setSavingRolesEndpointId] = useState<string | null>(null);

  const applyProviderSelection = useCallback(
    (
      nextSnapshot: ProvidersSnapshot,
      requestedProviderId?: string | null,
      requestedVariantId?: string | null,
      options?: {
        readonly allowPersistedOauthRestore?: boolean;
      },
    ) => {
      const remoteProviders = nextSnapshot.providers.filter(
        (provider) => provider.providerKind !== "local-engine",
      );
      const nextProvider =
        remoteProviders.find((provider) => provider.providerId === requestedProviderId) ??
        remoteProviders[0];
      if (!nextProvider) {
        return;
      }
      const nextVariantId =
        requestedVariantId &&
        nextProvider.variants?.some((variant) => variant.variantId === requestedVariantId)
          ? requestedVariantId
          : defaultVariantId(nextProvider);
      const nextModels = buildAvailableModels({
        snapshot: nextSnapshot,
        provider: nextProvider,
        variantId: nextVariantId,
      });
      allowPersistedOauthRestoreRef.current = options?.allowPersistedOauthRestore ?? false;

      setProviderId(nextProvider.providerId);
      setVariantId(nextVariantId);
      setProviderAccountId(defaultProviderAccountId(nextProvider.providerId, nextVariantId));
      setCredentialRef(defaultCredentialRef(nextProvider));
      setSelectedModel("");
      setSelectedReasoningEfforts([]);
      setSelectedModelRoles({});
      setOauthState(null);
      setOauthConnected(false);
      setCopiedUserCode(false);
      shownDeviceAuthorizationModalKeyRef.current = null;
      setDeviceAuthorizationModalSession(null);
    },
    [],
  );

  const applyLoadedProvidersData = useCallback(
    (
      loaded: ProvidersInitialLoadResult,
      options?: {
        readonly allowPersistedOauthRestore?: boolean;
      },
    ) => {
      const nextSnapshot = loaded.snapshot;
      const nextRolePolicy = loaded.rolePolicy;
      setSnapshot(nextSnapshot);
      setRolePolicy(nextRolePolicy);
      setError(null);

      if (!initializedRef.current) {
        applyProviderSelection(
          nextSnapshot,
          searchParams.get("providerId"),
          searchParams.get("variantId"),
          {
            allowPersistedOauthRestore: options?.allowPersistedOauthRestore ?? true,
          },
        );
        initializedRef.current = true;
        return;
      }

      if (
        !nextSnapshot.providers
          .filter((provider) => provider.providerKind !== "local-engine")
          .some((provider) => provider.providerId === providerId)
      ) {
        applyProviderSelection(nextSnapshot, null, null, {
          allowPersistedOauthRestore: false,
        });
      }
    },
    [applyProviderSelection, providerId, searchParams],
  );

  const loadInitialProvidersData = useCallback(async (): Promise<ProvidersInitialLoadResult> => {
    const [nextSnapshot, nextRolePolicy] = await Promise.all([
      fetchProvidersSnapshot(),
      fetchRolePolicy(),
    ]);
    return {
      snapshot: nextSnapshot,
      rolePolicy: nextRolePolicy,
    };
  }, []);

  const load = useCallback(
    async (options?: { readonly allowPersistedOauthRestore?: boolean }) => {
      try {
        const loaded = await loadInitialProvidersData();
        applyLoadedProvidersData(loaded, options);
      } catch (value: unknown) {
        setError(value instanceof Error ? value.message : "Could not load providers.");
      }
    },
    [applyLoadedProvidersData, loadInitialProvidersData],
  );

  const syncConnectedEndpoints = useCallback(
    async (session: RuntimeDeviceAuthorization) => {
      await syncConnectedDeviceAuthorizationEndpoints({
        session,
        selectedModels: selectedModel ? [selectedModel] : [],
        activateEndpoint: activateRuntimeEndpoint,
      });
    },
    [selectedModel],
  );

  const refreshCodexSubscriptionAuthorization = useCallback(
    async (session: RuntimeDeviceAuthorization): Promise<RuntimeDeviceAuthorization> => {
      setAuthorizing(true);
      setError(null);
      setCopiedUserCode(false);
      try {
        const result = await reconnectRuntimeAccount({
          providerAccountId: session.providerAccountId,
        });
        setOauthState(result);
        await load();
        return result;
      } finally {
        setAuthorizing(false);
      }
    },
    [load],
  );

  const openVerificationUrl = useCallback(
    async (session: RuntimeDeviceAuthorization | null) => {
      if (!session) {
        return;
      }

      let verificationSession = session;
      if (isCodexSubscriptionDeviceAuthorization(session)) {
        try {
          verificationSession = await refreshCodexSubscriptionAuthorization(session);
        } catch (value) {
          setError(
            value instanceof Error
              ? value.message
              : "Could not refresh the OpenAI verification code.",
          );
          return;
        }
      }

      const verificationUrl = resolveVerificationWindowUrl(verificationSession);
      if (!verificationUrl) {
        return;
      }

      try {
        await openRuntimeExternalUrl(verificationUrl);
        return;
      } catch {
        if (!shouldFallbackToCurrentBrowserForDeviceAuthorization(session)) {
          setError(
            "Could not open the verification page in your default browser. Retry from the device-code card or copy the URL manually.",
          );
          return;
        }
      }

      try {
        const opened = window.open(verificationUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          setError(
            "Could not open the verification page automatically. Use the Verification URL link below (or paste it into your browser).",
          );
        }
      } catch {
        setError("Could not open the verification page. Copy the URL manually and continue.");
      }
    },
    [refreshCodexSubscriptionAuthorization],
  );

  useEffect(() => {
    return startDeferredProvidersBootstrap({
      loadInitial: loadInitialProvidersData,
      onInitialData: (loaded) => {
        applyLoadedProvidersData(loaded, { allowPersistedOauthRestore: true });
      },
      onInitialError: (message) => {
        setError(message);
      },
      loadRecentRequestIds: () => fetchRecentRequestIds(10),
      onRecentRequestIds: (requestIds) => {
        recentRequestIdsRef.current = requestIds;
        recentRequestIdsErrorRef.current = null;
      },
      onRecentRequestIdsError: (message) => {
        recentRequestIdsErrorRef.current = message;
      },
    });
  }, [applyLoadedProvidersData, loadInitialProvidersData]);

  useEffect(() => {
    if (!shouldAutoPollDeviceAuthorization(oauthState) || polling || !oauthState) {
      return;
    }

    const pendingOauthState = oauthState;
    const timer = window.setTimeout(() => {
      setPolling(true);
      void pollRuntimeDeviceAuthorization(pendingOauthState.authRequestId)
        .then(async (result) => {
          setOauthState((current) => (current ? { ...current, ...result } : result));
          if (result.status !== "pending") {
            await syncConnectedEndpoints(result);
            await load();
            if (result.status === "connected") {
              setOauthConnected(true);
              window.setTimeout(() => setOauthState(null), 2000);
            }
          }
        })
        .catch((value) =>
          setError(
            value instanceof Error ? value.message : "Could not refresh provider authorization.",
          ),
        )
        .finally(() => setPolling(false));
    }, getDeviceAuthorizationPollDelayMs(pendingOauthState));

    return () => window.clearTimeout(timer);
  }, [load, oauthState, polling, syncConnectedEndpoints]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }

    setOauthState((current) => {
      const restored = restorePersistedDeviceAuthorization({
        current,
        providerAccountId,
        persistedSessions: snapshot.deviceAuthorizations,
        allowPersistedRestore: allowPersistedOauthRestoreRef.current,
      });
      allowPersistedOauthRestoreRef.current = false;
      return restored;
    });
  }, [providerAccountId, snapshot]);

  useEffect(() => {
    const selectedProviderId = providerId.trim();
    if (!selectedProviderId) {
      setProviderCatalogModels([]);
      setProviderCatalogLoading(false);
      setProviderCatalogError(null);
      return;
    }

    let cancelled = false;
    setProviderCatalogModels([]);
    setProviderCatalogLoading(true);
    setProviderCatalogError(null);
    void fetchRuntimeCatalogModels(selectedProviderId)
      .then((models) => {
        if (!cancelled) {
          setProviderCatalogModels(models);
        }
      })
      .catch((value: unknown) => {
        if (!cancelled) {
          setProviderCatalogError(
            value instanceof Error ? value.message : "Could not load provider model metadata.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setProviderCatalogLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [providerId]);

  useEffect(() => {
    const modalKey = buildPendingDeviceAuthorizationModalKey(oauthState);
    if (!modalKey || !oauthState) {
      if (!oauthState || oauthState.status !== "pending") {
        shownDeviceAuthorizationModalKeyRef.current = null;
      }
      setDeviceAuthorizationModalSession(null);
      return;
    }

    setDeviceAuthorizationModalSession((current) => {
      const currentKey = buildPendingDeviceAuthorizationModalKey(current);
      if (currentKey === modalKey) {
        return oauthState;
      }
      if (shownDeviceAuthorizationModalKeyRef.current === modalKey) {
        return current;
      }
      shownDeviceAuthorizationModalKeyRef.current = modalKey;
      return oauthState;
    });
  }, [oauthState]);

  const remoteProviders = useMemo(
    () => snapshot?.providers.filter((provider) => provider.providerKind !== "local-engine") ?? [],
    [snapshot],
  );
  const selectedProvider = useMemo(
    () =>
      remoteProviders.find((provider) => provider.providerId === providerId) ?? remoteProviders[0],
    [providerId, remoteProviders],
  );
  const selectedVariant = useMemo(
    () =>
      selectedProvider?.variants?.find((variant) => variant.variantId === variantId) ??
      selectedProvider?.variants?.[0],
    [selectedProvider, variantId],
  );
  const availableModels = useMemo(
    () =>
      snapshot && selectedProvider
        ? buildAvailableModels({
            snapshot,
            provider: selectedProvider,
            variantId: selectedVariant?.variantId,
          })
        : [],
    [selectedProvider, selectedVariant, snapshot],
  );
  const selectedSavedAccount = useMemo(
    () =>
      snapshot?.accounts.find((account) => account.providerAccountId === providerAccountId) ?? null,
    [providerAccountId, snapshot],
  );
  const availableRoleIds = useMemo(() => {
    if (rolePolicy && rolePolicy.roleDefinitions.length > 0) {
      return rolePolicy.roleDefinitions.map((role) => role.role_id);
    }
    return snapshot?.roles.map((role) => role.roleId) ?? [];
  }, [rolePolicy, snapshot]);
  const configuredRemoteConnectionRows = useMemo(
    () =>
      snapshot
        ? buildConfiguredRemoteConnectionRows({
            accounts: snapshot.accounts,
            endpoints: snapshot.endpoints,
            models: snapshot.models,
          })
        : [],
    [snapshot],
  );
  const selectedModelRecord = useMemo(
    () =>
      resolveProviderCatalogModel({
        selectedModel,
        providerCatalogModels,
        activeModels: snapshot?.models ?? [],
      }),
    [providerCatalogModels, selectedModel, snapshot?.models],
  );
  const selectedReasoningEffortOptions = useMemo(
    () =>
      selectedModelRecord
        ? buildReasoningEffortOptions({
            model: selectedModelRecord,
            endpoints: snapshot?.endpoints ?? [],
          })
        : [],
    [selectedModelRecord, snapshot?.endpoints],
  );
  const selectedModelIdentity = selectedModelRecord
    ? formatModelIdentity(selectedModelRecord, selectedModelRecord.id)
    : selectedModel;
  const activeReasoningEfforts = useMemo(() => {
    const active = new Set<string>();
    for (const endpoint of snapshot?.endpoints ?? []) {
      if (
        endpoint.modelId === selectedModel &&
        endpoint.providerAccountId === providerAccountId &&
        endpoint.status !== "inactive"
      ) {
        active.add(readReasoningEffort(endpoint) ?? "");
      }
    }
    return active;
  }, [providerAccountId, selectedModel, snapshot?.endpoints]);
  const effectiveSelectedReasoningEfforts = useMemo(
    () =>
      selectedModel ? (selectedReasoningEfforts.length > 0 ? selectedReasoningEfforts : [""]) : [],
    [selectedModel, selectedReasoningEfforts],
  );
  const reasoningActivationPlan = useMemo(
    () =>
      buildReasoningEffortActivationPlan({
        selectedEfforts: effectiveSelectedReasoningEfforts,
        activeEfforts: activeReasoningEfforts,
      }),
    [activeReasoningEfforts, effectiveSelectedReasoningEfforts],
  );
  const reasoningEffortSaveAction = buildReasoningEffortSaveAction({
    newEffortCount: reasoningActivationPlan.newEfforts.length,
    submitting,
    selectionReady: Boolean(
      selectedProvider &&
        selectedVariant &&
        selectedModel &&
        selectedModelRecord &&
        !providerCatalogLoading &&
        !providerCatalogError,
    ),
  });
  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading provider catalog…" />;
  }
  if (remoteProviders.length === 0) {
    return (
      <EmptyState label="No LiteLLM-backed remote providers are currently available from the runtime catalog." />
    );
  }

  const onProviderChange = (nextProviderId: string) => {
    applyProviderSelection(snapshot, nextProviderId, null, {
      allowPersistedOauthRestore: false,
    });
  };

  const onVariantChange = (nextVariantId: string) => {
    applyProviderSelection(snapshot, selectedProvider?.providerId ?? providerId, nextVariantId, {
      allowPersistedOauthRestore: false,
    });
  };

  const onModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setSelectedReasoningEfforts(modelId ? [""] : []);
    setSelectedModelRoles((current) =>
      modelId ? { [modelId]: current[modelId] ?? availableRoleIds } : {},
    );
  };

  const buildProviderPayload = () => {
    if (!selectedProvider || !selectedVariant) {
      throw new Error("Select a provider before saving configuration.");
    }
    const lifecycle = resolveProviderAccountLifecycle({
      authMode: selectedVariant.authMode,
      providerAccountId,
      oauthState,
      existingAccount: selectedSavedAccount,
    });

    return {
      providerAccountId,
      providerId: selectedProvider.providerId,
      providerKind: selectedProvider.providerKind,
      orgScope: "personal",
      accountScope: "workspace-default",
      credentialRef:
        selectedVariant.authMode === "api-key-static"
          ? {
              backend: "env",
              ref: credentialRef,
            }
          : {
              backend: "local-file",
              ref: `oauth/${selectedProvider.providerId}/${providerAccountId}`,
            },
      authMode: selectedVariant.authMode,
      regionPolicy: {
        mode: "prefer",
        regions: ["global"],
      },
      baseUrlOverride: selectedVariant.baseUrl ?? selectedProvider.apiBase,
      allowedModels: selectedModel ? [selectedModel] : [],
      modelRoleBindings: buildModelRoleBindings(
        selectedModel ? [selectedModel] : [],
        selectedModelRoles,
        availableRoleIds,
      ),
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status: lifecycle.status,
      healthStatus: lifecycle.healthStatus,
      rotationState: lifecycle.rotationState,
    };
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProvider || !selectedVariant) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setActionFeedback(null);
    try {
      await upsertRuntimeAccount(buildProviderPayload());
      const endpointActivated = shouldActivateSavedProviderEndpoint({
        authMode: selectedVariant.authMode,
        oauthConnected,
        existingAccount: selectedSavedAccount,
      });
      if (endpointActivated) {
        if (reasoningActivationPlan.newEfforts.length > 0) {
          const activationKey = JSON.stringify({
            providerAccountId,
            modelId: selectedModel,
            efforts: reasoningActivationPlan.newEfforts,
          });
          if (activationBatchAttemptRef.current?.key !== activationKey) {
            activationBatchAttemptRef.current = {
              key: activationKey,
              id: `activation-${globalThis.crypto.randomUUID()}`,
            };
          }
          await activateRuntimeEndpointBatch(
            buildReasoningEffortActivationBatch({
              activationBatchId: activationBatchAttemptRef.current.id,
              providerAccountId,
              modelId: selectedModel,
              efforts: reasoningActivationPlan.newEfforts,
            }),
          );
          activationBatchAttemptRef.current = null;
        }
      }
      await load();
      setActionFeedback(
        buildProviderActionFeedback({
          action: "saved",
          modelId: selectedModel,
          endpointActivated,
        }),
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not save provider configuration.");
    } finally {
      setSubmitting(false);
    }
  };

  const onStartDeviceAuthorization = async () => {
    if (!selectedProvider || !selectedVariant) {
      return;
    }
    setAuthorizing(true);
    setError(null);
    setActionFeedback(null);
    setCopiedUserCode(false);
    setDeviceAuthorizationModalSession(null);
    try {
      const result = await startRuntimeDeviceAuthorization({
        providerAccountId,
        providerId: selectedProvider.providerId,
        providerKind: selectedProvider.providerKind,
        variantId: selectedVariant.variantId,
        allowedModels: selectedModel ? [selectedModel] : [],
        modelRoleBindings: buildModelRoleBindings(
          selectedModel ? [selectedModel] : [],
          selectedModelRoles,
          availableRoleIds,
        ),
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });
      setOauthState(result);
      const connected = await syncStartedProviderAuthorization({
        session: result,
        selectedModels: selectedModel ? [selectedModel] : [],
        activateEndpoint: activateRuntimeEndpoint,
      });
      if (connected) {
        setOauthConnected(true);
      }
      if (result.status === "pending" && shouldAutoOpenDeviceAuthorizationWindow(result)) {
        void openVerificationUrl(result);
      }
      await load();
      setActionFeedback(
        buildProviderActionFeedback({
          action: "oauth",
          modelId: selectedModel,
          providerLabel: selectedVariant.label,
          authorizationStatus: result.status,
        }),
      );
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not start provider authorization.");
    } finally {
      setAuthorizing(false);
    }
  };

  const onPollDeviceAuthorization = async () => {
    if (!oauthState?.authRequestId) {
      return;
    }
    setPolling(true);
    setError(null);
    try {
      const result = await pollRuntimeDeviceAuthorization(oauthState.authRequestId);
      setOauthState((current) => (current ? { ...current, ...result } : result));
      await syncConnectedEndpoints(result);
      await load();
      if (result.status === "connected") {
        setOauthConnected(true);
        window.setTimeout(() => setOauthState(null), 2000);
      }
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Could not refresh provider authorization.",
      );
    } finally {
      setPolling(false);
    }
  };

  const onCopyUserCode = async () => {
    const userCode = oauthState?.userCode?.trim();
    if (!userCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(userCode);
      setCopiedUserCode(true);
    } catch {
      setError("Could not copy the device code. Copy it manually and continue.");
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid items-start gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard
            title="Choose provider and models"
            description="Select the provider, connection method, and model. New models start with all roles selected — edit roles on the configured connection."
          >
            <form className="space-y-4" onSubmit={onSubmit}>
              <SelectField
                label="Provider"
                value={selectedProvider?.providerId ?? ""}
                onChange={onProviderChange}
              >
                {remoteProviders.map((provider) => (
                  <option key={provider.providerId} value={provider.providerId}>
                    {provider.displayName}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="Connection method"
                value={selectedVariant?.variantId ?? ""}
                onChange={onVariantChange}
              >
                {(selectedProvider?.variants ?? []).map((variant) => (
                  <option key={variant.variantId} value={variant.variantId}>
                    {variant.label}
                  </option>
                ))}
              </SelectField>

              <label className="grid gap-1.5">
                <span className={fieldLabelClassName}>Provider connection id</span>
                <input
                  className={inputClass}
                  value={providerAccountId}
                  onChange={(event) => setProviderAccountId(event.target.value)}
                />
              </label>

              {selectedVariant?.authMode === "api-key-static" ? (
                <label className="grid gap-1.5">
                  <span className={fieldLabelClassName}>Credential reference</span>
                  <input
                    className={inputClass}
                    value={credentialRef}
                    onChange={(event) => setCredentialRef(event.target.value)}
                  />
                </label>
              ) : (
                <div className={insetPanelClassName}>
                  <p className="text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                    Runtime-managed credential reference
                  </p>
                  <p className="mt-2 text-[13px] font-normal leading-[18px] text-[var(--rm-secondary)]">
                    OAuth-backed providers store the resulting token locally and expose only the
                    generated credential reference back to the control plane.
                  </p>
                </div>
              )}

              <SelectField label="Model" value={selectedModel} onChange={onModelSelect}>
                <option value="">Select a model…</option>
                {availableModels.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {formatModelIdentity(
                      resolveProviderCatalogModel({
                        selectedModel: modelId,
                        providerCatalogModels,
                        activeModels: snapshot.models,
                      }) ?? { id: modelId },
                      modelId,
                    )}
                  </option>
                ))}
              </SelectField>

              {selectedModel ? (
                <fieldset className={`${insetPanelClassName} space-y-3`}>
                  <legend className="px-1 text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                    Reasoning effort
                  </legend>
                  <p className="text-[13px] leading-[18px] text-[var(--rm-secondary)]">
                    Select one or more catalog-advertised instances. Provider default is the empty
                    effort slot; active instances stay checked and cannot be duplicated.
                  </p>
                  {providerCatalogLoading ? (
                    <p className="text-[12px] leading-[17px] text-[var(--rm-muted)]" role="status">
                      Loading catalog-advertised effort levels…
                    </p>
                  ) : null}
                  {providerCatalogError ? (
                    <p className="text-[12px] leading-[17px] text-[var(--rm-danger)]" role="status">
                      Could not load provider model metadata. Reselect the provider to retry.
                    </p>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { value: "", label: "Provider default" },
                      ...selectedReasoningEffortOptions,
                    ].map((option) => {
                      const checked = effectiveSelectedReasoningEfforts.includes(option.value);
                      const active = activeReasoningEfforts.has(option.value);
                      const optionIdentity = option.value
                        ? formatEndpointDisplayName({
                            base: selectedModelIdentity,
                            reasoningEffort: option.value,
                          })
                        : selectedModelIdentity;
                      return (
                        <label
                          key={option.value || "provider-default"}
                          className="flex min-h-11 items-center gap-2 rounded-[var(--rm-radius-md)] border border-[var(--rm-border)] px-3 py-2 text-[13px] text-[var(--rm-fg)] focus-within:ring-2 focus-within:ring-[var(--rm-accent)]"
                        >
                          <input
                            className="size-4 accent-[var(--rm-accent)]"
                            type="checkbox"
                            checked={checked}
                            disabled={active}
                            onChange={() =>
                              setSelectedReasoningEfforts((current) =>
                                checked
                                  ? current.filter((effort) => effort !== option.value)
                                  : [...current, option.value],
                              )
                            }
                          />
                          <span className="min-w-0 flex-1 truncate" title={optionIdentity}>
                            {optionIdentity}
                          </span>
                          {active ? (
                            <span className="text-[11px] text-[var(--rm-muted)]">Active</span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>
                  {!providerCatalogLoading &&
                  !providerCatalogError &&
                  selectedReasoningEffortOptions.length === 0 ? (
                    <p className="text-[12px] leading-[17px] text-[var(--rm-muted)]">
                      No selectable effort levels are advertised for this model; only the provider
                      default instance is available.
                    </p>
                  ) : null}
                  <p className="text-[12px] font-medium text-[var(--rm-secondary)]">
                    Save {reasoningActivationPlan.newEfforts.length} instance
                    {reasoningActivationPlan.newEfforts.length === 1 ? "" : "s"}
                  </p>
                </fieldset>
              ) : null}

              {selectedVariant?.oauth ? (
                <div className={`${mutedPanelClassName} p-3`}>
                  <p className="text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                    OAuth metadata
                  </p>
                  <p className="mt-2 text-[13px] font-normal leading-[18px] text-[var(--rm-secondary)]">
                    <span className="font-semibold text-[var(--rm-fg)]">Client id:</span>{" "}
                    {selectedVariant.oauth.clientId}
                  </p>
                  <p className="text-[13px] font-normal leading-[18px] text-[var(--rm-secondary)]">
                    <span className="font-semibold text-[var(--rm-fg)]">Device endpoint:</span>{" "}
                    {selectedVariant.oauth.deviceAuthorizationEndpoint}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  className={buttonClass}
                  disabled={reasoningEffortSaveAction.disabled}
                  type="submit"
                >
                  {reasoningEffortSaveAction.label}
                </button>

                {selectedVariant?.authMode === "oauth2-device-code" ? (
                  <>
                    <button
                      className={secondaryButtonClassName}
                      disabled={authorizing || selectedModel === ""}
                      type="button"
                      onClick={() => void onStartDeviceAuthorization()}
                    >
                      {authorizing ? "Starting…" : "Start OAuth"}
                    </button>
                    <button
                      className={secondaryButtonClassName}
                      disabled={polling || !oauthState?.authRequestId}
                      type="button"
                      onClick={() => void onPollDeviceAuthorization()}
                    >
                      {polling ? "Checking…" : "Check now"}
                    </button>
                  </>
                ) : null}
              </div>
              {oauthState ? (
                <DeviceAuthorizationCard
                  session={oauthState}
                  copyCodeLabel={copiedUserCode ? "Copied" : "Copy code"}
                  onCopyCode={() => void onCopyUserCode()}
                  onOpenVerificationUrl={() => void openVerificationUrl(oauthState)}
                />
              ) : null}
              {actionFeedback ? (
                <p className={successNoticeClassName} role="status" aria-live="polite">
                  {actionFeedback}
                </p>
              ) : null}
            </form>
          </SectionCard>

          <SectionCard
            title="Configured provider connections"
            description="Endpoints stay grouped by account. Expand a model’s roles count to edit which routing roles it can serve."
          >
            <div className="space-y-4">
              {configuredRemoteConnectionRows.length === 0 ? (
                <EmptyState label="No remote endpoints are configured yet. Activate a remote model to populate this pane." />
              ) : (
                <>
                  {configuredRemoteConnectionRows.map((row) => (
                    <div
                      key={row.providerAccountId}
                      className={`${mutedPanelClassName} overflow-hidden`}
                      data-testid={`provider-connection-${row.providerAccountId}`}
                    >
                      <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                        <p className="min-w-0 break-all font-mono text-sm font-semibold leading-5 text-[var(--rm-fg)]">
                          {row.providerAccountId}
                        </p>
                        <Badge tone="neutral">{row.providerId}</Badge>
                        <Badge tone="success">
                          {row.endpointCount} endpoint{row.endpointCount === 1 ? "" : "s"}
                        </Badge>
                      </div>
                      <div className="border-t border-[var(--rm-border)]">
                        {row.endpoints.map((endpoint) => {
                          const hasRoleDraft = Object.hasOwn(
                            draftRolesByEndpointId,
                            endpoint.endpointId,
                          );
                          const effectiveRoleIds = resolveConfiguredEndpointRoleIds({
                            endpointRoleIds: endpoint.roleIds,
                            draftRoleIds: hasRoleDraft
                              ? draftRolesByEndpointId[endpoint.endpointId]
                              : undefined,
                            availableRoleIds,
                          });
                          const healthTone =
                            endpoint.healthStatus === "healthy"
                              ? "success"
                              : endpoint.healthStatus === "offline"
                                ? "warning"
                                : "neutral";
                          const expanded = expandedEndpointId === endpoint.endpointId;
                          const roleCountLabel =
                            effectiveRoleIds.length === 0
                              ? "0 roles"
                              : `${effectiveRoleIds.length} roles`;
                          return (
                            <div
                              key={endpoint.endpointId}
                              className="space-y-3 border-b border-[var(--rm-border)] px-4 py-3.5 last:border-b-0"
                            >
                              <button
                                type="button"
                                className="flex w-full items-center gap-3 text-left"
                                aria-expanded={expanded}
                                onClick={() => {
                                  setExpandedEndpointId((current) =>
                                    current === endpoint.endpointId ? null : endpoint.endpointId,
                                  );
                                  setDraftRolesByEndpointId((current) => ({
                                    ...current,
                                    [endpoint.endpointId]:
                                      current[endpoint.endpointId] ??
                                      resolveConfiguredEndpointRoleIds({
                                        endpointRoleIds: endpoint.roleIds,
                                        availableRoleIds,
                                      }),
                                  }));
                                }}
                              >
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold leading-5 text-[var(--rm-fg)]">
                                  {endpoint.displayName}
                                </span>
                                <Badge tone={healthTone}>{endpoint.healthStatus}</Badge>
                                {endpoint.circuitLabel ? (
                                  <Badge tone={endpoint.circuitTone}>
                                    {endpoint.circuitLabel}
                                    {endpoint.circuitDetail ? ` · ${endpoint.circuitDetail}` : ""}
                                  </Badge>
                                ) : null}
                                <Badge tone="neutral">{roleCountLabel}</Badge>
                                <svg
                                  aria-hidden
                                  className={`size-4 shrink-0 text-[var(--rm-muted)] transition-transform ${
                                    expanded ? "rotate-180" : ""
                                  }`}
                                  fill="none"
                                  viewBox="0 0 16 16"
                                >
                                  <path
                                    d="M4 6l4 4 4-4"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.5"
                                  />
                                </svg>
                              </button>
                              {expanded ? (
                                <div className="space-y-3">
                                  {availableRoleIds.length > 0 ? (
                                    <LocalModelRolePicker
                                      rolePolicy={rolePolicy}
                                      selectedRoleIds={effectiveRoleIds}
                                      // Explicit drafts: empty means none, not default-all.
                                      defaultAllRoles={false}
                                      expandSelectedGroupsByDefault
                                      onChange={(nextRoleIds) =>
                                        setDraftRolesByEndpointId((current) => ({
                                          ...current,
                                          [endpoint.endpointId]: [...nextRoleIds],
                                        }))
                                      }
                                    />
                                  ) : (
                                    <div className={insetPanelClassName}>
                                      <p className="text-[var(--rm-secondary)]">
                                        No runtime roles are available from the host bridge yet.
                                      </p>
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    className={compactFieldButtonEmphasisClassName}
                                    disabled={
                                      !row.account || savingRolesEndpointId === endpoint.endpointId
                                    }
                                    onClick={() => {
                                      if (!row.account) {
                                        return;
                                      }
                                      const account = row.account;
                                      void (async () => {
                                        setSavingRolesEndpointId(endpoint.endpointId);
                                        setError(null);
                                        try {
                                          const modelIds = [
                                            ...new Set(row.endpoints.map((entry) => entry.modelId)),
                                          ];
                                          const bindingTargets = row.endpoints.map((entry) => ({
                                            modelId: entry.modelId,
                                            endpointId: entry.endpointId,
                                          }));
                                          const selection = Object.fromEntries(
                                            row.endpoints.map((entry) => [
                                              entry.endpointId,
                                              entry.endpointId === endpoint.endpointId
                                                ? (draftRolesByEndpointId[entry.endpointId] ??
                                                  resolveConfiguredEndpointRoleIds({
                                                    endpointRoleIds: entry.roleIds,
                                                    availableRoleIds,
                                                  }))
                                                : resolveConfiguredEndpointRoleIds({
                                                    endpointRoleIds: entry.roleIds,
                                                    draftRoleIds: Object.hasOwn(
                                                      draftRolesByEndpointId,
                                                      entry.endpointId,
                                                    )
                                                      ? draftRolesByEndpointId[entry.endpointId]
                                                      : undefined,
                                                    availableRoleIds,
                                                  }),
                                            ]),
                                          );
                                          await upsertRuntimeAccount({
                                            ...account,
                                            allowedModels: modelIds,
                                            modelRoleBindings: buildModelRoleBindings(
                                              bindingTargets,
                                              selection,
                                              availableRoleIds,
                                            ),
                                          });
                                          await load();
                                          setActionFeedback(
                                            `Saved roles for ${endpoint.displayName}.`,
                                          );
                                        } catch (value) {
                                          setError(
                                            value instanceof Error
                                              ? value.message
                                              : "Could not save model roles.",
                                          );
                                        } finally {
                                          setSavingRolesEndpointId(null);
                                        }
                                      })();
                                    }}
                                  >
                                    {savingRolesEndpointId === endpoint.endpointId
                                      ? "Saving…"
                                      : "Save roles"}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
      {deviceAuthorizationModalSession ? (
        <DeviceAuthorizationModal
          session={deviceAuthorizationModalSession}
          copyCodeLabel={copiedUserCode ? "Copied" : "Copy code"}
          onClose={() => setDeviceAuthorizationModalSession(null)}
          onCopyCode={() => void onCopyUserCode()}
          onOpenVerificationUrl={() => void openVerificationUrl(deviceAuthorizationModalSession)}
        />
      ) : null}
    </>
  );
}
