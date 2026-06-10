import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { BenchmarkCompareRecord, BenchmarkRunManifest } from "./benchmark-artifacts.js";
import { resolveBenchmarkRunArtifactDir } from "./benchmark-artifacts.js";

export interface BenchmarkPersistedEndpointGrade {
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType: string | null;
  readonly overallScore: number;
  readonly byDifficulty: Record<
    "easy" | "medium" | "hard",
    { readonly score: number; readonly cases: number }
  >;
  readonly caseResults: readonly {
    readonly caseId: string;
    readonly difficultyBucket: "easy" | "medium" | "hard";
    readonly score: number;
    readonly parseSuccess?: boolean;
    readonly judgeError?: string | null;
    readonly judgeUnavailable?: boolean;
    readonly cappedByValidator?: boolean;
  }[];
}

export interface BenchmarkPersistedRunResult {
  readonly runId: string;
  readonly suiteId: string;
  readonly suiteVersion: string;
  readonly mode: "quick" | "full";
  readonly judgeEndpointId: string | null;
  readonly startedAtMs: number;
  readonly completedAtMs: number;
  readonly endpointGrades: readonly BenchmarkPersistedEndpointGrade[];
}

export interface BenchmarkCaseComparison {
  readonly caseId: string;
  readonly relativeRanking: readonly string[];
  readonly rationale: string;
  readonly compareFallback?: boolean;
  readonly compareError?: string | null;
}

export interface BenchmarkCaseAuditEntry {
  readonly caseId: string;
  readonly endpointId: string;
  readonly parseSuccess?: boolean;
  readonly judgeError?: string | null;
  readonly judgeUnavailable?: boolean;
  readonly cappedByValidator?: boolean;
  readonly gradingMethod?: string;
}

export interface BenchmarkSummarySubject {
  readonly endpointId: string;
  readonly modelId: string;
  readonly overallScore: number;
  readonly scoresByBucket: Record<
    "easy" | "medium" | "hard",
    { readonly score: number; readonly cases: number }
  >;
  readonly passingCaseIds: readonly string[];
  readonly caseCount: number;
}

export interface BenchmarkSummaryResponse {
  readonly runId: string | null;
  readonly completedAtMs: number | null;
  readonly mode: "quick" | "full" | null;
  readonly suiteId: string | null;
  readonly suiteVersion: string | null;
  readonly judgeEndpointId: string | null;
  readonly judgeModelId: string | null;
  readonly artifactRoot: string | null;
  readonly subjects: readonly BenchmarkSummarySubject[];
  readonly caseComparisons: readonly BenchmarkCaseComparison[];
  readonly caseAudits: readonly BenchmarkCaseAuditEntry[];
  readonly manifest: {
    readonly executionCompletedAtMs: number;
    readonly gradingCompletedAtMs: number;
    readonly judgeArtifactCount: number;
    readonly compareArtifactCount: number;
  } | null;
}

export interface BenchmarkPreferences {
  readonly judgeEndpointId?: string;
}

export interface BenchmarkCapability {
  readonly overallScore: number | null;
  readonly scoresByBucket: Partial<
    Record<"easy" | "medium" | "hard", { readonly score: number; readonly cases?: number }>
  >;
  readonly benchmarkSamples: number;
  readonly sampleCount: number;
  readonly measuredAtMs: number | null;
  readonly freshnessScore: number | null;
  readonly lastRunId: string | null;
  readonly lastRunCompletedAtMs: number | null;
  readonly judgeEndpointId: string | null;
}

export const EMPTY_BENCHMARK_SUMMARY: BenchmarkSummaryResponse = {
  runId: null,
  completedAtMs: null,
  mode: null,
  suiteId: null,
  suiteVersion: null,
  judgeEndpointId: null,
  judgeModelId: null,
  artifactRoot: null,
  subjects: [],
  caseComparisons: [],
  caseAudits: [],
  manifest: null,
};

