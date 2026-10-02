import { expect, test } from "vitest";

import { learningEvidenceJoinNote, learningPackScopeNote } from "./learning";

/**
 * Run 104 R22 (`R22-A3`), TDD strict - a degraded evidence join is named, not silently rendered as
 * absence.
 *
 * Measured live on the stage runtime (`:3457`, `stage-rc-43ccd509916f`): the Decisions page rendered
 * `not reported` in every column for a page of 100 rows, because the evidence join that fills those
 * columns had not finished. The readback has published `evidenceJoin` since addendum 48, but nothing
 * rendered it, so "the read failed" and "the runtime recorded nothing" looked identical to the operator.
 */

test("R22-A3: a read that could not reach the comparison store says so", () => {
  const note = learningEvidenceJoinNote({
    evidenceJoin: {
      requestedGroups: 12,
      resolvedGroups: 0,
      requests: 1,
      truncated: false,
      unavailable: true,
    },
  });
  expect(note).toContain("could not be read");
  expect(note).toContain("not an absent decision");
});

test("R22-A3: a candidate listing that did not answer says so", () => {
  const unavailable = learningEvidenceJoinNote({
    evidenceJoin: {
      requestedGroups: 0,
      resolvedGroups: 0,
      requests: 0,
      truncated: false,
      unavailable: false,
      candidateJoin: {
        requestedCandidates: 100,
        resolvedCandidates: 0,
        failed: false,
        unavailable: true,
      },
    },
  });
  expect(unavailable).toContain("candidate listing did not answer");

  const failed = learningEvidenceJoinNote({
    evidenceJoin: {
      requestedGroups: 0,
      resolvedGroups: 0,
      requests: 1,
      truncated: false,
      unavailable: false,
      candidateJoin: {
        requestedCandidates: 100,
        resolvedCandidates: 0,
        failed: true,
        unavailable: false,
      },
    },
  });
  expect(failed).toContain("candidate listing did not answer");
});

test("R22-A3: an unfinished walk is reported with what it did resolve", () => {
  const note = learningEvidenceJoinNote({
    evidenceJoin: {
      requestedGroups: 80,
      resolvedGroups: 16,
      requests: 2,
      truncated: true,
      unavailable: false,
      candidateJoin: {
        requestedCandidates: 80,
        resolvedCandidates: 80,
        failed: false,
        unavailable: false,
      },
    },
  });
  expect(note).toContain("incomplete");
  expect(note).toContain("16 of 80");
  expect(note).toContain("the runtime recorded them");
});

test("R22-A3: a shortfall is reported even when the walk did not flag itself truncated", () => {
  const note = learningEvidenceJoinNote({
    evidenceJoin: {
      requestedGroups: 40,
      resolvedGroups: 39,
      requests: 1,
      truncated: false,
      unavailable: false,
    },
  });
  expect(note).toContain("incomplete");
});

test("R22-A3: a candidate walk that matched nothing says so", () => {
  const note = learningEvidenceJoinNote({
    evidenceJoin: {
      requestedGroups: 0,
      resolvedGroups: 0,
      requests: 0,
      truncated: false,
      unavailable: false,
      candidateJoin: {
        requestedCandidates: 64,
        resolvedCandidates: 0,
        exhausted: true,
        failed: false,
        unavailable: false,
      },
    },
  });
  expect(note).toContain("no candidate record matched");
});

test("R22-A3: a complete read renders no note at all", () => {
  expect(
    learningEvidenceJoinNote({
      evidenceJoin: {
        requestedGroups: 80,
        resolvedGroups: 80,
        requests: 10,
        truncated: false,
        unavailable: false,
        candidateJoin: {
          requestedCandidates: 80,
          resolvedCandidates: 80,
          exhausted: true,
          failed: false,
          unavailable: false,
        },
      },
    }),
  ).toBeNull();
});

test("R22-A3: a readback that carries no join report renders nothing rather than an empty note", () => {
  expect(learningEvidenceJoinNote({})).toBeNull();
  expect(learningEvidenceJoinNote({ decisions: [] })).toBeNull();
});

/**
 * Run 104 R22 (`R22-B3`): the Packs page says how many rows are scope-wide and why.
 *
 * Measured live: 27 of 40 packs were endpoint-id-only, and every one of them came from the replay
 * comparison path, which dropped the capture's declared classification before the candidate was derived.
 * The per-row `scope-wide` label is correct but silent about the pattern.
 */
test("R22-B3: a page of scope-wide packs explains the count", () => {
  const note = learningPackScopeNote([
    { scope: { roleId: "writer", taskTypeId: "coder.review", scopeWide: false } },
    { scope: { scopeWide: true } },
    { record: { scope: { endpointId: "endpoint:x" } }, scope: { scopeWide: true } },
  ]);
  expect(note).toContain("2 of 3");
  expect(note).toContain("scope-wide");
  expect(note).toContain("no role or task could be resolved");
});

test("R22-B3: a record whose own scope is wide also counts", () => {
  const note = learningPackScopeNote([
    { record: { scope: { scopeWide: true } } },
    { scope: { roleId: "coder" } },
  ]);
  expect(note).toContain("1 of 2");
});

test("R22-B3: a page where every pack names a scope renders no note", () => {
  expect(
    learningPackScopeNote([
      { scope: { roleId: "writer", taskTypeId: "coder.review", scopeWide: false } },
      { scope: { roleId: "coder", scopeWide: false } },
    ]),
  ).toBeNull();
});

test("R22-B3: an empty page renders no note", () => {
  expect(learningPackScopeNote([])).toBeNull();
});
