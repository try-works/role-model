import { useCallback, useEffect, useMemo, useState } from "react";

import { CheckboxControl } from "../components/checkbox-control";
import {
  Badge,
  DisclosureSection,
  EmptyState,
  ErrorState,
  LoadingState,
  SectionCard,
  SelectField,
} from "../components/page-primitives";
import { computeLatencyPercentiles } from "../lib/benchmark-latency";
import {
  filterBenchmarkRunnableCandidates,
  isBenchmarkRunnableCandidate,
} from "../lib/benchmark-model-cards";
import {
  bodyStrongTextClassName,
  bodyTextClassName,
  compactTitleClassName,
  listRowClassName,
  monoEyebrowClassName,
  mutedPanelClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  supportingTextClassName,
} from "../lib/design-system";
import { formatEndpointDisplayPath, formatModelIdentity } from "../lib/effort-identity";
import { formatScore, formatScoreWithCoverage } from "../lib/format-score";
import {
  type BenchmarkCaseAuditEntry,
  type BenchmarkEndpointGrade,
  type BenchmarkRunListEntry,
  type BenchmarkRunProgress,
  type BenchmarkRunResult,
  type BenchmarkSuite,
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
  fetchBenchmarkSummary,
  fetchRouterCandidates,
  fetchRuntimeSummary,
  startCapabilityBenchmark,
  updateBenchmarkPreferences,
} from "../lib/runtime-api";

const BENCHMARK_POLL_MS = 1500;
const BENCHMARK_STALL_MS = 90_000;
const ACTIVE_BENCHMARK_RUN_KEY = "role-model.benchmark.activeRunId";
const benchmarkDenseHeaderCellClassName =
  "font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-[var(--rm-muted)]";
const benchmarkDenseCellClassName =
  "font-mono text-[13px] font-semibold tabular-nums leading-[18px] text-[var(--rm-fg)]";
const benchmarkDenseActionClassName =
  "inline-flex h-[34px] min-h-[34px] items-center rounded-[var(--rm-radius-field)] border border-[var(--rm-border-strong)] bg-[var(--rm-panel)] px-3 text-[13px] font-semibold leading-[18px] text-[var(--rm-fg)] transition hover:border-[var(--rm-accent)] disabled:opacity-60";

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
    (() => {
      const candidate = candidates.find((entry) => entry.endpointId === summary.judgeEndpointId);
      return candidate ? formatModelIdentity(candidate) : null;
    })() ??
    summary.judgeModelId ??
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

interface ModelScoreRow {
  readonly endpointId: string;
  readonly modelId: string;
  readonly displayName: string;
  readonly sourceType: string;
  readonly overallScore: number | null;
  readonly scoresByBucket: Partial<
    Record<"easy" | "medium" | "hard", { readonly score: number | null; readonly cases: number | null }>
  > | null;
  readonly profileQualityScore: number | null;
  readonly benchmarkSamples: number | null;
  readonly latencyP50: number | null;
  readonly latencyP95: number | null;
  readonly lastRunId: string | null;
  readonly lastRunMode: "quick" | "full" | null;
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
      runId: string | null;
      mode: "quick" | "full" | null;
    }
  >();

  for (const subject of summary?.subjects ?? []) {
    gradeByEndpoint.set(subject.endpointId, {
      overallScore: subject.overallScore,
      scoresByBucket: subject.scoresByBucket,
      caseResults: null,
      runId: summary?.runId ?? null,
      mode: summary?.mode ?? null,
    });
  }
  for (const grade of result?.endpointGrades ?? []) {
    gradeByEndpoint.set(grade.endpointId, {
      overallScore: grade.overallScore,
      scoresByBucket: grade.byDifficulty,
      caseResults: grade.caseResults,
      runId: result?.runId ?? null,
      mode: result?.mode ?? null,
    });
  }

  const rows: ModelScoreRow[] = [];
  for (const candidate of candidates) {
    const grade = gradeByEndpoint.get(candidate.endpointId);
    const profile = asRecord(candidate.latestProfile);
    const sources = asRecord(profile?.sources);
    const profileQualityScore = pickNumber(profile, "judge_score", "quality_score");
    const benchmarkSamples = pickNumber(sources, "benchmark_samples");
    const capability = candidate.benchmarkCapability;
    const caseResults = grade?.caseResults ?? null;
    const { p50: latencyP50, p95: latencyP95 } = computeLatencyPercentiles(
      collectEndpointLatencies({
        endpointId: candidate.endpointId,
        caseResults,
        caseAudits: summary?.caseAudits,
      }),
    );

    if (
      !grade &&
      !capability &&
      (benchmarkSamples === null || benchmarkSamples === 0) &&
      profileQualityScore === null
    ) {
      continue;
    }

    rows.push({
      endpointId: candidate.endpointId,
      modelId: candidate.modelId,
      displayName: formatModelIdentity(candidate),
      sourceType: candidate.sourceType,
      overallScore: grade?.overallScore ?? capability?.overallScore ?? profileQualityScore,
      scoresByBucket:
        grade?.scoresByBucket ??
        (capability?.scoresByBucket
          ? {
              easy: {
                score: capability.scoresByBucket.easy?.score ?? null,
                cases: capability.scoresByBucket.easy?.cases ?? null,
              },
              medium: {
                score: capability.scoresByBucket.medium?.score ?? null,
                cases: capability.scoresByBucket.medium?.cases ?? null,
              },
              hard: {
                score: capability.scoresByBucket.hard?.score ?? null,
                cases: capability.scoresByBucket.hard?.cases ?? null,
              },
            }
          : null),
      profileQualityScore,
      benchmarkSamples,
      latencyP50,
      latencyP95,
      lastRunId: grade?.runId ?? capability?.lastRunId ?? null,
      lastRunMode: grade?.mode ?? capability?.lastRunMode ?? null,
    });
  }

  return rows.sort((left, right) => right.modelId.localeCompare(left.modelId, "en"));
}

