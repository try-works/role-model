import { mkdtemp } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import {
  RUN90_CANONICAL_MANIFEST_SHA256,
  seedRun90CanonicalCorpus,
  seedRun90PerformanceCorpus,
} from "./fixtures/run90-canonical-corpus.ts";

import * as sqliteMemory from "../src/index.ts";
import {
  initializeSqliteMemory,
  listRuntimeTelemetryComparisonRows,
  listRuntimeTelemetryRecords,
  persistRuntimeTelemetryFailure,
  readRuntimeTelemetryRecord,
  readRuntimeTelemetrySummary,
} from "../src/index.ts";

test("Run 90 aggregates are independent of the 50-row page and use a half-open window", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run90-telemetry-semantics-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run90",
    channel: "development",
  });

  for (let index = 0; index < 60; index += 1) {
    persistRuntimeTelemetryFailure({
      databasePath: initialized.databasePath,
      requestId: `run90-request-${String(index).padStart(3, "0")}`,
      routingDecisionId: `run90-decision-${index}`,
      endpointId: "run90.endpoint",
      modelId: "run90-model",
      sourceType: "remote",
      providerKind: "run90-provider",
      statusCode: 200,
      errorClass: "none",
    });
  }

  const database = new DatabaseSync(initialized.databasePath);
  database
    .prepare("UPDATE runtime_telemetry_records SET created_at_ms = ? WHERE request_id = ?")
    .run(1000, "run90-request-000");
  database
    .prepare("UPDATE runtime_telemetry_records SET created_at_ms = ? WHERE request_id != ?")
    .run(1001, "run90-request-000");
  database.close();

  const query = {
    databasePath: initialized.databasePath,
    startAtMs: 1000,
    endAtMs: 1001,
    limit: 50,
  };

  expect(listRuntimeTelemetryRecords(query)).toHaveLength(1);
  expect(listRuntimeTelemetryRecords(query)[0]?.requestId).toBe("run90-request-000");
  expect(readRuntimeTelemetrySummary(query)).toMatchObject({
    requestCount: 1,
    failureCount: 1,
  });
  expect(listRuntimeTelemetryComparisonRows(query)).toMatchObject([
    { endpointId: "run90.endpoint", requestCount: 1, failureCount: 1 },
  ]);

  const inclusiveWindowQuery = { ...query, endAtMs: 1002 };
  expect(listRuntimeTelemetryRecords(inclusiveWindowQuery)).toHaveLength(50);
  expect(readRuntimeTelemetrySummary(inclusiveWindowQuery)).toMatchObject({
    requestCount: 60,
    failureCount: 60,
  });
  expect(listRuntimeTelemetryComparisonRows(inclusiveWindowQuery)).toMatchObject([
    { endpointId: "run90.endpoint", requestCount: 60, failureCount: 60 },
  ]);
});

test("Run 90 exact telemetry lookup reads by request identity without a bounded page scan", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run90-telemetry-lookup-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run90-lookup",
    channel: "development",
  });

  for (let index = 0; index < 201; index += 1) {
    persistRuntimeTelemetryFailure({
      databasePath: initialized.databasePath,
      requestId: `run90-lookup-${index}`,
      routingDecisionId: `run90-lookup-decision-${index}`,
      endpointId: "run90.lookup.endpoint",
      modelId: "run90.lookup.model",
      sourceType: "remote",
      statusCode: 200,
      errorClass: "none",
    });
  }

  const target = readRuntimeTelemetryRecord({
    databasePath: initialized.databasePath,
    requestId: "run90-lookup-0",
  });
  expect(target?.requestId).toBe("run90-lookup-0");
  expect(
    readRuntimeTelemetryRecord({
      databasePath: initialized.databasePath,
      requestId: "run90-missing",
    }),
  ).toBeNull();
  expect(typeof (sqliteMemory as Record<string, unknown>).listRuntimeTelemetryRecords).toBe(
    "function",
  );
});

test("Run 90 aggregate implementation uses compact SQLite aggregates instead of rich page decoding", async () => {
  const source = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
  const summaryStart = source.indexOf("export function readRuntimeTelemetrySummary");
  const comparisonStart = source.indexOf("export function listRuntimeTelemetryComparisonRows");
  expect(summaryStart).toBeGreaterThanOrEqual(0);
  expect(comparisonStart).toBeGreaterThan(summaryStart);
  const aggregateStart = source.indexOf("function readRuntimeTelemetryAggregateFromDatabase");
  const summarySource = source.slice(aggregateStart, comparisonStart);
  expect(summarySource).not.toContain("listRuntimeTelemetryRecordsInternal");
  expect(summarySource).toContain("COUNT(*)");
});

