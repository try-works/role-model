import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  initializeSqliteMemory,
  persistRuntimeObservationBundle,
  readRuntimeTelemetryRecord,
  readRuntimeTelemetrySummary,
  updateRuntimeTelemetryClientLatency,
} from "../src/index.ts";

// Run 98 addendum 40 L1: `latency_ms` is the provider's response-header time. The operator needs the
// duration the client actually waited for, recorded separately from the provider breakdown.
function buildObservation(input: {
  readonly requestId: string;
  readonly providerHeaderMs: number;
  readonly providerCompletionMs?: number;
  readonly timeToFirstTokenMs?: number;
}) {
  return {
    requestId: input.requestId,
    routingDecisionId: `decision-${input.requestId}`,
    endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
    conversationId: "conversation-a40",
    usageEvent: {
      timestamp_ms: Date.now(),
      request_id: input.requestId,
      latency_ms: input.providerHeaderMs,
      tokens_in: 1_000,
      tokens_out: 10,
    },
    latencyBreakdown: {
      providerHeaderMs: input.providerHeaderMs,
      ...(input.providerCompletionMs === undefined
        ? {}
        : { providerCompletionMs: input.providerCompletionMs }),
      ...(input.timeToFirstTokenMs === undefined
        ? {}
        : { timeToFirstTokenMs: input.timeToFirstTokenMs }),
    },
    observedPerformance: {
      sample: {
        endpoint_id: "deepseek.personal.deepseek-api-key.global.deepseek-flash-high",
        model_id: "deepseek/deepseek-flash",
        source_type: "live_request",
        timestamp_ms: Date.now(),
        latency_ms: input.providerHeaderMs,
        success: true,
      },
      profile: { measured_at_ms: Date.now() },
    },
  } as never;
}

test("a40 L1: the provider breakdown is recorded separately from the existing header latency", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-a40-latency-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run98-a40-latency",
    channel: "development",
  });

  persistRuntimeObservationBundle({
    databasePath: initialized.databasePath,
    channel: "development",
    observation: buildObservation({
      requestId: "req-a40-breakdown",
      providerHeaderMs: 2_592,
      providerCompletionMs: 58_000,
      timeToFirstTokenMs: 900,
    }),
  });

  const record = readRuntimeTelemetryRecord({
    databasePath: initialized.databasePath,
    requestId: "req-a40-breakdown",
  });

  // The historical field keeps its meaning: provider response-header time.
  expect(record?.latencyMs).toBe(2_592);
  expect(record?.providerCompletionLatencyMs).toBe(58_000);
  expect(record?.timeToFirstTokenMs).toBe(900);
  // The client-visible duration is not known until the response has been flushed.
  expect(record?.requestLatencyMs).toBeNull();
});

test("a40 L1: the flushed response duration is written afterwards and drives its own percentile", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-a40-client-latency-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run98-a40-client",
    channel: "development",
  });

  for (const [requestId, headerMs, clientMs] of [
    ["req-a40-c1", 1_000, 12_000],
    ["req-a40-c2", 2_000, 41_000],
    ["req-a40-c3", 3_000, 59_000],
  ] as const) {
    persistRuntimeObservationBundle({
      databasePath: initialized.databasePath,
      channel: "development",
      observation: buildObservation({
        requestId,
        providerHeaderMs: headerMs,
        providerCompletionMs: clientMs - 500,
      }),
    });
    expect(
      updateRuntimeTelemetryClientLatency({
        databasePath: initialized.databasePath,
        channel: "development",
        requestId,
        requestLatencyMs: clientMs,
      }),
    ).toBe(true);
  }

  const record = readRuntimeTelemetryRecord({
    databasePath: initialized.databasePath,
    requestId: "req-a40-c3",
  });
  expect(record?.requestLatencyMs).toBe(59_000);

  const summary = readRuntimeTelemetrySummary({ databasePath: initialized.databasePath });
  expect(summary.requestLatencySampleCount).toBe(3);
  expect(summary.p95RequestLatencyMs).toBe(59_000);
  expect(summary.averageRequestLatencyMs).toBe(37_333);
  // The provider-header percentile is unchanged so existing readers keep their meaning.
  expect(summary.p95LatencyMs).toBe(3_000);
});

test("a40 L1: rows written before this change keep the provider percentile and report no client latency", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-a40-history-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run98-a40-history",
    channel: "development",
  });

  persistRuntimeObservationBundle({
    databasePath: initialized.databasePath,
    channel: "development",
    observation: buildObservation({ requestId: "req-a40-h1", providerHeaderMs: 4_800 }),
  });

  const summary = readRuntimeTelemetrySummary({ databasePath: initialized.databasePath });
  expect(summary.p95LatencyMs).toBe(4_800);
  expect(summary.p95RequestLatencyMs).toBeNull();
  expect(summary.averageRequestLatencyMs).toBeNull();
  expect(summary.requestLatencySampleCount).toBe(0);
});

test("a40 L1: updating an unknown request reports that nothing was written", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-a40-missing-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run98-a40-missing",
    channel: "development",
  });

  expect(
    updateRuntimeTelemetryClientLatency({
      databasePath: initialized.databasePath,
      channel: "development",
      requestId: "req-a40-absent",
      requestLatencyMs: 1_000,
    }),
  ).toBe(false);
});
