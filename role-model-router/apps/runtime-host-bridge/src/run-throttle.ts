import { Effect, Ref } from "effect";

/**
 * Run 115 S118 (R27): per-run throttle isolation.
 *
 * R27 requires each run to own its throttle. A saturated evaluation run must not block a
 * benchmark run, and finishing a run must release its permits so the next run is not starved.
 *
 * Effect exposes no reader for Semaphore held counts, so this module tracks active/waiting per
 * run explicitly - the snapshot is honest rather than approximate.
 */
export interface RunThrottleSnapshot {
  readonly active: number;
  readonly waiting: number;
}

export interface RunThrottleShape {
  readonly finish: (runId: string) => Effect.Effect<void>;
  readonly give: (runId: string) => Effect.Effect<void>;
  readonly snapshot: (runId: string) => Effect.Effect<RunThrottleSnapshot>;
  readonly take: (runId: string) => Effect.Effect<boolean>;
}

interface RunState {
  active: number;
  waiting: number;
}

export const makeRunThrottle = (options: {
  readonly maxConcurrentPerRun: number;
}): Effect.Effect<RunThrottleShape, Error> =>
  Effect.gen(function* () {
    if (!Number.isInteger(options.maxConcurrentPerRun) || options.maxConcurrentPerRun < 1) {
      return yield* Effect.fail(new Error("maxConcurrentPerRun must be a positive integer"));
    }
    const runs = yield* Ref.make(new Map<string, RunState>());

    return {
      finish: (runId) =>
        Effect.gen(function* () {
          yield* Ref.update(runs, (map) => {
            if (!map.has(runId)) return map;
            const next = new Map(map);
            next.delete(runId);
            return next;
          });
        }),
      give: (runId) =>
        Effect.gen(function* () {
          yield* Ref.update(runs, (map) => {
            const next = new Map(map);
            const state = next.get(runId) ?? { active: 0, waiting: 0 };
            next.set(runId, { active: Math.max(0, state.active - 1), waiting: state.waiting });
            return next;
          });
        }),
      snapshot: (runId) =>
        Effect.gen(function* () {
          const current = yield* Ref.get(runs);
          const state = current.get(runId);
          return state === undefined
            ? { active: 0, waiting: 0 }
            : { active: state.active, waiting: state.waiting };
        }),
      take: (runId) =>
        Effect.gen(function* () {
          let taken = false;
          while (taken === false) {
            const current = yield* Ref.get(runs);
            const state = current.get(runId) ?? { active: 0, waiting: 0 };
            if (state.active < options.maxConcurrentPerRun) {
              yield* Ref.update(runs, (map) => {
                const next = new Map(map);
                next.set(runId, { active: state.active + 1, waiting: state.waiting });
                return next;
              });
              taken = true;
            } else {
              yield* Ref.update(runs, (map) => {
                const next = new Map(map);
                next.set(runId, { active: state.active, waiting: state.waiting + 1 });
                return next;
              });
              yield* Effect.sleep("10 millis");
            }
          }
          return true;
        }),
    };
  });
