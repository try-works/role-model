/**
 * Run 101 / R5 + R9 (Phase 3.5 repair) - the worker side of the queue admin actions.
 *
 * The operator routes (private repository, `shared/queues/queue-admin.mjs`) write three
 * things the runtime has to honour:
 *
 * - `queue_control.draining = 1` stops a queue claiming new work while in-flight attempts
 *   still reach a terminal state ("drain stops claiming and lets in-flight work finish",
 *   design of record §4.2);
 * - `effect_queue.state = 'cancelled'` is terminal, and a handler that is *running* when its
 *   row is cancelled must be interrupted at the next lock boundary rather than completing and
 *   acking work the operator has stopped (design of record §3.6);
 * - the client methods the new route uses exist with the shapes the operator API answers.
 *
 * RED at the frozen baseline: `src/queue-runtime/admin.ts` does not exist, so this file fails
 * to import.
 */
import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";

import { Effect } from "effect";

import {
  QueueJobCancelledError,
  isQueueDraining,
  readQueueJobState,
} from "../src/queue-runtime/admin.js";
import { EVALUATION_SCORE_QUEUE } from "../src/queue-runtime/evaluation.js";
import {
  enqueueEvaluationScore,
  makeEvaluationScoreQueue,
} from "../src/queue-runtime/evaluation.js";
import { QUEUE_NAMES, QUEUE_POLICY_SCHEMA_VERSION } from "../src/queue-runtime/policy.js";
import { storeLayerForQueuePolicy } from "../src/queue-runtime/store.js";
import { runEvaluationScoreWorker } from "../src/queue-runtime/workers.js";

const workerStoreLayer = storeLayerForQueuePolicy;

/**
 * A worker reads the kill switch from the effective document and treats "no document" as
 * "do not claim", so every worker test has to publish the document it means. The state-root
 * copy is the effective one; the shipped copy is not present in a source checkout.
 */
function publishPolicy(stateRoot: string): void {
  const parameters = {
    mode: "queue",
    concurrency: 1,
    attempts: 3,
    backoffBaseMs: 100,
    backoffCapMs: 1_000,
    lockRefreshMs: 1_000,
    lockExpirationMs: 5_000,
    retentionDays: 30,
  };
  mkdirSync(path.join(stateRoot, "queues"), { recursive: true });
  writeFileSync(
    path.join(stateRoot, "queues", "queue-policy.json"),
    JSON.stringify({
      schemaVersion: QUEUE_POLICY_SCHEMA_VERSION,
      policyVersion: 1,
      global: { killSwitch: false },
      queues: Object.fromEntries(QUEUE_NAMES.map((name) => [name, { ...parameters }])),
      updatedAt: null,
      receipts: [],
    }),
    "utf8",
  );
}

const sandboxes: string[] = [];

