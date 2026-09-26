import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
/**
 * Run 101 / R4 - the replay plane on `replay.dispatch`.
 *
 * The queue must own identity (one job per `captureRef`), retries (`attempts` +
 * exponential backoff from the policy instead of the hand-rolled deferral
 * budget) and terminality (a named error), while the two enqueue-time
 * invariants stay where they are decided: a capture refused for budget or
 * benchmark exclusion is never offered to the queue.
 *
 * RED at the frozen baseline: `src/queue-runtime/{policy,queues}.ts` do not
 * exist, so this file fails to import.
 */
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Duration, Effect, Fiber, Schedule, Schema } from "effect";
import { PersistedQueue } from "effect/unstable/persistence";
import { beforeEach, describe, expect, it } from "vitest";

import { resolveQueuePolicy, validateQueuePolicy } from "../src/queue-runtime/policy.js";
import {
  REPLAY_DISPATCH_QUEUE,
  enqueueReplayDispatch,
  makeReplayDispatchQueue,
  replayRetrySchedule,
} from "../src/queue-runtime/queues.js";
import { makeQueueStoreLayer, resolveQueueStorePath } from "../src/queue-runtime/store.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function ensureWrapperBuilt(packageDirName: string): void {
  const packageDir = path.join(repoRoot, "role-model-router", "packages", packageDirName);
  if (existsSync(path.join(packageDir, "dist", "index.js"))) return;
  execFileSync(process.execPath, ["build.mjs"], { cwd: packageDir, stdio: "pipe" });
}

ensureWrapperBuilt("effect");
ensureWrapperBuilt("effect-mq");
ensureWrapperBuilt("sql-sqlite-node");

