import { describe, expect, test } from "vitest";

import { describeReplayDisposition } from "./replay-disposition-copy";

/**
 * Run 98 addendum 24 (§5.4 / Deferred row 1): the durable receipt learned to name
 * `replay_handoff_evaluation_pending` when a replay handed its branches to Evaluation Core and the
 * evaluation owns the remaining clock. The operator surface still rendered the old vocabulary, so a
 * capture whose provider work completed read like a failed replay. This pins the copy.
 */
describe("run98 a24 replay disposition copy", () => {
  test("a handoff that is waiting on evaluation does not read as a failed replay", () => {
    for (const detail of [
      "replay_handoff_evaluation_pending",
      '{"reason":"replay_handoff_evaluation_pending","evaluationJobId":"evaluation-replay-1"}',
    ]) {
      const copy = describeReplayDisposition({ outcome: "refused", detail });
      expect(copy.label).toBe("Handed off");
      expect(copy.tone).toBe("neutral");
      expect(copy.explanation).toMatch(/Evaluation Core owns the remaining clock/);
      expect(copy.explanation).toMatch(/not a failed replay/);
      // The raw vocabulary stays visible for an operator who needs to grep the ledger.
      expect(copy.explanation).not.toBe("");
      expect(copy.raw).toBe(detail);
    }
  });

  test("a completed replay says what happened", () => {
    const copy = describeReplayDisposition({ outcome: "replayed", detail: "" });
    expect(copy.label).toBe("Replayed");
    expect(copy.tone).toBe("success");
    expect(copy.explanation).toMatch(/durable/);
  });

  test("a refused replay names its bounded reason", () => {
    const copy = describeReplayDisposition({
      outcome: "refused",
      detail: 'replay endpoint HTTP 409: {"error":"extension replay-core failed: timeout"}',
    });
    expect(copy.label).toBe("Refused");
    expect(copy.tone).toBe("error");
    expect(copy.explanation).toMatch(/timeout/);
  });

  test("a deferred replay reads as retryable", () => {
    const copy = describeReplayDisposition({
      outcome: "deferred",
      detail: "durable replay state is deferred (deferral budget exhausted after 4 attempts)",
    });
    expect(copy.label).toBe("Deferred");
    expect(copy.tone).toBe("warning");
    expect(copy.explanation).toMatch(/retryable|queued/i);
  });

  test("an unknown vocabulary is passed through instead of invented", () => {
    const copy = describeReplayDisposition({ outcome: "brand_new_state", detail: "something new" });
    expect(copy.label).toBe("brand_new_state");
    expect(copy.tone).toBe("neutral");
    expect(copy.explanation).toBe("something new");
    const bare = describeReplayDisposition({ outcome: "brand_new_state", detail: "" });
    expect(bare.explanation).toMatch(/no detail/i);
  });
});
