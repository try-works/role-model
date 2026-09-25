import { createHash } from "node:crypto";

import { type ReplayLedger, replayBudgetAvailable } from "./track-b-replay-ledger.js";
import {
  type ReplayPolicySet,
  type ReplayRefusalCode,
  type ReplayToolPolicy,
  decideReplayAdmission,
  isBenchmarkReplaySourceRef,
  isSyntheticProbeSourceClass,
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
/**
 * Run 100 addendum `runtime-replay-timeout-bounds.addendum-01` (operator instruction: "raise the bounds to
 * 600 s for both"). The decision was first applied to the two running stage processes through environment
 * variables, which left the *packaged* runtime on the old 120 s default — and the operator starts the stage
 * release by hand from the downloaded package. The default is therefore the operator's value now; the
 * resolver band is unchanged, so a deployment can still tune it.
 */
export const AUTO_REPLAY_DEADLINE_PER_CANDIDATE_MS = 600_000;
/**
 * The cap must keep headroom above a three-candidate job at the new per-candidate bound (3 x 600 s =
 * 1800 s), otherwise every capture-size step is clipped away and a heavy three-arm replay is expired
 * mid-dispatch — the exact failure the per-candidate bound was raised to stop. One hour leaves room for a
 * three-arm job whose prompts add size steps while still bounding the job's wall clock.
 */
export const AUTO_REPLAY_DEADLINE_MAX_MS = 3_600_000;
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

/**
 * Run 98 addendum 58 §19 (live v306): a durable job that has already handed its branches to Evaluation Core
 * answers a lease with
 *
 *   `replay endpoint HTTP 409: {"error":"extension replay-core failed: replay job is awaiting evaluation and cannot be re-leased"}`
 *
 * That is the same kind of answer as a lease hold: the job is in flight — its evaluation is pending and the
 * auto-replay tick's resume sweep is what finalizes it — so the capture must wait inside its own deadline
 * rather than be recorded as a replay failure and spend its deferral budget.
 */
export function isReplayAwaitingEvaluationFailure(status: number, body: string): boolean {
  return (
    status === 409 &&
    typeof body === "string" &&
    /awaiting evaluation and cannot be re-leased/i.test(body)
  );
}

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S3 (live refusal measured on `:3457`):
 *
 *   `replay endpoint HTTP 409: {"error":"extension replay-core failed: replay concurrency budget is exhausted"}`
 *
 * A job's `maxConcurrency` (1 when unset) forbids preparing a second candidate while one of its dispatches
 * is still in flight, so this answer means "the work is already running", exactly like a lease hold. The
 * loop must wait it out inside the capture's own deadline instead of recording a replay failure and
 * spending the capture's deferral budget - the pre-repair behaviour ended in `refused replay_failed` while
 * the provider work had already been paid for. A *resource* refusal (`provider call`, cost, bytes) is not
 * this class and stays a real refusal.
 */
export function isReplayDispatchHoldFailure(status: number, body: string): boolean {
  return (
    status === 409 &&
    typeof body === "string" &&
    /replay concurrency budget is exhausted/i.test(body)
  );
}

/** A failure that means "the durable job is in flight", not "the replay failed". */
export function isReplayInFlightFailure(status: number, body: string): boolean {
  return (
    isReplayJobLeasedFailure(status, body) ||
    isReplayAwaitingEvaluationFailure(status, body) ||
    isReplayDispatchHoldFailure(status, body)
  );
}

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S9 (live on `:3457`): the counterfactual arm's
 * dispatch capture is named `replay-<requestId>-<token>`, and the token was derived from the replay job and
 * the candidate only. That identity is stable across a job's *attempts*, so when a job is re-claimed and its
 * arm is dispatched again the provider returns fresh bytes under the same capture id - and the capture
 * boundary refuses them by design:
 *
 *   `route capture idempotency key was reused with different immutable bytes`
 *
 * The dispatch envelope carries the per-attempt identity: replay-core rehydrates the same `nonce` for a
 * dispatch that is still in flight and mints a new one for a fresh attempt (the stale-dispatch repair is
 * what makes a second attempt possible at all). Scoping the capture id by that nonce keeps a retry inside
 * one attempt idempotent while a new attempt writes new bytes under a new id.
 */
export function replayDispatchCaptureToken(input: {
  readonly replayJobId: string;
  readonly candidateEndpointId: string;
  readonly dispatchNonce: string | null;
}): string {
  return createHash("sha256")
    .update(
      `${String(input.replayJobId)}\u0000${String(input.candidateEndpointId)}\u0000${input.dispatchNonce ?? ""}`,
    )
    .digest("hex")
    .slice(0, 16);
}

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S11 (live on `:3457`): the automatic producer
 * sized a job's provider-call budget as exactly one call per candidate, so an arm whose dispatch was
 * interrupted had to be dispatched again under a fresh attempt - and that second call spent a budget that was
 * already consumed. The job then answered `replay provider call budget is exhausted` and the capture was
 * terminally refused even though its work had merely been interrupted.
 *
 * The budget keeps a bounded retry allowance per candidate: enough for one interrupted attempt to be re-driven
 * (the recovery path that re-presents an existing dispatch receipt does not spend a call at all), still
 * fail-closed against a job that keeps retrying, and still a plain multiple of the candidate count so a
 * reader can reason about it.
 */
export const REPLAY_PROVIDER_CALL_ATTEMPTS_PER_CANDIDATE = 2;

export function resolveReplayProviderCallBudget(candidateCount: number): number {
  const count = Number.isSafeInteger(candidateCount) && candidateCount > 0 ? candidateCount : 1;
  return count * REPLAY_PROVIDER_CALL_ATTEMPTS_PER_CANDIDATE;
}

export async function retryLeasedReplayDispatch<TValue>(input: {
  readonly dispatch: () => Promise<
    | { readonly ok: true; readonly value: TValue }
    | { readonly ok: false; readonly status: number; readonly body: string }
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
}): Promise<{
  readonly value: TValue | null;
  readonly attempts: number;
  readonly lastFailure: string | null;
}> {
  const now = input.now ?? (() => Date.now());
  const sleep = input.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
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
    const delay =
      REPLAY_LEASE_RETRY_DELAYS_MS[Math.min(attempts - 1, REPLAY_LEASE_RETRY_DELAYS_MS.length - 1)];
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
  /**
   * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S12: the job contract the key mints, when the
   * caller knows it. The key covered the comparison's identity but not the budget, so a runtime that changed
   * the budget (S11: one bounded retry per candidate) re-presented the same key with different immutable
   * bytes and Replay Core refused it with `replay idempotency key contract conflict`. Including it means a
   * contract revision mints a new job instead of colliding, and the previous job retires on its deadline.
   */
  readonly providerCallBudget?: number;
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
  const providerCallBudget =
    Number.isSafeInteger(input.providerCallBudget) && (input.providerCallBudget ?? 0) > 0
      ? Number(input.providerCallBudget)
      : null;
  const contractDigest = createHash("sha256")
    .update(JSON.stringify({ policySetDigest, candidateEndpointIds, providerCallBudget }))
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
  /**
   * Run 98 addendum 56 §6: a capture whose own endpoint is the configured judge cannot be compared without the
   * judge scoring itself (`judge_candidate_overlap`, addendum 30/33). The controller can change, so the capture
   * stays deferrable — but it is named instead of being dispatched into a guaranteed refusal.
   */
  "judge_candidate_overlap",
  /**
   * Run 108: the caller resolves the judge per tick and could not name it. Without the judge the arms cannot
   * exclude it, and the controller is the strongest alternative - so a capture dispatched in this state is
   * planned *with* the judge as an arm and then judged by it (`judge_self_evaluation`, ineligible evidence).
   * Deferrable: the assignment read usually succeeds on the next tick.
   */
  "judge_unresolved",
]);

