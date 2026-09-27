/**
 * Run 101 addendum 04 - two findings from the pinned Effect v4 guidance audit.
 *
 * `effect_core_guidance` (installed `Effect-TS/skills` @ `2309e6f2`, read against
 * `vendor/effect` @ `effect@4.0.0-rc.117`) reports six deviations; two are in scope
 * for this run's queue rebuild and are fixed here:
 *
 * - D2: the claim loop swallowed **every** cause (`Effect.catchCause(() => Effect.void)`),
 *   while the vendored store re-raises interrupt-only causes before turning anything else
 *   into a failed job (`PersistedQueue.ts`: `Cause.hasInterruptsOnly(cause) ?
 *   Effect.failCause(cause) : Effect.fail(new DeadLetter(cause))`). An interrupt releases
 *   the claim without charging an attempt, so hiding it charged one.
 * - D5: the catalogue's `retentionDays` was declared, validated and reported but never
 *   enforced - nothing composed `PersistedQueue.layerCleanup` ("Run this layer in one
 *   instance of a deployment rather than on every worker").
 *
 * RED at the pre-repair revision (`3101949c`): `makeQueueStoreCleanupLayer` does not
 * exist, so this file fails to import.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { Duration, Effect, Fiber, Layer, Schema } from "effect";
import { PersistedQueue } from "effect/unstable/persistence";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveQueuePolicy } from "../src/queue-runtime/policy.js";
import {
  makeQueueStoreCleanupLayer,
  resolveQueueStorePath,
  storeLayerForQueuePolicy,
} from "../src/queue-runtime/store.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function ensureWrapperBuilt(packageDirName: string): void {
  const packageDir = path.join(repoRoot, "role-model-router", "packages", packageDirName);
  if (existsSync(path.join(packageDir, "dist", "index.js"))) return;
  execFileSync(process.execPath, ["build.mjs"], { cwd: packageDir, stdio: "pipe" });
}

ensureWrapperBuilt("effect");
ensureWrapperBuilt("effect-mq");
ensureWrapperBuilt("sql-sqlite-node");

const policyDocument = () => ({
  schemaVersion: "role-model.queue-policy.v1",
  policyVersion: 1,
  global: { killSwitch: false },
  queues: {
    "replay.dispatch": {
      mode: "queue",
      concurrency: 1,
      attempts: 5,
      backoffBaseMs: 100,
      backoffCapMs: 1_000,
      lockRefreshMs: 1_000,
      lockExpirationMs: 5_000,
      retentionDays: 30,
    },
  },
  updatedAt: null,
  receipts: [],
});

const JobSchema = Schema.Struct({ kind: Schema.String });

let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-add04-"));
});
afterEach(async () => {
  await rm(stateRoot, { recursive: true, force: true });
});

/** Offers one job and completes it, so the row is a completed (retention-eligible) row. */
async function seedCompletedRow(policy: ReturnType<typeof resolveQueuePolicy>, id: string) {
  await Effect.runPromise(
    Effect.gen(function* () {
      const queue = yield* PersistedQueue.make({
        name: "replay.dispatch",
        schema: JobSchema,
        maxAttempts: 1,
      });
      yield* queue.offer({ kind: id }, { id });
      const fiber = yield* Effect.forkChild(queue.take(() => Effect.succeed(undefined)));
      yield* Effect.sleep(Duration.millis(300));
      yield* Fiber.interrupt(fiber);
    }).pipe(Effect.provide(storeLayerForQueuePolicy({ stateRoot, policy })), Effect.scoped),
  );
}

function completedCount(filePath: string, id: string): number {
  const database = new DatabaseSync(filePath, { readOnly: true });
  try {
    const row = database
      .prepare("SELECT COUNT(*) AS n FROM effect_queue WHERE id = ? AND state = 'completed'")
      .get(id) as { n: number };
    return Number(row.n);
  } finally {
    database.close();
  }
}

describe("@recursive:101-effect-mq-queue-rebuild addendum04 Effect guidance findings", () => {
  it("D5: composes the library's retention, which removes completed rows once the TTL elapses", async () => {
    const policy = resolveQueuePolicy(policyDocument(), { queue: "replay.dispatch" });
    const filePath = resolveQueueStorePath({ stateRoot });
    await seedCompletedRow(policy, "retained-old");
    expect(completedCount(filePath, "retained-old")).toBe(1);

    // The layer runs `store.cleanup` immediately on launch and then on the interval
    // (`PersistedQueue.ts`, `layerCleanup`), so a zero TTL observes the sweep here.
    const fiber = Effect.runFork(
      Layer.launch(
        makeQueueStoreCleanupLayer({
          stateRoot,
          policy,
          interval: Duration.hours(1),
          timeToLive: Duration.zero,
        }),
      ),
    );
    await Effect.runPromise(Effect.sleep(Duration.millis(800)));
    await Effect.runPromise(Fiber.interrupt(fiber));

    expect(completedCount(filePath, "retained-old")).toBe(0);
  });

  it("D5: the declared 30-day retention is what a host composes by default", async () => {
    const policy = resolveQueuePolicy(policyDocument(), { queue: "replay.dispatch" });
    const filePath = resolveQueueStorePath({ stateRoot });
    await seedCompletedRow(policy, "retained-fresh");
    const fiber = Effect.runFork(
      Layer.launch(makeQueueStoreCleanupLayer({ stateRoot, policy, interval: Duration.hours(1) })),
    );
    await Effect.runPromise(Effect.sleep(Duration.millis(800)));
    await Effect.runPromise(Fiber.interrupt(fiber));
    expect(completedCount(filePath, "retained-fresh")).toBe(1);
  });

  it("D2: the claim loop re-raises interrupt-only causes instead of charging a failure", async () => {
    const source = await readFile(
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
    );
    expect(source).toMatch(/Cause\.hasInterruptsOnly\(cause\)/);
    expect(source).not.toMatch(/catchCause\(\(\) => Effect\.void\)/);
  });
});
