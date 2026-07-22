import { randomUUID } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  type ObservedPerformanceSample,
  aggregateObservedPerformanceSamples,
} from "@role-model-router/profile-aggregator";
import type { ProviderAccountRecord } from "@role-model-router/provider-account";
import type { ObservedPerformanceProfile } from "@role-model/protocol-types";
import { mirrorShadowRuntimeObservation, resolveRuntimeObservationStoragePayload } from "./legacy-migration.js";

export * from "./legacy-migration.js";

const INITIAL_MIGRATION_ID = "run06-v1-initial-schema";
const OBSERVATION_METADATA_BACKFILL_MIGRATION_ID = "run62-observation-metadata-backfill-v1";
const TELEMETRY_METADATA_BACKFILL_MIGRATION_ID = "run62-telemetry-metadata-backfill-v1";
const RECENT_OBSERVATIONS_INDEX_MIGRATION_ID = "run77-recent-observations-index-v1";
const OBSERVED_PROFILE_INDEXES_MIGRATION_ID = "run77-observed-profile-indexes-v1";
const CURRENT_SCHEMA_VERSION = 1;
const COST_CALCULATION_VERSION = "run49.v1";
const RUNTIME_TELEMETRY_INSERT_COLUMNS = [
  "request_id",
  "routing_decision_id",
  "endpoint_id",
  "conversation_id",
  "created_at_ms",
  "client_request_id",
  "request_class",
  "source_type",
  "model_id",
  "provider_kind",
  "provider_family",
  "vendor_id",
  "provider_id",
  "provider_account_id",
  "selected_model_id",
  "endpoint_kind",
  "serving_source",
  "region",
  "lifecycle_state_at_request",
  "health_status_at_request",
  "requested_model_id",
  "difficulty_bucket",
  "routing_mode",
  "requested_role_id",
  "selected_strategy",
  "request_operation",
  "source_client",
  "execution_family",
  "adapter_family",
  "status_family",
  "request_payload_bytes",
  "ingress_payload_bytes",
  "translated_payload_bytes",
  "provider_canonical_payload_bytes",
  "provider_wire_payload_bytes",
  "response_payload_bytes",
  "retry_count",
  "reroute_count",
  "cooldown_decision",
  "idempotency_decision",
  "tool_side_effect_state",
  "tooling_used",
  "cache_state",
  "role_ids_json",
  "eligible_endpoint_ids_json",
  "eligible_model_ids_json",
  "candidate_cost_snapshot_json",
  "selected_pricing_snapshot_json",
  "input_tokens",
  "output_tokens",
  "total_tokens",
  "latency_ms",
  "error_class",
  "status_code",
  "finish_reason",
  "prompt_cache_requested",
  "prompt_cache_supported",
  "prompt_cache_used",
  "cache_read_tokens",
  "cache_read_tokens_supported",
  "cache_write_tokens",
  "cache_write_tokens_supported",
  "stream_text_delta_count",
  "stream_text_supported",
  "stream_tool_call_delta_count",
  "stream_tool_call_supported",
  "stream_tool_argument_delta_count",
  "stream_tool_argument_supported",
  "tool_call_count",
  "tool_execution_count",
  "cost_provenance",
  "actual_cost_usd",
  "estimated_cost_usd",
  "effective_cost_usd",
  "selected_uncached_cost_usd",
  "baseline_max_eligible_cost_usd",
  "routing_cost_savings_usd",
  "cache_cost_savings_usd",
  "total_avoided_cost_usd",
  "cost_calculation_basis",
  "cost_calculation_version",
  "cost_baseline_source",
  "cost_savings_support",
  "sampling_rate",
  "retention_ttl_hours",
  "retain_until_ms",
  "redaction_level",
  "retention_class",
  "structured_inspection_mode",
  "raw_capture_available",
  "structured_inspection_available",
  "taxonomy_group_id",
  "taxonomy_role_id",
  "taxonomy_task_type",
  "taxonomy_task_variant",
  "taxonomy_capability_ids_json",
  "taxonomy_modality_ids_json",
  "taxonomy_tool_class_ids_json",
  "currency",
  "dimensions_json",
] as const;
const DIFFICULTY_BUCKETS = ["easy", "medium", "hard"] as const;
const SQLITE_BUSY_TIMEOUT_MS = 5_000;
const SQLITE_BUSY_RETRY_DELAY_MS = 100;
const SQLITE_BUSY_MAX_ATTEMPTS = 3;
const MAINTENANCE_DEFAULTS = [
  { key: "backup.policy", value: "wal-copy-on-demand" },
  { key: "deletion.policy", value: "explicit-export-delete" },
  { key: "redaction.level", value: "strict" },
  { key: "retention.class", value: "standard" },
] as const;

function openSqliteDatabase(databasePath: string): DatabaseSync {
  const database = new DatabaseSync(databasePath);
  database.exec(`PRAGMA busy_timeout = ${SQLITE_BUSY_TIMEOUT_MS}`);
  return database;
}

function isSqliteBusyError(error: unknown): boolean {
  return error instanceof Error && /database is locked|SQLITE_BUSY/i.test(error.message);
}

