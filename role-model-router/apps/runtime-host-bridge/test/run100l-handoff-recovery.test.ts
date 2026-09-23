import { createHash } from "node:crypto";

import { expect, test } from "vitest";

import {
  captureRefFromReplayJob,
  evaluationJobIdForReplayJob,
  isRecoverableHandoff,
  recoveredHandoffEntry,
  selectRecoverableHandoffs,
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
