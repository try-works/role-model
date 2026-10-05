/**
 * Run 101 / R10: the queue client speaks the operator surface's shape.
 *
 * The page's numbers are only queue truth if the client reads the right paths
 * with the right query parameters, so the paths are pinned here.
 */
import { describe, expect, it } from "vitest";

import { fetchQueueJob, fetchQueueJobs, fetchQueues, formatQueueAge } from "./queue-api";

async function recordFetch(payload: unknown) {
  const calls: string[] = [];
  const fetcher = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as Parameters<typeof fetchQueues>[0];
  return { calls, fetcher };
}

describe("@recursive:101-effect-mq-queue-rebuild @sp10 queue client", () => {
  it("reads the queue list from the operator surface", async () => {
    const { calls, fetcher } = await recordFetch({
      schemaVersion: "role-model.operator-queues.v1",
      queues: [],
    });
    const result = await fetchQueues(fetcher);
    expect(calls[0]).toContain("/api/role-model/operator/queues");
    expect(result.schemaVersion).toBe("role-model.operator-queues.v1");
  });

  it("scopes the job list to one queue and passes the state filter", async () => {
    const { calls, fetcher } = await recordFetch({
      schemaVersion: "role-model.operator-queue-jobs.v1",
      jobs: [],
    });
    await fetchQueueJobs("replay.dispatch", { state: "failed", limit: 25 }, fetcher);
    expect(calls[0]).toContain("/api/role-model/operator/queues/replay.dispatch/jobs");
    expect(calls[0]).toContain("state=failed");
    expect(calls[0]).toContain("limit=25");
  });

  it("reads one job's attempts and named failure", async () => {
    const { calls, fetcher } = await recordFetch({
      schemaVersion: "role-model.operator-queue-job.v1",
      job: null,
    });
    await fetchQueueJob("evaluation.score", "evaluation:replay:rj-1", fetcher);
    expect(calls[0]).toContain(
      "/api/role-model/operator/queues/evaluation.score/jobs/evaluation%3Areplay%3Arj-1",
    );
  });

  it("renders an absent age as a dash rather than a number", () => {
    expect(formatQueueAge(null)).toBe("—");
    expect(formatQueueAge(0)).toBe("0s");
    expect(formatQueueAge(90_000)).toBe("1m");
    expect(formatQueueAge(3 * 60 * 60 * 1000)).toBe("3h");
  });
});
