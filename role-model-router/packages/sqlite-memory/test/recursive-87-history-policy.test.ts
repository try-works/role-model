import { readFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import * as sqliteMemory from "../src/index.js";

test("SP3 bounds raw performance history, bytes, rebuild work, late data, and restart state", async () => {
  expect(typeof sqliteMemory.configurePerformanceHistoryPolicy).toBe("function");
  expect(typeof sqliteMemory.readPerformanceHistoryStatus).toBe("function");
  expect(typeof sqliteMemory.rollbackPerformanceHistoryPolicy).toBe("function");
  const fixture = JSON.parse(
    await readFile(
      path.join(import.meta.dirname, "fixtures", "recursive-87-performance-history.json"),
      "utf8",
    ),
  ) as {
    policy: {
      schemaVersion: "role-model.performance-history-policy.v1";
      maxSamplesPerEndpoint: number;
      maxAgeMs: number;
      maxBytesPerEndpoint: number;
      maxRebuildSamples: number;
    };
    endpointId: string;
    sampleCount: number;
    timestampStepMs: number;
  };
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-history-policy-"));
  const initialized = sqliteMemory.initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run87",
    channel: "development",
  });
  const receipt = sqliteMemory.configurePerformanceHistoryPolicy({
    databasePath: initialized.databasePath,
    policy: fixture.policy,
  });
  for (let index = 1; index <= fixture.sampleCount; index += 1) {
    sqliteMemory.persistObservedBenchmarkSample({
      databasePath: initialized.databasePath,
      nowMs: index * fixture.timestampStepMs,
      sample: {
        endpoint_id: fixture.endpointId,
        endpoint_version: "v1",
        source_type: "benchmark",
        timestamp_ms: index * fixture.timestampStepMs,
        latency_ms: index,
        judge_score: index / fixture.sampleCount,
      },
    });
  }

  const status = sqliteMemory.readPerformanceHistoryStatus({
    databasePath: initialized.databasePath,
    endpointId: fixture.endpointId,
  });
  expect(status).toMatchObject({
    rawSampleCount: 5,
    maxSamplesPerEndpoint: 5,
    lastRebuildScannedSamples: 5,
    bounded: true,
  });
  expect(status.rawBytes).toBeLessThanOrEqual(fixture.policy.maxBytesPerEndpoint);

  // A late sample outside the retained age window cannot resurrect unbounded history.
  sqliteMemory.persistObservedBenchmarkSample({
    databasePath: initialized.databasePath,
    nowMs: fixture.sampleCount * fixture.timestampStepMs,
    sample: {
      endpoint_id: fixture.endpointId,
      endpoint_version: "v1",
      source_type: "benchmark",
      timestamp_ms: fixture.timestampStepMs,
      latency_ms: 999,
      judge_score: 0,
    },
  });
  expect(
    sqliteMemory.readPerformanceHistoryStatus({
      databasePath: initialized.databasePath,
      endpointId: fixture.endpointId,
    }),
  ).toMatchObject({ rawSampleCount: 5, lastRebuildScannedSamples: 5, bounded: true });

  const restarted = sqliteMemory.initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run87",
    channel: "development",
  });
  expect(
    sqliteMemory.readPerformanceHistoryStatus({
      databasePath: restarted.databasePath,
      endpointId: fixture.endpointId,
    }),
  ).toMatchObject({ rawSampleCount: 5, maxSamplesPerEndpoint: 5, bounded: true });

  const database = new DatabaseSync(restarted.databasePath);
  const snapshots = database
    .prepare("SELECT COUNT(*) AS count FROM observed_profile_snapshots WHERE endpoint_id=?")
    .get(fixture.endpointId) as { count: number };
  database.close();
  expect(snapshots.count).toBe(1);

  sqliteMemory.rollbackPerformanceHistoryPolicy({
    databasePath: restarted.databasePath,
    receipt,
  });
  expect(() =>
    sqliteMemory.configurePerformanceHistoryPolicy({
      databasePath: restarted.databasePath,
      policy: { ...fixture.policy, schemaVersion: "role-model.performance-history-policy.v2" },
    }),
  ).toThrow(/unsupported performance history policy/i);
});

