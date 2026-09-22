import { expect, test } from "vitest";

import { terminalizeAbandonedEvaluation } from "../src/evaluation-orphan-terminalization.js";

/**
 * Run 100 addendum `00-requirements.evaluation-lease-wedge-repair.addendum-02` S3 (operator report
 * 2026-09-23: "18 evals have been stuck in flight for hours"): when a supervised-replay resume entry
 * reaches its attempt cap the host already fails the *replay* job, but the *evaluation* job was left
 * non-terminal with no lease - permanently "in flight" and unreclaimable. The give-up must terminalize
 * both, carrying the recorded reason.
 */

const ENTRY = {
  replayJobId: "replay-job-1",
  evaluationJobId: "evaluation-replay-1",
  scope: "standalone-runtime-stage",
};

test("run100h the give-up cancels the evaluation job with the recorded reason", async () => {
  const calls = [];
  const result = await terminalizeAbandonedEvaluation({
    entry: ENTRY,
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "durable routing-shadow trial is not recoverable without an evidence ref",
    invoke: async (capability, value, scope) => {
      calls.push({ capability, value, scope });
      return { capability, scope };
    },
  });
  expect(calls).toHaveLength(1);
  expect(calls[0].capability).toBe("evaluation:cancel-job");
  expect(calls[0].value.jobId).toBe("evaluation-replay-1");
  expect(calls[0].value.reason).toContain("evaluation_unavailable:");
  expect(calls[0].value.reason).toContain("not recoverable");
  expect(result).toMatchObject({ cancelled: true, scope: "standalone-runtime-stage" });
});

test("run100h a scope binding mismatch retries with the next candidate scope", async () => {
  const seen = [];
  const result = await terminalizeAbandonedEvaluation({
    entry: { ...ENTRY, scope: "capture-scope" },
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "resume attempt cap exhausted",
    invoke: async (capability, value, scope) => {
      seen.push(scope);
      if (scope === "capture-scope") throw new Error("evaluation persisted job scope binding mismatch");
      return { ok: true };
    },
  });
  expect(seen).toEqual(["capture-scope", "standalone-runtime-stage"]);
  expect(result).toMatchObject({ cancelled: true, scope: "standalone-runtime-stage" });
});

test("run100h an already terminal job is not an error, and a real failure is reported", async () => {
  const terminal = await terminalizeAbandonedEvaluation({
    entry: ENTRY,
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "cap",
    invoke: async () => {
      throw new Error("completed evaluation job cannot be cancelled");
    },
  });
  expect(terminal).toMatchObject({ cancelled: false });
  expect(terminal.detail).toMatch(/terminal|completed/i);
});
