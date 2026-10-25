import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Effect, Exit, Option } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import { BUSY_RETRY_DELAYS_MS, BUSY_TIMEOUT_MS, make, makeSync } from "../src/service";

/**
 * Run 115 S6a (R23/B3): SQLite service contract.
 *
 * Every contract item gets its own behavioural assertion:
 *   1. explicit async Effect callers + a sync facade over the SAME connection owner;
 *   2. a failed open (open/PRAGMA/setup) closes what it opened;
 *   3. initial attempt + two busy retries at 100ms and 200ms, with a 5s busy timeout;
 *   4. transactions run on the connection that opened them and the primary error survives
 *      rollback/close failures;
 *   5. no retry of work inside a transaction;
 *   6. connection/fiber ownership is serialized (Semaphore), not a depth counter.
 */

const dirs: string[] = [];
const databasePath = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "s6a-sqlite-"));
  dirs.push(dir);
  return join(dir, "service.sqlite");
};

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    try {
      rmSync(dir, { force: true, recursive: true });
    } catch {
      // A handle from a failed test can outlive the teardown on Windows; do not mask it.
    }
  }
});

const busyError = (): Error => Object.assign(new Error("database is locked"), { errcode: 5 });

const rows = <Row extends Record<string, unknown>>(input: ReadonlyArray<Row>): Array<Row> =>
  input.map((row) => ({ ...row }));

const failureOf = (exit: Exit.Exit<unknown, unknown>): unknown => {
  if (!Exit.isFailure(exit)) {
    return undefined;
  }
  return Option.getOrThrow(Exit.findErrorOption(exit));
};

