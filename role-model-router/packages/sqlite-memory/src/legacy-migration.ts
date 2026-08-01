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
  readonly artifactPath?: string;
}

export interface RuntimeObservationGraphStore {
  readonly scopeId: string;
  write(input: LegacyArtifactWriteInput): LegacyArtifactWriteResult;
  read(reference: GraphArtifactReference): string;
  remove?(artifact: LegacyArtifactWriteResult): void;
}

function isGraphObservationPointer(value: unknown): value is {
  readonly requestId: string;
  readonly artifactRef: GraphArtifactReference | string;
  readonly graphPrimary?: boolean;
  readonly migrated?: boolean;
} {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.requestId === "string" &&
    (typeof candidate.artifactRef === "string" ||
      (Boolean(candidate.artifactRef) && typeof candidate.artifactRef === "object")) &&
    (candidate.graphPrimary === true || candidate.migrated === true)
  );
}

function stateRequiresGraphWrite(state: LegacyMigrationState): boolean {
  return (
    state === "shadow_mirror" ||
    state === "parity_verified" ||
    state === "graph_primary" ||
    state === "legacy_read_hold" ||
    state === "legacy_retired"
  );
}

/** Records a live production write in the migration target while shadow mirroring is active. */
export function mirrorShadowRuntimeObservation(
  database: DatabaseSync,
  input: {
    readonly observation: Readonly<Record<string, unknown>>;
    readonly artifactRef?: GraphArtifactReference;
  },
): boolean {
  if (currentState(database) !== "shadow_mirror") return false;
  return recordRuntimeObservationGraphReference(database, input);
}

/** Records the authoritative graph reference for live writes throughout cutover and read hold. */
export function recordRuntimeObservationGraphReference(
  database: DatabaseSync,
  input: {
    readonly observation: Readonly<Record<string, unknown>>;
    readonly artifactRef?: GraphArtifactReference;
  },
): boolean {
  if (!stateRequiresGraphWrite(currentState(database))) return false;
  const requestId = input.observation.requestId;
  if (typeof requestId !== "string" || requestId.length === 0 || !input.artifactRef) {
    throw new Error("graph storage requires an artifact reference for every live observation");
  }
  const source = JSON.stringify(input.observation);
  const sourceHash = sha256(source);
  const existing = database
    .prepare(
      "SELECT source_hash,artifact_id,artifact_content_hash FROM legacy_graph_migration_refs WHERE source_table=? AND source_id=?",
    )
    .get("runtime_observations", requestId) as
    | { source_hash: string; artifact_id: string; artifact_content_hash: string }
    | undefined;
  if (existing) {
    if (
      existing.source_hash !== sourceHash ||
      existing.artifact_id !== input.artifactRef.artifactId ||
      existing.artifact_content_hash !== input.artifactRef.contentHash
    )
      throw new Error("shadow mirror reference conflicts with an existing live observation");
    return true;
  }
  database
    .prepare(`INSERT INTO legacy_graph_migration_refs
    (source_table,source_id,source_hash,scope_id,artifact_id,artifact_path,artifact_content_hash,migrated_at_ms)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(
      "runtime_observations",
      requestId,
      sourceHash,
      input.artifactRef.scopeId,
      input.artifactRef.artifactId,
      input.artifactRef.artifactPath ?? `artifact://${input.artifactRef.artifactId}`,
      input.artifactRef.contentHash,
      Date.now(),
    );
  database
    .prepare("UPDATE legacy_migration_journal SET cursor=?,updated_at_ms=? WHERE migration_id=?")
    .run(requestId, Date.now(), MIGRATION_ID);
  return true;
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

export function loadMigrationRegistry(input: {
  readonly routerRoot: string;
}): SqliteMigrationRegistry {
  const migrationsRoot = path.resolve(input.routerRoot, "migrations");
  const registryPath = path.join(migrationsRoot, "registry.json");
  const parsed = JSON.parse(readFileSync(registryPath, "utf8")) as SqliteMigrationRegistry;
  if (
    parsed.schemaVersion !== "role-model.sqlite-migration-registry.v1" ||
    !Array.isArray(parsed.entries)
  ) {
    throw new Error("invalid SQLite migration registry");
  }
  const ids = new Set<string>();
  for (const entry of parsed.entries) {
    if (ids.has(entry.migrationId)) throw new Error(`duplicate migration ID: ${entry.migrationId}`);
    ids.add(entry.migrationId);
    if (!/^[A-Za-z0-9_.-]+\.sql$/.test(entry.sqlFile))
      throw new Error("invalid migration SQL path");
    const sqlPath = path.resolve(migrationsRoot, entry.sqlFile);
    if (path.dirname(sqlPath) !== migrationsRoot)
      throw new Error("migration SQL escapes registry root");
    const sql = readFileSync(sqlPath, "utf8");
    if (sha256(sql) !== entry.sha256)
      throw new Error(`migration checksum mismatch: ${entry.migrationId}`);
    if (!entry.postconditionQuery.trim()) throw new Error("migration postcondition is required");
  }
  return parsed;
}

function open(databasePath: string, readOnly = false): DatabaseSync {
  return new DatabaseSync(databasePath, readOnly ? { readOnly: true } : {});
}

function tableExists(database: DatabaseSync, table: string): boolean {
  return Boolean(
    database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table),
  );
}

