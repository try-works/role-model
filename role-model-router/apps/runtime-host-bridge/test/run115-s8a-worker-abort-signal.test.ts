/**
 * Run 115 S8a - the queue worker must hand the Effect AbortSignal to its handler (public, R26).
 *
 * The vendored fact: `Effect.tryPromise` passes an `AbortSignal` to a thunk that declares a
 * parameter (vendor/effect/packages/effect/src/internal/effect.ts:1166 sets `withSignal` from the
 * thunk arity, :1193 creates the controller, :1213-1216 aborts it in the async finalizer). This test
 * proves the claim loop forwards that signal into the handler, and that an attempt timeout really
 * aborts a handler whose promise settles only on its signal - not merely that the fiber failed.
 *
 * Pre-fix RED: the worker built the attempt as `try: () => handler(job, { attempt })`. A zero-arity
 * thunk makes Effect skip the controller entirely, so the recorded failure was the earlier
 * assertion `context.signal was undefined` (evidence/logs/s8a-red.log), not a missing abort event.
 * The later assertions exist so a regression that passes a never-aborting signal also fails.
 */
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Cause, Duration, Effect, Exit } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { QueueJobCancelledError, readQueueJobState } from "../src/queue-runtime/admin.js";
import { type ResolvedQueuePolicy, resolveQueuePolicy } from "../src/queue-runtime/policy.js";
import { makeReplayDispatchQueue } from "../src/queue-runtime/queues.js";
import { storeLayerForQueuePolicy } from "../src/queue-runtime/store.js";
import { runReplayDispatchWorker } from "../src/queue-runtime/workers.js";

const REPLAY_QUEUE = "replay.dispatch";
// The operator-document floor for attemptTimeoutMs is 5_000 (src/queue-runtime/policy.ts), but the
// worker consumes a resolved policy; this test passes a 250 ms resolved attempt bound so the
// cancellation proof stays fast while the state-root document remains a valid document for the
// claim loop's kill-switch read.
const ATTEMPT_TIMEOUT_MS = 250;

/** The shape a handler is expected to receive; kept local so the pre-fix RED is behavioural, not a type error. */
interface AttemptContext {
  readonly attempt: number;
  readonly signal?: AbortSignal;
}

function policyDocument() {
  return {
    schemaVersion: "role-model.queue-policy.v1",
    policyVersion: 1,
    global: { killSwitch: false },
    queues: {
      [REPLAY_QUEUE]: {
        mode: "queue",
        concurrency: 1,
        attempts: 2,
        backoffBaseMs: 100,
        backoffCapMs: 1_000,
        lockRefreshMs: 1_000,
        lockExpirationMs: 5_000,
        retentionDays: 30,
        // Operator-document floor; the test overrides the resolved bound to 250 ms below.
        attemptTimeoutMs: 5_000,
      },
    },
    updatedAt: null,
    receipts: [],
  };
}


/** The operator's cancel: the same row update the R5 cancel/drain suite applies. */
function cancelQueueRow(root: string, queue: string): void {
  const database = new DatabaseSync(path.join(root, "track-b", "queues", "queues.sqlite"));
  try {
    database.exec(
      `UPDATE effect_queue SET state = 'cancelled', acquired_at = NULL, acquired_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE queue_name = '${queue}'`,
    );
  } finally {
    database.close();
  }
}

