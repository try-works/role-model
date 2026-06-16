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
