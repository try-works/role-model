import type { BenchmarkRunResult } from "./benchmark-runner.js";

export type BenchmarkRunStatus = "running" | "completed" | "failed";

export interface BenchmarkRunProgressSnapshot {
  readonly runId: string;
  readonly status: BenchmarkRunStatus;
  readonly mode: "quick" | "full";
  readonly startedAtMs: number;
  readonly updatedAtMs: number;
  readonly totalSteps: number;
  readonly completedSteps: number;
  readonly endpointIndex: number;
  readonly endpointCount: number;
  readonly currentEndpointId: string | null;
  readonly currentEndpointModelId: string | null;
  readonly caseIndex: number;
  readonly caseCount: number;
  readonly currentCaseId: string | null;
  readonly currentPhase: "execute" | "judge" | "compare" | null;
  readonly runPhase: "execution" | "grading" | "compare" | "complete";
  readonly judgeEndpointId: string | null;
  readonly activeJudgeEndpointId: string | null;
  readonly artifactRoot: string | null;
  readonly errorMessage?: string;
  readonly result?: BenchmarkRunResult;
}

const activeRuns = new Map<string, BenchmarkRunProgressSnapshot>();

const MAX_RETAINED_RUNS = 8;

function pruneRuns(): void {
  if (activeRuns.size <= MAX_RETAINED_RUNS) {
    return;
  }
  const sorted = [...activeRuns.entries()].sort(
    (left, right) => left[1].startedAtMs - right[1].startedAtMs,
  );
  while (sorted.length > MAX_RETAINED_RUNS) {
    const oldest = sorted.shift();
    if (oldest) {
      activeRuns.delete(oldest[0]);
    }
  }
}

export function createBenchmarkRunProgress(input: {
  readonly runId: string;
  readonly mode: "quick" | "full";
  readonly endpointCount: number;
  readonly caseCount: number;
  readonly judgeEndpointId: string | null;
  readonly useJudge: boolean;
  readonly compareCaseCount?: number;
  readonly artifactRoot?: string | null;
}): BenchmarkRunProgressSnapshot {
  const executionSteps = input.endpointCount * input.caseCount;
  const gradingSteps = input.useJudge ? input.endpointCount * input.caseCount : 0;
  const compareSteps = input.compareCaseCount ?? 0;
  const totalSteps = executionSteps + gradingSteps + compareSteps;
  const snapshot: BenchmarkRunProgressSnapshot = {
    runId: input.runId,
    status: "running",
    mode: input.mode,
    startedAtMs: Date.now(),
    updatedAtMs: Date.now(),
    totalSteps,
    completedSteps: 0,
    endpointIndex: 0,
    endpointCount: input.endpointCount,
    currentEndpointId: null,
    currentEndpointModelId: null,
    caseIndex: 0,
    caseCount: input.caseCount,
    currentCaseId: null,
    currentPhase: null,
    runPhase: "execution",
    judgeEndpointId: input.judgeEndpointId,
    activeJudgeEndpointId: input.judgeEndpointId,
    artifactRoot: input.artifactRoot ?? null,
  };
  activeRuns.set(input.runId, snapshot);
  pruneRuns();
  return snapshot;
}

export function updateBenchmarkRunProgress(
  runId: string,
  patch: Partial<
    Pick<
      BenchmarkRunProgressSnapshot,
      | "completedSteps"
      | "endpointIndex"
      | "currentEndpointId"
      | "currentEndpointModelId"
      | "caseIndex"
      | "currentCaseId"
      | "currentPhase"
      | "activeJudgeEndpointId"
      | "runPhase"
    >
  >,
): BenchmarkRunProgressSnapshot | null {
  const current = activeRuns.get(runId);
  if (!current || current.status !== "running") {
    return current ?? null;
  }
  const next: BenchmarkRunProgressSnapshot = {
    ...current,
    ...patch,
    updatedAtMs: Date.now(),
  };
  activeRuns.set(runId, next);
  return next;
}

export function completeBenchmarkRunProgress(
  runId: string,
  result: BenchmarkRunResult,
): BenchmarkRunProgressSnapshot | null {
  const current = activeRuns.get(runId);
  if (!current) {
    return null;
  }
  const next: BenchmarkRunProgressSnapshot = {
    ...current,
    status: "completed",
    updatedAtMs: Date.now(),
    completedSteps: current.totalSteps,
    currentPhase: null,
    runPhase: "complete",
    result,
  };
  activeRuns.set(runId, next);
  return next;
}

export function failBenchmarkRunProgress(
  runId: string,
  errorMessage: string,
): BenchmarkRunProgressSnapshot | null {
  const current = activeRuns.get(runId);
  if (!current) {
    return null;
  }
  const next: BenchmarkRunProgressSnapshot = {
    ...current,
    status: "failed",
    updatedAtMs: Date.now(),
    currentPhase: null,
    errorMessage,
  };
  activeRuns.set(runId, next);
  return next;
}

export function readBenchmarkRunProgress(runId: string): BenchmarkRunProgressSnapshot | null {
  return activeRuns.get(runId) ?? null;
}

export function listRunningBenchmarkRuns(): readonly BenchmarkRunProgressSnapshot[] {
  return [...activeRuns.values()].filter((run) => run.status === "running");
}

export function readActiveBenchmarkRun(): BenchmarkRunProgressSnapshot | null {
  const running = [...listRunningBenchmarkRuns()].sort(
    (left, right) => right.startedAtMs - left.startedAtMs,
  );
  return running[0] ?? null;
}
