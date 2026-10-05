import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { persistObservedBenchmarkSample } from "@role-model-router/sqlite-memory";

import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

/**
 * Run 98 addendum 43 S4 — the sample-backed runs must be readable through the API.
 *
 * On the live stage the runs API returned only the two artifact-backed completions from 09-12/13 and `404`
 * for `05f2e4ed…`, while 37 of that run's samples sat in the store and drove the model pool's quality axis.
 * A partial sweep must be visible, and it must not read as finished.
 */
test("run98 a43 S4: the API reports sample-backed sweeps with a state that cannot hide a stall", async () => {
  const runtimeStateRoot = await mkdir(
    path.join(os.tmpdir(), `run98-a43-sample-runs-api-${Date.now()}`),
    { recursive: true },
  );
  const scopeId = "run98-a43-sample-runs-api";
  try {
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
    });
    const endpointIds = backend.registry.endpoints
      .map((endpoint) => endpoint.identity.endpoint_id)
      .slice(0, 2);
    expect(endpointIds.length).toBeGreaterThanOrEqual(2);
    const [firstEndpointId, secondEndpointId] = endpointIds as [string, string];
    const databasePath = path.join(runtimeStateRoot, scopeId, "memory", "memory.sqlite");
    const nowMs = Date.now();
    const stalledAtMs = nowMs - 21 * 60 * 60 * 1_000;
    const seed = (
      runId: string | undefined,
      endpointId: string,
      timestampMs: number,
      index: number,
    ) =>
      persistObservedBenchmarkSample({
        databasePath,
        nowMs: timestampMs,
        sample: {
          endpoint_id: endpointId,
          endpoint_version: "v1",
          source_type: "benchmark",
          difficulty_bucket: "hard",
          timestamp_ms: timestampMs,
          latency_ms: 2_592 + index,
          judge_score: 1,
          ...(runId ? { benchmark_run_id: runId } : {}),
        } as never,
      });

    // The live shape: one endpoint finished the sweep, the next stopped at a single sample ~21 h ago.
    for (let index = 0; index < 12; index += 1) {
      seed("run-stalled-sweep", firstEndpointId, stalledAtMs + index * 1_000, index);
    }
    seed("run-stalled-sweep", secondEndpointId, stalledAtMs + 12_000, 12);

    const server = await startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      getRegistry: () => backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
      readRuntimeSummary: backend.readRuntimeSummary,
      readHealthStatus: backend.readHealthStatus,
      readBenchmarkSampleRunStates: backend.readBenchmarkSampleRunStates,
    });

    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/benchmark/sample-runs`,
      );
      expect(response.ok).toBe(true);
      const payload = (await response.json()) as {
        stalledAfterMs: number;
        runs: Array<{
          runId: string;
          state: string;
          sampleCount: number;
          lastSampleAtMs: number;
          endpointCounts: Array<{ endpointId: string; sampleCount: number }>;
        }>;
      };
      const run = payload.runs.find((entry) => entry.runId === "run-stalled-sweep");
      expect(run).toBeDefined();
      expect(run?.state).toBe("stalled");
      expect(run?.sampleCount).toBe(13);
      const counts = new Map(
        run?.endpointCounts.map((entry) => [entry.endpointId, entry.sampleCount]),
      );
      expect(counts.get(firstEndpointId)).toBe(12);
      expect(counts.get(secondEndpointId)).toBe(1);
      // The window the state is derived from is part of the answer, not a hidden constant.
      expect(payload.stalledAfterMs).toBeGreaterThan(0);
    } finally {
      await server.close();
      await backend.shutdown();
    }
  } finally {
    await rm(runtimeStateRoot, { recursive: true, force: true });
  }
});
