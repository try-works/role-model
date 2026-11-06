import { DatabaseSync } from "node:sqlite";

/** The bind shapes node:sqlite accepts; its own SQLInputValue alias is not exported. */
type SqlBindValue = null | number | bigint | string | NodeJS.ArrayBufferView;

import { Duration, Effect, Exit, Fiber, Ref, Semaphore } from "effect";

/**
 * Run 115 S6a (R23/B3): a first-party SQLite service over the vendored SQLite client's
 * runtime, with explicit async Effect callers and a synchronous facade over the same
 * connection owner.
 *
 * The contract comes from 00-requirements.md R23 (lines 214-220) and mirrors the existing
 * synchronous database code in packages/sqlite-memory/src/index.ts:167-213:
 *   - busy timeout 5s and retries at 100ms/200ms after the initial attempt;
 *   - a failed open closes whatever it opened;
 *   - the primary error survives a failing rollback/close;
 *   - no retry of work inside a transaction;
 *   - connection/fiber ownership serialized explicitly (Semaphore) with Effect Ref state,
 *     not a mutable depth counter shared across yielding fibers.
 *
 * node:sqlite is synchronous and blocking (R24), so no Effect.tryPromise is used and there is
 * no AbortSignal to forward; if a caller wraps this service in a promise, the thunk must declare
 * its AbortSignal parameter to receive one (vendor/effect/packages/effect/src/internal/effect.ts:1166).
 */

/** SQLite waits this long for a lock (packages/sqlite-memory/src/index.ts:167). */
export const BUSY_TIMEOUT_MS = 5_000;

/** Initial attempt plus two busy retries at 100ms and 200ms (sqlite-memory:168-169, :193-209). */
export const BUSY_RETRY_DELAYS_MS: ReadonlyArray<number> = [100, 200];

export type SqliteRow = Readonly<Record<string, unknown>>;
export type SqliteRows = ReadonlyArray<SqliteRow>;

export interface SqliteCleanupFailure {
  readonly operation: "open-cleanup" | "rollback" | "close";
  readonly cause: unknown;
}

export interface SqliteServiceConfig {
  readonly databasePath: string;
  /** PRAGMAs/setup that must succeed before the service is usable; a throw is a partial open. */
  readonly setup?: (database: DatabaseSync) => void;
  /** Observes cleanup failures (rollback/close/open cleanup) that must not replace the primary error. */
  readonly onCleanupFailure?: (failure: SqliteCleanupFailure) => void;
  /** Test seam for the native constructor. */
  readonly openDatabase?: (databasePath: string) => DatabaseSync;
  /** Test seam for the async retry sleep. */
  readonly sleepMs?: (milliseconds: number) => Effect.Effect<void>;
  /** Test seam for the sync-facade retry sleep. */
  readonly sleepSyncMs?: (milliseconds: number) => void;
}

export class SqliteServiceError extends Error {
  readonly _tag: string = "SqliteServiceError";
  readonly operation: string;
  readonly cause: unknown;

  constructor(operation: string, cause?: unknown, message?: string) {
    super(message ?? `SQLite ${operation} failed: ${describeCause(cause)}`);
    this.name = "SqliteServiceError";
    this.operation = operation;
    this.cause = cause;
  }
}

export class SqliteOpenError extends SqliteServiceError {
  readonly _tag: string = "SqliteOpenError";
  readonly attempts: number;
  readonly busy: boolean;

  constructor(cause: unknown, attempts: number, busy: boolean) {
    super(
      "open",
      cause,
      `SQLite open failed after ${attempts} attempt(s): ${describeCause(cause)}`,
    );
    this.name = "SqliteOpenError";
    this.attempts = attempts;
    this.busy = busy;
  }
}

export interface MaintenancePragmaSnapshot {
  readonly [pragmaName: string]: string;
}

/** Typed refusal: a maintenance operation cannot start while another owner holds the connection. */
export class MaintenanceBusyError extends SqliteServiceError {
  readonly code = "MAINTENANCE_BUSY";
  readonly owner: string;

  constructor(operation: string, owner: string) {
    super(
      operation,
      undefined,
      `SQLite ${operation} refused: ${owner} owns the connection; maintenance needs the fence idle or drained.`,
    );
    this.name = "MaintenanceBusyError";
    this.owner = owner;
  }
}

