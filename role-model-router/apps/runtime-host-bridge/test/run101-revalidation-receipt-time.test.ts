import { expect, test } from "vitest";

import { learnerReceiptTimeMs } from "../src/learner-revalidation.js";

/**
 * Live finding (isolated production-learning verification, 2026-10-15): the producer picked ZERO candidates on a
 * store holding 31 stranded ones. The cause was the time source, not the rule.
 *
 * `knowledge:list-learning` projects {recordId, kind, state, scopeId, record, identity} - it does NOT return the
 * row's `at_ms` column - and the receipt body carries `createdAt` as an ISO string with no `atMs`. A producer
 * that reads only `atMs` therefore sees `undefined` for every receipt, the strict "evidence strictly newer than
 * the refusal" gate rejects every candidate, and the pass reports a clean sweep while driving nothing.
 */
test("a receipt timestamp is read from the ISO createdAt the store actually returns", () => {
  expect(learnerReceiptTimeMs({ createdAt: "2026-10-15T01:48:18.117Z" })).toBe(
    Date.parse("2026-10-15T01:48:18.117Z"),
  );
});

test("numeric shapes still win when a caller supplies them", () => {
  expect(learnerReceiptTimeMs({ atMs: 1_000 })).toBe(1_000);
  expect(learnerReceiptTimeMs({ at_ms: 2_000 })).toBe(2_000);
  expect(learnerReceiptTimeMs({ createdAtMs: 3_000 })).toBe(3_000);
  expect(learnerReceiptTimeMs({ recordedAtMs: 4_000 })).toBe(4_000);
  // The record body wins over nothing, but a present numeric field is authoritative over the ISO string.
  expect(learnerReceiptTimeMs({ atMs: 9_000, createdAt: "2026-10-15T01:48:18.117Z" })).toBe(9_000);
});

test("an unreadable time is null, never a fabricated or zero time", () => {
  // Null is what stops the rule from claiming evidence is newer than a refusal it cannot date.
  expect(learnerReceiptTimeMs({})).toBeNull();
  expect(learnerReceiptTimeMs({ createdAt: "not-a-date" })).toBeNull();
  expect(learnerReceiptTimeMs({ atMs: Number.NaN })).toBeNull();
  expect(learnerReceiptTimeMs({ atMs: 0 })).toBeNull();
});
