import { mkdirSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { SqliteService } from "@effect/sql-sqlite-node/service";
import { initializeSqliteMemory } from "@role-model-router/sqlite-memory";
import { afterEach, describe, expect, test } from "vitest";

import { createRuntimeBridgeBackend, openRetentionCleanupDatabase, runRetentionCleanupAt } from "../src/index.js";
import { openReadOnly } from "../src/queue-runtime/admin.js";
import { resolveQueueStorePath } from "../src/queue-runtime/store.js";
import { openChallengeDispositionDatabase, openChallengeTelemetryDatabase } from "../src/route-challenge-evidence.js";
import { openCensusDatabase } from "../src/route-ladder-census.js";
import { openDurableOutputDatabase } from "../src/track-b-runtime.js";

/**
 * Run 115 S6d/S6e (R23): the second migration batch.
 *
 * S6d proved the retention DELETE against the real backend. S6e pins the four properties the S6d
 * review listed as unpinned:
 *   - the effective PRAGMAs of every migrated site (openers are exported seams; deleting a setup
 *     call fails the pragma assertions),
 *   - the DELETE predicate (constant filter, <= boundary and NULL-retain rows all fail),
 *   - the deleted count,
 *   - a portable temp root (ROLE_MODEL_TEST_TEMP_ROOT or os.tmpdir).
 */

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const fixtureRoot = path.join(import.meta.dirname, "fixtures-restart-rehydration");
const baseTemp =
  process.env.ROLE_MODEL_TEST_TEMP_ROOT?.trim() || path.join(tmpdir(), "role-model-run115");
const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })),
  );
});

async function tempStateRoot(): Promise<string> {
  await mkdir(baseTemp, { recursive: true });
  const root = await mkdtemp(path.join(baseTemp, "s6e-"));
  tempRoots.push(root);
  return root;
}

function ensureFile(file: string): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const database = new DatabaseSync(file);
  database.close();
}

function pragmaOf(database: SqliteService, pragma: string): Record<string, unknown> {
  return database.querySync(`PRAGMA ${pragma}`)[0] as Record<string, unknown>;
}

function expectPragmas(
  database: SqliteService,
  expected: { readonly busyTimeout: number; readonly queryOnly: 0 | 1 },
): void {
  expect(Number(pragmaOf(database, "busy_timeout").timeout)).toBe(expected.busyTimeout);
  expect(Number(pragmaOf(database, "query_only").query_only)).toBe(expected.queryOnly);
}

describe("S6d/S6e second batch migration", () => {
  test("pins the effective PRAGMAs of every migrated site", async () => {
    const root = await tempStateRoot();

    // census: query_only=ON + busy_timeout=1000
    const censusFile = path.join(root, "census", "memory", "memory.sqlite");
    ensureFile(censusFile);
    const census = openCensusDatabase(censusFile);
    try {
      expectPragmas(census, { busyTimeout: 1000, queryOnly: 1 });
    } finally {
      census.closeSync();
    }

    // challenge telemetry: query_only=ON + busy_timeout=1000
    const telemetryFile = path.join(root, "challenge", "memory", "memory.sqlite");
    ensureFile(telemetryFile);
    const telemetry = openChallengeTelemetryDatabase(telemetryFile);
    try {
      expectPragmas(telemetry, { busyTimeout: 1000, queryOnly: 1 });
    } finally {
      telemetry.closeSync();
    }

    // challenge dispositions: busy_timeout=0
    const dispositionFile = path.join(root, "disposition", "replay-disposition.sqlite");
    ensureFile(dispositionFile);
    const disposition = openChallengeDispositionDatabase(dispositionFile);
    try {
      expectPragmas(disposition, { busyTimeout: 0, queryOnly: 0 });
    } finally {
      disposition.closeSync();
    }

    // queue admin: busy_timeout=0
    const queueRoot = path.join(root, "queue");
    const queueFile = resolveQueueStorePath({ stateRoot: queueRoot });
    ensureFile(queueFile);
    const admin = openReadOnly(queueRoot);
    expect(admin).not.toBeNull();
    try {
      if (admin) expectPragmas(admin, { busyTimeout: 0, queryOnly: 0 });
    } finally {
      admin?.closeSync();
    }

    // durable-output read: busy_timeout=0
    const durableFile = path.join(root, "durable", "durable-output.sqlite");
    ensureFile(durableFile);
    const durable = openDurableOutputDatabase(durableFile);
    try {
      expectPragmas(durable, { busyTimeout: 0, queryOnly: 0 });
    } finally {
      durable.closeSync();
    }

    // retention DELETE connection: busy_timeout=0
    const retentionFile = path.join(root, "retention", "memory.sqlite");
    ensureFile(retentionFile);
    const retention = openRetentionCleanupDatabase(retentionFile);
    try {
      expectPragmas(retention, { busyTimeout: 0, queryOnly: 0 });
    } finally {
      retention.closeSync();
    }
  });

  test("DELETE keeps the boundary, NULL-retain and live rows, removes two expired rows and returns the count", async () => {
    const root = await tempStateRoot();
    const databasePath = path.join(root, "retention", "memory.sqlite");
    ensureFile(databasePath);
    const seed = new DatabaseSync(databasePath);
    try {
      seed.exec(
        "CREATE TABLE runtime_observations (request_id TEXT PRIMARY KEY, retain_until_ms INTEGER)",
      );
      const insert = seed.prepare("INSERT INTO runtime_observations VALUES (?, ?)");
      const now = 1_700_000_000_000;
      insert.run("req:expired-a", now - 5_000);
      insert.run("req:expired-b", now - 1);
      insert.run("req:boundary", now);
      insert.run("req:null-retain", null);
      insert.run("req:live", now + 3_600_000);
    } finally {
      seed.close();
    }

    const result = runRetentionCleanupAt(databasePath, 1_700_000_000_000);
    expect(result.deletedCount).toBe(2);

    const verify = new DatabaseSync(databasePath);
    try {
      const rows = verify
        .prepare("SELECT request_id FROM runtime_observations ORDER BY request_id")
        .all() as { request_id: string }[];
      expect(rows.map((row) => row.request_id)).toEqual([
        "req:boundary",
        "req:live",
        "req:null-retain",
      ]);
    } finally {
      verify.close();
    }
  });

  test("removes the expired row and leaves the live row in the real backend startup", async () => {
    const runtimeStateRoot = await tempStateRoot();
    const scopeId = "s6d-retention";
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId,
      channel: "development",
    });
    const seed = new DatabaseSync(initialized.databasePath);
    try {
      const insert = seed.prepare(
        "INSERT INTO runtime_observations (request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms, retain_until_ms, observation_json) VALUES (?,?,?,?,?,?,?)",
      );
      const now = Date.now();
      insert.run(
        "req:expired",
        "decision:expired",
        "endpoint",
        "conversation",
        now - 5000,
        now - 1000,
        "{}",
      );
      insert.run(
        "req:live",
        "decision:live",
        "endpoint",
        "conversation",
        now,
        now + 3_600_000,
        "{}",
      );
    } finally {
      seed.close();
    }

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot,
      runtimeStateRoot,
      scopeId,
      runtimeVendorStartup: "disabled",
    });
    try {
      const verify = new DatabaseSync(initialized.databasePath);
      try {
        const rows = verify
          .prepare("SELECT request_id FROM runtime_observations ORDER BY request_id")
          .all() as { request_id: string }[];
        expect(rows.map((row) => row.request_id)).toEqual(["req:live"]);
      } finally {
        verify.close();
      }
    } finally {
      await backend.shutdown();
    }
  });
});
