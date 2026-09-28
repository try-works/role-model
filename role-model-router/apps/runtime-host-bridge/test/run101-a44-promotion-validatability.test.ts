import { expect, test } from "vitest";

import { classifyLearnerPromotionResult } from "../src/cli.js";

/**
 * Run 101 addendum 44 - a promotion job that cannot validate its own candidate must say so by name, and
 * must not consume a different candidate's work.
 *
 * Measured live on `:3457` (RC `5bbc968a`): the `learner.promote` plane holds one terminal failure
 *
 *   id        learner.promote:shadow-70e04977e77f5ecbca32e6cae98afdf4d5
 *   attempts  3 (exhausted)
 *   updated   2026-09-28T04:48:15Z
 *   failure   Error: no candidate was validated for shadow-70e04977e77f5ecbca32e6cae98afdf4d5f0...
 *
 * Two things are wrong with that, and this file pins both:
 *
 * 1. **The work was not scoped to the job.** `promoteHandler` called
 *    `learnFromUnconsumedCandidates({ limit: 1 })` - no candidate filter - and the sweep ignores `limit`,
 *    processing `pending.slice(0, 2)` from its own cursor page. So a per-candidate job could consume
 *    *another* candidate's work, or report failure for a candidate the sweep never looked at.
 * 2. **The name was misleading.** "no candidate was validated" reads as *this candidate failed
 *    validation*, while what actually happened is that no finalized comparison was available to validate
 *    - the class this run has repeatedly had to name so it can be counted.
 *
 * The observable class is unchanged (a job that cannot validate stays claimable and retries, which R6
 * asks for); what changes is that the reason now names the condition.
 */

test("run101 a promotion that consumed its candidate reports the promotion", () => {
  expect(
    classifyLearnerPromotionResult({ candidateId: "shadow-abc", result: { consumed: 1 } }),
  ).toEqual({
    kind: "promoted",
  });
});

test("run101 a promotion with nothing to validate names the condition, scoped to its own candidate", () => {
  const outcome = classifyLearnerPromotionResult({
    candidateId: "shadow-70e04977e77f5ecbca32e6cae98afdf4d5f0cc939dab078a4d4e69a4d2a3026b",
    result: { consumed: 0 },
  });

  expect(outcome.kind).toBe("not_validatable");
  expect(outcome.kind === "not_validatable" ? outcome.reason : "").toContain(
    "candidate_not_validatable",
  );
  expect(outcome.kind === "not_validatable" ? outcome.reason : "").toContain("shadow-70e04977");
  // The misleading phrasing must be gone: it claimed a validation verdict the sweep never reached.
  expect(outcome.kind === "not_validatable" ? outcome.reason : "").not.toContain(
    "no candidate was validated for",
  );
});

test("run101 a missing sweep result is the same named condition, not a crash", () => {
  expect(classifyLearnerPromotionResult({ candidateId: "shadow-abc", result: null }).kind).toBe(
    "not_validatable",
  );
  expect(
    classifyLearnerPromotionResult({ candidateId: "shadow-abc", result: undefined }).kind,
  ).toBe("not_validatable");
  expect(classifyLearnerPromotionResult({ candidateId: "shadow-abc", result: {} }).kind).toBe(
    "not_validatable",
  );
});
