import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { expect, test } from "vitest";

import { initializeSqliteMemory, readBenchmarkSampleRuns } from "../src/index.ts";

/**
 * Run 98 addendum 43 S4 — a benchmark sweep must finish or report why it stopped.
 *
 * The live stage holds three sample-backed sweeps that no read surface can see: the runs API lists only the
 * two artifact-backed completions and answers `404` for the rest, while the pool's quality scores are built
 * from those very samples. This read is the missing half — what the *samples* say about each run, with a
 * state that cannot pass a stopped sweep off as a finished one.
 */
const ENDPOINT_A = "deepseek.personal.deepseek-api-key.global.deepseek-flash-high";
const ENDPOINT_B = "moonshot.personal.kimi-code.global.kimi-k3";
const STALLED_AFTER_MS = 6 * 60 * 60 * 1_000;

function benchmarkSample(input: {
  readonly runId: string;
  readonly endpointId: string;
  readonly timestampMs: number;
  readonly mode?: string;
}) {
  return JSON.stringify({
    endpoint_id: input.endpointId,
    endpoint_version: "run07-registry-v1:custom-base-url",
    model_id: "deepseek/deepseek-flash",
    source_type: "benchmark",
    benchmark_run_id: input.runId,
    benchmark_mode: input.mode ?? "quick",
    completion_state: "completed",
    timestamp_ms: input.timestampMs,
    latency_ms: 2_592,
    judge_score: 1,
  });
}

test("run98 a43 S4: sample-backed runs carry per-endpoint counts and a stall-aware state", async () => {
  const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "run98-a43-sample-runs-"));
  const initialized = initializeSqliteMemory({
    runtimeStateRoot,
    scopeId: "run98-a43-sample-runs",
    channel: "development",
  });
  const nowMs = Date.now();
  const database = new DatabaseSync(initialized.databasePath);
  const insert = database.prepare(
    "INSERT OR REPLACE INTO observed_performance_samples (sample_id, endpoint_id, request_id, routing_decision_id, source_type, timestamp_ms, sample_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const seed = (runId: string, endpointId: string, index: number, timestampMs: number) =>
    insert.run(
      `${runId}-${endpointId}-${index}`,
      endpointId,
      `bench-${runId}-${index}`,
      null,
      "benchmark",
      timestampMs,
      benchmarkSample({ runId, endpointId, timestampMs }),
    );

  // A finished sweep: artifact-backed, so its samples are history rather than a live partial.
  for (let index = 0; index < 12; index += 1) {
    seed("run-completed", ENDPOINT_A, index, nowMs - 48 * 60 * 60 * 1_000 + index * 1_000);
  }
  // A sweep still inside the stall window.
  for (let index = 0; index < 3; index += 1) {
    seed("run-incomplete", ENDPOINT_A, index, nowMs - 60_000 + index * 1_000);
  }
  // The live shape: one endpoint finished, the next stopped at a single sample ~20 h ago.
  for (let index = 0; index < 12; index += 1) {
    seed("run-stalled", ENDPOINT_A, index, nowMs - 22 * 60 * 60 * 1_000 + index * 1_000);
  }
  seed("run-stalled", ENDPOINT_B, 0, nowMs - 21 * 60 * 60 * 1_000);
  database.close();

  const runs = readBenchmarkSampleRuns({
    databasePath: initialized.databasePath,
    completedRunIds: ["run-completed"],
    nowMs,
    stalledAfterMs: STALLED_AFTER_MS,
  });
  const byId = new Map(runs.map((run) => [run.runId, run]));

  expect(byId.get("run-completed")?.state).toBe("completed");
  expect(byId.get("run-incomplete")?.state).toBe("incomplete");
  expect(byId.get("run-stalled")?.state).toBe("stalled");
  expect(byId.get("run-stalled")?.mode).toBe("quick");

  // The counts are the acceptance: the read must agree with the store for the same run, per endpoint.
  expect(byId.get("run-stalled")?.sampleCount).toBe(13);
  const stalledEndpoints = new Map(
    byId.get("run-stalled")?.endpointCounts.map((entry) => [entry.endpointId, entry.sampleCount]),
  );
  expect(stalledEndpoints.get(ENDPOINT_A)).toBe(12);
  expect(stalledEndpoints.get(ENDPOINT_B)).toBe(1);
  expect(byId.get("run-completed")?.sampleCount).toBe(12);

  // A stale run cannot report itself as finished just because a complete-looking endpoint exists.
  expect(byId.get("run-stalled")?.lastSampleAtMs).toBe(nowMs - 21 * 60 * 60 * 1_000);
  expect(runs.every((run) => run.stalledAfterMs === STALLED_AFTER_MS)).toBe(true);
});