export function retryableReplayRefusalCodes(): ReadonlySet<string> {
  return RETRYABLE_REPLAY_REFUSAL_CODES;
}

export interface AutoReplayCapture {
  readonly captureRef: string;
  readonly sourceEndpointId: string | null;
  readonly hasRecordedToolResults: boolean;
  readonly replayProduced?: boolean;
  /**
   * Run 100 addendum 16 item 3 / 8a: the class the pending projection read off the capture's durable
   * root. `marker_echo_probe` means the recorded reply is the marker the instruction demanded, so the
   * capture cannot discriminate two candidates and is refused terminally at admission.
   */
  readonly sourceClass?: string | null;
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
 * Run 98 addendum 52 (addendum 48 §11.2): how long a replay-budget reservation may outlive the dispatch that
 * created it before the next tick treats it as orphaned. Six times the tick's own budget, so only reservations
 * whose process is gone can reach it.
 */
export const DEFAULT_REPLAY_RESERVATION_TTL_MS = 30 * 60_000;

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
 * Run 98 addendum 52 (addendum 48 §11.2): the orphaned-reservation bound is operator-tunable, with the same
 * shape as the tick budget — `null` means "keep the default", an out-of-range value is refused to the default
 * rather than silently disabling the reconciliation, and the floor is the tick's own executor bound
 * (12 minutes), because a reservation shorter than that could be pruned while its dispatch is still running.
 */
export function resolveAutoReplayReservationTtlMs(
  env: Record<string, string | undefined> = process.env,
): number | null {
  const raw = env.ROLE_MODEL_REPLAY_RESERVATION_TTL_MS;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= 12 * 60_000 && parsed <= 24 * 60 * 60_000
    ? parsed
    : DEFAULT_REPLAY_RESERVATION_TTL_MS;
}

/**
 * Run 98 addendum 04 §7 (`L4`), measured live on v170: one capture whose replay never returned held
 * the whole producer tick open, so no disposition was recorded and the expiry sweep never ran. The
 * bound is deliberately larger than a replay job's own deadline plus finalization grace (6 min +
 * 5 min), so a legitimately slow multi-candidate replay is never cut off early — only work that has
 * outlived even the durable job's own bound is abandoned to the next tick.
 */
const DEFAULT_EXECUTOR_TIMEOUT_MS = 12 * 60 * 1000;

/**
 * Run 100 addendum `replay-dispatch-envelope-repair.addendum-03` S1 (operator report 2026-09-23: "replays
 * are stuck and not reaching eval or learner stage").
 *
 * The `L4` bound above is only safe while it stays *larger than the durable job's own deadline*; that is
 * what its own comment promises. Addendum 01 raised the per-candidate bound to 600 s, so a three-candidate
 * job's deadline became 30-60 minutes while the executor still abandoned its capture at 12: the loop then
 * re-claimed and restarted the job on the next tick, and the job only ended when its deadline expired
 * (`timed_out`, measured live on 27 frozen jobs). The bound is therefore derived from the same arithmetic
 * that sizes the job, plus the finalization grace, with the old 12 minutes as a floor.
 */
export const DEFAULT_EXECUTOR_FINALIZATION_GRACE_MS = 5 * 60_000;

export function resolveAutoReplayExecutorTimeoutMs(input: {
  readonly candidateCount: number;
  readonly captureBytes?: number;
  readonly perCandidateMs?: number;
  readonly maxMs?: number;
  /** An explicit operator/configuration bound wins, exactly as it did before this change. */
  readonly explicitMs?: number;
}): number {
  const explicit = Number(input.explicitMs);
  if (Number.isSafeInteger(explicit) && explicit > 0) return explicit;
  const candidates =
    Number.isSafeInteger(input.candidateCount) && input.candidateCount > 0
      ? input.candidateCount
      : 1;
  const jobDeadlineMs = resolveAutoReplayDeadlineMs(candidates, {
    ...(Number.isSafeInteger(input.captureBytes) && (input.captureBytes ?? 0) > 0
      ? { captureBytes: Number(input.captureBytes) }
      : {}),
    ...(Number.isSafeInteger(input.perCandidateMs) && (input.perCandidateMs ?? 0) > 0
      ? { perCandidateMs: Number(input.perCandidateMs) }
      : {}),
    ...(Number.isSafeInteger(input.maxMs) && (input.maxMs ?? 0) > 0
      ? { maxMs: Number(input.maxMs) }
      : {}),
  });
  return Math.max(DEFAULT_EXECUTOR_TIMEOUT_MS, jobDeadlineMs + DEFAULT_EXECUTOR_FINALIZATION_GRACE_MS);
}

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
  const timeoutMs = resolveAutoReplayExecutorTimeoutMs({
    candidateCount: request.candidates.length,
    ...(Number.isSafeInteger(input.executorTimeoutMs) && (input.executorTimeoutMs ?? 0) > 0
      ? { explicitMs: Number(input.executorTimeoutMs) }
      : {}),
  });
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
  /**
   * Run 98 addendum 52 (addendum 48 §11.2): a reservation older than this belongs to a dispatch whose process is
   * gone, so the tick reconciles it instead of carrying it forever. The default sits far beyond this tick's own
   * executor bound (`ROLE_MODEL_TRACK_B_OPERATIONS_TIMEOUT_MS`, 180 s live), so a live dispatch is never pruned
   * underneath itself.
   */
  readonly reservationTtlMs?: number;
  /**
   * Run 98 addendum 56 §6: the endpoint that currently judges comparisons (the configured controller). It is
   * never planned as a counterfactual arm — a battle must not contain the endpoint that judges it — and a capture
   * whose own endpoint is the judge defers with `judge_candidate_overlap` instead of being dispatched into a
   * refusal at job creation.
   */
  readonly judgeEndpointId?: string | null;
  /**
   * Run 111: opt in to the `judge_unresolved` refusal.
   *
   * The guard was added unconditionally and immediately refused **every** capture on the real-traffic runtime:
   * measured live minutes after traffic resumed, the newest four dispositions were all `refused` /
   * `judge_unresolved`, because this composition's tick-time judge resolution answers `null` even though the
   * controller assignment exists (the router reports `deepseek…flash-high`). Refusing all replay work is a far
   * worse failure than possibly planning an arm the judge is also scored in, so the guard is opt-in and stays
   * dormant until the hook genuinely resolves a judge here.
   */
  readonly requireResolvedJudge?: boolean;
}): Promise<AutoReplayTickResult> {
  const maxCapturesPerTick = input.maxCapturesPerTick ?? DEFAULT_MAX_CAPTURES_PER_TICK;
  const tickBudgetMs = input.tickBudgetMs ?? DEFAULT_TICK_BUDGET_MS;
  const now = input.now ?? (() => Date.now());
  const tickStartedAtMs = now();
  input.ledger.pruneStaleReservations?.({
    atMs: tickStartedAtMs,
    maxAgeMs: input.reservationTtlMs ?? DEFAULT_REPLAY_RESERVATION_TTL_MS,
  });
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

    const judgeEndpointId =
      typeof input.judgeEndpointId === "string" && input.judgeEndpointId.trim().length > 0
        ? input.judgeEndpointId.trim()
        : null;
    /**
     * Run 108: `undefined` means "this caller does not resolve a judge", so nothing needs excluding and the
     * capture proceeds exactly as before. A present-but-empty value means the caller *does* resolve one and
     * could not: the exclusion is then unavailable, and dispatching the capture would plan arms that may
     * contain the judge - which the completion then uses to score its own comparison. Defer by name instead.
     */
    const judgeExpected = input.requireResolvedJudge === true;
    if (judgeExpected && judgeEndpointId === null) {
      deferred += 1;
      emit({
        captureRef: capture.captureRef,
        outcome: "deferred",
        code: "judge_unresolved",
        detail:
          "the configured judge could not be resolved, so a planned comparison could have the judge as an arm",
      });
      continue;
    }
    if (judgeEndpointId && capture.sourceEndpointId === judgeEndpointId) {
      deferred += 1;
      emit({
        captureRef: capture.captureRef,
        outcome: "deferred",
        code: "judge_candidate_overlap",
        detail:
          "the capture's own endpoint is the configured judge, so a comparison would have the judge score itself",
      });
      continue;
    }
    const candidates = selectReplayCandidates({
      configuredEndpointIds: input.configuredEndpointIds,
      ...(input.healthyEndpointIds ? { healthyEndpointIds: input.healthyEndpointIds } : {}),
      sourceEndpointId: capture.sourceEndpointId,
      ...(judgeEndpointId ? { excludedEndpointIds: [judgeEndpointId] } : {}),
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
      /**
       * Run 100 addendum `00-requirements.benchmark-traffic-exclusion.addendum-01`: benchmark captures are
       * refused terminally here, so they never reserve budget, never dispatch and never reach evaluation.
       */
      sourceIsBenchmark: isBenchmarkReplaySourceRef(capture.captureRef),
      /**
       * Run 100 addendum 16 item 3 / 8a: the producer's own class, taken from the capture's durable
       * root by the projection. Defence in depth: the projection already keeps the class out of the
       * queue, and this refusal makes the rule hold for any caller that lists a capture directly.
       */
      sourceIsSyntheticProbe: isSyntheticProbeSourceClass(capture.sourceClass),
      distinctCandidateCount: candidates.length,
      budgetAvailable: replayBudgetAvailable(status),
      alreadyProcessed: input.ledger.hasTerminalCounterfactual(
        capture.captureRef,
        input.policySet.policySetDigest,
      ),
      sourceIsReplayProduced: capture.replayProduced === true,
      policyIdsResolvable: true,
      dependenciesAvailable: input.dependenciesAvailable ?? true,
      /**
       * Run 108: this caller plans arms, so it states whether the judge it excludes is known. Omitted means
       * "no judge to exclude" (the guard above already refused the unresolvable case).
       */
      ...(judgeExpected ? { judgeResolved: judgeEndpointId !== null } : {}),
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
