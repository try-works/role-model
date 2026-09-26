/**
 * Run 101 / R4 - the replay plane's queue definition and its enqueue gate.
 *
 * Identity is the capture: one job per `captureRef`, so a duplicate admission
 * cannot become a second job (the class the design names
 * `replay_capture_idempotency_conflict`). Retries come from the policy's
 * `attempts` plus an exponential backoff capped by `backoffCapMs`, which is what
 * replaces the hand-rolled deferral budget.
 *
 * The two enqueue-time invariants stay *here*, not in the queue: the caller
 * passes the admission decision it already made (budget reservation and
 * benchmark exclusion), and a refused capture is never offered.
 */
import { Duration, Effect, Schedule, Schema } from "effect";
import { PersistedQueue } from "effect/unstable/persistence";

import type { QueueName } from "./policy.js";

export const REPLAY_DISPATCH_QUEUE: QueueName = "replay.dispatch";

/** The job payload: what the dispatch executor needs, and nothing else. */
export const ReplayDispatchJob = Schema.Struct({
  captureRef: Schema.String,
  endpointIds: Schema.Array(Schema.String),
  policySetDigest: Schema.String,
});

export type ReplayDispatchJob = Schema.Schema.Type<typeof ReplayDispatchJob>;

export interface ReplayQueuePolicy {
  readonly attempts: number;
  readonly backoffBaseMs: number;
  readonly backoffCapMs: number;
}

/**
 * Exponential backoff capped by the policy. The vendored persisted queue reads
 * the attempt count from the store, so the delay is reproducible across
 * processes and restarts rather than living in one worker's memory.
 */
export function replayRetrySchedule({ backoffBaseMs, backoffCapMs }: ReplayQueuePolicy) {
  // The persisted queue replays the schedule from the stored attempt count, so
  // the delay is a function of the attempt number rather than of one worker's
  // uptime. `Schedule.min` takes the shorter of the exponential curve and the
  // policy's cap, which is the vendor's own default shape.
  return Schedule.min([
    Schedule.exponential(Duration.millis(backoffBaseMs)),
    Schedule.spaced(Duration.millis(backoffCapMs)),
  ]);
}

/** Builds the queue with the policy's attempt bound and retry schedule. */
export function makeReplayDispatchQueue(policy: ReplayQueuePolicy) {
  return PersistedQueue.make({
    name: REPLAY_DISPATCH_QUEUE,
    schema: ReplayDispatchJob,
    maxAttempts: policy.attempts,
    retrySchedule: replayRetrySchedule(policy),
  });
}

export interface AdmissionDecision {
  readonly accepted: boolean;
  readonly reason?: string;
}

export interface EnqueueReplayDispatchOptions {
  /**
   * The queue service, typed to the minimum this helper needs. The vendored
   * `offer` takes an optional `{ id }` whose property is required when the
   * options object is passed, so the shape is mirrored exactly rather than
   * loosened - a looser declaration is what fails assignability.
   */
  readonly queue: {
    offer: (
      value: ReplayDispatchJob,
      options?: { readonly id: string | undefined },
    ) => Effect.Effect<unknown, unknown, never>;
  };
  readonly capture: ReplayDispatchJob;
  readonly admission?: AdmissionDecision;
}

export type EnqueueReplayDispatchResult =
  | { readonly enqueued: true; readonly jobId: string }
  | { readonly enqueued: false; readonly reason: string };

/**
 * Offers one capture. The job id is the capture ref, so an identical offer is a
 * no-op for the store rather than a second job.
 */
export function enqueueReplayDispatch({
  queue,
  capture,
  admission,
}: EnqueueReplayDispatchOptions): Effect.Effect<EnqueueReplayDispatchResult, unknown> {
  if (admission && !admission.accepted) {
    return Effect.succeed({ enqueued: false as const, reason: admission.reason ?? "not_admitted" });
  }
  if (!capture.captureRef) {
    return Effect.succeed({ enqueued: false as const, reason: "capture_ref_required" });
  }
  return queue
    .offer(capture, { id: capture.captureRef })
    .pipe(Effect.as({ enqueued: true as const, jobId: capture.captureRef }));
}
