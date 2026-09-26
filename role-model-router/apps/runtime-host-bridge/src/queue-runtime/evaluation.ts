/**
 * Run 101 / R5 - the evaluation plane's queue definition (host side).
 *
 * One job per unit of evaluation work, keyed on the durable id that origin
 * already has: the live-observation path keys on the comparison's `groupId`,
 * the replay handoff keys on the completed replay job's id. The evidence id
 * (`evaluation-replay-<replayJobId>`) stays what it always was - the queue id is
 * derived from it, so queue rows are reconstructible from evidence (R8).
 */
import { Duration, Effect, Schedule, Schema } from "effect";
import { PersistedQueue } from "effect/unstable/persistence";

import type { ResolvedQueuePolicy } from "./policy.js";

export const EVALUATION_SCORE_QUEUE = "evaluation.score";

export const EvaluationScoreJob = Schema.Struct({
  origin: Schema.String,
  groupId: Schema.NullOr(Schema.String),
  replayJobId: Schema.NullOr(Schema.String),
});
export type EvaluationScoreJob = Schema.Schema.Type<typeof EvaluationScoreJob>;

export function evaluationJobId({
  origin,
  groupId,
  replayJobId,
}: {
  readonly origin: string;
  readonly groupId?: string | null;
  readonly replayJobId?: string | null;
}): string {
  const key = groupId ?? replayJobId;
  if (!origin || !key) {
    throw new Error(
      "evaluation job id requires an origin and either a group id or a replay job id",
    );
  }
  return `evaluation:${origin}:${key}`;
}

/**
 * Run 101 addendum 03 - what one scoped resume attempt means for its queue job.
 *
 * Measured live on `stage-rc-7567799e7105` (`:3457`) with the evaluation plane on
 * `queue`: the first handoff the worker claimed answered all zeros with
 * `remaining: 0` - the sweep, or an earlier attempt, had already finalized it -
 * and the strict "made no progress is a failure" rule spent all four attempts and
 * left a permanent failure row for work that was already done.
 *
 * The queue row is the authority to *attempt*; the worker only reports whether
 * anything is left to do. `remaining > 0` with nothing progressed is the one
 * retryable case.
 */
export interface EvaluationResumeResult {
  readonly resumed: number;
  readonly completed: number;
  readonly failed: number;
  readonly outsideRetentionWindow: number;
  readonly remaining: number;
}

export type EvaluationAttemptOutcome = "progressed" | "retry" | "no-op";

export function evaluationAttemptOutcome(result: EvaluationResumeResult): EvaluationAttemptOutcome {
  const progressed =
    result.resumed + result.completed + result.failed + result.outsideRetentionWindow > 0;
  if (progressed) return "progressed";
  return result.remaining > 0 ? "retry" : "no-op";
}

export function makeEvaluationScoreQueue(policy: ResolvedQueuePolicy) {
  return PersistedQueue.make({
    name: EVALUATION_SCORE_QUEUE,
    schema: EvaluationScoreJob,
    maxAttempts: policy.attempts,
    retrySchedule: Schedule.min([
      Schedule.exponential(Duration.millis(policy.backoffBaseMs)),
      Schedule.spaced(Duration.millis(policy.backoffCapMs)),
    ]),
  });
}

/** Offers one unit of evaluation work; the store dedupes on the derived id. */
export function enqueueEvaluationScore({
  queue,
  job,
}: {
  readonly queue: {
    offer: (
      value: EvaluationScoreJob,
      options?: { readonly id: string | undefined },
    ) => Effect.Effect<unknown, unknown, never>;
  };
  readonly job: {
    readonly origin: string;
    readonly groupId?: string | null;
    readonly replayJobId?: string | null;
  };
}) {
  if (!job?.groupId && !job?.replayJobId) {
    return Effect.succeed({ enqueued: false as const, reason: "evaluation_key_required" });
  }
  const id = evaluationJobId({
    origin: job.origin,
    groupId: job.groupId,
    replayJobId: job.replayJobId,
  });
  return queue
    .offer(
      { origin: job.origin, groupId: job.groupId ?? null, replayJobId: job.replayJobId ?? null },
      { id },
    )
    .pipe(Effect.as({ enqueued: true as const, jobId: id }));
}
