import path from "node:path";
import { mkdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

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
