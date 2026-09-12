import { expect, test } from "vitest";

import { deriveSemanticEvaluationCriteria } from "../src/track-b-replay-evaluation-criteria.js";

test("run97 derives schema-valid semantic criteria from the recorded source output", () => {
  const derived = deriveSemanticEvaluationCriteria({
    sourceOutput:
      "Router replay keeps the shared prefix and appends a counterfactual branch for evaluation.",
  });
  expect(derived).not.toBeNull();
  expect(derived?.criteria.schemaVersion).toBe("role-model.semantic-criteria.v1");
  expect(derived?.criteria.requiredTerms.length).toBeGreaterThan(0);
  expect(derived?.criteria.requiredTerms.length).toBeLessThanOrEqual(3);
  expect(new Set(derived?.criteria.requiredTerms).size).toBe(
    derived?.criteria.requiredTerms.length,
  );
  for (const term of derived?.criteria.requiredTerms ?? []) {
    expect(term).toBe(term.toLowerCase());
    expect(term.length).toBeGreaterThanOrEqual(4);
  }
  expect(derived?.criteria.minOutputChars).toBe(1);
});

test("run97 criteria derivation is deterministic and ignores stopwords and punctuation", () => {
  const first = deriveSemanticEvaluationCriteria({
    sourceOutput: "The counterfactual branch, the branch! Evaluation evaluates both.",
  });
  const second = deriveSemanticEvaluationCriteria({
    sourceOutput: "The counterfactual branch, the branch! Evaluation evaluates both.",
  });
  expect(first?.criteria).toEqual(second?.criteria);
  expect(first?.criteria.requiredTerms).toEqual(["counterfactual", "branch", "evaluation"]);
});

test("run97 criteria derivation declines unusable output instead of inventing terms", () => {
  expect(deriveSemanticEvaluationCriteria({ sourceOutput: "   " })).toBeNull();
  expect(deriveSemanticEvaluationCriteria({ sourceOutput: "a b c d e" })).toBeNull();
  expect(deriveSemanticEvaluationCriteria({ sourceOutput: "!!! ??? ---" })).toBeNull();
});