function makeStateRoot(): string {
  const root = path.join(
    os.tmpdir(),
    `run101-cancel-drain-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
  );
  mkdirSync(path.join(root, "track-b", "queues"), { recursive: true });
  sandboxes.push(root);
  return root;
}

afterEach(() => {
  while (sandboxes.length > 0) {
    const root = sandboxes.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

/** A store the vendored library owns, created by a real offered job. */
function seedQueueStore(stateRoot: string, jobId: string): void {
  const database = new DatabaseSync(path.join(stateRoot, "track-b", "queues", "queues.sqlite"));
  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS effect_queue (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL,
        queue_name TEXT NOT NULL,
        element TEXT NOT NULL,
        state TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_failure TEXT NULL,
        visible_at DATETIME NOT NULL,
        acquired_at DATETIME NULL,
        acquired_by TEXT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      );
    `);
    database
      .prepare(
        `INSERT INTO effect_queue (id, queue_name, element, state, attempts, visible_at, created_at, updated_at)
         VALUES (?, ?, '{}', 'pending', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      )
      .run(jobId, EVALUATION_SCORE_QUEUE);
  } finally {
    database.close();
  }
}

describe("run 101 R5/R9 queue admin runtime side", () => {
  it("reads the drain flag and answers false for an absent store", () => {
    const emptyRoot = makeStateRoot();
    assert.equal(isQueueDraining({ stateRoot: emptyRoot, queue: EVALUATION_SCORE_QUEUE }), false);

    const stateRoot = makeStateRoot();
    const database = new DatabaseSync(path.join(stateRoot, "track-b", "queues", "queues.sqlite"));
    try {
      database.exec(
        `CREATE TABLE queue_control (queue_name TEXT PRIMARY KEY, draining INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
         INSERT INTO queue_control VALUES ('${EVALUATION_SCORE_QUEUE}', 1, CURRENT_TIMESTAMP);`,
      );
    } finally {
      database.close();
    }
    assert.equal(isQueueDraining({ stateRoot, queue: EVALUATION_SCORE_QUEUE }), true);
    assert.equal(isQueueDraining({ stateRoot, queue: "learner.derive" }), false);
  });

  it("reads one job's state, and answers null when the row or store is absent", () => {
    const stateRoot = makeStateRoot();
    seedQueueStore(stateRoot, "evaluation:replay:job-1");
    assert.equal(
      readQueueJobState({
        stateRoot,
        queue: EVALUATION_SCORE_QUEUE,
        jobId: "evaluation:replay:job-1",
      })?.state,
      "pending",
    );
    assert.equal(
      readQueueJobState({ stateRoot, queue: EVALUATION_SCORE_QUEUE, jobId: "nope" }),
      null,
    );
    assert.equal(
      readQueueJobState({ stateRoot: makeStateRoot(), queue: EVALUATION_SCORE_QUEUE, jobId: "x" }),
      null,
    );
  });

  it("claims nothing while the queue is draining, and claims again once it is cleared", async () => {
    const stateRoot = makeStateRoot();
    publishPolicy(stateRoot);
    const policy = {
      queue: EVALUATION_SCORE_QUEUE,
      mode: "queue" as const,
      concurrency: 1,
      attempts: 3,
      backoffBaseMs: 100,
      backoffCapMs: 1_000,
      lockRefreshMs: 1_000,
      lockExpirationMs: 5_000,
      retentionDays: 30,
      killSwitch: false,
      policyVersion: 1,
    };
    const attempts: string[] = [];
    const worker = runEvaluationScoreWorker({
      stateRoot,
      policy,
      handler: async (job) => {
        attempts.push(job.replayJobId ?? "unknown");
      },
      onAttemptFailure: () => undefined,
      killSwitchPollIntervalMs: 50,
      cancellationPollIntervalMs: 50,
    });
    try {
      // Drain first: the offer must sit unclaimed.
      const database = new DatabaseSync(path.join(stateRoot, "track-b", "queues", "queues.sqlite"));
      try {
        database.exec(
          `CREATE TABLE IF NOT EXISTS queue_control (queue_name TEXT PRIMARY KEY, draining INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL);
           INSERT OR REPLACE INTO queue_control VALUES ('${EVALUATION_SCORE_QUEUE}', 1, CURRENT_TIMESTAMP);`,
        );
      } finally {
        database.close();
      }
      await Effect.runPromise(
        Effect.gen(function* () {
          const queue = yield* makeEvaluationScoreQueue(policy);
          yield* enqueueEvaluationScore({
            queue,
            job: { origin: "replay", groupId: null, replayJobId: "job-drained" },
          });
        }).pipe(Effect.provide(workerStoreLayer({ stateRoot, policy })), Effect.scoped),
      );
      await new Promise((resolve) => setTimeout(resolve, 500));
      assert.deepEqual(attempts, [], "a draining queue claims nothing");

      // Clear the flag: the same job is claimed, so the gate is a gate and not a loss.
      const reopen = new DatabaseSync(path.join(stateRoot, "track-b", "queues", "queues.sqlite"));
      try {
        reopen.exec(
          `UPDATE queue_control SET draining = 0 WHERE queue_name = '${EVALUATION_SCORE_QUEUE}'`,
        );
      } finally {
        reopen.close();
      }
      await new Promise((resolve) => setTimeout(resolve, 900));
      assert.deepEqual(attempts, ["job-drained"]);
    } finally {
      await worker.stop();
    }
  });

  it("interrupts a running handler whose row is cancelled, without completing it", async () => {
    const stateRoot = makeStateRoot();
    publishPolicy(stateRoot);
    const policy = {
      queue: EVALUATION_SCORE_QUEUE,
      mode: "queue" as const,
      concurrency: 1,
      attempts: 3,
      backoffBaseMs: 100,
      backoffCapMs: 1_000,
      lockRefreshMs: 1_000,
      lockExpirationMs: 5_000,
      retentionDays: 30,
      killSwitch: false,
      policyVersion: 1,
    };
    let started = false;
    let finished = false;
    const worker = runEvaluationScoreWorker({
      stateRoot,
      policy,
      handler: async () => {
        started = true;
        await new Promise((resolve) => setTimeout(resolve, 3_000));
        finished = true;
      },
      onAttemptFailure: () => undefined,
      killSwitchPollIntervalMs: 50,
      cancellationPollIntervalMs: 50,
    });
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const queue = yield* makeEvaluationScoreQueue(policy);
          yield* enqueueEvaluationScore({
            queue,
            job: { origin: "replay", groupId: null, replayJobId: "job-cancelled" },
          });
        }).pipe(Effect.provide(workerStoreLayer({ stateRoot, policy })), Effect.scoped),
      );
      await new Promise((resolve) => setTimeout(resolve, 700));
      assert.equal(started, true, "the handler started before the cancel");

      const database = new DatabaseSync(path.join(stateRoot, "track-b", "queues", "queues.sqlite"));
      try {
        database.exec(
          `UPDATE effect_queue SET state = 'cancelled', acquired_at = NULL, acquired_by = NULL, updated_at = CURRENT_TIMESTAMP
           WHERE queue_name = '${EVALUATION_SCORE_QUEUE}'`,
        );
      } finally {
        database.close();
      }
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      assert.equal(finished, false, "the cancelled handler did not run to completion");
      const verify = new DatabaseSync(path.join(stateRoot, "track-b", "queues", "queues.sqlite"), {
        readOnly: true,
      });
      try {
        const row = verify
          .prepare("SELECT state, attempts FROM effect_queue WHERE queue_name = ?")
          .get(EVALUATION_SCORE_QUEUE) as { state: string; attempts: number };
        assert.equal(row.state, "cancelled", "the row stays cancelled");
      } finally {
        verify.close();
      }
    } finally {
      await worker.stop();
    }
  });

  it("names the cancellation it performed, so a caller can tell it from a failure", () => {
    const cancelled = new QueueJobCancelledError("evaluation:replay:job-9");
    assert.equal(cancelled.name, "QueueJobCancelledError");
    assert.match(cancelled.message, /evaluation:replay:job-9/);
  });
});
