export function computeLatencyPercentiles(values: readonly number[]): {
  readonly p50: number | null;
  readonly p95: number | null;
} {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);
  if (sorted.length === 0) {
    return { p50: null, p95: null };
  }
  return {
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
  };
}

function percentile(sorted: readonly number[], probability: number): number {
  const index = Math.ceil(probability * sorted.length) - 1;
  const boundedIndex = Math.max(0, Math.min(sorted.length - 1, index));
  const value = sorted[boundedIndex];
  if (value === undefined) {
    throw new Error(`Percentile index ${boundedIndex} is outside the sorted sample range.`);
  }
  return value;
}
