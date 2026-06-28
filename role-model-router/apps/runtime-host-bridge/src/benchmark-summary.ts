import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { canonicalTaxonomy } from "@role-model-router/core";
import type { TaxonomyDimensionScoreMap } from "@role-model/protocol-types";

import type { BenchmarkCompareRecord, BenchmarkRunManifest } from "./benchmark-artifacts.js";
import { resolveBenchmarkRunArtifactDir } from "./benchmark-artifacts.js";

interface CompletedBenchmarkRun {
  readonly runId: string;
  readonly manifest: BenchmarkRunManifest;
  readonly result: BenchmarkPersistedRunResult | null;
}

export interface BenchmarkRunListEntry {
  readonly runId: string;
  readonly mode: "quick" | "full";
  readonly completedAtMs: number;
  readonly suiteId: string;
  readonly caseCount: number;
  readonly endpointIds: readonly string[];
}

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
    readonly latencyMs?: number;
    readonly parseSuccess?: boolean;
    readonly judgeError?: string | null;
    readonly judgeUnavailable?: boolean;
    readonly cappedByValidator?: boolean;
  }[];
  readonly caseTaxonomyTags?: Record<
    string,
    {
      readonly roleId: string;
      readonly taskType: string;
      readonly variant?: string;
      readonly requiredCapabilities?: readonly string[];
      readonly requiredModalities?: readonly string[];
      readonly toolClasses?: readonly string[];
    }
  >;
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
  readonly latencyMs?: number;
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
  readonly taxonomyScores?: Partial<TaxonomyDimensionScoreMap>;
  readonly taxonomyCoverage?: Partial<
    Record<keyof TaxonomyDimensionScoreMap, Record<string, number>>
  >;
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
  readonly taskScores?: Record<string, number>;
  readonly roleScores?: Record<string, number>;
  readonly eligibleRoleScores?: Record<string, number>;
  readonly groupScores?: Record<string, number>;
  readonly coverage?: {
    readonly overallCases: number;
    readonly roleCases?: Record<string, number>;
    readonly groupCases?: Record<string, number>;
    readonly lowCoverageRoleIds?: readonly string[];
    readonly lowCoverageGroupIds?: readonly string[];
  };
  readonly benchmarkSamples: number;
  readonly sampleCount: number;
  readonly measuredAtMs: number | null;
  readonly freshnessScore: number | null;
  readonly lastRunId: string | null;
  readonly lastRunCompletedAtMs: number | null;
  readonly judgeEndpointId: string | null;
}

const BENCHMARK_LOW_COVERAGE_CASE_COUNT = 2;

