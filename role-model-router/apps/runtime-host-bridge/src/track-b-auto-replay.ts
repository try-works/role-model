import { createHash } from "node:crypto";

import type { ReplayLedger } from "./track-b-replay-ledger.js";
import {
  type ReplayPolicySet,
  type ReplayRefusalCode,
  type ReplayToolPolicy,
  decideReplayAdmission,
  resolveReplayToolPolicy,
  selectReplayCandidates,
} from "./track-b-replay-policy.js";

/**
 * Run 97 automatic replay producer.
 *
 * One bounded tick enumerates pending captures, applies the admission decision
 * table, selects candidates from the configured set, reserves budget, executes
 * supervised replay through the injected executor, records every dispatch in the
 * ledger, and reports a per-capture disposition plus a resumable cursor. The CLI
 * wires the real capture source and executor; tests drive it with fakes.
 */

export const DEFAULT_MAX_CAPTURES_PER_TICK = 8;

/**
 * Run 97 Repair Cycle 16 (W3): the automatic replay budget's wall-clock deadline.
 *
 * The dispatches inside one counterfactual are serialized, so a flat 120 s deadline
 * (the original constant) is shorter than the slow tail of a three-candidate job: live
 * stage evidence showed complete jobs at 36-83 s and timeouts at 122-173 s where every
 * provider call had already succeeded and been paid for. The deadline therefore scales
 * with the candidate count and stays within a bounded cap; `RC16-W1` additionally keeps
 * a job whose dispatches all completed alive through a bounded finalization grace so the
 * branch append and evaluation handoff can finish.
 */
export const AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS = 120_000;
export const AUTO_REPLAY_DEADLINE_MAX_MS = 1_800_000;
/**
 * Run 99 R33 live finding (stage v143): real coding-agent requests arrive with multi-megabyte
 * prompts. Once the capture admission bound stopped refusing them, the *replay* became the next
 * bound to bite: a 2.5 MiB prompt took 74–164 s per provider call, so a flat 120 s-per-candidate
 * deadline expired the durable job mid-dispatch (`durable replay job timed_out`) and discarded paid
 * work. The deadline now grows with the capture size, still inside the documented cap.
 */
export const AUTO_REPLAY_DEADLINE_SIZE_STEP_BYTES = 1024 * 1024;
export const AUTO_REPLAY_DEADLINE_SIZE_STEP_MS = 60_000;

/**
 * Run 98 addendum 34 S5 residual (live 2026-09-18, third measurement): the store showed jobs running but
 * never finishing — `replay execution exceeded 720000ms (bounded per-capture budget)` — because the flat
 * constants assumed provider calls of ~2 minutes while real dsh prompts were taking 2-4 minutes each, and a
 * three-arm capture therefore could not finish inside its budget. The budget is execution policy, not
 * contract identity, so the operator can size it for the traffic the runtime is actually serving instead of
 * having to rebuild: the defaults keep today's behaviour and the bounds stop a typo from asking for an
 * unbounded dispatch.
 */
export function resolveAutoReplayDeadlinePerCandidateMs(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const parsed = Number(environment.ROLE_MODEL_AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS?.trim());
  if (!Number.isSafeInteger(parsed) || parsed < 30_000 || parsed > 900_000) {
    return AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS;
  }
  return parsed;
}

export function resolveAutoReplayDeadlineMaxMs(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): number {
  const parsed = Number(environment.ROLE_MODEL_AUTO_REPLAY_DEADLINE_MAX_MS?.trim());
  if (!Number.isSafeInteger(parsed) || parsed < 120_000 || parsed > 7_200_000) {
    return AUTO_REPLAY_DEADLINE_MAX_MS;
  }
  return parsed;
}

