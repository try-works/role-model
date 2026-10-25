import { Cause, Effect, Exit } from "effect";

import type {
  LocalDiagnosticLevel,
  LocalDiagnosticRecord,
  LocalDiagnosticsLoss,
  LocalDiagnosticsSource,
} from "./local-diagnostics-read.js";

/**
 * Run 115 S10a (R20 first slice): the bounded module-health record writer.
 *
 * It turns a Cause (or a plain error) into the four-scalar records the diagnostics reader
 * consumes (role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts:35-41:
 * atMs, level, code, count) with an explicit ring buffer and loss counter. It is an observer:
 * Fail/Die/Interrupt stay distinguishable in the code, and the observed Cause is never replaced,
 * wrapped or consumed. It never throws, never recurses and never reads error messages (redaction:
 * no message text, no fiber dump).
 *
 * Cause API used (vendor/effect/packages/effect/src/Cause.ts): Cause.reasons (:79-82),
 * isFailReason/:178, isDieReason/:205, isInterruptReason/:232 (classification is by reason kind,
 * never by reading the error/defect value), Cause.isCause/:100, TypeId/:33.
 * Effect-side: Effect.onExit/:7269, Effect.sync/:1215, Exit.isFailure (Exit.ts:435).
 */

export const MODULE_HEALTH_DEFAULT_CAPACITY = 64;
export const MODULE_HEALTH_MAX_CAPACITY = 256;
export const MODULE_HEALTH_DEFAULT_MAX_CODE_BYTES = 96;
export const MODULE_HEALTH_MAX_CODE_BYTES = 512;
const MAX_REASONS_PER_CAUSE = 8;

export interface ModuleHealthWriterConfig {
  /** Ring-buffer capacity; values outside 1..256 fall back to the default (64). */
  readonly capacity?: number;
  /** Identity handed to the diagnostics read path. */
  readonly instanceId?: string;
  readonly buildId?: string;
  /** Clock seam for tests. */
  readonly now?: () => number;
  /** Byte cap for the record's bounded code. */
  readonly maxCodeBytes?: number;
  /** Test/observability seam; a throw here is an outage, never a caller failure. */
  readonly onRecord?: (record: LocalDiagnosticRecord) => void;
}

export interface ModuleHealthWriter {
  /** Observes a Cause. Never throws, never replaces the Cause. */
  readonly recordCause: (cause: Cause.Cause<unknown>) => void;
  /** Observes a plain error. Never throws, never reads the error's properties. */
  readonly recordError: (error: unknown) => void;
  /** The single report edge: records the final Exit of a program and returns it unchanged. */
  readonly observe: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>;
  /** Bounded records, newest first. */
  readonly records: () => ReadonlyArray<LocalDiagnosticRecord>;
  readonly loss: () => LocalDiagnosticsLoss;
  /** Count of writer-internal failures (a throwing reporter, a hostile Cause, a bad clock). */
  readonly outages: () => number;
  /** Adapter for the diagnostics read path's LocalDiagnosticsSource. */
  readonly source: () => LocalDiagnosticsSource;
}

const clampCapacity = (value: number | undefined): number => {
  if (value === undefined || !Number.isInteger(value) || value < 1) {
    return MODULE_HEALTH_DEFAULT_CAPACITY;
  }
  return Math.min(value, MODULE_HEALTH_MAX_CAPACITY);
};

const clampCodeBytes = (value: number | undefined): number => {
  if (value === undefined || !Number.isInteger(value) || value < 1) {
    return MODULE_HEALTH_DEFAULT_MAX_CODE_BYTES;
  }
  return Math.min(value, MODULE_HEALTH_MAX_CODE_BYTES);
};

/** Truncate to at most maxBytes UTF-8 bytes without splitting a code point. */
const boundedUtf8 = (value: string, maxBytes: number): string => {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) {
    return value;
  }
  let out = "";
  let used = 0;
  for (const character of value) {
    const size = Buffer.byteLength(character, "utf8");
    if (used + size > maxBytes) {
      break;
    }
    out += character;
    used += size;
  }
  return out;
};

