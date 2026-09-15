import { describe, expect, test } from "vitest";

import { validatePolicyDraft, type LearningPolicyField } from "./learning-api";

/**
 * Run 98 R17 (AC-R17-03a/04): the Configuration page renders whatever the R15 schema
 * publishes and refuses drafts that violate its bounds or edit a read-only field, before
 * anything reaches the server (which repeats the same validation).
 */

const field = (input: Partial<LearningPolicyField> & { name: string }): LearningPolicyField => ({
  type: "number",
  unit: "",
  default: 0,
  uiEditable: true,
  description: `${input.name} description`,
  value: 0,
  ...input,
});

const fields: readonly LearningPolicyField[] = [
  field({ name: "minAdvisoryConfidence", min: 0.5, max: 1, value: 0.7, default: 0.7 }),
  field({ name: "minDecisiveComparisons", type: "integer", min: 1, max: 100, value: 3, default: 3 }),
  field({ name: "promotionAnalysisMethod", type: "enum", values: ["paired_cluster_bootstrap"], value: "paired_cluster_bootstrap", default: "paired_cluster_bootstrap", uiEditable: false }),
  field({ name: "stage", type: "enum", values: ["S0", "S1", "S2", "S3", "S4"], value: "S1", default: "S1" }),
  field({ name: "cohortLadder", type: "percent-list", value: [10, 25, 50, 100], default: [10, 25, 50, 100] }),
];

describe("learning policy draft validation", () => {
  test("accepts an in-bounds change and reports only the changed field", () => {
    const result = validatePolicyDraft(fields, { minAdvisoryConfidence: 0.75 });
    expect(result.errors).toEqual({});
    expect(result.changes).toEqual({ minAdvisoryConfidence: 0.75 });
  });

  test("refuses out-of-range, wrong-type and fractional-integer values", () => {
    expect(validatePolicyDraft(fields, { minAdvisoryConfidence: 1.4 }).errors.minAdvisoryConfidence).toMatch(/at most 1/);
    expect(validatePolicyDraft(fields, { minAdvisoryConfidence: 0.2 }).errors.minAdvisoryConfidence).toMatch(/at least 0.5/);
    expect(validatePolicyDraft(fields, { minDecisiveComparisons: 2.5 }).errors.minDecisiveComparisons).toMatch(/integer/);
    expect(validatePolicyDraft(fields, { minAdvisoryConfidence: "many" }).errors.minAdvisoryConfidence).toMatch(/number/);
  });

  test("refuses read-only fields and unknown fields", () => {
    expect(validatePolicyDraft(fields, { promotionAnalysisMethod: "none" }).errors.promotionAnalysisMethod).toMatch(/read-only/);
    expect(validatePolicyDraft(fields, { brandNewParameter: 1 }).errors.brandNewParameter).toMatch(/unknown field/);
  });

  test("validates enum values and the monotone percentage ladder", () => {
    expect(validatePolicyDraft(fields, { stage: "S3" }).changes).toEqual({ stage: "S3" });
    expect(validatePolicyDraft(fields, { stage: "S9" }).errors.stage).toMatch(/must be one of/);
    expect(validatePolicyDraft(fields, { cohortLadder: [10, 25, 50, 100] }).changes).toEqual({});
    expect(validatePolicyDraft(fields, { cohortLadder: [25, 10, 50, 100] }).errors.cohortLadder).toMatch(/non-decreasing/);
    expect(validatePolicyDraft(fields, { cohortLadder: [5, 25] }).errors.cohortLadder).toMatch(/10-100/);
  });

  test("does not report unchanged values as changes", () => {
    const result = validatePolicyDraft(fields, {
      minAdvisoryConfidence: 0.7,
      minDecisiveComparisons: 3,
      stage: "S1",
      cohortLadder: [10, 25, 50, 100],
    });
    expect(result.errors).toEqual({});
    expect(result.changes).toEqual({});
  });
});
