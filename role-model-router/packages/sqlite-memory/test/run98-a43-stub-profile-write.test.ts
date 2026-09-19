import { mkdtemp } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import {
  initializeSqliteMemory,
  persistRuntimeObservationBundle,
  readLatestObservedProfile,
} from "../src/index.ts";

/**
 * Run 98 addendum 43 S3 — the store must not keep a stub-shaped profile.
 *
 * The live stage held two endpoints whose latest `observed_profile_snapshots` row was
 * `{"measured_at_ms": …}` while their samples sat in `observed_performance_samples` beside it:
 * `deepseek…v4-pro-max` (2026-09-18 15:37 UTC) and `moonshot…kimi-k3` (2026-09-18 14:04 UTC). Those rows
 * are why both endpoints read as "no telemetry" in the model pool. Two guards are needed: the write path
 * must not accept a stub from its caller, and an existing stub row must be rebuilt from the samples.
 */
const ENDPOINT = "deepseek.personal.deepseek-api-key.global.deepseek-flash-high";

function buildStubProfileObservation(requestId: string, nowMs: number) {
  return {
    requestId,
    routingDecisionId: `decision-${requestId}`,
    endpointId: ENDPOINT,
    conversationId: "conversation-run98-a43",
    usageEvent: {
      timestamp_ms: nowMs,
      request_id: requestId,
      endpoint_id: ENDPOINT,
      model_id: "deepseek/deepseek-flash",
      latency_ms: 2_592,
      tokens_in: 1_200,
      tokens_out: 64,
    },
    observedPerformance: {
      endpointVersion: "v1",
      sample: {
        endpoint_id: ENDPOINT,
        endpoint_version: "v1",
        model_id: "deepseek/deepseek-flash",
        source_type: "live_request",
        timestamp_ms: nowMs,
        latency_ms: 2_592,
        success: true,
      },
      // The legacy shape: a caller that reduced the profile to the measurement timestamp alone.
      profile: { measured_at_ms: nowMs },
    },
  } as never;
}

test("run98 a43 S3: a caller-supplied stub profile cannot overwrite the endpoint's measured profile", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-a43-stub-write-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run98-a43-stub-write",
    channel: "development",
  });
  const nowMs = Date.now();

  persistRuntimeObservationBundle({
    databasePath: initialized.databasePath,
    channel: "development",
    observation: buildStubProfileObservation("req-run98-a43-stub-write", nowMs),
  });

  const profile = readLatestObservedProfile({
    databasePath: initialized.databasePath,
    endpointId: ENDPOINT,
  });
  expect(profile).not.toBeNull();
  // The persisted profile answers "how many samples back this, and how fast were they?" — a stub does not.
  expect(profile?.sample_size).toBe(1);
  expect(profile?.latency_ms_p50).toBe(2_592);
  expect(profile?.sources.live_request_samples).toBe(1);
});

test("run98 a43 S3: a legacy stub snapshot is rebuilt from samples on the next initialization", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-a43-stub-reprojection-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run98-a43-stub-reprojection",
    channel: "development",
  });
  const nowMs = Date.now();

  // Seed exactly what the live stage holds: a stub snapshot plus the samples it should have been built from.
  const database = new DatabaseSync(initialized.databasePath);
  const sampleJson = JSON.stringify({
    endpoint_id: ENDPOINT,
    endpoint_version: "v1",
    model_id: "deepseek/deepseek-flash",
    source_type: "live_request",
    timestamp_ms: nowMs,
    latency_ms: 2_592,
    success: true,
  });
  database
    .prepare(
      "INSERT OR REPLACE INTO observed_performance_samples (sample_id, endpoint_id, request_id, routing_decision_id, source_type, timestamp_ms, sample_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .run("sample-run98-a43", ENDPOINT, "req-run98-a43-legacy", null, "live_request", nowMs, sampleJson);
  database
    .prepare(
      "INSERT OR REPLACE INTO observed_profile_snapshots (snapshot_id, endpoint_id, measured_at_ms, profile_json) VALUES (?, ?, ?, ?)",
    )
    .run(`${ENDPOINT}:${nowMs}`, ENDPOINT, nowMs, JSON.stringify({ measured_at_ms: nowMs }));
  database.close();

  const stubBefore = readLatestObservedProfile({
    databasePath: initialized.databasePath,
    endpointId: ENDPOINT,
  });
  expect(
    (stubBefore as unknown as { readonly sample_size?: number } | null)?.sample_size,
  ).toBeUndefined();

  initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run98-a43-stub-reprojection",
    channel: "development",
  });

  const healed = readLatestObservedProfile({
    databasePath: initialized.databasePath,
    endpointId: ENDPOINT,
  });
  expect(healed?.sample_size).toBe(1);
  expect(healed?.latency_ms_p50).toBe(2_592);
});

