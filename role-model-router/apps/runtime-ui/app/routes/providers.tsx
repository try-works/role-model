import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";

import { DeviceAuthorizationCard } from "../components/device-authorization-card";
import { DeviceAuthorizationModal } from "../components/device-authorization-modal";
import { LocalModelRolePicker } from "../components/local-model-role-picker";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
  StatusPill,
} from "../components/page-primitives";
import {
  fieldClassName,
  foregroundEmphasisClassName,
  insetPanelClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  raisedPanelClassName,
  secondaryButtonClassName,
  supportingTextClassName,
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
import { resolveProviderAccountLifecycle } from "../lib/provider-account-state";
import {
  type ProvidersSnapshot,
  type RuntimeAccount,
  type RuntimeDeviceAuthorization,
  type RuntimeProvider,
  type RuntimeRolePolicy,
  activateRuntimeEndpoint,
  fetchProvidersSnapshot,
  fetchRecentRequestIds,
  fetchRolePolicy,
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
const buttonClass = primaryButtonClassName;

type ModelRoleSelection = Record<string, string[]>;

type ProviderModelRoleCoverageSummary = {
  readonly totalSelectedCount: number;
  readonly totalRoleCount: number;
  readonly allRolesSelected: boolean;
  readonly groupPreviewLabels: readonly string[];
  readonly hiddenGroupCount: number;
};

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
  selectedModels: readonly string[],
  selection: ModelRoleSelection,
  allRoleIds: readonly string[],
) {
  return selectedModels.map((modelId) => {
    const roleIds = [...new Set(selection[modelId] ?? [])].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
    const assignment =
      allRoleIds.length > 0 && roleIds.length === allRoleIds.length
        ? { roleAssignmentMode: "all" as const, enabledRoleIds: [], disabledRoleIds: [] }
        : roleIdsToExplicitAssignment(roleIds, false);
    return {
      modelId,
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
  const [snapshot, setSnapshot] = useState<ProvidersSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [providerAccountId, setProviderAccountId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [credentialRef, setCredentialRef] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
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
        await activateRuntimeEndpoint({
          providerAccountId,
          modelId: selectedModel,
          region: "global",
        });
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
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard
            title="Choose provider and models"
            description="Select the provider, connection method, and model. New models default to all roles selected."
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

              <label className="grid gap-2 text-sm">
                <span className={foregroundEmphasisClassName}>Provider connection id</span>
                <input
                  className={inputClass}
                  value={providerAccountId}
                  onChange={(event) => setProviderAccountId(event.target.value)}
                />
              </label>

              {selectedVariant?.authMode === "api-key-static" ? (
                <label className="grid gap-2 text-sm">
                  <span className={foregroundEmphasisClassName}>Credential reference</span>
                  <input
                    className={inputClass}
                    value={credentialRef}
                    onChange={(event) => setCredentialRef(event.target.value)}
                  />
                </label>
              ) : (
                <div className={insetPanelClassName}>
                  <p className={foregroundEmphasisClassName}>
                    Runtime-managed credential reference
                  </p>
                  <p className="mt-2">
                    OAuth-backed providers store the resulting token locally and expose only the
                    generated credential reference back to the control plane.
                  </p>
                </div>
              )}

              <SelectField label="Model" value={selectedModel} onChange={onModelSelect}>
                <option value="">Select a model…</option>
                {availableModels.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </SelectField>

              {selectedVariant?.oauth ? (
                <div className={`${raisedPanelClassName} p-3`}>
                  <p className={foregroundEmphasisClassName}>OAuth metadata</p>
                  <p className="mt-2">
                    <span className={foregroundEmphasisClassName}>Client id:</span>{" "}
                    {selectedVariant.oauth.clientId}
                  </p>
                  <p>
                    <span className={foregroundEmphasisClassName}>Device endpoint:</span>{" "}
                    {selectedVariant.oauth.deviceAuthorizationEndpoint}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  className={buttonClass}
                  disabled={
                    submitting || !selectedProvider || !selectedVariant || selectedModel === ""
                  }
                  type="submit"
                >
                  {submitting ? "Saving…" : "Save provider"}
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
                <output className="rounded-[var(--rm-radius-field)] border border-[var(--rm-pill-success-bg)] bg-[var(--rm-pill-success-bg)] px-4 py-3 text-sm text-[var(--rm-pill-success-ink)]">
                  {actionFeedback}
                </output>
              ) : null}
            </form>
          </SectionCard>

          <SectionCard
            title="Configured provider connections"
            description="Endpoints stay grouped by account. Expand a model’s roles control to edit bindings."
          >
            <div className="space-y-4">
              {configuredRemoteConnectionRows.length === 0 ? (
                <EmptyState label="No remote endpoints are configured yet. Activate a remote model to populate this pane." />
              ) : (
                <>
                  {configuredRemoteConnectionRows.map((row) => (
                    <div
                      key={row.providerAccountId}
                      className={`${mutedPanelClassName} p-4`}
                      data-testid={`provider-connection-${row.providerAccountId}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={foregroundEmphasisClassName}>{row.providerAccountId}</h3>
                        <StatusPill tone="neutral">{row.providerId}</StatusPill>
                        <StatusPill tone="success">
                          {row.endpointCount} endpoint{row.endpointCount === 1 ? "" : "s"}
                        </StatusPill>
                      </div>
                      <div className="mt-3 space-y-3">
                        {row.endpoints.map((endpoint) => {
                          const effectiveRoleIds =
                            draftRolesByEndpointId[endpoint.endpointId] ?? [...endpoint.roleIds];
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
                              className={`${raisedPanelClassName} p-3`}
                            >
                              <button
                                type="button"
                                className="flex w-full flex-wrap items-center gap-2 text-left"
                                aria-expanded={expanded}
                                onClick={() => {
                                  setExpandedEndpointId((current) =>
                                    current === endpoint.endpointId ? null : endpoint.endpointId,
                                  );
                                  setDraftRolesByEndpointId((current) => ({
                                    ...current,
                                    [endpoint.endpointId]:
                                      current[endpoint.endpointId] ?? [...endpoint.roleIds],
                                  }));
                                }}
                              >
                                <span className={foregroundEmphasisClassName}>
                                  {endpoint.displayName}
                                </span>
                                <StatusPill tone={healthTone}>{endpoint.healthStatus}</StatusPill>
                                <StatusPill tone="neutral">{roleCountLabel}</StatusPill>
                                <span className={`ml-auto ${supportingTextClassName}`}>
                                  {expanded ? "Hide roles" : "Edit roles"}
                                </span>
                              </button>
                              {expanded ? (
                                <div className="mt-3 space-y-3">
                                  {availableRoleIds.length > 0 ? (
                                    <LocalModelRolePicker
                                      rolePolicy={rolePolicy}
                                      selectedRoleIds={effectiveRoleIds}
                                      expandSelectedGroupsByDefault={false}
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
                                    className={primaryButtonClassName}
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
                                          const modelIds = row.endpoints.map(
                                            (entry) => entry.modelId,
                                          );
                                          const selection = Object.fromEntries(
                                            row.endpoints.map((entry) => [
                                              entry.modelId,
                                              entry.endpointId === endpoint.endpointId
                                                ? (draftRolesByEndpointId[entry.endpointId] ?? [
                                                    ...entry.roleIds,
                                                  ])
                                                : [...entry.roleIds],
                                            ]),
                                          );
                                          await upsertRuntimeAccount({
                                            ...account,
                                            allowedModels: modelIds,
                                            modelRoleBindings: buildModelRoleBindings(
                                              modelIds,
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