test("Run 90 canonical corpus is exactly 257 in-window plus nine out-of-window rows", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run90-canonical-corpus-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run90-canonical",
    channel: "development",
  });
  const manifest = seedRun90CanonicalCorpus(initialized.databasePath);
  expect(manifest.digest).toBe(RUN90_CANONICAL_MANIFEST_SHA256);
  expect(manifest.inWindowCount).toBe(257);
  expect(manifest.outOfWindowCount).toBe(9);
  expect(
    readRuntimeTelemetrySummary({
      databasePath: initialized.databasePath,
      startAtMs: manifest.window.startAtMs,
      endAtMs: manifest.window.endAtMs,
      limit: 50,
    }),
  ).toMatchObject({
    requestCount: 257,
    successCount: manifest.expected.successCount,
    failureCount: manifest.expected.failureCount,
    totalInputTokens: manifest.expected.totalInputTokens,
    totalOutputTokens: manifest.expected.totalOutputTokens,
    totalTokens: manifest.expected.totalTokens,
    totalEstimatedCostUsd: manifest.expected.totalEstimatedCostUsd,
    totalActualCostUsd: manifest.expected.totalActualCostUsd,
    totalEffectiveCostUsd: manifest.expected.totalEffectiveCostUsd,
    averageLatencyMs: manifest.expected.averageLatencyMs,
    p95LatencyMs: manifest.expected.p95LatencyMs,
  });
  expect(
    listRuntimeTelemetryRecords({
      databasePath: initialized.databasePath,
      startAtMs: manifest.window.startAtMs,
      endAtMs: manifest.window.endAtMs,
      limit: 50,
    }),
  ).toHaveLength(50);
  expect(manifest.expected.modelCounts).toEqual({
    "run90-model-a": 86,
    "run90-model-b": 86,
    "run90-model-c": 85,
  });
  const database = new DatabaseSync(initialized.databasePath);
  const cardinality = database
    .prepare(
      "SELECT COUNT(*) AS request_count, SUM(retry_count) AS retry_count, SUM(reroute_count) AS reroute_count, COUNT(DISTINCT created_at_ms) AS distinct_timestamps FROM runtime_telemetry_records WHERE created_at_ms >= ? AND created_at_ms < ?",
    )
    .get(manifest.window.startAtMs, manifest.window.endAtMs) as {
    request_count: number;
    retry_count: number;
    reroute_count: number;
    distinct_timestamps: number;
  };
  database.close();
  expect(cardinality).toEqual({
    request_count: 257,
    retry_count: manifest.expected.retryCount,
    reroute_count: manifest.expected.rerouteCount,
    distinct_timestamps: 129,
  });
});

test("Run 90 performance corpus keeps aggregate and lookup plans indexed", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run90-performance-corpus-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run90-performance",
    channel: "development",
  });
  seedRun90PerformanceCorpus(initialized.databasePath, 10_000);
  const database = new DatabaseSync(initialized.databasePath);
  const aggregatePlan = database
    .prepare(
      "EXPLAIN QUERY PLAN SELECT COUNT(*) FROM runtime_telemetry_records WHERE created_at_ms >= ? AND created_at_ms < ?",
    )
    .all(1_700_000_000_000, 1_700_010_000_000) as Array<{ detail: string }>;
  const lookupPlan = database
    .prepare(
      "EXPLAIN QUERY PLAN SELECT * FROM runtime_telemetry_records WHERE request_id = ? LIMIT 1",
    )
    .all("run90-perf-9999") as Array<{ detail: string }>;
  const count = database
    .prepare(
      "SELECT COUNT(*) AS count FROM runtime_telemetry_records WHERE created_at_ms >= ? AND created_at_ms < ?",
    )
    .get(1_700_000_000_000, 1_700_010_000_000) as { count: number };
  database.close();
  expect(count.count).toBe(10_000);
  expect(aggregatePlan.some((row) => /created_at/i.test(row.detail))).toBe(true);
  expect(lookupPlan.some((row) => /request_id|primary key/i.test(row.detail))).toBe(true);
});
