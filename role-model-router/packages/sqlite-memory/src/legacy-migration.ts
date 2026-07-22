import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export const LEGACY_INLINE_CAP_BYTES = 16 * 1024;

export type LegacyMigrationState =
  | "legacy_primary"
  | "backfill"
  | "shadow_mirror"
  | "parity_verified"
  | "graph_primary"
  | "legacy_read_hold"
  | "legacy_retired"
  | "rolled_back"
  | "failed";

export interface LegacyArtifactWriteInput {
  readonly scopeId: string;
  readonly sourceId: string;
  readonly content: string;
  readonly contentHash: string;
}

export interface LegacyArtifactWriteResult {
  readonly artifactId: string;
  readonly artifactPath: string;
  readonly contentHash: string;
}

export interface LegacyMigrationJournal {
  readonly migrationId: string;
  readonly state: LegacyMigrationState;
  readonly sourceCount: number;
  readonly sourceHash: string;
  readonly targetCount: number;
  readonly targetHash: string;
  readonly cursor: string | null;
  readonly attempt: number;
  readonly backupPath: string | null;
  readonly holdUntilMs: number | null;
  readonly secondParityVerified: boolean;
}

export interface LegacyStorageAudit {
  readonly state: LegacyMigrationState;
  readonly sourceRowCount: number;
  readonly sourceHash: string;
  readonly externalizationCandidateCount: number;
  readonly inlineCapBytes: number;
}

export interface GraphArtifactReference {
  readonly scopeId: string;
  readonly artifactId: string;
  readonly contentHash: string;
}

const MIGRATION_ID = "tb04-legacy-graph-performance-v1";

export interface SqliteMigrationRegistryEntry {
  readonly migrationId: string;
  readonly sqlFile: string;
  readonly owner: string;
  readonly sha256: string;
  readonly transactionMode: "transaction" | "idempotent_guarded";
  readonly idempotencyStrategy: string;
  readonly rollbackClass: "reversible" | "forward_repair_only";
  readonly postconditionQuery: string;
}

