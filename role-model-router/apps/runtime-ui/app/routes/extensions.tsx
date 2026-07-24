import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  compactTitleClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import {
  type RuntimeActivePack,
  type RuntimeContributionState,
  type RuntimeExtensionMode,
  type RuntimeExtensionStatus,
  type RuntimeRecommendation,
  applyRecommendation,
  dismissRecommendation,
  downloadRecommendations,
  fetchActivePack,
  fetchContributionState,
  fetchExtensions,
  fetchRecommendations,
  mutateExtension,
  updateContributionState,
} from "../lib/runtime-api";

const EXTENSION_MODES: readonly RuntimeExtensionMode[] = [
  "shadow",
  "advisory",
  "bounded",
  "active",
];

const LIFECYCLE_COPY: Record<
  RuntimeExtensionStatus["lifecycle"] | "unavailable",
  { readonly label: string; readonly routingMeaning: string }
> = {
  installed_disabled: {
    label: "Installed · disabled",
    routingMeaning:
      "Package is present but not running. Core routing continues without this worker.",
  },
  installed_active_pending_disclosure: {
    label: "Active · pending disclosure",
    routingMeaning:
      "Worker may contribute after disclosure completes; routing remains independent of contribution policy.",
  },
  starting: {
    label: "Starting",
    routingMeaning: "Lifecycle transition in progress. Routing does not wait on this worker.",
  },
  ready: {
    label: "Ready",
    routingMeaning:
      "Worker passed lifecycle and health gates. Local degradation still preserves routing continuity.",
  },
  degraded: {
    label: "Degraded",
    routingMeaning:
      "Bounded failure mode is active. See degradation policy; core routing continues.",
  },
  stopping: {
    label: "Stopping",
    routingMeaning: "Worker is shutting down. Core routing continues without waiting on it.",
  },
  stopped: {
    label: "Stopped",
    routingMeaning: "Worker is stopped. Core routing continues without this package.",
  },
  unavailable: {
    label: "Unavailable",
    routingMeaning: "Not registered with the private supervisor bridge for this host.",
  },
};

const operatorBoundaryNote = (extensionId: string): string | null => {
  if (extensionId === "knowledge-worker") {
    return "Local store and shadow derivation only. Enabling this extension does not activate production prompt injection or live routing of derived knowledge in v1.1.";
  }
  if (extensionId === "knowledge-store") {
    return "Serves last-ready knowledge references. Production activation of knowledge into prompts remains locked off in v1.1.";
  }
  return null;
};

const lifecycleTone = (lifecycle: string): "success" | "warning" | "error" | "neutral" => {
  if (lifecycle === "ready") return "success";
  if (lifecycle === "degraded" || lifecycle === "installed_active_pending_disclosure")
    return "warning";
  if (lifecycle === "unavailable" || lifecycle === "stopped") return "error";
  return "neutral";
};

const healthSummary = (extension: RuntimeExtensionStatus): string => {
  const health = extension.health;
  if (health.summary && health.summary.trim().length > 0) return health.summary;
  if (health.reason && health.reason.trim().length > 0) return health.reason.replaceAll("_", " ");
  if (!health.available) return "Health probe reports unavailable.";
  return health.routingDependency
    ? "Available and marked as a routing dependency."
    : "Available; not a routing dependency.";
};

const requiresDangerousModeConfirm = (mode: RuntimeExtensionMode): boolean =>
  mode === "active" || mode === "bounded";

