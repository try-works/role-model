import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { resolveSqliteMemoryLocation } from "@role-model-router/sqlite-memory";
import {
  captureRefFromReplayJob,
  resolveDurableReplayJobScope,
} from "./supervised-replay-handoff-recovery.js";
import type {
  FinalizedRouteChallenge,
  PendingRouteDispatch,
  PendingRouteDispatchReadRequest,
  RouteChallengeReadRequest,
  RouteDispatchEvidence,
  RouteDispatchEvidenceReadRequest,
} from "./track-b-auto-replay-runtime.js";
import type { AutoReplayCapture } from "./track-b-auto-replay.js";
import {
  hasRecordedToolResults,
  isBenchmarkReplaySourceRef,
  isSyntheticProbeSourceClass,
  readReplayRequestRequirements,
} from "./track-b-replay-policy.js";

/** Transport must bind authenticated runtime envelopes, correct worker state root, and decode transfers. */
export type RouteChallengeEvidenceInvoke = (
  extensionId: string,
  capability: string,
  value: Record<string, unknown>,
) => Promise<unknown>;
type Row = Record<string, unknown>;
const row = (v: unknown): Row | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Row) : null;
const text = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 && v === v.trim() ? v : null;
const confidence = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
const time = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const object = row(v);
  return object
    ? `{${Object.keys(object)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
        .join(",")}}`
    : (JSON.stringify(v) ?? "null");
}

