import { expect, test } from "vitest";

import { resolveResumedHandoffJobRecord } from "../src/cli.js";
import { branchCaptureRequestIdCandidatesFromJob } from "../src/supervised-replay-handoff-recovery.js";

/**
 * Run 101 addendum 35 - the resume completion read the durable `replay:job` answer without decoding the
 * capability envelope, so every arm fell back to the pre-S9 branch naming and the handoff was disposed as
 * `evidence_outside_retention_window`.
 *
 * Measured live on the packaged stage RC (private `cd81be60`) on `:3457`, 2026-09-28:
 *
 *   replay job     09879d72dce06d6552b7c1a19a93fa8005a1d0b45db26c981750a415c4ed6d2d
 *   created        01:55:21.994Z, claimed 01:55:22.111Z, failed 01:56:38.795Z (77 s)
 *   providerCalls  2, cost 218 micros, both branches `status: "complete"`
 *   stderr         [run101] resumed handoff 09879d72… could not read 2 arm(s):
 *                    openai.personal.…gpt-5.6-luna=capture_missing(replay-req-830b5d12-…-0b80e687b109b193-branch),
 *                    openai.personal.…gpt-5.6-sol-medium=capture_missing(replay-req-830b5d12-…-c32d4671cc928618-branch)
 *   failureReason  evaluation_unavailable: handoff evidence is outside the capture retention window: …
 *
 * The two ids in the message are the **legacy** derivation, which no producer writes. The durable job names the
 * captures the arms actually wrote:
 *
 *   dispatches["…gpt-5.6-luna"].result       = { branchRequestId: "replay-req-830b5d12-…-470bf2808c52e801-branch",
 *                                                providerResultRef: "route-capture:replay-req-830b5d12-…-470bf2808c52e801" }
 *   dispatches["…gpt-5.6-sol-medium"].result = { branchRequestId: "replay-req-830b5d12-…-be8b72c38ac71b03-branch",
 *                                                providerResultRef: "route-capture:replay-req-830b5d12-…-be8b72c38ac71b03" }
 *
 * and both `route-capture:` ids are present in `track_b_route_capture_receipts` in
 * `<stateRoot>/standalone-runtime-stage/track-b/deferred-route-captures.sqlite`, accepted by
 * `readRouteCaptureFromQueueReceipt`'s shape check (verified by direct query on the live store: 1023 receipts,
 * 3 for this request, 0 ending in `-branch`).
 *
 * So the arms were never missing. The candidate builder could not name them because `dispatches` was read off
 * the envelope instead of the job record, and the completion then asked only for the one name nothing writes.
 */

const REPLAY_JOB_ID = "09879d72dce06d6552b7c1a19a93fa8005a1d0b45db26c981750a415c4ed6d2d";
const REQUEST_ID = "req-830b5d12-c595-4fe2-a76b-a02857fca108";
const LUNA = "openai.personal.openai-codex-subscription.global.gpt-5.6-luna";
const SOL_MEDIUM = "openai.personal.openai-codex-subscription.global.gpt-5.6-sol-medium";

/** The two arms as the durable job records them, verbatim from the live store. */
const DISPATCHES: Record<string, unknown> = {
  [LUNA]: {
    status: "complete",
    result: {
      status: "complete",
      replayJobId: REPLAY_JOB_ID,
      candidateEndpointId: LUNA,
      dispatchReceiptId: `router-replay:replay-${REQUEST_ID}-470bf2808c52e801`,
      routerDecisionId: `decision-replay-${REQUEST_ID}-470bf2808c52e801`,
      providerResultRef: `route-capture:replay-${REQUEST_ID}-470bf2808c52e801`,
      branchRootRef: "876f429c00282374add074aaa777ab614552d2423a9dfd7d165589b54b662964",
      branchRequestId: `replay-${REQUEST_ID}-470bf2808c52e801-branch`,
    },
  },
  [SOL_MEDIUM]: {
    status: "complete",
    result: {
      status: "complete",
      replayJobId: REPLAY_JOB_ID,
      candidateEndpointId: SOL_MEDIUM,
      dispatchReceiptId: `router-replay:replay-${REQUEST_ID}-be8b72c38ac71b03`,
      routerDecisionId: `decision-replay-${REQUEST_ID}-be8b72c38ac71b03`,
      providerResultRef: `route-capture:replay-${REQUEST_ID}-be8b72c38ac71b03`,
      branchRootRef: "efa79294111a4ef9944ed3339a079d67d7215f8f7331be8c73785f3507be120e",
      branchRequestId: `replay-${REQUEST_ID}-be8b72c38ac71b03-branch`,
    },
  },
};