export interface SqliteMigrationRegistry {
  readonly schemaVersion: "role-model.sqlite-migration-registry.v1";
  readonly entries: readonly SqliteMigrationRegistryEntry[];
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function loadMigrationRegistry(input: { readonly routerRoot: string }): SqliteMigrationRegistry {
  const migrationsRoot = path.resolve(input.routerRoot, "migrations");
  const registryPath = path.join(migrationsRoot, "registry.json");
  const parsed = JSON.parse(readFileSync(registryPath, "utf8")) as SqliteMigrationRegistry;
  if (parsed.schemaVersion !== "role-model.sqlite-migration-registry.v1" || !Array.isArray(parsed.entries)) {
    throw new Error("invalid SQLite migration registry");
  }
  const ids = new Set<string>();
  for (const entry of parsed.entries) {
    if (ids.has(entry.migrationId)) throw new Error(`duplicate migration ID: ${entry.migrationId}`);
    ids.add(entry.migrationId);
    if (!/^[A-Za-z0-9_.-]+\.sql$/.test(entry.sqlFile)) throw new Error("invalid migration SQL path");
    const sqlPath = path.resolve(migrationsRoot, entry.sqlFile);
    if (path.dirname(sqlPath) !== migrationsRoot) throw new Error("migration SQL escapes registry root");
    const sql = readFileSync(sqlPath, "utf8");
    if (sha256(sql) !== entry.sha256) throw new Error(`migration checksum mismatch: ${entry.migrationId}`);
    if (!entry.postconditionQuery.trim()) throw new Error("migration postcondition is required");
  }
  return parsed;
}

function open(databasePath: string, readOnly = false): DatabaseSync {
  return new DatabaseSync(databasePath, readOnly ? { readOnly: true } : {});
}

function tableExists(database: DatabaseSync, table: string): boolean {
  return Boolean(
    database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .get(table),
  );
}

function sourceRows(database: DatabaseSync): Array<{ request_id: string; observation_json: string }> {
  if (!tableExists(database, "runtime_observations")) return [];
  return database
    .prepare(
      "SELECT request_id, observation_json FROM runtime_observations ORDER BY request_id ASC",
    )
    .all() as Array<{ request_id: string; observation_json: string }>;
}

function aggregateSourceHash(rows: readonly { request_id: string; observation_json: string }[]): string {
  return sha256(rows.map((row) => `${row.request_id}\0${sha256(row.observation_json)}`).join("\n"));
}

function currentState(database: DatabaseSync): LegacyMigrationState {
  if (!tableExists(database, "legacy_migration_journal")) return "legacy_primary";
  const row = database
    .prepare("SELECT state FROM legacy_migration_journal WHERE migration_id = ?")
    .get(MIGRATION_ID) as { state?: LegacyMigrationState } | undefined;
  return row?.state ?? "legacy_primary";
}

function targetProof(database: DatabaseSync): { count: number; hash: string } {
  if (!tableExists(database, "legacy_graph_migration_refs")) return { count: 0, hash: sha256("") };
  const rows = database
    .prepare(
      "SELECT source_id, source_hash FROM legacy_graph_migration_refs ORDER BY source_id ASC",
    )
    .all() as Array<{ source_id: string; source_hash: string }>;
  return {
    count: rows.length,
    hash: sha256(rows.map((row) => `${row.source_id}\0${row.source_hash}`).join("\n")),
  };
}

export function readLegacyMigrationJournal(databasePath: string): LegacyMigrationJournal {
  const database = open(databasePath, true);
  try {
    if (!tableExists(database, "legacy_migration_journal")) {
      return {
        migrationId: MIGRATION_ID,
        state: "legacy_primary",
        sourceCount: 0,
        sourceHash: "",
        targetCount: 0,
        targetHash: "",
        cursor: null,
        attempt: 0,
        backupPath: null,
        holdUntilMs: null,
        secondParityVerified: false,
      };
    }
    const row = database
      .prepare("SELECT * FROM legacy_migration_journal WHERE migration_id = ?")
      .get(MIGRATION_ID) as Record<string, string | number | null> | undefined;
    if (!row) throw new Error("legacy migration journal row is missing");
    return {
      migrationId: String(row.migration_id),
      state: String(row.state) as LegacyMigrationState,
      sourceCount: Number(row.source_count),
      sourceHash: String(row.source_hash),
      targetCount: Number(row.target_count),
      targetHash: String(row.target_hash),
      cursor: row.cursor === null ? null : String(row.cursor),
      attempt: Number(row.attempt),
      backupPath: row.backup_path === null ? null : String(row.backup_path),
      holdUntilMs: row.hold_until_ms === null ? null : Number(row.hold_until_ms),
      secondParityVerified: Number(row.second_parity_verified) === 1,
    };
  } finally {
    database.close();
  }
}

export function resolveRuntimeObservationStoragePayload(input: {
  readonly databasePath: string;
  readonly observation: Readonly<Record<string, unknown>>;
  readonly artifactRef?: GraphArtifactReference;
}): string {
  const database = open(input.databasePath, true);
  let state: LegacyMigrationState;
  try {
    state = currentState(database);
  } finally {
    database.close();
  }
  if (state === "graph_primary" || state === "legacy_read_hold" || state === "legacy_retired") {
    if (!input.artifactRef) throw new Error("graph artifact reference required after cutover");
    const requestId = input.observation.requestId;
    if (typeof requestId !== "string" || requestId.length === 0) {
      throw new Error("runtime observation request ID required");
    }
    return JSON.stringify({ requestId, artifactRef: input.artifactRef, graphPrimary: true });
  }
  return JSON.stringify(input.observation);
}

export class LegacySqliteMigration {
  readonly #databasePath: string;
  readonly #backupPath: string;
  readonly #artifactWriter: (input: LegacyArtifactWriteInput) => LegacyArtifactWriteResult;
  readonly #artifactRollback?: (input: LegacyArtifactWriteResult) => void;
  readonly #now: () => number;
  readonly #routerRoot: string;

