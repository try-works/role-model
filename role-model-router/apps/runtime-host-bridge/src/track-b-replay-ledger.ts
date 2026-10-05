import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import { assertReplayReceiptMetadataOnly } from "./track-b-replay-retention.js";

/**
 * Run 97 replay budget ledger.
 *
 * The ledger is the single accounting authority for automatic and on-demand replay
 * work. It reserves capacity before dispatch, records every candidate, retry, and
 * derived (scorer/judge) dispatch, and refuses work that would exceed the daily
 * counterfactual or dispatch ceiling. It is append-only per window and reconciled
 * against provider receipts by later phases.
 */

export const REPLAY_LEDGER_SCHEMA_VERSION = "role-model.replay-ledger.v1";

export interface ReplayLedgerLimits {
  readonly counterfactualsPerDay: number;
  readonly dispatchesPerDay: number;
  /**
   * Run 100 phase-5 repair (operator instruction 2026-09-21): whether the ceilings may *refuse* work.
   * The accounting is unconditional - every dispatch is still recorded and reported - but the daily
   * ceiling is a production delivery guard, so on dev/stage the loop must not starve itself on it.
   */
  readonly enforced: boolean;
}

export const DEFAULT_REPLAY_LEDGER_LIMITS: ReplayLedgerLimits = Object.freeze({
  counterfactualsPerDay: 100,
  dispatchesPerDay: 300,
  enforced: true,
});

export type ReplayDispatchKind = "candidate" | "retry" | "derived";

export interface ReplayLedgerReservationInput {
  readonly captureRef: string;
  readonly policySetDigest: string;
  readonly candidateDispatches: number;
}

export type ReplayLedgerReservationResult =
  | Readonly<{ accepted: true; reservationId: string; window: string }>
  | Readonly<{
      accepted: false;
      code: "budget_exhausted" | "duplicate_already_processed";
      detail: string;
    }>;

export interface ReplayLedgerRecordInput {
  readonly reservationId: string;
  readonly captureRef: string;
  readonly policySetDigest: string;
  readonly counterfactualRef: string;
  readonly dispatchKind: ReplayDispatchKind;
  readonly candidateEndpointId: string;
  readonly attempt: number;
  readonly costMicros: number;
  readonly bytes: number;
  readonly outcome: "complete" | "failed" | "refused";
}

export type ReplayLedgerRecordResult =
  | Readonly<{ accepted: true }>
  | Readonly<{ accepted: false; code: "budget_exhausted" | "unknown_reservation"; detail: string }>;

export interface ReplayLedgerStatus {
  readonly window: string;
  readonly counterfactuals: number;
  readonly reservedCounterfactuals: number;
  readonly reservedDispatches: number;
  readonly dispatches: number;
  readonly counterfactualLimit: number;
  readonly dispatchLimit: number;
  /** False when the ceilings are measured but not enforced on this channel. */
  readonly enforced: boolean;
}

interface ReservationRow {
  readonly reservationId: string;
  readonly captureRef: string;
  readonly policySetDigest: string;
  readonly candidateDispatches: number;
  readonly createdAtMs: number;
}

interface DispatchRow extends ReplayLedgerRecordInput {
  readonly recordedAtMs: number;
}

interface WindowRow {
  readonly reservations: ReservationRow[];
  readonly dispatches: DispatchRow[];
  readonly counterfactuals: string[];
}

interface LedgerFile {
  schemaVersion: string;
  windows: Record<string, WindowRow>;
}

export function replayBudgetWindow(atMs: number): string {
  return new Date(atMs).toISOString().slice(0, 10);
}

/** Window keys are UTC `YYYY-MM-DD`, so a descending sort is newest-first. */
function windowsNewestFirst(file: LedgerFile): readonly string[] {
  return Object.keys(file.windows).sort().reverse();
}

function captureKey(captureRef: string, policySetDigest: string): string {
  return createHash("sha256").update(`${captureRef}\u0000${policySetDigest}`).digest("hex");
}

