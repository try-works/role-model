import path from "node:path";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import type { ObservedPerformanceProfile } from "@role-model/protocol-types";
import type { ObservedPerformanceSample } from "@role-model-router/profile-aggregator";
import type { ProviderAccountRecord } from "@role-model-router/provider-account";

const INITIAL_MIGRATION_ID = "run06-v1-initial-schema";
const CURRENT_SCHEMA_VERSION = 1;
const MAINTENANCE_DEFAULTS = [
  { key: "backup.policy", value: "wal-copy-on-demand" },
  { key: "deletion.policy", value: "explicit-export-delete" },
  { key: "redaction.level", value: "strict" },
  { key: "retention.class", value: "standard" },
] as const;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS provider_accounts (
  provider_account_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  org_scope TEXT NOT NULL,
  account_scope TEXT NOT NULL,
  credential_backend TEXT NOT NULL,
  credential_ref TEXT NOT NULL,
  auth_mode TEXT NOT NULL,
  region_policy_json TEXT NOT NULL,
  base_url_override TEXT,
  allowed_models_json TEXT NOT NULL,
  denied_models_json TEXT NOT NULL,
  entitlement_tags_json TEXT NOT NULL,
  budget_policy_ref TEXT NOT NULL,
  quota_policy_ref TEXT NOT NULL,
  status TEXT NOT NULL,
  health_status TEXT NOT NULL,
  rotation_state TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS provider_account_diagnostics (
  diagnostic_id TEXT PRIMARY KEY,
  provider_account_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  code TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  workspace_scope TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS conversations (
  conversation_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS conversation_turns (
  turn_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content_ref TEXT,
  created_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS context_artifacts (
  artifact_id TEXT PRIMARY KEY,
  artifact_kind TEXT NOT NULL,
  storage_ref TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS artifact_links (
  link_id TEXT PRIMARY KEY,
  artifact_id TEXT NOT NULL,
  conversation_id TEXT,
  session_id TEXT,
  created_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS routing_handoffs (
  handoff_id TEXT PRIMARY KEY,
  conversation_id TEXT,
  from_endpoint_id TEXT,
  to_endpoint_id TEXT,
  created_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS retrieval_receipts (
  retrieval_receipt_id TEXT PRIMARY KEY,
  conversation_id TEXT,
  receipt_summary TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS memory_maintenance (
  maintenance_key TEXT PRIMARY KEY,
  maintenance_value TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS schema_version (
  schema_version INTEGER PRIMARY KEY,
  migration_id TEXT NOT NULL,
  applied_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS migration_receipts (
  migration_id TEXT PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  applied_at_ms INTEGER NOT NULL,
  status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS runtime_observations (
  request_id TEXT PRIMARY KEY,
  routing_decision_id TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  observation_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS observed_performance_samples (
  sample_id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  request_id TEXT,
  routing_decision_id TEXT,
  source_type TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  sample_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS observed_profile_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  measured_at_ms INTEGER NOT NULL,
  profile_json TEXT NOT NULL
);
`;

export interface SqliteMemoryLocationInput {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}

export interface SqliteMemoryInitializationResult {
  readonly databasePath: string;
  readonly schemaVersion: number;
  readonly appliedMigrations: readonly string[];
}

export interface PersistProviderAccountsInput {
  readonly databasePath: string;
  readonly accounts: readonly ProviderAccountRecord[];
}

export interface SessionRecord {
  readonly sessionId: string;
  readonly workspaceScope: string;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export interface ConversationRecord {
  readonly conversationId: string;
  readonly sessionId: string;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export interface ConversationTurnRecord {
  readonly turnId: string;
  readonly conversationId: string;
  readonly role: string;
  readonly contentRef: string | null;
  readonly createdAtMs: number;
}

export interface ContextArtifactRecord {
  readonly artifactId: string;
  readonly artifactKind: string;
  readonly storageRef: string;
  readonly createdAtMs: number;
}

export interface ArtifactLinkRecord {
  readonly linkId: string;
  readonly artifactId: string;
  readonly conversationId: string | null;
  readonly sessionId: string | null;
  readonly createdAtMs: number;
}

export interface RoutingHandoffRecord {
  readonly handoffId: string;
  readonly conversationId: string | null;
  readonly fromEndpointId: string | null;
  readonly toEndpointId: string | null;
  readonly createdAtMs: number;
}

export interface PersistContinuitySnapshotInput {
  readonly databasePath: string;
  readonly session: SessionRecord;
  readonly conversation: ConversationRecord;
  readonly turns: readonly ConversationTurnRecord[];
  readonly artifacts: readonly ContextArtifactRecord[];
  readonly artifactLinks: readonly ArtifactLinkRecord[];
  readonly handoffs: readonly RoutingHandoffRecord[];
}

export interface LinkedContextArtifactRecord extends ContextArtifactRecord {
  readonly linkId: string;
  readonly conversationId: string | null;
  readonly sessionId: string | null;
  readonly linkedAtMs: number;
}

export interface ConversationContinuitySnapshot {
  readonly session: SessionRecord;
  readonly conversation: ConversationRecord;
  readonly turns: readonly ConversationTurnRecord[];
  readonly artifacts: readonly LinkedContextArtifactRecord[];
  readonly handoffs: readonly RoutingHandoffRecord[];
}

export interface ReadConversationContinuityInput {
  readonly databasePath: string;
  readonly conversationId: string;
}

export interface PersistRetrievalReceiptInput {
  readonly databasePath: string;
  readonly retrievalReceiptId: string;
  readonly conversationId: string | null;
  readonly receiptSummary: string;
}

export interface ReadRetrievalReceiptsInput {
  readonly databasePath: string;
  readonly conversationId: string;
}

export interface RetrievalReceiptRecord {
  readonly retrievalReceiptId: string;
  readonly conversationId: string | null;
  readonly receiptSummary: string;
}

export interface PersistRuntimeObservationBundleInput {
  readonly databasePath: string;
  readonly observation: PersistedRuntimeObservationBundle;
}

export interface ReadRuntimeObservationBundleInput {
  readonly databasePath: string;
  readonly requestId: string;
}

export interface ReadObservedPerformanceSamplesInput {
  readonly databasePath: string;
  readonly endpointId: string;
}

export interface ReadLatestObservedProfileInput {
  readonly databasePath: string;
  readonly endpointId: string;
}

export interface ReadRuntimeMaintenancePolicyInput {
  readonly databasePath: string;
}

export interface RuntimeObservationSummaryRecord {
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly endpointId: string;
  readonly createdAtMs: number;
}

export interface ListRecentRuntimeObservationsInput {
  readonly databasePath: string;
  readonly limit?: number;
}

export interface PersistedRuntimeObservationBundle {
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly endpointId: string;
  readonly conversationId: string;
  readonly usageEvent: {
    readonly timestamp_ms: number;
  };
  readonly observedPerformance: {
    readonly sample: ObservedPerformanceSample;
    readonly profile: ObservedPerformanceProfile;
  };
}

function ensureNonEmpty(value: string, label: string): string {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

export function resolveSqliteMemoryLocation(input: SqliteMemoryLocationInput): string {
  const runtimeStateRoot = ensureNonEmpty(input.runtimeStateRoot, "runtimeStateRoot");
  const scopeId = ensureNonEmpty(input.scopeId, "scopeId");
  return path.join(runtimeStateRoot, scopeId, "memory", "memory.sqlite");
}

function initializeSchema(database: DatabaseSync): void {
  database.exec(SCHEMA_SQL);
}

function seedMaintenanceDefaults(database: DatabaseSync, nowMs: number): void {
  const statement = database.prepare(
    "INSERT OR REPLACE INTO memory_maintenance (maintenance_key, maintenance_value, updated_at_ms) VALUES (?, ?, ?)",
  );
  for (const entry of MAINTENANCE_DEFAULTS) {
    statement.run(entry.key, entry.value, nowMs);
  }
}

export function initializeSqliteMemory(
  input: SqliteMemoryLocationInput,
): SqliteMemoryInitializationResult {
  const databasePath = resolveSqliteMemoryLocation(input);
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new DatabaseSync(databasePath);
  const nowMs = Date.now();

  const journalModeRow = database.prepare("PRAGMA journal_mode = WAL").get() as { journal_mode?: string } | undefined;
  initializeSchema(database);
  seedMaintenanceDefaults(database, nowMs);

  const currentVersionRow = database
    .prepare("SELECT schema_version FROM schema_version ORDER BY schema_version DESC LIMIT 1")
    .get() as { schema_version?: number } | undefined;

  const appliedMigrations: string[] = [];
  if (!currentVersionRow) {
    database.prepare("INSERT INTO schema_version (schema_version, migration_id, applied_at_ms) VALUES (?, ?, ?)").run(
      CURRENT_SCHEMA_VERSION,
      INITIAL_MIGRATION_ID,
      nowMs,
    );
    database
      .prepare("INSERT INTO migration_receipts (migration_id, schema_version, applied_at_ms, status) VALUES (?, ?, ?, ?)")
      .run(INITIAL_MIGRATION_ID, CURRENT_SCHEMA_VERSION, nowMs, "applied");
    appliedMigrations.push(INITIAL_MIGRATION_ID);
  }

  if (journalModeRow?.journal_mode?.toLowerCase() !== "wal") {
    throw new Error("SQLite journal mode did not initialize as WAL");
  }

  database.close();

  return {
    databasePath,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appliedMigrations,
  };
}

export function persistProviderAccounts(input: PersistProviderAccountsInput): void {
  const database = new DatabaseSync(input.databasePath);
  const nowMs = Date.now();
  const statement = database.prepare(`
    INSERT OR REPLACE INTO provider_accounts (
      provider_account_id,
      provider_id,
      provider_kind,
      org_scope,
      account_scope,
      credential_backend,
      credential_ref,
      auth_mode,
      region_policy_json,
      base_url_override,
      allowed_models_json,
      denied_models_json,
      entitlement_tags_json,
      budget_policy_ref,
      quota_policy_ref,
      status,
      health_status,
      rotation_state,
      created_at_ms,
      updated_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const account of input.accounts) {
    statement.run(
      account.providerAccountId,
      account.providerId,
      account.providerKind,
      account.orgScope,
      account.accountScope,
      account.credentialRef.backend,
      account.credentialRef.ref,
      account.authMode,
      JSON.stringify(account.regionPolicy),
      account.baseUrlOverride,
      JSON.stringify(account.allowedModels),
      JSON.stringify(account.deniedModels),
      JSON.stringify(account.entitlementTags),
      account.budgetPolicyRef,
      account.quotaPolicyRef,
      account.status,
      account.healthStatus,
      account.rotationState,
      nowMs,
      nowMs,
    );
  }
  database.close();
}

export function persistContinuitySnapshot(input: PersistContinuitySnapshotInput): void {
  const database = new DatabaseSync(input.databasePath);
  database
    .prepare("INSERT OR REPLACE INTO sessions (session_id, workspace_scope, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?)")
    .run(input.session.sessionId, input.session.workspaceScope, input.session.createdAtMs, input.session.updatedAtMs);
  database
    .prepare(
      "INSERT OR REPLACE INTO conversations (conversation_id, session_id, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?)",
    )
    .run(
      input.conversation.conversationId,
      input.conversation.sessionId,
      input.conversation.createdAtMs,
      input.conversation.updatedAtMs,
    );

  const turnStatement = database.prepare(
    "INSERT OR REPLACE INTO conversation_turns (turn_id, conversation_id, role, content_ref, created_at_ms) VALUES (?, ?, ?, ?, ?)",
  );
  for (const turn of input.turns) {
    turnStatement.run(turn.turnId, turn.conversationId, turn.role, turn.contentRef, turn.createdAtMs);
  }

  const artifactStatement = database.prepare(
    "INSERT OR REPLACE INTO context_artifacts (artifact_id, artifact_kind, storage_ref, created_at_ms) VALUES (?, ?, ?, ?)",
  );
  for (const artifact of input.artifacts) {
    artifactStatement.run(artifact.artifactId, artifact.artifactKind, artifact.storageRef, artifact.createdAtMs);
  }

  const linkStatement = database.prepare(
    "INSERT OR REPLACE INTO artifact_links (link_id, artifact_id, conversation_id, session_id, created_at_ms) VALUES (?, ?, ?, ?, ?)",
  );
  for (const link of input.artifactLinks) {
    linkStatement.run(link.linkId, link.artifactId, link.conversationId, link.sessionId, link.createdAtMs);
  }

  const handoffStatement = database.prepare(
    "INSERT OR REPLACE INTO routing_handoffs (handoff_id, conversation_id, from_endpoint_id, to_endpoint_id, created_at_ms) VALUES (?, ?, ?, ?, ?)",
  );
  for (const handoff of input.handoffs) {
    handoffStatement.run(
      handoff.handoffId,
      handoff.conversationId,
      handoff.fromEndpointId,
      handoff.toEndpointId,
      handoff.createdAtMs,
    );
  }

  database.close();
}

export function readConversationContinuity(
  input: ReadConversationContinuityInput,
): ConversationContinuitySnapshot {
  const database = new DatabaseSync(input.databasePath);
  const conversation = database
    .prepare(
      "SELECT conversation_id, session_id, created_at_ms, updated_at_ms FROM conversations WHERE conversation_id = ?",
    )
    .get(input.conversationId) as
    | {
        conversation_id: string;
        session_id: string;
        created_at_ms: number;
        updated_at_ms: number;
      }
    | undefined;

  if (!conversation) {
    database.close();
    throw new Error(`Conversation ${input.conversationId} is not present in SQLite continuity state`);
  }

  const session = database
    .prepare("SELECT session_id, workspace_scope, created_at_ms, updated_at_ms FROM sessions WHERE session_id = ?")
    .get(conversation.session_id) as
    | {
        session_id: string;
        workspace_scope: string;
        created_at_ms: number;
        updated_at_ms: number;
      }
    | undefined;

  if (!session) {
    database.close();
    throw new Error(`Session ${conversation.session_id} is not present in SQLite continuity state`);
  }

  const turns = database
    .prepare(
      "SELECT turn_id, conversation_id, role, content_ref, created_at_ms FROM conversation_turns WHERE conversation_id = ? ORDER BY created_at_ms ASC, turn_id ASC",
    )
    .all(input.conversationId) as Array<{
    turn_id: string;
    conversation_id: string;
    role: string;
    content_ref: string | null;
    created_at_ms: number;
  }>;
  const artifacts = database
    .prepare(`
      SELECT
        context_artifacts.artifact_id,
        context_artifacts.artifact_kind,
        context_artifacts.storage_ref,
        context_artifacts.created_at_ms,
        artifact_links.link_id,
        artifact_links.conversation_id,
        artifact_links.session_id,
        artifact_links.created_at_ms AS linked_at_ms
      FROM artifact_links
      INNER JOIN context_artifacts ON context_artifacts.artifact_id = artifact_links.artifact_id
      WHERE artifact_links.conversation_id = ? OR artifact_links.session_id = ?
      ORDER BY context_artifacts.created_at_ms ASC, context_artifacts.artifact_id ASC
    `)
    .all(input.conversationId, conversation.session_id) as Array<{
    artifact_id: string;
    artifact_kind: string;
    storage_ref: string;
    created_at_ms: number;
    link_id: string;
    conversation_id: string | null;
    session_id: string | null;
    linked_at_ms: number;
  }>;
  const handoffs = database
    .prepare(
      "SELECT handoff_id, conversation_id, from_endpoint_id, to_endpoint_id, created_at_ms FROM routing_handoffs WHERE conversation_id = ? ORDER BY created_at_ms ASC, handoff_id ASC",
    )
    .all(input.conversationId) as Array<{
    handoff_id: string;
    conversation_id: string | null;
    from_endpoint_id: string | null;
    to_endpoint_id: string | null;
    created_at_ms: number;
  }>;
  database.close();

  return {
    session: {
      sessionId: session.session_id,
      workspaceScope: session.workspace_scope,
      createdAtMs: session.created_at_ms,
      updatedAtMs: session.updated_at_ms,
    },
    conversation: {
      conversationId: conversation.conversation_id,
      sessionId: conversation.session_id,
      createdAtMs: conversation.created_at_ms,
      updatedAtMs: conversation.updated_at_ms,
    },
    turns: turns.map((turn) => ({
      turnId: turn.turn_id,
      conversationId: turn.conversation_id,
      role: turn.role,
      contentRef: turn.content_ref,
      createdAtMs: turn.created_at_ms,
    })),
    artifacts: artifacts.map((artifact) => ({
      artifactId: artifact.artifact_id,
      artifactKind: artifact.artifact_kind,
      storageRef: artifact.storage_ref,
      createdAtMs: artifact.created_at_ms,
      linkId: artifact.link_id,
      conversationId: artifact.conversation_id,
      sessionId: artifact.session_id,
      linkedAtMs: artifact.linked_at_ms,
    })),
    handoffs: handoffs.map((handoff) => ({
      handoffId: handoff.handoff_id,
      conversationId: handoff.conversation_id,
      fromEndpointId: handoff.from_endpoint_id,
      toEndpointId: handoff.to_endpoint_id,
      createdAtMs: handoff.created_at_ms,
    })),
  };
}

export function persistRetrievalReceipt(input: PersistRetrievalReceiptInput): void {
  const database = new DatabaseSync(input.databasePath);
  database
    .prepare(
      "INSERT OR REPLACE INTO retrieval_receipts (retrieval_receipt_id, conversation_id, receipt_summary, created_at_ms) VALUES (?, ?, ?, ?)",
    )
    .run(input.retrievalReceiptId, input.conversationId, input.receiptSummary, Date.now());
  database.close();
}

export function readRetrievalReceipts(input: ReadRetrievalReceiptsInput): readonly RetrievalReceiptRecord[] {
  const database = new DatabaseSync(input.databasePath);
  const rows = database
    .prepare(
      "SELECT retrieval_receipt_id, conversation_id, receipt_summary FROM retrieval_receipts WHERE conversation_id = ? ORDER BY retrieval_receipt_id ASC",
    )
    .all(input.conversationId) as Array<{
    retrieval_receipt_id: string;
    conversation_id: string | null;
    receipt_summary: string;
  }>;
  database.close();

  return rows.map((row) => ({
    retrievalReceiptId: row.retrieval_receipt_id,
    conversationId: row.conversation_id,
    receiptSummary: row.receipt_summary,
  }));
}

function sampleIdFor(sample: ObservedPerformanceSample): string {
  return sample.request_id ?? `${sample.endpoint_id}:${sample.timestamp_ms}:${sample.source_type}`;
}

export function readRuntimeMaintenancePolicy(
  input: ReadRuntimeMaintenancePolicyInput,
): Readonly<Record<string, string>> {
  const database = new DatabaseSync(input.databasePath);
  const rows = database
    .prepare(
      "SELECT maintenance_key, maintenance_value FROM memory_maintenance ORDER BY maintenance_key ASC",
    )
    .all() as Array<{
    maintenance_key: string;
    maintenance_value: string;
  }>;
  database.close();

  return Object.fromEntries(rows.map((row) => [row.maintenance_key, row.maintenance_value]));
}

export function persistRuntimeObservationBundle(input: PersistRuntimeObservationBundleInput): void {
  const database = new DatabaseSync(input.databasePath);
  const observation = input.observation;
  database
    .prepare(
      "INSERT OR REPLACE INTO runtime_observations (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      observation.requestId,
      observation.routingDecisionId,
      observation.endpointId,
      observation.conversationId,
      observation.usageEvent.timestamp_ms,
      JSON.stringify(observation),
    );
  database
    .prepare(
      "INSERT OR REPLACE INTO observed_performance_samples (sample_id, endpoint_id, request_id, routing_decision_id, source_type, timestamp_ms, sample_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      sampleIdFor(observation.observedPerformance.sample),
      observation.endpointId,
      observation.observedPerformance.sample.request_id ?? null,
      observation.observedPerformance.sample.routing_decision_id ?? null,
      observation.observedPerformance.sample.source_type,
      observation.observedPerformance.sample.timestamp_ms,
      JSON.stringify(observation.observedPerformance.sample),
    );
  database
    .prepare(
      "INSERT OR REPLACE INTO observed_profile_snapshots (snapshot_id, endpoint_id, measured_at_ms, profile_json) VALUES (?, ?, ?, ?)",
    )
    .run(
      `${observation.endpointId}:${observation.observedPerformance.profile.measured_at_ms}`,
      observation.endpointId,
      observation.observedPerformance.profile.measured_at_ms,
      JSON.stringify(observation.observedPerformance.profile),
    );
  database.close();
}

export function readRuntimeObservationBundle(
  input: ReadRuntimeObservationBundleInput,
): PersistedRuntimeObservationBundle | null {
  const database = new DatabaseSync(input.databasePath);
  const row = database
    .prepare("SELECT observation_json FROM runtime_observations WHERE request_id = ?")
    .get(input.requestId) as
    | {
        observation_json: string;
      }
    | undefined;
  database.close();

  return row ? (JSON.parse(row.observation_json) as PersistedRuntimeObservationBundle) : null;
}

export function readObservedPerformanceSamples(
  input: ReadObservedPerformanceSamplesInput,
): readonly ObservedPerformanceSample[] {
  const database = new DatabaseSync(input.databasePath);
  const rows = database
    .prepare(
      "SELECT sample_json FROM observed_performance_samples WHERE endpoint_id = ? ORDER BY timestamp_ms ASC, sample_id ASC",
    )
    .all(input.endpointId) as Array<{
    sample_json: string;
  }>;
  database.close();

  return rows.map((row) => JSON.parse(row.sample_json) as ObservedPerformanceSample);
}

export function readLatestObservedProfile(
  input: ReadLatestObservedProfileInput,
): ObservedPerformanceProfile | null {
  const database = new DatabaseSync(input.databasePath);
  const row = database
    .prepare(
      "SELECT profile_json FROM observed_profile_snapshots WHERE endpoint_id = ? ORDER BY measured_at_ms DESC, snapshot_id DESC LIMIT 1",
    )
    .get(input.endpointId) as
    | {
        profile_json: string;
      }
    | undefined;
  database.close();

  return row ? (JSON.parse(row.profile_json) as ObservedPerformanceProfile) : null;
}

export function listRecentRuntimeObservations(
  input: ListRecentRuntimeObservationsInput,
): readonly RuntimeObservationSummaryRecord[] {
  const database = new DatabaseSync(input.databasePath);
  const rows = database
    .prepare(
      "SELECT request_id, routing_decision_id, endpoint_id, created_at_ms FROM runtime_observations ORDER BY created_at_ms DESC, request_id DESC LIMIT ?",
    )
    .all(input.limit ?? 20) as Array<{
    request_id: string;
    routing_decision_id: string;
    endpoint_id: string;
    created_at_ms: number;
  }>;
  database.close();

  return rows.map((row) => ({
    requestId: row.request_id,
    routingDecisionId: row.routing_decision_id,
    endpointId: row.endpoint_id,
    createdAtMs: row.created_at_ms,
  }));
}