export const makeModuleHealthWriter = (
  config: ModuleHealthWriterConfig = {},
): ModuleHealthWriter => {
  const capacity = clampCapacity(config.capacity);
  const maxCodeBytes = clampCodeBytes(config.maxCodeBytes);
  const buffer: LocalDiagnosticRecord[] = [];
  let dropped = 0;
  let firstDropAtMs: number | undefined;
  let lastDropAtMs: number | undefined;
  let outageCount = 0;

  const now = (): number => {
    try {
      const value = config.now?.() ?? Date.now();
      return Number.isFinite(value) ? value : Date.now();
    } catch {
      outageCount += 1;
      return Date.now();
    }
  };

  const push = (level: LocalDiagnosticLevel, code: string, count = 1): void => {
    try {
      const record: LocalDiagnosticRecord = {
        atMs: now(),
        code: boundedUtf8(code, maxCodeBytes),
        count,
        level,
      };
      buffer.unshift(record);
      if (buffer.length > capacity) {
        buffer.pop();
        dropped += 1;
        firstDropAtMs ??= record.atMs;
        lastDropAtMs = record.atMs;
      }
      try {
        config.onRecord?.(record);
      } catch {
        outageCount += 1;
      }
    } catch {
      outageCount += 1;
    }
  };

  const classifyReason = (
    reason: Cause.Reason<unknown>,
  ): Readonly<{ code: string; level: LocalDiagnosticLevel }> | undefined => {
    try {
      switch (reason._tag) {
        case "Fail":
          return { code: "cause.fail", level: "error" };
        case "Die":
          return { code: "cause.die", level: "error" };
        case "Interrupt":
          return { code: "cause.interrupt", level: "warn" };
        default:
          return { code: "cause.other", level: "warn" };
      }
    } catch {
      outageCount += 1;
      return undefined;
    }
  };

  const recordCause = (cause: Cause.Cause<unknown>): void => {
    try {
      if (!Cause.isCause(cause)) {
        outageCount += 1;
        return;
      }
      const reasons = cause.reasons;
      if (!Array.isArray(reasons)) {
        outageCount += 1;
        return;
      }
      const bounded = Math.min(reasons.length, MAX_REASONS_PER_CAUSE);
      for (let index = 0; index < bounded; index += 1) {
        const classified = classifyReason(reasons[index] as Cause.Reason<unknown>);
        if (classified !== undefined) {
          push(classified.level, classified.code);
        }
      }
      if (reasons.length > MAX_REASONS_PER_CAUSE) {
        push("warn", "cause.truncated", reasons.length - MAX_REASONS_PER_CAUSE);
      }
    } catch {
      outageCount += 1;
    }
  };

  const recordError = (_error: unknown): void => {
    // Deliberately does not read the error: no message, name, stack or cause graph capture.
    push("error", "error");
  };

  const observe = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    effect.pipe(
      Effect.onExit((exit) =>
        Effect.sync(() => {
          try {
            if (Exit.isFailure(exit)) {
              recordCause(exit.cause);
            }
          } catch {
            outageCount += 1;
          }
        }),
      ),
    );

  const records = (): ReadonlyArray<LocalDiagnosticRecord> => buffer.slice();

  const loss = (): LocalDiagnosticsLoss => ({
    dropped,
    windowMs:
      dropped === 0 || firstDropAtMs === undefined || lastDropAtMs === undefined
        ? 0
        : Math.max(0, lastDropAtMs - firstDropAtMs),
  });

  const source = (): LocalDiagnosticsSource => ({
    buildId: config.buildId ?? "unknown",
    enabled: true,
    instanceId: config.instanceId ?? "unknown",
    lastRecordAtMs: () => buffer[0]?.atMs ?? null,
    loss,
    records,
  });

  return {
    loss,
    observe,
    outages: () => outageCount,
    recordCause,
    recordError,
    records,
    source,
  };
};