function computeTaxonomyAggregates(
  caseResults: readonly { readonly caseId: string; readonly score: number }[],
  caseTaxonomyTags: Record<
    string,
    {
      readonly roleId: string;
      readonly taskType: string;
      readonly variant?: string;
      readonly requiredCapabilities?: readonly string[];
      readonly requiredModalities?: readonly string[];
      readonly toolClasses?: readonly string[];
    }
  >,
): {
  readonly scores: BenchmarkSummarySubject["taxonomyScores"];
  readonly coverage: BenchmarkSummarySubject["taxonomyCoverage"];
} {
  const byRole: Record<string, { total: number; count: number }> = {};
  const byTask: Record<string, { total: number; count: number }> = {};
  const byVariant: Record<string, { total: number; count: number }> = {};
  const byCapability: Record<string, { total: number; count: number }> = {};
  const byModality: Record<string, { total: number; count: number }> = {};
  const byToolClass: Record<string, { total: number; count: number }> = {};

  for (const cr of caseResults) {
    const tags = caseTaxonomyTags[cr.caseId];
    if (!tags) continue;

    if (!byRole[tags.roleId]) byRole[tags.roleId] = { total: 0, count: 0 };
    byRole[tags.roleId].total += cr.score;
    byRole[tags.roleId].count++;

    if (!byTask[tags.taskType]) byTask[tags.taskType] = { total: 0, count: 0 };
    byTask[tags.taskType].total += cr.score;
    byTask[tags.taskType].count++;

    if (tags.variant) {
      if (!byVariant[tags.variant]) byVariant[tags.variant] = { total: 0, count: 0 };
      byVariant[tags.variant].total += cr.score;
      byVariant[tags.variant].count++;
    }

    for (const cap of tags.requiredCapabilities ?? []) {
      if (!byCapability[cap]) byCapability[cap] = { total: 0, count: 0 };
      byCapability[cap].total += cr.score;
      byCapability[cap].count++;
    }

    for (const mod of tags.requiredModalities ?? []) {
      if (!byModality[mod]) byModality[mod] = { total: 0, count: 0 };
      byModality[mod].total += cr.score;
      byModality[mod].count++;
    }

    for (const tc of tags.toolClasses ?? []) {
      if (!byToolClass[tc]) byToolClass[tc] = { total: 0, count: 0 };
      byToolClass[tc].total += cr.score;
      byToolClass[tc].count++;
    }
  }

  return {
    scores: {
      byRole: Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, v.total / v.count])),
      byTask: Object.fromEntries(Object.entries(byTask).map(([k, v]) => [k, v.total / v.count])),
      byVariant: Object.fromEntries(
        Object.entries(byVariant).map(([k, v]) => [k, v.total / v.count]),
      ),
      byCapability: Object.fromEntries(
        Object.entries(byCapability).map(([k, v]) => [k, v.total / v.count]),
      ),
      byModality: Object.fromEntries(
        Object.entries(byModality).map(([k, v]) => [k, v.total / v.count]),
      ),
      byToolClass: Object.fromEntries(
        Object.entries(byToolClass).map(([k, v]) => [k, v.total / v.count]),
      ),
    },
    coverage: {
      byRole: Object.fromEntries(Object.entries(byRole).map(([k, v]) => [k, v.count])),
      byTask: Object.fromEntries(Object.entries(byTask).map(([k, v]) => [k, v.count])),
      byVariant: Object.fromEntries(Object.entries(byVariant).map(([k, v]) => [k, v.count])),
      byCapability: Object.fromEntries(Object.entries(byCapability).map(([k, v]) => [k, v.count])),
      byModality: Object.fromEntries(Object.entries(byModality).map(([k, v]) => [k, v.count])),
      byToolClass: Object.fromEntries(Object.entries(byToolClass).map(([k, v]) => [k, v.count])),
    },
  };
}

function buildEligibleRoleScores(input: {
  readonly roleScores?: Record<string, number>;
  readonly availableRoleIds?: readonly string[];
}): Record<string, number> | undefined {
  if (!input.roleScores) {
    return undefined;
  }
  if (!input.availableRoleIds || input.availableRoleIds.length === 0) {
    return undefined;
  }
  const allowed = new Set(input.availableRoleIds);
  const filtered = Object.fromEntries(
    Object.entries(input.roleScores).filter(([roleId]) => allowed.has(roleId)),
  );
  return Object.keys(filtered).length > 0 ? filtered : undefined;
}

