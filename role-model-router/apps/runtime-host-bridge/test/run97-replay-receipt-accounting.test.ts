import { expect, test } from "vitest";

import { autoReplayExecutionFromCommandReceipt } from "../src/track-b-auto-replay-runtime.js";

test("run97 automatic producer treats a handoff-only replay as non-terminal", () => {
  const execution = autoReplayExecutionFromCommandReceipt({
    schemaVersion: "role-model.supervised-replay-command-receipt.v1",
    requestId: "req-1",
    replayJobId: "job-1",
    state: "awaiting_evaluation",
    evaluationJobId: "evaluation-replay-1",
    branches: [
      {
        candidateEndpointId: "endpoint-b",
        outcome: "append_recovery",
        branchRootRef: "a".repeat(64),
      },
    ],
    dispatches: [
      {
        kind: "candidate",
        endpointId: "endpoint-b",
        attempt: 1,
        costMicros: 512,
        bytes: 2048,
        outcome: "append_recovery",
      },
    ],
  });
  expect(execution.terminal).toBe(false);
  expect(execution.failureDetail).toBe("durable replay state is awaiting_evaluation");
  expect(execution.branches).toEqual([{ endpointId: "endpoint-b", outcome: "complete" }]);
  expect(execution.dispatches).toEqual([
    {
      kind: "candidate",
      endpointId: "endpoint-b",
      attempt: 1,
      costMicros: 512,
      bytes: 2048,
      outcome: "complete",
    },
  ]);
});

test("run97 automatic producer treats a durably evaluated replay as terminal", () => {
  const execution = autoReplayExecutionFromCommandReceipt({
    state: "complete",
    evaluationJobId: "evaluation-replay-1",
    evaluationOutcome: "candidate",
    comparisonGroupId: "comparison-1",
    branches: [
      { candidateEndpointId: "endpoint-b", outcome: "complete", branchRootRef: "b".repeat(64) },
    ],
    dispatches: [
      {
        kind: "candidate",
        endpointId: "endpoint-b",
        attempt: 1,
        costMicros: 640,
        bytes: 1536,
        outcome: "complete",
      },
      {
        kind: "retry",
        endpointId: "endpoint-b",
        attempt: 2,
        costMicros: 128,
        bytes: 256,
        outcome: "failed",
      },
    ],
  });
  expect(execution.terminal).toBe(true);
  expect(execution.failureDetail).toBeUndefined();
  expect(execution.dispatches).toHaveLength(2);
  expect(execution.dispatches?.[1]).toMatchObject({ kind: "retry", outcome: "failed" });
});

test("run97 automatic producer fails closed on a malformed receipt", () => {
  for (const receipt of [null, "complete", 42, []]) {
    const execution = autoReplayExecutionFromCommandReceipt(receipt);
    expect(execution.terminal).toBe(false);
    expect(execution.branches).toEqual([]);
    expect(typeof execution.failureDetail).toBe("string");
  }
});
