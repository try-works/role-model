import { expect, test } from "vitest";

import { terminalizeAbandonedEvaluation } from "../src/evaluation-orphan-terminalization.js";

/**
 * Run 100 addendum 16 item 8d — delegated census, 2026-09-25 (`E:\tmp\run100-item8d-report.md`).
 *
 * Two defects in the give-up path, both measured against the live stores:
 *
 * 1. **An unsatisfiable bound.** The caller truncated its reason to 512 characters while Evaluation Core's
 *    `evaluation:cancel-job` bound is 256 (`extensions/evaluation-core/index.mjs:670`), so a give-up carrying a
 *    long reason could never succeed: the extension answered "bounded cancellation reason required" — 59 live
 *    refusals across the observed build windows.
 * 2. **A benign classification that suppressed the scope fallback.** "evaluation job not found" was treated as
 *    a benign terminal no-op at the *first* candidate scope. The capture-scope evidence lives under
 *    `runtime:714f4a87…` while the terminalization pass is handed the operator scope, and "not found" is
 *    exactly what the wrong scope answers — so the pass never reached the scope that holds the row (78 log
 *    lines targeted the operator scope). Only a genuine terminal state is benign; "not found" must try the
 *    next scope and is benign only once every scope has answered it.
 */

const ENTRY = {
  replayJobId: "replay-job-1",
  evaluationJobId: "evaluation-replay-1",
  scope: "runtime:714f4a87dd3c44d1bc93ed741841c722",
};

test("run157 item 8d the give-up reason respects Evaluation Core's 256-character bound", async () => {
  const calls: Array<{ value: Record<string, unknown>; scope: string }> = [];
  await terminalizeAbandonedEvaluation({
    entry: ENTRY,
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "x".repeat(800),
    invoke: async (_capability, value, scope) => {
      calls.push({ value, scope });
      return { capability: "evaluation:cancel-job", scope };
    },
  });
  expect(calls).toHaveLength(1);
  const reason = String(calls[0].value.reason);
  expect(reason.startsWith("evaluation_unavailable: ")).toBe(true);
  /**
   * 256 is the extension's own bound; a reason one character longer is refused outright with
   * "bounded cancellation reason required", so the caller must never present one.
   */
  expect(reason.length).toBeLessThanOrEqual(256);
});

test("run157 item 8d not-found at the first scope retries the scope that holds the row", async () => {
  const seen: string[] = [];
  const result = await terminalizeAbandonedEvaluation({
    entry: ENTRY,
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    invoke: async (_capability, _value, scope) => {
      seen.push(scope);
      if (seen.length === 1) throw new Error("evaluation job not found");
      return { capability: "evaluation:cancel-job", scope };
    },
  });
  expect(seen).toHaveLength(2);
  expect(result).toMatchObject({ cancelled: true, scope: "standalone-runtime-stage" });
});

test("run157 item 8d a genuinely terminal job stays a benign no-op", async () => {
  const seen: string[] = [];
  const result = await terminalizeAbandonedEvaluation({
    entry: ENTRY,
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    invoke: async (_capability, _value, scope) => {
      seen.push(scope);
      throw new Error("completed evaluation job cannot be cancelled");
    },
  });
  expect(seen).toHaveLength(1);
  expect(result.cancelled).toBe(false);
  expect(result.detail).toContain("completed evaluation job cannot be cancelled");
});

test("run157 item 8d a job absent from every candidate scope is a benign no-op, not a refusal", async () => {
  const seen: string[] = [];
  const result = await terminalizeAbandonedEvaluation({
    entry: ENTRY,
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    invoke: async (_capability, _value, scope) => {
      seen.push(scope);
      throw new Error("evaluation job not found");
    },
  });
  /**
   * Every candidate scope was tried (the fallback must not stop at the first), and the id exists nowhere:
   * there is nothing to terminalize. The delegated census measured 305 of 321 target ids absent from the live
   * evaluation DB, so treating this as a refusal produced hundreds of self-defeating log lines per window.
   */
  expect(seen).toEqual([ENTRY.scope, "standalone-runtime-stage"]);
  expect(result).toMatchObject({ cancelled: false, benign: true });
  expect(result.scope).toBeNull();
});

/**
 * Run 100 addendum 27 §2 residual: the terminalization pass revisits the same resume entries on every cycle,
 * so an id that exists in no scope was re-invoked (and re-logged by the host bridge as
 * `invoke-failed … evaluation job not found`) tens of times a minute. Once every candidate scope has answered
 * not-found, the answer cannot change within a process lifetime: the id is stale, so remember it and stop
 * paying for the invoke — while a *different* id is still checked normally.
 */
test("run157 item 8d an id already found in no scope is not invoked again", async () => {
  const seen: string[] = [];
  const entry = { ...ENTRY, evaluationJobId: `evaluation-replay-absent-${Date.now()}` };
  const invoke = async (_capability: string, _value: Record<string, unknown>, scope: string) => {
    seen.push(scope);
    throw new Error("evaluation job not found");
  };

  const first = await terminalizeAbandonedEvaluation({
    entry,
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    invoke,
  });
  expect(first).toMatchObject({ cancelled: false, benign: true });
  expect(seen).toHaveLength(2);

  const second = await terminalizeAbandonedEvaluation({
    entry,
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    invoke,
  });
  expect(second).toMatchObject({ cancelled: false, benign: true });
  expect(seen).toHaveLength(2);

  const other = await terminalizeAbandonedEvaluation({
    entry: { ...entry, evaluationJobId: `${entry.evaluationJobId}-other` },
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    invoke,
  });
  expect(other).toMatchObject({ cancelled: false, benign: true });
  expect(seen).toHaveLength(4);
});
