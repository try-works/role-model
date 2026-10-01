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
});
