import { createHash } from "node:crypto";

import {
  NoReplayableRequest,
  type RouteFocusCandidate,
  type RouteLadderRolledBack,
  type RouteLadderRung,
  type RouteLearningDefaults,
  planChallenge,
  planFocusDispatch,
  selectFocusTask,
  stalenessWindowMs,
} from "@role-model-router/core";
import { Effect, Ref, Schedule } from "effect";

import {
  type AutoReplayCapture,
  type AutoReplayExecution,
  type AutoReplayTickResult,
  resolveReplayJudgeFallbackEndpointIds,
  runAutoReplayTick,
} from "./track-b-auto-replay.js";

/**
 * Run 98 R2: durable replay states that can never be dispatched again. RC16 freezes a replay
 * job's deadline at creation, so a job that already timed out (or was expired, failed, or
 * cancelled) must be reported as terminal; otherwise the producer re-defers the capture on
 * every tick and the pending queue never drains.
 */
const TERMINAL_REPLAY_JOB_STATES = new Set(["timed_out", "expired", "failed", "cancelled"]);

/**
 * Run 97 automatic replay receipt accounting.
 *
 * The supervised replay endpoint answers with the durable outcome of the replay
 * job. The automatic producer may only treat that job as a completed
 * counterfactual when Evaluation Core also completed durably (`state ===
 * "complete"`). A job in `awaiting_evaluation` has produced provider dispatch and
 * branch evidence, but no comparison, so the capture stays retryable and the
 * ledger must not mark it terminal.
 */
/**
 * Run 101 addendum 26: a replay receipt that produced branches but no comparison still owes an evaluation.
 *
 * Measured on `:3457` (2026-09-28 ~06:0x): 134 replays completed, blobs were written, and **zero** evaluation jobs
 * were offered - `evaluation.score` stayed at 41 completed with no row newer than 05:41, no
 * `RoutingEvaluationExecutionContextV1` contract has been written since 27-Sep 20:35, and `learner.derive` sat at
 * 13. The sidecar's replay receipt returns `state: "awaiting_evaluation"` "produced branches but no comparison, so
 * it stays retryable" (`cli.ts:7123`), and nothing converted that state into the evaluation offer the host owns:
 * the host's `handoffEvaluation` (`cli.ts:8149`) is only reached by the supervised-replay executor, which the queue
 * worker does not drive.
 *
 * This predicate is the conversion: an `awaiting_evaluation` receipt that names its replay job is a request for the
 * evaluation plane to take the job (the same offer the supervised path makes), and anything else - complete,
 * terminal, or an unnamed receipt - is not.
 */
export function evaluationHandoffRequestFromCommandReceipt(
  receipt: unknown,
): { readonly replayJobId: string } | null {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    return null;
  }
  const record = receipt as Record<string, unknown>;
  if (record.state !== "awaiting_evaluation") {
    return null;
  }
  for (const field of ["replayJobId", "jobId", "id"] as const) {
    const value = record[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return { replayJobId: value.trim() };
    }
  }
  return null;
}

/**
 * Run 101 addendum 27 (the operator's rule: "implement using effect and effect-mq"): the handoff offer is an Effect
 * program with a typed failure and a bounded retry - the effect-mq guidance's retry shape - instead of an inline
 * promise `.catch`. An offer the queue plane refuses is a failure for this program (a transient
 * `queue_offer_failed: …` deserves the retry), and after the bound it resolves as a value: the replay itself already
 * succeeded, so a refused handoff is reported, never thrown.
 */
/**
 * Run 101 addendum 32 (the operator's rule: USE EFFECT): the trial claim is an Effect program, not a bare await.
 *
 * `evaluation:claim-trial` is the lease authority for a resumed comparison, and its failure modes are the ones the
 * ledger names - a store that is momentarily busy (`invalid scheduler claim receipt`, `durable replay state is
 * queued`) versus a trial that is genuinely not claimable. The former deserves the effect-mq guidance's bounded
 * retry; the latter is a value the caller already handles (`!claimed` → refusal). Modelling it as an Effect program
 * keeps that distinction in the type of the failure rather than in a try/catch ladder: a transient fault is retried
 * with a spaced schedule, and the bound resolves as `null` so the caller's existing no-claim path runs unchanged.
 */
export function claimEvaluationTrial<T>(input: {
  readonly trialId: string;
  readonly workerId: string;
  readonly claim: () => Promise<T>;
}): Promise<T | null> {
  const program = Effect.tryPromise({
    try: () => input.claim(),
    catch: (error) =>
      error instanceof Error ? error.message.slice(0, 160) : "evaluation trial claim failed",
  }).pipe(
    Effect.retry({ times: 2, schedule: Schedule.spaced("250 millis") }),
    Effect.catch(() => Effect.succeed(null)),
  );
  return Effect.runPromise(program);
}

/**
 * Run 101 addendum 27 (the operator's rule: "implement using effect and effect-mq"): the handoff offer is an Effect
 */
export function offerEvaluationHandoff(input: {
  readonly replayJobId: string;
  readonly offer: (request: {
    readonly origin: "replay";
    readonly replayJobId: string;
  }) => Promise<{ readonly enqueued: boolean; readonly reason?: string }>;
}): Promise<{ readonly enqueued: boolean; readonly reason?: string }> {
  const program = Effect.tryPromise({
    try: async () => {
      const offered = await input.offer({ origin: "replay", replayJobId: input.replayJobId });
      if (!offered.enqueued) {
        throw new Error(offered.reason ?? "evaluation offer declined");
      }
      return offered;
    },
    catch: (error) =>
      error instanceof Error ? error.message.slice(0, 160) : "evaluation offer failed",
  }).pipe(
    Effect.retry({ times: 2, schedule: Schedule.spaced("250 millis") }),
    Effect.catch((reason: string) => Effect.succeed({ enqueued: false, reason })),
  );
  return Effect.runPromise(program);
}

/**
 * Run 101 addendum 36 (measured live on `:3457`, 2026-09-28): the handoff must be recorded *before* its
 * evaluation job is offered.
 *
 * The live path offered the queue row first and only wrote the resume entry later, inside the completion. An
 * attempt interrupted in that window left a queue row whose scoped resume store held nothing at all — the
 * worker classified it `no-op`, acked it, and the row was recorded `completed`. 19 of the 46 `evaluation.score`
 * rows had no resume entry and no Evaluation Core job, and 16 of those were recorded `completed`: the
 * comparison the replay had already paid for was silently dropped rather than failed.
 *
 * Recording first inverts the window: an interruption now leaves a resumable entry, which is what the sweep
 * exists to finish. The record call is best-effort by construction — a store that refuses the write is a
 * defect the caller already logs, and it must not turn a successful replay into a failed handoff — so it is
 * attempted first and the offer runs either way.
 */
export function offerRecordedEvaluationHandoff(input: {
  readonly replayJobId: string;
  /** Writes (idempotently) this handoff's resume entry. Called before the offer, exactly once. */
  readonly record: () => void;
  readonly offer: (request: {
    readonly origin: "replay";
    readonly replayJobId: string;
  }) => Promise<{ readonly enqueued: boolean; readonly reason?: string }>;
}): Promise<{ readonly enqueued: boolean; readonly reason?: string }> {
  try {
    input.record();
  } catch {
    // The caller reports its own refusal (a declined entry is logged where it is written); the ordering this
    // helper owns is "record, then offer", and a store that refuses must not cost the replay its handoff.
  }
  return offerEvaluationHandoff({ replayJobId: input.replayJobId, offer: input.offer });
}

export function autoReplayExecutionFromCommandReceipt(receipt: unknown): AutoReplayExecution {
  const record =
    receipt && typeof receipt === "object" && !Array.isArray(receipt)
      ? (receipt as Record<string, unknown>)
      : null;
  if (!record) {
    return {
      terminal: false,
      branches: [],
      failureDetail: "replay command receipt was not a durable object",
    };
  }
  const state = typeof record.state === "string" && record.state ? record.state : "unknown";
  const branches = (Array.isArray(record.branches) ? record.branches : []).flatMap((branch) => {
    if (!branch || typeof branch !== "object" || Array.isArray(branch)) return [];
    const row = branch as Record<string, unknown>;
    const endpointId = typeof row.candidateEndpointId === "string" ? row.candidateEndpointId : "";
    if (!endpointId) return [];
    const outcome =
      row.outcome === "complete" || row.outcome === "failed" || row.outcome === "refused"
        ? row.outcome
        : row.outcome === "append_recovery"
          ? "complete"
          : "failed";
    return [{ endpointId, outcome } as const];
  });
  const dispatches = (Array.isArray(record.dispatches) ? record.dispatches : []).flatMap(
    (dispatch) => {
      if (!dispatch || typeof dispatch !== "object" || Array.isArray(dispatch)) return [];
      const row = dispatch as Record<string, unknown>;
      const endpointId = typeof row.endpointId === "string" ? row.endpointId : "";
      if (!endpointId) return [];
      const outcome =
        row.outcome === "complete" || row.outcome === "failed" || row.outcome === "refused"
          ? row.outcome
          : row.outcome === "append_recovery"
            ? "complete"
            : "failed";
      const kind = row.kind === "retry" || row.kind === "derived" ? row.kind : "candidate";
      return [
        {
          kind,
          endpointId,
          attempt:
            Number.isSafeInteger(row.attempt) && Number(row.attempt) > 0 ? Number(row.attempt) : 1,
          costMicros:
            Number.isSafeInteger(row.costMicros) && Number(row.costMicros) >= 0
              ? Number(row.costMicros)
              : 0,
          bytes: Number.isSafeInteger(row.bytes) && Number(row.bytes) >= 0 ? Number(row.bytes) : 0,
          outcome,
        } as const,
      ];
    },
  );
  if (state !== "complete") {
    const terminal = TERMINAL_REPLAY_JOB_STATES.has(state);
    return {
      terminal,
      branches,
      dispatches,
      failureDetail: terminal ? `durable replay job ${state}` : `durable replay state is ${state}`,
    };
  }
  return { terminal: true, branches, dispatches };
}
import type { ReplayLedger } from "./track-b-replay-ledger.js";
import type { ReplayPolicySet, ReplayToolPolicy } from "./track-b-replay-policy.js";

/**
 * Run 97 automatic replay loop.
 *
 * Runs the bounded auto-replay tick against the private operations boundary on an
 * interval: read pending captures, replay them through the supplied executor, and
 * write every disposition back. Ticks never overlap, failures degrade instead of
 * crashing the runtime, and the loop reports bounded health counters.
 */

