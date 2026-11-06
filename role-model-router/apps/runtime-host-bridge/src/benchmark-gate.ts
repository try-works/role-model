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
export class BenchmarkBusyError extends Error {
  readonly code = "BENCHMARK_BUSY";
  readonly activeRunId: string;
  constructor(activeRunId: string) {
    super(`benchmark already running: ${activeRunId}`);
    this.name = "BenchmarkBusyError";
    this.activeRunId = activeRunId;
  }
}

export class BenchmarkCancelledError extends Error {
  readonly code = "BENCHMARK_CANCELLED";
  readonly runId: string;
  constructor(runId: string) {
    super(`benchmark cancelled: ${runId}`);
    this.name = "BenchmarkCancelledError";
    this.runId = runId;
  }
}

export type BenchmarkGateBegin =
  | {
      readonly ok: true;
      readonly runId: string;
      readonly signal: AbortSignal;
      readonly finish: () => void;
    }
  | { readonly ok: false; readonly reason: "busy"; readonly activeRunId: string };

export interface BenchmarkGateServiceContract {
  readonly brand: "dso-benchmark-gate";
  readonly begin: (runId: string) => BenchmarkGateBegin;
  readonly cancel: (reason?: string) => boolean;
  readonly running: () => boolean;
}

export const makeBenchmarkGateOwner = (options: {
  readonly mode: BenchmarkOverlapMode;
}): BenchmarkGateServiceContract => {
  const inner = Effect.runSync(makeBenchmarkGate(options));
  let activeRunId: string | undefined;
  let controller: AbortController | null = null;
  const finish = (runId: string): void => {
    if (activeRunId === runId) {
      activeRunId = undefined;
      controller = null;
      Effect.runSync(inner.end(runId));
    }
  };
  return {
    begin: (runId) => {
      const result = Effect.runSync(inner.begin(runId));
      if (!result.ok) return result;
      activeRunId = runId;
      controller = new AbortController();
      const ctrl = controller;
      return { finish: () => finish(runId), ok: true, runId, signal: ctrl.signal };
    },
    brand: "dso-benchmark-gate",
    cancel: (reason?: string) => {
      if (activeRunId === undefined || controller === null) return false;
      const runId = activeRunId;
      activeRunId = undefined;
      controller.abort(reason);
      controller = null;
      Effect.runSync(inner.end(runId));
      return true;
    },
    running: () => activeRunId !== undefined,
  };
};

export type BenchmarkOverlapMode = "cancel-previous" | "reject-overlap";

export type BenchmarkBeginResult =
  | { readonly ok: true; readonly runId: string }
  | { readonly ok: false; readonly reason: "busy"; readonly activeRunId: string };

export interface BenchmarkGate {
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
}): Effect.Effect<BenchmarkGate> =>
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
