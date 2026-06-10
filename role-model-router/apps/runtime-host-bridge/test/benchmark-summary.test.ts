import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  writeBenchmarkCompareRecord,
  writeBenchmarkRunManifest,
} from "../src/benchmark-artifacts.js";
import {
  EMPTY_BENCHMARK_SUMMARY,
  buildBenchmarkCapabilityForEndpoint,
  readLatestBenchmarkSummary,
  writeBenchmarkRunResult,
} from "../src/benchmark-summary.js";

describe("benchmark-summary", () => {
  let artifactRoot = "";

  afterEach(() => {
    artifactRoot = "";
  });

  async function createArtifactRoot(): Promise<string> {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-summary-"));
    return artifactRoot;
  }

  test("returns empty summary when no completed runs exist", async () => {
    const root = await createArtifactRoot();
    await expect(
      readLatestBenchmarkSummary({
        artifactRoot: root,
        resolveModelId: () => null,
      }),
    ).resolves.toEqual(EMPTY_BENCHMARK_SUMMARY);
  });

  test("reads the latest completed run summary from manifest and result artifacts", async () => {
    const root = await createArtifactRoot();
    const olderRunId = "run-older";
    const newerRunId = "run-newer";

    await writeBenchmarkRunManifest(root, {
      runId: olderRunId,
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.old",
      startedAtMs: 1,
      executionCompletedAtMs: 2,
      gradingCompletedAtMs: 3,
      endpointIds: ["local.lfm"],
      caseIds: ["h01"],
      responseCount: 1,
      judgeArtifactCount: 1,
      compareArtifactCount: 0,
    });
    await writeBenchmarkRunResult(root, {
      runId: olderRunId,
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "quick",
      judgeEndpointId: "judge.old",
      startedAtMs: 1,
      completedAtMs: 3,
      endpointGrades: [
        {
          endpointId: "local.lfm",
          modelId: "lfm2.5",
          sourceType: "local",
          overallScore: 0.33,
          byDifficulty: {
            easy: { score: 0.5, cases: 2 },
            medium: { score: 0.25, cases: 2 },
            hard: { score: 0.25, cases: 2 },
          },
          caseResults: [
            { caseId: "h01", difficultyBucket: "hard", score: 1 },
            { caseId: "h02", difficultyBucket: "hard", score: 0 },
          ],
        },
      ],
    });

    await writeBenchmarkRunManifest(root, {
      runId: newerRunId,
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "moonshot.kimi",
      startedAtMs: 10,
      executionCompletedAtMs: 20,
      gradingCompletedAtMs: 30,
      endpointIds: ["moonshot.kimi"],
      caseIds: ["h05"],
      responseCount: 1,
      judgeArtifactCount: 2,
      compareArtifactCount: 1,
    });
    await writeBenchmarkCompareRecord(root, {
      runId: newerRunId,
      caseId: "h02-fix-async-counter",
      models: [
        { endpointId: "moonshot.kimi", deliverablePreview: "mutex fix", perCaseScore: 0 },
        { endpointId: "local.lfm", deliverablePreview: "count++", perCaseScore: 1 },
      ],
      relativeRanking: ["moonshot.kimi", "local.lfm"],
      rationale: "Kimi fix is more complete.",
      rawResponse:
        '{"relativeRanking":["moonshot.kimi","local.lfm"],"rationale":"Kimi fix is more complete."}',
      judgeEndpointId: "moonshot.kimi",
      recordedAtMs: 31,
    });

    await writeBenchmarkRunResult(root, {
      runId: newerRunId,
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "quick",
      judgeEndpointId: "moonshot.kimi",
      startedAtMs: 10,
      completedAtMs: 30,
      endpointGrades: [
        {
          endpointId: "moonshot.kimi",
          modelId: "kimi-k2.6",
          sourceType: "remote",
          overallScore: 0.5,
          byDifficulty: {
            easy: { score: 0.6, cases: 3 },
            medium: { score: 0.5, cases: 3 },
            hard: { score: 0.4, cases: 3 },
          },
          caseResults: [
            { caseId: "h05", difficultyBucket: "hard", score: 1 },
            { caseId: "h06", difficultyBucket: "medium", score: 0 },
          ],
        },
      ],
    });

    const summary = await readLatestBenchmarkSummary({
      artifactRoot: root,
      resolveModelId: (endpointId) =>
        endpointId === "moonshot.kimi" ? "kimi-k2.6" : endpointId,
    });

    expect(summary.runId).toBe(newerRunId);
    expect(summary.completedAtMs).toBe(30);
    expect(summary.judgeEndpointId).toBe("moonshot.kimi");
    expect(summary.judgeModelId).toBe("kimi-k2.6");
    expect(summary.subjects).toHaveLength(1);
    expect(summary.subjects[0]?.overallScore).toBe(0.5);
    expect(summary.subjects[0]?.passingCaseIds).toEqual(["h05"]);
    expect(summary.manifest?.compareArtifactCount).toBe(1);
    expect(summary.caseComparisons).toEqual([
      {
        caseId: "h02-fix-async-counter",
        relativeRanking: ["moonshot.kimi", "local.lfm"],
        rationale: "Kimi fix is more complete.",
        compareFallback: undefined,
        compareError: undefined,
      },
    ]);
    expect(summary.caseAudits).toEqual([
      {
        caseId: "h05",
        endpointId: "moonshot.kimi",
        parseSuccess: undefined,
        judgeError: undefined,
        judgeUnavailable: undefined,
        cappedByValidator: undefined,
      },
      {
        caseId: "h06",
        endpointId: "moonshot.kimi",
        parseSuccess: undefined,
        judgeError: undefined,
        judgeUnavailable: undefined,
        cappedByValidator: undefined,
      },
    ]);
  });

  test("builds benchmark capability from profile and summary subject", async () => {
    const capability = buildBenchmarkCapabilityForEndpoint({
      endpointId: "moonshot.kimi",
      latestProfile: {
        judge_score: 0.5,
        quality_score: 0.5,
        sample_size: 12,
        measured_at_ms: 1_700_000_000_000,
        freshness_score: 0.8,
        sources: {
          benchmark_samples: 12,
          live_request_samples: 0,
        },
      },
      difficultyProfiles: {
        hard: { judge_score: 0.4 },
      },
      summary: {
        runId: "run-newer",
        completedAtMs: 30,
        mode: "quick",
        suiteId: "routing-capability-v2",
        suiteVersion: "2.0",
        judgeEndpointId: "judge.new",
        judgeModelId: "kimi-k2.6",
        artifactRoot: "run-newer",
        subjects: [
          {
            endpointId: "moonshot.kimi",
            modelId: "kimi-k2.6",
            overallScore: 0.5,
            scoresByBucket: {
              easy: { score: 0.6, cases: 3 },
              medium: { score: 0.5, cases: 3 },
              hard: { score: 0.4, cases: 3 },
            },
            passingCaseIds: ["h05"],
            caseCount: 2,
          },
        ],
        caseComparisons: [],
        caseAudits: [],
        manifest: {
          executionCompletedAtMs: 20,
          gradingCompletedAtMs: 30,
          judgeArtifactCount: 2,
          compareArtifactCount: 1,
        },
      },
    });

    expect(capability?.overallScore).toBe(0.5);
    expect(capability?.benchmarkSamples).toBe(12);
    expect(capability?.lastRunId).toBe("run-newer");
    expect(capability?.scoresByBucket?.hard?.score).toBe(0.4);
  });
});
