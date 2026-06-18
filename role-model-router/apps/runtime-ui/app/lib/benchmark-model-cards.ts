import type { BenchmarkSummary, BenchmarkSummarySubject, RouterCandidate } from "./runtime-api";

export const BENCHMARK_SECTION_ORDER = ["model-scores", "run-benchmark", "run-history"] as const;

/** Operator addendum F1: dual-run belongs in model cards, not a page-level section. */
export const STANDALONE_LAST_RUNS_BY_MODE_ENABLED = false;

export function resolveSubjectFromSummary(
  summary: BenchmarkSummary | null | undefined,
  endpointId: string,
): BenchmarkSummarySubject | null {
  if (!summary?.runId) {
    return null;
  }
  return summary.subjects.find((subject) => subject.endpointId === endpointId) ?? null;
}

export function describeHardBlend(candidate: {
  readonly routingBenchmarkQuality?: {
    readonly hardBlend?: {
      readonly full: number;
      readonly quick: number;
      readonly blended: number;
    };
  } | null;
}): string | null {
  const hardBlend = candidate.routingBenchmarkQuality?.hardBlend;
  if (!hardBlend) {
    return null;
  }
  return `Hard routing blend: full ${hardBlend.full.toFixed(3)} + quick ${hardBlend.quick.toFixed(3)} → blended ${hardBlend.blended.toFixed(3)}.`;
}

export function isBenchmarkRunnableCandidate(
  candidate: Pick<RouterCandidate, "executionModeEligible">,
): boolean {
  return candidate.executionModeEligible !== false;
}

export function filterBenchmarkRunnableCandidates(
  candidates: readonly RouterCandidate[],
): readonly RouterCandidate[] {
  return candidates.filter(isBenchmarkRunnableCandidate);
}
