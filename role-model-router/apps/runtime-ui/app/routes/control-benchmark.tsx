import { useCallback, useEffect, useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  FactCard,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/page-primitives";
import {
  fieldClassName,
  listRowClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import {
  type BenchmarkEndpointGrade,
  type BenchmarkRunProgress,
  type BenchmarkRunResult,
  type BenchmarkSuite,
  type BenchmarkCaseComparison,
  type BenchmarkSummary,
  type BenchmarkSummarySubject,
  type RouterCandidate,
  clearBenchmarkEndpointData,
  fetchActiveBenchmarkRun,
  fetchBenchmarkPreferences,
  fetchBenchmarkRunProgress,
  fetchBenchmarkSuite,
  fetchBenchmarkSummary,
  fetchRouterCandidates,
  fetchRuntimeSummary,
  startCapabilityBenchmark,
  updateBenchmarkPreferences,
  type RuntimeSummary,
} from "../lib/runtime-api";
import { formatScore, formatScoreFraction } from "../lib/format-score";

const BENCHMARK_POLL_MS = 1500;
const BENCHMARK_STALL_MS = 90_000;
const ACTIVE_BENCHMARK_RUN_KEY = "role-model.benchmark.activeRunId";

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

function describeRoutingImpact(candidate: RouterCandidate): string {
  const profile = asRecord(candidate.latestProfile);
  const sources = asRecord(profile?.sources);
  const advisory = asRecord(candidate.advisoryMaxDifficultyRecommendation);
  const qualityScore =
    pickNumber(profile, "judge_score", "quality_score", "judgeScore", "qualityScore");
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
      parts.push(`Per-bucket quality must stay above ${formatScore(minQuality)} to raise that ceiling.`);
    }
  }
  if (benchmarkSamples > 0) {
    parts.push(
      `${benchmarkSamples} benchmark sample${benchmarkSamples === 1 ? "" : "s"} are merged into the observed profile used on future routing decisions.`,
    );
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

    if (!grade && !capability && benchmarkSamples === 0 && profileQualityScore === null) {
      continue;
    }

    rows.push({
      endpointId: candidate.endpointId,
      modelId: candidate.modelId,
      sourceType: candidate.sourceType,
      overallScore:
        grade?.overallScore ??
        capability?.overallScore ??
        profileQualityScore,
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
      caseResults: grade?.caseResults ?? null,
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
  const [error, setError] = useState<string | null>(null);
  const [runtimeSummary, setRuntimeSummary] = useState<RuntimeSummary | null>(null);
  const [clearingEndpointId, setClearingEndpointId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const resolveJudgeEndpointId = (
    candidateValue: readonly RouterCandidate[],
    savedJudgeEndpointId?: string,
  ): string => {
    const healthy = candidateValue.filter((candidate) => candidate.healthStatus !== "offline");
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
  };

  const refreshSummary = useCallback(async () => {
    const summary = await fetchBenchmarkSummary();
    setLastSummary(summary);
    return summary;
  }, []);

  useEffect(() => {
    void Promise.all([
      fetchBenchmarkSuite(),
      fetchRouterCandidates(),
      fetchBenchmarkSummary(),
      fetchBenchmarkPreferences(),
      fetchRuntimeSummary(),
    ])
      .then(([suiteValue, candidateValue, summaryValue, preferences, runtimeSummaryValue]) => {
        setSuite(suiteValue);
        setCandidates(candidateValue);
        setLastSummary(summaryValue);
        setRuntimeSummary(runtimeSummaryValue);
        const healthy = candidateValue.filter((candidate) => candidate.healthStatus !== "offline");
        setSelectedEndpointIds(healthy.map((candidate) => candidate.endpointId));
        setJudgeEndpointId(resolveJudgeEndpointId(candidateValue, preferences.judgeEndpointId));
        setError(null);
      })
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load benchmark data."),
      );
  }, []);

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
          void refreshSummary();
        }
      } catch {
        sessionStorage.removeItem(ACTIVE_BENCHMARK_RUN_KEY);
      }
    };

    void resumeActiveRun();
    return () => {
      cancelled = true;
    };
  }, [candidates, refreshSummary, suite]);

  const eligibleCaseCount = useMemo(() => {
    if (!suite) {
      return 0;
    }
    if (mode === "quick") {
      return suite.cases.filter((item) => item.benchmark_eligible && item.quick_benchmark).length;
    }
    return suite.cases.filter((item) => item.benchmark_eligible).length;
  }, [mode, suite]);

  const gradedEndpointCount = selectedEndpointIds.length;

  const judgeSubjectOverlap =
    judgeEndpointId.length > 0 && selectedEndpointIds.includes(judgeEndpointId);

  const canRunBenchmark =
    Boolean(suite) &&
    gradedEndpointCount >= 2 &&
    judgeEndpointId.length > 0 &&
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
    if (selectedEndpointIds.length < 2) {
      setError("Select at least two endpoints for compare-capable benchmark runs.");
      return;
    }
    if (!judgeEndpointId) {
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
        endpointIds: selectedEndpointIds,
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
  }, [judgeEndpointId, mode, selectedEndpointIds]);

  const clearBenchmarkData = useCallback(
    async (endpointId: string) => {
      setClearingEndpointId(endpointId);
      setError(null);
      try {
        await clearBenchmarkEndpointData(endpointId);
        const [candidateValue, summaryValue] = await Promise.all([
          fetchRouterCandidates(),
          fetchBenchmarkSummary(),
        ]);
        setCandidates(candidateValue);
        setLastSummary(summaryValue);
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
          value instanceof Error ? value.message : "Could not clear benchmark data for this model.",
        );
      } finally {
        setClearingEndpointId(null);
      }
    },
    [result],
  );

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
          void refreshSummary();
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
  }, [activeRunId, refreshSummary]);

  const progressPercent = progress
    ? progress.totalSteps > 0
      ? Math.min(100, Math.round((progress.completedSteps / progress.totalSteps) * 100))
      : 0
    : 0;
  const progressStalled = Boolean(
    progress &&
      progress.status === "running" &&
      nowMs - progress.updatedAtMs >= BENCHMARK_STALL_MS,
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
  const judgeLabel =
    lastSummary?.judgeModelId ??
    candidates.find((candidate) => candidate.endpointId === lastSummary?.judgeEndpointId)
      ?.modelId ??
    lastSummary?.judgeEndpointId ??
    null;

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
                    <p className="font-medium text-[var(--rm-fg)]">{row.modelId}</p>
                    <p className="text-sm text-[var(--rm-secondary)]">{row.endpointId}</p>
                  </div>

                  <div className="grid gap-2 text-sm text-[var(--rm-secondary)] md:grid-cols-2">
                    <p>
                      <span className="font-medium text-[var(--rm-fg)]">Benchmark overall:</span>{" "}
                      {row.caseResults?.length
                        ? formatScoreFraction(row.overallScore, row.caseResults.length)
                        : formatScore(row.overallScore)}
                    </p>
                    <p>
                      <span className="font-medium text-[var(--rm-fg)]">Profile quality score:</span>{" "}
                      {formatScore(row.profileQualityScore)}
                      {row.benchmarkSamples > 0
                        ? ` (${row.benchmarkSamples} benchmark sample${row.benchmarkSamples === 1 ? "" : "s"})`
                        : ""}
                    </p>
                  </div>

                  {row.scoresByBucket ? (
                    <p className="text-sm text-[var(--rm-secondary)]">
                      <span className="font-medium text-[var(--rm-fg)]">By difficulty:</span> easy{" "}
                      {formatScore(row.scoresByBucket.easy.score)} • medium{" "}
                      {formatScore(row.scoresByBucket.medium.score)} • hard{" "}
                      {formatScore(row.scoresByBucket.hard.score)}
                    </p>
                  ) : null}

                  <p className="text-sm leading-6 text-[var(--rm-secondary)]">
                    <span className="font-medium text-[var(--rm-fg)]">Routing impact:</span>{" "}
                    {describeRoutingImpact(row.candidate)}
                  </p>

                  {row.caseResults && row.caseResults.length > 0 ? (
                    <details className="text-sm text-[var(--rm-secondary)]">
                      <summary className="cursor-pointer font-medium text-[var(--rm-fg)]">
                        Per-case benchmark results
                      </summary>
                      <div className="mt-3 space-y-2">
                        {row.caseResults.map((caseResult) => (
                          <div
                            key={caseResult.caseId}
                            className="rounded-none border border-[var(--rm-border)] p-3"
                          >
                            <p className="font-medium text-[var(--rm-fg)]">
                              {caseResult.caseId} • {formatScore(caseResult.score)} •{" "}
                              {caseResult.difficultyBucket}
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
                            {compareByCaseId.get(caseResult.caseId) ? (
                              <p className="mt-2 text-xs text-[var(--rm-secondary)]">
                                <span className="font-medium text-[var(--rm-fg)]">
                                  Head-to-head ranking:
                                </span>{" "}
                                {compareByCaseId
                                  .get(caseResult.caseId)!
                                  .relativeRanking.join(" › ")}
                                {" — "}
                                {compareByCaseId.get(caseResult.caseId)!.rationale}
                              </p>
                            ) : null}
                          </div>
                        ))}
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
                    onClick={() => void clearBenchmarkData(row.endpointId)}
                  >
                    {clearingEndpointId === row.endpointId
                      ? "Clearing benchmark data…"
                      : "Clear benchmark data"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Run capability benchmark"
        description="Grade configured endpoints against the routing capability suite. Scores above are written into each endpoint's observed profile for future routing."
      >
        {runtimeSummary ? (
          <p className="mb-4 text-sm text-[var(--rm-secondary)]">
            Runtime scope: {runtimeSummary.scopeId ?? "unknown"} • endpoints:{" "}
            {runtimeSummary.endpointCount}
            {runtimeSummary.runtimeStateRoot
              ? ` • state: ${runtimeSummary.runtimeStateRoot}`
              : ""}
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
          <label className="space-y-2 text-sm text-[var(--rm-secondary)]">
            <span>Benchmark mode</span>
            <select
              className={fieldClassName}
              value={mode}
              onChange={(event) => setMode(event.target.value === "full" ? "full" : "quick")}
            >
              <option value="quick">Quick (12 hard cases)</option>
              <option value="full">Full (all eligible cases)</option>
            </select>
          </label>
          <label className="space-y-2 text-sm text-[var(--rm-secondary)]">
            <span>Judge endpoint (grading only)</span>
            <select
              className={fieldClassName}
              value={judgeEndpointId}
              onChange={(event) => {
                const nextJudgeEndpointId = event.target.value;
                setJudgeEndpointId(nextJudgeEndpointId);
                void updateBenchmarkPreferences({ judgeEndpointId: nextJudgeEndpointId }).catch(
                  () => undefined,
                );
              }}
            >
              {candidates.map((candidate) => (
                <option key={candidate.endpointId} value={candidate.endpointId}>
                  {candidate.modelId} ({candidate.sourceType})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-[var(--rm-fg)]">Endpoints to grade</p>
          <div className="space-y-2">
            {candidates.map((candidate) => (
              <label
                key={candidate.endpointId}
                className={`${mutedPanelClassName} flex cursor-pointer items-start gap-3 p-3`}
              >
                <input
                  type="checkbox"
                  checked={selectedEndpointIds.includes(candidate.endpointId)}
                  onChange={() => toggleEndpoint(candidate.endpointId)}
                />
                <span className="space-y-1">
                  <span className="block font-medium text-[var(--rm-fg)]">{candidate.modelId}</span>
                  <span className="block text-sm text-[var(--rm-secondary)]">
                    {candidate.endpointId}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 border-t border-[var(--rm-border)] pt-4">
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
              <p className="font-medium text-[var(--rm-fg)]">
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
              <p className="text-sm text-amber-700">
                No progress update in the last 90 seconds. The run may still be waiting on a slow
                model response.
              </p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </SectionCard>
    </div>
  );
}
