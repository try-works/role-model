export const BENCHMARK_ACCURACY_GATES = {
  judgeParseGte75Pct: 0.75,
  emptyRawLt20Pct: 0.2,
  heuristicFallbackLte25Pct: 0.25,
  gradingBrief100Pct: 1,
  nonTrivialRationaleGte80Pct: 0.8,
  compare12Of12Quick: 12,
  progress60Of60Quick: 60,
} as const;

export interface BenchmarkCaseGradeRow {
  readonly parseSuccess?: boolean;
  readonly judgeUnavailable?: boolean;
  readonly gradingMethod?: string;
  readonly rationale?: string;
}

export interface BenchmarkArtifactAttemptStats {
  readonly attempts: number;
  readonly emptyRaw: number;
  readonly gradingBrief: number;
  readonly compare: number;
}

export interface BenchmarkValidationMetrics {
  readonly caseGrades: number;
  readonly judgeParseRate: number;
  readonly heuristicFallbackRate: number;
  readonly nonTrivialRationaleRate: number;
  readonly artifactStats: BenchmarkArtifactAttemptStats | null;
}

export function computeBenchmarkValidationMetrics(input: {
  readonly caseGrades: readonly BenchmarkCaseGradeRow[];
  readonly artifactStats?: BenchmarkArtifactAttemptStats | null;
}): BenchmarkValidationMetrics {
  const total = input.caseGrades.length;
  const parseOk = input.caseGrades.filter((row) => row.parseSuccess).length;
  const heuristic = input.caseGrades.filter((row) => row.judgeUnavailable).length;
  const judgeGraded = input.caseGrades.filter(
    (row) => row.gradingMethod === "judge" && row.parseSuccess,
  );
  const nonTrivial = judgeGraded.filter(
    (row) =>
      row.rationale &&
      row.rationale !== "..." &&
      row.rationale !== "Judge provided score." &&
      row.rationale.length > 20,
  ).length;

  return {
    caseGrades: total,
    judgeParseRate: total > 0 ? parseOk / total : 0,
    heuristicFallbackRate: total > 0 ? heuristic / total : 0,
    nonTrivialRationaleRate: judgeGraded.length > 0 ? nonTrivial / judgeGraded.length : 0,
    artifactStats: input.artifactStats ?? null,
  };
}

export function evaluateBenchmarkAccuracyGates(
  metrics: BenchmarkValidationMetrics,
  mode: "quick" | "full" = "quick",
): Record<string, "PASS" | "FAIL" | "SKIP"> {
  const gates: Record<string, "PASS" | "FAIL" | "SKIP"> = {};

  gates.judge_parse_gte75_pct =
    metrics.judgeParseRate >= BENCHMARK_ACCURACY_GATES.judgeParseGte75Pct ? "PASS" : "FAIL";

  const stats = metrics.artifactStats;
  if (stats && stats.attempts > 0) {
    const emptyRate = stats.emptyRaw / stats.attempts;
    gates.empty_raw_lt20_pct =
      emptyRate < BENCHMARK_ACCURACY_GATES.emptyRawLt20Pct ? "PASS" : "FAIL";
    gates.grading_brief_100_pct =
      stats.gradingBrief / stats.attempts >= BENCHMARK_ACCURACY_GATES.gradingBrief100Pct
        ? "PASS"
        : "FAIL";
  } else {
    gates.empty_raw_lt20_pct = "SKIP";
    gates.grading_brief_100_pct = "SKIP";
  }

  gates.heuristic_fallback_lte25_pct =
    metrics.heuristicFallbackRate <= BENCHMARK_ACCURACY_GATES.heuristicFallbackLte25Pct
      ? "PASS"
      : "FAIL";

  gates.non_trivial_rationale_gte80_pct =
    metrics.judgeParseRate > 0
      ? metrics.nonTrivialRationaleRate >= BENCHMARK_ACCURACY_GATES.nonTrivialRationaleGte80Pct
        ? "PASS"
        : "FAIL"
      : "SKIP";

  if (mode === "quick") {
    gates.compare_12_of_12 =
      stats && stats.compare >= BENCHMARK_ACCURACY_GATES.compare12Of12Quick ? "PASS" : "SKIP";
  }

  return gates;
}

export function deriveWorkflowVerdict(
  gates: Record<string, "PASS" | "FAIL" | "SKIP">,
): "VALID" | "INVALID" {
  const failed = Object.values(gates).some((status) => status === "FAIL");
  return failed ? "INVALID" : "VALID";
}
