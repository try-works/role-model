import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readQueueJobState } from "../src/queue-runtime/admin.js";
import {
  AttemptFenceRejectedError,
  openAttemptFenceStore,
} from "../src/queue-runtime/fence.js";
import { startReplayQueueRuntime } from "../src/queue-runtime/index.js";
import { runReplayDispatchWorker } from "../src/queue-runtime/workers.js";

/**
 * R30 bounded slice: evidence-before-ack and the kill/lease/late-completion fence.
 *
 * The persisted queue acks an element when the handler fiber succeeds. That ack is only
 * safe when the attempt still owns its fence and its evidence is already durable, so the
 * fence is the durable gate in front of the queue's own completion update:
 *
 * - complete() refuses while evidence is missing (no ack without durable evidence);
 * - recordEvidence() and complete() refuse after a kill or once the lease has lapsed;
 * - a new lease on the same job fences the previous lease's late completion.
 */
let stateRoot = "";
const clock = { now: 0 };

beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "r30-fence-"));
  clock.now = 1_000;
});

afterEach(async () => {
  await rm(stateRoot, { recursive: true, force: true });
});

const open = (name = "fence.sqlite") =>
  openAttemptFenceStore({ databasePath: path.join(stateRoot, name), now: () => clock.now });

const publishQueuePolicy = async (attempts: number) => {
  await mkdir(path.join(stateRoot, "queues"), { recursive: true });
  await writeFile(
    path.join(stateRoot, "queues", "queue-policy.json"),
    JSON.stringify({
      schemaVersion: "role-model.queue-policy.v1",
      policyVersion: 1,
      global: { killSwitch: false },
      queues: {
        "replay.dispatch": {
          mode: "queue",
          concurrency: 1,
          attempts,
          backoffBaseMs: 100,
          backoffCapMs: 1_000,
          lockRefreshMs: 1_000,
          lockExpirationMs: 5_000,
          retentionDays: 30,
        },
      },
      updatedAt: null,
      receipts: [],
    }),
    "utf8",
  );
};

