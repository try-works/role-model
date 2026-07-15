import type { RouterCandidate } from "./runtime-api";

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

export function formatCandidateLatencyLine(
  profile: Record<string, unknown> | null | undefined,
): string {
  const record = asRecord(profile);
  const latencyP50 = pickNumber(record, "latency_ms_p50", "latencyMsP50");
  const latencyP95 = pickNumber(record, "latency_ms_p95", "latencyMsP95");
  return `Latency p50 ${latencyP50 ?? "n/a"} ms • p95 ${latencyP95 ?? "n/a"} ms`;
}

export function selectOverviewRouterCandidates(
  candidates: readonly RouterCandidate[],
  limit = Number.POSITIVE_INFINITY,
): readonly RouterCandidate[] {
  return candidates
    .filter((candidate) => candidate.routingEligible !== false)
    .slice()
    .sort(
      (left, right) =>
        Number(right.controllerEligible === true) - Number(left.controllerEligible === true) ||
        Number(right.preferred === true) - Number(left.preferred === true) ||
        left.modelId.localeCompare(right.modelId, "en") ||
        left.endpointId.localeCompare(right.endpointId, "en"),
    )
    .slice(0, Math.max(0, limit));
}
