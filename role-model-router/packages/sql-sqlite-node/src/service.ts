import { DatabaseSync } from "node:sqlite";

/** The bind shapes node:sqlite accepts; its own SQLInputValue alias is not exported. */
type SqlBindValue = null | number | bigint | string | NodeJS.ArrayBufferView;

import { Duration, Effect, Exit, Ref, Semaphore } from "effect";

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
  /** Compatible synchronous facade (SEA startup, migrations, sync test helpers). */
  readonly querySync: (sql: string, params?: ReadonlyArray<unknown>) => SqliteRows;
  readonly execSync: (sql: string) => void;
  readonly transactionSync: <A>(work: (tx: SqliteTransaction) => A) => A;
  readonly close: () => Effect.Effect<void, SqliteServiceError>;
  readonly closeSync: () => void;
  readonly isOpen: () => boolean;
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
        yield* ensureOpenEffect("transaction");
        const fiberId = yield* Effect.fiberId;
        yield* Effect.sync(() => {
          Effect.runSync(Ref.set(activeTransaction, fiberId));
        });

        return yield* Effect.ensuring(
          Effect.gen(function* () {
            const begin = yield* Effect.exit(
              Effect.try({
                try: () => database.exec("BEGIN IMMEDIATE"),
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
                  try: () => database.exec("COMMIT"),
                  catch: (cause) => new SqliteServiceError("commit", cause),
                }),
              );
              if (Exit.isSuccess(commit)) {
                return workExit.value;
              }
              // A failed commit is the primary error; rollback/close must not replace it.
              rollbackAndMaybeClose();
              return yield* Effect.failCause(commit.cause);
            }

            rollbackAndMaybeClose();
            return yield* Effect.failCause(workExit.cause);
          }),
          Effect.sync(clearTransactionOwner),
        );
      }),
    );

  const querySync = (sql: string, params: ReadonlyArray<unknown> = []): SqliteRows => {
    ensureOpenSync("querySync");
    return readRows(database, sql, params);
  };

  const execSync = (sql: string): void => {
    ensureOpenSync("execSync");
    runExec(database, sql);
  };

  const transactionSync = <A>(work: (tx: SqliteTransaction) => A): A => {
    ensureOpenSync("transactionSync");
    database.exec("BEGIN IMMEDIATE");
    try {
      const result = work(buildTransaction(database));
      database.exec("COMMIT");
      return result;
    } catch (cause) {
      rollbackAndMaybeClose();
      throw cause;
    }
  };

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

  const closeSync = (): void => {
    if (!Ref.getUnsafe(openState)) {
      return;
    }
    markClosed();
    database.close();
  };

  const isOpen = (): boolean => Ref.getUnsafe(openState);

  return {
    close,
    closeSync,
    exec,
    execSync,
    isOpen,
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
