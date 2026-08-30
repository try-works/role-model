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

export type OccurrenceMigrationState =
  | "v2_primary"
  | "occurrence_shadow"
  | "occurrence_parity"
  | "occurrence_primary"
  | "v2_archive_retired";

/**
 * Cross-repository cutover guard shared by the public SQLite reader and the
 * private occurrence authority. It does not mutate journal state: callers must
 * persist the accepted transition atomically with their own cursor/checkpoint.
 */
export function validateOccurrenceMigrationTransition(input: {
  readonly from: OccurrenceMigrationState;
  readonly to: OccurrenceMigrationState;
  readonly parityVerified: boolean;
  readonly backupVerified: boolean;
  readonly consumersVerified: boolean;
  readonly rollbackWindowVerified?: boolean;
}): void {
  const allowed = new Set([
    "v2_primary:occurrence_shadow",
    "occurrence_shadow:occurrence_parity",
    "occurrence_parity:occurrence_primary",
    "occurrence_primary:v2_archive_retired",
  ]);
  const transition = `${input.from}:${input.to}`;
  if (input.to === "occurrence_primary" && input.from !== "occurrence_parity") {
    throw new Error("occurrence cutover requires the explicit verified parity state");
  }
  if (!allowed.has(transition))
    throw new Error(`unsupported occurrence migration transition ${transition}`);
  if (input.to === "occurrence_parity" && !input.parityVerified) {
    throw new Error("occurrence migration parity must be verified before parity state");
  }
  if (
    input.to === "occurrence_primary" &&
    (!input.parityVerified || !input.backupVerified || !input.consumersVerified)
  ) {
    throw new Error("occurrence cutover requires verified parity, backup, and consumers");
  }
  if (input.to === "v2_archive_retired" && input.rollbackWindowVerified !== true) {
    throw new Error("occurrence archive retirement requires a verified rollback window");
  }
}

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
  readonly quarantinedPointerRows: number;
  readonly quarantinedRows: number;
  readonly quarantinedRequestIds: readonly string[];
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

function hasMigrationRegistryIdentity(routerRoot: string): boolean {
  const registryPath = path.join(routerRoot, "migrations", "registry.json");
  if (!existsSync(registryPath)) return false;
  try {
    const parsed = JSON.parse(readFileSync(registryPath, "utf8")) as {
      readonly schemaVersion?: unknown;
      readonly entries?: unknown;
    };
    return (
      parsed.schemaVersion === "role-model.sqlite-migration-registry.v1" &&
      Array.isArray(parsed.entries)
    );
  } catch {
    return false;
  }
}

/**
 * Resolves source-checkout migration assets without relying on module URL metadata.
 * Packaged runtimes must pass their verified staged router root explicitly.
 */
