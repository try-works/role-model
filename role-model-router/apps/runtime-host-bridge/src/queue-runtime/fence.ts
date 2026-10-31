import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { Schema } from "effect";

/**
 * Run 115 R30 bounded slice: the durable fence between an attempt's work and the
 * persisted queue's completion ack.
 *
 * `PersistedQueue.take` marks an element completed as soon as the handler fiber
 * succeeds, so "the handler returned" is the ack. Two failures are possible at
 * that boundary and neither is visible to the library:
 *
 * - the handler returned but its evidence was never made durable (ack without
 *   evidence);
 * - an operator killed the job, or the attempt's lease lapsed and another
 *   worker claimed it, and the old handler then returned (late completion).
 *
 * The queue owns its own row and lock token, so this module does not duplicate
 * them. It keeps a small, separate attempt ledger in the same SQLite database:
 * one row per (job, attempt) carrying the lease token and expiry, one row per
 * attempt's evidence, and the kill markers. The worker calls `beginAttempt`
 * before the handler, `recordEvidence` when the work is durable, and
 * `complete` before it lets the queue's ack happen. `complete` is the gate:
 * it only advances an attempt to completed when the same lease is still active,
 * has not expired, and its evidence row is present. A rejected completion leaves
 * the queue's own row untouched, so the store retries instead of acking.
 */
export type AttemptFenceRejection =
  | "evidence_missing"
  | "killed"
  | "lease_expired";

export class AttemptFenceRejectedError extends Error {
  readonly reason: AttemptFenceRejection | "lease_held" | "already_completed";

  constructor(reason: AttemptFenceRejectedError["reason"], message?: string) {
    super(message ?? `attempt fence rejected: ${reason}`);
    this.name = "AttemptFenceRejectedError";
    this.reason = reason;
  }
}

export interface AttemptLease {
  readonly attempt: number;
  /**
   * True when the attempt was already completed with durable evidence and this lease is the
   * idempotent replay of that completion (crash between fence.complete and the queue ack).
   */
  readonly completed: boolean;
  readonly expiresAtMs: number;
  readonly jobId: string;
  readonly leaseId: string;
  readonly owner: string;
}

/** JSON evidence payload: the durable fence stores exactly what its owner can JSON-encode. */
export type FencePayload =
  | null
  | boolean
  | number
  | string
  | readonly FencePayload[]
  | { readonly [key: string]: FencePayload };

export interface AttemptEvidence {
  readonly digest: string;
  readonly leaseId: string;
  readonly payload: FencePayload;
  readonly recordedAtMs: number;
}

export type AttemptState = "active" | "completed" | "expired";

export interface AttemptFenceRecord {
  readonly attempt: number;
  readonly evidenceAtMs: number | null;
  readonly expiresAtMs: number;
  readonly jobId: string;
  readonly leaseId: string;
  readonly owner: string;
  readonly state: AttemptState;
}

export type AttemptCompletion =
  | { readonly accepted: true }
  | { readonly accepted: false; readonly reason: AttemptFenceRejection };

export interface BeginAttemptInput {
  readonly attempt: number;
  readonly jobId: string;
  readonly leaseMs: number;
  readonly owner: string;
}

export interface AttemptFenceStore {
  beginAttempt(input: BeginAttemptInput): AttemptLease;
  close(): void;
  complete(lease: AttemptLease): AttemptCompletion;
  isKilled(jobId: string): boolean;
  kill(jobId?: string): void;
  readAttempt(jobId: string, attempt: number): AttemptFenceRecord | null;
  readEvidence(jobId: string, attempt: number): AttemptEvidence | null;
  recordEvidence(lease: AttemptLease, payload: FencePayload): AttemptEvidence;
}

interface AttemptRow {
  readonly attempt: number;
  readonly evidence_at: number | null;
  readonly expires_at: number;
  readonly job_id: string;
  readonly lease_id: string;
  readonly owner: string;
  readonly state: string;
}

interface EvidenceRow {
  readonly digest: string;
  readonly lease_id: string;
  readonly payload: string;
  readonly recorded_at: number;
}

const GLOBAL_KILL = "*";
type SqliteRow = Readonly<Record<string, FencePayload>>;
const AttemptRowSchema = Schema.Struct({
  attempt: Schema.Number,
  evidence_at: Schema.NullOr(Schema.Number),
  expires_at: Schema.Number,
  job_id: Schema.String,
  lease_id: Schema.String,
  owner: Schema.String,
  state: Schema.String,
});
const decodeAttemptRow = Schema.decodeUnknownSync(AttemptRowSchema);
const EvidenceRowSchema = Schema.Struct({
  digest: Schema.String,
  lease_id: Schema.String,
  payload: Schema.String,
  recorded_at: Schema.Number,
});
const decodeEvidenceRow = Schema.decodeUnknownSync(EvidenceRowSchema);

function fencePayloadSchema(): Schema.Codec<FencePayload> {
  return Schema.Union([
    Schema.Null,
    Schema.Boolean,
    Schema.Number,
    Schema.String,
    Schema.Array(Schema.suspend(fencePayloadSchema)),
    Schema.Record(Schema.String, Schema.suspend(fencePayloadSchema)),
  ]);
}

