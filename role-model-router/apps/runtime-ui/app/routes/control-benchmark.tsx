import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  SelectField,
  StatusPill,
} from "../components/page-primitives";
import { computeLatencyPercentiles } from "../lib/benchmark-latency";
import {
  describeHardBlend,
  filterBenchmarkRunnableCandidates,
  isBenchmarkRunnableCandidate,
  resolveSubjectFromSummary,
} from "../lib/benchmark-model-cards";
import {
  listRowClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import { formatScore, formatScoreFraction } from "../lib/format-score";
import {
  type BenchmarkCaseAuditEntry,
  type BenchmarkCaseComparison,
  type BenchmarkEndpointGrade,
  type BenchmarkRunListEntry,
  type BenchmarkRunProgress,
  type BenchmarkRunResult,
  type BenchmarkSuite,
  type BenchmarkSummariesByMode,
  type BenchmarkSummary,
  type BenchmarkSummarySubject,
  type RouterCandidate,
  type RuntimeSummary,
  clearAllBenchmarkData,
  clearBenchmarkEndpointData,
  fetchActiveBenchmarkRun,
  fetchBenchmarkPreferences,
  fetchBenchmarkRunProgress,
  fetchBenchmarkRuns,
  fetchBenchmarkSuite,
  fetchBenchmarkSummariesByMode,
  fetchBenchmarkSummary,
  fetchRouterCandidates,
  fetchRuntimeSummary,
  startCapabilityBenchmark,
  updateBenchmarkPreferences,
} from "../lib/runtime-api";

const BENCHMARK_POLL_MS = 1500;
const BENCHMARK_STALL_MS = 90_000;
const ACTIVE_BENCHMARK_RUN_KEY = "role-model.benchmark.activeRunId";

const EMPTY_BENCHMARK_SUMMARY: BenchmarkSummary = {
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

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function describeBenchmarkProgress(progress: BenchmarkRunProgress): {
  readonly phaseLabel: string;
  readonly detail: string;
} {
  if (progress.runPhase === "execution") {
    return {
      phaseLabel: "Phase 1 of 3 · Recording responses",
      detail: [
        progress.currentEndpointModelId
          ? `model ${progress.endpointIndex}/${progress.endpointCount}: ${progress.currentEndpointModelId}`
          : null,
        progress.currentCaseId
          ? `case ${progress.caseIndex}/${progress.caseCount} (${progress.currentCaseId})`
          : null,
        progress.currentPhase === "execute"
          ? "running benchmark cases and saving deliverables"
          : "preparing execution pass",
      ]
        .filter(Boolean)
        .join(" • "),
    };
  }

  if (progress.runPhase === "compare") {
    return {
      phaseLabel: "Phase 3 of 3 · Head-to-head compare",
      detail: [
        progress.currentCaseId
          ? `case ${progress.caseIndex}/${progress.caseCount} (${progress.currentCaseId})`
          : null,
        progress.currentPhase === "compare"
          ? "ranking subjects for this case"
          : "preparing compare pass",
      ]
        .filter(Boolean)
        .join(" • "),
    };
  }

  return {
    phaseLabel: "Phase 2 of 3 · Judge grading",
    detail: [
      progress.currentEndpointModelId
        ? `model ${progress.endpointIndex}/${progress.endpointCount}: ${progress.currentEndpointModelId}`
        : null,
      progress.currentCaseId
        ? `case ${progress.caseIndex}/${progress.caseCount} (${progress.currentCaseId})`
        : null,
      progress.currentPhase === "judge"
        ? "scoring recorded deliverables"
        : "grading saved responses",
    ]
      .filter(Boolean)
      .join(" • "),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function pickNumber(record: Record<string, unknown> | null, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function formatLatencyMs(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/a";
  }
  return `${Math.round(value)} ms`;
}

function resolveJudgeLabel(
  summary: BenchmarkSummary,
  candidates: readonly RouterCandidate[],
): string | null {
  return (
    summary.judgeModelId ??
    candidates.find((candidate) => candidate.endpointId === summary.judgeEndpointId)?.modelId ??
    summary.judgeEndpointId ??
    null
  );
}

function collectEndpointLatencies(input: {
  readonly endpointId: string;
  readonly caseResults: BenchmarkEndpointGrade["caseResults"] | null;
  readonly caseAudits: readonly BenchmarkCaseAuditEntry[] | undefined;
}): readonly number[] {
  const fromCaseResults = (input.caseResults ?? [])
    .map((caseResult) => caseResult.latencyMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (fromCaseResults.length > 0) {
    return fromCaseResults;
  }
  return (input.caseAudits ?? [])
    .filter((audit) => audit.endpointId === input.endpointId)
    .map((audit) => audit.latencyMs)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function EndpointModeRunSnapshot({
  title,
  summary,
  endpointId,
  judgeLabel,
}: {
  readonly title: string;
  readonly summary: BenchmarkSummary;
  readonly endpointId: string;
  readonly judgeLabel: string | null;
}) {
  if (!summary.runId) {
    return (
      <div className={`${mutedPanelClassName} p-3`}>
        <p className="text-sm font-semibold text-[var(--rm-fg)]">{title}</p>
        <p className="mt-2 text-sm text-[var(--rm-secondary)]">No completed run yet.</p>
      </div>
    );
  }

  const subject = resolveSubjectFromSummary(summary, endpointId);
  const completedAtLabel = summary.completedAtMs
    ? new Date(summary.completedAtMs).toLocaleString()
    : "unknown";

  return (
    <div className={`${mutedPanelClassName} p-3`}>
      <p className="text-sm font-semibold text-[var(--rm-fg)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--rm-secondary)]">
        Completed {completedAtLabel}
        {judgeLabel ? ` • judge: ${judgeLabel}` : ""}
      </p>
      {subject ? (
        <>
          <p className="mt-2 text-sm font-semibold text-[var(--rm-fg)]">
            {formatScore(subject.overallScore)} overall
          </p>
          <p className="mt-1 text-sm text-[var(--rm-secondary)]">
            easy {formatScore(subject.scoresByBucket.easy.score)} • medium{" "}
            {formatScore(subject.scoresByBucket.medium.score)} • hard{" "}
            {formatScore(subject.scoresByBucket.hard.score)}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--rm-secondary)]">
          This endpoint was not graded in the last {summary.mode ?? "benchmark"} run.
        </p>
      )}
    </div>
  );
}

function describeRoutingImpact(candidate: RouterCandidate): string {
  const profile = asRecord(candidate.latestProfile);
  const sources = asRecord(profile?.sources);
  const advisory = asRecord(candidate.advisoryMaxDifficultyRecommendation);
  const qualityScore = pickNumber(
    profile,
    "judge_score",
    "quality_score",
    "judgeScore",
    "qualityScore",
  );
  const benchmarkSamples = pickNumber(sources, "benchmark_samples", "benchmarkSamples") ?? 0;
  const recommended =
    typeof advisory?.recommended_max_difficulty === "string"
      ? advisory.recommended_max_difficulty
      : typeof advisory?.recommendedMaxDifficulty === "string"
        ? advisory.recommendedMaxDifficulty
        : null;
  const minQuality =
    pickNumber(advisory, "min_quality_score", "minQualityScore") ??
    pickNumber(asRecord(advisory?.thresholds), "min_quality_score", "minQualityScore");

  const parts: string[] = [];
  if (qualityScore !== null) {
    parts.push(
      `Router ranks this candidate using a ${formatScore(qualityScore)} quality score (from benchmark judge grades).`,
    );
  }
  if (recommended) {
    parts.push(
      `Difficulty routing treats ${recommended} as the recommended max prompt difficulty for this endpoint.`,
    );
    if (minQuality !== null) {
      parts.push(
        `Per-bucket quality must stay above ${formatScore(minQuality)} to raise that ceiling.`,
      );
    }
  }
  if (benchmarkSamples > 0) {
    parts.push(
      `${benchmarkSamples} benchmark sample${benchmarkSamples === 1 ? "" : "s"} are merged into the observed profile used on future routing decisions.`,
    );
  }
  const hardBlendDetail = describeHardBlend(candidate);
  if (hardBlendDetail) {
    parts.push(hardBlendDetail);
  }
  return parts.length > 0
    ? parts.join(" ")
    : "Run a benchmark to write judge scores into this endpoint's observed routing profile.";
}

interface ModelScoreRow {
  readonly endpointId: string;
  readonly modelId: string;
  readonly sourceType: string;
  readonly overallScore: number | null;
  readonly scoresByBucket: BenchmarkSummarySubject["scoresByBucket"] | null;
  readonly profileQualityScore: number | null;
  readonly benchmarkSamples: number;
  readonly latencyP50: number | null;
  readonly latencyP95: number | null;
  readonly caseResults: BenchmarkEndpointGrade["caseResults"] | null;
  readonly candidate: RouterCandidate;
}

function buildModelScoreRows(
  candidates: readonly RouterCandidate[],
  result: BenchmarkRunResult | null,
  summary: BenchmarkSummary | null,
): ModelScoreRow[] {
  const gradeByEndpoint = new Map<
    string,
    {
      overallScore: number;
      scoresByBucket: BenchmarkSummarySubject["scoresByBucket"];
      caseResults: BenchmarkEndpointGrade["caseResults"] | null;
    }
  >();

  for (const subject of summary?.subjects ?? []) {
    gradeByEndpoint.set(subject.endpointId, {
      overallScore: subject.overallScore,
      scoresByBucket: subject.scoresByBucket,
      caseResults: null,
    });
  }
  for (const grade of result?.endpointGrades ?? []) {
    gradeByEndpoint.set(grade.endpointId, {
      overallScore: grade.overallScore,
      scoresByBucket: grade.byDifficulty,
      caseResults: grade.caseResults,
    });
  }

  const rows: ModelScoreRow[] = [];
  for (const candidate of candidates) {
    const grade = gradeByEndpoint.get(candidate.endpointId);
    const profile = asRecord(candidate.latestProfile);
    const sources = asRecord(profile?.sources);
    const profileQualityScore = pickNumber(profile, "judge_score", "quality_score");
    const benchmarkSamples = pickNumber(sources, "benchmark_samples") ?? 0;
    const capability = candidate.benchmarkCapability;
    const caseResults = grade?.caseResults ?? null;
    const { p50: latencyP50, p95: latencyP95 } = computeLatencyPercentiles(
      collectEndpointLatencies({
        endpointId: candidate.endpointId,
        caseResults,
        caseAudits: summary?.caseAudits,
      }),
    );

    if (!grade && !capability && benchmarkSamples === 0 && profileQualityScore === null) {
      continue;
    }

    rows.push({
      endpointId: candidate.endpointId,
      modelId: candidate.modelId,
      sourceType: candidate.sourceType,
      overallScore: grade?.overallScore ?? capability?.overallScore ?? profileQualityScore,
      scoresByBucket:
        grade?.scoresByBucket ??
        (capability?.scoresByBucket
          ? {
              easy: {
                score: capability.scoresByBucket.easy?.score ?? 0,
                cases: capability.scoresByBucket.easy?.cases ?? 0,
              },
              medium: {
                score: capability.scoresByBucket.medium?.score ?? 0,
                cases: capability.scoresByBucket.medium?.cases ?? 0,
              },
              hard: {
                score: capability.scoresByBucket.hard?.score ?? 0,
                cases: capability.scoresByBucket.hard?.cases ?? 0,
              },
            }
          : null),
      profileQualityScore,
      benchmarkSamples,
      latencyP50,
      latencyP95,
      caseResults,
      candidate,
    });
  }

  return rows.sort((left, right) => right.modelId.localeCompare(left.modelId, "en"));
}

export default function ControlBenchmarkRoute() {
  const [suite, setSuite] = useState<BenchmarkSuite | null>(null);
  const [candidates, setCandidates] = useState<readonly RouterCandidate[] | null>(null);
  const [selectedEndpointIds, setSelectedEndpointIds] = useState<string[]>([]);
  const [judgeEndpointId, setJudgeEndpointId] = useState<string>("");
  const [mode, setMode] = useState<"quick" | "full">("quick");
  const [running, setRunning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState<BenchmarkRunProgress | null>(null);
  const [result, setResult] = useState<BenchmarkRunResult | null>(null);
  const [lastSummary, setLastSummary] = useState<BenchmarkSummary | null>(null);
  const [summariesByMode, setSummariesByMode] = useState<BenchmarkSummariesByMode | null>(null);
  const [runHistory, setRunHistory] = useState<readonly BenchmarkRunListEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [runtimeSummary, setRuntimeSummary] = useState<RuntimeSummary | null>(null);
  const [clearingEndpointId, setClearingEndpointId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [taxonomyFilterRole, setTaxonomyFilterRole] = useState<string>("");
  const [taxonomyFilterTask, setTaxonomyFilterTask] = useState<string>("");
  const [taxonomyFilterCapability, setTaxonomyFilterCapability] = useState<string>("");

  const resolveJudgeEndpointId = useCallback(
    (candidateValue: readonly RouterCandidate[], savedJudgeEndpointId?: string): string => {
      const healthy = filterBenchmarkRunnableCandidates(candidateValue).filter(
        (candidate) => candidate.healthStatus !== "offline",
      );
      if (
        savedJudgeEndpointId &&
        healthy.some((candidate) => candidate.endpointId === savedJudgeEndpointId)
      ) {
        return savedJudgeEndpointId;
      }
      return (
        healthy.find((candidate) => candidate.sourceType === "remote")?.endpointId ??
        healthy[0]?.endpointId ??
        ""
      );
    },
    [],
  );

  const refreshBenchmarkState = useCallback(async () => {
    const [summary, byMode, runs, candidateValue] = await Promise.all([
      fetchBenchmarkSummary(),
      fetchBenchmarkSummariesByMode(),
      fetchBenchmarkRuns(),
      fetchRouterCandidates(),
    ]);
    setLastSummary(summary);
    setSummariesByMode(byMode);
    setRunHistory(runs);
    setCandidates(candidateValue);
    return { summary, byMode, runs, candidateValue };
  }, []);

  useEffect(() => {
    void Promise.all([
      fetchBenchmarkSuite(),
      fetchRouterCandidates(),
      fetchBenchmarkSummary(),
      fetchBenchmarkSummariesByMode(),
      fetchBenchmarkRuns(),
      fetchBenchmarkPreferences(),
      fetchRuntimeSummary(),
    ])
      .then(
        ([
          suiteValue,
          candidateValue,
          summaryValue,
          summariesByModeValue,
          runHistoryValue,
          preferences,
          runtimeSummaryValue,
        ]) => {
          setSuite(suiteValue);
          setCandidates(candidateValue);
          setLastSummary(summaryValue);
          setSummariesByMode(summariesByModeValue);
          setRunHistory(runHistoryValue);
          setRuntimeSummary(runtimeSummaryValue);
          const healthy = candidateValue.filter(
            (candidate) =>
              isBenchmarkRunnableCandidate(candidate) && candidate.healthStatus !== "offline",
          );
          setSelectedEndpointIds(healthy.map((candidate) => candidate.endpointId));
          setJudgeEndpointId(resolveJudgeEndpointId(candidateValue, preferences.judgeEndpointId));
          setError(null);
        },
      )
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load benchmark data."),
      );
  }, [resolveJudgeEndpointId]);

  useEffect(() => {
    if (!suite || !candidates) {
      return;
    }

    let cancelled = false;

    const resumeActiveRun = async () => {
      try {
        const activeRun = await fetchActiveBenchmarkRun();
        const storedRunId = sessionStorage.getItem(ACTIVE_BENCHMARK_RUN_KEY);
        const runId = activeRun?.runId ?? storedRunId;
        if (!runId) {
          return;
        }

        const snapshot = await fetchBenchmarkRunProgress(runId);
        if (cancelled) {
          return;
        }

        if (snapshot.status === "running") {
          setActiveRunId(runId);
          setRunning(true);
          setProgress(snapshot);
          sessionStorage.setItem(ACTIVE_BENCHMARK_RUN_KEY, runId);
          return;
        }

        sessionStorage.removeItem(ACTIVE_BENCHMARK_RUN_KEY);
        if (snapshot.status === "completed" && snapshot.result) {
          setResult(snapshot.result);
          void refreshBenchmarkState();
        }
      } catch {
        sessionStorage.removeItem(ACTIVE_BENCHMARK_RUN_KEY);
      }
    };

    void resumeActiveRun();
    return () => {
      cancelled = true;
    };
  }, [candidates, refreshBenchmarkState, suite]);

  const eligibleCaseCount = useMemo(() => {
    if (!suite) {
      return 0;
    }
    if (mode === "quick") {
      return suite.cases.filter((item) => item.benchmark_eligible && item.quick_benchmark).length;
    }
    return suite.cases.filter((item) => item.benchmark_eligible).length;
  }, [mode, suite]);

  const runnableCandidates = useMemo(
    () => (candidates ? filterBenchmarkRunnableCandidates(candidates) : []),
    [candidates],
  );

  const runnableEndpointIds = useMemo(
    () => new Set(runnableCandidates.map((candidate) => candidate.endpointId)),
    [runnableCandidates],
  );

  useEffect(() => {
    if (!candidates) {
      return;
    }
    setSelectedEndpointIds((current) =>
      current.filter((endpointId) => runnableEndpointIds.has(endpointId)),
    );
    if (judgeEndpointId && !runnableEndpointIds.has(judgeEndpointId)) {
      setJudgeEndpointId(resolveJudgeEndpointId(runnableCandidates));
    }
  }, [
    candidates,
    judgeEndpointId,
    resolveJudgeEndpointId,
    runnableCandidates,
    runnableEndpointIds,
  ]);

  const gradedEndpointCount = selectedEndpointIds.length;

  const judgeSubjectOverlap =
    judgeEndpointId.length > 0 && selectedEndpointIds.includes(judgeEndpointId);

  const canRunBenchmark =
    Boolean(suite) &&
    gradedEndpointCount >= 2 &&
    judgeEndpointId.length > 0 &&
    runnableEndpointIds.has(judgeEndpointId) &&
    !running;

  const modelScoreRows = useMemo(
    () => (candidates ? buildModelScoreRows(candidates, result, lastSummary) : []),
    [candidates, lastSummary, result],
  );

  const compareByCaseId = useMemo(() => {
    const map = new Map<string, BenchmarkCaseComparison>();
    for (const entry of lastSummary?.caseComparisons ?? []) {
      map.set(entry.caseId, entry);
    }
    return map;
  }, [lastSummary]);

  const toggleEndpoint = (endpointId: string) => {
    setSelectedEndpointIds((current) =>
      current.includes(endpointId)
        ? current.filter((value) => value !== endpointId)
        : [...current, endpointId],
    );
  };

  const runBenchmark = useCallback(async () => {
    const runnableSelectedEndpointIds = selectedEndpointIds.filter((endpointId) =>
      runnableEndpointIds.has(endpointId),
    );
    if (runnableSelectedEndpointIds.length < 2) {
      setError("Select at least two endpoints for compare-capable benchmark runs.");
      return;
    }
    if (!judgeEndpointId || !runnableEndpointIds.has(judgeEndpointId)) {
      setError("Select a judge endpoint.");
      return;
    }
    setRunning(true);
    setError(null);
    setProgress(null);
    setActiveRunId(null);
    try {
      await updateBenchmarkPreferences({ judgeEndpointId });
      const started = await startCapabilityBenchmark({
        endpointIds: runnableSelectedEndpointIds,
        judgeEndpointId,
        mode,
        useJudge: true,
      });
      sessionStorage.setItem(ACTIVE_BENCHMARK_RUN_KEY, started.runId);
      setActiveRunId(started.runId);
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : "Benchmark run failed.");
      setRunning(false);
      sessionStorage.removeItem(ACTIVE_BENCHMARK_RUN_KEY);
    }
  }, [judgeEndpointId, mode, runnableEndpointIds, selectedEndpointIds]);

  const clearEndpointRoutingProfile = useCallback(
    async (endpointId: string) => {
      setClearingEndpointId(endpointId);
      setError(null);
      try {
        await clearBenchmarkEndpointData(endpointId);
        await refreshBenchmarkState();
        if (result) {
          setResult({
            ...result,
            endpointGrades: result.endpointGrades.filter(
              (grade) => grade.endpointId !== endpointId,
            ),
          });
        }
      } catch (value: unknown) {
        setError(
          value instanceof Error
            ? value.message
            : "Could not clear routing profile for this model.",
        );
      } finally {
        setClearingEndpointId(null);
      }
    },
    [refreshBenchmarkState, result],
  );

  const handleClearAllBenchmarkData = useCallback(async () => {
    const confirmed = window.confirm(
      "Clear all benchmark data? This removes every benchmark run, artifact, and routing profile sample. This cannot be undone.",
    );
    if (!confirmed) {
      return;
    }

    setClearingAll(true);
    setError(null);
    try {
      await clearAllBenchmarkData();
      setResult(null);
      await refreshBenchmarkState();
    } catch (value: unknown) {
      setError(value instanceof Error ? value.message : "Could not clear all benchmark data.");
    } finally {
      setClearingAll(false);
    }
  }, [refreshBenchmarkState]);

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!activeRunId) {
      return;
    }
    let cancelled = false;

    const poll = async () => {
      try {
        const snapshot = await fetchBenchmarkRunProgress(activeRunId);
        if (cancelled) {
          return;
        }
        setProgress(snapshot);
        if (snapshot.status === "completed" && snapshot.result) {
          setResult(snapshot.result);
          void refreshBenchmarkState();
          setRunning(false);
          setActiveRunId(null);
          sessionStorage.removeItem(ACTIVE_BENCHMARK_RUN_KEY);
        } else if (snapshot.status === "failed") {
          setError(snapshot.errorMessage ?? "Benchmark run failed.");
          setRunning(false);
          setActiveRunId(null);
          sessionStorage.removeItem(ACTIVE_BENCHMARK_RUN_KEY);
        }
      } catch (value: unknown) {
        if (!cancelled) {
          setError(value instanceof Error ? value.message : "Could not read benchmark progress.");
          setRunning(false);
          setActiveRunId(null);
          sessionStorage.removeItem(ACTIVE_BENCHMARK_RUN_KEY);
        }
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), BENCHMARK_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeRunId, refreshBenchmarkState]);

  const progressPercent = progress
    ? progress.totalSteps > 0
      ? Math.min(100, Math.round((progress.completedSteps / progress.totalSteps) * 100))
      : 0
    : 0;
  const progressStalled = Boolean(
    progress && progress.status === "running" && nowMs - progress.updatedAtMs >= BENCHMARK_STALL_MS,
  );
  const progressDescription = progress ? describeBenchmarkProgress(progress) : null;

  if (error && !suite && !candidates) {
    return <ErrorState label={error} />;
  }
  if (!suite || !candidates) {
    return <LoadingState label="Loading capability benchmark…" />;
  }

  const lastRunLabel = lastSummary?.completedAtMs
    ? new Date(lastSummary.completedAtMs).toLocaleString()
    : null;
  const judgeLabel = lastSummary ? resolveJudgeLabel(lastSummary, candidates) : null;
  const fullSummary = summariesByMode?.full ?? EMPTY_BENCHMARK_SUMMARY;
  const quickSummary = summariesByMode?.quick ?? EMPTY_BENCHMARK_SUMMARY;
  const fullJudgeLabel = fullSummary.runId ? resolveJudgeLabel(fullSummary, candidates) : null;
  const quickJudgeLabel = quickSummary.runId ? resolveJudgeLabel(quickSummary, candidates) : null;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Model scores and routing profiles"
        description="Each benchmark run grades model output, then writes judge scores into observed endpoint profiles. Router uses those profiles for candidate quality ranking and difficulty ceilings on later requests."
      >
        {lastRunLabel ? (
          <p className="mb-4 text-sm text-[var(--rm-secondary)]">
            Last completed run: {lastRunLabel}
            {lastSummary?.mode ? ` • ${lastSummary.mode} suite` : ""}
            {judgeLabel ? ` • judge: ${judgeLabel}` : ""}
          </p>
        ) : null}

        {modelScoreRows.length === 0 ? (
          <EmptyState label="No benchmark scores are in routing profiles yet. Run the benchmark below to grade each model and update observed profiles." />
        ) : (
          <div className="space-y-4">
            {modelScoreRows.map((row) => (
              <div key={row.endpointId} className={listRowClassName}>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-[var(--rm-fg)]">{row.modelId}</p>
                    <p className="text-sm text-[var(--rm-secondary)]">{row.endpointId}</p>
                  </div>

                  <div className="grid gap-2 text-sm text-[var(--rm-secondary)] md:grid-cols-2">
                    <p>
                      <span className="font-semibold text-[var(--rm-fg)]">Benchmark overall:</span>{" "}
                      {row.caseResults?.length
                        ? formatScoreFraction(row.overallScore, row.caseResults.length)
                        : formatScore(row.overallScore)}
                    </p>
                    <p>
                      <span className="font-semibold text-[var(--rm-fg)]">
                        Profile quality score:
                      </span>{" "}
                      {formatScore(row.profileQualityScore)}
                      {row.benchmarkSamples > 0
                        ? ` (${row.benchmarkSamples} benchmark sample${row.benchmarkSamples === 1 ? "" : "s"})`
                        : ""}
                    </p>
                    <p>
                      <span className="font-semibold text-[var(--rm-fg)]">Benchmark latency:</span>{" "}
                      p50 {formatLatencyMs(row.latencyP50)} • p95 {formatLatencyMs(row.latencyP95)}
                    </p>
                  </div>

                  {row.scoresByBucket ? (
                    <p className="text-sm text-[var(--rm-secondary)]">
                      <span className="font-semibold text-[var(--rm-fg)]">By difficulty:</span> easy{" "}
                      {formatScore(row.scoresByBucket.easy.score)} • medium{" "}
                      {formatScore(row.scoresByBucket.medium.score)} • hard{" "}
                      {formatScore(row.scoresByBucket.hard.score)}
                    </p>
                  ) : null}

                  <p className="text-sm leading-6 text-[var(--rm-secondary)]">
                    <span className="font-semibold text-[var(--rm-fg)]">Routing impact:</span>{" "}
                    {describeRoutingImpact(row.candidate)}
                  </p>

                  <div className="grid gap-3 md:grid-cols-2">
                    <EndpointModeRunSnapshot
                      title="Last full run"
                      summary={fullSummary}
                      endpointId={row.endpointId}
                      judgeLabel={fullJudgeLabel}
                    />
                    <EndpointModeRunSnapshot
                      title="Last quick run (12 hard)"
                      summary={quickSummary}
                      endpointId={row.endpointId}
                      judgeLabel={quickJudgeLabel}
                    />
                  </div>

                  {row.caseResults && row.caseResults.length > 0 ? (
                    <details className="text-sm text-[var(--rm-secondary)]">
                      <summary className="cursor-pointer font-semibold text-[var(--rm-fg)]">
                        Per-case benchmark results
                      </summary>
                      <div className="mt-3 space-y-2">
                        {row.caseResults.map((caseResult) => {
                          const compareResult = compareByCaseId.get(caseResult.caseId);
                          return (
                            <div
                              key={caseResult.caseId}
                              className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] p-3"
                            >
                              <p className="font-semibold text-[var(--rm-fg)]">
                                {caseResult.caseId} • {formatScore(caseResult.score)} •{" "}
                                {caseResult.difficultyBucket} •{" "}
                                {formatLatencyMs(caseResult.latencyMs)}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                {caseResult.gradingMethod ? (
                                  <StatusPill tone="neutral">{caseResult.gradingMethod}</StatusPill>
                                ) : null}
                                {caseResult.judgeUnavailable ? (
                                  <StatusPill tone="warning">judge unavailable</StatusPill>
                                ) : null}
                                {caseResult.parseSuccess === false ? (
                                  <StatusPill tone="warning">parse failed</StatusPill>
                                ) : null}
                                {caseResult.cappedByValidator ? (
                                  <StatusPill tone="warning">validator cap</StatusPill>
                                ) : null}
                              </div>
                              <p>{caseResult.rationale}</p>
                              {compareResult ? (
                                <p className="mt-2 text-xs text-[var(--rm-secondary)]">
                                  <span className="font-semibold text-[var(--rm-fg)]">
                                    Head-to-head ranking:
                                  </span>{" "}
                                  {compareResult.relativeRanking.join(" › ")}
                                  {" — "}
                                  {compareResult.rationale}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  ) : null}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap items-start justify-end gap-2">
                    <StatusPill tone={row.sourceType === "remote" ? "accent" : "neutral"}>
                      {row.sourceType}
                    </StatusPill>
                    <StatusPill tone="success">{formatScore(row.overallScore)}</StatusPill>
                  </div>
                  <button
                    type="button"
                    className={secondaryButtonClassName}
                    disabled={running || clearingEndpointId === row.endpointId}
                    onClick={() => void clearEndpointRoutingProfile(row.endpointId)}
                  >
                    {clearingEndpointId === row.endpointId
                      ? "Clearing routing profile…"
                      : "Clear routing profile"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {modelScoreRows.length > 0 ? (
        <SectionCard
          title="Taxonomy dimensions"
          description="View benchmark scores aggregated by taxonomy dimension. Select a dimension to see per-model scores."
        >
          {(() => {
            const allRoles = new Set<string>();
            const allTasks = new Set<string>();
            const allCapabilities = new Set<string>();
            for (const row of modelScoreRows) {
              const subject = lastSummary?.subjects.find((s) => s.endpointId === row.endpointId);
              if (subject?.taxonomyScores) {
                for (const k of Object.keys(subject.taxonomyScores.byRole ?? {})) allRoles.add(k);
                for (const k of Object.keys(subject.taxonomyScores.byTask ?? {})) allTasks.add(k);
                for (const k of Object.keys(subject.taxonomyScores.byCapability ?? {}))
                  allCapabilities.add(k);
              }
            }
            const hasTaxonomyData =
              allRoles.size > 0 || allTasks.size > 0 || allCapabilities.size > 0;

            const getFilteredScores = (
              dimension: "byRole" | "byTask" | "byCapability",
              filterValue: string,
            ): Array<{
              modelId: string;
              endpointId: string;
              score: number;
            }> => {
              if (!filterValue) return [];
              return modelScoreRows
                .map((row) => {
                  const subject = lastSummary?.subjects.find(
                    (s) => s.endpointId === row.endpointId,
                  );
                  const score = subject?.taxonomyScores?.[dimension]?.[filterValue];
                  return score !== undefined
                    ? {
                        modelId: row.modelId,
                        endpointId: row.endpointId,
                        score,
                      }
                    : null;
                })
                .filter(
                  (
                    entry,
                  ): entry is {
                    modelId: string;
                    endpointId: string;
                    score: number;
                  } => entry !== null,
                )
                .sort((a, b) => b.score - a.score);
            };

            return hasTaxonomyData ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--rm-secondary)]">
                  These scores are advisory and reflect benchmark performance within specific
                  taxonomy categories. They do not override routing policy.
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <SelectField
                    label="Filter by role"
                    value={taxonomyFilterRole}
                    onChange={(value) => {
                      setTaxonomyFilterRole(value);
                      setTaxonomyFilterTask("");
                      setTaxonomyFilterCapability("");
                    }}
                  >
                    <option value="">All roles</option>
                    {[...allRoles].sort().map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Filter by task"
                    value={taxonomyFilterTask}
                    onChange={(value) => {
                      setTaxonomyFilterTask(value);
                      setTaxonomyFilterRole("");
                      setTaxonomyFilterCapability("");
                    }}
                  >
                    <option value="">All tasks</option>
                    {[...allTasks].sort().map((task) => (
                      <option key={task} value={task}>
                        {task}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Filter by capability"
                    value={taxonomyFilterCapability}
                    onChange={(value) => {
                      setTaxonomyFilterCapability(value);
                      setTaxonomyFilterRole("");
                      setTaxonomyFilterTask("");
                    }}
                  >
                    <option value="">All capabilities</option>
                    {[...allCapabilities].sort().map((cap) => (
                      <option key={cap} value={cap}>
                        {cap}
                      </option>
                    ))}
                  </SelectField>
                </div>

                {(() => {
                  const roleScores = getFilteredScores("byRole", taxonomyFilterRole);
                  const taskScores = getFilteredScores("byTask", taxonomyFilterTask);
                  const capScores = getFilteredScores("byCapability", taxonomyFilterCapability);
                  const activeScores =
                    roleScores.length > 0
                      ? { label: `Role: ${taxonomyFilterRole}`, scores: roleScores }
                      : taskScores.length > 0
                        ? { label: `Task: ${taxonomyFilterTask}`, scores: taskScores }
                        : capScores.length > 0
                          ? { label: `Capability: ${taxonomyFilterCapability}`, scores: capScores }
                          : null;

                  return activeScores ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--rm-secondary)]">
                        {activeScores.label}
                      </p>
                      {activeScores.scores.map((entry) => (
                        <div
                          key={entry.endpointId}
                          className="flex items-center justify-between rounded-lg border border-[var(--rm-border)] p-3"
                        >
                          <div>
                            <p className="font-semibold text-[var(--rm-fg)]">{entry.modelId}</p>
                            <p className="text-xs text-[var(--rm-secondary)]">{entry.endpointId}</p>
                          </div>
                          <StatusPill tone="success">{formatScore(entry.score)}</StatusPill>
                        </div>
                      ))}
                    </div>
                  ) : taxonomyFilterRole || taxonomyFilterTask || taxonomyFilterCapability ? (
                    <EmptyState label="No benchmark data for the selected taxonomy dimension." />
                  ) : (
                    <EmptyState label="Select a taxonomy dimension above to see per-model benchmark scores." />
                  );
                })()}
              </div>
            ) : (
              <EmptyState label="No taxonomy dimension data available yet. Run a benchmark with taxonomy-tagged cases to populate dimension scores." />
            );
          })()}
        </SectionCard>
      ) : null}

      <SectionCard
        title="Run capability benchmark"
        description="Grade configured endpoints against the routing capability suite. Scores above are written into each endpoint's observed profile for future routing."
      >
        {runtimeSummary ? (
          <p className="mb-4 text-sm text-[var(--rm-secondary)]">
            Runtime scope: {runtimeSummary.scopeId ?? "unknown"} • endpoints:{" "}
            {runtimeSummary.endpointCount}
            {runtimeSummary.runtimeStateRoot ? ` • state: ${runtimeSummary.runtimeStateRoot}` : ""}
          </p>
        ) : null}
        {judgeSubjectOverlap ? (
          <p className="mb-4 text-sm text-[var(--rm-warning-fg,orange)]">
            Judge endpoint is also a benchmark subject. Expect slower grading and higher judge
            failure risk — prefer a dedicated judge when available.
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          <FactCard
            label="Suite"
            value={suite.cases.filter((item) => item.benchmark_eligible).length}
            detail={`${suite.suite_id} v${suite.suite_version}`}
            emphasis
          />
          <FactCard
            label="Run size"
            value={eligibleCaseCount}
            detail={
              mode === "quick"
                ? "Hard subset: code, tools, and multi-step cases."
                : "Full eligible benchmark set."
            }
          />
          <FactCard
            label="Judge"
            value={
              candidates.find((candidate) => candidate.endpointId === judgeEndpointId)?.modelId ??
              "not selected"
            }
            detail="Grading-only endpoint; scores stored deliverables after execution completes."
          />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SelectField
            label="Benchmark mode"
            value={mode}
            onChange={(value) => setMode(value === "full" ? "full" : "quick")}
          >
            <option value="quick">Quick (12 hard cases)</option>
            <option value="full">Full (all eligible cases)</option>
          </SelectField>
          <SelectField
            label="Judge endpoint (grading only)"
            value={judgeEndpointId}
            onChange={(value) => {
              setJudgeEndpointId(value);
              void updateBenchmarkPreferences({ judgeEndpointId: value }).catch(() => undefined);
            }}
          >
            {runnableCandidates.map((candidate) => (
              <option key={candidate.endpointId} value={candidate.endpointId}>
                {candidate.modelId} ({candidate.sourceType})
              </option>
            ))}
          </SelectField>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-[var(--rm-fg)]">Endpoints to grade</p>
          <div className="space-y-2">
            {candidates.map((candidate) => (
              <label
                key={candidate.endpointId}
                className={`${mutedPanelClassName} flex items-start gap-3 p-3 ${
                  isBenchmarkRunnableCandidate(candidate)
                    ? "cursor-pointer"
                    : "cursor-not-allowed opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedEndpointIds.includes(candidate.endpointId)}
                  disabled={!isBenchmarkRunnableCandidate(candidate)}
                  onChange={() => toggleEndpoint(candidate.endpointId)}
                />
                <span className="space-y-1">
                  <span className="block font-semibold text-[var(--rm-fg)]">
                    {candidate.modelId}
                  </span>
                  <span className="block text-sm text-[var(--rm-secondary)]">
                    {candidate.endpointId}
                  </span>
                  {!isBenchmarkRunnableCandidate(candidate) ? (
                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[var(--rm-secondary)]">
                      Excluded by current execution mode
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            className={primaryButtonClassName}
            disabled={running || !canRunBenchmark}
            onClick={() => void runBenchmark()}
          >
            {running
              ? "Running benchmark…"
              : `Run ${mode} benchmark (${gradedEndpointCount} model${gradedEndpointCount === 1 ? "" : "s"}, ${eligibleCaseCount} cases)`}
          </button>
        </div>

        {running ? (
          <div className={`${mutedPanelClassName} mt-4 space-y-3 p-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-[var(--rm-fg)]">
                {progressDescription?.phaseLabel ?? "Benchmark in progress"}
              </p>
              <StatusPill tone={progressStalled ? "warning" : "accent"}>
                {progressStalled ? "No recent updates" : "Running"}
              </StatusPill>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--rm-border)]">
              <div
                className="h-full rounded-full bg-[var(--rm-accent)] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-[var(--rm-secondary)]">
              {progress
                ? `${progress.completedSteps} / ${progress.totalSteps} steps (${progressPercent}%) • elapsed ${formatElapsed(nowMs - progress.startedAtMs)}`
                : "Starting benchmark run…"}
            </p>
            {progressDescription ? (
              <p className="text-sm text-[var(--rm-fg)]">{progressDescription.detail}</p>
            ) : null}
            {progressStalled ? (
              <p className="text-sm text-[var(--rm-warning)]">
                No progress update in the last 90 seconds. The run may still be waiting on a slow
                model response.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-[var(--rm-error)]">{error}</p> : null}
      </SectionCard>

      <SectionCard
        title="Run history"
        description="Completed benchmark runs stored on this runtime. Global clear removes artifacts and routing profile samples for every model."
      >
        {runHistory.length === 0 ? (
          <EmptyState label="No completed benchmark runs yet." />
        ) : (
          <div className="space-y-3">
            {runHistory.map((run) => (
              <div key={run.runId} className={listRowClassName}>
                <div>
                  <p className="font-semibold text-[var(--rm-fg)]">{run.runId}</p>
                  <p className="text-sm text-[var(--rm-secondary)]">
                    {run.mode} • {run.caseCount} cases • {run.endpointIds.length} model
                    {run.endpointIds.length === 1 ? "" : "s"}
                  </p>
                  <p className="text-sm text-[var(--rm-secondary)]">
                    {new Date(run.completedAtMs).toLocaleString()} • {run.suiteId}
                  </p>
                </div>
                <StatusPill tone={run.mode === "quick" ? "accent" : "neutral"}>
                  {run.mode}
                </StatusPill>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            className={secondaryButtonClassName}
            disabled={running || clearingAll}
            onClick={() => void handleClearAllBenchmarkData()}
          >
            {clearingAll ? "Clearing all benchmark data…" : "Clear all benchmark data"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
