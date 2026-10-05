import { expect, test } from "vitest";

import { supervisedReplayBranchCaptureRequestId } from "../src/cli.js";

/**
 * Run 100 addendum 16 item 8d — delegated census, 2026-09-25.
 *
 * The capture boundary keys idempotency on the capture request id and refuses the same key carrying different
 * immutable bytes. Inside the supervised-replay completer the *prepared* branch id carries the attempt token
 * (`cli.ts:6862`) and the result branch id derives from the dispatch's own attempt-scoped replay request id,
 * but the **failure** branch id was the one sibling without a token: `replay-<requestId>-<candidateHash16>-failure`.
 *
 * Measured live on `req-f8020a96…` (run155 err log): the prepared key was re-presented and idempotently
 * accepted (8 572 ms) and the failure key was refused immediately afterwards (6 ms) with
 * "route capture idempotency key was reused with different immutable bytes"; all five live hits that day were
 * `-failure` ids, and the job behind it (`32c945cb…`, attempt 3) was still holding
 * `dispatches[v4-pro-high].status = "failure_append_pending"`. No two jobs share a key (1860 jobs, 0 duplicates),
 * so the conflict is re-attempt bytes under a stable id — a defect, not correct re-dispatch.
 */

const base = {
  requestId: "req-f8020a96-28bd-4b78-b1da-c335ca84fa26",
  candidateEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-high",
};

test("run157 item 8d the failure branch id carries the attempt token", () => {
  const first = supervisedReplayBranchCaptureRequestId({
    ...base,
    phase: "failure",
    attemptToken: "attempt-one",
  });
  expect(first).toContain("attempt-one");
  expect(first).toContain("-failure-");
});

test("run157 item 8d two attempts never re-present the same failure key with different bytes", () => {
  const first = supervisedReplayBranchCaptureRequestId({
    ...base,
    phase: "failure",
    attemptToken: "attempt-one",
  });
  const second = supervisedReplayBranchCaptureRequestId({
    ...base,
    phase: "failure",
    attemptToken: "attempt-two",
  });
  expect(first).not.toBe(second);
});

test("run157 item 8d the prepared and failure branches of one attempt stay distinct", () => {
  const prepared = supervisedReplayBranchCaptureRequestId({
    ...base,
    phase: "prepared",
    attemptToken: "attempt-one",
  });
  const failure = supervisedReplayBranchCaptureRequestId({
    ...base,
    phase: "failure",
    attemptToken: "attempt-one",
  });
  expect(prepared).not.toBe(failure);
  // The id still names the capture and the candidate, so a durable reader can attribute it.
  expect(prepared.startsWith(`replay-${base.requestId}-`)).toBe(true);
  expect(failure.startsWith(`replay-${base.requestId}-`)).toBe(true);
});

/**
 * Measured on the running build after the attempt token landed (run159, 08:58:17Z): one conflict still
 * occurred on `req-0071aa21…` whose failure id *did* carry a fresh token
 * (`…-failure-26a1d43a7a29`), so the same attempt presented its failure branch twice with different bytes —
 * the job around it sits in `failure_append_pending`, i.e. a recovery re-append. A per-attempt id is
 * therefore not sufficient; the id must also recognise the payload, so identical retries stay idempotent and
 * changed bytes get their own key.
 */
test("run157 item 8d identical failure payloads reuse their key, changed bytes get a new one", () => {
  const first = supervisedReplayBranchCaptureRequestId({
    ...base,
    phase: "failure",
    attemptToken: "attempt-one",
    contentTag: "aaaaaaaaaaaaaaaa",
  });
  const samePayload = supervisedReplayBranchCaptureRequestId({
    ...base,
    phase: "failure",
    attemptToken: "attempt-one",
    contentTag: "aaaaaaaaaaaaaaaa",
  });
  const changedBytes = supervisedReplayBranchCaptureRequestId({
    ...base,
    phase: "failure",
    attemptToken: "attempt-one",
    contentTag: "bbbbbbbbbbbbbbbb",
  });
  expect(samePayload).toBe(first);
  expect(changedBytes).not.toBe(first);
});
