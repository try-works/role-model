import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
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
  shouldAutoPollDeviceAuthorization,
  syncConnectedDeviceAuthorizationEndpoints,
} from "../lib/device-authorization";
import {
  activateRuntimeEndpoint,
  fetchRuntimeConfig,
  fetchRuntimeSnapshot,
  pollRuntimeDeviceAuthorization,
  startRuntimeDeviceAuthorization,
  updateRuntimeConfig,
  upsertRuntimeAccount,
  type RuntimeConfig,
  type RuntimeConfigModel,
  type RuntimeConfigRecord,
  type RuntimeDeviceAuthorization,
  type RuntimeProvider,
  type RuntimeSnapshot,
} from "../lib/runtime-api";
import { buildAccountModelCatalogIds } from "../lib/view-models";

const inputClass = fieldClassName;
const buttonClass = primaryButtonClassName;

type ModelRoleSelection = Record<string, string[]>;

function defaultVariantId(provider?: RuntimeProvider): string {
  return provider?.variants?.[0]?.variantId ?? "";
}

function slugifyAccountSegment(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
  const byModelId = new Map((bindings ?? []).map((binding) => [binding.modelId, [...binding.roleIds].sort()]));
  return Object.fromEntries(modelIds.map((modelId) => [modelId, byModelId.get(modelId) ?? []]));
}

