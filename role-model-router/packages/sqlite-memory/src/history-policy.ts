import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export const PERFORMANCE_HISTORY_POLICY_VERSION =
  "role-model.performance-history-policy.v1" as const;
export const PERFORMANCE_HISTORY_POLICY_MAX_ARCHIVES = 8;
export const PERFORMANCE_HISTORY_POLICY_MAX_ARCHIVE_BYTES = 8 * 1024 * 1024;
export const PERFORMANCE_HISTORY_POLICY_MAX_ARCHIVE_ROWS = 100_000;

export interface PerformanceHistoryPolicy {
  readonly schemaVersion: typeof PERFORMANCE_HISTORY_POLICY_VERSION;
  readonly maxSamplesPerEndpoint: number;
  readonly maxAgeMs: number;
  readonly maxBytesPerEndpoint: number;
  readonly maxRebuildSamples: number;
}

export const DEFAULT_PERFORMANCE_HISTORY_POLICY: PerformanceHistoryPolicy = Object.freeze({
  schemaVersion: PERFORMANCE_HISTORY_POLICY_VERSION,
  maxSamplesPerEndpoint: 512,
  maxAgeMs: 365 * 24 * 60 * 60 * 1_000,
  maxBytesPerEndpoint: 8 * 1024 * 1024,
  maxRebuildSamples: 512,
});

export interface PerformanceHistoryPolicyReceipt {
  readonly receiptId: string;
  readonly previousPolicy: PerformanceHistoryPolicy;
  readonly appliedPolicy: PerformanceHistoryPolicy;
}

export function validatePerformanceHistoryPolicy(value: unknown): PerformanceHistoryPolicy {
  if (!value || typeof value !== "object")
    throw new Error("performance history policy is required");
  const policy = value as Record<string, unknown>;
  if (policy.schemaVersion !== PERFORMANCE_HISTORY_POLICY_VERSION) {
    throw new Error("unsupported performance history policy schema version");
  }
  const boundedInteger = (name: string, minimum: number, maximum: number) => {
    const candidate = policy[name];
    if (
      !Number.isSafeInteger(candidate) ||
      Number(candidate) < minimum ||
      Number(candidate) > maximum
    ) {
      throw new Error(`${name} is outside the supported bounded range`);
    }
    return Number(candidate);
  };
  const normalized = {
    schemaVersion: PERFORMANCE_HISTORY_POLICY_VERSION,
    maxSamplesPerEndpoint: boundedInteger("maxSamplesPerEndpoint", 1, 100_000),
    maxAgeMs: boundedInteger("maxAgeMs", 1, 10 * 365 * 24 * 60 * 60 * 1_000),
    maxBytesPerEndpoint: boundedInteger("maxBytesPerEndpoint", 1_024, 1024 * 1024 * 1024),
    maxRebuildSamples: boundedInteger("maxRebuildSamples", 1, 100_000),
  } satisfies PerformanceHistoryPolicy;
  if (normalized.maxRebuildSamples > normalized.maxSamplesPerEndpoint) {
    throw new Error("maxRebuildSamples cannot exceed maxSamplesPerEndpoint");
  }
  return normalized;
}

