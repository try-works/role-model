import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import {
  type BenchmarkCompareRecord,
  type BenchmarkJudgeRecord,
  writeBenchmarkCompareRecord,
  writeBenchmarkJudgeRecord,
  writeBenchmarkRunManifest,
} from "../src/benchmark-artifacts.js";

describe("benchmark-artifacts", () => {
  let artifactRoot = "";

  afterEach(() => {
    artifactRoot = "";
  });

  async function createArtifactRoot(): Promise<string> {
    artifactRoot = await mkdtemp(path.join(os.tmpdir(), "bench-artifacts-"));
    return artifactRoot;
  }

  test("writes per-case judge artifacts with attempt suffixes", async () => {
    const root = await createArtifactRoot();
    const record: BenchmarkJudgeRecord = {
      runId: "run-1",
      caseId: "h05",
      endpointId: "moonshot.kimi",
      judgeEndpointId: "moonshot.kimi",
      requestId: "bench-judge-h05-a1",
      attempt: 1,
      promptMessages: [{ role: "user", content: "grade this" }],
      rawResponse: '{"score":1,"rationale":"complete"}',
      parseSuccess: true,
      parsedScore: 1,
      parsedRationale: "complete",
      gradingMethod: "judge",
      sourceArtifactPath: "responses/moonshot.kimi/h05.json",
      gradingBrief: {
        questionTranscript: "[user]\nGrep eligibility",
        exemplarAnswer: '{"bullets":["a","b"]}',
        exemplarQuality: "authored",
        deliverablesChecklist: ["[MUST] Two bullets"],
        antiPatterns: ["MUST NOT use placeholders"],
      },
      recordedAtMs: 1_700_000_000_000,
    };

    const filePath = await writeBenchmarkJudgeRecord(root, record);
    expect(filePath).toContain(path.join("judge", "moonshot.kimi", "h05", "attempt-1.json"));

    const parsed = JSON.parse(await readFile(filePath, "utf8")) as BenchmarkJudgeRecord;
    expect(parsed.parseSuccess).toBe(true);
    expect(parsed.sourceArtifactPath).toBe("responses/moonshot.kimi/h05.json");
    expect(parsed.gradingBrief?.exemplarQuality).toBe("authored");
  });

  test("writes compare artifacts with compareError and fallback metadata", async () => {
    const root = await createArtifactRoot();
    const record: BenchmarkCompareRecord = {
      runId: "run-1",
      caseId: "h05",
      models: [
        {
          endpointId: "local.lfm",
          deliverablePreview: "one bullet",
          perCaseScore: 0,
        },
        {
          endpointId: "moonshot.kimi",
          deliverablePreview: "two bullets",
          perCaseScore: 1,
        },
      ],
      relativeRanking: ["moonshot.kimi", "local.lfm"],
      rationale: "[compare_unavailable] Heuristic fallback",
      rawResponse: "",
      judgeEndpointId: "moonshot.kimi",
      compareError: "compare_parse_failed",
      compareFallback: true,
      compareCircuitOpen: false,
      responseChannel: {
        hasContentText: false,
        hasReasoningText: true,
        hasOutputText: false,
        hasToolCalls: false,
        contentLength: 0,
        reasoningLength: 42,
      },
      recordedAtMs: 1_700_000_000_000,
    };

    const filePath = await writeBenchmarkCompareRecord(root, record);
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as BenchmarkCompareRecord;
    expect(parsed.compareError).toBe("compare_parse_failed");
    expect(parsed.compareFallback).toBe(true);
    expect(parsed.responseChannel?.hasReasoningText).toBe(true);
  });

  test("writes compare artifacts under judge/compare", async () => {
    const root = await createArtifactRoot();
    const record: BenchmarkCompareRecord = {
      runId: "run-1",
      caseId: "h05",
      models: [
        {
          endpointId: "local.lfm",
          deliverablePreview: "one bullet",
          perCaseScore: 0,
        },
        {
          endpointId: "moonshot.kimi",
          deliverablePreview: "two bullets",
          perCaseScore: 1,
        },
      ],
      relativeRanking: ["moonshot.kimi", "local.lfm"],
      rationale: "Kimi is stronger",
      rawResponse:
        '{"relativeRanking":["moonshot.kimi","local.lfm"],"rationale":"Kimi is stronger"}',
      judgeEndpointId: "moonshot.kimi",
      recordedAtMs: 1_700_000_000_000,
    };

    const filePath = await writeBenchmarkCompareRecord(root, record);
    expect(filePath).toContain(path.join("judge", "compare", "h05.json"));

    const parsed = JSON.parse(await readFile(filePath, "utf8")) as BenchmarkCompareRecord;
    expect(parsed.relativeRanking).toEqual(["moonshot.kimi", "local.lfm"]);
  });

  test("manifest records grading metadata fields", async () => {
    const root = await createArtifactRoot();
    const manifestPath = await writeBenchmarkRunManifest(root, {
      runId: "run-1",
      suiteId: "routing-capability-v2",
      mode: "quick",
      judgeEndpointId: "moonshot.kimi",
      judgeSubjectOverlap: true,
      startWarnings: ["judge_subject_overlap: judge endpoint is also a benchmark subject; judge exhaustion risk"],
      startedAtMs: 1,
      executionCompletedAtMs: 2,
      gradingCompletedAtMs: 3,
      endpointIds: ["local.lfm", "moonshot.kimi"],
      caseIds: ["h05"],
      responseCount: 2,
      judgeArtifactCount: 2,
      compareArtifactCount: 1,
    });

    const parsed = JSON.parse(await readFile(manifestPath, "utf8")) as {
      gradingCompletedAtMs: number;
      judgeArtifactCount: number;
      compareArtifactCount: number;
      judgeSubjectOverlap: boolean;
      startWarnings: string[];
    };
    expect(parsed.gradingCompletedAtMs).toBe(3);
    expect(parsed.judgeArtifactCount).toBe(2);
    expect(parsed.compareArtifactCount).toBe(1);
    expect(parsed.judgeSubjectOverlap).toBe(true);
    expect(parsed.startWarnings.length).toBeGreaterThan(0);
  });
});
