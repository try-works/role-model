import { expect, test } from "vitest";

import { collectStrandedCandidates } from "../src/learner-revalidation.js";

/**
 * Live finding (isolated production-learning verification, 2026-10-15): a producer that reads only the newest
 * page repeats the defect class this run has already fixed twice elsewhere. Measured on the isolated store: of
 * 51 stranded shadow candidates only 21 were inside the newest 64, so a single no-cursor listing would MISS 30
 * of them and still report a clean pass.
 */
const page = (rows: readonly Record<string, unknown>[]) => rows;

test("the walk pages past the first page instead of missing older stranded candidates", async () => {
  const first = Array.from({ length: 4 }, (_, i) => ({
    candidateId: `c-${i}`,
    createdAtMs: 1000 - i,
  }));
  const second = Array.from({ length: 2 }, (_, i) => ({
    candidateId: `old-${i}`,
    createdAtMs: 900 - i,
  }));
  const pages: (readonly Record<string, unknown>[])[] = [page(first), page(second)];
  const readPage = async () => pages.shift() ?? [];

  const collected = await collectStrandedCandidates({ readPage, pageSize: 4, maxPages: 5 });
  expect(collected.map((row) => row.candidateId)).toEqual(["c-0", "c-1", "c-2", "c-3", "old-0", "old-1"]);
});

test("a full page advances the cursor; a short page ends the walk", async () => {
  const cursors: unknown[] = [];
  const pages = [
    page([{ candidateId: "a", createdAtMs: 10 }, { candidateId: "b", createdAtMs: 9 }]),
    page([{ candidateId: "c", createdAtMs: 8 }]),
  ];
  const collected = await collectStrandedCandidates({
    readPage: async (cursor) => {
      cursors.push(cursor);
      return pages.shift() ?? [];
    },
    pageSize: 2,
    maxPages: 5,
  });

  expect(collected).toHaveLength(3);
  // First call has no cursor; the second resumes after the last row of the full page.
  expect(cursors[0]).toBeNull();
  expect(cursors[1]).toEqual({ afterCreatedAtMs: 9, afterCandidateId: "b" });
  // The short second page ends the walk, so there is no third call.
  expect(cursors).toHaveLength(2);
});

test("the walk is bounded and never returns a candidate twice", async () => {
  let calls = 0;
  const collected = await collectStrandedCandidates({
    readPage: async () => {
      calls += 1;
      return [
        { candidateId: "dup", createdAtMs: 5 },
        { candidateId: "dup", createdAtMs: 5 },
      ];
    },
    pageSize: 2,
    maxPages: 3,
  });

  expect(calls).toBe(3);
  expect(collected.map((row) => row.candidateId)).toEqual(["dup"]);
});
