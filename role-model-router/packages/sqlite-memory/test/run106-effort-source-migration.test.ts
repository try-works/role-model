import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, test } from "vitest";

import {
  initializeSqliteMemory,
  readRuntimeTelemetryRecord,
  resolveSqliteMemoryLocation,
} from "../src/index.ts";

describe("Run 106 effort-source migration", () => {
  test("migrates legacy and nullable effort_source rows deterministically to the four-state vocabulary", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "sqlite-effort-migration-"));
    const scopeId = "run106-effort-migration";
    const databasePath = resolveSqliteMemoryLocation({ runtimeStateRoot, scopeId });
    try {
      await mkdir(path.dirname(databasePath), { recursive: true });
      const database = new DatabaseSync(databasePath);
      database.exec(`
        CREATE TABLE runtime_telemetry_records (
          request_id TEXT PRIMARY KEY,
          routing_decision_id TEXT NOT NULL,
          endpoint_id TEXT NOT NULL,
          reasoning_effort TEXT,
          effort_source TEXT,
          conversation_id TEXT NOT NULL,
          created_at_ms INTEGER NOT NULL
        );
        INSERT INTO runtime_telemetry_records (request_id, routing_decision_id, endpoint_id, reasoning_effort, effort_source, conversation_id, created_at_ms) VALUES
          ('req-client', 'd1', 'e1', 'high', 'client', 'c', 1),
          ('req-variant', 'd2', 'e2', 'high', 'variant', 'c', 2),
          ('req-coerced', 'd3', 'e3', 'max', 'variant_coerced', 'c', 3),
          ('req-none', 'd4', 'e4', NULL, 'none', 'c', 4),
          ('req-null-named', 'd5', 'e5', 'low', NULL, 'c', 5),
          ('req-null-default', 'd6', 'e6', NULL, NULL, 'c', 6);
      `);
      database.close();

      initializeSqliteMemory({ runtimeStateRoot, scopeId, channel: "development" });

      const reopened = new DatabaseSync(databasePath);
      const stored = reopened
        .prepare(
          "SELECT request_id, reasoning_effort, effort_source FROM runtime_telemetry_records ORDER BY created_at_ms",
        )
        .all();
      reopened.close();

      expect(stored).toEqual([
        { request_id: "req-client", reasoning_effort: "high", effort_source: "named" },
        { request_id: "req-variant", reasoning_effort: "high", effort_source: "named" },
        { request_id: "req-coerced", reasoning_effort: "max", effort_source: "variant_coerced" },
        { request_id: "req-none", reasoning_effort: null, effort_source: "provider_default" },
        { request_id: "req-null-named", reasoning_effort: "low", effort_source: "named" },
        { request_id: "req-null-default", reasoning_effort: null, effort_source: "provider_default" },
      ]);

      // The read path keeps coercion readable as a coerced named effort.
      expect(readRuntimeTelemetryRecord({ databasePath, requestId: "req-coerced" })).toMatchObject({
        effortSource: "named",
        effortCoerced: true,
      });
      expect(readRuntimeTelemetryRecord({ databasePath, requestId: "req-none" })).toMatchObject({
        effortSource: "provider_default",
      });
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
