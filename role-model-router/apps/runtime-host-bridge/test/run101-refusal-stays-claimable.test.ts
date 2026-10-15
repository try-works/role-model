import { readFileSync } from "node:fs";

import { expect, test } from "vitest";

/**
 * Live finding (isolated production-learning verification, 2026-10-15): the learner sweep excluded work with
 * "the store has no receipt for this candidate". A refusal receipt (decision insufficient_evidence) counted
 * like a success, so a candidate declined while its family evidence was thin was retired permanently - 62
 * candidates sat at decisive 50-59 / development 23 / distinctCaptures 9-10 against floors of 3/1/3 and were
 * never re-examined.
 *
 * This pins the selection half: the recorded-receipt predicate must return null (i.e. leave the candidate
 * claimable) for a refusal, and the promotion accounting must count only a validate verdict as consumed.
 * Both halves are required - making a refusal claimable without fixing the accounting would report a false
 * promotion and drop the candidate when its queue job completed.
 */
const source = readFileSync(new URL("../src/cli.ts", import.meta.url), "utf8");

test("run101 a refusal receipt leaves the candidate claimable for revalidation", () => {
  const start = source.indexOf("const recordedCandidateIds = new Set(");
  const end = source.indexOf(".filter((value): value is string => value !== null);", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const predicate = source.slice(start, end);

  // The decision is read from the receipt row and a refusal is excluded from the "already validated" set.
  expect(predicate).toContain("parsed.decision");
  expect(predicate).toContain('decision === "insufficient_evidence" ? null : candidateId');
});

test("run101 only a validate verdict counts as a consumed promotion", () => {
  const anchor = source.indexOf('if (receipt.decision === "validate") consumed += 1;');
  expect(anchor).toBeGreaterThan(-1);
  // A refusal is counted separately instead of inflating the promotion count.
  expect(source.slice(anchor, anchor + 120)).toContain("refused += 1;");
});
