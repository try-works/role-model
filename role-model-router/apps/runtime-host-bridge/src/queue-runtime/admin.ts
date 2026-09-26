/**
 * Run 101 / R5 + R9 (Phase 3.5 repair) - what the workers read to honour the queue
 * admin actions.
 *
 * The operator surface (private repository, `shared/queues/queue-admin.mjs`) owns the write
 * path: it flips `queue_control.draining` and it moves a job to the terminal `cancelled`
 * state. The runtime owns the read side, and it has to be boring on purpose - a claim loop
 * that throws because a database is missing, locked or half-created would take the queue
 * down over a control plane it can live without. Every read here therefore answers a
 * conservative default (`false`, `null`) instead of throwing, and opens the store read-only
 * so it can never disturb a worker.
 *
 * Design of record: `docs/architecture/15-effect-mq-queue-rebuild.md` §3.6 (cancellation and
 * the kill switch) and §4.2 (admin actions).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { QUEUE_STORE_RELATIVE_PATH, QUEUE_STORE_TABLE } from "./store.js";

/** The control table the operator surface writes; absent means "not draining". */
export const QUEUE_CONTROL_TABLE = "queue_control";

/** Named so a cancelled interruption is never mistaken for a handler failure. */
export class QueueJobCancelledError extends Error {
  readonly jobId: string;

  constructor(jobId: string) {
    super(`queue job was cancelled by an operator: ${jobId}`);
    this.name = "QueueJobCancelledError";
    this.jobId = jobId;
  }
}

function openReadOnly(stateRoot: string): DatabaseSync | null {
  const filePath = path.join(stateRoot, ...QUEUE_STORE_RELATIVE_PATH.split("/"));
  if (!existsSync(filePath)) return null;
  try {
    return new DatabaseSync(filePath, { readOnly: true });
  } catch {
    return null;
  }
}

/** True when the queue's drain flag is set. An absent store, table or row is `false`. */
export function isQueueDraining({
  stateRoot,
  queue,
  tableName = QUEUE_STORE_TABLE,
}: {
  readonly stateRoot: string;
  readonly queue: string;
  readonly tableName?: string;
}): boolean {
  if (!stateRoot || !queue) return false;
  const database = openReadOnly(stateRoot);
  if (!database) return false;
  try {
    const row = database
      .prepare(`SELECT draining FROM ${QUEUE_CONTROL_TABLE} WHERE queue_name = ?`)
      .get(queue) as { draining?: number } | undefined;
    return Number(row?.draining ?? 0) === 1;
  } catch {
    // No control table yet: the queue has never been drained.
    return false;
  } finally {
    database.close();
  }
}

/**
 * The row state a cancellation watch polls. `null` covers "no store", "no row" and "the
 * table does not exist yet", which are all "nothing has cancelled this job".
 */
export function readQueueJobState({
  stateRoot,
  queue,
  jobId,
  tableName = QUEUE_STORE_TABLE,
}: {
  readonly stateRoot: string;
  readonly queue: string;
  readonly jobId: string;
  readonly tableName?: string;
}): { readonly state: string; readonly acquiredBy: string | null } | null {
  if (!stateRoot || !queue || !jobId) return null;
  const database = openReadOnly(stateRoot);
  if (!database) return null;
  try {
    const row = database
      .prepare(`SELECT state, acquired_by FROM ${tableName} WHERE queue_name = ? AND id = ?`)
      .get(queue, jobId) as { state?: string; acquired_by?: string | null } | undefined;
    if (!row || typeof row.state !== "string") return null;
    return { state: row.state, acquiredBy: row.acquired_by ?? null };
  } catch {
    return null;
  } finally {
    database.close();
  }
}
