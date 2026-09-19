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
  listBenchmarkRuns,
  readBenchmarkSummariesByMode,
  readCurrentBenchmarkPortfolio,
  readLatestBenchmarkSummary,
  readLatestBenchmarkSummaryByMode,
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

  test("excludes an explicitly stale graded run even when a result artifact exists", async () => {
    const root = await createArtifactRoot();
    await writeBenchmarkRunManifest(root, {
      runId: "run-membership-drifted",
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.endpoint",
      startedAtMs: 1,
      executionCompletedAtMs: 2,
      gradingCompletedAtMs: 3,
      endpointIds: ["openai.luna-max"],
      caseIds: ["h01"],
      responseCount: 1,
      judgeArtifactCount: 1,
      compareArtifactCount: 1,
      membershipRevision: "membership-before",
      profileRevisionByEndpointId: {
        "openai.luna-max": "profile-luna-max",
      },
      completionState: "stale",
    });
    await writeBenchmarkRunResult(root, {
      runId: "run-membership-drifted",
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "quick",
      judgeEndpointId: "judge.endpoint",
      startedAtMs: 1,
      completedAtMs: 3,
      endpointGrades: [
        {
          endpointId: "openai.luna-max",
          modelId: "openai/gpt-5.6-luna",
          sourceType: "remote",
          reasoningEffort: "max",
          overallScore: 0.92,
          byDifficulty: {},
          caseResults: [{ caseId: "h01", difficultyBucket: "hard", score: 1 }],
        },
      ],
    });

    await expect(listBenchmarkRuns({ artifactRoot: root })).resolves.toEqual([]);
    await expect(
      readLatestBenchmarkSummary({ artifactRoot: root, resolveModelId: () => null }),
    ).resolves.toEqual(EMPTY_BENCHMARK_SUMMARY);
    await expect(
      readLatestBenchmarkSummaryByMode({
        artifactRoot: root,
        mode: "quick",
        resolveModelId: () => null,
      }),
    ).resolves.toEqual(EMPTY_BENCHMARK_SUMMARY);
  });

  test("excludes a completed manifest when its result artifact is absent", async () => {
    const root = await createArtifactRoot();
    await writeBenchmarkRunManifest(root, {
      runId: "run-result-missing",
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.endpoint",
      startedAtMs: 1,
      executionCompletedAtMs: 2,
      gradingCompletedAtMs: 3,
      endpointIds: ["openai.luna-max"],
      caseIds: ["h01"],
      responseCount: 1,
      judgeArtifactCount: 1,
      compareArtifactCount: 1,
      membershipRevision: "membership-current",
      profileRevisionByEndpointId: {
        "openai.luna-max": "profile-luna-max",
      },
      completionState: "completed",
    });

    await expect(listBenchmarkRuns({ artifactRoot: root })).resolves.toEqual([]);
    await expect(
      readLatestBenchmarkSummary({ artifactRoot: root, resolveModelId: () => null }),
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
      resolveModelId: (endpointId) => (endpointId === "moonshot.kimi" ? "kimi-k2.6" : endpointId),
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
        latencyMs: undefined,
        parseSuccess: undefined,
        judgeError: undefined,
        judgeUnavailable: undefined,
        cappedByValidator: undefined,
      },
      {
        caseId: "h06",
        endpointId: "moonshot.kimi",
        latencyMs: undefined,
        parseSuccess: undefined,
        judgeError: undefined,
        judgeUnavailable: undefined,
        cappedByValidator: undefined,
      },
    ]);
  });

  test("builds a current per-endpoint portfolio across later partial runs", async () => {
    const root = await createArtifactRoot();
    const sharedGrade = (endpointId: string, modelId: string, overallScore: number) => ({
      endpointId,
      modelId,
      sourceType: "remote" as const,
      overallScore,
      byDifficulty: {
        easy: { score: overallScore, cases: 1 },
        medium: { score: overallScore, cases: 1 },
        hard: { score: overallScore, cases: 1 },
      },
      caseResults: [
        { caseId: `${endpointId}-case`, difficultyBucket: "hard" as const, score: overallScore },
      ],
    });

    await writeBenchmarkRunManifest(root, {
      runId: "run-high",
      suiteId: "routing-capability-v2",
      mode: "full",
      judgeEndpointId: "judge.high",
      startedAtMs: 10,
      executionCompletedAtMs: 20,
      gradingCompletedAtMs: 30,
      endpointIds: ["deepseek.flash-high", "deepseek.flash-max"],
      caseIds: ["high-case", "max-case"],
      responseCount: 2,
      judgeArtifactCount: 2,
      compareArtifactCount: 0,
    });
    await writeBenchmarkRunResult(root, {
      runId: "run-high",
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "full",
      judgeEndpointId: "judge.high",
      startedAtMs: 10,
      completedAtMs: 30,
      endpointGrades: [
        sharedGrade("deepseek.flash-high", "deepseek-v4-flash", 0.81),
        sharedGrade("deepseek.flash-max", "deepseek-v4-flash", 0.93),
      ],
    });

    await writeBenchmarkRunManifest(root, {
      runId: "run-high-refresh",
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.refresh",
      startedAtMs: 40,
      executionCompletedAtMs: 50,
      gradingCompletedAtMs: 60,
      endpointIds: ["deepseek.flash-high"],
      caseIds: ["high-case"],
      responseCount: 1,
      judgeArtifactCount: 1,
      compareArtifactCount: 0,
    });
    await writeBenchmarkRunResult(root, {
      runId: "run-high-refresh",
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "quick",
      judgeEndpointId: "judge.refresh",
      startedAtMs: 40,
      completedAtMs: 60,
      endpointGrades: [sharedGrade("deepseek.flash-high", "deepseek-v4-flash", 0.84)],
    });

    const portfolio = await readCurrentBenchmarkPortfolio({
      artifactRoot: root,
      resolveModelId: (endpointId) => endpointId,
    });

    expect(portfolio.scoreSemantics).toEqual({
      storageScale: "normalized-fraction-0-to-1",
      displayScale: "percentage-0-to-100",
      overallAggregation: "unweighted-arithmetic-mean-of-executed-case-scores",
      currentEvidencePolicy: "latest-completed-run-per-endpoint",
      replacementScope: "endpoint-only",
      zeroScoreMeaning: "executed-zero-credit",
      absentScoreMeaning: "no-evidence",
    });

    expect(portfolio.entries).toEqual([
      expect.objectContaining({
        endpointId: "deepseek.flash-high",
        overallScore: 0.84,
        runId: "run-high-refresh",
        completedAtMs: 60,
        judgeEndpointId: "judge.refresh",
      }),
      expect.objectContaining({
        endpointId: "deepseek.flash-max",
        overallScore: 0.93,
        runId: "run-high",
        completedAtMs: 30,
        judgeEndpointId: "judge.high",
      }),
    ]);
  });

  test("quarantines revisionless and mismatched manifests from a current-membership portfolio", async () => {
    const root = await createArtifactRoot();
    const writeRun = async (input: {
      readonly runId: string;
      readonly membershipRevision?: string;
      readonly profileRevision?: string;
    }) => {
      await writeBenchmarkRunManifest(root, {
        runId: input.runId,
        suiteId: "routing-capability-v2",
        mode: "quick",
        judgeEndpointId: "judge.endpoint",
        startedAtMs: 1,
        executionCompletedAtMs: 2,
        gradingCompletedAtMs: 3,
        endpointIds: ["deepseek.flash-high"],
        caseIds: ["case"],
        responseCount: 1,
        judgeArtifactCount: 1,
        compareArtifactCount: 0,
        ...(input.membershipRevision ? { membershipRevision: input.membershipRevision } : {}),
        ...(input.profileRevision
          ? { profileRevisionByEndpointId: { "deepseek.flash-high": input.profileRevision } }
          : {}),
        ...(input.profileRevision ? { completionState: "completed" as const } : {}),
      });
      await writeBenchmarkRunResult(root, {
        runId: input.runId,
        suiteId: "routing-capability-v2",
        suiteVersion: "2.0",
        mode: "quick",
        judgeEndpointId: "judge.endpoint",
        startedAtMs: 1,
        completedAtMs: 3,
        endpointGrades: [
          {
            endpointId: "deepseek.flash-high",
            modelId: "deepseek-v4-flash",
            sourceType: "remote",
            overallScore: 0.8,
            byDifficulty: {
              easy: { score: 0.8, cases: 1 },
              medium: { score: 0, cases: 0 },
              hard: { score: 0, cases: 0 },
            },
            caseResults: [{ caseId: "case", difficultyBucket: "easy", score: 0.8 }],
          },
        ],
      });
    };

    await writeRun({ runId: "legacy" });
    await writeRun({
      runId: "mismatched",
      membershipRevision: "membership-old",
      profileRevision: "p-old",
    });
    await writeRun({
      runId: "current",
      membershipRevision: "membership-current",
      profileRevision: "p-current",
    });

    const portfolio = await readCurrentBenchmarkPortfolio({
      artifactRoot: root,
      resolveModelId: (endpointId) => endpointId,
      membershipRevision: "membership-current",
    });

    expect(portfolio.entries).toEqual([
      expect.objectContaining({ runId: "current", profileRevision: "p-current" }),
    ]);
  });

  test("builds exact run capability even when no learned profile exists", () => {
    const capability = buildBenchmarkCapabilityForEndpoint({
      endpointId: "deepseek.flash-max",
      latestProfile: null,
      summary: EMPTY_BENCHMARK_SUMMARY,
      portfolioEntry: {
        endpointId: "deepseek.flash-max",
        modelId: "deepseek/deepseek-v4-flash",
        sourceType: "remote",
        reasoningEffort: "max",
        overallScore: 0.4,
        scoresByBucket: {
          easy: { score: 0, cases: 0 },
          medium: { score: 0, cases: 0 },
          hard: { score: 0.4, cases: 1 },
        },
        passingCaseIds: ["h01"],
        caseCount: 1,
        runId: "run-max",
        completedAtMs: 10,
        mode: "quick",
        suiteId: "routing-capability-v2",
        suiteVersion: "2.0",
        judgeEndpointId: "judge.pro",
        judgeModelId: "deepseek/deepseek-v4-pro",
      },
    });

    expect(capability).toEqual(
      expect.objectContaining({
        evidenceSource: "run-artifact",
        overallScore: 0.4,
        benchmarkSamples: 1,
        sampleCount: 1,
        lastRunId: "run-max",
      }),
    );
  });

  test("round-trips latencyMs in result.json", async () => {
    const root = await createArtifactRoot();
    const runId = "run-latency";

    await writeBenchmarkRunManifest(root, {
      runId,
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.latency",
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
      runId,
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "quick",
      judgeEndpointId: "judge.latency",
      startedAtMs: 1,
      completedAtMs: 3,
      endpointGrades: [
        {
          endpointId: "local.lfm",
          modelId: "lfm2.5",
          sourceType: "local",
          overallScore: 0.8,
          byDifficulty: {
            easy: { score: 0, cases: 0 },
            medium: { score: 0, cases: 0 },
            hard: { score: 0.8, cases: 1 },
          },
          caseResults: [
            {
              caseId: "h01",
              difficultyBucket: "hard",
              score: 0.8,
              latencyMs: 1_234,
            },
          ],
        },
      ],
    });

    const summary = await readLatestBenchmarkSummary({
      artifactRoot: root,
      resolveModelId: () => "lfm2.5",
    });

    expect(summary.caseAudits).toEqual([
      {
        caseId: "h01",
        endpointId: "local.lfm",
        latencyMs: 1_234,
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
      portfolioEntry: {
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
        runId: "run-newer",
        completedAtMs: 30,
        mode: "quick",
        suiteId: "routing-capability-v2",
        suiteVersion: "2.0",
        judgeEndpointId: "judge.new",
        judgeModelId: "kimi-k2.6",
      },
    });

    expect(capability?.overallScore).toBe(0.5);
    expect(capability?.benchmarkSamples).toBe(12);
    expect(capability?.lastRunId).toBe("run-newer");
    expect(capability?.scoresByBucket?.hard?.score).toBe(0.4);
  });

  test("does not borrow global latest-run provenance when the endpoint is absent", () => {
    const capability = buildBenchmarkCapabilityForEndpoint({
      endpointId: "deepseek.flash-max",
      latestProfile: {
        judge_score: 0.93,
        sample_size: 3,
        measured_at_ms: 30,
        sources: { benchmark_samples: 3 },
      },
      summary: {
        runId: "run-high-only",
        completedAtMs: 60,
        mode: "quick",
        suiteId: "routing-capability-v2",
        suiteVersion: "2.0",
        judgeEndpointId: "judge.refresh",
        judgeModelId: "judge-model",
        artifactRoot: "run-high-only",
        subjects: [
          {
            endpointId: "deepseek.flash-high",
            modelId: "deepseek-v4-flash",
            overallScore: 0.84,
            scoresByBucket: {
              easy: { score: 0.84, cases: 1 },
              medium: { score: 0.84, cases: 1 },
              hard: { score: 0.84, cases: 1 },
            },
            passingCaseIds: ["case"],
            caseCount: 1,
          },
        ],
        caseComparisons: [],
        caseAudits: [],
        manifest: {
          executionCompletedAtMs: 50,
          gradingCompletedAtMs: 60,
          judgeArtifactCount: 1,
          compareArtifactCount: 0,
        },
      },
    });

    expect(capability).toMatchObject({
      overallScore: 0.93,
      evidenceSource: "profile-derived",
      lastRunId: null,
      lastRunCompletedAtMs: null,
      judgeEndpointId: null,
    });
  });

  /**
   * Run 98 addendum 42 B1 supersedes the rule this test used to encode ("never fall back to a summary
   * subject"). The operator's instruction is explicit: quality comes from benchmark data until an
   * alternative exists. What still must hold — and is asserted in the a42 test above — is that evidence is
   * keyed per endpoint: a subject for a different endpoint is never used, so a run covering another pool
   * cannot move this candidate. This fixture is a run that measured `deepseek.flash-max`, so under the new
   * rule it supplies that endpoint's capability.
   */
  test("uses a latest-summary subject for the same endpoint when no current portfolio entry exists", () => {
    const capability = buildBenchmarkCapabilityForEndpoint({
      endpointId: "deepseek.flash-max",
      latestProfile: null,
      summary: {
        runId: "historical-other-membership",
        completedAtMs: 60,
        mode: "quick",
        suiteId: "routing-capability-v2",
        suiteVersion: "2.0",
        judgeEndpointId: "judge.refresh",
        judgeModelId: "judge-refresh-model",
        artifactRoot: "historical-other-membership",
        subjects: [
          {
            endpointId: "deepseek.flash-max",
            modelId: "deepseek-v4-flash",
            overallScore: 0.93,
            scoresByBucket: {
              easy: { score: 0.93, cases: 1 },
              medium: { score: 0.93, cases: 1 },
              hard: { score: 0.93, cases: 1 },
            },
            passingCaseIds: ["case"],
            caseCount: 1,
          },
        ],
        caseComparisons: [],
        caseAudits: [],
        manifest: null,
      },
      portfolioEntry: null,
    });

    expect(capability).toMatchObject({
      evidenceSource: "run-artifact",
      overallScore: 0.93,
      lastRunId: "historical-other-membership",
    });
  });

  test("uses the exact endpoint portfolio entry instead of a newer sibling-only summary", () => {
    const capability = buildBenchmarkCapabilityForEndpoint({
      endpointId: "deepseek.flash-max",
      latestProfile: {
        judge_score: 0.93,
        sample_size: 3,
        measured_at_ms: 30,
        sources: { benchmark_samples: 3 },
      },
      summary: {
        runId: "run-high-refresh",
        completedAtMs: 60,
        mode: "quick",
        suiteId: "routing-capability-v2",
        suiteVersion: "2.0",
        judgeEndpointId: "judge.refresh",
        judgeModelId: "judge-refresh-model",
        artifactRoot: "run-high-refresh",
        subjects: [],
        caseComparisons: [],
        caseAudits: [],
        manifest: null,
      },
      portfolioEntry: {
        endpointId: "deepseek.flash-max",
        modelId: "deepseek-v4-flash",
        reasoningEffort: "max",
        overallScore: 0.93,
        scoresByBucket: {
          easy: { score: 0.9, cases: 1 },
          medium: { score: 0.92, cases: 1 },
          hard: { score: 0.97, cases: 1 },
        },
        passingCaseIds: ["max-case"],
        caseCount: 1,
        taxonomyScores: { byTask: { "coder.review": 0.97 } },
        runId: "run-max-original",
        completedAtMs: 30,
        mode: "full",
        suiteId: "routing-capability-v2",
        judgeEndpointId: "judge.original",
        judgeModelId: "judge-original-model",
      },
    });

    expect(capability).toMatchObject({
      overallScore: 0.93,
      evidenceSource: "run-artifact",
      taskScores: { "coder.review": 0.97 },
      lastRunId: "run-max-original",
      lastRunCompletedAtMs: 30,
      lastRunMode: "full",
      judgeEndpointId: "judge.original",
      judgeModelId: "judge-original-model",
    });
  });

  test("rejects duplicate exact endpoint entries instead of silently choosing one score", async () => {
    const root = await createArtifactRoot();
    const runId = "run-duplicate-endpoint";
    await writeBenchmarkRunManifest(root, {
      runId,
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.endpoint",
      startedAtMs: 1,
      executionCompletedAtMs: 2,
      gradingCompletedAtMs: 3,
      endpointIds: ["deepseek.flash-high"],
      caseIds: ["case"],
      responseCount: 1,
      judgeArtifactCount: 1,
      compareArtifactCount: 0,
    });
    const grade = {
      endpointId: "deepseek.flash-high",
      modelId: "deepseek-v4-flash",
      sourceType: "remote" as const,
      reasoningEffort: "high",
      overallScore: 0.81,
      byDifficulty: {
        easy: { score: 0.81, cases: 1 },
        medium: { score: 0, cases: 0 },
        hard: { score: 0, cases: 0 },
      },
      caseResults: [{ caseId: "case", difficultyBucket: "easy" as const, score: 0.81 }],
    };
    await writeBenchmarkRunResult(root, {
      runId,
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "quick",
      judgeEndpointId: "judge.endpoint",
      startedAtMs: 1,
      completedAtMs: 3,
      endpointGrades: [grade, { ...grade, overallScore: 0.99 }],
    });

    await expect(
      readCurrentBenchmarkPortfolio({ artifactRoot: root, resolveModelId: () => null }),
    ).rejects.toThrow(/duplicate benchmark endpoint/i);
  });

  test("builds assignment-aware role and group benchmark fit from taxonomy summary data", async () => {
    const capability = buildBenchmarkCapabilityForEndpoint({
      endpointId: "moonshot.kimi",
      latestProfile: {
        judge_score: 0.74,
        quality_score: 0.74,
        sample_size: 6,
        measured_at_ms: 1_700_000_000_000,
        freshness_score: 0.8,
        sources: {
          benchmark_samples: 6,
          live_request_samples: 0,
        },
      },
      difficultyProfiles: {
        hard: { judge_score: 0.7 },
      },
      availableRoleIds: ["coder"],
      summary: {
        runId: "run-role-fit",
        completedAtMs: 30,
        mode: "quick",
        suiteId: "routing-capability-v2",
        suiteVersion: "2.0",
        judgeEndpointId: "judge.new",
        judgeModelId: "kimi-k2.6",
        artifactRoot: "run-role-fit",
        subjects: [
          {
            endpointId: "moonshot.kimi",
            modelId: "kimi-k2.6",
            overallScore: 0.74,
            scoresByBucket: {
              easy: { score: 0.8, cases: 2 },
              medium: { score: 0.7, cases: 2 },
              hard: { score: 0.72, cases: 2 },
            },
            passingCaseIds: ["h01", "h03", "h04"],
            caseCount: 4,
            taxonomyScores: {
              byRole: {
                coder: 0.9,
                writer: 0.55,
              },
              byTask: {
                "coder.review": 0.92,
                "writer.docs.write": 0.55,
              },
              byVariant: {},
              byCapability: {},
              byModality: {},
              byToolClass: {},
            },
            taxonomyCoverage: {
              byRole: {
                coder: 3,
                writer: 1,
              },
              byTask: {
                "coder.review": 3,
                "writer.docs.write": 1,
              },
              byVariant: {},
              byCapability: {},
              byModality: {},
              byToolClass: {},
            },
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
      portfolioEntry: {
        endpointId: "moonshot.kimi",
        modelId: "kimi-k2.6",
        overallScore: 0.74,
        scoresByBucket: {
          easy: { score: 0.8, cases: 2 },
          medium: { score: 0.7, cases: 2 },
          hard: { score: 0.72, cases: 2 },
        },
        passingCaseIds: ["h01", "h03", "h04"],
        caseCount: 4,
        taxonomyScores: {
          byRole: { coder: 0.9, writer: 0.55 },
          byTask: { "coder.review": 0.92, "writer.docs.write": 0.55 },
          byVariant: {},
          byCapability: {},
          byModality: {},
          byToolClass: {},
        },
        taxonomyCoverage: {
          byRole: { coder: 3, writer: 1 },
          byTask: { "coder.review": 3, "writer.docs.write": 1 },
          byVariant: {},
          byCapability: {},
          byModality: {},
          byToolClass: {},
        },
        runId: "run-role-fit",
        completedAtMs: 30,
        mode: "quick",
        suiteId: "routing-capability-v2",
        suiteVersion: "2.0",
        judgeEndpointId: "judge.new",
        judgeModelId: "kimi-k2.6",
      },
    });

    expect(capability?.roleScores).toEqual({
      coder: 0.9,
      writer: 0.55,
    });
    expect(capability?.eligibleRoleScores).toEqual({
      coder: 0.9,
    });
    expect(capability?.groupScores).toEqual({
      engineering: 0.9,
    });
    expect(capability?.coverage).toEqual({
      overallCases: 4,
      roleCases: {
        coder: 3,
        writer: 1,
      },
      groupCases: {
        engineering: 3,
      },
      lowCoverageRoleIds: ["writer"],
      lowCoverageGroupIds: [],
    });
  });

  test("lists completed runs and resolves latest summary per mode", async () => {
    const root = await createArtifactRoot();
    const fullRunId = "run-full";
    const quickRunId = "run-quick";

    await writeBenchmarkRunManifest(root, {
      runId: fullRunId,
      suiteId: "routing-capability-v2",
      mode: "full",
      judgeEndpointId: "judge.full",
      startedAtMs: 100,
      executionCompletedAtMs: 200,
      gradingCompletedAtMs: 300,
      endpointIds: ["endpoint.full"],
      caseIds: ["f01", "f02", "f03"],
      responseCount: 3,
      judgeArtifactCount: 3,
      compareArtifactCount: 0,
    });
    await writeBenchmarkRunResult(root, {
      runId: fullRunId,
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "full",
      judgeEndpointId: "judge.full",
      startedAtMs: 100,
      completedAtMs: 300,
      endpointGrades: [
        {
          endpointId: "endpoint.full",
          modelId: "model-full",
          sourceType: "local",
          overallScore: 0.82,
          byDifficulty: {
            easy: { score: 0.9, cases: 1 },
            medium: { score: 0.8, cases: 1 },
            hard: { score: 0.75, cases: 1 },
          },
          caseResults: [
            { caseId: "f01", difficultyBucket: "easy", score: 0.9 },
            { caseId: "f02", difficultyBucket: "medium", score: 0.8 },
            { caseId: "f03", difficultyBucket: "hard", score: 0.75 },
          ],
        },
      ],
    });

    await writeBenchmarkRunManifest(root, {
      runId: quickRunId,
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.quick",
      startedAtMs: 400,
      executionCompletedAtMs: 500,
      gradingCompletedAtMs: 600,
      endpointIds: ["endpoint.quick"],
      caseIds: ["q01"],
      responseCount: 1,
      judgeArtifactCount: 1,
      compareArtifactCount: 0,
    });
    await writeBenchmarkRunResult(root, {
      runId: quickRunId,
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "quick",
      judgeEndpointId: "judge.quick",
      startedAtMs: 400,
      completedAtMs: 600,
      endpointGrades: [
        {
          endpointId: "endpoint.quick",
          modelId: "model-quick",
          sourceType: "remote",
          overallScore: 0.71,
          byDifficulty: {
            easy: { score: 0, cases: 0 },
            medium: { score: 0, cases: 0 },
            hard: { score: 0.71, cases: 1 },
          },
          caseResults: [{ caseId: "q01", difficultyBucket: "hard", score: 0.71 }],
        },
      ],
    });

    await expect(listBenchmarkRuns(root)).resolves.toEqual([
      {
        runId: quickRunId,
        mode: "quick",
        completedAtMs: 600,
        suiteId: "routing-capability-v2",
        caseCount: 1,
        endpointIds: ["endpoint.quick"],
      },
      {
        runId: fullRunId,
        mode: "full",
        completedAtMs: 300,
        suiteId: "routing-capability-v2",
        caseCount: 3,
        endpointIds: ["endpoint.full"],
      },
    ]);

    await expect(
      readLatestBenchmarkSummaryByMode({
        artifactRoot: root,
        mode: "full",
        resolveModelId: (endpointId) => endpointId,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        runId: fullRunId,
        mode: "full",
        completedAtMs: 300,
        subjects: [
          expect.objectContaining({
            endpointId: "endpoint.full",
            overallScore: 0.82,
          }),
        ],
      }),
    );

    await expect(
      readLatestBenchmarkSummaryByMode({
        artifactRoot: root,
        mode: "quick",
        resolveModelId: (endpointId) => endpointId,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        runId: quickRunId,
        mode: "quick",
        completedAtMs: 600,
        subjects: [
          expect.objectContaining({
            endpointId: "endpoint.quick",
            overallScore: 0.71,
          }),
        ],
      }),
    );

    await expect(
      readBenchmarkSummariesByMode({
        artifactRoot: root,
        resolveModelId: (endpointId) => endpointId,
      }),
    ).resolves.toEqual({
      full: expect.objectContaining({ runId: fullRunId, mode: "full" }),
      quick: expect.objectContaining({ runId: quickRunId, mode: "quick" }),
    });
  });

  test("aggregates benchmark scores by taxonomy dimensions when caseTaxonomyTags are present", async () => {
    const root = await createArtifactRoot();
    const runId = "run-taxonomy-agg";

    await writeBenchmarkRunManifest(root, {
      runId,
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.tax",
      startedAtMs: 1,
      executionCompletedAtMs: 2,
      gradingCompletedAtMs: 3,
      endpointIds: ["moonshot.kimi"],
      caseIds: ["h01", "h02"],
      responseCount: 2,
      judgeArtifactCount: 1,
      compareArtifactCount: 0,
    });
    await writeBenchmarkRunResult(root, {
      runId,
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "quick",
      judgeEndpointId: "judge.tax",
      startedAtMs: 1,
      completedAtMs: 3,
      endpointGrades: [
        {
          endpointId: "moonshot.kimi",
          modelId: "kimi-k2.6",
          sourceType: "remote",
          overallScore: 0.75,
          byDifficulty: {
            easy: { score: 0, cases: 0 },
            medium: { score: 0.5, cases: 1 },
            hard: { score: 1, cases: 1 },
          },
          caseResults: [
            { caseId: "h01", difficultyBucket: "medium", score: 0.5 },
            { caseId: "h02", difficultyBucket: "hard", score: 1 },
          ],
          caseTaxonomyTags: {
            h01: {
              roleId: "coder",
              taskType: "coder.review",
              variant: "root_cause",
              requiredCapabilities: ["code.read"],
              requiredModalities: ["text"],
              toolClasses: ["filesystem.read"],
            },
            h02: {
              roleId: "coder",
              taskType: "coder.write",
              variant: "e2e",
              requiredCapabilities: ["code.write", "code.read"],
              requiredModalities: ["text", "structured_json"],
              toolClasses: ["filesystem.write", "shell.execute"],
            },
          },
        },
      ],
    });

    const summary = await readLatestBenchmarkSummary({
      artifactRoot: root,
      resolveModelId: () => "kimi-k2.6",
    });

    expect(summary.subjects).toHaveLength(1);
    const taxonomyScores = summary.subjects[0]?.taxonomyScores;
    expect(taxonomyScores).toBeDefined();
    // byRole: coder avg = (0.5 + 1.0) / 2 = 0.75
    expect(taxonomyScores?.byRole).toEqual({ coder: 0.75 });
    // byTask: coder.review = 0.5, coder.write = 1.0
    expect(taxonomyScores?.byTask).toEqual({ "coder.review": 0.5, "coder.write": 1 });
    // byCapability: code.read in both cases (0.5+1.0)/2 = 0.75, code.write in h02 only = 1.0
    expect(taxonomyScores?.byCapability).toEqual({ "code.read": 0.75, "code.write": 1 });
    // byVariant: root_cause = 0.5, e2e = 1.0
    expect(taxonomyScores?.byVariant).toEqual({ root_cause: 0.5, e2e: 1 });
    // byModality: text in both = 0.75, structured_json in h02 = 1.0
    expect(taxonomyScores?.byModality).toEqual({ text: 0.75, structured_json: 1 });
    // byToolClass: filesystem.read in h01 = 0.5, filesystem.write in h02 = 1.0, shell.execute in h02 = 1.0
    expect(taxonomyScores?.byToolClass).toEqual({
      "filesystem.read": 0.5,
      "filesystem.write": 1,
      "shell.execute": 1,
    });
    expect(summary.subjects[0]?.taxonomyCoverage).toEqual({
      byRole: { coder: 2 },
      byTask: { "coder.review": 1, "coder.write": 1 },
      byVariant: { root_cause: 1, e2e: 1 },
      byCapability: { "code.read": 2, "code.write": 1 },
      byModality: { text: 2, structured_json: 1 },
      byToolClass: {
        "filesystem.read": 1,
        "filesystem.write": 1,
        "shell.execute": 1,
      },
    });
  });

  test("returns undefined taxonomyScores when caseTaxonomyTags are absent", async () => {
    const root = await createArtifactRoot();
    const runId = "run-no-tax-tags";

    await writeBenchmarkRunManifest(root, {
      runId,
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "judge.notax",
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
      runId,
      suiteId: "routing-capability-v2",
      suiteVersion: "2.0",
      mode: "quick",
      judgeEndpointId: "judge.notax",
      startedAtMs: 1,
      completedAtMs: 3,
      endpointGrades: [
        {
          endpointId: "local.lfm",
          modelId: "lfm2.5",
          sourceType: "local",
          overallScore: 0.9,
          byDifficulty: {
            easy: { score: 0.9, cases: 1 },
            medium: { score: 0, cases: 0 },
            hard: { score: 0, cases: 0 },
          },
          caseResults: [{ caseId: "h01", difficultyBucket: "easy", score: 0.9 }],
        },
      ],
    });

    const summary = await readLatestBenchmarkSummary({
      artifactRoot: root,
      resolveModelId: () => "lfm2.5",
    });

    expect(summary.subjects).toHaveLength(1);
    expect(summary.subjects[0]?.taxonomyScores).toBeUndefined();
  });

  // Run 98 addendum 42 B1: the model pool's quality axis reads
  // `candidate.benchmarkCapability.overallScore`. The portfolio is the current-membership authority and
  // it was empty while the completed run summary carried current-endpoint subjects, so every candidate
  // got `null` and the composite route score collapsed to cost only. A summary subject whose endpointId
  // matches the candidate is per-endpoint evidence for a currently configured endpoint, so it may supply
  // the capability; a subject for another endpoint still may not.
  test("run98 a42: a summary subject for the same endpoint supplies the capability when the portfolio has no entry", () => {
    const summary = {
      ...EMPTY_BENCHMARK_SUMMARY,
      runId: "run-current",
      completedAtMs: 1_700_000_000_000,
      mode: "quick" as const,
      suiteId: "routing-capability-v2",
      judgeEndpointId: "judge.endpoint",
      judgeModelId: "judge/model",
      subjects: [
        {
          endpointId: "deepseek.flash-max",
          modelId: "deepseek/deepseek-flash",
          sourceType: "remote",
          reasoningEffort: "max",
          overallScore: 0.96,
          scoresByBucket: {
            easy: { score: 0, cases: 0 },
            medium: { score: 0, cases: 0 },
            hard: { score: 0.96, cases: 12 },
          },
          passingCaseIds: ["h01"],
          caseCount: 12,
        },
      ],
    };

    const capability = buildBenchmarkCapabilityForEndpoint({
      endpointId: "deepseek.flash-max",
      latestProfile: null,
      summary,
      portfolioEntry: null,
    });
    expect(capability).toMatchObject({
      evidenceSource: "run-artifact",
      overallScore: 0.96,
      lastRunId: "run-current",
      lastRunCompletedAtMs: 1_700_000_000_000,
      lastRunMode: "quick",
      lastRunSuiteId: "routing-capability-v2",
      judgeEndpointId: "judge.endpoint",
      coverage: { overallCases: 12 },
    });

    // An endpoint the run never covered still gets no capability: quality is never synthesized.
    expect(
      buildBenchmarkCapabilityForEndpoint({
        endpointId: "deepseek.not-benchmarked",
        latestProfile: null,
        summary,
        portfolioEntry: null,
      }),
    ).toBeNull();
  });

  test("run98 a42: a portfolio entry still takes precedence over a summary subject", () => {
    const summary = {
      ...EMPTY_BENCHMARK_SUMMARY,
      runId: "run-summary",
      completedAtMs: 1_700_000_000_000,
      mode: "quick" as const,
      suiteId: "routing-capability-v2",
      subjects: [
        {
          endpointId: "deepseek.flash-max",
          modelId: "deepseek/deepseek-flash",
          sourceType: "remote",
          reasoningEffort: "max",
          overallScore: 0.5,
          scoresByBucket: {
            easy: { score: 0, cases: 0 },
            medium: { score: 0, cases: 0 },
            hard: { score: 0.5, cases: 2 },
          },
          passingCaseIds: ["h01"],
          caseCount: 2,
        },
      ],
    };

    const capability = buildBenchmarkCapabilityForEndpoint({
      endpointId: "deepseek.flash-max",
      latestProfile: null,
      summary,
      portfolioEntry: {
        endpointId: "deepseek.flash-max",
        modelId: "deepseek/deepseek-flash",
        sourceType: "remote",
        reasoningEffort: "max",
        overallScore: 0.91,
        scoresByBucket: {
          easy: { score: 0, cases: 0 },
          medium: { score: 0, cases: 0 },
          hard: { score: 0.91, cases: 10 },
        },
        passingCaseIds: ["h01"],
        caseCount: 10,
        profileRevision: "profile-current",
        runId: "run-portfolio",
        completedAtMs: 1_700_000_100_000,
        mode: "quick",
        suiteId: "routing-capability-v2",
        suiteVersion: "3.4",
        judgeEndpointId: "judge.endpoint",
        judgeModelId: "judge/model",
      },
    });
    expect(capability).toMatchObject({
      evidenceSource: "run-artifact",
      overallScore: 0.91,
      lastRunId: "run-portfolio",
      profileRevision: "profile-current",
    });
  });

  // Run 98 addendum 42 B2: the model pool's speed axis needs a benchmark latency to fall back to while an
  // endpoint has no telemetry. The run's per-case audits carry `latencyMs` per endpoint, which is the same
  // evidence the Benchmark scores page turns into its P50/P95 columns, so the capability carries it.
  test("run98 a42: the capability carries the endpoint's benchmark p50/p95 from the case audits", () => {
    const summary = {
      ...EMPTY_BENCHMARK_SUMMARY,
      runId: "run-current",
      completedAtMs: 1_700_000_000_000,
      mode: "quick" as const,
      suiteId: "routing-capability-v2",
      subjects: [
        {
          endpointId: "deepseek.flash-max",
          modelId: "deepseek/deepseek-flash",
          sourceType: "remote",
          reasoningEffort: "max",
          overallScore: 0.9583,
          scoresByBucket: {
            easy: { score: 0, cases: 0 },
            medium: { score: 0, cases: 0 },
            hard: { score: 0.9583, cases: 12 },
          },
          passingCaseIds: ["h01"],
          caseCount: 12,
        },
      ],
      caseAudits: [
        { caseId: "c1", endpointId: "deepseek.flash-max", latencyMs: 1_000 },
        { caseId: "c2", endpointId: "deepseek.flash-max", latencyMs: 2_000 },
        { caseId: "c3", endpointId: "deepseek.flash-max", latencyMs: 3_000 },
        { caseId: "c4", endpointId: "deepseek.flash-max", latencyMs: 60_000 },
        // Another endpoint's audit must never be folded into this endpoint's latency evidence.
        { caseId: "c5", endpointId: "moonshot.kimi-k3", latencyMs: 5 },
      ],
    };

    const capability = buildBenchmarkCapabilityForEndpoint({
      endpointId: "deepseek.flash-max",
      latestProfile: null,
      summary,
      portfolioEntry: null,
    });
    expect(capability).toMatchObject({
      overallScore: 0.9583,
      p50LatencyMs: 2_000,
      p95LatencyMs: 60_000,
    });

    // No audits for an endpoint means no benchmark latency: the axis stays empty rather than guessing.
    const noAudits = buildBenchmarkCapabilityForEndpoint({
      endpointId: "deepseek.other",
      latestProfile: null,
      summary: {
        ...summary,
        subjects: [
          {
            endpointId: "deepseek.other",
            modelId: "deepseek/deepseek-flash",
            overallScore: 0.5,
            scoresByBucket: {
              easy: { score: 0, cases: 0 },
              medium: { score: 0, cases: 0 },
              hard: { score: 0.5, cases: 1 },
            },
            passingCaseIds: [],
            caseCount: 1,
          },
        ],
      },
      portfolioEntry: null,
    });
    expect(noAudits?.p50LatencyMs ?? null).toBeNull();
  });

  // Run 98 addendum 42 B2, attribution: the audits belong to the summary's run, so they may only describe
  // this endpoint's capability when the capability is actually that run. A portfolio entry for an earlier
  // run must not borrow the summary run's latency, or the speed axis would show a different measurement
  // than the quality axis beside it.
  test("run98 a42: a portfolio entry from another run does not inherit the summary's latency", () => {
    const summary = {
      ...EMPTY_BENCHMARK_SUMMARY,
      runId: "run-current",
      completedAtMs: 1_700_000_000_000,
      mode: "quick" as const,
      suiteId: "routing-capability-v2",
      subjects: [
        {
          endpointId: "deepseek.flash-max",
          modelId: "deepseek/deepseek-flash",
          sourceType: "remote",
          reasoningEffort: "max",
          overallScore: 0.9583,
          scoresByBucket: {
            easy: { score: 0, cases: 0 },
            medium: { score: 0, cases: 0 },
            hard: { score: 0.9583, cases: 12 },
          },
          passingCaseIds: ["h01"],
          caseCount: 12,
        },
      ],
      caseAudits: [
        { caseId: "c1", endpointId: "deepseek.flash-max", latencyMs: 1_000 },
        { caseId: "c2", endpointId: "deepseek.flash-max", latencyMs: 2_000 },
      ],
    };
    const portfolioEntryFor = (runId: string) => ({
      endpointId: "deepseek.flash-max",
      modelId: "deepseek/deepseek-flash",
      sourceType: "remote",
      reasoningEffort: "max",
      overallScore: 0.91,
      scoresByBucket: {
        easy: { score: 0, cases: 0 },
        medium: { score: 0, cases: 0 },
        hard: { score: 0.91, cases: 10 },
      },
      passingCaseIds: ["h01"],
      caseCount: 10,
      profileRevision: "profile-current",
      runId,
      completedAtMs: 1_700_000_100_000,
      mode: "quick" as const,
      suiteId: "routing-capability-v2",
      suiteVersion: "3.4",
      judgeEndpointId: "judge.endpoint",
      judgeModelId: "judge/model",
    });

    const earlierRun = buildBenchmarkCapabilityForEndpoint({
      endpointId: "deepseek.flash-max",
      latestProfile: null,
      summary,
      portfolioEntry: portfolioEntryFor("run-portfolio-earlier"),
    });
    expect(earlierRun).toMatchObject({ lastRunId: "run-portfolio-earlier", overallScore: 0.91 });
    expect(earlierRun?.p50LatencyMs ?? null).toBeNull();
    expect(earlierRun?.p95LatencyMs ?? null).toBeNull();

    // Same run as the summary: the audits describe the same measurement, so the latency belongs.
    const sameRun = buildBenchmarkCapabilityForEndpoint({
      endpointId: "deepseek.flash-max",
      latestProfile: null,
      summary,
      portfolioEntry: portfolioEntryFor("run-current"),
    });
    // Two audits, so the nearest-rank p50 is the first of the pair (⌈0.5 × 2⌉ = 1st smallest) — the same
    // convention the sibling test asserts for four audits (⌈0.5 × 4⌉ = 2nd smallest).
    expect(sameRun).toMatchObject({ p50LatencyMs: 1_000 });
  });
});
