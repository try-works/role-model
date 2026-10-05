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
const RECEIPT_CARRIES_NO_COUNTS = "the receipt carries no comparison counts";

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

  test("a receipt that carries no counts keeps saying so", () => {
    const markup = renderToStaticMarkup(
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
    expect(markup).toContain(RECEIPT_CARRIES_NO_COUNTS);
    expect(markup).not.toContain("decisive /");
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
        },
      }),
    ).toEqual({ decisive: 3, holdout: 1, distinctCaptures: 3 });
  });

  test("a policy that does not publish a floor stays null rather than reading as zero", () => {
    expect(learningEvidenceFloor({ effective: {} })).toEqual({
      decisive: null,
      holdout: null,
      distinctCaptures: null,
    });
    expect(learningEvidenceFloor({})).toEqual({
      decisive: null,
      holdout: null,
      distinctCaptures: null,
    });
  });

  test("progress needs both sides: a missing floor renders the honest placeholder", () => {
    expect(
      formatLearningFloorProgress(
        { decisive: 2, effectiveDecisive: 1.8 },
        { decisive: 3, holdout: 1, distinctCaptures: 3 },
      ),
    ).toBe("2 / 3 decisive · 1.8 effective");
    expect(
      formatLearningFloorProgress(
        { decisive: 2, effectiveDecisive: null },
        {
          decisive: null,
          holdout: null,
          distinctCaptures: null,
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
