import { createHash } from "node:crypto";
import path from "node:path";

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
  /** S38: the recency cursor needs the record's last update, which the summary projection carries. */
  readonly updatedAtMs?: unknown;
  /** S38 follow-on: creation time is the ordering key the cursor uses. */
  readonly createdAtMs?: unknown;
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
  readonly currentCursor: RecoveryPageCursor | null;
  readonly pageEntries: readonly RecoveryPageCursor[];
  readonly examinedCount: number;
  readonly pageSize: number;
}): RecoveryPageCursor | null {
  if (input.examinedCount <= 0) return input.currentCursor;
  if (input.pageEntries.length < input.pageSize) return null;
  return input.pageEntries[input.examinedCount - 1] ?? input.currentCursor;
}

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S38: a place in the *recency* order. The pass
 * walks the terminal set newest-first because the evidence a handoff needs is only retained for ~36 h, and the
 * `jobId` order it used before is a hash - so it could spend an hour walking old, unfixable work before it
 * reached the handoffs from the last few hours that can actually be completed.
 */
export interface RecoveryPageCursor {
  readonly jobId: string;
  /** S38 follow-on: the ordering key is the job's creation time - `updatedAtMs` is touched by terminalization. */
  readonly createdAtMs: number;
}

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S24: the terminal recovery page is asked for as a
 * *summary* page.
 *
 * `replay:list-jobs` returns whole durable jobs unless the caller asks otherwise, and a whole job averages
 * 7.3 KB on the live store (12.4 MB for 1 692 jobs: candidate packages, branch references, dispatch results
 * and per-endpoint metric maps). The extension protocol inlines up to 16 KiB, so a page of full jobs overruns
 * the frame at two entries - and the pass needs twenty-four to make any progress at all. The scan only reads
 * identity, state, evaluation id and branch count from the page; the full record is fetched for the jobs it
 * actually recovers, which is bounded by the per-sweep recovery bound.
 */
export function terminalRecoveryListingValue(input: {
  readonly cursor: RecoveryPageCursor | null;
}): Record<string, unknown> {
  return {
    state: ["failed", "timed_out"],
    hasEvaluationJobId: true,
    summary: true,
    // S38: newest first, so the work whose evidence still exists is met first.
    order: "recent",
    ...(input.cursor === null
      ? {}
      : { afterJobId: input.cursor.jobId, afterCreatedAtMs: input.cursor.createdAtMs }),
    limit: MAX_HANDOFF_RECOVERY_LIST_PAGE,
  };
}

/** The longest scope id a durable job may carry (`runtime:<hash>` is 72 characters on the live root). */
const MAX_REPLAY_JOB_SCOPE = 256;

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S35 - the payload of a capability answer.
 *
 * Measured live on `:3457`: a capability answer is an envelope
 * `{ value, businessOutput: { value }, durableLocator: { extensionId, requestId, capability, channel, … } }`,
 * and for a job that does not exist both `value` and `businessOutput.value` are `null`. Code that read the
 * answer directly therefore saw an object where it expected a record: the recovery sweep treated a missing
 * evaluation as present (an envelope is truthy) and a full job record as absent (an envelope has no `jobId`),
 * which is why a page of candidates produced zero recoveries while every answer was in fact correct.
 */
export function unwrapCapabilityPayload(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const record = value as { businessOutput?: unknown; value?: unknown };
  const business =
    record.businessOutput &&
    typeof record.businessOutput === "object" &&
    !Array.isArray(record.businessOutput)
      ? (record.businessOutput as { value?: unknown }).value
      : undefined;
  if (business !== undefined && business !== null) return business;
  if (record.value !== undefined) return record.value;
  return value;
}

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S36 - the durable job record inside whatever
 * envelope the capability boundary answered with.
 *
 * Measured live on `:3457`: the recovery sweep received a correct answer for every candidate and still
 * recovered nothing, because the record it needs sits inside one or more envelope layers
 * (`value`, `businessOutput.value`, and - for an externalized answer - a locator that has to be resolved
 * first). Reading a fixed depth made a present record look absent, so the resume entry was never synthesized
 * and the handoff stayed invisible. This unwraps bounded layers until it finds the record itself.
 */
