import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  createReplayLedger,
  replayBudgetWindow,
  resolveReplayLedgerLimits,
} from "../src/track-b-replay-ledger.js";

function tempFile(): { file: string; cleanup: () => void } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run97-ledger-"));
  return {
    file: path.join(dir, "replay-ledger.json"),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("run97 ledger windows are UTC calendar days", () => {
  expect(replayBudgetWindow(Date.parse("2026-09-12T23:59:59Z"))).toBe("2026-09-12");
  expect(replayBudgetWindow(Date.parse("2026-09-13T00:00:00Z"))).toBe("2026-09-13");
});

test("run97 ledger limits are operator-configurable with validated overrides", () => {
  expect(
    resolveReplayLedgerLimits({
      ROLE_MODEL_REPLAY_DAILY_COUNTERFACTUALS: "250",
      ROLE_MODEL_REPLAY_DAILY_DISPATCHES: "750",
    }),
  ).toEqual({ counterfactualsPerDay: 250, dispatchesPerDay: 750 });
  expect(resolveReplayLedgerLimits({})).toEqual({});
  for (const invalid of ["0", "-1", "abc", "1.5", "9999999999"]) {
    expect(() =>
      resolveReplayLedgerLimits({ ROLE_MODEL_REPLAY_DAILY_DISPATCHES: invalid }),
    ).toThrow();
  }
});

test("run97 a configured ceiling replaces the default and is receipted on the window", () => {
  const { file, cleanup } = tempFile();
  try {
    const limits = resolveReplayLedgerLimits({
      ROLE_MODEL_REPLAY_DAILY_DISPATCHES: "4",
      ROLE_MODEL_REPLAY_DAILY_COUNTERFACTUALS: "3",
    });
    const ledger = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
      limits,
    });
    expect(
      ledger.reserve({ captureRef: "req-a", policySetDigest: "policy-a", candidateDispatches: 4 })
        .accepted,
    ).toBe(true);
    const refused = ledger.reserve({
      captureRef: "req-b",
      policySetDigest: "policy-a",
      candidateDispatches: 1,
    });
    expect(refused.accepted).toBe(false);
    expect(refused.code).toBe("budget_exhausted");
    expect(ledger.status()).toMatchObject({
      counterfactualLimit: 3,
      dispatchLimit: 4,
    });
  } finally {
    cleanup();
  }
});

test("run97 ledger admits up to the daily counterfactual and dispatch ceilings", () => {
  const { file, cleanup } = tempFile();
  try {
    const ledger = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const reservation = ledger.reserve({
      captureRef: "req-1",
      policySetDigest: "policy-a",
      candidateDispatches: 3,
    });
    expect(reservation.accepted).toBe(true);
    expect(ledger.status()).toMatchObject({
      window: "2026-09-12",
      counterfactuals: 1,
      reservedCounterfactuals: 1,
      reservedDispatches: 3,
      counterfactualLimit: 100,
      dispatchLimit: 300,
    });
    ledger.release(reservation.reservationId);
    expect(ledger.status()).toMatchObject({ reservedCounterfactuals: 0, reservedDispatches: 0 });
    cleanup();
  } finally {
    cleanup();
  }
});

test("run97 ledger refuses when the daily dispatch ceiling would be exceeded", () => {
  const { file, cleanup } = tempFile();
  try {
    const ledger = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
      limits: { counterfactualsPerDay: 2, dispatchesPerDay: 4 },
    });
    expect(
      ledger.reserve({ captureRef: "req-1", policySetDigest: "p", candidateDispatches: 3 })
        .accepted,
    ).toBe(true);
    const second = ledger.reserve({
      captureRef: "req-2",
      policySetDigest: "p",
      candidateDispatches: 3,
    });
    expect(second.accepted).toBe(false);
    if (!second.accepted) expect(second.code).toBe("budget_exhausted");
    const third = ledger.reserve({
      captureRef: "req-3",
      policySetDigest: "p",
      candidateDispatches: 1,
    });
    expect(third.accepted).toBe(true);
    expect(ledger.status()).toMatchObject({ reservedDispatches: 4, dispatchLimit: 4 });
  } finally {
    cleanup();
  }
});

test("run97 ledger rejects a second terminal counterfactual for the same capture and policy set", () => {
  const { file, cleanup } = tempFile();
  try {
    const ledger = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const first = ledger.reserve({
      captureRef: "req-1",
      policySetDigest: "p",
      candidateDispatches: 1,
    });
    expect(first.accepted).toBe(true);
    if (first.accepted) {
      ledger.record({
        reservationId: first.reservationId,
        captureRef: "req-1",
        policySetDigest: "p",
        counterfactualRef: "cf-req-1",
        dispatchKind: "candidate",
        candidateEndpointId: "endpoint-a",
        attempt: 1,
        costMicros: 10,
        bytes: 100,
        outcome: "complete",
      });
      ledger.completeCounterfactual({ captureRef: "req-1", policySetDigest: "p" });
    }
    const duplicate = ledger.reserve({
      captureRef: "req-1",
      policySetDigest: "p",
      candidateDispatches: 1,
    });
    expect(duplicate.accepted).toBe(false);
    if (!duplicate.accepted) expect(duplicate.code).toBe("duplicate_already_processed");
  } finally {
    cleanup();
  }
});

