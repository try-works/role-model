import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

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
}

export const DEFAULT_REPLAY_LEDGER_LIMITS: ReplayLedgerLimits = Object.freeze({
  counterfactualsPerDay: 100,
  dispatchesPerDay: 300,
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

function captureKey(captureRef: string, policySetDigest: string): string {
  return createHash("sha256").update(`${captureRef}\u0000${policySetDigest}`).digest("hex");
}

function emptyWindow(): WindowRow {
  return { reservations: [], dispatches: [], counterfactuals: [] };
}

export interface ReplayLedger {
  readonly filePath: string;
  reserve(input: ReplayLedgerReservationInput): ReplayLedgerReservationResult;
  release(reservationId: string): void;
  record(input: ReplayLedgerRecordInput): ReplayLedgerRecordResult;
  hasTerminalCounterfactual(captureRef: string, policySetDigest: string): boolean;
  status(): ReplayLedgerStatus;
  entries(): readonly DispatchRow[];
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
        window.counterfactuals.length + window.reservations.length >=
        limits.counterfactualsPerDay
      ) {
        return {
          accepted: false,
          code: "budget_exhausted",
          detail: "the daily counterfactual ceiling is exhausted",
        };
      }
      if (
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
      const window = windowOf(file, now());
      const index = window.reservations.findIndex((row) => row.reservationId === reservationId);
      if (index === -1) return;
      window.reservations.splice(index, 1);
      persist(file);
    },
    record(input) {
      const atMs = now();
      const file = load();
      const window = windowOf(file, atMs);
      const reservation = window.reservations.find(
        (row) => row.reservationId === input.reservationId,
      );
      if (!reservation) {
        return {
          accepted: false,
          code: "unknown_reservation",
          detail: "the dispatch reservation is not active in this window",
        };
      }
      if (window.dispatches.length + 1 > limits.dispatchesPerDay) {
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
      if (index !== -1) {
        const reservation = window.reservations[index] as ReservationRow;
        const remaining = reservation.candidateDispatches - 1;
        const terminal =
          input.dispatchKind === "candidate" && input.outcome === "complete" && remaining <= 0;
        if (terminal) {
          const key = captureKey(input.captureRef, input.policySetDigest);
          if (!window.counterfactuals.includes(key)) window.counterfactuals.push(key);
          window.reservations.splice(index, 1);
        } else {
          window.reservations[index] = {
            ...reservation,
            candidateDispatches: remaining > 0 ? remaining : 0,
          };
        }
      }
      persist(file);
      return { accepted: true };
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
