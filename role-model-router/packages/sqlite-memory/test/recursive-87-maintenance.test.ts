import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import * as sqliteMemory from "../src/index.js";

test("SP5 SQLite maintenance is bounded, hold-safe, physical, and restart durable", async () => {
  expect(typeof sqliteMemory.runSqliteRetentionMaintenance).toBe("function");
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-maintenance-"));
  const initialized = sqliteMemory.initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run87",
    channel: "development",
  });
  const database = new DatabaseSync(initialized.databasePath);
  const insert = database.prepare(
    `INSERT INTO runtime_observations
     (request_id,routing_decision_id,endpoint_id,conversation_id,created_at_ms,retain_until_ms,observation_json)
     VALUES (?,?,?,?,?,?,?)`,
  );
  for (let index = 0; index < 8; index += 1) {
    insert.run(
      `request-${index}`,
      `route-${index}`,
      "endpoint",
      "conversation",
      index,
      10,
      JSON.stringify({ index, rich: "x".repeat(4000) }),
    );
  }
  database.close();
  const first = sqliteMemory.runSqliteRetentionMaintenance({
    databasePath: initialized.databasePath,
    nowMs: 100,
    maxDeleteRows: 3,
    holdRequestIds: ["request-0"],
    idle: true,
    lockRisk: "low",
  });
  expect(first).toMatchObject({
    deletedRows: 3,
    heldRows: 1,
    bounded: true,
    routingInterrupted: false,
  });
  expect(first.physicalBytesBefore).toBeGreaterThan(0);
  const restarted = sqliteMemory.initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run87",
    channel: "development",
  });
  const second = sqliteMemory.runSqliteRetentionMaintenance({
    databasePath: restarted.databasePath,
    nowMs: 100,
    maxDeleteRows: 10,
    holdRequestIds: ["request-0"],
    idle: true,
    lockRisk: "low",
  });
  expect(second.deletedRows).toBe(4);
  expect(first.reclaimedBytes + second.reclaimedBytes).toBeGreaterThan(0);
  expect(first.vacuumedPages).toBeLessThanOrEqual(3);
  expect(second.vacuumedPages).toBeLessThanOrEqual(10);
  expect(second.physicalBytesAfter).toBeLessThanOrEqual(first.physicalBytesAfter);
  const verify = new DatabaseSync(restarted.databasePath);
  const rows = verify
    .prepare("SELECT request_id FROM runtime_observations ORDER BY request_id")
    .all();
  verify.close();
  expect(rows).toEqual([{ request_id: "request-0" }]);
  expect(() =>
    sqliteMemory.runSqliteRetentionMaintenance({
      databasePath: restarted.databasePath,
      nowMs: 100,
      maxDeleteRows: 1,
      holdRequestIds: [],
      idle: false,
      lockRisk: "high",
    }),
  ).toThrow(/idle|lock risk/i);
});
