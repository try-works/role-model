import { createHash } from "node:crypto";

import { classifyRouteLadderServingState } from "@role-model-router/core";

import { type ReplayLedger, replayBudgetAvailable } from "./track-b-replay-ledger.js";
import {
  DEFAULT_REPLAY_CANDIDATE_CAP,
  type ReplayCandidateEligibilityProfile,
  type ReplayCandidateRejection,
  type ReplayPolicySet,
  type ReplayRefusalCode,
  type ReplayRequestRequirements,
  type ReplayToolPolicy,
  classifyReplayCandidateShortfall,
  decideReplayAdmission,
  isBenchmarkReplaySourceRef,
  isSyntheticProbeSourceClass,
  readReplayRequestRequirements,
  recheckReplayCandidatesForDispatch,
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
 * Run 108 addendum-02 (I2, the promotion floor): the versioned activation policy's counterfactual arm
 * bound (`maxCounterfactualArms`, 1..8, default 3) is the CAP on the arms one live dispatch plans.
 *
 * Measured live on `:3458` (2026-10-09): the bound was raised 3 -> 4 and NOTHING changed, because the
 * live planning path took its cap from a bare constant and never read the policy. The bound is the same
 * one `runTrackBPostObservation` already applies to the shadow branch
 * (`track-b-runtime.ts` `armBound`), so the two planners now agree on it.
 */
export const MAX_COUNTERFACTUAL_ARMS = 8;

export function resolveAutoReplayArmBound(explicit?: number | null): number {
  return typeof explicit === "number" && Number.isSafeInteger(explicit) && explicit > 0
    ? Math.min(explicit, MAX_COUNTERFACTUAL_ARMS)
    : DEFAULT_REPLAY_CANDIDATE_CAP;
}

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
  /** Explicit completed-comparison round; stable on retries, never a reservation nonce. */
  readonly dispatchRoundId?: string;
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
    .update(
      JSON.stringify({
        policySetDigest,
        candidateEndpointIds,
        providerCallBudget,
        ...(input.dispatchRoundId ? { dispatchRoundId: input.dispatchRoundId } : {}),
      }),
    )
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
   * Run 100 addendum 16 item 8a: the private boundary is between restarts — the capture is retryable, and
   * the wait is named instead of arriving as `replay_failed`.
   */
  "replay_boundary_unavailable",
  /**
   * Run 100 addendum 24 §3: two recoverable shapes the census left unnamed. `awaiting replay is missing its
   * durable evaluation receipt` is the shape `isRecoverableHandoff` exists for (the recovery pass rebuilds the
   * evaluation from durable evidence), and `durable replay branch append has no host dispatch receipt` is a
   * paid-for branch whose append can be rebuilt from the dispatch's persisted `providerResultRef`. Both are
   * deferrable; see `classifyReplayExecutorFailure`.
   */
  "replay_evaluation_receipt_missing",
  "replay_branch_append_unavailable",
  /**
   * Run 108: the caller resolves the judge per tick and could not name it. Without the judge the arms cannot
   * exclude it, and the controller is the strongest alternative - so a capture dispatched in this state is
   * planned *with* the judge as an arm and then judged by it (`judge_self_evaluation`, ineligible evidence).
   * Deferrable: the assignment read usually succeeds on the next tick.
   */
  "judge_unresolved",
  /**
   * Run 101 (live, found by the R5 kill-recovery drill): a durable replay job that is still `queued`
   * because an arm failed retryably is *not* a failed replay - the capture arrived at the handoff
   * before the replay finished. Deferrable, and named so it stops arriving as `replay_failed`.
   */
  "replay_job_not_ready_for_evaluation",
  /**
   * Run 101 (live census 2026-09-28): a job that has handed its branches to Evaluation Core refuses a
   * re-lease (`extensions/replay-core/index.mjs:965`). Work in progress; deferrable, and named so the
   * census counts it instead of `replay_failed`.
   */
  "replay_awaiting_evaluation_in_flight",
  /**
   * Run 101 (live `req-752e67dd…` 08:33:58Z): a trial with some but not all of its scores
   * (`extensions/evaluation-core/index.mjs:2943`). Deferrable and named; it still spends budget and
   * retires named, because recoverability is not established.
   */
  "replay_partial_trial_scores",
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
  /**
   * Run 104 R1: the request requirements the arm must be able to serve. The pending projection that
   * owns this record supplies it from the capture's recorded decision when it can; absent, the tick
   * infers it from `messages` (and leaves selection unfiltered when it has neither).
   */
  readonly requirements?: ReplayRequestRequirements;
  readonly messages?: readonly unknown[];
  /**
   * Run 105 R1/R8: the request's route classification. Queue admission requires a (role, task)
   * classification - a capture without BOTH ids is never admitted to the replay/eval queue and
   * never gets an advisory, because a scope-wide pack does not exist. The tick's classification
   * gate reads these and refuses by name; the projection supplies them from the capture's
   * recorded decision.
   */
  readonly roleId?: string | null;
  readonly taskTypeId?: string | null;
  /**
   * Run 105: this capture already holds a TERMINAL durable replay disposition (`replayed`/`refused`),
   * read from the replay-disposition store at the same scope as the corpus.
   *
   * The corpus read stays a faithful projection and still ENUMERATES such a capture — this is an
   * annotation, never a drop, so the operator readback and the audit trail keep showing everything the
   * telemetry and the exact capsule read agree exists. The dispatch planner is the layer that acts on it:
   * it skips an annotated capture when choosing a challenge source, so the tick advances to a fresh
   * capture instead of re-picking one whose dispatch would only be refused as
   * `duplicate_already_processed`.
   */
  readonly replayDispositionSettled?: boolean;
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
  /**
   * Run 104 R1: the arms the router's own capability/modality rule rejected for this capture, with the
   * endpoint id and the router's exclusion code, so an operator can count them instead of wondering
   * where the candidates went.
   */
  readonly rejectedArms?: readonly ReplayCandidateRejection[];
}

