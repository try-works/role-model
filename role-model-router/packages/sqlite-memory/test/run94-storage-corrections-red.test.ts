import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, test } from "vitest";

import {
  LegacySqliteMigration,
  initializeSqliteMemory,
  persistRuntimeTelemetryFailure,
  readLegacyMigrationJournal,
  resolveLegacyMigrationRouterRoot,
} from "../src/index.js";

function newDatabase() {
  const root = mkdtempSync(path.join(os.tmpdir(), "run94-public-corrections-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run94-public-corrections",
    channel: "development",
  });
  return { root, databasePath: initialized.databasePath };
}

function insertObservation(databasePath: string, requestId: string, observationJson: string) {
  const database = new DatabaseSync(databasePath);
  database
    .prepare(
      `INSERT INTO runtime_observations
       (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, observation_json)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      requestId,
      `decision-${requestId}`,
      "endpoint-run94",
      "conversation-run94",
      1,
      observationJson,
    );
  database.close();
}

describe("Run 94 public storage corrections", () => {
  test("discovers the migration router root without import.meta bundle semantics", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "run94-router-root-"));
    const routerRoot = path.join(root, "role-model-router");
    const nestedWorkingDirectory = path.join(routerRoot, "packages", "sqlite-memory");
    mkdirSync(path.join(routerRoot, "migrations"), { recursive: true });
    mkdirSync(nestedWorkingDirectory, { recursive: true });
    writeFileSync(
      path.join(routerRoot, "migrations", "registry.json"),
      JSON.stringify({
        schemaVersion: "role-model.sqlite-migration-registry.v1",
        entries: [],
      }),
      "utf8",
    );

    expect(resolveLegacyMigrationRouterRoot(nestedWorkingDirectory)).toBe(routerRoot);
    expect(() => resolveLegacyMigrationRouterRoot(path.join(root, "unrelated"))).toThrow(
      /explicit routerRoot|migration registry/i,
    );
  });

  test("rejects an unrelated ancestor that merely contains migrations/registry.json", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "run94-unrelated-router-root-"));
    const nestedWorkingDirectory = path.join(root, "unrelated", "packages", "sqlite-memory");
    mkdirSync(path.join(root, "migrations"), { recursive: true });
    mkdirSync(nestedWorkingDirectory, { recursive: true });
    writeFileSync(path.join(root, "migrations", "registry.json"), "{}", "utf8");

    expect(() => resolveLegacyMigrationRouterRoot(nestedWorkingDirectory)).toThrow(
      /explicit routerRoot|valid migration registry|identity/i,
    );
  });

  test("RED: enforces the 16 KiB cap by UTF-8 bytes on UPDATE, not SQLite characters", () => {
    const { databasePath } = newDatabase();
    insertObservation(databasePath, "req-utf8", JSON.stringify({ requestId: "req-utf8" }));
    const database = new DatabaseSync(databasePath);
    expect(() =>
      database
        .prepare("UPDATE runtime_observations SET observation_json=? WHERE request_id=?")
        .run(JSON.stringify({ requestId: "req-utf8", payload: "🙂".repeat(8_500) }), "req-utf8"),
    ).toThrow(/16 KiB|compact|limit/i);
    database.close();
  });

  test("RED: classifies malformed legacy rows as quarantine and blocks shadow cutover", () => {
    const { databasePath, root } = newDatabase();
    const database = new DatabaseSync(databasePath);
    database.exec("DROP TRIGGER IF EXISTS runtime_observations_compact_stub_enforcement");
    database.close();
    insertObservation(databasePath, "req-malformed", "{not-json");

    const migration = new LegacySqliteMigration({
      databasePath,
      backupPath: path.join(root, "backup.sqlite"),
      artifactWriter: ({ sourceId, contentHash }) => ({
        artifactId: `artifact-${sourceId}`,
        artifactPath: `artifact://${sourceId}`,
        contentHash,
      }),
    });

    migration.backfill({ scopeId: "run94-public-corrections", batchSize: 10 });
    expect(migration.audit().quarantinedRequestIds).toContain("req-malformed");
    expect(readLegacyMigrationJournal(databasePath).state).toBe("backfill");
    expect(() => migration.enterShadowMirror({ deadlineMs: Date.now() + 10_000 })).toThrow(
      /quarantine|classified|parity/i,
    );
  });

  test("failure classification keeps routing fields but never persists raw diagnostics or response bodies", () => {
    const { databasePath } = newDatabase();
    persistRuntimeTelemetryFailure({
      databasePath,
      requestId: "req-failure-redaction",
      statusCode: 502,
      errorClass: "provider_error",
      observation: {
        requestId: "req-failure-redaction",
        routingDecisionId: "decision-failure-redaction",
        endpointId: "endpoint-run94",
        executionSemantics: {
          adapterFamily: "openai-compatible",
          failedAttempts: [
            {
              failedEndpointId: "endpoint-run94",
              failureClass: "provider_error",
              errorPreview: { message: "safe classification" },
            },
          ],
        },
        diagnostics: { secret: "do-not-store" },
        inspection: { request: { responseCapture: { body: "raw-provider-body" } } },
      },
    });
    const database = new DatabaseSync(databasePath);
    const row = database
      .prepare("SELECT observation_json FROM runtime_observations WHERE request_id=?")
      .get("req-failure-redaction") as { observation_json: string };
    database.close();
    expect(row.observation_json).toContain("failedEndpointId");
    expect(row.observation_json).not.toContain("do-not-store");
    expect(row.observation_json).not.toContain("raw-provider-body");
  });
});
