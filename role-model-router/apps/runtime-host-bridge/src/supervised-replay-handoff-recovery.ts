import { createHash } from "node:crypto";
import { replayDispatchCaptureToken } from "./track-b-auto-replay.js";
import { extractCaptureOutputText } from "./track-b-replay-evaluation-criteria.js";

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
  /**
   * S18c: the summary projection carries the branch *count* rather than the branch records, so a pass that
   * pages with `replay:list-jobs` can still tell whether the job holds evidence to compare.
   */
  readonly branchCount?: unknown;
}

const DECISION_PREFIX = "decision-";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S10 (live on `:3457`): the extension protocol
 * inlines an envelope of at most 16 KiB and refuses anything larger
 * (`frame exceeds inline limit; use a channel-local transfer artifact`) - measured when the recovery pass
 * asked replay-core for a 25-job page, each job carrying its candidate packages, branch references, dispatch
 * results and per-endpoint metric maps. The caller's page size is what has to respect that bound; this is the
 * page it asks for. Run 100 addendum `handoff-evidence-durability.addendum-06` S24 re-derived the page from
 * the *summary* projection the listing returns now (measured at 319 bytes per job on the live store, against
 * the 16 KiB inline frame plus a 4 KiB envelope allowance), and decoupled it from the per-sweep recovery
 * bound so the scan can advance without paying for more recoveries per tick.
 */
export const MAX_HANDOFF_RECOVERY_LIST_PAGE = 24;

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S24: how many durable jobs of a recovery page one
 * sweep may check against Evaluation Core. The page decides how far the scan can advance; this bound decides
 * how much cross-boundary work a single tick pays for, so neither is derived from the other.
 */
export const MAX_HANDOFF_RECOVERY_CHECKS_PER_SWEEP = 12;

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S24: where the next recovery sweep resumes.
 *
 * The terminal recovery page used to be a fixed window: every sweep asked for the same three jobs, found that
 * all three already had their evaluation, and counted three `skipped` for ever, so the pass could never reach
 * the handoffs that genuinely need it (512 terminal jobs carry an evaluation id on the live root, 262 of them
 * have no evaluation at all). Jobs are listed in `jobId` order, which is stable, so the id of the last job a
 * sweep examined is a valid cursor. A short page means the end of the set: the next pass starts over, which is
 * how work that appeared behind the cursor is picked up.
 */
export function nextHandoffRecoveryCursor(input: {
  readonly currentCursor: string | null;
  readonly pageJobIds: readonly string[];
  readonly examinedCount: number;
  readonly pageSize: number;
}): string | null {
  if (input.examinedCount <= 0) return input.currentCursor;
  if (input.pageJobIds.length < input.pageSize) return null;
  return input.pageJobIds[input.examinedCount - 1] ?? input.currentCursor;
}

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
  const branchCount =
    Number.isSafeInteger(job.branchCount) && (job.branchCount as number) >= 0
      ? Number(job.branchCount)
      : Array.isArray(job.branches)
        ? job.branches.length
        : 0;
  if (branchCount === 0) return false;
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

/**
 * Run 100 addendum `replay-evaluation-spine-repair.addendum-05` S18 (live on `:3457`, immediately after the
 * renewal started re-driving handoffs):
 *
 *   `durable replay evaluation has no recorded counterfactual branch to evaluate`
 *
 * The resume completion re-derived each arm's branch-capture request id from the replay job and the candidate
 * (`replay-<requestId>-<hash(job, candidate)>-branch`). Addendum 04 S9 made the dispatch capture
 * attempt-scoped - its id now includes the dispatch nonce - so the derived name no longer exists and every
 * renewed handoff failed with "no recorded counterfactual branch". The durable job itself names the capture
 * each arm wrote: its dispatch receipt carries `providerResultRef` (`route-capture:<replayRequestId>`), and
 * the branch capture is `<replayRequestId>-branch`. The completion must read that, with the old derivation
 * kept only as the fallback for jobs written before the receipt existed.
 */