let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run115-s8a-worker-signal-"));
});
afterEach(async () => {
  await rm(stateRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

describe("Run 115 S8a: queue worker forwards the Effect AbortSignal", () => {
  it("an attempt timeout aborts a handler that settles only on its signal", async () => {
    // SAFETY: policyDocument() mirrors role-model.queue-policy.v1, the shape resolveQueuePolicy
    // parses at this boundary; a wrong field would make the resolver reject the document below.
    const documentPolicy = resolveQueuePolicy(policyDocument() as never, { queue: REPLAY_QUEUE });
    const policy: ResolvedQueuePolicy = { ...documentPolicy, attemptTimeoutMs: ATTEMPT_TIMEOUT_MS };
    // The claim loop re-reads the operator's policy document from the state root; without it the
    // loop treats the plane as killed and never claims.
    await mkdir(path.join(stateRoot, "queues"), { recursive: true });
    await writeFile(
      path.join(stateRoot, "queues", "queue-policy.json"),
      JSON.stringify(policyDocument(), null, 2),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* makeReplayDispatchQueue(policy);
        yield* queue.offer(
          {
            captureRef: "req-s8a-abort",
            endpointIds: ["endpoint-a"],
            policySetDigest: "digest-s8a",
          },
          { id: "req-s8a-abort" },
        );
      }).pipe(
        Effect.provide(storeLayerForQueuePolicy({ stateRoot, policy })),
        Effect.scoped,
      ),
    );

    let entered = 0;
    let signalMissing = false;
    let abortObserved = false;
    let abortedWhenSettled = false;
    const failedAttempts: string[] = [];

    const worker = runReplayDispatchWorker({
      stateRoot,
      policy,
      // Keep the cancel watch out of the race: this test is about the attempt timeout only.
      cancellationPollIntervalMs: 10_000,
      handler: async (_job, context: AttemptContext) => {
        entered += 1;
        const signal = context.signal;
        if (!signal) {
          // Pre-fix path: no signal is supplied, so the handler can never be cancelled. It hangs;
          // the fiber timeout still fires, which is exactly the defect this test pins.
          signalMissing = true;
          return await new Promise<void>(() => undefined);
        }
        await new Promise<void>((resolve) => {
          if (signal.aborted) {
            resolve();
            return;
          }
          signal.addEventListener("abort", () => resolve(), { once: true });
        });
        abortObserved = true;
        abortedWhenSettled = signal.aborted;
        throw new Error("S8a attempt cancelled by its AbortSignal");
      },
      onAttemptFailure: (error) => {
        // The handler throws an Error; the fallback keeps a non-Error rejection readable.
        failedAttempts.push(error instanceof Error ? error.message : String(error));
      },
    });

    try {
      // One attempt timeout plus retry/backoff slack; the worker keeps running afterwards.
      await new Promise((resolve) => setTimeout(resolve, ATTEMPT_TIMEOUT_MS + 1_500));
    } finally {
      await worker.stop();
    }

    expect(entered, "the worker claimed the queued job and ran the handler").toBeGreaterThan(0);
    expect(
      signalMissing,
      "the handler must receive the Effect AbortSignal, but context.signal was undefined",
    ).toBe(false);
    expect(
      abortObserved,
      "the attempt timeout interrupted the fiber but the handler's AbortSignal never fired; " +
        "cancellation is not real",
    ).toBe(true);
    expect(abortedWhenSettled, "the handler settled only after its signal reported aborted").toBe(
      true,
    );
  }, 20_000);

  it("the cancel watch aborts a running handler's own signal when the operator cancels its row", async () => {
    // SAFETY: policyDocument() mirrors role-model.queue-policy.v1, the shape resolveQueuePolicy
    // parses at this boundary; a wrong field would make the resolver reject the document below.
    const documentPolicy = resolveQueuePolicy(policyDocument() as never, { queue: REPLAY_QUEUE });
    // The attempt timeout must not be what ends this attempt: the cancel watch has to win.
    const policy: ResolvedQueuePolicy = { ...documentPolicy, attemptTimeoutMs: 60_000 };
    await mkdir(path.join(stateRoot, "queues"), { recursive: true });
    await writeFile(
      path.join(stateRoot, "queues", "queue-policy.json"),
      JSON.stringify(policyDocument(), null, 2),
    );
    await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* makeReplayDispatchQueue(policy);
        yield* queue.offer(
          {
            captureRef: "req-s8a-cancel-watch",
            endpointIds: ["endpoint-a"],
            policySetDigest: "digest-s8a",
          },
          { id: "req-s8a-cancel-watch" },
        );
      }).pipe(
        Effect.provide(storeLayerForQueuePolicy({ stateRoot, policy })),
        Effect.scoped,
      ),
    );

    let markEntered: () => void = () => undefined;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    let abortObserved = false;
    const worker = runReplayDispatchWorker({
      stateRoot,
      policy,
      killSwitchPollIntervalMs: 50,
      cancellationPollIntervalMs: 25,
      handler: async (_job, context: AttemptContext) => {
        markEntered();
        const signal = context.signal;
        if (!signal) {
          // No signal means the watch can only interrupt the fiber; the wait below then times out
          // and the assertion names the missing cancellation instead of a generic test timeout.
          return await new Promise<void>(() => undefined);
        }
        await new Promise<void>((resolve) => {
          if (signal.aborted) {
            resolve();
            return;
          }
          signal.addEventListener("abort", () => resolve(), { once: true });
        });
        abortObserved = true;
      },
    });
    try {
      await entered;
      cancelQueueRow(stateRoot, REPLAY_QUEUE);
      const deadline = Date.now() + 3_000;
      while (!abortObserved && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      expect(abortObserved, "the cancel watch must abort the running handler's signal").toBe(true);
      expect(
        readQueueJobState({ stateRoot, queue: REPLAY_QUEUE, jobId: "req-s8a-cancel-watch" })?.state,
        "the operator's terminal state is preserved",
      ).toBe("cancelled");
    } finally {
      await worker.stop();
    }
  }, 20_000);

  it("a cancelled attempt ends with the named QueueJobCancelledError, not only a fiber interrupt", async () => {
    // SAFETY: policyDocument() mirrors role-model.queue-policy.v1, the shape resolveQueuePolicy
    // parses at this boundary; a wrong field would make the resolver reject the document below.
    const documentPolicy = resolveQueuePolicy(policyDocument() as never, { queue: REPLAY_QUEUE });
    const policy: ResolvedQueuePolicy = { ...documentPolicy, attemptTimeoutMs: 60_000 };
    await mkdir(path.join(stateRoot, "queues"), { recursive: true });
    await writeFile(
      path.join(stateRoot, "queues", "queue-policy.json"),
      JSON.stringify(policyDocument(), null, 2),
    );

    let markEntered: () => void = () => undefined;
    const entered = new Promise<void>((resolve) => {
      markEntered = resolve;
    });
    let handlerAborted = false;
    // The claim loop's own composition: the handler attempt raced against the cancel watch under
    // the catalogue's attempt timeout (src/queue-runtime/workers.ts). The NAMED error is only
    // observable at this boundary: the worker's catchCause deliberately swallows a non-interrupt
    // cause (it sleeps and claims again), and the operator's cancel nulls acquired_by, so the
    // store's failed/retry UPDATE matches no row and records no last_failure. The test therefore
    // proves the class and message here rather than claiming a row-side readback it cannot make.
    const takeExit = Effect.runPromise(
      Effect.exit(
        Effect.gen(function* () {
          const queue = yield* makeReplayDispatchQueue(policy);
          yield* queue.offer(
            {
              captureRef: "req-s8a-cancel-named",
              endpointIds: ["endpoint-a"],
              policySetDigest: "digest-s8a",
            },
            { id: "req-s8a-cancel-named" },
          );
          return yield* queue.take((_job, info) => {
            const attempt = Effect.tryPromise({
              try: (signal) =>
                new Promise<void>((resolve) => {
                  markEntered();
                  if (signal.aborted) {
                    resolve();
                    return;
                  }
                  signal.addEventListener(
                    "abort",
                    () => {
                      handlerAborted = true;
                      resolve();
                    },
                    { once: true },
                  );
                }),
              catch: (error) => error,
            });
            const watch = Effect.gen(function* () {
              for (;;) {
                yield* Effect.sleep(Duration.millis(25));
                const row = readQueueJobState({
                  stateRoot,
                  queue: REPLAY_QUEUE,
                  jobId: String(info.id),
                });
                if (row?.state === "cancelled") {
                  return yield* Effect.fail(new QueueJobCancelledError(String(info.id)));
                }
              }
            });
            return Effect.raceFirst(
              Effect.timeout(attempt, Duration.millis(policy.attemptTimeoutMs)),
              watch,
            );
          });
        }).pipe(
          Effect.provide(storeLayerForQueuePolicy({ stateRoot, policy })),
          Effect.scoped,
        ),
      ),
    );

    await entered;
    cancelQueueRow(stateRoot, REPLAY_QUEUE);
    const exit = await takeExit;
    expect(Exit.isFailure(exit), "the cancelled take fails rather than completing").toBe(true);
    if (Exit.isFailure(exit)) {
      expect(
        Cause.hasInterruptsOnly(exit.cause),
        "a named cancellation is a failure cause, not a bare interrupt",
      ).toBe(false);
      const failure = Cause.findErrorOption(exit.cause);
      expect(failure._tag, "the failure channel carries the named cancellation").toBe("Some");
      if (failure._tag === "Some") {
        expect(failure.value).toBeInstanceOf(QueueJobCancelledError);
        if (failure.value instanceof QueueJobCancelledError) {
          expect(failure.value.message).toMatch(
            /queue job was cancelled by an operator: req-s8a-cancel-named/,
          );
        }
      }
    }
    expect(handlerAborted, "the watch aborted the handler's signal as it won the race").toBe(true);
  }, 20_000);
});
