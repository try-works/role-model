/**
 * Run 101 / R4 - the replay worker.
 *
 * `PersistedQueue.take` claims one element and returns the handler's failure
 * after the store records the retry, so a worker is a loop the runtime owns:
 * claim, run, absorb the per-attempt failure, claim again. Without that loop a
 * retry never happens (measured: a `take`-once worker retried zero times).
 *
 * The worker also takes its lock values from the resolved policy rather than
 * from a store-level constant, so `lockRefreshMs`/`lockExpirationMs` have one
 * source of truth.
 *
 * RED at the frozen baseline: `src/queue-runtime/workers.ts` does not exist.
 */
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveQueuePolicy } from "../src/queue-runtime/policy.js";
import { REPLAY_DISPATCH_QUEUE, enqueueReplayDispatch, makeReplayDispatchQueue } from "../src/queue-runtime/queues.js";
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

function policyDocument(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "role-model.queue-policy.v1",
    policyVersion: 1,
    global: { killSwitch: false },
    queues: {
      "replay.dispatch": {
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
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-sp4-worker-"));
  // The worker fails closed when no policy document exists ("no policy" reads
  // as "do not claim"), so a worker test must publish the document it means.
  await writePolicy(policyDocument());
});
afterEach(async () => {
  await rm(stateRoot, { recursive: true, force: true });
});

async function offer(captureRef: string) {
  const { Effect } = await import("effect");
  const policy = resolveQueuePolicy(policyDocument(), { queue: REPLAY_DISPATCH_QUEUE });
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

async function writePolicy(document: Record<string, unknown>) {
  const directory = path.join(stateRoot, "queues");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "queue-policy.json"), JSON.stringify(document, null, 2), "utf8");
}

describe("@recursive:101-effect-mq-queue-rebuild @sp4 R4 replay worker", () => {
  it("claims an offered job and completes it", async () => {
    await offer("req-worker-1");
    const handled: string[] = [];
    const worker = runReplayDispatchWorker({
      stateRoot,
      policy: resolveQueuePolicy(policyDocument(), { queue: REPLAY_DISPATCH_QUEUE }),
      handler: async (job) => {
        handled.push(job.captureRef);
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await worker.stop();
    expect(handled).toContain("req-worker-1");
  });

  it("absorbs a per-attempt failure and lets the store retry it", async () => {
    await offer("req-worker-retry");
    let attempts = 0;
    const worker = runReplayDispatchWorker({
      stateRoot,
      policy: resolveQueuePolicy(policyDocument(), { queue: REPLAY_DISPATCH_QUEUE }),
      handler: async () => {
        attempts += 1;
        if (attempts < 2) throw new Error("transient");
      },
      onAttemptFailure: () => undefined,
    });
    await new Promise((resolve) => setTimeout(resolve, 3_500));
    await worker.stop();
    expect(attempts).toBeGreaterThanOrEqual(2);
  });

  it("stops claiming while the kill switch is engaged", async () => {
    const handled: string[] = [];
    const killed = policyDocument();
    killed.global.killSwitch = true;
    await writePolicy(killed);
    await offer("req-worker-kill");
    const worker = runReplayDispatchWorker({
      stateRoot,
      policy: resolveQueuePolicy(killed, { queue: REPLAY_DISPATCH_QUEUE }),
      handler: async (job) => {
        handled.push(job.captureRef);
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await worker.stop();
    expect(handled).toHaveLength(0);
  });
});
