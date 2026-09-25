import { expect, test } from "vitest";

import { terminalizeAbandonedEvaluation } from "../src/evaluation-orphan-terminalization.js";
import {
  evaluationJobExistsFromGetJobAnswer,
  evaluationJobStatusFromGetJobAnswer,
} from "../src/cli.js";

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

/**
 * Run 100 addendum 28 §2: the negative cache removes repeats, but the measured stream was many *distinct*
 * stale ids, so the pass kept paying for a cancel that could only ever fail. `evaluation:get-job` answers
 * `null` for a missing id **without throwing**, so it is a sound, quiet existence check — unlike
 * `evaluation:list-jobs`, which returns a lexicographic 256-row page and would wrongly report a job whose id
 * sorts late as absent.
 */
test("run157 item 8d a job absent from every candidate scope is never cancelled", async () => {
  const seen: string[] = [];
  const result = await terminalizeAbandonedEvaluation({
    entry: { ...ENTRY, evaluationJobId: `evaluation-replay-unlisted-${Date.now()}` },
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    jobExists: async () => false,
    invoke: async (_capability, _value, scope) => {
      seen.push(scope);
      return { capability: "evaluation:cancel-job", scope };
    },
  });
  expect(seen).toEqual([]);
  expect(result).toMatchObject({ cancelled: false, benign: true, scope: null });
});

test("run157 item 8d a job that exists only in the capture scope is cancelled there", async () => {
  const seen: string[] = [];
  const result = await terminalizeAbandonedEvaluation({
    entry: { ...ENTRY, evaluationJobId: `evaluation-replay-scoped-${Date.now()}` },
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    jobExists: async (scope: string) => scope === ENTRY.scope,
    invoke: async (_capability, _value, scope) => {
      seen.push(scope);
      return { capability: "evaluation:cancel-job", scope };
    },
  });
  expect(seen).toEqual([ENTRY.scope]);
  expect(result).toMatchObject({ cancelled: true, scope: ENTRY.scope });
});

test("run157 item 8d an unknown existence answer still attempts the cancel", async () => {
  const seen: string[] = [];
  await terminalizeAbandonedEvaluation({
    entry: { ...ENTRY, evaluationJobId: `evaluation-replay-unknown-${Date.now()}` },
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    jobExists: async () => null,
    invoke: async (_capability, _value, scope) => {
      seen.push(scope);
      return { capability: "evaluation:cancel-job", scope };
    },
  });
  expect(seen).toEqual([ENTRY.scope]);
});

/**
 * Run 100 — the evaluation audit's operator-signal finding: **156 cancel refusals per process start** (153
 * already `failed`, 3 already `completed`) produced 312 log lines per start (156 `invoke-failed` from the host
 * bridge plus 156 `terminalization not applied`), and the cross-cutting audit measured **496 of 509**
 * `invoke-failed` lines per start as exactly this no-op bookkeeping — noise that camouflaged the 7 SQLite lock
 * failures and 6 frame refusals.
 *
 * The durable store already reports those rows as terminal, so the give-up must not ask the boundary to cancel
 * them: a job the store reports `completed`/`failed`/`cancelled` is a benign no-op with **no invoke at all**.
 * Anything the store reports as non-terminal is still cancelled, and an unknown answer keeps the old path.
 */
test("run157 item 8d a job the store already reports terminal is a no-op, not a cancel", async () => {
  const seen: string[] = [];
  for (const status of ["completed", "failed", "cancelled"]) {
    const result = await terminalizeAbandonedEvaluation({
      entry: { ...ENTRY, evaluationJobId: `evaluation-replay-terminal-${status}-${Date.now()}` },
      channel: "stage",
      operatorScope: "standalone-runtime-stage",
      reason: "give up",
      jobStatus: async () => status,
      invoke: async (_capability, _value, scope) => {
        seen.push(scope);
        return { capability: "evaluation:cancel-job", scope };
      },
    });
    expect(result, status).toMatchObject({ cancelled: false, benign: true });
    expect(result.detail, status).toContain(status);
  }
  expect(seen).toEqual([]);
});

