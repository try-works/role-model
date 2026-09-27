/**
 * Run 101 / R4 - the replay dispatch worker.
 *
 * `PersistedQueue.take` claims one element, runs the handler and *returns* the
 * handler's failure once the store has recorded the retry (`visible_at` moves,
 * `attempts` increments). The retry is therefore picked up by the next claim,
 * which means the loop is the runtime's job, not the library's: a worker that
 * calls `take` once retries exactly zero times (measured live during SP4).
 *
 * The worker re-reads the kill switch before every claim, so engaging it stops
 * new work while in-flight work still reaches a terminal state, and it takes its
 * lock values from the resolved policy via `storeLayerForQueuePolicy`.
 */
import { Cause, Duration, Effect, Fiber } from "effect";

import { QueueJobCancelledError, isQueueDraining, readQueueJobState } from "./admin.js";
import {
  EVALUATION_SCORE_QUEUE,
  type EvaluationScoreJob,
  makeEvaluationScoreQueue,
} from "./evaluation.js";
import {
  LEARNER_DERIVE_QUEUE,
  LEARNER_PROMOTE_QUEUE,
  type LearnerDeriveJob,
  type LearnerPromoteJob,
  makeLearnerDeriveQueue,
  makeLearnerPromoteQueue,
} from "./learner.js";
import { type ResolvedQueuePolicy, killSwitchEngaged, readQueuePolicy } from "./policy.js";
import {
  REPLAY_DISPATCH_QUEUE,
  type ReplayDispatchJob,
  makeReplayDispatchQueue,
} from "./queues.js";
import { storeLayerForQueuePolicy } from "./store.js";

export interface ReplayDispatchWorkerOptions {
  readonly stateRoot: string;
  readonly policy: ResolvedQueuePolicy;
  /** Runs one attempt for one job; throwing makes the attempt retryable. */
  readonly handler: (
    job: ReplayDispatchJob,
    context: { readonly attempt: number },
  ) => Promise<void>;
  /** Called after a failed attempt, before the store's backoff elapses. */
  readonly onAttemptFailure?: (error: unknown, job: ReplayDispatchJob) => void;
  /** Run 101 addendum 08: the attempt outcome (attempt, budget, willRetry) the guide's onJobFailure carries. */
  readonly onAttemptOutcome?: (outcome: {
    readonly error: unknown;
    readonly job: ReplayDispatchJob;
    readonly attempt: number;
    readonly attemptsMax: number;
    readonly willRetry: boolean;
  }) => void;
  /** Where the shipped policy lives when no state-root document exists yet. */
  readonly shippedRoot?: string;
  /** How often an engaged kill switch is re-checked. Defaults to 1 s. */
  readonly killSwitchPollIntervalMs?: number;
  /** How often a running attempt re-reads its row for an operator cancel. Defaults to 1 s. */
  readonly cancellationPollIntervalMs?: number;
}

export interface ReplayDispatchWorker {
  /** Stops claiming; in-flight attempts are allowed to finish. */
  stop(): Promise<void>;
}

export interface EvaluationScoreWorkerOptions {
  readonly stateRoot: string;
  readonly policy: ResolvedQueuePolicy;
  /**
   * Runs one evaluation attempt. The handler owns the evidence-before-ack rule:
   * it writes (or updates) the evaluation evidence row before returning, and a
   * throw leaves the job claimable so the store retries it.
   */
  readonly handler: (
    job: EvaluationScoreJob,
    context: { readonly attempt: number },
  ) => Promise<void>;
  readonly onAttemptFailure?: (error: unknown, job: EvaluationScoreJob) => void;
  /** Run 101 addendum 08: the attempt outcome (attempt, budget, willRetry) the guide's onJobFailure carries. */
  readonly onAttemptOutcome?: (outcome: {
    readonly error: unknown;
    readonly job: EvaluationScoreJob;
    readonly attempt: number;
    readonly attemptsMax: number;
    readonly willRetry: boolean;
  }) => void;
  readonly shippedRoot?: string;
  readonly killSwitchPollIntervalMs?: number;
  readonly cancellationPollIntervalMs?: number;
}

