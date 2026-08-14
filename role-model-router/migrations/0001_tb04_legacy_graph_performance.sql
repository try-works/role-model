CREATE TABLE IF NOT EXISTS legacy_migration_journal (
  migration_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  source_count INTEGER NOT NULL DEFAULT 0,
  source_hash TEXT NOT NULL DEFAULT '',
  target_count INTEGER NOT NULL DEFAULT 0,
  target_hash TEXT NOT NULL DEFAULT '',
  cursor TEXT,
  attempt INTEGER NOT NULL DEFAULT 0,
  backup_path TEXT,
  hold_until_ms INTEGER,
  second_parity_verified INTEGER NOT NULL DEFAULT 0,
  updated_at_ms INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS legacy_graph_migration_refs (
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  scope_id TEXT NOT NULL,
  artifact_id TEXT NOT NULL,
  artifact_path TEXT NOT NULL,
  artifact_content_hash TEXT NOT NULL,
  migrated_at_ms INTEGER NOT NULL,
  PRIMARY KEY (source_table, source_id)
);
CREATE TABLE IF NOT EXISTS normalized_performance_samples_v2 (
  sample_id TEXT PRIMARY KEY,
  endpoint_id TEXT NOT NULL,
  model_id TEXT,
  request_id TEXT,
  routing_decision_id TEXT,
  source_type TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  latency_ms INTEGER,
  success INTEGER,
  source_hash TEXT NOT NULL
);