/**
 * Run 99 R33 live finding (stage v143/v144): the loop deferred captures whose durable replay job was
 * already held by another dispatcher —
 *
 *   `replay endpoint HTTP 409: {"error":"extension replay-core failed: replay job is already leased"}`
 *
 * Deferral was the wrong answer twice over: the job is in flight (its terminal receipt is a bounded
 * wait away) and re-dispatching after the hold released produced the same 409 until the capture was
 * refused as `replay_window_elapsed`. A lease hold is now classified explicitly and retried with
 * backoff inside the capture's own deadline.
 */
export const REPLAY_LEASE_RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 20_000, 30_000] as const;

export function isReplayJobLeasedFailure(status: number, body: string): boolean {
  return status === 409 && typeof body === "string" && /already leased/i.test(body);
}

export async function retryLeasedReplayDispatch<TValue>(input: {
  readonly dispatch: () => Promise<
    { readonly ok: true; readonly value: TValue } | { readonly ok: false; readonly status: number; readonly body: string }
  >;
  readonly deadlineAtMs: number;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  /**
   * Run 98 addendum 34 S5 residual: which failed attempts are worth waiting out. Defaults to the lease
   * hold this helper was written for; a caller whose dispatch can also fail at the transport layer passes a
   * predicate that accepts those too, so a transient socket abort does not terminalize a capture that still
   * has a durable job to drive.
   */
  readonly retryable?: (failure: { readonly status: number; readonly body: string }) => boolean;
}): Promise<{ readonly value: TValue | null; readonly attempts: number; readonly lastFailure: string | null }> {
  const now = input.now ?? (() => Date.now());
  const sleep = input.sleep ?? ((ms: number) => new Promise(resolve => setTimeout(resolve, ms)));
  let attempts = 0;
  let lastFailure: string | null = null;
  for (;;) {
    attempts += 1;
    const attempt = await input.dispatch();
    if (attempt.ok) return { value: attempt.value, attempts, lastFailure };
    lastFailure = attempt.body;
    const retryable = input.retryable
      ? input.retryable({ status: attempt.status, body: attempt.body })
      : isReplayJobLeasedFailure(attempt.status, attempt.body);
    if (!retryable) {
      return { value: null, attempts, lastFailure };
    }
    const delay = REPLAY_LEASE_RETRY_DELAYS_MS[
      Math.min(attempts - 1, REPLAY_LEASE_RETRY_DELAYS_MS.length - 1)
    ];
    if (now() + delay >= input.deadlineAtMs) {
      return { value: null, attempts, lastFailure };
    }
    await sleep(delay);
  }
}

export function resolveAutoReplayDeadlineMs(
  candidateCount: number,
  options: {
    readonly captureBytes?: number;
    /** Run 98 addendum 34 S5 residual: operator-sized budgets, resolved once per tick by the caller. */
    readonly perCandidateMs?: number;
    readonly maxMs?: number;
  } = {},
): number {
  if (!Number.isSafeInteger(candidateCount) || candidateCount < 1) {
    throw new Error("auto replay deadline requires a positive candidate count");
  }
  const captureBytes =
    Number.isSafeInteger(options.captureBytes) && (options.captureBytes ?? 0) > 0
      ? (options.captureBytes as number)
      : 0;
  // Only whole megabytes of prompt add budget: a 64 KiB request keeps the plain per-candidate
  // deadline, while a 3 MiB coding-agent prompt gets three extra steps.
  const sizeSteps = Math.floor(captureBytes / AUTO_REPLAY_DEADLINE_SIZE_STEP_BYTES);
  const perCandidateMs =
    Number.isSafeInteger(options.perCandidateMs) && (options.perCandidateMs ?? 0) > 0
      ? Number(options.perCandidateMs)
      : AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS;
  const maxMs =
    Number.isSafeInteger(options.maxMs) && (options.maxMs ?? 0) > 0
      ? Number(options.maxMs)
      : AUTO_REPLAY_DEADLINE_MAX_MS;
  return Math.min(
    (perCandidateMs + sizeSteps * AUTO_REPLAY_DEADLINE_SIZE_STEP_MS) * candidateCount,
    maxMs,
  );
}