/** The record the durable store holds, as `replay:job` projects it. */
const JOB_RECORD: Record<string, unknown> = {
  schemaVersion: "role-model.replay-core.v1",
  jobId: REPLAY_JOB_ID,
  state: "failed",
  sourceDecisionId: `decision-${REQUEST_ID}`,
  baselineEndpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro-max",
  candidateEndpointIds: [LUNA, SOL_MEDIUM],
  scope: "runtime:399ae69e18716735bfec8207ad95da45",
  dispatches: DISPATCHES,
};

/**
 * The exact shape the packaged extension host answers with. `businessOutput.value` is where the record
 * actually sits; the top-level `value` is the same record for the non-externalized case.
 */
const answeredEnvelope = (record: unknown): Record<string, unknown> => ({
  value: record,
  businessOutput: { value: record },
  durableLocator: {
    extensionId: "replay-core",
    requestId: `replay-job-read:${REPLAY_JOB_ID}`,
    capability: "replay:job",
  },
});

const candidatesFor = (dispatches: unknown): Map<string, readonly string[]> =>
  branchCaptureRequestIdCandidatesFromJob({
    replayJobId: REPLAY_JOB_ID,
    requestId: REQUEST_ID,
    dispatches,
    candidateEndpointIds: [LUNA, SOL_MEDIUM],
  });

test("the raw capability envelope names no arm: it collapses every arm onto the legacy branch name", () => {
  // Pre-fix shape: `dispatches` is read straight off the envelope, so there is none.
  const raw = answeredEnvelope(JOB_RECORD) as Record<string, unknown>;
  const candidates = candidatesFor(raw.dispatches);

  // This is the live miss, reproduced exactly: one candidate per arm, and it is the legacy name.
  expect(candidates.get(LUNA)).toEqual([`replay-${REQUEST_ID}-0b80e687b109b193-branch`]);
  expect(candidates.get(SOL_MEDIUM)).toEqual([`replay-${REQUEST_ID}-c32d4671cc928618-branch`]);
});

test("the decoded job record names the capture each arm wrote, recorded id first", () => {
  const job = resolveResumedHandoffJobRecord({
    answer: answeredEnvelope(JOB_RECORD),
    stateRoot: "C:\\state",
    scopeId: "standalone-runtime-stage",
  });

  expect(job).not.toBeNull();
  expect(job?.jobId).toBe(REPLAY_JOB_ID);
  expect(job?.dispatches).toBeTypeOf("object");

  const candidates = candidatesFor(job?.dispatches);

  // The arm's own recorded name leads, so the first read is the one that can hit.
  expect(candidates.get(LUNA)).toEqual([
    `replay-${REQUEST_ID}-470bf2808c52e801-branch`,
    `replay-${REQUEST_ID}-470bf2808c52e801`,
    `replay-${REQUEST_ID}-0b80e687b109b193-branch`,
  ]);
  expect(candidates.get(SOL_MEDIUM)).toEqual([
    `replay-${REQUEST_ID}-be8b72c38ac71b03-branch`,
    `replay-${REQUEST_ID}-be8b72c38ac71b03`,
    `replay-${REQUEST_ID}-c32d4671cc928618-branch`,
  ]);
});

test("a job record that carries no work is not accepted as the durable job", () => {
  // The S43 class: an object carrying a `jobId` that is only a locator, with no dispatches or state.
  expect(
    resolveResumedHandoffJobRecord({
      answer: answeredEnvelope({ jobId: REPLAY_JOB_ID }),
      stateRoot: "C:\\state",
      scopeId: "standalone-runtime-stage",
    }),
  ).toBeNull();
});

test("an answer with no record at all stays null so the caller keeps its retryable failure", () => {
  expect(
    resolveResumedHandoffJobRecord({
      answer: { value: null, businessOutput: { value: null } },
      stateRoot: "C:\\state",
      scopeId: "standalone-runtime-stage",
    }),
  ).toBeNull();
});