test("run97 ledger counts retries and derived dispatches against the same window", () => {
  const { file, cleanup } = tempFile();
  try {
    const ledger = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
      limits: { counterfactualsPerDay: 10, dispatchesPerDay: 2 },
    });
    const reservation = ledger.reserve({
      captureRef: "req-1",
      policySetDigest: "p",
      candidateDispatches: 1,
    });
    expect(reservation.accepted).toBe(true);
    if (!reservation.accepted) return;
    expect(
      ledger.record({
        reservationId: reservation.reservationId,
        captureRef: "req-1",
        policySetDigest: "p",
        counterfactualRef: "cf-req-1",
        dispatchKind: "retry",
        candidateEndpointId: "endpoint-a",
        attempt: 2,
        costMicros: 5,
        bytes: 10,
        outcome: "complete",
      }).accepted,
    ).toBe(true);
    expect(
      ledger.record({
        reservationId: reservation.reservationId,
        captureRef: "req-1",
        policySetDigest: "p",
        counterfactualRef: "cf-req-1",
        dispatchKind: "derived",
        candidateEndpointId: "judge",
        attempt: 1,
        costMicros: 5,
        bytes: 10,
        outcome: "complete",
      }).accepted,
    ).toBe(true);
    const over = ledger.record({
      reservationId: reservation.reservationId,
      captureRef: "req-1",
      policySetDigest: "p",
      counterfactualRef: "cf-req-1",
      dispatchKind: "derived",
      candidateEndpointId: "judge",
      attempt: 2,
      costMicros: 5,
      bytes: 10,
      outcome: "complete",
    });
    expect(over.accepted).toBe(false);
    if (!over.accepted) expect(over.code).toBe("budget_exhausted");
    expect(ledger.status()).toMatchObject({ dispatches: 2, dispatchLimit: 2 });
  } finally {
    cleanup();
  }
});

test("run97 ledger persists across restarts and reconciles by window", () => {
  const { file, cleanup } = tempFile();
  try {
    const first = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-12T06:00:00Z"),
    });
    const reservation = first.reserve({
      captureRef: "req-1",
      policySetDigest: "p",
      candidateDispatches: 2,
    });
    expect(reservation.accepted).toBe(true);
    const second = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-12T07:00:00Z"),
    });
    expect(second.status()).toMatchObject({ reservedDispatches: 2, reservedCounterfactuals: 1 });
    const nextDay = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-13T00:30:00Z"),
    });
    expect(nextDay.status()).toMatchObject({
      window: "2026-09-13",
      reservedDispatches: 0,
      reservedCounterfactuals: 0,
      dispatches: 0,
    });
    const raw = JSON.parse(readFileSync(file, "utf8")) as {
      schemaVersion: string;
      windows: unknown;
    };
    expect(raw.schemaVersion).toBe("role-model.replay-ledger.v1");
    expect(raw.windows).toBeTruthy();
  } finally {
    cleanup();
  }
});

test("run97 ledger keeps a completed counterfactual terminal across instances, retries, and releases", () => {
  const { file, cleanup } = tempFile();
  try {
    const at = () => Date.parse("2026-09-12T08:00:00Z");
    const ledger = createReplayLedger({ filePath: file, now: at });
    const reservation = ledger.reserve({
      captureRef: "req-26922286-b7ab-4584-98e0-7cf9c06671c6",
      policySetDigest: "policy-a",
      candidateDispatches: 1,
    });
    expect(reservation.accepted).toBe(true);
    if (!reservation.accepted) throw new Error("reservation refused");
    expect(
      ledger.record({
        reservationId: reservation.reservationId,
        captureRef: "req-26922286-b7ab-4584-98e0-7cf9c06671c6",
        policySetDigest: "policy-a",
        counterfactualRef: "cf:req-26922286",
        dispatchKind: "candidate",
        candidateEndpointId: "endpoint-b",
        attempt: 1,
        costMicros: 640,
        bytes: 1536,
        outcome: "complete",
      }).accepted,
    ).toBe(true);
    ledger.completeCounterfactual({
      captureRef: "req-26922286-b7ab-4584-98e0-7cf9c06671c6",
      policySetDigest: "policy-a",
    });
    ledger.release(reservation.reservationId);

    // A restarted loop reads the same durable ledger: the capture stays terminal, so
    // the producer cannot burn the day's budget re-replaying it.
    const restarted = createReplayLedger({ filePath: file, now: at });
    expect(
      restarted.hasTerminalCounterfactual("req-26922286-b7ab-4584-98e0-7cf9c06671c6", "policy-a"),
    ).toBe(true);
    const duplicate = restarted.reserve({
      captureRef: "req-26922286-b7ab-4584-98e0-7cf9c06671c6",
      policySetDigest: "policy-a",
      candidateDispatches: 1,
    });
    expect(duplicate).toMatchObject({ accepted: false, code: "duplicate_already_processed" });
    // The marker survives later accounting writes in the same window.
    restarted.record({
      reservationId: "unknown-reservation",
      captureRef: "req-other",
      policySetDigest: "policy-a",
      counterfactualRef: "cf:req-other",
      dispatchKind: "retry",
      candidateEndpointId: "endpoint-c",
      attempt: 2,
      costMicros: 1,
      bytes: 1,
      outcome: "failed",
    });
    const afterWrites = createReplayLedger({ filePath: file, now: at });
    expect(
      afterWrites.hasTerminalCounterfactual("req-26922286-b7ab-4584-98e0-7cf9c06671c6", "policy-a"),
    ).toBe(true);
    expect(afterWrites.status()).toMatchObject({ counterfactuals: 1, dispatches: 2 });
  } finally {
    cleanup();
  }
});
