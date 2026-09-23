import { expect, test } from "vitest";

import {
  MAX_HANDOFF_RECOVERY_CHECKS_PER_SWEEP,
  MAX_HANDOFF_RECOVERY_LIST_PAGE,
  nextHandoffRecoveryCursor,
} from "../src/supervised-replay-handoff-recovery.js";

/**
 * Run 100 addendum `handoff-evidence-durability.addendum-06` S24 (measured on the real-traffic root).
 *
 * The terminal recovery pass lists a *deterministic* page of durable jobs that carry an `evaluationJobId`
 * (`state: failed|timed_out`, `hasEvaluationJobId: true`) and checks each one against Evaluation Core, so it
 * only records the handoffs whose evaluation was never created. That page had no cursor: every sweep asked
 * for the same three jobs, every one of them already had its evaluation, and the pass counted three
 * `skipped` for ever. On the live root that set holds 512 jobs and 262 of them need recovery, so the pass was
 * inert by construction - which is also why addendum 05's S17 renewal shows **zero** uses across 441 resume
 * entries, 309 of them `abandoned`: the entries it renews are never re-seen.
 *
 * The cursor is the repair, and the two bounds below are the contract that keeps it inside the extension
 * protocol's 16 KiB inline frame while the scan actually advances.
 */

test("run101 S24 a full page advances the cursor to the last job the sweep examined", () => {
  const page = Array.from(
    { length: MAX_HANDOFF_RECOVERY_LIST_PAGE },
    (_, index) => `job-${String(index).padStart(4, "0")}`,
  );
  expect(
    nextHandoffRecoveryCursor({
      currentCursor: null,
      pageJobIds: page,
      examinedCount: 5,
      pageSize: MAX_HANDOFF_RECOVERY_LIST_PAGE,
    }),
    "the next sweep resumes at the job after the last one examined",
  ).toBe("job-0004");
});

test("run101 S24 reaching the end of the set wraps so the next pass re-checks new work", () => {
  expect(
    nextHandoffRecoveryCursor({
      currentCursor: "job-0002",
      pageJobIds: ["job-a", "job-b"],
      examinedCount: 2,
      pageSize: MAX_HANDOFF_RECOVERY_LIST_PAGE,
    }),
    "a short page is the end of the set: the next pass starts from the beginning",
  ).toBeNull();
});

test("run101 S24 a sweep that examines nothing keeps its position", () => {
  const page = Array.from({ length: MAX_HANDOFF_RECOVERY_LIST_PAGE }, (_, index) => `job-${index}`);
  expect(
    nextHandoffRecoveryCursor({
      currentCursor: "job-0009",
      pageJobIds: page,
      examinedCount: 0,
      pageSize: MAX_HANDOFF_RECOVERY_LIST_PAGE,
    }),
  ).toBe("job-0009");
});

test("run101 S24 the page stays inside the extension protocol's inline frame", () => {
  /**
   * Measured on the live store (addendum 06 census): the `jobSummaries()` projection (identity, state,
   * channel, scope, epoch, evaluation id, branch count, timestamps) is 319 bytes per job. The protocol
   * inlines up to 16 KiB and refuses anything larger (`frame exceeds inline limit`), and the envelope itself
   * needs room, so the page must stay well inside the bound - the S10 measurement that set the page to three
   * was taken when the listing cloned whole jobs (candidate packages, branch references, dispatch results and
   * per-endpoint metric maps), which is exactly what the summary projection removed.
   */
  const measuredSummaryBytes = 319;
  const envelopeAllowance = 4 * 1024;
  expect(MAX_HANDOFF_RECOVERY_LIST_PAGE).toBeGreaterThan(3);
  expect(MAX_HANDOFF_RECOVERY_LIST_PAGE * measuredSummaryBytes + envelopeAllowance).toBeLessThan(
    16 * 1024,
  );
  expect(MAX_HANDOFF_RECOVERY_CHECKS_PER_SWEEP).toBeLessThanOrEqual(MAX_HANDOFF_RECOVERY_LIST_PAGE);
});
