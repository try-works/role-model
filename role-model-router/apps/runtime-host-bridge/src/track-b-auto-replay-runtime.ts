import {
  type AutoReplayCapture,
  type AutoReplayExecution,
  type AutoReplayTickResult,
  runAutoReplayTick,
} from "./track-b-auto-replay.js";
import type { ReplayLedger } from "./track-b-replay-ledger.js";
import type { ReplayPolicySet, ReplayToolPolicy } from "./track-b-replay-policy.js";

/**
 * Run 97 automatic replay loop.
 *
 * Runs the bounded auto-replay tick against the private operations boundary on an
 * interval: read pending captures, replay them through the supplied executor, and
 * write every disposition back. Ticks never overlap, failures degrade instead of
 * crashing the runtime, and the loop reports bounded health counters.
 */

export interface AutoReplayOperations {
  listPendingReplayCaptures(input: {
    readonly policySetDigest: string;
    readonly limit?: number;
  }): Promise<unknown>;
  recordReplayDisposition(input: Record<string, unknown>): Promise<unknown>;
}

export interface AutoReplayLoopHealth {
  readonly ticks: number;
  readonly running: boolean;
  readonly paused: boolean;
  readonly lastOutcome: "idle" | "ok" | "degraded";
  readonly lastError: string | null;
  readonly lastProcessedAtMs: number | null;
}

export interface AutoReplayLoopStatus extends AutoReplayLoopHealth {
  readonly budget: {
    readonly window: string;
    readonly counterfactuals: number;
    readonly reservedCounterfactuals: number;
    readonly reservedDispatches: number;
    readonly dispatches: number;
    readonly counterfactualLimit: number;
    readonly dispatchLimit: number;
  };
  readonly lastDispositions: number;
}

const emptyResult = (): AutoReplayTickResult => ({
  processed: 0,
  replayed: 0,
  refused: 0,
  deferred: 0,
  dispositions: [],
  cursor: null,
});

export function startAutoReplayLoop(input: {
  readonly operations: AutoReplayOperations;
  readonly ledger: ReplayLedger;
  readonly policySet: ReplayPolicySet;
  readonly configuredEndpointIds: readonly string[];
  readonly healthyEndpointIds?: readonly string[];
  readonly executor: (input: {
    readonly capture: AutoReplayCapture;
    readonly candidates: readonly string[];
    readonly toolPolicy: ReplayToolPolicy;
    readonly policySet: ReplayPolicySet;
    readonly reservationId: string;
  }) => Promise<AutoReplayExecution>;
  readonly intervalMs?: number;
  readonly maxCapturesPerTick?: number;
  readonly now?: () => number;
  readonly setIntervalFn?: (handler: () => void, timeout: number) => unknown;
  readonly clearIntervalFn?: (handle: unknown) => void;
}): {
  tick(): Promise<AutoReplayTickResult & { readonly skipped?: boolean }>;
  stop(): void;
  pause(): void;
  resume(): void;
  health(): AutoReplayLoopHealth;
  status(): AutoReplayLoopStatus;
} {
  const now = input.now ?? (() => Date.now());
  const maxCapturesPerTick = input.maxCapturesPerTick ?? 8;
  let running = false;
  let ticks = 0;
  let lastOutcome: AutoReplayLoopHealth["lastOutcome"] = "idle";
  let lastError: string | null = null;
  let lastProcessedAtMs: number | null = null;
  let paused = false;
  let lastDispositions = 0;
  let timer: unknown = null;

  const pendingRefs = (value: unknown): readonly string[] => {
    const record =
      value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
    const list = Array.isArray(value)
      ? value
      : Array.isArray(record?.pending)
        ? record.pending
        : [];
    return list
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .map((item) => item.trim());
  };

  const tick = async (): Promise<AutoReplayTickResult & { readonly skipped?: boolean }> => {
    if (running || paused) return { ...emptyResult(), skipped: true };
    running = true;
    try {
      const pending = await input.operations.listPendingReplayCaptures({
        policySetDigest: input.policySet.policySetDigest,
        limit: maxCapturesPerTick * 4,
      });
      const captures: AutoReplayCapture[] = pendingRefs(pending).map((captureRef) => ({
        captureRef,
        sourceEndpointId: null,
        hasRecordedToolResults: true,
      }));
      const result = await runAutoReplayTick({
        captures,
        configuredEndpointIds: input.configuredEndpointIds,
        ...(input.healthyEndpointIds ? { healthyEndpointIds: input.healthyEndpointIds } : {}),
        ledger: input.ledger,
        policySet: input.policySet,
        executor: input.executor,
        maxCapturesPerTick,
      });
      const window = input.ledger.status().window;
      for (const disposition of result.dispositions) {
        await input.operations.recordReplayDisposition({
          captureRef: disposition.captureRef,
          policySetDigest: input.policySet.policySetDigest,
          outcome: disposition.outcome,
          refusalCode: disposition.code ?? null,
          detail: disposition.detail ?? null,
          branches: disposition.branches ?? null,
          window,
        });
      }
      lastOutcome = "ok";
      lastError = null;
      lastProcessedAtMs = now();
      lastDispositions = result.dispositions.length;
      return result;
    } catch (error) {
      lastOutcome = "degraded";
      lastError = error instanceof Error ? error.message.slice(0, 300) : "auto replay tick failed";
      return emptyResult();
    } finally {
      ticks += 1;
      running = false;
    }
  };

  const intervalMs = input.intervalMs ?? 0;
  if (intervalMs > 0) {
    const setIntervalFn =
      input.setIntervalFn ??
      ((handler: () => void, timeout: number) => setInterval(handler, timeout));
    timer = setIntervalFn(() => {
      void tick();
    }, intervalMs);
    if (timer && typeof (timer as { unref?: () => void }).unref === "function") {
      (timer as { unref: () => void }).unref();
    }
  }

  return {
    tick,
    stop() {
      if (timer) {
        const clearIntervalFn =
          input.clearIntervalFn ?? ((handle: unknown) => clearInterval(handle as NodeJS.Timeout));
        clearIntervalFn(timer);
        timer = null;
      }
      running = false;
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
    },
    health() {
      return { ticks, running, paused, lastOutcome, lastError, lastProcessedAtMs };
    },
    status() {
      return {
        ...{ ticks, running, paused, lastOutcome, lastError, lastProcessedAtMs },
        budget: { ...input.ledger.status() },
        lastDispositions,
      };
    },
  };
}