export interface AutoReplayTickResult {
  readonly processed: number;
  readonly replayed: number;
  readonly refused: number;
  readonly deferred: number;
  /**
   * Run 101 R4: captures this tick handed to `replay.dispatch` instead of
   * executing locally (`queue` mode only; `shadow` counts them as replayed
   * because the legacy path still did the work).
   */
  readonly queued: number;
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
 * Run 100 addendum 22: the operator-tunable list of endpoints the tick may judge a comparison with when the
 * configured judge is itself an arm of that comparison. `null` means "no explicit list", and the tick then uses
 * the runtime's own configured endpoint pool - the sane default, because those are exactly the endpoints this
 * runtime may use and one of them is always available unless the pool is degenerate. An empty effective list
 * reproduces the previous behaviour exactly: the capture defers with the named `judge_candidate_overlap`.
 */
export function resolveReplayJudgeFallbackEndpointIds(
  env: Record<string, string | undefined> = process.env,
): readonly string[] | null {
  const raw = env.ROLE_MODEL_REPLAY_JUDGE_FALLBACK_ENDPOINT_IDS;
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const parsed = Array.from(
    new Set(
      raw
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  );
  return parsed.length > 0 ? parsed : null;
}

/**
 * Run 100 addendum 22: pick the substitute judge for a capture whose configured judge is one of the
 * comparison's own arms. Deterministic (first usable entry in the caller's stable list order, no rotation and no
 * randomness) and never an arm of the pair: the colliding judge and the capture's own source endpoint are both
 * skipped. The chosen endpoint is then excluded from the planned counterfactual arms by the caller, which is
 * what makes "never an arm of the pair" hold for the candidate side too.
 */
export function selectAlternativeJudgeEndpoint(input: {
  readonly collidingJudgeEndpointId: string;
  readonly sourceEndpointId: string | null;
  readonly fallbackEndpointIds: readonly string[];
}): string | null {
  const seen = new Set<string>();
  for (const entry of input.fallbackEndpointIds) {
    if (typeof entry !== "string") continue;
    const endpointId = entry.trim();
    if (endpointId.length === 0 || seen.has(endpointId)) continue;
    seen.add(endpointId);
    if (endpointId === input.collidingJudgeEndpointId) continue;
    if (input.sourceEndpointId !== null && endpointId === input.sourceEndpointId) continue;
    return endpointId;
  }
  return null;
}

/**
 * Run 100 addendum 22 follow-up (requirement 3): the same de-confliction, applied where a *comparison's* judge is
 * resolved rather than where the arms are planned.
 *
 * `selectAlternativeJudgeEndpoint` protects the tick, but the judge identity that ends up on the job's
 * comparability, on the evaluator's manifest and on the runner's judge receipt is resolved later, from the
 * controller alone (`cli.ts` `resolveControllerJudge`). For a pair whose arms contain that controller the later
 * resolution re-introduces the judge as an arm of its own comparison, so the comparison is scored without a judge
 * and the provenance names an endpoint that never scored anything.
 *
 * This wrapper takes the judge object the caller already resolved plus the pair it is about to judge, and returns
 * the same object with a substitute endpoint when one exists - deterministic, drawn from the configured fallback
 * list (or the runtime's own endpoint pool) and never an arm of the pair - and the object unchanged when it does
 * not (today's fail-closed behaviour: the evaluator records judge missingness rather than scoring with an arm).
 * Every other field travels untouched, so the recording sites need no new plumbing.
 */
export function dedupeJudgeAgainstPair<T extends { readonly endpointId: string }>(
  judge: T,
  input: {
    readonly sourceEndpointId: string | null;
    readonly counterfactualEndpointIds: readonly string[];
    readonly fallbackEndpointIds?: readonly string[] | null;
    readonly configuredEndpointIds?: readonly string[] | null;
  },
): T {
  const judgeEndpointId = typeof judge.endpointId === "string" ? judge.endpointId.trim() : "";
  if (judgeEndpointId.length === 0) return judge;
  const arms = new Set<string>();
  if (typeof input.sourceEndpointId === "string" && input.sourceEndpointId.length > 0) {
    arms.add(input.sourceEndpointId);
  }
  for (const endpointId of input.counterfactualEndpointIds) {
    if (typeof endpointId === "string" && endpointId.length > 0) arms.add(endpointId);
  }
  if (!arms.has(judgeEndpointId)) return judge;
  /**
   * The pair's arms are exactly what the substitute must avoid, so they are removed from the pool before the
   * selector runs; the selector itself also rejects the colliding judge and the source arm, which keeps the rule
   * identical to the one the tick applies when it plans the arms.
   */
  const usableEndpointIds = (input.fallbackEndpointIds ?? input.configuredEndpointIds ?? []).filter(
    (endpointId) =>
      typeof endpointId === "string" &&
      endpointId.trim().length > 0 &&
      !arms.has(endpointId.trim()),
  );
  const substitute = selectAlternativeJudgeEndpoint({
    collidingJudgeEndpointId: judgeEndpointId,
    sourceEndpointId: input.sourceEndpointId,
    fallbackEndpointIds: usableEndpointIds,
  });
  return substitute === null ? judge : { ...judge, endpointId: substitute };
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
  return Math.max(
    DEFAULT_EXECUTOR_TIMEOUT_MS,
    jobDeadlineMs + DEFAULT_EXECUTOR_FINALIZATION_GRACE_MS,
  );
}

export type AutoReplayExecutorRequest = {
  readonly dispatchRoundId?: string;
  readonly capture: AutoReplayCapture;
  readonly candidates: readonly string[];
  readonly toolPolicy: ReplayToolPolicy;
  readonly policySet: ReplayPolicySet;
  readonly reservationId: string;
  /**
   * Run 100 addendum 22: the judge this capture will actually be judged by. When the configured judge was an arm
   * of the pair the tick substitutes a deterministic alternative and names it here, so the dispatch and the job
   * that follows it can record the judge that really scored the comparison instead of assuming the controller.
   */
  readonly judgeEndpointId?: string | null;
  /**
   * Run 104 post-closeout (addendum 12): the bounded executor aborts this signal when the per-capture
   * budget expires, so a timed-out dispatch cannot leave the provider fetch / branch append running in
   * the background and hold the queue's single claim. The caller's executor merges it with its own
   * per-request timeout.
   */
  readonly signal?: AbortSignal;
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
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      input.executor({ ...request, signal: controller.signal }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(
            new Error(`replay execution exceeded ${timeoutMs}ms (bounded per-capture budget)`),
          );
        }, timeoutMs);
        (timer as { unref?: () => void } | undefined)?.unref?.();
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
  }
}