export interface AutoReplayOperations {
  listPendingReplayCaptures(input: {
    readonly policySetDigest: string;
    readonly limit?: number;
  }): Promise<unknown>;
  recordReplayDisposition(input: Record<string, unknown>): Promise<unknown>;
  /**
   * Run 97 RC07 (L2): optional bounded sweep that expires replay jobs whose deadline
   * has elapsed. A runtime whose boundary does not expose the sweep keeps working;
   * the tick simply reports zero expired jobs.
   */
  expireStaleReplayJobs?(input: Record<string, unknown>): Promise<unknown>;
  /**
   * Run 99 R33 live finding: optional bounded sweep that re-runs a supervised-replay evaluation
   * whose completion was interrupted (a restart between "scores recorded" and "comparison group
   * finalized" strands the durable job in `scoring` forever, because the producer only drives
   * *replay jobs* and those are already terminal). A runtime whose boundary does not expose the
   * sweep keeps working; the tick simply reports zero resumed evaluations.
   */
  resumePendingEvaluations?(input: Record<string, unknown>): Promise<unknown>;
  /**
   * Run 100 addendum `evaluation-lease-wedge-repair.addendum-02` S1: optional bounded sweep over
   * *evaluation* jobs that never reached a terminal state. It completes a job whose comparison is
   * finalized, marks a lease-free job with no non-terminal trial as stranded, and reclaims it after the
   * grace. The extension exposes `evaluation:reconcile-jobs` for exactly this and, until now, nothing in
   * production called it — which is how 18 jobs stayed "in flight" for two days. A runtime whose boundary
   * does not expose the sweep keeps working; the tick simply reports zero reconciled jobs.
   */
  reconcileEvaluationJobs?(input: Record<string, unknown>): Promise<unknown>;
  /**
   * Run 100 addendum `handoff-evidence-durability.addendum-06` S46: finalize a comparison whose trials are all
   * scored and which has no group. Measured live: the newest durable evaluation jobs hold 2-4 **scored** trials
   * with their declared pair satisfied and no comparison group, and were released as
   * `evaluation_job_stranded_without_finalized_comparison` - `evaluation:retro-finalize-comparisons` has a core
   * method and a capability and, until this sweep, no production caller.
   */
  retroFinalizeEvaluations?(input: Record<string, unknown>): Promise<unknown>;
  /**
   * Run 100 addendum 39 (2026-09-26): the post-finalization signals producer. Live on run175c/`b7f04039` the
   * learner's derivation pass computed the report it was missing, but it walks oldest-first and met 79
   * `capture … is outside the retention window` skips for 9 analyses - a comparison whose report is written only
   * when the learner reaches it has already outlived its captures. This sweep runs directly after the
   * retro-finalization pass and produces the report while the evidence is fresh: bounded page, bounded computes,
   * wall-clock budget, idempotent, and it never re-analyzes a group whose own report exists.
   */
  sweepFinalizationSignals?(input: Record<string, unknown>): Promise<unknown>;
  /**
   * Run 100 addendum 07 P6: the learner's own liveness. A candidate the store never validated is driven through
   * the worker's validate/promote steps from durable evidence, so learning no longer depends on the pipeline run
   * that happened to derive it. Returns the number consumed and how many remain.
   */
  learnFromUnconsumedCandidates?(input: Record<string, unknown>): Promise<unknown>;
  /**
   * Run 100 addendum 10 S13: the learner's durable derivation half. The sweep above consumes candidates that exist;
   * nothing in the runtime *creates* one outside `runTrackBShadowPipeline`, so a finalized comparison the pipeline
   * never carried is evidence no learner can reach (measured 2026-09-25: 281 learnable groups with no candidate,
   * 136 of them naming a persisted signal report). Bounded per tick, idempotent, durable readbacks only.
   */
  deriveLearnerCandidates?(input: Record<string, unknown>): Promise<unknown>;
  /**
   * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S7: optional bounded pass that finds durable
   * replay jobs which handed their branches to evaluation but never got an evaluation job (an attempt
   * interrupted between the handoff and the host's resume-entry write) and records the resume entries the
   * evaluation sweep completes. Without it those jobs are unclaimable and their captures are lost.
   */
  recoverHandedOffEvaluations?(input: Record<string, unknown>): Promise<unknown>;
}

/**
 * Run 105 R8/R9: the ladder row the store answers for one (role, task) - the shape Package B owns.
 * Optional fields stay optional so a store that answers a narrower row (a legacy readback) does not
 * break the tick; the focus readouts then report what is actually known.
 */
/** Durable evaluation readback, NOT a provider/branch completion receipt. Null means not finalized. */
export interface FinalizedRouteChallenge {
  readonly comparisonGroupId: string;
  readonly finalizedAtMs: number;
  readonly effortComparable: boolean;
  /** Null is a finalized tie; a winner must be one of the requested pair. */
  readonly winnerEndpointId: string | null;
}

export interface RouteChallengeReadRequest {
  /** Require a genuinely finalized group created at/after this scheduling cutoff. */
  readonly sinceMs?: number;
  readonly excludedComparisonGroupIds?: readonly string[];
  readonly roleId: string;
  readonly taskTypeId: string;
  readonly captureRef: string;
  readonly newEndpointId: string;
  readonly againstEndpointId: string;
}

export interface RouteDispatchEvidence extends FinalizedRouteChallenge {
  readonly captureRef: string;
  readonly newEndpointId: string;
  readonly againstEndpointId: string;
  readonly judgeConfidence: number;
  /** Actual confidence for request.endpointId, not the comparison winner. */
  readonly endpointConfidence: number;
}
export interface PendingRouteDispatch {
  readonly dispatchRoundId?: string;
  readonly sourceType: "replay" | "queue";
  readonly replayJobId: string | null;
  readonly queueJobId: string | null;
  readonly captureRef: string;
  readonly newEndpointId: string;
  readonly againstEndpointId: string;
  readonly createdAtMs: number;
  readonly state: "queued" | "running" | "awaiting_evaluation" | "failed" | "cancelled" | "timed_out";
}
export interface PendingRouteDispatchReadRequest {
  readonly roleId: string;
  readonly taskTypeId: string;
}
export interface RouteDispatchEvidenceReadRequest {
  readonly roleId: string;
  readonly taskTypeId: string;
  readonly endpointId: string;
  readonly sinceMs?: number;
}

export interface RouteLadderRow {
  readonly rungs?: readonly RouteLadderRung[] | null;
  readonly completeness?: { readonly admitted?: number; readonly configured?: number } | null;
  readonly nextEligibleAtMs?: number | null;
  readonly version?: number | null;
  readonly rolledBack?: RouteLadderRolledBack | null;
}

/**
 * Run 105 Phase 3.5 CLI-compile repair: decode a store answer into the typed RouteLadderRow the
 * tick consumes. The answer crosses a process boundary as JSON, so this is the ONE place where it
 * becomes typed - the provider returns this instead of `unknown` (the original TS2322 at cli.ts).
 *
 * It decodes only the fields the tick reads and NEVER throws: a malformed or absent answer is
 * `null` ("no ladder known"), which is the fail-closed path the tick already handles. A rung whose
 * status is outside the contract is dropped rather than coerced, so an unknown status can never be
 * walked as if it were `available`.
 */
export function decodeRouteLadderRow(value: unknown): RouteLadderRow | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const rungs = (Array.isArray(record.rungs) ? record.rungs : []).flatMap((rung) => {
    if (!rung || typeof rung !== "object" || Array.isArray(rung)) return [];
    const row = rung as Record<string, unknown>;
    const endpointId = typeof row.endpointId === "string" ? row.endpointId : "";
    const rank = Number.isSafeInteger(row.rank) ? Number(row.rank) : 0;
    const status = row.status;
    if (!endpointId || rank < 1) return [];
    if (status !== "available" && status !== "unavailable") return [];
    return [{ endpointId, rank, status } as RouteLadderRung];
  });
  const completenessRecord =
    record.completeness && typeof record.completeness === "object" && !Array.isArray(record.completeness)
      ? (record.completeness as Record<string, unknown>)
      : {};
  const admitted = Number.isSafeInteger(completenessRecord.admitted) ? Number(completenessRecord.admitted) : 0;
  const configured = Number.isSafeInteger(completenessRecord.configured) ? Number(completenessRecord.configured) : 0;
  const rolledBackRecord =
    record.rolledBack && typeof record.rolledBack === "object" && !Array.isArray(record.rolledBack)
      ? (record.rolledBack as Record<string, unknown>)
      : {};
  return {
    rungs,
    completeness: { admitted, configured },
    nextEligibleAtMs: Number.isFinite(record.nextEligibleAtMs) ? Number(record.nextEligibleAtMs) : null,
    version: Number.isSafeInteger(record.version) ? Number(record.version) : null,
    rolledBack: {
      on: rolledBackRecord.on === true,
      reason: typeof rolledBackRecord.reason === "string" ? rolledBackRecord.reason : null,
      atMs: Number.isFinite(rolledBackRecord.atMs) ? Number(rolledBackRecord.atMs) : null,
    },
  };
}

export interface AutoReplayLoopHealth {
  readonly ticks: number;
  readonly running: boolean;
  readonly paused: boolean;
  readonly lastOutcome: "idle" | "ok" | "degraded";
  readonly lastError: string | null;
  readonly lastProcessedAtMs: number | null;
  readonly lastExpiredJobs: number;
  readonly lastResumedEvaluations: number;
  /** Jobs the reconcile pass completed because their comparison group is finalized. */
  readonly lastReconciledEvaluations: number;
  /** Jobs the reconcile pass observed as stranded (no live lease, no non-terminal trial). */
  readonly lastStrandedEvaluations: number;
  /** Stranded jobs the reconcile pass terminalized after the grace. */
  readonly lastReclaimedEvaluations: number;
  /** Handed-off replays the recovery pass turned back into completable evaluation work. */
  readonly lastRecoveredHandoffs: number;
  /**
   * Run 105 R8/R9: the focus ladder readouts. The dispatcher holds ONE focus task and fills its
   * ladder depth-first, so an operator needs to see which (role, task) is being filled, how many
   * configured endpoints are still unranked, and whether a new-endpoint challenge is in flight.
   * focusTaskKey is the composite `roleId\u0000taskTypeId` scope key (D9) and is null when no
   * classified task has recorded a request.
   */
  readonly focusTaskKey: string | null;
  readonly focusRemaining: number;
  readonly challengeInFlight: boolean;
  /** Captures this tick refused for carrying no (role, task) classification (R1/R8). */
  readonly lastUnclassifiedCaptures: number;
}

export interface AutoReplayLoopStatus extends AutoReplayLoopHealth {
  readonly budget: {
    readonly window: string;
    readonly counterfactuals: number;
    readonly reservedCounterfactuals: number;
    readonly reservedDispatches: number;
    readonly dispatches: number;
    readonly counterfactualLimit: number;
    readonly dispatchLimit: number;
  };
  readonly lastDispositions: number;
}

const emptyResult = (): AutoReplayTickResult => ({
  processed: 0,
  replayed: 0,
  refused: 0,
  deferred: 0,
  queued: 0,
  dispositions: [],
  cursor: null,
  budgetExhausted: false,
});

