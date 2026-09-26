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
  QUEUE_MODES,
  readQueuePolicy,
  resolveQueuePolicy,
  type QueueMode,
  type ResolvedQueuePolicy,
} from "./policy.js";
import {
  REPLAY_DISPATCH_QUEUE,
  enqueueReplayDispatch,
  makeReplayDispatchQueue,
  type ReplayDispatchJob,
} from "./queues.js";
import { storeLayerForQueuePolicy } from "./store.js";
import { runReplayDispatchWorker, type ReplayDispatchWorker } from "./workers.js";

export interface ReplayQueueRuntimeOptions {
  readonly stateRoot: string;
  /** Where the shipped policy lives when no state-root document exists yet. */
  readonly shippedRoot?: string;
  /** What a claimed replay job should do. Omitted means "shadow only": nothing claims. */
  readonly handler?: (job: ReplayDispatchJob, context: { readonly attempt: number }) => Promise<void>;
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
    const document = readQueuePolicy({ stateRoot: options.stateRoot, shippedRoot: options.shippedRoot });
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