export interface LearnerDeriveWorkerOptions {
  readonly stateRoot: string;
  readonly policy: ResolvedQueuePolicy;
  /**
   * Derives a candidate for one group. A *named skip* is a throw: the group
   * stays claimable and is retried under the policy's attempt bound instead of
   * being consumed by a process-local set, and an operator sees the named
   * reason in the queue's history.
   */
  readonly handler: (job: LearnerDeriveJob, context: { readonly attempt: number }) => Promise<void>;
  readonly onAttemptFailure?: (error: unknown, job: LearnerDeriveJob) => void;
  /** Run 101 addendum 08: the attempt outcome (attempt, budget, willRetry) the guide's onJobFailure carries. */
  readonly onAttemptOutcome?: (outcome: {
    readonly error: unknown;
    readonly job: LearnerDeriveJob;
    readonly attempt: number;
    readonly attemptsMax: number;
    readonly willRetry: boolean;
  }) => void;
  readonly shippedRoot?: string;
  readonly killSwitchPollIntervalMs?: number;
  readonly cancellationPollIntervalMs?: number;
}

export interface LearnerPromoteWorkerOptions {
  readonly stateRoot: string;
  readonly policy: ResolvedQueuePolicy;
  /** Promotes one candidate; serialized by the queue's concurrency. */
  readonly handler: (
    job: LearnerPromoteJob,
    context: { readonly attempt: number },
  ) => Promise<void>;
  readonly onAttemptFailure?: (error: unknown, job: LearnerPromoteJob) => void;
  /** Run 101 addendum 08: the attempt outcome (attempt, budget, willRetry) the guide's onJobFailure carries. */
  readonly onAttemptOutcome?: (outcome: {
    readonly error: unknown;
    readonly job: LearnerPromoteJob;
    readonly attempt: number;
    readonly attemptsMax: number;
    readonly willRetry: boolean;
  }) => void;
  readonly shippedRoot?: string;
  readonly killSwitchPollIntervalMs?: number;
  readonly cancellationPollIntervalMs?: number;
}

/**
 * The claim-loop contract shared by every queue in this runtime: `take` claims
 * one element and returns the handler's failure once the store records the
 * retry, so the loop is ours; the kill switch is re-read before each claim; the
 * lock values come from the resolved policy.
 */