export function startProgressiveBenchmarkBootstrap<TSuite, TCandidates, TPreferences>(input: {
  readonly loadSuite: () => Promise<TSuite>;
  readonly loadCandidates: () => Promise<TCandidates>;
  readonly loadPreferences: () => Promise<TPreferences>;
  readonly onEssential: (value: {
    readonly suite: TSuite;
    readonly candidates: TCandidates;
    readonly preferences: TPreferences;
  }) => void;
  readonly advisoryLoads: readonly {
    readonly load: () => Promise<unknown>;
    readonly onData: (value: unknown) => void;
  }[];
  readonly onError: (message: string) => void;
}): () => void {
  let disposed = false;
  const reportError = (value: unknown) => {
    if (!disposed) {
      input.onError(value instanceof Error ? value.message : "Could not load benchmark data.");
    }
  };

  void Promise.all([input.loadSuite(), input.loadCandidates(), input.loadPreferences()]).then(
    ([suite, candidates, preferences]) => {
      if (!disposed) {
        input.onEssential({ suite, candidates, preferences });
      }
    },
    reportError,
  );
  for (const advisoryLoad of input.advisoryLoads) {
    void advisoryLoad.load().then((value) => {
      if (!disposed) {
        advisoryLoad.onData(value);
      }
    }, reportError);
  }

  return () => {
    disposed = true;
  };
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
      const runnable = filterBenchmarkRunnableCandidates(candidateValue);
      if (
        savedJudgeEndpointId &&
        runnable.some((candidate) => candidate.endpointId === savedJudgeEndpointId)
      ) {
        return savedJudgeEndpointId;
      }
      return (
        runnable.find((candidate) => candidate.sourceType === "remote")?.endpointId ??
        runnable[0]?.endpointId ??
        ""
      );
    },
    [],
  );

  const refreshBenchmarkState = useCallback(async () => {
    const [summary, runs, candidateValue] = await Promise.all([
      fetchBenchmarkSummary(),
      fetchBenchmarkRuns(),
      fetchRouterCandidates(),
    ]);
    setLastSummary(summary);
    setRunHistory(runs);
    setCandidates(candidateValue);
    return { summary, runs, candidateValue };
  }, []);

  useEffect(() => {
    return startProgressiveBenchmarkBootstrap({
      loadSuite: fetchBenchmarkSuite,
      loadCandidates: fetchRouterCandidates,
      loadPreferences: fetchBenchmarkPreferences,
      onEssential: ({ suite: suiteValue, candidates: candidateValue, preferences }) => {
        setSuite(suiteValue);
        setCandidates(candidateValue);
        const runnable = candidateValue.filter((candidate) =>
          isBenchmarkRunnableCandidate(candidate),
        );
        setSelectedEndpointIds(runnable.map((candidate) => candidate.endpointId));
        setJudgeEndpointId(resolveJudgeEndpointId(candidateValue, preferences.judgeEndpointId));
        setError(null);
      },
      advisoryLoads: [
        {
          load: fetchBenchmarkSummary,
          onData: (value) => setLastSummary(value as BenchmarkSummary),
        },
        {
          load: fetchBenchmarkRuns,
          onData: (value) => setRunHistory(value as readonly BenchmarkRunListEntry[]),
        },
        {
          load: fetchRuntimeSummary,
          onData: (value) => setRuntimeSummary(value as RuntimeSummary),
        },
      ],
      onError: setError,
    });
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
  const excludedCandidates = useMemo(
    () =>
      candidates ? candidates.filter((candidate) => !isBenchmarkRunnableCandidate(candidate)) : [],
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

  const taxonomyDimensionInventory = useMemo(() => {
    const roleIds = new Set<string>();
    const taskIds = new Set<string>();
    const capabilityIds = new Set<string>();

    for (const row of modelScoreRows) {
      const candidate = candidates?.find((entry) => entry.endpointId === row.endpointId);
      const subject = lastSummary?.subjects.find((entry) => entry.endpointId === row.endpointId);
      const taxonomyScores =
        candidate?.benchmarkCapability?.taxonomyScores ?? subject?.taxonomyScores;
      if (!taxonomyScores) {
        continue;
      }
      for (const roleId of Object.keys(taxonomyScores.byRole ?? {})) {
        roleIds.add(roleId);
      }
      for (const taskId of Object.keys(taxonomyScores.byTask ?? {})) {
        taskIds.add(taskId);
      }
      for (const capabilityId of Object.keys(taxonomyScores.byCapability ?? {})) {
        capabilityIds.add(capabilityId);
      }
    }

    return {
      roleIds: [...roleIds].sort((left, right) => left.localeCompare(right)),
      taskIds: [...taskIds].sort((left, right) => left.localeCompare(right)),
      capabilityIds: [...capabilityIds].sort((left, right) => left.localeCompare(right)),
    };
  }, [candidates, lastSummary, modelScoreRows]);

  const taxonomyHasData =
    taxonomyDimensionInventory.roleIds.length > 0 ||
    taxonomyDimensionInventory.taskIds.length > 0 ||
    taxonomyDimensionInventory.capabilityIds.length > 0;

  const getFilteredTaxonomyScores = useCallback(
    (dimension: "byRole" | "byTask" | "byCapability", filterValue: string) => {
      if (!filterValue) {
        return [] as Array<{
          modelId: string;
          endpointId: string;
          score: number;
        }>;
      }

      return modelScoreRows
        .map((row) => {
          const candidate = candidates?.find((entry) => entry.endpointId === row.endpointId);
          const subject = lastSummary?.subjects.find(
            (entry) => entry.endpointId === row.endpointId,
          );
          const taxonomyScores =
            candidate?.benchmarkCapability?.taxonomyScores ?? subject?.taxonomyScores;
          const score = taxonomyScores?.[dimension]?.[filterValue];
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
        .sort((left, right) => right.score - left.score);
    },
    [candidates, lastSummary, modelScoreRows],
  );

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

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <SectionCard
          title="Run capability benchmark"
          description="Select mode and judge, then grade runnable endpoints."
        >
          {judgeSubjectOverlap ? (
            <p className={`mb-4 ${supportingTextClassName}`}>
              Judge endpoint is also a benchmark subject. Expect slower grading and higher judge
              failure risk — prefer a dedicated judge when available.
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Benchmark mode"
              value={mode}
              onChange={(value) => setMode(value === "full" ? "full" : "quick")}
            >
              <option value="quick">Quick (12 hard cases)</option>
              <option value="full">Full (all eligible cases)</option>
            </SelectField>
            <div className="space-y-1.5">
              <SelectField
                label="Judge endpoint"
                value={judgeEndpointId}
                onChange={(value) => {
                  setJudgeEndpointId(value);
                  void updateBenchmarkPreferences({ judgeEndpointId: value }).catch(
                    () => undefined,
                  );
                }}
              >
                {runnableCandidates.map((candidate) => (
                  <option key={candidate.endpointId} value={candidate.endpointId}>
                    {formatModelIdentity(candidate)} ({candidate.sourceType})
                  </option>
                ))}
              </SelectField>
              <p className={supportingTextClassName}>
                Used for grading only — not a benchmark subject.
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="overflow-x-auto rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)]">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--rm-border)]">
                    <th className="w-4 px-3.5 py-2.5" aria-label="Selected" />
                    <th
                      className={`${benchmarkDenseHeaderCellClassName} w-40 px-1 py-2.5 normal-case tracking-normal`}
                    >
                      Model
                    </th>
                    <th
                      className={`${benchmarkDenseHeaderCellClassName} px-1 py-2.5 normal-case tracking-normal`}
                    >
                      Path
                    </th>
                    <th
                      className={`${benchmarkDenseHeaderCellClassName} w-[72px] px-1 py-2.5 normal-case tracking-normal`}
                    >
                      Scope
                    </th>
                    <th
                      className={`${benchmarkDenseHeaderCellClassName} w-[72px] px-3.5 py-2.5 normal-case tracking-normal`}
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {runnableCandidates.map((candidate) => {
                    const selected = selectedEndpointIds.includes(candidate.endpointId);
                    return (
                      <tr
                        key={candidate.endpointId}
                        className="border-b border-[var(--rm-border)] last:border-b-0"
                      >
                        <td className="px-3.5 py-3">
                          <CheckboxControl
                            checked={selected}
                            aria-label={`${selected ? "Deselect" : "Select"} ${formatModelIdentity(candidate)}`}
                            onChange={() => toggleEndpoint(candidate.endpointId)}
                          />
                        </td>
                        <td className="w-40 shrink-0 px-1 py-3 text-[14px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                          {formatModelIdentity(candidate)}
                        </td>
                        <td className="min-w-0 truncate px-1 py-3 font-mono text-[12px] leading-4 text-[var(--rm-muted)]">
                          {formatEndpointDisplayPath(candidate)}
                        </td>
                        <td className="w-[72px] px-1 py-3 text-[13px] leading-[18px] text-[var(--rm-fg)]">
                          {candidate.sourceType}
                        </td>
                        <td className="w-[72px] px-3.5 py-3 text-[13px] leading-[18px] text-[var(--rm-fg)]">
                          {candidate.healthStatus ?? "unknown"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={supportingTextClassName}>
                {gradedEndpointCount} of {runnableCandidates.length} selected
              </p>
              {gradedEndpointCount < 2 ? (
                <p className={supportingTextClassName}>
                  Select at least two runnable endpoints to compare head to head.
                </p>
              ) : null}
            </div>
            {excludedCandidates.length > 0 ? (
              <DisclosureSection summary="Excluded by current execution mode">
                <div className="space-y-3">
                  <p className={supportingTextClassName}>
                    Excluded endpoints stay visible for audit context, but they are removed from the
                    primary selection flow because the current execution mode cannot benchmark them.
                  </p>
                  <div className="space-y-2">
                    {excludedCandidates.map((candidate) => (
                      <div
                        key={candidate.endpointId}
                        className={`${mutedPanelClassName} flex items-start justify-between gap-3 p-3`}
                      >
                        <div className="space-y-1">
                          <p className={bodyStrongTextClassName}>
                            {formatModelIdentity(candidate)}
                          </p>
                          <p className={supportingTextClassName}>
                            {formatEndpointDisplayPath(candidate)}
                          </p>
                        </div>
                        <Badge tone="neutral">excluded</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </DisclosureSection>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
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
            <p className={supportingTextClassName}>
              {gradedEndpointCount} of {runnableCandidates.length} selected
            </p>
          </div>

          {running ? (
            <div className="mt-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={bodyStrongTextClassName}>
                  {progressDescription?.phaseLabel ?? "Benchmark in progress"}
                </p>
                <p className="font-mono text-[12px] tabular-nums text-[var(--rm-fg)]">
                  {progressPercent}%
                </p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-sm bg-[var(--rm-border)]">
                <div
                  className="h-full bg-[var(--rm-accent)] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <p className={supportingTextClassName}>
                  {progress
                    ? `${progress.completedSteps} / ${progress.totalSteps} steps`
                    : "Starting…"}
                </p>
                {progressDescription ? (
                  <p className={supportingTextClassName}>{progressDescription.detail}</p>
                ) : null}
                {progressStalled ? (
                  <p className={`${supportingTextClassName} text-[var(--rm-warning)]`}>
                    No progress update in the last 90 seconds.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {error ? (
            <p className={`mt-4 ${bodyTextClassName} text-[var(--rm-error)]`}>{error}</p>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Benchmark scores"
          description="Scores are stored as normalized 0–1 fractions and shown as percentages. Overall is the unweighted mean of executed case scores. A completed run replaces current evidence only for endpoints it contains; older runs remain in history."
        >
          {modelScoreRows.length === 0 ? (
            <EmptyState label="No benchmark scores are in routing profiles yet. Run the benchmark to grade each configured model and update observed routing profiles." />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <div className="space-y-0.5">
                  <p className={benchmarkDenseHeaderCellClassName}>Last run</p>
                  <p className="font-mono text-[12px] leading-4 text-[var(--rm-fg)]">
                    {lastRunLabel ?? "—"}
                  </p>
                </div>
                <div className="hidden h-7 w-px shrink-0 bg-[var(--rm-border)] sm:block" />
                <div className="space-y-0.5">
                  <p className={benchmarkDenseHeaderCellClassName}>Suite</p>
                  <p className="text-[12px] font-semibold leading-4 text-[var(--rm-fg)]">
                    {lastSummary?.mode
                      ? `${lastSummary.mode.charAt(0).toUpperCase()}${lastSummary.mode.slice(1)}`
                      : "—"}
                  </p>
                </div>
                <div className="hidden h-7 w-px shrink-0 bg-[var(--rm-border)] sm:block" />
                <div className="space-y-0.5">
                  <p className={benchmarkDenseHeaderCellClassName}>Judge</p>
                  <p className="font-mono text-[12px] leading-4 text-[var(--rm-fg)]">
                    {judgeLabel ?? "—"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)]">
                <table className="min-w-full text-left">
                  <thead className="bg-[var(--rm-surface-strong)]">
                    <tr className="border-b border-[var(--rm-border)]">
                      <th
                        className={`${benchmarkDenseHeaderCellClassName} w-[132px] px-3.5 py-2.5`}
                      >
                        Model
                      </th>
                      <th className={`${benchmarkDenseHeaderCellClassName} w-14 px-1 py-2.5`}>
                        Overall
                      </th>
                      <th className={`${benchmarkDenseHeaderCellClassName} w-14 px-1 py-2.5`}>
                        Profile
                      </th>
                      <th className={`${benchmarkDenseHeaderCellClassName} w-12 px-1 py-2.5`}>
                        Easy
                      </th>
                      <th className={`${benchmarkDenseHeaderCellClassName} w-14 px-1 py-2.5`}>
                        Medium
                      </th>
                      <th className={`${benchmarkDenseHeaderCellClassName} w-12 px-1 py-2.5`}>
                        Hard
                      </th>
                      <th className={`${benchmarkDenseHeaderCellClassName} w-16 px-1 py-2.5`}>
                        p50
                      </th>
                      <th className={`${benchmarkDenseHeaderCellClassName} w-16 px-1 py-2.5`}>
                        p95
                      </th>
                      <th className={`${benchmarkDenseHeaderCellClassName} w-14 px-1 py-2.5`}>
                        Scope
                      </th>
                      <th
                        className={`${benchmarkDenseHeaderCellClassName} px-3.5 py-2.5 text-right`}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelScoreRows.map((row) => (
                      <tr
                        key={row.endpointId}
                        className="border-b border-[var(--rm-border)] last:border-b-0"
                      >
                        <td className="px-3.5 py-3 text-[14px] font-semibold leading-[18px] text-[var(--rm-fg)]">
                          <p>{row.displayName}</p>
                          <p className="mt-1 font-mono text-[11px] font-normal text-[var(--rm-muted)]">
                            {row.lastRunId
                              ? `${row.lastRunId}${row.lastRunMode ? ` · ${row.lastRunMode}` : ""}`
                              : "profile-derived"}
                          </p>
                        </td>
                        <td className={`${benchmarkDenseCellClassName} px-1 py-3`}>
                          {formatScore(row.overallScore)}
                        </td>
                        <td className={`${benchmarkDenseCellClassName} px-1 py-3`}>
                          {formatScore(row.profileQualityScore)}
                        </td>
                        <td className={`${benchmarkDenseCellClassName} px-1 py-3 font-normal`}>
                          {formatScoreWithCoverage(
                            row.scoresByBucket?.easy?.score,
                            row.scoresByBucket?.easy?.cases,
                          )}
                        </td>
                        <td className={`${benchmarkDenseCellClassName} px-1 py-3 font-normal`}>
                          {formatScoreWithCoverage(
                            row.scoresByBucket?.medium?.score,
                            row.scoresByBucket?.medium?.cases,
                          )}
                        </td>
                        <td className={`${benchmarkDenseCellClassName} px-1 py-3 font-normal`}>
                          {formatScoreWithCoverage(
                            row.scoresByBucket?.hard?.score,
                            row.scoresByBucket?.hard?.cases,
                          )}
                        </td>
                        <td className={`${benchmarkDenseCellClassName} px-1 py-3 font-normal`}>
                          {formatLatencyMs(row.latencyP50)}
                        </td>
                        <td className={`${benchmarkDenseCellClassName} px-1 py-3 font-normal`}>
                          {formatLatencyMs(row.latencyP95)}
                        </td>
                        <td className="px-1 py-3 text-[13px] leading-[18px] text-[var(--rm-muted)]">
                          {row.sourceType}
                        </td>
                        <td className="px-3.5 py-3 text-right">
                          <button
                            type="button"
                            className={benchmarkDenseActionClassName}
                            disabled={running || clearingEndpointId === row.endpointId}
                            onClick={() => void clearEndpointRoutingProfile(row.endpointId)}
                          >
                            {clearingEndpointId === row.endpointId ? "Clearing…" : "Clear"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Taxonomy dimensions"
          description="Filters switch which dimension is active."
        >
          {taxonomyHasData ? (
            <div className="space-y-4">
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
                  {taxonomyDimensionInventory.roleIds.map((role) => (
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
                  {taxonomyDimensionInventory.taskIds.map((task) => (
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
                  {taxonomyDimensionInventory.capabilityIds.map((cap) => (
                    <option key={cap} value={cap}>
                      {cap}
                    </option>
                  ))}
                </SelectField>
              </div>

              {(() => {
                const roleScores = getFilteredTaxonomyScores("byRole", taxonomyFilterRole);
                const taskScores = getFilteredTaxonomyScores("byTask", taxonomyFilterTask);
                const capScores = getFilteredTaxonomyScores(
                  "byCapability",
                  taxonomyFilterCapability,
                );
                const activeScores =
                  roleScores.length > 0
                    ? { label: `Role: ${taxonomyFilterRole}`, scores: roleScores }
                    : taskScores.length > 0
                      ? { label: `Task: ${taxonomyFilterTask}`, scores: taskScores }
                      : capScores.length > 0
                        ? { label: `Capability: ${taxonomyFilterCapability}`, scores: capScores }
                        : null;

                return activeScores ? (
                  <div className="space-y-3">
                    <p className={monoEyebrowClassName}>{activeScores.label}</p>
                    <div className="-mx-5 divide-y divide-[var(--rm-border)] border-t border-[var(--rm-border)]">
                      {activeScores.scores.map((entry) => (
                        <div
                          key={entry.endpointId}
                          className="flex items-baseline justify-between gap-3 px-5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[13px] font-semibold text-[var(--rm-fg)]">
                              {modelScoreRows.find((row) => row.endpointId === entry.endpointId)
                                ?.displayName ?? entry.modelId}
                            </p>
                            <p className="truncate font-mono text-[11px] text-[var(--rm-muted)]">
                              {formatEndpointDisplayPath({
                                endpointId: entry.endpointId,
                                reasoningEffort: candidates.find(
                                  (candidate) => candidate.endpointId === entry.endpointId,
                                )?.reasoningEffort,
                              })}
                            </p>
                          </div>
                          <p className={benchmarkDenseCellClassName}>{formatScore(entry.score)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : taxonomyFilterRole || taxonomyFilterTask || taxonomyFilterCapability ? (
                  <EmptyState label="No benchmark data for the selected taxonomy dimension." />
                ) : (
                  <EmptyState label="Select a taxonomy dimension above to see per-model benchmark scores." />
                );
              })()}
            </div>
          ) : (
            <EmptyState label="No taxonomy dimension data is available yet. Benchmark results with taxonomy-tagged cases will appear here." />
          )}
        </SectionCard>

        <SectionCard
          title="Run history"
          description="Completed benchmark runs stored on this runtime."
        >
          {runHistory.length === 0 ? (
            <EmptyState label="No completed benchmark runs yet." />
          ) : (
            <div className="space-y-3">
              {runHistory.map((run) => (
                <div key={run.runId} className={listRowClassName}>
                  <div>
                    <p className={compactTitleClassName}>{run.runId}</p>
                    <p className={supportingTextClassName}>
                      {run.mode} • {run.caseCount} cases • {run.endpointIds.length} model
                      {run.endpointIds.length === 1 ? "" : "s"}
                    </p>
                    <p className={supportingTextClassName}>
                      {new Date(run.completedAtMs).toLocaleString()} • {run.suiteId}
                    </p>
                  </div>
                  <Badge tone={run.mode === "quick" ? "accent" : "neutral"}>{run.mode}</Badge>
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
    </div>
  );
}
