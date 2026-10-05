import { useCallback, useState } from "react";

import { Badge, EmptyState, ErrorState, SectionCard } from "../components/page-primitives";
import {
  bodyStrongTextClassName,
  fieldClassName,
  fieldLabelClassName,
  monoEyebrowClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import {
  type RuntimeOperatorAvailability,
  type RuntimeOperatorJob,
  type RuntimeOperatorResult,
  type RuntimeOperatorStatus,
  cancelEvaluationJob,
  cancelReplayJob,
  createReplayJob,
  fetchEvaluationComparisons,
  fetchEvaluationGroups,
  fetchEvaluationJob,
  fetchEvaluationScorers,
  fetchEvaluationTrials,
  fetchLearningAdvisory,
  fetchLearningProfile,
  fetchLearningState,
  fetchOperatorStatus,
  fetchOperatorTraceRoots,
  fetchReplayJob,
  fetchReplayResults,
  listEvaluationJobs,
  listReplayJobs,
  retryEvaluationJob,
  rollbackLearning,
  updateLearningMode,
} from "../lib/runtime-api";

export const availabilityTone = (
  value: RuntimeOperatorAvailability | undefined,
): "success" | "warning" | "error" | "neutral" => {
  if (value === "available") return "success";
  if (
    value === "degraded" ||
    value === "unobserved" ||
    value === "maintenance" ||
    value === "pressure" ||
    value === "stale"
  )
    return "warning";
  if (value === "blocked") return "error";
  return "neutral";
};

const SENSITIVE_OPERATOR_KEY =
  /(?:secret|token|password|credential|api[-_]?key|authorization|cookie|header|prompt|transcript|content|body|input|output|message|response)/i;

const redactOperatorValue = (value: unknown, key?: string): unknown => {
  if (key && SENSITIVE_OPERATOR_KEY.test(key)) return "[redacted]";
  if (Array.isArray(value)) return value.map((item) => redactOperatorValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactOperatorValue(entryValue, entryKey),
      ]),
    );
  }
  return value;
};

const readDisplayValue = (value: unknown, key?: string): string => {
  const safeValue = redactOperatorValue(value, key);
  if (
    typeof safeValue === "string" ||
    typeof safeValue === "number" ||
    typeof safeValue === "boolean"
  ) {
    return String(safeValue);
  }
  return "—";
};

const readPayload = (value: unknown): string => {
  if (value === null || value === undefined) return "—";
  const safeValue = redactOperatorValue(value);
  if (typeof safeValue === "string") return safeValue;
  try {
    return JSON.stringify(safeValue, null, 2);
  } catch {
    return "Unable to display this operator payload.";
  }
};

const capabilityIsAvailable = (
  status: RuntimeOperatorStatus | null,
  capability: keyof RuntimeOperatorStatus["capabilities"],
): boolean => status?.capabilities?.[capability] === "available";