test("run157 item 8d a job the store reports in flight is still cancelled", async () => {
  const seen: string[] = [];
  const result = await terminalizeAbandonedEvaluation({
    entry: { ...ENTRY, evaluationJobId: `evaluation-replay-inflight-${Date.now()}` },
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    jobStatus: async (scope: string) => (scope === ENTRY.scope ? "queued" : null),
    invoke: async (_capability, _value, scope) => {
      seen.push(scope);
      return { capability: "evaluation:cancel-job", scope };
    },
  });
  expect(seen).toEqual([ENTRY.scope]);
  expect(result).toMatchObject({ cancelled: true, scope: ENTRY.scope });
});

test("run157 item 8d an unknown status keeps the previous behaviour", async () => {
  const seen: string[] = [];
  await terminalizeAbandonedEvaluation({
    entry: { ...ENTRY, evaluationJobId: `evaluation-replay-unknownstatus-${Date.now()}` },
    channel: "stage",
    operatorScope: "standalone-runtime-stage",
    reason: "give up",
    jobStatus: async () => undefined,
    invoke: async (_capability, _value, scope) => {
      seen.push(scope);
      return { capability: "evaluation:cancel-job", scope };
    },
  });
  expect(seen).toEqual([ENTRY.scope]);
});

test("run157 item 8d the status reader handles the record, the marker and the degradation receipt", () => {
  expect(evaluationJobStatusFromGetJobAnswer(null)).toBeNull();
  expect(evaluationJobStatusFromGetJobAnswer({ jobId: "evaluation:1", status: "completed" })).toBe(
    "completed",
  );
  /**
   * A large job arrives behind the extension's externalization marker; the status lives beside the payload or
   * inside it, and reading either is what turns the no-op into a suppressed cancel.
   */
  expect(
    evaluationJobStatusFromGetJobAnswer({ transferState: "externalized", businessOutput: { status: "failed" } }),
  ).toBe("failed");
  expect(
    evaluationJobStatusFromGetJobAnswer({
      transferState: "externalized",
      businessOutput: { value: { jobId: "evaluation:1", status: "cancelled" } },
    }),
  ).toBe("cancelled");
  // A read that failed says nothing about the row: unknown, so the caller keeps the previous behaviour.
  expect(
    evaluationJobStatusFromGetJobAnswer({ schemaVersion: "role-model.degradation-receipt.v1", code: "timeout" }),
  ).toBeUndefined();
  expect(evaluationJobStatusFromGetJobAnswer({ transferState: "externalized" })).toBeUndefined();
});

/**
 * Measured on run170: the terminal-status short-circuit did not suppress the stream, because a business result
 * crossing the packaged extension host arrives as `businessOutput` — and for this capability that is a JSON
 * **string**, which an object-only reader cannot see (`decodeExtensionTextOutput` in `cli.ts` documents the
 * same shape: a string result, or `{value: string}`). The reader must look through the serialized payload.
 */
test("run157 item 8d the status reader sees a serialized business output", () => {
  expect(evaluationJobStatusFromGetJobAnswer(JSON.stringify({ jobId: "evaluation:1", status: "failed" }))).toBe(
    "failed",
  );
  expect(
    evaluationJobStatusFromGetJobAnswer({
      transferState: "externalized",
      businessOutput: JSON.stringify({ jobId: "evaluation:1", status: "completed" }),
    }),
  ).toBe("completed");
  expect(
    evaluationJobStatusFromGetJobAnswer({
      businessOutput: { value: JSON.stringify({ jobId: "evaluation:1", status: "cancelled" }) },
    }),
  ).toBe("cancelled");
  // A non-JSON string is not a record, so the answer stays unknown rather than being read as a status.
  expect(evaluationJobStatusFromGetJobAnswer("not json")).toBeUndefined();
  expect(evaluationJobStatusFromGetJobAnswer(JSON.stringify({ jobId: "evaluation:1" }))).toBeUndefined();
});

