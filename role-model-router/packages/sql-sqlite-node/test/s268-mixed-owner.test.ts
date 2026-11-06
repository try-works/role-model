import assert from "node:assert/strict";

import { Deferred, Effect, Exit, Fiber, Option, Schema } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import { BUSY_TIMEOUT_MS, type SqliteService, SqliteServiceError } from "../src/service";
import {
  type SuspendedTransaction,
  disposeAfterTest,
  finishSuspended,
  makeCleanupBatch,
  makeTempDatabase,
  reportCleanupFailureToConsole,
} from "./support/s273-cleanup";

/**
 * Run 115 S268 (R23/B3): mixed async/sync ownership on the one SQLite connection.
 *
 * An async Effect transaction holds the connection semaphore. A sync facade call cannot
 * await that semaphore without blocking the event loop, so while the async transaction is
 * active the sync facade must refuse with a typed SqliteServiceError instead of racing the
 * open transaction. The owning fiber keeps its tx-local sync handle; a sync caller is only
 * refused when it is not the transaction owner. Every case uses a real disposable SQLite
 * file and a Deferred gate, so the suspended state is deterministic (no timing sleep).
 */

const cleanup = makeCleanupBatch();
const freshService = (): SqliteService => makeTempDatabase(cleanup).service;

afterEach((context) => {
  // `afterEach` runs after Vitest records a failed test, so a cleanup failure is
  // reported separately and never replaces the real assertion failure.
  const testFailed = context.task.result?.state === "fail";
  disposeAfterTest(cleanup, testFailed, reportCleanupFailureToConsole);
});

const expectTypedRefusal = (operation: string, run: () => void): void => {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  expect(caught, `${operation} must refuse rather than touch the connection`).toBeInstanceOf(
    SqliteServiceError,
  );
  assert.ok(caught instanceof SqliteServiceError);
  const refusal = caught;
  expect(refusal.operation).toBe(operation);
  expect(refusal.name).toBe("SqliteServiceError");
  // The message documents the intentional refusal instead of pretending async serialization.
  expect(refusal.message).toMatch(/async Effect transaction owns the connection/i);
};

const countSchema = Schema.Array(Schema.Struct({ c: Schema.Number }));
const countRows = (service: SqliteService) =>
  Schema.decodeUnknownSync(countSchema)(service.querySync("SELECT COUNT(*) AS c FROM t"));

/**
 * One real async transaction: insert, signal `ready`, then park on a Deferred. The owner's
 * tx-local sync handle runs after the suspension, and the transaction inserts a second row
 * before committing, so a later "count is 2" also proves the owner kept the connection.
 */
const suspendAfterInsert = (service: SqliteService): SuspendedTransaction => {
  const started = Deferred.makeUnsafe<void>();
  const gate = Deferred.makeUnsafe<void>();
  const commit = Effect.runPromise(
    service.transaction((tx) =>
      Effect.gen(function* () {
        yield* tx.exec("INSERT INTO t(value) VALUES (1)");
        yield* Deferred.succeed(started, undefined);
        yield* Deferred.await(gate);
        // The owner's tx-local sync handle stays usable across the suspension.
        expect(tx.querySync("SELECT COUNT(*) AS c FROM t")).toEqual([{ c: 1 }]);
        tx.execSync("INSERT INTO t(value) VALUES (2)");
      }),
    ),
  );
  return {
    commit: () => commit,
    ready: Effect.runPromise(Deferred.await(started)),
    release: async () => {
      await Effect.runPromise(Deferred.succeed(gate, undefined));
    },
  };
};