const waitForQueueState = async (jobId: string, state: string): Promise<void> => {
  const end = Date.now() + 12_000;
  let last = "missing";
  while (Date.now() < end) {
    last = readQueueJobState({ stateRoot, queue: "replay.dispatch", jobId })?.state ?? "missing";
    if (last === state) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("timed out waiting for " + jobId + " to reach " + state + " (last: " + last + ")");
};

describe("R30 attempt fence", () => {
  it("does not acknowledge an attempt until its evidence is durable", () => {
    const fence = open();
    const lease = fence.beginAttempt({ jobId: "job-evidence", attempt: 1, owner: "worker-a", leaseMs: 60_000 });

    expect(fence.complete(lease)).toEqual({ accepted: false, reason: "evidence_missing" });
    expect(fence.readAttempt("job-evidence", 1)).toMatchObject({ state: "active", leaseId: lease.leaseId });

    fence.recordEvidence(lease, { output: "mapped", tokens: 12 });
    expect(fence.complete(lease)).toEqual({ accepted: true });
    expect(fence.readAttempt("job-evidence", 1)?.state).toBe("completed");
    fence.close();

    // A fresh process reading the same database must see the evidence and the completion.
    const reopened = open();
    expect(reopened.readEvidence("job-evidence", 1)).toMatchObject({
      payload: { output: "mapped", tokens: 12 },
    });
    expect(reopened.readAttempt("job-evidence", 1)?.state).toBe("completed");
    reopened.close();
  });

  it("fences evidence and completion after a kill", () => {
    const fence = open();
    const lease = fence.beginAttempt({ jobId: "job-killed", attempt: 1, owner: "worker-a", leaseMs: 60_000 });
    fence.kill("job-killed");

    expect(() => fence.recordEvidence(lease, { output: "late" })).toThrow(AttemptFenceRejectedError);
    expect(fence.complete(lease)).toEqual({ accepted: false, reason: "killed" });
    expect(() =>
      fence.beginAttempt({ jobId: "job-killed", attempt: 2, owner: "worker-b", leaseMs: 60_000 }),
    ).toThrow(/killed/);
    fence.close();
  });

  it("fences a late completion after lease expiry and admits only the new lease", () => {
    const fence = open();
    const first = fence.beginAttempt({ jobId: "job-lease", attempt: 1, owner: "worker-a", leaseMs: 100 });

    clock.now = 1_101;
    expect(fence.complete(first)).toEqual({ accepted: false, reason: "lease_expired" });
    expect(() => fence.recordEvidence(first, { output: "late" })).toThrow(/expired|lease|lapsed/);

    const second = fence.beginAttempt({ jobId: "job-lease", attempt: 2, owner: "worker-b", leaseMs: 60_000 });
    expect(fence.complete(first)).toEqual({ accepted: false, reason: "lease_expired" });
    expect(() => fence.recordEvidence(first, { output: "late" })).toThrow(AttemptFenceRejectedError);

    fence.recordEvidence(second, { output: "fresh" });
    expect(fence.complete(second)).toEqual({ accepted: true });
    expect(fence.readAttempt("job-lease", 2)?.state).toBe("completed");
    expect(fence.readEvidence("job-lease", 2)?.payload).toEqual({ output: "fresh" });
    fence.close();
  });

  it("refuses a second active lease for the same attempt", () => {
    const fence = open();
    const first = fence.beginAttempt({ jobId: "job-held", attempt: 1, owner: "worker-a", leaseMs: 60_000 });
    expect(() =>
      fence.beginAttempt({ jobId: "job-held", attempt: 1, owner: "worker-b", leaseMs: 60_000 }),
    ).toThrow(/lease|held/);

    clock.now += 60_001;
    const replacement = fence.beginAttempt({ jobId: "job-held", attempt: 1, owner: "worker-b", leaseMs: 60_000 });
    expect(replacement.leaseId).not.toBe(first.leaseId);
    expect(fence.complete(first)).toEqual({ accepted: false, reason: "lease_expired" });
    fence.recordEvidence(replacement, { output: "reclaimed" });
    expect(fence.complete(replacement)).toEqual({ accepted: true });
    fence.close();
  });

  it("acks a persisted-queue job only after the handler records durable evidence", async () => {
    await publishQueuePolicy(1);
    const runtime = startReplayQueueRuntime({ stateRoot });
    expect(runtime.mode).toBe("queue");
    const fence = open("worker-fence.sqlite");
    const worker = runReplayDispatchWorker({
      cancellationPollIntervalMs: 20,
      fence,
      handler: async (job, context) => {
        context.fence?.recordEvidence({ captureRef: job.captureRef, output: "accepted" });
      },
      killSwitchPollIntervalMs: 20,
      policy: runtime.policy,
      stateRoot,
    });
    try {
      await runtime.dispatchQueue?.offer({
        captureRef: "req-fence-ack",
        endpointIds: ["endpoint-a"],
        policySetDigest: "digest",
      });
      await waitForQueueState("req-fence-ack", "completed");
      expect(fence.readEvidence("req-fence-ack", 1)?.payload).toEqual({
        captureRef: "req-fence-ack",
        output: "accepted",
      });
    } finally {
      await worker.stop();
      await runtime.stop();
      fence.close();
    }
  });

  it("leaves the persisted-queue job unacknowledged when the handler records no evidence", async () => {
    await publishQueuePolicy(1);
    const runtime = startReplayQueueRuntime({ stateRoot });
    const fence = open("worker-fence-missing.sqlite");
    const worker = runReplayDispatchWorker({
      cancellationPollIntervalMs: 20,
      fence,
      handler: async () => undefined,
      killSwitchPollIntervalMs: 20,
      policy: runtime.policy,
      stateRoot,
    });
    try {
      await runtime.dispatchQueue?.offer({
        captureRef: "req-fence-missing",
        endpointIds: ["endpoint-a"],
        policySetDigest: "digest",
      });
      await waitForQueueState("req-fence-missing", "failed");
      expect(fence.readEvidence("req-fence-missing", 1)).toBeNull();
      expect(fence.readAttempt("req-fence-missing", 1)?.state).toBe("active");
    } finally {
      await worker.stop();
      await runtime.stop();
      fence.close();
    }
  });
});
