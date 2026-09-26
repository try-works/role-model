/**
 * Run 101 / R6 - the learner plane's queues.
 *
 * `learner.derive` is one job per finalized comparison group and
 * `learner.promote` is one job per candidate. This is what removes the
 * measured defect: the learner's progress used to be a per-process
 * `attemptedGroupIds` set, so a *skip* consumed the group for the life of the
 * process and a restart walked the whole backlog again. With a durable job, a
 * skip is simply a failed attempt: the group stays claimable and is retried
 * under the policy's attempt bound, and promotion is serialized by the queue's
 * concurrency rather than by convention.
 *
 * Tier note (recorded plan deviation): the plan's D2 chose effect-mq for this
 * plane. effect-mq ships Postgres and Redis `JobStore` drivers, not SQLite, and
 * the local-first runtime needs the store on its own state root - so the
 * learner queues use the same durable `PersistedQueue` store as the replay and
 * evaluation planes. R6's contract (durable progress, claimable skips,
 * serialized promotion) is what is delivered; the effect-mq migration is a
 * driver workstream, recorded as an addendum candidate.
 */
import { Duration, Effect, Schedule, Schema } from "effect";
import { PersistedQueue } from "effect/unstable/persistence";

import type { ResolvedQueuePolicy } from "./policy.js";

export const LEARNER_DERIVE_QUEUE = "learner.derive";
export const LEARNER_PROMOTE_QUEUE = "learner.promote";

export const LearnerDeriveJob = Schema.Struct({
  groupId: Schema.String,
  /** Why the group is being derived, for the operator readback. */
  reason: Schema.NullOr(Schema.String),
});
export type LearnerDeriveJob = Schema.Schema.Type<typeof LearnerDeriveJob>;

export const LearnerPromoteJob = Schema.Struct({
  candidateId: Schema.String,
  groupId: Schema.NullOr(Schema.String),
});
export type LearnerPromoteJob = Schema.Schema.Type<typeof LearnerPromoteJob>;

export function deriveJobId({ groupId }: { readonly groupId: string }): string {
  if (!groupId) throw new Error("learner derivation requires a group id");
  return `learner.derive:${groupId}`;
}

export function promoteJobId({ candidateId }: { readonly candidateId: string }): string {
  if (!candidateId) throw new Error("learner promotion requires a candidate id");
  return `learner.promote:${candidateId}`;
}

function retrySchedule(policy: ResolvedQueuePolicy) {
  return Schedule.min([
    Schedule.exponential(Duration.millis(policy.backoffBaseMs)),
    Schedule.spaced(Duration.millis(policy.backoffCapMs)),
  ]);
}

export function makeLearnerDeriveQueue(policy: ResolvedQueuePolicy) {
  return PersistedQueue.make({
    name: LEARNER_DERIVE_QUEUE,
    schema: LearnerDeriveJob,
    maxAttempts: policy.attempts,
    retrySchedule: retrySchedule(policy),
  });
}

export function makeLearnerPromoteQueue(policy: ResolvedQueuePolicy) {
  return PersistedQueue.make({
    name: LEARNER_PROMOTE_QUEUE,
    schema: LearnerPromoteJob,
    maxAttempts: policy.attempts,
    retrySchedule: retrySchedule(policy),
  });
}

export function enqueueLearnerDerive({
  queue,
  job,
}: {
  readonly queue: {
    offer: (
      value: LearnerDeriveJob,
      options?: { readonly id: string | undefined },
    ) => Effect.Effect<unknown, unknown, never>;
  };
  readonly job: { readonly groupId: string; readonly reason?: string | null };
}) {
  if (!job?.groupId) return Effect.succeed({ enqueued: false as const, reason: "group_id_required" });
  const id = deriveJobId({ groupId: job.groupId });
  return queue
    .offer({ groupId: job.groupId, reason: job.reason ?? null }, { id })
    .pipe(Effect.as({ enqueued: true as const, jobId: id }));
}

export function enqueueLearnerPromote({
  queue,
  job,
}: {
  readonly queue: {
    offer: (
      value: LearnerPromoteJob,
      options?: { readonly id: string | undefined },
    ) => Effect.Effect<unknown, unknown, never>;
  };
  readonly job: { readonly candidateId: string; readonly groupId?: string | null };
}) {
  if (!job?.candidateId) {
    return Effect.succeed({ enqueued: false as const, reason: "candidate_id_required" });
  }
  const id = promoteJobId({ candidateId: job.candidateId });
  return queue
    .offer({ candidateId: job.candidateId, groupId: job.groupId ?? null }, { id })
    .pipe(Effect.as({ enqueued: true as const, jobId: id }));
}
