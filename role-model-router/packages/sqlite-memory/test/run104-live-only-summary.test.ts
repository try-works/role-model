import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import {
  initializeSqliteMemory,
  persistRuntimeTelemetryFailure,
  readRuntimeTelemetryRecord,
  readRuntimeTelemetrySummary,
} from "../src/index.ts";

type SeedRow = {
  readonly id: string;
  readonly requestClass: string | null;
  readonly cached: number;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly actualCostUsd: number;
  readonly createdAtMs: number;
};

function seedTelemetry(databasePath: string, rows: readonly SeedRow[]): void {
  const database = new DatabaseSync(databasePath);
  try {
    const insert = database.prepare(
      `INSERT INTO runtime_telemetry_records (
         request_id, routing_decision_id, endpoint_id, conversation_id, created_at_ms,
         request_class, source_type, prompt_cache_used, prompt_cache_requested,
         latency_ms, input_tokens, output_tokens, total_tokens, cache_read_tokens, cache_write_tokens,
         actual_cost_usd, estimated_cost_usd, effective_cost_usd, cost_provenance,
         tool_call_count, tool_execution_count, provider_account_id, model_id, region,
         endpoint_kind, serving_source
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const row of rows) {
      insert.run(
        row.id,
        `decision-${row.id}`,
        "run104.endpoint",
        "run104-conversation",
        row.createdAtMs,
        row.requestClass,
        "remote",
        row.cached,
        0,
        row.latencyMs,
        row.inputTokens,
        row.outputTokens,
        row.inputTokens + row.outputTokens,
        row.cached === 1 ? row.inputTokens : 0,
        0,
        row.actualCostUsd,
        row.actualCostUsd,
        row.actualCostUsd,
        "provider_reported",
        0,
        0,
        "run104.account",
        "run104-model",
        "global",
        "remote_api",
        "remote-service",
      );
    }
  } finally {
    database.close();
  }
}

async function seedRoot(scopeId: string): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "run104-live-summary-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId,
    channel: "development",
  });
  return initialized.databasePath;
}

test("run104: the default summary is live-only and publishes the excluded classes", async () => {
  const databasePath = await seedRoot("run104-live-only");
  const now = Date.now();
  seedTelemetry(databasePath, [
    {
      id: "run104-live-row",
      requestClass: "live",
      cached: 1,
      latencyMs: 100,
      inputTokens: 10,
      outputTokens: 5,
      actualCostUsd: 0.01,
      createdAtMs: now - 1_000,
    },
    {
      id: "run104-bench-row",
      requestClass: "benchmark",
      cached: 0,
      latencyMs: 5_000,
      inputTokens: 30,
      outputTokens: 30,
      actualCostUsd: 0.5,
      createdAtMs: now - 2_000,
    },
    {
      id: "run104-replay-row",
      requestClass: "replay",
      cached: 0,
      latencyMs: 9_000,
      inputTokens: 20,
      outputTokens: 20,
      actualCostUsd: 0.25,
      createdAtMs: now - 3_000,
    },
  ]);

  const summary = readRuntimeTelemetrySummary({ databasePath, windowMs: 60_000 });

  // (e) the aggregate must equal a hand-computed value over the live fixture, not merely
  // "not equal to the mixed value".
  expect(summary.requestCount).toBe(1);
  expect(summary.successCount).toBe(1);
  expect(summary.failureCount).toBe(0);
  expect(summary.totalInputTokens).toBe(10);
  expect(summary.totalOutputTokens).toBe(5);
  expect(summary.totalTokens).toBe(15);
  expect(summary.cachedRequestCount).toBe(1);
  expect(summary.totalActualCostUsd).toBe(0.01);
  expect(summary.averageLatencyMs).toBe(100);
  expect(summary.p95LatencyMs).toBe(100);
  // Mixed cache-hit rate would be 1/3 (33%); the live-only rate is 1/1 (100%).
  expect(summary.cachedRequestCount / summary.requestCount).toBe(1);
  expect(summary.excludedRequestCount).toBe(2);
  expect(summary.excludedByClass).toEqual([
    { requestClass: "benchmark", requestCount: 1 },
    { requestClass: "replay", requestCount: 1 },
  ]);
});

test("run104: legacy live_request rows stay live and an explicit request can include every class", async () => {
  const databasePath = await seedRoot("run104-live-only-legacy");
  const now = Date.now();
  seedTelemetry(databasePath, [
    {
      id: "run104-legacy-live-row",
      requestClass: "live_request",
      cached: 1,
      latencyMs: 120,
      inputTokens: 11,
      outputTokens: 1,
      actualCostUsd: 0.02,
      createdAtMs: now - 1_000,
    },
    {
      id: "run104-legacy-bench-row",
      requestClass: "benchmark",
      cached: 0,
      latencyMs: 4_000,
      inputTokens: 40,
      outputTokens: 40,
      actualCostUsd: 0.4,
      createdAtMs: now - 2_000,
    },
  ]);

  const liveOnly = readRuntimeTelemetrySummary({ databasePath, windowMs: 60_000 });
  expect(liveOnly.requestCount).toBe(1);
  expect(liveOnly.cachedRequestCount).toBe(1);
  expect(liveOnly.excludedRequestCount).toBe(1);

  // The operator's "include them" escape hatch: an explicit class list wins over the default.
  const everyClass = readRuntimeTelemetrySummary({
    databasePath,
    windowMs: 60_000,
    trafficClasses: [],
  });
  expect(everyClass.requestCount).toBe(2);
  expect(everyClass.excludedRequestCount).toBe(0);
  expect(everyClass.excludedByClass).toEqual([]);
});

test("run104: request_class_source records a declaration and marks backfilled rows inferred", async () => {
  const databasePath = await seedRoot("run104-class-source");
  persistRuntimeTelemetryFailure({
    databasePath,
    requestId: "run104-declared-live",
    modelId: "run104-model",
    statusCode: 504, errorClass: "execution_failed",
    latencyMs: 12,
    requestClass: "live",
  });
  expect(readRuntimeTelemetryRecord({ databasePath, requestId: "run104-declared-live" })?.requestClassSource).toBe(
    "declared",
  );

  persistRuntimeTelemetryFailure({
    databasePath,
    requestId: "run104-undeclared",
    modelId: "run104-model",
    statusCode: 504, errorClass: "execution_failed",
    latencyMs: 12,
  });
  const undeclared = readRuntimeTelemetryRecord({ databasePath, requestId: "run104-undeclared" });
  expect(undeclared?.requestClass).toBe("unknown");
  expect(undeclared?.requestClassSource).toBeNull();

  // A row that already carried a class before source tracking existed is a backfill: the
  // migration re-runs only when its receipt is cleared, which is what a pre-existing store sees.
  seedTelemetry(databasePath, [
    {
      id: "run104-backfilled-replay",
      requestClass: "replay",
      cached: 0,
      latencyMs: 800,
      inputTokens: 5,
      outputTokens: 5,
      actualCostUsd: 0.05,
      createdAtMs: Date.now() - 500,
    },
  ]);
  const database = new DatabaseSync(databasePath);
  try {
    database
      .prepare("DELETE FROM migration_receipts WHERE migration_id = ?")
      .run("run104-request-class-source-backfill-v1");
  } finally {
    database.close();
  }
  initializeSqliteMemory({
    runtimeStateRoot: path.dirname(path.dirname(path.dirname(databasePath))),
    scopeId: "run104-class-source",
    channel: "development",
  });
  const backfilled = readRuntimeTelemetryRecord({
    databasePath,
    requestId: "run104-backfilled-replay",
  });
  expect(backfilled?.requestClass).toBe("replay");
  expect(backfilled?.requestClassSource).toBe("inferred");
});