export function startAutoReplayLoop(input: {
  readonly operations: AutoReplayOperations;
  readonly ledger: ReplayLedger;
  readonly policySet: ReplayPolicySet;
  /**
   * Configured endpoints may change while the runtime is up (an operator adds an
   * endpoint after launch), so callers may supply a provider that is re-read on
   * every tick instead of a snapshot.
   */
  readonly configuredEndpointIds: readonly string[] | (() => readonly string[]);
  /**
   * Endpoints the runtime can actually dispatch to. A provider may be supplied so a
   * credential-less or degraded endpoint is re-evaluated every tick instead of being
   * frozen at loop construction; resolving to null means "no health filter is
   * currently known", which must not be treated as "no endpoint is healthy".
   */
  readonly healthyEndpointIds?:
    | readonly string[]
    | (() => readonly string[] | null | Promise<readonly string[] | null>);
  readonly executor: (input: {
    readonly dispatchRoundId?: string;
    readonly capture: AutoReplayCapture;
    readonly candidates: readonly string[];
    readonly toolPolicy: ReplayToolPolicy;
    readonly policySet: ReplayPolicySet;
    readonly reservationId: string;
    /** Aborted when the per-capture budget expires, so the provider fetch/branch append is cancelled (addendum 12). */
    readonly signal?: AbortSignal;
  }) => Promise<AutoReplayExecution>;
  readonly intervalMs?: number;
  readonly maxCapturesPerTick?: number;
  /**
   * Run 98 addendum 04 §7 (`L4`). Measured live on v170: one capture whose replay never returned
   * held the whole producer tick open (`ticks: 0`, `lastProcessedAtMs: null`), so no disposition was
   * recorded, the expiry sweep never ran, and eight replay jobs accumulated in `running` past their
   * deadline. The default is deliberately larger than a replay job's own deadline plus its
   * finalization grace (6 min + 5 min), so a legitimately slow multi-candidate replay is never
   * abandoned early; only work that has outlived even the durable job's own bound is cut off.
   */
  readonly executorTimeoutMs?: number;
  /**
   * Run 98 addendum 04 follow-on: the tick's wall-clock budget, so a tick made of several
   * minutes-long replays cannot hold the loop open for tens of minutes. `0` disables the bound.
   */
  readonly tickBudgetMs?: number;
  /**
   * Run 98 addendum 52: how long a replay-budget reservation may outlive its dispatch before the next tick
   * treats it as orphaned and releases it (`ROLE_MODEL_REPLAY_RESERVATION_TTL_MS`).
   */
  readonly reservationTtlMs?: number;
  /**
   * Run 101 R4: the replay plane's queue, resolved by the caller from the queue
   * policy. Omitted keeps the hand-rolled path authoritative; `shadow` feeds the
   * queue while the loop stays authoritative; `queue` hands the work to a worker
   * and this loop stops dispatching it.
   */
  readonly dispatchQueue?: {
    readonly mode: "legacy" | "shadow" | "queue";
    readonly offer: (job: {
      readonly captureRef: string;
      readonly endpointIds: readonly string[];
      readonly policySetDigest: string;
      readonly dispatchRoundId?: string;
    }) => Promise<{ readonly enqueued: boolean; readonly reason?: string }>;
  };
  /**
   * Run 101 R7: once a plane's queue is authoritative, the loops the queue
   * replaced must stop being schedulers. The caller passes each plane's mode;
   * `legacy` (the shipped default) keeps every sweep running exactly as before,
   * so a rollback restores the old behaviour with no other change.
   */
  readonly planeModes?: {
    readonly replay?: "legacy" | "shadow" | "queue";
    readonly evaluation?: "legacy" | "shadow" | "queue";
    readonly learner?: "legacy" | "shadow" | "queue";
  };
  /**
   * Run 98 addendum 56 §6: resolves the endpoint that currently judges comparisons (the configured controller).
   * Resolved per tick so a controller change takes effect without a restart, exactly like the judge itself.
   */
  readonly resolveJudgeEndpointId?: () => Promise<string | null>;
  readonly now?: () => number;
  readonly setIntervalFn?: (handler: () => void, timeout: number) => unknown;
  readonly clearIntervalFn?: (handle: unknown) => void;
  /**
   * Run 105 R8/R9: the focus-task census and the per-task ladder readback. Both are providers, not
   * snapshots, so an endpoint added (or a task rolled back) while the runtime is up takes effect on
   * the next tick - the same rule the configured-endpoint list already follows. Omitted keeps the
   * pre-105 behaviour exactly: no focus is selected and no capture is narrowed.
   */
  readonly routeFocusCandidates?: () => Promise<readonly RouteFocusCandidate[] | null> | readonly RouteFocusCandidate[] | null;
  readonly readRouteLadder?: (input: {
    readonly roleId: string;
    readonly taskTypeId: string;
  }) => Promise<RouteLadderRow | null> | RouteLadderRow | null;
  /**
   * Run 105 R8: the classification census reported once per tick. When supplied, the loop logs the
   * named class (and never more than once per tick) instead of staying silent about the captures it
   * refused.
   */
  readonly reportUnclassifiedCaptures?: (input: {
    readonly count: number;
    readonly code: "no_route_classification";
  }) => void;
  /**
   * Run 105 R11: the routeLearning constants, read through the product-defaults loader. They govern
   * the challenge batch bound and the staleness window; omitted keeps the documented shipped values,
   * so a runtime without the wiring behaves exactly as the guidance copy says.
   */
  readonly routeLearningDefaults?: RouteLearningDefaults | null;
  /** Exact-task durable replay jobs; null unavailable, [] a complete empty read. */
  readonly readPendingRouteDispatches?: (request: PendingRouteDispatchReadRequest) =>
    Promise<readonly PendingRouteDispatch[] | null> | readonly PendingRouteDispatch[] | null;
  /** Complete durable enumeration. Null means unavailable, [] means no finalized groups. */
  readonly readRouteDispatchEvidence?: (request: RouteDispatchEvidenceReadRequest) =>
    Promise<readonly RouteDispatchEvidence[] | null> | readonly RouteDispatchEvidence[] | null;
  /** Exact task historical capture readback; actual replayability/terminal state stays with owner. */
  readonly readRouteReplayableCaptures?: (request: { readonly roleId: string; readonly taskTypeId: string }) =>
    Promise<readonly AutoReplayCapture[] | null> | readonly AutoReplayCapture[] | null;
  /** CLI must bind to finalized, effort-comparable groups for this exact task/capture/pair.
   * Never synthesize a verdict from replay terminal state, branches, or a ladder version change. */
  readonly readFinalizedRouteChallenge?: (
    request: RouteChallengeReadRequest,
  ) => Promise<FinalizedRouteChallenge | null> | FinalizedRouteChallenge | null;
  /**
   * Run 105 R8: recompute one task's refresh eligibility (nextEligibleAtMs). Called by the sweep for
   * a complete task whose window has not been recorded yet; a new configured endpoint sets it to
   * "now" through the same capability, which is what breaks the idle immediately.
   */
  readonly markRouteLadderEligible?: (input: {
    readonly roleId: string;
    readonly taskTypeId: string;
    readonly nextEligibleAtMs: number;
  }) => Promise<unknown> | unknown;
}): {
  tick(): Promise<AutoReplayTickResult & { readonly skipped?: boolean }>;
  /**
   * Run 101 R4: the single-capture entry the replay queue's worker uses. It is
   * the same body as `tick()`, restricted to one capture and run with the queue
   * disabled so a queued job cannot re-enqueue itself.
   */
  dispatchCapture(
    captureRef: string,
    dispatchRoundId?: string,
  ): Promise<AutoReplayTickResult & { readonly skipped?: boolean }>;
  stop(): void;
  pause(): void;
  resume(): void;
  health(): AutoReplayLoopHealth;
  status(): AutoReplayLoopStatus;
} {
  const now = input.now ?? (() => Date.now());
  const maxCapturesPerTick = input.maxCapturesPerTick ?? 8;
  let running = false;
  let ticks = 0;
  let lastOutcome: AutoReplayLoopHealth["lastOutcome"] = "idle";
  let lastError: string | null = null;
  let lastProcessedAtMs: number | null = null;
  let paused = false;
  let lastDispositions = 0;
  let lastExpiredJobs = 0;
  let lastResumedEvaluations = 0;
  let lastReconciledEvaluations = 0;
  let lastStrandedEvaluations = 0;
  let lastReclaimedEvaluations = 0;
  let lastRecoveredHandoffs = 0;
  /**
   * Run 105 R8/R9: the focus ladder state the tick maintains. It is DERIVED each tick from the
   * classification census and the ladders the store answers - never a stored active-pack pointer
   * (D7), so a task activates the moment its floor is met.
   */
  let focusTaskKey: string | null = null;
  let focusRemaining = 0;
  let challengeInFlight = false;
  interface ChallengeProgress {
    readonly kind?: "refresh" | "challenge";
    readonly startedAtMs?: number;
    readonly endpointId: string;
    readonly against: readonly string[];
    readonly cursor: number;
    readonly pendingCaptureRef: string | null;
    readonly done: boolean;
    readonly usedCaptureRefs?: readonly string[];
    readonly placementComplete?: boolean;
    readonly completedGroupIds?: readonly string[];
    readonly pendingRoundId?: string;
  }
  // Ref holds only scheduling progress. Admission/activation remain derived from the store's floor.
  // Durable pair verdicts stay in Evaluation Core; this process never writes an invented receipt.
  const challenges = Ref.makeUnsafe(new Map<string, ChallengeProgress>());
  const heldFocus = Ref.makeUnsafe<string | null>(null);
  const stageExecutionBusy = Ref.makeUnsafe(false);
  const seenConfigured = Ref.makeUnsafe(new Map<string, readonly string[]>());
  const dispatchedChallenges = new Set<string>();
  const setChallenge = (key: string, value: ChallengeProgress) => Effect.runSync(
    Ref.update(challenges, current => new Map(current).set(key, value)),
  );
  const readFinalized = async (request: RouteChallengeReadRequest) => {
    if (!input.readFinalizedRouteChallenge) throw new Error("route challenge finalization unavailable: CLI binding required");
    return Effect.runPromise(Effect.tryPromise({
      try: async () => input.readFinalizedRouteChallenge!(request),
      catch: cause => new Error(
        "route challenge finalization unavailable: " + (cause instanceof Error ? cause.message : String(cause)),
      ),
    }));
  };
  const applyFinalized = async (key: string, progress: ChallengeProgress, answer: FinalizedRouteChallenge | null) => {
    if (!answer || progress.completedGroupIds?.includes(answer.comparisonGroupId)) return false;
    const againstEndpointId = progress.against[progress.cursor];
    if (!answer.comparisonGroupId || !Number.isFinite(answer.finalizedAtMs) ||
        answer.effortComparable !== true || answer.finalizedAtMs < (progress.startedAtMs ?? 0) ||
        (answer.winnerEndpointId !== null && answer.winnerEndpointId !== progress.endpointId &&
          answer.winnerEndpointId !== againstEndpointId)) {
      throw new Error("route challenge finalization unavailable: invalid or non-comparable pair verdict");
    }
    if (progress.kind === "refresh") {
      if (!input.markRouteLadderEligible) throw new Error("route ladder eligibility unavailable: CLI binding required");
      const [roleId, taskTypeId] = key.split("\u0000");
      const windowMs = input.routeLearningDefaults ? stalenessWindowMs(input.routeLearningDefaults) : 30 * 24 * 60 * 60 * 1000;
      await input.markRouteLadderEligible({ roleId: roleId!, taskTypeId: taskTypeId!, nextEligibleAtMs: now() + windowMs });
    }
    const cursor = progress.cursor + 1;
    setChallenge(key, { ...progress, cursor, pendingCaptureRef: null, pendingRoundId: undefined,
      done: answer.winnerEndpointId === progress.endpointId || cursor >= progress.against.length });
    return true;
  };
  let timer: unknown = null;

  const pendingCaptures = (value: unknown): readonly AutoReplayCapture[] => {
    const record =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    const list = Array.isArray(value)
      ? value
      : Array.isArray(record?.pending)
        ? record.pending
        : [];
    const captures: AutoReplayCapture[] = [];
    for (const item of list) {
      if (typeof item === "string") {
        const captureRef = item.trim();
        if (captureRef) {
          captures.push({
            captureRef,
            sourceEndpointId: null,
            hasRecordedToolResults: true,
          });
        }
        continue;
      }
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const captureRef = typeof row.captureRef === "string" ? row.captureRef.trim() : "";
      if (!captureRef) continue;
      captures.push({
        captureRef,
        sourceEndpointId:
          typeof row.sourceEndpointId === "string" && row.sourceEndpointId.trim()
            ? row.sourceEndpointId.trim()
            : null,
        hasRecordedToolResults: row.hasRecordedToolResults !== false,
        /**
         * Run 100 addendum 16 item 3 / 8a: the class the projection read off the capture's durable root
         * travels with the capture, so the admission decision refuses a non-discriminating probe by
         * name instead of inferring anything from the request itself.
         */
        sourceClass:
          typeof row.sourceClass === "string" && row.sourceClass.trim()
            ? row.sourceClass.trim()
            : null,
        // Replay output is never a replay source: the private boundary classifies
        // captures it produced while replaying, and the producer refuses them with
        // `amplification_depth_exceeded` instead of dispatching again.
        replayProduced: row.replayProduced === true,
        /**
         * Run 105 R1/R8: the route classification travels with the capture. The tick's gate refuses
         * a capture that lacks BOTH ids (a scope-wide pack does not exist, so there is no ladder to
         * fill), and the focus-task census counts the classified ones. Absent on a capture whose
         * recorded decision predates the field, which is exactly the case the gate names.
         */
        roleId: typeof row.roleId === "string" && row.roleId.trim() ? row.roleId.trim() : null,
        taskTypeId:
          typeof row.taskTypeId === "string" && row.taskTypeId.trim() ? row.taskTypeId.trim() : null,
      });
    }
    return captures;
  };

  /**
   * Run 105 R1/R8: the per-tick classification census. A capture without BOTH ids is never
   * admitted, and the loop reports the count ONCE per tick (with the named code) instead of
   * logging per capture, so an operator sees the class without the log being flooded by it.
   */
  let lastUnclassifiedCaptures = 0;
  let lastRouteClassificationReportedAtMs: number | null = null;

  /**
   * Run 98 addendum 04 §7 (`L7`), measured live on v171/v172: a work tick walks up to eight captures
   * at ~4 minutes per real dsh replay, so it can hold the loop for tens of minutes — and the deadline
   * sweep used to run only *after* that work. Ten replay jobs accumulated in `running` at ages up to
   * 79 minutes against a 360 s deadline, and the newest expiry in the whole store was still 08:16Z.
   * Liveness bookkeeping (expiring overdue jobs, resuming stranded evaluations) must not be hostage
   * to replay throughput, so it is now runnable on its own with a re-entrancy guard.
   */
  let sweeping = false;
  /**
   * The reconcile pass answers with three job-id lists (`completed`, `stranded`, `reclaimed`) plus the
   * scanned total. Counts are derived from the lists so a boundary that returns only the arrays - the
   * shipped extension shape - is read correctly, and a boundary that returns numbers keeps working.
   */
  const countOf = (value: unknown): number => {
    if (Array.isArray(value)) return value.length;
    return Number.isSafeInteger(value) && (value as number) >= 0 ? Number(value) : 0;
  };
  const runLivenessSweeps = async (
    window: Record<string, unknown>,
  ): Promise<{
    expired: number;
    resumed: number;
    reconciled: number;
    stranded: number;
    reclaimed: number;
    recovered: number;
    derived: number;
    derivationBacklog: number;
    /** Run 105 R8: complete tasks whose staleness window elapsed and are due a refresh replay. */
    refreshedLadders: number;
    /** Addendum 39: reports the post-finalization signals sweep produced this tick. */
    finalizationSignals: number;
    /** Addendum 39: candidates that sweep left for the next tick (bound or wall-clock budget). */
    finalizationSignalsDeferred: number;
    error: string | null;
  }> => {
    if (sweeping) {
      return {
        expired: 0,
        resumed: 0,
        reconciled: 0,
        stranded: 0,
        reclaimed: 0,
        recovered: 0,
        derived: 0,
        derivationBacklog: 0,
        refreshedLadders: 0,
        finalizationSignals: 0,
        finalizationSignalsDeferred: 0,
        error: null,
      };
    }
    sweeping = true;
    let expired = 0;
    let resumed = 0;
    let reconciled = 0;
    let retroFinalized = 0;
    let learned = 0;
    let learnersPending = 0;
    let stranded = 0;
    let reclaimed = 0;
    let recovered = 0;
    let derivedCandidates = 0;
    let derivationBacklog = 0;
    let finalizationSignals = 0;
    let finalizationSignalsDeferred = 0;
    /** Run 105 R8: complete ladders whose staleness window elapsed this sweep. */
    let refreshedLadders = 0;
    let error: string | null = null;
    try {
      if (typeof input.operations.expireStaleReplayJobs === "function") {
        try {
          const sweep = (await input.operations.expireStaleReplayJobs({
            window,
            policySetDigest: input.policySet.policySetDigest,
          })) as { readonly expiredCount?: unknown } | null;
          if (
            sweep &&
            Number.isSafeInteger(sweep.expiredCount) &&
            Number(sweep.expiredCount) >= 0
          ) {
            expired = Number(sweep.expiredCount);
          }
        } catch (cause) {
          // The dispositions are already durable, so a failed sweep degrades health instead of
          // discarding the work that succeeded.
          error =
            cause instanceof Error
              ? `replay expiration sweep failed: ${cause.message.slice(0, 200)}`
              : "replay expiration sweep failed";
        }
      }
      // Run 99 R33: the same bounded shape for interrupted supervised-replay evaluations. Without it
      // a stranded evaluation is never retried, because the producer only drives replay jobs and
      // those are already terminal.
      /**
       * Run 101 R7: the evaluation queue owns this work once its plane is
       * authoritative, so the sweep steps aside rather than racing it. `shadow`
       * keeps the sweep authoritative and lets the queue's job be the recorded
       * comparison.
       */
      const evaluationQueueAuthoritative = input.planeModes?.evaluation === "queue";
      if (
        !evaluationQueueAuthoritative &&
        typeof input.operations.resumePendingEvaluations === "function"
      ) {
        try {
          const sweep = (await input.operations.resumePendingEvaluations({
            window,
            policySetDigest: input.policySet.policySetDigest,
          })) as { readonly resumed?: unknown } | null;
          if (sweep && Number.isSafeInteger(sweep.resumed) && Number(sweep.resumed) >= 0) {
            resumed = Number(sweep.resumed);
          }
        } catch (cause) {
          const detail =
            cause instanceof Error
              ? `evaluation resume sweep failed: ${cause.message.slice(0, 200)}`
              : "evaluation resume sweep failed";
          error = error ? `${error}; ${detail}` : detail;
        }
      }
      // Run 100 addendum 02 S1: the reconcile pass is what completes a job whose comparison finalized and
      // reclaims one that is stranded beyond the grace. It had no production caller, so a job that lost its
      // lease without a terminal trial stayed non-terminal indefinitely and was reported "in flight".
      if (
        !evaluationQueueAuthoritative &&
        typeof input.operations.reconcileEvaluationJobs === "function"
      ) {
        try {
          const sweep = (await input.operations.reconcileEvaluationJobs({
            window,
            policySetDigest: input.policySet.policySetDigest,
          })) as {
            readonly completed?: unknown;
            readonly stranded?: unknown;
            readonly reclaimed?: unknown;
          } | null;
          if (sweep) {
            reconciled = countOf(sweep.completed);
            stranded = countOf(sweep.stranded);
            reclaimed = countOf(sweep.reclaimed);
          }
        } catch (cause) {
          const detail =
            cause instanceof Error
              ? `evaluation job reconciliation failed: ${cause.message.slice(0, 200)}`
              : "evaluation job reconciliation failed";
          error = error ? `${error}; ${detail}` : detail;
        }
      }
      /**
       * Run 100 addendum `handoff-evidence-durability.addendum-06` S46 (measured live): the newest durable
       * evaluation jobs hold 2-4 **scored** trials, satisfy their declared pair, and have **no** comparison
       * group - they were released as `evaluation_job_stranded_without_finalized_comparison`, and nothing
       * finalized them because `evaluation:retro-finalize-comparisons` had a core method, a capability and no
       * production caller. Finalizing them needs no provider work: the trials are already scored, so this sweep
       * converts paid-for evidence into comparisons the learner can consume.
       */
      if (
        !evaluationQueueAuthoritative &&
        typeof input.operations.retroFinalizeEvaluations === "function"
      ) {
        try {
          const sweep = (await input.operations.retroFinalizeEvaluations({
            window,
            policySetDigest: input.policySet.policySetDigest,
          })) as { readonly finalized?: unknown } | null;
          if (sweep) retroFinalized = countOf(sweep.finalized);
        } catch (cause) {
          const detail =
            cause instanceof Error
              ? `comparison retro-finalization failed: ${cause.message.slice(0, 200)}`
              : "comparison retro-finalization failed";
          error = error ? `${error}; ${detail}` : detail;
        }
      }
      /**
       * Addendum 39: the comparison that just finalized has captures that are still hot, and the report its
       * learning evidence needs is written by this sweep - not later, when the learner's derivation pass reaches
       * the group and the retention ring has moved past it (live: 79 retention skips for 9 analyses).
       */
      if (typeof input.operations.sweepFinalizationSignals === "function") {
        try {
          const sweep = (await input.operations.sweepFinalizationSignals({
            window,
            policySetDigest: input.policySet.policySetDigest,
          })) as { readonly analyzed?: unknown; readonly deferred?: unknown } | null;
          if (sweep) {
            finalizationSignals = countOf(sweep.analyzed);
            finalizationSignalsDeferred = countOf(sweep.deferred);
          }
        } catch (cause) {
          const detail =
            cause instanceof Error
              ? `finalization signals sweep failed: ${cause.message.slice(0, 200)}`
              : "finalization signals sweep failed";
          error = error ? `${error}; ${detail}` : detail;
        }
      }
      /**
       * P6: consume candidates the knowledge store never validated. Runs after the evaluation sweeps so a
       * comparison finalized this tick is available as evidence on the next one, and stays bounded (two
       * candidates per tick) like every other liveness step.
       */
      /**
       * Run 101 R7: the learner queues own derivation and promotion once their
       * plane is authoritative, so both learner sweeps step aside together -
       * leaving one of them running would race the queue for the same work.
       */
      const learnerQueueAuthoritative = input.planeModes?.learner === "queue";
      if (
        !learnerQueueAuthoritative &&
        typeof input.operations.learnFromUnconsumedCandidates === "function"
      ) {
        try {
          const sweep = (await input.operations.learnFromUnconsumedCandidates({
            window,
            policySetDigest: input.policySet.policySetDigest,
          })) as { readonly consumed?: unknown; readonly remaining?: unknown } | null;
          if (sweep) {
            learned = countOf(sweep.consumed);
            learnersPending = countOf(sweep.remaining);
          }
        } catch (cause) {
          const detail =
            cause instanceof Error
              ? `learner sweep failed: ${cause.message.slice(0, 200)}`
              : "learner sweep failed";
          error = error ? `${error}; ${detail}` : detail;
        }
      }
      /**
       * S13: derive a candidate for a learnable finalized comparison that has none. Runs after the consume sweep so a
       * candidate created this tick can be validated on the next one, and stays bounded (two groups per tick).
       */
      if (
        !learnerQueueAuthoritative &&
        typeof input.operations.deriveLearnerCandidates === "function"
      ) {
        try {
          const sweep = (await input.operations.deriveLearnerCandidates({
            window,
            policySetDigest: input.policySet.policySetDigest,
          })) as { readonly derived?: unknown; readonly pending?: unknown } | null;
          if (sweep) {
            derivedCandidates = countOf(sweep.derived);
            derivationBacklog = countOf(sweep.pending);
          }
        } catch (cause) {
          const detail =
            cause instanceof Error
              ? `learner derivation failed: ${cause.message.slice(0, 200)}`
              : "learner derivation failed";
          error = error ? `${error}; ${detail}` : detail;
        }
      }
      /**
       * Run 105 R8: the ladder's refresh eligibility. A COMPLETE task idles for stalenessWindowDays
       * (one constant, R11) and then becomes eligible for a refresh replay whose ladder is
       * recomputed; a task that is not complete is always eligible. This pass is the eligibility
       * half only - it recomputes nextEligibleAtMs for a task whose window elapsed and reports how
       * many are due, so the next dispatch cycle picks the task up. It never dispatches and never
       * marks an idle task complete, so it cannot double-fill a ladder.
       */
      if (
        typeof input.routeFocusCandidates === "function" &&
        typeof input.markRouteLadderEligible === "function"
      ) {
        try {
          const census = (await input.routeFocusCandidates()) ?? [];
          const defaults = input.routeLearningDefaults ?? null;
          const windowMs = defaults ? stalenessWindowMs(defaults) : 30 * 24 * 60 * 60 * 1000;
          const atMs = now();
          for (const candidate of census) {
            if (candidate.rolledBack) continue;
            const complete =
              candidate.configured > 0 && candidate.admitted >= candidate.configured;
            if (!complete) continue;
            const ladder = input.readRouteLadder
              ? await input.readRouteLadder({
                  roleId: candidate.roleId,
                  taskTypeId: candidate.taskTypeId,
                })
              : null;
            const nextEligibleAtMs = ladder?.nextEligibleAtMs ?? null;
            /**
             * A complete task with no recorded eligibility has never idled (a fresh ladder), so the
             * window starts now and the refresh becomes due exactly stalenessWindowDays later.
             */
            if (!Number.isFinite(nextEligibleAtMs)) {
              await input.markRouteLadderEligible({
                roleId: candidate.roleId,
                taskTypeId: candidate.taskTypeId,
                nextEligibleAtMs: atMs + windowMs,
              });
              refreshedLadders += 1;
              continue;
            }
            if (Number(nextEligibleAtMs) <= atMs) refreshedLadders += 1;
          }
        } catch (cause) {
          const detail =
            cause instanceof Error
              ? `route ladder refresh eligibility failed: ${cause.message.slice(0, 200)}`
              : "route ladder refresh eligibility failed";
          error = error ? `${error}; ${detail}` : detail;
        }
      }
      // Run 100 addendum 04 S7: a replay that handed its branches off but was interrupted before its
      // evaluation job existed is unclaimable and would otherwise be lost; recover it into the resume store
      // the evaluation sweep above completes.
      if (typeof input.operations.recoverHandedOffEvaluations === "function") {
        try {
          const sweep = (await input.operations.recoverHandedOffEvaluations({
            window,
            policySetDigest: input.policySet.policySetDigest,
          })) as { readonly recovered?: unknown } | null;
          if (sweep && Number.isSafeInteger(sweep.recovered) && Number(sweep.recovered) >= 0) {
            recovered = Number(sweep.recovered);
          }
        } catch (cause) {
          const detail =
            cause instanceof Error
              ? `handed-off replay recovery failed: ${cause.message.slice(0, 200)}`
              : "handed-off replay recovery failed";
          error = error ? `${error}; ${detail}` : detail;
        }
      }
    } finally {
      sweeping = false;
    }
    return {
      expired,
      resumed,
      reconciled,
      stranded,
      reclaimed,
      recovered,
      derived: derivedCandidates,
      derivationBacklog,
      refreshedLadders,
      finalizationSignals,
      finalizationSignalsDeferred,
      error,
    };
  };

  /**
   * Run 101 R4: `onlyCaptureRefs` lets the queue's worker drive exactly the
   * capture it claimed through the *same* body the interval tick uses, so
   * admission, reservation, execution and disposition writing exist once. The
   * worker calls it with the queue disabled, which is what keeps a queued job
   * from re-enqueueing itself.
   */
  const tick = async (options?: { readonly onlyCaptureRefs?: readonly string[]; readonly dispatchRoundId?: string }): Promise<
    AutoReplayTickResult & { readonly skipped?: boolean }
  > => {
    if (paused || Ref.getUnsafe(stageExecutionBusy) || (running && !options?.onlyCaptureRefs)) {
      if (process.env.ROLE_MODEL_FOCUS_DIAG) console.error(`[replay-tick] skip: paused=${paused} busy=${Ref.getUnsafe(stageExecutionBusy)} running=${running}`);
      // `L7`: this is the interval path while a long work tick is in flight. Run the liveness sweeps
      // here instead of skipping them, so an overdue job is still expired on schedule.
      // Run 104 post-closeout (addendum 15): the queue worker's restricted tick (`onlyCaptureRefs`)
      // is the execution authority and must NOT be skipped while the regular tick is still offering;
      // skipping it made every dispatched capture a no-op (queued===0) and no disposition was written.
      const sweep = await runLivenessSweeps(
        input.ledger.status().window as unknown as Record<string, unknown>,
      );
      if (sweep.expired > 0) lastExpiredJobs = sweep.expired;
      if (sweep.resumed > 0) lastResumedEvaluations = sweep.resumed;
      if (sweep.reconciled > 0) lastReconciledEvaluations = sweep.reconciled;
      if (sweep.stranded > 0) lastStrandedEvaluations = sweep.stranded;
      if (sweep.reclaimed > 0) lastReclaimedEvaluations = sweep.reclaimed;
      if (sweep.recovered > 0) lastRecoveredHandoffs = sweep.recovered;
      if (sweep.error) {
        lastOutcome = "degraded";
        lastError = sweep.error;
      }
      return { ...emptyResult(), skipped: true };
    }
    running = true;
    const dispositionWrites: Promise<unknown>[] = [];
    try {
      const stageEnabled = typeof input.routeFocusCandidates === "function";
      let plannedFocus: ReturnType<typeof selectFocusTask> = null;
      let focusCaptureRef: string | null = null;
      let focusEndpointId: string | null = null;
      let routeLadder: RouteLadderRow | null = null;
      let challengeKey: string | null = null;
      const configuredNow = typeof input.configuredEndpointIds === "function"
        ? input.configuredEndpointIds() : input.configuredEndpointIds;
      const pending = await input.operations.listPendingReplayCaptures({
        policySetDigest: input.policySet.policySetDigest, limit: maxCapturesPerTick * 4,
      });
      let captures = pendingCaptures(pending);
      if (process.env.ROLE_MODEL_FOCUS_DIAG) console.error(`[replay-tick] run: captures=${captures.length} pendingCount=${(pending as { pendingCount?: number }).pendingCount ?? "?"}`);
      const challengeBatchSize = input.routeLearningDefaults?.challengeBatchSize ?? 1;
      if (stageEnabled) {
        if (!input.readRouteLadder) throw new Error("route ladder context unavailable: CLI binding required");
        let census: readonly RouteFocusCandidate[];
        try {
          const answer = await input.routeFocusCandidates!();
          if (!answer) throw new Error("missing census");
          census = answer;
        } catch (cause) { throw new Error("route focus census unavailable: " + String(cause)); }
        const rows = new Map<string, RouteLadderRow | null>();
        const eligible: RouteFocusCandidate[] = [];
        for (const candidate of census) {
          if (!selectFocusTask([candidate])) continue;
          const key = candidate.roleId + "\u0000" + candidate.taskTypeId;
          let row: RouteLadderRow | null;
          try { row = await input.readRouteLadder(candidate); }
          catch (cause) { throw new Error("route ladder context unavailable: " + String(cause)); }
          rows.set(key, row);
          if (row?.rolledBack?.on) continue;
          const admitted = (row?.rungs ?? []).filter(rung => rung.status === "available" && configuredNow.includes(rung.endpointId));
          const missing = configuredNow.filter(id => !admitted.some(rung => rung.endpointId === id));
          // A stored complete snapshot identifies endpoint arrival, not an ordinary below-floor gap.
          // Counts may already reflect a changed denominator. Require the stored snapshot's
          // actual rungs to substantiate completeness; removal must not masquerade as arrival.
          const storedAvailable = (row?.rungs ?? []).filter(rung => rung.status === "available");
          const wasComplete = Boolean(row?.completeness && Number(row.completeness.configured) > 0 &&
            Number(row.completeness.admitted) >= Number(row.completeness.configured) &&
            storedAvailable.length >= Number(row.completeness.configured) &&
            !(row?.rungs ?? []).some(rung => rung.status === "unavailable"));
          const previous = Ref.getUnsafe(seenConfigured).get(key);
          const added = previous ? configuredNow.some(id => !previous.includes(id)) : wasComplete && missing.length > 0;
          const alreadyDue = Number.isFinite(row?.nextEligibleAtMs) && Number(row!.nextEligibleAtMs) <= now();
          if (added && (!alreadyDue || Boolean(previous))) {
            if (!input.markRouteLadderEligible) throw new Error("route ladder eligibility unavailable: CLI binding required");
            await input.markRouteLadderEligible({ roleId: candidate.roleId, taskTypeId: candidate.taskTypeId, nextEligibleAtMs: now() });
          }
          Effect.runSync(Ref.update(seenConfigured, current => new Map(current).set(key, [...configuredNow])));
          let progress = Ref.getUnsafe(challenges).get(key);
          if (progress && !progress.done && progress.kind !== "refresh") {
            const remaining = progress.against.slice(progress.cursor).filter(id => admitted.some(rung => rung.endpointId === id));
            if (remaining[0] !== progress.against[progress.cursor]) {
              progress = { ...progress, against: remaining, cursor: 0, pendingCaptureRef: null, done: remaining.length === 0 };
              setChallenge(key, progress);
            }
          }
          const challenger = missing.find(id => !(progress?.kind !== "refresh" && progress?.endpointId === id && progress.done));
          if (challenger && (!progress ? wasComplete : progress.done && admitted.some(rung => rung.endpointId === progress!.endpointId))) {
            if (!input.markRouteLadderEligible) throw new Error("route ladder eligibility unavailable: CLI binding required");
            if (!added && !alreadyDue) await input.markRouteLadderEligible({ roleId: candidate.roleId, taskTypeId: candidate.taskTypeId, nextEligibleAtMs: now() });
            const against = planChallenge({ newEndpointId: challenger, rungs: admitted,
              challengeBatchSize: admitted.length }).map(pair => pair.againstEndpointId);
            setChallenge(key, { startedAtMs: Number.isFinite(row?.nextEligibleAtMs) && Number(row!.nextEligibleAtMs) <= now() ? Number(row!.nextEligibleAtMs) : now(), endpointId: challenger, against, cursor: 0, pendingCaptureRef: null, done: against.length === 0 });
          }
          let active = Ref.getUnsafe(challenges).get(key);
          if (input.readPendingRouteDispatches && (missing.length > 0 || Number(row?.nextEligibleAtMs ?? Infinity) <= now())) {
            const jobs = await input.readPendingRouteDispatches(candidate);
            if (jobs === null) throw new Error("route pending dispatches unavailable");
            const cutoff = active?.startedAtMs ?? (alreadyDue ? Number(row!.nextEligibleAtMs) : now());
            const relevant = jobs.filter(job => (job.sourceType === "replay" ? Boolean(job.replayJobId) : job.sourceType === "queue" && Boolean(job.queueJobId)) && job.captureRef && Number.isFinite(job.createdAtMs) &&
              job.createdAtMs >= cutoff && job.createdAtMs <= now() && job.newEndpointId !== job.againstEndpointId &&
              configuredNow.includes(job.newEndpointId) && configuredNow.includes(job.againstEndpointId) &&
              (!active || job.newEndpointId === active.endpointId) &&
              (missing.length === 0 || missing.includes(job.newEndpointId)))
              .sort((a, b) => b.createdAtMs - a.createdAtMs || String(a.replayJobId ?? a.queueJobId).localeCompare(String(b.replayJobId ?? b.queueJobId)));
            const pendingJob = relevant.find(job => job.state === "queued" || job.state === "running" || job.state === "awaiting_evaluation");
            if (pendingJob && (!active || !active.done)) {
              const against = missing.length === 0 ? [pendingJob.againstEndpointId] :
                planChallenge({ newEndpointId: pendingJob.newEndpointId, rungs: admitted,
                  challengeBatchSize: admitted.length }).map(pair => pair.againstEndpointId);
              const cursor = against.indexOf(pendingJob.againstEndpointId);
              if (cursor >= 0) {
                active = { ...(active ?? {}), kind: missing.length === 0 ? "refresh" : "challenge",
                  startedAtMs: cutoff, endpointId: pendingJob.newEndpointId, against,
                  cursor, pendingCaptureRef: pendingJob.captureRef, pendingRoundId: pendingJob.dispatchRoundId, done: false };
                setChallenge(key, active);
                const ownsProcessingQueueRound = pendingJob.sourceType === "queue" && pendingJob.state === "running" &&
                  options?.onlyCaptureRefs?.includes(pendingJob.captureRef) && options.dispatchRoundId !== undefined &&
                  pendingJob.dispatchRoundId === options.dispatchRoundId;
                if (pendingJob.state === "queued" || ownsProcessingQueueRound) dispatchedChallenges.delete(pendingJob.captureRef);
                else dispatchedChallenges.add(pendingJob.captureRef);
              }
            } else if (active?.pendingCaptureRef && relevant.some(job => job.captureRef === active!.pendingCaptureRef &&
                (job.state === "failed" || job.state === "cancelled" || job.state === "timed_out"))) {
              dispatchedChallenges.delete(active.pendingCaptureRef);
              active = { ...active, pendingCaptureRef: null };
              setChallenge(key, active);
            }
          }
          if (active && active.kind !== "refresh" && input.readRouteDispatchEvidence) {
            const answer = await input.readRouteDispatchEvidence({ roleId: candidate.roleId, taskTypeId: candidate.taskTypeId,
              endpointId: active.endpointId, sinceMs: active.startedAtMs });
            if (answer === null) throw new Error("route dispatch evidence unavailable");
            const groups = [...new Map(answer.filter(record => record.newEndpointId === active!.endpointId &&
              record.effortComparable === true && record.comparisonGroupId && Number.isFinite(record.finalizedAtMs) &&
              record.finalizedAtMs >= (active!.startedAtMs ?? 0) && Number.isFinite(record.judgeConfidence) &&
              record.judgeConfidence >= 0 && record.judgeConfidence <= 1 &&
              Number.isFinite(record.endpointConfidence) && record.endpointConfidence >= 0 && record.endpointConfidence <= 1 &&
              (record.winnerEndpointId === null || record.winnerEndpointId === record.newEndpointId ||
                record.winnerEndpointId === record.againstEndpointId))
              .map(record => [record.comparisonGroupId, record] as const)).values()]
              .sort((a, b) => a.finalizedAtMs - b.finalizedAtMs || a.comparisonGroupId.localeCompare(b.comparisonGroupId));
            let cursor = 0; let placed = false;
            for (const record of groups) {
              if (record.againstEndpointId !== active.against[cursor]) continue;
              if (record.winnerEndpointId === active.endpointId) { placed = true; break; }
              cursor += 1;
              if (cursor >= active.against.length) { placed = true; break; }
            }
            const floor = input.routeLearningDefaults?.minComparisons ?? 5;
            const confidence = input.routeLearningDefaults?.minConfidence ?? 0.7;
            const met = groups.length >= floor && groups.reduce((sum, record) => sum + record.endpointConfidence, 0) / groups.length >= confidence;
            const pendingSatisfied = groups.some(record => record.captureRef === active!.pendingCaptureRef);
            if (placed || cursor > active.cursor || pendingSatisfied) {
              active = { ...active, cursor: placed ? 0 : cursor, placementComplete: placed,
                against: placed ? [active.against[Math.min(cursor, active.against.length - 1)]!] : active.against,
                done: placed && met, completedGroupIds: groups.map(record => record.comparisonGroupId),
                usedCaptureRefs: groups.map(record => record.captureRef),
                pendingCaptureRef: pendingSatisfied ? null : active.pendingCaptureRef,
                pendingRoundId: pendingSatisfied ? undefined : active.pendingRoundId };
              setChallenge(key, active);
            }
          }
          if (active?.kind !== "refresh" && active?.done && missing.length > 0) continue; // Wait for genuine floor/publication.
          if (missing.length === 0 && configuredNow.length > 0 &&
              Number(row?.nextEligibleAtMs ?? Infinity) <= now() && !active && input.readRouteDispatchEvidence) {
            // Recover a completed refresh after interruption between real evaluation finalization
            // and eligibility write. The persisted due timestamp is the evidence cutoff.
            let recovered: RouteDispatchEvidence | undefined;
            for (const endpointId of configuredNow) {
              const answer = await input.readRouteDispatchEvidence({ roleId: candidate.roleId,
                taskTypeId: candidate.taskTypeId, endpointId, sinceMs: Number(row!.nextEligibleAtMs) });
              if (answer === null) throw new Error("route dispatch evidence unavailable");
              recovered = answer.find(record => record.newEndpointId === endpointId &&
                record.newEndpointId !== record.againstEndpointId && configuredNow.includes(record.againstEndpointId) &&
                record.effortComparable === true && Boolean(record.comparisonGroupId) &&
                Number.isFinite(record.finalizedAtMs) && record.finalizedAtMs >= Number(row!.nextEligibleAtMs) &&
                record.finalizedAtMs <= now() && (record.winnerEndpointId === null ||
                  record.winnerEndpointId === endpointId || record.winnerEndpointId === record.againstEndpointId));
              if (recovered) break;
            }
            if (recovered) {
              if (!input.markRouteLadderEligible) throw new Error("route ladder eligibility unavailable: CLI binding required");
              const windowMs = input.routeLearningDefaults ? stalenessWindowMs(input.routeLearningDefaults) : 30 * 24 * 60 * 60 * 1000;
              await input.markRouteLadderEligible({ roleId: candidate.roleId, taskTypeId: candidate.taskTypeId,
                nextEligibleAtMs: now() + windowMs });
              continue;
            }
          }
          if (missing.length === 0 && configuredNow.length > 0 && Number(row?.nextEligibleAtMs ?? Infinity) > now()) continue;
          eligible.push({ ...candidate, configured: configuredNow.length, admitted: admitted.length });
        }
        const held = Ref.getUnsafe(heldFocus);
        let remainingFocusCandidates = [...eligible];
        let skippedReplayableTasks = 0;
        while (remainingFocusCandidates.length > 0) {
        const retained = remainingFocusCandidates.find(candidate => candidate.roleId + "\u0000" + candidate.taskTypeId === held);
        plannedFocus = retained && retained.admitted < retained.configured
          ? selectFocusTask([retained]) : selectFocusTask(remainingFocusCandidates);
        focusTaskKey = plannedFocus?.scopeKey ?? null;
        focusRemaining = plannedFocus?.remaining ?? 0;
        challengeInFlight = false;
        Effect.runSync(Ref.set(heldFocus, focusTaskKey));
        try {
        if (plannedFocus) {
          routeLadder = rows.get(plannedFocus.scopeKey) ?? null;
          let progress = Ref.getUnsafe(challenges).get(plannedFocus.scopeKey);
          if (process.env.ROLE_MODEL_FOCUS_DIAG) console.error(`[replay-tick] before readRouteReplayableCaptures focus=${plannedFocus.roleId}/${plannedFocus.taskTypeId}`);
          if (input.readRouteReplayableCaptures) {
            const history = await input.readRouteReplayableCaptures(plannedFocus);
            if (process.env.ROLE_MODEL_FOCUS_DIAG) console.error(`[replay-tick] after readRouteReplayableCaptures history=${history === null ? "null" : history.length}`);
            if (history === null) throw new Error("route replayable corpus unavailable");
            const existing = new Set(captures.map(item => item.captureRef));
            captures = [...captures, ...history.filter(item => item.roleId === plannedFocus!.roleId &&
              item.taskTypeId === plannedFocus!.taskTypeId && !existing.has(item.captureRef))];
          }
          const owned = captures.filter(item => item.roleId === plannedFocus!.roleId && item.taskTypeId === plannedFocus!.taskTypeId);
          if (plannedFocus.remaining === 0 && Number(routeLadder?.nextEligibleAtMs ?? Infinity) <= now() &&
              (!progress || progress.done)) {
            const source = owned.find(item => configuredNow.some(id => id !== item.sourceEndpointId));
            const endpointId = configuredNow.find(id => id !== source?.sourceEndpointId);
            if (!source?.sourceEndpointId || !endpointId) throw new NoReplayableRequest({ detail: "complete ladder has no distinct refresh pair", roleId: plannedFocus.roleId, taskTypeId: plannedFocus.taskTypeId });
            progress = { kind: "refresh", startedAtMs: now(), endpointId, against: [source.sourceEndpointId], cursor: 0,
              pendingCaptureRef: null, done: false };
            setChallenge(plannedFocus.scopeKey, progress);
          }
          if (progress && !progress.done) {
            challengeKey = plannedFocus.scopeKey; challengeInFlight = progress.kind !== "refresh";
            if (!input.readFinalizedRouteChallenge) throw new Error("route challenge finalization unavailable: CLI binding required");
            if (progress.pendingCaptureRef) {
              await applyFinalized(challengeKey, progress, await readFinalized({ roleId: plannedFocus.roleId,
                taskTypeId: plannedFocus.taskTypeId, sinceMs: progress.startedAtMs, excludedComparisonGroupIds: progress.completedGroupIds, captureRef: progress.pendingCaptureRef,
                newEndpointId: progress.endpointId, againstEndpointId: progress.against[progress.cursor]! }));
            }
            const current = Ref.getUnsafe(challenges).get(challengeKey)!;
            challengeInFlight = current.kind !== "refresh" && !current.done;
            if (!current.done && (!current.pendingCaptureRef || (options?.onlyCaptureRefs?.includes(current.pendingCaptureRef) &&
                !dispatchedChallenges.has(current.pendingCaptureRef)))) {
              const pairSources = owned.filter(item => item.sourceEndpointId === current.against[current.cursor] &&
                (!current.pendingCaptureRef || item.captureRef === current.pendingCaptureRef));
              const source = pairSources.find(item => !current.usedCaptureRefs?.includes(item.captureRef)) ??
                (input.readRouteDispatchEvidence && current.placementComplete ? pairSources[0] : undefined);
              if (!source) throw new NoReplayableRequest({ detail: "no recorded request from the challenged rung", roleId: plannedFocus.roleId, taskTypeId: plannedFocus.taskTypeId });
              focusCaptureRef = source.captureRef; focusEndpointId = current.endpointId;
            }
          } else {
            const source = owned.find(item => configuredNow.some(id => id !== item.sourceEndpointId &&
              !(routeLadder?.rungs ?? []).some(rung => rung.endpointId === id && rung.status === "available"))) ?? owned[0];
            // Run 105 bug 3: the configured judge may also be a candidate endpoint, so it is NOT excluded
            // from the challenger set here. When a challenger equals the judge, the evaluation de-conflicts
            // (dedupeJudgeAgainstPair picks an alternative judge), so the controller endpoint can still be
            // admitted as a challenger. The judge is resolved for diagnostics and the tick's judge receipt.
            const judgeId = typeof input.resolveJudgeEndpointId === "function"
              ? await input.resolveJudgeEndpointId().catch(() => null)
              : null;
            const fill = planFocusDispatch({ focus: plannedFocus, replayableCapture: source,
              configuredEndpointIds: configuredNow.filter(id => id !== source?.sourceEndpointId),
              admittedEndpointIds: (routeLadder?.rungs ?? []).filter(rung => rung.status === "available").map(rung => rung.endpointId),
              rungs: routeLadder?.rungs });
            if (process.env.ROLE_MODEL_FOCUS_DIAG) {
              console.error(`[focus-diag] source=${source?.sourceEndpointId?.split(".").pop()} judge=${judgeId?.split(".").pop() ?? null} focusEndpoint=${fill instanceof NoReplayableRequest ? "NoReplayableRequest" : (fill?.endpointId?.split(".").pop() ?? null)} configured=${configuredNow.map(id=>id.split(".").pop()).join(",")} admitted=${(routeLadder?.rungs ?? []).filter(rung=>rung.status==="available").map(rung=>rung.endpointId.split(".").pop()).join(",")}`);
            }
            if (fill instanceof NoReplayableRequest) throw fill;
            focusCaptureRef = source?.captureRef ?? null; focusEndpointId = fill?.endpointId ?? null;
            if (source && !focusEndpointId && Number(routeLadder?.nextEligibleAtMs ?? Infinity) <= now()) {
              focusEndpointId = configuredNow.find(id => id !== source.sourceEndpointId) ?? null;
            }
          }
        }
        break;
        } catch (cause) {
          // R8 skips only a KNOWN empty task corpus, never unavailable/unknown context.
          if (!(cause instanceof NoReplayableRequest)) throw cause;
          skippedReplayableTasks += 1;
          const skippedKey = plannedFocus?.scopeKey;
          remainingFocusCandidates = remainingFocusCandidates.filter(candidate =>
            candidate.roleId + "\u0000" + candidate.taskTypeId !== skippedKey);
          focusTaskKey = null; focusRemaining = 0; challengeInFlight = false;
          focusCaptureRef = null; focusEndpointId = null; challengeKey = null; plannedFocus = null;
          Effect.runSync(Ref.set(heldFocus, null));
        }
        }
        if (!plannedFocus && skippedReplayableTasks > 0) {
          throw new Error("NoReplayableRequest: all eligible tasks lack a replayable source; tasks skipped");
        }
        if (!plannedFocus) { focusTaskKey = null; focusRemaining = 0; challengeInFlight = false; }
      } else { focusTaskKey = null; focusRemaining = 0; challengeInFlight = false; }
      const unclassifiedRouteCaptures = captures.filter(
        (capture) =>
          !(typeof capture.roleId === "string" && capture.roleId.length > 0) ||
          !(typeof capture.taskTypeId === "string" && capture.taskTypeId.length > 0),
      ).length;
      lastUnclassifiedCaptures = unclassifiedRouteCaptures;
      /**
       * R1/R8: report the class ONCE per tick. The count is what an operator needs; a line per
       * capture would flood the log for a class that is a property of the traffic, not of a request.
       */
      if (unclassifiedRouteCaptures > 0 && typeof input.reportUnclassifiedCaptures === "function") {
        try {
          input.reportUnclassifiedCaptures({
            count: unclassifiedRouteCaptures,
            code: "no_route_classification",
          });
          lastRouteClassificationReportedAtMs = now();
        } catch {
          // A reporting hook is observability, never a reason to fail the tick.
        }
      }
      const onlyCaptureRefs = options?.onlyCaptureRefs;
      if (options?.dispatchRoundId !== undefined) {
        const progress = challengeKey ? Ref.getUnsafe(challenges).get(challengeKey) : undefined;
        if (!stageEnabled || !onlyCaptureRefs?.includes(focusCaptureRef ?? "") ||
            !progress || progress.pendingCaptureRef !== focusCaptureRef ||
            progress.pendingRoundId !== options.dispatchRoundId) {
          throw new Error("claimed route dispatch round mismatch: no actual matching pending task/capture/pair round");
        }
      }
      const dispatchRoundFor = (endpointId: string | null) => {
        if (!challengeKey || !plannedFocus) return undefined;
        const progress = Ref.getUnsafe(challenges).get(challengeKey)!;
        return options?.dispatchRoundId ?? progress.pendingRoundId ?? createHash("sha256").update(JSON.stringify({
          scopeKey: plannedFocus.scopeKey, endpointId, startedAtMs: progress.startedAtMs,
          groupIds: [...(progress.completedGroupIds ?? [])].sort(),
        })).digest("hex");
      };
      const scopedCaptures = stageEnabled
        ? captures.filter(capture => capture.captureRef === focusCaptureRef && Boolean(focusEndpointId) &&
            (!onlyCaptureRefs || onlyCaptureRefs.includes(capture.captureRef)))
        : onlyCaptureRefs ? captures.filter(capture => onlyCaptureRefs.includes(capture.captureRef)) : captures;
      // Temporary diagnostic (addendum 14 follow-on): name what the replay-pending source returned.
      console.error(
        `[run104-pending] captures=${captures.length} scoped=${scopedCaptures.length} first=${captures
          .slice(0, 3)
          .map((c) => String(c.captureRef))
          .join(
            ",",
          )} only=${onlyCaptureRefs ? String(onlyCaptureRefs[0]) : "none"} pendingCount=${String((pending as Record<string, unknown>)?.pendingCount ?? "n/a")} captureCount=${String((pending as Record<string, unknown>)?.captureCount ?? "n/a")}`,
      );
      const configuredEndpointIds =
        typeof input.configuredEndpointIds === "function"
          ? input.configuredEndpointIds()
          : input.configuredEndpointIds;
      const providedHealthyEndpointIds =
        typeof input.healthyEndpointIds === "function"
          ? await input.healthyEndpointIds()
          : input.healthyEndpointIds;
      const window = input.ledger.status().window;
      /**
       * Run 98 addendum 04 §7 (`L6`), measured live on v171: a tick walks up to eight captures and a
       * real dsh replay takes ~4 minutes, so a full tick runs for tens of minutes. Writing the
       * dispositions only after the tick returned left the durable ledger looking idle for half an
       * hour at a time while captures were simply queued behind each other. Each disposition is now
       * written as soon as its capture finishes; the post-tick loop is gone, so nothing is written
       * twice.
       */

      const writeDisposition = (disposition: {
        readonly captureRef: string;
        readonly outcome: string;
        readonly code?: string | null;
        readonly detail?: string | null;
        readonly branches?: unknown;
      }): Promise<unknown> =>
        input.operations
          .recordReplayDisposition({
            captureRef: disposition.captureRef,
            policySetDigest: input.policySet.policySetDigest,
            outcome: disposition.outcome,
            refusalCode: disposition.code ?? null,
            detail: disposition.detail ?? null,
            branches: disposition.branches ?? null,
            window,
          })
          .catch((error: unknown) => {
            console.error(
              `[run98] replay disposition write degraded:${disposition.captureRef} ${String(
                (error as { message?: unknown })?.message ?? error,
              ).slice(0, 200)}`,
            );
          });
      const runDispatch = async (dispatchCaptures: readonly AutoReplayCapture[], endpointId: string | null,
        captureRef: string | null) => runAutoReplayTick({
        captures: dispatchCaptures,
        configuredEndpointIds,
        // Run 98 addendum 56 §6: the judge is excluded from the planned arms, and a capture whose own endpoint
        // is the judge is deferred with the named code rather than dispatched into a refusal.
        ...(typeof input.resolveJudgeEndpointId === "function"
          ? { judgeEndpointId: await input.resolveJudgeEndpointId().catch(() => null) }
          : {}),
        /**
         * Run 100 addendum 22: the operator can name the endpoints the tick may judge with when the configured
         * judge is itself an arm of the comparison. Unset keeps the tick's own default (the configured endpoint
         * pool), and an empty effective list keeps the named `judge_candidate_overlap` refusal.
         */
        ...(() => {
          const fallbackEndpointIds = resolveReplayJudgeFallbackEndpointIds(process.env);
          return fallbackEndpointIds ? { judgeFallbackEndpointIds: fallbackEndpointIds } : {};
        })(),
        ...(providedHealthyEndpointIds && providedHealthyEndpointIds.length > 0
          ? { healthyEndpointIds: [...providedHealthyEndpointIds] }
          : {}),
        ledger: input.ledger,
        policySet: input.policySet,
        executor: async request => {
          if (!stageEnabled) return input.executor(request);
          Effect.runSync(Ref.set(stageExecutionBusy, true));
          try { return await input.executor(request); }
          finally { Effect.runSync(Ref.set(stageExecutionBusy, false)); }
        },
        maxCapturesPerTick,
        dispositionSink: (disposition) => {
          dispositionWrites.push(writeDisposition(disposition));
        },
        ...(Number.isSafeInteger(input.executorTimeoutMs) && (input.executorTimeoutMs ?? 0) > 0
          ? { executorTimeoutMs: Number(input.executorTimeoutMs) }
          : {}),
        // Run 98 addendum 04 follow-on: the tick's own wall-clock budget, so a tick made of several
        // minutes-long replays leaves the remaining captures for the next tick instead of holding the
        // loop open for tens of minutes. The injectable clock keeps it testable.
        ...(Number.isSafeInteger(input.tickBudgetMs)
          ? { tickBudgetMs: Number(input.tickBudgetMs) }
          : {}),
        ...(Number.isSafeInteger(input.reservationTtlMs) && (input.reservationTtlMs ?? 0) > 0
          ? { reservationTtlMs: Number(input.reservationTtlMs) }
          : {}),
        /**
         * Run 101 addendum 02: a tick restricted to a capture the queue's worker *claimed*
         * must never offer that capture back to its own queue. Measured live on
         * `stage-rc-35c4a84fb643`: the worker's attempt re-enqueued the job, the tick then
         * skipped the legacy execution R4 only skips for unclaimed work, and every attempt
         * failed with `queued capture <ref> was not dispatched` until the job was terminal -
         * so the capture was never replayed. The queue is the scheduling authority; the
         * handler is the execution authority.
         */
        ...(input.dispatchQueue && !onlyCaptureRefs ? { dispatchQueue: input.dispatchQueue } : {}),
        /**
         * Run 105 R8: aim this tick at the focus task's ladder gap. The narrowing names the capture
         * it belongs to, so the tick applies it to that capture alone and every other capture keeps
         * its rotation - one pairwise comparison per rung, and never a widened candidate pool.
         */
        ...(endpointId && captureRef
          ? { focusCandidateEndpointId: endpointId, focusCaptureRef: captureRef } : {}),
        // Pre-stage callers keep their historical capture semantics; stage callers fail closed.
        requireRouteClassification: stageEnabled || captures.some(capture => Boolean(capture.roleId || capture.taskTypeId)),
        ...(challengeKey && plannedFocus ? { dispatchRoundId: dispatchRoundFor(endpointId) } : {}),
        now,
      });
      let result = emptyResult();
      const batchStartedAtMs = now();
      const bound = challengeKey ? Math.max(0, Math.floor(challengeBatchSize)) : 1;
      for (let step = 0; step < bound; step += 1) {
        if (input.tickBudgetMs && now() - batchStartedAtMs >= input.tickBudgetMs) break;
        const dispatchCaptures = step === 0 ? scopedCaptures : captures.filter(c => c.captureRef === focusCaptureRef);
        if (challengeKey && plannedFocus && dispatchCaptures.length > 0) {
          // Re-read rollback immediately before EACH sequential arm, including queue claims.
          const latest = await input.readRouteLadder!(plannedFocus);
          if (latest?.rolledBack?.on) { challengeInFlight = false; break; }
          const progress = Ref.getUnsafe(challenges).get(challengeKey)!;
          setChallenge(challengeKey, { ...progress, pendingCaptureRef: focusCaptureRef, pendingRoundId: dispatchRoundFor(focusEndpointId) });
        }
        if (process.env.ROLE_MODEL_FOCUS_DIAG) console.error(`[replay-tick] before runDispatch focusEndpoint=${focusEndpointId} dispatchCaptures=${dispatchCaptures.length}`);
        const part = await runDispatch(dispatchCaptures, focusEndpointId, focusCaptureRef);
        if (process.env.ROLE_MODEL_FOCUS_DIAG) console.error(`[replay-tick] after runDispatch part=${part.processed}`);
        result = { processed: result.processed + part.processed, replayed: result.replayed + part.replayed,
          refused: result.refused + part.refused, deferred: result.deferred + part.deferred,
          queued: (result.queued ?? 0) + (part.queued ?? 0),
          dispositions: [...result.dispositions, ...part.dispositions], cursor: part.cursor,
          budgetExhausted: result.budgetExhausted || part.budgetExhausted };
        if (!challengeKey || !plannedFocus || !focusCaptureRef || dispatchCaptures.length === 0) break;
        if ((part.queued ?? 0) > 0) break; // Worker uses dispatchCapture; never a concurrent next arm.
        if (part.dispositions.some(row => row.code === "replay_dispatch_offer_refused" || row.outcome === "refused" ||
            (row.outcome === "deferred" && !(Number(row.branches) > 0)))) {
          const progress = Ref.getUnsafe(challenges).get(challengeKey)!;
          setChallenge(challengeKey, { ...progress, pendingCaptureRef: null });
          dispatchedChallenges.delete(focusCaptureRef);
          break;
        }
        if (part.replayed > 0 || part.deferred > 0) dispatchedChallenges.add(focusCaptureRef);
        const progress = Ref.getUnsafe(challenges).get(challengeKey)!;
        if (!await applyFinalized(challengeKey, progress, await readFinalized({ roleId: plannedFocus.roleId,
          taskTypeId: plannedFocus.taskTypeId, sinceMs: progress.startedAtMs, excludedComparisonGroupIds: progress.completedGroupIds, captureRef: focusCaptureRef,
          newEndpointId: progress.endpointId, againstEndpointId: progress.against[progress.cursor]! }))) break;
        const next = Ref.getUnsafe(challenges).get(challengeKey)!;
        challengeInFlight = next.kind !== "refresh" && !next.done;
        if (next.done) break;
        const source = captures.find(c => c.roleId === plannedFocus!.roleId && c.taskTypeId === plannedFocus!.taskTypeId &&
          c.sourceEndpointId === next.against[next.cursor]);
        if (!source) break; // Next tick names NoReplayableRequest; never invent a rung source.
        focusCaptureRef = source.captureRef; focusEndpointId = next.endpointId;
        // A queue worker can only execute the capture it claimed, not the next rung's capture.
        if (onlyCaptureRefs) break;
      }
      await Promise.all(dispositionWrites);
      // RC07 (L2): one bounded sweep per tick. A job whose deadline elapsed without
      // reaching a terminal state is expired with a typed receipt instead of living on
      // as an orphan the producer will never drive again. A sweep failure degrades this
      // tick, never the routing path.
      const sweep = await runLivenessSweeps(window as unknown as Record<string, unknown>);
      lastExpiredJobs = sweep.expired;
      lastResumedEvaluations = sweep.resumed;
      lastReconciledEvaluations = sweep.reconciled;
      lastStrandedEvaluations = sweep.stranded;
      lastReclaimedEvaluations = sweep.reclaimed;
      lastRecoveredHandoffs = sweep.recovered;
      const sweepError = sweep.error;
      lastOutcome = sweepError ? "degraded" : "ok";
      lastError = sweepError;
      lastProcessedAtMs = now();
      lastDispositions = result.dispositions.length;
      return result;
    } catch (error) {
      lastOutcome = "degraded";
      lastError = error instanceof Error ? error.message.slice(0, 300) : "auto replay tick failed";
      return emptyResult();
    } finally {
      await Promise.all(dispositionWrites);
      ticks += 1;
      running = false;
    }
  };

  const intervalMs = input.intervalMs ?? 0;
  if (intervalMs > 0) {
    const setIntervalFn =
      input.setIntervalFn ??
      ((handler: () => void, timeout: number) => setInterval(handler, timeout));
    timer = setIntervalFn(() => {
      void tick();
    }, intervalMs);
    if (timer && typeof (timer as { unref?: () => void }).unref === "function") {
      (timer as { unref: () => void }).unref();
    }
  }

  return {
    tick,
    /**
     * Run 101 R4: what the `replay.dispatch` worker calls for the capture it
     * claimed. It is the interval tick restricted to that capture, with the
     * queue disabled - so the job is executed through the path this loop has
     * always used, and a failure is the worker's retry signal.
     */
    async dispatchCapture(captureRef: string, dispatchRoundId?: string) {
      if (!captureRef || typeof captureRef !== "string") {
        throw new Error("dispatchCapture requires a capture ref");
      }
      const result = await tick({ onlyCaptureRefs: [captureRef], ...(dispatchRoundId !== undefined ? { dispatchRoundId } : {}) });
      /**
       * Run 101 addendum 25. `queued` counts the captures the tick could not enqueue - the ones still pending for
       * the next tick (`track-b-auto-replay.ts:1016`). A restricted tick that leaves `queued === 0` has nothing left
       * to do for this capture: it is already handled, expired or absent from the pending set, which is a no-op and
       * not a failure.
       *
       * Measured live on `:3457` (2026-09-27 ~22:0x): `replay.dispatch` showed 229 failed against 59 completed with
       * the recorded error `queued capture <ref> was not dispatched`, all of them this no-op case - each charged an
       * attempt, retried and dead-lettered, and `evaluation.score` starved ("made no progress"). Only a capture the
       * tick still holds back (`queued > 0`) is a real dispatch failure worth an attempt.
       */
      if (result.queued > 0) {
        // Nothing ran for this capture: it is not pending any more (already
        // handled) or the tick was skipped. Reporting it lets the queue's
        // attempt accounting decide what happens next.
        throw new Error(`queued capture ${captureRef} was not dispatched`);
      }
      return result;
    },
    stop() {
      if (timer) {
        const clearIntervalFn =
          input.clearIntervalFn ?? ((handle: unknown) => clearInterval(handle as NodeJS.Timeout));
        clearIntervalFn(timer);
        timer = null;
      }
      running = false;
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    health() {
      return {
        ticks,
        running,
        paused,
        lastOutcome,
        lastError,
        lastProcessedAtMs,
        lastExpiredJobs,
        lastResumedEvaluations,
        lastReconciledEvaluations,
        lastStrandedEvaluations,
        lastReclaimedEvaluations,
        lastRecoveredHandoffs,
        focusTaskKey,
        focusRemaining,
        challengeInFlight,
        lastUnclassifiedCaptures,
      };
    },
    status() {
      return {
        ...{ ticks, running, paused, lastOutcome, lastError, lastProcessedAtMs },
        budget: { ...input.ledger.status() },
        lastDispositions,
        lastExpiredJobs,
        lastResumedEvaluations,
        lastReconciledEvaluations,
        lastStrandedEvaluations,
        lastReclaimedEvaluations,
        lastRecoveredHandoffs,
        focusTaskKey,
        focusRemaining,
        challengeInFlight,
        lastUnclassifiedCaptures,
      };
    },
  };
}
