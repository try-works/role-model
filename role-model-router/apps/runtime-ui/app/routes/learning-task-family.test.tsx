import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, test } from "vitest";

import { LearningDecisionRow, learningTaskCell } from "./learning";

/**
 * Run 104 `R6` / `SP4` - the `Recent decisions` table renders the task family the classification
 * computed, using published values only: a row that published a family shows it, a row that published
 * none says so instead of inventing one, and a task variant that travelled with the classification is
 * rendered next to the family.
 */
const markupFor = (row: Record<string, unknown>): string =>
  renderToStaticMarkup(<LearningDecisionRow row={row} />);

describe("run104 R6 Recent decisions task family", () => {
  test("renders the task family the readback published", () => {
    const cell = learningTaskCell({
      decisionId: "decision-req-104",
      taskTypeId: "data.quality.audit",
      roleId: "data",
      taxonomyVersion: "taxonomy-v1-alpha.1",
    });
    expect(cell.task).toBe("data.quality.audit");

    const markup = markupFor({
      decisionId: "decision-req-104",
      taskTypeId: "data.quality.audit",
      roleId: "data",
      taxonomyVersion: "taxonomy-v1-alpha.1",
    });
    expect(markup).toContain("data.quality.audit");
  });

  test("an unpublished family reads as an honest placeholder, not an invented one", () => {
    const markup = markupFor({
      decisionId: "decision-req-104-unreported",
      taskTypeId: null,
      requestTaskTypeId: null,
      roleId: null,
      taxonomyVersion: null,
    });
    expect(markup).toContain("not reported");
    expect(markup).not.toContain("data.quality.audit");
  });

  test("renders the task variant when it travelled with the classification", () => {
    const markup = markupFor({
      decisionId: "decision-req-104-variant",
      taskTypeId: "data.quality.audit",
      classification: { taskTypeId: "data.quality.audit", taskVariant: "audit" },
    });
    expect(markup).toContain("variant audit");
  });

  /**
   * Run 108 addendum 03 (`A03-B`, operator-reported): the live panel printed `not reported` for a row whose
   * comparison group already carried `comparability.taskTypeId: "coder.edit"`, and the host readback now
   * republishes the joined receipt's family as the additive `evidence.family`. The row below declares no
   * `classification`, no `requestTaskTypeId` and no `taskTypeId` - the live shape - so the only family it
   * has is the one the readback published, and that is what must render.
   */
  test("renders the family the readback published when the row declares none of its own", () => {
    const row = {
      decisionId: "decision-req-108-a03",
      taskTypeId: null,
      requestTaskTypeId: null,
      roleId: null,
      taxonomyVersion: null,
      evidence: {
        counts: null,
        countsState: "receipt_carries_none",
        family: { taskTypeId: "coder.edit", roleId: "coder", taxonomyVersion: "1.0.0-alpha.1" },
      },
    };
    const cell = learningTaskCell(row);
    expect(cell.task).toBe("coder.edit");
    expect(cell.scope).toBe("coder · taxonomy 1.0.0-alpha.1");

    const markup = markupFor(row);
    expect(markup).toContain("coder.edit");
    expect(markup).toContain("coder · taxonomy 1.0.0-alpha.1");
  });
});