export function resolveLegacyMigrationRouterRoot(startDirectory = process.cwd()): string {
  const start = path.resolve(startDirectory);
  const initialCandidates = [start, path.join(start, "role-model-router")];
  for (const candidate of initialCandidates) {
    if (hasMigrationRegistryIdentity(candidate)) return candidate;
  }

  let candidate = path.dirname(start);
  while (true) {
    if (hasMigrationRegistryIdentity(candidate)) return candidate;
    const parent = path.dirname(candidate);
    if (parent === candidate) break;
    candidate = parent;
  }

  throw new Error(
    "A valid SQLite migration registry identity was not found; packaged runtimes must provide an explicit routerRoot",
  );
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

type LegacyRowClassification =
  | { readonly kind: "import" }
  | { readonly kind: "canonical"; readonly reference: GraphArtifactReference }
  | { readonly kind: "quarantine"; readonly reason: "malformed_json" | "unresolved_graph_pointer" };

function classifyLegacyRow(
  observationJson: string,
  canonicalPointerValidator?: (pointer: {
    readonly requestId: string;
    readonly artifactRef: GraphArtifactReference | string;
    readonly graphPrimary?: boolean;
    readonly migrated?: boolean;
  }) => boolean,
): LegacyRowClassification {
  try {
    const parsed = JSON.parse(observationJson);
    if (!isGraphObservationPointer(parsed)) return { kind: "import" };
    if (
      typeof parsed.artifactRef === "object" &&
      canonicalPointerValidator?.(parsed)
    ) {
      return { kind: "canonical", reference: parsed.artifactRef };
    }
    return { kind: "quarantine", reason: "unresolved_graph_pointer" };
  } catch (error) {
    if (error instanceof SyntaxError) return { kind: "quarantine", reason: "malformed_json" };
    throw error;
  }
}

function ensureQuarantineTable(database: DatabaseSync): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS legacy_migration_quarantine (
      source_table TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_hash TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL,
      PRIMARY KEY (source_table, source_id)
    );
  `);
}

function readQuarantine(database: DatabaseSync): Array<{ source_id: string; reason: string }> {
  if (!tableExists(database, "legacy_migration_quarantine")) return [];
  return database
    .prepare(
      "SELECT source_id, reason FROM legacy_migration_quarantine WHERE source_table=? ORDER BY source_id",
    )
    .all("runtime_observations") as Array<{ source_id: string; reason: string }>;
}

function sourceProof(
  database: DatabaseSync,
  pageSize = 1_000,
  canonicalPointerValidator?: (pointer: {
    readonly requestId: string;
    readonly artifactRef: GraphArtifactReference | string;
    readonly graphPrimary?: boolean;
    readonly migrated?: boolean;
  }) => boolean,
): { count: number; hash: string } {
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
      let rowHash = sha256(row.observation_json);
      try {
        const parsed = JSON.parse(row.observation_json);
        if (isGraphObservationPointer(parsed)) {
          // Run 94 SP6: a pointer-shaped row without a matching migration ref is
          // unclassified residue — quarantined and excluded from parity inputs.
          const confirmedCanonical =
            typeof parsed.artifactRef === "object" &&
            canonicalPointerValidator?.(parsed) === true;
          if (!row.source_hash && !confirmedCanonical) continue;
          rowHash = row.source_hash ?? sha256(row.observation_json);
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          // Legacy payloads may not be JSON; their byte hash remains authoritative.
        } else {
          throw error;
        }
      }
      if (count) digest.update("\n");
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

/**
 * Builds the <=16 KiB compact identity stub persisted inline in SQLite.
 * Rich content (messages, response bodies, tool payloads, captures, cumulative
 * history/recentSamples) is NEVER included: it is graph-external by contract.
 */
export function buildCompactRuntimeObservationStub(
  observation: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const requestId = observation.requestId;
  if (typeof requestId !== "string" || requestId.length === 0) {
    throw new Error("runtime observation request ID required");
  }
  const stub: Record<string, unknown> = { requestId };
  const pickRecord = (value: unknown, keys: readonly string[]): Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const source = value as Record<string, unknown>;
    return Object.fromEntries(
      keys.flatMap((key) => (source[key] === undefined ? [] : [[key, source[key]] as const])),
    );
  };
  const usageEvent = pickRecord(observation.usageEvent, [
    "timestamp_ms",
    "request_id",
    "routing_decision_id",
    "endpoint_id",
    "model_id",
    "provider_kind",
    "tokens_in",
    "tokens_out",
    "latency_ms",
    "cost_actual",
    "cost_estimate",
    "currency",
    "error_class",
  ]);
  const cacheObservability = pickRecord(observation.cacheObservability, [
    "promptCacheRequested",
    "promptCacheRequestSource",
    "promptCacheUsed",
    "cacheReadTokens",
    "cacheWriteTokens",
    "routingCacheAffinity",
  ]);
  const executionTelemetry = pickRecord(observation.executionTelemetry, [
    "providerFamily",
    "vendorId",
    "finishReason",
    "costProvenance",
  ]);
  const executionSemantics = pickRecord(observation.executionSemantics, [
    "sourceClient",
    "executionFamily",
    "adapterFamily",
    "statusFamily",
    "toolSideEffectState",
    "idempotencyDecision",
  ]);
  const failedAttempts = Array.isArray(
    (observation.executionSemantics as Record<string, unknown> | undefined)?.failedAttempts,
  )
    ? ((observation.executionSemantics as Record<string, unknown>).failedAttempts as unknown[])
        .slice(0, 8)
        .filter((attempt): attempt is Record<string, unknown> =>
          Boolean(attempt && typeof attempt === "object" && !Array.isArray(attempt)),
        )
        .map((attempt) => ({
          ...pickRecord(attempt, [
            "attemptId",
            "routedAttemptId",
            "requestId",
            "routingDecisionId",
            "failedEndpointId",
            "providerId",
            "providerFamily",
            "vendorId",
            "executionFamily",
            "adapterFamily",
            "statusCode",
            "failureClass",
            "retryable",
            "fallbackEligible",
            "failurePhase",
            "cooldownRecorded",
            "cooldownFailureCount",
            "cooldownUntilMs",
          ]),
          ...(attempt.errorPreview && typeof attempt.errorPreview === "object"
            ? {
                errorPreview: pickRecord(attempt.errorPreview, [
                  "message",
                  "statusCode",
                  "errorClass",
                ]),
              }
            : {}),
        }))
    : [];
  const payloadBytes = pickRecord(
    (observation.executionSemantics as Record<string, unknown> | undefined)?.payloadBytes,
    ["ingress", "translated", "providerCanonical", "providerWire", "providerResponse"],
  );
  for (const [key, value] of [
    ["clientRequestId", observation.clientRequestId],
    ["routingDecisionId", observation.routingDecisionId],
    ["endpointId", observation.endpointId],
    ["reasoningEffort", observation.reasoningEffort],
    ["effortSource", observation.effortSource],
    ["conversationId", observation.conversationId],
  ] as const) {
    if (value !== undefined) stub[key] = value;
  }
  if (Object.keys(usageEvent).length) stub.usageEvent = usageEvent;
  if (Object.keys(cacheObservability).length) stub.cacheObservability = cacheObservability;
  if (Object.keys(executionTelemetry).length) stub.executionTelemetry = executionTelemetry;
  if (Object.keys(executionSemantics).length) {
    stub.executionSemantics = {
      ...executionSemantics,
      ...(Object.keys(payloadBytes).length ? { payloadBytes } : {}),
      ...(failedAttempts.length ? { failedAttempts } : {}),
    };
  }
  const contextEnvelope = pickRecord(observation.contextEnvelope, [
    "conversationId",
    "latestHandoffId",
    "estimatedTokenCount",
  ]);
  if (Object.keys(contextEnvelope).length) stub.contextEnvelope = contextEnvelope;
  const retrievalReceipt = pickRecord(observation.retrievalReceipt, ["receiptId", "summary"]);
  if (Object.keys(retrievalReceipt).length) stub.retrievalReceipt = retrievalReceipt;
  const capturePolicy = pickRecord(observation.capturePolicy, [
    "environment",
    "redactionLevel",
    "retentionClass",
    "structuredInspectionMode",
    "rawCaptureAvailable",
    "structuredInspectionAvailable",
  ]);
  if (Object.keys(capturePolicy).length) stub.capturePolicy = capturePolicy;
  const privacyReceipt = pickRecord(observation.privacyReceipt, [
    "samplingRate",
    "retentionTtlHours",
    "retainUntil",
  ]);
  if (Object.keys(privacyReceipt).length) stub.privacyReceipt = privacyReceipt;
  const taxonomyDimensions = pickRecord(observation.taxonomyDimensions, [
    "taxonomy_group_id",
    "taxonomy_role_id",
    "taxonomy_task_type",
    "taxonomy_task_variant",
    "taxonomy_capability_ids",
    "taxonomy_modality_ids",
    "taxonomy_tool_class_ids",
  ]);
  if (Object.keys(taxonomyDimensions).length) stub.taxonomyDimensions = taxonomyDimensions;
  const providerEvidence = pickRecord(observation.providerEvidence, [
    "endpointId",
    "modelId",
    "status",
  ]);
  if (Object.keys(providerEvidence).length) stub.providerEvidence = providerEvidence;
  const providerAttemptIds = Array.isArray(
    (observation.providerEvidence as Record<string, unknown> | undefined)?.attemptIds,
  )
    ? ((observation.providerEvidence as Record<string, unknown>).attemptIds as unknown[])
    : [];
  if (providerAttemptIds.length) {
    providerEvidence.attemptIds = providerAttemptIds.slice(0, 64);
    if (providerAttemptIds.length > 64) providerEvidence.attemptIdsTruncated = true;
    stub.providerEvidence = providerEvidence;
  }
  // SP36: node-id locator arrays are bounded inside the capped compact stub. The full
  // id lists live in the graph artifact; the stub carries the first N ids plus an
  // honest truncation flag so long conversations never overflow the 16 KiB cap.
  const GRAPH_NODE_ID_CAP = 128;
  const boundedIds = (value: unknown): { ids: unknown[]; truncated: boolean } => {
    const source = Array.isArray(value) ? (value as unknown[]) : [];
    return {
      ids: source.slice(0, GRAPH_NODE_ID_CAP),
      truncated: source.length > GRAPH_NODE_ID_CAP,
    };
  };
  const graphSource = observation.graphEvidence as Record<string, unknown> | undefined;
  const messageIds = boundedIds(graphSource?.messageNodeIds);
  const toolExecutionIds = boundedIds(graphSource?.toolExecutionNodeIds);
  const toolCallIds = boundedIds(graphSource?.toolCallNodeIds);
  const toolResultIds = boundedIds(graphSource?.toolResultNodeIds);
  const graphEvidence = pickRecord(observation.graphEvidence, [
    "rootArtifactId",
    "responseNodeId",
    "edgeCount",
  ]);
  if (graphSource?.messageNodeIds !== undefined) {
    graphEvidence.messageNodeIds = messageIds.ids;
    if (messageIds.truncated) graphEvidence.messageNodeIdsTruncated = true;
  }
  if (graphSource?.toolExecutionNodeIds !== undefined) {
    graphEvidence.toolExecutionNodeIds = toolExecutionIds.ids;
    if (toolExecutionIds.truncated) graphEvidence.toolExecutionNodeIdsTruncated = true;
  }
  if (graphSource?.toolCallNodeIds !== undefined) {
    graphEvidence.toolCallNodeIds = toolCallIds.ids;
    if (toolCallIds.truncated) graphEvidence.toolCallNodeIdsTruncated = true;
  }
  if (graphSource?.toolResultNodeIds !== undefined) {
    graphEvidence.toolResultNodeIds = toolResultIds.ids;
    if (toolResultIds.truncated) graphEvidence.toolResultNodeIdsTruncated = true;
  }
  if (Object.keys(graphEvidence).length) stub.graphEvidence = graphEvidence;
  const run88Correlation = pickRecord(observation.run88Correlation, [
    "schemaVersion",
    "correlationId",
    "requestId",
    "routingDecisionId",
    "endpointId",
    "releaseId",
    "sourceId",
    "deploymentId",
    "scope",
  ]);
  if (Object.keys(run88Correlation).length) stub.run88Correlation = run88Correlation;
  // SAFETY: observation is a persisted-bundle JSON payload at the storage I/O boundary;
  // observedPerformance is an optional object-shaped field of that payload.
  const observed = observation.observedPerformance as Record<string, unknown> | undefined;
  const sample = pickRecord(observed?.sample, [
    "endpoint_id",
    "endpoint_version",
    "model_id",
    "source_type",
    "timestamp_ms",
    "latency_ms",
    "success",
    "input_tokens",
    "output_tokens",
  ]);
  const profile = pickRecord(observed?.profile, [
    "measured_at_ms",
    "sample_count",
    "success_rate",
    "latency_ms",
    "throughput_tokens_per_sec",
    "quality_score",
  ]);
  const endpointVersion = observed?.endpointVersion;
  if (Object.keys(sample).length || Object.keys(profile).length || endpointVersion !== undefined) {
    const compactObserved: Record<string, unknown> = {};
    if (endpointVersion !== undefined) compactObserved.endpointVersion = endpointVersion;
    if (Object.keys(sample).length) compactObserved.sample = sample;
    if (Object.keys(profile).length) compactObserved.profile = profile;
    stub.observedPerformance = compactObserved;
  }
  return stub;
}

export function resolveRuntimeObservationStoragePayload(input: {
  readonly databasePath: string;
  readonly observation: Readonly<Record<string, unknown>>;
  readonly artifactRef?: GraphArtifactReference;
}): string {
  const stub = buildCompactRuntimeObservationStub(input.observation);
  if (input.artifactRef) {
    stub.artifactRef = input.artifactRef;
    stub.graphPrimary = true;
  } else {
    // Fail closed: content we are about to drop from the inline stub must already
    // be graph-externalized. SP36 exemption: when the only oversized content is the
    // bounded node-id locator arrays and the stub records their truncation honestly,
    // the bounded stub is allowed without an artifact reference.
    const fullJson = JSON.stringify(input.observation);
    if (Buffer.byteLength(fullJson, "utf8") > LEGACY_INLINE_CAP_BYTES) {
      const stubGraph = stub.graphEvidence as Record<string, unknown> | undefined;
      const honestLocatorTruncation = Boolean(
        stubGraph?.messageNodeIdsTruncated ||
          stubGraph?.toolExecutionNodeIdsTruncated ||
          stubGraph?.toolCallNodeIdsTruncated ||
          stubGraph?.toolResultNodeIdsTruncated,
      );
      const stubJson = JSON.stringify(stub);
      if (
        !(honestLocatorTruncation && Buffer.byteLength(stubJson, "utf8") <= LEGACY_INLINE_CAP_BYTES)
      ) {
        throw new Error(
          "rich runtime observation requires graph externalization; no graph artifact reference available",
        );
      }
    }
  }
  const json = JSON.stringify(stub);
  if (Buffer.byteLength(json, "utf8") > LEGACY_INLINE_CAP_BYTES) {
    throw new Error(
      `runtime observation compact stub exceeds ${LEGACY_INLINE_CAP_BYTES} bytes; rich content must be graph-externalized`,
    );
  }
  return json;
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
  readonly #canonicalPointerValidator?: (pointer: {
    readonly requestId: string;
    readonly artifactRef: GraphArtifactReference | string;
    readonly graphPrimary?: boolean;
    readonly migrated?: boolean;
  }) => boolean;

  constructor(input: {
    readonly databasePath: string;
    readonly backupPath: string;
    readonly artifactWriter: (input: LegacyArtifactWriteInput) => LegacyArtifactWriteResult;
    readonly artifactRollback?: (input: LegacyArtifactWriteResult) => void;
    readonly canonicalPointerValidator?: (pointer: {
      readonly requestId: string;
      readonly artifactRef: GraphArtifactReference | string;
      readonly graphPrimary?: boolean;
      readonly migrated?: boolean;
    }) => boolean;
    readonly now?: () => number;
    readonly routerRoot?: string;
  }) {
    this.#databasePath = input.databasePath;
    this.#backupPath = input.backupPath;
    this.#artifactWriter = input.artifactWriter;
    this.#artifactRollback = input.artifactRollback;
    this.#canonicalPointerValidator = input.canonicalPointerValidator;
    this.#now = input.now ?? Date.now;
    this.#routerRoot = input.routerRoot ?? resolveLegacyMigrationRouterRoot();
  }

  audit(): LegacyStorageAudit {
    const database = open(this.#databasePath, true);
    try {
      const proof = sourceProof(database, 1_000, this.#canonicalPointerValidator);
      const rows = database
        .prepare(
          tableExists(database, "legacy_graph_migration_refs")
            ? `SELECT observations.request_id, observations.observation_json,
                      refs.source_id AS imported_source_id
               FROM runtime_observations AS observations
               LEFT JOIN legacy_graph_migration_refs AS refs
                 ON refs.source_table='runtime_observations' AND refs.source_id=observations.request_id
               ORDER BY observations.request_id ASC`
            : `SELECT request_id, observation_json, NULL AS imported_source_id
               FROM runtime_observations ORDER BY request_id ASC`,
        )
        .all() as Array<{
        request_id: string;
        observation_json: string;
        imported_source_id: string | null;
      }>;
      const quarantined = rows.flatMap((row) =>
        row.imported_source_id
          ? []
          : classifyLegacyRow(row.observation_json, this.#canonicalPointerValidator).kind === "quarantine"
            ? [row]
            : [],
      );
      const persistedQuarantine = readQuarantine(database);
      const quarantinedIds = [
        ...new Set([
          ...quarantined.map((row) => row.request_id),
          ...persistedQuarantine.map((row) => row.source_id),
        ]),
      ].sort();
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
        // Run 94 SP6: pointer-shaped rows without a matching migration ref are
        // unclassified residue — quarantined, reported, and excluded from parity
        // inputs; they are never assumed migrated.
        quarantinedPointerRows: quarantined.length,
        quarantinedRows: quarantinedIds.length,
        quarantinedRequestIds: quarantinedIds,
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
      ensureQuarantineTable(database);
      // A pointer may have been quarantined by an older runtime before its artifact
      // was durable or before this verifier was available. Reconsider only entries
      // which the current validator proves canonical; malformed or still-unresolved
      // rows remain explicit quarantine and continue to block cutover.
      const quarantinedPointers = database
        .prepare(
          `SELECT observations.request_id, observations.observation_json
           FROM runtime_observations AS observations
           INNER JOIN legacy_migration_quarantine AS quarantine
             ON quarantine.source_table='runtime_observations'
            AND quarantine.source_id=observations.request_id
           ORDER BY observations.request_id ASC`,
        )
        .all() as Array<{ request_id: string; observation_json: string }>;
      const clearQuarantine = database.prepare(
        "DELETE FROM legacy_migration_quarantine WHERE source_table=? AND source_id=?",
      );
      for (const row of quarantinedPointers) {
        if (
          classifyLegacyRow(row.observation_json, this.#canonicalPointerValidator).kind ===
          "canonical"
        ) {
          clearQuarantine.run("runtime_observations", row.request_id);
        }
      }
      const postcondition = database.prepare(entry.postconditionQuery).get() as
        | { valid?: number }
        | undefined;
      if (postcondition?.valid !== 1) throw new Error("migration registry postcondition failed");
      const auditProof = sourceProof(database, 1_000, this.#canonicalPointerValidator);
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
             AND request_id NOT IN (SELECT source_id FROM legacy_migration_quarantine WHERE source_table='runtime_observations')
           ORDER BY request_id ASC LIMIT ?`,
        )
        .all(input.batchSize) as Array<{ request_id: string; observation_json: string }>;
      let migratedCount = 0;
      for (const row of rows) {
        const classification = classifyLegacyRow(
          row.observation_json,
          this.#canonicalPointerValidator,
        );
        if (classification.kind === "quarantine") {
          database
            .prepare(
              `INSERT OR REPLACE INTO legacy_migration_quarantine
               (source_table, source_id, source_hash, reason, created_at_ms) VALUES (?, ?, ?, ?, ?)`,
            )
            .run(
              "runtime_observations",
              row.request_id,
              sha256(row.observation_json),
              classification.reason,
              this.#now(),
            );
          continue;
        }
        if (classification.kind === "canonical") {
          const sourceHash = sha256(row.observation_json);
          database
            .prepare(
              `INSERT INTO legacy_graph_migration_refs
               (source_table, source_id, source_hash, scope_id, artifact_id, artifact_path,
                artifact_content_hash, migrated_at_ms) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .run(
              "runtime_observations",
              row.request_id,
              sourceHash,
              classification.reference.scopeId,
              classification.reference.artifactId,
              classification.reference.artifactPath ?? `artifact://${classification.reference.scopeId}/${classification.reference.artifactId}`,
              classification.reference.contentHash,
              this.#now(),
            );
          migratedCount += 1;
          continue;
        }
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
      // Recompute the source proof after stale quarantine entries may have been
      // reclassified as canonical graph pointers. The journal is the operator
      // receipt for this batch, so it must describe the same source set that
      // parity will subsequently compare to the target.
      const source = sourceProof(database, 1_000, this.#canonicalPointerValidator);
      const proof = targetProof(database);
      const pending = Number(
        (
          database
            .prepare(
              `SELECT COUNT(*) AS count FROM runtime_observations
               WHERE request_id NOT IN (SELECT source_id FROM legacy_graph_migration_refs)
                 AND request_id NOT IN (SELECT source_id FROM legacy_migration_quarantine WHERE source_table='runtime_observations')`,
            )
            .get() as { count: number }
        ).count,
      );
      database
        .prepare(
          `UPDATE legacy_migration_journal
           SET source_count = ?, source_hash = ?, target_count = ?, target_hash = ?, cursor = ?, updated_at_ms = ?
           WHERE migration_id = ?`,
        )
        .run(source.count, source.hash, proof.count, proof.hash, rows.at(-1)?.request_id ?? null, this.#now(), MIGRATION_ID);
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
            `SELECT COUNT(*) AS count FROM runtime_observations
               WHERE request_id NOT IN (SELECT source_id FROM legacy_graph_migration_refs)
               AND request_id NOT IN (SELECT source_id FROM legacy_migration_quarantine WHERE source_table='runtime_observations')`,
          )
          .get() as { count: number }
      ).count;
      const quarantined = readQuarantine(database);
      if (pending !== 0) throw new Error("backfill remains incomplete");
      if (quarantined.length > 0)
        throw new Error("legacy migration quarantine blocks shadow mirror");
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
      const quarantined = readQuarantine(database);
      if (quarantined.length > 0) throw new Error("legacy migration quarantine blocks parity");
      const journal = readLegacyMigrationJournal(this.#databasePath);
      if (journal.holdUntilMs === null || this.#now() > journal.holdUntilMs) {
        throw new Error("shadow mirror deadline expired; restart backfill before parity");
      }
      const source = sourceProof(database, 1_000, this.#canonicalPointerValidator);
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
      const source = sourceProof(database, 1_000, this.#canonicalPointerValidator);
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
