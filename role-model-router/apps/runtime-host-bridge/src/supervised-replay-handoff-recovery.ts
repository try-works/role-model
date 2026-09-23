import { createHash } from "node:crypto";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S7 (operator goal: replays, evals and the learner
 * must actually work on the real-traffic runtime).
 *
 * Measured live on `:3457`: replay jobs appended all their branches and reached `awaiting_evaluation`, but no
 * evaluation job was ever created for them (`evaluationJobId` null on all 13 jobs of the window, no new
 * evaluation completion receipt for eleven hours). The cause is ordering: `recordBranchAppend` moves the job
 * to `evaluating`/`awaiting_evaluation` *before* the host records its resume entry and runs the evaluation
 * completer, and `claimJob` refuses a job in that state ("awaiting evaluation and cannot be re-leased"), so an
 * attempt interrupted in that window wedges the replay and its capture permanently.
 *
 * The durable job already carries everything the completion needs - its candidate packages, its baseline
 * endpoint, its source decision (which names the capture) - and the evaluation job id is a pure function of
 * the replay job id (the handoff callback derives it that way). These helpers turn a durable job into the
 * resume entry the existing sweep already knows how to complete, so a handed-off replay is recovered instead
 * of being lost.
 */

export interface DurableReplayJobSummary {
  readonly jobId?: unknown;
  readonly state?: unknown;
  readonly evaluationJobId?: unknown;
  readonly sourceDecisionId?: unknown;
  readonly baselineEndpointId?: unknown;
  readonly scope?: unknown;
  readonly candidatePackages?: unknown;
  readonly branches?: unknown;
}

const DECISION_PREFIX = "decision-";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S10 (live on `:3457`): the extension protocol
 * inlines an envelope of at most 16 KiB and refuses anything larger
 * (`frame exceeds inline limit; use a channel-local transfer artifact`) - measured when the recovery pass
 * asked replay-core for a 25-job page, each job carrying its candidate packages, branch references, dispatch
 * results and per-endpoint metric maps. The caller's page size is what has to respect that bound; this is the
 * page it asks for, and it matches the per-sweep recovery bound in the host.
 */
export const MAX_HANDOFF_RECOVERY_LIST_PAGE = 3;

/** The evaluation job id the live handoff derives from a replay job id (kept identical on purpose). */
export function evaluationJobIdForReplayJob(replayJobId: string): string {
  return `evaluation-replay-${createHash("sha256")
    .update(String(replayJobId))
    .digest("hex")
    .slice(0, 20)}`;
}

/**
 * The capture a replay job was built from. The host records the source decision as `decision-<captureRef>`,
 * and the capture ref is also the replay command's request id (which names the branch captures), so this one
 * field carries both.
 */
export function captureRefFromReplayJob(job: DurableReplayJobSummary): string | null {
  const decisionId = typeof job.sourceDecisionId === "string" ? job.sourceDecisionId.trim() : "";
  if (!decisionId.startsWith(DECISION_PREFIX)) return null;
  const captureRef = decisionId.slice(DECISION_PREFIX.length).trim();
  return captureRef.length > 0 ? captureRef : null;
}

/**
 * A job is recoverable when it has handed its branches to evaluation (`awaiting_evaluation`/`evaluating`),
 * carries no evaluation job id yet, and names its source capture. A job that already carries an evaluation
 * job id was handed off successfully (its evaluation exists and the ordinary resume path covers it).
 */
export function isRecoverableHandoff(job: DurableReplayJobSummary): boolean {
  const state = typeof job.state === "string" ? job.state : "";
  if (state !== "awaiting_evaluation" && state !== "evaluating") return false;
  if (typeof job.evaluationJobId === "string" && job.evaluationJobId.length > 0) return false;
  if (typeof job.jobId !== "string" || job.jobId.length === 0) return false;
  return captureRefFromReplayJob(job) !== null;
}

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S14 (measured on the real-traffic root: **254**
 * replay jobs carried an `evaluationJobId` whose evaluation job does not exist in Evaluation Core at all).
 *
 * A handoff records the evaluation job id it intends to create and then the completing attempt is
 * interrupted, so the replay job keeps the id while Evaluation Core never sees the job. `claimJob` refuses a
 * job in that state ("awaiting evaluation and cannot be re-leased") and the S7 discovery, which looks for
 * handoffs *without* an id, skips exactly these. The completion now creates a missing evaluation from durable
 * evidence, so these are recoverable whenever the job still carries the branches that paid for it.
 */