function sleepSync(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function withSqliteBusyRetry<T>(databasePath: string, operation: (database: DatabaseSync) => T): T {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= SQLITE_BUSY_MAX_ATTEMPTS; attempt += 1) {
    const database = openSqliteDatabase(databasePath);
    try {
      const result = operation(database);
      database.close();
      return result;
    } catch (error) {
      lastError = error;
      try {
        database.close();
      } catch {
        // Ignore close failures while retrying the original busy error.
      }
      if (!isSqliteBusyError(error) || attempt >= SQLITE_BUSY_MAX_ATTEMPTS) {
        throw error;
      }
      sleepSync(SQLITE_BUSY_RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("sqlite write failed");
}

function isRuntimeTelemetryDifficultyBucket(
  value: string | null | undefined,
): value is RuntimeTelemetryRecord["difficultyBucket"] {
  return value === "easy" || value === "medium" || value === "hard";
}

function isRuntimeTelemetryRoutingMode(
  value: string | null | undefined,
): value is RuntimeTelemetryRecord["routingMode"] {
  return (
    value === "baseline" || value === "difficulty" || value === "controller" || value === "hybrid"
  );
}

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
  retain_until_ms INTEGER,
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
CREATE TABLE IF NOT EXISTS difficulty_classification_cache (
  conversation_id TEXT PRIMARY KEY,
  cache_json TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS observed_performance_samples_by_difficulty (
  sample_id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  difficulty_bucket TEXT NOT NULL,
  request_id TEXT,
  routing_decision_id TEXT,
  source_type TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  sample_json TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS observed_profile_snapshots_by_difficulty (
  snapshot_id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  difficulty_bucket TEXT NOT NULL,
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
  client_request_id TEXT,
  request_class TEXT,
  source_type TEXT,
  model_id TEXT,
  provider_kind TEXT,
  provider_family TEXT,
  vendor_id TEXT,
  provider_id TEXT,
  provider_account_id TEXT,
  selected_model_id TEXT,
  endpoint_kind TEXT,
  serving_source TEXT,
  region TEXT,
  lifecycle_state_at_request TEXT,
  health_status_at_request TEXT,
  requested_model_id TEXT,
  difficulty_bucket TEXT,
  routing_mode TEXT,
  requested_role_id TEXT,
  selected_strategy TEXT,
  request_operation TEXT,
  source_client TEXT,
  execution_family TEXT,
  adapter_family TEXT,
  status_family TEXT,
  request_payload_bytes INTEGER,
  ingress_payload_bytes INTEGER,
  translated_payload_bytes INTEGER,
  provider_canonical_payload_bytes INTEGER,
  provider_wire_payload_bytes INTEGER,
  response_payload_bytes INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,
  reroute_count INTEGER NOT NULL DEFAULT 0,
  cooldown_decision TEXT,
  idempotency_decision TEXT,
  tool_side_effect_state TEXT,
  tooling_used INTEGER NOT NULL DEFAULT 0,
  cache_state TEXT,
  role_ids_json TEXT NOT NULL DEFAULT '[]',
  eligible_endpoint_ids_json TEXT NOT NULL DEFAULT '[]',
  eligible_model_ids_json TEXT NOT NULL DEFAULT '[]',
  candidate_cost_snapshot_json TEXT,
  selected_pricing_snapshot_json TEXT,
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
  effective_cost_usd REAL NOT NULL DEFAULT 0,
  selected_uncached_cost_usd REAL,
  baseline_max_eligible_cost_usd REAL,
  routing_cost_savings_usd REAL NOT NULL DEFAULT 0,
  cache_cost_savings_usd REAL NOT NULL DEFAULT 0,
  total_avoided_cost_usd REAL NOT NULL DEFAULT 0,
  cost_calculation_basis TEXT NOT NULL DEFAULT 'unavailable',
  cost_calculation_version TEXT NOT NULL DEFAULT 'run49.v1',
  cost_baseline_source TEXT,
  cost_savings_support TEXT,
  sampling_rate REAL,
  retention_ttl_hours INTEGER,
  retain_until_ms INTEGER,
  redaction_level TEXT,
  retention_class TEXT,
  structured_inspection_mode TEXT,
  raw_capture_available INTEGER NOT NULL DEFAULT 0,
  structured_inspection_available INTEGER NOT NULL DEFAULT 0,
  taxonomy_group_id TEXT,
  taxonomy_role_id TEXT,
  taxonomy_task_type TEXT,
  taxonomy_task_variant TEXT,
  taxonomy_capability_ids_json TEXT,
  taxonomy_modality_ids_json TEXT,
  taxonomy_tool_class_ids_json TEXT,
  currency TEXT,
  dimensions_json TEXT
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
  readonly artifactRef?: import("./legacy-migration.js").GraphArtifactReference;
}

export interface ReadRuntimeObservationBundleInput {
  readonly databasePath: string;
  readonly requestId: string;
}

export interface ReadObservedPerformanceSamplesInput {
  readonly databasePath: string;
  readonly endpointId: string;
  readonly difficultyBucket?: "easy" | "medium" | "hard";
}

export interface ReadLatestObservedProfileInput {
  readonly databasePath: string;
  readonly endpointId: string;
  readonly difficultyBucket?: "easy" | "medium" | "hard";
}

export interface ReadLatestObservedProfilesByEndpointIdsInput {
  readonly databasePath: string;
  readonly endpointIds: readonly string[];
  readonly difficultyBucket?: "easy" | "medium" | "hard";
}

export interface AdvisoryMaxDifficultyThresholds {
  readonly minSamples: number;
  readonly maxFailureRate: number;
  readonly minQualityScore: number;
  readonly minTokensPerSec: number;
}

export type AdvisoryMaxDifficultyRejectionReason =
  | "no-profile"
  | "min-samples"
  | "max-failure-rate"
  | "min-quality-score"
  | "min-tokens-per-sec";

export interface AdvisoryMaxDifficultyEvaluation {
  readonly eligible: boolean;
  readonly rejectionReasons: readonly AdvisoryMaxDifficultyRejectionReason[];
  readonly profile: ObservedPerformanceProfile | null;
}

export interface ReadAdvisoryMaxDifficultyRecommendationInput {
  readonly databasePath: string;
  readonly endpointId: string;
  readonly thresholds: AdvisoryMaxDifficultyThresholds;
}

export interface AdvisoryMaxDifficultyRecommendation {
  readonly recommendedMaxDifficulty: "easy" | "medium" | "hard" | null;
  readonly thresholds: AdvisoryMaxDifficultyThresholds;
  readonly evaluations: Record<"easy" | "medium" | "hard", AdvisoryMaxDifficultyEvaluation>;
}

export interface DifficultyClassificationCacheRecord {
  readonly conversationId: string;
  readonly difficulty: "easy" | "medium" | "hard";
  readonly fallbackApplied: boolean;
  readonly fallbackReason?: string;
  readonly cachedAtMs: number;
  readonly expiresAtMs: number;
  readonly rubricSignals: {
    readonly contextTokens: number;
    readonly toolCount: number;
    readonly historyTurnCount: number;
    readonly instructionConstraintCount: number;
    readonly decompositionKeywordCount: number;
    readonly codeOrSchemaBurden: boolean;
  };
}

export interface UpsertDifficultyClassificationCacheInput {
  readonly databasePath: string;
  readonly cache: DifficultyClassificationCacheRecord;
}

export interface ReadDifficultyClassificationCacheInput {
  readonly databasePath: string;
  readonly conversationId: string;
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

export interface ListProviderDeviceAuthSessionsInput {
  readonly databasePath: string;
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

export interface DeleteRuntimeControllerAssignmentInput {
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
  readonly clientRequestId?: string | null;
  readonly routingDecisionId: string;
  readonly endpointId: string;
  readonly createdAtMs: number;
}

export interface ListRecentRuntimeObservationsInput {
  readonly databasePath: string;
  readonly limit?: number;
}

export interface ListRecentRuntimeRequestIdsInput {
  readonly databasePath: string;
  readonly limit?: number;
}

export interface RuntimeTelemetryRecord {
  readonly requestId: string;
  readonly routingDecisionId: string;
  readonly endpointId: string;
  readonly conversationId: string;
  readonly createdAtMs: number;
  readonly clientRequestId: string | null;
  readonly requestClass: "benchmark" | "live_request" | "unknown" | null;
  readonly sourceType: "local" | "remote" | null;
  readonly modelId: string | null;
  readonly providerKind: string | null;
  readonly providerFamily: string | null;
  readonly vendorId: string | null;
  readonly providerId: string | null;
  readonly providerAccountId: string | null;
  readonly selectedModelId: string | null;
  readonly endpointKind: string | null;
  readonly servingSource: string | null;
  readonly region: string | null;
  readonly lifecycleStateAtRequest: string | null;
  readonly healthStatusAtRequest: string | null;
  readonly requestedModelId: string | null;
  readonly difficultyBucket: "easy" | "medium" | "hard" | null;
  readonly routingMode: "baseline" | "difficulty" | "controller" | "hybrid" | null;
  readonly requestedRoleId: string | null;
  readonly selectedStrategy: string | null;
  readonly requestOperation: string | null;
  readonly sourceClient: string | null;
  readonly executionFamily: string | null;
  readonly adapterFamily: string | null;
  readonly statusFamily: "success" | "failure" | "unknown" | null;
  readonly requestPayloadBytes: number | null;
  readonly ingressPayloadBytes: number | null;
  readonly translatedPayloadBytes: number | null;
  readonly providerCanonicalPayloadBytes: number | null;
  readonly providerWirePayloadBytes: number | null;
  readonly responsePayloadBytes: number | null;
  readonly retryCount: number;
  readonly rerouteCount: number;
  readonly cooldownDecision: string | null;
  readonly idempotencyDecision: string | null;
  readonly toolSideEffectState: string | null;
  readonly toolingUsed: boolean;
  readonly cacheState: string | null;
  readonly roleIds: readonly string[];
  readonly eligibleEndpointIds: readonly string[];
  readonly eligibleModelIds: readonly string[];
  readonly candidateCostSnapshot: Record<string, unknown> | null;
  readonly selectedPricingSnapshot: Record<string, unknown> | null;
  readonly inputTokens: number;
  readonly inputTokensSource: "measured" | "normalized" | "estimated" | "unavailable";
  readonly inputTokensAvailable: boolean;
  readonly outputTokens: number;
  readonly outputTokensSource: "measured" | "normalized" | "estimated" | "unavailable";
  readonly outputTokensAvailable: boolean;
  readonly totalTokens: number;
  readonly latencyMs: number | null;
  readonly errorClass: string | null;
  readonly statusCode: number | null;
  readonly finishReason: string | null;
  readonly promptCacheRequested: boolean;
  readonly promptCacheRequestSource: "explicit" | "synthesized" | null;
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
  readonly effectiveCostUsd: number;
  readonly selectedUncachedCostUsd: number | null;
  readonly baselineMaxEligibleCostUsd: number | null;
  readonly routingCostSavingsUsd: number;
  readonly cacheCostSavingsUsd: number;
  readonly totalAvoidedCostUsd: number;
  readonly costCalculationBasis:
    | "actual_vendor_cost"
    | "estimated_vendor_cost"
    | "no_execution_zero"
    | "unavailable";
  readonly costCalculationVersion: string;
  readonly costBaselineSource: string | null;
  readonly costSavingsSupport: string | null;
  readonly samplingRate: number | null;
  readonly retentionTtlHours: number | null;
  readonly retainUntil: number | null;
  readonly redactionLevel: string | null;
  readonly retentionClass: string | null;
  readonly structuredInspectionMode: string | null;
  readonly rawCaptureAvailable: boolean;
  readonly structuredInspectionAvailable: boolean;
  readonly taxonomyGroupId: string | null;
  readonly taxonomyRoleId: string | null;
  readonly taxonomyTaskType: string | null;
  readonly taxonomyTaskVariant: string | null;
  readonly taxonomyCapabilityIds: readonly string[];
  readonly taxonomyModalityIds: readonly string[];
  readonly taxonomyToolClassIds: readonly string[];
  readonly currency: string | null;
  readonly dimensions: Record<string, unknown> | null;
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
  readonly totalEffectiveCostUsd: number;
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
  readonly startAtMs?: number;
}

export interface PersistedRuntimeObservationBundle {
  readonly requestId: string;
  readonly clientRequestId?: string | null;
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
    readonly tokens_in_source?: "measured" | "normalized" | "estimated" | "unavailable";
    readonly tokens_in_available?: boolean;
    readonly tokens_out?: number;
    readonly tokens_out_source?: "measured" | "normalized" | "estimated" | "unavailable";
    readonly tokens_out_available?: boolean;
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
    readonly promptCacheRequestSource?: "explicit" | "synthesized";
    readonly promptCacheUsed?: boolean;
    readonly cacheReadTokens?: number;
    readonly cacheWriteTokens?: number;
  };
  readonly executionTelemetry?: {
    readonly providerFamily?: string;
    readonly vendorId?: string;
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
  readonly routingDiagnostics?: {
    readonly routingMode?: {
      readonly effectiveMode?: string | null;
    };
    readonly rolePolicy?: {
      readonly requestedRoleId?: string | null;
    };
    readonly controllerRouting?: {
      readonly acceptedDirectives?: {
        readonly strategy?: string | null;
        readonly requestedRoleId?: string | null;
      };
    };
    readonly hybridArbitration?: {
      readonly finalStrategy?: string | null;
    };
    readonly difficultyRouting?: {
      readonly difficulty?: string | null;
      readonly strategy?: string | null;
    };
  };
  readonly tooling?: {
    readonly toolCalls?: readonly unknown[];
    readonly executions?: readonly unknown[];
  };
  readonly executionSemantics?: {
    readonly sourceClient?: string;
    readonly executionFamily?: string;
    readonly adapterFamily?: string;
    readonly payloadBytes?: {
      readonly ingress?: number;
      readonly translated?: number;
      readonly providerCanonical?: number;
      readonly providerWire?: number;
      readonly providerResponse?: number;
    };
    readonly retryCount?: number;
    readonly rerouteCount?: number;
    readonly cooldownDecision?: string;
    readonly idempotencyDecision?: string;
    readonly toolSideEffectState?: string;
  };
  readonly telemetrySnapshot?: {
    readonly providerId: string | null;
    readonly providerAccountId: string | null;
    readonly sourceType: "local" | "remote";
    readonly endpointKind: string;
    readonly servingSource: string;
    readonly region: string | null;
    readonly lifecycleStateAtRequest: string;
    readonly healthStatusAtRequest: string | null;
    readonly requestedModelId: string | null;
    readonly selectedModelId?: string | null;
    readonly requestOperation: string;
    readonly roleIds: readonly string[];
    readonly toolingUsed: boolean;
    readonly cacheState: string;
    readonly eligibleEndpointIds: readonly string[];
    readonly eligibleModelIds: readonly string[];
    readonly candidateCostSnapshot: Record<string, unknown>;
    readonly selectedPricingSnapshot: Record<string, unknown> | null;
    readonly selectedUncachedCostUsd: number | null;
    readonly baselineMaxEligibleCostUsd: number | null;
    readonly routingCostSavingsUsd: number;
    readonly cacheCostSavingsUsd: number;
    readonly totalAvoidedCostUsd: number;
    readonly costBaselineSource: string | null;
    readonly costSavingsSupport: string | null;
    readonly dimensions?: Record<string, unknown>;
  };
  readonly inspection?: {
    readonly request?: {
      readonly responseCapture?: {
        readonly statusCode?: number;
      };
    };
  };
  readonly capturePolicy?: {
    readonly environment?: string;
    readonly redactionLevel?: string;
    readonly retentionClass?: string;
    readonly structuredInspectionMode?: string;
    readonly rawCaptureAvailable?: boolean;
    readonly structuredInspectionAvailable?: boolean;
    readonly redactedFields?: readonly string[];
    readonly suppressedFields?: readonly string[];
  };
  readonly privacyReceipt?: {
    readonly samplingRate?: number;
    readonly retentionTtlHours?: number;
    readonly retainUntil?: number;
  };
  readonly taxonomyDimensions?: {
    readonly taxonomy_group_id?: unknown;
    readonly taxonomy_role_id?: unknown;
    readonly taxonomy_task_type?: unknown;
    readonly taxonomy_task_variant?: unknown;
    readonly taxonomy_capability_ids?: unknown;
    readonly taxonomy_modality_ids?: unknown;
    readonly taxonomy_tool_class_ids?: unknown;
  };
}

function ensureNonEmpty(value: string, label: string): string {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function hasMigrationReceipt(database: DatabaseSync, migrationId: string): boolean {
  const row = database
    .prepare("SELECT migration_id FROM migration_receipts WHERE migration_id = ? AND status = ?")
    .get(migrationId, "applied") as { migration_id?: string } | undefined;
  return row?.migration_id === migrationId;
}

function recordMigrationReceipt(database: DatabaseSync, migrationId: string): void {
  database
    .prepare(
      "INSERT OR REPLACE INTO migration_receipts (migration_id, schema_version, applied_at_ms, status) VALUES (?, ?, ?, ?)",
    )
    .run(migrationId, CURRENT_SCHEMA_VERSION, Date.now(), "applied");
}

function runOnceMigration(
  database: DatabaseSync,
  migrationId: string,
  shouldRunMigration: boolean,
  migrate: () => void,
): void {
  if (hasMigrationReceipt(database, migrationId)) {
    return;
  }
  if (shouldRunMigration) {
    migrate();
  }
  recordMigrationReceipt(database, migrationId);
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
    database.exec(
      "ALTER TABLE provider_accounts ADD COLUMN model_role_bindings_json TEXT NOT NULL DEFAULT '[]'",
    );
  }
  const observationColumns = new Set(
    (
      database.prepare("PRAGMA table_info(runtime_observations)").all() as Array<{
        name: string;
      }>
    ).map((row) => row.name),
  );
  if (!observationColumns.has("retain_until_ms")) {
    database.exec("ALTER TABLE runtime_observations ADD COLUMN retain_until_ms INTEGER");
  }
  database.exec(
    "CREATE INDEX IF NOT EXISTS idx_obs_retain_until ON runtime_observations(retain_until_ms)",
  );
  // R-PERF1: Add metadata columns to avoid JSON parsing on every telemetry query
  let addedObservationMetadataColumn = false;
  for (const [colName, colType] of [
    ["taxonomy_role_id", "TEXT"],
    ["taxonomy_task_type", "TEXT"],
    ["client_request_id", "TEXT"],
    ["request_class", "TEXT"],
  ] as const) {
    if (!observationColumns.has(colName)) {
      database.exec(`ALTER TABLE runtime_observations ADD COLUMN ${colName} ${colType}`);
      addedObservationMetadataColumn = true;
    }
  }
  runOnceMigration(
    database,
    OBSERVATION_METADATA_BACKFILL_MIGRATION_ID,
    addedObservationMetadataColumn,
    () =>
      database.exec(
        `UPDATE runtime_observations SET
          client_request_id = COALESCE(client_request_id, json_extract(observation_json, '$.clientRequestId')),
          request_class = COALESCE(request_class, CASE
            WHEN json_extract(observation_json, '$.observedPerformance.sample.source_type') = 'benchmark' THEN 'benchmark'
            WHEN json_extract(observation_json, '$.observedPerformance.sample.source_type') = 'live_request' THEN 'live_request'
            ELSE NULL END),
          taxonomy_role_id = COALESCE(taxonomy_role_id, json_extract(observation_json, '$.taxonomyDimensions.taxonomy_role_id')),
          taxonomy_task_type = COALESCE(taxonomy_task_type, json_extract(observation_json, '$.taxonomyDimensions.taxonomy_task_type'))
        WHERE client_request_id IS NULL
          OR request_class IS NULL
          OR taxonomy_role_id IS NULL
          OR taxonomy_task_type IS NULL`,
      ),
  );
  runOnceMigration(database, RECENT_OBSERVATIONS_INDEX_MIGRATION_ID, true, () =>
    database.exec(
      "CREATE INDEX IF NOT EXISTS runtime_observations_created_at_idx ON runtime_observations (created_at_ms DESC, request_id DESC)",
    ),
  );
  runOnceMigration(database, OBSERVED_PROFILE_INDEXES_MIGRATION_ID, true, () =>
    database.exec(`
      CREATE INDEX IF NOT EXISTS observed_performance_samples_endpoint_time_idx
        ON observed_performance_samples (endpoint_id, timestamp_ms ASC, sample_id ASC);
      CREATE INDEX IF NOT EXISTS observed_performance_samples_difficulty_time_idx
        ON observed_performance_samples_by_difficulty (endpoint_id, difficulty_bucket, timestamp_ms ASC, sample_id ASC);
      CREATE INDEX IF NOT EXISTS observed_profile_snapshots_endpoint_time_idx
        ON observed_profile_snapshots (endpoint_id, measured_at_ms DESC, snapshot_id DESC);
      CREATE INDEX IF NOT EXISTS observed_profile_snapshots_difficulty_time_idx
        ON observed_profile_snapshots_by_difficulty (endpoint_id, difficulty_bucket, measured_at_ms DESC, snapshot_id DESC);
    `),
  );
  const runtimeTelemetryColumns = new Set(
    (
      database.prepare("PRAGMA table_info(runtime_telemetry_records)").all() as Array<{
        name: string;
      }>
    ).map((row) => row.name),
  );
  const telemetryColumnDefinitions = [
    "client_request_id TEXT",
    "request_class TEXT",
    "source_type TEXT",
    "provider_family TEXT",
    "vendor_id TEXT",
    "provider_id TEXT",
    "provider_account_id TEXT",
    "selected_model_id TEXT",
    "endpoint_kind TEXT",
    "serving_source TEXT",
    "region TEXT",
    "lifecycle_state_at_request TEXT",
    "health_status_at_request TEXT",
    "requested_model_id TEXT",
    "difficulty_bucket TEXT",
    "routing_mode TEXT",
    "requested_role_id TEXT",
    "selected_strategy TEXT",
    "request_operation TEXT",
    "source_client TEXT",
    "execution_family TEXT",
    "adapter_family TEXT",
    "status_family TEXT",
    "request_payload_bytes INTEGER",
    "ingress_payload_bytes INTEGER",
    "translated_payload_bytes INTEGER",
    "provider_canonical_payload_bytes INTEGER",
    "provider_wire_payload_bytes INTEGER",
    "response_payload_bytes INTEGER",
    "retry_count INTEGER NOT NULL DEFAULT 0",
    "reroute_count INTEGER NOT NULL DEFAULT 0",
    "cooldown_decision TEXT",
    "idempotency_decision TEXT",
    "tool_side_effect_state TEXT",
    "tooling_used INTEGER NOT NULL DEFAULT 0",
    "cache_state TEXT",
    "role_ids_json TEXT NOT NULL DEFAULT '[]'",
    "eligible_endpoint_ids_json TEXT NOT NULL DEFAULT '[]'",
    "eligible_model_ids_json TEXT NOT NULL DEFAULT '[]'",
    "candidate_cost_snapshot_json TEXT",
    "selected_pricing_snapshot_json TEXT",
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
    "effective_cost_usd REAL NOT NULL DEFAULT 0",
    "selected_uncached_cost_usd REAL",
    "baseline_max_eligible_cost_usd REAL",
    "routing_cost_savings_usd REAL NOT NULL DEFAULT 0",
    "cache_cost_savings_usd REAL NOT NULL DEFAULT 0",
    "total_avoided_cost_usd REAL NOT NULL DEFAULT 0",
    "cost_calculation_basis TEXT NOT NULL DEFAULT 'unavailable'",
    `cost_calculation_version TEXT NOT NULL DEFAULT '${COST_CALCULATION_VERSION}'`,
    "cost_baseline_source TEXT",
    "cost_savings_support TEXT",
    "sampling_rate REAL",
    "retention_ttl_hours INTEGER",
    "retain_until_ms INTEGER",
    "redaction_level TEXT",
    "retention_class TEXT",
    "structured_inspection_mode TEXT",
    "raw_capture_available INTEGER NOT NULL DEFAULT 0",
    "structured_inspection_available INTEGER NOT NULL DEFAULT 0",
    "taxonomy_group_id TEXT",
    "taxonomy_role_id TEXT",
    "taxonomy_task_type TEXT",
    "taxonomy_task_variant TEXT",
    "taxonomy_capability_ids_json TEXT",
    "taxonomy_modality_ids_json TEXT",
    "taxonomy_tool_class_ids_json TEXT",
    "dimensions_json TEXT",
  ] as const;
  let addedRuntimeTelemetryMetadataColumn = false;
  for (const definition of telemetryColumnDefinitions) {
    const [columnName] = definition.split(" ");
    if (!runtimeTelemetryColumns.has(columnName)) {
      database.exec(`ALTER TABLE runtime_telemetry_records ADD COLUMN ${definition}`);
      addedRuntimeTelemetryMetadataColumn = true;
    }
  }
  runOnceMigration(
    database,
    TELEMETRY_METADATA_BACKFILL_MIGRATION_ID,
    addedRuntimeTelemetryMetadataColumn,
    () =>
      database.exec(
        `UPDATE runtime_telemetry_records SET
          client_request_id = COALESCE(
            client_request_id,
            (SELECT client_request_id FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          request_class = COALESCE(
            request_class,
            (SELECT request_class FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          source_client = COALESCE(
            source_client,
            (SELECT json_extract(observation_json, '$.executionSemantics.sourceClient') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          vendor_id = COALESCE(
            vendor_id,
            (SELECT json_extract(observation_json, '$.executionTelemetry.vendorId') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          execution_family = COALESCE(
            execution_family,
            (SELECT json_extract(observation_json, '$.executionSemantics.executionFamily') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          adapter_family = COALESCE(
            adapter_family,
            (SELECT json_extract(observation_json, '$.executionSemantics.adapterFamily') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          request_payload_bytes = COALESCE(
            request_payload_bytes,
            (SELECT json_extract(observation_json, '$.executionSemantics.payloadBytes.providerCanonical') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          ingress_payload_bytes = COALESCE(
            ingress_payload_bytes,
            (SELECT json_extract(observation_json, '$.executionSemantics.payloadBytes.ingress') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          translated_payload_bytes = COALESCE(
            translated_payload_bytes,
            (SELECT json_extract(observation_json, '$.executionSemantics.payloadBytes.translated') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          provider_canonical_payload_bytes = COALESCE(
            provider_canonical_payload_bytes,
            (SELECT json_extract(observation_json, '$.executionSemantics.payloadBytes.providerCanonical') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          provider_wire_payload_bytes = COALESCE(
            provider_wire_payload_bytes,
            (SELECT json_extract(observation_json, '$.executionSemantics.payloadBytes.providerWire') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          response_payload_bytes = COALESCE(
            response_payload_bytes,
            (SELECT json_extract(observation_json, '$.executionSemantics.payloadBytes.providerResponse') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          cooldown_decision = COALESCE(
            cooldown_decision,
            (SELECT json_extract(observation_json, '$.executionSemantics.cooldownDecision') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          idempotency_decision = COALESCE(
            idempotency_decision,
            (SELECT json_extract(observation_json, '$.executionSemantics.idempotencyDecision') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          tool_side_effect_state = COALESCE(
            tool_side_effect_state,
            (SELECT json_extract(observation_json, '$.executionSemantics.toolSideEffectState') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          taxonomy_group_id = COALESCE(
            taxonomy_group_id,
            (SELECT json_extract(observation_json, '$.taxonomyDimensions.taxonomy_group_id') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          taxonomy_role_id = COALESCE(
            taxonomy_role_id,
            (SELECT taxonomy_role_id FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          taxonomy_task_type = COALESCE(
            taxonomy_task_type,
            (SELECT taxonomy_task_type FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          taxonomy_task_variant = COALESCE(
            taxonomy_task_variant,
            (SELECT json_extract(observation_json, '$.taxonomyDimensions.taxonomy_task_variant') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          taxonomy_capability_ids_json = COALESCE(
            taxonomy_capability_ids_json,
            (SELECT json_extract(observation_json, '$.taxonomyDimensions.taxonomy_capability_ids') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          taxonomy_modality_ids_json = COALESCE(
            taxonomy_modality_ids_json,
            (SELECT json_extract(observation_json, '$.taxonomyDimensions.taxonomy_modality_ids') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          ),
          taxonomy_tool_class_ids_json = COALESCE(
            taxonomy_tool_class_ids_json,
            (SELECT json_extract(observation_json, '$.taxonomyDimensions.taxonomy_tool_class_ids') FROM runtime_observations WHERE request_id = runtime_telemetry_records.request_id)
          )
        WHERE client_request_id IS NULL
          OR request_class IS NULL
          OR source_client IS NULL
          OR vendor_id IS NULL
          OR execution_family IS NULL
          OR adapter_family IS NULL
          OR request_payload_bytes IS NULL
          OR ingress_payload_bytes IS NULL
          OR translated_payload_bytes IS NULL
          OR provider_canonical_payload_bytes IS NULL
          OR provider_wire_payload_bytes IS NULL
          OR response_payload_bytes IS NULL
          OR cooldown_decision IS NULL
          OR idempotency_decision IS NULL
          OR tool_side_effect_state IS NULL
          OR taxonomy_group_id IS NULL
          OR taxonomy_role_id IS NULL
          OR taxonomy_task_type IS NULL
          OR taxonomy_task_variant IS NULL
          OR taxonomy_capability_ids_json IS NULL
          OR taxonomy_modality_ids_json IS NULL
          OR taxonomy_tool_class_ids_json IS NULL`,
      ),
  );
}

function seedMaintenanceDefaults(database: DatabaseSync, nowMs: number): void {
  const statement = database.prepare(
    "INSERT OR REPLACE INTO memory_maintenance (maintenance_key, maintenance_value, updated_at_ms) VALUES (?, ?, ?)",
  );
  for (const entry of MAINTENANCE_DEFAULTS) {
    statement.run(entry.key, entry.value, nowMs);
  }
}

function mapProviderAccountRow(row: {
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
}): ProviderAccountRecord {
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
    modelRoleBindings: JSON.parse(
      row.model_role_bindings_json,
    ) as ProviderAccountRecord["modelRoleBindings"],
    deniedModels: JSON.parse(row.denied_models_json) as string[],
    entitlementTags: JSON.parse(row.entitlement_tags_json) as string[],
    budgetPolicyRef: row.budget_policy_ref,
    quotaPolicyRef: row.quota_policy_ref,
    status: row.status as ProviderAccountRecord["status"],
    healthStatus: row.health_status as ProviderAccountRecord["healthStatus"],
    rotationState: row.rotation_state as ProviderAccountRecord["rotationState"],
  };
}

function mapRuntimeEndpointRow(row: {
  endpoint_id: string;
  provider_account_id: string;
  model_id: string;
  region: string;
  endpoint_kind: string;
  serving_source: string;
  lifecycle_state: string;
  health_status: string;
}): RuntimeEndpointRecord {
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

function mapProviderDeviceAuthSessionRow(row: {
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
}): ProviderDeviceAuthSessionRecord {
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

function mapRuntimeControllerAssignmentRow(row: {
  scope: string;
  endpoint_id: string;
  model_id: string;
  source_type: string;
  updated_at_ms: number;
}): RuntimeControllerAssignmentRecord {
  return {
    scope: row.scope,
    endpointId: row.endpoint_id,
    modelId: row.model_id,
    sourceType: row.source_type,
    updatedAtMs: row.updated_at_ms,
  };
}

function mapObservedThroughputPenaltyStateRow(row: {
  endpoint_id: string;
  last_observed_tokens_per_sec: number;
  min_tokens_per_sec: number;
  penalty_factor: number;
  activated_at_ms: number;
  expires_at_ms: number;
  last_observation_measured_at_ms: number;
  updated_at_ms: number;
}): ObservedThroughputPenaltyStateRecord {
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

  const journalModeRow = database.prepare("PRAGMA journal_mode = WAL").get() as
    | { journal_mode?: string }
    | undefined;
  initializeSchema(database);
  seedMaintenanceDefaults(database, nowMs);

  const currentVersionRow = database
    .prepare("SELECT schema_version FROM schema_version ORDER BY schema_version DESC LIMIT 1")
    .get() as { schema_version?: number } | undefined;

  const appliedMigrations: string[] = [];
  if (!currentVersionRow) {
    database
      .prepare(
        "INSERT INTO schema_version (schema_version, migration_id, applied_at_ms) VALUES (?, ?, ?)",
      )
      .run(CURRENT_SCHEMA_VERSION, INITIAL_MIGRATION_ID, nowMs);
    database
      .prepare(
        "INSERT INTO migration_receipts (migration_id, schema_version, applied_at_ms, status) VALUES (?, ?, ?, ?)",
      )
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
  database
    .prepare(`
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
  `)
    .run(
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
  const rows = database
    .prepare(`
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

export function upsertRuntimeControllerAssignment(
  input: UpsertRuntimeControllerAssignmentInput,
): void {
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

export function deleteRuntimeControllerAssignment(
  input: DeleteRuntimeControllerAssignmentInput,
): void {
  const database = new DatabaseSync(input.databasePath);
  database.prepare("DELETE FROM runtime_controller_assignments WHERE scope = ?").run(input.scope);
  database.close();
}

export function upsertProviderDeviceAuthSession(input: UpsertProviderDeviceAuthSessionInput): void {
  const database = new DatabaseSync(input.databasePath);
  const nowMs = Date.now();
  database
    .prepare(`
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
  `)
    .run(
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
  const row = database
    .prepare(`
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

export function listProviderDeviceAuthSessions(
  input: ListProviderDeviceAuthSessionsInput,
): ProviderDeviceAuthSessionRecord[] {
  const database = new DatabaseSync(input.databasePath);
  const rows = database
    .prepare(`
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
      ORDER BY updated_at_ms DESC, auth_request_id DESC
    `)
    .all() as Array<{
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
  }>;
  database.close();

  return rows.map((row) => mapProviderDeviceAuthSessionRow(row));
}

export function persistContinuitySnapshot(input: PersistContinuitySnapshotInput): void {
  const database = new DatabaseSync(input.databasePath);
  database
    .prepare(
      "INSERT OR REPLACE INTO sessions (session_id, workspace_scope, created_at_ms, updated_at_ms) VALUES (?, ?, ?, ?)",
    )
    .run(
      input.session.sessionId,
      input.session.workspaceScope,
      input.session.createdAtMs,
      input.session.updatedAtMs,
    );
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
    turnStatement.run(
      turn.turnId,
      turn.conversationId,
      turn.role,
      turn.contentRef,
      turn.createdAtMs,
    );
  }

  const artifactStatement = database.prepare(
    "INSERT OR REPLACE INTO context_artifacts (artifact_id, artifact_kind, storage_ref, created_at_ms) VALUES (?, ?, ?, ?)",
  );
  for (const artifact of input.artifacts) {
    artifactStatement.run(
      artifact.artifactId,
      artifact.artifactKind,
      artifact.storageRef,
      artifact.createdAtMs,
    );
  }

  const linkStatement = database.prepare(
    "INSERT OR REPLACE INTO artifact_links (link_id, artifact_id, conversation_id, session_id, created_at_ms) VALUES (?, ?, ?, ?, ?)",
  );
  for (const link of input.artifactLinks) {
    linkStatement.run(
      link.linkId,
      link.artifactId,
      link.conversationId,
      link.sessionId,
      link.createdAtMs,
    );
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
    throw new Error(
      `Conversation ${input.conversationId} is not present in SQLite continuity state`,
    );
  }

  const session = database
    .prepare(
      "SELECT session_id, workspace_scope, created_at_ms, updated_at_ms FROM sessions WHERE session_id = ?",
    )
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

export function readRetrievalReceipts(
  input: ReadRetrievalReceiptsInput,
): readonly RetrievalReceiptRecord[] {
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

function segmentedSampleIdFor(sample: ObservedPerformanceSample): string {
  return `${sampleIdFor(sample)}:${sample.difficulty_bucket ?? "unknown"}`;
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

function mapRuntimeTelemetryRecord(row: {
  request_id: string;
  routing_decision_id: string;
  endpoint_id: string;
  conversation_id: string;
  created_at_ms: number;
  client_request_id: string | null;
  request_class: string | null;
  source_type: string | null;
  model_id: string | null;
  provider_kind: string | null;
  provider_family: string | null;
  vendor_id: string | null;
  provider_id: string | null;
  provider_account_id: string | null;
  selected_model_id: string | null;
  endpoint_kind: string | null;
  serving_source: string | null;
  region: string | null;
  lifecycle_state_at_request: string | null;
  health_status_at_request: string | null;
  requested_model_id: string | null;
  difficulty_bucket: string | null;
  routing_mode: string | null;
  requested_role_id: string | null;
  selected_strategy: string | null;
  request_operation: string | null;
  source_client: string | null;
  execution_family: string | null;
  adapter_family: string | null;
  status_family: string | null;
  request_payload_bytes: number | null;
  ingress_payload_bytes: number | null;
  translated_payload_bytes: number | null;
  provider_canonical_payload_bytes: number | null;
  provider_wire_payload_bytes: number | null;
  response_payload_bytes: number | null;
  retry_count: number;
  reroute_count: number;
  cooldown_decision: string | null;
  idempotency_decision: string | null;
  tool_side_effect_state: string | null;
  tooling_used: number;
  cache_state: string | null;
  role_ids_json: string | null;
  eligible_endpoint_ids_json: string | null;
  eligible_model_ids_json: string | null;
  candidate_cost_snapshot_json: string | null;
  selected_pricing_snapshot_json: string | null;
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
  effective_cost_usd: number;
  selected_uncached_cost_usd: number | null;
  baseline_max_eligible_cost_usd: number | null;
  routing_cost_savings_usd: number;
  cache_cost_savings_usd: number;
  total_avoided_cost_usd: number;
  cost_calculation_basis: string;
  cost_calculation_version: string | null;
  cost_baseline_source: string | null;
  cost_savings_support: string | null;
  sampling_rate: number | null;
  retention_ttl_hours: number | null;
  retain_until_ms: number | null;
  redaction_level: string | null;
  retention_class: string | null;
  structured_inspection_mode: string | null;
  raw_capture_available: number;
  structured_inspection_available: number;
  taxonomy_group_id: string | null;
  taxonomy_role_id: string | null;
  taxonomy_task_type: string | null;
  taxonomy_task_variant: string | null;
  taxonomy_capability_ids_json: string | null;
  taxonomy_modality_ids_json: string | null;
  taxonomy_tool_class_ids_json: string | null;
  currency: string | null;
  dimensions_json: string | null;
}): RuntimeTelemetryRecord {
  const parseStringList = (value: string | null): readonly string[] =>
    value
      ? (JSON.parse(value) as unknown[]).filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [];
  const dimensions = row.dimensions_json
    ? (JSON.parse(row.dimensions_json) as Record<string, unknown>)
    : null;
  const usageTokenTruth =
    dimensions?.usageTokenTruth &&
    typeof dimensions.usageTokenTruth === "object" &&
    !Array.isArray(dimensions.usageTokenTruth)
      ? (dimensions.usageTokenTruth as Record<string, unknown>)
      : null;
  const readTokenSource = (value: unknown): RuntimeTelemetryRecord["inputTokensSource"] =>
    value === "measured" ||
    value === "normalized" ||
    value === "estimated" ||
    value === "unavailable"
      ? value
      : "unavailable";
  const inputTokensSource = readTokenSource(usageTokenTruth?.inputSource);
  const outputTokensSource = readTokenSource(usageTokenTruth?.outputSource);
  const promptCacheRequestSource =
    dimensions?.promptCacheRequestSource === "explicit" ||
    dimensions?.promptCacheRequestSource === "synthesized"
      ? dimensions.promptCacheRequestSource
      : null;
  return {
    requestId: row.request_id,
    routingDecisionId: row.routing_decision_id,
    endpointId: row.endpoint_id,
    conversationId: row.conversation_id,
    createdAtMs: row.created_at_ms,
    clientRequestId: row.client_request_id,
    requestClass:
      row.request_class === "benchmark" ||
      row.request_class === "live_request" ||
      row.request_class === "unknown"
        ? row.request_class
        : null,
    sourceType:
      row.source_type === "local" || row.source_type === "remote" ? row.source_type : null,
    modelId: row.model_id,
    providerKind: row.provider_kind,
    providerFamily: row.provider_family,
    vendorId: row.vendor_id,
    providerId: row.provider_id,
    providerAccountId: row.provider_account_id,
    selectedModelId: row.selected_model_id,
    endpointKind: row.endpoint_kind,
    servingSource: row.serving_source,
    region: row.region,
    lifecycleStateAtRequest: row.lifecycle_state_at_request,
    healthStatusAtRequest: row.health_status_at_request,
    requestedModelId: row.requested_model_id,
    difficultyBucket:
      row.difficulty_bucket === "easy" ||
      row.difficulty_bucket === "medium" ||
      row.difficulty_bucket === "hard"
        ? row.difficulty_bucket
        : null,
    routingMode:
      row.routing_mode === "baseline" ||
      row.routing_mode === "difficulty" ||
      row.routing_mode === "controller" ||
      row.routing_mode === "hybrid"
        ? row.routing_mode
        : null,
    requestedRoleId: row.requested_role_id,
    selectedStrategy: row.selected_strategy,
    requestOperation: row.request_operation,
    sourceClient: row.source_client,
    executionFamily: row.execution_family,
    adapterFamily: row.adapter_family,
    statusFamily:
      row.status_family === "success" ||
      row.status_family === "failure" ||
      row.status_family === "unknown"
        ? row.status_family
        : null,
    requestPayloadBytes: row.request_payload_bytes,
    ingressPayloadBytes: row.ingress_payload_bytes,
    translatedPayloadBytes: row.translated_payload_bytes,
    providerCanonicalPayloadBytes: row.provider_canonical_payload_bytes,
    providerWirePayloadBytes: row.provider_wire_payload_bytes,
    responsePayloadBytes: row.response_payload_bytes,
    retryCount: row.retry_count,
    rerouteCount: row.reroute_count,
    cooldownDecision: row.cooldown_decision,
    idempotencyDecision: row.idempotency_decision,
    toolSideEffectState: row.tool_side_effect_state,
    toolingUsed: row.tooling_used === 1,
    cacheState: row.cache_state,
    roleIds: row.role_ids_json ? (JSON.parse(row.role_ids_json) as string[]) : [],
    eligibleEndpointIds: row.eligible_endpoint_ids_json
      ? (JSON.parse(row.eligible_endpoint_ids_json) as string[])
      : [],
    eligibleModelIds: row.eligible_model_ids_json
      ? (JSON.parse(row.eligible_model_ids_json) as string[])
      : [],
    candidateCostSnapshot: row.candidate_cost_snapshot_json
      ? (JSON.parse(row.candidate_cost_snapshot_json) as Record<string, unknown>)
      : null,
    selectedPricingSnapshot: row.selected_pricing_snapshot_json
      ? (JSON.parse(row.selected_pricing_snapshot_json) as Record<string, unknown>)
      : null,
    inputTokens: row.input_tokens,
    inputTokensSource,
    inputTokensAvailable:
      typeof usageTokenTruth?.inputAvailable === "boolean"
        ? usageTokenTruth.inputAvailable
        : usageTokenTruth === null && row.input_tokens > 0,
    outputTokens: row.output_tokens,
    outputTokensSource,
    outputTokensAvailable:
      typeof usageTokenTruth?.outputAvailable === "boolean"
        ? usageTokenTruth.outputAvailable
        : usageTokenTruth === null && row.output_tokens > 0,
    totalTokens: row.total_tokens,
    latencyMs: row.latency_ms,
    errorClass: row.error_class,
    statusCode: row.status_code,
    finishReason: row.finish_reason,
    promptCacheRequested: row.prompt_cache_requested === 1,
    promptCacheRequestSource,
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
    effectiveCostUsd: row.effective_cost_usd,
    selectedUncachedCostUsd: row.selected_uncached_cost_usd,
    baselineMaxEligibleCostUsd: row.baseline_max_eligible_cost_usd,
    routingCostSavingsUsd: row.routing_cost_savings_usd,
    cacheCostSavingsUsd: row.cache_cost_savings_usd,
    totalAvoidedCostUsd: row.total_avoided_cost_usd,
    costCalculationBasis:
      row.cost_calculation_basis === "actual_vendor_cost" ||
      row.cost_calculation_basis === "estimated_vendor_cost" ||
      row.cost_calculation_basis === "no_execution_zero"
        ? row.cost_calculation_basis
        : "unavailable",
    costCalculationVersion: row.cost_calculation_version ?? COST_CALCULATION_VERSION,
    costBaselineSource: row.cost_baseline_source,
    costSavingsSupport: row.cost_savings_support,
    samplingRate: row.sampling_rate,
    retentionTtlHours: row.retention_ttl_hours,
    retainUntil: row.retain_until_ms,
    redactionLevel: row.redaction_level,
    retentionClass: row.retention_class,
    structuredInspectionMode: row.structured_inspection_mode,
    rawCaptureAvailable: row.raw_capture_available === 1,
    structuredInspectionAvailable: row.structured_inspection_available === 1,
    taxonomyGroupId: row.taxonomy_group_id,
    taxonomyRoleId: row.taxonomy_role_id,
    taxonomyTaskType: row.taxonomy_task_type,
    taxonomyTaskVariant: row.taxonomy_task_variant,
    taxonomyCapabilityIds: parseStringList(row.taxonomy_capability_ids_json),
    taxonomyModalityIds: parseStringList(row.taxonomy_modality_ids_json),
    taxonomyToolClassIds: parseStringList(row.taxonomy_tool_class_ids_json),
    currency: row.currency,
    dimensions,
  };
}

function readPersistedTelemetryString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readPersistedTelemetryStringList(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string");
}

function toRuntimeTelemetryRecord(
  observation: PersistedRuntimeObservationBundle,
): RuntimeTelemetryRecord {
  const inputTokens = observation.usageEvent.tokens_in ?? 0;
  const outputTokens = observation.usageEvent.tokens_out ?? 0;
  const inputTokensSource = observation.usageEvent.tokens_in_source ?? "unavailable";
  const outputTokensSource = observation.usageEvent.tokens_out_source ?? "unavailable";
  const inputTokensAvailable = observation.usageEvent.tokens_in_available ?? false;
  const outputTokensAvailable = observation.usageEvent.tokens_out_available ?? false;
  const executionTelemetry = observation.executionTelemetry;
  const streamSupport = executionTelemetry?.streamSupport;
  const actualCostUsd = observation.usageEvent.cost_actual ?? null;
  const estimatedCostUsd = observation.usageEvent.cost_estimate ?? null;
  const effectiveCostUsd = actualCostUsd ?? estimatedCostUsd ?? 0;
  const costCalculationBasis: RuntimeTelemetryRecord["costCalculationBasis"] =
    typeof actualCostUsd === "number"
      ? "actual_vendor_cost"
      : typeof estimatedCostUsd === "number"
        ? "estimated_vendor_cost"
        : "unavailable";
  const routingDiagnostics = observation.routingDiagnostics;
  const telemetrySnapshot = observation.telemetrySnapshot;
  const difficultyBucketCandidate =
    routingDiagnostics?.difficultyRouting?.difficulty ??
    observation.observedPerformance.sample.difficulty_bucket ??
    null;
  const difficultyBucket: RuntimeTelemetryRecord["difficultyBucket"] =
    isRuntimeTelemetryDifficultyBucket(difficultyBucketCandidate)
      ? difficultyBucketCandidate
      : null;
  const routingModeCandidate = routingDiagnostics?.routingMode?.effectiveMode ?? null;
  const routingMode: RuntimeTelemetryRecord["routingMode"] = isRuntimeTelemetryRoutingMode(
    routingModeCandidate,
  )
    ? routingModeCandidate
    : null;
  const executionSemantics = observation.executionSemantics;
  const selectedStrategy =
    routingDiagnostics?.hybridArbitration?.finalStrategy ??
    routingDiagnostics?.controllerRouting?.acceptedDirectives?.strategy ??
    routingDiagnostics?.difficultyRouting?.strategy ??
    (routingMode ? "balanced" : null);
  const statusCode = observation.inspection?.request?.responseCapture?.statusCode ?? null;
  const errorClass =
    observation.usageEvent.error_class ??
    observation.observedPerformance.sample.error_class ??
    null;
  const statusFamily: RuntimeTelemetryRecord["statusFamily"] =
    typeof statusCode === "number"
      ? statusCode >= 200 && statusCode < 400
        ? "success"
        : "failure"
      : errorClass
        ? "failure"
        : "unknown";
  const taxonomyDimensions = observation.taxonomyDimensions;
  const promptCacheRequestSource = observation.cacheObservability?.promptCacheRequestSource ?? null;
  const hasUsageTokenTruth =
    observation.usageEvent.tokens_in_source !== undefined ||
    observation.usageEvent.tokens_in_available !== undefined ||
    observation.usageEvent.tokens_out_source !== undefined ||
    observation.usageEvent.tokens_out_available !== undefined;
  const dimensions =
    hasUsageTokenTruth || promptCacheRequestSource
      ? {
          ...(telemetrySnapshot?.dimensions ?? {}),
          ...(hasUsageTokenTruth
            ? {
                usageTokenTruth: {
                  inputSource: inputTokensSource,
                  inputAvailable: inputTokensAvailable,
                  outputSource: outputTokensSource,
                  outputAvailable: outputTokensAvailable,
                },
              }
            : {}),
          ...(promptCacheRequestSource ? { promptCacheRequestSource } : {}),
        }
      : (telemetrySnapshot?.dimensions ?? null);
  return {
    requestId: observation.requestId,
    routingDecisionId: observation.routingDecisionId,
    endpointId: observation.endpointId,
    conversationId: observation.conversationId,
    createdAtMs: observation.usageEvent.timestamp_ms,
    clientRequestId: observation.clientRequestId ?? null,
    requestClass:
      observation.observedPerformance.sample.source_type === "benchmark" ||
      observation.observedPerformance.sample.source_type === "live_request"
        ? observation.observedPerformance.sample.source_type
        : "unknown",
    sourceType: telemetrySnapshot?.sourceType ?? null,
    modelId: observation.usageEvent.model_id ?? null,
    providerKind: observation.usageEvent.provider_kind ?? null,
    providerFamily: executionTelemetry?.providerFamily ?? null,
    vendorId: executionTelemetry?.vendorId ?? null,
    providerId: telemetrySnapshot?.providerId ?? null,
    providerAccountId: telemetrySnapshot?.providerAccountId ?? null,
    selectedModelId: telemetrySnapshot?.selectedModelId ?? observation.usageEvent.model_id ?? null,
    endpointKind: telemetrySnapshot?.endpointKind ?? null,
    servingSource: telemetrySnapshot?.servingSource ?? null,
    region: telemetrySnapshot?.region ?? null,
    lifecycleStateAtRequest: telemetrySnapshot?.lifecycleStateAtRequest ?? null,
    healthStatusAtRequest: telemetrySnapshot?.healthStatusAtRequest ?? null,
    requestedModelId: telemetrySnapshot?.requestedModelId ?? null,
    difficultyBucket,
    routingMode,
    requestedRoleId:
      routingDiagnostics?.rolePolicy?.requestedRoleId ??
      routingDiagnostics?.controllerRouting?.acceptedDirectives?.requestedRoleId ??
      null,
    selectedStrategy,
    requestOperation: telemetrySnapshot?.requestOperation ?? null,
    sourceClient: executionSemantics?.sourceClient ?? null,
    executionFamily:
      executionSemantics?.executionFamily ?? telemetrySnapshot?.servingSource ?? null,
    adapterFamily: executionSemantics?.adapterFamily ?? null,
    statusFamily,
    requestPayloadBytes: executionSemantics?.payloadBytes?.providerCanonical ?? null,
    ingressPayloadBytes: executionSemantics?.payloadBytes?.ingress ?? null,
    translatedPayloadBytes: executionSemantics?.payloadBytes?.translated ?? null,
    providerCanonicalPayloadBytes: executionSemantics?.payloadBytes?.providerCanonical ?? null,
    providerWirePayloadBytes: executionSemantics?.payloadBytes?.providerWire ?? null,
    responsePayloadBytes: executionSemantics?.payloadBytes?.providerResponse ?? null,
    retryCount: executionSemantics?.retryCount ?? 0,
    rerouteCount: executionSemantics?.rerouteCount ?? 0,
    cooldownDecision: executionSemantics?.cooldownDecision ?? null,
    idempotencyDecision: executionSemantics?.idempotencyDecision ?? null,
    toolSideEffectState: executionSemantics?.toolSideEffectState ?? null,
    toolingUsed:
      telemetrySnapshot?.toolingUsed ??
      ((observation.tooling?.toolCalls?.length ?? 0) > 0 ||
        (observation.tooling?.executions?.length ?? 0) > 0),
    cacheState: telemetrySnapshot?.cacheState ?? null,
    roleIds: telemetrySnapshot?.roleIds ?? [],
    eligibleEndpointIds: telemetrySnapshot?.eligibleEndpointIds ?? [],
    eligibleModelIds: telemetrySnapshot?.eligibleModelIds ?? [],
    candidateCostSnapshot: telemetrySnapshot?.candidateCostSnapshot ?? null,
    selectedPricingSnapshot: telemetrySnapshot?.selectedPricingSnapshot ?? null,
    inputTokens,
    inputTokensSource,
    inputTokensAvailable,
    outputTokens,
    outputTokensSource,
    outputTokensAvailable,
    totalTokens: inputTokens + outputTokens,
    latencyMs:
      observation.usageEvent.latency_ms ??
      observation.observedPerformance.sample.latency_ms ??
      null,
    errorClass,
    statusCode,
    finishReason: executionTelemetry?.finishReason ?? null,
    promptCacheRequested: observation.cacheObservability?.promptCacheRequested ?? false,
    promptCacheRequestSource,
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
    actualCostUsd,
    estimatedCostUsd,
    effectiveCostUsd,
    selectedUncachedCostUsd: telemetrySnapshot?.selectedUncachedCostUsd ?? estimatedCostUsd,
    baselineMaxEligibleCostUsd: telemetrySnapshot?.baselineMaxEligibleCostUsd ?? estimatedCostUsd,
    routingCostSavingsUsd: telemetrySnapshot?.routingCostSavingsUsd ?? 0,
    cacheCostSavingsUsd: telemetrySnapshot?.cacheCostSavingsUsd ?? 0,
    totalAvoidedCostUsd: telemetrySnapshot?.totalAvoidedCostUsd ?? 0,
    costCalculationBasis,
    costCalculationVersion: COST_CALCULATION_VERSION,
    costBaselineSource: telemetrySnapshot?.costBaselineSource ?? null,
    costSavingsSupport: telemetrySnapshot?.costSavingsSupport ?? null,
    samplingRate: observation.privacyReceipt?.samplingRate ?? null,
    retentionTtlHours: observation.privacyReceipt?.retentionTtlHours ?? null,
    retainUntil: observation.privacyReceipt?.retainUntil ?? null,
    redactionLevel: observation.capturePolicy?.redactionLevel ?? null,
    retentionClass: observation.capturePolicy?.retentionClass ?? null,
    structuredInspectionMode: observation.capturePolicy?.structuredInspectionMode ?? null,
    rawCaptureAvailable: observation.capturePolicy?.rawCaptureAvailable ?? false,
    structuredInspectionAvailable:
      observation.capturePolicy?.structuredInspectionAvailable ?? false,
    taxonomyGroupId: readPersistedTelemetryString(taxonomyDimensions?.taxonomy_group_id),
    taxonomyRoleId: readPersistedTelemetryString(taxonomyDimensions?.taxonomy_role_id),
    taxonomyTaskType: readPersistedTelemetryString(taxonomyDimensions?.taxonomy_task_type),
    taxonomyTaskVariant: readPersistedTelemetryString(taxonomyDimensions?.taxonomy_task_variant),
    taxonomyCapabilityIds: readPersistedTelemetryStringList(
      taxonomyDimensions?.taxonomy_capability_ids,
    ),
    taxonomyModalityIds: readPersistedTelemetryStringList(
      taxonomyDimensions?.taxonomy_modality_ids,
    ),
    taxonomyToolClassIds: readPersistedTelemetryStringList(
      taxonomyDimensions?.taxonomy_tool_class_ids,
    ),
    currency: observation.usageEvent.currency ?? null,
    dimensions,
  };
}

function runtimeTelemetryInsertValues(
  record: RuntimeTelemetryRecord,
): readonly (string | number | null)[] {
  return [
    record.requestId,
    record.routingDecisionId,
    record.endpointId,
    record.conversationId,
    record.createdAtMs,
    record.clientRequestId,
    record.requestClass,
    record.sourceType,
    record.modelId,
    record.providerKind,
    record.providerFamily,
    record.vendorId,
    record.providerId,
    record.providerAccountId,
    record.selectedModelId,
    record.endpointKind,
    record.servingSource,
    record.region,
    record.lifecycleStateAtRequest,
    record.healthStatusAtRequest,
    record.requestedModelId,
    record.difficultyBucket,
    record.routingMode,
    record.requestedRoleId,
    record.selectedStrategy,
    record.requestOperation,
    record.sourceClient,
    record.executionFamily,
    record.adapterFamily,
    record.statusFamily,
    record.requestPayloadBytes,
    record.ingressPayloadBytes,
    record.translatedPayloadBytes,
    record.providerCanonicalPayloadBytes,
    record.providerWirePayloadBytes,
    record.responsePayloadBytes,
    record.retryCount,
    record.rerouteCount,
    record.cooldownDecision,
    record.idempotencyDecision,
    record.toolSideEffectState,
    record.toolingUsed ? 1 : 0,
    record.cacheState,
    JSON.stringify(record.roleIds),
    JSON.stringify(record.eligibleEndpointIds),
    JSON.stringify(record.eligibleModelIds),
    record.candidateCostSnapshot ? JSON.stringify(record.candidateCostSnapshot) : null,
    record.selectedPricingSnapshot ? JSON.stringify(record.selectedPricingSnapshot) : null,
    record.inputTokens,
    record.outputTokens,
    record.totalTokens,
    record.latencyMs,
    record.errorClass,
    record.statusCode,
    record.finishReason,
    record.promptCacheRequested ? 1 : 0,
    record.promptCacheSupported ? 1 : 0,
    record.promptCacheUsed ? 1 : 0,
    record.cacheReadTokens,
    record.cacheReadTokensSupported ? 1 : 0,
    record.cacheWriteTokens,
    record.cacheWriteTokensSupported ? 1 : 0,
    record.streamTextDeltaCount,
    record.streamTextSupported ? 1 : 0,
    record.streamToolCallDeltaCount,
    record.streamToolCallSupported ? 1 : 0,
    record.streamToolArgumentDeltaCount,
    record.streamToolArgumentSupported ? 1 : 0,
    record.toolCallCount,
    record.toolExecutionCount,
    record.costProvenance,
    record.actualCostUsd,
    record.estimatedCostUsd,
    record.effectiveCostUsd,
    record.selectedUncachedCostUsd,
    record.baselineMaxEligibleCostUsd,
    record.routingCostSavingsUsd,
    record.cacheCostSavingsUsd,
    record.totalAvoidedCostUsd,
    record.costCalculationBasis,
    record.costCalculationVersion,
    record.costBaselineSource,
    record.costSavingsSupport,
    record.samplingRate,
    record.retentionTtlHours,
    record.retainUntil,
    record.redactionLevel,
    record.retentionClass,
    record.structuredInspectionMode,
    record.rawCaptureAvailable ? 1 : 0,
    record.structuredInspectionAvailable ? 1 : 0,
    record.taxonomyGroupId,
    record.taxonomyRoleId,
    record.taxonomyTaskType,
    record.taxonomyTaskVariant,
    JSON.stringify(record.taxonomyCapabilityIds),
    JSON.stringify(record.taxonomyModalityIds),
    JSON.stringify(record.taxonomyToolClassIds),
    record.currency,
    record.dimensions ? JSON.stringify(record.dimensions) : null,
  ];
}

function toFailureRuntimeTelemetryRecord(
  input: PersistRuntimeTelemetryFailureInput,
  routingDecisionId: string,
  endpointId: string,
  createdAtMs: number,
): RuntimeTelemetryRecord {
  const observationCapturePolicy =
    input.observation &&
    typeof input.observation.capturePolicy === "object" &&
    input.observation.capturePolicy !== null
      ? (input.observation.capturePolicy as Record<string, unknown>)
      : null;
  return {
    requestId: input.requestId,
    routingDecisionId,
    endpointId,
    conversationId: "conversation-main",
    createdAtMs,
    clientRequestId: input.clientRequestId ?? null,
    requestClass: input.requestClass ?? "unknown",
    sourceType: input.sourceType ?? null,
    modelId: input.modelId ?? null,
    providerKind: input.providerKind ?? null,
    providerFamily: input.providerFamily ?? null,
    vendorId: input.vendorId ?? null,
    providerId: input.providerId ?? null,
    providerAccountId: input.providerAccountId ?? null,
    selectedModelId: input.selectedModelId ?? null,
    endpointKind: input.endpointKind ?? null,
    servingSource: input.servingSource ?? null,
    region: input.region ?? null,
    lifecycleStateAtRequest: input.lifecycleStateAtRequest ?? null,
    healthStatusAtRequest: input.healthStatusAtRequest ?? null,
    requestedModelId: input.requestedModelId ?? input.modelId ?? null,
    difficultyBucket: input.difficultyBucket ?? null,
    routingMode: input.routingMode ?? null,
    requestedRoleId: input.requestedRoleId ?? null,
    selectedStrategy: input.selectedStrategy ?? null,
    requestOperation: input.requestOperation ?? null,
    sourceClient: input.sourceClient ?? null,
    executionFamily: input.executionFamily ?? null,
    adapterFamily: input.adapterFamily ?? null,
    statusFamily: "failure",
    requestPayloadBytes: input.requestPayloadBytes ?? null,
    ingressPayloadBytes: input.ingressPayloadBytes ?? null,
    translatedPayloadBytes: input.translatedPayloadBytes ?? null,
    providerCanonicalPayloadBytes: input.providerCanonicalPayloadBytes ?? null,
    providerWirePayloadBytes: input.providerWirePayloadBytes ?? null,
    responsePayloadBytes: input.responsePayloadBytes ?? null,
    retryCount: input.retryCount ?? 0,
    rerouteCount: input.rerouteCount ?? 0,
    cooldownDecision: input.cooldownDecision ?? null,
    idempotencyDecision: input.idempotencyDecision ?? null,
    toolSideEffectState: input.toolSideEffectState ?? null,
    toolingUsed: input.toolingUsed ?? false,
    cacheState: input.cacheState ?? null,
    roleIds: input.roleIds ?? [],
    eligibleEndpointIds: input.eligibleEndpointIds ?? [],
    eligibleModelIds: input.eligibleModelIds ?? [],
    candidateCostSnapshot: input.candidateCostSnapshot ?? null,
    selectedPricingSnapshot: input.selectedPricingSnapshot ?? null,
    inputTokens: 0,
    inputTokensSource: "unavailable",
    inputTokensAvailable: false,
    outputTokens: 0,
    outputTokensSource: "unavailable",
    outputTokensAvailable: false,
    totalTokens: 0,
    latencyMs: input.latencyMs ?? null,
    errorClass: input.errorClass,
    statusCode: input.statusCode,
    finishReason: null,
    promptCacheRequested: false,
    promptCacheRequestSource: null,
    promptCacheSupported: true,
    promptCacheUsed: false,
    cacheReadTokens: 0,
    cacheReadTokensSupported: true,
    cacheWriteTokens: 0,
    cacheWriteTokensSupported: true,
    streamTextDeltaCount: 0,
    streamTextSupported: true,
    streamToolCallDeltaCount: 0,
    streamToolCallSupported: true,
    streamToolArgumentDeltaCount: 0,
    streamToolArgumentSupported: true,
    toolCallCount: 0,
    toolExecutionCount: 0,
    costProvenance: "unavailable",
    actualCostUsd: null,
    estimatedCostUsd: null,
    effectiveCostUsd: 0,
    selectedUncachedCostUsd: input.selectedUncachedCostUsd ?? 0,
    baselineMaxEligibleCostUsd: input.baselineMaxEligibleCostUsd ?? 0,
    routingCostSavingsUsd: input.routingCostSavingsUsd ?? 0,
    cacheCostSavingsUsd: input.cacheCostSavingsUsd ?? 0,
    totalAvoidedCostUsd: input.totalAvoidedCostUsd ?? 0,
    costCalculationBasis: "no_execution_zero",
    costCalculationVersion: COST_CALCULATION_VERSION,
    costBaselineSource: input.costBaselineSource ?? null,
    costSavingsSupport: input.costSavingsSupport ?? null,
    samplingRate: input.samplingRate ?? null,
    retentionTtlHours: input.retentionTtlHours ?? null,
    retainUntil: input.retainUntil ?? null,
    redactionLevel: input.redactionLevel ?? null,
    retentionClass: input.retentionClass ?? null,
    structuredInspectionMode: input.structuredInspectionMode ?? null,
    rawCaptureAvailable:
      input.rawCaptureAvailable ??
      (typeof observationCapturePolicy?.rawCaptureAvailable === "boolean"
        ? observationCapturePolicy.rawCaptureAvailable
        : false),
    structuredInspectionAvailable:
      input.structuredInspectionAvailable ??
      (typeof observationCapturePolicy?.structuredInspectionAvailable === "boolean"
        ? observationCapturePolicy.structuredInspectionAvailable
        : false),
    taxonomyGroupId: input.taxonomyGroupId ?? null,
    taxonomyRoleId: input.taxonomyRoleId ?? null,
    taxonomyTaskType: input.taxonomyTaskType ?? null,
    taxonomyTaskVariant: input.taxonomyTaskVariant ?? null,
    taxonomyCapabilityIds: input.taxonomyCapabilityIds ?? [],
    taxonomyModalityIds: input.taxonomyModalityIds ?? [],
    taxonomyToolClassIds: input.taxonomyToolClassIds ?? [],
    currency: null,
    dimensions: input.dimensions ?? null,
  };
}

function listRuntimeTelemetryRecordsInternal(
  database: DatabaseSync,
  input: RuntimeTelemetryQueryInput,
): readonly RuntimeTelemetryRecord[] {
  const clauses: string[] = [];
  const parameters: Array<number> = [];
  const endAtMs = input.endAtMs ?? Date.now();
  const startAtMs =
    typeof input.startAtMs === "number"
      ? input.startAtMs
      : typeof input.windowMs === "number"
        ? endAtMs - input.windowMs
        : undefined;
  if (typeof startAtMs === "number") {
    clauses.push("created_at_ms >= ?");
    parameters.push(startAtMs);
  }
  clauses.push("created_at_ms <= ?");
  parameters.push(endAtMs);

  const limitClause = typeof input.limit === "number" ? " LIMIT ?" : "";
  const rows = database
    .prepare(
      `SELECT request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, client_request_id, request_class, source_type, model_id, provider_kind, provider_family, vendor_id, provider_id, provider_account_id, selected_model_id, endpoint_kind, serving_source, region, lifecycle_state_at_request, health_status_at_request, requested_model_id, difficulty_bucket, routing_mode, requested_role_id, selected_strategy, request_operation, source_client, execution_family, adapter_family, status_family, request_payload_bytes, ingress_payload_bytes, translated_payload_bytes, provider_canonical_payload_bytes, provider_wire_payload_bytes, response_payload_bytes, retry_count, reroute_count, cooldown_decision, idempotency_decision, tool_side_effect_state, tooling_used, cache_state, role_ids_json, eligible_endpoint_ids_json, eligible_model_ids_json, candidate_cost_snapshot_json, selected_pricing_snapshot_json, input_tokens, output_tokens, total_tokens, latency_ms, error_class, status_code, finish_reason, prompt_cache_requested, prompt_cache_supported, prompt_cache_used, cache_read_tokens, cache_read_tokens_supported, cache_write_tokens, cache_write_tokens_supported, stream_text_delta_count, stream_text_supported, stream_tool_call_delta_count, stream_tool_call_supported, stream_tool_argument_delta_count, stream_tool_argument_supported, tool_call_count, tool_execution_count, cost_provenance, actual_cost_usd, estimated_cost_usd, effective_cost_usd, selected_uncached_cost_usd, baseline_max_eligible_cost_usd, routing_cost_savings_usd, cache_cost_savings_usd, total_avoided_cost_usd, cost_calculation_basis, cost_calculation_version, cost_baseline_source, cost_savings_support, sampling_rate, retention_ttl_hours, retain_until_ms, redaction_level, retention_class, structured_inspection_mode, raw_capture_available, structured_inspection_available, taxonomy_group_id, taxonomy_role_id, taxonomy_task_type, taxonomy_task_variant, taxonomy_capability_ids_json, taxonomy_modality_ids_json, taxonomy_tool_class_ids_json, currency, dimensions_json FROM runtime_telemetry_records WHERE ${clauses.join(
        " AND ",
      )} ORDER BY created_at_ms DESC, request_id DESC${limitClause}`,
    )
    .all(...parameters, ...(typeof input.limit === "number" ? [input.limit] : [])) as Array<{
    request_id: string;
    routing_decision_id: string;
    endpoint_id: string;
    conversation_id: string;
    created_at_ms: number;
    client_request_id: string | null;
    request_class: string | null;
    source_type: string | null;
    model_id: string | null;
    provider_kind: string | null;
    provider_family: string | null;
    vendor_id: string | null;
    provider_id: string | null;
    provider_account_id: string | null;
    selected_model_id: string | null;
    endpoint_kind: string | null;
    serving_source: string | null;
    region: string | null;
    lifecycle_state_at_request: string | null;
    health_status_at_request: string | null;
    requested_model_id: string | null;
    difficulty_bucket: string | null;
    routing_mode: string | null;
    requested_role_id: string | null;
    selected_strategy: string | null;
    request_operation: string | null;
    source_client: string | null;
    execution_family: string | null;
    adapter_family: string | null;
    status_family: string | null;
    request_payload_bytes: number | null;
    ingress_payload_bytes: number | null;
    translated_payload_bytes: number | null;
    provider_canonical_payload_bytes: number | null;
    provider_wire_payload_bytes: number | null;
    response_payload_bytes: number | null;
    retry_count: number;
    reroute_count: number;
    cooldown_decision: string | null;
    idempotency_decision: string | null;
    tool_side_effect_state: string | null;
    tooling_used: number;
    cache_state: string | null;
    role_ids_json: string | null;
    eligible_endpoint_ids_json: string | null;
    eligible_model_ids_json: string | null;
    candidate_cost_snapshot_json: string | null;
    selected_pricing_snapshot_json: string | null;
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
    effective_cost_usd: number;
    selected_uncached_cost_usd: number | null;
    baseline_max_eligible_cost_usd: number | null;
    routing_cost_savings_usd: number;
    cache_cost_savings_usd: number;
    total_avoided_cost_usd: number;
    cost_calculation_basis: string;
    cost_calculation_version: string | null;
    cost_baseline_source: string | null;
    cost_savings_support: string | null;
    sampling_rate: number | null;
    retention_ttl_hours: number | null;
    retain_until_ms: number | null;
    redaction_level: string | null;
    retention_class: string | null;
    structured_inspection_mode: string | null;
    raw_capture_available: number;
    structured_inspection_available: number;
    taxonomy_group_id: string | null;
    taxonomy_role_id: string | null;
    taxonomy_task_type: string | null;
    taxonomy_task_variant: string | null;
    taxonomy_capability_ids_json: string | null;
    taxonomy_modality_ids_json: string | null;
    taxonomy_tool_class_ids_json: string | null;
    currency: string | null;
    dimensions_json: string | null;
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

export function upsertRuntimeMaintenanceValue(input: {
  readonly databasePath: string;
  readonly key: string;
  readonly value: string;
}): void {
  const database = openSqliteDatabase(input.databasePath);
  database
    .prepare(
      "INSERT OR REPLACE INTO memory_maintenance (maintenance_key, maintenance_value, updated_at_ms) VALUES (?, ?, ?)",
    )
    .run(input.key, input.value, Date.now());
  database.close();
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
  const database = openSqliteDatabase(input.databasePath);
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

export interface PersistObservedBenchmarkSampleInput {
  readonly databasePath: string;
  readonly sample: ObservedPerformanceSample;
}

export interface ClearObservedBenchmarkDataForEndpointInput {
  readonly databasePath: string;
  readonly endpointId: string;
  readonly nowMs?: number;
}

export interface ClearObservedBenchmarkDataForEndpointResult {
  readonly endpointId: string;
  readonly clearedSampleCount: number;
}

function rebuildObservedProfilesForEndpoint(
  database: DatabaseSync,
  endpointId: string,
  nowMs: number,
): void {
  const remainingRows = database
    .prepare(
      "SELECT sample_json FROM observed_performance_samples WHERE endpoint_id = ? ORDER BY timestamp_ms ASC, sample_id ASC",
    )
    .all(endpointId) as Array<{ sample_json: string }>;

  if (remainingRows.length === 0) {
    database
      .prepare("DELETE FROM observed_profile_snapshots WHERE endpoint_id = ?")
      .run(endpointId);
  } else {
    const samples = remainingRows.map(
      (row) => JSON.parse(row.sample_json) as ObservedPerformanceSample,
    );
    const profile = aggregateObservedPerformanceSamples(samples, { nowMs });
    database
      .prepare(
        "INSERT OR REPLACE INTO observed_profile_snapshots (snapshot_id, endpoint_id, measured_at_ms, profile_json) VALUES (?, ?, ?, ?)",
      )
      .run(
        `${endpointId}:${profile.measured_at_ms}`,
        endpointId,
        profile.measured_at_ms,
        JSON.stringify(profile),
      );
  }

  for (const difficultyBucket of DIFFICULTY_BUCKETS) {
    const bucketRows = database
      .prepare(
        "SELECT sample_json FROM observed_performance_samples_by_difficulty WHERE endpoint_id = ? AND difficulty_bucket = ? ORDER BY timestamp_ms ASC, sample_id ASC",
      )
      .all(endpointId, difficultyBucket) as Array<{ sample_json: string }>;

    if (bucketRows.length === 0) {
      database
        .prepare(
          "DELETE FROM observed_profile_snapshots_by_difficulty WHERE endpoint_id = ? AND difficulty_bucket = ?",
        )
        .run(endpointId, difficultyBucket);
    } else {
      const bucketSamples = bucketRows.map(
        (row) => JSON.parse(row.sample_json) as ObservedPerformanceSample,
      );
      const bucketProfile = aggregateObservedPerformanceSamples(bucketSamples, { nowMs });
      database
        .prepare(
          "INSERT OR REPLACE INTO observed_profile_snapshots_by_difficulty (snapshot_id, endpoint_id, difficulty_bucket, measured_at_ms, profile_json) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          `${endpointId}:${difficultyBucket}:${bucketProfile.measured_at_ms}`,
          endpointId,
          difficultyBucket,
          bucketProfile.measured_at_ms,
          JSON.stringify(bucketProfile),
        );
    }
  }
}

export function clearObservedBenchmarkDataForEndpoint(
  input: ClearObservedBenchmarkDataForEndpointInput,
): ClearObservedBenchmarkDataForEndpointResult {
  const database = new DatabaseSync(input.databasePath);
  const nowMs = input.nowMs ?? Date.now();

  const countRow = database
    .prepare(
      "SELECT COUNT(*) AS count FROM observed_performance_samples WHERE endpoint_id = ? AND source_type = 'benchmark'",
    )
    .get(input.endpointId) as { count: number };
  const clearedSampleCount = countRow.count;

  database
    .prepare(
      "DELETE FROM observed_performance_samples WHERE endpoint_id = ? AND source_type = 'benchmark'",
    )
    .run(input.endpointId);
  database
    .prepare(
      "DELETE FROM observed_performance_samples_by_difficulty WHERE endpoint_id = ? AND source_type = 'benchmark'",
    )
    .run(input.endpointId);

  rebuildObservedProfilesForEndpoint(database, input.endpointId, nowMs);

  database.close();
  return { endpointId: input.endpointId, clearedSampleCount };
}

export interface ClearAllObservedBenchmarkDataInput {
  readonly databasePath: string;
  readonly nowMs?: number;
}

export interface ClearAllObservedBenchmarkDataResult {
  readonly clearedSampleCount: number;
  readonly affectedEndpointCount: number;
}

export function clearAllObservedBenchmarkData(
  input: ClearAllObservedBenchmarkDataInput,
): ClearAllObservedBenchmarkDataResult {
  const database = new DatabaseSync(input.databasePath);
  const nowMs = input.nowMs ?? Date.now();

  const endpointRows = database
    .prepare(
      "SELECT DISTINCT endpoint_id FROM observed_performance_samples WHERE source_type = 'benchmark'",
    )
    .all() as Array<{ endpoint_id: string }>;
  const countRow = database
    .prepare(
      "SELECT COUNT(*) AS count FROM observed_performance_samples WHERE source_type = 'benchmark'",
    )
    .get() as { count: number };
  const clearedSampleCount = countRow.count;

  database
    .prepare("DELETE FROM observed_performance_samples WHERE source_type = 'benchmark'")
    .run();
  database
    .prepare(
      "DELETE FROM observed_performance_samples_by_difficulty WHERE source_type = 'benchmark'",
    )
    .run();

  for (const row of endpointRows) {
    rebuildObservedProfilesForEndpoint(database, row.endpoint_id, nowMs);
  }

  database.close();
  return {
    clearedSampleCount,
    affectedEndpointCount: endpointRows.length,
  };
}

export interface ClearBenchmarkRunArtifactsInput {
  readonly artifactRoot: string;
}

export interface ClearBenchmarkRunArtifactsResult {
  readonly clearedRunCount: number;
}

export function clearBenchmarkRunArtifacts(
  input: ClearBenchmarkRunArtifactsInput,
): ClearBenchmarkRunArtifactsResult {
  if (!existsSync(input.artifactRoot)) {
    return { clearedRunCount: 0 };
  }

  let clearedRunCount = 0;
  for (const entry of readdirSync(input.artifactRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    rmSync(path.join(input.artifactRoot, entry.name), { recursive: true, force: true });
    clearedRunCount += 1;
  }
  return { clearedRunCount };
}

export function persistObservedBenchmarkSample(input: PersistObservedBenchmarkSampleInput): void {
  const sample = {
    ...input.sample,
    source_type: "benchmark" as const,
  };
  for (let attempt = 1; ; attempt += 1) {
    const database = openSqliteDatabase(input.databasePath);
    try {
      database
        .prepare(
          "INSERT OR REPLACE INTO observed_performance_samples (sample_id, endpoint_id, request_id, routing_decision_id, source_type, timestamp_ms, sample_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          sampleIdFor(sample),
          sample.endpoint_id,
          sample.request_id ?? null,
          sample.routing_decision_id ?? null,
          sample.source_type,
          sample.timestamp_ms,
          JSON.stringify(sample),
        );
      if (sample.difficulty_bucket) {
        const difficultyBucket = sample.difficulty_bucket;
        database
          .prepare(
            "INSERT OR REPLACE INTO observed_performance_samples_by_difficulty (sample_id, endpoint_id, difficulty_bucket, request_id, routing_decision_id, source_type, timestamp_ms, sample_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .run(
            segmentedSampleIdFor(sample),
            sample.endpoint_id,
            difficultyBucket,
            sample.request_id ?? null,
            sample.routing_decision_id ?? null,
            sample.source_type,
            sample.timestamp_ms,
            JSON.stringify(sample),
          );
        const priorBucketRows = database
          .prepare(
            "SELECT sample_json FROM observed_performance_samples_by_difficulty WHERE endpoint_id = ? AND difficulty_bucket = ? ORDER BY timestamp_ms ASC, sample_id ASC",
          )
          .all(sample.endpoint_id, difficultyBucket) as Array<{ sample_json: string }>;
        const bucketSamples = priorBucketRows.map(
          (row) => JSON.parse(row.sample_json) as ObservedPerformanceSample,
        );
        const bucketProfile = aggregateObservedPerformanceSamples(bucketSamples, {
          nowMs: sample.timestamp_ms,
        });
        database
          .prepare(
            "INSERT OR REPLACE INTO observed_profile_snapshots_by_difficulty (snapshot_id, endpoint_id, difficulty_bucket, measured_at_ms, profile_json) VALUES (?, ?, ?, ?, ?)",
          )
          .run(
            `${sample.endpoint_id}:${difficultyBucket}:${bucketProfile.measured_at_ms}`,
            sample.endpoint_id,
            difficultyBucket,
            bucketProfile.measured_at_ms,
            JSON.stringify(bucketProfile),
          );
      }
      const priorRows = database
        .prepare(
          "SELECT sample_json FROM observed_performance_samples WHERE endpoint_id = ? ORDER BY timestamp_ms ASC, sample_id ASC",
        )
        .all(sample.endpoint_id) as Array<{ sample_json: string }>;
      const allSamples = priorRows.map(
        (row) => JSON.parse(row.sample_json) as ObservedPerformanceSample,
      );
      const profile = aggregateObservedPerformanceSamples(allSamples, {
        nowMs: sample.timestamp_ms,
      });
      database
        .prepare(
          "INSERT OR REPLACE INTO observed_profile_snapshots (snapshot_id, endpoint_id, measured_at_ms, profile_json) VALUES (?, ?, ?, ?)",
        )
        .run(
          `${sample.endpoint_id}:${profile.measured_at_ms}`,
          sample.endpoint_id,
          profile.measured_at_ms,
          JSON.stringify(profile),
        );
      return;
    } catch (error) {
      if (!isSqliteBusyError(error) || attempt >= SQLITE_BUSY_MAX_ATTEMPTS) {
        throw error;
      }
      sleepSync(SQLITE_BUSY_RETRY_DELAY_MS * attempt);
    } finally {
      database.close();
    }
  }
}

export function persistRuntimeObservationBundle(input: PersistRuntimeObservationBundleInput): void {
  const observation = input.observation;
  const telemetryRecord = toRuntimeTelemetryRecord(observation);
  withSqliteBusyRetry(input.databasePath, (database) => {
    database
      .prepare(
        "INSERT OR REPLACE INTO runtime_observations (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, retain_until_ms, taxonomy_role_id, taxonomy_task_type, client_request_id, request_class, observation_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        observation.requestId,
        observation.routingDecisionId,
        observation.endpointId,
        observation.conversationId,
        observation.usageEvent.timestamp_ms,
        observation.privacyReceipt?.retainUntil ?? null,
        typeof observation.taxonomyDimensions?.taxonomy_role_id === "string"
          ? observation.taxonomyDimensions.taxonomy_role_id
          : null,
        typeof observation.taxonomyDimensions?.taxonomy_task_type === "string"
          ? observation.taxonomyDimensions.taxonomy_task_type
          : null,
        observation.clientRequestId ?? null,
        observation.observedPerformance?.sample?.source_type === "benchmark"
          ? "benchmark"
          : observation.observedPerformance?.sample?.source_type === "live_request"
            ? "live_request"
            : null,
        resolveRuntimeObservationStoragePayload({
          databasePath: input.databasePath,
          observation: observation as unknown as Readonly<Record<string, unknown>>,
          ...(input.artifactRef ? { artifactRef: input.artifactRef } : {}),
        }),
      );
    mirrorShadowRuntimeObservation(database, {
      observation: observation as unknown as Readonly<Record<string, unknown>>,
      ...(input.artifactRef ? { artifactRef: input.artifactRef } : {}),
    });
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
    if (observation.observedPerformance.sample.difficulty_bucket) {
      const difficultyBucket = observation.observedPerformance.sample.difficulty_bucket;
      database
        .prepare(
          "INSERT OR REPLACE INTO observed_performance_samples_by_difficulty (sample_id, endpoint_id, difficulty_bucket, request_id, routing_decision_id, source_type, timestamp_ms, sample_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          segmentedSampleIdFor(observation.observedPerformance.sample),
          observation.endpointId,
          difficultyBucket,
          observation.observedPerformance.sample.request_id ?? null,
          observation.observedPerformance.sample.routing_decision_id ?? null,
          observation.observedPerformance.sample.source_type,
          observation.observedPerformance.sample.timestamp_ms,
          JSON.stringify(observation.observedPerformance.sample),
        );
      const priorBucketRows = database
        .prepare(
          "SELECT sample_json FROM observed_performance_samples_by_difficulty WHERE endpoint_id = ? AND difficulty_bucket = ? ORDER BY timestamp_ms ASC, sample_id ASC",
        )
        .all(observation.endpointId, difficultyBucket) as Array<{
        sample_json: string;
      }>;
      const bucketSamples = priorBucketRows.map(
        (row) => JSON.parse(row.sample_json) as ObservedPerformanceSample,
      );
      const bucketProfile = aggregateObservedPerformanceSamples(bucketSamples, {
        nowMs: observation.observedPerformance.sample.timestamp_ms,
      });
      database
        .prepare(
          "INSERT OR REPLACE INTO observed_profile_snapshots_by_difficulty (snapshot_id, endpoint_id, difficulty_bucket, measured_at_ms, profile_json) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          `${observation.endpointId}:${difficultyBucket}:${bucketProfile.measured_at_ms}`,
          observation.endpointId,
          difficultyBucket,
          bucketProfile.measured_at_ms,
          JSON.stringify(bucketProfile),
        );
    }
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
        `INSERT OR REPLACE INTO runtime_telemetry_records (${RUNTIME_TELEMETRY_INSERT_COLUMNS.join(", ")}) VALUES (${RUNTIME_TELEMETRY_INSERT_COLUMNS.map(() => "?").join(", ")})`,
      )
      .run(...runtimeTelemetryInsertValues(telemetryRecord));
  });
}

export interface PersistRuntimeTelemetryFailureInput {
  readonly databasePath: string;
  readonly requestId: string;
  readonly routingDecisionId?: string;
  readonly endpointId?: string;
  readonly modelId?: string;
  readonly requestedModelId?: string | null;
  readonly selectedModelId?: string | null;
  readonly requestOperation?: string | null;
  readonly statusCode: number;
  readonly errorClass: string;
  readonly latencyMs?: number;
  readonly clientRequestId?: string | null;
  readonly requestClass?: "benchmark" | "live_request" | "unknown";
  readonly sourceType?: "local" | "remote" | null;
  readonly providerKind?: string | null;
  readonly providerFamily?: string | null;
  readonly vendorId?: string | null;
  readonly providerId?: string | null;
  readonly providerAccountId?: string | null;
  readonly endpointKind?: string | null;
  readonly servingSource?: string | null;
  readonly region?: string | null;
  readonly lifecycleStateAtRequest?: string | null;
  readonly healthStatusAtRequest?: string | null;
  readonly difficultyBucket?: RuntimeTelemetryRecord["difficultyBucket"];
  readonly routingMode?: RuntimeTelemetryRecord["routingMode"];
  readonly requestedRoleId?: string | null;
  readonly selectedStrategy?: string | null;
  readonly sourceClient?: string | null;
  readonly executionFamily?: string | null;
  readonly adapterFamily?: string | null;
  readonly requestPayloadBytes?: number | null;
  readonly ingressPayloadBytes?: number | null;
  readonly translatedPayloadBytes?: number | null;
  readonly providerCanonicalPayloadBytes?: number | null;
  readonly providerWirePayloadBytes?: number | null;
  readonly responsePayloadBytes?: number | null;
  readonly retryCount?: number;
  readonly rerouteCount?: number;
  readonly cooldownDecision?: string | null;
  readonly idempotencyDecision?: string | null;
  readonly toolSideEffectState?: string | null;
  readonly toolingUsed?: boolean;
  readonly cacheState?: string | null;
  readonly roleIds?: readonly string[];
  readonly eligibleEndpointIds?: readonly string[];
  readonly eligibleModelIds?: readonly string[];
  readonly candidateCostSnapshot?: Record<string, unknown> | null;
  readonly selectedPricingSnapshot?: Record<string, unknown> | null;
  readonly selectedUncachedCostUsd?: number | null;
  readonly baselineMaxEligibleCostUsd?: number | null;
  readonly routingCostSavingsUsd?: number;
  readonly cacheCostSavingsUsd?: number;
  readonly totalAvoidedCostUsd?: number;
  readonly costBaselineSource?: string | null;
  readonly costSavingsSupport?: string | null;
  readonly samplingRate?: number | null;
  readonly retentionTtlHours?: number | null;
  readonly retainUntil?: number | null;
  readonly redactionLevel?: string | null;
  readonly retentionClass?: string | null;
  readonly structuredInspectionMode?: string | null;
  readonly rawCaptureAvailable?: boolean;
  readonly structuredInspectionAvailable?: boolean;
  readonly taxonomyGroupId?: string | null;
  readonly taxonomyRoleId?: string | null;
  readonly taxonomyTaskType?: string | null;
  readonly taxonomyTaskVariant?: string | null;
  readonly taxonomyCapabilityIds?: readonly string[];
  readonly taxonomyModalityIds?: readonly string[];
  readonly taxonomyToolClassIds?: readonly string[];
  readonly dimensions?: Record<string, unknown> | null;
  readonly observation?: Record<string, unknown> | null;
}

export function persistRuntimeTelemetryFailure(input: PersistRuntimeTelemetryFailureInput): void {
  const createdAtMs = Date.now();
  const routingDecisionId = input.routingDecisionId ?? `decision-${input.requestId}`;
  const endpointId = input.endpointId ?? "routing.failed.pre-execution";
  const telemetryRecord = toFailureRuntimeTelemetryRecord(
    input,
    routingDecisionId,
    endpointId,
    createdAtMs,
  );
  withSqliteBusyRetry(input.databasePath, (database) => {
    if (input.observation) {
      database
        .prepare(
          "INSERT OR REPLACE INTO runtime_observations (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, retain_until_ms, taxonomy_role_id, taxonomy_task_type, client_request_id, request_class, observation_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          input.requestId,
          routingDecisionId,
          endpointId,
          "conversation-main",
          createdAtMs,
          input.retainUntil ?? null,
          input.taxonomyRoleId ?? null,
          input.taxonomyTaskType ?? null,
          input.clientRequestId ?? null,
          input.requestClass ?? null,
          JSON.stringify(input.observation),
        );
    }
    database
      .prepare(
        `INSERT OR REPLACE INTO runtime_telemetry_records (${RUNTIME_TELEMETRY_INSERT_COLUMNS.join(", ")}) VALUES (${RUNTIME_TELEMETRY_INSERT_COLUMNS.map(() => "?").join(", ")})`,
      )
      .run(...runtimeTelemetryInsertValues(telemetryRecord));
  });
}

export function readRuntimeObservationBundle(
  input: ReadRuntimeObservationBundleInput,
): PersistedRuntimeObservationBundle | null {
  const database = openSqliteDatabase(input.databasePath);
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

export interface ReadObservationTelemetryColumnsInput {
  readonly databasePath: string;
  readonly requestId: string;
}

export interface ReadObservationTelemetryColumnsBatchInput {
  readonly databasePath: string;
  readonly requestIds: readonly string[];
}

export interface ObservationTelemetryColumns {
  readonly clientRequestId: string | null;
  readonly requestClass: string | null;
  readonly taxonomyRoleId: string | null;
  readonly taxonomyTaskType: string | null;
}

export interface ObservationTelemetrySnapshot extends ObservationTelemetryColumns {
  readonly observationJson: string | null;
}

export function readObservationTelemetryColumns(
  input: ReadObservationTelemetryColumnsInput,
): ObservationTelemetryColumns | null {
  const database = openSqliteDatabase(input.databasePath);
  const row = database
    .prepare(
      "SELECT client_request_id, request_class, taxonomy_role_id, taxonomy_task_type FROM runtime_observations WHERE request_id = ?",
    )
    .get(input.requestId) as
    | {
        client_request_id: string | null;
        request_class: string | null;
        taxonomy_role_id: string | null;
        taxonomy_task_type: string | null;
      }
    | undefined;
  database.close();
  return row
    ? {
        clientRequestId: row.client_request_id,
        requestClass: row.request_class,
        taxonomyRoleId: row.taxonomy_role_id,
        taxonomyTaskType: row.taxonomy_task_type,
      }
    : null;
}

export function readObservationTelemetryColumnsBatch(
  input: ReadObservationTelemetryColumnsBatchInput,
): Map<string, ObservationTelemetryColumns> {
  if (input.requestIds.length === 0) {
    return new Map();
  }
  const database = openSqliteDatabase(input.databasePath);
  const placeholders = input.requestIds.map(() => "?").join(", ");
  const rows = database
    .prepare(
      `SELECT request_id, client_request_id, request_class, taxonomy_role_id, taxonomy_task_type FROM runtime_observations WHERE request_id IN (${placeholders})`,
    )
    .all(...input.requestIds) as unknown as ReadonlyArray<{
    request_id: string;
    client_request_id: string | null;
    request_class: string | null;
    taxonomy_role_id: string | null;
    taxonomy_task_type: string | null;
  }>;
  database.close();
  const result = new Map<string, ObservationTelemetryColumns>();
  for (const row of rows) {
    result.set(row.request_id, {
      clientRequestId: row.client_request_id,
      requestClass: row.request_class,
      taxonomyRoleId: row.taxonomy_role_id,
      taxonomyTaskType: row.taxonomy_task_type,
    });
  }
  return result;
}

export function readObservationTelemetrySnapshotsBatch(
  input: ReadObservationTelemetryColumnsBatchInput,
): Map<string, ObservationTelemetrySnapshot> {
  if (input.requestIds.length === 0) {
    return new Map();
  }
  const database = openSqliteDatabase(input.databasePath);
  const placeholders = input.requestIds.map(() => "?").join(", ");
  const rows = database
    .prepare(
      `SELECT request_id, client_request_id, request_class, taxonomy_role_id, taxonomy_task_type, observation_json FROM runtime_observations WHERE request_id IN (${placeholders})`,
    )
    .all(...input.requestIds) as unknown as ReadonlyArray<{
    request_id: string;
    client_request_id: string | null;
    request_class: string | null;
    taxonomy_role_id: string | null;
    taxonomy_task_type: string | null;
    observation_json: string | null;
  }>;
  database.close();
  const result = new Map<string, ObservationTelemetrySnapshot>();
  for (const row of rows) {
    result.set(row.request_id, {
      clientRequestId: row.client_request_id,
      requestClass: row.request_class,
      taxonomyRoleId: row.taxonomy_role_id,
      taxonomyTaskType: row.taxonomy_task_type,
      observationJson: row.observation_json,
    });
  }
  return result;
}

export function readObservedPerformanceSamples(
  input: ReadObservedPerformanceSamplesInput,
): readonly ObservedPerformanceSample[] {
  const database = openSqliteDatabase(input.databasePath);
  const rows = (
    input.difficultyBucket
      ? database
          .prepare(
            "SELECT sample_json FROM observed_performance_samples_by_difficulty WHERE endpoint_id = ? AND difficulty_bucket = ? ORDER BY timestamp_ms ASC, sample_id ASC",
          )
          .all(input.endpointId, input.difficultyBucket)
      : database
          .prepare(
            "SELECT sample_json FROM observed_performance_samples WHERE endpoint_id = ? ORDER BY timestamp_ms ASC, sample_id ASC",
          )
          .all(input.endpointId)
  ) as Array<{
    sample_json: string;
  }>;
  database.close();

  return rows.map((row) => JSON.parse(row.sample_json) as ObservedPerformanceSample);
}

export function readLatestObservedProfile(
  input: ReadLatestObservedProfileInput,
): ObservedPerformanceProfile | null {
  const database = openSqliteDatabase(input.databasePath);
  const row = (
    input.difficultyBucket
      ? database
          .prepare(
            "SELECT profile_json FROM observed_profile_snapshots_by_difficulty WHERE endpoint_id = ? AND difficulty_bucket = ? ORDER BY measured_at_ms DESC, snapshot_id DESC LIMIT 1",
          )
          .get(input.endpointId, input.difficultyBucket)
      : database
          .prepare(
            "SELECT profile_json FROM observed_profile_snapshots WHERE endpoint_id = ? ORDER BY measured_at_ms DESC, snapshot_id DESC LIMIT 1",
          )
          .get(input.endpointId)
  ) as
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

  const database = openSqliteDatabase(input.databasePath);
  const placeholders = input.endpointIds.map(() => "?").join(", ");
  const rows = (
    input.difficultyBucket
      ? database
          .prepare(
            `SELECT endpoint_id, profile_json FROM observed_profile_snapshots_by_difficulty WHERE endpoint_id IN (${placeholders}) AND difficulty_bucket = ? ORDER BY measured_at_ms DESC, snapshot_id DESC`,
          )
          .all(...input.endpointIds, input.difficultyBucket)
      : database
          .prepare(
            `SELECT endpoint_id, profile_json FROM observed_profile_snapshots WHERE endpoint_id IN (${placeholders}) ORDER BY measured_at_ms DESC, snapshot_id DESC`,
          )
          .all(...input.endpointIds)
  ) as Array<{
    endpoint_id: string;
    profile_json: string;
  }>;
  database.close();

  const latestProfilesByEndpointId: Record<string, ObservedPerformanceProfile> = {};
  for (const row of rows) {
    if (!(row.endpoint_id in latestProfilesByEndpointId)) {
      latestProfilesByEndpointId[row.endpoint_id] = JSON.parse(
        row.profile_json,
      ) as ObservedPerformanceProfile;
    }
  }
  return latestProfilesByEndpointId;
}

function evaluateAdvisoryMaxDifficultyProfile(
  profile: ObservedPerformanceProfile | null,
  thresholds: AdvisoryMaxDifficultyThresholds,
): AdvisoryMaxDifficultyEvaluation {
  if (!profile) {
    return {
      eligible: false,
      rejectionReasons: ["no-profile"],
      profile: null,
    };
  }

  const rejectionReasons: AdvisoryMaxDifficultyRejectionReason[] = [];
  if (profile.sample_size < thresholds.minSamples) {
    rejectionReasons.push("min-samples");
  }
  if (profile.failure_rate > thresholds.maxFailureRate) {
    rejectionReasons.push("max-failure-rate");
  }
  if (
    typeof profile.quality_score === "number" &&
    profile.quality_score < thresholds.minQualityScore
  ) {
    rejectionReasons.push("min-quality-score");
  }
  if (
    typeof profile.tokens_per_sec === "number" &&
    profile.tokens_per_sec < thresholds.minTokensPerSec
  ) {
    rejectionReasons.push("min-tokens-per-sec");
  }

  return {
    eligible: rejectionReasons.length === 0,
    rejectionReasons,
    profile,
  };
}

export function readAdvisoryMaxDifficultyRecommendation(
  input: ReadAdvisoryMaxDifficultyRecommendationInput,
): AdvisoryMaxDifficultyRecommendation {
  const profiles = Object.fromEntries(
    DIFFICULTY_BUCKETS.map((difficultyBucket) => [
      difficultyBucket,
      readLatestObservedProfile({
        databasePath: input.databasePath,
        endpointId: input.endpointId,
        difficultyBucket,
      }),
    ]),
  ) as Record<(typeof DIFFICULTY_BUCKETS)[number], ObservedPerformanceProfile | null>;
  return buildAdvisoryMaxDifficultyRecommendation({ profiles, thresholds: input.thresholds });
}

export function buildAdvisoryMaxDifficultyRecommendation(input: {
  readonly profiles: Record<(typeof DIFFICULTY_BUCKETS)[number], ObservedPerformanceProfile | null>;
  readonly thresholds: AdvisoryMaxDifficultyThresholds;
}): AdvisoryMaxDifficultyRecommendation {
  const evaluations = Object.fromEntries(
    DIFFICULTY_BUCKETS.map((difficultyBucket) => [
      difficultyBucket,
      evaluateAdvisoryMaxDifficultyProfile(input.profiles[difficultyBucket], input.thresholds),
    ]),
  ) as AdvisoryMaxDifficultyRecommendation["evaluations"];

  let recommendedMaxDifficulty: AdvisoryMaxDifficultyRecommendation["recommendedMaxDifficulty"] =
    null;
  for (const difficultyBucket of DIFFICULTY_BUCKETS) {
    if (evaluations[difficultyBucket].eligible) {
      recommendedMaxDifficulty = difficultyBucket;
    }
  }

  return {
    recommendedMaxDifficulty,
    thresholds: input.thresholds,
    evaluations,
  };
}

export function upsertDifficultyClassificationCache(
  input: UpsertDifficultyClassificationCacheInput,
): void {
  withSqliteBusyRetry(input.databasePath, (database) => {
    database
      .prepare(
        "INSERT OR REPLACE INTO difficulty_classification_cache (conversation_id, cache_json, updated_at_ms) VALUES (?, ?, ?)",
      )
      .run(input.cache.conversationId, JSON.stringify(input.cache), input.cache.cachedAtMs);
  });
}

export function readDifficultyClassificationCache(
  input: ReadDifficultyClassificationCacheInput,
): DifficultyClassificationCacheRecord | null {
  const database = openSqliteDatabase(input.databasePath);
  const row = database
    .prepare("SELECT cache_json FROM difficulty_classification_cache WHERE conversation_id = ?")
    .get(input.conversationId) as
    | {
        cache_json: string;
      }
    | undefined;
  database.close();
  return row ? (JSON.parse(row.cache_json) as DifficultyClassificationCacheRecord) : null;
}

export function listRecentRuntimeObservations(
  input: ListRecentRuntimeObservationsInput,
): readonly RuntimeObservationSummaryRecord[] {
  const database = openSqliteDatabase(input.databasePath);
  const rows = database
    .prepare(
      "SELECT request_id, client_request_id, routing_decision_id, endpoint_id, created_at_ms FROM runtime_observations ORDER BY created_at_ms DESC, request_id DESC LIMIT ?",
    )
    .all(input.limit ?? 20) as Array<{
    request_id: string;
    routing_decision_id: string;
    endpoint_id: string;
    created_at_ms: number;
    client_request_id: string | null;
  }>;
  database.close();

  return rows.map((row) => ({
    requestId: row.request_id,
    clientRequestId: row.client_request_id,
    routingDecisionId: row.routing_decision_id,
    endpointId: row.endpoint_id,
    createdAtMs: row.created_at_ms,
  }));
}

export function listRecentRuntimeRequestIds(
  input: ListRecentRuntimeRequestIdsInput,
): readonly string[] {
  const database = openSqliteDatabase(input.databasePath);
  const rows = database
    .prepare(
      "SELECT request_id FROM runtime_observations ORDER BY created_at_ms DESC, request_id DESC LIMIT ?",
    )
    .all(input.limit ?? 10) as Array<{
    request_id: string;
  }>;
  database.close();
  return rows.map((row) => row.request_id);
}

export function listRuntimeTelemetryRecords(
  input: RuntimeTelemetryQueryInput,
): readonly RuntimeTelemetryRecord[] {
  const database = openSqliteDatabase(input.databasePath);
  const rows = listRuntimeTelemetryRecordsInternal(database, input);
  database.close();
  return rows;
}

export function readRuntimeTelemetrySummary(
  input: RuntimeTelemetryQueryInput,
): RuntimeTelemetrySummary {
  const database = openSqliteDatabase(input.databasePath);
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
    totalEffectiveCostUsd: roundMetric(
      records.reduce((sum, record) => sum + record.effectiveCostUsd, 0),
    ),
    averageLatencyMs:
      latencyValues.length > 0 ? Math.round(totalLatency / latencyValues.length) : null,
    p95LatencyMs: percentile95(latencyValues),
    lastSeenAtMs: records[0]?.createdAtMs ?? null,
  };
}

export function listRuntimeTelemetryComparisonRows(
  input: RuntimeTelemetryQueryInput,
): readonly RuntimeTelemetryComparisonRow[] {
  const database = openSqliteDatabase(input.databasePath);
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
    const existing = grouped.get(key) ?? {
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
          ? Math.round(
              entry.latencies.reduce((sum, value) => sum + value, 0) / entry.latencies.length,
            )
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

  const observations = observationRows.map(
    (row) => JSON.parse(row.observation_json) as PersistedRuntimeObservationBundle,
  );
  const latestProfilesByEndpoint = new Map<string, ObservedPerformanceProfile>();
  for (const row of profileRows) {
    if (!latestProfilesByEndpoint.has(row.endpoint_id)) {
      latestProfilesByEndpoint.set(
        row.endpoint_id,
        JSON.parse(row.profile_json) as ObservedPerformanceProfile,
      );
    }
  }

  const observedProfiles = [...latestProfilesByEndpoint.entries()].map(
    ([endpointId, latestProfile]) => ({
      endpointId,
      latestProfile,
      recentSamples: readObservedPerformanceSamples({
        databasePath: input.databasePath,
        endpointId,
      }),
    }),
  );

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
  database
    .prepare(
      "INSERT INTO llama_swap_events (event_id, timestamp, old_model_id, new_model_id, reason) VALUES (?, ?, ?, ?, ?)",
    )
    .run(randomUUID(), input.timestamp, input.oldModelId, input.newModelId, input.reason);
  database.close();
}

export function listSwapEvents(input: {
  readonly databasePath: string;
  readonly limit?: number;
}): readonly SwapEventRecord[] {
  const database = new DatabaseSync(input.databasePath);
  const limitClause = typeof input.limit === "number" ? " LIMIT ?" : "";
  const rows = database
    .prepare(
      `SELECT event_id, timestamp, old_model_id, new_model_id, reason FROM llama_swap_events ORDER BY timestamp DESC${limitClause}`,
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
