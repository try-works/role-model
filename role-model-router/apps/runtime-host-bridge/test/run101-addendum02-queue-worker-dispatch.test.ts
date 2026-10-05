/**
 * Run 101 addendum 02 - the replay queue's worker must execute the capture it
 * claimed, not offer it back to the queue it came from.
 *
 * Measured live on `stage-rc-35c4a84fb643` (`:3457`), the first runtime whose
 * replay plane actually left `legacy`: a qualifying capture became a
 * `replay.dispatch` job whose id was the capture ref, and every attempt failed
 * with `queued capture <ref> was not dispatched` - five times, then terminal -
 * because the worker's restricted tick re-offered the capture to the queue and
 * therefore skipped the legacy execution R4 only skips for *unclaimed* work.
 *
 * RED at the pre-repair revision (`7a572efa`): assertion 2 rejects with
 * `queued capture req-add02-1 was not dispatched`.
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { startAutoReplayLoop } from "../src/track-b-auto-replay-runtime.js";
import { createReplayLedger } from "../src/track-b-replay-ledger.js";
import { buildReplayPolicySet } from "../src/track-b-replay-policy.js";

function harness() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "run101-add02-"));
  return {
    ledger: createReplayLedger({
      filePath: path.join(dir, "ledger.json"),
      now: () => Date.parse("2026-09-27T06:30:00Z"),
    }),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function fakeOperations(pending: string[]) {
  const recorded: Array<Record<string, unknown>> = [];
  return {
    recorded,
    async listPendingReplayCaptures() {
      return { pending, pendingCount: pending.length };
    },
    async recordReplayDisposition(input: Record<string, unknown>) {
      recorded.push(input);
      return { recorded: true };
    },
  };
}

function startLoop(options: {
  readonly pending: string[];
  readonly offers: Array<Record<string, unknown>>;
  readonly operations: ReturnType<typeof fakeOperations>;
  readonly ledger: ReturnType<typeof createReplayLedger>;
}) {
  return startAutoReplayLoop({
    operations: options.operations,
    ledger: options.ledger,
    policySet: buildReplayPolicySet(),
    configuredEndpointIds: ["endpoint-a", "endpoint-b", "endpoint-c"],
    executor: async ({ capture, candidates }) => ({
      terminal: true,
      branches: candidates.map((endpointId) => ({
        endpointId,
        outcome: "complete" as const,
      })),
      captureRefSeen: capture.captureRef,
    }),
    intervalMs: 60_000,
    dispatchQueue: {
      mode: "queue",
      offer: async (job) => {
        options.offers.push(job);
        return { enqueued: true, jobId: job.captureRef };
      },
    },
    planeModes: { replay: "queue", evaluation: "legacy", learner: "legacy" },
    now: () => Date.parse("2026-09-27T06:30:00Z"),
  });
}

test("@recursive:101-effect-mq-queue-rebuild addendum02: the worker executes the capture it claimed", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations(["req-add02-1"]);
    const offers: Array<Record<string, unknown>> = [];
    const loop = startLoop({ pending: ["req-add02-1"], offers, operations, ledger });

    // The interval tick offers the admitted capture and, because the plane is
    // authoritative, does not execute it inline.
    const tick = await loop.tick();
    expect(tick.queued).toBe(1);
    expect(tick.replayed).toBe(0);
    expect(offers).toHaveLength(1);
    expect(operations.recorded).toHaveLength(0);

    // The worker's restricted tick executes it - and must not enqueue it again.
    const dispatch = await loop.dispatchCapture("req-add02-1");
    loop.stop();
    expect(offers, "a claimed job must not be offered back to its own queue").toHaveLength(1);
    expect(dispatch.replayed).toBe(1);
    expect(operations.recorded.map((row) => row.outcome)).toEqual(["replayed"]);
  } finally {
    cleanup();
  }
});

test("@recursive:101-effect-mq-queue-rebuild addendum02/25: a capture that is no longer pending is a no-op the worker acks", async () => {
  const { ledger, cleanup } = harness();
  try {
    const operations = fakeOperations([]);
    const offers: Array<Record<string, unknown>> = [];
    const loop = startLoop({ pending: [], offers, operations, ledger });
    /**
     * Run 101 addendum 25 (measured live: 229 dead-lettered `replay.dispatch` jobs): a capture the tick no longer
     * holds back (`queued === 0`) has nothing left to do, so the worker must ack it instead of burning an attempt.
     * Only a capture the tick still holds (`queued > 0`) stays an error - `run101-addendum25` covers that side.
     */
    await expect(loop.dispatchCapture("req-add02-missing")).resolves.toMatchObject({ queued: 0 });
    loop.stop();
    expect(offers).toHaveLength(0);
  } finally {
    cleanup();
  }
});
