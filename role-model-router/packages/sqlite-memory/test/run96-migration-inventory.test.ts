import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import {
  LegacySqliteMigration,
  initializeSqliteMemory,
  inspectLegacyMigrationInventory,
  readLegacyMigrationPhysicalReceipts,
  readLegacyMigrationStageReceipts,
} from "../src/index.js";

function inventoryFixture() {
  const root = mkdtempSync(
    path.join(process.env.RUN00_TEMP_ROOT ?? tmpdir(), ".tmp-role-model-run96-migration-"),
  );
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "dev",
    channel: "development",
  });
  const database = new DatabaseSync(initialized.databasePath);
  database.exec(`
    CREATE TABLE artifact_content_edges (
      edge_id TEXT PRIMARY KEY,
      content_ref TEXT NOT NULL,
      edge_kind TEXT NOT NULL
    );
    CREATE TABLE graph_occurrences (
      occurrence_id TEXT PRIMARY KEY,
      content_ref TEXT NOT NULL,
      sequence INTEGER NOT NULL
    );
    CREATE TABLE route_capture_roots_manifests (
      root_id TEXT PRIMARY KEY,
      manifest_json TEXT NOT NULL
    );
    CREATE TABLE replay_json_checkpoints (
      checkpoint_id TEXT PRIMARY KEY,
      checkpoint_json TEXT NOT NULL
    );
    CREATE TABLE evaluation_databases (
      evaluation_id TEXT PRIMARY KEY,
      result_json TEXT NOT NULL
    );
    CREATE TABLE projection_consumers (
      consumer_id TEXT PRIMARY KEY,
      projection_name TEXT NOT NULL
    );
  `);
  database
    .prepare("INSERT INTO artifact_content_edges VALUES (?, ?, ?)")
    .run("edge-1", "content-1", "derived_from");
  database
    .prepare("INSERT INTO graph_occurrences VALUES (?, ?, ?)")
    .run("occurrence-1", "content-1", 1);
  database
    .prepare("INSERT INTO route_capture_roots_manifests VALUES (?, ?)")
    .run("root-1", JSON.stringify({ generation: 2, complete: true }));
  database
    .prepare("INSERT INTO replay_json_checkpoints VALUES (?, ?)")
    .run("checkpoint-1", JSON.stringify({ sequence: 1 }));
  database
    .prepare("INSERT INTO evaluation_databases VALUES (?, ?)")
    .run("evaluation-1", JSON.stringify({ score: 0.9 }));
  database.prepare("INSERT INTO projection_consumers VALUES (?, ?)").run("consumer-1", "router");
  database.close();

  const migration = new LegacySqliteMigration({
    databasePath: initialized.databasePath,
    backupPath: path.join(root, "backup.sqlite"),
    artifactWriter: ({ sourceId, contentHash }) => ({
      artifactId: `artifact-${sourceId}`,
      artifactPath: `artifact://${sourceId}`,
      contentHash,
    }),
  });
  return { root, databasePath: initialized.databasePath, migration };
}

test("R22 audits artifact, occurrence, capture, replay, evaluation, and projection inventories", () => {
  const { databasePath, migration } = inventoryFixture();

  const inventory = inspectLegacyMigrationInventory(databasePath);
  const byCategory = new Map<string, number>();
  for (const entry of inventory.entries) {
    byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.rowCount);
  }

  expect(byCategory.get("artifact_content_edges")).toBe(1);
  expect(byCategory.get("occurrence_rows")).toBe(1);
  expect(byCategory.get("capture_roots_manifests")).toBe(1);
  expect(byCategory.get("replay_checkpoints")).toBe(1);
  expect(byCategory.get("evaluation_databases")).toBe(1);
  expect(byCategory.get("projection_consumers")).toBe(1);
  expect(migration.audit().inventory.inventoryHash).toBe(inventory.inventoryHash);
});

test("R22 inventories the artifact-store edge tables by their canonical names", () => {
  const root = mkdtempSync(
    path.join(process.env.RUN00_TEMP_ROOT ?? tmpdir(), ".tmp-role-model-run96-artifact-tables-"),
  );
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "dev",
    channel: "development",
  });
  const database = new DatabaseSync(initialized.databasePath);
  database.exec(`
    CREATE TABLE artifacts (
      artifact_id TEXT PRIMARY KEY,
      content_hash TEXT NOT NULL
    );
    CREATE TABLE graph_edges (
      edge_id TEXT PRIMARY KEY,
      artifact_id TEXT NOT NULL
    );
  `);
  database.prepare("INSERT INTO artifacts VALUES (?, ?)").run("artifact-1", "hash-1");
  database.prepare("INSERT INTO graph_edges VALUES (?, ?)").run("edge-1", "artifact-1");
  database.close();

  const inventory = inspectLegacyMigrationInventory(initialized.databasePath);
  expect(inventory.entries).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ category: "artifact_content_edges", tableName: "artifacts" }),
      expect.objectContaining({ category: "artifact_content_edges", tableName: "graph_edges" }),
    ]),
  );
});