export function OperatorCapabilityStatus({
  capabilities,
  reasons,
}: {
  capabilities: Readonly<Record<string, RuntimeOperatorAvailability | undefined>>;
  reasons?: Readonly<Record<string, string>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Object.entries(capabilities).map(([capability, availability]) => {
        const reason = reasons?.[capability];
        return (
          <div
            className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-[var(--rm-border)] px-3 py-2"
            key={capability}
          >
            <span className="min-w-0 truncate font-mono text-xs text-[var(--rm-fg)]" translate="no">
              {capability}
            </span>
            <div className="flex min-w-0 flex-col items-end gap-1">
              <Badge tone={availabilityTone(availability)}>{availability ?? "unobserved"}</Badge>
              {reason ? (
                <span className="max-w-48 truncate text-[10px] text-[var(--rm-secondary)]">
                  {reason}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EvidencePanel({ label, payload }: { label: string; payload: unknown }) {
  return (
    <div className="rounded-md border border-[var(--rm-border)] bg-[var(--rm-surface)] p-3">
      <div className={monoEyebrowClassName}>{label}</div>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-[var(--rm-secondary)]">
        {readPayload(payload)}
      </pre>
    </div>
  );
}

function JobTable({
  label,
  jobs,
  busy,
  capabilityAvailable,
  onCancel,
  onInspect,
  onRetry,
}: {
  label: string;
  jobs: readonly RuntimeOperatorJob[];
  busy: boolean;
  capabilityAvailable: boolean;
  onCancel?: (job: RuntimeOperatorJob) => void;
  onInspect?: (job: RuntimeOperatorJob) => void;
  onRetry?: (job: RuntimeOperatorJob) => void;
}) {
  if (jobs.length === 0)
    return <EmptyState label={`No ${label.toLowerCase()} recorded for this operator session.`} />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-[var(--rm-border)] text-muted-foreground">
          <tr>
            <th className="px-2 py-2 font-medium">Job</th>
            <th className="px-2 py-2 font-medium">Status</th>
            <th className="px-2 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.slice(0, 25).map((job) => (
            <tr key={job.jobId} className="border-b border-[var(--rm-border)]/70 last:border-b-0">
              <td
                className="min-w-0 break-all px-2 py-3 font-mono text-[11px] text-[var(--rm-fg)]"
                translate="no"
              >
                {job.jobId}
              </td>
              <td className="px-2 py-3">
                <Badge
                  tone={job.status === "failed" || job.status === "cancelled" ? "error" : "neutral"}
                >
                  {job.status}
                </Badge>
              </td>
              <td className="px-2 py-3 text-right">
                <div className="flex flex-wrap justify-end gap-2">
                  {onInspect ? (
                    <button
                      className={secondaryButtonClassName}
                      disabled={busy || !capabilityAvailable}
                      onClick={() => onInspect(job)}
                      type="button"
                    >
                      Inspect
                    </button>
                  ) : null}
                  {onRetry ? (
                    <button
                      className={secondaryButtonClassName}
                      disabled={busy || !capabilityAvailable}
                      onClick={() => onRetry(job)}
                      type="button"
                    >
                      Retry
                    </button>
                  ) : null}
                  {onCancel ? (
                    <button
                      className={secondaryButtonClassName}
                      disabled={busy || !capabilityAvailable}
                      onClick={() => onCancel(job)}
                      type="button"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OperatorControlsRoute() {
  const [operatorToken, setOperatorToken] = useState("");
  const [status, setStatus] = useState<RuntimeOperatorStatus | null>(null);
  const [traceRoots, setTraceRoots] = useState<RuntimeOperatorResult | null>(null);
  const [replayJobs, setReplayJobs] = useState<readonly RuntimeOperatorJob[]>([]);
  const [replayDetail, setReplayDetail] = useState<RuntimeOperatorResult | null>(null);
  const [replayResults, setReplayResults] = useState<RuntimeOperatorResult | null>(null);
  const [evaluationJobs, setEvaluationJobs] = useState<readonly RuntimeOperatorJob[]>([]);
  const [evaluationDetail, setEvaluationDetail] = useState<RuntimeOperatorResult | null>(null);
  const [evaluationEvidence, setEvaluationEvidence] = useState<{
    trials: RuntimeOperatorResult | null;
    scorers: RuntimeOperatorResult | null;
    comparisons: RuntimeOperatorResult | null;
    groups: RuntimeOperatorResult | null;
  } | null>(null);
  const [learning, setLearning] = useState<Record<string, unknown> | null>(null);
  const [learningProfile, setLearningProfile] = useState<RuntimeOperatorResult | null>(null);
  const [learningAdvisory, setLearningAdvisory] = useState<RuntimeOperatorResult | null>(null);
  const [mode, setMode] = useState("shadow");
  const [replayTraceRootId, setReplayTraceRootId] = useState("");
  const [replayBudget, setReplayBudget] = useState("25");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionReceipt, setActionReceipt] = useState<RuntimeOperatorResult | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    setActionReceipt(null);
    try {
      const [nextStatus, trace, replay, evaluation, nextLearning, profile, advisory] =
        await Promise.all([
          fetchOperatorStatus(fetch, operatorToken || undefined),
          fetchOperatorTraceRoots(fetch, operatorToken || undefined, { limit: 25 }).catch(
            () => null,
          ),
          listReplayJobs(fetch, operatorToken || undefined, { limit: 25 }),
          listEvaluationJobs(fetch, operatorToken || undefined, { limit: 25 }),
          fetchLearningState(fetch, operatorToken || undefined),
          fetchLearningProfile(fetch, operatorToken || undefined).catch(() => null),
          fetchLearningAdvisory(fetch, operatorToken || undefined).catch(() => null),
        ]);
      setStatus(nextStatus);
      setTraceRoots(trace);
      setReplayJobs(replay.jobs);
      setEvaluationJobs(evaluation.jobs);
      setLearning(nextLearning as Record<string, unknown>);
      setLearningProfile(profile);
      setLearningAdvisory(advisory);
      setNotice("Loaded current operator state.");
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "Could not load operator state. Check the access token and runtime readiness.",
      );
    } finally {
      setBusy(false);
    }
  }, [operatorToken]);

  const inspectReplay = useCallback(
    async (job: RuntimeOperatorJob) => {
      setBusy(true);
      setError(null);
      try {
        const [detail, results] = await Promise.all([
          fetchReplayJob(job.jobId, fetch, operatorToken || undefined),
          fetchReplayResults(job.jobId, fetch, operatorToken || undefined),
        ]);
        setReplayDetail(detail);
        setReplayResults(results);
        setNotice(`Loaded replay budget and results for ${job.jobId}.`);
      } catch (value) {
        setError(value instanceof Error ? value.message : "Replay inspection failed.");
      } finally {
        setBusy(false);
      }
    },
    [operatorToken],
  );

  const inspectEvaluation = useCallback(
    async (job: RuntimeOperatorJob) => {
      setBusy(true);
      setError(null);
      try {
        const [detail, trials, scorers, comparisons, groups] = await Promise.all([
          fetchEvaluationJob(job.jobId, fetch, operatorToken || undefined),
          fetchEvaluationTrials(job.jobId, fetch, operatorToken || undefined),
          fetchEvaluationScorers(job.jobId, fetch, operatorToken || undefined),
          fetchEvaluationComparisons(job.jobId, fetch, operatorToken || undefined),
          fetchEvaluationGroups(job.jobId, fetch, operatorToken || undefined),
        ]);
        setEvaluationDetail(detail);
        setEvaluationEvidence({ trials, scorers, comparisons, groups });
        setNotice(`Loaded evaluation trials and evidence for ${job.jobId}.`);
      } catch (value) {
        setError(value instanceof Error ? value.message : "Evaluation inspection failed.");
      } finally {
        setBusy(false);
      }
    },
    [operatorToken],
  );

  const runAction = useCallback(async (label: string, action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    setActionReceipt(null);
    try {
      const result = await action();
      setActionReceipt(
        result && typeof result === "object" && !Array.isArray(result)
          ? (result as RuntimeOperatorResult)
          : null,
      );
      setNotice(`${label} completed. Inspect the sanitized receipt below.`);
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : `${label} failed. Reload operator state before retrying.`,
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const confirmAction = (message: string): boolean => window.confirm(message);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Operator Controls"
        description="Inspect bounded replay, evaluation, and shadow-learning state. The access token stays only in this browser component and is never stored."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className={fieldLabelClassName} htmlFor="operator-access-token">
              Operator access token
            </label>
            <input
              autoComplete="off"
              className={`${fieldClassName} mt-1 w-full focus-visible:ring focus-visible:ring-[var(--rm-focus)]`}
              id="operator-access-token"
              name="operator-access-token"
              onChange={(event) => setOperatorToken(event.target.value)}
              placeholder="Paste a local operator token…"
              spellCheck={false}
              type="password"
              value={operatorToken}
            />
          </div>
          <button
            className={primaryButtonClassName}
            disabled={busy}
            onClick={() => void load()}
            type="button"
          >
            {busy ? "Loading…" : "Load Operator State"}
          </button>
        </div>
        <p className={`mt-3 ${supportingTextClassName}`}>
          This page does not enable production learning. Learning actions remain shadow-only and the
          runtime is the source of truth.
        </p>
        {notice ? (
          <p aria-live="polite" className="mt-3 text-sm text-[var(--rm-success)]">
            {notice}
          </p>
        ) : null}
      </SectionCard>

      {error ? <ErrorState label={error} /> : null}

      {status ? (
        <SectionCard
          title="Operator Capability Status"
          description="Availability is reported separately for each control-plane capability."
        >
          <OperatorCapabilityStatus capabilities={status.capabilities} reasons={status.reasons} />
          {status.reason ? (
            <p className={`mt-3 ${supportingTextClassName}`}>{status.reason}</p>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard
        title="Trace lineage"
        description="Trace roots, generations, branches, and completeness are read from the runtime authority; missing evidence remains visibly unavailable."
      >
        {traceRoots ? (
          <EvidencePanel label="Trace roots and completeness" payload={traceRoots} />
        ) : (
          <EmptyState label="Trace-root inspection is unavailable or has not been observed yet." />
        )}
        <p className={`mt-3 ${supportingTextClassName}`}>
          Replay and evaluation operations below preserve the trace root identity instead of
          inferring lineage from a job label.
        </p>
      </SectionCard>

      {actionReceipt ? (
        <SectionCard
          title="Last operator receipt"
          description="The runtime result is shown with secrets and raw content recursively redacted."
        >
          <EvidencePanel label="Sanitized action receipt" payload={actionReceipt} />
        </SectionCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Replay Jobs"
          description="Review live replay work. Cancelling a job requires confirmation."
        >
          <div className="mb-4 grid gap-3 rounded-md border border-[var(--rm-border)] p-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
            <div>
              <label className={fieldLabelClassName} htmlFor="replay-trace-root">
                Trace root id
              </label>
              <input
                className={`${fieldClassName} mt-1 w-full focus-visible:ring focus-visible:ring-[var(--rm-focus)]`}
                id="replay-trace-root"
                onChange={(event) => setReplayTraceRootId(event.target.value)}
                placeholder="trace-root…"
                spellCheck={false}
                value={replayTraceRootId}
              />
            </div>
            <div>
              <label className={fieldLabelClassName} htmlFor="replay-budget">
                Max requests
              </label>
              <input
                className={`${fieldClassName} mt-1 w-full focus-visible:ring focus-visible:ring-[var(--rm-focus)]`}
                id="replay-budget"
                min="1"
                onChange={(event) => setReplayBudget(event.target.value)}
                type="number"
                value={replayBudget}
              />
            </div>
            <button
              className={secondaryButtonClassName}
              disabled={
                busy ||
                !capabilityIsAvailable(status, "replay") ||
                replayTraceRootId.trim().length === 0
              }
              onClick={() =>
                void runAction("Replay creation", () =>
                  createReplayJob(
                    {
                      traceRootId: replayTraceRootId.trim(),
                      budget: { maxRequests: Math.max(1, Number(replayBudget) || 1) },
                    },
                    fetch,
                    operatorToken || undefined,
                  ),
                )
              }
              type="button"
            >
              Create Replay
            </button>
          </div>
          <JobTable
            busy={busy}
            capabilityAvailable={capabilityIsAvailable(status, "replay")}
            jobs={replayJobs}
            label="Replay jobs"
            onInspect={(job) => void inspectReplay(job)}
            onCancel={(job) => {
              if (confirmAction(`Cancel replay job ${job.jobId}? This cannot be undone.`)) {
                void runAction("Replay cancellation", () =>
                  cancelReplayJob(job.jobId, fetch, operatorToken || undefined),
                );
              }
            }}
          />
          {replayDetail || replayResults ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {replayDetail ? (
                <EvidencePanel label="Replay budget and status" payload={replayDetail} />
              ) : null}
              {replayResults ? (
                <EvidencePanel label="Replay results" payload={replayResults} />
              ) : null}
            </div>
          ) : null}
        </SectionCard>
        <SectionCard
          title="Evaluation Jobs"
          description="Retry or cancel bounded evaluation work with confirmation for cancellation."
        >
          <JobTable
            busy={busy}
            capabilityAvailable={capabilityIsAvailable(status, "evaluation")}
            jobs={evaluationJobs}
            label="Evaluation jobs"
            onInspect={(job) => void inspectEvaluation(job)}
            onCancel={(job) => {
              if (confirmAction(`Cancel evaluation job ${job.jobId}? This cannot be undone.`)) {
                void runAction("Evaluation cancellation", () =>
                  cancelEvaluationJob(job.jobId, fetch, operatorToken || undefined),
                );
              }
            }}
            onRetry={(job) =>
              void runAction("Evaluation retry", () =>
                retryEvaluationJob(job.jobId, fetch, operatorToken || undefined),
              )
            }
          />
          {evaluationDetail || evaluationEvidence ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {evaluationDetail ? (
                <EvidencePanel
                  label="Evaluation job and score summary"
                  payload={evaluationDetail}
                />
              ) : null}
              {evaluationEvidence ? (
                <>
                  <EvidencePanel label="Trials" payload={evaluationEvidence.trials} />
                  <EvidencePanel label="Scorers" payload={evaluationEvidence.scorers} />
                  <EvidencePanel label="Comparisons" payload={evaluationEvidence.comparisons} />
                  <EvidencePanel label="Groups" payload={evaluationEvidence.groups} />
                </>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      </div>

      <SectionCard
        title="Shadow Learning"
        description="Learning output is advisory. Mode changes and rollback never directly alter production routing."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className={fieldLabelClassName} htmlFor="shadow-learning-mode">
              Learning mode
            </label>
            <select
              className={`${fieldClassName} mt-1 w-full focus-visible:ring focus-visible:ring-[var(--rm-focus)]`}
              id="shadow-learning-mode"
              name="shadow-learning-mode"
              onChange={(event) => setMode(event.target.value)}
              value={mode}
            >
              <option value="disabled">Disabled</option>
              <option value="shadow">Shadow</option>
              <option value="advisory">Advisory</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={secondaryButtonClassName}
              disabled={busy || !capabilityIsAvailable(status, "learning")}
              onClick={() =>
                void runAction("Learning mode update", () =>
                  updateLearningMode({ mode }, fetch, operatorToken || undefined),
                )
              }
              type="button"
            >
              Update Mode
            </button>
            <button
              className={secondaryButtonClassName}
              disabled={busy || !capabilityIsAvailable(status, "learning")}
              onClick={() => {
                if (
                  confirmAction(
                    "Roll back the current shadow-learning state? This does not change production routing.",
                  )
                ) {
                  void runAction("Learning rollback", () =>
                    rollbackLearning({}, fetch, operatorToken || undefined),
                  );
                }
              }}
              type="button"
            >
              Roll Back Shadow State
            </button>
          </div>
        </div>
        {learning ? (
          <dl className="mt-5 grid gap-3 border-t border-[var(--rm-border)] pt-4 sm:grid-cols-2">
            {Object.entries(learning)
              .slice(0, 8)
              .map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className={monoEyebrowClassName}>{key}</dt>
                  <dd className={`${bodyStrongTextClassName} mt-1 break-all`}>
                    {readDisplayValue(value, key)}
                  </dd>
                </div>
              ))}
          </dl>
        ) : (
          <EmptyState label="Load operator state to inspect shadow-learning status." />
        )}
        <div className="mt-5 grid gap-3 border-t border-[var(--rm-border)] pt-4 lg:grid-cols-2">
          {learningProfile ? (
            <EvidencePanel label="Profile confidence" payload={learningProfile} />
          ) : (
            <EmptyState label="Learning profile is unavailable or unobserved." />
          )}
          {learningAdvisory ? (
            <EvidencePanel label="Advisory confidence and reason" payload={learningAdvisory} />
          ) : (
            <EmptyState label="Learning advisory is unavailable or unobserved." />
          )}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rm-border)] pt-4">
          <p className={supportingTextClassName}>
            Extension health and storage retention remain runtime-owned capabilities; inspect their
            status above before taking action.
          </p>
          <a className={secondaryButtonClassName} href="/app/system/storage-retention">
            Open Storage &amp; Retention
          </a>
        </div>
      </SectionCard>
    </div>
  );
}