const decodeFencePayload = Schema.decodeUnknownSync(fencePayloadSchema());

function asAttemptRow(value: SqliteRow | undefined): AttemptRow | null {
  if (value === undefined) return null;
  try {
    return decodeAttemptRow(value);
  } catch {
    return null;
  }
}

function evidenceFromRow(row: SqliteRow): AttemptEvidence | null {
  try {
    const decoded = decodeEvidenceRow(row);
    return {
      digest: decoded.digest,
      leaseId: decoded.lease_id,
      payload: decodeFencePayload(JSON.parse(decoded.payload)),
      recordedAtMs: decoded.recorded_at,
    };
  } catch {
    return null;
  }
}

function digestPayload(payload: FencePayload): string {
  return createHash("sha256").update(JSON.stringify(payload) ?? "null").digest("hex");
}

/**
 * Opens the durable attempt fence. Synchronous SQLite is the same primitive the
 * queue store and the other evidence ledgers use; the Effect callers wrap these
 * methods at their attempt boundary, so the gate itself stays a small atomic
 * transaction rather than an asynchronous side channel.
 */
export function openAttemptFenceStore({
  databasePath,
  now = Date.now,
}: {
  readonly databasePath: string;
  readonly now?: () => number;
}): AttemptFenceStore {
  if (!databasePath) {
    throw new Error("attempt fence requires a database path");
  }
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS queue_attempt_fence (
      job_id TEXT NOT NULL,
      attempt INTEGER NOT NULL,
      lease_id TEXT NOT NULL,
      owner TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      state TEXT NOT NULL,
      evidence_at INTEGER,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (job_id, attempt)
    );
    CREATE TABLE IF NOT EXISTS queue_attempt_evidence (
      job_id TEXT NOT NULL,
      attempt INTEGER NOT NULL,
      lease_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      digest TEXT NOT NULL,
      recorded_at INTEGER NOT NULL,
      PRIMARY KEY (job_id, attempt)
    );
    CREATE TABLE IF NOT EXISTS queue_attempt_kill (
      job_id TEXT NOT NULL PRIMARY KEY,
      killed_at INTEGER NOT NULL
    );
  `);

  const selectAttempt = database.prepare(
    "SELECT job_id, attempt, lease_id, owner, expires_at, state, evidence_at FROM queue_attempt_fence WHERE job_id = ? AND attempt = ?",
  );
  const selectEvidence = database.prepare(
    "SELECT lease_id, payload, digest, recorded_at FROM queue_attempt_evidence WHERE job_id = ? AND attempt = ?",
  );
  const selectKill = database.prepare("SELECT 1 FROM queue_attempt_kill WHERE job_id = ?");
  const upsertAttempt = database.prepare(`
    INSERT INTO queue_attempt_fence (job_id, attempt, lease_id, owner, expires_at, state, evidence_at, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', NULL, ?)
    ON CONFLICT(job_id, attempt) DO UPDATE SET
      lease_id = excluded.lease_id,
      owner = excluded.owner,
      expires_at = excluded.expires_at,
      state = 'active',
      evidence_at = NULL
  `);
  const upsertEvidence = database.prepare(`
    INSERT INTO queue_attempt_evidence (job_id, attempt, lease_id, payload, digest, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(job_id, attempt) DO UPDATE SET
      lease_id = excluded.lease_id,
      payload = excluded.payload,
      digest = excluded.digest,
      recorded_at = excluded.recorded_at
  `);
  const completeAttempt = database.prepare(
    "UPDATE queue_attempt_fence SET state = 'completed', evidence_at = ? WHERE job_id = ? AND attempt = ? AND lease_id = ? AND state = 'active'",
  );
  const expireAttempt = database.prepare(
    "UPDATE queue_attempt_fence SET state = 'expired' WHERE job_id = ? AND attempt = ? AND lease_id = ?",
  );
  const insertKill = database.prepare(
    "INSERT INTO queue_attempt_kill (job_id, killed_at) VALUES (?, ?) ON CONFLICT(job_id) DO UPDATE SET killed_at = excluded.killed_at",
  );

  const killed = (jobId: string): boolean => {
    if (selectKill.get(jobId) !== undefined) return true;
    return selectKill.get(GLOBAL_KILL) !== undefined;
  };

  return {
    beginAttempt(input) {
      const at = now();
      if (killed(input.jobId)) {
        throw new AttemptFenceRejectedError("killed", "attempt fence rejected: job is killed");
      }
      // SAFETY: queue_attempt_fence rows are written only by this module.
      const existing = asAttemptRow(selectAttempt.get(input.jobId, input.attempt) as SqliteRow | undefined);
      if (existing !== null) {
        if (existing.state === "completed") {
          // Crash window: fence.complete() landed but the queue never acked. The retry of the
          // same attempt is an idempotent success only when the durable evidence is still there.
          // SAFETY: queue_attempt_evidence rows are written only by this module.
          const evidenceRaw = selectEvidence.get(input.jobId, input.attempt) as SqliteRow | undefined;
          const evidence = evidenceRaw === undefined ? null : evidenceFromRow(evidenceRaw);
          if (evidence !== null && evidence.leaseId === existing.lease_id) {
            return {
              attempt: existing.attempt,
              completed: true,
              expiresAtMs: existing.expires_at,
              jobId: existing.job_id,
              leaseId: existing.lease_id,
              owner: existing.owner,
            };
          }
          throw new AttemptFenceRejectedError("already_completed", "attempt fence rejected: attempt already completed without durable evidence");
        }
        if (existing.state === "active" && existing.expires_at > at) {
          throw new AttemptFenceRejectedError("lease_held", "attempt fence rejected: attempt lease is held");
        }
        if (existing.state === "active") {
          expireAttempt.run(input.jobId, input.attempt, existing.lease_id);
        }
      }
      const lease: AttemptLease = {
        attempt: input.attempt,
        completed: false,
        expiresAtMs: at + input.leaseMs,
        jobId: input.jobId,
        leaseId: randomUUID(),
        owner: input.owner,
      };
      upsertAttempt.run(input.jobId, input.attempt, lease.leaseId, lease.owner, lease.expiresAtMs, at);
      return lease;
    },

    close() {
      database.close();
    },

    complete(lease) {
      if (killed(lease.jobId)) return { accepted: false, reason: "killed" };
      if (lease.completed) {
        // SAFETY: queue_attempt_evidence rows are written only by this module.
        const evidenceRaw = selectEvidence.get(lease.jobId, lease.attempt) as SqliteRow | undefined;
        const evidence = evidenceRaw === undefined ? null : evidenceFromRow(evidenceRaw);
        return evidence !== null && evidence.leaseId === lease.leaseId
          ? { accepted: true }
          : { accepted: false, reason: "evidence_missing" };
      }
      // SAFETY: queue_attempt_fence rows are written only by this module.
      const row = asAttemptRow(selectAttempt.get(lease.jobId, lease.attempt) as SqliteRow | undefined);
      if (row === null || row.state !== "active" || row.lease_id !== lease.leaseId) {
        return { accepted: false, reason: "lease_expired" };
      }
      if (row.expires_at <= now()) {
        expireAttempt.run(lease.jobId, lease.attempt, lease.leaseId);
        return { accepted: false, reason: "lease_expired" };
      }
      // SAFETY: queue_attempt_evidence rows are written only by this module.
      const evidenceRaw = selectEvidence.get(lease.jobId, lease.attempt) as SqliteRow | undefined;
      const evidence = evidenceRaw === undefined ? null : evidenceFromRow(evidenceRaw);
      if (evidence === null || evidence.leaseId !== lease.leaseId) {
        return { accepted: false, reason: "evidence_missing" };
      }
      const completedAt = now();
      const updated = completeAttempt.run(completedAt, lease.jobId, lease.attempt, lease.leaseId);
      return Number(updated.changes) > 0 ? { accepted: true } : { accepted: false, reason: "lease_expired" };
    },

    isKilled(jobId) {
      return killed(jobId);
    },

    kill(jobId) {
      insertKill.run(jobId ?? GLOBAL_KILL, now());
    },

    readAttempt(jobId, attempt) {
      // SAFETY: queue_attempt_fence rows are written only by this module.
      const row = asAttemptRow(selectAttempt.get(jobId, attempt) as SqliteRow | undefined);
      if (row === null) return null;
      return {
        attempt: row.attempt,
        evidenceAtMs: row.evidence_at,
        expiresAtMs: row.expires_at,
        jobId: row.job_id,
        leaseId: row.lease_id,
        owner: row.owner,
        state: row.state === "completed" || row.state === "expired" ? row.state : "active",
      };
    },

    readEvidence(jobId, attempt) {
      // SAFETY: queue_attempt_evidence rows are written only by this module.
      const row = selectEvidence.get(jobId, attempt) as SqliteRow | undefined;
      return row === undefined ? null : evidenceFromRow(row);
    },

    recordEvidence(lease, payload) {
      if (killed(lease.jobId)) {
        throw new AttemptFenceRejectedError("killed", "attempt fence rejected: job is killed");
      }
      // SAFETY: queue_attempt_fence rows are written only by this module.
      const row = asAttemptRow(selectAttempt.get(lease.jobId, lease.attempt) as SqliteRow | undefined);
      if (row === null || row.state !== "active" || row.lease_id !== lease.leaseId) {
        throw new AttemptFenceRejectedError("lease_expired", "attempt fence rejected: attempt lease expired or was replaced");
      }
      if (row.expires_at <= now()) {
        expireAttempt.run(lease.jobId, lease.attempt, lease.leaseId);
        throw new AttemptFenceRejectedError("lease_expired", "attempt fence rejected: attempt lease expired");
      }
      const at = now();
      const digest = digestPayload(payload);
      upsertEvidence.run(lease.jobId, lease.attempt, lease.leaseId, JSON.stringify(payload), digest, at);
      return { digest, leaseId: lease.leaseId, payload, recordedAtMs: at };
    },
  };
}
