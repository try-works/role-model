/**
 * Run 101 addendum 44 - route pending dispatch readback must not hydrate every queue row.
 *
 * Live production :3456 showed replay.dispatch rows terminalized with a 10 minute timeout while the
 * replay walk kept reporting "route pending dispatches unavailable". The queue plane itself had only
 * two rows, but the pending-dispatch reader listed jobs and then performed one sidecar read per row;
 * those reads can take >120 s each on the live sidecar, so the worker/tick never reaches a stable
 * pending view. The summary already carries the fields the planner needs, so it must be accepted
 * directly and hydrated only as a compatibility fallback.
 */
import { describe, expect, it } from "vitest";

import { readPendingRouteDispatches } from "../src/route-challenge-evidence.js";

const capture = {
  requestId: "req-live-queue-1",
  roleId: "coder",
  taskTypeId: "coder.debug.root_cause",
  endpointId: "baseline.endpoint",
  scope: "standalone-runtime",
  rootArtifactId: "artifact-1",
  replaySource: { kind: "live" },
  trace: { scopeId: "standalone-runtime", channel: "production", readiness: "ready", completeness: "complete" },
};

describe("@recursive:101-effect-mq-queue-rebuild addendum44 pending queue readback", () => {
  it("uses complete queue summaries without calling per-job readback", async () => {
    let readQueueJobCalls = 0;
    const result = await readPendingRouteDispatches({
      request: { roleId: "coder", taskTypeId: "coder.debug.root_cause" },
      readCapture: async () => capture,
      invoke: async (_extensionId, capability, value) => {
        if (capability === "replay:list-jobs") return [];
        throw new Error("unexpected replay hydrate " + String((value as { jobId?: unknown }).jobId));
      },
      readQueueJobs: async () => ({
        schemaVersion: "role-model.operator-queue-jobs.v1",
        queue: "replay.dispatch",
        available: true,
        jobs: [
          {
            id: "replay-round-live-1",
            queue: "replay.dispatch",
            state: "failed",
            payload: {
              captureRef: "req-live-queue-1",
              endpointIds: ["candidate.endpoint"],
              policySetDigest: "digest",
              dispatchRoundId: "round-1",
            },
            createdAt: "2026-10-13 14:03:04",
          },
        ],
      }),
      readQueueJob: async () => {
        readQueueJobCalls += 1;
        throw new Error("per-job readback should not be used for complete summaries");
      },
    });

    expect(readQueueJobCalls).toBe(0);
    expect(result).toEqual([
      {
        sourceType: "queue",
        replayJobId: null,
        queueJobId: "replay-round-live-1",
        captureRef: "req-live-queue-1",
        dispatchRoundId: "round-1",
        newEndpointId: "candidate.endpoint",
        againstEndpointId: "baseline.endpoint",
        createdAtMs: Date.parse("2026-10-13T14:03:04Z"),
        state: "failed",
      },
    ]);
  });
});