/**
 * Run 97 Repair Cycle 04 (L3): the retry identity of an automatic counterfactual.
 *
 * The per-attempt ledger reservation is budget bookkeeping, not replay identity.
 * Keying the durable replay job with it made every retry create a *new* job - and a
 * new set of provider dispatches - while the previous job was orphaned mid-dispatch
 * (live evidence: two to three jobs per capture, `failure_append_pending` rows that
 * could never be recovered). `guidance/05` requires an idempotency key that makes a
 * retry resume the same job, and `AC-R07-03` forbids amplification paths that consume
 * the daily dispatch ceiling.
 *
 * The identity is therefore the capture plus the frozen policy and candidate
 * contract: the same contract resumes, a genuinely different contract (for example
 * when a non-dispatchable endpoint leaves the healthy set) is a distinct job that the
 * caller reconciles against its superseded predecessor.
 */
export function buildAutoReplayIdempotencyKey(input: {
  readonly captureRef: string;
  readonly policySetDigest: string;
  readonly candidateEndpointIds: readonly string[];
}): string {
  const captureRef = input.captureRef.trim();
  if (!captureRef) throw new Error("auto replay idempotency requires a capture reference");
  const policySetDigest = input.policySetDigest.trim();
  if (!policySetDigest) throw new Error("auto replay idempotency requires a policy set digest");
  const candidateEndpointIds = [
    ...new Set(
      input.candidateEndpointIds
        .map((endpointId) => endpointId.trim())
        .filter((endpointId) => endpointId.length > 0),
    ),
  ].sort();
  if (candidateEndpointIds.length === 0) {
    throw new Error("auto replay idempotency requires at least one candidate endpoint");
  }
  const contractDigest = createHash("sha256")
    .update(JSON.stringify({ policySetDigest, candidateEndpointIds }))
    .digest("hex");
  return `auto:${captureRef}:${contractDigest}`;
}

/**
 * Refusal codes that reflect runtime state which can change (configuration, budget
 * window, dependencies). These defer the capture so a later tick can replay it;
 * every other code is terminal for the budget window.
 */
const RETRYABLE_REPLAY_REFUSAL_CODES: ReadonlySet<string> = new Set([
  "replay_disabled_channel",
  "capture_unavailable",
  "no_distinct_candidate_configured",
  "budget_exhausted",
  "policy_unknown",
  "dependency_unavailable",
]);

export function retryableReplayRefusalCodes(): ReadonlySet<string> {
  return RETRYABLE_REPLAY_REFUSAL_CODES;
}

export interface AutoReplayCapture {
  readonly captureRef: string;
  readonly sourceEndpointId: string | null;
  readonly hasRecordedToolResults: boolean;
  readonly replayProduced?: boolean;
}

export interface AutoReplayBranch {
  readonly endpointId: string;
  readonly outcome: "complete" | "failed" | "refused";
}

export interface AutoReplayExecution {
  readonly terminal: boolean;
  readonly branches: readonly AutoReplayBranch[];
  /** Bounded, operator-visible reason when the executor could not reach a terminal state. */
  readonly failureDetail?: string;
  readonly dispatches?: readonly {
    readonly kind: "candidate" | "retry" | "derived";
    readonly endpointId: string;
    readonly attempt: number;
    readonly costMicros: number;
    readonly bytes: number;
    readonly outcome: "complete" | "failed" | "refused";
  }[];
}

export interface AutoReplayDisposition {
  readonly captureRef: string;
  readonly outcome: "replayed" | "refused" | "deferred";
  readonly code?: ReplayRefusalCode | "replay_failed";
  readonly detail?: string;
  readonly branches?: number;
}

export interface AutoReplayTickResult {
  readonly processed: number;
  readonly replayed: number;
  readonly refused: number;
  readonly deferred: number;
  readonly dispositions: readonly AutoReplayDisposition[];
  readonly cursor: string | null;
  /**
   * Run 98 addendum 04 follow-on: true when the tick stopped starting new captures because its
   * wall-clock budget was spent. The captures it did not reach stay queued for the next tick.
   */
  readonly budgetExhausted: boolean;
}

