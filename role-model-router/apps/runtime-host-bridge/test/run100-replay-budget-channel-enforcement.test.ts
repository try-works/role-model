import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  createReplayLedger,
  resolveReplayLedgerLimits,
} from "../src/track-b-replay-ledger.js";
import { replayBudgetEnforcedForChannel } from "../src/track-b-replay-policy.js";

/**
 * Run 100 phase-5 repair (operator instruction 2026-09-21: "the daily dispatch ceiling is only for the
 * production release, not for dev or stage, disregard it").
 *
 * Live stage evidence, 2026-09-22T06:26Z: the clean verification window sat at `dispatches 296 /
 * dispatchLimit 300` and deferred eight captures with `budget_exhausted` - "the daily dispatch ceiling
 * cannot cover the requested candidates" - so the loop starved itself on a ceiling that is a production
 * delivery guard, not a learning guard. The accounting stays (the ledger keeps recording every
 * dispatch); only the refusal is scoped to the channel the ceiling is for.
 */

function tempFile(): { file: string; cleanup: () => void } {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run100-budget-"));
  return {
    file: path.join(dir, "replay-ledger.json"),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("run100 the default ceiling is enforced, so production keeps the delivery guard", () => {
  const { file, cleanup } = tempFile();
  try {
    const ledger = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-22T06:00:00Z"),
      limits: resolveReplayLedgerLimits({
        ROLE_MODEL_REPLAY_DAILY_DISPATCHES: "2",
        ROLE_MODEL_REPLAY_DAILY_COUNTERFACTUALS: "2",
      }),
    });
    expect(ledger.status().enforced).toBe(true);
    expect(
      ledger.reserve({ captureRef: "req-a", policySetDigest: "p", candidateDispatches: 2 }).accepted,
    ).toBe(true);
    const refused = ledger.reserve({
      captureRef: "req-b",
      policySetDigest: "p",
      candidateDispatches: 1,
    });
    expect(refused.accepted).toBe(false);
    if (!refused.accepted) expect(refused.code).toBe("budget_exhausted");
  } finally {
    cleanup();
  }
});

test("run100 an unenforced ceiling records dispatches without refusing them", () => {
  const { file, cleanup } = tempFile();
  try {
    const ledger = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-22T06:00:00Z"),
      limits: {
        ...resolveReplayLedgerLimits({
          ROLE_MODEL_REPLAY_DAILY_DISPATCHES: "2",
          ROLE_MODEL_REPLAY_DAILY_COUNTERFACTUALS: "2",
        }),
        enforced: false,
      },
    });
    expect(ledger.status().enforced).toBe(false);
    expect(
      ledger.reserve({ captureRef: "req-a", policySetDigest: "p", candidateDispatches: 2 }).accepted,
    ).toBe(true);
    const second = ledger.reserve({
      captureRef: "req-b",
      policySetDigest: "p",
      candidateDispatches: 2,
    });
    expect(second.accepted).toBe(true);
    // The ceiling is still measured and reported; it just does not refuse.
    const status = ledger.status();
    expect(status.dispatchLimit).toBe(2);
    expect(status.reservedDispatches).toBe(4);
  } finally {
    cleanup();
  }
});

test("run100 an unenforced ceiling still records every dispatch", () => {
  const { file, cleanup } = tempFile();
  try {
    const ledger = createReplayLedger({
      filePath: file,
      now: () => Date.parse("2026-09-22T06:00:00Z"),
      limits: { dispatchesPerDay: 1, counterfactualsPerDay: 1, enforced: false },
    });
    for (const captureRef of ["req-a", "req-b"]) {
      const reservation = ledger.reserve({
        captureRef,
        policySetDigest: "p",
        candidateDispatches: 1,
      });
      expect(reservation.accepted).toBe(true);
      if (!reservation.accepted) continue;
      expect(
        ledger.record({
          reservationId: reservation.reservationId,
          captureRef,
          policySetDigest: "p",
          counterfactualRef: captureRef,
          dispatchKind: "candidate",
          candidateEndpointId: "endpoint-a",
          attempt: 1,
          costMicros: 0,
          bytes: 0,
          outcome: "complete",
        }).accepted,
      ).toBe(true);
    }
    expect(ledger.entries()).toHaveLength(2);
  } finally {
    cleanup();
  }
});

test("run100 the environment can switch enforcement off without a rebuild", () => {
  expect(
    resolveReplayLedgerLimits({
      ROLE_MODEL_REPLAY_DAILY_DISPATCHES: "2",
      ROLE_MODEL_REPLAY_BUDGET_ENFORCEMENT: "off",
    }),
  ).toEqual({ dispatchesPerDay: 2, enforced: false });
  expect(
    resolveReplayLedgerLimits({
      ROLE_MODEL_REPLAY_DAILY_DISPATCHES: "2",
      ROLE_MODEL_REPLAY_BUDGET_ENFORCEMENT: "on",
    }),
  ).toEqual({ dispatchesPerDay: 2, enforced: true });
  // Nothing configured still resolves to "no override", so the documented defaults hold.
  expect(resolveReplayLedgerLimits({})).toEqual({});
  expect(() =>
    resolveReplayLedgerLimits({ ROLE_MODEL_REPLAY_BUDGET_ENFORCEMENT: "maybe" }),
  ).toThrow(/ROLE_MODEL_REPLAY_BUDGET_ENFORCEMENT/u);
});

test("run100 the shipped policy scopes the ceiling to production", () => {
  expect(replayBudgetEnforcedForChannel(undefined, "production")).toBe(true);
  expect(replayBudgetEnforcedForChannel("production_only", "production")).toBe(true);
  expect(replayBudgetEnforcedForChannel("production_only", "stage")).toBe(false);
  expect(replayBudgetEnforcedForChannel("production_only", "development")).toBe(false);
  expect(replayBudgetEnforcedForChannel("always", "stage")).toBe(true);
  expect(replayBudgetEnforcedForChannel("never", "production")).toBe(false);
});