  constructor(input: {
    readonly databasePath: string;
    readonly backupPath: string;
    readonly artifactWriter: (input: LegacyArtifactWriteInput) => LegacyArtifactWriteResult;
    readonly artifactRollback?: (input: LegacyArtifactWriteResult) => void;
    readonly now?: () => number;
    readonly routerRoot?: string;
  }) {
    this.#databasePath = input.databasePath;
    this.#backupPath = input.backupPath;
    this.#artifactWriter = input.artifactWriter;
    this.#artifactRollback = input.artifactRollback;
    this.#now = input.now ?? Date.now;
    this.#routerRoot = input.routerRoot ?? path.resolve(import.meta.dirname, "../../..");
  }

  audit(): LegacyStorageAudit {
    const database = open(this.#databasePath, true);
    try {
      const rows = sourceRows(database);
      return {
        state: currentState(database),
        sourceRowCount: rows.length,
        sourceHash: aggregateSourceHash(rows),
        externalizationCandidateCount: rows.filter(
          (row) => Buffer.byteLength(row.observation_json, "utf8") > LEGACY_INLINE_CAP_BYTES,
        ).length,
        inlineCapBytes: LEGACY_INLINE_CAP_BYTES,
      };
    } finally {
      database.close();
    }
  }

  #ensureBackup(): void {
    if (existsSync(this.#backupPath)) return;
    mkdirSync(path.dirname(this.#backupPath), { recursive: true });
    const database = open(this.#databasePath);
    try {
      database.exec(`VACUUM INTO '${this.#backupPath.replaceAll("'", "''")}'`);
    } finally {
      database.close();
    }
  }

  #setState(
    database: DatabaseSync,
    state: LegacyMigrationState,
    options: { readonly incrementAttempt?: boolean; readonly holdUntilMs?: number } = {},
  ): void {
    if (options.holdUntilMs !== undefined) {
      database
        .prepare(
          "UPDATE legacy_migration_journal SET state = ?, updated_at_ms = ?, hold_until_ms = ? WHERE migration_id = ?",
        )
        .run(state, this.#now(), options.holdUntilMs, MIGRATION_ID);
      return;
    }
    database
      .prepare(
        `UPDATE legacy_migration_journal SET state = ?, updated_at_ms = ?${options.incrementAttempt ? ", attempt = attempt + 1" : ""} WHERE migration_id = ?`,
      )
      .run(state, this.#now(), MIGRATION_ID);
  }

  backfill(input: { readonly scopeId: string; readonly batchSize: number }): {
    readonly migratedCount: number;
    readonly pendingCount: number;
  } {
    if (!input.scopeId || !Number.isInteger(input.batchSize) || input.batchSize < 1) {
      throw new Error("bounded scoped backfill input required");
    }
    this.#ensureBackup();
    const database = open(this.#databasePath);
    try {
      const registry = loadMigrationRegistry({ routerRoot: this.#routerRoot });
      const entry = registry.entries.find((candidate) => candidate.migrationId === MIGRATION_ID);
      if (!entry) throw new Error(`migration is not registered: ${MIGRATION_ID}`);
      const migrationSql = readFileSync(path.join(this.#routerRoot, "migrations", entry.sqlFile), "utf8");
      database.exec(migrationSql);
      const postcondition = database.prepare(entry.postconditionQuery).get() as { valid?: number } | undefined;
      if (postcondition?.valid !== 1) throw new Error("migration registry postcondition failed");
      const auditRows = sourceRows(database);
      database
        .prepare(
          `INSERT OR IGNORE INTO legacy_migration_journal
           (migration_id, state, source_count, source_hash, backup_path, updated_at_ms)
           VALUES (?, 'legacy_primary', ?, ?, ?, ?)`,
        )
        .run(MIGRATION_ID, auditRows.length, aggregateSourceHash(auditRows), this.#backupPath, this.#now());
      const state = currentState(database);
      if (state !== "legacy_primary" && state !== "backfill") {
        throw new Error(`backfill is not valid from ${state}`);
      }
      this.#setState(database, "backfill", { incrementAttempt: true });
      const rows = database
        .prepare(
          `SELECT request_id, observation_json FROM runtime_observations
           WHERE request_id NOT IN (SELECT source_id FROM legacy_graph_migration_refs)
           ORDER BY request_id ASC LIMIT ?`,
        )
        .all(input.batchSize) as Array<{ request_id: string; observation_json: string }>;
      let migratedCount = 0;
      for (const row of rows) {
        const contentHash = sha256(row.observation_json);
        const artifact = this.#artifactWriter({
          scopeId: input.scopeId,
          sourceId: row.request_id,
          content: row.observation_json,
          contentHash,
        });
        if (artifact.contentHash !== contentHash) throw new Error("artifact content hash mismatch");
        database
          .prepare(
            `INSERT INTO legacy_graph_migration_refs
             (source_table, source_id, source_hash, scope_id, artifact_id, artifact_path,
              artifact_content_hash, migrated_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            "runtime_observations",
            row.request_id,
            contentHash,
            input.scopeId,
            artifact.artifactId,
            artifact.artifactPath,
            artifact.contentHash,
            this.#now(),
          );
        migratedCount += 1;
      }
      if (tableExists(database, "observed_performance_samples")) {
        const samples = database
          .prepare("SELECT sample_id, endpoint_id, request_id, routing_decision_id, source_type, timestamp_ms, sample_json FROM observed_performance_samples")
          .all() as Array<Record<string, string | number | null>>;
        const insert = database.prepare(
          `INSERT OR IGNORE INTO normalized_performance_samples_v2
           (sample_id, endpoint_id, model_id, request_id, routing_decision_id, source_type,
            timestamp_ms, latency_ms, success, source_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        for (const sample of samples) {
          const parsed = JSON.parse(String(sample.sample_json)) as Record<string, unknown>;
          insert.run(
            sample.sample_id,
            sample.endpoint_id,
            typeof parsed.model_id === "string" ? parsed.model_id : null,
            sample.request_id,
            sample.routing_decision_id,
            sample.source_type,
            sample.timestamp_ms,
            typeof parsed.latency_ms === "number" ? parsed.latency_ms : null,
            typeof parsed.success === "boolean" ? Number(parsed.success) : null,
            sha256(String(sample.sample_json)),
          );
        }
      }
      const proof = targetProof(database);
      const pending = Number(
        (database.prepare("SELECT COUNT(*) AS count FROM runtime_observations WHERE request_id NOT IN (SELECT source_id FROM legacy_graph_migration_refs)").get() as { count: number }).count,
      );
      database
        .prepare(
          `UPDATE legacy_migration_journal SET target_count = ?, target_hash = ?, cursor = ?, updated_at_ms = ?
           WHERE migration_id = ?`,
        )
        .run(proof.count, proof.hash, rows.at(-1)?.request_id ?? null, this.#now(), MIGRATION_ID);
      return { migratedCount, pendingCount: pending };
    } finally {
      database.close();
    }
  }

  enterShadowMirror(input: { readonly deadlineMs: number }): void {
    if (input.deadlineMs <= this.#now()) throw new Error("bounded shadow mirror deadline required");
    const database = open(this.#databasePath);
    try {
      if (currentState(database) !== "backfill") throw new Error("backfill required before shadow mirror");
      const pending = (database.prepare("SELECT COUNT(*) AS count FROM runtime_observations WHERE request_id NOT IN (SELECT source_id FROM legacy_graph_migration_refs)").get() as { count: number }).count;
      if (pending !== 0) throw new Error("backfill remains incomplete");
      this.#setState(database, "shadow_mirror");
    } finally {
      database.close();
    }
  }

  verifyParity(evidence: {
    readonly backupVerified: boolean;
    readonly restoreVerified: boolean;
    readonly consumersVerified: boolean;
  }): { readonly sourceCount: number; readonly targetCount: number; readonly hash: string } {
    if (!evidence.backupVerified || !evidence.restoreVerified || !evidence.consumersVerified) {
      throw new Error("backup, restore, and consumer proof required");
    }
    const database = open(this.#databasePath);
    try {
      if (currentState(database) !== "shadow_mirror") throw new Error("shadow mirror required before parity");
      const rows = sourceRows(database);
      const sourceHash = aggregateSourceHash(rows);
      const target = targetProof(database);
      if (rows.length !== target.count || sourceHash !== target.hash) throw new Error("first parity mismatch");
      this.#setState(database, "parity_verified");
      return { sourceCount: rows.length, targetCount: target.count, hash: sourceHash };
    } finally {
      database.close();
    }
  }

  cutover(): void {
    const database = open(this.#databasePath);
    try {
      if (currentState(database) !== "parity_verified") throw new Error("first parity required before cutover");
      this.#setState(database, "graph_primary");
    } finally {
      database.close();
    }
  }

  enterLegacyReadHold(input: { readonly holdUntilMs: number }): void {
    const database = open(this.#databasePath);
    try {
      if (currentState(database) !== "graph_primary") throw new Error("graph cutover required before source hold");
      this.#setState(database, "legacy_read_hold", { holdUntilMs: input.holdUntilMs });
    } finally {
      database.close();
    }
  }

  verifySecondParity(evidence: { readonly consumersVerified: boolean }): void {
    if (!evidence.consumersVerified) throw new Error("second parity consumer proof required");
    const database = open(this.#databasePath);
    try {
      if (currentState(database) !== "legacy_read_hold") throw new Error("legacy read hold required");
      const rows = sourceRows(database);
      const target = targetProof(database);
      if (rows.length !== target.count || aggregateSourceHash(rows) !== target.hash) {
        throw new Error("second parity mismatch");
      }
      database
        .prepare("UPDATE legacy_migration_journal SET second_parity_verified = 1, updated_at_ms = ? WHERE migration_id = ?")
        .run(this.#now(), MIGRATION_ID);
    } finally {
      database.close();
    }
  }

  retire(input: { readonly nowMs: number }): void {
    const journal = readLegacyMigrationJournal(this.#databasePath);
    if (journal.state !== "legacy_read_hold") throw new Error("legacy read hold required");
    if (!journal.secondParityVerified) throw new Error("second parity required before retirement");
    if (journal.holdUntilMs === null || input.nowMs < journal.holdUntilMs) return;
    const database = open(this.#databasePath);
    try {
      database.exec("BEGIN IMMEDIATE");
      database.exec(`
        UPDATE runtime_observations
        SET observation_json = json_object(
          'requestId', request_id,
          'artifactRef', (SELECT artifact_id FROM legacy_graph_migration_refs WHERE source_id = request_id),
          'migrated', json('true')
        )
        WHERE request_id IN (SELECT source_id FROM legacy_graph_migration_refs);
        DELETE FROM observed_profile_snapshots;
        DELETE FROM observed_profile_snapshots_by_difficulty;
      `);
      this.#setState(database, "legacy_retired");
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    } finally {
      database.close();
    }
  }

  rollback(): void {
    if (!existsSync(this.#backupPath)) throw new Error("verified backup is required for rollback");
    const database = open(this.#databasePath, true);
    let artifacts: LegacyArtifactWriteResult[] = [];
    try {
      if (tableExists(database, "legacy_graph_migration_refs")) {
        artifacts = database
          .prepare("SELECT artifact_id, artifact_path, artifact_content_hash FROM legacy_graph_migration_refs")
          .all()
          .map((row) => {
            const value = row as Record<string, string>;
            return {
              artifactId: value.artifact_id,
              artifactPath: value.artifact_path,
              contentHash: value.artifact_content_hash,
            };
          });
      }
    } finally {
      database.close();
    }
    rmSync(`${this.#databasePath}-wal`, { force: true });
    rmSync(`${this.#databasePath}-shm`, { force: true });
    copyFileSync(this.#backupPath, this.#databasePath);
    for (const artifact of artifacts) this.#artifactRollback?.(artifact);
  }
}
