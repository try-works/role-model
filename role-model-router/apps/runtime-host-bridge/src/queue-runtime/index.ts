/**
 * Run 101 / R4 - the replay queue runtime as the host composes it.
 *
 * One call gives the host everything the queue needs: the offer the auto-replay
 * tick hands admitted captures to, and (when the plane is authoritative) the
 * worker that claims them. The plane's mode comes from the operator's policy
 * document, so switching `legacy` -> `shadow` -> `queue` is a policy write, and
 * a rollback is the same write in reverse.
 */
import { Effect } from "effect";

import {
  EVALUATION_SCORE_QUEUE,
  enqueueEvaluationScore,
  makeEvaluationScoreQueue,
} from "./evaluation.js";
import type { EvaluationScoreJob } from "./evaluation.js";
import {
  LEARNER_DERIVE_QUEUE,
  LEARNER_PROMOTE_QUEUE,
  enqueueLearnerDerive,
  enqueueLearnerPromote,
  makeLearnerDeriveQueue,
  makeLearnerPromoteQueue,
} from "./learner.js";
import type { LearnerDeriveJob, LearnerPromoteJob } from "./learner.js";
import {
  QUEUE_MODES,
  type QueueMode,
  type ResolvedQueuePolicy,
  readQueuePolicy,
  resolveQueuePolicy,
} from "./policy.js";
import {
  REPLAY_DISPATCH_QUEUE,
  type ReplayDispatchJob,
  enqueueReplayDispatch,
  makeReplayDispatchQueue,
} from "./queues.js";
import { storeLayerForQueuePolicy } from "./store.js";
import { type ReplayDispatchWorker, runReplayDispatchWorker } from "./workers.js";
import { runEvaluationScoreWorker } from "./workers.js";
import { runLearnerDeriveWorker, runLearnerPromoteWorker } from "./workers.js";

export interface ReplayQueueRuntimeOptions {
  readonly stateRoot: string;
  /** Where the shipped policy lives when no state-root document exists yet. */
  readonly shippedRoot?: string;
  /** What a claimed replay job should do. Omitted means "shadow only": nothing claims. */
  readonly handler?: (
    job: ReplayDispatchJob,
    context: { readonly attempt: number },
  ) => Promise<void>;
  readonly onAttemptFailure?: (error: unknown, job: ReplayDispatchJob) => void;
}

export interface ReplayQueueRuntime {
  readonly mode: QueueMode;
  readonly policy: ResolvedQueuePolicy;
  /** Undefined in `legacy`: the caller passes nothing to the tick. */
  readonly dispatchQueue?: {
    readonly mode: QueueMode;
    readonly offer: (job: {
      readonly captureRef: string;
      readonly endpointIds: readonly string[];
      readonly policySetDigest: string;
    }) => Promise<{ readonly enqueued: boolean; readonly reason?: string }>;
  };
  readonly worker?: ReplayDispatchWorker;
  stop(): Promise<void>;
}

/**
 * Composes the replay queue for a running host. A missing or invalid policy
 * document keeps the plane on `legacy`, which is the safety property the
 * cutover depends on: an unreadable policy must never silently make the queue
 * authoritative.
 */
export function startReplayQueueRuntime(options: ReplayQueueRuntimeOptions): ReplayQueueRuntime {
  let policy: ResolvedQueuePolicy;
  try {
    const document = readQueuePolicy({
      stateRoot: options.stateRoot,
      shippedRoot: options.shippedRoot,
    });
    policy = resolveQueuePolicy(document, { queue: REPLAY_DISPATCH_QUEUE });
  } catch (error) {
    console.error(
      `[run101] replay queue stays legacy: ${String(
        (error as { message?: unknown })?.message ?? error,
      ).slice(0, 200)}`,
    );
    return {
      mode: "legacy",
      policy: {
        queue: REPLAY_DISPATCH_QUEUE,
        mode: "legacy",
        concurrency: 1,
        attempts: 1,
        backoffBaseMs: 100,
        backoffCapMs: 1_000,
        lockRefreshMs: 30_000,
        lockExpirationMs: 900_000,
        retentionDays: 30,
        killSwitch: false,
        policyVersion: 0,
      },
      async stop() {
        // nothing running
      },
    };
  }

  const mode = QUEUE_MODES.includes(policy.mode) ? policy.mode : "legacy";
  if (mode === "legacy") {
    return {
      mode,
      policy,
      async stop() {
        // nothing running
      },
    };
  }

  const layer = storeLayerForQueuePolicy({ stateRoot: options.stateRoot, policy });
  const offer: ReplayQueueRuntime["dispatchQueue"] = {
    mode,
    async offer(job) {
      try {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const queue = yield* makeReplayDispatchQueue(policy);
            return yield* enqueueReplayDispatch({
              queue,
              capture: {
                captureRef: job.captureRef,
                endpointIds: [...job.endpointIds],
                policySetDigest: job.policySetDigest,
              },
            });
          }).pipe(Effect.provide(layer), Effect.scoped),
        );
      } catch (error) {
        return {
          enqueued: false,
          reason: `queue_offer_failed: ${String((error as { message?: unknown })?.message ?? error).slice(0, 160)}`,
        };
      }
    },
  };

  const worker =
    mode === "queue" && options.handler
      ? runReplayDispatchWorker({
          stateRoot: options.stateRoot,
          policy,
          handler: options.handler,
          onAttemptFailure: options.onAttemptFailure,
          shippedRoot: options.shippedRoot,
        })
      : undefined;

  return {
    mode,
    policy,
    dispatchQueue: offer,
    ...(worker ? { worker } : {}),
    async stop() {
      await worker?.stop();
    },
  };
}