/**
 * Measured on run172 with a bounded shape probe — the live answer is a **pair of nested externalization
 * markers**, not one:
 *
 * ```
 * decodedKeys=transferState,resultHash,byteLength,businessOutput,durableLocator,evidenceRef
 * businessKeys=transferState,resultHash,byteLength   ← the businessOutput is itself a marker
 * status=undefined
 * ```
 *
 * That is the same lesson `supervised-replay-handoff-recovery.ts` records for the resume path: the record sits
 * inside one or more envelope layers, and reading a fixed depth makes a present row look absent. The reader must
 * unwrap `businessOutput`/`value` layers (bounded) before concluding the status is unknown — which is why three
 * earlier attempts at this short-circuit shipped without suppressing anything.
 */
test("run157 item 8d the status reader unwraps nested markers", () => {
  const job = { jobId: "evaluation:1", status: "failed" };
  expect(
    evaluationJobStatusFromGetJobAnswer({
      transferState: "externalized",
      businessOutput: { transferState: "externalized", businessOutput: job },
    }),
  ).toBe("failed");
  expect(
    evaluationJobStatusFromGetJobAnswer({
      businessOutput: { businessOutput: { businessOutput: { value: job } } },
    }),
  ).toBe("failed");
  // Serialized at the inner layer.
  expect(
    evaluationJobStatusFromGetJobAnswer({
      businessOutput: { businessOutput: JSON.stringify(job) },
    }),
  ).toBe("failed");
  // A locator that never reaches a record stays unknown rather than being guessed.
  expect(
    evaluationJobStatusFromGetJobAnswer({
      businessOutput: { transferState: "externalized", outputKey: "sha256:abc" },
    }),
  ).toBeUndefined();
});

/**
 * Run 100 addendum 28 §2 follow-up, measured on run162: with the pre-check wired, `evaluation:get-job` was
 * called but the cancel still failed for part of the stream. The check was reading *any* object answer as
 * "the job exists", and the host answers a failed or degraded read with a degradation receipt — so the pass
 * cancelled a row that the same store then reported missing. The predicate now recognises only what proves
 * existence: a job identity, or the externalization marker a large-but-present job is delivered behind.
 */
test("run157 item 8d only a real job answer proves existence", () => {
  expect(evaluationJobExistsFromGetJobAnswer(null)).toBe(false);
  expect(evaluationJobExistsFromGetJobAnswer(undefined)).toBe(false);
  expect(evaluationJobExistsFromGetJobAnswer({ jobId: "evaluation-replay-1", status: "scored" })).toBe(
    true,
  );
  /**
   * Measured on run163: a run where get-job "found" rows that cancel then reported missing. A job *record*
   * always carries a status, while a failure or degradation envelope can echo the requested `jobId` back
   * without any row behind it — so a bare `jobId` is not proof and must stay unknown.
   */
  expect(evaluationJobExistsFromGetJobAnswer({ jobId: "evaluation-replay-1" })).toBeNull();
  expect(evaluationJobExistsFromGetJobAnswer({ jobId: "evaluation-replay-1", status: "" })).toBeNull();
  // A large job arrives as a transfer marker; it still proves the row is there.
  expect(
    evaluationJobExistsFromGetJobAnswer({
      schemaVersion: "role-model.extension-output-transfer.v1",
      outputKey: "sha256:abc",
    }),
  ).toBe(true);
  // A degradation receipt says the *read* failed, not that the job is absent: unknown, so the caller keeps
  // the previous behaviour instead of skipping a row that may exist.
  expect(
    evaluationJobExistsFromGetJobAnswer({
      schemaVersion: "role-model.degradation-receipt.v1",
      code: "timeout",
    }),
  ).toBeNull();
  expect(evaluationJobExistsFromGetJobAnswer({ unexpected: true })).toBeNull();
});