export function branchCaptureRequestIdsFromJob(input: {
  readonly replayJobId: string;
  readonly requestId: string;
  readonly dispatches?: unknown;
  readonly candidateEndpointIds: readonly string[];
}): Map<string, string> {
  const dispatches =
    input.dispatches && typeof input.dispatches === "object" && !Array.isArray(input.dispatches)
      ? (input.dispatches as Record<string, unknown>)
      : {};
  const resolved = new Map<string, string>();
  for (const candidateEndpointId of input.candidateEndpointIds) {
    const dispatch =
      dispatches[candidateEndpointId] &&
      typeof dispatches[candidateEndpointId] === "object" &&
      !Array.isArray(dispatches[candidateEndpointId])
        ? (dispatches[candidateEndpointId] as Record<string, unknown>)
        : null;
    const result =
      dispatch?.result && typeof dispatch.result === "object" && !Array.isArray(dispatch.result)
        ? (dispatch.result as Record<string, unknown>)
        : null;
    /**
     * S18b: the append records the capture it wrote, so this is the first source - it is the link that
     * survives a retried arm (whose dispatch receipt may be absent) and the attempt-scoped naming of S9.
     */
    const recordedBranchRequestId =
      typeof result?.branchRequestId === "string" ? result.branchRequestId.trim() : "";
    if (recordedBranchRequestId) {
      resolved.set(candidateEndpointId, recordedBranchRequestId);
      continue;
    }
    const providerResultRef =
      typeof result?.providerResultRef === "string" ? result.providerResultRef.trim() : "";
    const replayRequestId = providerResultRef.startsWith("route-capture:")
      ? providerResultRef.slice("route-capture:".length).trim()
      : "";
    if (replayRequestId) {
      resolved.set(candidateEndpointId, `${replayRequestId}-branch`);
      continue;
    }
    // Legacy shape: the id the producer derived before the dispatch capture became attempt-scoped.
    resolved.set(
      candidateEndpointId,
      `replay-${input.requestId}-${replayDispatchCaptureToken({
        replayJobId: input.replayJobId,
        candidateEndpointId,
        dispatchNonce: null,
      })}-branch`,
    );
  }
  return resolved;
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
    sourceEndpointId: typeof job.baselineEndpointId === "string" ? job.baselineEndpointId : "",
    // The durable source capture carries the model id; the completion reads it from there.
    sourceModelId: "",
    counterfactualPackages,
    scope,
  };
}

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S21.
 *
 * The resumed completion turned each arm's branch capture into evidence with an inline test that accepted
 * only a *string* `response.content` or a string `outputText`, and `continue`d on everything else. Measured
 * on the real-traffic root: 13 handoffs whose arm captures are all present, named, and readable through the
 * boundary's documented readback still produced
 * `durable replay evaluation has no recorded counterfactual branch to evaluate` - the arms were dropped, and
 * the job then claimed durable state that does not exist. The same function read the *source* capture with the
 * canonical extractor, so the two halves of one readback disagreed about its shape.
 *
 * This resolver is the single reader for arm evidence: it resolves each arm through
 * `extractCaptureOutputText` (the same canonical reader the source half uses) and returns a *named* reason for
 * every arm it could not resolve, so "unreadable" can never again be reported as "absent".
 */
export type ResumedArmEvidenceReason = "capture_missing" | "capture_has_no_output";

export interface ResumedArmEvidence {
  readonly endpointId: string;
  readonly modelId: string;
  readonly reasoningEffort: string | null;
  readonly replayRequestId: string;
  readonly routingDecisionId: string;
  readonly outputText: string;
}

export interface UnresolvedArmEvidence {
  readonly endpointId: string;
  readonly reason: ResumedArmEvidenceReason;
}

export async function resolveResumedArmEvidence(input: {
  readonly counterfactualPackages: readonly {
    readonly endpointId: string;
    readonly modelId: string;
    readonly reasoningEffort: string | null;
  }[];
  readonly branchCaptureRequestIds: ReadonlyMap<string, string>;
  readonly readCapture: (requestId: string) => Promise<Record<string, unknown> | null>;
}): Promise<{
  readonly arms: readonly ResumedArmEvidence[];
  readonly unreadable: readonly UnresolvedArmEvidence[];
}> {
  const arms: ResumedArmEvidence[] = [];
  const unreadable: UnresolvedArmEvidence[] = [];
  for (const candidate of input.counterfactualPackages) {
    const requestId = input.branchCaptureRequestIds.get(candidate.endpointId);
    if (!requestId) {
      unreadable.push({ endpointId: candidate.endpointId, reason: "capture_missing" });
      continue;
    }
    let capture: Record<string, unknown> | null = null;
    try {
      capture = await input.readCapture(requestId);
    } catch {
      // A boundary failure is reported through the caller's own error path; for this arm it means the
      // evidence could not be read, which is exactly what has to be named rather than swallowed.
      capture = null;
    }
    if (!capture || typeof capture !== "object" || Array.isArray(capture)) {
      unreadable.push({ endpointId: candidate.endpointId, reason: "capture_missing" });
      continue;
    }
    const outputText = extractCaptureOutputText(capture);
    if (!outputText) {
      unreadable.push({ endpointId: candidate.endpointId, reason: "capture_has_no_output" });
      continue;
    }
    arms.push({
      endpointId: candidate.endpointId,
      modelId:
        typeof capture.modelId === "string" && capture.modelId.trim()
          ? capture.modelId.trim()
          : candidate.modelId,
      reasoningEffort:
        typeof capture.reasoningEffort === "string"
          ? capture.reasoningEffort
          : candidate.reasoningEffort,
      replayRequestId: requestId.replace(/-branch$/, ""),
      routingDecisionId: String(capture.routingDecisionId ?? ""),
      outputText,
    });
  }
  return { arms, unreadable };
}

/** The summary travels inside an error message that is persisted on the resume entry (bounded at 512). */
const MAX_UNRESOLVED_ARM_SUMMARY = 384;

/** A bounded, deterministic summary of the arms a resumed completion could not read. */
export function describeUnresolvedArms(unreadable: readonly UnresolvedArmEvidence[]): string {
  return [...unreadable]
    .sort((left, right) => left.endpointId.localeCompare(right.endpointId))
    .map((arm) => `${arm.endpointId}=${arm.reason}`)
    .join(", ")
    .slice(0, MAX_UNRESOLVED_ARM_SUMMARY);
}
