export function formatScore(score: number | null | undefined): string {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return "n/a";
  }
  const percent = score * 100;
  const rounded = Math.round(percent * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(1)}%`;
}

export function formatScoreFraction(
  score: number | null | undefined,
  totalCases: number | null | undefined,
): string {
  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    typeof totalCases !== "number" ||
    totalCases <= 0
  ) {
    return formatScore(score);
  }
  const earned = Math.round(score * totalCases * 100) / 100;
  return `${earned}/${totalCases} (${formatScore(score)})`;
}
