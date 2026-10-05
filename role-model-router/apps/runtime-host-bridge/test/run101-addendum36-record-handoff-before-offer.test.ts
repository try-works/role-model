import { expect, test } from "vitest";

import { offerRecordedEvaluationHandoff } from "../src/track-b-auto-replay-runtime.js";

/**
 * Run 101 addendum 36 - the handoff must be recorded before its evaluation job is offered.
 *
 * Measured live on `:3457` (2026-09-28): the supervised replay executor offered the `evaluation.score` row and
 * only wrote the resume entry later, inside the completion. An attempt interrupted in that window left a queue
 * row whose scoped resume store held nothing at all; the worker's `no-op` classification acked it and the row
 * was recorded `completed`. Of the 46 live `evaluation.score` rows, **19 had no resume entry and no Evaluation
 * Core job** and **16 of those were recorded `completed`** - the comparison the replay had already paid for was
 * silently dropped rather than failed, and `completedRecent` could not be told apart from "comparisons were
 * scored".
 *
 * The invariant this file pins is the ordering, because that is the whole repair: record first, offer second.
 */

test("the resume entry is written before the evaluation job is offered", async () => {
  const order: string[] = [];

  const offered = await offerRecordedEvaluationHandoff({
    replayJobId: "replay-job-1",
    record: () => {
      order.push("record");
    },
    offer: async () => {
      order.push("offer");
      return { enqueued: true };
    },
  });

  expect(order).toEqual(["record", "offer"]);
  expect(offered).toEqual({ enqueued: true });
});

test("a store that refuses the entry does not cost the replay its offer", async () => {
  // The caller logs a declined entry itself; the offer must still run, because the offer is what the replay's
  // handoff reports and a refused entry is a store defect, not a failed handoff.
  const order: string[] = [];

  const offered = await offerRecordedEvaluationHandoff({
    replayJobId: "replay-job-2",
    record: () => {
      order.push("record");
      throw new Error("store declined");
    },
    offer: async () => {
      order.push("offer");
      return { enqueued: true };
    },
  });

  expect(order).toEqual(["record", "offer"]);
  expect(offered).toEqual({ enqueued: true });
});

test("a declined offer is reported, not thrown, after the entry is recorded", async () => {
  const order: string[] = [];

  const offered = await offerRecordedEvaluationHandoff({
    replayJobId: "replay-job-3",
    record: () => {
      order.push("record");
    },
    offer: async () => {
      order.push("offer");
      return { enqueued: false, reason: "queue closed" };
    },
  });

  // The addendum-27 Effect program retries the refusal and then resolves it as a value: the replay itself
  // already succeeded, so a refused handoff is reported by the caller, never thrown.
  expect(order).toEqual(["record", "offer", "offer", "offer"]);
  expect(offered.enqueued).toBe(false);
  expect(offered.reason).toContain("queue closed");
});
