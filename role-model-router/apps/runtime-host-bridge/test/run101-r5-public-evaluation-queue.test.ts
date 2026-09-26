/**
 * Run 101 / R5 (host side) - the `evaluation.score` queue the host can host.
 *
 * Design note (recorded plan deviation): the plan's D4 puts this worker in the
 * Track B sidecar. The capability calls it drives (`materialize-trials`,
 * scoring, resume) live in the *host's* operations surface, so hosting the
 * worker beside them avoids adding a cross-process RPC purely to move
 * scheduling. Both hosts still share the one queue store, so moving the worker
 * later is a wiring change rather than a redesign.
 */
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  EVALUATION_SCORE_QUEUE,
  enqueueEvaluationScore,
  evaluationJobId,
  makeEvaluationScoreQueue,
} from "../src/queue-runtime/evaluation.js";
import { resolveQueuePolicy } from "../src/queue-runtime/policy.js";
import { storeLayerForQueuePolicy } from "../src/queue-runtime/store.js";
import { runEvaluationScoreWorker } from "../src/queue-runtime/workers.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function ensureWrapperBuilt(packageDirName: string): void {
  const packageDir = path.join(repoRoot, "role-model-router", "packages", packageDirName);
  if (existsSync(path.join(packageDir, "dist", "index.js"))) return;
  execFileSync(process.execPath, ["build.mjs"], { cwd: packageDir, stdio: "pipe" });
}

ensureWrapperBuilt("effect");
ensureWrapperBuilt("effect-mq");
ensureWrapperBuilt("sql-sqlite-node");

function policyDocument(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "role-model.queue-policy.v1",
    policyVersion: 1,
    global: { killSwitch: false },
    queues: {
      "evaluation.score": {
        mode: "queue",
        concurrency: 1,
        attempts: 4,
        backoffBaseMs: 100,
        backoffCapMs: 1_000,
        lockRefreshMs: 1_000,
        lockExpirationMs: 5_000,
        retentionDays: 30,
        ...overrides,
      },
    },
    updatedAt: null,
    receipts: [],
  };
}

let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-sp5-public-"));
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

function policy() {
  return resolveQueuePolicy(policyDocument() as never, { queue: EVALUATION_SCORE_QUEUE });
}

describe("@recursive:101-effect-mq-queue-rebuild @sp5 R5 evaluation.score (host)", () => {
  it("keys the job on the durable id each origin already has", () => {
    expect(evaluationJobId({ origin: "observation", groupId: "group-1" })).toBe(
      "evaluation:observation:group-1",
    );
    expect(evaluationJobId({ origin: "replay", replayJobId: "evaluation-replay-rj-7" })).toBe(
      "evaluation:replay:evaluation-replay-rj-7",
    );
    expect(() => evaluationJobId({ origin: "replay" })).toThrow(/requires an origin/);
  });

  it("keeps one job per unit of work and runs the handler once", async () => {
    const resolved = policy();
    const layer = storeLayerForQueuePolicy({ stateRoot, policy: resolved });
    const handled: string[] = [];
    const worker = runEvaluationScoreWorker({
      stateRoot,
      policy: resolved,
      handler: async (job) => {
        handled.push(job.groupId ?? job.replayJobId ?? "none");
      },
    });
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const queue = yield* makeEvaluationScoreQueue(resolved);
          yield* enqueueEvaluationScore({
            queue,
            job: { origin: "observation", groupId: "group-dup" },
          });
          yield* enqueueEvaluationScore({
            queue,
            job: { origin: "observation", groupId: "group-dup" },
          });
        }).pipe(Effect.provide(layer), Effect.scoped),
      );
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    } finally {
      await worker.stop();
    }
    expect(handled).toEqual(["group-dup"]);
  });

  it("retries rather than acknowledging when the handler's evidence write fails", async () => {
    const resolved = policy();
    const layer = storeLayerForQueuePolicy({ stateRoot, policy: resolved });
    const attempts: number[] = [];
    const worker = runEvaluationScoreWorker({
      stateRoot,
      policy: resolved,
      handler: async () => {
        attempts.push(attempts.length + 1);
        if (attempts.length < 2) throw new Error("evidence store unavailable");
      },
      onAttemptFailure: () => undefined,
    });
    try {
      await Effect.runPromise(
        Effect.gen(function* () {
          const queue = yield* makeEvaluationScoreQueue(resolved);
          yield* enqueueEvaluationScore({
            queue,
            job: { origin: "replay", replayJobId: "evaluation-replay-rj-retry" },
          });
        }).pipe(Effect.provide(layer), Effect.scoped),
      );
      await new Promise((resolve) => setTimeout(resolve, 3_500));
    } finally {
      await worker.stop();
    }
    expect(attempts.length).toBeGreaterThanOrEqual(2);
  });
});
