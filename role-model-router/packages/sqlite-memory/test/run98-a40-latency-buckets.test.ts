import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import {
  initializeSqliteMemory,
  persistRuntimeObservationBundle,
  readEndpointLatencyBuckets,
} from "../src/index.ts";

// Run 98 addendum 40 (L5): measured provider latency must be readable per endpoint and per prompt-size
// bucket, so a routing stage can prefer a better candidate *for this request's size* instead of a
// global average, and so the operator can see the sample counts behind that choice.
async function seedRow(input: {
  readonly databasePath: string;
  readonly endpointId: string;
  readonly requestId: string;
  readonly inputTokens: number;
  readonly latencyMs: number;
  readonly createdAtMs?: number;
}) {
  const nowMs = Date.now();
  persistRuntimeObservationBundle({
    databasePath: input.databasePath,
    channel: "development",
    observation: {
      requestId: input.requestId,
      routingDecisionId: `decision-${input.requestId}`,
      endpointId: input.endpointId,
      conversationId: "conversation-a40-buckets",
      usageEvent: {
        timestamp_ms: nowMs,
        request_id: input.requestId,
        latency_ms: input.latencyMs,
        tokens_in: input.inputTokens,
        tokens_out: 10,
      },
      observedPerformance: {
        sample: {
          endpoint_id: input.endpointId,
          model_id: "deepseek/deepseek-flash",
          source_type: "live_request",
          timestamp_ms: nowMs,
          latency_ms: input.latencyMs,
          success: true,
        },
        profile: { measured_at_ms: nowMs },
      },
    } as never,
  });
  if (input.createdAtMs !== undefined) {
    const database = new DatabaseSync(input.databasePath);
    database
      .prepare("UPDATE runtime_telemetry_records SET created_at_ms = ? WHERE request_id = ?")
      .run(input.createdAtMs, input.requestId);
    database.close();
  }
}

test("a40 L5: latency percentiles are reported per endpoint and prompt-size bucket", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run98-a40-buckets-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run98-a40-buckets",
    channel: "development",
  });
  const createdAtMs = Date.now() - 60_000;
  const fast = "endpoint.fast";
  const slow = "endpoint.slow";

  // Small prompts (< 50k tokens): the fast endpoint has 3 samples, the slow one 2.
  await seedRow({ databasePath: initialized.databasePath, endpointId: fast, requestId: "r-fast-1", inputTokens: 10_000, latencyMs: 1_000, createdAtMs });
  await seedRow({ databasePath: initialized.databasePath, endpointId: fast, requestId: "r-fast-2", inputTokens: 20_000, latencyMs: 1_200, createdAtMs });
  await seedRow({ databasePath: initialized.databasePath, endpointId: fast, requestId: "r-fast-3", inputTokens: 30_000, latencyMs: 1_400, createdAtMs });
  await seedRow({ databasePath: initialized.databasePath, endpointId: slow, requestId: "r-slow-1", inputTokens: 15_000, latencyMs: 9_000, createdAtMs });
  await seedRow({ databasePath: initialized.databasePath, endpointId: slow, requestId: "r-slow-2", inputTokens: 25_000, latencyMs: 11_000, createdAtMs });
  // Large prompts (>= 50k tokens): the fast endpoint is only present once.
  await seedRow({ databasePath: initialized.databasePath, endpointId: fast, requestId: "r-fast-large", inputTokens: 200_000, latencyMs: 20_000, createdAtMs });
  // Outside the window: must not contribute.
  await seedRow({ databasePath: initialized.databasePath, endpointId: slow, requestId: "r-slow-old", inputTokens: 20_000, latencyMs: 120_000, createdAtMs: createdAtMs - 7 * 24 * 60 * 60 * 1_000 });

  const buckets = readEndpointLatencyBuckets({
    databasePath: initialized.databasePath,
    endpointIds: [fast, slow],
    windowStartMs: createdAtMs - 3_600_000,
    windowEndMs: createdAtMs + 3_600_000,
    tokenBucketUpperBounds: [50_000],
    minimumSampleCount: 2,
  });

  expect(buckets).toEqual([
    {
      endpointId: fast,
      bucketUpperBoundTokens: 50_000,
      sampleCount: 3,
      p50LatencyMs: 1_200,
      p95LatencyMs: 1_400,
    },
    {
      endpointId: slow,
      bucketUpperBoundTokens: 50_000,
      sampleCount: 2,
      p50LatencyMs: 9_000,
      p95LatencyMs: 11_000,
    },
  ]);
});

test("a40 L5: buckets below the operator's sample floor are withheld instead of reported", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "run98-a40-buckets-floor-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot: root,
    scopeId: "run98-a40-buckets-floor",
    channel: "development",
  });
  const createdAtMs = Date.now();
  await seedRow({
    databasePath: initialized.databasePath,
    endpointId: "endpoint.thin",
    requestId: "r-thin-1",
    inputTokens: 1_000,
    latencyMs: 500,
    createdAtMs,
  });

  expect(
    readEndpointLatencyBuckets({
      databasePath: initialized.databasePath,
      endpointIds: ["endpoint.thin"],
      windowStartMs: createdAtMs - 60_000,
      windowEndMs: createdAtMs + 60_000,
      tokenBucketUpperBounds: [50_000],
      minimumSampleCount: 3,
    }),
  ).toEqual([]);
});
