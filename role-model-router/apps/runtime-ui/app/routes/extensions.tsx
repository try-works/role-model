import { MetricStrip } from "@role-model/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DisclosureSection,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
  StatusPill,
} from "../components/page-primitives";
import {
  compactFieldButtonClassName,
  compactFieldButtonEmphasisClassName,
  compactTitleClassName,
  fieldClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import {
  type KnowledgeValidationReceipt,
  type RuntimeActivePack,
  type RuntimeContributionState,
  type RuntimeExtensionMode,
  type RuntimeExtensionStatus,
  type RuntimeRecommendation,
  activateKnowledgeWorkerProduction,
  applyRecommendation,
  deactivateKnowledgeWorkerProduction,
  dismissRecommendation,
  downloadRecommendations,
  fetchActivePack,
  fetchContributionState,
  fetchExtensions,
  fetchRecommendations,
  mutateExtension,
  prepareKnowledgeWorkerShadowReady,
  updateContributionState,
} from "../lib/runtime-api";

const EXTENSION_MODES: readonly RuntimeExtensionMode[] = [
  "disabled",
  "shadow",
  "advisory",
  "bounded",
  "active",
];

const formatModeLabel = (mode: RuntimeExtensionMode): string =>
  `${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;

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
    return "Default posture is shadow-ready by default while productionActivation stays off. Production retrieve is gated and useful only after ceremony-bound ON; KW works when on. Enabling this extension is not productionActivation. Gated production prompt injection requires ceremony ON plus successful production retrieve and is not enabled by Set mode or recommendation apply alone. Soft OFF returns to shadow-ready and clears inject. Production activation is separate from Set mode and recommendation apply, gated separately from Set mode.";
  }
  if (extensionId === "knowledge-store") {
    return "Serves last-ready knowledge references. Production prompt injection requires ceremony-backed KW ON and gated production retrieve; it is not ambient-on.";
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

const isOperatorDisabled = (extension: RuntimeExtensionStatus): boolean =>
  !extension.enabled || extension.enabledMode === "disabled";

const appliedMode = (extension: RuntimeExtensionStatus): RuntimeExtensionMode =>
  !extension.enabled || !extension.enabledMode || extension.enabledMode === "disabled"
    ? "disabled"
    : extension.enabledMode;

const lifecyclePillTone = (
  lifecycle: string,
  operatorDisabled: boolean,
): "success" | "warning" | "error" | "neutral" => {
  if (operatorDisabled && (lifecycle === "stopped" || lifecycle === "installed_disabled")) {
    return "neutral";
  }
  return lifecycleTone(lifecycle);
};

export function ExtensionsRouteView() {
  const [extensions, setExtensions] = useState<readonly RuntimeExtensionStatus[] | null>(null);
  const [contribution, setContribution] = useState<RuntimeContributionState | null>(null);
  const [recommendations, setRecommendations] = useState<readonly RuntimeRecommendation[]>([]);
  const [activePack, setActivePack] = useState<RuntimeActivePack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modeDraft, setModeDraft] = useState<Record<string, RuntimeExtensionMode>>({});
  const [bootstrapReceiptJson, setBootstrapReceiptJson] = useState("");
  const [bootstrapGroupDigest, setBootstrapGroupDigest] = useState("");
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
  const applyMode = async (id: string, mode: RuntimeExtensionMode) => {
    if (
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
    setNotice(null);
    try {
      await mutateExtension({ id, action: "set_mode", mode });
      setNotice(
        mode === "disabled"
          ? `Set ${id} to disabled. Core routing continues without this worker.`
          : `Set ${id} mode to ${mode}.`,
      );
      setModeDraft((current) => ({ ...current, [id]: mode }));
      await load();
    } catch (value) {
      setError(message(value));
    } finally {
      setBusy(false);
    }
  };
  const prepareKnowledgeWorker = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const receipt = JSON.parse(bootstrapReceiptJson) as KnowledgeValidationReceipt;
      const next = await prepareKnowledgeWorkerShadowReady({
        receipt,
        groupDigest: bootstrapGroupDigest.trim(),
      });
      setExtensions(next.extensions);
      setNotice(
        "Knowledge Worker shadow-ready ceremony material stored. Production remains OFF until explicit activation.",
      );
    } catch (value) {
      setError(message(value));
    } finally {
      setBusy(false);
    }
  };
  const setKnowledgeWorkerProduction = async (active: boolean) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const next = active
        ? await activateKnowledgeWorkerProduction()
        : await deactivateKnowledgeWorkerProduction();
      setExtensions(next.extensions);
      setNotice(
        active
          ? "Knowledge Worker production activation is ON. Gated production retrieve is available."
          : "Knowledge Worker production activation is OFF. Shadow-ready material is retained.",
      );
    } catch (value) {
      setError(message(value));
    } finally {
      setBusy(false);
    }
  };

  const openRecs = useMemo(
    () =>
      recommendations.filter((row) => row.status !== "applied" && row.status !== "dismissed")
        .length,
    [recommendations],
  );
  const knowledgeWorker = useMemo(
    () => extensions?.find((row) => row.id === "knowledge-worker") ?? null,
    [extensions],
  );

  return (
    <div className="space-y-6">
      <MetricStrip
        aria-label="Extensions summary"
        variant="panel"
        items={[
          { id: "installed", label: "Installed", value: String(facts.installed) },
          { id: "ready", label: "Ready", value: String(facts.ready) },
          { id: "degraded", label: "Degraded", value: String(facts.degraded) },
          { id: "open-recs", label: "Open recs", value: String(openRecs) },
        ]}
      />
      {error ? <ErrorState label={error} /> : null}
      {notice ? (
        <output
          className={`${mutedPanelClassName} block border-[var(--rm-border-strong)] p-4 ${supportingTextClassName} text-[var(--rm-fg)]`}
        >
          {notice}
        </output>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
        <SectionCard
          title="Contribution posture"
          description="Aggregate upload is independent from local recommendation use, training, external RL, and rich capture. Contribution policy is not extension enablement."
        >
          {contribution === null ? (
            <LoadingState label="Loading contribution policy…" />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="accent">{contribution.mode}</StatusPill>
                <StatusPill tone="neutral">{contribution.authorizationState}</StatusPill>
                <StatusPill tone="neutral">tier {contribution.contributionTier}</StatusPill>
              </div>
              <dl className="grid gap-3 sm:grid-cols-3">
                <Detail
                  label="Cloud upload"
                  value={contribution.allowCloudUpload ? "Aggregate-only allowed" : "Disabled"}
                />
                <Detail label="Queued aggregates" value={String(contribution.queuedCount)} />
                <Detail
                  label="Recommendation access"
                  value={`${contribution.recommendationTier} · ${contribution.recommendationAccess}`}
                />
                <Detail label="Policy" value={contribution.managed ? "Managed" : "Local/default"} />
                <Detail
                  label="Authorization"
                  value={`${contribution.authorizationState} · epoch ${contribution.revocationEpoch}`}
                />
              </dl>
              <div className="flex flex-wrap gap-2">
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
          title="Recommendation ledger"
          description="Signed bundles validated locally before apply."
        >
          <button
            className={`${primaryButtonClassName} mb-4`}
            disabled={busy || contribution?.recommendationAccess === "disabled"}
            onClick={() => void download()}
            type="button"
          >
            Download & validate latest
          </button>
          {activePack ? (
            <p className={`mb-3 ${supportingTextClassName}`}>Active pack · {activePack.id}</p>
          ) : null}
          {recommendations.length === 0 ? (
            <EmptyState label="No recommendation bundles downloaded." />
          ) : (
            <div className="space-y-3">
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
                    {[
                      row.endpointId ? `Endpoint ${row.endpointId}` : null,
                      typeof row.confidence === "number"
                        ? `confidence ${row.confidence.toFixed(2)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                      (row.signatureValid ? "Signature valid" : "Signature invalid")}
                  </p>
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
      </div>
      <SectionCard
        title="Extension inventory"
        description="Canonical packages on this host. Modes change the extension boundary without becoming contribution policy."
      >
        {extensions === null ? (
          <LoadingState label="Loading extension lifecycle…" />
        ) : extensions.length === 0 ? (
          <EmptyState label="No extension packages are installed." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--rm-muted)]">
                <tr>
                  <th className="pb-3 font-semibold">Extension</th>
                  <th className="pb-3 font-semibold">Lifecycle</th>
                  <th className="pb-3 font-semibold">Mode</th>
                  <th className="pb-3 font-semibold">Health</th>
                  <th className="pb-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {extensions.map((extension) => {
                  const lifecycleKey = String(extension.lifecycle);
                  const lifecycle =
                    LIFECYCLE_COPY[lifecycleKey as keyof typeof LIFECYCLE_COPY] ??
                    ({
                      label: lifecycleKey.replaceAll("_", " "),
                      routingMeaning:
                        "Lifecycle reported by the host. Core routing continuity is independent of this worker unless marked as a routing dependency.",
                    } as const);
                  const operatorDisabled = isOperatorDisabled(extension);
                  const currentMode = appliedMode(extension);
                  const draftMode = modeDraft[extension.id] ?? currentMode;
                  const modeDirty = draftMode !== currentMode;
                  const caption =
                    extension.id === "knowledge-worker"
                      ? "Shadow-ready by default"
                      : extension.id === "knowledge-store"
                        ? "Last-ready references"
                        : extension.packageClass.replaceAll("_", " ");
                  return (
                    <tr key={extension.id} className="border-t border-[var(--rm-border)] align-top">
                      <td className="py-3 pr-3">
                        <p className={compactTitleClassName}>{extension.id}</p>
                        <p className={`mt-1 ${supportingTextClassName}`}>{caption}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <StatusPill tone={lifecyclePillTone(lifecycleKey, operatorDisabled)}>
                          {lifecycle.label}
                        </StatusPill>
                      </td>
                      <td className="py-3 pr-3">
                        <SelectField
                          className={busy ? "pointer-events-none opacity-60" : undefined}
                          label="Mode"
                          onChange={(value) => {
                            if (busy) return;
                            setModeDraft((current) => ({
                              ...current,
                              [extension.id]: value as RuntimeExtensionMode,
                            }));
                          }}
                          value={draftMode}
                        >
                          {EXTENSION_MODES.map((mode) => (
                            <option key={mode} value={mode}>
                              {formatModeLabel(mode)}
                            </option>
                          ))}
                        </SelectField>
                      </td>
                      <td className={`py-3 pr-3 ${supportingTextClassName}`}>
                        {healthSummary(extension)}
                      </td>
                      <td className="py-3">
                        <button
                          className={
                            modeDirty
                              ? compactFieldButtonEmphasisClassName
                              : compactFieldButtonClassName
                          }
                          disabled={busy || !modeDirty}
                          onClick={() => void applyMode(extension.id, draftMode)}
                          type="button"
                        >
                          Set mode
                        </button>
                        {modeDirty ? (
                          <p className={`mt-2 ${supportingTextClassName}`}>
                            Mode draft is {draftMode}; applied mode is {currentMode}. Click Set mode
                            to apply.
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
      {knowledgeWorker ? (
        <KnowledgeWorkerGate
          busy={busy}
          bootstrapGroupDigest={bootstrapGroupDigest}
          bootstrapReceiptJson={bootstrapReceiptJson}
          extension={knowledgeWorker}
          onBootstrapGroupDigest={setBootstrapGroupDigest}
          onBootstrapReceiptJson={setBootstrapReceiptJson}
          onPrepare={() => void prepareKnowledgeWorker()}
          onProductionOff={() => void setKnowledgeWorkerProduction(false)}
          onProductionOn={() => void setKnowledgeWorkerProduction(true)}
        />
      ) : null}
      {extensions && extensions.length > 0 ? (
        <DisclosureSection summary="Extension diagnostics">
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
              const operatorDisabled = isOperatorDisabled(extension);
              const unexpectedWorkerIssue =
                !operatorDisabled &&
                (extension.lifecycle === "degraded" ||
                  !extension.health.available ||
                  lifecycleKey === "unavailable");
              return (
                <article className={`${mutedPanelClassName} min-w-0 p-4`} key={extension.id}>
                  <p className={compactTitleClassName}>{extension.id}</p>
                  <p className={`mt-2 ${supportingTextClassName}`}>{lifecycle.routingMeaning}</p>
                  {boundaryNote ? (
                    <p className={`mt-2 ${supportingTextClassName}`}>{boundaryNote}</p>
                  ) : null}
                  {unexpectedWorkerIssue ? (
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
                  <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">
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
                      value={formatModeLabel(
                        (extension.enabledMode ??
                          (extension.enabled ? "active" : "disabled")) as RuntimeExtensionMode,
                      )}
                    />
                    <Detail
                      label="Health"
                      value={
                        operatorDisabled
                          ? healthSummary(extension)
                          : extension.health.available
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
        </DisclosureSection>
      ) : null}
    </div>
  );
}

function KnowledgeWorkerGate({
  busy,
  bootstrapGroupDigest,
  bootstrapReceiptJson,
  extension,
  onBootstrapGroupDigest,
  onBootstrapReceiptJson,
  onPrepare,
  onProductionOff,
  onProductionOn,
}: {
  busy: boolean;
  bootstrapGroupDigest: string;
  bootstrapReceiptJson: string;
  extension: RuntimeExtensionStatus;
  onBootstrapGroupDigest: (value: string) => void;
  onBootstrapReceiptJson: (value: string) => void;
  onPrepare: () => void;
  onProductionOff: () => void;
  onProductionOn: () => void;
}) {
  const productionActivation =
    extension.productionActivation ?? extension.health.productionActivation ?? false;
  const bootstrapReady = Boolean(extension.health.knowledgeWorkerBootstrap);
  return (
    <DisclosureSection summary="Knowledge Worker production gate">
      <div className={`${mutedPanelClassName} border-[var(--rm-border-strong)] p-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={compactTitleClassName}>Production retrieve gate</p>
            <p className={`mt-1 ${supportingTextClassName}`}>
              Ceremony-backed production activation is separate from Set mode. Production prompt
              injection requires ceremony ON plus gated production retrieve success; it is cleared on soft OFF
              and is not Set mode or recommendation apply. Production retrieve is gated and useful
              only after ceremony-bound ON; KW works when on.
            </p>
          </div>
          <StatusPill tone={productionActivation ? "success" : "neutral"}>
            {productionActivation ? "Production ON" : "Production OFF"}
          </StatusPill>
        </div>
        {!bootstrapReady && !productionActivation ? (
          <div className="mt-4 grid gap-3">
            <label className={utilityLabelClassName}>
              Knowledge validation receipt JSON
              <textarea
                className={`${fieldClassName} mt-1 min-h-24 font-mono`}
                onChange={(event) => onBootstrapReceiptJson(event.target.value)}
                placeholder='{"payload":{"kind":"knowledge_validation",…},"signature":"…"}'
                value={bootstrapReceiptJson}
              />
            </label>
            <label className={utilityLabelClassName}>
              Shadow group digest
              <input
                className={`${fieldClassName} mt-1 font-mono`}
                onChange={(event) => onBootstrapGroupDigest(event.target.value)}
                placeholder="64-hex digest"
                value={bootstrapGroupDigest}
              />
            </label>
            <button
              className={secondaryButtonClassName}
              disabled={
                busy ||
                !extension.installed ||
                bootstrapReceiptJson.trim().length === 0 ||
                !/^[a-f0-9]{64}$/.test(bootstrapGroupDigest.trim())
              }
              onClick={onPrepare}
              type="button"
            >
              Prepare shadow-ready
            </button>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className={primaryButtonClassName}
            disabled={
              busy ||
              productionActivation ||
              !extension.installed ||
              !extension.enabled ||
              !bootstrapReady
            }
            onClick={onProductionOn}
            type="button"
          >
            Production ON
          </button>
          <button
            className={secondaryButtonClassName}
            disabled={busy || !productionActivation}
            onClick={onProductionOff}
            type="button"
          >
            Soft OFF
          </button>
        </div>
      </div>
    </DisclosureSection>
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