describe("S268 mixed async/sync connection ownership", () => {
  it("refuses an external querySync (including a writing RETURNING query) before it touches the transaction", async () => {
    const service = freshService();
    try {
      await finishSuspended(suspendAfterInsert(service), () => {
        // querySync is not read-only: an unguarded call would write inside the open transaction.
        expectTypedRefusal("querySync", () =>
          service.querySync("INSERT INTO t(value) VALUES (99) RETURNING value"),
        );
      });
      // Only the owner's two inserts committed; the refused statement never ran.
      expect(countRows(service)).toEqual([{ c: 2 }]);
      expect(service.isOpen()).toBe(true);
    } finally {
      service.closeSync();
    }
  });

  it("refuses an external execSync write before it touches the transaction", async () => {
    const service = freshService();
    try {
      await finishSuspended(suspendAfterInsert(service), () => {
        expectTypedRefusal("execSync", () => service.execSync("INSERT INTO t(value) VALUES (99)"));
      });
      expect(countRows(service)).toEqual([{ c: 2 }]);
      expect(service.isOpen()).toBe(true);
    } finally {
      service.closeSync();
    }
  });

  it("refuses an external transactionSync before it begins a nested transaction", async () => {
    const service = freshService();
    try {
      await finishSuspended(suspendAfterInsert(service), () => {
        expectTypedRefusal("transactionSync", () =>
          service.transactionSync((tx) => tx.execSync("INSERT INTO t(value) VALUES (99)")),
        );
      });
      // If BEGIN IMMEDIATE had run, the owner's COMMIT would have failed; count 2 proves it did not.
      expect(countRows(service)).toEqual([{ c: 2 }]);
      expect(service.isOpen()).toBe(true);
    } finally {
      service.closeSync();
    }
  });

  it("refuses an external closeSync without closing the connection the transaction owns", async () => {
    const service = freshService();
    try {
      await finishSuspended(suspendAfterInsert(service), () => {
        expectTypedRefusal("closeSync", () => service.closeSync());
        // The refused close must not have reached the connection.
        expect(service.isOpen()).toBe(true);
      });
      expect(countRows(service)).toEqual([{ c: 2 }]);
      service.closeSync();
      service.closeSync();
      expect(service.isOpen()).toBe(false);
    } finally {
      service.closeSync();
    }
  });

  it("commits after external refusals and every facade operation plus close still works", async () => {
    const service = freshService();
    try {
      const suspended = suspendAfterInsert(service);
      await suspended.ready;
      try {
        expectTypedRefusal("querySync", () => service.querySync("SELECT 1"));
        expectTypedRefusal("execSync", () => service.execSync("INSERT INTO t(value) VALUES (99)"));
        expectTypedRefusal("transactionSync", () =>
          service.transactionSync((tx) => tx.execSync("INSERT INTO t(value) VALUES (99)")),
        );
        expectTypedRefusal("closeSync", () => service.closeSync());
        expect(service.isOpen()).toBe(true);
      } finally {
        await suspended.release();
        await suspended.commit;
      }

      expect(countRows(service)).toEqual([{ c: 2 }]);
      expect(service.querySync("PRAGMA busy_timeout")).toEqual([{ timeout: BUSY_TIMEOUT_MS }]);

      service.execSync("INSERT INTO t(value) VALUES (3)");
      service.transactionSync((tx) => tx.execSync("INSERT INTO t(value) VALUES (4)"));
      await Effect.runPromise(service.exec("INSERT INTO t(value) VALUES (5)"));
      expect(await Effect.runPromise(service.query("SELECT COUNT(*) AS c FROM t"))).toEqual([
        { c: 5 },
      ]);
      expect(countRows(service)).toEqual([{ c: 5 }]);

      await Effect.runPromise(service.close());
      await Effect.runPromise(service.close());
      expect(service.isOpen()).toBe(false);
      service.closeSync();
      expect(service.isOpen()).toBe(false);
    } finally {
      service.closeSync();
    }
  });

  it("refuses sync access during a suspended transaction and, on interruption, rolls back and clears ownership", async () => {
    const service = freshService();
    try {
      const started = Deferred.makeUnsafe<void>();
      const fiber = Effect.runFork(
        service.transaction((tx) =>
          Effect.gen(function* () {
            yield* tx.exec("INSERT INTO t(value) VALUES (1)");
            yield* Deferred.succeed(started, undefined);
            yield* Effect.never;
          }),
        ),
      );
      await Effect.runPromise(Deferred.await(started));
      try {
        expectTypedRefusal("execSync", () => service.execSync("INSERT INTO t(value) VALUES (99)"));
      } finally {
        // Deterministic, awaited interruption; no orphan fiber is left suspended.
        await Effect.runPromise(Fiber.interrupt(fiber));
      }
      expect(service.isOpen()).toBe(true);
      expect(countRows(service)).toEqual([{ c: 0 }]);

      // Ownership was cleared and rolled back before this next operation, sync path included.
      service.transactionSync((tx) => tx.execSync("INSERT INTO t(value) VALUES (2)"));
      expect(countRows(service)).toEqual([{ c: 1 }]);
    } finally {
      service.closeSync();
    }
  });

  it("clears ownership after a failed transaction and preserves the primary error identity", async () => {
    const service = freshService();
    const primary = new Error("primary transaction failure");
    try {
      const exit = await Effect.runPromiseExit(
        service.transaction((tx) =>
          Effect.gen(function* () {
            yield* tx.exec("INSERT INTO t(value) VALUES (1)");
            return yield* Effect.fail(primary);
          }),
        ),
      );
      expect(Exit.isFailure(exit)).toBe(true);
      expect(Option.getOrThrow(Exit.findErrorOption(exit))).toBe(primary);
      expect(service.isOpen()).toBe(true);
      // Rollback ran and no stale owner blocks the next operation.
      expect(countRows(service)).toEqual([{ c: 0 }]);
      service.execSync("INSERT INTO t(value) VALUES (2)");
      expect(countRows(service)).toEqual([{ c: 1 }]);
    } finally {
      service.closeSync();
    }
  });
});