function runClaimLoopWorker<Job>({
  stateRoot,
  shippedRoot,
  policy,
  queueName,
  makeQueue,
  handler,
  onAttemptFailure,
  onAttemptOutcome,
  killSwitchPollIntervalMs,
  cancellationPollIntervalMs,
}: {
  readonly stateRoot: string;
  readonly shippedRoot?: string;
  readonly policy: ResolvedQueuePolicy;
  /** The catalogue name this loop claims from - needed for drain and cancel reads. */
  readonly queueName: string;
  readonly makeQueue: (policy: ResolvedQueuePolicy) => Effect.Effect<
    {
      take: (
        handler: (
          job: Job,
          info: { readonly id: string; readonly attempts: number },
        ) => Effect.Effect<unknown, unknown, never>,
      ) => Effect.Effect<unknown, unknown, never>;
    },
    never,
    never
  >;
  readonly handler: (job: Job, context: { readonly attempt: number }) => Promise<void>;
  readonly onAttemptFailure?: (error: unknown, job: Job) => void;
  /**
   * Run 101 addendum 08 (effect-mq guidance #5, `workers.md#failure-reporting`): the attempt callback the
   * guide's `onJobFailure` carries - the attempt number, the job's budget and whether it will be retried -
   * so a caller can report exhaustion instead of only naming each attempt.
   */
  readonly onAttemptOutcome?: (outcome: {
    readonly error: unknown;
    readonly job: Job;
    readonly attempt: number;
    readonly attemptsMax: number;
    readonly willRetry: boolean;
  }) => void;
  readonly killSwitchPollIntervalMs?: number;
  readonly cancellationPollIntervalMs?: number;
}): ReplayDispatchWorker {
  const layer = storeLayerForQueuePolicy({ stateRoot, policy });
  const pollMs = killSwitchPollIntervalMs ?? 1_000;
  const cancelPollMs = cancellationPollIntervalMs ?? 1_000;
  let stopped = false;
  let signalStop: () => void = () => undefined;
  const stopSignal = new Promise<void>((resolve) => {
    signalStop = resolve;
  });

  /**
   * Run 101 addendum 10 (Effect guidance D3/mq-6). Measured live: with the four planes at `queue` and their
   * queues idle, `/healthz` stopped answering while chat still worked - the claim loop re-read the kill-switch
   * document (a synchronous `readFileSync` + parse + validate) and the drain flag (a fresh `DatabaseSync`) on
   * every iteration, per concurrency slot, and the sidecar was burning a full core. Both reads are now cached
   * for one poll interval, which is the latency the operator already accepted for a control change.
   */
  const controlTtlMs = Math.max(1_000, pollMs);
  let controlCache: { atMs: number; killed: boolean; draining: boolean } | null = null;
  const readControl = () => {
    const now = Date.now();
    if (controlCache && now - controlCache.atMs < controlTtlMs) return controlCache;
    let killed = true;
    let draining = false;
    try {
      killed = killSwitchEngaged(readQueuePolicy({ stateRoot, shippedRoot }));
      if (!killed) draining = isQueueDraining({ stateRoot, queue: queueName });
    } catch {
      // No readable policy is not a reason to keep working.
      killed = true;
    }
    controlCache = { atMs: now, killed, draining };
    return controlCache;
  };

  const claimLoop = Effect.gen(function* () {
    const queue = yield* makeQueue(policy);
    while (!stopped) {
      const control = readControl();
      if (control.killed) {
        yield* Effect.sleep(Duration.millis(pollMs));
        continue;
      }
      /**
       * R9/§4.2: a draining queue stops claiming and lets in-flight work finish. The read is
       * conservative (`false` on any failure) so a control store this loop cannot read never
       * takes the queue down with it.
       */
      if (control.draining) {
        yield* Effect.sleep(Duration.millis(pollMs));
        continue;
      }
      yield* queue
        .take((job, info) => {
          const attempt = Effect.tryPromise({
            try: () => handler(job, { attempt: info.attempts }),
            catch: (error) => {
              onAttemptFailure?.(error, job);
              const outcome = {
                error,
                job,
                attempt: info.attempts,
                attemptsMax: policy.attempts,
                willRetry: info.attempts < policy.attempts,
              };
              if (onAttemptOutcome) onAttemptOutcome(outcome);
              else if (!outcome.willRetry) {
                /**
                 * Run 101 addendum 08: exhaustion is reported by name even when the caller passed no
                 * callback - the guide's `onJobFailure` is what makes a terminal failure visible instead
                 * of readable only from `effect_queue.last_failure`.
                 */
                console.error(
                  `[run101] ${queueName} job failed terminally:${String(info.id).slice(0, 48)} attempts=${
                    info.attempts
                  }/${policy.attempts} ${String(
                    (error as { message?: unknown })?.message ?? error,
                  ).slice(0, 160)}`,
                );
              }
              return error;
            },
          });
          /**
           * R5/§3.6: a cancel of a live job reaches `cancelled` and interrupts the handler at the
           * next lock boundary. The store has no cancellation signal of its own, so the watch
           * polls the row the operator wrote and `raceFirst` interrupts whichever side loses -
           * which is why the handler is never allowed to ack work the operator has stopped. A
           * cancelled watch wins the race with a *named* error rather than a silent void.
           */
          const watch = Effect.gen(function* () {
            for (;;) {
              yield* Effect.sleep(Duration.millis(cancelPollMs));
              const row = readQueueJobState({
                stateRoot,
                queue: queueName,
                jobId: String(info.id),
              });
              if (row?.state === "cancelled") {
                return yield* Effect.fail(new QueueJobCancelledError(String(info.id)));
              }
            }
          });
          /**
           * Run 101 addendum 06 (effect-mq guidance #3): a per-attempt timeout from the operator's catalogue,
           * between the handler's observed p99 and the lock expiration. The vendored guide: the timeout
           * "interrupts the handler cleanly ... consuming an attempt" (`retries-and-timeouts.md#timeouts`).
           * Without it a hung handler held its claim until the lock expired.
           */
          return Effect.raceFirst(
            Effect.timeout(attempt, Duration.millis(policy.attemptTimeoutMs)),
            watch,
          );
        })
        /**
         * Run 101 addendum 04 (Effect guidance D2): the vendored store re-raises
         * interrupt-only causes before turning anything else into a failed job
         * (`PersistedQueue.ts` `Cause.hasInterruptsOnly(cause) ? Effect.failCause(cause) : …`),
         * because an interrupt releases the claim without charging an attempt. Swallowing
         * every cause here hid cancellation from the fiber and charged the job a failure.
         */
        .pipe(
          Effect.catchCause((cause) =>
            Cause.hasInterruptsOnly(cause)
              ? Effect.failCause(cause as Cause.Cause<never>)
              : /**
                 * Run 101 addendum 10: a store failure must not become a tight retry. The previous `Effect.void`
                 * answered "handled" and the loop claimed again immediately - measured live as a silent core
                 * burn in the sidecar while its queue was empty. A short pause keeps the retry rate sane and
                 * leaves the event loop to the live path.
                 */
                Effect.sleep(Duration.millis(250)),
          ),
        );
    }
  }).pipe(Effect.provide(layer), Effect.scoped);

  const running = Effect.runPromise(
    Effect.gen(function* () {
      const fibers: Array<Fiber.Fiber<void, unknown>> = [];
      for (let index = 0; index < Math.max(1, policy.concurrency); index += 1) {
        fibers.push(yield* Effect.forkChild(claimLoop));
      }
      yield* Effect.promise(() => stopSignal);
      for (const fiber of fibers) {
        yield* Fiber.interrupt(fiber);
      }
    }),
  );

  return {
    async stop() {
      stopped = true;
      signalStop();
      await running.catch(() => undefined);
    },
  };
}