function emptyWindow(): WindowRow {
  return { reservations: [], dispatches: [], counterfactuals: [] };
}

/**
 * Run 97 R7: the daily ceilings are operator-configurable with safe defaults. The
 * defaults (100 counterfactuals / 300 dispatches) stay in force unless an operator
 * sets an explicit, validated ceiling; the effective limits are recorded on every
 * ledger window so a raised ceiling is receipted and versioned with the accounting
 * it governed.
 */
export function resolveReplayLedgerLimits(
  env: Readonly<Record<string, string | undefined>> = process.env,
): Partial<ReplayLedgerLimits> {
  const read = (name: string): number | undefined => {
    const raw = env[name]?.trim();
    if (!raw) return undefined;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0 || value > 1_000_000) {
      throw new Error(`${name} must be a positive integer no greater than 1000000`);
    }
    return value;
  };
  const counterfactualsPerDay = read("ROLE_MODEL_REPLAY_DAILY_COUNTERFACTUALS");
  const dispatchesPerDay = read("ROLE_MODEL_REPLAY_DAILY_DISPATCHES");
  /**
   * Run 100 phase-5 repair: the operator escape hatch, and the seam the host uses to apply the versioned
   * `replayBudgetEnforcement` policy. Absent means "no override", so the documented default (enforced)
   * holds and an unconfigured process behaves exactly as before.
   */
  const enforcement = env.ROLE_MODEL_REPLAY_BUDGET_ENFORCEMENT?.trim().toLowerCase();
  let enforced: boolean | undefined;
  if (enforcement) {
    if (enforcement !== "on" && enforcement !== "off") {
      throw new Error("ROLE_MODEL_REPLAY_BUDGET_ENFORCEMENT must be 'on' or 'off'");
    }
    enforced = enforcement === "on";
  }
  return {
    ...(counterfactualsPerDay === undefined ? {} : { counterfactualsPerDay }),
    ...(dispatchesPerDay === undefined ? {} : { dispatchesPerDay }),
    ...(enforced === undefined ? {} : { enforced }),
  };
}

export interface ReplayLedger {
  readonly filePath: string;
  reserve(input: ReplayLedgerReservationInput): ReplayLedgerReservationResult;
  release(reservationId: string): void;
  record(input: ReplayLedgerRecordInput): ReplayLedgerRecordResult;
  /**
   * Mark a capture's counterfactual terminal. Called only after the whole replay job
   * completed (branches appended), so a dispatch that succeeded but whose branch or
   * evaluation step failed stays retryable in the same window.
   */
  completeCounterfactual(input: {
    readonly captureRef: string;
    readonly policySetDigest: string;
  }): void;
  hasTerminalCounterfactual(captureRef: string, policySetDigest: string): boolean;
  status(): ReplayLedgerStatus;
  entries(): readonly DispatchRow[];
  /**
   * Run 98 addendum 52 (addendum 48 §11.2): a reservation is held for the duration of one dispatch, so a
   * reservation older than the tick's bound belongs to a process that is gone — a killed runtime, a swapped
   * package, or a tick interrupted mid-capture. Live v287/v294: `reservedCounterfactuals` did not fall back to
   * zero on a fresh process (`7/13` then `9/18`) because nothing reconciled them, and the oldest rows in the
   * file reach back through every previous window. Mirrors the same "release on terminal outcome" accounting the
   * dispatch path uses, for the outcomes no process survived to report.
   */
  pruneStaleReservations(input: {
    readonly atMs: number;
    readonly maxAgeMs: number;
  }): { readonly released: number; readonly reservationIds: readonly string[] };
}

/**
 * Run 100 phase-5 repair: the admission-facing view of the ledger's budget gate.
 *
 * The reservation path is not the only place the ceiling decides anything - both admission callers
 * (`cli.ts`'s on-demand replay and `track-b-auto-replay.ts`'s tick) compute `budgetAvailable` from the
 * ledger status before asking `decideReplayAdmission`, so a non-enforced ceiling that only changed the
 * reservation path would still refuse every capture one layer up. This is the single expression both
 * callers use: with `enforced: false` the ceilings are measured but may not refuse, so admission always
 * finds capacity.
 */