describe("SQLite service", () => {
  it("item 1: async Effect callers and the sync facade share one connection owner", async () => {
    const service = await Effect.runPromise(make({ databasePath: databasePath() }));

    try {
      await Effect.runPromise(service.exec("CREATE TABLE items (id TEXT NOT NULL)"));

      service.execSync("INSERT INTO items (id) VALUES ('sync')");
      await Effect.runPromise(service.exec("INSERT INTO items (id) VALUES ('effect')"));

      const viaEffect = rows(
        await Effect.runPromise(service.query("SELECT id FROM items ORDER BY id")),
      );
      const viaSync = rows(service.querySync("SELECT id FROM items ORDER BY id"));

      expect(viaEffect).toEqual([{ id: "effect" }, { id: "sync" }]);
      expect(viaSync).toEqual(viaEffect);

      service.transactionSync((tx) => {
        tx.execSync("INSERT INTO items (id) VALUES ('tx')");
      });

      expect(rows(service.querySync("SELECT id FROM items WHERE id = 'tx'"))).toEqual([
        { id: "tx" },
      ]);
      expect(service.isOpen()).toBe(true);
    } finally {
      await Effect.runPromise(service.close());
    }
  });

  it("item 2: a failed open closes the database it opened (no half-initialized handle)", async () => {
    let opened: DatabaseSync | undefined;
    const original = new Error("setup boom");

    const exit = await Effect.runPromiseExit(
      make({
        databasePath: databasePath(),
        setup: (database) => {
          opened = database;
          throw original;
        },
      }),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    const error = failureOf(exit) as { cause?: unknown };
    expect(error.cause).toBe(original);
    expect(opened).toBeDefined();
    expect(() => opened?.prepare("SELECT 1").get()).toThrow(/database is not open/);
  });

  it("item 3: one initial attempt plus 100ms and 200ms busy retries, with a 5s busy timeout", async () => {
    expect(BUSY_RETRY_DELAYS_MS).toEqual([100, 200]);
    expect(BUSY_TIMEOUT_MS).toBe(5_000);

    const sleeps: number[] = [];
    let opens = 0;
    const service = await Effect.runPromise(
      make({
        databasePath: databasePath(),
        sleepMs: (milliseconds) => {
          sleeps.push(milliseconds);
          return Effect.void;
        },
        openDatabase: (path) => {
          opens += 1;
          if (opens < 3) {
            throw busyError();
          }
          return new DatabaseSync(path);
        },
      }),
    );

    try {
      expect(opens).toBe(3);
      expect(sleeps).toEqual([100, 200]);
      expect(rows(service.querySync("PRAGMA busy_timeout"))).toEqual([{ timeout: 5_000 }]);
    } finally {
      await Effect.runPromise(service.close());
    }
  });

  it("item 3b: exhausted busy retries stop at the third attempt and keep the busy error", async () => {
    const sleeps: number[] = [];
    let attempts = 0;

    const exit = await Effect.runPromiseExit(
      make({
        databasePath: databasePath(),
        openDatabase: () => {
          attempts += 1;
          throw busyError();
        },
        sleepMs: (milliseconds) => {
          sleeps.push(milliseconds);
          return Effect.void;
        },
      }),
    );

    const error = failureOf(exit) as { attempts?: number; busy?: boolean; _tag?: string };
    expect(attempts).toBe(3);
    expect(sleeps).toEqual([100, 200]);
    expect(error._tag).toBe("SqliteOpenError");
    expect(error.attempts).toBe(3);
    expect(error.busy).toBe(true);
  });

  it("item 3c: a non-busy open failure is not retried and preserves its cause", async () => {
    const original = new Error("permission denied");
    const sleeps: number[] = [];
    let attempts = 0;

    const exit = await Effect.runPromiseExit(
      make({
        databasePath: databasePath(),
        openDatabase: () => {
          attempts += 1;
          throw original;
        },
        sleepMs: (milliseconds) => {
          sleeps.push(milliseconds);
          return Effect.void;
        },
      }),
    );

    const error = failureOf(exit) as { cause?: unknown };
    expect(attempts).toBe(1);
    expect(sleeps).toEqual([]);
    expect(error.cause).toBe(original);
  });

  it("item 3d: the sync facade retries on the same 100ms/200ms schedule", () => {
    const sleeps: number[] = [];
    let opens = 0;

    const service = makeSync({
      databasePath: databasePath(),
      openDatabase: (path) => {
        opens += 1;
        if (opens < 3) {
          throw busyError();
        }
        return new DatabaseSync(path);
      },
      sleepSyncMs: (milliseconds) => {
        sleeps.push(milliseconds);
      },
    });

    try {
      expect(opens).toBe(3);
      expect(sleeps).toEqual([100, 200]);
      expect(service.isOpen()).toBe(true);
    } finally {
      service.closeSync();
    }
  });

  it("item 4: a transaction runs on its own connection and the primary error survives rollback and close failures", async () => {
    const sameConnection = await Effect.runPromise(make({ databasePath: databasePath() }));

    try {
      await Effect.runPromise(sameConnection.exec("CREATE TABLE items (id TEXT NOT NULL)"));

      let seenInsideTransaction = 0;
      await Effect.runPromise(
        sameConnection.transaction((tx) =>
          Effect.gen(function* () {
            yield* tx.exec("INSERT INTO items (id) VALUES ('pending')");
            // The sync facade is the same owner, so it observes the uncommitted row.
            seenInsideTransaction = rows(
              sameConnection.querySync("SELECT id FROM items WHERE id = 'pending'"),
            ).length;
          }),
        ),
      );

      expect(seenInsideTransaction).toBe(1);
      expect(rows(sameConnection.querySync("SELECT id FROM items ORDER BY id"))).toEqual([
        { id: "pending" },
      ]);
    } finally {
      await Effect.runPromise(sameConnection.close());
    }

    const cleanup: string[] = [];
    const failing = await Effect.runPromise(
      make({
        databasePath: databasePath(),
        onCleanupFailure: (failure) => {
          cleanup.push(failure.operation);
        },
      }),
    );

    await Effect.runPromise(failing.exec("CREATE TABLE items (id TEXT NOT NULL)"));

    const primary = new Error("primary transaction failure");
    await expect(
      Effect.runPromise(
        failing.transaction((tx: { exec: (sql: string) => Effect.Effect<void, unknown> }) =>
          Effect.gen(function* () {
            yield* tx.exec("INSERT INTO items (id) VALUES ('x')");
            // Closing now makes both ROLLBACK and the cleanup close fail.
            failing.closeSync();
            return yield* Effect.fail(primary);
          }),
        ),
      ),
    ).rejects.toBe(primary);

    expect(cleanup).toContain("rollback");
    expect(cleanup).toContain("close");
  });

  it("item 5: a transaction never retries its work on a busy error", async () => {
    const sleeps: number[] = [];
    const service = await Effect.runPromise(
      make({
        databasePath: databasePath(),
        sleepMs: (milliseconds) => {
          sleeps.push(milliseconds);
          return Effect.void;
        },
      }),
    );

    try {
      await Effect.runPromise(service.exec("CREATE TABLE items (id TEXT NOT NULL)"));

      let attempts = 0;
      const busy = busyError();

      await expect(
        Effect.runPromise(
          service.transaction(() =>
            Effect.suspend(() => {
              attempts += 1;
              return Effect.fail(busy);
            }),
          ),
        ),
      ).rejects.toBe(busy);

      expect(attempts).toBe(1);
      expect(sleeps).toEqual([]);
    } finally {
      await Effect.runPromise(service.close());
    }
  });

  it("item 6: transaction ownership is serialized across yielding fibers", async () => {
    const service = await Effect.runPromise(make({ databasePath: databasePath() }));

    try {
      await Effect.runPromise(service.exec("CREATE TABLE events (v TEXT NOT NULL)"));

      const events: string[] = [];
      const transaction = (name: string, waitMs: number) =>
        service.transaction((tx) =>
          Effect.gen(function* () {
            events.push(`${name}:begin`);
            yield* tx.exec(`INSERT INTO events (v) VALUES ('${name}')`);
            yield* Effect.sleep(waitMs);
            events.push(`${name}:end`);
          }),
        );

      await Effect.runPromise(
        Effect.all([transaction("a", 50), transaction("b", 0)], { concurrency: "unbounded" }),
      );

      const aBegin = events.indexOf("a:begin");
      const aEnd = events.indexOf("a:end");
      const bBegin = events.indexOf("b:begin");
      const bEnd = events.indexOf("b:end");
      expect(aBegin).toBeGreaterThanOrEqual(0);
      expect(aEnd).toBeGreaterThanOrEqual(0);
      expect(bBegin).toBeGreaterThanOrEqual(0);
      expect(bEnd).toBeGreaterThanOrEqual(0);
      expect(aEnd < bBegin || bEnd < aBegin).toBe(true);
      expect(rows(service.querySync("SELECT v FROM events ORDER BY v"))).toEqual([
        { v: "a" },
        { v: "b" },
      ]);
    } finally {
      await Effect.runPromise(service.close());
    }
  });

  it("item 6b: a nested service call inside a transaction fails instead of deadlocking", async () => {
    const service = await Effect.runPromise(make({ databasePath: databasePath() }));

    try {
      await Effect.runPromise(service.exec("CREATE TABLE items (id TEXT NOT NULL)"));
      await expect(
        Effect.runPromise(service.transaction(() => service.query("SELECT 1"))),
      ).rejects.toThrow(/nested/i);
    } finally {
      await Effect.runPromise(service.close());
    }
  });

  it("closes idempotently and rejects work on a closed service", async () => {
    const service = await Effect.runPromise(make({ databasePath: databasePath() }));

    await Effect.runPromise(service.close());
    await Effect.runPromise(service.close());

    expect(service.isOpen()).toBe(false);
    await expect(Effect.runPromise(service.query("SELECT 1"))).rejects.toThrow(/closed/i);
  });
});
