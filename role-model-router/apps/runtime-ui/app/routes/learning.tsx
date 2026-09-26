import { type ReactElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router";

import {
  LearningActivationTimelineView,
  LearningActivityHeatmapView,
  LearningComparisonMixView,
  LearningGuardrailListView,
} from "../components/learning-history-panels";
import { LearningLivePanelView } from "../components/learning-live-panel";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
} from "../components/page-primitives";
// Run 101 R10: the queue planes' bounded parameters render beside the learning policy.
import { QueuesConfigurationCard } from "../components/queues-configuration-card";
import {
  compactTitleClassName,
  fieldClassName,
  fieldLabelClassName,
  monoEyebrowClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import {
  type LearningPolicyField,
  type LearningPolicyView,
  activateLearningPack,
  engageLearningKillSwitch,
  fetchLearningDecisions,
  fetchLearningMeasurement,
  fetchLearningPolicy,
  fetchLearningRecords,
  fetchLearningRollout,
  rollbackLearningPack,
  rollbackLearningPolicy,
  saveLearningPolicy,
  useOperatorToken,
  validatePolicyDraft,
} from "../lib/learning-api";
import { fetchLearningActivity, fetchLearningHistory } from "../lib/learning-api";
import { summarizePolicyResolution } from "../lib/learning-policy-resolution";
import {
  appliedShareOf,
  fallbackReasonRows,
  formatPercentShare,
  normalizeLearningActivity,
  normalizeLearningHistory,
  profileInspectionView,
} from "../lib/learning-visuals";
import { describeOperatorWriteError } from "../lib/operator-write-error";
import { fetchLearningProfileState, fetchLearningSummary } from "../lib/runtime-api";

/**
 * Run 98 R17: the Learning route.
 *
 * Five pages read the operator surface (policy store, rollout state, learning records,
 * advisory decisions, cohort measurement) and edit the activation policy inside the
 * schema's bounds. Every page renders an explicit unavailable/degraded state instead of a
 * fabricated value (`AC-R17-09`), and every mutation requires confirmation (`AC-R17-03`).
 */

const message = (value: unknown) =>
  value instanceof Error ? value.message : "The learning surface could not be loaded.";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const show = (value: unknown, fallback = "—"): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : value.toFixed(4);
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.length ? value.join(", ") : fallback;
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return text.length ? text : fallback;
};

/**
 * Run 98 addendum 47 (found while verifying the S4 default): the runtime sends `min`/`max` as null for enum
 * fields, so the old `=== undefined` test sent every enum to the numeric branch and the Range column read
 * "— – —" instead of the allowed values — the stage row's range was unreadable precisely where the operator
 * needed to see the ladder.
 */
export function formatPolicyRange(field: LearningPolicyField): string {
  if (field.min == null && field.max == null) {
    return field.values && field.values.length > 0 ? field.values.join(" | ") : "—";
  }
  return `${show(field.min)} – ${show(field.max)}`;
}

function useOperatorSurface<TValue>(loader: () => Promise<TValue>, deps: readonly unknown[]) {
  const [value, setValue] = useState<TValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * The loader is read through a ref so the callback's dependency list stays the caller's (`deps`) without
   * hiding a dependency from the hook rules: the ref always points at the loader of the latest render.
   */
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setValue(await loaderRef.current());
      setError(null);
    } catch (loadError) {
      setError(message(loadError));
      setValue(null);
    } finally {
      setLoading(false);
    }
  }, deps);
  useEffect(() => {
    void load();
  }, [load]);
  return { value, error, loading, reload: load };
}

