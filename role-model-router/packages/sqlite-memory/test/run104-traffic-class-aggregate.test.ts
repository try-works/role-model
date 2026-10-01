import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import { initializeSqliteMemory, readRuntimeTelemetrySummary } from "../src/index.ts";

type SeedRow = {
  readonly id: string;
  readonly requestClass: string;
  readonly cached: number;
  readonly latencyMs: number;
  readonly totalTokens: number;
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
         tool_call_count, tool_execution_count, provider_account_id, model_id, region,
         endpoint_kind, serving_source
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        row.totalTokens,
        1,
        row.totalTokens,
        row.cached === 1 ? row.totalTokens : 0,
        0,
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

test("run104: the telemetry summary can be restricted to live traffic", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run104-traffic-class-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run104",
    channel: "development",
  });
  const now = Date.now();
  seedTelemetry(initialized.databasePath, [
    { id: "run104-live", requestClass: "live", cached: 1, latencyMs: 100, totalTokens: 10, createdAtMs: now - 1_000 },
    { id: "run104-replay", requestClass: "replay", cached: 0, latencyMs: 9_000, totalTokens: 20, createdAtMs: now - 2_000 },
    { id: "run104-bench", requestClass: "benchmark", cached: 0, latencyMs: 5_000, totalTokens: 30, createdAtMs: now - 3_000 },
  ]);

  // Run 104 / R14: the unfiltered summary is live-only now; the mixed denominator is reachable only
  // when a caller asks for every class explicitly.
  const all = readRuntimeTelemetrySummary({
    databasePath: initialized.databasePath,
    windowMs: 60_000,
    trafficClasses: [],
  });
  expect(all.requestCount).toBe(3);

  const defaultSummary = readRuntimeTelemetrySummary({
    databasePath: initialized.databasePath,
    windowMs: 60_000,
  });
  expect(defaultSummary.requestCount).toBe(1);
  expect(defaultSummary.excludedRequestCount).toBe(2);

  const liveOnly = readRuntimeTelemetrySummary({
    databasePath: initialized.databasePath,
    windowMs: 60_000,
    trafficClasses: ["live"],
  });
  expect(liveOnly.requestCount).toBe(1);
  expect(liveOnly.cachedRequestCount).toBe(1);
  expect(liveOnly.totalTokens).toBe(10);
  expect(liveOnly.p95LatencyMs).toBe(100);
});

test("run104: legacy live_request rows count as live traffic", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run104-traffic-class-legacy-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run104-legacy",
    channel: "development",
  });
  const now = Date.now();
  seedTelemetry(initialized.databasePath, [
    {
      id: "run104-legacy-live",
      requestClass: "live_request",
      cached: 1,
      latencyMs: 120,
      totalTokens: 11,
      createdAtMs: now - 1_000,
    },
    { id: "run104-legacy-bench", requestClass: "benchmark", cached: 0, latencyMs: 4_000, totalTokens: 40, createdAtMs: now - 2_000 },
  ]);

  const liveOnly = readRuntimeTelemetrySummary({
    databasePath: initialized.databasePath,
    windowMs: 60_000,
    trafficClasses: ["live"],
  });
  expect(liveOnly.requestCount).toBe(1);
  expect(liveOnly.cachedRequestCount).toBe(1);
});
