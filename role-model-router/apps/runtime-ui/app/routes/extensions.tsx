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
  type RuntimeExtensionStatus,
  type RuntimeRecommendation,
  applyRecommendation,
  downloadRecommendations,
  fetchActivePack,
  fetchContributionState,
  fetchExtensions,
  fetchRecommendations,
  updateContributionState,
} from "../lib/runtime-api";

export function ExtensionsRouteView() {
  const [extensions, setExtensions] = useState<readonly RuntimeExtensionStatus[] | null>(null);
  const [contribution, setContribution] = useState<RuntimeContributionState | null>(null);
  const [recommendations, setRecommendations] = useState<readonly RuntimeRecommendation[]>([]);
  const [activePack, setActivePack] = useState<RuntimeActivePack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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
        description="Aggregate upload is independent from local recommendation use, training, external RL, and rich capture."
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
                <button
                  className={`${secondaryButtonClassName} mt-3`}
                  disabled={
                    busy ||
                    !row.signatureValid ||
                    !row.policyAllowed ||
                    contribution?.recommendationAccess !== "preview_and_apply"
                  }
                  onClick={() => void apply(row.id)}
                  type="button"
                >
                  Validate & apply
                </button>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard
        title="Extension boundary"
        description="Lifecycle state is separate from installation, permissions, contribution tier, upload authorization, training, and export policy."
      >
        {extensions === null ? (
          <LoadingState label="Loading extension lifecycle…" />
        ) : extensions.length === 0 ? (
          <EmptyState label="No extension packages are installed." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {extensions.map((extension) => (
              <article className={`${mutedPanelClassName} min-w-0 p-4 md:p-5`} key={extension.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className={compactTitleClassName}>{extension.id}</p>
                    <p className={`mt-1 ${utilityLabelClassName} text-[var(--rm-muted)]`}>
                      {extension.packageClass.replaceAll("_", " ")}
                    </p>
                  </div>
                  <StatusPill
                    tone={
                      extension.lifecycle === "ready"
                        ? "success"
                        : extension.lifecycle === "degraded"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {extension.lifecycle.replaceAll("_", " ")}
                  </StatusPill>
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
                  <Detail label="Retention" value={extension.retention} />
                  <Detail label="Degradation" value={extension.degradation} />
                  <Detail label="Permissions" value={extension.permissions.join(", ") || "none"} />
                  <Detail label="Compatibility" value={extension.compatibility.join(", ")} />
                </dl>
              </article>
            ))}
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
