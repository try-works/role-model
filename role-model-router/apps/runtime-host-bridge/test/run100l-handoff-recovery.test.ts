import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import {
  branchCaptureRequestIdsFromJob,
  carriedEvaluationJobId,
  MAX_HANDOFF_RECOVERY_LIST_PAGE,
  captureRefFromReplayJob,
  evaluationJobIdForReplayJob,
  isRecoverableHandoff,
  isUnevaluatedHandoff,
  recoveredHandoffEntry,
  selectRecoverableHandoffs,
  selectUnevaluatedHandoffs,
} from "../src/supervised-replay-handoff-recovery.js";

/**
 * Run 100 addendum `replay-dispatch-lifecycle.addendum-04` S7. Live evidence on `:3457`: replay jobs reached
 * `awaiting_evaluation` with all branches appended and **no** evaluation job was ever created for them
 * (`evaluationJobId` null on all 13 jobs of the window), because the host records its resume entry only after
 * the replay command returns, and `claimJob` refuses a job in that state. The durable job carries everything
 * needed to rebuild the entry, and the evaluation job id is a pure function of the replay job id - the same
 * derivation the live handoff callback uses.
 */

const job = (overrides: Record<string, unknown> = {}) => ({
  jobId: "replay-job-1",
  state: "awaiting_evaluation",
  evaluationJobId: null,
  sourceDecisionId: "decision-req-abc",
  baselineEndpointId: "endpoint:source",
  scope: "runtime:scope-1",
  candidatePackages: [
    { endpointId: "endpoint:c1", modelId: "model:1", reasoningEffort: "high" },
    { endpointId: "endpoint:c2", modelId: "model:2", reasoningEffort: null },
  ],
  ...overrides,
});

test("run100l the evaluation job id matches the live handoff derivation", () => {
  const expected = `evaluation-replay-${createHash("sha256").update("replay-job-1").digest("hex").slice(0, 20)}`;
  expect(evaluationJobIdForReplayJob("replay-job-1")).toBe(expected);
});

test("run100l a handed-off job without an evaluation job becomes a resume entry", () => {
  const entry = recoveredHandoffEntry(job());
  expect(entry).not.toBeNull();
  expect(entry).toMatchObject({
    replayJobId: "replay-job-1",
    requestId: "req-abc",
    sourceCaptureRequestId: "req-abc",
    sourceEndpointId: "endpoint:source",
    scope: "runtime:scope-1",
  });
  expect(entry?.counterfactualPackages.map((candidate) => candidate.endpointId)).toEqual([
    "endpoint:c1",
    "endpoint:c2",
  ]);
  expect(entry?.evaluationJobId).toBe(evaluationJobIdForReplayJob("replay-job-1"));
});

test("run100l a job that already handed off, or that cannot name its capture, is not recoverable", () => {
  expect(isRecoverableHandoff(job({ evaluationJobId: "evaluation-replay-existing" }))).toBe(false);
  expect(isRecoverableHandoff(job({ state: "running" }))).toBe(false);
  expect(isRecoverableHandoff(job({ sourceDecisionId: "opaque" }))).toBe(false);
  expect(isRecoverableHandoff(job({ sourceDecisionId: undefined }))).toBe(false);
  expect(captureRefFromReplayJob(job())).toBe("req-abc");

  // A handed-off job whose candidates cannot be read is skipped rather than producing a thin comparison.
  expect(recoveredHandoffEntry(job({ candidatePackages: [] }))).toBeNull();
});

test("run100l discovery is bounded per sweep and keeps the caller's order", () => {
  const jobs = Array.from({ length: 7 }, (_, index) =>
    job({ jobId: `replay-job-${index}`, sourceDecisionId: `decision-req-${index}` }),
  );
  const selected = selectRecoverableHandoffs(jobs, 3);
  expect(selected.map((row) => String(row.jobId))).toEqual([
    "replay-job-0",
    "replay-job-1",
    "replay-job-2",
  ]);
  // Mixed input: only recoverable rows count against the bound.
  const mixed = [
    job({ jobId: "done", evaluationJobId: "evaluation-replay-x" }),
    ...jobs,
  ];
  expect(selectRecoverableHandoffs(mixed, 2).map((row) => String(row.jobId))).toEqual([
    "replay-job-0",
    "replay-job-1",
  ]);
});

/**
 * S10 of the same addendum, measured live: the extension protocol inlines an envelope of at most 16 KiB and
 * refuses anything larger (`frame exceeds inline limit; use a channel-local transfer artifact`). The recovery
 * pass asked replay-core for a 25-job page - each job carrying candidate packages, branch references, dispatch
 * results and per-endpoint metric maps - and the frame layer refused the answer. The page the host asks for is
 * now a bounded constant, and this test keeps it small enough to travel inline.
 */
test("run100l the recovery listing page fits the extension protocol's inline envelope", () => {
  expect(MAX_HANDOFF_RECOVERY_LIST_PAGE).toBe(3);
  expect(MAX_HANDOFF_RECOVERY_LIST_PAGE).toBeLessThanOrEqual(3);
});