export function coerceDurableReplayJobRecord(
  value: unknown,
  maxDepth = 4,
): Record<string, unknown> | null {
  let current = unwrapCapabilityPayload(value);
  for (let depth = 0; depth < maxDepth; depth += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    const record = current as Record<string, unknown>;
    /**
     * S43 (measured live with the S42 operator readback: the boundary returns both the source capture and the
     * branch capture of a handoff the completion reports as `capture_missing`): stopping at the first object
     * carrying a `jobId` can stop at a locator that merely *names* the job, and a record without `dispatches`
     * makes the completion fall back to the pre-S9 branch naming - which resolves to nothing, which is the
     * uniform miss. The record has to look like the durable job: identity *and* the work it carries.
     */
    const looksLikeJob =
      typeof record.jobId === "string" &&
      record.jobId.length > 0 &&
      (Array.isArray(record.candidatePackages) ||
        (record.dispatches !== null &&
          typeof record.dispatches === "object" &&
          !Array.isArray(record.dispatches)) ||
        typeof record.state === "string");
    if (looksLikeJob) return record;
    const next = unwrapCapabilityPayload(current);
    if (next === current) return null;
    current = next;
  }
  return null;
}

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S27 - the scope a durable replay job was created
 * under, read from the store itself.
 *
 * Measured live: durable jobs carry the *capture* scope (`runtime:<hash>`), not the operator scope the runtime
 * is configured with, and the producer only learns the capture scope from a capture it dispatches. A runtime
 * that has just restarted has no capture to learn from, so its recovery listing and its terminalization both
 * bound the operator scope, `assertJobSummaryBinding` skipped every job, and the page came back empty while
 * the log filled with `replay persisted job scope binding mismatch`.
 *
 * The probe that finds it must not bind the scope it is trying to discover: the binding check only compares
 * the fields the envelope provides, so a channel-only listing returns the stored jobs with their real scope.
 */
export function replayJobScopeFromProbe(probe: unknown): string | null {
  const page = Array.isArray(probe)
    ? probe
    : probe && typeof probe === "object" && Array.isArray((probe as { value?: unknown }).value)
      ? ((probe as { value: readonly unknown[] }).value as readonly unknown[])
      : [];
  for (const entry of page) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const scope = (entry as { scope?: unknown }).scope;
    if (typeof scope !== "string") continue;
    const trimmed = scope.trim();
    if (trimmed.length > 0 && trimmed.length <= MAX_REPLAY_JOB_SCOPE) return trimmed;
  }
  return null;
}

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S28 - the durable replay job scope, derived
 * exactly the way the private boundary stamps it.
 *
 * The boundary scopes every capture it records (and therefore every replay job built from one) to
 * `runtime:${sha256(JSON.stringify({channel, stateRoot: <its own state root>})).slice(0,32)}`, where its state
 * root is the runtime's `<runtime-state-root>/<scope-id>/track-b`. Measured on the real-traffic root:
 * `channel=stage`, `stateRoot=E:\role-model-temp\rc-run\state\standalone-runtime-stage\track-b` ->
 * `runtime:714f4a87dd3c44d1bc93ed741841c722`, which is the scope all 1 700 persisted jobs carry.
 *
 * Asking the store instead does not work: the runtime host validates a capability envelope before the
 * extension's binding check runs, so a scope-less discovery listing is refused with
 * `envelope identity or capability is incomplete or incompatible` (measured live). The scope is not
 * discoverable - it is computable, and this is the computation.
 */
export function resolveDurableReplayJobScope(input: {
  readonly channel: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}): string {
  const stateRoot = path.resolve(path.join(input.runtimeStateRoot, input.scopeId, "track-b"));
  const digest = createHash("sha256")
    .update(JSON.stringify({ channel: input.channel, stateRoot }))
    .digest("hex");
  return `runtime:${digest.slice(0, 32)}`;
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
/**
 * Run 100 — item 8's `capture_missing` class, root-caused by two independent audit subagents on the live
 * store 2026-09-25: 67 distinct `capture_missing(<id>)` ids across 39 failed jobs, **all** `…-<hash16>-branch`,
 * while **0 of 2 965** queue receipts carry those ids and **0 receipts end in `-branch`**. The receipts for the
 * same request are `replay-<uuid>-<candidateHash16>` — the *dispatch* captures the arms actually wrote, with
 * the arm's response text — because dispatch captures became attempt-scoped (run-100 addendum 04 S9).
 *
 * So the resolution must name every id the job can support, in order of confidence, and the reader must try
 * them before declaring the arm unreadable: the recorded `branchRequestId`, the provider result's `-branch`
 * sibling, the provider result capture itself (the name the store measured as present), and finally the legacy
 * pre-S9 derivation for jobs written before receipts existed.
 */
export function branchCaptureRequestIdCandidatesFromJob(input: {
  readonly replayJobId: string;
  readonly requestId: string;
  readonly dispatches?: unknown;
  readonly candidateEndpointIds: readonly string[];
}): Map<string, readonly string[]> {
  const dispatches =
    input.dispatches && typeof input.dispatches === "object" && !Array.isArray(input.dispatches)
      ? (input.dispatches as Record<string, unknown>)
      : {};
  const resolved = new Map<string, readonly string[]>();
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
    const candidates: string[] = [];
    const push = (value: string): void => {
      const trimmed = value.trim();
      if (trimmed && !candidates.includes(trimmed)) candidates.push(trimmed);
    };
    const recordedBranchRequestId =
      typeof result?.branchRequestId === "string" ? result.branchRequestId : "";
    if (recordedBranchRequestId) push(recordedBranchRequestId);
    const providerResultRef =
      typeof result?.providerResultRef === "string" ? result.providerResultRef : "";
    const replayRequestId = providerResultRef.startsWith("route-capture:")
      ? providerResultRef.slice("route-capture:".length)
      : "";
    if (replayRequestId) {
      /**
       * The audit measured which name exists: the dispatch capture (`replay-<uuid>-<hash16>`) is present in the
       * queue receipt store, while its `-branch` sibling is written by nothing since S9. Try the existing shape
       * first and keep the sibling for jobs written before the rename.
       */
      push(replayRequestId);
      push(`${replayRequestId}-branch`);
    }
    push(
      `replay-${input.requestId}-${replayDispatchCaptureToken({
        replayJobId: input.replayJobId,
        candidateEndpointId,
        dispatchNonce: null,
      })}-branch`,
    );
    resolved.set(candidateEndpointId, candidates);
  }
  return resolved;
}

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
export type ResumedArmEvidenceReason =
  /**
   * S41: the durable job names no capture for this arm at all (the pre-S9 naming, or an arm whose dispatch
   * never produced a receipt). Distinct from a capture the job *names* and the boundary cannot return - the
   * two have different repairs, and reporting both as `capture_missing` is the same collapse this addendum
   * keeps removing.
   */
  | "capture_not_named"
  | "capture_missing"
  | "capture_has_no_output"
  /**
   * The boundary could not answer for this capture: the pointer may still exist and the failure may be
   * transient. Measured live in addendum 06: the first version of this resolver reported every failure as
   * `capture_missing`, which hid the difference between a gone pointer (permanent) and a failed read
   * (retryable) - the same "one state, two meanings" defect this addendum exists to remove.
   */
  | "capture_unreadable";

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
  readonly detail?: string;
}