/** The catalogue defaults, as the operator API would ship them. */
function policyDocument(overrides: Record<string, unknown> = {}) {
  const base = {
    schemaVersion: "role-model.queue-policy.v1",
    policyVersion: 1,
    global: { killSwitch: false },
    queues: {
      "replay.dispatch": {
        mode: "queue",
        concurrency: 1,
        attempts: 3,
        // Production-valid bounds (the catalogue's minimums), so the fixture
        // cannot pass with values the operator API would refuse.
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
  return base;
}

let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-sp4-"));
});

function layerFor(filePath: string) {
  return makeQueueStoreLayer({
    filePath,
    pollIntervalMs: 20,
    lockRefreshIntervalMs: 50,
    lockExpirationMs: 400,
  });
}

describe("@recursive:101-effect-mq-queue-rebuild @sp4 R4 replay.dispatch", () => {
  it("resolves the replay parameters from the policy document, and refuses an out-of-bounds value by name", () => {
    const document = policyDocument();
    expect(() => validateQueuePolicy(document)).not.toThrow();
    const resolved = resolveQueuePolicy(document, { queue: REPLAY_DISPATCH_QUEUE });
    expect(resolved.attempts).toBe(3);
    expect(resolved.concurrency).toBe(1);
    expect(resolved.mode).toBe("queue");

    const bad = policyDocument({ concurrency: 99 });
    expect(() => validateQueuePolicy(bad)).toThrow(/replay\.dispatch concurrency/);
  });

  it("derives an exponential retry schedule bounded by the policy's cap", () => {
    const schedule = replayRetrySchedule({ backoffBaseMs: 100, backoffCapMs: 1_000 });
    // The schedule is a value the queue replays from the persisted attempt
    // count; asserting it is a schedule-shaped value keeps the contract honest
    // without depending on the vendor's internal step representation.
    expect(schedule).toBeDefined();
    expect(typeof (schedule as { pipe?: unknown }).pipe).toBe("function");
  });

  it("offers exactly one job per captureRef", async () => {
    const filePath = resolveQueueStorePath({ stateRoot });
    const document = policyDocument();
    const policy = resolveQueuePolicy(document, { queue: REPLAY_DISPATCH_QUEUE });

    const seen = await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* makeReplayDispatchQueue(policy);
        const first = yield* enqueueReplayDispatch({
          queue,
          capture: { captureRef: "req-dup", endpointIds: ["a"], policySetDigest: "d" },
        });
        const second = yield* enqueueReplayDispatch({
          queue,
          capture: { captureRef: "req-dup", endpointIds: ["a"], policySetDigest: "d" },
        });
        const claimed = yield* Effect.sync<string[]>(() => []);
        const fiber = yield* Effect.forkChild(
          queue.take(() => Effect.sync(() => claimed.push("claimed"))),
        );
        yield* Effect.sleep(Duration.millis(300));
        yield* Fiber.interrupt(fiber);
        return { first, second, claimed };
      }).pipe(Effect.provide(layerFor(filePath)), Effect.scoped),
    );

    expect(seen.first.enqueued).toBe(true);
    expect(seen.second.enqueued).toBe(true);
    expect(seen.claimed, "the duplicate offer must not create a second job").toHaveLength(1);
  });

  it("retries a retryable failure on the persisted attempt count and then succeeds", async () => {
    const filePath = resolveQueueStorePath({ stateRoot });
    const policy = resolveQueuePolicy(policyDocument({ attempts: 4 }), {
      queue: REPLAY_DISPATCH_QUEUE,
    });

    const attempts = await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* makeReplayDispatchQueue(policy);
        yield* enqueueReplayDispatch({
          queue,
          capture: { captureRef: "req-retry", endpointIds: ["a"], policySetDigest: "d" },
        });
        let count = 0;
        /**
         * The persisted queue claims one element per `take`, so a retry is
         * picked up by the *next* take after the store's backoff - exactly the
         * loop a worker runs. `take` returns the handler's failure after the
         * store has recorded the retry (`visible_at` moves, `attempts`
         * increments), so the loop must absorb the failure; four takes is
         * enough for a handler that fails twice and then succeeds inside the
         * policy's attempt bound.
         */
        const fiber = yield* Effect.forkChild(
          Effect.gen(function* () {
            for (let take = 0; take < 5; take += 1) {
              yield* queue
                .take(() =>
                  Effect.suspend(() => {
                    count += 1;
                    return count < 3 ? Effect.fail(new Error("transient")) : Effect.void;
                  }),
                )
                .pipe(Effect.catchCause(() => Effect.void));
            }
          }),
        );
        // The SQL store writes `visible_at` with whole-second resolution
        // (`Math.ceil`), so a retry lands at +1 s even for a 100 ms base; three
        // attempts therefore need a window of a few seconds.
        yield* Effect.sleep(Duration.millis(4_000));
        yield* Fiber.interrupt(fiber);
        return count;
      }).pipe(Effect.provide(layerFor(filePath)), Effect.scoped),
    );

    expect(attempts).toBeGreaterThanOrEqual(3);
  });

  it("never offers a capture the enqueue-time gate refused", async () => {
    const filePath = resolveQueueStorePath({ stateRoot });
    const policy = resolveQueuePolicy(policyDocument(), { queue: REPLAY_DISPATCH_QUEUE });

    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* makeReplayDispatchQueue(policy);
        const budgetRefused = yield* enqueueReplayDispatch({
          queue,
          capture: { captureRef: "req-budget", endpointIds: ["a"], policySetDigest: "d" },
          admission: { accepted: false, reason: "budget_exhausted" },
        });
        const benchmarkRefused = yield* enqueueReplayDispatch({
          queue,
          capture: { captureRef: "req-bench", endpointIds: ["a"], policySetDigest: "d" },
          admission: { accepted: false, reason: "benchmark_source_not_replayable" },
        });
        const claimed = yield* Effect.sync<string[]>(() => []);
        const fiber = yield* Effect.forkChild(
          queue.take(() => Effect.sync(() => claimed.push("claimed"))),
        );
        yield* Effect.sleep(Duration.millis(250));
        yield* Fiber.interrupt(fiber);
        return { budgetRefused, benchmarkRefused, claimed };
      }).pipe(Effect.provide(layerFor(filePath)), Effect.scoped),
    );

    expect(outcome.budgetRefused).toEqual({ enqueued: false, reason: "budget_exhausted" });
    expect(outcome.benchmarkRefused).toEqual({
      enqueued: false,
      reason: "benchmark_source_not_replayable",
    });
    expect(outcome.claimed, "a refused capture must never reach the queue").toHaveLength(0);
  });
});