/**
 * Run 98 addendum 04 follow-on, measured live: eight captures at ~4 minutes each made one tick run
 * for tens of minutes. `L7` keeps the liveness sweeps alive on the interval path, but the captures
 * the tick had not reached, their dispositions and the next tick all waited. The tick now stops
 * *starting* captures once this budget is spent — the current capture still finishes inside the
 * `L4` executor bound, and the rest are picked up by the next tick.
 */
export const DEFAULT_TICK_BUDGET_MS = 5 * 60_000;

/**
 * Run 98 addendum 04 follow-on: the operator-tunable tick budget. `null` means "no explicit value",
 * so the loop keeps its default; a valid value (including `0`, which disables the bound) is returned
 * as-is. Malformed or out-of-range values fall back to the default rather than silently removing the
 * bound.
 */
export function resolveAutoReplayTickBudgetMs(
  env: Record<string, string | undefined> = process.env,
): number | null {
  const raw = env.ROLE_MODEL_AUTO_REPLAY_TICK_BUDGET_MS;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 3_600_000
    ? parsed
    : DEFAULT_TICK_BUDGET_MS;
}

/**
 * Run 98 addendum 04 §7 (`L4`), measured live on v170: one capture whose replay never returned held
 * the whole producer tick open, so no disposition was recorded and the expiry sweep never ran. The
 * bound is deliberately larger than a replay job's own deadline plus finalization grace (6 min +
 * 5 min), so a legitimately slow multi-candidate replay is never cut off early — only work that has
 * outlived even the durable job's own bound is abandoned to the next tick.
 */
const DEFAULT_EXECUTOR_TIMEOUT_MS = 12 * 60 * 1000;

type AutoReplayExecutorRequest = {
  readonly capture: AutoReplayCapture;
  readonly candidates: readonly string[];
  readonly toolPolicy: ReplayToolPolicy;
  readonly policySet: ReplayPolicySet;
  readonly reservationId: string;
};

