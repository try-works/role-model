import { expect, test } from "vitest";

import { hasVerifiableSemanticCriteria } from "../src/track-b-runtime.js";

/**
 * Run 97 RC04 (L4 tail).
 *
 * Live evidence: the automatic criteria derived from a real request were
 * `requiredTerms: ["hey"]`. That dimension cannot discriminate two branches - both
 * score 0 - and when it does fire it fires at random, which turned a judge-decided
 * counterfactual into `disagreement` instead of `candidate` and so closed the shadow
 * learning gate.
 *
 * Canonical basis: `guidance/05_background_evidence_scheduler.md` selects scorers from
 * case metadata (`expectedTextAvailable`, `baselineCandidateComparison`,
 * `expectedSchemaAvailable`, `contextRefs`); a criterion that carries no task
 * requirement is not a scorer input, and the comparison keeps the router-judge
 * dimension instead.
 */

test("run97 rc04 greeting-only criteria are not verifiable evaluation evidence", () => {
  expect(
    hasVerifiableSemanticCriteria({
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["hey"],
    }),
  ).toBe(false);
  expect(
    hasVerifiableSemanticCriteria({
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["ok", "thanks", "please"],
    }),
  ).toBe(false);
  // Criteria that cannot even be normalized are not scorer evidence either.
  expect(hasVerifiableSemanticCriteria({ requiredTerms: ["hey"] })).toBe(false);
  expect(hasVerifiableSemanticCriteria(null)).toBe(false);
});

test("run97 rc04 task-bearing criteria stay verifiable evidence", () => {
  expect(
    hasVerifiableSemanticCriteria({
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["expected-route"],
    }),
  ).toBe(true);
  expect(
    hasVerifiableSemanticCriteria({
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["hey"],
      forbiddenTerms: ["deprecated-api"],
    }),
  ).toBe(true);
  expect(
    hasVerifiableSemanticCriteria({
      schemaVersion: "role-model.semantic-criteria.v1",
      requiredTerms: ["fix the failing test"],
    }),
  ).toBe(true);
});
