export type ProgressState = 'determinate' | 'indeterminate'
export type NormalizedProgress = Readonly<{
  value: number | null
  max: number
  state: ProgressState
  percentage: number | null
}>

export const normalizeProgress = (
  value: number | null,
  max = 100,
): NormalizedProgress => {
  const normalizedMax = Number.isFinite(max) && max > 0 ? max : 100
  if (value === null)
    return {
      value: null,
      max: normalizedMax,
      state: 'indeterminate',
      percentage: null,
    }
  const normalizedValue = Number.isFinite(value)
    ? Math.min(normalizedMax, Math.max(0, value))
    : 0
  return {
    value: normalizedValue,
    max: normalizedMax,
    state: 'determinate',
    percentage: (normalizedValue / normalizedMax) * 100,
  }
}
