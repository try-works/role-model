import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { ErrorState, LoadingState, PageHeader, SectionCard, StatusPill } from "../components/page-primitives";
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
} from "../lib/device-authorization";
import {
  fetchRuntimeSnapshot,
  pollRuntimeDeviceAuthorization,
  startRuntimeDeviceAuthorization,
  upsertRuntimeAccount,
  type RuntimeProvider,
  type RuntimeSnapshot,
  type RuntimeDeviceAuthorization,
} from "../lib/runtime-api";

const inputClass = fieldClassName;
const buttonClass = primaryButtonClassName;

type ModelRoleSelection = Record<string, string[]>;

function defaultVariantId(provider?: RuntimeProvider): string {
  return provider?.variants?.[0]?.variantId ?? "";
}

function defaultAccountId(variantId: string): string {
  return variantId === "kimi-code" ? "moonshot.personal.kimi-code" : "moonshot.personal.primary";
}

function resolveModelSelection(provider?: RuntimeProvider, variantId?: string): string[] {
  const variant = provider?.variants?.find((entry) => entry.variantId === variantId) ?? provider?.variants?.[0];
  return [...(variant?.modelIds ?? provider?.modelIds ?? [])];
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

export default function AccountsRoute() {
  const [searchParams] = useSearchParams();
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState("moonshot.personal.primary");
  const [providerId, setProviderId] = useState("moonshotai");
  const [variantId, setVariantId] = useState("moonshot-open-platform");
  const [credentialRef, setCredentialRef] = useState("MOONSHOT_API_KEY");
  const [selectedModels, setSelectedModels] = useState<string[]>(["moonshotai/kimi-k2.5"]);
  const [selectedModelRoles, setSelectedModelRoles] = useState<ModelRoleSelection>({
    "moonshotai/kimi-k2.5": [],
  });
  const [oauthState, setOauthState] = useState<RuntimeDeviceAuthorization | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [polling, setPolling] = useState(false);

  const load = useCallback(
    () =>
    fetchRuntimeSnapshot()
      .then((nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setError(null);
      })
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load accounts.")),
    [],
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
            await load();
          }
        })
        .catch((value) => setError(value instanceof Error ? value.message : "Could not refresh device authorization."))
        .finally(() => setPolling(false));
    }, getDeviceAuthorizationPollDelayMs(pendingOauthState));

    return () => window.clearTimeout(timer);
  }, [load, oauthState, polling]);

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    const queryProviderId = searchParams.get("providerId");
    const queryVariantId = searchParams.get("variantId");
    const nextProvider = snapshot.providers.find((provider) => provider.providerId === queryProviderId);
    if (nextProvider) {
      setProviderId(nextProvider.providerId);
      const nextVariantId = queryVariantId && nextProvider.variants?.some((variant) => variant.variantId === queryVariantId)
        ? queryVariantId
        : defaultVariantId(nextProvider);
      const nextModels = resolveModelSelection(nextProvider, nextVariantId);
      setVariantId(nextVariantId);
      setAccountId(defaultAccountId(nextVariantId));
      setSelectedModels(nextModels);
      setSelectedModelRoles(buildModelRoleSelection(nextModels));
      if (nextVariantId === "moonshot-open-platform") {
        setCredentialRef("MOONSHOT_API_KEY");
      }
    }
  }, [searchParams, snapshot]);

  const selectedProvider = useMemo(
    () => snapshot?.providers.find((provider) => provider.providerId === providerId),
    [providerId, snapshot],
  );
  const selectedVariant = useMemo(
    () => selectedProvider?.variants?.find((variant) => variant.variantId === variantId) ?? selectedProvider?.variants?.[0],
    [selectedProvider, variantId],
  );
  const availableModels = useMemo(
    () => resolveModelSelection(selectedProvider, selectedVariant?.variantId),
    [selectedProvider, selectedVariant],
  );
  const availableRoles = snapshot?.roles ?? [];

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!snapshot) {
    return <LoadingState label="Loading account registry…" />;
  }

  const onProviderChange = (nextProviderId: string) => {
    const nextProvider = snapshot.providers.find((provider) => provider.providerId === nextProviderId);
    const nextVariantId = defaultVariantId(nextProvider);
    const nextModels = resolveModelSelection(nextProvider, nextVariantId);
    setProviderId(nextProviderId);
    setVariantId(nextVariantId);
    setAccountId(defaultAccountId(nextVariantId));
    setSelectedModels(nextModels);
    setSelectedModelRoles(buildModelRoleSelection(nextModels));
    setOauthState(null);
  };

  const onVariantChange = (nextVariantId: string) => {
    const nextModels = resolveModelSelection(selectedProvider, nextVariantId);
    setVariantId(nextVariantId);
    setAccountId(defaultAccountId(nextVariantId));
    setSelectedModels(nextModels);
    setSelectedModelRoles(buildModelRoleSelection(nextModels));
    setOauthState(null);
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels((current) => {
      const nextModels = current.includes(modelId)
        ? current.filter((entry) => entry !== modelId)
        : [...current, modelId];
      setSelectedModelRoles((currentSelection) =>
        buildModelRoleSelection(nextModels, buildModelRoleBindings(Object.keys(currentSelection), currentSelection)),
      );
      return nextModels;
    });
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

  const buildAccountPayload = () => {
    if (!selectedProvider || !selectedVariant) {
      throw new Error("Select a provider variant before saving an account.");
    }

    return {
      providerAccountId: accountId,
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
              backend: "local-encrypted-file",
              ref: `oauth/${selectedProvider.providerId}/${accountId}`,
            },
      authMode: selectedVariant.authMode,
      regionPolicy: {
        mode: "prefer",
        regions: ["global"],
      },
      baseUrlOverride: selectedVariant.baseUrl ?? selectedProvider.apiBase,
      allowedModels: selectedModels,
      modelRoleBindings: buildModelRoleBindings(selectedModels, selectedModelRoles),
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
    setSubmitting(true);
    setError(null);
    try {
      await upsertRuntimeAccount(buildAccountPayload());
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not save account.");
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
        providerAccountId: accountId,
        providerId: selectedProvider.providerId,
        providerKind: selectedProvider.providerKind,
        variantId: selectedVariant.variantId,
        allowedModels: selectedModels,
        modelRoleBindings: buildModelRoleBindings(selectedModels, selectedModelRoles),
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
      setError(value instanceof Error ? value.message : "Could not start device authorization.");
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
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : "Could not refresh device authorization.");
    } finally {
      setPolling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accounts"
        title="Provider accounts"
        description="Save API-key accounts, start Kimi device OAuth, choose the exact models each runtime account can use, and assign runtime roles per model."
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Create or update account"
          description="This form now drives real account persistence, model selection, model-role assignment, and Kimi device-auth state."
        >
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Provider account id</span>
              <input className={inputClass} value={accountId} onChange={(event) => setAccountId(event.target.value)} />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Provider</span>
              <select
                className={inputClass}
                value={providerId}
                onChange={(event) => onProviderChange(event.target.value)}
              >
                {snapshot.providers.map((provider) => (
                  <option key={provider.providerId} value={provider.providerId}>
                    {provider.displayName}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--rm-fg)]">Onboarding variant</span>
              <select className={inputClass} value={variantId} onChange={(event) => onVariantChange(event.target.value)}>
                {(selectedProvider?.variants ?? []).map((variant) => (
                  <option key={variant.variantId} value={variant.variantId}>
                    {variant.label}
                  </option>
                ))}
              </select>
            </label>

            {selectedVariant?.authMode === "api-key-static" ? (
              <label className="grid gap-2 text-sm">
                <span className="font-medium text-[var(--rm-fg)]">Credential reference</span>
                <input className={inputClass} value={credentialRef} onChange={(event) => setCredentialRef(event.target.value)} />
              </label>
            ) : (
              <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                <p className="font-medium text-[var(--rm-fg)]">Runtime-managed credential reference</p>
                <p className="mt-2">Kimi device OAuth stores the resulting token locally and only exposes the credential reference back to the control plane.</p>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <p className="font-medium text-[var(--rm-fg)]">Allowed models</p>
              <div className={`${mutedPanelClassName} space-y-2 p-4`}>
                {availableModels.map((modelId) => (
                  <label key={modelId} className="flex items-center gap-3">
                    <input
                      checked={selectedModels.includes(modelId)}
                      type="checkbox"
                      onChange={() => toggleModel(modelId)}
                    />
                    <span className="text-[var(--rm-secondary)]">{modelId}</span>
                  </label>
                ))}
              </div>
            </div>

            {selectedModels.length > 0 ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-[var(--rm-fg)]">Model roles</p>
                  <p className="text-[var(--rm-secondary)]">
                    Assign runtime roles to each enabled model so later endpoint activation preserves the operator intent.
                  </p>
                </div>
                <div className={`${mutedPanelClassName} space-y-3 p-4`}>
                  {selectedModels.map((modelId) => (
                    <div key={modelId} className={`${raisedPanelClassName} space-y-2 p-3`}>
                      <p className="font-medium text-[var(--rm-fg)]">{modelId}</p>
                      {availableRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-3">
                          {availableRoles.map((role) => (
                            <label key={`${modelId}:${role.roleId}`} className="flex items-center gap-2 rounded-none border border-[var(--rm-border)] px-3 py-1.5">
                              <input
                                checked={(selectedModelRoles[modelId] ?? []).includes(role.roleId)}
                                type="checkbox"
                                onChange={() => toggleModelRole(modelId, role.roleId)}
                              />
                              <span className="text-[var(--rm-secondary)]">{role.label}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[var(--rm-secondary)]">No runtime roles are available from the host bridge yet.</p>
                      )}
                    </div>
                  ))}
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
                </div>
                <p className="mt-2">{selectedVariant.description}</p>
                <p className="mt-2">
                  <span className="font-medium text-[var(--rm-fg)]">Base URL:</span> {selectedVariant.baseUrl}
                </p>
                {selectedVariant.oauth ? (
                  <div className={`mt-3 ${raisedPanelClassName} p-3`}>
                    <p className="font-medium text-[var(--rm-fg)]">Device OAuth metadata</p>
                    <p className="mt-2">
                      <span className="font-medium text-[var(--rm-fg)]">OAuth host:</span> {selectedVariant.oauth.oauthHost}
                    </p>
                    <p>
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
              <button
                className={buttonClass}
                disabled={submitting || !selectedProvider || !selectedVariant || selectedModels.length === 0}
                type="submit"
              >
                {submitting ? "Saving…" : "Save account"}
              </button>

              {selectedVariant?.authMode === "oauth2-device-code" ? (
                <>
                  <button
                    className={secondaryButtonClassName}
                    disabled={authorizing || selectedModels.length === 0}
                    type="button"
                    onClick={() => void onStartDeviceAuthorization()}
                  >
                    {authorizing ? "Starting…" : "Start device OAuth"}
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
          </form>
        </SectionCard>

        <SectionCard
          title="Current accounts"
          description="Credential references stay visible, raw secrets stay hidden, and OAuth accounts report their current connection state through runtime health."
        >
          <div className="space-y-4">
            {oauthState ? (
              <div className={`${mutedPanelClassName} p-4 text-sm text-[var(--rm-secondary)]`}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--rm-fg)]">Current device-auth session</p>
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
                    The verification page opens in a new tab and this screen keeps checking the binding automatically.
                    Kimi Code uses device OAuth polling rather than a redirect callback URL.
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
                    <span className="font-medium text-[var(--rm-fg)]">Auth mode:</span> {account.authMode}
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
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