export interface EvaluationQueueRuntimeOptions {
  readonly stateRoot: string;
  readonly shippedRoot?: string;
  /**
   * Runs one evaluation attempt for the job's unit of work. The handler owns
   * evidence-before-ack: it finalizes (and records) the comparison before
   * returning, and a throw leaves the job claimable.
   */
  readonly handler?: (
    job: EvaluationScoreJob,
    context: { readonly attempt: number },
  ) => Promise<void>;
  readonly onAttemptFailure?: (error: unknown, job: EvaluationScoreJob) => void;
}

export interface EvaluationQueueRuntime {
  readonly mode: QueueMode;
  readonly dispatchQueue?: {
    readonly mode: QueueMode;
    readonly offer: (job: {
      readonly origin: string;
      readonly groupId?: string | null;
      readonly replayJobId?: string | null;
    }) => Promise<{ readonly enqueued: boolean; readonly reason?: string }>;
  };
  readonly worker?: ReplayDispatchWorker;
  stop(): Promise<void>;
}

/**
 * Composes the evaluation queue for a running host. Same safety property as the
 * replay plane: an unreadable policy leaves the plane on `legacy`.
 */
export function startEvaluationQueueRuntime(
  options: EvaluationQueueRuntimeOptions,
): EvaluationQueueRuntime {
  let policy: ResolvedQueuePolicy;
  try {
    const document = readQueuePolicy({
      stateRoot: options.stateRoot,
      shippedRoot: options.shippedRoot,
    });
    policy = resolveQueuePolicy(document, { queue: EVALUATION_SCORE_QUEUE });
  } catch (error) {
    console.error(
      `[run101] evaluation queue stays legacy: ${String(
        (error as { message?: unknown })?.message ?? error,
      ).slice(0, 200)}`,
    );
    return { mode: "legacy", async stop() {} };
  }

  const mode = QUEUE_MODES.includes(policy.mode) ? policy.mode : "legacy";
  if (mode === "legacy") {
    return { mode, async stop() {} };
  }

  const layer = storeLayerForQueuePolicy({ stateRoot: options.stateRoot, policy });
  const dispatchQueue: EvaluationQueueRuntime["dispatchQueue"] = {
    mode,
    async offer(job) {
      try {
        return await Effect.runPromise(
          Effect.gen(function* () {
            const queue = yield* makeEvaluationScoreQueue(policy);
            return yield* enqueueEvaluationScore({ queue, job });
          }).pipe(Effect.provide(layer), Effect.scoped),
        );
      } catch (error) {
        return {
          enqueued: false,
          reason: `queue_offer_failed: ${String((error as { message?: unknown })?.message ?? error).slice(0, 160)}`,
        };
      }
    },
  };

  const worker =
    mode === "queue" && options.handler
      ? runEvaluationScoreWorker({
          stateRoot: options.stateRoot,
          policy,
          handler: options.handler,
          onAttemptFailure: options.onAttemptFailure,
          shippedRoot: options.shippedRoot,
        })
      : undefined;

  return {
    mode,
    dispatchQueue,
    ...(worker ? { worker } : {}),
    async stop() {
      await worker?.stop();
    },
  };
}