function buildGroupScores(input: {
  readonly eligibleRoleScores?: Record<string, number>;
  readonly roleCases?: Record<string, number>;
}): {
  readonly groupScores?: Record<string, number>;
  readonly groupCases?: Record<string, number>;
} {
  if (!input.eligibleRoleScores) {
    return {};
  }

  const groupsByRoleId = new Map(
    canonicalTaxonomy.roles.map((role) => [
      role.id,
      [role.primaryGroupId, ...role.secondaryGroupIds],
    ]),
  );
  const totalsByGroupId: Record<string, number> = {};
  const countsByGroupId: Record<string, number> = {};

  for (const [roleId, score] of Object.entries(input.eligibleRoleScores)) {
    const groupIds = groupsByRoleId.get(roleId) ?? [];
    const roleCases = input.roleCases?.[roleId] ?? 1;
    for (const groupId of groupIds) {
      totalsByGroupId[groupId] = (totalsByGroupId[groupId] ?? 0) + score * roleCases;
      countsByGroupId[groupId] = (countsByGroupId[groupId] ?? 0) + roleCases;
    }
  }

  const groupScores = Object.fromEntries(
    Object.entries(totalsByGroupId).map(([groupId, total]) => [
      groupId,
      total / (countsByGroupId[groupId] ?? 1),
    ]),
  );
  return {
    groupScores: Object.keys(groupScores).length > 0 ? groupScores : undefined,
    groupCases: Object.keys(countsByGroupId).length > 0 ? countsByGroupId : undefined,
  };
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
  const compareDir = path.join(
    resolveBenchmarkRunArtifactDir(artifactRoot, runId),
    "judge",
    "compare",
  );
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

async function listCompletedBenchmarkRuns(artifactRoot: string): Promise<CompletedBenchmarkRun[]> {
  let runIds: string[];
  try {
    runIds = await readdir(artifactRoot);
  } catch {
    return [];
  }

  const completed: CompletedBenchmarkRun[] = [];
  for (const runId of runIds) {
    const manifestPath = path.join(artifactRoot, runId, "manifest.json");
    try {
      const manifestRaw = await readFile(manifestPath, "utf8");
      const manifest = JSON.parse(manifestRaw) as BenchmarkRunManifest;
      if (typeof manifest.gradingCompletedAtMs !== "number") {
        continue;
      }
      const result = await readBenchmarkRunResult(artifactRoot, runId);
      completed.push({ runId, manifest, result });
    } catch {
      // skip malformed or incomplete run directories
    }
  }
  return completed;
}

function resolveRunCaseCount(
  manifest: BenchmarkRunManifest,
  result: BenchmarkPersistedRunResult | null,
): number {
  if (manifest.caseIds.length > 0) {
    return manifest.caseIds.length;
  }
  if (!result) {
    return 0;
  }
  return result.endpointGrades.reduce((total, grade) => total + grade.caseResults.length, 0);
}

function pickLatestCompletedRun(
  runs: readonly CompletedBenchmarkRun[],
  mode?: "quick" | "full",
): CompletedBenchmarkRun | null {
  const filtered = mode
    ? runs.filter((run) => (run.manifest.mode ?? run.result?.mode ?? "full") === mode)
    : runs;
  if (filtered.length === 0) {
    return null;
  }
  return filtered.reduce((latest, current) => {
    const latestCompletedAtMs = latest.manifest.gradingCompletedAtMs ?? 0;
    const currentCompletedAtMs = current.manifest.gradingCompletedAtMs ?? 0;
    return currentCompletedAtMs > latestCompletedAtMs ? current : latest;
  });
}

async function buildBenchmarkSummaryResponse(input: {
  readonly artifactRoot: string;
  readonly runId: string;
  readonly manifest: BenchmarkRunManifest;
  readonly result: BenchmarkPersistedRunResult | null;
  readonly resolveModelId: (endpointId: string) => string | null;
}): Promise<BenchmarkSummaryResponse> {
  const { manifest, result, runId } = input;
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
        ...(grade.caseTaxonomyTags
          ? (() => {
              const aggregates = computeTaxonomyAggregates(
                grade.caseResults,
                grade.caseTaxonomyTags,
              );
              return {
                taxonomyScores: aggregates.scores,
                taxonomyCoverage: aggregates.coverage,
              };
            })()
          : {}),
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
          latencyMs: caseResult.latencyMs,
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

export async function listBenchmarkRuns(
  artifactRoot: string,
): Promise<readonly BenchmarkRunListEntry[]> {
  const runs = await listCompletedBenchmarkRuns(artifactRoot);
  return runs
    .map(({ runId, manifest, result }) => ({
      runId,
      mode: manifest.mode ?? result?.mode ?? "full",
      completedAtMs: manifest.gradingCompletedAtMs ?? result?.completedAtMs ?? 0,
      suiteId: manifest.suiteId ?? result?.suiteId ?? "",
      caseCount: resolveRunCaseCount(manifest, result),
      endpointIds:
        manifest.endpointIds.length > 0
          ? manifest.endpointIds
          : (result?.endpointGrades.map((grade) => grade.endpointId) ?? []),
    }))
    .sort((left, right) => right.completedAtMs - left.completedAtMs);
}

export async function readLatestBenchmarkSummaryByMode(input: {
  readonly artifactRoot: string;
  readonly mode: "quick" | "full";
  readonly resolveModelId: (endpointId: string) => string | null;
}): Promise<BenchmarkSummaryResponse> {
  const latest = pickLatestCompletedRun(
    await listCompletedBenchmarkRuns(input.artifactRoot),
    input.mode,
  );
  if (!latest) {
    return EMPTY_BENCHMARK_SUMMARY;
  }
  return buildBenchmarkSummaryResponse({
    artifactRoot: input.artifactRoot,
    runId: latest.runId,
    manifest: latest.manifest,
    result: latest.result,
    resolveModelId: input.resolveModelId,
  });
}

export async function readBenchmarkSummariesByMode(input: {
  readonly artifactRoot: string;
  readonly resolveModelId: (endpointId: string) => string | null;
}): Promise<{
  readonly full: BenchmarkSummaryResponse;
  readonly quick: BenchmarkSummaryResponse;
}> {
  const [full, quick] = await Promise.all([
    readLatestBenchmarkSummaryByMode({ ...input, mode: "full" }),
    readLatestBenchmarkSummaryByMode({ ...input, mode: "quick" }),
  ]);
  return { full, quick };
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
  const filePath = path.join(
    resolveBenchmarkRunArtifactDir(artifactRoot, result.runId),
    "result.json",
  );
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
  const latest = pickLatestCompletedRun(await listCompletedBenchmarkRuns(input.artifactRoot));
  if (!latest) {
    return EMPTY_BENCHMARK_SUMMARY;
  }
  return buildBenchmarkSummaryResponse({
    artifactRoot: input.artifactRoot,
    runId: latest.runId,
    manifest: latest.manifest,
    result: latest.result,
    resolveModelId: input.resolveModelId,
  });
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
  const overallScore = readNumber(profile, "judge_score") ?? readNumber(profile, "quality_score");
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
  readonly availableRoleIds?: readonly string[];
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
    const roleScores = summarySubject.taxonomyScores?.byRole;
    const eligibleRoleScores = buildEligibleRoleScores({
      roleScores,
      availableRoleIds: input.availableRoleIds,
    });
    const { groupScores, groupCases } = buildGroupScores({
      eligibleRoleScores,
      roleCases: summarySubject.taxonomyCoverage?.byRole,
    });
    const lowCoverageRoleIds = Object.entries(summarySubject.taxonomyCoverage?.byRole ?? {})
      .filter(([, cases]) => cases < BENCHMARK_LOW_COVERAGE_CASE_COUNT)
      .map(([roleId]) => roleId);
    const lowCoverageGroupIds = Object.entries(groupCases ?? {})
      .filter(([, cases]) => cases < BENCHMARK_LOW_COVERAGE_CASE_COUNT)
      .map(([groupId]) => groupId);

    return {
      ...capability,
      overallScore: summarySubject.overallScore,
      scoresByBucket: summarySubject.scoresByBucket,
      ...(summarySubject.taxonomyScores?.byTask
        ? { taskScores: summarySubject.taxonomyScores.byTask }
        : {}),
      ...(roleScores ? { roleScores } : {}),
      ...(eligibleRoleScores ? { eligibleRoleScores } : {}),
      ...(groupScores ? { groupScores } : {}),
      coverage: {
        overallCases: summarySubject.caseCount,
        ...(summarySubject.taxonomyCoverage?.byRole
          ? { roleCases: summarySubject.taxonomyCoverage.byRole }
          : {}),
        ...(groupCases ? { groupCases } : {}),
        lowCoverageRoleIds,
        lowCoverageGroupIds,
      },
    };
  }
  return capability;
}