/**
 * S14 of the same addendum, measured on the real-traffic root: **254** replay jobs carried an
 * `evaluationJobId` whose evaluation job does not exist in Evaluation Core. The completing attempt was
 * interrupted after the handoff recorded the id but before the evaluation was created, and the S7 discovery
 * (which looks for handoffs *without* an id) skipped exactly those, so their paid-for branches never became a
 * comparison. The completion creates a missing evaluation from durable evidence, so these are recoverable.
 */
test("run100l a handoff whose evaluation was never created is recovered through its carried id", () => {
  const unevaluated = {
    jobId: "replay-job-9",
    state: "failed",
    evaluationJobId: "evaluation-replay-carried0000000001",
    sourceDecisionId: "decision-req-carried",
    baselineEndpointId: "endpoint:source",
    scope: "runtime:scope-1",
    branches: [{ branchRootRef: "artifact:branch-1" }],
    candidatePackages: [
      { endpointId: "endpoint:c1", modelId: "model:1", reasoningEffort: "high" },
    ],
  };
  expect(isUnevaluatedHandoff(unevaluated)).toBe(true);
  // It is not the S7 shape (that one has no evaluation job id yet).
  expect(isRecoverableHandoff(unevaluated)).toBe(false);
  expect(carriedEvaluationJobId(unevaluated)).toBe("evaluation-replay-carried0000000001");

  const entry = recoveredHandoffEntry(unevaluated);
  expect(entry).toMatchObject({
    replayJobId: "replay-job-9",
    evaluationJobId: "evaluation-replay-carried0000000001",
    requestId: "req-carried",
  });

  // A handoff that paid for no branch has nothing to compare and is skipped.
  expect(isUnevaluatedHandoff({ ...unevaluated, branches: [] })).toBe(false);
  /**
   * S18c: the host pages with `replay:list-jobs`, which returns the *summary* projection (identity, state,
   * binding, evaluation id, branch count) - not the branch records. A filter that required `branches` made
   * every listed job look unrecoverable, which is how the discovery pass stayed inert on the live root.
   */
  const summaryShape = {
    jobId: "replay-job-9",
    state: "failed",
    evaluationJobId: "evaluation-replay-carried0000000001",
    sourceDecisionId: "decision-req-carried",
    authorizationEpoch: 1,
    channel: "stage",
    scope: "runtime:scope-1",
    branchCount: 3,
    createdAtMs: 1,
    updatedAtMs: 2,
    evaluationJobId2: undefined,
  };
  expect(isUnevaluatedHandoff(summaryShape)).toBe(true);
  expect(isUnevaluatedHandoff({ ...summaryShape, branchCount: 0 })).toBe(false);
  // A job with no carried id belongs to the S7 pass instead.
  expect(isUnevaluatedHandoff({ ...unevaluated, evaluationJobId: null })).toBe(false);
  // Discovery keeps the caller's order and its bound.
  const many = Array.from({ length: 5 }, (_, index) => ({
    ...unevaluated,
    jobId: `replay-job-${index}`,
    sourceDecisionId: `decision-req-${index}`,
  }));
  expect(selectUnevaluatedHandoffs(many, 2).map((row) => String(row.jobId))).toEqual([
    "replay-job-0",
    "replay-job-1",
  ]);
});

/**
 * S18, measured live right after the renewal started re-driving handoffs: the completion re-derived each
 * arm's branch-capture request id (`replay-<requestId>-<hash(job,candidate)>-branch`) while the dispatch
 * capture had become attempt-scoped in S9, so every renewed handoff failed with "no recorded counterfactual
 * branch to evaluate". The durable job names the capture each arm wrote; the completion must read it.
 */
test("run100l branch captures are resolved from the durable dispatch receipt", () => {
  const job = {
    replayJobId: "replay-job-s18",
    requestId: "req-s18",
    candidateEndpointIds: ["endpoint:b", "endpoint:c"],
    dispatches: {
      "endpoint:b": {
        status: "complete",
        result: {
          providerResultRef: "route-capture:replay-req-s18-abc123-branch-source",
          // S18b: the append records the capture it wrote, which is the link that survives a retried arm.
          branchRequestId: "replay-req-s18-abc123-branch",
        },
      },
      "endpoint:c": { status: "failed" },
    },
  };
  const resolved = branchCaptureRequestIdsFromJob(job);
  // The recorded capture wins over the receipt-derived name (they agree here; the recorded one also exists
  // when the arm was retried and left no receipt).
  expect(resolved.get("endpoint:b")).toBe("replay-req-s18-abc123-branch");
  // A candidate with no receipt keeps the pre-S9 derivation so older jobs still resume.
  const fallback = resolved.get("endpoint:c") ?? "";
  expect(fallback.startsWith("replay-req-s18-")).toBe(true);
  expect(fallback.endsWith("-branch")).toBe(true);
  expect(fallback).not.toBe(resolved.get("endpoint:b"));
});