function sourceProof(database: DatabaseSync, pageSize = 1_000): { count: number; hash: string } {
  if (!tableExists(database, "runtime_observations")) return { count: 0, hash: sha256("") };
  const digest = createHash("sha256");
  let cursor = "";
  let count = 0;
  const page = database.prepare(
    tableExists(database, "legacy_graph_migration_refs")
      ? `SELECT observations.request_id, observations.observation_json, refs.source_hash
         FROM runtime_observations AS observations
         LEFT JOIN legacy_graph_migration_refs AS refs
           ON refs.source_table='runtime_observations' AND refs.source_id=observations.request_id
         WHERE observations.request_id>? ORDER BY observations.request_id ASC LIMIT ?`
      : `SELECT request_id,observation_json,NULL AS source_hash FROM runtime_observations
         WHERE request_id>? ORDER BY request_id ASC LIMIT ?`,
  );
  for (;;) {
    const rows = page.all(cursor, pageSize) as Array<{
      request_id: string;
      observation_json: string;
      source_hash: string | null;
    }>;
    if (!rows.length) break;
    for (const row of rows) {
      if (count) digest.update("\n");
      let rowHash = sha256(row.observation_json);
      try {
        if (isGraphObservationPointer(JSON.parse(row.observation_json))) {
          if (!row.source_hash)
            throw new Error("graph observation pointer is missing its source hash");
          rowHash = row.source_hash;
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          // Legacy payloads may not be JSON; their byte hash remains authoritative.
        } else {
          throw error;
        }
      }
      digest.update(`${row.request_id}\0${rowHash}`);
      count += 1;
    }
    const last = rows[rows.length - 1];
    if (!last) break;
    cursor = last.request_id;
  }
  return { count, hash: digest.digest("hex") };
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
  const digest = createHash("sha256");
  let cursor = "";
  let count = 0;
  const page = database.prepare(
    "SELECT source_id,source_hash FROM legacy_graph_migration_refs WHERE source_id>? ORDER BY source_id ASC LIMIT ?",
  );
  for (;;) {
    const rows = page.all(cursor, 1_000) as Array<{ source_id: string; source_hash: string }>;
    if (!rows.length) break;
    for (const row of rows) {
      if (count) digest.update("\n");
      digest.update(`${row.source_id}\0${row.source_hash}`);
      count += 1;
    }
    const last = rows[rows.length - 1];
    if (!last) break;
    cursor = last.source_id;
  }
  return { count, hash: digest.digest("hex") };
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

export function readRuntimeObservationStorageState(databasePath: string): LegacyMigrationState {
  const database = open(databasePath, true);
  try {
    return currentState(database);
  } finally {
    database.close();
  }
}

export function hydrateRuntimeObservationGraphPointer(input: {
  readonly databasePath: string;
  readonly pointer: unknown;
  readonly graphStore?: Pick<RuntimeObservationGraphStore, "read">;
}): Readonly<Record<string, unknown>> | null {
  if (!isGraphObservationPointer(input.pointer)) return null;
  if (!input.graphStore) throw new Error("graph artifact reader required after cutover");
  let reference: GraphArtifactReference;
  if (typeof input.pointer.artifactRef === "string") {
    const database = open(input.databasePath, true);
    try {
      const row = database
        .prepare(
          `SELECT scope_id,artifact_id,artifact_path,artifact_content_hash
           FROM legacy_graph_migration_refs WHERE source_table=? AND source_id=?`,
        )
        .get("runtime_observations", input.pointer.requestId) as
        | {
            scope_id: string;
            artifact_id: string;
            artifact_path: string;
            artifact_content_hash: string;
          }
        | undefined;
      if (!row || row.artifact_id !== input.pointer.artifactRef) {
        throw new Error("graph observation pointer reference is missing or inconsistent");
      }
      reference = {
        scopeId: row.scope_id,
        artifactId: row.artifact_id,
        artifactPath: row.artifact_path,
        contentHash: row.artifact_content_hash,
      };
    } finally {
      database.close();
    }
  } else {
    reference = input.pointer.artifactRef;
  }
  const content = input.graphStore.read(reference);
  if (sha256(content) !== reference.contentHash) {
    throw new Error("graph observation artifact content hash mismatch");
  }
  const observation = JSON.parse(content) as Readonly<Record<string, unknown>>;
  if (observation.requestId !== input.pointer.requestId) {
    throw new Error("graph observation artifact request ID mismatch");
  }
  return observation;
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
      const proof = sourceProof(database);
      return {
        state: currentState(database),
        sourceRowCount: proof.count,
        sourceHash: proof.hash,
        externalizationCandidateCount: Number(
          (
            database
              .prepare(
                "SELECT COUNT(*) AS count FROM runtime_observations WHERE length(observation_json)>?",
              )
              .get(LEGACY_INLINE_CAP_BYTES) as { count: number }
          ).count,
        ),
        inlineCapBytes: LEGACY_INLINE_CAP_BYTES,
      };
    } finally {
      database.close();
    }
  }

  #ensureBackup(options: { readonly refresh?: boolean } = {}): void {
    if (existsSync(this.#backupPath) && !options.refresh) return;
    if (options.refresh) rmSync(this.#backupPath, { force: true });
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
    const before = readLegacyMigrationJournal(this.#databasePath);
    this.#ensureBackup({ refresh: before.state === "legacy_primary" });
    const database = open(this.#databasePath);
    try {
      const registry = loadMigrationRegistry({ routerRoot: this.#routerRoot });
      const entry = registry.entries.find((candidate) => candidate.migrationId === MIGRATION_ID);
      if (!entry) throw new Error(`migration is not registered: ${MIGRATION_ID}`);
      const migrationSql = readFileSync(
        path.join(this.#routerRoot, "migrations", entry.sqlFile),
        "utf8",
      );
      database.exec(migrationSql);
      const postcondition = database.prepare(entry.postconditionQuery).get() as
        | { valid?: number }
        | undefined;
      if (postcondition?.valid !== 1) throw new Error("migration registry postcondition failed");
      const auditProof = sourceProof(database);
      database
        .prepare(
          `INSERT OR IGNORE INTO legacy_migration_journal
           (migration_id, state, source_count, source_hash, backup_path, updated_at_ms)
           VALUES (?, 'legacy_primary', ?, ?, ?, ?)`,
        )
        .run(MIGRATION_ID, auditProof.count, auditProof.hash, this.#backupPath, this.#now());
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
        const sampleForRequest = database.prepare(
          "SELECT sample_id, endpoint_id, request_id, routing_decision_id, source_type, timestamp_ms, sample_json FROM observed_performance_samples WHERE request_id = ? ORDER BY sample_id ASC",
        );
        const insert = database.prepare(
          `INSERT OR IGNORE INTO normalized_performance_samples_v2
           (sample_id, endpoint_id, model_id, request_id, routing_decision_id, source_type,
            timestamp_ms, latency_ms, success, source_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        );
        for (const row of rows) {
          const samples = sampleForRequest.all(row.request_id) as Array<
            Record<string, string | number | null>
          >;
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
      }
      const proof = targetProof(database);
      const pending = Number(
        (
          database
            .prepare(
              "SELECT COUNT(*) AS count FROM runtime_observations WHERE request_id NOT IN (SELECT source_id FROM legacy_graph_migration_refs)",
            )
            .get() as { count: number }
        ).count,
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
      if (currentState(database) !== "backfill")
        throw new Error("backfill required before shadow mirror");
      const pending = (
        database
          .prepare(
            "SELECT COUNT(*) AS count FROM runtime_observations WHERE request_id NOT IN (SELECT source_id FROM legacy_graph_migration_refs)",
          )
          .get() as { count: number }
      ).count;
      if (pending !== 0) throw new Error("backfill remains incomplete");
      // Persist the live dual-write window so a restart cannot silently extend it.
      this.#setState(database, "shadow_mirror", { holdUntilMs: input.deadlineMs });
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
      if (currentState(database) !== "shadow_mirror")
        throw new Error("shadow mirror required before parity");
      const journal = readLegacyMigrationJournal(this.#databasePath);
      if (journal.holdUntilMs === null || this.#now() > journal.holdUntilMs) {
        throw new Error("shadow mirror deadline expired; restart backfill before parity");
      }
      const source = sourceProof(database);
      const target = targetProof(database);
      if (source.count !== target.count || source.hash !== target.hash)
        throw new Error("first parity mismatch");
      this.#setState(database, "parity_verified");
      return { sourceCount: source.count, targetCount: target.count, hash: source.hash };
    } finally {
      database.close();
    }
  }

  cutover(): void {
    const database = open(this.#databasePath);
    try {
      if (currentState(database) !== "parity_verified")
        throw new Error("first parity required before cutover");
      const deadline = database
        .prepare("SELECT hold_until_ms FROM legacy_migration_journal WHERE migration_id = ?")
        .get(MIGRATION_ID) as { hold_until_ms: number | null } | undefined;
      if (
        !deadline ||
        deadline.hold_until_ms === null ||
        this.#now() > Number(deadline.hold_until_ms)
      ) {
        throw new Error("shadow mirror deadline expired; cutover is forbidden");
      }
      this.#setState(database, "graph_primary");
    } finally {
      database.close();
    }
  }

  enterLegacyReadHold(input: { readonly holdUntilMs: number }): void {
    const database = open(this.#databasePath);
    try {
      if (currentState(database) !== "graph_primary")
        throw new Error("graph cutover required before source hold");
      this.#setState(database, "legacy_read_hold", { holdUntilMs: input.holdUntilMs });
    } finally {
      database.close();
    }
  }

  verifySecondParity(evidence: { readonly consumersVerified: boolean }): void {
    if (!evidence.consumersVerified) throw new Error("second parity consumer proof required");
    const database = open(this.#databasePath);
    try {
      if (currentState(database) !== "legacy_read_hold")
        throw new Error("legacy read hold required");
      const source = sourceProof(database);
      const target = targetProof(database);
      if (source.count !== target.count || source.hash !== target.hash) {
        throw new Error("second parity mismatch");
      }
      database
        .prepare(
          "UPDATE legacy_migration_journal SET second_parity_verified = 1, updated_at_ms = ? WHERE migration_id = ?",
        )
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
          .prepare(
            "SELECT artifact_id, artifact_path, artifact_content_hash FROM legacy_graph_migration_refs",
          )
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
