import { mkdir, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, test } from "vitest";

import { readBenchmarkRunProgress } from "../src/benchmark-progress.js";
import { runRoutingCapabilityBenchmark } from "../src/benchmark-runner.js";
import { BenchmarkCancelledError, makeBenchmarkGateOwner } from "../src/benchmark-gate.js";

function initBenchmarkDatabase(databasePath: string): void {
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS observed_performance_samples (sample_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, request_id TEXT, routing_decision_id TEXT, source_type TEXT NOT NULL, timestamp_ms INTEGER NOT NULL, sample_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS observed_performance_samples_by_difficulty (sample_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, difficulty_bucket TEXT NOT NULL, request_id TEXT, routing_decision_id TEXT, source_type TEXT NOT NULL, timestamp_ms INTEGER NOT NULL, sample_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS observed_profile_snapshots (snapshot_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, measured_at_ms INTEGER NOT NULL, profile_json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS observed_profile_snapshots_by_difficulty (snapshot_id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, difficulty_bucket TEXT NOT NULL, measured_at_ms INTEGER NOT NULL, profile_json TEXT NOT NULL);
  `);
  database.close();
}

const endpoint = (endpointId: string, modelId: string, healthStatus = "healthy") => ({
  endpointId,
  modelId,
  sourceType: "remote" as const,
  healthStatus,
});

describe("benchmark runner endpoint accounting", () => {
  let artifactRoot = "";
  afterEach(() => {
    artifactRoot = "";
  });

  async function setup() {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-runner-endpoints-"));
    const databasePath = path.join(artifactRoot, "state", "memory.db");
    await mkdir(path.dirname(databasePath), { recursive: true });
    initBenchmarkDatabase(databasePath);
    return databasePath;
  }

  test("executes every requested endpoint, including two sharing a model, and keeps step progress aligned with the case cursor", async () => {
    const databasePath = await setup();
    const endpoints = [
      endpoint("ep-a", "shared/model"),
      endpoint("ep-b", "shared/model"),
      endpoint("ep-c", "other/model"),
    ];
    const runId = "run-three-endpoints";
    const progressAtCaseStart: number[] = [];
    let executionCalls = 0;
    const result = await runRoutingCapabilityBenchmark(
      {
        databasePath,
        benchmarkArtifactRoot: artifactRoot,
        listConfiguredEndpoints: async () => endpoints,
        deriveEndpointVersion: () => "v1",
        executeChatCompletions: async () => {
          const progress = readBenchmarkRunProgress(runId);
          expect(progress?.endpointCount).toBe(3);
          expect(progress?.requestedEndpointCount).toBe(3);
          expect(progress?.executedEndpointCount).toBe(3);
          expect(progress?.skippedEndpoints).toEqual([]);
          progressAtCaseStart.push(progress?.completedSteps ?? -1);
          executionCalls += 1;
          return { contentText: '{"answer":"ok"}' };
        },
      },
      {
        runId,
        endpointIds: endpoints.map((entry) => entry.endpointId),
        judgeEndpointId: null,
        mode: "quick",
        caseIds: ["h04-tool-read-router"],
        useJudge: false,
      },
    );
    expect(executionCalls).toBeGreaterThanOrEqual(3);
    expect([...new Set(progressAtCaseStart)]).toEqual([0, 1, 2]);
    expect(result.requestedEndpointCount).toBe(3);
    expect(result.executedEndpointCount).toBe(3);
    expect(result.skippedEndpoints).toEqual([]);
    expect(result.endpointGrades).toHaveLength(3);
    expect(readBenchmarkRunProgress(runId)).toMatchObject({
      completedSteps: 3,
      status: "completed",
      totalSteps: 3,
    });
  });

  test("reports an unhealthy requested endpoint instead of silently dropping it", async () => {
    const databasePath = await setup();
    const endpoints = [
      endpoint("ep-a", "model/a"),
      endpoint("ep-b", "model/b", "unhealthy"),
      endpoint("ep-c", "model/c"),
    ];
    const runId = "run-skipped-endpoint";
    const result = await runRoutingCapabilityBenchmark(
      {
        databasePath,
        benchmarkArtifactRoot: artifactRoot,
        listConfiguredEndpoints: async () => endpoints,
        deriveEndpointVersion: () => "v1",
        executeChatCompletions: async () => ({ contentText: '{"answer":"ok"}' }),
      },
      {
        runId,
        endpointIds: endpoints.map((entry) => entry.endpointId),
        judgeEndpointId: null,
        mode: "quick",
        caseIds: ["h04-tool-read-router"],
        useJudge: false,
      },
    );
    expect(result.requestedEndpointCount).toBe(3);
    expect(result.executedEndpointCount).toBe(2);
    expect(result.skippedEndpoints).toEqual([{ endpointId: "ep-b", reason: "unhealthy" }]);
    expect(result.endpointGrades.map((grade) => grade.endpointId).sort()).toEqual(["ep-a", "ep-c"]);
    expect(readBenchmarkRunProgress(runId)).toMatchObject({
      requestedEndpointCount: 3,
      executedEndpointCount: 2,
      skippedEndpoints: [{ endpointId: "ep-b", reason: "unhealthy" }],
      endpointCount: 2,
    });
  });

  test("bounds a hung provider case with caseTimeoutMs and records it as failed instead of stalling", async () => {
    const databasePath = await setup();
    const endpoints = [endpoint("ep-hung", "model/hung")];
    const startedAt = Date.now();
    const result = await runRoutingCapabilityBenchmark(
      {
        databasePath,
        benchmarkArtifactRoot: artifactRoot,
        listConfiguredEndpoints: async () => endpoints,
        deriveEndpointVersion: () => "v1",
        // A provider request that never resolves must not stall the run forever.
        executeChatCompletions: () => new Promise(() => {}),
        caseTimeoutMs: 250,
      },
      {
        runId: "run-hung-case",
        endpointIds: ["ep-hung"],
        judgeEndpointId: null,
        mode: "quick",
        caseIds: ["h04-tool-read-router"],
        useJudge: false,
      },
    );
    const elapsed = Date.now() - startedAt;
    // The run must complete promptly rather than hang, and the case must be recorded as failed.
    expect(elapsed).toBeLessThan(10_000);
    expect(["failed", "partial"]).toContain(result.outcome);
    expect(result.caseCounts.total).toBe(1);
    expect(result.caseCounts.failed).toBe(1);
  });

  test("a pre-aborted signal releases the gate instead of leaking BENCHMARK_BUSY", async () => {
    const databasePath = await setup();
    const endpoints = [endpoint("ep-a", "model-a")];
    const gate = makeBenchmarkGateOwner({ mode: "reject-overlap" });
    const controller = new AbortController();
    controller.abort();
    await expect(
      runRoutingCapabilityBenchmark(
        {
          databasePath,
          benchmarkArtifactRoot: artifactRoot,
          benchmarkGate: gate,
          signal: controller.signal,
          listConfiguredEndpoints: async () => endpoints,
          deriveEndpointVersion: () => "v1",
          executeChatCompletions: async () => ({ contentText: '{"answer":"ok"}' }),
        },
        {
          runId: "run-aborted",
          endpointIds: ["ep-a"],
          judgeEndpointId: null,
          mode: "quick",
          caseIds: ["h04-tool-read-router"],
          useJudge: false,
        },
      ),
    ).rejects.toBeInstanceOf(BenchmarkCancelledError);
    // The admission must be released, so a second run is not refused as busy.
    expect(gate.running()).toBe(false);
    const result = await runRoutingCapabilityBenchmark(
      {
        databasePath,
        benchmarkArtifactRoot: artifactRoot,
        benchmarkGate: gate,
        listConfiguredEndpoints: async () => endpoints,
        deriveEndpointVersion: () => "v1",
        executeChatCompletions: async () => ({ contentText: '{"answer":"ok"}' }),
      },
      {
        runId: "run-after-abort",
        endpointIds: ["ep-a"],
        judgeEndpointId: null,
        mode: "quick",
        caseIds: ["h04-tool-read-router"],
        useJudge: false,
      },
    );
    expect(result.runId).toBe("run-after-abort");
    expect(gate.running()).toBe(false);
  });
});