/**
 * Run 100 addendum 16 item 8a, measured on the live store 2026-09-25: two of the 409s the executor
 * surfaces are not "the replay failed" and both were reported as the generic `replay_failed`:
 *
 * - `route capture skipped: boundary unavailable until <ts>` — the private Track B boundary is between
 *   restarts, and the capture is retryable exactly as the code intended (9 rows in flight, newest
 *   06:46:11Z). Named `replay_boundary_unavailable`, still deferred: the class is now countable and the
 *   wait is visible, without changing what the tick does.
 * - `route capture idempotency key was reused with different immutable bytes` — the boundary refuses the
 *   same idempotency key carrying different bytes, which is deterministic by construction (24 refused /
 *   3 deferred lifetime). Naming it terminal (`replay_capture_idempotency_conflict`) stops it spending
 *   the deferral budget and landing in `replay_failed` wearing a code that says nothing.
 *
 * Everything else keeps the previous behaviour exactly, including the generic code.
 */
export function classifyReplayExecutorFailure(message: string): Readonly<{
  code:
    | "replay_failed"
    | "replay_boundary_unavailable"
    | "replay_capture_idempotency_conflict"
    | "replay_evaluation_receipt_missing"
    | "replay_branch_append_unavailable"
    | "replay_job_not_ready_for_evaluation"
    | "replay_awaiting_evaluation_in_flight"
    | "replay_partial_trial_scores";
  terminal: boolean;
}> {
  if (/route capture skipped:\s*boundary unavailable/i.test(message)) {
    return { code: "replay_boundary_unavailable", terminal: false };
  }
  if (/idempotency key was reused with different immutable bytes/i.test(message)) {
    return { code: "replay_capture_idempotency_conflict", terminal: true };
  }
  /**
   * Run 100 addendum 24 §3: a job sitting in `awaiting_evaluation` with no evaluation id is recoverable —
   * `isRecoverableHandoff` covers exactly that shape and the handoff-recovery pass rebuilds the evaluation from
   * durable evidence. Deferrable and named, so the class is countable instead of spending its deferral budget
   * anonymously.
   */
  if (/awaiting replay is missing its durable evaluation receipt/i.test(message)) {
    return { code: "replay_evaluation_receipt_missing", terminal: false };
  }
  /**
   * Run 100 addendum 24 §3: the append-recovery leg rebuilds the branch from the dispatch's persisted
   * `providerResultRef`, and it fails when that capture cannot be read yet (a restart mid-append is the usual
   * cause). The work is already paid for, so the capture stays retryable under a name.
   */
  if (/durable replay branch append has no host dispatch receipt/i.test(message)) {
    return { code: "replay_branch_append_unavailable", terminal: false };
  }
  /**
   * Run 101, measured live on the packaged stage RC (2026-09-28): the durable replay job is still
   * `queued` because one arm failed *retryably* and the job went back for another attempt, so
   * `recordEvaluationReceipt` (`extensions/replay-core/index.mjs:1888`) refuses the handoff with
   * `replay job is not awaiting evaluation`. The live job behind the first sighting named both halves:
   * `dispatches` held `gpt-5.6-terra=complete`, `gpt-5.5=complete`, `gpt-5.4=retryable_failure`.
   *
   * The capture had done nothing wrong - it reached the handoff before its replay finished. It was
   * nonetheless reported as `replay_failed`, the generic fallback this classifier uses for shapes it
   * does not recognise, which is the collapse the neighbouring branches above exist to remove. It is
   * deferrable: the next attempt (or the next tick, once the failing arm's retry settles) can complete
   * the job. The deferral budget was already not being spent on it - `applyReplayDeferralBudget`
   * recognises the detail as in-flight - so this changes the *name*, not the budget.
   */
  if (/replay job is not awaiting evaluation/i.test(message)) {
    return { code: "replay_job_not_ready_for_evaluation", terminal: false };
  }
  /**
   * Run 101, live census 2026-09-28: `replay job is awaiting evaluation and cannot be re-leased`
   * (`extensions/replay-core/index.mjs:965`). The job has already handed its branches to Evaluation
   * Core, so the evaluation owns the clock and a re-lease is correctly refused - the capture is in
   * flight, not failing. The deferral budget already treats this shape as in-flight
   * (`tests/track-b/run99-r22-replay-deferral-budget.test.mjs` pins that), so this only gives the class
   * its name.
   */
  if (/awaiting evaluation and cannot be re-leased/i.test(message)) {
    return { code: "replay_awaiting_evaluation_in_flight", terminal: false };
  }
  /**
   * Run 101, live `req-752e67dd-6028-4fe7-810b-81b393f91cac` at 08:33:58Z: a trial carries some of its
   * scores but not the full batch, so Evaluation Core refuses the submission with
   * `partial evaluation trial scores require recovery` (`extensions/evaluation-core/index.mjs:2943`).
   * Deferrable and named. Unlike the in-flight class above it *does* consume the deferral budget and is
   * retired `refused` with this name on exhaustion - whether the partial batch can be completed is not
   * established, and quietly deferring it for ever would hide that.
   */
  if (/partial evaluation trial scores require recovery/i.test(message)) {
    return { code: "replay_partial_trial_scores", terminal: false };
  }
  return { code: "replay_failed", terminal: false };
}