export async function resolveResumedArmEvidence(input: {
  readonly counterfactualPackages: readonly {
    readonly endpointId: string;
    readonly modelId: string;
    readonly reasoningEffort: string | null;
  }[];
  /**
   * Run 100 item 8: one id per arm (the pre-audit shape) or the ordered candidates the job can support.
   * Candidates are tried in order and the first that resolves is used.
   */
  readonly branchCaptureRequestIds: ReadonlyMap<string, string | readonly string[]>;
  readonly readCapture: (requestId: string) => Promise<Record<string, unknown> | null>;
}): Promise<{
  readonly arms: readonly ResumedArmEvidence[];
  readonly unreadable: readonly UnresolvedArmEvidence[];
}> {
  const arms: ResumedArmEvidence[] = [];
  const unreadable: UnresolvedArmEvidence[] = [];
  for (const candidate of input.counterfactualPackages) {
    const named = input.branchCaptureRequestIds.get(candidate.endpointId);
    const requestIds =
      typeof named === "string" ? [named] : Array.isArray(named) ? [...named] : [];
    if (requestIds.length === 0) {
      unreadable.push({ endpointId: candidate.endpointId, reason: "capture_not_named" });
      continue;
    }
    let capture: Record<string, unknown> | null = null;
    let readFailure: string | null = null;
    let resolvedRequestId: string | null = null;
    /**
     * The audit measured the failure mode precisely: the derived `…-branch` name has no producer, while the
     * arm's capture is present under the provider-result id. Try every candidate before giving up, and keep the
     * first failure text so an unreadable boundary is still reported as such rather than as a missing row.
     */
    for (const requestId of requestIds) {
      try {
        capture = await input.readCapture(requestId);
      } catch (error) {
        readFailure = String((error as { message?: unknown })?.message ?? error ?? "unknown").slice(
          0,
          160,
        );
        continue;
      }
      if (capture) {
        resolvedRequestId = requestId;
        break;
      }
    }
    if (!capture && readFailure !== null) {
      unreadable.push({
        endpointId: candidate.endpointId,
        reason: "capture_unreadable",
        detail: readFailure,
      });
      continue;
    }
    if (!capture || typeof capture !== "object" || Array.isArray(capture)) {
      unreadable.push({
        endpointId: candidate.endpointId,
        reason: "capture_missing",
        /**
         * The id travels with the reason: a read that misses a capture the job named is only diagnosable with
         * it. The last candidate is the least-derived name the job could offer, so it is the most informative.
         */
        detail: requestIds[requestIds.length - 1],
      });
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
      /**
       * Run 100 item 8: the arm's replay request id is derived from the candidate that actually resolved, not
       * from the first name the job offered (the derived `-branch` sibling resolves for no live job).
       */
      replayRequestId: (resolvedRequestId ?? requestIds[0]).replace(/-branch$/, ""),
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
    .map((arm) =>
      arm.detail
        ? `${arm.endpointId}=${arm.reason}(${arm.detail})`
        : `${arm.endpointId}=${arm.reason}`,
    )
    .join(", ")
    .slice(0, MAX_UNRESOLVED_ARM_SUMMARY);
}

/**
 * Whether a set of unresolved arms is *permanently* unreadable (the capture is gone from the store, so no
 * retry can ever complete the handoff) or merely unreadable *now* (the boundary failed to answer, which the
 * attempt budget and the bounded renewal exist to ride out).
 */
export function unresolvedArmsArePermanent(unreadable: readonly UnresolvedArmEvidence[]): boolean {
  return (
    unreadable.length > 0 &&
    unreadable.every(
      (arm) => arm.reason === "capture_missing" || arm.reason === "capture_not_named",
    )
  );
}