test("Phase 3.5 wall-clock aging and policy rollback restore the prior physical history", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-history-rollback-"));
  const initialized = sqliteMemory.initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run87",
    channel: "development",
  });
  const nowMs = Date.now();
  for (let index = 0; index < 5; index += 1) {
    const timestampMs = nowMs - 10_000 + index;
    sqliteMemory.persistObservedBenchmarkSample({
      databasePath: initialized.databasePath,
      sample: {
        endpoint_id: "inactive-endpoint",
        endpoint_version: "v1",
        source_type: "benchmark",
        timestamp_ms: timestampMs,
        latency_ms: index + 1,
        success: true,
      },
      nowMs: timestampMs,
    });
  }
  const policy = {
    schemaVersion: "role-model.performance-history-policy.v1" as const,
    maxSamplesPerEndpoint: 1,
    maxAgeMs: 1_000,
    maxBytesPerEndpoint: 16_384,
    maxRebuildSamples: 1,
  };
  const configuration = { databasePath: initialized.databasePath, policy, nowMs };
  const receipt = sqliteMemory.configurePerformanceHistoryPolicy(configuration);
  expect(
    sqliteMemory.readPerformanceHistoryStatus({
      databasePath: initialized.databasePath,
      endpointId: "inactive-endpoint",
    }).rawSampleCount,
  ).toBe(0);
  sqliteMemory.rollbackPerformanceHistoryPolicy({
    databasePath: initialized.databasePath,
    receipt,
  });
  expect(
    sqliteMemory.readPerformanceHistoryStatus({
      databasePath: initialized.databasePath,
      endpointId: "inactive-endpoint",
    }).rawSampleCount,
  ).toBe(5);
});

test("Phase 3.5 normal benchmark writes expire stale samples against wall clock", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-history-wall-clock-write-"));
  const initialized = sqliteMemory.initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run87",
    channel: "development",
  });
  sqliteMemory.configurePerformanceHistoryPolicy({
    databasePath: initialized.databasePath,
    nowMs: 10_000,
    policy: {
      schemaVersion: "role-model.performance-history-policy.v1",
      maxSamplesPerEndpoint: 5,
      maxAgeMs: 100,
      maxBytesPerEndpoint: 32_000,
      maxRebuildSamples: 5,
    },
  });
  expect(() =>
    sqliteMemory.persistObservedBenchmarkSample({
      databasePath: initialized.databasePath,
      nowMs: 10_000,
      sample: {
        endpoint_id: "endpoint:stale",
        endpoint_version: "v1",
        source_type: "benchmark",
        timestamp_ms: 1,
        latency_ms: 1,
        judge_score: 1,
      },
    }),
  ).toThrow(/rejected every sample/);
  expect(
    sqliteMemory.readPerformanceHistoryStatus({
      databasePath: initialized.databasePath,
      endpointId: "endpoint:stale",
    }),
  ).toMatchObject({ rawSampleCount: 0, bounded: true });
});

test("Phase 3.5 policy rollback archives have a fixed retention bound", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-history-policy-archives-"));
  const initialized = sqliteMemory.initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run87",
    channel: "development",
  });
  const receipts = [];
  for (
    let index = 0;
    index < sqliteMemory.PERFORMANCE_HISTORY_POLICY_MAX_ARCHIVES + 3;
    index += 1
  ) {
    receipts.push(
      sqliteMemory.configurePerformanceHistoryPolicy({
        databasePath: initialized.databasePath,
        nowMs: 10_000 + index,
        policy: {
          schemaVersion: "role-model.performance-history-policy.v1",
          maxSamplesPerEndpoint: 10 + index,
          maxAgeMs: 100_000,
          maxBytesPerEndpoint: 32_000,
          maxRebuildSamples: 5,
        },
      }),
    );
  }
  const database = new DatabaseSync(initialized.databasePath);
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM performance_history_policy_archives")
    .get() as { count: number };
  database.close();
  expect(Number(row.count)).toBe(sqliteMemory.PERFORMANCE_HISTORY_POLICY_MAX_ARCHIVES);
  expect(() =>
    sqliteMemory.rollbackPerformanceHistoryPolicy({
      databasePath: initialized.databasePath,
      receipt: receipts[0],
    }),
  ).toThrow(/changed|unavailable/i);
});