function buildModelRoleBindings(selectedModels: readonly string[], selection: ModelRoleSelection) {
  return selectedModels.flatMap((modelId) => {
    const roleIds = [...new Set(selection[modelId] ?? [])].sort((left, right) => left.localeCompare(right, "en"));
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

  const variant = input.provider.variants?.find((entry) => entry.variantId === input.variantId) ?? input.provider.variants?.[0];
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
  const [submitting, setSubmitting] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [configRecord, setConfigRecord] = useState<RuntimeConfigRecord | null>(null);
  const [localModels, setLocalModels] = useState<RuntimeConfigModel[]>([]);
  const [savingLocalModels, setSavingLocalModels] = useState(false);

  const applyProviderSelection = useCallback(
    (nextSnapshot: RuntimeSnapshot, requestedProviderId?: string | null, requestedVariantId?: string | null) => {
      const nextProvider =
        nextSnapshot.providers.find((provider) => provider.providerId === requestedProviderId) ?? nextSnapshot.providers[0];
      if (!nextProvider) {
        return;
      }
      const nextVariantId =
        requestedVariantId && nextProvider.variants?.some((variant) => variant.variantId === requestedVariantId)
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
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      const [nextSnapshot, nextConfigRecord] = await Promise.all([
        fetchRuntimeSnapshot(),
        fetchRuntimeConfig(),
      ]);
      setSnapshot(nextSnapshot);
      setConfigRecord(nextConfigRecord);
      setLocalModels(nextConfigRecord.config?.llamaSwap.models.map((model) => ({ ...model })) ?? []);
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

      if (!nextSnapshot.providers.some((provider) => provider.providerId === providerId)) {
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
              window.setTimeout(() => setOauthState(null), 2000);
            }
          }
        })
        .catch((value) => setError(value instanceof Error ? value.message : "Could not refresh provider authorization."))
        .finally(() => setPolling(false));
    }, getDeviceAuthorizationPollDelayMs(pendingOauthState));

    return () => window.clearTimeout(timer);
  }, [load, oauthState, polling, syncConnectedEndpoints]);

  const selectedProvider = useMemo(
    () => snapshot?.providers.find((provider) => provider.providerId === providerId) ?? snapshot?.providers[0],
    [providerId, snapshot],
  );
  const selectedVariant = useMemo(
    () => selectedProvider?.variants?.find((variant) => variant.variantId === variantId) ?? selectedProvider?.variants?.[0],
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
  const availableRoles = snapshot?.roles ?? [];

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading provider catalog…" />;
  }
  if (snapshot.providers.length === 0) {
    return <EmptyState label="No providers are currently available from the runtime catalog." />;
  }

  const onProviderChange = (nextProviderId: string) => {
    applyProviderSelection(snapshot, nextProviderId, null);
  };

  const onVariantChange = (nextVariantId: string) => {
    applyProviderSelection(snapshot, selectedProvider?.providerId ?? providerId, nextVariantId);
  };

  const onModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setSelectedModelRoles((current) =>
      modelId ? { [modelId]: current[modelId] ?? [] } : {},
    );
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
      modelRoleBindings: buildModelRoleBindings(selectedModel ? [selectedModel] : [], selectedModelRoles),
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
      status:
        selectedVariant.authMode === "api-key-static" || oauthState?.status === "connected" ? "active" : "disabled",
      healthStatus:
        selectedVariant.authMode === "api-key-static" || oauthState?.status === "connected"
          ? "healthy"
          : "credentials-missing",
      rotationState:
        selectedVariant.authMode === "api-key-static"
          ? "stable"
          : oauthState?.status === "connected"
            ? "stable"
            : "in-progress",
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
      if (selectedVariant.authMode === "api-key-static") {
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
        modelRoleBindings: buildModelRoleBindings(selectedModel ? [selectedModel] : [], selectedModelRoles),
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
        window.setTimeout(() => setOauthState(null), 2000);
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not refresh provider authorization.");
    } finally {
      setPolling(false);
    }
  };

  const addLocalModel = () => {
    setLocalModels((current) => [
      ...current,
      {
        modelId: "",
        path: "",
        contextWindow: null,
        command: null,
        proxyBaseUrl: null,
        checkEndpoint: null,
        useModelName: null,
      },
    ]);
  };

  const updateLocalModel = (index: number, field: keyof RuntimeConfigModel, value: string | number | null) => {
    setLocalModels((current) =>
      current.map((model, i) =>
        i === index
          ? {
              ...model,
              [field]: value,
            }
          : model,
      ),
    );
  };

  const removeLocalModel = (index: number) => {
    setLocalModels((current) => current.filter((_, i) => i !== index));
  };

  const onSaveLocalModels = async () => {
    if (!configRecord?.config) {
      setError("Runtime config is not loaded yet.");
      return;
    }
    setSavingLocalModels(true);
    setError(null);
    try {
      const validatedModels = localModels.filter((model) => model.modelId.trim().length > 0 && model.path.trim().length > 0);
      const nextConfig: RuntimeConfig = {
        ...configRecord.config,
        llamaSwap: {
          ...configRecord.config.llamaSwap,
          models: validatedModels,
        },
      };
      const result = await updateRuntimeConfig(nextConfig);
      setConfigRecord(result);
      setLocalModels(result.config?.llamaSwap.models.map((model) => ({ ...model })) ?? []);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not save local models.");
    } finally {
      setSavingLocalModels(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Providers"
        title="Provider onboarding"
        description="Choose a provider from the runtime catalog, choose the models available for that provider, and complete either API-key or OAuth setup from one page."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Choose provider and models"
          description="Select the provider, connection method, model set, and role bindings that should flow into the runtime registry."
        >
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Provider</span>
              <select className={inputClass} value={selectedProvider?.providerId ?? ""} onChange={(event) => onProviderChange(event.target.value)}>
                {snapshot.providers.map((provider) => (
                  <option key={provider.providerId} value={provider.providerId}>
                    {provider.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Connection method</span>
              <select className={inputClass} value={selectedVariant?.variantId ?? ""} onChange={(event) => onVariantChange(event.target.value)}>
                {(selectedProvider?.variants ?? []).map((variant) => (
                  <option key={variant.variantId} value={variant.variantId}>
                    {variant.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Provider connection id</span>
              <input className={inputClass} value={providerAccountId} onChange={(event) => setProviderAccountId(event.target.value)} />
            </label>

            {selectedProvider?.providerKind === "local-engine" ? (
              <div className="space-y-4">
                <div className={`${mutedPanelClassName} p-4 text-sm`}>
                  <p className="font-medium text-[var(--rm-fg)]">Local {selectedProvider?.displayName} models</p>
                  <p className="mt-1 text-[var(--rm-secondary)]">
                    Add, edit, or remove locally hosted models. Each model needs a unique model id and a path (GGUF file or model identifier).
                  </p>
                </div>

                {localModels.length === 0 ? (
                  <p className="text-sm text-[var(--rm-secondary)]">No local models configured yet.</p>
                ) : (
                  <div className="space-y-3">
                    {localModels.map((model, index) => (
                      <div key={index} className={`${raisedPanelClassName} space-y-3 p-4 text-sm`}>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-[var(--rm-fg)]">Model {index + 1}</p>
                          <button
                            className="text-[var(--rm-danger)] hover:underline"
                            type="button"
                            onClick={() => removeLocalModel(index)}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="grid gap-1">
                            <span className="text-[var(--rm-secondary)]">Model ID</span>
                            <input
                              className={inputClass}
                              value={model.modelId}
                              onChange={(event) => updateLocalModel(index, "modelId", event.target.value)}
                              placeholder="local/llama-3.3-70b"
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-[var(--rm-secondary)]">Path</span>
                            <input
                              className={inputClass}
                              value={model.path}
                              onChange={(event) => updateLocalModel(index, "path", event.target.value)}
                              placeholder="/path/to/model.gguf"
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-[var(--rm-secondary)]">Context window</span>
                            <input
                              className={inputClass}
                              type="number"
                              value={model.contextWindow ?? ""}
                              onChange={(event) =>
                                updateLocalModel(index, "contextWindow", event.target.value ? Number(event.target.value) : null)
                              }
                              placeholder="128000"
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-[var(--rm-secondary)]">Command override</span>
                            <input
                              className={inputClass}
                              value={model.command ?? ""}
                              onChange={(event) => updateLocalModel(index, "command", event.target.value || null)}
                              placeholder="Optional"
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-[var(--rm-secondary)]">Proxy base URL</span>
                            <input
                              className={inputClass}
                              value={model.proxyBaseUrl ?? ""}
                              onChange={(event) => updateLocalModel(index, "proxyBaseUrl", event.target.value || null)}
                              placeholder="Optional"
                            />
                          </label>
                          <label className="grid gap-1">
                            <span className="text-[var(--rm-secondary)]">Check endpoint</span>
                            <input
                              className={inputClass}
                              value={model.checkEndpoint ?? ""}
                              onChange={(event) => updateLocalModel(index, "checkEndpoint", event.target.value || null)}
                              placeholder="Optional"
                            />
                          </label>
                          <label className="grid gap-1 md:col-span-2">
                            <span className="text-[var(--rm-secondary)]">Use model name</span>
                            <input
                              className={inputClass}
                              value={model.useModelName ?? ""}
                              onChange={(event) => updateLocalModel(index, "useModelName", event.target.value || null)}
                              placeholder="Optional — mapped name for the local engine"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button className={secondaryButtonClassName} type="button" onClick={addLocalModel}>
                    Add model
                  </button>
                  <button
                    className={buttonClass}
                    disabled={savingLocalModels}
                    type="button"
                    onClick={() => void onSaveLocalModels()}
                  >
                    {savingLocalModels ? "Saving…" : "Update local models"}
                  </button>
                  <Link className={secondaryButtonClassName} to="/app/control/runtime-config">
                    Advanced process config
                  </Link>
                </div>
              </div>
            ) : selectedVariant?.authMode === "api-key-static" ? (
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Credential reference</span>
                <input className={inputClass} value={credentialRef} onChange={(event) => setCredentialRef(event.target.value)} />
              </label>
            ) : (
              <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                <p className="font-medium text-[var(--rm-fg)]">Runtime-managed credential reference</p>
                <p className="mt-2">
                  OAuth-backed providers store the resulting token locally and expose only the generated credential reference back to the control plane.
                </p>
              </div>
            )}

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Model</span>
              <select
                className={inputClass}
                value={selectedModel}
                onChange={(event) => onModelSelect(event.target.value)}
              >
                <option value="">Select a model…</option>
                {availableModels.map((modelId) => (
                  <option key={modelId} value={modelId}>
                    {modelId}
                  </option>
                ))}
              </select>
            </label>

            {selectedModel !== "" ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-[var(--rm-fg)]">Model roles</p>
                  <p className="text-[var(--rm-secondary)]">
                    Assign runtime roles to the selected model so the resulting endpoint registry preserves operator intent.
                  </p>
                </div>
                <div className={`${mutedPanelClassName} space-y-3 p-4`}>
                  <div className={`${raisedPanelClassName} space-y-2 p-3`}>
                    <p className="font-medium text-[var(--rm-fg)]">{selectedModel}</p>
                    {availableRoles.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {availableRoles.map((role) => (
                          <label key={`${selectedModel}:${role.roleId}`} className="flex items-center gap-2 rounded-none border border-[var(--rm-border)] px-3 py-1.5">
                            <input
                              checked={(selectedModelRoles[selectedModel] ?? []).includes(role.roleId)}
                              type="checkbox"
                              onChange={() => toggleModelRole(selectedModel, role.roleId)}
                            />
                            <span className="text-[var(--rm-secondary)]">{role.label}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[var(--rm-secondary)]">No runtime roles are available from the host bridge yet.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedVariant ? (
              <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--rm-fg)]">{selectedVariant.label}</p>
                  <StatusPill tone={selectedVariant.availability === "ready" ? "success" : "warning"}>
                    {selectedVariant.availability}
                  </StatusPill>
                  <StatusPill tone="neutral">{selectedVariant.authMode}</StatusPill>
                </div>
                <p className="mt-2">{selectedVariant.description}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <p>
                    <span className="font-medium text-[var(--rm-fg)]">Catalog models:</span> {availableModels.length}
                  </p>
                  <p>
                    <span className="font-medium text-[var(--rm-fg)]">API base:</span> {selectedVariant.baseUrl ?? selectedProvider?.apiBase}
                  </p>
                </div>
                {selectedVariant.oauth ? (
                  <div className={`mt-3 ${raisedPanelClassName} p-3`}>
                    <p className="font-medium text-[var(--rm-fg)]">OAuth metadata</p>
                    <p className="mt-2">
                      <span className="font-medium text-[var(--rm-fg)]">Client id:</span> {selectedVariant.oauth.clientId}
                    </p>
                    <p>
                      <span className="font-medium text-[var(--rm-fg)]">Device endpoint:</span> {selectedVariant.oauth.deviceAuthorizationEndpoint}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              {selectedProvider?.providerKind !== "local-engine" ? (
                <button
                  className={buttonClass}
                  disabled={submitting || !selectedProvider || !selectedVariant || selectedModel === ""}
                  type="submit"
                >
                  {submitting ? "Saving…" : "Save provider"}
                </button>
              ) : null}

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

              <Link className={secondaryButtonClassName} to="/app/control/endpoints">
                Review endpoints
              </Link>
            </div>
          </form>
        </SectionCard>

        <SectionCard
          title="Configured provider connections"
          description="Saved provider connections stay visible here with credential references, model access, and live authorization state."
        >
          <div className="space-y-4">
            {oauthState ? (
              <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--rm-fg)]">Current provider authorization</p>
                  <StatusPill tone={oauthState.status === "connected" ? "success" : oauthState.status === "pending" ? "accent" : "warning"}>
                    {oauthState.status}
                  </StatusPill>
                </div>
                {oauthState.userCode ? (
                  <p className="mt-2">
                    <span className="font-medium text-[var(--rm-fg)]">User code:</span> {oauthState.userCode}
                  </p>
                ) : null}
                {shouldAutoPollDeviceAuthorization(oauthState) ? (
                  <p className="mt-2">
                    The verification page opens in a new tab and this screen keeps checking automatically. Successful completion activates the selected models into the runtime endpoint registry.
                  </p>
                ) : null}
                {oauthState.verificationUriComplete ? (
                  <p className="mt-2 break-all">
                    <span className="font-medium text-[var(--rm-fg)]">Verification URL:</span>{" "}
                    <a className="text-[var(--rm-accent)] underline" href={oauthState.verificationUriComplete} rel="noreferrer" target="_blank">
                      {oauthState.verificationUriComplete}
                    </a>
                  </p>
                ) : null}
              </div>
            ) : null}

            {snapshot.accounts.length === 0 && snapshot.endpoints.filter((e) => e.providerId === "llama-swap").length === 0 ? (
              <EmptyState label="No providers are configured yet. Save one from the setup form to populate the runtime registry." />
            ) : (
              <>
                {snapshot.accounts.map((account) => (
                  <div key={account.providerAccountId} className={`${mutedPanelClassName} p-4`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-[var(--rm-fg)]">{account.providerAccountId}</h3>
                      <StatusPill tone="neutral">{account.providerId}</StatusPill>
                      {account.healthStatus ? (
                        <StatusPill tone={account.healthStatus === "healthy" ? "success" : "warning"}>
                          {account.healthStatus}
                        </StatusPill>
                      ) : null}
                    </div>
                    <div className="mt-3 grid gap-1 text-sm text-[var(--rm-secondary)]">
                      <p>
                        <span className="font-medium text-[var(--rm-fg)]">Connection method:</span> {account.authMode}
                      </p>
                      <p>
                        <span className="font-medium text-[var(--rm-fg)]">Credential ref:</span>{" "}
                        {account.credentialRef ? `${account.credentialRef.backend}:${account.credentialRef.ref}` : "Not set"}
                      </p>
                      <p>
                        <span className="font-medium text-[var(--rm-fg)]">Base URL:</span>{" "}
                        {account.baseUrlOverride ?? "Provider default"}
                      </p>
                      <p>
                        <span className="font-medium text-[var(--rm-fg)]">Status:</span> {account.status ?? "unknown"}
                      </p>
                    </div>
                    {account.allowedModels?.length ? (
                      <div className="mt-3 space-y-3">
                        {account.allowedModels.map((modelId) => {
                          const roleIds =
                            account.modelRoleBindings?.find((binding) => binding.modelId === modelId)?.roleIds ?? [];
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
                                  <span className="text-sm text-[var(--rm-secondary)]">No roles assigned</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ))}
                {snapshot.endpoints
                  .filter((endpoint) => endpoint.providerId === "llama-swap")
                  .map((endpoint) => (
                    <div key={endpoint.endpointId} className={`${mutedPanelClassName} p-4`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-[var(--rm-fg)]">{endpoint.endpointId}</h3>
                        <StatusPill tone="neutral">llama-swap</StatusPill>
                        <StatusPill tone={endpoint.healthStatus === "healthy" ? "success" : "warning"}>
                          {endpoint.healthStatus ?? "unknown"}
                        </StatusPill>
                      </div>
                      <div className="mt-3 grid gap-1 text-sm text-[var(--rm-secondary)]">
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">Model:</span> {endpoint.modelId}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">Source:</span>{" "}
                          {endpoint.sourceType ?? "local"} / {endpoint.endpointKind ?? "local-engine"}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">Serving source:</span> {endpoint.servingSource ?? "vendor-llama-swap"}
                        </p>
                        <p>
                          <span className="font-medium text-[var(--rm-fg)]">Status:</span> {endpoint.status ?? "unknown"}
                        </p>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
