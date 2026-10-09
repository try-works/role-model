import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, test } from "vitest";

import {
  LearningDecisionRow,
  formatLearningFloorProgress,
  learningEvidenceFloor,
} from "./learning";

/**
 * Run 104 `SP5` / `R7`, TDD strict.
 *
 * The operator sees the word `insufficient` with no numbers. The readback now publishes, per joined
 * validation receipt, the counts, the effective (decayed) counts and the policy floor they are measured
 * against (`counts`, `effectiveCounts`, `floor`, `floorState`), and this row renders that progress beside
 * the verdict. Absence stays honest: a receipt without a floor says so, and nothing renders a zero the
 * store did not publish.
 */

const NOT_REPORTED = "not reported";
/** Run 108 addendum 03 (`A03-C`): the two honest halves of the old single `receipt_carries_none` sentence. */
const NO_TASK_FAMILY_RECORDED = "no task family was recorded for this comparison";
const noCountsForFamily = (family: string) => `no comparison counts for ${family}`;

const rowFixture = (evidence: Record<string, unknown>) => ({
  decisionId: "decision-req-sp5",
  validationReceiptId: "validation-sp5",
  decision: "validate",
  evidence,
});

describe("run104 sp5 r7: the decision row renders progress against the published floor", () => {
  test("a receipt with counts and a floor renders `n / floor` and the effective count", () => {
    const markup = renderToStaticMarkup(
      <LearningDecisionRow
        receipt
        row={rowFixture({
          verdict: "insufficient_evidence",
          outcome: "insufficient",
          counts: { comparisons: 3, decisive: 2, holdout: 2 },
          effectiveCounts: { decisive: 1.8, holdout: 1.8, development: 0.9 },
          floor: { minDecisiveComparisons: 3, minHoldoutComparisons: 1, minDistinctCaptures: 3 },
          floorState: "reported",
          countsState: "reported",
        })}
      />,
    );
    expect(markup).toContain("2 / 3 decisive");
    expect(markup).toContain("1.8 effective");
    // The recorded verdict keeps its operator word; the numbers sit beside it, not instead of it.
    expect(markup).toContain("insufficient");
  });

  /**
   * Run 108 addendum 03 (`A03-E`, the operator's own rows): the gate refuses on FOUR clauses -
   * `effectiveDecisive >= minDecisive` AND `effectiveHoldout >= minHoldout` AND
   * `effectiveDevelopment >= minDevelopment` AND `distinctCaptures >= minDistinct` - and the line
   * rendered two of them. Measured live, `validation-8c1ea0bf...` is decisive 8 / effectiveDecisive 7.2 /
   * development 0 / holdout 8 / `floorMet` false / `insufficient_evidence` (gate reason
   * `development_partition_missing`): the decisive clause is MET (8 >= 3) and the row was refused on the
   * one dimension the operator could not see. 43 of the 68 family-carrying receipts share that shape.
   */
  test("a decisive-met, development-short receipt renders the dimension that refused it", () => {
    const markup = renderToStaticMarkup(
      <LearningDecisionRow
        receipt
        row={rowFixture({
          verdict: "insufficient_evidence",
          outcome: "insufficient",
          counts: { comparisons: 8, decisive: 8, holdout: 8, development: 0 },
          effectiveCounts: { decisive: 7.2, holdout: 7.2, development: 0 },
          floor: {
            minDecisiveComparisons: 3,
            minHoldoutComparisons: 1,
            minDistinctCaptures: 3,
            minDevelopmentComparisons: 1,
          },
          floorState: "reported",
          countsState: "reported",
        })}
      />,
    );
    expect(markup).toContain("8 / 3 decisive");
    // The refusing clause, beside the one that looks met, with its own floor - not a zero, and not omitted.
    expect(markup).toContain("0 / 1 development");
    expect(markup).toContain("7.2 effective");
    expect(markup).toContain("insufficient");
  });

  test("a receipt whose floor is not published says so instead of rendering a zero", () => {
    const markup = renderToStaticMarkup(
      <LearningDecisionRow
        receipt
        row={rowFixture({
          verdict: "insufficient_evidence",
          counts: { comparisons: 3, decisive: 2, holdout: 2 },
          effectiveCounts: { decisive: 1.8, holdout: 1.8, development: 0.9 },
          floor: null,
          floorState: "not_reported",
          countsState: "reported",
        })}
      />,
    );
    expect(markup).toContain("floor not reported");
    expect(markup).not.toContain("0 /");
    expect(markup).not.toContain("/ 0");
  });

  test("a receipt that carries no counts says so, and says which family it has none for", () => {
    const noFamily = renderToStaticMarkup(
      <LearningDecisionRow
        receipt
        row={rowFixture({
          verdict: "insufficient_evidence",
          counts: null,
          effectiveCounts: null,
          floor: null,
          floorState: "receipt_carries_none",
          countsState: "receipt_carries_none",
        })}
      />,
    );
    expect(noFamily).toContain(NO_TASK_FAMILY_RECORDED);
    expect(noFamily).not.toContain("decisive /");

    /**
     * Run 108 addendum 03 (`A03-C`): the same row with a family the readback published names it, because
     * the operator's question is *what* has no counts - and the answer is not the receipt's to give.
     */
    const named = renderToStaticMarkup(
      <LearningDecisionRow
        receipt
        row={rowFixture({
          verdict: "insufficient_evidence",
          counts: null,
          effectiveCounts: null,
          floor: null,
          floorState: "receipt_carries_none",
          countsState: "receipt_carries_none",
          family: { taskTypeId: "coder.edit", roleId: "coder", taxonomyVersion: "1.0.0-alpha.1" },
        })}
      />,
    );
    expect(named).toContain(noCountsForFamily("coder.edit"));
    expect(named).not.toContain(NO_TASK_FAMILY_RECORDED);
    expect(named).not.toContain("decisive /");
  });
});

