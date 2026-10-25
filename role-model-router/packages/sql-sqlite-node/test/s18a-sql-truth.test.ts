import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { Effect, Exit } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  backupRuntimeState,
  initializeSqliteMemory,
  resolveSqliteMemoryLocation,
  restoreRuntimeState,
} from "../../sqlite-memory/src/index.js";
import { BUSY_TIMEOUT_MS, makeSync } from "../src/service.js";

/**
 * Run 115 S18a/S18b (R24): measure and pin the SQL truth - DatabaseSync is blocking, per-store
 * PRAGMAs are what they are, no owner fence exists for restore/delete, and SQL transactions are real
 * BEGIN/COMMIT/ROLLBACK rather than an Effect Ref/TxRef memory substitute.
 *
 * S18b makes the measurement falsifiable:
 * - the blocking tests assert the WORK (persisted rows), not only elapsed time;
 * - the absolute 20 ms floor is replaced by a measured idle-timer baseline and a relative tolerance:
 *   the blocked statement must be >= 3x the idle timer baseline (a sample long enough to observe),
 *   and the timer must fire no earlier than statementMs - baselineMs (it can only fire after the
 *   synchronous statement ends; the baseline covers timer-resolution noise);
 * - sqlite-memory file-level settings (journal_mode, auto_vacuum) are read on a fresh connection,
 *   while connection-level settings (synchronous, foreign_keys, busy_timeout) are read from the
 *   initializer's OWN connection at close and proven non-transferable;
 * - "no substitute" is behavioural (commit persists, rollback removes, the work is visible inside
 *   the transaction); source-string checks are a secondary guard only.
 *
 * This is a measurement + characterization file: it does not change product behaviour.
 */

const tempDirs: string[] = [];

const tempDir = (): string => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "role-model-s18a-"));
  tempDirs.push(dir);
  return dir;
};

const cleanup = (): void => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
};

afterEach(cleanup);

const pragma = (database: DatabaseSync, name: string): Record<string, unknown> | undefined =>
  // SAFETY: each PRAGMA below is a documented single-row read whose columns are asserted by name.
  database.prepare(`PRAGMA ${name}`).get() as Record<string, unknown> | undefined;

const readSynchronous = (database: DatabaseSync): number | undefined =>
  // SAFETY: PRAGMA synchronous returns one row with the numeric column synchronous.
  (database.prepare("PRAGMA synchronous").get() as { synchronous?: number } | undefined)?.synchronous;

const readForeignKeys = (database: DatabaseSync): number | undefined =>
  // SAFETY: PRAGMA foreign_keys returns one row with the numeric column foreign_keys.
  (database.prepare("PRAGMA foreign_keys").get() as { foreign_keys?: number } | undefined)?.foreign_keys;

const readBusyTimeout = (database: DatabaseSync): number | undefined =>
  // SAFETY: PRAGMA busy_timeout returns one row with the numeric column timeout.
  (database.prepare("PRAGMA busy_timeout").get() as { timeout?: number } | undefined)?.timeout;

interface ConnectionPragmas {
  readonly synchronous: number | undefined;
  readonly foreign_keys: number | undefined;
  readonly busy_timeout: number | undefined;
}

/**
 * A measured non-blocking baseline: five idle setTimeout(0) hops in this process. The median is the
 * timer-dispatch floor; every blocking assertion is relative to it (no absolute millisecond floor).
 */
const measureIdleTimerBaselineMs = async (samples = 5): Promise<number> => {
  // Discard one warm-up hop, then take the MINIMUM idle hop: that is the timer-dispatch floor this
  // process can achieve, while a median would absorb unrelated startup/CI load and inflate the
  // relative sample-validity gate.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const delays: number[] = [];
  for (let index = 0; index < samples; index += 1) {
    const startedAt = performance.now();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    delays.push(performance.now() - startedAt);
  }
  return Math.max(Math.min(...delays), 0.5);
};

/**
 * Reads the initializer's OWN connection at the moment it closes, instead of a fresh connection whose
 * per-connection defaults prove nothing about initialization.
 */
