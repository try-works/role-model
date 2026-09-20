import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { runAutoReplayTick } from "../src/track-b-auto-replay.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

/**
 * Run 98 addendum 52 — the leak addendum 48 §11.2 pinned.
 *
 * Live on v287 the replay ledger held `reservedCounterfactuals=7`, `reservedDispatches=13` while no tick was in
 * flight; on v294 the same read is `9`/`18`, and the ledger file shows the reservations belong to runs that no
 * longer exist (every window keeps them: 09-13 = 16, 09-16 = 27, 09-18 = 77, 09-20 = 8). A reservation is held
 * for the duration of one dispatch, so anything older than the tick bound is a reservation whose process is
 * gone; nothing reconciled them, and at the documented production ceilings (100/300) the accumulation would
 * exhaust the day.
 */
const base = Date.parse("2026-09-12T06:00:00Z");
const policySetDigest = buildReplayPolicySet().policySetDigest;

function tempLedger(now: () => number) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run98-a52-"));
  const filePath = path.join(dir, "ledger.json");
  return {
    ledger: createReplayLedger({ filePath, now }),
    filePath,
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

test("a reservation from a finished run is reconciled on the next tick", async () => {
  let clock = base;
  const { ledger, cleanup } = tempLedger(() => clock);
  try {
    const reservation = ledger.reserve({
      captureRef: "req-orphan",
      policySetDigest,
      candidateDispatches: 3,
    });
    expect(reservation.accepted).toBe(true);
    expect(ledger.status()).toMatchObject({
      reservedCounterfactuals: 1,
      reservedDispatches: 3,
    });

    // A later tick, four hours on: the process that reserved `req-orphan` is long gone.
    clock = base + 4 * 60 * 60 * 1000;
    await runAutoReplayTick({
      captures: [],
      configuredEndpointIds: ["endpoint-a", "endpoint-b"],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async () => ({ terminal: true, branches: [] }),
      now: () => clock,
    });

    expect(ledger.status()).toMatchObject({
      reservedCounterfactuals: 0,
      reservedDispatches: 0,
    });
  } finally {
    cleanup();
  }
});

test("a failed replay leaves the window's reserved counters unchanged", async () => {
  let clock = base;
  const { ledger, cleanup } = tempLedger(() => clock);
  try {
    const result = await runAutoReplayTick({
      captures: [
        { captureRef: "req-fails", sourceEndpointId: "endpoint-a", hasRecordedToolResults: true },
      ],
      configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
      ledger,
      policySet: buildReplayPolicySet(),
      executor: async () => {
        throw new Error("replay executor failed");
      },
      now: () => clock,
    });

    expect(result.deferred).toBe(1);
    expect(result.dispositions[0]?.code).toBe("replay_failed");
    expect(ledger.status()).toMatchObject({
      reservedCounterfactuals: 0,
      reservedDispatches: 0,
    });
  } finally {
    cleanup();
  }
});

test("a reservation made before midnight is released after it", () => {
  let clock = Date.parse("2026-09-12T23:59:00Z");
  const { ledger, filePath, cleanup } = tempLedger(() => clock);
  try {
    const reservation = ledger.reserve({
      captureRef: "req-midnight",
      policySetDigest,
      candidateDispatches: 2,
    });
    expect(reservation.accepted).toBe(true);

    clock = Date.parse("2026-09-13T00:01:00Z");
    ledger.release(reservation.accepted ? reservation.reservationId : "");

    const file = JSON.parse(readFileSync(filePath, "utf8")) as {
      windows: Record<string, { reservations: unknown[] }>;
    };
    expect(file.windows["2026-09-12"]?.reservations ?? []).toHaveLength(0);
    expect(ledger.status().reservedCounterfactuals).toBe(0);
  } finally {
    cleanup();
  }
});
