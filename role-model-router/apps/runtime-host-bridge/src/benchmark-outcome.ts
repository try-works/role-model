/**
 * Run 125: a benchmark run record must expose how many of its executed cases passed so a run with
 * failures is never presented as plain success. `status` remains the lifecycle field; `outcome` is
 * derived only from executed case scores (> 0 counts as passed, matching the summary's
 * passingCaseIds semantics) and never changes caseResults.
 */
export interface BenchmarkSkippedEndpoint {
  readonly endpointId: string;
  readonly reason: "unhealthy" | "not_configured";
}

export interface BenchmarkCaseCounts {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
}

export type BenchmarkRunOutcome = "passed" | "partial" | "failed";

/** No case has been executed yet: the run has no outcome, not a passing one. */
export type BenchmarkRunOutcomeOrPending = BenchmarkRunOutcome | null;

export interface BenchmarkCaseResultLike {
  readonly score: number;
}

export interface BenchmarkGradeLike {
  readonly caseResults: readonly BenchmarkCaseResultLike[];
}

export const benchmarkCaseCounts = (grades: readonly BenchmarkGradeLike[]): BenchmarkCaseCounts => {
  let total = 0;
  let passed = 0;
  for (const grade of grades) {
    for (const caseResult of grade.caseResults) {
      total += 1;
      if (caseResult.score > 0) passed += 1;
    }
  }
  return { total, passed, failed: total - passed };
};

export const benchmarkRunOutcome = (counts: BenchmarkCaseCounts): BenchmarkRunOutcomeOrPending =>
  counts.total === 0
    ? null
    : counts.failed === 0
      ? "passed"
      : counts.passed === 0
        ? "failed"
        : "partial";

export const benchmarkOutcomeFields = (
  grades: readonly BenchmarkGradeLike[],
): { readonly caseCounts: BenchmarkCaseCounts; readonly outcome: BenchmarkRunOutcomeOrPending } => {
  const caseCounts = benchmarkCaseCounts(grades);
  return { caseCounts, outcome: benchmarkRunOutcome(caseCounts) };
};