const captureInitializerConnection = <A>(run: () => A): {
  readonly snapshot: ConnectionPragmas;
  readonly value: A;
} => {
  const originalClose = DatabaseSync.prototype.close;
  const snapshots: ConnectionPragmas[] = [];
  // SAFETY: test-only instrumentation of the real DatabaseSync class; restored in finally.
  DatabaseSync.prototype.close = function patchedClose(this: DatabaseSync): void {
    snapshots.push({
      busy_timeout: readBusyTimeout(this),
      foreign_keys: readForeignKeys(this),
      synchronous: readSynchronous(this),
    });
    return originalClose.call(this);
  };
  try {
    const value = run();
    expect(snapshots).toHaveLength(1);
    return { snapshot: snapshots[0]!, value };
  } finally {
    DatabaseSync.prototype.close = originalClose;
  }
};

describe("S18a blocking measurement", () => {
  it("blocks the event loop for a whole synchronous statement whose work persists, relative to the idle timer baseline", async () => {
    const baselineMs = await measureIdleTimerBaselineMs();
    const databasePath = path.join(tempDir(), "blocking.sqlite");
    const service = makeSync({ databasePath });
    try {
      let ranDuringStatement = false;
      let timerDelayMs = 0;
      let statementFinished = false;
      const startedAt = performance.now();
      const timer = new Promise<void>((resolve) => {
        setTimeout(() => {
          ranDuringStatement = !statementFinished;
          timerDelayMs = performance.now() - startedAt;
          resolve();
        }, 0);
      });

      // 800001 persisted rows: a fake implementation that only busy-waits fails the count below.
      service.execSync(
        "CREATE TABLE work AS WITH RECURSIVE cnt(x) AS (VALUES(0) UNION ALL SELECT x+1 FROM cnt WHERE x < 800000) SELECT x FROM cnt",
      );
      statementFinished = true;
      const statementMs = performance.now() - startedAt;
      await timer;

      // The work assertion: the synchronous statement actually ran in SQLite.
      expect(service.querySync("SELECT COUNT(*) AS c FROM work")).toEqual([{ c: 800_001 }]);
      // The timer cannot have fired while the synchronous statement owned the thread.
      expect(ranDuringStatement).toBe(false);
      // Relative sample validity and relative tolerance (no absolute floor).
      expect(statementMs).toBeGreaterThanOrEqual(baselineMs * 3);
      expect(timerDelayMs).toBeGreaterThanOrEqual(statementMs - baselineMs);
    } finally {
      service.closeSync();
    }
  });

  it("blocks through a whole synchronous transaction whose rows commit, relative to the idle timer baseline", async () => {
    const baselineMs = await measureIdleTimerBaselineMs();
    const databasePath = path.join(tempDir(), "transaction-blocking.sqlite");
    const service = makeSync({ databasePath });
    try {
      service.execSync("CREATE TABLE t (value INTEGER)");
      let ranDuring = false;
      let timerDelayMs = 0;
      let transactionFinished = false;
      let insideCount: ReadonlyArray<Record<string, unknown>> | undefined;
      const startedAt = performance.now();
      const timer = new Promise<void>((resolve) => {
        setTimeout(() => {
          ranDuring = !transactionFinished;
          timerDelayMs = performance.now() - startedAt;
          resolve();
        }, 0);
      });
      // 20000 rows: the transaction must outlast the process's timer-dispatch floor so the
      // relative sample-validity gate is meaningful; the count below proves the work.
      service.transactionSync((tx) => {
        for (let index = 0; index < 20_000; index += 1) {
          tx.execSync(`INSERT INTO t(value) VALUES (${index})`);
        }
        insideCount = tx.querySync("SELECT COUNT(*) AS c FROM t");
      });
      transactionFinished = true;
      const transactionMs = performance.now() - startedAt;
      await timer;

      // The work assertion: the callback ran and every row persisted (a no-op fails both).
      expect(insideCount).toEqual([{ c: 20_000 }]);
      expect(service.querySync("SELECT COUNT(*) AS c FROM t")).toEqual([{ c: 20_000 }]);
      expect(ranDuring).toBe(false);
      expect(transactionMs).toBeGreaterThanOrEqual(baselineMs);
      expect(timerDelayMs).toBeGreaterThanOrEqual(transactionMs - baselineMs);
    } finally {
      service.closeSync();
    }
  });
});

