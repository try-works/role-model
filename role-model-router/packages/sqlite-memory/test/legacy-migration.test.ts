import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, test } from "vitest";

import {
  LegacySqliteMigration,
  initializeSqliteMemory,
  loadMigrationRegistry,
  readLegacyMigrationJournal,
  resolveRuntimeObservationStoragePayload,
} from "../src/index.js";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fixture() {
  const root = mkdtempSync(
    path.join(process.env.RUN00_TEMP_ROOT ?? process.cwd(), ".tmp-role-model-tb04-"),
  );
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "dev",
    channel: "development",
  });
  const backupPath = path.join(root, "backup.sqlite");
  const database = new DatabaseSync(initialized.databasePath);
  // Run 94 (SP2): the fixture simulates a legacy_primary database created before the
  // compact-stub enforcement trigger existed. Drop the trigger so pre-invariant rich
  // rows can be planted exactly as they exist in installed runtimes.
  database.exec("DROP TRIGGER IF EXISTS runtime_observations_compact_stub_enforcement");
  const rich = JSON.stringify({
    requestId: "request-1",
    endpointId: "endpoint-1",
    inspection: { request: { providerBody: "x".repeat(20_000) } },
  });
  database
    .prepare(
      `INSERT INTO runtime_observations
       (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run("request-1", "route-1", "endpoint-1", "conversation-1", 100, rich);
  database
    .prepare(
      `INSERT INTO observed_performance_samples
       (sample_id, endpoint_id, request_id, routing_decision_id, source_type, timestamp_ms, sample_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "sample-1",
      "endpoint-1",
      "request-1",
      "route-1",
      "live_request",
      100,
      JSON.stringify({
        endpoint_id: "endpoint-1",
        model_id: "model-1",
        request_id: "request-1",
        routing_decision_id: "route-1",
        source_type: "live_request",
        timestamp_ms: 100,
        latency_ms: 25,
        success: true,
      }),
    );
  database
    .prepare(
      `INSERT INTO runtime_observations
       (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "request-2",
      "route-2",
      "endpoint-2",
      "conversation-2",
      101,
      JSON.stringify({ requestId: "request-2" }),
    );
  database
    .prepare(
      `INSERT INTO observed_performance_samples
       (sample_id, endpoint_id, request_id, routing_decision_id, source_type, timestamp_ms, sample_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "sample-2",
      "endpoint-2",
      "request-2",
      "route-2",
      "live_request",
      101,
      JSON.stringify({
        endpoint_id: "endpoint-2",
        model_id: "model-2",
        request_id: "request-2",
        routing_decision_id: "route-2",
        source_type: "live_request",
        timestamp_ms: 101,
        latency_ms: 30,
        success: true,
      }),
    );
  database
    .prepare(
      `INSERT INTO observed_profile_snapshots
       (snapshot_id, endpoint_id, measured_at_ms, profile_json)
       VALUES (?, ?, ?, ?)`,
    )
    .run("profile-snapshot-1", "endpoint-1", 100, JSON.stringify({ profileId: "profile-1" }));
  database.close();
  return { root, databasePath: initialized.databasePath, backupPath, rich };
}

describe("TB04 real SQLite legacy migration", () => {
  test("loads the checksum-pinned migration registry instead of accepting arbitrary SQL", () => {
    const routerRoot = path.resolve(process.cwd(), "../..");
    const registry = loadMigrationRegistry({ routerRoot });

    expect(registry.entries.map((entry) => entry.migrationId)).toContain(
      "tb04-legacy-graph-performance-v1",
    );
    for (const entry of registry.entries) {
      const sql = readFileSync(path.join(routerRoot, "migrations", entry.sqlFile), "utf8");
      expect(entry.sha256).toBe(sha256(sql));
      expect(entry.postconditionQuery).not.toBe("");
    }
  });

  test("audits legacy storage without mutating the database", () => {
    const { databasePath, backupPath, rich } = fixture();
    const before = readFileSync(databasePath);
    const migration = new LegacySqliteMigration({
      databasePath,
      backupPath,
      artifactWriter: () => {
        throw new Error("read-only audit must not write an artifact");
      },
    });

    const audit = migration.audit();

    expect(audit).toMatchObject({
      state: "legacy_primary",
      sourceRowCount: 2,
      externalizationCandidateCount: 1,
      inlineCapBytes: 16 * 1024,
    });
    expect(audit.sourceHash).toBe(
      sha256(
        `request-1\0${sha256(rich)}\nrequest-2\0${sha256(JSON.stringify({ requestId: "request-2" }))}`,
      ),
    );
    expect(readFileSync(databasePath)).toEqual(before);
  });

  test("backfills real rows, cuts over once, and retires only after second parity and hold expiry", () => {
    const { root, databasePath, backupPath, rich } = fixture();
    const artifacts = new Map<string, string>();
    const migration = new LegacySqliteMigration({
      databasePath,
      backupPath,
      now: () => 1_000,
      artifactWriter: ({ scopeId, content }) => {
        const digest = sha256(`${scopeId}\0${content}`);
        const artifactPath = path.join(root, `${digest}.artifact`);
        writeFileSync(artifactPath, content);
        artifacts.set(digest, artifactPath);
        return { artifactId: digest, artifactPath, contentHash: sha256(content) };
      },
      artifactRollback: ({ artifactId }) => artifacts.delete(artifactId),
    });

    const first = migration.backfill({ scopeId: "scope-1", batchSize: 1 });
    const firstDatabase = new DatabaseSync(databasePath);
    const firstNormalizedCount = (
      firstDatabase
        .prepare("SELECT COUNT(*) AS count FROM normalized_performance_samples_v2")
        .get() as { count: number }
    ).count;
    firstDatabase.close();
    const resumed = migration.backfill({ scopeId: "scope-1", batchSize: 1 });
    expect(first).toMatchObject({ migratedCount: 1, pendingCount: 1 });
    expect(firstNormalizedCount).toBe(1);
    expect(resumed).toMatchObject({ migratedCount: 1, pendingCount: 0 });
    expect(artifacts).toHaveLength(2);

    migration.enterShadowMirror({ deadlineMs: 2_000 });
    const firstParity = migration.verifyParity({
      backupVerified: true,
      restoreVerified: true,
      consumersVerified: true,
    });
    expect(firstParity.sourceCount).toBe(firstParity.targetCount);
    migration.cutover();
    expect(readLegacyMigrationJournal(databasePath).state).toBe("graph_primary");

    migration.enterLegacyReadHold({ holdUntilMs: 1_500 });
    expect(() => migration.retire({ nowMs: 2_000 })).toThrow("second parity");
    migration.verifySecondParity({ consumersVerified: true });
    migration.retire({ nowMs: 1_499 });
    expect(readLegacyMigrationJournal(databasePath).state).toBe("legacy_read_hold");
    migration.retire({ nowMs: 2_000 });

    const database = new DatabaseSync(databasePath);
    const row = database
      .prepare("SELECT observation_json FROM runtime_observations WHERE request_id = ?")
      .get("request-1") as { observation_json: string };
    const ref = database
      .prepare(
        "SELECT source_hash, artifact_id FROM legacy_graph_migration_refs WHERE source_id = ?",
      )
      .get("request-1") as { source_hash: string; artifact_id: string };
    const profileSnapshot = database
      .prepare("SELECT profile_json FROM observed_profile_snapshots WHERE snapshot_id = ?")
      .get("profile-snapshot-1") as { profile_json: string } | undefined;
    database.close();
    expect(JSON.parse(row.observation_json)).toEqual({
      requestId: "request-1",
      artifactRef: ref.artifact_id,
      migrated: true,
    });
    expect(ref.source_hash).toBe(sha256(rich));
    expect(profileSnapshot).toEqual({ profile_json: JSON.stringify({ profileId: "profile-1" }) });
    expect(readLegacyMigrationJournal(databasePath).state).toBe("legacy_retired");
  });

  test("persists the bounded shadow deadline and refuses parity after it expires", () => {
    const { databasePath, backupPath } = fixture();
    let now = 1_000;
    const migration = new LegacySqliteMigration({
      databasePath,
      backupPath,
      now: () => now,
      artifactWriter: ({ sourceId, contentHash }) => ({
        artifactId: `artifact-${sourceId}`,
        artifactPath: `artifact://${sourceId}`,
        contentHash,
      }),
    });
    while (migration.backfill({ scopeId: "scope-1", batchSize: 10 }).pendingCount > 0) {
      // exhaust the bounded backfill before entering the live shadow window
    }

    migration.enterShadowMirror({ deadlineMs: 1_500 });
    expect(readLegacyMigrationJournal(databasePath).holdUntilMs).toBe(1_500);
    now = 1_501;
    expect(() =>
      migration.verifyParity({
        backupVerified: true,
        restoreVerified: true,
        consumersVerified: true,
      }),
    ).toThrow(/shadow mirror deadline expired/i);
  });

  test("Run 95 accepts a verifier-confirmed graph-primary pointer without treating it as unresolved legacy residue", () => {
    const { databasePath, backupPath } = fixture();
    const database = new DatabaseSync(databasePath);
    database
      .prepare(
        `INSERT INTO runtime_observations
         (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "request-current-graph",
        "route-current-graph",
        "endpoint-current-graph",
        "conversation-current-graph",
        102,
        JSON.stringify({
          requestId: "request-current-graph",
          graphPrimary: true,
          artifactRef: {
            scopeId: "scope-1",
            artifactId: "a".repeat(64),
            contentHash: "b".repeat(64),
          },
        }),
      );
    database.close();
    const migration = new LegacySqliteMigration({
      databasePath,
      backupPath,
      artifactWriter: ({ sourceId, contentHash }) => ({
        artifactId: `artifact-${sourceId}`,
        artifactPath: `artifact://${sourceId}`,
        contentHash,
      }),
      canonicalPointerValidator: (pointer) =>
        pointer.requestId === "request-current-graph" &&
        typeof pointer.artifactRef === "object" &&
        pointer.artifactRef.scopeId === "scope-1" &&
        pointer.artifactRef.artifactId === "a".repeat(64) &&
        pointer.artifactRef.contentHash === "b".repeat(64),
    });

    while (migration.backfill({ scopeId: "scope-1", batchSize: 10 }).pendingCount > 0) {
      // exhaust bounded legacy rows before entering the shadow window
    }

    expect(migration.audit().quarantinedRequestIds).not.toContain("request-current-graph");
    expect(() => migration.enterShadowMirror({ deadlineMs: Date.now() + 10_000 })).not.toThrow();
  });

  test("Run 95 reprocesses a stale unresolved-pointer quarantine after its artifact becomes verified", () => {
    const { databasePath, backupPath } = fixture();
    const pointer = {
      requestId: "request-recovered-graph",
      graphPrimary: true,
      artifactRef: {
        scopeId: "scope-1",
        artifactId: "c".repeat(64),
        contentHash: "d".repeat(64),
      },
    };
    const database = new DatabaseSync(databasePath);
    database
      .prepare(
        `INSERT INTO runtime_observations
         (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        pointer.requestId,
        "route-recovered-graph",
        "endpoint-recovered-graph",
        "conversation-recovered-graph",
        103,
        JSON.stringify(pointer),
      );
    database.close();

    const createMigration = (verified: boolean) =>
      new LegacySqliteMigration({
        databasePath,
        backupPath,
        artifactWriter: ({ sourceId, contentHash }) => ({
          artifactId: `artifact-${sourceId}`,
          artifactPath: `artifact://${sourceId}`,
          contentHash,
        }),
        canonicalPointerValidator: candidate => verified && candidate.requestId === pointer.requestId,
      });

    const unresolved = createMigration(false);
    while (unresolved.backfill({ scopeId: "scope-1", batchSize: 10 }).pendingCount > 0) {
      // Exhaust the legacy rows so the unresolved pointer is persisted as quarantine.
    }
    expect(unresolved.audit().quarantinedRequestIds).toContain(pointer.requestId);

    const recovered = createMigration(true);
    while (recovered.backfill({ scopeId: "scope-1", batchSize: 10 }).pendingCount > 0) {
      // A later verified artifact must make a previous quarantine eligible again.
    }
    expect(recovered.audit().quarantinedRequestIds).not.toContain(pointer.requestId);
    expect(() => recovered.enterShadowMirror({ deadlineMs: Date.now() + 10_000 })).not.toThrow();
  });

  test("rollback restores the populated legacy database and removes backfilled artifacts", () => {
    const { databasePath, backupPath, rich } = fixture();
    const artifacts = new Set<string>();
    const migration = new LegacySqliteMigration({
      databasePath,
      backupPath,
      artifactWriter: ({ scopeId, content }) => {
        const artifactId = sha256(`${scopeId}\0${content}`);
        artifacts.add(artifactId);
        return {
          artifactId,
          artifactPath: `artifact://${artifactId}`,
          contentHash: sha256(content),
        };
      },
      artifactRollback: ({ artifactId }) => artifacts.delete(artifactId),
    });
    migration.backfill({ scopeId: "scope-1", batchSize: 10 });
    expect(artifacts.size).toBe(2);

    migration.rollback();

    const database = new DatabaseSync(databasePath);
    const row = database
      .prepare("SELECT observation_json FROM runtime_observations WHERE request_id = ?")
      .get("request-1") as { observation_json: string };
    const migrationTable = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'legacy_migration_journal'",
      )
      .get();
    database.close();
    expect(row.observation_json).toBe(rich);
    expect(migrationTable).toBeUndefined();
    expect(artifacts.size).toBe(0);
  });

  test("graph-primary runtime writes reject inline rich observations and persist only an artifact reference", () => {
    const { databasePath, backupPath } = fixture();
    const migration = new LegacySqliteMigration({
      databasePath,
      backupPath,
      artifactWriter: ({ content, contentHash }) => ({
        artifactId: sha256(content),
        artifactPath: `artifact://${contentHash}`,
        contentHash,
      }),
    });
    migration.backfill({ scopeId: "scope-1", batchSize: 10 });
    migration.enterShadowMirror({ deadlineMs: Date.now() + 10_000 });
    migration.verifyParity({
      backupVerified: true,
      restoreVerified: true,
      consumersVerified: true,
    });
    migration.cutover();

    // Run 94 (SP2): the inline invariant is now state-independent. Rich content without
    // a graph artifact reference fails closed on size, and the compact stub never
    // carries non-identity fields.
    expect(() =>
      resolveRuntimeObservationStoragePayload({
        databasePath,
        observation: { requestId: "request-new", providerBody: "x".repeat(20_000) },
      }),
    ).toThrow(/graph externalization/i);
    expect(
      JSON.parse(
        resolveRuntimeObservationStoragePayload({
          databasePath,
          observation: { requestId: "request-new", providerBody: "secret-rich-body" },
          artifactRef: {
            scopeId: "scope-1",
            artifactId: "artifact-new",
            contentHash: "content-hash-new",
          },
        }),
      ),
    ).toEqual({
      requestId: "request-new",
      artifactRef: {
        scopeId: "scope-1",
        artifactId: "artifact-new",
        contentHash: "content-hash-new",
      },
      graphPrimary: true,
    });
  });
});
