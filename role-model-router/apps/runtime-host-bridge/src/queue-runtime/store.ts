/**
 * Run 101 / R2 (public side) - the durable queue store used by the operator
 * host's workers (replay.dispatch and learner.*).
 *
 * One SQLite database per state root, opened by the vendored Effect SQL store
 * (`PersistedQueue.layerStoreSql`) over the vendored SQLite client, which uses
 * Node 24's built-in `node:sqlite`. The library owns the schema
 * (`effect_queue`); this module owns *where* the file lives and *how* the locks
 * behave, so the operator host and the Track B sidecar claim rows from the same
 * queue instead of building private ones.
 *
 * Design of record: `docs/architecture/15-effect-mq-queue-rebuild.md` §3.2
 * (per-queue parameters), §3.4 (two hosts, one store) and §5.4 (contention).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

import { SqliteClient } from "@effect/sql-sqlite-node";
import { Duration, Layer } from "effect";
import { PersistedQueue } from "effect/unstable/persistence";

/** State-root-relative location of the queue database. */
export const QUEUE_STORE_RELATIVE_PATH = "track-b/queues/queues.sqlite";

/** Library-owned table name for the `effect_queue` rows. */
export const QUEUE_STORE_TABLE = "effect_queue";

/**
 * Store-level defaults, matching the private-side module and the design's §3.2
 * table: a 1 s poll, a 30 s lock refresh and a 15-minute lock expiration - the
 * last deliberately equal to `STRANDED_EVALUATION_JOB_GRACE_MS`, so a dead
 * worker's job becomes claimable inside the grace the evaluation plane already
 * promises. `busyTimeoutMs` is what keeps two hosts writing to one file from
 * surfacing `SQLITE_BUSY` as a failure.
 */
export const QUEUE_STORE_PARAMETERS = Object.freeze({
  tableName: QUEUE_STORE_TABLE,
  pollIntervalMs: 1_000,
  lockRefreshIntervalMs: 30_000,
  lockExpirationMs: 15 * 60_000,
  busyTimeoutMs: 5_000,
});

export interface QueueStorePathOptions {
  readonly stateRoot: string;
  readonly relativePath?: string;
}

/**
 * Resolves the queue database for a state root. The value is derived, never
 * configured per call site, so neither host can drift onto a different file.
 */
export function resolveQueueStorePath({
  stateRoot,
  relativePath = QUEUE_STORE_RELATIVE_PATH,
}: QueueStorePathOptions): string {
  if (!stateRoot || typeof stateRoot !== "string") {
    throw new Error("queue store requires a state root");
  }
  if (!relativePath || relativePath.includes("..")) {
    throw new Error("queue store relative path must stay inside the state root");
  }
  return path.join(stateRoot, ...relativePath.split("/"));
}

export interface QueueStoreLayerOptions {
  readonly filePath: string;
  readonly tableName?: string;
  readonly pollIntervalMs?: number;
  readonly lockRefreshIntervalMs?: number;
  readonly lockExpirationMs?: number;
  readonly busyTimeoutMs?: number;
  readonly disableWAL?: boolean;
}

/**
 * Builds the layer the workers run against: the vendored SQLite client (WAL by
 * default, `busyTimeout` for contention) plus the vendored persisted queue
 * store (schema, locks, retries), exposed as the queue *factory* that
 * `PersistedQueue.make` resolves.
 */
export function makeQueueStoreLayer({
  filePath,
  tableName = QUEUE_STORE_PARAMETERS.tableName,
  pollIntervalMs = QUEUE_STORE_PARAMETERS.pollIntervalMs,
  lockRefreshIntervalMs = QUEUE_STORE_PARAMETERS.lockRefreshIntervalMs,
  lockExpirationMs = QUEUE_STORE_PARAMETERS.lockExpirationMs,
  busyTimeoutMs = QUEUE_STORE_PARAMETERS.busyTimeoutMs,
  disableWAL = false,
}: QueueStoreLayerOptions) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("queue store layer requires a file path");
  }
  // SQLite creates the database but not its directory, and a state root may be
  // fresh; the store owns its own location so every host finds the same file.
  mkdirSync(path.dirname(filePath), { recursive: true });

  const client = SqliteClient.layer({
    filename: filePath,
    busyTimeout: Duration.millis(busyTimeoutMs),
    disableWAL,
  });
  const store = PersistedQueue.layerStoreSql({
    tableName,
    pollInterval: Duration.millis(pollIntervalMs),
    lockRefreshInterval: Duration.millis(lockRefreshIntervalMs),
    lockExpiration: Duration.millis(lockExpirationMs),
  });
  return PersistedQueue.layer.pipe(Layer.provide(store), Layer.provide(client));
}

/**
 * Builds the store layer for one queue from its *resolved policy*, so the lock
 * values the workers honour come from the operator's document rather than from
 * this module's constants. Only the poll interval stays store-level: it is how
 * often a host looks for claimable work, not a per-queue contract.
 */
export function storeLayerForQueuePolicy({
  stateRoot,
  policy,
  filePath,
}: {
  readonly stateRoot: string;
  readonly policy: { readonly lockRefreshMs: number; readonly lockExpirationMs: number };
  readonly filePath?: string;
}) {
  return makeQueueStoreLayer({
    filePath: filePath ?? resolveQueueStorePath({ stateRoot }),
    lockRefreshIntervalMs: policy.lockRefreshMs,
    lockExpirationMs: policy.lockExpirationMs,
  });
}
