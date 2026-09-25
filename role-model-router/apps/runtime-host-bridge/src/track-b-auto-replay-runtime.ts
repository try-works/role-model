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
    readonly capture: AutoReplayCapture;
    readonly candidates: readonly string[];
    readonly toolPolicy: ReplayToolPolicy;
    readonly policySet: ReplayPolicySet;
    readonly reservationId: string;
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
   * Run 98 addendum 56 §6: resolves the endpoint that currently judges comparisons (the configured controller).
   * Resolved per tick so a controller change takes effect without a restart, exactly like the judge itself.
   */
  readonly resolveJudgeEndpointId?: () => Promise<string | null>;
  readonly now?: () => number;
  readonly setIntervalFn?: (handler: () => void, timeout: number) => unknown;
  readonly clearIntervalFn?: (handle: unknown) => void;
}): {
  tick(): Promise<AutoReplayTickResult & { readonly skipped?: boolean }>;
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
      });
    }
    return captures;
  };

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
      if (typeof input.operations.resumePendingEvaluations === "function") {
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
      if (typeof input.operations.reconcileEvaluationJobs === "function") {
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
      if (typeof input.operations.retroFinalizeEvaluations === "function") {
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
      if (typeof input.operations.learnFromUnconsumedCandidates === "function") {
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
      if (typeof input.operations.deriveLearnerCandidates === "function") {
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
      finalizationSignals,
      finalizationSignalsDeferred,
      error,
    };
  };

  const tick = async (): Promise<AutoReplayTickResult & { readonly skipped?: boolean }> => {
    if (running || paused) {
      // `L7`: this is the interval path while a long work tick is in flight. Run the liveness sweeps
      // here instead of skipping them, so an overdue job is still expired on schedule.
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
    try {
      const pending = await input.operations.listPendingReplayCaptures({
        policySetDigest: input.policySet.policySetDigest,
        limit: maxCapturesPerTick * 4,
      });
      const captures = pendingCaptures(pending);
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
      const dispositionWrites: Promise<unknown>[] = [];
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
      const result = await runAutoReplayTick({
        captures,
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
        executor: input.executor,
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
        now,
      });
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
      };
    },
  };
}