export function ensurePerformanceHistorySchema(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS performance_history_policy (
      singleton_id INTEGER PRIMARY KEY CHECK (singleton_id = 1),
      policy_json TEXT NOT NULL,
      updated_at_ms INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS performance_history_rollups (
      endpoint_id TEXT NOT NULL,
      difficulty_bucket TEXT NOT NULL,
      raw_sample_count INTEGER NOT NULL,
      raw_bytes INTEGER NOT NULL,
      last_rebuild_scanned_samples INTEGER NOT NULL,
      newest_timestamp_ms INTEGER,
      updated_at_ms INTEGER NOT NULL,
      PRIMARY KEY (endpoint_id, difficulty_bucket)
    );
    CREATE TABLE IF NOT EXISTS performance_history_policy_archives (
      receipt_id TEXT PRIMARY KEY,
      archive_json TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL
    );
  `);
  database
    .prepare(
      "INSERT OR IGNORE INTO performance_history_policy (singleton_id,policy_json,updated_at_ms) VALUES (1,?,?)",
    )
    .run(JSON.stringify(DEFAULT_PERFORMANCE_HISTORY_POLICY), Date.now());
}

export function readPerformanceHistoryPolicy(database: DatabaseSync): PerformanceHistoryPolicy {
  ensurePerformanceHistorySchema(database);
  const row = database
    .prepare("SELECT policy_json FROM performance_history_policy WHERE singleton_id=1")
    .get() as { policy_json: string };
  return validatePerformanceHistoryPolicy(JSON.parse(row.policy_json));
}

export function writePerformanceHistoryPolicy(
  database: DatabaseSync,
  policy: PerformanceHistoryPolicy,
): PerformanceHistoryPolicyReceipt {
  const normalized = validatePerformanceHistoryPolicy(policy);
  const previousPolicy = readPerformanceHistoryPolicy(database);
  database
    .prepare(
      "UPDATE performance_history_policy SET policy_json=?,updated_at_ms=? WHERE singleton_id=1",
    )
    .run(JSON.stringify(normalized), Date.now());
  return { receiptId: randomUUID(), previousPolicy, appliedPolicy: normalized };
}

export function enforcePerformanceHistoryPolicy(
  database: DatabaseSync,
  input: {
    readonly endpointId: string;
    readonly nowMs: number;
    readonly difficultyBucket?: string;
  },
): {
  readonly sampleJson: readonly string[];
  readonly rawBytes: number;
  readonly prunedCount: number;
} {
  const policy = readPerformanceHistoryPolicy(database);
  const table = input.difficultyBucket
    ? "observed_performance_samples_by_difficulty"
    : "observed_performance_samples";
  const bucketClause = input.difficultyBucket ? " AND difficulty_bucket=?" : "";
  const parameters = input.difficultyBucket
    ? [input.endpointId, input.difficultyBucket]
    : [input.endpointId];
  const rows = database
    .prepare(
      `SELECT sample_id,timestamp_ms,sample_json,length(CAST(sample_json AS BLOB)) AS byte_length
       FROM ${table} WHERE endpoint_id=?${bucketClause}
       ORDER BY timestamp_ms DESC,sample_id DESC`,
    )
    .all(...parameters) as Array<{
    sample_id: string;
    timestamp_ms: number;
    sample_json: string;
    byte_length: number;
  }>;
  const retained: typeof rows = [];
  const pruned: string[] = [];
  let rawBytes = 0;
  for (const row of rows) {
    const eligible =
      row.timestamp_ms >= input.nowMs - policy.maxAgeMs &&
      retained.length < policy.maxSamplesPerEndpoint &&
      retained.length < policy.maxRebuildSamples &&
      rawBytes + row.byte_length <= policy.maxBytesPerEndpoint;
    if (eligible) {
      retained.push(row);
      rawBytes += row.byte_length;
    } else {
      pruned.push(row.sample_id);
    }
  }
  const remove = database.prepare(`DELETE FROM ${table} WHERE sample_id=?`);
  for (const sampleId of pruned) remove.run(sampleId);
  database
    .prepare(
      `INSERT OR REPLACE INTO performance_history_rollups
       (endpoint_id,difficulty_bucket,raw_sample_count,raw_bytes,last_rebuild_scanned_samples,newest_timestamp_ms,updated_at_ms)
       VALUES (?,?,?,?,?,?,?)`,
    )
    .run(
      input.endpointId,
      input.difficultyBucket ?? "",
      retained.length,
      rawBytes,
      retained.length,
      retained[0]?.timestamp_ms ?? null,
      Date.now(),
    );
  return {
    sampleJson: [...retained].reverse().map((row) => row.sample_json),
    rawBytes,
    prunedCount: pruned.length,
  };
}