export function OperatorTokenField({
  token,
  onToken,
}: {
  token: string;
  onToken: (value: string) => void;
}) {
  return (
    <label className={fieldLabelClassName}>
      Operator token
      <input
        className={`${fieldClassName} mt-1 font-mono`}
        onChange={(event) => onToken(event.target.value)}
        placeholder="Not needed on this machine — only for other clients"
        type="password"
        value={token}
      />
      <span className="mt-1 block text-xs text-[var(--rm-fg-muted)]">
        This machine&apos;s owner is trusted: readbacks, policy changes, pack activation/rollback
        and the kill switch all work here without a token. Set one only for clients that are not the
        device owner — the value is the runtime&apos;s{" "}
        <span className="font-mono">--operator-auth-token</span>, and a runtime exposed beyond
        loopback still requires it.
      </span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${mutedPanelClassName} p-3`}>
      <p className={monoEyebrowClassName}>{label}</p>
      <p className={`mt-1 break-words ${compactTitleClassName}`}>{value}</p>
    </div>
  );
}

function degraded(loading: boolean, error: string | null): ReactElement | null {
  if (loading) return <LoadingState label="Loading learning state…" />;
  if (error)
    return <ErrorState label={`Learning surface unavailable: ${error}. No value is fabricated.`} />;
  return null;
}

/**
 * Run 98 addendum 25 §1 (operator-reported): the Recent decisions panel asserted a hardcoded
 * "the selection always remains the baseline in stage S1" while the scope was running S2, which
 * contradicted the STAGE metric in the same page's header. That sentence is a claim about
 * safety-relevant behaviour, so it is derived from the live stage readback instead: only S1 keeps
 * the baseline guarantee, every other reported stage states the eligible-set bound for that stage,
 * and an unreported stage asserts no stage at all rather than defaulting to S1 copy.
 */
export function selectionNoteForStage(effectiveStage: string): string {
  if (effectiveStage === "S1") return "the selection always remains the baseline in stage S1";
  if (effectiveStage) {
    return `the advisory may only act inside the eligible set (stage ${effectiveStage})`;
  }
  return "the selection follows the configured activation stage";
}

/** Overview: stage, policy identity, cohort, advisory counts, guardrails, last rollback. */
export function LearningOverviewPage() {
  const { token, setToken } = useOperatorToken();
  const policy = useOperatorSurface<LearningPolicyView>(
    () => fetchLearningPolicy(fetch, token || undefined),
    [token],
  );
  const rollout = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningRollout(fetch, token || undefined),
    [token],
  );
  const summary = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningSummary(fetch, token || undefined),
    [token],
  );
  const decisions = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningDecisions(fetch, token || undefined, { limit: 10 }),
    [token],
  );
  const activity = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningActivity(fetch, token || undefined, { windowMinutes: 60, limit: 24 }),
    [token],
  );
  /**
   * Run 98 addendum 44 `A44-S3` (`AC-R12-01`): the guardrail status and rollback count live in the history
   * readback, and the profile-inspection capability is reported as a bounded state rather than an error.
   */
  const history = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningHistory(fetch, token || undefined, { hours: 24 }),
    [token],
  );
  const profile = useOperatorSurface<Awaited<ReturnType<typeof fetchLearningProfileState>>>(
    () => fetchLearningProfileState(fetch, token || undefined),
    [token],
  );
  const activityView = normalizeLearningActivity(activity.value);
  const historyView = normalizeLearningHistory(history.value);
  const profileView = profile.value ?? profileInspectionView(null);
  const advisory = asRecord(asRecord(summary.value).advisory);
  const fallbackReasons = fallbackReasonRows(advisory, 3);
  // Run 98 addendum 31 S5: how much of the scored evidence is actually checkable.
  const auditability = asRecord(asRecord(summary.value).auditability);
  const rolloutValue = asRecord(rollout.value);
  const receipts = Array.isArray(rolloutValue.receipts) ? rolloutValue.receipts : [];
  const lastRollback = receipts.find((row) => asRecord(row).state === "rolled_back");
  const decisionsValue = asRecord(decisions.value);
  const decisionRows = Array.isArray(decisionsValue.decisions)
    ? (decisionsValue.decisions as readonly Record<string, unknown>[])
    : [];
  // Run 98 addendum 25 §1 (operator-reported): this panel used to assert a hardcoded "stage S1" while
  // the scope ran S2, contradicting the STAGE metric in its own header. The note now follows the live
  // stage readback, and the panel says what a row is: one decision with its observation count (§2).
  const effectiveStage = String(asRecord(asRecord(policy.value).effective).stage ?? "");
  const selectionNote = selectionNoteForStage(effectiveStage);
  const fallback =
    degraded(policy.loading, policy.error) ?? degraded(rollout.loading, rollout.error);
  return (
    <div className="grid gap-4">
      <SectionCard
        title="Learning overview"
        description="What the learning loop is doing right now, read from durable state."
      >
        <OperatorTokenField onToken={setToken} token={token} />
        {fallback ?? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Stage"
              value={show(
                asRecord(asRecord(policy.value).effective).stage ??
                  policy.value?.fields?.find((f) => f.name === "stage")?.value,
              )}
            />
            <Metric label="Policy version" value={show(asRecord(policy.value).policyVersion)} />
            <Metric label="Policy digest" value={show(asRecord(policy.value).digest)} />
            <Metric
              label="Cohort"
              value={`step ${show(rolloutValue.cohortStep)} · ${show(rolloutValue.cohortPercent)}%`}
            />
            <Metric label="Activation state" value={show(rolloutValue.state)} />
            <Metric label="Active pack" value={show(rolloutValue.activePackageId)} />
            <Metric
              label="Advisory observed"
              value={`${show(advisory.observed)} · fresh ${show(advisory.fresh)} · stale ${show(advisory.stale)} · unavailable ${show(advisory.unavailable)}`}
            />
            <Metric label="Influence rate" value={show(advisory.influenceRate)} />
            {/* Run 98 addendum 44 A44-S3: the R12 numbers the Overview was missing. */}
            <Metric label="Applied share" value={formatPercentShare(appliedShareOf(advisory))} />
            <Metric
              label="Fallback reasons"
              value={
                fallbackReasons.length > 0
                  ? fallbackReasons.map((row) => `${row.reason} ×${row.count}`).join(" · ")
                  : "none recorded"
              }
            />
            <Metric label="Would have changed" value={show(advisory.wouldHaveChanged)} />
            <Metric
              label="Guardrails"
              value={`${show(historyView.guardrailsFiring)} firing · window ${show(asRecord(history.value).guardrailWindowMinutes)} min`}
            />
            <Metric
              label="Rollbacks"
              value={`${show(historyView.totals.rollbacks)} · ${show(historyView.totals.guardrailBreaches)} breaches`}
            />
            <Metric
              label="Profile inspection"
              value={
                profileView.state === "available"
                  ? "available"
                  : `unavailable${profileView.reason ? ` · ${profileView.reason}` : ""}`
              }
            />
            <Metric
              label="Input auditability"
              value={`${show(auditability.resolvedInputs)} resolved · ${show(auditability.unresolvedInputs)} unresolved · ${show(auditability.missingInputProof)} no proof`}
            />
            <Metric
              label="Last rollback"
              value={
                lastRollback
                  ? `${show(asRecord(lastRollback).receiptId)} · ${show(asRecord(lastRollback).rolledBackAt)}`
                  : "none"
              }
            />
          </div>
        )}
      </SectionCard>
      <LearningLivePanelView
        view={activityView}
        loading={activity.loading}
        error={activity.error}
        nowMs={Date.now()}
        scopeLabel={show(rolloutValue.scopeId ?? rolloutValue.scope)}
      />
      <SectionCard
        title="Recent decisions"
        description={`Advisory observations recorded per decision; ${selectionNote}. Each row is one decision with its observation count.`}
      >
        {degraded(decisions.loading, decisions.error) ??
          (decisionRows.length === 0 ? (
            <EmptyState label="No decisions have been observed for this scope yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "Decision",
                      "Route package",
                      "Advisory",
                      "Outcome",
                      "Would change",
                      "Request family",
                      "Role",
                      "Taxonomy",
                      "Candidate",
                    ].map((header) => (
                      <th className={`pb-3 pr-3 font-normal ${monoEyebrowClassName}`} key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {decisionRows.map((row, index) => (
                    <tr
                      className="border-t border-[var(--rm-border)]"
                      key={`${show(row.decisionId)}-${index}`}
                    >
                      <td className="py-2 pr-3 font-mono">
                        {show(row.decisionId)}
                        {/* Run 98 addendum 25 §2: a collapsed row states how many observations it
                            stands for, so the table cannot read as duplicated rows. */}
                        {Number(row.observationCount) > 1 ? (
                          <span className="ml-2 text-xs text-[var(--rm-fg-muted)]">
                            ×{show(row.observationCount)}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">{show(row.routePackage)}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={row.advisoryState === "fresh" ? "success" : "neutral"}>
                          {show(row.advisoryState)}
                        </Badge>
                      </td>
                      {/* Run 99 R25: whether the advisory was consulted, applied or refused. */}
                      <td className="py-2 pr-3">
                        <Badge tone={row.applied === true ? "success" : "neutral"}>
                          {show(row.mode)}
                        </Badge>
                        {row.applied === true
                          ? " applied"
                          : row.fallbackReason
                            ? ` ${show(row.fallbackReason)}`
                            : ""}
                      </td>
                      <td className="py-2 pr-3">{show(row.wouldHaveChanged)}</td>
                      {/* Run 99 R33: the request's task family, so a family-scoped refusal is
                          readable from the overview without opening the decision. */}
                      <td className="py-2 pr-3">
                        {row.requestTaskTypeId ? show(row.requestTaskTypeId) : "not reported"}
                      </td>
                      {/* Run 99 close-out (addendas 19-21 S33): the family alone does not say which
                          role or which taxonomy version the decision was classified against. */}
                      <td className="py-2 pr-3">
                        {row.roleId ? show(row.roleId) : "not reported"}
                      </td>
                      <td className="py-2 pr-3">
                        {row.taxonomyVersion ? show(row.taxonomyVersion) : "not reported"}
                      </td>
                      <td className="py-2 pr-3">{show(row.candidateId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </SectionCard>
    </div>
  );
}

/** Configuration: schema-driven, bounded editing of every published policy field. */
export function LearningConfigurationPage() {
  const { token, setToken } = useOperatorToken();
  const policy = useOperatorSurface<LearningPolicyView>(
    () => fetchLearningPolicy(fetch, token || undefined),
    [token],
  );
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [operator, setOperator] = useState("operator:ui");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const view = policy.value;
  // Run 98 addendum 44 `A44-S4`: the page renders the stored document *and* the router's own resolution, so a
  // damaged policy source reads as a degraded state instead of a policy the router is not using.
  const resolution = summarizePolicyResolution(view);
  const routerReported = Boolean(view?.routerResolution);
  const storedDegraded = Boolean(view?.degraded);
  const validation = useMemo(
    () => validatePolicyDraft(view?.fields ?? [], draft),
    [view?.fields, draft],
  );
  const update = (field: LearningPolicyField, raw: string) => {
    const value = field.type === "integer" || field.type === "number" ? Number(raw) : raw;
    setDraft((current) => ({ ...current, [field.name]: value }));
  };
  const save = async () => {
    if (!view) return;
    if (Object.keys(validation.errors).length) {
      setError(`Fix the highlighted fields first: ${Object.values(validation.errors).join("; ")}`);
      return;
    }
    if (Object.keys(validation.changes).length === 0) {
      setNotice("No changes to save.");
      return;
    }
    const confirmRequired = [
      "stage",
      "cohortLadder",
      "minDecisionsPerStep",
      "minHoursPerStep",
    ].some((name) => name in validation.changes);
    if (
      confirmRequired &&
      typeof window !== "undefined" &&
      !window.confirm(
        "Apply this learning policy change? Stage and cohort changes affect live routing.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const applied = await saveLearningPolicy(
        {
          changes: validation.changes,
          expectedPolicyVersion: view.policyVersion,
          operator: operator || "operator:ui",
        },
        fetch,
        token || undefined,
      );
      setNotice(
        `Policy version ${applied.policyVersion} written (${(applied.receipt?.changedFields ?? Object.keys(validation.changes)).join(", ")}). Every later decision receipt cites it.`,
      );
      setDraft({});
      await policy.reload();
    } catch (saveError) {
      setError(describeOperatorWriteError(saveError));
    } finally {
      setBusy(false);
    }
  };
  const rollback = async () => {
    if (!view) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Roll the learning policy back to the previous version?")
    ) {
      return;
    }
    setBusy(true);
    try {
      const applied = await rollbackLearningPolicy(
        {
          toPolicyVersion: Math.max(1, view.policyVersion - 1),
          expectedPolicyVersion: view.policyVersion,
          operator: operator || "operator:ui",
          reason: "operator_ui_rollback",
        },
        fetch,
        token || undefined,
      );
      setNotice(`Policy rolled back to version ${applied.policyVersion}.`);
      await policy.reload();
    } catch (rollbackError) {
      setError(describeOperatorWriteError(rollbackError));
    } finally {
      setBusy(false);
    }
  };
  return (
    <SectionCard
      title="Learning configuration"
      description="Every activation parameter with its current value, unit, default and allowed range. Bounds are enforced here and again on the server."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <OperatorTokenField onToken={setToken} token={token} />
        <label className={fieldLabelClassName}>
          Operator identity
          <input
            className={`${fieldClassName} mt-1`}
            onChange={(event) => setOperator(event.target.value)}
            value={operator}
          />
        </label>
      </div>
      {notice ? <p className={`mt-3 ${supportingTextClassName}`}>{notice}</p> : null}
      {error ? (
        <div className="mt-3">
          <ErrorState label={error} />
        </div>
      ) : null}
      {degraded(policy.loading, policy.error) ??
        (view ? (
          <>
            <div className="mt-4 rounded border border-[var(--rm-border)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={monoEyebrowClassName}>Router resolution</span>
                <Badge tone={resolution.authoritative ? "neutral" : "warning"}>
                  {resolution.authoritative
                    ? "policy authoritative"
                    : routerReported
                      ? "router degraded"
                      : "readback degraded"}
                </Badge>
              </div>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                <Metric label="Router stage" value={resolution.routerStage ?? "not reported"} />
                <Metric
                  label="Router policy source"
                  value={resolution.routerSource ?? "not reported"}
                />
                <Metric
                  label="Router policy digest"
                  value={resolution.routerDigest ?? "not reported"}
                />
                <Metric
                  label="Stored policy version"
                  value={
                    resolution.storedPolicyVersion === null
                      ? "not reported"
                      : String(resolution.storedPolicyVersion)
                  }
                />
                <Metric
                  label="Stored policy digest"
                  value={resolution.storedDigest ?? "not reported"}
                />
              </div>
              {resolution.warning ? (
                <div className="mt-2">
                  <ErrorState label={resolution.warning} />
                </div>
              ) : null}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr>
                    {["Field", "Value", "Unit", "Default", "Range", "Notes"].map((header) => (
                      <th className={`pb-3 pr-3 font-normal ${monoEyebrowClassName}`} key={header}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.fields.map((field) => (
                    <tr className="border-t border-[var(--rm-border)] align-top" key={field.name}>
                      <td className="py-2 pr-3">
                        <p className={compactTitleClassName}>{field.name}</p>
                        <p className={`mt-1 ${supportingTextClassName}`}>{field.description}</p>
                      </td>
                      <td className="py-2 pr-3">
                        {field.uiEditable ? (
                          <input
                            aria-label={field.name}
                            className={fieldClassName}
                            onChange={(event) => update(field, event.target.value)}
                            value={
                              field.name in draft
                                ? String(draft[field.name])
                                : Array.isArray(field.value)
                                  ? field.value.join(",")
                                  : String(field.value ?? "")
                            }
                          />
                        ) : (
                          <span className="font-mono">{show(field.value)}</span>
                        )}
                        {validation.errors[field.name] ? (
                          <p className={`mt-1 ${supportingTextClassName}`}>
                            {validation.errors[field.name]}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 pr-3">{field.unit}</td>
                      <td className="py-2 pr-3 font-mono">{show(field.default)}</td>
                      <td className="py-2 pr-3 font-mono">{formatPolicyRange(field)}</td>
                      <td className="py-2 pr-3">
                        <Badge tone={field.uiEditable ? "neutral" : "warning"}>
                          {field.uiEditable ? "editable" : "read-only"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={primaryButtonClassName}
                disabled={busy || storedDegraded || Object.keys(validation.changes).length === 0}
                onClick={() => void save()}
                type="button"
              >
                Save policy change
              </button>
              <button
                className={secondaryButtonClassName}
                disabled={busy || view.policyVersion <= 1}
                onClick={() => void rollback()}
                type="button"
              >
                Roll back policy
              </button>
            </div>
            {/* Run 101 R10: the queue planes' own bounded parameters live beside
                the learning policy, because both are operator-owned policy. */}
            <QueuesConfigurationCard />
            <p className={`mt-2 ${supportingTextClassName}`}>
              Saving writes a new policy version with a receipt (previous/new digest, operator,
              effective time) and is rejected if another client changed the policy first
              {storedDegraded
                ? "; it is refused while the stored policy state is degraded, so a damaged file is repaired rather than overwritten."
                : "."}
            </p>
          </>
        ) : null)}
    </SectionCard>
  );
}

/** Packs: candidate/pack records, activation state and rollback actions. */
export function LearningPacksPage() {
  const { token, setToken } = useOperatorToken();
  const records = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningRecords(fetch, token || undefined, { kind: "pack" }),
    [token],
  );
  const rollout = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningRollout(fetch, token || undefined),
    [token],
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = Array.isArray(asRecord(records.value).records)
    ? (asRecord(records.value).records as readonly Record<string, unknown>[])
    : [];
  const rolloutValue = asRecord(rollout.value);
  const act = async (packId: string) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Activate ${packId}? Cohort rollout starts at the first ladder step.`)
    )
      return;
    try {
      await activateLearningPack(
        {
          scopeId: asRecord(records.value).scopeId ?? "standalone-runtime-stage",
          packId,
          policyGateId: "operator:ui",
          validationReceiptId: String(
            asRecord(asRecord(rows.find((row) => row.recordId === packId)).record)
              .validationReceiptId ?? "",
          ),
        },
        fetch,
        token || undefined,
      );
      setNotice(`Activation receipt written for ${packId}.`);
      await rollout.reload();
    } catch (activationError) {
      setError(describeOperatorWriteError(activationError));
    }
  };
  const rollback = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Roll the active pack back to the prior package?")
    )
      return;
    try {
      await rollbackLearningPack(
        {
          scopeId: rolloutValue.scopeId ?? "standalone-runtime-stage",
          reason: "operator_ui_rollback",
        },
        fetch,
        token || undefined,
      );
      setNotice("Rollback receipt written; the prior package is restored.");
      await rollout.reload();
    } catch (rollbackError) {
      setError(describeOperatorWriteError(rollbackError));
    }
  };
  const killSwitch = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Engage the kill switch? Every activation returns to the base route.")
    )
      return;
    try {
      await engageLearningKillSwitch(
        { scopeId: rolloutValue.scopeId ?? "standalone-runtime-stage" },
        fetch,
        token || undefined,
      );
      setNotice("Kill switch engaged; the scope is back on the base route.");
      await rollout.reload();
    } catch (killError) {
      setError(describeOperatorWriteError(killError));
    }
  };
  // Run 99 R28: the switch is reversible; releasing clears the flag (receipted) and leaves the
  // scope on the base route until a pack is activated again.
  const releaseKillSwitch = async () => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Release the kill switch? The scope stays on the base route until a pack is activated.",
      )
    )
      return;
    try {
      await engageLearningKillSwitch(
        { scopeId: rolloutValue.scopeId ?? "standalone-runtime-stage", engaged: false },
        fetch,
        token || undefined,
      );
      setNotice("Kill switch released; activation is allowed again.");
      await rollout.reload();
    } catch (releaseError) {
      setError(describeOperatorWriteError(releaseError));
    }
  };
  return (
    <SectionCard
      title="Learned packs"
      description="Candidate and pack records with their validation receipts, holdout evidence and activation state."
    >
      <OperatorTokenField onToken={setToken} token={token} />
      {notice ? <p className={`mt-3 ${supportingTextClassName}`}>{notice}</p> : null}
      {error ? (
        <div className="mt-3">
          <ErrorState label={error} />
        </div>
      ) : null}
      {degraded(records.loading, records.error) ??
        (rows.length === 0 ? (
          <EmptyState label="No pack records have been derived for this scope yet." />
        ) : (
          <div className="mt-4 grid gap-3">
            {rows.map((row) => {
              const record = asRecord(row.record);
              const active = rolloutValue.activePackageId === row.recordId;
              return (
                <article className={`${mutedPanelClassName} p-4`} key={String(row.recordId)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={compactTitleClassName}>{show(row.recordId)}</p>
                    <div className="flex gap-2">
                      <Badge tone={active ? "success" : "neutral"}>
                        {active ? "active" : show(row.state)}
                      </Badge>
                      <Badge tone="neutral">{show(record.priority ?? "advisory_only")}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric
                      label="Validation receipt"
                      value={show(
                        record.validationReceiptId ?? asRecord(row.identity).scorerSetVersion,
                      )}
                    />
                    <Metric label="Rollback target" value={show(record.rollbackTargetPackId)} />
                    {/* Run 98 addendum 40 audit: this is the pack's advisory-context budget
                        (`ExperiencePackCandidateV1.maxTokens`, 1-8192, default 512), not a limit on the
                        requests the router accepts. The old "Max tokens" label read as a request cap. */}
                    <Metric label="Advisory token budget" value={show(record.maxTokens)} />
                    <Metric label="Scope" value={show(row.scopeId)} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className={secondaryButtonClassName}
                      disabled={active || row.state !== "validated"}
                      onClick={() => void act(String(row.recordId))}
                      type="button"
                    >
                      Activate pack
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className={secondaryButtonClassName}
          disabled={rolloutValue.state !== "active"}
          onClick={() => void rollback()}
          type="button"
        >
          Roll back active pack
        </button>
        <button
          className={secondaryButtonClassName}
          disabled={rolloutValue.state === "disabled"}
          onClick={() => void killSwitch()}
          type="button"
        >
          Engage kill switch
        </button>
        <button
          className={secondaryButtonClassName}
          disabled={!rolloutValue.killSwitchAtMs}
          onClick={() => void releaseKillSwitch()}
          type="button"
        >
          Release kill switch
        </button>
      </div>
    </SectionCard>
  );
}

/** Decisions: filterable, paginated decision list with a receipt-chain detail view. */
export function LearningDecisionsPage() {
  const { token, setToken } = useOperatorToken();
  const [stateFilter, setStateFilter] = useState("all");
  /**
   * Run 113 (addendum 09 R11/S18): the ledger holds live routing decisions and shadow judge/replay calls. The
   * shadow rows carry no taxonomy and are `unavailable` by construction, and because they are the most recent
   * they dominated the default view - the operator saw "everything is task mismatch or not eligible". The page
   * now asks the readback for live routing decisions by default, with the shadow ledger one selection away.
   */
  const [originFilter, setOriginFilter] = useState("live");
  const decisions = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningDecisions(fetch, token || undefined, { limit: 100, origin: originFilter }),
    [token, originFilter],
  );
  const rows = Array.isArray(asRecord(decisions.value).decisions)
    ? (asRecord(decisions.value).decisions as readonly Record<string, unknown>[])
    : [];
  const filtered =
    stateFilter === "all" ? rows : rows.filter((row) => row.advisoryState === stateFilter);
  return (
    <SectionCard
      title="Decision receipts"
      description="Every observed decision with its advisory state, the counterfactual preference and the receipt chain behind it."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <OperatorTokenField onToken={setToken} token={token} />
        <label className={fieldLabelClassName}>
          Advisory state
          <select
            className={`${fieldClassName} mt-1`}
            onChange={(event) => setStateFilter(event.target.value)}
            value={stateFilter}
          >
            {["all", "fresh", "stale", "unavailable"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabelClassName}>
          Observation origin
          <select
            className={`${fieldClassName} mt-1`}
            onChange={(event) => setOriginFilter(event.target.value)}
            value={originFilter}
          >
            {["live", "shadow", "all"].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      {degraded(decisions.loading, decisions.error) ??
        (filtered.length === 0 ? (
          <EmptyState label="No decisions match this filter yet." />
        ) : (
          <div className="mt-4 grid gap-2">
            {filtered.slice(0, 50).map((row, index) => (
              <details
                className={`${mutedPanelClassName} p-3`}
                key={`${show(row.decisionId)}-${index}`}
              >
                <summary className={compactTitleClassName}>
                  {show(row.decisionId)} · {show(row.routePackage)} · {show(row.advisoryState)}
                  {" · "}
                  {show(row.mode)}
                  {row.applied === true
                    ? " · applied"
                    : row.fallbackReason
                      ? ` · ${show(row.fallbackReason)}`
                      : row.wouldHaveChanged
                        ? " · would have changed"
                        : ""}
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <Metric label="Advisory id" value={show(row.advisoryId)} />
                  <Metric label="Candidate" value={show(row.candidateId)} />
                  <Metric label="Preferred package" value={show(row.preferredRoutePackage)} />
                  <Metric label="Preferred eligible" value={show(row.preferredEligible)} />
                  <Metric label="Confidence" value={show(row.confidence)} />
                  <Metric label="Observed" value={show(row.observedAtMs)} />
                  {/* Run 98 addendum 25 §2: the row is one decision, so say how many observations
                      it stands for instead of leaving the reader to guess. */}
                  <Metric label="Observations" value={show(row.observationCount)} />
                  <Metric label="Selection" value={show(row.selection)} />
                  <Metric label="Stage" value={show(row.stage)} />
                  {/* Run 99 R33 (addendum 19 S33/S35): which task family the request belonged to,
                      and which family the advisory was scoped to. A mismatch is why an advisory
                      was refused, so it must be visible next to the fallback reason. */}
                  <Metric
                    label="Task family (request)"
                    value={row.requestTaskTypeId ? show(row.requestTaskTypeId) : "not reported"}
                  />
                  <Metric
                    label="Advisory family"
                    value={row.taskTypeId ? show(row.taskTypeId) : "not reported"}
                  />
                  {/* Run 99 close-out (addendas 19-21 S33): the role and the taxonomy identity the
                      request was classified against, published by the decisions readback. */}
                  <Metric label="Role" value={row.roleId ? show(row.roleId) : "not reported"} />
                  <Metric
                    label="Taxonomy version"
                    value={row.taxonomyVersion ? show(row.taxonomyVersion) : "not reported"}
                  />
                  <Metric
                    label="Tool classes"
                    value={
                      Array.isArray(row.toolClassIds) && row.toolClassIds.length
                        ? row.toolClassIds.join(", ")
                        : "not reported"
                    }
                  />
                  <Metric label="Fallback reason" value={show(row.fallbackReason)} />
                  {/* Run 99 R27: the in-band requirement is a different lever from the floor. */}
                  <Metric label="Score band" value={show(row.scoreBand)} />
                  <Metric label="Score gap before" value={show(row.scoreGapBefore)} />
                  <Metric label="Cohort percent" value={show(row.cohortPercent)} />
                  <Metric label="Policy version" value={show(row.policyVersion)} />
                  <Metric label="Origin" value={show(row.origin)} />
                  <Metric label="Profiles" value={show(row.profileSnapshotIds)} />
                </div>
              </details>
            ))}
            {asRecord(decisions.value).truncated ? (
              <p className={supportingTextClassName}>
                Showing the newest 50 decisions; the readback is truncated.
              </p>
            ) : null}
          </div>
        ))}
    </SectionCard>
  );
}

/** Evidence: the baseline-vs-advisory comparison behind the guardrails. */
export function LearningEvidencePage() {
  const { token, setToken } = useOperatorToken();
  const measurement = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningMeasurement(fetch, token || undefined),
    [token],
  );
  /**
   * Run 100 R6.1: the learner's own evidence - per family, against the floor, and the exclusions by
   * reason - comes from the learning summary, so this page can answer "why is evidence missing?"
   * without the operator opening a store.
   */
  const learnerSummary = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningSummary(fetch, token || undefined),
    [token],
  );
  const learnerEvidence = asRecord(asRecord(learnerSummary.value).learnerEvidence);
  const exclusionReasons = Object.entries(asRecord(learnerEvidence.excludedByReason))
    .map(([reason, count]) => ({ reason, count: Number(count) }))
    .filter((entry) => Number.isFinite(entry.count) && entry.count > 0)
    .sort((left, right) => right.count - left.count);
  const evidenceFamilies = Object.entries(asRecord(learnerEvidence.byFamily)).map(
    ([family, counts]) => ({ family, counts: asRecord(counts) }),
  );
  const evidenceFloor = asRecord(learnerEvidence.floor);
  const newestReceipt = asRecord(learnerEvidence.newest);
  const newestEvidence = asRecord(newestReceipt.familyEvidence);
  const report = Array.isArray(asRecord(measurement.value).report)
    ? (asRecord(measurement.value).report as readonly Record<string, unknown>[])[0]
    : undefined;
  const raw = asRecord(measurement.value);
  // Run 99: three honest shapes - a measurement report, an explicit "nothing recorded yet" answer,
  // and a bounded degradation receipt. Only the first may render the cohort grid.
  const noMeasurement = raw.status === "no-measurement";
  const degradedReceipt = raw.degraded === true;
  const value = noMeasurement || degradedReceipt ? {} : asRecord(report ?? measurement.value);
  const cohorts = asRecord(value.cohorts);
  const deltas = asRecord(value.deltas);
  const confidence = asRecord(value.confidence);
  const guardrails = Array.isArray(value.guardrails)
    ? (value.guardrails as readonly Record<string, unknown>[])
    : [];
  // Run 99: cost and latency are inputs this composition does not measure per arm, so the page says
  // so rather than presenting the placeholder inputs as measured zeros.
  const costLatencyMeasured = asRecord(raw.measurementInputs).costLatencyAvailable !== false;
  return (
    <div className="grid gap-4">
      <SectionCard
        title="Evidence"
        description="Baseline-versus-advisory comparison on the paired holdout distribution with the guardrail verdicts."
      >
        <OperatorTokenField onToken={setToken} token={token} />
        {degraded(measurement.loading, measurement.error) ??
          (degradedReceipt ? (
            <ErrorState
              label={`Cohort measurement unavailable: ${show(raw.reason)}. No value is fabricated.`}
            />
          ) : noMeasurement ||
            (value.schemaVersion === undefined && Object.keys(value).length === 0) ? (
            <EmptyState label="No cohort measurement has been recorded yet." />
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge
                  tone={
                    value.verdict === "pass"
                      ? "success"
                      : value.verdict === "fail"
                        ? "error"
                        : "warning"
                  }
                >
                  {show(value.verdict)}
                </Badge>
                <p className={supportingTextClassName}>{show(value.statement)}</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Paired holdout tasks" value={show(value.pairedHoldoutTasks)} />
                <Metric label="Baseline samples" value={show(asRecord(cohorts.baseline).samples)} />
                <Metric label="Advisory samples" value={show(asRecord(cohorts.advisory).samples)} />
                <Metric
                  label="Applied share"
                  value={show(asRecord(cohorts.advisory).appliedShare)}
                />
                <Metric label="Quality delta" value={show(deltas.quality)} />
                <Metric
                  label="Cost multiplier"
                  value={costLatencyMeasured ? show(deltas.costMultiplier) : "not measured here"}
                />
                <Metric
                  label="Latency p95 delta (ms)"
                  value={costLatencyMeasured ? show(deltas.latencyP95DeltaMs) : "not measured here"}
                />
                <Metric label="Error-rate delta (pp)" value={show(deltas.errorRateDeltaPp)} />
                <Metric
                  label="Quality CI"
                  value={`${show(confidence.lower)} – ${show(confidence.upper)}`}
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr>
                      {["Guardrail", "Bound", "Observed", "Verdict"].map((header) => (
                        <th
                          className={`pb-3 pr-3 font-normal ${monoEyebrowClassName}`}
                          key={header}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guardrails.map((guardrail) => (
                      <tr
                        className="border-t border-[var(--rm-border)]"
                        key={String(guardrail.metric)}
                      >
                        <td className="py-2 pr-3">{show(guardrail.metric)}</td>
                        <td className="py-2 pr-3 font-mono">{show(guardrail.bound)}</td>
                        <td className="py-2 pr-3 font-mono">{show(guardrail.observed)}</td>
                        <td className="py-2 pr-3">
                          <Badge tone={guardrail.passed ? "success" : "error"}>
                            {guardrail.passed ? "passed" : "breached"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ))}
      </SectionCard>
      <SectionCard
        title="Evidence loss by reason"
        description="Per-family evidence against the operator's floor and the learner's exclusions, read from the validation receipts the runtime recorded."
      >
        <OperatorTokenField onToken={setToken} token={token} />
        {degraded(learnerSummary.loading, learnerSummary.error) ??
          (Number(learnerEvidence.receipts ?? 0) === 0 ? (
            <EmptyState label="No learner validation receipt has been recorded yet." />
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Receipts read" value={show(learnerEvidence.receipts)} />
                <Metric label="Newest decision" value={show(newestReceipt.decision)} />
                <Metric
                  label="Newest decisive comparisons"
                  value={show(newestEvidence.decisiveComparisons)}
                />
                <Metric
                  label="Floor met"
                  value={
                    newestEvidence.floorMet === true
                      ? "yes"
                      : newestEvidence.floorMet === false
                        ? "no"
                        : show(newestEvidence.floorMet)
                  }
                />
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr>
                      {["Exclusion reason", "Count"].map((header) => (
                        <th
                          className={`pb-3 pr-3 font-normal ${monoEyebrowClassName}`}
                          key={header}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exclusionReasons.map((entry) => (
                      <tr className="border-t border-[var(--rm-border)]" key={entry.reason}>
                        <td className="py-2 pr-3 font-mono">{entry.reason}</td>
                        <td className="py-2 pr-3 font-mono">{show(entry.count)}</td>
                      </tr>
                    ))}
                    {exclusionReasons.length === 0 ? (
                      <tr className="border-t border-[var(--rm-border)]">
                        <td className={`py-2 pr-3 ${supportingTextClassName}`} colSpan={2}>
                          No exclusion was recorded in the receipts read.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {evidenceFamilies.length > 0 ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr>
                        {[
                          "Family",
                          "Decisive",
                          "Holdout",
                          "Development",
                          "Distinct captures",
                          "Floor",
                        ].map((header) => (
                          <th
                            className={`pb-3 pr-3 font-normal ${monoEyebrowClassName}`}
                            key={header}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {evidenceFamilies.map((entry) => {
                        const floorMet =
                          Number(evidenceFloor.minDecisiveComparisons ?? 0) > 0 &&
                          Number(entry.counts.decisiveComparisons ?? 0) >=
                            Number(evidenceFloor.minDecisiveComparisons ?? 0) &&
                          Number(entry.counts.distinctCaptures ?? 0) >=
                            Number(evidenceFloor.minDistinctCaptures ?? 0);
                        return (
                          <tr className="border-t border-[var(--rm-border)]" key={entry.family}>
                            <td className="py-2 pr-3 font-mono">{entry.family}</td>
                            <td className="py-2 pr-3 font-mono">
                              {show(entry.counts.decisiveComparisons)}
                            </td>
                            <td className="py-2 pr-3 font-mono">
                              {show(entry.counts.holdoutComparisons)}
                            </td>
                            <td className="py-2 pr-3 font-mono">
                              {show(entry.counts.developmentComparisons)}
                            </td>
                            <td className="py-2 pr-3 font-mono">
                              {show(entry.counts.distinctCaptures)}
                            </td>
                            <td className="py-2 pr-3">
                              <Badge tone={floorMet ? "success" : "warning"}>
                                {floorMet ? "met" : "below"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ))}
      </SectionCard>
    </div>
  );
}

/**
 * Run 99 history page: a windowed summary of the live loop - activity heat grid, the decisive
 * comparison mix with per-comparison deltas, the activation/rollback timeline and the guardrail
 * verdicts. Every panel reads the durable projection; nothing is derived in the browser.
 */
export function LearningHistoryPage() {
  const { token, setToken } = useOperatorToken();
  const history = useOperatorSurface<Record<string, unknown>>(
    () => fetchLearningHistory(fetch, token || undefined, { hours: 168, bucketHours: 6 }),
    [token],
  );
  const view = normalizeLearningHistory(history.value);
  const nowMs = Date.now();
  return (
    <div className="grid gap-4">
      <SectionCard
        title="Learning history"
        description="What the replay, evaluation and learning loop did over the window, read from durable state."
      >
        <OperatorTokenField onToken={setToken} token={token} />
        {view.available ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Window" value={`${view.windowHours}h · ${view.bucketHours}h buckets`} />
            <Metric label="Replayed" value={show(view.totals.replays)} />
            <Metric label="Refused" value={show(view.totals.refusals)} />
            <Metric label="Deferred" value={show(view.totals.deferred)} />
            <Metric label="Evaluations" value={show(view.totals.evaluations)} />
            <Metric label="Comparisons" value={show(view.totals.comparisons)} />
            <Metric label="Decisive" value={show(view.totals.decisive)} />
            <Metric label="Validations" value={show(view.totals.validations)} />
            <Metric label="Activations" value={show(view.totals.activations)} />
            <Metric label="Rollbacks" value={show(view.totals.rollbacks)} />
            <Metric label="Advisory observed" value={show(view.totals.advisoryObserved)} />
            <Metric label="Would have changed" value={show(view.totals.advisoryWouldHaveChanged)} />
          </div>
        ) : null}
      </SectionCard>
      {degraded(history.loading, history.error) ?? (
        <>
          <LearningActivityHeatmapView history={view} nowMs={nowMs} />
          <LearningComparisonMixView history={view} />
          <LearningActivationTimelineView history={view} nowMs={nowMs} />
          <LearningGuardrailListView history={view} />
        </>
      )}
    </div>
  );
}

const PAGE_FOR_PATH: Readonly<Record<string, () => ReactElement>> = {
  "/app/learning": LearningOverviewPage,
  "/app/learning/configuration": LearningConfigurationPage,
  "/app/learning/packs": LearningPacksPage,
  "/app/learning/decisions": LearningDecisionsPage,
  "/app/learning/evidence": LearningEvidencePage,
  "/app/learning/history": LearningHistoryPage,
};

export function LearningRouteView() {
  const location = useLocation();
  const Page = PAGE_FOR_PATH[location.pathname] ?? LearningOverviewPage;
  return <Page />;
}

export default LearningRouteView;
