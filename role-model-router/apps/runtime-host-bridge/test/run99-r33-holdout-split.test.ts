import { expect, test } from "vitest";

import { buildFamilyStratifiedHoldout, SPLIT_ALGORITHM } from "../src/track-b-holdout-split.js";

/**
 * Run 99 R33 (addendum 20 D7): the holdout is a declared, deterministic, family-stratified split —
 * the canonical `stratified_hash_partition_v1` with a recorded seed and stratum — so a replay can
 * rebuild the identity from the declaration and two families never share one.
 */

const base = {
  requestId: "req-r33-holdout",
  taskTypeId: "coder.review",
  caseIds: ["case:b", "case:a", "case:c"],
  splitSeed: 87,
};

test("run99 R33 D7 the split is reproducible from its declaration", () => {
  const first = buildFamilyStratifiedHoldout(base);
  const second = buildFamilyStratifiedHoldout({ ...base, caseIds: ["case:c", "case:a", "case:b"] });

  expect(first.holdoutId).toBe(second.holdoutId);
  expect(first.membershipDigest).toBe(second.membershipDigest);
  expect(first.splitAlgorithm).toBe(SPLIT_ALGORITHM);
  expect(first.splitSeed).toBe(87);
  expect(first.partition).toBe("holdout");
  // Case order never changes the identity: the membership is sorted and deduplicated.
  expect(first.caseIds).toEqual(["case:a", "case:b", "case:c"]);
});

test("run99 R33 D7 two task families never share a holdout identity", () => {
  const review = buildFamilyStratifiedHoldout(base);
  const refactor = buildFamilyStratifiedHoldout({ ...base, taskTypeId: "coder.refactor" });

  expect(review.stratum).toBe("coder.review");
  expect(refactor.stratum).toBe("coder.refactor");
  expect(review.holdoutId).not.toBe(refactor.holdoutId);
  expect(review.membershipDigest).not.toBe(refactor.membershipDigest);
});

test("run99 R33 D7 the split fails closed without a request id or cases", () => {
  expect(() => buildFamilyStratifiedHoldout({ ...base, requestId: "" })).toThrow(/request id/i);
  expect(() => buildFamilyStratifiedHoldout({ ...base, caseIds: [] })).toThrow(/evaluation case/i);
});
