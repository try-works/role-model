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

/**
 * R20 calibrated limits (approved 2026-11-06 for the local diagnostics lane).
 *
 * These are the concrete bounds the writer and the authorized read path enforce: 128 buffered
 * records, 96 bytes per code label, 32 new records/second, a 15-minute record TTL, and at most
 * 50 records in one query page (the reader's MAX_DIAGNOSTICS_RECORDS). They replace the earlier
 * placeholders and are the calibration decision that enables the writer.
 */
export const MODULE_HEALTH_LIMITS_ENABLED = true;

export const MODULE_HEALTH_CALIBRATED_LIMITS = Object.freeze({
  ingressPerSecond: 32,
  maxCodeBytes: 96,
  queryCap: 50,
  recordCount: 128,
  ttlMs: 900_000,
});

export type ModuleHealthEscape =
  | Cause.Cause<unknown>
  | Error
  | { readonly statusCode?: unknown }
  | string
  | number
  | boolean
  | null
  | undefined;

export const MODULE_HEALTH_DEFAULT_CAPACITY = MODULE_HEALTH_CALIBRATED_LIMITS.recordCount;
export const MODULE_HEALTH_MAX_CAPACITY = 256;
export const MODULE_HEALTH_DEFAULT_MAX_CODE_BYTES = MODULE_HEALTH_CALIBRATED_LIMITS.maxCodeBytes;
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
  /** Maximum newly accepted records per second; excess is counted as loss. */
  readonly ingressPerSecond?: number;
  /** Records older than this age are omitted from the read source (they stay in the bounded buffer). */
  readonly ttlMs?: number;
  /** Maximum records one read source exposes (the reader's page cap is separate). */
  readonly queryCap?: number;
  /** Test/observability seam; a throw here is an outage, never a caller failure. */
  readonly onRecord?: (record: LocalDiagnosticRecord) => void;
}

export interface ModuleHealthWriter {
  /** Observes a Cause. Never throws, never replaces the Cause. */
  readonly recordCause: (cause: Cause.Cause<unknown>) => void;
  /** Observes a plain error. Never throws, never reads the error's properties. */
  readonly recordError: (error: unknown) => void;
  /** Observes a request escape: client-caused 4xx is separated, everything else is a Cause. */
  readonly recordEscape: (error: ModuleHealthEscape) => boolean;
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

const positiveInteger = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isInteger(value) && value > 0 ? value : fallback;

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
  const ingressPerSecond = positiveInteger(
    config.ingressPerSecond,
    MODULE_HEALTH_CALIBRATED_LIMITS.ingressPerSecond,
  );
  const ttlMs = positiveInteger(config.ttlMs, MODULE_HEALTH_CALIBRATED_LIMITS.ttlMs);
  const queryCap = positiveInteger(config.queryCap, MODULE_HEALTH_CALIBRATED_LIMITS.queryCap);
  const buffer: LocalDiagnosticRecord[] = [];
  let dropped = 0;
  let firstDropAtMs: number | undefined;
  let lastDropAtMs: number | undefined;
  let outageCount = 0;
  let ingressTokens = ingressPerSecond;
  let ingressRefillAtMs: number | undefined;

  const now = (): number => {
    try {
      const value = config.now?.() ?? Date.now();
      return Number.isFinite(value) ? value : Date.now();
    } catch {
      outageCount += 1;
      return Date.now();
    }
  };

  const recordDrop = (atMs: number): void => {
    dropped += 1;
    firstDropAtMs ??= atMs;
    lastDropAtMs = atMs;
  };

  const push = (level: LocalDiagnosticLevel, code: string, count = 1): void => {
    try {
      const atMs = now();
      if (ingressRefillAtMs === undefined) {
        ingressRefillAtMs = atMs;
      } else {
        const elapsedMs = Math.max(0, atMs - ingressRefillAtMs);
        if (elapsedMs > 0) {
          ingressTokens = Math.min(
            ingressPerSecond,
            ingressTokens + (elapsedMs / 1_000) * ingressPerSecond,
          );
          ingressRefillAtMs = atMs;
        }
      }
      if (ingressTokens < 1) {
        // The ingress calibration is a real bound: excess observations are counted, not stored.
        recordDrop(atMs);
        return;
      }
      ingressTokens -= 1;
      const record: LocalDiagnosticRecord = {
        atMs,
        code: boundedUtf8(code, maxCodeBytes),
        count,
        level,
      };
      buffer.unshift(record);
      if (buffer.length > capacity) {
        buffer.pop();
        recordDrop(atMs);
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

  const isClientCausedEscape = (error: ModuleHealthEscape): boolean => {
    if (error === null || error === undefined || Object(error) !== error) return false;
    try {
      // SAFETY: only an optional numeric statusCode is read; a hostile accessor falls through to a module failure.
      const statusCode = (error as { readonly statusCode?: unknown }).statusCode;
      const numeric = Number(statusCode);
      return Number.isFinite(numeric) && numeric >= 400 && numeric < 500;
    } catch {
      return false;
    }
  };

  const recordEscape = (error: ModuleHealthEscape): boolean => {
    try {
      if (isClientCausedEscape(error)) return false;
      recordCause(Cause.isCause(error) ? error : Cause.fail(error));
      return true;
    } catch {
      outageCount += 1;
      return false;
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

  const readRecords = (): ReadonlyArray<LocalDiagnosticRecord> => {
    const cutoff = now() - ttlMs;
    return buffer.filter((record) => record.atMs >= cutoff).slice(0, queryCap);
  };

  const loss = (): LocalDiagnosticsLoss => ({
    dropped,
    windowMs:
      dropped === 0 || firstDropAtMs === undefined || lastDropAtMs === undefined
        ? 0
        : Math.max(0, lastDropAtMs - firstDropAtMs),
  });

  const source = (): LocalDiagnosticsSource => ({
    buildId: config.buildId?.trim() || "unknown",
    enabled: MODULE_HEALTH_LIMITS_ENABLED,
    instanceId: config.instanceId?.trim() || "unknown",
    // The newest RECORDED time stays authoritative even after TTL removes it from the page, so the
    // reader can report stale/empty rather than pretending an aged-out writer never recorded.
    lastRecordAtMs: () => buffer[0]?.atMs ?? null,
    loss,
    records: readRecords,
  });

  return {
    loss,
    observe,
    outages: () => outageCount,
    recordCause,
    recordError,
    recordEscape,
    records,
    source,
  };
};