/** Typed failure: the bounded drain waited for the owner and the owner never released. */
export class MaintenanceDrainTimeoutError extends SqliteServiceError {
  readonly code = "MAINTENANCE_DRAIN_TIMEOUT";
  readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number) {
    super(
      operation,
      undefined,
      `SQLite ${operation} drain timed out after ${timeoutMs}ms waiting for the active owner to release.`,
    );
    this.name = "MaintenanceDrainTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

/** Typed validation failure: the drain budget must be a finite, non-negative number. */
export class MaintenanceBudgetError extends SqliteServiceError {
  readonly code = "MAINTENANCE_INVALID_BUDGET";
  readonly drainTimeoutMs: number;

  constructor(operation: string, drainTimeoutMs: number) {
    super(
      operation,
      undefined,
      `SQLite ${operation} refused: drainTimeoutMs must be finite and >= 0 (got ${String(drainTimeoutMs)}).`,
    );
    this.name = "MaintenanceBudgetError";
    this.drainTimeoutMs = drainTimeoutMs;
  }
}

/** Typed verification failure: the store's PRAGMAs did not survive the maintenance re-apply. */
export class MaintenancePragmaVerificationError extends SqliteServiceError {
  readonly code = "MAINTENANCE_PRAGMA_UNVERIFIED";
  readonly pragmas: readonly string[];

  constructor(operation: string, pragmas: readonly string[]) {
    super(
      operation,
      undefined,
      `SQLite ${operation} re-applied PRAGMAs did not verify: ${pragmas.join(", ")}.`,
    );
    this.name = "MaintenancePragmaVerificationError";
    this.pragmas = pragmas;
  }
}

export interface MaintenanceOptions {
  /** 0/absent means immediate refusal (typed busy); >0 drains up to the bound then fails typed. */
  readonly drainTimeoutMs?: number;
  /** Internal loss test hook: false leaves the connection's reset PRAGMAs in place. */
  readonly reapplyPragmas?: boolean;
  /** Internal failure-path test hook: pretend this pragma's re-apply was rejected/no-op. */
  readonly reapplyFailurePragma?: string;
}

export interface MaintenanceResult {
  readonly kind: "backup" | "reset" | "restore";
  readonly durationMs: number;
  readonly targetPath?: string;
}

/**
 * R24 maintenance surface: backup/reset/restore are fenced against every owner (active async
 * transaction, sync owner depth, another maintenance) and bounded-drained, and the store's actual
 * PRAGMAs are re-applied afterwards so a maintenance cycle cannot silently change per-store behavior.
 */
export interface SqliteMaintenance {
  readonly pragmas: () => MaintenancePragmaSnapshot;
  readonly backup: (targetPath: string, options?: MaintenanceOptions) => Promise<MaintenanceResult>;
  readonly reset: (options?: MaintenanceOptions) => Promise<MaintenanceResult>;
  readonly restore: (options?: MaintenanceOptions) => Promise<MaintenanceResult>;
}

export interface SqliteTransaction {
  readonly query: (
    sql: string,
    params?: ReadonlyArray<unknown>,
  ) => Effect.Effect<SqliteRows, SqliteServiceError>;
  readonly exec: (sql: string) => Effect.Effect<void, SqliteServiceError>;
  readonly querySync: (sql: string, params?: ReadonlyArray<unknown>) => SqliteRows;
  readonly execSync: (sql: string) => void;
}

export interface SqliteService {
  /** Explicit async Effect caller. */
  readonly query: (
    sql: string,
    params?: ReadonlyArray<unknown>,
  ) => Effect.Effect<SqliteRows, SqliteServiceError>;
  /** Explicit async Effect caller. */
  readonly exec: (sql: string) => Effect.Effect<void, SqliteServiceError>;
  /** Runs on the connection that opened it, serialized against other callers. */
  readonly transaction: <A, E>(
    work: (tx: SqliteTransaction) => Effect.Effect<A, E>,
  ) => Effect.Effect<A, E | SqliteServiceError>;
  /**
   * Compatible synchronous facade (SEA startup, migrations, sync test helpers). While a
   * *different* fiber's async transaction owns the connection, every sync facade operation
   * refuses with a typed SqliteServiceError; the owning fiber keeps using the transaction
   * handle. A sync call cannot await the semaphore without blocking the event loop, so this
   * is an intentional ownership refusal, not asynchronous serialization.
   */
  readonly querySync: (sql: string, params?: ReadonlyArray<unknown>) => SqliteRows;
  readonly execSync: (sql: string) => void;
  readonly transactionSync: <A>(work: (tx: SqliteTransaction) => A) => A;
  readonly close: () => Effect.Effect<void, SqliteServiceError>;
  readonly closeSync: () => void;
  readonly isOpen: () => boolean;
  readonly maintenance: SqliteMaintenance;
}

const describeCause = (cause: unknown): string =>
  cause instanceof Error ? cause.message : cause === undefined ? "no cause" : String(cause);

const isBusyCause = (cause: unknown): boolean => {
  if (!(cause instanceof Error)) {
    return false;
  }
  const errcode = (cause as { readonly errcode?: unknown }).errcode;
  return (
    errcode === 5 ||
    errcode === 6 ||
    /database is locked|SQLITE_BUSY|SQLITE_LOCKED/i.test(cause.message)
  );
};

const reportCleanup = (
  config: SqliteServiceConfig,
  operation: SqliteCleanupFailure["operation"],
  cause: unknown,
): void => {
  try {
    config.onCleanupFailure?.({ operation, cause });
  } catch {
    // A cleanup observer must not replace the primary error.
  }
};

const tryClose = (
  config: SqliteServiceConfig,
  database: DatabaseSync,
  operation: "open-cleanup" | "close",
): unknown => {
  try {
    database.close();
    return undefined;
  } catch (cause) {
    reportCleanup(config, operation, cause);
    return cause;
  }
};

const openOnce = (config: SqliteServiceConfig): DatabaseSync => {
  const database = (config.openDatabase ?? ((path: string) => new DatabaseSync(path)))(
    config.databasePath,
  );
  try {
    // Synchronous SQLite busy waits block the event loop; that is the accepted R24 behaviour.
    database.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
    config.setup?.(database);
    return database;
  } catch (cause) {
    // Fallible partial open: never leave a half-initialized handle behind.
    tryClose(config, database, "open-cleanup");
    throw cause;
  }
};

const effectSleep = (config: SqliteServiceConfig, milliseconds: number): Effect.Effect<void> =>
  config.sleepMs?.(milliseconds) ?? Effect.sleep(Duration.millis(milliseconds));

const attemptOpenAsync = (
  config: SqliteServiceConfig,
  attempt: number,
): Effect.Effect<DatabaseSync, SqliteOpenError> =>
  Effect.suspend(() => {
    try {
      return Effect.succeed(openOnce(config));
    } catch (cause) {
      return Effect.fail(new SqliteOpenError(cause, attempt + 1, isBusyCause(cause)));
    }
  }).pipe(
    Effect.catchIf(
      (error): error is SqliteOpenError =>
        error instanceof SqliteOpenError && error.busy && attempt < BUSY_RETRY_DELAYS_MS.length,
      () =>
        Effect.flatMap(effectSleep(config, BUSY_RETRY_DELAYS_MS[attempt]), () =>
          attemptOpenAsync(config, attempt + 1),
        ),
    ),
  );

const sleepSyncDefault = (milliseconds: number): void => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
};

