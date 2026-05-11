import path from "node:path";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

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
  model_role_bindings_json TEXT NOT NULL DEFAULT '[]',
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
CREATE TABLE IF NOT EXISTS observed_throughput_penalties (
  endpoint_id TEXT PRIMARY KEY,
  last_observed_tokens_per_sec REAL NOT NULL,
  min_tokens_per_sec REAL NOT NULL,
  penalty_factor REAL NOT NULL,
  activated_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  last_observation_measured_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS runtime_telemetry_records (
  request_id TEXT PRIMARY KEY,
  routing_decision_id TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  model_id TEXT,
  provider_kind TEXT,
  provider_family TEXT,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  latency_ms INTEGER,
  error_class TEXT,
  status_code INTEGER,
  finish_reason TEXT,
  prompt_cache_requested INTEGER NOT NULL,
  prompt_cache_supported INTEGER NOT NULL DEFAULT 0,
  prompt_cache_used INTEGER NOT NULL,
  cache_read_tokens INTEGER NOT NULL,
  cache_read_tokens_supported INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL,
  cache_write_tokens_supported INTEGER NOT NULL DEFAULT 0,
  stream_text_delta_count INTEGER NOT NULL DEFAULT 0,
  stream_text_supported INTEGER NOT NULL DEFAULT 0,
  stream_tool_call_delta_count INTEGER NOT NULL DEFAULT 0,
  stream_tool_call_supported INTEGER NOT NULL DEFAULT 0,
  stream_tool_argument_delta_count INTEGER NOT NULL DEFAULT 0,
  stream_tool_argument_supported INTEGER NOT NULL DEFAULT 0,
  tool_call_count INTEGER NOT NULL,
  tool_execution_count INTEGER NOT NULL,
  cost_provenance TEXT NOT NULL DEFAULT 'unavailable',
  actual_cost_usd REAL,
  estimated_cost_usd REAL,
  currency TEXT
 );
CREATE INDEX IF NOT EXISTS runtime_telemetry_records_created_at_idx
  ON runtime_telemetry_records (created_at_ms DESC, request_id DESC);
CREATE INDEX IF NOT EXISTS runtime_telemetry_records_endpoint_idx
  ON runtime_telemetry_records (endpoint_id, created_at_ms DESC, request_id DESC);
CREATE TABLE IF NOT EXISTS runtime_endpoints (
  endpoint_id TEXT PRIMARY KEY,
  provider_account_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  region TEXT NOT NULL,
  endpoint_kind TEXT NOT NULL,
  serving_source TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL,
  health_status TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS provider_device_auth_sessions (
  auth_request_id TEXT PRIMARY KEY,
  provider_account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  variant_id TEXT NOT NULL,
  credential_backend TEXT NOT NULL,
  credential_ref TEXT NOT NULL,
  auth_mode TEXT NOT NULL,
  verification_uri TEXT NOT NULL,
  verification_uri_complete TEXT NOT NULL,
  user_code TEXT NOT NULL,
  device_code TEXT NOT NULL,
  interval_seconds INTEGER NOT NULL,
  status TEXT NOT NULL,
  last_error TEXT,
  expires_at_ms INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS runtime_controller_assignments (
  scope TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  model_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS llama_swap_events (
  event_id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  old_model_id TEXT,
  new_model_id TEXT,
  reason TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS llama_swap_events_timestamp_idx
  ON llama_swap_events (timestamp DESC);
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

export interface UpsertProviderAccountInput {
  readonly databasePath: string;
  readonly account: ProviderAccountRecord;
}

export interface ListProviderAccountsInput {
  readonly databasePath: string;
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

export interface ReadLatestObservedProfilesByEndpointIdsInput {
  readonly databasePath: string;
  readonly endpointIds: readonly string[];
}

export interface ReadRuntimeMaintenancePolicyInput {
  readonly databasePath: string;
}

export interface ObservedThroughputPenaltyStateRecord {
  readonly endpointId: string;
  readonly lastObservedTokensPerSec: number;
  readonly minTokensPerSec: number;
  readonly penaltyFactor: number;
  readonly activatedAtMs: number;
  readonly expiresAtMs: number;
  readonly lastObservationMeasuredAtMs: number;
  readonly updatedAtMs?: number;
}

export interface UpsertObservedThroughputPenaltyStateInput {
  readonly databasePath: string;
  readonly penaltyState: Omit<ObservedThroughputPenaltyStateRecord, "updatedAtMs">;
}

export interface ReadObservedThroughputPenaltyStateInput {
  readonly databasePath: string;
  readonly endpointId: string;
  readonly nowMs: number;
}

export interface RuntimeEndpointRecord {
  readonly endpointId: string;
  readonly providerAccountId: string;
  readonly modelId: string;
  readonly region: string;
  readonly endpointKind: string;
  readonly servingSource: string;
  readonly lifecycleState: string;
  readonly healthStatus: string;
}

export interface UpsertRuntimeEndpointInput {
  readonly databasePath: string;
  readonly endpoint: RuntimeEndpointRecord;
}

export interface ListRuntimeEndpointsInput {
  readonly databasePath: string;
}

export interface ProviderDeviceAuthSessionRecord {
  readonly authRequestId: string;
  readonly providerAccountId: string;
  readonly providerId: string;
  readonly variantId: string;
  readonly credentialBackend: string;
  readonly credentialRef: string;
  readonly authMode: string;
  readonly verificationUri: string;
  readonly verificationUriComplete: string;
  readonly userCode: string;
  readonly deviceCode: string;
  readonly intervalSeconds: number;
  readonly status: string;
  readonly lastError: string | null;
  readonly expiresAtMs: number;
}

export interface UpsertProviderDeviceAuthSessionInput {
  readonly databasePath: string;
  readonly session: ProviderDeviceAuthSessionRecord;
}

export interface ReadProviderDeviceAuthSessionInput {
  readonly databasePath: string;
  readonly authRequestId: string;
}

export interface RuntimeControllerAssignmentRecord {
  readonly scope: string;
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType: string;
  readonly updatedAtMs?: number;
}

export interface UpsertRuntimeControllerAssignmentInput {
  readonly databasePath: string;
  readonly assignment: RuntimeControllerAssignmentRecord;
}

export interface ReadRuntimeControllerAssignmentInput {
  readonly databasePath: string;
  readonly scope: string;
}

export interface ExportRuntimeStateInput {
  readonly databasePath: string;
  readonly exportPath: string;
}

export interface ExportRuntimeStateResult {
  readonly exportPath: string;
  readonly observationCount: number;
  readonly profileCount: number;
}

export interface BackupRuntimeStateInput {
  readonly databasePath: string;
  readonly backupPath: string;
}

export interface BackupRuntimeStateResult {
  readonly backupPath: string;
}

export interface DeleteRuntimeStateInput {
  readonly databasePath: string;
}

export interface RestoreRuntimeStateInput {
  readonly databasePath: string;
  readonly backupPath: string;
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

export interface RuntimeTelemetryRecord {
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly endpointId: string;
  readonly conversationId: string;
  readonly createdAtMs: number;
  readonly modelId: string | null;
  readonly providerKind: string | null;
  readonly providerFamily: string | null;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly latencyMs: number | null;
  readonly errorClass: string | null;
  readonly statusCode: number | null;
  readonly finishReason: string | null;
  readonly promptCacheRequested: boolean;
  readonly promptCacheSupported: boolean;
  readonly promptCacheUsed: boolean;
  readonly cacheReadTokens: number;
  readonly cacheReadTokensSupported: boolean;
  readonly cacheWriteTokens: number;
  readonly cacheWriteTokensSupported: boolean;
  readonly streamTextDeltaCount: number;
  readonly streamTextSupported: boolean;
  readonly streamToolCallDeltaCount: number;
  readonly streamToolCallSupported: boolean;
  readonly streamToolArgumentDeltaCount: number;
  readonly streamToolArgumentSupported: boolean;
  readonly toolCallCount: number;
  readonly toolExecutionCount: number;
  readonly costProvenance: "actual" | "estimated" | "unavailable";
  readonly actualCostUsd: number | null;
  readonly estimatedCostUsd: number | null;
  readonly currency: string | null;
}

export interface RuntimeTelemetrySummary {
  readonly requestCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalTokens: number;
  readonly cachedRequestCount: number;
  readonly totalActualCostUsd: number;
  readonly totalEstimatedCostUsd: number;
  readonly averageLatencyMs: number | null;
  readonly p95LatencyMs: number | null;
  readonly lastSeenAtMs: number | null;
}

export interface RuntimeTelemetryComparisonRow {
  readonly endpointId: string;
  readonly modelId: string | null;
  readonly providerKind: string | null;
  readonly providerFamily: string | null;
  readonly promptCacheSupported: boolean;
  readonly requestCount: number;
  readonly successCount: number;
  readonly failureCount: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalTokens: number;
  readonly cachedRequestCount: number;
  readonly totalActualCostUsd: number;
  readonly totalEstimatedCostUsd: number;
  readonly averageLatencyMs: number | null;
  readonly p95LatencyMs: number | null;
  readonly lastSeenAtMs: number;
}

export interface RuntimeTelemetryQueryInput {
  readonly databasePath: string;
  readonly windowMs?: number;
  readonly limit?: number;
  readonly endAtMs?: number;
}

export interface PersistedRuntimeObservationBundle {
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly endpointId: string;
  readonly conversationId: string;
  readonly usageEvent: {
    readonly timestamp_ms: number;
    readonly request_id?: string;
    readonly routing_decision_id?: string;
    readonly endpoint_id?: string;
    readonly model_id?: string;
    readonly provider_kind?: string;
    readonly tokens_in?: number;
    readonly tokens_out?: number;
    readonly latency_ms?: number;
    readonly cost_actual?: number;
    readonly cost_estimate?: number;
    readonly currency?: string;
    readonly error_class?: string;
  };
  readonly observedPerformance: {
    readonly sample: ObservedPerformanceSample;
    readonly profile: ObservedPerformanceProfile;
  };
  readonly cacheObservability?: {
    readonly promptCacheRequested?: boolean;
    readonly promptCacheUsed?: boolean;
    readonly cacheReadTokens?: number;
    readonly cacheWriteTokens?: number;
  };
  readonly executionTelemetry?: {
    readonly providerFamily?: string;
    readonly finishReason?: string;
    readonly stream?: {
      readonly textDeltas?: number;
      readonly toolCallDeltas?: number;
      readonly toolArgumentDeltas?: number;
    };
    readonly streamSupport?: {
      readonly text?: string;
      readonly toolCalls?: string;
      readonly toolArguments?: string;
    };
    readonly promptCaching?: {
      readonly supported?: boolean;
    };
    readonly usageSupport?: {
      readonly cacheReadTokens?: boolean;
      readonly cacheWriteTokens?: boolean;
    };
    readonly costProvenance?: "actual" | "estimated" | "unavailable";
  };
  readonly tooling?: {
    readonly toolCalls?: readonly unknown[];
    readonly executions?: readonly unknown[];
  };
  readonly inspection?: {
    readonly request?: {
      readonly responseCapture?: {
        readonly statusCode?: number;
      };
    };
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
  const providerAccountColumns = new Set(
    (
      database.prepare("PRAGMA table_info(provider_accounts)").all() as Array<{
        name: string;
      }>
    ).map((row) => row.name),
  );
  if (!providerAccountColumns.has("model_role_bindings_json")) {
    database.exec("ALTER TABLE provider_accounts ADD COLUMN model_role_bindings_json TEXT NOT NULL DEFAULT '[]'");
  }
  const runtimeTelemetryColumns = new Set(
    (
      database.prepare("PRAGMA table_info(runtime_telemetry_records)").all() as Array<{
        name: string;
      }>
    ).map((row) => row.name),
  );
  const telemetryColumnDefinitions = [
    "provider_family TEXT",
    "finish_reason TEXT",
    "prompt_cache_supported INTEGER NOT NULL DEFAULT 0",
    "cache_read_tokens_supported INTEGER NOT NULL DEFAULT 0",
    "cache_write_tokens_supported INTEGER NOT NULL DEFAULT 0",
    "stream_text_delta_count INTEGER NOT NULL DEFAULT 0",
    "stream_text_supported INTEGER NOT NULL DEFAULT 0",
    "stream_tool_call_delta_count INTEGER NOT NULL DEFAULT 0",
    "stream_tool_call_supported INTEGER NOT NULL DEFAULT 0",
    "stream_tool_argument_delta_count INTEGER NOT NULL DEFAULT 0",
    "stream_tool_argument_supported INTEGER NOT NULL DEFAULT 0",
    "cost_provenance TEXT NOT NULL DEFAULT 'unavailable'",
  ] as const;
  for (const definition of telemetryColumnDefinitions) {
    const [columnName] = definition.split(" ");
    if (!runtimeTelemetryColumns.has(columnName)) {
      database.exec(`ALTER TABLE runtime_telemetry_records ADD COLUMN ${definition}`);
    }
  }
}

function seedMaintenanceDefaults(database: DatabaseSync, nowMs: number): void {
  const statement = database.prepare(
    "INSERT OR REPLACE INTO memory_maintenance (maintenance_key, maintenance_value, updated_at_ms) VALUES (?, ?, ?)",
  );
  for (const entry of MAINTENANCE_DEFAULTS) {
    statement.run(entry.key, entry.value, nowMs);
  }
}

function mapProviderAccountRow(
  row: {
    provider_account_id: string;
    provider_id: string;
    provider_kind: string;
    org_scope: string;
    account_scope: string;
    credential_backend: string;
    credential_ref: string;
    auth_mode: string;
    region_policy_json: string;
    base_url_override: string | null;
    allowed_models_json: string;
    model_role_bindings_json: string;
    denied_models_json: string;
    entitlement_tags_json: string;
    budget_policy_ref: string;
    quota_policy_ref: string;
    status: string;
    health_status: string;
    rotation_state: string;
  },
): ProviderAccountRecord {
  return {
    providerAccountId: row.provider_account_id,
    providerId: row.provider_id,
    providerKind: row.provider_kind,
    orgScope: row.org_scope,
    accountScope: row.account_scope,
    credentialRef: {
      backend: row.credential_backend as ProviderAccountRecord["credentialRef"]["backend"],
      ref: row.credential_ref,
    },
    authMode: row.auth_mode as ProviderAccountRecord["authMode"],
    regionPolicy: JSON.parse(row.region_policy_json) as ProviderAccountRecord["regionPolicy"],
    baseUrlOverride: row.base_url_override,
    allowedModels: JSON.parse(row.allowed_models_json) as string[],
    modelRoleBindings: JSON.parse(row.model_role_bindings_json) as ProviderAccountRecord["modelRoleBindings"],
    deniedModels: JSON.parse(row.denied_models_json) as string[],
    entitlementTags: JSON.parse(row.entitlement_tags_json) as string[],
    budgetPolicyRef: row.budget_policy_ref,
    quotaPolicyRef: row.quota_policy_ref,
    status: row.status as ProviderAccountRecord["status"],
    healthStatus: row.health_status as ProviderAccountRecord["healthStatus"],
    rotationState: row.rotation_state as ProviderAccountRecord["rotationState"],
  };
}

function mapRuntimeEndpointRow(
  row: {
    endpoint_id: string;
    provider_account_id: string;
    model_id: string;
    region: string;
    endpoint_kind: string;
    serving_source: string;
    lifecycle_state: string;
    health_status: string;
  },
): RuntimeEndpointRecord {
  return {
    endpointId: row.endpoint_id,
    providerAccountId: row.provider_account_id,
    modelId: row.model_id,
    region: row.region,
    endpointKind: row.endpoint_kind,
    servingSource: row.serving_source,
    lifecycleState: row.lifecycle_state,
    healthStatus: row.health_status,
  };
}

function mapProviderDeviceAuthSessionRow(
  row: {
    auth_request_id: string;
    provider_account_id: string;
    provider_id: string;
    variant_id: string;
    credential_backend: string;
    credential_ref: string;
    auth_mode: string;
    verification_uri: string;
    verification_uri_complete: string;
    user_code: string;
    device_code: string;
    interval_seconds: number;
    status: string;
    last_error: string | null;
    expires_at_ms: number;
  },
): ProviderDeviceAuthSessionRecord {
  return {
    authRequestId: row.auth_request_id,
    providerAccountId: row.provider_account_id,
    providerId: row.provider_id,
    variantId: row.variant_id,
    credentialBackend: row.credential_backend,
    credentialRef: row.credential_ref,
    authMode: row.auth_mode,
    verificationUri: row.verification_uri,
    verificationUriComplete: row.verification_uri_complete,
    userCode: row.user_code,
    deviceCode: row.device_code,
    intervalSeconds: row.interval_seconds,
    status: row.status,
    lastError: row.last_error,
    expiresAtMs: row.expires_at_ms,
  };
}

function mapRuntimeControllerAssignmentRow(
  row: {
    scope: string;
    endpoint_id: string;
    model_id: string;
    source_type: string;
    updated_at_ms: number;
  },
): RuntimeControllerAssignmentRecord {
  return {
    scope: row.scope,
    endpointId: row.endpoint_id,
    modelId: row.model_id,
    sourceType: row.source_type,
    updatedAtMs: row.updated_at_ms,
  };
}

function mapObservedThroughputPenaltyStateRow(
  row: {
    endpoint_id: string;
    last_observed_tokens_per_sec: number;
    min_tokens_per_sec: number;
    penalty_factor: number;
    activated_at_ms: number;
    expires_at_ms: number;
    last_observation_measured_at_ms: number;
    updated_at_ms: number;
  },
): ObservedThroughputPenaltyStateRecord {
  return {
    endpointId: row.endpoint_id,
    lastObservedTokensPerSec: row.last_observed_tokens_per_sec,
    minTokensPerSec: row.min_tokens_per_sec,
    penaltyFactor: row.penalty_factor,
    activatedAtMs: row.activated_at_ms,
    expiresAtMs: row.expires_at_ms,
    lastObservationMeasuredAtMs: row.last_observation_measured_at_ms,
    updatedAtMs: row.updated_at_ms,
  };
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
      model_role_bindings_json,
      denied_models_json,
      entitlement_tags_json,
      budget_policy_ref,
      quota_policy_ref,
      status,
      health_status,
      rotation_state,
      created_at_ms,
      updated_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      JSON.stringify(account.modelRoleBindings),
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

export function upsertProviderAccount(input: UpsertProviderAccountInput): void {
  persistProviderAccounts({
    databasePath: input.databasePath,
    accounts: [input.account],
  });
}

export function listProviderAccounts(
  input: ListProviderAccountsInput,
): readonly ProviderAccountRecord[] {
  const database = new DatabaseSync(input.databasePath);
  const rows = database
    .prepare(`
      SELECT
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
        model_role_bindings_json,
        denied_models_json,
        entitlement_tags_json,
        budget_policy_ref,
        quota_policy_ref,
        status,
        health_status,
        rotation_state
      FROM provider_accounts
      ORDER BY provider_account_id ASC
    `)
    .all() as Array<{
    provider_account_id: string;
    provider_id: string;
    provider_kind: string;
    org_scope: string;
    account_scope: string;
    credential_backend: string;
    credential_ref: string;
    auth_mode: string;
    region_policy_json: string;
    base_url_override: string | null;
    allowed_models_json: string;
    model_role_bindings_json: string;
    denied_models_json: string;
    entitlement_tags_json: string;
    budget_policy_ref: string;
    quota_policy_ref: string;
    status: string;
    health_status: string;
    rotation_state: string;
  }>;
  database.close();

  return rows.map(mapProviderAccountRow);
}

export function upsertRuntimeEndpoint(input: UpsertRuntimeEndpointInput): void {
  const database = new DatabaseSync(input.databasePath);
  const nowMs = Date.now();
  database.prepare(`
    INSERT OR REPLACE INTO runtime_endpoints (
      endpoint_id,
      provider_account_id,
      model_id,
      region,
      endpoint_kind,
      serving_source,
      lifecycle_state,
      health_status,
      created_at_ms,
      updated_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.endpoint.endpointId,
    input.endpoint.providerAccountId,
    input.endpoint.modelId,
    input.endpoint.region,
    input.endpoint.endpointKind,
    input.endpoint.servingSource,
    input.endpoint.lifecycleState,
    input.endpoint.healthStatus,
    nowMs,
    nowMs,
  );
  database.close();
}

export function listRuntimeEndpoints(
  input: ListRuntimeEndpointsInput,
): readonly RuntimeEndpointRecord[] {
  const database = new DatabaseSync(input.databasePath);
  const rows = database.prepare(`
      SELECT
        endpoint_id,
        provider_account_id,
        model_id,
        region,
        endpoint_kind,
        serving_source,
        lifecycle_state,
        health_status
      FROM runtime_endpoints
      ORDER BY endpoint_id ASC
    `)
    .all() as Array<{
      endpoint_id: string;
      provider_account_id: string;
      model_id: string;
      region: string;
      endpoint_kind: string;
      serving_source: string;
      lifecycle_state: string;
      health_status: string;
    }>;
  database.close();

  return rows.map(mapRuntimeEndpointRow);
}

export function upsertRuntimeControllerAssignment(input: UpsertRuntimeControllerAssignmentInput): void {
  const database = new DatabaseSync(input.databasePath);
  database
    .prepare(
      "INSERT OR REPLACE INTO runtime_controller_assignments (scope, endpoint_id, model_id, source_type, updated_at_ms) VALUES (?, ?, ?, ?, ?)",
    )
    .run(
      input.assignment.scope,
      input.assignment.endpointId,
      input.assignment.modelId,
      input.assignment.sourceType,
      Date.now(),
    );
  database.close();
}

export function readRuntimeControllerAssignment(
  input: ReadRuntimeControllerAssignmentInput,
): RuntimeControllerAssignmentRecord | null {
  const database = new DatabaseSync(input.databasePath);
  const row = database
    .prepare(
      "SELECT scope, endpoint_id, model_id, source_type, updated_at_ms FROM runtime_controller_assignments WHERE scope = ?",
    )
    .get(input.scope) as
    | {
        scope: string;
        endpoint_id: string;
        model_id: string;
        source_type: string;
        updated_at_ms: number;
      }
    | undefined;
  database.close();

  return row ? mapRuntimeControllerAssignmentRow(row) : null;
}

export function upsertProviderDeviceAuthSession(
  input: UpsertProviderDeviceAuthSessionInput,
): void {
  const database = new DatabaseSync(input.databasePath);
  const nowMs = Date.now();
  database.prepare(`
    INSERT OR REPLACE INTO provider_device_auth_sessions (
      auth_request_id,
      provider_account_id,
      provider_id,
      variant_id,
      credential_backend,
      credential_ref,
      auth_mode,
      verification_uri,
      verification_uri_complete,
      user_code,
      device_code,
      interval_seconds,
      status,
      last_error,
      expires_at_ms,
      created_at_ms,
      updated_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.session.authRequestId,
    input.session.providerAccountId,
    input.session.providerId,
    input.session.variantId,
    input.session.credentialBackend,
    input.session.credentialRef,
    input.session.authMode,
    input.session.verificationUri,
    input.session.verificationUriComplete,
    input.session.userCode,
    input.session.deviceCode,
    input.session.intervalSeconds,
    input.session.status,
    input.session.lastError,
    input.session.expiresAtMs,
    nowMs,
    nowMs,
  );
  database.close();
}

export function readProviderDeviceAuthSession(
  input: ReadProviderDeviceAuthSessionInput,
): ProviderDeviceAuthSessionRecord | null {
  const database = new DatabaseSync(input.databasePath);
  const row = database.prepare(`
      SELECT
        auth_request_id,
        provider_account_id,
        provider_id,
        variant_id,
        credential_backend,
        credential_ref,
        auth_mode,
        verification_uri,
        verification_uri_complete,
        user_code,
        device_code,
        interval_seconds,
        status,
        last_error,
        expires_at_ms
      FROM provider_device_auth_sessions
      WHERE auth_request_id = ?
    `)
    .get(input.authRequestId) as
    | {
        auth_request_id: string;
        provider_account_id: string;
        provider_id: string;
        variant_id: string;
        credential_backend: string;
        credential_ref: string;
        auth_mode: string;
        verification_uri: string;
        verification_uri_complete: string;
        user_code: string;
        device_code: string;
        interval_seconds: number;
        status: string;
        last_error: string | null;
        expires_at_ms: number;
      }
    | undefined;
  database.close();

  return row ? mapProviderDeviceAuthSessionRow(row) : null;
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

function roundMetric(value: number): number {
  return Number(value.toFixed(6));
}

function percentile95(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? null;
}

function mapRuntimeTelemetryRecord(
  row: {
    request_id: string;
    routing_decision_id: string;
    endpoint_id: string;
    conversation_id: string;
    created_at_ms: number;
    model_id: string | null;
    provider_kind: string | null;
    provider_family: string | null;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    latency_ms: number | null;
    error_class: string | null;
    status_code: number | null;
    finish_reason: string | null;
    prompt_cache_requested: number;
    prompt_cache_supported: number;
    prompt_cache_used: number;
    cache_read_tokens: number;
    cache_read_tokens_supported: number;
    cache_write_tokens: number;
    cache_write_tokens_supported: number;
    stream_text_delta_count: number;
    stream_text_supported: number;
    stream_tool_call_delta_count: number;
    stream_tool_call_supported: number;
    stream_tool_argument_delta_count: number;
    stream_tool_argument_supported: number;
    tool_call_count: number;
    tool_execution_count: number;
    cost_provenance: string;
    actual_cost_usd: number | null;
    estimated_cost_usd: number | null;
    currency: string | null;
  },
): RuntimeTelemetryRecord {
  return {
    requestId: row.request_id,
    routingDecisionId: row.routing_decision_id,
    endpointId: row.endpoint_id,
    conversationId: row.conversation_id,
    createdAtMs: row.created_at_ms,
    modelId: row.model_id,
    providerKind: row.provider_kind,
    providerFamily: row.provider_family,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    totalTokens: row.total_tokens,
    latencyMs: row.latency_ms,
    errorClass: row.error_class,
    statusCode: row.status_code,
    finishReason: row.finish_reason,
    promptCacheRequested: row.prompt_cache_requested === 1,
    promptCacheSupported: row.prompt_cache_supported === 1,
    promptCacheUsed: row.prompt_cache_used === 1,
    cacheReadTokens: row.cache_read_tokens,
    cacheReadTokensSupported: row.cache_read_tokens_supported === 1,
    cacheWriteTokens: row.cache_write_tokens,
    cacheWriteTokensSupported: row.cache_write_tokens_supported === 1,
    streamTextDeltaCount: row.stream_text_delta_count,
    streamTextSupported: row.stream_text_supported === 1,
    streamToolCallDeltaCount: row.stream_tool_call_delta_count,
    streamToolCallSupported: row.stream_tool_call_supported === 1,
    streamToolArgumentDeltaCount: row.stream_tool_argument_delta_count,
    streamToolArgumentSupported: row.stream_tool_argument_supported === 1,
    toolCallCount: row.tool_call_count,
    toolExecutionCount: row.tool_execution_count,
    costProvenance: row.cost_provenance as RuntimeTelemetryRecord["costProvenance"],
    actualCostUsd: row.actual_cost_usd,
    estimatedCostUsd: row.estimated_cost_usd,
    currency: row.currency,
  };
}

function toRuntimeTelemetryRecord(observation: PersistedRuntimeObservationBundle): RuntimeTelemetryRecord {
  const inputTokens = observation.usageEvent.tokens_in ?? 0;
  const outputTokens = observation.usageEvent.tokens_out ?? 0;
  const executionTelemetry = observation.executionTelemetry;
  const streamSupport = executionTelemetry?.streamSupport;
  return {
    requestId: observation.requestId,
    routingDecisionId: observation.routingDecisionId,
    endpointId: observation.endpointId,
    conversationId: observation.conversationId,
    createdAtMs: observation.usageEvent.timestamp_ms,
    modelId: observation.usageEvent.model_id ?? null,
    providerKind: observation.usageEvent.provider_kind ?? null,
    providerFamily: executionTelemetry?.providerFamily ?? null,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latencyMs: observation.usageEvent.latency_ms ?? observation.observedPerformance.sample.latency_ms ?? null,
    errorClass:
      observation.usageEvent.error_class ?? observation.observedPerformance.sample.error_class ?? null,
    statusCode: observation.inspection?.request?.responseCapture?.statusCode ?? null,
    finishReason: executionTelemetry?.finishReason ?? null,
    promptCacheRequested: observation.cacheObservability?.promptCacheRequested ?? false,
    promptCacheSupported: executionTelemetry?.promptCaching?.supported ?? false,
    promptCacheUsed: observation.cacheObservability?.promptCacheUsed ?? false,
    cacheReadTokens: observation.cacheObservability?.cacheReadTokens ?? 0,
    cacheReadTokensSupported: executionTelemetry?.usageSupport?.cacheReadTokens ?? false,
    cacheWriteTokens: observation.cacheObservability?.cacheWriteTokens ?? 0,
    cacheWriteTokensSupported: executionTelemetry?.usageSupport?.cacheWriteTokens ?? false,
    streamTextDeltaCount: executionTelemetry?.stream?.textDeltas ?? 0,
    streamTextSupported: streamSupport?.text !== "unsupported",
    streamToolCallDeltaCount: executionTelemetry?.stream?.toolCallDeltas ?? 0,
    streamToolCallSupported: streamSupport?.toolCalls !== "unsupported",
    streamToolArgumentDeltaCount: executionTelemetry?.stream?.toolArgumentDeltas ?? 0,
    streamToolArgumentSupported: streamSupport?.toolArguments !== "unsupported",
    toolCallCount: observation.tooling?.toolCalls?.length ?? 0,
    toolExecutionCount: observation.tooling?.executions?.length ?? 0,
    costProvenance: executionTelemetry?.costProvenance ?? "unavailable",
    actualCostUsd: observation.usageEvent.cost_actual ?? null,
    estimatedCostUsd: observation.usageEvent.cost_estimate ?? null,
    currency: observation.usageEvent.currency ?? null,
  };
}

function listRuntimeTelemetryRecordsInternal(
  database: DatabaseSync,
  input: RuntimeTelemetryQueryInput,
): readonly RuntimeTelemetryRecord[] {
  const clauses: string[] = [];
  const parameters: Array<number> = [];
  const endAtMs = input.endAtMs ?? Date.now();
  if (typeof input.windowMs === "number") {
    clauses.push("created_at_ms >= ?");
    parameters.push(endAtMs - input.windowMs);
  }
  clauses.push("created_at_ms <= ?");
  parameters.push(endAtMs);

  const limitClause = typeof input.limit === "number" ? " LIMIT ?" : "";
  const rows = database
    .prepare(
      `SELECT request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, model_id, provider_kind, provider_family, input_tokens, output_tokens, total_tokens, latency_ms, error_class, status_code, finish_reason, prompt_cache_requested, prompt_cache_supported, prompt_cache_used, cache_read_tokens, cache_read_tokens_supported, cache_write_tokens, cache_write_tokens_supported, stream_text_delta_count, stream_text_supported, stream_tool_call_delta_count, stream_tool_call_supported, stream_tool_argument_delta_count, stream_tool_argument_supported, tool_call_count, tool_execution_count, cost_provenance, actual_cost_usd, estimated_cost_usd, currency FROM runtime_telemetry_records WHERE ${clauses.join(
        " AND ",
      )} ORDER BY created_at_ms DESC, request_id DESC${limitClause}`,
    )
    .all(...parameters, ...(typeof input.limit === "number" ? [input.limit] : [])) as Array<{
    request_id: string;
    routing_decision_id: string;
    endpoint_id: string;
    conversation_id: string;
    created_at_ms: number;
    model_id: string | null;
    provider_kind: string | null;
    provider_family: string | null;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    latency_ms: number | null;
    error_class: string | null;
    status_code: number | null;
    finish_reason: string | null;
    prompt_cache_requested: number;
    prompt_cache_supported: number;
    prompt_cache_used: number;
    cache_read_tokens: number;
    cache_read_tokens_supported: number;
    cache_write_tokens: number;
    cache_write_tokens_supported: number;
    stream_text_delta_count: number;
    stream_text_supported: number;
    stream_tool_call_delta_count: number;
    stream_tool_call_supported: number;
    stream_tool_argument_delta_count: number;
    stream_tool_argument_supported: number;
    tool_call_count: number;
    tool_execution_count: number;
    cost_provenance: string;
    actual_cost_usd: number | null;
    estimated_cost_usd: number | null;
    currency: string | null;
  }>;

  return rows.map(mapRuntimeTelemetryRecord);
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

export function upsertObservedThroughputPenaltyState(
  input: UpsertObservedThroughputPenaltyStateInput,
): void {
  const database = new DatabaseSync(input.databasePath);
  const updatedAtMs = Date.now();
  database
    .prepare(
      `INSERT OR REPLACE INTO observed_throughput_penalties (
        endpoint_id,
        last_observed_tokens_per_sec,
        min_tokens_per_sec,
        penalty_factor,
        activated_at_ms,
        expires_at_ms,
        last_observation_measured_at_ms,
        updated_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.penaltyState.endpointId,
      input.penaltyState.lastObservedTokensPerSec,
      input.penaltyState.minTokensPerSec,
      input.penaltyState.penaltyFactor,
      input.penaltyState.activatedAtMs,
      input.penaltyState.expiresAtMs,
      input.penaltyState.lastObservationMeasuredAtMs,
      updatedAtMs,
    );
  database.close();
}

export function readObservedThroughputPenaltyState(
  input: ReadObservedThroughputPenaltyStateInput,
): ObservedThroughputPenaltyStateRecord | null {
  const database = new DatabaseSync(input.databasePath);
  const row = database
    .prepare(
      `SELECT endpoint_id, last_observed_tokens_per_sec, min_tokens_per_sec, penalty_factor, activated_at_ms, expires_at_ms, last_observation_measured_at_ms, updated_at_ms
       FROM observed_throughput_penalties
       WHERE endpoint_id = ?`,
    )
    .get(input.endpointId) as
    | {
        endpoint_id: string;
        last_observed_tokens_per_sec: number;
        min_tokens_per_sec: number;
        penalty_factor: number;
        activated_at_ms: number;
        expires_at_ms: number;
        last_observation_measured_at_ms: number;
        updated_at_ms: number;
      }
    | undefined;
  database.close();

  if (!row || row.expires_at_ms < input.nowMs) {
    return null;
  }
  return mapObservedThroughputPenaltyStateRow(row);
}

export function persistRuntimeObservationBundle(input: PersistRuntimeObservationBundleInput): void {
  const database = new DatabaseSync(input.databasePath);
  const observation = input.observation;
  const telemetryRecord = toRuntimeTelemetryRecord(observation);
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
  database
    .prepare(
      "INSERT OR REPLACE INTO runtime_telemetry_records (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, model_id, provider_kind, provider_family, input_tokens, output_tokens, total_tokens, latency_ms, error_class, status_code, finish_reason, prompt_cache_requested, prompt_cache_supported, prompt_cache_used, cache_read_tokens, cache_read_tokens_supported, cache_write_tokens, cache_write_tokens_supported, stream_text_delta_count, stream_text_supported, stream_tool_call_delta_count, stream_tool_call_supported, stream_tool_argument_delta_count, stream_tool_argument_supported, tool_call_count, tool_execution_count, cost_provenance, actual_cost_usd, estimated_cost_usd, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      telemetryRecord.requestId,
      telemetryRecord.routingDecisionId,
      telemetryRecord.endpointId,
      telemetryRecord.conversationId,
      telemetryRecord.createdAtMs,
      telemetryRecord.modelId,
      telemetryRecord.providerKind,
      telemetryRecord.providerFamily,
      telemetryRecord.inputTokens,
      telemetryRecord.outputTokens,
      telemetryRecord.totalTokens,
      telemetryRecord.latencyMs,
      telemetryRecord.errorClass,
      telemetryRecord.statusCode,
      telemetryRecord.finishReason,
      telemetryRecord.promptCacheRequested ? 1 : 0,
      telemetryRecord.promptCacheSupported ? 1 : 0,
      telemetryRecord.promptCacheUsed ? 1 : 0,
      telemetryRecord.cacheReadTokens,
      telemetryRecord.cacheReadTokensSupported ? 1 : 0,
      telemetryRecord.cacheWriteTokens,
      telemetryRecord.cacheWriteTokensSupported ? 1 : 0,
      telemetryRecord.streamTextDeltaCount,
      telemetryRecord.streamTextSupported ? 1 : 0,
      telemetryRecord.streamToolCallDeltaCount,
      telemetryRecord.streamToolCallSupported ? 1 : 0,
      telemetryRecord.streamToolArgumentDeltaCount,
      telemetryRecord.streamToolArgumentSupported ? 1 : 0,
      telemetryRecord.toolCallCount,
      telemetryRecord.toolExecutionCount,
      telemetryRecord.costProvenance,
      telemetryRecord.actualCostUsd,
      telemetryRecord.estimatedCostUsd,
      telemetryRecord.currency,
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

export function readLatestObservedProfilesByEndpointIds(
  input: ReadLatestObservedProfilesByEndpointIdsInput,
): Record<string, ObservedPerformanceProfile> {
  if (input.endpointIds.length === 0) {
    return {};
  }

  const database = new DatabaseSync(input.databasePath);
  const placeholders = input.endpointIds.map(() => "?").join(", ");
  const rows = database
    .prepare(
      `SELECT endpoint_id, profile_json FROM observed_profile_snapshots WHERE endpoint_id IN (${placeholders}) ORDER BY measured_at_ms DESC, snapshot_id DESC`,
    )
    .all(...input.endpointIds) as Array<{
    endpoint_id: string;
    profile_json: string;
  }>;
  database.close();

  const latestProfilesByEndpointId: Record<string, ObservedPerformanceProfile> = {};
  for (const row of rows) {
    if (!(row.endpoint_id in latestProfilesByEndpointId)) {
      latestProfilesByEndpointId[row.endpoint_id] = JSON.parse(row.profile_json) as ObservedPerformanceProfile;
    }
  }
  return latestProfilesByEndpointId;
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

export function listRuntimeTelemetryRecords(
  input: RuntimeTelemetryQueryInput,
): readonly RuntimeTelemetryRecord[] {
  const database = new DatabaseSync(input.databasePath);
  const rows = listRuntimeTelemetryRecordsInternal(database, input);
  database.close();
  return rows;
}

export function readRuntimeTelemetrySummary(
  input: RuntimeTelemetryQueryInput,
): RuntimeTelemetrySummary {
  const database = new DatabaseSync(input.databasePath);
  const records = listRuntimeTelemetryRecordsInternal(database, input);
  database.close();

  const latencyValues = records
    .map((record) => record.latencyMs)
    .filter((value): value is number => typeof value === "number");
  const totalLatency = latencyValues.reduce((sum, value) => sum + value, 0);

  return {
    requestCount: records.length,
    successCount: records.filter((record) => record.errorClass === null).length,
    failureCount: records.filter((record) => record.errorClass !== null).length,
    totalInputTokens: records.reduce((sum, record) => sum + record.inputTokens, 0),
    totalOutputTokens: records.reduce((sum, record) => sum + record.outputTokens, 0),
    totalTokens: records.reduce((sum, record) => sum + record.totalTokens, 0),
    cachedRequestCount: records.filter((record) => record.promptCacheUsed).length,
    totalActualCostUsd: roundMetric(
      records.reduce((sum, record) => sum + (record.actualCostUsd ?? 0), 0),
    ),
    totalEstimatedCostUsd: roundMetric(
      records.reduce((sum, record) => sum + (record.estimatedCostUsd ?? 0), 0),
    ),
    averageLatencyMs: latencyValues.length > 0 ? Math.round(totalLatency / latencyValues.length) : null,
    p95LatencyMs: percentile95(latencyValues),
    lastSeenAtMs: records[0]?.createdAtMs ?? null,
  };
}

export function listRuntimeTelemetryComparisonRows(
  input: RuntimeTelemetryQueryInput,
): readonly RuntimeTelemetryComparisonRow[] {
  const database = new DatabaseSync(input.databasePath);
  const records = listRuntimeTelemetryRecordsInternal(database, input);
  database.close();

  const grouped = new Map<
    string,
    {
      endpointId: string;
      modelId: string | null;
      providerKind: string | null;
      providerFamily: string | null;
      promptCacheSupported: boolean;
      requestCount: number;
      successCount: number;
      failureCount: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      totalTokens: number;
      cachedRequestCount: number;
      totalActualCostUsd: number;
      totalEstimatedCostUsd: number;
      latencies: number[];
      lastSeenAtMs: number;
    }
  >();

  for (const record of records) {
    const key = `${record.endpointId}\u0000${record.modelId ?? ""}\u0000${record.providerKind ?? ""}`;
    const existing =
      grouped.get(key) ??
        {
          endpointId: record.endpointId,
          modelId: record.modelId,
          providerKind: record.providerKind,
          providerFamily: record.providerFamily,
          promptCacheSupported: record.promptCacheSupported,
          requestCount: 0,
          successCount: 0,
          failureCount: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        cachedRequestCount: 0,
        totalActualCostUsd: 0,
        totalEstimatedCostUsd: 0,
        latencies: [],
        lastSeenAtMs: record.createdAtMs,
      };
    existing.requestCount += 1;
    existing.providerFamily ??= record.providerFamily;
    existing.promptCacheSupported = existing.promptCacheSupported || record.promptCacheSupported;
    existing.successCount += record.errorClass === null ? 1 : 0;
    existing.failureCount += record.errorClass !== null ? 1 : 0;
    existing.totalInputTokens += record.inputTokens;
    existing.totalOutputTokens += record.outputTokens;
    existing.totalTokens += record.totalTokens;
    existing.cachedRequestCount += record.promptCacheUsed ? 1 : 0;
    existing.totalActualCostUsd += record.actualCostUsd ?? 0;
    existing.totalEstimatedCostUsd += record.estimatedCostUsd ?? 0;
    if (typeof record.latencyMs === "number") {
      existing.latencies.push(record.latencyMs);
    }
    if (record.createdAtMs > existing.lastSeenAtMs) {
      existing.lastSeenAtMs = record.createdAtMs;
    }
    grouped.set(key, existing);
  }

  const rows = [...grouped.values()]
    .map<RuntimeTelemetryComparisonRow>((entry) => ({
      endpointId: entry.endpointId,
      modelId: entry.modelId,
      providerKind: entry.providerKind,
      providerFamily: entry.providerFamily,
      promptCacheSupported: entry.promptCacheSupported,
      requestCount: entry.requestCount,
      successCount: entry.successCount,
      failureCount: entry.failureCount,
      totalInputTokens: entry.totalInputTokens,
      totalOutputTokens: entry.totalOutputTokens,
      totalTokens: entry.totalTokens,
      cachedRequestCount: entry.cachedRequestCount,
      totalActualCostUsd: roundMetric(entry.totalActualCostUsd),
      totalEstimatedCostUsd: roundMetric(entry.totalEstimatedCostUsd),
      averageLatencyMs:
        entry.latencies.length > 0
          ? Math.round(entry.latencies.reduce((sum, value) => sum + value, 0) / entry.latencies.length)
          : null,
      p95LatencyMs: percentile95(entry.latencies),
      lastSeenAtMs: entry.lastSeenAtMs,
    }))
    .sort(
      (left, right) =>
        right.lastSeenAtMs - left.lastSeenAtMs ||
        right.requestCount - left.requestCount ||
        left.endpointId.localeCompare(right.endpointId),
    );

  return rows.slice(0, input.limit ?? rows.length);
}

export function exportRuntimeState(input: ExportRuntimeStateInput): ExportRuntimeStateResult {
  const database = new DatabaseSync(input.databasePath);
  const observationRows = database
    .prepare(
      "SELECT observation_json FROM runtime_observations ORDER BY created_at_ms ASC, request_id ASC",
    )
    .all() as Array<{
    observation_json: string;
  }>;
  const profileRows = database
    .prepare(
      "SELECT endpoint_id, profile_json FROM observed_profile_snapshots ORDER BY measured_at_ms DESC, snapshot_id DESC",
    )
    .all() as Array<{
    endpoint_id: string;
    profile_json: string;
  }>;
  database.close();

  const observations = observationRows.map((row) => JSON.parse(row.observation_json) as PersistedRuntimeObservationBundle);
  const latestProfilesByEndpoint = new Map<string, ObservedPerformanceProfile>();
  for (const row of profileRows) {
    if (!latestProfilesByEndpoint.has(row.endpoint_id)) {
      latestProfilesByEndpoint.set(row.endpoint_id, JSON.parse(row.profile_json) as ObservedPerformanceProfile);
    }
  }

  const observedProfiles = [...latestProfilesByEndpoint.entries()].map(([endpointId, latestProfile]) => ({
    endpointId,
    latestProfile,
    recentSamples: readObservedPerformanceSamples({
      databasePath: input.databasePath,
      endpointId,
    }),
  }));

  const exported = {
    maintenancePolicy: readRuntimeMaintenancePolicy({
      databasePath: input.databasePath,
    }),
    observations: observations.map((observation) => ({
      requestId: observation.requestId,
      endpointId: observation.endpointId,
    })),
    observationBundles: observations,
    observedProfiles: observedProfiles.map((profile) => ({
      endpointId: profile.endpointId,
    })),
    observedProfileDetails: observedProfiles,
  };

  mkdirSync(path.dirname(input.exportPath), { recursive: true });
  writeFileSync(input.exportPath, `${JSON.stringify(exported, null, 2)}\n`, "utf8");

  return {
    exportPath: input.exportPath,
    observationCount: observations.length,
    profileCount: observedProfiles.length,
  };
}

function runtimeStateSiblingPaths(databasePath: string): readonly string[] {
  return [databasePath, `${databasePath}-wal`, `${databasePath}-shm`];
}

export function backupRuntimeState(input: BackupRuntimeStateInput): BackupRuntimeStateResult {
  mkdirSync(path.dirname(input.backupPath), { recursive: true });
  rmSync(input.backupPath, { force: true });

  const database = new DatabaseSync(input.databasePath);
  const escapedBackupPath = input.backupPath.replaceAll("'", "''");
  database.exec(`VACUUM INTO '${escapedBackupPath}'`);
  database.close();

  return {
    backupPath: input.backupPath,
  };
}

export function deleteRuntimeState(input: DeleteRuntimeStateInput): void {
  for (const filePath of runtimeStateSiblingPaths(input.databasePath)) {
    rmSync(filePath, { force: true });
  }
}

export function restoreRuntimeState(input: RestoreRuntimeStateInput): void {
  mkdirSync(path.dirname(input.databasePath), { recursive: true });
  deleteRuntimeState({
    databasePath: input.databasePath,
  });
  copyFileSync(input.backupPath, input.databasePath);
}

export interface InsertSwapEventInput {
  readonly databasePath: string;
  readonly timestamp: string;
  readonly oldModelId: string | null;
  readonly newModelId: string | null;
  readonly reason: string;
}

export interface SwapEventRecord {
  readonly eventId: string;
  readonly timestamp: string;
  readonly oldModelId: string | null;
  readonly newModelId: string | null;
  readonly reason: string;
}

export function insertSwapEvent(input: InsertSwapEventInput): void {
  const database = new DatabaseSync(input.databasePath);
  database.prepare(
    "INSERT INTO llama_swap_events (event_id, timestamp, old_model_id, new_model_id, reason) VALUES (?, ?, ?, ?, ?)"
  ).run(
    randomUUID(),
    input.timestamp,
    input.oldModelId,
    input.newModelId,
    input.reason,
  );
  database.close();
}

export function listSwapEvents(
  input: { readonly databasePath: string; readonly limit?: number },
): readonly SwapEventRecord[] {
  const database = new DatabaseSync(input.databasePath);
  const limitClause = typeof input.limit === "number" ? " LIMIT ?" : "";
  const rows = database
    .prepare(
      `SELECT event_id, timestamp, old_model_id, new_model_id, reason FROM llama_swap_events ORDER BY timestamp DESC${limitClause}`
    )
    .all(...(typeof input.limit === "number" ? [input.limit] : [])) as Array<{
      event_id: string;
      timestamp: string;
      old_model_id: string | null;
      new_model_id: string | null;
      reason: string;
    }>;
  database.close();

  return rows.map((row) => ({
    eventId: row.event_id,
    timestamp: row.timestamp,
    oldModelId: row.old_model_id,
    newModelId: row.new_model_id,
    reason: row.reason,
  }));
}
