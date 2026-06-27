/**
 * Canonical taxonomy benchmark dimension registry.
 *
 * Every dimension used in benchmark aggregation, telemetry analytics,
 * and UI filtering MUST be listed here. Adding a dimension to this array
 * will cause TypeScript compile errors in all consumers until they handle
 * the new dimension — this is the compiler-enforced contract.
 *
 * Dimensions are ordered: the canonical order for display and iteration.
 */
export const TAXONOMY_BENCHMARK_DIMENSIONS = [
  "byRole",
  "byTask",
  "byVariant",
  "byCapability",
  "byModality",
  "byToolClass",
] as const;

/** A single taxonomy benchmark dimension. */
export type TaxonomyBenchmarkDimension =
  (typeof TAXONOMY_BENCHMARK_DIMENSIONS)[number];

/**
 * A complete taxonomy dimension score map.
 * Every dimension key maps to a record of { value: score } aggregated per-endpoint.
 */
export type TaxonomyDimensionScoreMap = Record<
  TaxonomyBenchmarkDimension,
  Record<string, number>
>;
