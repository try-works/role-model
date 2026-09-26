import { execFileSync } from "node:child_process";
/**
 * Run 101 / R6 - the learner plane's queues.
 *
 * The three properties R6 asks for, and the defect each one removes:
 *
 * 1. a **skip stays claimable** - the old per-process `attemptedGroupIds` set
 *    consumed a skipped group for the life of the process;
 * 2. **progress is durable** - a restart used to re-walk the whole backlog;
 * 3. **promotion is serialized** - promotion used to be serialized only by
 *    convention.
 */
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  LEARNER_DERIVE_QUEUE,
  LEARNER_PROMOTE_QUEUE,
  deriveJobId,
  enqueueLearnerDerive,
  enqueueLearnerPromote,
  makeLearnerDeriveQueue,
  makeLearnerPromoteQueue,
  promoteJobId,
} from "../src/queue-runtime/learner.js";
import { resolveQueuePolicy } from "../src/queue-runtime/policy.js";
import { storeLayerForQueuePolicy } from "../src/queue-runtime/store.js";
import { runLearnerDeriveWorker, runLearnerPromoteWorker } from "../src/queue-runtime/workers.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function ensureWrapperBuilt(packageDirName: string): void {
  const packageDir = path.join(repoRoot, "role-model-router", "packages", packageDirName);
  if (existsSync(path.join(packageDir, "dist", "index.js"))) return;
  execFileSync(process.execPath, ["build.mjs"], { cwd: packageDir, stdio: "pipe" });
}

ensureWrapperBuilt("effect");
ensureWrapperBuilt("effect-mq");
ensureWrapperBuilt("sql-sqlite-node");

function policyDocument(overrides: Record<string, number> = {}) {
  const base = {
    mode: "queue",
    concurrency: 1,
    attempts: 4,
    backoffBaseMs: 100,
    backoffCapMs: 1_000,
    lockRefreshMs: 1_000,
    lockExpirationMs: 5_000,
    retentionDays: 30,
    ...overrides,
  };
  return {
    schemaVersion: "role-model.queue-policy.v1",
    policyVersion: 1,
    global: { killSwitch: false },
    queues: {
      [LEARNER_DERIVE_QUEUE]: { ...base },
      [LEARNER_PROMOTE_QUEUE]: { ...base, concurrency: 1 },
    },
    updatedAt: null,
    receipts: [],
  };
}

let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-sp6-"));
  await mkdir(path.join(stateRoot, "queues"), { recursive: true });
  await writeFile(
    path.join(stateRoot, "queues", "queue-policy.json"),
    JSON.stringify(policyDocument()),
    "utf8",
  );
});
afterEach(async () => {
  await rm(stateRoot, { recursive: true, force: true });
});

describe("@recursive:101-effect-mq-queue-rebuild @sp6 R6 learner queues", () => {
  it("keys the jobs on the group and the candidate", () => {
    expect(deriveJobId({ groupId: "group-1" })).toBe("learner.derive:group-1");
    expect(promoteJobId({ candidateId: "candidate-1" })).toBe("learner.promote:candidate-1");
    expect(() => deriveJobId({ groupId: "" })).toThrow(/group id/);
  });

  it("keeps a skipped group claimable instead of consuming it", async () => {
    const policy = resolveQueuePolicy(policyDocument() as never, { queue: LEARNER_DERIVE_QUEUE });
    const layer = storeLayerForQueuePolicy({ stateRoot, policy });
    const attempts: string[] = [];
    const worker = runLearnerDeriveWorker({
      stateRoot,
      policy,
      handler: async (job) => {
        attempts.push(job.groupId);
        // A named skip is a failure: the group must stay claimable.
        if (attempts.length < 2) throw new Error("capture is outside the retention window");
      },
      onAttemptFailure: () => undefined,
    });
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const queue = yield* makeLearnerDeriveQueue(policy);
          yield* enqueueLearnerDerive({
            queue,
            job: { groupId: "group-skip", reason: "finalized" },
          });
        }).pipe(Effect.provide(layer), Effect.scoped),
      );
      await new Promise((resolve) => setTimeout(resolve, 3_500));
    } finally {
      await worker.stop();
    }
    expect(attempts.length).toBeGreaterThanOrEqual(2);
  });

  it("carries learner progress across a worker restart", async () => {
    const policy = resolveQueuePolicy(policyDocument() as never, { queue: LEARNER_DERIVE_QUEUE });
    const layer = storeLayerForQueuePolicy({ stateRoot, policy });

    await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* makeLearnerDeriveQueue(policy);
        yield* enqueueLearnerDerive({
          queue,
          job: { groupId: "group-restart", reason: "finalized" },
        });
      }).pipe(Effect.provide(layer), Effect.scoped),
    );

    // First worker dies before acknowledging.
    const firstWorker = runLearnerDeriveWorker({
      stateRoot,
      policy,
      handler: async () => {
        throw new Error("worker died before acking");
      },
      onAttemptFailure: () => undefined,
    });
    await new Promise((resolve) => setTimeout(resolve, 300));
    await firstWorker.stop();

    // A fresh worker must still see the group: progress is durable, not a
    // per-process set.
    const seen: string[] = [];
    const secondWorker = runLearnerDeriveWorker({
      stateRoot,
      policy,
      handler: async (job) => {
        seen.push(job.groupId);
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 3_500));
    await secondWorker.stop();
    expect(seen).toContain("group-restart");
  });

  it("serializes promotion so two candidates never promote at once", async () => {
    const policy = resolveQueuePolicy(policyDocument() as never, { queue: LEARNER_PROMOTE_QUEUE });
    const layer = storeLayerForQueuePolicy({ stateRoot, policy });
    let inFlight = 0;
    let maxInFlight = 0;
    const promoted: string[] = [];
    const worker = runLearnerPromoteWorker({
      stateRoot,
      policy,
      handler: async (job) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 150));
        promoted.push(job.candidateId);
        inFlight -= 1;
      },
    });
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const queue = yield* makeLearnerPromoteQueue(policy);
          yield* enqueueLearnerPromote({ queue, job: { candidateId: "candidate-a" } });
          yield* enqueueLearnerPromote({ queue, job: { candidateId: "candidate-b" } });
        }).pipe(Effect.provide(layer), Effect.scoped),
      );
      await new Promise((resolve) => setTimeout(resolve, 2_500));
    } finally {
      await worker.stop();
    }
    expect(promoted.sort()).toEqual(["candidate-a", "candidate-b"]);
    expect(maxInFlight).toBe(1);
  });
});