test("R22 blocks cutover when an inventoried legacy domain has no provable target", () => {
  const { migration } = inventoryFixture();

  migration.backfill({ scopeId: "scope-1", batchSize: 10 });
  expect(() => migration.enterShadowMirror({ deadlineMs: Date.now() + 10_000 })).toThrow(
    /unresolved legacy migration inventory/i,
  );
});

test("R22 records a restart-safe checkpoint with N/N-1 compatibility and physical receipts", () => {
  const root = mkdtempSync(
    path.join(process.env.RUN00_TEMP_ROOT ?? tmpdir(), ".tmp-role-model-run96-restart-"),
  );
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "dev",
    channel: "development",
  });
  const migration = new LegacySqliteMigration({
    databasePath: initialized.databasePath,
    backupPath: path.join(root, "backup.sqlite"),
    artifactWriter: ({ sourceId, contentHash }) => ({
      artifactId: `artifact-${sourceId}`,
      artifactPath: `artifact://${sourceId}`,
      contentHash,
    }),
  });

  migration.backfill({ scopeId: "scope-1", batchSize: 10 });
  migration.backfill({ scopeId: "scope-1", batchSize: 10 });

  expect(readLegacyMigrationStageReceipts(initialized.databasePath)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        stage: "backfill",
        restartCount: 2,
        compatibility: expect.objectContaining({
          accepted: expect.arrayContaining([
            "role-model.legacy-migration.v2",
            "role-model.legacy-migration.v1",
          ]),
        }),
      }),
    ]),
  );
  expect(readLegacyMigrationPhysicalReceipts(initialized.databasePath)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        stage: "backfill",
        footprint: expect.objectContaining({ bounded: true }),
      }),
    ]),
  );
});

test("R22 reconciles performance rows written during the shadow window before parity", () => {
  const root = mkdtempSync(
    path.join(process.env.RUN00_TEMP_ROOT ?? tmpdir(), ".tmp-role-model-run96-shadow-performance-"),
  );
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "dev",
    channel: "development",
  });
  const migration = new LegacySqliteMigration({
    databasePath: initialized.databasePath,
    backupPath: path.join(root, "backup.sqlite"),
    artifactWriter: ({ sourceId, contentHash }) => ({
      artifactId: `artifact-${sourceId}`,
      artifactPath: `artifact://${sourceId}`,
      contentHash,
    }),
  });

  migration.backfill({ scopeId: "scope-1", batchSize: 10 });
  migration.enterShadowMirror({ deadlineMs: Date.now() + 10_000 });

  const sample = {
    sample_id: "sample-live-shadow",
    endpoint_id: "endpoint-1",
    request_id: "request-live-shadow",
    routing_decision_id: "decision-live-shadow",
    source_type: "live_request",
    timestamp_ms: 1_000,
    latency_ms: 42,
    success: true,
  };
  const database = new DatabaseSync(initialized.databasePath);
  database
    .prepare(
      "INSERT INTO observed_performance_samples (sample_id, endpoint_id, request_id, routing_decision_id, source_type, timestamp_ms, sample_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run(
      sample.sample_id,
      sample.endpoint_id,
      sample.request_id,
      sample.routing_decision_id,
      sample.source_type,
      sample.timestamp_ms,
      JSON.stringify(sample),
    );
  database.close();

  migration.verifyParity({
    backupVerified: true,
    restoreVerified: true,
    consumersVerified: true,
  });

  const normalizedDatabase = new DatabaseSync(initialized.databasePath);
  const normalized = normalizedDatabase
    .prepare(
      "SELECT endpoint_id,model_id,request_id,routing_decision_id,source_type,timestamp_ms,latency_ms,success FROM normalized_performance_samples_v2 WHERE sample_id=?",
    )
    .get(sample.sample_id);
  normalizedDatabase.close();
  expect(normalized).toEqual({
    endpoint_id: sample.endpoint_id,
    model_id: null,
    request_id: sample.request_id,
    routing_decision_id: sample.routing_decision_id,
    source_type: sample.source_type,
    timestamp_ms: sample.timestamp_ms,
    latency_ms: sample.latency_ms,
    success: 1,
  });
});
