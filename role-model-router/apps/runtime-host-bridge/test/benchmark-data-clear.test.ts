import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
  clearAllObservedBenchmarkData,
  clearBenchmarkRunArtifacts,
  initializeSqliteMemory,
  persistObservedBenchmarkSample,
  readLatestObservedProfile,
} from "@role-model-router/sqlite-memory";

import { createRuntimeBridgeBackend, startBridgeServer } from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures");

describe("benchmark global data clear", () => {
  test("clearAllObservedBenchmarkData removes all benchmark samples and rebuilds profiles", async () => {
    const runtimeStateRoot = await mkdir(
      path.join(os.tmpdir(), `benchmark-clear-sqlite-${Date.now()}`),
      { recursive: true },
    ).then((dir) => dir);
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId: "benchmark-clear-sqlite",
    });
    const endpointId = "local.test.model";

    try {
      persistObservedBenchmarkSample({
        databasePath: initialized.databasePath,
        sample: {
          endpoint_id: endpointId,
          endpoint_version: "v1",
          source_type: "benchmark",
          difficulty_bucket: "hard",
          timestamp_ms: 1_000,
          latency_ms: 900,
          judge_score: 0.35,
        },
      });

      const cleared = clearAllObservedBenchmarkData({
        databasePath: initialized.databasePath,
        nowMs: 3_000,
      });
      expect(cleared).toEqual({ clearedSampleCount: 1, affectedEndpointCount: 1 });
      expect(
        readLatestObservedProfile({
          databasePath: initialized.databasePath,
          endpointId,
        }),
      ).toBeNull();
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("clearBenchmarkRunArtifacts removes benchmark run directories", async () => {
    const artifactRoot = path.join(os.tmpdir(), `benchmark-clear-artifacts-${Date.now()}`);
    await mkdir(path.join(artifactRoot, "run-a"), { recursive: true });
    await mkdir(path.join(artifactRoot, "run-b"), { recursive: true });
    await writeFile(path.join(artifactRoot, "run-a", "manifest.json"), "{}\n", "utf8");

    const cleared = clearBenchmarkRunArtifacts({ artifactRoot });
    expect(cleared).toEqual({ clearedRunCount: 2 });
    expect(clearBenchmarkRunArtifacts({ artifactRoot })).toEqual({ clearedRunCount: 0 });

    await rm(artifactRoot, { recursive: true, force: true });
  });

  test("DELETE /api/role-model/benchmark/data clears sqlite samples and artifact runs", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `benchmark-clear-api-${Date.now()}`);
    const scopeId = "benchmark-clear-api";

    try {
      const backend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
      });

      const firstEndpointId = backend.registry.endpoints[0]?.identity.endpoint_id;
      expect(firstEndpointId).toBeTruthy();
      if (!firstEndpointId) {
        throw new Error("Expected at least one endpoint in the benchmark clear test.");
      }

      persistObservedBenchmarkSample({
        databasePath: path.join(runtimeStateRoot, scopeId, "memory", "memory.sqlite"),
        sample: {
          endpoint_id: firstEndpointId,
          endpoint_version: "v1",
          source_type: "benchmark",
          difficulty_bucket: "hard",
          timestamp_ms: 1_000,
          latency_ms: 900,
          judge_score: 0.42,
        },
      });

      const artifactRoot = path.join(runtimeStateRoot, scopeId, "memory", "benchmark-runs");
      await mkdir(path.join(artifactRoot, "run-integration"), { recursive: true });
      await writeFile(
        path.join(artifactRoot, "run-integration", "manifest.json"),
        JSON.stringify({ gradingCompletedAtMs: 1 }),
        "utf8",
      );

      const server = await startBridgeServer({
        host: "127.0.0.1",
        port: 0,
        registry: backend.registry,
        getRegistry: () => backend.registry,
        executeChatCompletions: backend.executeChatCompletions,
        executeResponses: backend.executeResponses,
        readRuntimeSummary: backend.readRuntimeSummary,
        readHealthStatus: backend.readHealthStatus,
        clearBenchmarkData: backend.clearBenchmarkData,
      });

      try {
        const response = await fetch(
          `http://127.0.0.1:${server.port}/api/role-model/benchmark/data`,
          { method: "DELETE" },
        );
        expect(response.ok).toBe(true);
        const payload = (await response.json()) as {
          clearedSampleCount: number;
          affectedEndpointCount: number;
          clearedRunCount: number;
        };
        expect(payload.clearedSampleCount).toBe(1);
        expect(payload.affectedEndpointCount).toBe(1);
        expect(payload.clearedRunCount).toBe(1);
        expect(clearBenchmarkRunArtifacts({ artifactRoot })).toEqual({ clearedRunCount: 0 });
      } finally {
        await server.close();
        await backend.shutdown();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });
});