async function runBoundedExecutor(
  input: {
    readonly executor: (request: AutoReplayExecutorRequest) => Promise<AutoReplayExecution>;
    readonly executorTimeoutMs?: number;
  },
  request: AutoReplayExecutorRequest,
): Promise<AutoReplayExecution> {
  const configured = Number(input.executorTimeoutMs);
  const timeoutMs =
    Number.isSafeInteger(configured) && configured > 0 ? configured : DEFAULT_EXECUTOR_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      input.executor(request),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`replay execution exceeded ${timeoutMs}ms (bounded per-capture budget)`),
            ),
          timeoutMs,
        );
        (timer as { unref?: () => void } | undefined)?.unref?.();
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function runAutoReplayTick(input: {
  readonly captures: readonly AutoReplayCapture[];
  readonly configuredEndpointIds: readonly string[];
  readonly healthyEndpointIds?: readonly string[];
  readonly ledger: ReplayLedger;
  readonly policySet: ReplayPolicySet;
  readonly executor: (input: {
    readonly capture: AutoReplayCapture;
    readonly candidates: readonly string[];
    readonly toolPolicy: ReplayToolPolicy;
    readonly policySet: ReplayPolicySet;
    readonly reservationId: string;
  }) => Promise<AutoReplayExecution>;
  readonly dispositionSink?: (disposition: AutoReplayDisposition) => void;
  readonly maxCapturesPerTick?: number;
  readonly startCursor?: string | null;
  readonly channelReplayEnabled?: boolean;
  readonly dependenciesAvailable?: boolean;
  /**
   * Run 98 addendum 04 §7 (`L4`): bound a single capture's replay execution so one hung replay
   * cannot hold the producer's tick open. Measured live: `ticks: 0`, `lastProcessedAtMs: null` on a
   * runtime that had been up for minutes while eight jobs accumulated in `running`.
   */
  readonly executorTimeoutMs?: number;
  /**
   * Run 98 addendum 04 follow-on: the tick's wall-clock budget. Defaults to `DEFAULT_TICK_BUDGET_MS`;
   * `0` disables the bound (used by tests that want the pre-follow-on behaviour).
   */
  readonly tickBudgetMs?: number;
  /** Injectable clock so the budget is testable without waiting. */
  readonly now?: () => number;
}): Promise<AutoReplayTickResult> {
  const maxCapturesPerTick = input.maxCapturesPerTick ?? DEFAULT_MAX_CAPTURES_PER_TICK;
  const tickBudgetMs = input.tickBudgetMs ?? DEFAULT_TICK_BUDGET_MS;
  const now = input.now ?? (() => Date.now());
  const tickStartedAtMs = now();
  const dispositions: AutoReplayDisposition[] = [];
  const emit = (row: AutoReplayDisposition): void => {
    dispositions.push(row);
    input.dispositionSink?.(row);
  };

  let skipped = false;
  let pending = input.captures;
  if (input.startCursor) {
    const index = pending.findIndex((capture) => capture.captureRef === input.startCursor);
    if (index !== -1) {
      pending = pending.slice(index + 1);
    } else {
      skipped = true;
    }
  }
  if (skipped && pending.length === 0) pending = [];

  let processed = 0;
  let replayed = 0;
  let refused = 0;
  let deferred = 0;
  let cursor: string | null = input.startCursor ?? null;
  let budgetExhausted = false;

  for (const capture of pending) {
    if (processed >= maxCapturesPerTick) break;
    // Run 98 addendum 04 follow-on: stop *starting* captures once the tick's budget is spent, so a
    // tick made of several minutes-long replays cannot hold the loop open for tens of minutes. The
    // capture already running finishes under the `L4` executor bound; the rest are left for the
    // next tick and the cursor stays on the last capture this tick actually started.
    if (tickBudgetMs > 0 && processed > 0 && now() - tickStartedAtMs >= tickBudgetMs) {
      budgetExhausted = true;
      break;
    }
    processed += 1;
    cursor = capture.captureRef;

    const candidates = selectReplayCandidates({
      configuredEndpointIds: input.configuredEndpointIds,
      ...(input.healthyEndpointIds ? { healthyEndpointIds: input.healthyEndpointIds } : {}),
      sourceEndpointId: capture.sourceEndpointId,
      // Run 98 addendum 33 S3: rotate the counterfactual with the capture, so the comparison graph grows
      // edges instead of every capture comparing the same two candidates.
      rotationKey: capture.captureRef,
    });
    const status = input.ledger.status();
    const admission = decideReplayAdmission({
      channelReplayEnabled: input.channelReplayEnabled ?? true,
      captureAvailable: true,
      scopeAuthorized: true,
      authorizationEpochValid: true,
      retentionReplayable: true,
      privacyReplayable: true,
      distinctCandidateCount: candidates.length,
      budgetAvailable: status.dispatches + status.reservedDispatches < status.dispatchLimit,
      alreadyProcessed: input.ledger.hasTerminalCounterfactual(
        capture.captureRef,
        input.policySet.policySetDigest,
      ),
      sourceIsReplayProduced: capture.replayProduced === true,
      policyIdsResolvable: true,
      dependenciesAvailable: input.dependenciesAvailable ?? true,
    });
    if (!admission.admitted) {
      const outcome = RETRYABLE_REPLAY_REFUSAL_CODES.has(admission.code) ? "deferred" : "refused";
      if (outcome === "deferred") deferred += 1;
      else refused += 1;
      emit({
        captureRef: capture.captureRef,
        outcome,
        code: admission.code,
        detail: admission.detail,
      });
      continue;
    }

    const reservation = input.ledger.reserve({
      captureRef: capture.captureRef,
      policySetDigest: input.policySet.policySetDigest,
      candidateDispatches: candidates.length,
    });
    if (!reservation.accepted) {
      const outcome = reservation.code === "budget_exhausted" ? "deferred" : "refused";
      if (outcome === "deferred") deferred += 1;
      else refused += 1;
      emit({
        captureRef: capture.captureRef,
        outcome,
        code: reservation.code,
        detail: reservation.detail,
      });
      continue;
    }

    const { toolPolicy } = resolveReplayToolPolicy({
      hasRecordedToolResults: capture.hasRecordedToolResults,
    });
    let execution: AutoReplayExecution;
    try {
      execution = await runBoundedExecutor(input, {
        capture,
        candidates,
        toolPolicy,
        policySet: input.policySet,
        reservationId: reservation.reservationId,
      });
    } catch (error) {
      input.ledger.release(reservation.reservationId);
      deferred += 1;
      emit({
        captureRef: capture.captureRef,
        outcome: "deferred",
        code: "replay_failed",
        detail: error instanceof Error ? error.message.slice(0, 200) : "replay execution failed",
      });
      continue;
    }

    const dispatches =
      execution.dispatches ??
      execution.branches.map((branch) => ({
        kind: "candidate" as const,
        endpointId: branch.endpointId,
        attempt: 1,
        costMicros: 0,
        bytes: 0,
        outcome: branch.outcome,
      }));
    let completedBranches = 0;
    for (const dispatch of dispatches) {
      const recorded = input.ledger.record({
        reservationId: reservation.reservationId,
        captureRef: capture.captureRef,
        policySetDigest: input.policySet.policySetDigest,
        counterfactualRef: `cf:${capture.captureRef}`,
        dispatchKind: dispatch.kind,
        candidateEndpointId: dispatch.endpointId,
        attempt: dispatch.attempt,
        costMicros: dispatch.costMicros,
        bytes: dispatch.bytes,
        outcome: dispatch.outcome,
      });
      if (recorded.accepted && dispatch.outcome === "complete") completedBranches += 1;
    }
    if (completedBranches === 0) {
      input.ledger.release(reservation.reservationId);
      // Run 98 R2: a durable replay job that already reached a terminal failure state can
      // never dispatch again (RC16 freezes the deadline at creation). Retire the capture with
      // a terminal refusal so the pending projection stops re-offering it every tick; only
      // replayable deferrals stay pending.
      if (execution.terminal) {
        refused += 1;
        emit({
          captureRef: capture.captureRef,
          outcome: "refused",
          code: "replay_window_elapsed",
          detail: execution.failureDetail ?? "replay window elapsed without a completed branch",
        });
        continue;
      }
      deferred += 1;
      emit({
        captureRef: capture.captureRef,
        outcome: "deferred",
        code: "replay_failed",
        detail:
          execution.failureDetail ??
          (execution.terminal
            ? "no candidate branch completed"
            : "replay did not reach a terminal state"),
      });
      continue;
    }
    // Run 98 R2: a dispatched branch is not a completed counterfactual. Evaluation Core owns
    // the comparison, so the capture stays retryable until the durable replay job reports
    // `complete` (the evaluation finalized). Live stage evidence: captures were marked
    // `replayed` while their jobs sat in `awaiting_evaluation`, which removed them from the
    // pending queue before the group was finalized — the finalized-group count froze even
    // though paid dispatches kept succeeding.
    if (!execution.terminal) {
      input.ledger.release(reservation.reservationId);
      deferred += 1;
      emit({
        captureRef: capture.captureRef,
        outcome: "deferred",
        code: "replay_failed",
        detail: execution.failureDetail ?? "replay evaluation is not complete",
      });
      continue;
    }
    // Terminal only after the replay job completed with appended branches; a dispatch
    // that succeeded but whose branch/evaluation step failed stays retryable.
    input.ledger.completeCounterfactual({
      captureRef: capture.captureRef,
      policySetDigest: input.policySet.policySetDigest,
    });
    input.ledger.release(reservation.reservationId);
    replayed += 1;
    emit({
      captureRef: capture.captureRef,
      outcome: "replayed",
      branches: completedBranches,
    });
  }

  return { processed, replayed, refused, deferred, dispositions, cursor, budgetExhausted };
}
