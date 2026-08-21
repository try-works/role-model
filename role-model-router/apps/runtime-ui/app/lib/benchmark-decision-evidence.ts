import type { RouterDecisionDetail } from "./runtime-api";

export interface BenchmarkDecisionView {
  readonly scorePercent: number;
  readonly overallPercent: number;
  readonly reason: string | null;
  readonly evidenceSource: string;
  readonly runId: string | null;
  readonly runMode: string | null;
  readonly suiteId: string | null;
  readonly judgeEndpointId: string | null;
  readonly measuredAtMs: number | null;
}

export function projectBenchmarkDecisionView(
  detail: RouterDecisionDetail,
): BenchmarkDecisionView | null {
  const evidence = detail.benchmarkEvidence;
  if (!evidence || evidence.endpointId !== detail.selectedEndpointId) {
    return null;
  }
  return {
    scorePercent: Math.round(evidence.effectiveQualityScore * 100),
    overallPercent: Math.round(evidence.overallScore * 100),
    reason: evidence.reason,
    evidenceSource: evidence.evidenceSource,
    runId: evidence.runId,
    runMode: evidence.runMode,
    suiteId: evidence.suiteId,
    judgeEndpointId: evidence.judgeEndpointId,
    measuredAtMs: evidence.runCompletedAtMs,
  };
}
