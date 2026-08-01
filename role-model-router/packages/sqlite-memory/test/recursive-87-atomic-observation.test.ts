import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import {
  LegacySqliteMigration,
  initializeSqliteMemory,
  persistRuntimeObservationBundle,
} from "../src/index.js";

test("Phase 3.5 public SQLite refuses durable observation writes without registered channel authority", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-sqlite-authority-"));
  const databasePath = path.join(root, "forged.sqlite");
  const observation = {
    requestId: "request-forged-storage",
    routingDecisionId: "route-forged-storage",
    endpointId: "endpoint-forged-storage",
    conversationId: "conversation-forged-storage",
    usageEvent: { timestamp_ms: Date.now() },
    observedPerformance: {
      sample: {
        endpoint_id: "endpoint-forged-storage",
        source_type: "live_request",
        timestamp_ms: Date.now(),
        latency_ms: 1,
        success: true,
      },
      profile: { measured_at_ms: Date.now() },
    },
  } as Parameters<typeof persistRuntimeObservationBundle>[0]["observation"];
  expect(() =>
    persistRuntimeObservationBundle({
      databasePath,
      observation,
      channel: "forged",
      storageRegistry: {
        schemaVersion: "role-model.storage-registry.v1",
        entries: [
          "sqlite_migration_journal",
          "sqlite_performance_history",
          "sqlite_profiles",
          "sqlite_runtime_observations",
          "sqlite_telemetry",
        ].map((id) => ({ id, owner: "sqlite-memory", channels: ["development"] })),
      },
    } as never),
  ).toThrow(/registered|writable|storage/i);
  expect(existsSync(databasePath)).toBe(false);
});

test("Phase 3.5 graph-primary observation persistence rolls back every SQLite row after a late failure", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-atomic-observation-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run87",
    channel: "development",
  });
  const artifacts = new Map<string, string>();
  let removed = 0;
  const graphStore = {
    scopeId: "tenant:run87",
    write: ({
      sourceId,
      content,
      contentHash,
    }: { sourceId: string; content: string; contentHash: string }) => {
      const result = {
        artifactId: `artifact-${sourceId}`,
        artifactPath: `artifact://${sourceId}`,
        contentHash,
      };
      artifacts.set(result.artifactId, content);
      return result;
    },
    remove: ({ artifactId }: { artifactId: string }) => {
      removed += Number(artifacts.delete(artifactId));
    },
  };
  const migration = new LegacySqliteMigration({
    databasePath: initialized.databasePath,
    backupPath: path.join(root, "legacy.sqlite"),
    artifactWriter: graphStore.write,
  });
  migration.backfill({ scopeId: graphStore.scopeId, batchSize: 1 });
  migration.enterShadowMirror({ deadlineMs: Date.now() + 60_000 });

  const database = new DatabaseSync(initialized.databasePath);
  database.exec(`CREATE TRIGGER fail_late_runtime_telemetry
    BEFORE INSERT ON runtime_telemetry_records
    BEGIN SELECT RAISE(ABORT, 'phase35 late telemetry failure'); END`);
  database.close();

  const observation = {
    requestId: "request-phase35-atomic",
    routingDecisionId: "route-phase35-atomic",
    endpointId: "endpoint-phase35-atomic",
    conversationId: "conversation-phase35-atomic",
    usageEvent: { timestamp_ms: Date.now() },
    observedPerformance: {
      sample: {
        endpoint_id: "endpoint-phase35-atomic",
        source_type: "live_request",
        timestamp_ms: Date.now(),
        latency_ms: 1,
        success: true,
      },
      profile: { measured_at_ms: Date.now() },
    },
  } as Parameters<typeof persistRuntimeObservationBundle>[0]["observation"];

  expect(() =>
    persistRuntimeObservationBundle({
      databasePath: initialized.databasePath,
      channel: "development",
      observation,
      graphStore,
    }),
  ).toThrow(/phase35 late telemetry failure/i);
  expect(removed).toBe(1);
  const audit = new DatabaseSync(initialized.databasePath);
  for (const table of [
    "runtime_observations",
    "legacy_graph_migration_refs",
    "observed_performance_samples",
    "observed_profile_snapshots",
    "runtime_telemetry_records",
  ]) {
    const row = audit.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
    expect(Number(row.count), table).toBe(0);
  }
  audit.close();

  const orphanContent = JSON.stringify(observation);
  const orphanHash = createHash("sha256").update(orphanContent).digest("hex");
  artifacts.set("artifact-request-phase35-atomic", orphanContent);
  const journal = new DatabaseSync(initialized.databasePath);
  journal.prepare("INSERT INTO runtime_observation_graph_write_intents VALUES (?,?,?,?,?,?,?)").run(
    "crash-window-intent",
    graphStore.scopeId,
    observation.requestId,
    orphanContent,
    orphanHash,
    JSON.stringify({
      artifactId: "artifact-request-phase35-atomic",
      artifactPath: "artifact://request-phase35-atomic",
      contentHash: orphanHash,
    }),
    Date.now(),
  );
  journal.close();
  expect(() =>
    persistRuntimeObservationBundle({
      databasePath: initialized.databasePath,
      channel: "development",
      observation,
      graphStore,
    }),
  ).toThrow(/phase35 late telemetry failure/i);
  expect(artifacts.size).toBe(0);
  const recovered = new DatabaseSync(initialized.databasePath);
  expect(
    Number(
      (
        recovered
          .prepare("SELECT COUNT(*) AS count FROM runtime_observation_graph_write_intents")
          .get() as { count: number }
      ).count,
    ),
  ).toBe(0);
  recovered.close();
});