export function replayBudgetAvailable(status: ReplayLedgerStatus): boolean {
  if (!status.enforced) return true;
  return status.dispatches + status.reservedDispatches < status.dispatchLimit;
}

export function createReplayLedger(options: {
  readonly filePath: string;
  readonly now?: () => number;
  readonly limits?: Partial<ReplayLedgerLimits>;
}): ReplayLedger {
  const now = options.now ?? (() => Date.now());
  const limits: ReplayLedgerLimits = {
    counterfactualsPerDay:
      options.limits?.counterfactualsPerDay ?? DEFAULT_REPLAY_LEDGER_LIMITS.counterfactualsPerDay,
    dispatchesPerDay:
      options.limits?.dispatchesPerDay ?? DEFAULT_REPLAY_LEDGER_LIMITS.dispatchesPerDay,
    enforced: options.limits?.enforced ?? DEFAULT_REPLAY_LEDGER_LIMITS.enforced,
  };

  const load = (): LedgerFile => {
    try {
      const parsed = JSON.parse(readFileSync(options.filePath, "utf8")) as LedgerFile;
      if (parsed && typeof parsed === "object" && parsed.windows) return parsed;
    } catch {
      // A missing or unreadable ledger starts empty; the schema version is written
      // on the first mutation so corruption cannot silently pass as accounting.
    }
    return { schemaVersion: REPLAY_LEDGER_SCHEMA_VERSION, windows: {} };
  };

  const persist = (file: LedgerFile): void => {
    mkdirSync(path.dirname(options.filePath), { recursive: true });
    const temporary = `${options.filePath}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(file, null, 2)}\n`, "utf8");
    renameSync(temporary, options.filePath);
  };

  const windowOf = (file: LedgerFile, atMs: number): WindowRow => {
    const key = replayBudgetWindow(atMs);
    const existing = file.windows[key];
    if (existing) return existing;
    const created = emptyWindow();
    file.windows[key] = created;
    return created;
  };

  const reservedDispatches = (window: WindowRow): number =>
    window.reservations.reduce((total, row) => total + row.candidateDispatches, 0);

  const statusFor = (file: LedgerFile, atMs: number): ReplayLedgerStatus => {
    const window = replayBudgetWindow(atMs);
    const row = file.windows[window] ?? emptyWindow();
    return {
      window,
      counterfactuals: row.counterfactuals.length + row.reservations.length,
      reservedCounterfactuals: row.reservations.length,
      reservedDispatches: reservedDispatches(row),
      dispatches: row.dispatches.length,
      counterfactualLimit: limits.counterfactualsPerDay,
      dispatchLimit: limits.dispatchesPerDay,
      enforced: limits.enforced,
    };
  };

  return {
    filePath: options.filePath,
    reserve(input) {
      const atMs = now();
      const file = load();
      const window = windowOf(file, atMs);
      const key = captureKey(input.captureRef, input.policySetDigest);
      if (window.counterfactuals.includes(key)) {
        return {
          accepted: false,
          code: "duplicate_already_processed",
          detail: "this capture already finalized a counterfactual in this window",
        };
      }
      if (
        limits.enforced &&
        window.counterfactuals.length + window.reservations.length >= limits.counterfactualsPerDay
      ) {
        return {
          accepted: false,
          code: "budget_exhausted",
          detail: "the daily counterfactual ceiling is exhausted",
        };
      }
      if (
        limits.enforced &&
        window.dispatches.length + reservedDispatches(window) + input.candidateDispatches >
          limits.dispatchesPerDay
      ) {
        return {
          accepted: false,
          code: "budget_exhausted",
          detail: "the daily dispatch ceiling cannot cover the requested candidates",
        };
      }
      const reservationId = createHash("sha256")
        .update(`${key}\u0000${atMs}\u0000${window.reservations.length}`)
        .digest("hex")
        .slice(0, 32);
      window.reservations.push({
        reservationId,
        captureRef: input.captureRef,
        policySetDigest: input.policySetDigest,
        candidateDispatches: input.candidateDispatches,
        createdAtMs: atMs,
      });
      persist(file);
      return { accepted: true, reservationId, window: replayBudgetWindow(atMs) };
    },
    release(reservationId) {
      const file = load();
      /**
       * Run 98 addendum 52: a dispatch that starts before midnight and finishes after it must still release its
       * reservation. Looking only at the current window left the reservation in the previous day's window
       * forever (measured live: every window in the file keeps its own stranded rows).
       */
      for (const key of windowsNewestFirst(file)) {
        const window = file.windows[key];
        if (!window) continue;
        const index = window.reservations.findIndex((row) => row.reservationId === reservationId);
        if (index === -1) continue;
        window.reservations.splice(index, 1);
        persist(file);
        return;
      }
    },
    pruneStaleReservations(input) {
      const file = load();
      const released: string[] = [];
      for (const key of Object.keys(file.windows)) {
        const window = file.windows[key];
        if (!window) continue;
        for (let index = window.reservations.length - 1; index >= 0; index -= 1) {
          const row = window.reservations[index];
          if (!row) continue;
          const age = input.atMs - row.createdAtMs;
          // A future-dated row (clock skew, a hand-edited ledger) is stale too: it can never be released by
          // the dispatch that would own it, and holding it only spends the day's ceiling.
          if (Number.isFinite(age) && age <= input.maxAgeMs && age >= 0) continue;
          window.reservations.splice(index, 1);
          released.push(row.reservationId);
        }
      }
      if (released.length > 0) persist(file);
      return { released: released.length, reservationIds: released };
    },
    record(input) {
      assertReplayReceiptMetadataOnly(input as unknown as Record<string, unknown>);
      const atMs = now();
      const file = load();
      const window = windowOf(file, atMs);
      const reservation = window.reservations.find(
        (row) => row.reservationId === input.reservationId,
      );
      // A retry or derived dispatch may arrive after its planned candidates were
      // consumed; the daily ceiling is the real guard, so the dispatch is still
      // recorded (the reservation row is optional attribution).
      if (limits.enforced && window.dispatches.length + 1 > limits.dispatchesPerDay) {
        return {
          accepted: false,
          code: "budget_exhausted",
          detail: "the daily dispatch ceiling is exhausted",
        };
      }
      window.dispatches.push({ ...input, recordedAtMs: atMs });
      const index = window.reservations.findIndex(
        (row) => row.reservationId === input.reservationId,
      );
      if (reservation && index !== -1) {
        const reservation = window.reservations[index] as ReservationRow;
        const remaining = reservation.candidateDispatches - 1;
        // Consumed reservations leave the window: a later attempt creates a new
        // reservation instead of leaking capacity for the rest of the day.
        if (remaining <= 0) window.reservations.splice(index, 1);
        else {
          window.reservations[index] = {
            ...reservation,
            candidateDispatches: remaining,
          };
        }
      }
      persist(file);
      return { accepted: true };
    },
    completeCounterfactual(input) {
      const file = load();
      const window = windowOf(file, now());
      const key = captureKey(input.captureRef, input.policySetDigest);
      if (!window.counterfactuals.includes(key)) window.counterfactuals.push(key);
      for (let index = window.reservations.length - 1; index >= 0; index -= 1) {
        const row = window.reservations[index] as ReservationRow;
        if (row.captureRef === input.captureRef && row.policySetDigest === input.policySetDigest) {
          window.reservations.splice(index, 1);
        }
      }
      persist(file);
    },
    hasTerminalCounterfactual(captureRef, policySetDigest) {
      const file = load();
      const window = windowOf(file, now());
      return window.counterfactuals.includes(captureKey(captureRef, policySetDigest));
    },
    status() {
      return statusFor(load(), now());
    },
    entries() {
      const file = load();
      return windowOf(file, now()).dispatches.slice();
    },
  };
}
