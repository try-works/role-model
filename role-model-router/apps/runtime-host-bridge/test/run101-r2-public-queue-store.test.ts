/**
 * Run 101 / R2 (public side) - the operator host runs the replay and learner
 * workers, so it needs the same durable queue store the sidecar uses: one file
 * per state root, WAL, a busy timeout, a library-owned schema and lock-expiry
 * recovery rather than a reclaimer sweep.
 *
 * RED at the frozen baseline (public `8e09a870`): `src/queue-runtime/store.ts`
 * does not exist, so this file fails to import.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { Duration, Effect, Fiber, Schema } from "effect";
import { PersistedQueue } from "effect/unstable/persistence";
import { beforeEach, describe, expect, it } from "vitest";

import {
  QUEUE_STORE_PARAMETERS,
  QUEUE_STORE_RELATIVE_PATH,
  makeQueueStoreLayer,
  resolveQueueStorePath,
} from "../src/queue-runtime/store.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** The wrapper build output is gitignored; build it when a targeted run needs it. */
function ensureWrapperBuilt(packageDirName: string): void {
  const packageDir = path.join(repoRoot, "role-model-router", "packages", packageDirName);
  if (existsSync(path.join(packageDir, "dist", "index.js"))) {
    return;
  }
  execFileSync(process.execPath, ["build.mjs"], { cwd: packageDir, stdio: "pipe" });
}

ensureWrapperBuilt("effect");
ensureWrapperBuilt("effect-mq");
ensureWrapperBuilt("sql-sqlite-node");

const JobSchema = Schema.Struct({ kind: Schema.String });

let stateRoot = "";
beforeEach(async () => {
  stateRoot = await mkdtemp(path.join(os.tmpdir(), "run101-sp2-public-"));
});

function layerFor(filePath: string) {
  return makeQueueStoreLayer({
    filePath,
    pollIntervalMs: 25,
    lockRefreshIntervalMs: 50,
    lockExpirationMs: 400,
  });
}

function makeQueue() {
  return PersistedQueue.make({ name: "run101.sp2.public", schema: JobSchema, maxAttempts: 2 });
}

describe("@recursive:101-effect-mq-queue-rebuild @sp2 R2 public queue store", () => {
  it("derives the store path from the state root", () => {
    const resolved = resolveQueueStorePath({ stateRoot });
    expect(resolved.replaceAll("\\", "/")).toMatch(/track-b\/queues\/queues\.sqlite$/);
    expect(resolved).toBe(path.join(stateRoot, ...QUEUE_STORE_RELATIVE_PATH.split("/")));
  });

  it("opens in WAL mode with the library-owned table and a busy timeout", async () => {
    const filePath = resolveQueueStorePath({ stateRoot });
    await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* makeQueue();
        yield* queue.offer({ kind: "wal-probe" }, { id: "wal-probe" });
      }).pipe(Effect.provide(layerFor(filePath)), Effect.scoped),
    );

    expect(QUEUE_STORE_PARAMETERS.busyTimeoutMs).toBeGreaterThan(0);
    const probe = new DatabaseSync(filePath);
    try {
      const row = probe.prepare("PRAGMA journal_mode").get() as { journal_mode?: string };
      expect(String(row.journal_mode).toLowerCase()).toBe("wal");
      expect(
        probe.prepare("SELECT name FROM sqlite_master WHERE name = 'effect_queue'").get(),
      ).toBeTruthy();
    } finally {
      probe.close();
      await rm(stateRoot, { recursive: true, force: true });
    }
  });

  it("lets only one claimer hold a job while the lock is live", async () => {
    const filePath = resolveQueueStorePath({ stateRoot });
    const layer = layerFor(filePath);

    const claimed = await Effect.runPromise(
      Effect.gen(function* () {
        const producer = yield* makeQueue();
        yield* producer.offer({ kind: "single-claim" }, { id: "single-claim" });
        const seen: string[] = [];
        const holder = yield* makeQueue();
        const contender = yield* makeQueue();
        const holderFiber = yield* Effect.forkChild(
          holder.take(() =>
            Effect.andThen(
              Effect.sync(() => seen.push("holder")),
              Effect.never,
            ),
          ),
        );
        yield* Effect.sleep(Duration.millis(150));
        const contenderFiber = yield* Effect.forkChild(
          contender.take(() => Effect.sync(() => seen.push("contender"))),
        );
        yield* Effect.sleep(Duration.millis(200));
        yield* Fiber.interrupt(contenderFiber);
        yield* Fiber.interrupt(holderFiber);
        return seen;
      }).pipe(Effect.provide(layer), Effect.scoped),
    );

    expect(claimed).toEqual(["holder"]);
    await rm(stateRoot, { recursive: true, force: true });
  });

  it("re-claims a job whose holder died without acknowledging", async () => {
    const filePath = resolveQueueStorePath({ stateRoot });

    await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* makeQueue();
        yield* queue.offer({ kind: "abandoned" }, { id: "abandoned" });
        const fiber = yield* Effect.forkChild(
          queue.take(() =>
            Effect.andThen(
              Effect.sync(() => undefined),
              Effect.never,
            ),
          ),
        );
        yield* Effect.sleep(Duration.millis(100));
        yield* Fiber.interrupt(fiber);
      }).pipe(Effect.provide(layerFor(filePath)), Effect.scoped),
    );

    const recovered = await Effect.runPromise(
      Effect.gen(function* () {
        const queue = yield* makeQueue();
        const seen: string[] = [];
        const fiber = yield* Effect.forkChild(
          queue.take(() => Effect.sync(() => seen.push("recovered"))),
        );
        yield* Effect.sleep(Duration.millis(1200));
        yield* Fiber.interrupt(fiber);
        return seen;
      }).pipe(Effect.provide(layerFor(filePath)), Effect.scoped),
    );

    expect(recovered).toEqual(["recovered"]);
    await rm(stateRoot, { recursive: true, force: true });
  });
});