export interface LearnerQueueRuntimeOptions {
  readonly stateRoot: string;
  readonly shippedRoot?: string;
  /**
   * Runs one derivation for the job's group. A named skip is a throw, which is
   * what keeps the group claimable instead of consuming it.
   */
  readonly deriveHandler?: (
    job: LearnerDeriveJob,
    context: { readonly attempt: number },
  ) => Promise<void>;
  /** Promotes one candidate; serialized by the queue's concurrency. */
  readonly promoteHandler?: (
    job: LearnerPromoteJob,
    context: { readonly attempt: number },
  ) => Promise<void>;
  readonly onDeriveFailure?: (error: unknown, job: LearnerDeriveJob) => void;
  readonly onPromoteFailure?: (error: unknown, job: LearnerPromoteJob) => void;
}

export interface LearnerQueueRuntime {
  readonly kind: "learner.derive" | "learner.promote";
  readonly mode: QueueMode;
  readonly dispatchQueue?: {
    readonly mode: QueueMode;
    readonly offer: (job: {
      readonly groupId?: string;
      readonly candidateId?: string;
      readonly reason?: string | null;
    }) => Promise<{ readonly enqueued: boolean; readonly reason?: string }>;
  };
  readonly worker?: ReplayDispatchWorker;
  stop(): Promise<void>;
}

/**
 * Composes one learner queue. Both queues share the shape; the only difference
 * is which job they carry, so one starter covers them and the id rules stay in
 * `learner.ts`.
 */
export function startLearnerQueueRuntime({
  kind,
  options,
}: {
  readonly kind: "learner.derive" | "learner.promote";
  readonly options: LearnerQueueRuntimeOptions;
}): LearnerQueueRuntime {
  const queueName = kind === "learner.derive" ? LEARNER_DERIVE_QUEUE : LEARNER_PROMOTE_QUEUE;
  let policy: ResolvedQueuePolicy;
  try {
    const document = readQueuePolicy({
      stateRoot: options.stateRoot,
      shippedRoot: options.shippedRoot,
    });
    policy = resolveQueuePolicy(document, { queue: queueName });
  } catch (error) {
    console.error(
      `[run101] ${queueName} stays legacy: ${String(
        (error as { message?: unknown })?.message ?? error,
      ).slice(0, 200)}`,
    );
    return { kind, mode: "legacy", async stop() {} };
  }

  const mode = QUEUE_MODES.includes(policy.mode) ? policy.mode : "legacy";
  if (mode === "legacy") {
    return { kind, mode, async stop() {} };
  }

  const layer = storeLayerForQueuePolicy({ stateRoot: options.stateRoot, policy });
  const offer = async (job: {
    readonly groupId?: string;
    readonly candidateId?: string;
    readonly reason?: string | null;
  }) => {
    try {
      return await Effect.runPromise(
        Effect.gen(function* () {
          if (kind === "learner.derive") {
            const queue = yield* makeLearnerDeriveQueue(policy);
            return yield* enqueueLearnerDerive({
              queue,
              job: { groupId: String(job.groupId ?? ""), reason: job.reason ?? null },
            });
          }
          const queue = yield* makeLearnerPromoteQueue(policy);
          return yield* enqueueLearnerPromote({
            queue,
            job: {
              candidateId: String(job.candidateId ?? ""),
              groupId: job.groupId ?? null,
            },
          });
        }).pipe(Effect.provide(layer), Effect.scoped),
      );
    } catch (error) {
      return {
        enqueued: false,
        reason: `queue_offer_failed: ${String((error as { message?: unknown })?.message ?? error).slice(0, 160)}`,
      };
    }
  };

  const worker =
    mode === "queue"
      ? kind === "learner.derive" && options.deriveHandler
        ? runLearnerDeriveWorker({
            stateRoot: options.stateRoot,
            policy,
            handler: options.deriveHandler,
            onAttemptFailure: options.onDeriveFailure,
            shippedRoot: options.shippedRoot,
          })
        : kind === "learner.promote" && options.promoteHandler
          ? runLearnerPromoteWorker({
              stateRoot: options.stateRoot,
              policy,
              handler: options.promoteHandler,
              onAttemptFailure: options.onPromoteFailure,
              shippedRoot: options.shippedRoot,
            })
          : undefined
      : undefined;

  return {
    kind,
    mode,
    dispatchQueue: { mode, offer },
    ...(worker ? { worker } : {}),
    async stop() {
      await worker?.stop();
    },
  };
}
