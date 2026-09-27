/**
 * Run 101 addendum 08 - the failure report carries the attempt budget, not just the error.
 *
 * effect-mq guidance #5 (`workers.md#failure-reporting`): the guide's `onJobFailure` reports
 * `{jobId, name, queue, attempt, attemptsMax, willRetry, cause}`. The run only had
 * `onAttemptFailure(error, job)`, so a caller could not tell an attempt that will be retried from one that
 * exhausted the budget - exhaustion was visible only by reading `effect_queue` afterwards.
 *
 * RED at the pre-repair revision (`84f9ef32`): the worker options have no `onAttemptOutcome`.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveQueuePolicy } from "../src/queue-runtime/policy.js";
import {
  REPLAY_DISPATCH_QUEUE,
  enqueueReplayDispatch,
  makeReplayDispatchQueue,
} from "../src/queue-runtime/queues.js";
import { storeLayerForQueuePolicy } from "../src/queue-runtime/store.js";
import { runReplayDispatchWorker } from "../src/queue-runtime/workers.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function ensureWrapperBuilt(packageDirName: string): void {
  const packageDir = path.join(repoRoot, "role-model-router", "packages", packageDirName);
  if (existsSync(path.join(packageDir, "dist", "index.js"))) return;
  execFileSync(process.execPath, ["build.mjs"], { cwd: packageDir, stdio: "pipe" });
}

ensureWrapperBuilt("effect");
ensureWrapperBuilt("effect-mq");
ensureWrapperBuilt("sql-sqlite-node");

function policyDocument(attempts: number) {
  return {
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
  };
}

let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-add08-"));
});
afterEach(async () => {
  await rm(stateRoot, { recursive: true, force: true });
});

async function writePolicy(attempts: number) {
  const directory = path.join(stateRoot, "queues");
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, "queue-policy.json"),
    JSON.stringify(policyDocument(attempts), null, 2),
    "utf8",
  );
}

async function offer(captureRef: string) {
  const { Effect } = await import("effect");
  const policy = resolveQueuePolicy(policyDocument(3), { queue: REPLAY_DISPATCH_QUEUE });
  const layer = storeLayerForQueuePolicy({ stateRoot, policy });
  await Effect.runPromise(
    Effect.gen(function* () {
      const queue = yield* makeReplayDispatchQueue(policy);
      yield* enqueueReplayDispatch({
        queue,
        capture: { captureRef, endpointIds: ["endpoint-b"], policySetDigest: "d" },
      });
    }).pipe(Effect.provide(layer), Effect.scoped),
  );
}

describe("@recursive:101-effect-mq-queue-rebuild addendum08 attempt outcome reporting", () => {
  it("reports the attempt, the budget and whether the job will be retried", async () => {
    await writePolicy(1);
    await offer("req-outcome-1");
    const outcomes: Array<{ attempt: number; attemptsMax: number; willRetry: boolean }> = [];
    const worker = runReplayDispatchWorker({
      stateRoot,
      policy: resolveQueuePolicy(policyDocument(1), { queue: REPLAY_DISPATCH_QUEUE }),
      handler: async () => {
        throw new Error("handler failed");
      },
      onAttemptFailure: () => undefined,
      onAttemptOutcome: (outcome) => {
        outcomes.push({
          attempt: outcome.attempt,
          attemptsMax: outcome.attemptsMax,
          willRetry: outcome.willRetry,
        });
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 2_500));
    await worker.stop();
    expect(outcomes.length).toBeGreaterThanOrEqual(1);
    expect(outcomes[0]).toEqual({ attempt: 1, attemptsMax: 1, willRetry: false });
  });
});
