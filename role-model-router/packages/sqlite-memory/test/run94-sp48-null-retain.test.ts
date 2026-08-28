import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, test } from "vitest";

import {
  initializeSqliteMemory,
  persistRuntimeTelemetryFailure,
  runSqliteRetentionMaintenance,
} from "../src/index.js";

const DAY_MS = 24 * 60 * 60 * 1_000;

test("SP48 fresh failure rows receive the canonical 90-day expiry classification", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run94-sp48-default-retain-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run94-sp48",
    channel: "development",
  });
  const before = Date.now();
  persistRuntimeTelemetryFailure({
    databasePath: initialized.databasePath,
    requestId: "failure-1",
    endpointId: "endpoint",
    routingDecisionId: "route-1",
    statusCode: 500,
    errorClass: "provider_error",
    observation: { requestId: "failure-1" },
  });
  const database = new DatabaseSync(initialized.databasePath);
  const row = database
    .prepare("SELECT retain_until_ms, created_at_ms FROM runtime_observations WHERE request_id=?")
    .get("failure-1") as { retain_until_ms: number | null; created_at_ms: number };
  database.close();
  expect(row.retain_until_ms).not.toBeNull();
  expect(row.retain_until_ms as number).toBeGreaterThanOrEqual(before + 89 * DAY_MS);
  expect(row.retain_until_ms as number).toBeLessThanOrEqual(row.created_at_ms + 91 * DAY_MS);
});

test("SP48 NULL-retain legacy rows become deletion-eligible after the canonical 90 days", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run94-sp48-null-retain-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run94-sp48",
    channel: "development",
  });
  const database = new DatabaseSync(initialized.databasePath);
  const insert = database.prepare(
    `INSERT INTO runtime_observations
     (request_id,routing_decision_id,endpoint_id,conversation_id,created_at_ms,retain_until_ms,observation_json)
     VALUES (?,?,?,?,?,?,?)`,
  );
  insert.run(
    "legacy-old",
    "route",
    "endpoint",
    "conversation",
    Date.now() - 91 * DAY_MS,
    null,
    "{}",
  );
  insert.run(
    "legacy-fresh",
    "route",
    "endpoint",
    "conversation",
    Date.now() - 1 * DAY_MS,
    null,
    "{}",
  );
  database.close();
  const receipt = runSqliteRetentionMaintenance({
    databasePath: initialized.databasePath,
    nowMs: Date.now(),
    maxDeleteRows: 10,
    holdRequestIds: [],
    idle: true,
    lockRisk: "low",
  });
  expect(receipt.nullRetainClassified).toBe(1);
  expect(receipt.deletedRows).toBe(1);
  const verify = new DatabaseSync(initialized.databasePath);
  const remaining = verify
    .prepare("SELECT request_id FROM runtime_observations ORDER BY request_id")
    .all();
  verify.close();
  expect(remaining).toEqual([{ request_id: "legacy-fresh" }]);
});

test("SP48 telemetry JSON columns fail closed past the 16 KiB inline cap", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run94-sp48-telemetry-cap-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run94-sp48",
    channel: "development",
  });
  expect(() =>
    persistRuntimeTelemetryFailure({
      databasePath: initialized.databasePath,
      requestId: "failure-oversized",
      endpointId: "endpoint",
      routingDecisionId: "route-1",
      statusCode: 500,
      errorClass: "provider_error",
      observation: { requestId: "failure-oversized" },
      dimensions: { errorPreview: "x".repeat(20 * 1024) },
    }),
  ).toThrow(/telemetry dimensions_json exceeds|externalize/i);
});

test("SP48 the compact-stub enforcement migration receipt and postcondition are asserted at startup", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "run94-sp48-postcondition-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run94-sp48",
    channel: "development",
  });
  const database = new DatabaseSync(initialized.databasePath);
  const triggers = database
    .prepare(
      "SELECT COUNT(*) AS count FROM sqlite_master WHERE type='trigger' AND name IN ('runtime_observations_compact_stub_enforcement','runtime_observations_compact_stub_update_enforcement')",
    )
    .get() as { count: number };
  const receipt = database
    .prepare(
      "SELECT status FROM migration_receipts WHERE migration_id='run94-compact-stub-enforcement-v1'",
    )
    .get() as { status?: string } | undefined;
  database.close();
  expect(triggers.count).toBe(2);
  expect(receipt?.status).toBe("applied");
});