export async function runAutoReplayTick(input: {
  readonly captures: readonly AutoReplayCapture[];
  readonly configuredEndpointIds: readonly string[];
  readonly healthyEndpointIds?: readonly string[];
  readonly ledger: ReplayLedger;
  readonly policySet: ReplayPolicySet;
  readonly executor: (input: {
    readonly dispatchRoundId?: string;
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
   * Run 100 addendum 22: the endpoints the tick may judge a comparison with when the configured judge
   * (`judgeEndpointId`) is one of that comparison's own arms. Omitted means "use `configuredEndpointIds`", the
   * runtime's own pool; an entry list that yields no usable alternative keeps the named `judge_candidate_overlap`
   * deferral, exactly as before this change.
   */
  readonly judgeFallbackEndpointIds?: readonly string[] | null;
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
  /**
   * Run 101 R4: the replay plane's queue. Omitted means the hand-rolled path is
   * authoritative (`legacy`). `shadow` offers the admitted capture to
   * `replay.dispatch` and still executes it here, so the queue's behaviour can
   * be compared with the authoritative path; `queue` offers it and skips the
   * local execution because a worker owns it now.
   *
   * The offer happens *after* admission and the ledger reservation, so the
   * budget and benchmark invariants stay where they are decided: a refused
   * capture is never offered.
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
   * Run 104 R1: the configured endpoints' declarations, keyed by endpoint id. Omitted (or missing an
   * endpoint) keeps the pre-existing selection behaviour for that endpoint.
   */
  readonly endpointProfiles?: readonly ReplayCandidateEligibilityProfile[];
  /**
   * Run 105 R8: when the dispatcher holds a focus task, its ladder gap decides the counterfactual.
   * The narrowing applies to the focused capture ONLY (matched by ref), so every other capture keeps
   * the rotation behaviour above, and one dispatch performs exactly one pairwise comparison against
   * the as-yet-unranked configured endpoint the walk selected.
   */
  readonly focusCandidateEndpointId?: string | null;
  readonly focusCaptureRef?: string | null;
  /**
   * Run 108 addendum-02: the operator's versioned counterfactual arm bound
   * (activation policy `maxCounterfactualArms`, 1..8). It caps the arms this tick plans for a capture,
   * so the bound the operator sets is the bound the live dispatch actually honours. Absent (or an
   * unusable value) keeps the pre-existing plan size, `DEFAULT_REPLAY_CANDIDATE_CAP`.
   */
  readonly maxCounterfactualArms?: number | null;
  /** Stage-3 runtime requires classification; omitted preserves pre-stage producers. */
  readonly requireRouteClassification?: boolean;
  readonly dispatchRoundId?: string;
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
  let queued = 0;
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
    // Namespaced accounting identity only. The capture and actual policy contract are unchanged.
    const dispatchRoundId =
      input.requireRouteClassification === true ? input.dispatchRoundId : undefined;
    const ledgerPolicyDigest = dispatchRoundId
      ? `${input.policySet.policySetDigest}:round:${dispatchRoundId}`
      : input.policySet.policySetDigest;

    /**
     * Run 105 R1/R8: queue admission requires a (role, task) classification. A capture without BOTH
     * ids is never admitted - a scope-wide pack does not exist, so there is no ladder to fill and no
     * advisory to serve - and the class is named so the census can count it instead of watching the
     * captures disappear. This sits ahead of every other gate: an unclassified capture is refused
     * for what it is, never for a downstream symptom.
     */
    const routeClassification = classifyRouteLadderServingState({
      roleId: capture.roleId,
      taskTypeId: capture.taskTypeId,
    });
    if (input.requireRouteClassification === true && !routeClassification.classified) {
      refused += 1;
      emit({
        captureRef: capture.captureRef,
        outcome: "refused",
        code: routeClassification.code as ReplayRefusalCode,
        detail:
          "the capture carries no (role, task) classification, so it is never admitted to the replay/eval queue and gets no advisory",
      });
      continue;
    }

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
    /**
     * Run 100 addendum 22: when the configured judge is one of this comparison's own arms the capture used to be
     * refused (`judge_candidate_overlap`) after spending its deferral budget - measured live as ~47% of recent
     * replay volume. Refusing half the traffic is not what the operator asked for, so the tick now judges the
     * comparison with a deterministic alternative instead. The named refusal survives as the last resort: it is
     * emitted only when the fallback list yields no endpoint that is not already an arm of the pair.
     */
    const judgeCollidesWithSource =
      judgeEndpointId !== null && capture.sourceEndpointId === judgeEndpointId;
    const effectiveJudgeEndpointId = judgeCollidesWithSource
      ? selectAlternativeJudgeEndpoint({
          collidingJudgeEndpointId: judgeEndpointId as string,
          sourceEndpointId: capture.sourceEndpointId,
          fallbackEndpointIds: input.judgeFallbackEndpointIds ?? input.configuredEndpointIds,
        })
      : judgeEndpointId;
    if (judgeCollidesWithSource && effectiveJudgeEndpointId === null) {
      deferred += 1;
      emit({
        captureRef: capture.captureRef,
        outcome: "deferred",
        code: "judge_candidate_overlap",
        detail:
          "the capture's own endpoint is the configured judge and no alternative judge endpoint is available, so a comparison would have the judge score itself",
      });
      continue;
    }
    /**
     * Run 104 R1: the capture's own recorded decision is the authority; a capture that predates the
     * field is read from its messages and the value is marked inferred.
     */
    const requestRequirements =
      capture.requirements ??
      (capture.messages === undefined
        ? undefined
        : readReplayRequestRequirements({ messages: capture.messages }));
    const rejectedArms: ReplayCandidateRejection[] = [];
    /**
     * Run 105 R8: the focus task's ladder gap owns the counterfactual for the capture the dispatcher
     * is filling. The narrowing is applied to THAT capture only (matched by ref) and pins the plan
     * to the single endpoint the top-down walk selected, so the dispatch is exactly one pairwise
     * comparison against an as-yet-unranked configured endpoint. Every other capture keeps the
     * rotation below, and the narrowing can never widen the configured pool: an endpoint that is not
     * configured (or is excluded, unhealthy, the source, or ineligible) is still filtered out by
     * selectReplayCandidates, which is why this is an input to it rather than a replacement for it.
     */
    const focusNarrowingEndpointId =
      typeof input.focusCandidateEndpointId === "string" &&
      input.focusCandidateEndpointId.trim().length > 0 &&
      typeof input.focusCaptureRef === "string" &&
      input.focusCaptureRef === capture.captureRef
        ? input.focusCandidateEndpointId.trim()
        : null;
    /**
     * Run 108 addendum-02: the policy bound is resolved ONCE per capture, where the arms are planned.
     * It is the cap the selection below is taken with, so a live dispatch plans as many arms as the
     * operator's activation policy allows (>= 3 by default) instead of the bare release constant.
     */
    const armBound = resolveAutoReplayArmBound(input.maxCounterfactualArms);
    const candidates = selectReplayCandidates({
      cap: armBound,
      ...(focusNarrowingEndpointId
        ? {
            /**
             * Run 108 addendum-02: the focus arm stays FIRST (it is the rung the ladder walk is admitting, and
             * the first counterfactual is the deciding one), but the pool is no longer COLLAPSED to it. The
             * collapse meant every live job carried exactly two cases - both decided by this comparison - so
             * both were forced to `holdout` (track-b-runtime.ts:9244-9247), the shadow pipeline's train-case
             * rescue (:9265-9278) never found a third case, and the development partition could therefore never
             * exist: `developmentComparisons` read 0 in every receipt and `floorMet` was unreachable, which is
             * the I2 defect this run exists to close. Appending the remaining configured endpoints lets the
             * declared split carry a non-deciding case, which the EXISTING rescue stamps `train` - no pipeline,
             * partition-rule, or floor change. Order is preserved (no rotationKey here), so the focus arm still
             * decides; selectReplayCandidates still filters the appended entries by health, source, judge and
             * eligibility, and its own cap still bounds the arm count.
             */
            configuredEndpointIds: input.configuredEndpointIds.includes(focusNarrowingEndpointId)
              ? [
                  focusNarrowingEndpointId,
                  ...input.configuredEndpointIds.filter(
                    (endpointId) => endpointId !== focusNarrowingEndpointId,
                  ),
                ]
              : /**
                 * Run 108 phase-03.5 repair (03.5-B T1-1): an EMPTY pool, not the whole configured
                 * set. 21db5afe widened this branch, which turned a safe named refusal into a
                 * DISPATCH: a focus rung absent from the configured set used to yield no candidates
                 * and fail closed with no_distinct_candidate_configured, but it then planned arms
                 * from the whole pool EXCLUDING the focus rung - a comparison whose first arm is an
                 * arbitrary endpoint while the challenge and the round still name the focus rung.
                 * The un-collapse above is what makes the configured focus case work; when the
                 * focus rung is NOT configured there is nothing to narrow to, and refusing is the
                 * only honest answer.
                 */
                [],
          }
        : { configuredEndpointIds: input.configuredEndpointIds }),
      ...(input.healthyEndpointIds ? { healthyEndpointIds: input.healthyEndpointIds } : {}),
      sourceEndpointId: capture.sourceEndpointId,
      // Run 98 addendum 30 S1/S2 with run 100 addendum 22: a comparison must not be scored by one of its own
      // arms, so the EFFECTIVE judge (the configured judge, or the deterministic alternative when the configured
      // judge is the capture's own source) is excluded from the planned arms.
      //
      // Run 105 bug 3 carves out exactly one case: when the arm being planned IS the rung the ladder walk is
      // admitting (`focusNarrowingEndpointId`). Excluding the judge there narrowed the plan to nothing and
      // refused the capture `no_distinct_candidate_configured`, so the controller endpoint could never be
      // admitted and the ladder could never complete. In that one case the comparison keeps the judge as an arm
      // and the evaluation de-conflicts: `dedupeJudgeAgainstPair` scores it with an alternative judge instead
      // (observed live as `evaluation_judge_switches: kimi-k3 -> deepseek-flash`). Every other capture still
      // excludes the judge, so no battle is ever judged by one of its own arms.
      ...(effectiveJudgeEndpointId && effectiveJudgeEndpointId !== focusNarrowingEndpointId
        ? { excludedEndpointIds: [effectiveJudgeEndpointId] }
        : {}),
      // Run 98 addendum 33 S3: rotate the counterfactual with the capture, so the comparison graph grows
      // edges instead of every capture comparing the same two candidates. A focus plan names its own
      // deciding arm FIRST (Run 105 R8 and Run 108 addendum-02), so the rotation must not reorder it;
      // the arms appended after it keep the configured order, and `cap` still bounds the plan.
      ...(focusNarrowingEndpointId ? {} : { rotationKey: capture.captureRef }),
      ...(requestRequirements ? { requirements: requestRequirements } : {}),
      ...(input.endpointProfiles ? { endpointProfiles: input.endpointProfiles } : {}),
      onRejected: (rejection) => rejectedArms.push(rejection),
    });
    if (process.env.ROLE_MODEL_FOCUS_DIAG) {
      console.error(
        `[cand-diag] ref=${capture.captureRef.slice(0, 12)} source=${capture.sourceEndpointId ? capture.sourceEndpointId.split(".").pop() : null} focus=${focusNarrowingEndpointId ? focusNarrowingEndpointId.split(".").pop() : null} judge=${effectiveJudgeEndpointId ? effectiveJudgeEndpointId.split(".").pop() : null} reqCap=${JSON.stringify(requestRequirements ? requestRequirements.requiredCapabilities : [])} reqMod=${JSON.stringify(requestRequirements ? requestRequirements.requiredModalities : [])} candidates=${candidates.map((c) => c.split(".").pop()).join(",")} rejected=${rejectedArms.map((r) => `${r.endpointId.split(".").pop()}:${r.code}`).join(",")} cfg=${(input.configuredEndpointIds || []).map((c) => c.split(".").pop()).join(",")} healthy=${(input.healthyEndpointIds || []).map((h) => h.split(".").pop()).join(",")}`,
      );
    }
    const emitCapture = (row: Omit<AutoReplayDisposition, "captureRef" | "rejectedArms">): void => {
      emit({
        captureRef: capture.captureRef,
        ...row,
        ...(rejectedArms.length > 0 ? { rejectedArms: [...rejectedArms] } : {}),
      });
    };
    /**
     * Run 104 R2: name the class when the eligibility rule left the plan empty, so the refusal carries
     * the blocking modality/capability and the rejected endpoint ids instead of arriving as the generic,
     * deferrable `no_distinct_candidate_configured`. Reuses the policy module's own classifier (and,
     * through it, the R1 rejection list) rather than restating the eligibility rule here.
     */
    const plannedArmShortfall = () =>
      classifyReplayCandidateShortfall({
        configuredEndpointIds: input.configuredEndpointIds,
        ...(requestRequirements ? { requirements: requestRequirements } : {}),
        ...(input.endpointProfiles ? { endpointProfiles: input.endpointProfiles } : {}),
        ...(capture.sourceEndpointId ? { sourceEndpointId: capture.sourceEndpointId } : {}),
        ...(effectiveJudgeEndpointId ? { excludedEndpointIds: [effectiveJudgeEndpointId] } : {}),
        ...(input.healthyEndpointIds ? { healthyEndpointIds: input.healthyEndpointIds } : {}),
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
        ledgerPolicyDigest,
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
      /**
       * Run 104 phase-3.5 F2: the named-input refusal answers only for the outcome it replaces. It used to
       * run *before* admission, so a benchmark capture (or an already-processed one) that also happened to
       * have one ineligible arm was recorded as `candidate_input_unsupported` instead of its own class -
       * polluting the per-class census this run added. Admission's named refusals keep precedence; the
       * shortfall names the pool-exhaustion case only.
       */
      const candidateShortfall =
        admission.code === "no_distinct_candidate_configured" && rejectedArms.length > 0
          ? plannedArmShortfall()
          : null;
      if (candidateShortfall) {
        if (candidateShortfall.outcome === "deferred") deferred += 1;
        else refused += 1;
        emitCapture({
          outcome: candidateShortfall.outcome,
          code: candidateShortfall.code,
          detail: candidateShortfall.detail,
        });
        continue;
      }
      const outcome = RETRYABLE_REPLAY_REFUSAL_CODES.has(admission.code) ? "deferred" : "refused";
      if (outcome === "deferred") deferred += 1;
      else refused += 1;
      emitCapture({
        outcome,
        code: admission.code,
        detail: admission.detail,
      });
      continue;
    }

    /**
     * Run 104 R1 pre-dispatch guard: between planning and dispatch the declarations can change, so the
     * planned arms are re-checked with the router's own rule. An arm that no longer satisfies the
     * capture's requirements is dropped with its reason recorded, and a plan left with no arm fails
     * cheaply here instead of being dispatched into a provider refusal.
     */
    const staleArms = recheckReplayCandidatesForDispatch({
      endpointIds: candidates,
      ...(requestRequirements ? { requirements: requestRequirements } : {}),
      ...(input.endpointProfiles ? { endpointProfiles: input.endpointProfiles } : {}),
    });
    let dispatchCandidates = candidates;
    if (staleArms.length > 0) {
      rejectedArms.push(...staleArms);
      const staleEndpointIds = new Set(staleArms.map((row) => row.endpointId));
      dispatchCandidates = candidates.filter((endpointId) => !staleEndpointIds.has(endpointId));
      if (dispatchCandidates.length === 0) {
        /**
         * Run 104 R2: the same named class answers here - terminal when every declared arm fails the
         * rule, deferrable when a capable arm is merely unavailable. The generic deferrable code stays
         * only for a shortfall the classifier cannot name (no declared pool to blame).
         */
        const staleShortfall = plannedArmShortfall();
        if (staleShortfall) {
          if (staleShortfall.outcome === "deferred") deferred += 1;
          else refused += 1;
          emitCapture({
            outcome: staleShortfall.outcome,
            code: staleShortfall.code,
            detail: staleShortfall.detail,
          });
        } else {
          deferred += 1;
          emitCapture({
            outcome: "deferred",
            code: "no_distinct_candidate_configured",
            detail: `no planned replay arm can serve the capture's requirements: ${staleArms
              .map((row) => `${row.endpointId} (${row.code})`)
              .join(", ")}`,
          });
        }
        continue;
      }
    }

    const reservation = input.ledger.reserve({
      captureRef: capture.captureRef,
      policySetDigest: ledgerPolicyDigest,
      candidateDispatches: dispatchCandidates.length,
    });
    if (!reservation.accepted) {
      const outcome = reservation.code === "budget_exhausted" ? "deferred" : "refused";
      if (outcome === "deferred") deferred += 1;
      else refused += 1;
      emitCapture({
        outcome,
        code: reservation.code,
        detail: reservation.detail,
      });
      continue;
    }

    const { toolPolicy } = resolveReplayToolPolicy({
      hasRecordedToolResults: capture.hasRecordedToolResults,
    });
    // Run 101 R4: the queue is offered the capture the tick just admitted and
    // reserved. In `queue` mode the worker owns the work, so this tick stops
    // here; in `shadow` mode the legacy execution below stays authoritative and
    // the offer is the recorded comparison.
    if (input.dispatchQueue && input.dispatchQueue.mode !== "legacy") {
      const offered = await input.dispatchQueue.offer({
        captureRef: capture.captureRef,
        endpointIds: [...dispatchCandidates],
        policySetDigest: input.policySet.policySetDigest,
        ...(dispatchRoundId ? { dispatchRoundId } : {}),
      });
      if (!offered.enqueued) {
        // The offer can only be refused by the queue's own id/validation rules;
        // the capture then stays on the legacy path rather than being lost.
        emitCapture({
          outcome: "deferred",
          code: "replay_dispatch_offer_refused",
          detail: offered.reason ?? "the replay queue refused the offer",
        });
        if (input.requireRouteClassification === true) {
          input.ledger.release(reservation.reservationId);
          deferred += 1;
          continue; // Stage scheduler retries the offer; never secretly executes refused queue work.
        }
      } else if (input.dispatchQueue.mode === "queue") {
        queued += 1;
        continue;
      }
    }
    let execution: AutoReplayExecution;
    try {
      execution = await runBoundedExecutor(input, {
        capture,
        candidates: dispatchCandidates,
        toolPolicy,
        policySet: input.policySet,
        reservationId: reservation.reservationId,
        judgeEndpointId: effectiveJudgeEndpointId,
        ...(dispatchRoundId ? { dispatchRoundId } : {}),
      });
    } catch (error) {
      input.ledger.release(reservation.reservationId);
      const detail =
        error instanceof Error ? error.message.slice(0, 200) : "replay execution failed";
      const classification = classifyReplayExecutorFailure(detail);
      if (classification.terminal) refused += 1;
      else deferred += 1;
      emitCapture({
        outcome: classification.terminal ? "refused" : "deferred",
        code: classification.code,
        detail,
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
        policySetDigest: ledgerPolicyDigest,
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
        emitCapture({
          outcome: "refused",
          code: "replay_window_elapsed",
          detail: execution.failureDetail ?? "replay window elapsed without a completed branch",
        });
        continue;
      }
      deferred += 1;
      {
        const detail =
          execution.failureDetail ??
          (execution.terminal
            ? "no candidate branch completed"
            : "replay did not reach a terminal state");
        /**
         * Run 100 addendum 16 item 8a (live rows on the stage store): the boundary reports its 409s by
         * *returning* a non-terminal execution with the error text, so this is the path the store's
         * `replay_failed` rows came from — the catch below only sees thrown errors. Classify the detail
         * the same way, so the two named classes reach the disposition instead of the generic code.
         */
        const classification = classifyReplayExecutorFailure(detail);
        if (classification.terminal) {
          refused += 1;
          deferred -= 1;
        }
        emitCapture({
          outcome: classification.terminal ? "refused" : "deferred",
          code: classification.code,
          detail,
        });
      }
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
      {
        const detail = execution.failureDetail ?? "replay evaluation is not complete";
        const classification = classifyReplayExecutorFailure(detail);
        if (classification.terminal) {
          refused += 1;
          deferred -= 1;
        }
        emitCapture({
          outcome: classification.terminal ? "refused" : "deferred",
          code: classification.code,
          detail,
        });
      }
      continue;
    }
    // Terminal only after the replay job completed with appended branches; a dispatch
    // that succeeded but whose branch/evaluation step failed stays retryable.
    input.ledger.completeCounterfactual({
      captureRef: capture.captureRef,
      policySetDigest: ledgerPolicyDigest,
    });
    input.ledger.release(reservation.reservationId);
    replayed += 1;
    emitCapture({
      outcome: "replayed",
      branches: completedBranches,
    });
  }

  return { processed, replayed, refused, deferred, queued, dispositions, cursor, budgetExhausted };
}