const openWithRetrySync = (config: SqliteServiceConfig): DatabaseSync => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= BUSY_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return openOnce(config);
    } catch (cause) {
      const error = new SqliteOpenError(cause, attempt + 1, isBusyCause(cause));
      lastError = error;
      if (!error.busy || attempt >= BUSY_RETRY_DELAYS_MS.length) {
        throw error;
      }
      if (config.sleepSyncMs) {
        config.sleepSyncMs(BUSY_RETRY_DELAYS_MS[attempt]);
      } else {
        sleepSyncDefault(BUSY_RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastError;
};

const readRows = (
  database: DatabaseSync,
  sql: string,
  params: ReadonlyArray<unknown>,
): SqliteRows =>
  // SAFETY: node:sqlite binds SQLInputValue, which its own .d.ts declares locally and does not
  // export, so the shape is restated here. This is a pass-through of caller-supplied bind values;
  // the package and its tests bind only these shapes, and the driver rejects anything else at
  // prepare time with its own error.
  database.prepare(sql).all(...(params as ReadonlyArray<SqlBindValue>)) as SqliteRows;

const runExec = (database: DatabaseSync, sql: string): void => {
  database.exec(sql);
};

const buildTransaction = (database: DatabaseSync): SqliteTransaction => ({
  exec: (sql) =>
    Effect.try({
      try: () => runExec(database, sql),
      catch: (cause) => new SqliteServiceError("transaction-exec", cause),
    }),
  execSync: (sql) => runExec(database, sql),
  query: (sql, params = []) =>
    Effect.try({
      try: () => readRows(database, sql, params),
      catch: (cause) => new SqliteServiceError("transaction-query", cause),
    }),
  querySync: (sql, params = []) => readRows(database, sql, params),
});

const buildService = (config: SqliteServiceConfig, database: DatabaseSync): SqliteService => {
  // Effect Ref state + Semaphore ownership: no mutable depth counter shared across fibers.
  const openState = Ref.makeUnsafe<boolean>(true);
  const activeTransaction = Ref.makeUnsafe<number | null>(null);
  const semaphore = Semaphore.makeUnsafe(1);

  const serialize = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    semaphore.withPermits(1)(effect);

  const markClosed = (): void => {
    Effect.runSync(Ref.set(openState, false));
  };

  const closedError = (operation: string): SqliteServiceError =>
    new SqliteServiceError(operation, undefined, "SQLite service is closed");

  const nestedError = (operation: string): SqliteServiceError =>
    new SqliteServiceError(
      operation,
      undefined,
      "nested SQLite service call inside a transaction: use the transaction handle",
    );

  const syncOwnershipError = (operation: string): SqliteServiceError =>
    new SqliteServiceError(
      operation,
      undefined,
      `SQLite ${operation} refused: an active async Effect transaction owns the connection; a synchronous call cannot await the semaphore, so use the transaction handle or await the transaction`,
    );

  /**
   * R23 mixed-owner fence: the sync facade may not touch the connection while a *different*
   * fiber's async transaction owns it. The owner fiber (and the transaction handle) keeps
   * working; everyone else gets the typed refusal before any prepare/exec/close.
   */
  const refuseUnlessTransactionOwnerSync = (operation: string): void => {
    const owner = Ref.getUnsafe(activeTransaction);
    if (owner !== null && Fiber.getCurrent()?.id !== owner) {
      throw syncOwnershipError(operation);
    }
  };

  const ensureOpenSync = (operation: string): void => {
    if (!Ref.getUnsafe(openState)) {
      throw closedError(operation);
    }
  };

  const ensureOpenEffect = (operation: string): Effect.Effect<void, SqliteServiceError> =>
    Ref.get(openState).pipe(
      Effect.flatMap((isOpen) => (isOpen ? Effect.void : Effect.fail(closedError(operation)))),
    );

  const rejectNestedEffect = (operation: string): Effect.Effect<void, SqliteServiceError> =>
    Effect.sync(() => Ref.getUnsafe(activeTransaction)).pipe(
      Effect.flatMap((owner) =>
        owner === null ? Effect.void : Effect.fail(nestedError(operation)),
      ),
    );

  const clearTransactionOwner = (): void => {
    Effect.runSync(Ref.set(activeTransaction, null));
  };

  const rollbackAndMaybeClose = (): void => {
    let rollbackFailed = false;
    try {
      database.exec("ROLLBACK");
    } catch (cause) {
      rollbackFailed = true;
      reportCleanup(config, "rollback", cause);
    }
    if (rollbackFailed) {
      // The transaction state is unknown; close the connection so it cannot be reused.
      tryClose(config, database, "close");
      markClosed();
    }
  };

  const query = (sql: string, params: ReadonlyArray<unknown> = []) =>
    Effect.flatMap(rejectNestedEffect("query"), () =>
      serialize(
        Effect.gen(function* () {
          yield* ensureOpenEffect("query");
          return yield* Effect.try({
            try: () => readRows(database, sql, params),
            catch: (cause) => new SqliteServiceError("query", cause),
          });
        }),
      ),
    );

  const exec = (sql: string) =>
    Effect.flatMap(rejectNestedEffect("exec"), () =>
      serialize(
        Effect.gen(function* () {
          yield* ensureOpenEffect("exec");
          return yield* Effect.try({
            try: () => runExec(database, sql),
            catch: (cause) => new SqliteServiceError("exec", cause),
          });
        }),
      ),
    );

  const transaction = <A, E>(work: (tx: SqliteTransaction) => Effect.Effect<A, E>) =>
    serialize(
      Effect.gen(function* () {
        // Set inside the protected region so every exit path (success, failure, interruption)
        // rolls an open BEGIN back and clears ownership before the next operation.
        let transactionOpen = false;

        return yield* Effect.ensuring(
          Effect.gen(function* () {
            yield* ensureOpenEffect("transaction");
            const fiberId = yield* Effect.fiberId;
            yield* Effect.sync(() => {
              Effect.runSync(Ref.set(activeTransaction, fiberId));
            });

            const begin = yield* Effect.exit(
              Effect.try({
                try: () => {
                  database.exec("BEGIN IMMEDIATE");
                  transactionOpen = true;
                },
                catch: (cause) => new SqliteServiceError("begin-transaction", cause),
              }),
            );
            if (Exit.isFailure(begin)) {
              return yield* Effect.failCause(begin.cause);
            }

            const workExit = yield* Effect.exit(work(buildTransaction(database)));

            if (Exit.isSuccess(workExit)) {
              const commit = yield* Effect.exit(
                Effect.try({
                  try: () => {
                    database.exec("COMMIT");
                    transactionOpen = false;
                  },
                  catch: (cause) => new SqliteServiceError("commit", cause),
                }),
              );
              if (Exit.isSuccess(commit)) {
                return workExit.value;
              }
              // A failed commit is the primary error; the finalizer's rollback/close must not
              // replace it.
              return yield* Effect.failCause(commit.cause);
            }

            return yield* Effect.failCause(workExit.cause);
          }),
          Effect.sync(() => {
            // Interruption aborts `Effect.exit(work)` before the body can roll back, so the
            // finalizer is the single rollback authority for that path too.
            if (transactionOpen) {
              rollbackAndMaybeClose();
            }
            clearTransactionOwner();
          }),
        );
      }),
    );

  let syncOwnerDepth = 0;

  const withSyncOwner = <A>(work: () => A): A => {
    syncOwnerDepth += 1;
    try {
      return work();
    } finally {
      syncOwnerDepth -= 1;
    }
  };

  const querySync = (sql: string, params: ReadonlyArray<unknown> = []): SqliteRows =>
    withSyncOwner(() => {
      ensureOpenSync("querySync");
      refuseUnlessTransactionOwnerSync("querySync");
      return readRows(database, sql, params);
    });

  const execSync = (sql: string): void =>
    withSyncOwner(() => {
      ensureOpenSync("execSync");
      refuseUnlessTransactionOwnerSync("execSync");
      runExec(database, sql);
    });

  const transactionSync = <A>(work: (tx: SqliteTransaction) => A): A =>
    withSyncOwner(() => {
      ensureOpenSync("transactionSync");
      refuseUnlessTransactionOwnerSync("transactionSync");
      database.exec("BEGIN IMMEDIATE");
      try {
        const result = work(buildTransaction(database));
        database.exec("COMMIT");
        return result;
      } catch (cause) {
        rollbackAndMaybeClose();
        throw cause;
      }
    });

  const close = () =>
    serialize(
      Effect.suspend(() => {
        if (!Ref.getUnsafe(openState)) {
          return Effect.void;
        }
        markClosed();
        return Effect.try({
          try: () => database.close(),
          catch: (cause) => new SqliteServiceError("close", cause),
        });
      }),
    );

  const closeSync = (): void =>
    withSyncOwner(() => {
      if (!Ref.getUnsafe(openState)) {
        return;
      }
      refuseUnlessTransactionOwnerSync("closeSync");
      markClosed();
      database.close();
    });

  const isOpen = (): boolean => Ref.getUnsafe(openState);

  // S307 (R24): maintenance fence + bounded drain + actual per-store PRAGMA preservation.
  const PRAGMA_NAMES = [
    "busy_timeout",
    "journal_mode",
    "synchronous",
    "foreign_keys",
    "cache_size",
    "temp_store",
    "locking_mode",
    "auto_vacuum",
    "wal_autocheckpoint",
  ] as const;

  const readPragmas = (): MaintenancePragmaSnapshot => {
    const snapshot: Record<string, string> = {};
    for (const name of PRAGMA_NAMES) {
      const row = database.prepare(`PRAGMA ${name}`).get();
      const first = Object.values(Object(row))[0];
      snapshot[name] = String(first ?? "");
    }
    return snapshot;
  };

  const storePragmas = readPragmas();

  const reapplyPragmas = (snapshot: MaintenancePragmaSnapshot, skipPragma?: string): void => {
    for (const [name, value] of Object.entries(snapshot)) {
      if (name === skipPragma) {
        // The failure-path hook pretends this pragma's re-apply was rejected; verification must notice.
        continue;
      }
      try {
        database.exec(`PRAGMA ${name} = ${value}`);
      } catch {
        // Best-effort re-apply: a read-only pragma keeps its value; the store's primary pragmas
        // (busy_timeout/foreign_keys/synchronous/journal_mode) are writable in this connection.
      }
    }
  };

  const resetConnectionPragmas = (): void => {
    database.exec("PRAGMA busy_timeout = 1");
    database.exec("PRAGMA foreign_keys = OFF");
    database.exec("PRAGMA synchronous = OFF");
  };

  const quoteSqlLiteral = (value: string): string => `'${value.replaceAll("'", "''")}'`;

  let maintenanceActive = false;

  const drainMaintenanceOwners = async (
    operation: string,
    drainTimeoutMs: number,
  ): Promise<void> => {
    const ownerHolds = (): boolean => Ref.getUnsafe(activeTransaction) !== null;
    if (!ownerHolds()) {
      return;
    }
    if (drainTimeoutMs <= 0) {
      throw new MaintenanceBusyError(operation, "active async transaction");
    }
    const deadline = Date.now() + drainTimeoutMs;
    while (ownerHolds()) {
      if (Date.now() >= deadline) {
        throw new MaintenanceDrainTimeoutError(operation, drainTimeoutMs);
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 10));
    }
  };

  const runMaintenance = async (
    operation: "backup" | "reset" | "restore",
    options: MaintenanceOptions | undefined,
    work: () => void,
    targetPath?: string,
  ): Promise<MaintenanceResult> => {
    if (!Ref.getUnsafe(openState)) {
      throw closedError(operation);
    }
    const drainTimeoutMs = options?.drainTimeoutMs ?? 0;
    if (!Number.isFinite(drainTimeoutMs) || drainTimeoutMs < 0) {
      throw new MaintenanceBudgetError(operation, drainTimeoutMs);
    }
    // Reserve the single maintenance slot SYNCHRONOUSLY, before any await: two concurrent callers
    // cannot both pass the fence.
    if (maintenanceActive) {
      throw new MaintenanceBusyError(operation, "another maintenance operation");
    }
    if (syncOwnerDepth > 0) {
      // A synchronous owner cannot release while this async maintenance runs; refuse typed, never wait.
      throw new MaintenanceBusyError(operation, "sync facade owner");
    }
    maintenanceActive = true;
    const startedAt = Date.now();
    let primary: unknown;
    let verification: unknown;
    let drained = false;
    try {
      await drainMaintenanceOwners(operation, drainTimeoutMs);
      drained = true;
      work();
    } catch (error) {
      primary = error;
    }
    // A refused drain must leave the live owner's connection untouched: no re-apply, no verification
    // (only a drained owner may be written to).
    if (drained) {
      try {
        if (options?.reapplyPragmas !== false) {
          reapplyPragmas(storePragmas, options?.reapplyFailurePragma);
          if (primary === undefined) {
            const after = readPragmas();
            const drifted = Object.keys(storePragmas).filter(
              (name) => after[name] !== storePragmas[name],
            );
            if (drifted.length > 0) {
              throw new MaintenancePragmaVerificationError(operation, drifted);
            }
          }
        }
      } catch (error) {
        verification = error;
      }
    }
    maintenanceActive = false;
    if (primary !== undefined) {
      throw primary;
    }
    if (verification !== undefined) {
      throw verification;
    }
    return { durationMs: Date.now() - startedAt, kind: operation, targetPath };
  };

  const maintenance: SqliteMaintenance = {
    backup: (targetPath, options) =>
      runMaintenance(
        "backup",
        options,
        () => {
          database.exec(`VACUUM INTO ${quoteSqlLiteral(targetPath)}`);
        },
        targetPath,
      ),
    pragmas: readPragmas,
    reset: (options) =>
      runMaintenance("reset", options, () => {
        resetConnectionPragmas();
        database.exec("VACUUM");
      }),
    restore: (options) =>
      runMaintenance("restore", options, () => {
        resetConnectionPragmas();
        config.setup?.(database);
        database.exec("VACUUM");
      }),
  };

  return {
    close,
    closeSync,
    exec,
    execSync,
    isOpen,
    maintenance,
    query,
    querySync,
    transaction,
    transactionSync,
  };
};

/** Explicit async Effect caller for opening the service (busy retries use Effect.sleep). */
export const make = (config: SqliteServiceConfig): Effect.Effect<SqliteService, SqliteOpenError> =>
  Effect.map(attemptOpenAsync(config, 0), (database) => buildService(config, database));

/** Compatible synchronous facade for SEA startup/migrations/sync test helpers (same owner). */
export const makeSync = (config: SqliteServiceConfig): SqliteService =>
  buildService(config, openWithRetrySync(config));
