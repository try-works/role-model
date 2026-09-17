import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";

import {
  DEFAULT_POSITION_CONSISTENCY_FLOOR,
  MIN_POSITION_CONSISTENCY_CHECKS,
  createJudgeConsistencyLedger,
  evaluateJudgePositionConsistency,
} from "../src/track-b-judge-consistency";

/**
 * Run 98 addendum 33 S2 (the research's Shi et al. recommendation: "log **position consistency** per
 * judge as a first-class metric. A judge whose consistency is near chance should be excluded from
 * promotion evidence entirely").
 *
 * The per-pair flip is already measured (dual_order, addendum 30 S4) and, since S2, calibrated rather than
 * discarded. This ledger is the aggregate: durable per-judge counts, so "this judge contradicts itself
 * under a swapped presentation" is a measurement the learner and the operator can read.
 */

const withLedger = (run: (ledgerPath: string) => void) => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run98-a33-consistency-"));
  try {
    run(path.join(root, "judge-consistency.json"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

describe("run98 A33 S2 judge position consistency", () => {
  test("counts order checks and disagreements per judge and derives consistency", () => {
    withLedger((ledgerPath) => {
      const ledger = createJudgeConsistencyLedger({ filePath: ledgerPath });
      for (let index = 0; index < 9; index += 1) {
        ledger.record({
          judgeEndpointId: "endpoint:judge-a",
          judgeMode: "identity_blind",
          orderCheck: true,
          orderDisagreement: index === 0,
          modeCheck: true,
          modeAgreement: index !== 0,
        });
      }
      ledger.record({ judgeEndpointId: "endpoint:judge-b", orderCheck: true, orderDisagreement: true });
      const summary = ledger.summary();
      expect(summary.find((row) => row.judgeEndpointId === "endpoint:judge-a")).toMatchObject({
        orderChecks: 9,
        orderDisagreements: 1,
        consistency: 0.8889,
        judgeModeChecks: 9,
        judgeModeAgreements: 8,
      });
      expect(summary.find((row) => row.judgeEndpointId === "endpoint:judge-b")).toMatchObject({
        orderChecks: 1,
        orderDisagreements: 1,
        consistency: 0,
      });
    });
  });

  test("the ledger is durable and bounded per judge", () => {
    withLedger((ledgerPath) => {
      const first = createJudgeConsistencyLedger({ filePath: ledgerPath });
      first.record({ judgeEndpointId: "endpoint:judge-a", orderCheck: true });
      first.record({ judgeEndpointId: "endpoint:judge-a", orderCheck: true, orderDisagreement: true });
      const reopened = createJudgeConsistencyLedger({ filePath: ledgerPath });
      expect(reopened.summary("endpoint:judge-a")).toMatchObject([
        { orderChecks: 2, orderDisagreements: 1, consistency: 0.5 },
      ]);
      expect(JSON.parse(readFileSync(ledgerPath, "utf8")).schemaVersion).toBe(
        "role-model.judge-position-consistency.v1",
      );
    });
  });

  test("a judge measured below the floor is refused, but only once the sample is sufficient", () => {
    const chance = evaluateJudgePositionConsistency({
      row: { orderChecks: 20, orderDisagreements: 11 },
      floor: DEFAULT_POSITION_CONSISTENCY_FLOOR,
    });
    expect(chance.belowFloor).toBe(true);
    expect(chance.sufficientSample).toBe(true);
    expect(chance.consistency).toBeCloseTo(0.45, 4);

    const precise = evaluateJudgePositionConsistency({
      row: { orderChecks: 40, orderDisagreements: 2 },
      floor: DEFAULT_POSITION_CONSISTENCY_FLOOR,
    });
    expect(precise.belowFloor).toBe(false);

    const thin = evaluateJudgePositionConsistency({
      row: { orderChecks: MIN_POSITION_CONSISTENCY_CHECKS - 1, orderDisagreements: 4 },
      floor: DEFAULT_POSITION_CONSISTENCY_FLOOR,
    });
    expect(thin.sufficientSample).toBe(false);
    expect(thin.belowFloor).toBe(false);

    const empty = evaluateJudgePositionConsistency({ row: null, floor: DEFAULT_POSITION_CONSISTENCY_FLOOR });
    expect(empty).toEqual({
      consistency: null,
      checks: 0,
      sufficientSample: false,
      belowFloor: false,
    });
  });
});