export function ExtensionsRouteView() {
  const [extensions, setExtensions] = useState<readonly RuntimeExtensionStatus[] | null>(null);
  const [contribution, setContribution] = useState<RuntimeContributionState | null>(null);
  const [recommendations, setRecommendations] = useState<readonly RuntimeRecommendation[]>([]);
  const [activePack, setActivePack] = useState<RuntimeActivePack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modeDraft, setModeDraft] = useState<Record<string, RuntimeExtensionMode>>({});
  const load = useCallback(async () => {
    try {
      const [extensionRows, contributionState, recommendationRows, pack] = await Promise.all([
        fetchExtensions(),
        fetchContributionState(),
        fetchRecommendations(),
        fetchActivePack(),
      ]);
      setExtensions(extensionRows);
      setContribution(contributionState);
      setRecommendations(recommendationRows);
      setActivePack(pack);
    } catch (value) {
      setError(message(value));
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const facts = useMemo(() => {
    const rows = extensions ?? [];
    return {
      installed: rows.filter((row) => row.installed).length,
      ready: rows.filter((row) => row.lifecycle === "ready").length,
      degraded: rows.filter((row) => row.lifecycle === "degraded").length,
    };
  }, [extensions]);
  const transition = async (action: "opt_out" | "reenable" | "complete_disclosure") => {
    setBusy(true);
    setError(null);
    try {
      setContribution(
        await updateContributionState(
          action,
          action === "complete_disclosure" ? `ui-${Date.now()}` : undefined,
        ),
      );
    } catch (value) {
      setError(message(value));
    } finally {
      setBusy(false);
    }
  };
  const apply = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const next = await applyRecommendation(id);
      setRecommendations(next.recommendations);
      setActivePack(next.activePack);
    } catch (value) {
      setError(message(value));
    } finally {
      setBusy(false);
    }
  };
  const dismiss = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const next = await dismissRecommendation(id);
      setRecommendations(next.recommendations);
      setActivePack(next.activePack);
    } catch (value) {
      setError(message(value));
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      setRecommendations(await downloadRecommendations());
    } catch (value) {
      setError(message(value));
    } finally {
      setBusy(false);
    }
  };
  const mutate = async (
    id: string,
    action: "enable" | "disable" | "set_mode",
    mode?: RuntimeExtensionMode,
  ) => {
    if (
      mode &&
      requiresDangerousModeConfirm(mode) &&
      typeof window !== "undefined" &&
      !window.confirm(
        `Apply mode "${mode}" to ${id}? This can change network, data, or routing exposure for the extension boundary.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await mutateExtension({ id, action, mode });
      await load();
    } catch (value) {
      setError(message(value));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Installed extensions"
          value={facts.installed}
          detail="Canonical packages present in this release pair."
          emphasis
        />
        <FactCard
          label="Ready workers"
          value={facts.ready}
          detail="Workers that passed lifecycle and health gates."
        />
        <FactCard
          label="Degraded"
          value={facts.degraded}
          detail="Bounded failures that do not interrupt routing."
        />
        <FactCard
          label="Active pack"
          value={activePack?.id ?? "None"}
          detail="Locally validated recommendation authority."
        />
      </div>
      {error ? <ErrorState label={error} /> : null}
      <SectionCard
        title="Contribution, disclosure, and opt-out"
        description="Aggregate upload is independent from local recommendation use, training, external RL, and rich capture. Contribution policy is not extension enablement."
      >
        {contribution === null ? (
          <LoadingState label="Loading contribution policy…" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
            <dl className="grid gap-3 sm:grid-cols-3">
              <Detail
                label="Mode / tier"
                value={`${contribution.mode} · ${contribution.contributionTier}`}
              />
              <Detail
                label="Authorization"
                value={`${contribution.authorizationState} · epoch ${contribution.revocationEpoch}`}
              />
              <Detail label="Queued aggregates" value={String(contribution.queuedCount)} />
              <Detail
                label="Cloud upload"
                value={contribution.allowCloudUpload ? "Aggregate-only allowed" : "Disabled"}
              />
              <Detail
                label="Recommendations"
                value={`${contribution.recommendationTier} · ${contribution.recommendationAccess}`}
              />
              <Detail label="Policy" value={contribution.managed ? "Managed" : "Local/default"} />
            </dl>
            <div className="flex flex-wrap items-start gap-2">
              {contribution.authorizationState === "pending_disclosure" ? (
                <button
                  className={primaryButtonClassName}
                  disabled={busy || contribution.managed}
                  onClick={() => void transition("complete_disclosure")}
                  type="button"
                >
                  Review disclosure & authorize
                </button>
              ) : null}
              {contribution.mode === "contributor" ? (
                <button
                  className={secondaryButtonClassName}
                  disabled={busy || contribution.managed}
                  onClick={() => void transition("opt_out")}
                  type="button"
                >
                  Opt out & clear queue
                </button>
              ) : (
                <button
                  className={secondaryButtonClassName}
                  disabled={busy || contribution.managed}
                  onClick={() => void transition("reenable")}
                  type="button"
                >
                  Re-enable contribution
                </button>
              )}
            </div>
          </div>
        )}
      </SectionCard>
      <SectionCard
        title="Signed recommendations"
        description="Download visibility is separate from local signature validation and explicit application policy."
      >
        <button
          className={`${primaryButtonClassName} mb-4`}
          disabled={busy || contribution?.recommendationAccess === "disabled"}
          onClick={() => void download()}
          type="button"
        >
          Download & validate latest
        </button>
        {recommendations.length === 0 ? (
          <EmptyState label="No recommendation bundles downloaded." />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {recommendations.map((row) => (
              <article className={`${mutedPanelClassName} p-4`} key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={compactTitleClassName}>{row.id}</p>
                    <p className={`mt-1 ${supportingTextClassName}`}>
                      v{row.version} · {row.provenance}
                    </p>
                  </div>
                  <StatusPill
                    tone={row.signatureValid && row.policyAllowed ? "success" : "warning"}
                  >
                    {row.status}
                  </StatusPill>
                </div>
                <p className={`mt-3 ${supportingTextClassName}`}>
                  {row.signatureValid ? "Signature valid" : "Signature invalid"} ·{" "}
                  {row.policyAllowed ? "Local policy allows apply" : "Blocked by local policy"}
                </p>
                {row.endpointId || row.modelId || row.preferredFor?.length || row.confidence ? (
                  <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
                    {row.endpointId ? <Detail label="Endpoint" value={row.endpointId} /> : null}
                    {row.modelId ? <Detail label="Model" value={row.modelId} /> : null}
                    {row.preferredFor?.length ? (
                      <Detail label="Preferred for" value={row.preferredFor.join(", ")} />
                    ) : null}
                    {row.action ? <Detail label="Action" value={row.action} /> : null}
                    {typeof row.confidence === "number" ? (
                      <Detail label="Confidence" value={row.confidence.toFixed(2)} />
                    ) : null}
                  </dl>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className={secondaryButtonClassName}
                    disabled={
                      busy ||
                      row.status === "applied" ||
                      row.status === "dismissed" ||
                      !row.signatureValid ||
                      !row.policyAllowed ||
                      contribution?.recommendationAccess !== "preview_and_apply"
                    }
                    onClick={() => void apply(row.id)}
                    type="button"
                  >
                    {row.status === "applied" ? "Applied" : "Validate & apply"}
                  </button>
                  <button
                    className={secondaryButtonClassName}
                    disabled={busy || row.status === "applied" || row.status === "dismissed"}
                    onClick={() => void dismiss(row.id)}
                    type="button"
                  >
                    {row.status === "dismissed" ? "Dismissed" : "Dismiss"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard
        title="Extension boundary"
        description="Install, enablement, lifecycle, health, and contribution/recommendation policy are separate. Use Enable, Disable, and Set mode to mutate hosted packages through the public extension control API; Knowledge Worker productionActivation stays hard-off."
      >
        {extensions === null ? (
          <LoadingState label="Loading extension lifecycle…" />
        ) : extensions.length === 0 ? (
          <EmptyState label="No extension packages are installed." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {extensions.map((extension) => {
              const lifecycleKey = String(extension.lifecycle);
              const lifecycle =
                LIFECYCLE_COPY[lifecycleKey as keyof typeof LIFECYCLE_COPY] ??
                ({
                  label: lifecycleKey.replaceAll("_", " "),
                  routingMeaning:
                    "Lifecycle reported by the host. Core routing continuity is independent of this worker unless marked as a routing dependency.",
                } as const);
              const boundaryNote = operatorBoundaryNote(extension.id);
              const degradedOrUnavailable =
                extension.lifecycle === "degraded" ||
                !extension.health.available ||
                lifecycleKey === "unavailable" ||
                extension.lifecycle === "stopped";
              const draftMode =
                modeDraft[extension.id] ??
                (extension.enabledMode && extension.enabledMode !== "disabled"
                  ? extension.enabledMode
                  : "shadow");
              const canEnable = true;
              const canDisableOrMode = extension.installed || extension.enabled;
              return (
                <article className={`${mutedPanelClassName} min-w-0 p-4 md:p-5`} key={extension.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className={compactTitleClassName}>{extension.id}</p>
                      <p className={`mt-1 ${utilityLabelClassName} text-[var(--rm-muted)]`}>
                        {extension.packageClass.replaceAll("_", " ")}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <StatusPill tone={extension.installed ? "success" : "neutral"}>
                        {extension.installed ? "installed" : "not installed"}
                      </StatusPill>
                      <StatusPill tone={extension.enabled ? "success" : "neutral"}>
                        {extension.enabled ? "enabled" : "disabled"}
                      </StatusPill>
                      <StatusPill tone={lifecycleTone(lifecycleKey)}>{lifecycle.label}</StatusPill>
                    </div>
                  </div>
                  <p className={`mt-3 ${supportingTextClassName}`}>{lifecycle.routingMeaning}</p>
                  {boundaryNote ? (
                    <p className={`mt-2 ${supportingTextClassName}`}>{boundaryNote}</p>
                  ) : null}
                  {degradedOrUnavailable ? (
                    <div className="mt-3">
                      <ErrorState
                        label={
                          !extension.health.available
                            ? `Health unavailable: ${healthSummary(extension)}`
                            : `Worker ${lifecycle.label.toLowerCase()}: ${extension.degradation}`
                        }
                      />
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <label className={`${utilityLabelClassName} text-[var(--rm-muted)]`}>
                      Mode
                      <select
                        aria-label={`Mode for ${extension.id}`}
                        className={`ml-2 rounded border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1 ${supportingTextClassName}`}
                        disabled={busy || !canEnable}
                        onChange={(event) =>
                          setModeDraft((current) => ({
                            ...current,
                            [extension.id]: event.target.value as RuntimeExtensionMode,
                          }))
                        }
                        value={draftMode}
                      >
                        {EXTENSION_MODES.map((mode) => (
                          <option key={mode} value={mode}>
                            {mode}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className={secondaryButtonClassName}
                      disabled={busy || !canEnable || extension.enabled}
                      onClick={() => void mutate(extension.id, "enable", draftMode)}
                      type="button"
                    >
                      Enable
                    </button>
                    <button
                      className={secondaryButtonClassName}
                      disabled={busy || !canDisableOrMode || !extension.enabled}
                      onClick={() => void mutate(extension.id, "disable")}
                      type="button"
                    >
                      Disable
                    </button>
                    <button
                      className={secondaryButtonClassName}
                      disabled={busy || !canDisableOrMode || !extension.enabled}
                      onClick={() => void mutate(extension.id, "set_mode", draftMode)}
                      type="button"
                    >
                      Set mode
                    </button>
                  </div>
                  <dl className="mt-5 grid gap-x-4 gap-y-3 sm:grid-cols-2">
                    <Detail
                      label="Channel / scope"
                      value={`${extension.channel} · ${extension.scope}`}
                    />
                    <Detail
                      label="Authorization epoch"
                      value={String(extension.authorizationEpoch)}
                    />
                    <Detail
                      label="Enabled mode"
                      value={extension.enabledMode ?? (extension.enabled ? "active" : "disabled")}
                    />
                    <Detail
                      label="Health"
                      value={
                        extension.health.available
                          ? `available · ${healthSummary(extension)}`
                          : `unavailable · ${healthSummary(extension)}`
                      }
                    />
                    <Detail
                      label="Routing dependency"
                      value={extension.health.routingDependency ? "yes" : "no"}
                    />
                    <Detail
                      label="Health probe"
                      value={extension.health.probe?.replaceAll("_", " ") ?? "not reported"}
                    />
                    <Detail
                      label="Data classes"
                      value={extension.dataClasses.join(", ") || "none"}
                    />
                    <Detail label="Retention" value={extension.retention} />
                    <Detail label="Degradation" value={extension.degradation} />
                    <Detail
                      label="Permissions"
                      value={extension.permissions.join(", ") || "none"}
                    />
                    <Detail label="Compatibility" value={extension.compatibility.join(", ")} />
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
export default ExtensionsRouteView;
const message = (value: unknown) =>
  value instanceof Error ? value.message : "Could not load the extension boundary.";
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className={`${utilityLabelClassName} text-[var(--rm-muted)]`}>{label}</dt>
      <dd className={`mt-1 break-words ${supportingTextClassName}`}>{value}</dd>
    </div>
  );
}