describe("S18a per-store PRAGMAs", () => {
  it("pins the sql-sqlite-node service defaults on the service's own connection (busy_timeout 5000, journal delete, synchronous FULL, FK on, auto_vacuum off)", () => {
    const service = makeSync({ databasePath: path.join(tempDir(), "pragmas.sqlite") });
    try {
      // Same connection as the service, so these are real read-backs of what the service set/defaulted.
      expect(service.querySync("PRAGMA busy_timeout")).toEqual([{ timeout: BUSY_TIMEOUT_MS }]);
      expect(service.querySync("PRAGMA journal_mode")).toEqual([{ journal_mode: "delete" }]);
      expect(service.querySync("PRAGMA synchronous")).toEqual([{ synchronous: 2 }]);
      expect(service.querySync("PRAGMA foreign_keys")).toEqual([{ foreign_keys: 1 }]);
      expect(service.querySync("PRAGMA auto_vacuum")).toEqual([{ auto_vacuum: 0 }]);
    } finally {
      service.closeSync();
    }
  });

  it("preserves a per-store setup() PRAGMA (WAL + synchronous NORMAL)", () => {
    const service = makeSync({
      databasePath: path.join(tempDir(), "setup-pragmas.sqlite"),
      setup: (database) => {
        database.exec("PRAGMA journal_mode = WAL");
        database.exec("PRAGMA synchronous = NORMAL");
      },
    });
    try {
      expect(service.querySync("PRAGMA journal_mode")).toEqual([{ journal_mode: "wal" }]);
      expect(service.querySync("PRAGMA synchronous")).toEqual([{ synchronous: 1 }]);
    } finally {
      service.closeSync();
    }
  });
});

describe("S18a sqlite-memory PRAGMAs split by persistence scope", () => {
  it("file-level initialization settings (WAL, auto_vacuum) survive on a new connection", () => {
    const root = tempDir();
    const initialized = initializeSqliteMemory({
      channel: "development",
      runtimeStateRoot: root,
      scopeId: "s18a",
    });
    expect(initialized.databasePath).toBe(
      resolveSqliteMemoryLocation({ runtimeStateRoot: root, scopeId: "s18a" }),
    );
    const database = new DatabaseSync(initialized.databasePath);
    try {
      // File-level: these persist in the database header and are observable after re-open.
      expect(pragma(database, "journal_mode")).toEqual({ journal_mode: "wal" });
      expect(pragma(database, "auto_vacuum")).toEqual({ auto_vacuum: 2 });
    } finally {
      database.close();
    }
  });

  it("connection-level settings are read from the initializer's OWN connection and do not transfer to a fresh one", () => {
    const root = tempDir();
    const captured = captureInitializerConnection(() =>
      initializeSqliteMemory({
        channel: "development",
        runtimeStateRoot: root,
        scopeId: "s18a-connection",
      }),
    );
    // The initializer's own connection at close: SQLite/node per-connection defaults (it does not set
    // these). A mutation that sets synchronous=OFF/foreign_keys=OFF on that connection reddens this.
    expect(captured.snapshot).toEqual({ busy_timeout: 0, foreign_keys: 1, synchronous: 2 });

    // Prove the values are per-connection and cannot be evidence of initialization: set them on a
    // probe connection, close it, then a fresh connection still reports the defaults.
    const probe = new DatabaseSync(captured.value.databasePath);
    probe.exec("PRAGMA synchronous = OFF");
    probe.exec("PRAGMA foreign_keys = OFF");
    probe.exec("PRAGMA busy_timeout = 5000");
    expect(readSynchronous(probe)).toBe(0);
    expect(readForeignKeys(probe)).toBe(0);
    expect(readBusyTimeout(probe)).toBe(5000);
    probe.close();

    const fresh = new DatabaseSync(captured.value.databasePath);
    try {
      expect(readSynchronous(fresh)).toBe(2);
      expect(readForeignKeys(fresh)).toBe(1);
      expect(readBusyTimeout(fresh)).toBe(0);
    } finally {
      fresh.close();
    }
  });
});

