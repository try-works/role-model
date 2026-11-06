import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import { writeBenchmarkRunManifest } from "../src/benchmark-artifacts.js";
import {
  benchmarkCaseCounts,
  benchmarkOutcomeFields,
  benchmarkRunOutcome,
} from "../src/benchmark-outcome.js";
import {
  EMPTY_BENCHMARK_SUMMARY,
  listBenchmarkRuns,
  readLatestBenchmarkSummary,
  writeBenchmarkRunResult,
} from "../src/benchmark-summary.js";
import { startBridgeServer } from "../src/index.js";

const grade = (scores: readonly number[]) => ({
  endpointId: "endpoint.a",
  modelId: "model/a",
  sourceType: "remote" as const,
  overallScore: 0.5,
  byDifficulty: {},
  caseResults: scores.map((score, index) => ({
    caseId: `case-${String(index)}`,
    difficultyBucket: "easy" as const,
    score,
  })),
});

describe("benchmark outcome", () => {
  test("derives total/passed/failed and passed/partial/failed from executed case scores", () => {
    const allPassed = benchmarkCaseCounts([grade([1, 1])]);
    expect(allPassed).toEqual({ failed: 0, passed: 2, total: 2 });
    expect(benchmarkRunOutcome(allPassed)).toBe("passed");
    const partial = benchmarkCaseCounts([grade([1, 0]), grade([0.4])]);
    expect(partial).toEqual({ failed: 1, passed: 2, total: 3 });
    expect(benchmarkRunOutcome(partial)).toBe("partial");
    const failed = benchmarkCaseCounts([grade([0, 0])]);
    expect(failed).toEqual({ failed: 2, passed: 0, total: 2 });
    expect(benchmarkRunOutcome(failed)).toBe("failed");
    const pending = benchmarkCaseCounts([]);
    expect(pending).toEqual({ failed: 0, passed: 0, total: 0 });
    expect(benchmarkRunOutcome(pending)).toBeNull();
    expect(benchmarkOutcomeFields([])).toEqual({
      caseCounts: { failed: 0, passed: 0, total: 0 },
      outcome: null,
    });
    expect(benchmarkOutcomeFields([grade([0, 1])])).toEqual({
      caseCounts: { failed: 1, passed: 1, total: 2 },
      outcome: "partial",
    });
  });

  test("serves caseCounts and outcome on the runs, active-progress and summary HTTP payloads", async () => {
    const fields = { caseCounts: { failed: 1, passed: 2, total: 3 }, outcome: "partial" as const };
    const run = {
      runId: "run-http",
      mode: "quick" as const,
      completedAtMs: 3,
      suiteId: "suite",
      caseCount: 3,
      endpointIds: ["endpoint.a"],
      ...fields,
    };
    const summary = {
      ...EMPTY_BENCHMARK_SUMMARY,
      runId: "run-http",
      completedAtMs: 3,
      mode: "quick" as const,
      suiteId: "suite",
      ...fields,
    };
    const active = {
      runId: "run-http",
      status: "completed" as const,
      mode: "quick" as const,
      startedAtMs: 1,
      updatedAtMs: 3,
      totalSteps: 3,
      completedSteps: 3,
      endpointIndex: 1,
      endpointCount: 1,
      currentEndpointId: null,
      currentEndpointModelId: null,
      caseIndex: 3,
      caseCount: 3,
      currentCaseId: null,
      currentPhase: null,
      runPhase: "complete" as const,
      judgeEndpointId: null,
      activeJudgeEndpointId: null,
      artifactRoot: "root",
      ...fields,
    };
    const server = await startBridgeServer(
      {
        host: "127.0.0.1",
        listBenchmarkRuns: async () => [run],
        port: 0,
        readActiveBenchmarkRun: async () => active,
        readBenchmarkSummary: async () => summary,
      } as never,
      { allowTestSeamBackend: true },
    );
    try {
      const base = `http://127.0.0.1:${String(server.port)}`;
      const [runs, activeResponse, summaryResponse] = await Promise.all([
        fetch(`${base}/api/role-model/benchmark/runs`).then((response) => response.json()),
        fetch(`${base}/api/role-model/benchmark/runs/active`).then((response) => response.json()),
        fetch(`${base}/api/role-model/benchmark/summary`).then((response) => response.json()),
      ]);
      expect(runs[0]).toMatchObject(fields);
      expect(activeResponse).toMatchObject(fields);
      expect(summaryResponse).toMatchObject(fields);
    } finally {
      await server.close();
    }
  });

  test("exposes caseCounts and outcome on the runs list and summary payloads", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "bench-outcome-"));
    await writeBenchmarkRunManifest(root, {
      runId: "run-partial",
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.a",
      startedAtMs: 1,
      executionCompletedAtMs: 2,
      gradingCompletedAtMs: 3,
      endpointIds: ["endpoint.a"],
      caseIds: ["case-0", "case-1", "case-2"],
      responseCount: 3,
      judgeArtifactCount: 3,
      compareArtifactCount: 0,
      completionState: "completed",
    });
    await writeBenchmarkRunResult(root, {
      runId: "run-partial",
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "quick",
      judgeEndpointId: "judge.a",
      startedAtMs: 1,
      completedAtMs: 3,
      endpointGrades: [grade([1, 0, 1])],
    });

    const runs = await listBenchmarkRuns(root);
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      caseCount: 3,
      caseCounts: { failed: 1, passed: 2, total: 3 },
      outcome: "partial",
      runId: "run-partial",
    });

    const summary = await readLatestBenchmarkSummary({
      artifactRoot: root,
      resolveModelId: () => null,
    });
    expect(summary.caseCounts).toEqual({ failed: 1, passed: 2, total: 3 });
    expect(summary.outcome).toBe("partial");
    expect(summary.subjects[0]?.passingCaseIds).toEqual(["case-0", "case-2"]);
    expect(summary.subjects[0]?.caseCount).toBe(3);
  });
});