/**
 * Every long-lived endpoint on the live stage mixes an older sample generation (written before
 * `reasoning_effort` existed) with the current one, and the aggregator rejects a set whose structured
 * identity conflicts. A repair that tried to rebuild from the whole history would fail initialization, so
 * the rebuild is scoped to the identity the newest sample belongs to.
 */
test("run98 a43 S3: a stub is rebuilt from the endpoint's current identity, not its whole history", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-a43-stub-identity-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run98-a43-stub-identity",
    channel: "development",
  });
  const nowMs = Date.now();

  const database = new DatabaseSync(initialized.databasePath);
  const insertSample = database.prepare(
    "INSERT OR REPLACE INTO observed_performance_samples (sample_id, endpoint_id, request_id, routing_decision_id, source_type, timestamp_ms, sample_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  // Older generation: the key is present but carries the then-current value. This is the live shape —
  // `kimi-k3` holds 453 samples with `reasoning_effort: null` beside 27 with `"high"` — and it is exactly
  // what `assertStructuredIdentityConsistency` refuses to mix, so a whole-history rebuild throws.
  insertSample.run(
    "sample-run98-a43-legacy-generation",
    ENDPOINT,
    "req-run98-a43-legacy",
    null,
    "live_request",
    nowMs - 60_000,
    JSON.stringify({
      endpoint_id: ENDPOINT,
      endpoint_version: "v1",
      model_id: "deepseek/deepseek-flash",
      reasoning_effort: null,
      effort_source: "none",
      source_type: "live_request",
      timestamp_ms: nowMs - 60_000,
      latency_ms: 900,
      success: true,
    }),
  );
  // Current generation: the newest sample carries the effort the endpoint is configured with now.
  insertSample.run(
    "sample-run98-a43-current-generation",
    ENDPOINT,
    "req-run98-a43-current",
    null,
    "live_request",
    nowMs,
    JSON.stringify({
      endpoint_id: ENDPOINT,
      endpoint_version: "v1",
      model_id: "deepseek/deepseek-flash",
      reasoning_effort: "max",
      effort_source: "variant",
      source_type: "live_request",
      timestamp_ms: nowMs,
      latency_ms: 2_592,
      success: true,
    }),
  );
  database
    .prepare(
      "INSERT OR REPLACE INTO observed_profile_snapshots (snapshot_id, endpoint_id, measured_at_ms, profile_json) VALUES (?, ?, ?, ?)",
    )
    .run(`${ENDPOINT}:${nowMs}`, ENDPOINT, nowMs, JSON.stringify({ measured_at_ms: nowMs }));
  database.close();

  // Initialization must survive the conflicting history, and the healed profile must describe the current
  // generation rather than throwing or averaging two different configurations together.
  initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run98-a43-stub-identity",
    channel: "development",
  });

  const healed = readLatestObservedProfile({
    databasePath: initialized.databasePath,
    endpointId: ENDPOINT,
  });
  expect(healed?.sample_size).toBe(1);
  expect(healed?.latency_ms_p50).toBe(2_592);
});