export function runLearnerDeriveWorker(options: LearnerDeriveWorkerOptions): ReplayDispatchWorker {
  return runClaimLoopWorker<LearnerDeriveJob>({
    stateRoot: options.stateRoot,
    shippedRoot: options.shippedRoot,
    policy: options.policy,
    queueName: LEARNER_DERIVE_QUEUE,
    makeQueue: makeLearnerDeriveQueue as never,
    handler: options.handler,
    onAttemptFailure: options.onAttemptFailure,
    onAttemptOutcome: options.onAttemptOutcome,
    killSwitchPollIntervalMs: options.killSwitchPollIntervalMs,
    cancellationPollIntervalMs: options.cancellationPollIntervalMs,
  });
}

export function runLearnerPromoteWorker(
  options: LearnerPromoteWorkerOptions,
): ReplayDispatchWorker {
  return runClaimLoopWorker<LearnerPromoteJob>({
    stateRoot: options.stateRoot,
    shippedRoot: options.shippedRoot,
    policy: options.policy,
    queueName: LEARNER_PROMOTE_QUEUE,
    makeQueue: makeLearnerPromoteQueue as never,
    handler: options.handler,
    onAttemptFailure: options.onAttemptFailure,
    onAttemptOutcome: options.onAttemptOutcome,
    killSwitchPollIntervalMs: options.killSwitchPollIntervalMs,
    cancellationPollIntervalMs: options.cancellationPollIntervalMs,
  });
}

/** Same claim-loop contract as the replay worker, for `evaluation.score`. */
export function runEvaluationScoreWorker(
  options: EvaluationScoreWorkerOptions,
): ReplayDispatchWorker {
  // One implementation for every queue: the evaluation loop used to be a second copy of the
  // replay loop, which is how a fix like the drain gate or the cancellation watch reaches one
  // plane and silently misses the other.
  return runClaimLoopWorker<EvaluationScoreJob>({
    stateRoot: options.stateRoot,
    shippedRoot: options.shippedRoot,
    policy: options.policy,
    queueName: EVALUATION_SCORE_QUEUE,
    makeQueue: makeEvaluationScoreQueue as never,
    handler: options.handler,
    onAttemptFailure: options.onAttemptFailure,
    onAttemptOutcome: options.onAttemptOutcome,
    killSwitchPollIntervalMs: options.killSwitchPollIntervalMs,
    cancellationPollIntervalMs: options.cancellationPollIntervalMs,
  });
}

/**
 * Starts the worker. It runs `policy.concurrency` claim loops, each of which
 * absorbs per-attempt failures so the store's attempt count and backoff drive
 * the retry rather than a hand-rolled budget.
 */
export function runReplayDispatchWorker(
  options: ReplayDispatchWorkerOptions,
): ReplayDispatchWorker {
  return runClaimLoopWorker<ReplayDispatchJob>({
    stateRoot: options.stateRoot,
    shippedRoot: options.shippedRoot,
    policy: options.policy,
    queueName: REPLAY_DISPATCH_QUEUE,
    makeQueue: makeReplayDispatchQueue as never,
    handler: options.handler,
    onAttemptFailure: options.onAttemptFailure,
    onAttemptOutcome: options.onAttemptOutcome,
    killSwitchPollIntervalMs: options.killSwitchPollIntervalMs,
    cancellationPollIntervalMs: options.cancellationPollIntervalMs,
  });
}