describe("run104 sp5 r7: the floor is read from the published activation policy", () => {
  test("the effective policy floors are published numbers", () => {
    expect(
      learningEvidenceFloor({
        effective: {
          minDecisiveComparisons: 3,
          minHoldoutComparisons: 1,
          minDistinctCaptures: 3,
          minDevelopmentComparisons: 1,
        },
      }),
    ).toEqual({ decisive: 3, holdout: 1, distinctCaptures: 3, development: 1 });
  });

  test("a policy that does not publish a floor stays null rather than reading as zero", () => {
    expect(learningEvidenceFloor({ effective: {} })).toEqual({
      decisive: null,
      holdout: null,
      distinctCaptures: null,
      development: null,
    });
    expect(learningEvidenceFloor({})).toEqual({
      decisive: null,
      holdout: null,
      distinctCaptures: null,
      development: null,
    });
  });

  test("progress needs both sides: a missing floor renders the honest placeholder", () => {
    expect(
      formatLearningFloorProgress(
        { decisive: 2, effectiveDecisive: 1.8 },
        { decisive: 3, holdout: 1, distinctCaptures: 3, development: null },
      ),
      // A runtime that does not publish the development clause renders exactly what it rendered before -
      // the fourth dimension appears only when BOTH its sides are published.
    ).toBe("2 / 3 decisive · 1.8 effective");
    expect(
      formatLearningFloorProgress(
        { decisive: 2, effectiveDecisive: null },
        {
          decisive: null,
          holdout: null,
          distinctCaptures: null,
          development: null,
        },
      ),
    ).toBeNull();
    expect(
      formatLearningFloorProgress(
        { decisive: null, effectiveDecisive: null },
        {
          decisive: 3,
          holdout: 1,
          distinctCaptures: 3,
          development: null,
        },
      ),
    ).toBeNull();
  });
});

test("run104 sp5 r7: the evidence page reads the floor from the published policy readback", () => {
  // The summary section's own `learnerEvidence.floor` is written by the durable record; until a producer
  // persists it, the page composes the floor from the policy readback the operator surface already publishes.
  const routeSource = readFileSync(new URL("./learning.tsx", import.meta.url), "utf8");
  expect(routeSource).toContain("fetchLearningPolicy");
  expect(routeSource).toContain("learningEvidenceFloor");
  expect(routeSource).toContain(NOT_REPORTED);
});
