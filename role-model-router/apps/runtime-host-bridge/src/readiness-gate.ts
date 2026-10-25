import { Deferred, Effect, Ref } from "effect";

/**
 * Run 115 S116 (R27): early readiness.
 *
 * R27 requires the host to report ready as soon as the REQUIRED bootstrap stages are terminal,
 * without waiting for advisory stages (peers, remote health) that may take much longer, and to
 * report failure - not hang - when a required stage fails.
 *
 * The "advisory degraded" rule matches summarizeSessionBootstrapStatus: a degraded stage in
 * SESSION_BOOTSTRAP_ADVISORY_DEGRADED_STAGE_IDS counts as satisfied, any other degraded stage
 * does not.
 */
const ADVISORY_DEGRADED_STAGES = new Set(["peers"]);

export type ReadinessStageId =
  | "credentials"
  | "endpoints"
  | "peers"
  | "vendors"
  | "local-reload"
  | "remote-health"
  | "inventory";

export type ReadinessStageStatus = "pending" | "running" | "ready" | "degraded" | "failed" | "skipped";

export interface ReadinessOutcome {
  readonly ready: boolean;
  readonly failed: readonly ReadinessStageId[];
  readonly stages: readonly ReadinessStageId[];
}

export interface ReadinessGateShape {
  readonly awaitReady: Effect.Effect<ReadinessOutcome>;
  readonly mark: (stage: ReadinessStageId, status: ReadinessStageStatus) => Effect.Effect<void>;
  readonly snapshot: Effect.Effect<ReadinessOutcome>;
}

export const makeReadinessGate = (options: {
  readonly required: readonly ReadinessStageId[];
}): Effect.Effect<ReadinessGateShape> =>
  Effect.gen(function* () {
    const statuses = yield* Ref.make(new Map<ReadinessStageId, ReadinessStageStatus>());
    const settled = yield* Deferred.make<ReadinessOutcome>();

    const satisfied = (stage: ReadinessStageId, status: ReadinessStageStatus): boolean =>
      status === "ready" ||
      status === "skipped" ||
      (status === "degraded" && ADVISORY_DEGRADED_STAGES.has(stage));

    const evaluate = (current: Map<ReadinessStageId, ReadinessStageStatus>): ReadinessOutcome => {
      const failed = options.required.filter((stage) => current.get(stage) === "failed");
      if (failed.length > 0) {
        return { failed, ready: false, stages: [...current.keys()] };
      }
      const allSatisfied = options.required.every((stage) => {
        const status = current.get(stage);
        return status !== undefined && satisfied(stage, status);
      });
      return { failed: [], ready: allSatisfied, stages: [...current.keys()] };
    };

    const mark = (stage: ReadinessStageId, status: ReadinessStageStatus) =>
      Effect.gen(function* () {
        const current = yield* Ref.updateAndGet(statuses, (map) => {
          const next = new Map(map);
          next.set(stage, status);
          return next;
        });
        const outcome = evaluate(current);
        // Settle exactly once: the FIRST required-stage failure or the moment every required
        // stage is satisfied. Advisory stages arriving later must not reopen the gate.
        if (outcome.ready || outcome.failed.length > 0) {
          yield* Deferred.succeed(settled, outcome);
          return;
        }
      });

    return {
      awaitReady: Deferred.await(settled),
      mark,
      snapshot: Effect.gen(function* () {
        const current = yield* Ref.get(statuses);
        return evaluate(current);
      }),
    };
  });
