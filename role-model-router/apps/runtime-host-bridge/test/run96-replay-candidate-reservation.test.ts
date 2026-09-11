import { describe, expect, test } from "vitest";

import { resolveReplayCandidateBudgetReservation } from "../src/cli.js";

describe("Run96 F198: supervised replay candidate budget reservations", () => {
  test("every candidate reserves a share that fits inside the single job budget", () => {
    const budget = { maxCostMicros: 500_000, maxBytes: 65_536 };
    for (const candidateCount of [1, 2, 3, 5, 6]) {
      const reservation = resolveReplayCandidateBudgetReservation({
        budget,
        candidateCount,
      });
      expect(reservation.reservedCostMicros * candidateCount).toBeLessThanOrEqual(
        budget.maxCostMicros,
      );
      expect(reservation.reservedBytes * candidateCount).toBeLessThanOrEqual(
        budget.maxBytes,
      );
      expect(reservation.reservedCostMicros).toBeGreaterThanOrEqual(0);
      expect(reservation.reservedBytes).toBeGreaterThanOrEqual(0);
    }
  });

  test("a two-candidate replay does not reserve the whole job budget per candidate", () => {
    const reservation = resolveReplayCandidateBudgetReservation({
      budget: { maxCostMicros: 500_000, maxBytes: 65_536 },
      candidateCount: 2,
    });
    expect(reservation).toEqual({ reservedCostMicros: 250_000, reservedBytes: 32_768 });
  });

  test("an unusable candidate count or budget refuses the reservation", () => {
    expect(() =>
      resolveReplayCandidateBudgetReservation({
        budget: { maxCostMicros: 1, maxBytes: 1 },
        candidateCount: 0,
      }),
    ).toThrow(/candidate count/i);
    expect(() =>
      resolveReplayCandidateBudgetReservation({
        budget: { maxCostMicros: 1, maxBytes: 0 },
        candidateCount: 1,
      }),
    ).toThrow(/bounded replay budget/i);
  });
});
