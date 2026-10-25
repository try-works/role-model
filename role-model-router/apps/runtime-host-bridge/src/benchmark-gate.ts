import { Effect, Ref } from "effect";

/**
 * Run 115 S119 (R27): benchmark cancellation and overlap isolation.
 *
 * Two modes, both explicit:
 * - "cancel-previous": a new run cancels the active one; the cancelled run observes it through
 *   isCancelled and stops its own work.
 * - "reject-overlap": the second run is refused with the active run named, so a scheduled and a
 *   manual benchmark cannot both own the machine.
 */
export type BenchmarkOverlapMode = "cancel-previous" | "reject-overlap";

export type BenchmarkBeginResult =
  | { readonly ok: true; readonly runId: string }
  | { readonly ok: false; readonly reason: "busy"; readonly activeRunId: string };

export interface BenchmarkGateShape {
  readonly active: Effect.Effect<string | undefined>;
  readonly begin: (runId: string) => Effect.Effect<BenchmarkBeginResult>;
  readonly end: (runId: string) => Effect.Effect<void>;
  readonly isCancelled: (runId: string) => Effect.Effect<boolean>;
}

interface GateState {
  active: string | undefined;
  cancelled: ReadonlySet<string>;
}

export const makeBenchmarkGate = (options: {
  readonly mode: BenchmarkOverlapMode;
}): Effect.Effect<BenchmarkGateShape> =>
  Effect.gen(function* () {
    const state = yield* Ref.make<GateState>({ active: undefined, cancelled: new Set() });

    return {
      active: Effect.gen(function* () {
        const current = yield* Ref.get(state);
        return current.active;
      }),
      begin: (runId) =>
        Effect.gen(function* () {
          const current = yield* Ref.get(state);
          if (current.active !== undefined && current.active !== runId) {
            if (options.mode === "reject-overlap") {
              return { activeRunId: current.active, ok: false, reason: "busy" } as const;
            }
            const cancelled = new Set(current.cancelled);
            cancelled.add(current.active);
            yield* Ref.set(state, { active: runId, cancelled });
            return { ok: true, runId } as const;
          }
          const cancelled = new Set(current.cancelled);
          cancelled.delete(runId);
          yield* Ref.set(state, { active: runId, cancelled });
          return { ok: true, runId } as const;
        }),
      end: (runId) =>
        Effect.gen(function* () {
          const current = yield* Ref.get(state);
          if (current.active !== runId) return;
          yield* Ref.set(state, { active: undefined, cancelled: current.cancelled });
        }),
      isCancelled: (runId) =>
        Effect.gen(function* () {
          const current = yield* Ref.get(state);
          return current.cancelled.has(runId);
        }),
    };
  });