export async function readBenchmarkCaseComparisons(
  artifactRoot: string,
  runId: string,
): Promise<BenchmarkCaseComparison[]> {
  const compareDir = path.join(resolveBenchmarkRunArtifactDir(artifactRoot, runId), "judge", "compare");
  let entries: string[];
  try {
    entries = await readdir(compareDir);
  } catch {
    return [];
  }

  const comparisons: BenchmarkCaseComparison[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".json")) {
      continue;
    }
    try {
      const raw = await readFile(path.join(compareDir, entry), "utf8");
      const parsed = JSON.parse(raw) as BenchmarkCompareRecord;
      if (!Array.isArray(parsed.relativeRanking)) {
        continue;
      }
      comparisons.push({
        caseId: parsed.caseId,
        relativeRanking: parsed.relativeRanking,
        rationale: parsed.rationale,
        compareFallback: parsed.compareFallback,
        compareError: parsed.compareError,
      });
    } catch {
      // skip malformed compare artifact
    }
  }
  return comparisons.sort((left, right) => left.caseId.localeCompare(right.caseId));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readNumber(record: Record<string, unknown> | null, key: string): number | null {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function writeBenchmarkRunResult(
  artifactRoot: string,
  result: BenchmarkPersistedRunResult,
): Promise<string> {
  const filePath = path.join(resolveBenchmarkRunArtifactDir(artifactRoot, result.runId), "result.json");
  await writeFile(filePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  return filePath;
}

export async function readBenchmarkRunResult(
  artifactRoot: string,
  runId: string,
): Promise<BenchmarkPersistedRunResult | null> {
  const filePath = path.join(resolveBenchmarkRunArtifactDir(artifactRoot, runId), "result.json");
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as BenchmarkPersistedRunResult;
  } catch {
    return null;
  }
}

export async function readLatestBenchmarkSummary(input: {
  readonly artifactRoot: string;
  readonly resolveModelId: (endpointId: string) => string | null;
}): Promise<BenchmarkSummaryResponse> {
  let runIds: string[];
  try {
    runIds = await readdir(input.artifactRoot);
  } catch {
    return EMPTY_BENCHMARK_SUMMARY;
  }

  let latest:
    | {
        readonly runId: string;
        readonly manifest: BenchmarkRunManifest;
        readonly result: BenchmarkPersistedRunResult | null;
      }
    | null = null;

  for (const runId of runIds) {
    const manifestPath = path.join(input.artifactRoot, runId, "manifest.json");
    let manifestRaw: string;
    try {
      manifestRaw = await readFile(manifestPath, "utf8");
    } catch {
      continue;
    }
    const manifest = JSON.parse(manifestRaw) as BenchmarkRunManifest;
    if (typeof manifest.gradingCompletedAtMs !== "number") {
      continue;
    }
    if (
      latest &&
      (latest.manifest.gradingCompletedAtMs ?? 0) >= manifest.gradingCompletedAtMs
    ) {
      continue;
    }
    const result = await readBenchmarkRunResult(input.artifactRoot, runId);
    latest = { runId, manifest, result };
  }

  if (!latest) {
    return EMPTY_BENCHMARK_SUMMARY;
  }

  const { manifest, result, runId } = latest;
  const subjects: BenchmarkSummarySubject[] = [];

  if (result) {
    for (const grade of result.endpointGrades) {
      const passingCaseIds = grade.caseResults
        .filter((caseResult) => caseResult.score > 0)
        .map((caseResult) => caseResult.caseId);
      subjects.push({
        endpointId: grade.endpointId,
        modelId: grade.modelId,
        overallScore: grade.overallScore,
        scoresByBucket: grade.byDifficulty,
        passingCaseIds,
        caseCount: grade.caseResults.length,
      });
    }
  }

  const judgeEndpointId = manifest.judgeEndpointId ?? result?.judgeEndpointId ?? null;
  const caseComparisons = await readBenchmarkCaseComparisons(input.artifactRoot, runId);
  const caseAudits: BenchmarkCaseAuditEntry[] = [];
  if (result) {
    for (const grade of result.endpointGrades) {
      for (const caseResult of grade.caseResults) {
        caseAudits.push({
          caseId: caseResult.caseId,
          endpointId: grade.endpointId,
          parseSuccess: caseResult.parseSuccess,
          judgeError: caseResult.judgeError,
          judgeUnavailable: caseResult.judgeUnavailable,
          cappedByValidator: caseResult.cappedByValidator,
        });
      }
    }
  }

  return {
    runId,
    completedAtMs: manifest.gradingCompletedAtMs ?? result?.completedAtMs ?? null,
    mode: manifest.mode ?? result?.mode ?? null,
    suiteId: manifest.suiteId ?? result?.suiteId ?? null,
    suiteVersion: result?.suiteVersion ?? null,
    judgeEndpointId,
    judgeModelId: judgeEndpointId ? input.resolveModelId(judgeEndpointId) : null,
    artifactRoot: runId,
    subjects,
    caseComparisons,
    caseAudits,
    manifest: {
      executionCompletedAtMs: manifest.executionCompletedAtMs,
      gradingCompletedAtMs: manifest.gradingCompletedAtMs ?? 0,
      judgeArtifactCount: manifest.judgeArtifactCount ?? 0,
      compareArtifactCount: manifest.compareArtifactCount ?? 0,
    },
  };
}

export async function readBenchmarkPreferences(
  preferencesPath: string,
): Promise<BenchmarkPreferences> {
  try {
    const raw = await readFile(preferencesPath, "utf8");
    const parsed = JSON.parse(raw) as BenchmarkPreferences;
    return typeof parsed.judgeEndpointId === "string" ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeBenchmarkPreferences(
  preferencesPath: string,
  preferences: BenchmarkPreferences,
): Promise<BenchmarkPreferences> {
  await writeFile(preferencesPath, `${JSON.stringify(preferences, null, 2)}\n`, "utf8");
  return preferences;
}

export function buildBenchmarkCapability(input: {
  readonly latestProfile: Record<string, unknown> | null | undefined;
  readonly difficultyProfiles?: Record<string, unknown> | null;
  readonly summary: BenchmarkSummaryResponse;
}): BenchmarkCapability | null {
  const profile = asRecord(input.latestProfile);
  if (!profile) {
    return null;
  }

  const sources = asRecord(profile.sources);
  const benchmarkSamples = readNumber(sources, "benchmark_samples") ?? 0;
  const overallScore =
    readNumber(profile, "judge_score") ?? readNumber(profile, "quality_score");
  if (benchmarkSamples === 0 && overallScore === null) {
    return null;
  }

  const scoresByBucket: BenchmarkCapability["scoresByBucket"] = {};
  for (const bucket of ["easy", "medium", "hard"] as const) {
    const bucketProfile = asRecord(asRecord(input.difficultyProfiles)?.[bucket]);
    const bucketScore =
      readNumber(bucketProfile, "judge_score") ?? readNumber(bucketProfile, "quality_score");
    if (bucketScore !== null) {
      scoresByBucket[bucket] = { score: bucketScore };
    }
  }

  return {
    overallScore,
    scoresByBucket,
    benchmarkSamples,
    sampleCount: readNumber(profile, "sample_size") ?? benchmarkSamples,
    measuredAtMs: readNumber(profile, "measured_at_ms"),
    freshnessScore: readNumber(profile, "freshness_score"),
    lastRunId: input.summary.runId,
    lastRunCompletedAtMs: input.summary.completedAtMs,
    judgeEndpointId: input.summary.judgeEndpointId,
  };
}

export function buildBenchmarkCapabilityForEndpoint(input: {
  readonly endpointId: string;
  readonly latestProfile: Record<string, unknown> | null | undefined;
  readonly difficultyProfiles?: Record<string, unknown> | null;
  readonly summary: BenchmarkSummaryResponse;
}): BenchmarkCapability | null {
  const capability = buildBenchmarkCapability({
    latestProfile: input.latestProfile,
    difficultyProfiles: input.difficultyProfiles,
    summary: input.summary,
  });
  if (!capability) {
    return null;
  }

  const summarySubject = input.summary.subjects.find(
    (subject) => subject.endpointId === input.endpointId,
  );
  if (summarySubject) {
    return {
      ...capability,
      overallScore: summarySubject.overallScore,
      scoresByBucket: summarySubject.scoresByBucket,
    };
  }
  return capability;
}
