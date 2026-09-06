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
  type RuntimeOperatorStatus,
  cancelEvaluationJob,
  cancelReplayJob,
  fetchLearningState,
  fetchOperatorStatus,
  listEvaluationJobs,
  listReplayJobs,
  retryEvaluationJob,
  rollbackLearning,
  updateLearningMode,
} from "../lib/runtime-api";

const availabilityTone = (
  value: RuntimeOperatorAvailability | undefined,
): "success" | "warning" | "error" | "neutral" => {
  if (value === "available") return "success";
  if (value === "degraded" || value === "unobserved") return "warning";
  if (value === "blocked") return "error";
  return "neutral";
};

const readDisplayValue = (value: unknown): string => {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "—";
};

function JobTable({
  label,
  jobs,
  busy,
  onCancel,
  onRetry,
}: {
  label: string;
  jobs: readonly RuntimeOperatorJob[];
  busy: boolean;
  onCancel?: (job: RuntimeOperatorJob) => void;
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
                  {onRetry ? (
                    <button
                      className={secondaryButtonClassName}
                      disabled={busy}
                      onClick={() => onRetry(job)}
                      type="button"
                    >
                      Retry
                    </button>
                  ) : null}
                  {onCancel ? (
                    <button
                      className={secondaryButtonClassName}
                      disabled={busy}
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
  const [replayJobs, setReplayJobs] = useState<readonly RuntimeOperatorJob[]>([]);
  const [evaluationJobs, setEvaluationJobs] = useState<readonly RuntimeOperatorJob[]>([]);
  const [learning, setLearning] = useState<Record<string, unknown> | null>(null);
  const [mode, setMode] = useState("shadow");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const [nextStatus, replay, evaluation, nextLearning] = await Promise.all([
        fetchOperatorStatus(fetch, operatorToken || undefined),
        listReplayJobs(fetch, operatorToken || undefined, { limit: 25 }),
        listEvaluationJobs(fetch, operatorToken || undefined, { limit: 25 }),
        fetchLearningState(fetch, operatorToken || undefined),
      ]);
      setStatus(nextStatus);
      setReplayJobs(replay.jobs);
      setEvaluationJobs(evaluation.jobs);
      setLearning(nextLearning as Record<string, unknown>);
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

  const runAction = useCallback(async (label: string, action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setNotice(`${label} completed. Reload to inspect the durable result.`);
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(status.capabilities).map(([capability, availability]) => (
              <div
                className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-[var(--rm-border)] px-3 py-2"
                key={capability}
              >
                <span
                  className="min-w-0 truncate font-mono text-xs text-[var(--rm-fg)]"
                  translate="no"
                >
                  {capability}
                </span>
                <Badge tone={availabilityTone(availability)}>{availability ?? "unobserved"}</Badge>
              </div>
            ))}
          </div>
          {status.reason ? (
            <p className={`mt-3 ${supportingTextClassName}`}>{status.reason}</p>
          ) : null}
        </SectionCard>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Replay Jobs"
          description="Review live replay work. Cancelling a job requires confirmation."
        >
          <JobTable
            busy={busy}
            jobs={replayJobs}
            label="Replay jobs"
            onCancel={(job) => {
              if (confirmAction(`Cancel replay job ${job.jobId}? This cannot be undone.`)) {
                void runAction("Replay cancellation", () =>
                  cancelReplayJob(job.jobId, fetch, operatorToken || undefined),
                );
              }
            }}
          />
        </SectionCard>
        <SectionCard
          title="Evaluation Jobs"
          description="Retry or cancel bounded evaluation work with confirmation for cancellation."
        >
          <JobTable
            busy={busy}
            jobs={evaluationJobs}
            label="Evaluation jobs"
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
              disabled={busy}
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
              disabled={busy}
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
                    {readDisplayValue(value)}
                  </dd>
                </div>
              ))}
          </dl>
        ) : (
          <EmptyState label="Load operator state to inspect shadow-learning status." />
        )}
      </SectionCard>
    </div>
  );
}
