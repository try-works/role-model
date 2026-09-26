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
import { Duration, Effect, Fiber } from "effect";

import { killSwitchEngaged, readQueuePolicy, type ResolvedQueuePolicy } from "./policy.js";
import { makeReplayDispatchQueue, type ReplayDispatchJob } from "./queues.js";
import { storeLayerForQueuePolicy } from "./store.js";

export interface ReplayDispatchWorkerOptions {
  readonly stateRoot: string;
  readonly policy: ResolvedQueuePolicy;
  /** Runs one attempt for one job; throwing makes the attempt retryable. */
  readonly handler: (job: ReplayDispatchJob, context: { readonly attempt: number }) => Promise<void>;
  /** Called after a failed attempt, before the store's backoff elapses. */
  readonly onAttemptFailure?: (error: unknown, job: ReplayDispatchJob) => void;
  /** Where the shipped policy lives when no state-root document exists yet. */
  readonly shippedRoot?: string;
  /** How often an engaged kill switch is re-checked. Defaults to 1 s. */
  readonly killSwitchPollIntervalMs?: number;
}

export interface ReplayDispatchWorker {
  /** Stops claiming; in-flight attempts are allowed to finish. */
  stop(): Promise<void>;
}

/**
 * Starts the worker. It runs `policy.concurrency` claim loops, each of which
 * absorbs per-attempt failures so the store's attempt count and backoff drive
 * the retry rather than a hand-rolled budget.
 */
export function runReplayDispatchWorker(options: ReplayDispatchWorkerOptions): ReplayDispatchWorker {
  const { stateRoot, policy, handler, onAttemptFailure } = options;
  const killSwitchPollIntervalMs = options.killSwitchPollIntervalMs ?? 1_000;
  const layer = storeLayerForQueuePolicy({ stateRoot, policy });
  let stopped = false;
  let signalStop: () => void = () => undefined;
  const stopSignal = new Promise<void>((resolve) => {
    signalStop = resolve;
  });

  const claimLoop = Effect.gen(function* () {
    const queue = yield* makeReplayDispatchQueue(policy);
    while (!stopped) {
      let killed = false;
      try {
        killed = killSwitchEngaged(readQueuePolicy({ stateRoot, shippedRoot: options.shippedRoot }));
      } catch {
        // A missing or invalid document is not a reason to keep working: the
        // safe reading of "no policy" is "do not claim".
        killed = true;
      }
      if (killed) {
        yield* Effect.sleep(Duration.millis(killSwitchPollIntervalMs));
        continue;
      }
      yield* queue
        .take((job, info) =>
          Effect.tryPromise({
            try: () => handler(job, { attempt: info.attempts }),
            catch: (error) => {
              onAttemptFailure?.(error, job);
              return error;
            },
          }),
        )
        // The failure is the store's retry signal; the loop must absorb it and
        // claim again rather than tearing the worker down.
        .pipe(Effect.catchCause(() => Effect.void));
    }
  }).pipe(Effect.provide(layer), Effect.scoped);

  const fiberPromise = Effect.runPromise(
    Effect.gen(function* () {
      // Forked one at a time on purpose: `Effect.forEach` closes its own scope
      // when it completes, which interrupts children forked inside it.
      // The loops surface a store error only when the store itself fails; each
      // attempt's own failure is absorbed inside `claimLoop`.
      const fibers: Array<Fiber.Fiber<void, unknown>> = [];
      for (let index = 0; index < Math.max(1, policy.concurrency); index += 1) {
        fibers.push(yield* Effect.forkChild(claimLoop));
      }
      // Park until `stop()` resolves rather than waiting on the children:
      // `awaitAllChildren` can return before a blocked `take` has claimed
      // anything, which would tear the loops down before they ever run.
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
      // Interrupting happens once the run body observes the signal, so awaiting
      // the run promise keeps `stop()` honest about teardown.
      await fiberPromise.catch(() => undefined);
    },
  };
}
