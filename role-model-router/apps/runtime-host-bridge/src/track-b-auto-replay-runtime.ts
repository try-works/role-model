import {
  type AutoReplayCapture,
  type AutoReplayExecution,
  type AutoReplayTickResult,
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
          attempt: Number.isSafeInteger(row.attempt) && Number(row.attempt) > 0 ? Number(row.attempt) : 1,
          costMicros: Number.isSafeInteger(row.costMicros) && Number(row.costMicros) >= 0 ? Number(row.costMicros) : 0,
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
      failureDetail: terminal
        ? `durable replay job ${state}`
        : `durable replay state is ${state}`,
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
        // Replay output is never a replay source: the private boundary classifies
        // captures it produced while replaying, and the producer refuses them with
        // `amplification_depth_exceeded` instead of dispatching again.
        replayProduced: row.replayProduced === true,
      });
    }
    return captures;
  };

  const tick = async (): Promise<AutoReplayTickResult & { readonly skipped?: boolean }> => {
    if (running || paused) return { ...emptyResult(), skipped: true };
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
      });
      await Promise.all(dispositionWrites);
      // RC07 (L2): one bounded sweep per tick. A job whose deadline elapsed without
      // reaching a terminal state is expired with a typed receipt instead of living on
      // as an orphan the producer will never drive again. A sweep failure degrades this
      // tick, never the routing path.
      lastExpiredJobs = 0;
      lastResumedEvaluations = 0;
      let sweepError: string | null = null;
      if (typeof input.operations.expireStaleReplayJobs === "function") {
        try {
          const sweep = (await input.operations.expireStaleReplayJobs({
            window,
            policySetDigest: input.policySet.policySetDigest,
          })) as { readonly expiredCount?: unknown } | null;
          if (sweep && Number.isSafeInteger(sweep.expiredCount) && Number(sweep.expiredCount) >= 0) {
            lastExpiredJobs = Number(sweep.expiredCount);
          }
        } catch (error) {
          // The dispositions are already durable, so a failed sweep degrades the tick's
          // health instead of discarding the work that succeeded.
          sweepError =
            error instanceof Error
              ? `replay expiration sweep failed: ${error.message.slice(0, 200)}`
              : "replay expiration sweep failed";
        }
      }
      // Run 99 R33: the same bounded-per-tick shape for interrupted supervised-replay evaluations.
      // Without it a stranded evaluation is never retried, because the producer only drives replay
      // jobs and those are already terminal.
      if (typeof input.operations.resumePendingEvaluations === "function") {
        try {
          const sweep = (await input.operations.resumePendingEvaluations({
            window,
            policySetDigest: input.policySet.policySetDigest,
          })) as { readonly resumed?: unknown } | null;
          if (sweep && Number.isSafeInteger(sweep.resumed) && Number(sweep.resumed) >= 0) {
            lastResumedEvaluations = Number(sweep.resumed);
          }
        } catch (error) {
          const detail =
            error instanceof Error
              ? `evaluation resume sweep failed: ${error.message.slice(0, 200)}`
              : "evaluation resume sweep failed";
          sweepError = sweepError ? `${sweepError}; ${detail}` : detail;
        }
      }
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
      };
    },
    status() {
      return {
        ...{ ticks, running, paused, lastOutcome, lastError, lastProcessedAtMs },
        budget: { ...input.ledger.status() },
        lastDispositions,
        lastExpiredJobs,
        lastResumedEvaluations,
      };
    },
  };
}
