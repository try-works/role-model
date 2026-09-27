/**
 * Run 101 addendum 06 - the per-attempt timeout from the vendored effect-mq guidance.
 *
 * `retries-and-timeouts.md#timeouts`: a job's `timeout` "interrupts the handler cleanly ...
 * consuming an attempt". Without it a hung handler held its claim until the lock expired
 * (5 s on the replay plane's test policy, 5/15 minutes on the live planes).
 *
 * RED at the pre-repair revision (`253910d5`): neither the catalogue parameter nor the
 * claim-loop timeout exists, so the assertions below fail.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { Duration, Effect } from "effect";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { QUEUE_PARAMETER_DEFAULTS, resolveQueuePolicy } from "../src/queue-runtime/policy.js";
import { makeReplayDispatchQueue } from "../src/queue-runtime/queues.js";
import { resolveQueueStorePath, storeLayerForQueuePolicy } from "../src/queue-runtime/store.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function ensureWrapperBuilt(packageDirName: string): void {
  const packageDir = path.join(repoRoot, "role-model-router", "packages", packageDirName);
  if (existsSync(path.join(packageDir, "dist", "index.js"))) return;
  execFileSync(process.execPath, ["build.mjs"], { cwd: packageDir, stdio: "pipe" });
}

ensureWrapperBuilt("effect");
ensureWrapperBuilt("effect-mq");
ensureWrapperBuilt("sql-sqlite-node");

function policyDocument(block: Record<string, unknown> = {}) {
  return {
    schemaVersion: "role-model.queue-policy.v1",
    policyVersion: 1,
    global: { killSwitch: false },
    queues: {
      "replay.dispatch": {
        mode: "queue",
        concurrency: 1,
        attempts: 3,
        backoffBaseMs: 100,
        backoffCapMs: 1_000,
        lockRefreshMs: 1_000,
        lockExpirationMs: 5_000,
        retentionDays: 30,
        ...block,
      },
    },
    updatedAt: null,
    receipts: [],
  };
}

let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-add06-"));
});
afterEach(async () => {
  await rm(stateRoot, { recursive: true, force: true });
});

describe("@recursive:101-effect-mq-queue-rebuild addendum06 per-attempt timeout", () => {
  it("the catalogue carries attemptTimeoutMs and materializes it for older documents", () => {
    const explicit = resolveQueuePolicy(policyDocument({ attemptTimeoutMs: 5_000 }), {
      queue: "replay.dispatch",
    });
    expect(explicit.attemptTimeoutMs).toBe(5_000);

    // A document written before the parameter existed validates and gets the catalogue default,
    // so adding a parameter never invalidates the operator's stored policy.
    const materialized = resolveQueuePolicy(policyDocument(), { queue: "replay.dispatch" });
    expect(materialized.attemptTimeoutMs).toBe(
      QUEUE_PARAMETER_DEFAULTS["replay.dispatch"]?.attemptTimeoutMs,
    );
    expect(materialized.attemptTimeoutMs).toBeGreaterThanOrEqual(5_000);
  });

  it("a handler that never returns is interrupted by the timeout and consumes the attempt", async () => {
    const policy = resolveQueuePolicy(policyDocument({ attemptTimeoutMs: 5_000 }), {
      queue: "replay.dispatch",
    });
    const filePath = resolveQueueStorePath({ stateRoot });
    let started = 0;
    await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* makeReplayDispatchQueue(policy);
        yield* queue.offer(
          { captureRef: "req-timeout-1", endpointIds: ["endpoint-b"], policySetDigest: "d" },
          { id: "req-timeout-1" },
        );
        // The same composition the claim loop applies: the attempt is bounded by the catalogue value.
        const taken = yield* Effect.gen(function* () {
          yield* queue.take(() =>
            Effect.timeout(
              Effect.andThen(
                Effect.sync(() => {
                  started += 1;
                }),
                Effect.never,
              ),
              Duration.millis(policy.attemptTimeoutMs),
            ),
          );
        }).pipe(Effect.catchCause(() => Effect.void));
        void taken;
      }).pipe(Effect.provide(storeLayerForQueuePolicy({ stateRoot, policy })), Effect.scoped),
    );
    expect(started, "the claimed handler ran").toBe(1);

    const database = new DatabaseSync(filePath, { readOnly: true });
    try {
      const row = database
        .prepare("SELECT attempts, state FROM effect_queue WHERE id = 'req-timeout-1'")
        .get() as { attempts: number; state: string };
      expect(row.attempts, "the timed-out attempt is charged to the job").toBeGreaterThanOrEqual(1);
      expect(["pending", "failed"]).toContain(row.state);
    } finally {
      database.close();
    }
  });

  it("the claim loop applies the catalogue value", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(
        path.join(
          repoRoot,
          "role-model-router",
          "apps",
          "runtime-host-bridge",
          "src",
          "queue-runtime",
          "workers.ts",
        ),
        "utf8",
      ),
    );
    expect(source).toMatch(
      /Effect\.timeout\(attempt, Duration\.millis\(policy\.attemptTimeoutMs\)\)/,
    );
  });
});
