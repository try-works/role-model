import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import { ThemedSelect } from "../components/themed-select";
import {
  fieldClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  raisedPanelClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import {
  getDeviceAuthorizationPollDelayMs,
  resolveVerificationWindowUrl,
  restorePersistedDeviceAuthorization,
  shouldAutoPollDeviceAuthorization,
  syncConnectedDeviceAuthorizationEndpoints,
} from "../lib/device-authorization";
import { resolveProviderAccountLifecycle } from "../lib/provider-account-state";
import {
  type RuntimeAccount,
  type RuntimeDeviceAuthorization,
  type RuntimeProvider,
  type RuntimeSnapshot,
  activateRuntimeEndpoint,
  fetchRuntimeSnapshot,
  pollRuntimeDeviceAuthorization,
  reconnectRuntimeAccount,
  startRuntimeDeviceAuthorization,
  updateRuntimeAccountApiKey,
  upsertRuntimeAccount,
} from "../lib/runtime-api";
import {
  buildAccountModelCatalogIds,
  buildArchivedArtifactRows,
  buildProviderMaintenanceRows,
} from "../lib/view-models";

const inputClass = fieldClassName;
const buttonClass = primaryButtonClassName;

type ModelRoleSelection = Record<string, string[]>;

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

function buildModelRoleSelection(
  modelIds: readonly string[],
  bindings?: readonly {
    readonly modelId: string;
    readonly roleIds: readonly string[];
  }[],
): ModelRoleSelection {
  const byModelId = new Map(
    (bindings ?? []).map((binding) => [binding.modelId, [...binding.roleIds].sort()]),
  );
  return Object.fromEntries(modelIds.map((modelId) => [modelId, byModelId.get(modelId) ?? []]));
}

function buildModelRoleBindings(selectedModels: readonly string[], selection: ModelRoleSelection) {
  return selectedModels.flatMap((modelId) => {
    const roleIds = [...new Set(selection[modelId] ?? [])].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
    return roleIds.length > 0 ? [{ modelId, roleIds }] : [];
  });
}

function buildAvailableModels(input: {
  readonly snapshot: RuntimeSnapshot;
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

export default function ProvidersRoute() {
  const [searchParams] = useSearchParams();
  const initializedRef = useRef(false);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providerAccountId, setProviderAccountId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [credentialRef, setCredentialRef] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedModelRoles, setSelectedModelRoles] = useState<ModelRoleSelection>({});
  const [oauthState, setOauthState] = useState<RuntimeDeviceAuthorization | null>(null);
  const [oauthConnected, setOauthConnected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [apiKeyModalAccount, setApiKeyModalAccount] = useState<RuntimeAccount | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [savingApiKey, setSavingApiKey] = useState(false);

  const applyProviderSelection = useCallback(
    (
      nextSnapshot: RuntimeSnapshot,
      requestedProviderId?: string | null,
      requestedVariantId?: string | null,
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

      setProviderId(nextProvider.providerId);
      setVariantId(nextVariantId);
      setProviderAccountId(defaultProviderAccountId(nextProvider.providerId, nextVariantId));
      setCredentialRef(defaultCredentialRef(nextProvider));
      setSelectedModel("");
      setSelectedModelRoles({});
      setOauthState(null);
      setOauthConnected(false);
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      const nextSnapshot = await fetchRuntimeSnapshot();
      setSnapshot(nextSnapshot);
      setError(null);

      if (!initializedRef.current) {
        applyProviderSelection(
          nextSnapshot,
          searchParams.get("providerId"),
          searchParams.get("variantId"),
        );
        initializedRef.current = true;
        return;
      }

      if (
        !nextSnapshot.providers
          .filter((provider) => provider.providerKind !== "local-engine")
          .some((provider) => provider.providerId === providerId)
      ) {
        applyProviderSelection(nextSnapshot, null, null);
      }
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : "Could not load providers.");
    }
  }, [applyProviderSelection, providerId, searchParams]);

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

  useEffect(() => {
    void load();
  }, [load]);

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

    setOauthState((current) =>
      restorePersistedDeviceAuthorization({
        current,
        providerAccountId,
        persistedSessions: snapshot.deviceAuthorizations,
      }),
    );
  }, [providerAccountId, snapshot]);

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
  const availableRoles = snapshot?.roles ?? [];
  const providerOptions = useMemo(
    () =>
      remoteProviders.map((provider) => ({
        value: provider.providerId,
        label: provider.displayName,
      })),
    [remoteProviders],
  );
  const variantOptions = useMemo(
    () =>
      (selectedProvider?.variants ?? []).map((variant) => ({
        value: variant.variantId,
        label: variant.label,
        description: variant.description,
      })),
    [selectedProvider],
  );
  const modelOptions = useMemo(
    () => availableModels.map((modelId) => ({ value: modelId, label: modelId })),
    [availableModels],
  );
  const providerMaintenanceRows = useMemo(
    () =>
      snapshot
        ? buildProviderMaintenanceRows({
            accounts: snapshot.accounts,
            summary: snapshot.summary,
          })
        : [],
    [snapshot],
  );
  const archivedArtifactRows = useMemo(
    () => (snapshot ? buildArchivedArtifactRows(snapshot.summary) : []),
    [snapshot],
  );

  const onReconnectAccount = async (account: RuntimeAccount) => {
    const provider = remoteProviders.find((entry) => entry.providerId === account.providerId);
    if (!provider) {
      setError(`Could not locate provider ${account.providerId} for reconnect.`);
      return;
    }
    const variant =
      provider.variants?.find(
        (entry) =>
          entry.authMode === account.authMode &&
          (account.baseUrlOverride
            ? (entry.baseUrl ?? provider.apiBase) === account.baseUrlOverride
            : true),
      ) ??
      provider.variants?.find((entry) => entry.authMode === account.authMode) ??
      provider.variants?.[0];
    if (!variant) {
      setError(`Could not locate a reconnect variant for ${account.providerAccountId}.`);
      return;
    }

    const restoredModelIds = [...(account.allowedModels ?? [])];
    setProviderId(provider.providerId);
    setVariantId(variant.variantId);
    setProviderAccountId(account.providerAccountId);
    setCredentialRef(defaultCredentialRef(provider));
    setSelectedModel(restoredModelIds[0] ?? "");
    setSelectedModelRoles(buildModelRoleSelection(restoredModelIds, account.modelRoleBindings));
    setOauthConnected(false);
    setAuthorizing(true);
    setError(null);
    try {
      const result = await reconnectRuntimeAccount({
        providerAccountId: account.providerAccountId,
      });
      setOauthState(result);
      const verificationUrl = resolveVerificationWindowUrl(result);
      if (verificationUrl) {
        try {
          window.open(verificationUrl, "_blank", "noopener,noreferrer");
        } catch {
          // Keep the inline verification link visible as the fallback path.
        }
      }
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not start provider reconnect.");
    } finally {
      setAuthorizing(false);
    }
  };

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
    applyProviderSelection(snapshot, nextProviderId, null);
  };

  const onVariantChange = (nextVariantId: string) => {
    applyProviderSelection(snapshot, selectedProvider?.providerId ?? providerId, nextVariantId);
  };

  const onModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setSelectedModelRoles((current) => (modelId ? { [modelId]: current[modelId] ?? [] } : {}));
  };

  const toggleModelRole = (modelId: string, roleId: string) => {
    setSelectedModelRoles((current) => {
      const currentRoles = current[modelId] ?? [];
      const nextRoles = currentRoles.includes(roleId)
        ? currentRoles.filter((entry) => entry !== roleId)
        : [...currentRoles, roleId];
      return {
        ...current,
        [modelId]: nextRoles.sort((left, right) => left.localeCompare(right, "en")),
      };
    });
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
    try {
      await upsertRuntimeAccount(buildProviderPayload());
      if (selectedVariant.authMode === "api-key-static" || oauthConnected) {
        await activateRuntimeEndpoint({
          providerAccountId,
          modelId: selectedModel,
          region: "global",
        });
      }
      await load();
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
        ),
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });
      setOauthState(result);
      const verificationUrl = resolveVerificationWindowUrl(result);
      if (verificationUrl) {
        try {
          window.open(verificationUrl, "_blank", "noopener,noreferrer");
        } catch {
          // Keep the inline verification link visible as the fallback path.
        }
      }
      await load();
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

  const onSaveApiKey = async () => {
    if (!apiKeyModalAccount) {
      return;
    }
    if (apiKeyDraft.trim().length === 0) {
      setApiKeyError("Enter an API key before saving this credential.");
      return;
    }

    setSavingApiKey(true);
    setApiKeyError(null);
    setError(null);
    try {
      await updateRuntimeAccountApiKey({
        providerAccountId: apiKeyModalAccount.providerAccountId,
        apiKey: apiKeyDraft.trim(),
      });
      const modelId = apiKeyModalAccount.allowedModels?.[0];
      if (modelId) {
        await activateRuntimeEndpoint({
          providerAccountId: apiKeyModalAccount.providerAccountId,
          modelId,
          region: "global",
        });
      }
      await load();
      setApiKeyModalAccount(null);
      setApiKeyDraft("");
    } catch (value) {
      setApiKeyError(value instanceof Error ? value.message : "Could not update API key.");
    } finally {
      setSavingApiKey(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard
            title="Choose provider and models"
            description="Select the provider, connection method, model set, and role bindings that should flow into the runtime registry."
          >
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]" id="providers-provider-label">
                  Provider
                </span>
                <ThemedSelect
                  ariaLabelledBy="providers-provider-label"
                  options={providerOptions}
                  value={selectedProvider?.providerId ?? ""}
                  onChange={onProviderChange}
                />
              </div>

              <div className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]" id="providers-variant-label">
                  Connection method
                </span>
                <ThemedSelect
                  ariaLabelledBy="providers-variant-label"
                  options={variantOptions}
                  value={selectedVariant?.variantId ?? ""}
                  onChange={onVariantChange}
                />
              </div>

              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Provider connection id</span>
                <input
                  className={inputClass}
                  value={providerAccountId}
                  onChange={(event) => setProviderAccountId(event.target.value)}
                />
              </label>

              {selectedVariant?.authMode === "api-key-static" ? (
                <label className="grid gap-2 text-sm">
                  <span className="font-medium text-[var(--rm-fg)]">Credential reference</span>
                  <input
                    className={inputClass}
                    value={credentialRef}
                    onChange={(event) => setCredentialRef(event.target.value)}
                  />
                </label>
              ) : (
                <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                  <p className="font-medium text-[var(--rm-fg)]">
                    Runtime-managed credential reference
                  </p>
                  <p className="mt-2">
                    OAuth-backed providers store the resulting token locally and expose only the
                    generated credential reference back to the control plane.
                  </p>
                </div>
              )}

              <div className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]" id="providers-model-label">
                  Model
                </span>
                <ThemedSelect
                  ariaLabelledBy="providers-model-label"
                  options={modelOptions}
                  placeholder="Select a model…"
                  value={selectedModel}
                  onChange={onModelSelect}
                />
              </div>

              {selectedModel !== "" ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-[var(--rm-fg)]">Model roles</p>
                    <p className="text-[var(--rm-secondary)]">
                      Assign runtime roles to the selected model so the resulting endpoint registry
                      preserves operator intent.
                    </p>
                  </div>
                  <div className={`${mutedPanelClassName} space-y-3 p-4`}>
                    <div className={`${raisedPanelClassName} space-y-2 p-3`}>
                      <p className="font-medium text-[var(--rm-fg)]">{selectedModel}</p>
                      {availableRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                          {availableRoles.map((role) => (
                            <label
                              key={`${selectedModel}:${role.roleId}`}
                              className="flex items-center gap-2 rounded-[var(--rm-radius-field)] border border-[var(--rm-border)] bg-[var(--rm-surface)] px-3 py-2"
                            >
                              <input
                                checked={(selectedModelRoles[selectedModel] ?? []).includes(
                                  role.roleId,
                                )}
                                type="checkbox"
                                onChange={() => toggleModelRole(selectedModel, role.roleId)}
                              />
                              <span className="text-[var(--rm-secondary)]">{role.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[var(--rm-secondary)]">
                          No runtime roles are available from the host bridge yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {selectedVariant ? (
                <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--rm-fg)]">{selectedVariant.label}</p>
                    <StatusPill
                      tone={selectedVariant.availability === "ready" ? "success" : "warning"}
                    >
                      {selectedVariant.availability}
                    </StatusPill>
                    <StatusPill tone="neutral">{selectedVariant.authMode}</StatusPill>
                  </div>
                  <p className="mt-2">{selectedVariant.description}</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <p>
                      <span className="font-medium text-[var(--rm-fg)]">Catalog models:</span>{" "}
                      {availableModels.length}
                    </p>
                    <p>
                      <span className="font-medium text-[var(--rm-fg)]">API base:</span>{" "}
                      {selectedVariant.baseUrl ?? selectedProvider?.apiBase}
                    </p>
                    <p>
                      <span className="font-medium text-[var(--rm-fg)]">SDK package:</span>{" "}
                      {selectedProvider?.npmPackage ?? "Not cataloged"}
                    </p>
                    <p>
                      <span className="font-medium text-[var(--rm-fg)]">Docs:</span>{" "}
                      {selectedProvider?.docsUrl ? (
                        <a
                          className="underline decoration-[var(--rm-border-strong)] underline-offset-4"
                          href={selectedProvider.docsUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {selectedProvider.docsUrl}
                        </a>
                      ) : (
                        "Not cataloged"
                      )}
                    </p>
                  </div>
                  {selectedVariant.oauth ? (
                    <div className={`mt-3 ${raisedPanelClassName} p-3`}>
                      <p className="font-medium text-[var(--rm-fg)]">OAuth metadata</p>
                      <p className="mt-2">
                        <span className="font-medium text-[var(--rm-fg)]">Client id:</span>{" "}
                        {selectedVariant.oauth.clientId}
                      </p>
                      <p>
                        <span className="font-medium text-[var(--rm-fg)]">Device endpoint:</span>{" "}
                        {selectedVariant.oauth.deviceAuthorizationEndpoint}
                      </p>
                    </div>
                  ) : null}
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

                <Link className={secondaryButtonClassName} to="/app/connect">
                  View in Connect registry
                </Link>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Configured provider connections"
            description="Saved provider connections stay visible here with canonical lifecycle badges, normalized credential posture, model access, and live repair state."
          >
            <div className="space-y-4">
              {oauthState ? (
                <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[var(--rm-fg)]">
                      Current provider authorization
                    </p>
                    <StatusPill
                      tone={
                        oauthState.status === "connected"
                          ? "success"
                          : oauthState.status === "pending"
                            ? "accent"
                            : "warning"
                      }
                    >
                      {oauthState.status}
                    </StatusPill>
                  </div>
                  {oauthState.userCode ? (
                    <p className="mt-2">
                      <span className="font-medium text-[var(--rm-fg)]">User code:</span>{" "}
                      {oauthState.userCode}
                    </p>
                  ) : null}
                  {shouldAutoPollDeviceAuthorization(oauthState) ? (
                    <p className="mt-2">
                      The verification page opens in a new tab and this screen keeps checking
                      automatically. Successful completion activates the selected models into the
                      runtime endpoint registry.
                    </p>
                  ) : null}
                  {oauthState.verificationUriComplete ? (
                    <p className="mt-2 break-all">
                      <span className="font-medium text-[var(--rm-fg)]">Verification URL:</span>{" "}
                      <a
                        className="text-[var(--rm-accent)] underline"
                        href={oauthState.verificationUriComplete}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {oauthState.verificationUriComplete}
                      </a>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {providerMaintenanceRows.length === 0 ? (
                <EmptyState label="No providers are configured yet. Save one from the setup form to populate the runtime registry." />
              ) : (
                <>
                  {providerMaintenanceRows.map((row) => (
                    <div key={row.providerAccountId} className={`${mutedPanelClassName} p-4`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-[var(--rm-fg)]">{row.providerAccountId}</h3>
                        <StatusPill tone="neutral">{row.providerId}</StatusPill>
                        <StatusPill tone={row.lifecycleTone}>{row.lifecycleLabel}</StatusPill>
                        <StatusPill tone="neutral">{row.storageLabel}</StatusPill>
                      </div>
                      <div className="mt-3 grid gap-1 text-sm text-[var(--rm-secondary)]">
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">
                            Connection method:
                          </span>{" "}
                          {row.authMode}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">
                            Credential posture:
                          </span>{" "}
                          {row.storageDetail}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">Base URL:</span>{" "}
                          {row.baseUrlOverride ?? "Provider default"}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">Lifecycle reason:</span>{" "}
                          {row.reasonLabel}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">
                            Source provenance:
                          </span>{" "}
                          {row.sourceProvenanceLabel}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">
                            Available actions:
                          </span>{" "}
                          {row.availableActionsLabel}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">Active endpoints:</span>{" "}
                          {row.activeEndpointCount}
                        </p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {(() => {
                          const account = row.account;
                          if (!account) {
                            return null;
                          }
                          return (
                            <>
                              {row.availableActions.includes("reconnect") ? (
                                <button
                                  className={secondaryButtonClassName}
                                  disabled={authorizing}
                                  type="button"
                                  onClick={() => void onReconnectAccount(account)}
                                >
                                  Reconnect
                                </button>
                              ) : null}
                              {row.availableActions.includes("update-api-key") ? (
                                <button
                                  className={secondaryButtonClassName}
                                  type="button"
                                  onClick={() => {
                                    setApiKeyModalAccount(account);
                                    setApiKeyDraft("");
                                    setApiKeyError(null);
                                  }}
                                >
                                  Update API key
                                </button>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                      {row.allowedModels.length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {row.allowedModels.map((modelId) => {
                            const roleIds =
                              row.modelRoleBindings.find((binding) => binding.modelId === modelId)
                                ?.roleIds ?? [];
                            return (
                              <div key={modelId} className={`${raisedPanelClassName} p-3`}>
                                <div className="flex flex-wrap items-center gap-2">
                                  <StatusPill tone="accent">{modelId}</StatusPill>
                                  {roleIds.length > 0 ? (
                                    roleIds.map((roleId) => (
                                      <StatusPill key={`${modelId}:${roleId}`} tone="neutral">
                                        {roleId}
                                      </StatusPill>
                                    ))
                                  ) : (
                                    <span className="text-sm text-[var(--rm-secondary)]">
                                      No roles assigned
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {archivedArtifactRows.length > 0 ? (
                    <div className={`${mutedPanelClassName} p-4`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-[var(--rm-fg)]">
                          Archived stale diagnostics
                        </h3>
                        <StatusPill tone="neutral">{archivedArtifactRows.length}</StatusPill>
                      </div>
                      <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                        Archived stale artifacts stay separate from active saved-account blockers.
                      </p>
                      <div className="mt-3 space-y-3">
                        {archivedArtifactRows.map((artifact) => (
                          <div key={artifact.key} className={`${raisedPanelClassName} p-3`}>
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusPill tone="neutral">{artifact.providerId}</StatusPill>
                              <StatusPill tone="warning">{artifact.label}</StatusPill>
                            </div>
                            <p className="mt-2 text-sm text-[var(--rm-secondary)]">
                              <span className="font-medium text-[var(--rm-fg)]">Account:</span>{" "}
                              {artifact.providerAccountId}
                            </p>
                            <p className="text-sm text-[var(--rm-secondary)]">{artifact.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
      {apiKeyModalAccount ? (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4" role="presentation">
          <button
            aria-label="Close API key update modal"
            className="absolute inset-0 bg-[var(--rm-accent-ghost)] backdrop-blur-[1px]"
            type="button"
            onClick={() => {
              if (savingApiKey) {
                return;
              }
              setApiKeyModalAccount(null);
              setApiKeyDraft("");
              setApiKeyError(null);
            }}
          />
          <dialog
            open
            aria-modal="true"
            className="relative mx-auto max-w-2xl rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-6 shadow-[var(--rm-shadow-card)]"
            aria-labelledby="provider-api-key-modal-title"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
                  Saved provider maintenance
                </p>
                <h2
                  id="provider-api-key-modal-title"
                  className="mt-2 text-2xl font-light tracking-tight text-[var(--rm-fg)]"
                >
                  Update API key
                </h2>
                <p className="mt-2 max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)]">
                  Enter a replacement API key for{" "}
                  <span className="font-medium text-[var(--rm-fg)]">
                    {apiKeyModalAccount.providerAccountId}
                  </span>
                  . The key is saved into runtime-managed local credential storage after this dialog
                  submits successfully.
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">API key</span>
                <input
                  className={inputClass}
                  type="password"
                  value={apiKeyDraft}
                  onChange={(event) => setApiKeyDraft(event.target.value)}
                />
              </label>
              {apiKeyError ? (
                <ErrorState label={apiKeyError} />
              ) : (
                <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                  The existing saved-account identity, model bindings, and endpoint linkage stay in
                  place while the API key rotates.
                </div>
              )}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className={buttonClass}
                disabled={savingApiKey}
                type="button"
                onClick={() => void onSaveApiKey()}
              >
                {savingApiKey ? "Saving…" : "Save"}
              </button>
              <button
                className={secondaryButtonClassName}
                disabled={savingApiKey}
                type="button"
                onClick={() => {
                  setApiKeyModalAccount(null);
                  setApiKeyDraft("");
                  setApiKeyError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </dialog>
        </div>
      ) : null}
    </>
  );
}
