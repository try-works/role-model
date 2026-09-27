import { describe, expect, test } from "vitest";

import { evaluationHandoffRequestFromCommandReceipt } from "../src/track-b-auto-replay-runtime.js";

/**
 * Run 101 addendum 26 - a replay that produced branches but no comparison must offer its evaluation.
 *
 * Measured on `:3457` (2026-09-28 ~06:0x): 134 replays completed, blobs were written, and zero evaluation jobs were
 * offered - `evaluation.score` stayed at 41, no `RoutingEvaluationExecutionContextV1` contract has appeared since
 * 27-Sep 20:35, and `learner.derive` sat at 13. The sidecar's receipt says `awaiting_evaluation` ("produced branches
 * but no comparison, so it stays retryable"), and nothing turned that into the offer the host owns.
 */
describe("run 101 addendum 26: an awaiting-evaluation receipt asks the evaluation plane to take the job", () => {
  test("awaiting_evaluation with a replay job id is a handoff request", () => {
    expect(
      evaluationHandoffRequestFromCommandReceipt({
        state: "awaiting_evaluation",
        replayJobId: "7671fd2352f2060bf0c004e98d7fb7b33d4ca251757aed04d039a53533b7e569",
      }),
    ).toEqual({
      replayJobId: "7671fd2352f2060bf0c004e98d7fb7b33d4ca251757aed04d039a53533b7e569",
    });
    // The receipt names its job differently on some paths; both are accepted.
    expect(
      evaluationHandoffRequestFromCommandReceipt({ state: "awaiting_evaluation", jobId: "job-1" }),
    ).toEqual({ replayJobId: "job-1" });
  });

  test("a completed replay is not a handoff request", () => {
    expect(
      evaluationHandoffRequestFromCommandReceipt({ state: "complete", replayJobId: "job-1" }),
    ).toBeNull();
  });

  test("a terminal state or an unnamed receipt is not a handoff request", () => {
    expect(
      evaluationHandoffRequestFromCommandReceipt({ state: "timed_out", replayJobId: "job-1" }),
    ).toBeNull();
    expect(evaluationHandoffRequestFromCommandReceipt({ state: "awaiting_evaluation" })).toBeNull();
    expect(evaluationHandoffRequestFromCommandReceipt(null)).toBeNull();
    expect(evaluationHandoffRequestFromCommandReceipt("not-a-receipt")).toBeNull();
  });
});