export function isUnevaluatedHandoff(job: DurableReplayJobSummary): boolean {
  const state = typeof job.state === "string" ? job.state : "";
  if (!["awaiting_evaluation", "evaluating", "failed", "timed_out"].includes(state)) return false;
  if (typeof job.jobId !== "string" || job.jobId.length === 0) return false;
  if (typeof job.evaluationJobId !== "string" || job.evaluationJobId.length === 0) return false;
  if (!Array.isArray(job.branches) || job.branches.length === 0) return false;
  return captureRefFromReplayJob(job) !== null;
}

/** The evaluation job id a durable replay job already carries, when it has one. */
export function carriedEvaluationJobId(job: DurableReplayJobSummary): string | null {
  return typeof job.evaluationJobId === "string" && job.evaluationJobId.trim()
    ? job.evaluationJobId.trim()
    : null;
}

/** Bounded discovery for the unevaluated-handoff pass, in the caller's order. */
export function selectUnevaluatedHandoffs(
  jobs: readonly DurableReplayJobSummary[],
  limit: number,
): readonly DurableReplayJobSummary[] {
  const bound = Number.isSafeInteger(limit) && limit > 0 ? limit : 3;
  return jobs.filter(isUnevaluatedHandoff).slice(0, bound);
}

/** Bounded discovery: a sweep recovers at most `limit` handoffs, oldest work first is the caller's order. */
export function selectRecoverableHandoffs(
  jobs: readonly DurableReplayJobSummary[],
  limit: number,
): readonly DurableReplayJobSummary[] {
  const bound = Number.isSafeInteger(limit) && limit > 0 ? limit : 3;
  return jobs.filter(isRecoverableHandoff).slice(0, bound);
}

export interface RecoveredHandoffEntry {
  readonly replayJobId: string;
  readonly evaluationJobId: string;
  readonly requestId: string;
  readonly sourceCaptureRequestId: string;
  readonly sourceEndpointId: string;
  readonly sourceModelId: string;
  readonly counterfactualPackages: readonly {
    readonly endpointId: string;
    readonly modelId: string;
    readonly reasoningEffort: string | null;
  }[];
  readonly scope: string | null;
}

/**
 * The resume entry for a handed-off replay. Only the fields the completion cannot re-derive are carried; the
 * completer prefers the durable source capture and branch captures for everything else.
 */
export function recoveredHandoffEntry(
  job: DurableReplayJobSummary,
  options: { readonly scopeFallback?: string | null } = {},
): RecoveredHandoffEntry | null {
  // Run 100 addendum 04 S14: an unevaluated handoff (the job already carries the evaluation job id its
  // interrupted attempt never created) is recovered through the same entry shape.
  if (!isRecoverableHandoff(job) && !isUnevaluatedHandoff(job)) return null;
  const replayJobId = String(job.jobId);
  const captureRef = captureRefFromReplayJob(job);
  if (!captureRef) return null;
  const packages = Array.isArray(job.candidatePackages) ? job.candidatePackages : [];
  const counterfactualPackages = packages
    .map((candidate) => {
      const row =
        candidate && typeof candidate === "object" && !Array.isArray(candidate)
          ? (candidate as Record<string, unknown>)
          : {};
      const endpointId = typeof row.endpointId === "string" ? row.endpointId.trim() : "";
      if (!endpointId) return null;
      return {
        endpointId,
        modelId: typeof row.modelId === "string" ? row.modelId : "",
        reasoningEffort:
          typeof row.reasoningEffort === "string" && row.reasoningEffort
            ? row.reasoningEffort
            : null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  if (counterfactualPackages.length === 0) return null;
  const scope =
    typeof job.scope === "string" && job.scope.trim()
      ? job.scope.trim()
      : typeof options.scopeFallback === "string" && options.scopeFallback.trim()
        ? options.scopeFallback.trim()
        : null;
  return {
    replayJobId,
    evaluationJobId: carriedEvaluationJobId(job) ?? evaluationJobIdForReplayJob(replayJobId),
    // The replay command's request id is the capture ref; the branch captures are named from it.
    requestId: captureRef,
    sourceCaptureRequestId: captureRef,
    sourceEndpointId:
      typeof job.baselineEndpointId === "string" ? job.baselineEndpointId : "",
    // The durable source capture carries the model id; the completion reads it from there.
    sourceModelId: "",
    counterfactualPackages,
    scope,
  };
}
