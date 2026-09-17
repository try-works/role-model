import { describe, expect, test } from "vitest";

import {
  RUN99_HOLDOUT_SPLIT_SEED,
  SPLIT_ALGORITHM,
  buildFamilyStratifiedHoldout,
} from "../src/track-b-holdout-split";

/**
 * Run 98 addendum 32 S1 (`guidance/11`: *"at least one positive and one negative outcome, versioned
 * scorer provenance, and a **disjoint holdout split**"*; `guidance/07`: the promotion protocol fits on
 * development evidence and decides on the holdout): a family's cases must partition into two non-empty,
 * disjoint, digest-stable sets, with the split declaration reproducible from the receipt alone, and the
 * historical holdout identity unchanged.
 */

const split = (caseIds: readonly string[], taskTypeId = "coder.review") =>
  buildFamilyStratifiedHoldout({
    requestId: "request:run98-a32:split",
    taskTypeId,
    caseIds,
    splitSeed: RUN99_HOLDOUT_SPLIT_SEED,
  });

describe("run98 A32 S1 the family split yields development and holdout evidence", () => {
  test("a family with several cases yields two non-empty disjoint partitions", () => {
    const result = split(["case-a", "case-b", "case-c", "case-d", "case-e", "case-f"]);
    expect(result.caseIds.length).toBeGreaterThan(0);
    expect(result.developmentCaseIds.length).toBeGreaterThan(0);
    expect(new Set([...result.caseIds, ...result.developmentCaseIds]).size).toBe(
      result.caseIds.length + result.developmentCaseIds.length,
    );
    expect(result.developmentCaseIds).toEqual(result.trainCaseIds);
    expect(result.partitions.map((row) => row.caseId).sort()).toEqual(
      [...result.caseIds, ...result.developmentCaseIds].sort(),
    );
  });

  test("both memberships are digest-stable and the declaration rebuilds the split", () => {
    const first = split(["case-a", "case-b", "case-c", "case-d"]);
    const second = split(["case-d", "case-c", "case-b", "case-a"]);
    expect(second.membershipDigest).toBe(first.membershipDigest);
    expect(second.developmentMembershipDigest).toBe(first.developmentMembershipDigest);
    expect(second.splitDeclaration).toEqual({
      algorithm: SPLIT_ALGORITHM,
      seed: RUN99_HOLDOUT_SPLIT_SEED,
      stratum: "coder.review",
    });
    expect(second.holdoutId).toBe(first.holdoutId);
  });

  test("the partitions differ per family, so one family's holdout is never another's", () => {
    const cases = ["case-a", "case-b", "case-c", "case-d", "case-e", "case-f", "case-g", "case-h"];
    const review = split(cases, "coder.review");
    const plan = split(cases, "coder.plan");
    expect(plan.holdoutId).not.toBe(review.holdoutId);
  });

  test("a single-case family keeps its case as the holdout, exactly as before", () => {
    const result = split(["only-case"]);
    expect(result.caseIds).toEqual(["only-case"]);
    expect(result.developmentCaseIds).toEqual([]);
  });
});
