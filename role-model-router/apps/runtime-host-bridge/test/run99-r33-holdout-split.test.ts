import { createHash } from "node:crypto";

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
  expect(first.partitions).toEqual(second.partitions);
  expect(first.splitAlgorithm).toBe(SPLIT_ALGORITHM);
  expect(first.splitSeed).toBe(87);
  expect(first.partition).toBe("holdout");
  // Case order never changes the identity: every supplied case is accounted for in the declaration.
  expect([...first.partitions.map((row) => row.caseId)].sort()).toEqual(["case:a", "case:b", "case:c"]);
});

test("run99 R33 D7 two task families never share a holdout identity", () => {
  const review = buildFamilyStratifiedHoldout(base);
  const refactor = buildFamilyStratifiedHoldout({ ...base, taskTypeId: "coder.refactor" });

  expect(review.stratum).toBe("coder.review");
  expect(refactor.stratum).toBe("coder.refactor");
  expect(review.holdoutId).not.toBe(refactor.holdoutId);
  // The *identity* is family-stratified; the membership digest binds the cases, and Evaluation Core
  // recomputes it as `sha256(canonical({partition, caseIds}))` and refuses any other formula.
  expect(review.membershipDigest).toBe(refactor.membershipDigest);
});

/**
 * Run 99 R33 live finding on stage v133: every supervised replay deferred with
 *
 *   `extension evaluation-core failed: evaluation holdout membership digest is not bound to its cases`
 *
 * `evaluation-core` recomputes the membership digest from the durable job and refuses a holdout
 * whose digest it cannot reproduce (`#v3Holdout` -> `digestEvaluationHoldout({ partition, caseIds })`
 * = `sha256:` of the canonical JSON of exactly those two fields). The declared split therefore has
 * to travel *beside* that binding, not inside it.
 */
test("run99 R33 D7 the membership digest is the canonical case binding Evaluation Core recomputes", () => {
  const holdout = buildFamilyStratifiedHoldout(base);
  // Run 99 R33 D7: the digest binds the *holdout* cases (the membership the durable comparison
  // carries), which is the subset the declaration assigns to the holdout partition.
  const canonicalCases = [...holdout.caseIds].sort();
  const canonicalBinding = `sha256:${createHash("sha256")
    .update(JSON.stringify({ caseIds: canonicalCases, partition: "holdout" }))
    .digest("hex")}`;

  expect(holdout.membershipDigest).toBe(canonicalBinding);
  // The declaration travels beside the binding so a receipt reader can rebuild the split.
  expect(holdout.splitAlgorithm).toBe(SPLIT_ALGORITHM);
  expect(holdout.splitSeed).toBe(87);
  expect(holdout.stratum).toBe("coder.review");
});

test("run99 R33 D7 the split fails closed without a request id or cases", () => {
  expect(() => buildFamilyStratifiedHoldout({ ...base, requestId: "" })).toThrow(/request id/i);
  expect(() => buildFamilyStratifiedHoldout({ ...base, caseIds: [] })).toThrow(/evaluation case/i);
});

/**
 * Run 99 R33 (addendum 20 D7, second half): "so the holdout is disjoint *within* each family".
 *
 * The declaration was already family-stratified and reproducible, but every evaluated case was a
 * holdout member — there was no train/holdout *case* split inside a family, so a family's own
 * evidence could never be divided into the two disjoint sets the canonical promotion gate expects.
 * The split is now per case, deterministic from the declared algorithm and seed, and the holdout
 * membership digest binds only the holdout cases.
 */
test("run99 R33 D7 cases inside a family are split into disjoint train and holdout sets", () => {
  const caseIds = Array.from({ length: 12 }, (_, index) => `case:r33:${index}`);
  const holdout = buildFamilyStratifiedHoldout({ ...base, caseIds });

  expect(holdout.splitAlgorithm).toBe(SPLIT_ALGORITHM);
  expect(holdout.partitions).toHaveLength(caseIds.length);
  const train = holdout.partitions.filter((row) => row.partition === "train").map((row) => row.caseId);
  const held = holdout.partitions.filter((row) => row.partition === "holdout").map((row) => row.caseId);

  // Both sets are non-empty and disjoint, and together they are exactly the family's cases.
  expect(held.length).toBeGreaterThan(0);
  expect(train.length).toBeGreaterThan(0);
  expect(held.filter((caseId) => train.includes(caseId))).toEqual([]);
  expect([...held, ...train].sort()).toEqual([...caseIds].sort());
  // `caseIds` is the holdout membership the durable comparison binds.
  expect(holdout.caseIds).toEqual(held);
  expect(holdout.trainCaseIds).toEqual(train);
});

test("run99 R33 D7 the case split is reproducible from its declaration and family-independent", () => {
  const caseIds = Array.from({ length: 12 }, (_, index) => `case:r33:${index}`);
  const first = buildFamilyStratifiedHoldout({ ...base, caseIds });
  // Same declaration, different order: the partition must not depend on arrival order.
  const second = buildFamilyStratifiedHoldout({ ...base, caseIds: [...caseIds].reverse() });
  expect(second.partitions).toEqual(first.partitions);

  // A different family stratifies independently (its own holdout identity and its own membership).
  const other = buildFamilyStratifiedHoldout({ ...base, caseIds, taskTypeId: "coder.edit" });
  expect(other.holdoutId).not.toBe(first.holdoutId);
});
