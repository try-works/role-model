import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  configurePerformanceHistoryPolicy,
  initializeSqliteMemory,
  persistObservedBenchmarkSample,
  readPerformanceHistoryStatus,
} from "../../../packages/sqlite-memory/src/index.js";

test("SP3 the benchmark persistence path enforces its configured history bound", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run87-host-history-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "host",
    channel: "development",
  });
  configurePerformanceHistoryPolicy({
    databasePath: initialized.databasePath,
    nowMs: 10_000,
    policy: {
      schemaVersion: "role-model.performance-history-policy.v1",
      maxSamplesPerEndpoint: 3,
      maxAgeMs: 100_000,
      maxBytesPerEndpoint: 32_000,
      maxRebuildSamples: 3,
    },
  });
  for (let timestamp = 10_001; timestamp <= 10_006; timestamp += 1) {
    persistObservedBenchmarkSample({
      databasePath: initialized.databasePath,
      nowMs: timestamp,
      sample: {
        endpoint_id: "endpoint:run87",
        endpoint_version: "v1",
        source_type: "benchmark",
        timestamp_ms: timestamp,
        latency_ms: timestamp,
        judge_score: 1,
      },
    });
  }
  expect(
    readPerformanceHistoryStatus({
      databasePath: initialized.databasePath,
      endpointId: "endpoint:run87",
    }),
  ).toMatchObject({
    rawSampleCount: 3,
    maxSamplesPerEndpoint: 3,
    lastRebuildScannedSamples: 3,
    bounded: true,
  });
});