describe("S18a backup/restore owner fence", () => {
  it("characterizes restore while an owner connection is active: no logical fence, only OS file locking", () => {
    const root = tempDir();
    const initialized = initializeSqliteMemory({
      channel: "development",
      runtimeStateRoot: root,
      scopeId: "s18a-restore",
    });
    const backupPath = path.join(root, "backup.sqlite");
    backupRuntimeState({ backupPath, databasePath: initialized.databasePath });

    const owner = new DatabaseSync(initialized.databasePath);
    owner.exec("PRAGMA busy_timeout = 5000");
    let refusal: unknown = null;
    let outcome: "proceeded" | "refused" = "proceeded";
    try {
      restoreRuntimeState({ backupPath, databasePath: initialized.databasePath });
    } catch (error) {
      outcome = "refused";
      refusal = error;
    } finally {
      owner.close();
    }

    // There is no owner registry/fence in restoreRuntimeState; on Windows the OS refuses the
    // replace while the handle is open (EPERM/EBUSY), on POSIX it would succeed. Neither is an
    // explicit drain/fence, so the only acceptable refusals are the filesystem's.
    if (outcome === "refused") {
      expect(refusal).toBeInstanceOf(Error);
      expect(String((refusal as Error).message)).toMatch(/EPERM|EBUSY|locked|permission/i);
      expect(String((refusal as Error).message)).not.toMatch(
        /owner is active|owner active|drain|fence/i,
      );
    }
    // After the owner is closed the restore must proceed. It restores the backup's own
    // journal_mode (VACUUM INTO writes a delete-journal database), not the WAL mode
    // initializeSqliteMemory sets on the live store - a maintenance gap, pinned here.
    restoreRuntimeState({ backupPath, databasePath: initialized.databasePath });
    const database = new DatabaseSync(initialized.databasePath);
    try {
      expect(pragma(database, "journal_mode")).toEqual({ journal_mode: "delete" });
    } finally {
      database.close();
    }
  });
});

describe("S18a real SQL transactions, no substitute", () => {
  it("behaviourally commits real SQL and exposes it inside the transaction (a no-op or Ref buffer fails)", async () => {
    const service = makeSync({ databasePath: path.join(tempDir(), "transaction-commit.sqlite") });
    try {
      service.execSync("CREATE TABLE t (value INTEGER)");

      let insideSync: ReadonlyArray<Record<string, unknown>> | undefined;
      service.transactionSync((tx) => {
        tx.execSync("INSERT INTO t(value) VALUES (1)");
        insideSync = tx.querySync("SELECT COUNT(*) AS c FROM t");
      });
      // The row is visible to SQL INSIDE the transaction and persists after COMMIT.
      expect(insideSync).toEqual([{ c: 1 }]);
      expect(service.querySync("SELECT COUNT(*) AS c FROM t")).toEqual([{ c: 1 }]);

      const program = service.transaction((tx) =>
        Effect.gen(function* () {
          yield* tx.exec("INSERT INTO t(value) VALUES (2)");
          return yield* tx.query("SELECT COUNT(*) AS c FROM t");
        }),
      );
      const exit = await Effect.runPromiseExit(program);
      expect(Exit.isSuccess(exit)).toBe(true);
      expect(service.querySync("SELECT COUNT(*) AS c FROM t")).toEqual([{ c: 2 }]);
    } finally {
      service.closeSync();
    }
  });

  it("behaviourally rolls back real SQL work (the failed insert is gone)", async () => {
    const databasePath = path.join(tempDir(), "transaction.sqlite");
    const service = makeSync({ databasePath });
    try {
      service.execSync("CREATE TABLE t (value INTEGER)");
      const program = service.transaction((tx) =>
        Effect.gen(function* () {
          yield* tx.exec("INSERT INTO t(value) VALUES (1)");
          return yield* Effect.fail(new Error("boom"));
        }),
      );
      const exit = await Effect.runPromiseExit(program);
      expect(Exit.isFailure(exit)).toBe(true);
      expect(service.querySync("SELECT COUNT(*) AS c FROM t")).toEqual([{ c: 0 }]);
    } finally {
      service.closeSync();
    }
  });

  it("secondary static guard (not the proof): the real transaction statements are present", () => {
    // SECONDARY ONLY. The behavioural commit/rollback tests above are authoritative; this guard
    // catches an accidental deletion of the SQL statements, not a memory substitute.
    const serviceSource = readFileSync(new URL("../src/service.ts", import.meta.url), "utf8");
    expect(serviceSource).toContain('database.exec("BEGIN IMMEDIATE")');
    expect(serviceSource).toContain('database.exec("COMMIT")');
    expect(serviceSource).toContain('database.exec("ROLLBACK")');
    expect(serviceSource).not.toContain("TxRef");
  });
});