/** A complete keyset walk, not a capped legacy array mistaken for a complete census. */
async function groups(invoke: RouteChallengeEvidenceInvoke, limit: number): Promise<Row[]> {
  const records: Row[] = [];
  const cursors = new Set<string>();
  let cursor: string | undefined;
  for (let page = 0; page < 128; page++) {
    const value = row(
      await invoke("evaluation-core", "evaluation:list-groups", {
        page: true,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
    );
    if (!value || !Array.isArray(value.groups) || typeof value.hasMore !== "boolean")
      throw new Error("comparison page unavailable");
    for (const entry of value.groups) {
      const record = row(entry);
      if (!record) throw new Error("malformed comparison page");
      records.push(record);
    }
    if (value.hasMore === false) {
      if (value.nextCursor != null) throw new Error("inconsistent comparison cursor");
      return records;
    }
    const next = text(value.nextCursor);
    if (!next || cursors.has(next)) throw new Error("comparison cursor unavailable");
    cursors.add(next);
    cursor = next;
  }
  throw new Error("comparison page budget exhausted");
}

/** Known producer derivation only: holdout replay:<jobId>:<case> -> replay:job -> decision-<captureRef>. */
function replayIdForGroup(group: Row): string | null {
  const ids = row(group.holdout)?.caseIds;
  if (!Array.isArray(ids) || ids.length < 2) return null;
  const replayIds = ids.map((id) =>
    typeof id === "string" ? (/^replay:([^:]+):[^:]+$/.exec(id)?.[1] ?? null) : null,
  );
  return replayIds.every((id) => id !== null && id === replayIds[0]) ? replayIds[0] : null;
}

/**
 * Run 106: the comparability spellings the durable record may carry for one arm's reasoning effort. The
 * dimension is recorded, never gating (see the guard below), but an unknown spelling still fails closed so
 * this readback stays a faithful projection of what Evaluation Core wrote.
 */
const ARM_EFFORT_COMPARABILITY_VALUES = new Set([
  "matched",
  "mismatched",
  "source_effort_unspecified",
  "arm_effort_unspecified",
]);

async function project(
  listed: Row,
  request: RouteDispatchEvidenceReadRequest,
  invoke: RouteChallengeEvidenceInvoke,
): Promise<RouteDispatchEvidence | null> {
  const groupId = text(listed.groupId);
  const result = row(listed.result);
  const proof = row(listed.comparability);
  // Time belongs to the authenticated LIST sibling. Never infer it from result_json, group id, or clock.
  if (
    !groupId ||
    listed.status !== "finalized" ||
    !time(listed.createdAtMs) ||
    !result ||
    !proof ||
    proof.roleId !== request.roleId ||
    proof.taskTypeId !== request.taskTypeId ||
    (request.sinceMs !== undefined && listed.createdAtMs < request.sinceMs)
  )
    return null;
  const source = text(proof.sourceCandidateRef);
  const candidate = text(proof.counterfactualCandidateRef);
  if (
    !source ||
    !candidate ||
    source === candidate ||
    ![source, candidate].includes(request.endpointId)
  )
    return null;
  const actual = row(
    await invoke("evaluation-core", "evaluation:read-comparison-group", { groupId }),
  );
  if (
    !actual ||
    actual.groupId !== groupId ||
    actual.status !== "finalized" ||
    canonical(actual) !== canonical(result) ||
    canonical(actual.comparability) !== canonical(proof)
  )
    return null;
  if (actual.outcome !== "source" && actual.outcome !== "candidate" && actual.outcome !== "tie")
    return null;
  /**
   * Run 106 (operator decision, 2026-10-07): the effort dimension is recorded, never gating. A comparison
   * whose arms run at different reasoning efforts is valid evidence - a judge grading its own arm or two
   * byte-identical outcomes are not, and those keep their fail-closed meaning here. The dimension is still
   * required to be present and well formed, so the readback stays a faithful projection of the durable
   * record rather than accepting whatever shape arrives.
   */
  const COMPARABILITY_ONLY_VALIDITY_ISSUES = new Set(["arm_effort_mismatch"]);
  if (
    actual.validityIssues !== undefined &&
    (!Array.isArray(actual.validityIssues) ||
      actual.validityIssues.some(
        (issue) => !COMPARABILITY_ONLY_VALIDITY_ISSUES.has(text(issue) ?? ""),
      ))
  )
    return null;
  const effort = proof.effortComparability;
  if (!Array.isArray(effort) || effort.length !== 1) return null;
  const arm = row(effort[0]);
  if (
    !arm ||
    arm.endpointId !== candidate ||
    !ARM_EFFORT_COMPARABILITY_VALUES.has(text(arm.comparability) ?? "") ||
    !text(arm.modelId) ||
    !text(arm.sourceModelId)
  )
    return null;
  if (
    !Array.isArray(actual.members) ||
    actual.members.length !== 2 ||
    !Array.isArray(actual.trialIds) ||
    actual.trialIds.length !== 2
  )
    return null;
  const members = actual.members.map(row);
  if (
    members.some(
      (member) =>
        !member ||
        !text(member.trialId) ||
        member.status !== "scored" ||
        !confidence(member.confidence),
    )
  )
    return null;
  const sourceMember = members.find(
    (member) => member?.candidateRef === source && member.role === "source",
  );
  const candidateMember = members.find(
    (member) => member?.candidateRef === candidate && member.role === "counterfactual",
  );
  if (
    !sourceMember ||
    !candidateMember ||
    sourceMember.trialId === candidateMember.trialId ||
    !actual.trialIds.includes(sourceMember.trialId) ||
    !actual.trialIds.includes(candidateMember.trialId)
  )
    return null;
  let winnerEndpointId: string | null = null;
  let judgeConfidence: number;
  if (actual.outcome === "tie") {
    if (
      actual.winnerTrialId != null ||
      sourceMember.disposition !== "tie" ||
      candidateMember.disposition !== "tie"
    )
      return null;
    judgeConfidence =
      ((sourceMember.confidence as number) + (candidateMember.confidence as number)) / 2;
  } else {
    const winner = actual.outcome === "source" ? sourceMember : candidateMember;
    const loser = actual.outcome === "source" ? candidateMember : sourceMember;
    if (
      actual.winnerTrialId !== winner.trialId ||
      actual.winnerRole !== winner.role ||
      winner.disposition !== "positive" ||
      loser.disposition !== "negative"
    )
      return null;
    winnerEndpointId = winner.candidateRef as string;
    judgeConfidence = winner.confidence as number;
  }
  const replayId = replayIdForGroup(actual);
  if (!replayId) return null;
  const job = row(await invoke("replay-core", "replay:job", { jobId: replayId }));
  if (
    !job ||
    job.jobId !== replayId ||
    job.baselineEndpointId !== source ||
    !Array.isArray(job.candidatePackages) ||
    !job.candidatePackages.some((item) => row(item)?.endpointId === candidate)
  )
    return null;
  const captureRef = captureRefFromReplayJob(job);
  if (!captureRef) return null;
  return {
    comparisonGroupId: groupId,
    finalizedAtMs: listed.createdAtMs,
    effortComparable: true,
    winnerEndpointId,
    captureRef,
    newEndpointId: request.endpointId,
    againstEndpointId: request.endpointId === source ? candidate : source,
    judgeConfidence,
    endpointConfidence: (request.endpointId === source ? sourceMember : candidateMember)
      .confidence as number,
  };
}

/** Null means unavailable/incomplete read; [] means the authenticated complete walk contained no usable evidence. */
export async function readRouteDispatchEvidence(input: {
  readonly request: RouteDispatchEvidenceReadRequest;
  readonly invoke: RouteChallengeEvidenceInvoke;
  readonly pageLimit?: number;
}): Promise<readonly RouteDispatchEvidence[] | null> {
  const request = input.request;
  if (
    ![request.roleId, request.taskTypeId, request.endpointId].every(text) ||
    (request.sinceMs !== undefined &&
      (!Number.isSafeInteger(request.sinceMs) || request.sinceMs < 0))
  )
    return null;
  try {
    const records = await groups(input.invoke, input.pageLimit ?? 24);
    const answers = new Map<string, RouteDispatchEvidence>();
    for (const record of records) {
      const projected = await project(record, request, input.invoke);
      if (projected) {
        const prior = answers.get(projected.comparisonGroupId);
        if (prior && canonical(prior) !== canonical(projected)) {
          console.error(
            `[route-evidence] duplicate group canonical mismatch: ${projected.comparisonGroupId}`,
          );
          return null;
        }
        answers.set(projected.comparisonGroupId, projected);
      }
    }
    return [...answers.values()].sort(
      (a, b) =>
        a.finalizedAtMs - b.finalizedAtMs || a.comparisonGroupId.localeCompare(b.comparisonGroupId),
    );
  } catch (cause) {
    console.error(
      `[route-evidence] readRouteDispatchEvidence failed: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
    return null;
  }
}

export async function readFinalizedRouteChallengeEvidence(input: {
  readonly request: RouteChallengeReadRequest;
  readonly invoke: RouteChallengeEvidenceInvoke;
  readonly pageLimit?: number;
}): Promise<FinalizedRouteChallenge | null> {
  const { request } = input;
  if (
    !text(request.captureRef) ||
    !text(request.againstEndpointId) ||
    request.newEndpointId === request.againstEndpointId
  )
    return null;
  const excluded = request.excludedComparisonGroupIds ?? [];
  if (
    !Array.isArray(excluded) ||
    excluded.length > 10000 ||
    excluded.some((id) => !text(id) || id.length > 256) ||
    new Set(excluded).size !== excluded.length
  )
    return null;
  const records = await readRouteDispatchEvidence({
    ...input,
    request: {
      roleId: request.roleId,
      taskTypeId: request.taskTypeId,
      endpointId: request.newEndpointId,
      sinceMs: request.sinceMs,
    },
  });
  const matching = records?.filter(
    (record) =>
      record.captureRef === request.captureRef &&
      record.againstEndpointId === request.againstEndpointId &&
      !excluded.includes(record.comparisonGroupId),
  );
  // More than one group for a capture/pair is ambiguous without an exact evaluation id.
  if (!matching || matching.length !== 1) return null;
  const { comparisonGroupId, finalizedAtMs, effortComparable, winnerEndpointId } =
    matching[0] as RouteDispatchEvidence;
  return { comparisonGroupId, finalizedAtMs, effortComparable, winnerEndpointId };
}

/** Authenticated ReplayCore and queue operator projections; never manufacture a replay id for a pre-replay queue row. */
/**
 * Plan phase 3 (FIX DIAGNOSTICS, 2026-10-15): every refusal below used to be a silent `null`, so the
 * replay walk could only say "route pending dispatches unavailable" and no log named which gate
 * refused - measured live on production :3456 where the listing and the queue projection were both
 * healthy yet the tick kept failing. The diagnostic names travel through an optional callback so the
 * HOST decides where they go (its log, its observability metric registry, or both) without this pure
 * reader depending on a logger. The return contract is unchanged: `null` for fail-closed refusals,
 * answers otherwise - only the reasons are now named.
 */
export async function readPendingRouteDispatches(input: {
  readonly request: PendingRouteDispatchReadRequest;
  readonly invoke: RouteChallengeEvidenceInvoke;
  readonly readCapture: (requestId: string) => Promise<unknown>;
  readonly readQueueJobs: () => Promise<unknown>;
  readonly readQueueJob: (jobId: string) => Promise<unknown>;
  /** Named refusal diagnostic; the default writes nothing so existing silent callers keep their contract. */
  readonly onDiagnostic?: (reason: string, detail?: string) => void;
}): Promise<readonly PendingRouteDispatch[] | null> {
  const refuse = (reason: string, detail?: string): null => {
    input.onDiagnostic?.(reason, detail);
    if (process.env.ROLE_MODEL_FOCUS_DIAG)
      console.error(`[route-dispatch-pending] degraded: ${reason}${detail ? ` ${detail}` : ""}`);
    return null;
  };
  if (!text(input.request.roleId) || !text(input.request.taskTypeId)) return refuse("request_invalid");
  let terminalSkipped = 0;
  const answers: PendingRouteDispatch[] = [];
  const captures = new Map<string, Row | null>();
  const scopeCapture = async (id: string): Promise<Row | null> => {
    if (captures.has(id)) return captures.get(id) as Row | null;
    const capture = row(await input.readCapture(id));
    const classification = row(capture?.classification);
    if (
      !capture ||
      capture.requestId !== id ||
      (text(capture.roleId) ?? text(classification?.roleId)) !== input.request.roleId ||
      (text(capture.taskTypeId) ?? text(classification?.taskTypeId)) !== input.request.taskTypeId ||
      !text(capture.endpointId) ||
      !text(capture.scope) ||
      capture.branchKind != null ||
      capture.branchPhase != null ||
      /^replay-/.test(id) ||
      isBenchmarkReplaySourceRef(id)
    ) {
      captures.set(id, null);
      return null;
    }
    captures.set(id, capture);
    return capture;
  };
  try {
    let afterJobId: string | undefined;
    let complete = false;
    const seen = new Set<string>();
    for (let page = 0; page < 128; page++) {
      const value = await input.invoke("replay-core", "replay:list-jobs", {
        summary: true,
        limit: 24,
        ...(afterJobId ? { afterJobId } : {}),
      });
      const entries = Array.isArray(value) ? value : row(value)?.value;
      if (!Array.isArray(entries) || entries.length > 24)
        return refuse("list_jobs_malformed", `page=${page} entries=${Array.isArray(entries) ? entries.length : typeof value}`);
      for (const entry of entries) {
        const summary = row(entry);
        const jobId = text(summary?.jobId);
        if (!summary || !jobId || seen.has(jobId) || (afterJobId && jobId <= afterJobId))
          return refuse("list_jobs_cursor_failure", `page=${page} jobId=${jobId ?? "missing"}`);
        seen.add(jobId);
        afterJobId = jobId;
        /**
         * Terminal replay-core jobs are history, not pending-dispatch authority. The live queue-mode RC
         * had pages of old failed/timed-out jobs; hydrating and validating those as if they were active
         * work made this reader return null, which aborted the replay scheduler before replay.dispatch
         * could be offered. Active/malformed jobs still fail closed below.
         */
        const terminalReplayStates = new Set(["complete", "failed", "cancelled", "timed_out"]);
        const summaryState = text(summary?.state);
        if (summaryState && terminalReplayStates.has(summaryState)) {
          terminalSkipped += 1;
          continue;
        }
        const job = row(await input.invoke("replay-core", "replay:job", { jobId }));
        if (!job || job.jobId !== jobId || !time(job.createdAtMs))
          return refuse("active_replay_job_malformed", `jobId=${jobId}`);
        const jobState = text(job.state);
        if (jobState && terminalReplayStates.has(jobState)) {
          terminalSkipped += 1;
          continue;
        }
        // Actual producer vocabulary: leased is executing; evaluating has already handed off.
        const states: Record<string, PendingRouteDispatch["state"]> = {
          queued: "queued",
          leased: "running",
          running: "running",
          awaiting_evaluation: "awaiting_evaluation",
          evaluating: "awaiting_evaluation",
        };
        const state = typeof job.state === "string" ? states[job.state] : undefined;
        if (!state) return refuse("active_replay_job_unknown_state", `jobId=${jobId} state=${String(job.state)}`);
        const captureRef = captureRefFromReplayJob(job);
        if (!captureRef) return refuse("active_replay_job_missing_capture", `jobId=${jobId}`);
        const capture = await scopeCapture(captureRef);
        if (!capture) continue;
        if (
          job.scope !== capture.scope ||
          job.baselineEndpointId !== capture.endpointId ||
          !Array.isArray(job.candidatePackages)
        )
          return refuse("active_replay_job_scope_mismatch", `jobId=${jobId} capture=${captureRef}`);
        for (const arm of job.candidatePackages) {
          const endpointId = text(row(arm)?.endpointId);
          if (!endpointId || endpointId === job.baselineEndpointId)
            return refuse("active_replay_job_arm_malformed", `jobId=${jobId}`);
          answers.push({
            sourceType: "replay",
            replayJobId: jobId,
            queueJobId: null,
            captureRef,
            newEndpointId: endpointId,
            againstEndpointId: job.baselineEndpointId as string,
            createdAtMs: job.createdAtMs,
            state,
          });
        }
      }
      if (entries.length < 24) {
        complete = true;
        break;
      }
    }
    if (!complete) return refuse("list_jobs_page_budget_exhausted", `terminalSkipped=${terminalSkipped}`);
    if (terminalSkipped > 0) input.onDiagnostic?.("terminal_replay_jobs_skipped", String(terminalSkipped));
    const page = row(await input.readQueueJobs());
    // The operator queue projection intentionally reports an uncreated fresh store as
    // `available:false` with an empty list. That is a complete empty queue, not an authority
    // failure; treating it as unavailable prevents the very first classified capture from ever
    // being dispatched. Every other unavailable/malformed shape remains fail-closed.
    const freshEmptyQueue =
      page?.schemaVersion === "role-model.operator-queue-jobs.v1" &&
      page.queue === "replay.dispatch" &&
      page.available === false &&
      Array.isArray(page.jobs) &&
      page.jobs.length === 0;
    // Existing queue API is capped, not paginated. A saturated 500 is explicitly incomplete.
    if (
      !page ||
      (!freshEmptyQueue && page.available !== true) ||
      !Array.isArray(page.jobs) ||
      page.jobs.length >= 500
    )
      return refuse("queue_jobs_unavailable", `available=${String(page?.available)} jobs=${Array.isArray(page?.jobs) ? page.jobs.length : "missing"}`);
    if (process.env.ROLE_MODEL_FOCUS_DIAG)
      console.error(
        `[route-dispatch-pending] queue page available=${String(page.available)} jobs=${page.jobs.length} freshEmpty=${String(freshEmptyQueue)}`,
      );
    const queueIds = new Set<string>();
    for (const entry of page.jobs) {
      const summary = row(entry);
      const queueJobId = text(summary?.id);
      if (!summary || !queueJobId || queueIds.has(queueJobId))
        return refuse("queue_job_summary_malformed", `id=${queueJobId ?? "missing"}`);
      queueIds.add(queueJobId);
      /**
       * Run 101 addendum 44: use a complete queue summary directly. The production sidecar's per-job
       * readback can take longer than the replay worker's whole 10 minute attempt budget; the list row
       * already carries the queue id, payload and timestamps when the host reads the local queue store.
       * Hydrate only older/incomplete projections.
       */
      const summaryPayload = row(summary.payload);
      let job: Row | null =
        summary.id === queueJobId && summary.queue === "replay.dispatch" && summaryPayload
          ? summary
          : null;
      if (!job) {
        const read = row(await input.readQueueJob(queueJobId));
        job = row(read?.job);
        if (
          !read ||
          read.available !== true ||
          !job ||
          job.id !== queueJobId ||
          job.queue !== "replay.dispatch"
        )
          return refuse("queue_job_detail_mismatch", `id=${queueJobId}`);
      }
      if (job.state === "completed") continue;
      // PersistedQueue owns these names, not ReplayCore. No cancelled/time-out inference from error text.
      const states: Record<string, PendingRouteDispatch["state"]> = {
        pending: "queued",
        processing: "running",
        failed: "failed",
      };
      const state = typeof job.state === "string" ? states[job.state] : undefined;
      const payload = row(job.payload);
      const captureRef = text(payload?.captureRef);
      if (
        !state ||
        !captureRef ||
        !Array.isArray(payload?.endpointIds) ||
        !text(payload.policySetDigest)
      )
        return refuse("queue_job_payload_malformed", `id=${queueJobId} state=${String(job.state)}`);
      if (
        payload.dispatchRoundId !== undefined &&
        (!text(payload.dispatchRoundId) || String(payload.dispatchRoundId).length > 256)
      )
        return refuse("queue_job_payload_malformed", `id=${queueJobId} dispatchRoundId`);
      const capture = await scopeCapture(captureRef);
      if (!capture) {
        input.onDiagnostic?.("queue_job_capture_out_of_scope", `id=${queueJobId} capture=${captureRef}`);
        continue;
      }
      const date =
        typeof job.createdAt === "string" &&
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(job.createdAt)
          ? Date.parse(`${job.createdAt.replace(" ", "T")}Z`)
          : Number.NaN;
      if (!time(date))
        return refuse("queue_job_timestamp_invalid", `id=${queueJobId} createdAt=${String(job.createdAt)}`);
      for (const id of payload.endpointIds) {
        const endpointId = text(id);
        if (!endpointId || endpointId === capture.endpointId)
          return refuse("queue_job_arm_malformed", `id=${queueJobId} arm=${String(endpointId)}`);
        // A live queue row may already have produced a replay. That durable replay record is the stronger state.
        if (
          answers.some(
            (answer) => answer.captureRef === captureRef && answer.newEndpointId === endpointId,
          )
        )
          continue;
        answers.push({
          sourceType: "queue",
          replayJobId: null,
          queueJobId,
          captureRef,
          ...(payload.dispatchRoundId !== undefined
            ? { dispatchRoundId: payload.dispatchRoundId as string }
            : {}),
          newEndpointId: endpointId,
          againstEndpointId: capture.endpointId as string,
          createdAtMs: date,
          state,
        });
      }
    }
    return answers;
  } catch (error) {
    /**
     * Run 101 addendum 45: this read answers `null` for BOTH "the plane is unavailable" and "a shape gate
     * refused", and the walk reports either one as `route pending dispatches unavailable`. Measured live on
     * production `:3456` (2026-10-14): the tick failed with that message while the replay-core listing and
     * the local queue projection were both healthy, and nothing in the log said which gate refused. Name it.
     */
    return refuse("pending_read_threw", error instanceof Error ? error.message.slice(0, 160) : String(error));
  }
}

/** Read-only live classification index -> authenticated exact capsule read. No disposition resets, capture mutations, or synthetic source ids. */
/**
 * A queue-driven tick names the capture it was claimed for, so its projection must not walk the family.
 *
 * MEASURED live on production `:3456` (2026-10-14, v0.0.18): the `replay.dispatch` plane interrupted every
 * attempt at its 600 s `attemptTimeoutMs` (`TimeoutError: Operation timed out after '10m'`, 5 attempts per
 * job) and `replay_dispositions` stayed empty for the lifetime of the host. The cause is the projection
 * below: it enumerated the live telemetry index (32 captures, 200 pending) and then performed ONE EXACT
 * CAPSULE READ PER REQUEST ID through the private boundary, once per candidate task - measured at 90+ s in
 * the pre-projection walk alone, with a single `knowledge:list-route-ladders` costing 3.5-73 s. The tick
 * therefore never reached `replay:plan-graph` inside its budget, no durable replay job was ever created,
 * and the job was retried into the same wall until it terminalised. A bounded, named restriction keeps the
 * same gates and the same fail-closed answers while making the queue-driven read O(claimed captures).
 */
export const MAX_RESTRICTED_REPLAYABLE_CAPTURES = 8;

export async function readRouteReplayableCaptures(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly channel: string;
  readonly request: {
    readonly roleId: string;
    readonly taskTypeId: string;
    /** Run 101 addendum 45: queue-driven ticks project exactly the captures they were claimed for. */
    readonly onlyCaptureRefs?: readonly string[];
  };
  /** The capsule read resolves the transcript out of the encrypted artifact store itself. */
  readonly readCapture: (requestId: string) => Promise<unknown>;
}): Promise<readonly AutoReplayCapture[] | null> {
  if (!text(input.request.roleId) || !text(input.request.taskTypeId) || !text(input.scopeId))
    return null;
  const restricted = Array.from(
    new Set((input.request.onlyCaptureRefs ?? []).filter((ref) => text(ref) !== null)),
  );
  if ((input.request.onlyCaptureRefs?.length ?? 0) > 0 && restricted.length === 0) return null;
  if (restricted.length > MAX_RESTRICTED_REPLAYABLE_CAPTURES) return null;
  let database: DatabaseSync | undefined;
  let ids: string[];
  if (restricted.length > 0) {
    // The claim is the authority: no telemetry enumeration, no family walk, one exact read per claimed ref.
    ids = restricted;
  } else
    try {
      const databasePath = resolveSqliteMemoryLocation(input);
      if (!existsSync(databasePath)) return null;
      database = new DatabaseSync(databasePath, { readOnly: true });
      database.exec("PRAGMA query_only=ON; PRAGMA busy_timeout=1000;");
      const entries = database
        .prepare(
          "SELECT DISTINCT request_id FROM runtime_telemetry_records WHERE taxonomy_role_id=? AND taxonomy_task_type=? AND request_class IN ('live','live_request') ORDER BY request_id LIMIT 501",
        )
        .all(input.request.roleId, input.request.taskTypeId);
      if (entries.length > 500 || entries.some((entry) => !text(entry.request_id))) return null;
      ids = entries.map((entry) => entry.request_id as string);
    } catch {
      return null;
    } finally {
      database?.close();
    }
  const scope = resolveDurableReplayJobScope(input);
  // Run 105: a capture that already holds a terminal durable replay disposition is ANNOTATED, never dropped.
  // `listPendingReplayCaptures` owns the dispatch-eligibility view and excludes such a capture; this corpus read
  // stays a faithful projection so operator readback and the audit trail keep showing every capture that live
  // telemetry and the exact capsule read agree exists. The dispatch planner acts on the annotation.
  const settledRefs = (() => {
    const dispositionPath = `${input.runtimeStateRoot}/${input.scopeId}/track-b/replay-disposition.sqlite`;
    if (!existsSync(dispositionPath)) return new Set<string>();
    let disposition: DatabaseSync | undefined;
    try {
      disposition = new DatabaseSync(dispositionPath, { readOnly: true });
      const rows = disposition
        .prepare(
          "SELECT capture_ref FROM replay_dispositions WHERE outcome IN ('replayed','refused')",
        )
        .all() as { capture_ref?: unknown }[];
      return new Set(
        rows.map((r) => (typeof r.capture_ref === "string" ? r.capture_ref : "")).filter(Boolean),
      );
    } catch {
      return new Set<string>();
    } finally {
      disposition?.close();
    }
  })();
  const captures: AutoReplayCapture[] = [];
  try {
    for (const requestId of ids) {
      const capture = row(await input.readCapture(requestId));
      if (!capture) continue; // Exact read knows eviction/absence; telemetry alone is not a capsule.
      const messages = capture.messages;
      const classification = row(capture.classification);
      const trace = row(capture.trace);
      const source = row(capture.replaySource);
      const roleId = text(capture.roleId) ?? text(classification?.roleId);
      const taskTypeId = text(capture.taskTypeId) ?? text(classification?.taskTypeId);
      const sourceClass = text(row(capture.replayEvidenceClass)?.class);
      /**
       * Every gate is named once, in one ordered table, so the corpus read has exactly one
       * expression of its admission rule. A rejected capture used to leave the tick with an
       * unattributable "no replayable request", which is what made a corpus that persisted and
       * hydrated correctly look like it had never been captured. The names are operator-facing:
       * with ROLE_MODEL_FOCUS_DIAG set, one tick prints the gate that dropped each capture.
       */
      const rejections: string[] = [];
      const gate = (name: string, admitted: boolean): void => {
        if (!admitted) rejections.push(name);
      };
      gate("request_id", capture.requestId === requestId);
      gate("scope", capture.scope === scope);
      gate("role", roleId === input.request.roleId);
      gate("task", taskTypeId === input.request.taskTypeId);
      gate(
        "classification_role",
        classification?.roleId == null || classification.roleId === roleId,
      );
      gate(
        "classification_task",
        classification?.taskTypeId == null || classification.taskTypeId === taskTypeId,
      );
      gate("endpoint", text(capture.endpointId) != null);
      gate("root_artifact", text(capture.rootArtifactId) != null);
      gate("replay_source", source != null);
      gate("trace", trace != null);
      gate("trace_scope", trace?.scopeId === scope);
      gate("trace_channel", trace?.channel === input.channel);
      gate("trace_readiness", trace?.readiness === "ready");
      gate("trace_completeness", trace?.completeness === "complete");
      gate(
        "trace_generation",
        Number.isSafeInteger(trace?.generation) && Number(trace?.generation) >= 0,
      );
      gate("trace_root_occurrence", text(trace?.rootOccurrenceId) != null);
      gate("trace_closed_at", text(trace?.closedAt) != null);
      gate(
        "replay_source_refs",
        [
          "normalizedRequestRef",
          "sharedPrefixRef",
          "forkOccurrenceId",
          "policySnapshotRef",
          "capturePolicyRef",
        ].every((key) => text(source?.[key]) != null),
      );
      gate("messages", Array.isArray(messages) && messages.length > 0);
      gate("not_branch", capture.branchKind == null && capture.branchPhase == null);
      gate("not_replay_produced", capture.replayProduced !== true);
      gate("not_replay_request_id", !/^replay-/.test(requestId));
      gate("not_benchmark_source", !isBenchmarkReplaySourceRef(requestId));
      gate("not_synthetic_probe", !isSyntheticProbeSourceClass(sourceClass));
      if (rejections.length > 0) {
        if (process.env.ROLE_MODEL_FOCUS_DIAG)
          console.error(
            `[replay-projection] capture=${requestId} rejected=${rejections.join(",")} trace=${trace ? `${String(trace.scopeId) === scope ? "scope-ok" : "scope-mismatch"}/${String(trace.channel)}/${String(trace.readiness)}/${String(trace.completeness)}` : "absent"} messages=${Array.isArray(messages) ? messages.length : "unreadable"}`,
          );
        continue;
      }
      // Narrowing only: the messages gate above already rejected every non-array transcript.
      if (!Array.isArray(messages)) continue;
      captures.push({
        captureRef: requestId,
        sourceEndpointId: capture.endpointId as string,
        // Live finding (isolated production-learning verification, 2026-10-15): the source MODEL identity
        // travels with the pending capture so the tick can refuse a same-model (self) counterfactual.
        sourceModelId: typeof capture.modelId === "string" ? capture.modelId : null,
        sourceReasoningEffort:
          typeof capture.reasoningEffort === "string" ? capture.reasoningEffort : null,
        roleId,
        taskTypeId,
        hasRecordedToolResults: hasRecordedToolResults(capture),
        replayProduced: false,
        sourceClass,
        messages,
        requirements: readReplayRequestRequirements(capture),
        replayDispositionSettled: settledRefs.has(requestId),
      });
    }
    return captures;
  } catch (error) {
    if (process.env.ROLE_MODEL_FOCUS_DIAG)
      console.error(
        `[replay-projection] unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    return null;
  }
}
