/**
 * Run 101 addendum 09 - the producer side, tested without a store file.
 *
 * effect-mq guidance #7 (`testing.md#assert-what-your-services-enqueue`): the guide's `TestJobStore` lets a test
 * assert exactly what a producer enqueues - ids, payload and refusals - without a database. The four `enqueue*`
 * helpers already accept a minimal `{ offer }` shape, so this suite is the seam the guide assumes: a recording
 * stub in place of the store.
 *
 * RED at the pre-repair revision (`667b4c19`): this file does not exist; the targeted assertions are the new
 * evidence (the helpers themselves are unchanged, which is the point - the seam was always there).
 */
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { enqueueEvaluationScore } from "../src/queue-runtime/evaluation.js";
import { enqueueLearnerDerive, enqueueLearnerPromote } from "../src/queue-runtime/learner.js";
import { enqueueReplayDispatch } from "../src/queue-runtime/queues.js";

function recordingQueue() {
  const offered: Array<{ value: unknown; id: string | undefined }> = [];
  return {
    offered,
    queue: {
      offer: (value: unknown, options?: { readonly id: string | undefined }) =>
        Effect.sync(() => {
          offered.push({ value, id: options?.id });
          return "receipt";
        }),
    },
  };
}

describe("@recursive:101-effect-mq-queue-rebuild addendum09 producer seam", () => {
  it("replay.dispatch enqueues with the capture ref as the job id", async () => {
    const { queue, offered } = recordingQueue();
    const result = await Effect.runPromise(
      enqueueReplayDispatch({
        queue,
        capture: { captureRef: "req-add09-1", endpointIds: ["endpoint-b"], policySetDigest: "d" },
      }),
    );
    expect(result).toEqual({ enqueued: true, jobId: "req-add09-1" });
    expect(offered[0]?.id).toBe("req-add09-1");
    expect(offered[0]?.value).toMatchObject({ captureRef: "req-add09-1" });
  });

  it("replay.dispatch refuses an unadmitted capture without touching the store", async () => {
    const { queue, offered } = recordingQueue();
    const refused = await Effect.runPromise(
      enqueueReplayDispatch({
        queue,
        capture: { captureRef: "req-add09-2", endpointIds: [], policySetDigest: "d" },
        admission: { accepted: false, reason: "budget_exhausted" },
      }),
    );
    expect(refused).toEqual({ enqueued: false, reason: "budget_exhausted" });
    expect(offered).toEqual([]);

    const nameless = await Effect.runPromise(
      enqueueReplayDispatch({
        queue,
        capture: { captureRef: "", endpointIds: ["endpoint-b"], policySetDigest: "d" },
      }),
    );
    expect(nameless).toEqual({ enqueued: false, reason: "capture_ref_required" });
    expect(offered).toEqual([]);
  });

  it("evaluation.score derives evaluation:<origin>:<key> and refuses a job with no key", async () => {
    const { queue, offered } = recordingQueue();
    const byGroup = await Effect.runPromise(
      enqueueEvaluationScore({ queue, job: { origin: "observation", groupId: "group-1" } }),
    );
    expect(byGroup).toEqual({ enqueued: true, jobId: "evaluation:observation:group-1" });
    const byReplay = await Effect.runPromise(
      enqueueEvaluationScore({ queue, job: { origin: "replay", replayJobId: "job-9" } }),
    );
    expect(byReplay).toEqual({ enqueued: true, jobId: "evaluation:replay:job-9" });
    expect(offered.map((entry) => entry.id)).toEqual([
      "evaluation:observation:group-1",
      "evaluation:replay:job-9",
    ]);

    const keyless = await Effect.runPromise(
      enqueueEvaluationScore({ queue, job: { origin: "replay" } }),
    );
    expect(keyless).toEqual({ enqueued: false, reason: "evaluation_key_required" });
    expect(offered).toHaveLength(2);
  });

  it("the learner planes derive learner.derive:<groupId> and learner.promote:<candidateId>", async () => {
    const { queue, offered } = recordingQueue();
    const derive = await Effect.runPromise(
      enqueueLearnerDerive({ queue, job: { groupId: "group-2", reason: null } }),
    );
    expect(derive).toEqual({ enqueued: true, jobId: "learner.derive:group-2" });
    const promote = await Effect.runPromise(
      enqueueLearnerPromote({ queue, job: { candidateId: "cand-3", groupId: "group-2" } }),
    );
    expect(promote).toEqual({ enqueued: true, jobId: "learner.promote:cand-3" });
    expect(offered.map((entry) => entry.id)).toEqual([
      "learner.derive:group-2",
      "learner.promote:cand-3",
    ]);
  });
});
