/**
 * Run 98 addendum 43 — model pool scoring parameters.
 *
 * These are the knobs the operator asked to be able to change without hunting through the scoring code.
 * The model pool card renders from three axes (cost, quality, speed) and one composite:
 *
 * - `axisWeights` are the per-axis shares of a fully evidenced candidate. They sum to 1.0, which is the
 *   denominator used when a candidate cannot evidence every axis (S1): a candidate with one measured axis
 *   can reach at most its own axis weight (0.33), one with two at most 0.67, so a thin candidate can no
 *   longer sit at the top of the pool with a cost-only 1.000.
 * - `minimumQualityBenchmarkSamples` is the evidence floor for the quality axis (S2): a benchmark
 *   capability backed by fewer measured samples is shown as insufficient evidence, with its count, rather
 *   than scored. The operator set it to 3 on 2026-09-19, consistent with the decisive-comparison floor used
 *   by the learning surface.
 *
 * Change a value here; `candidate-space.ts` and its tests read them from this module.
 */
export interface CandidateSpaceScoringConfig {
  /** Per-axis share of a fully evidenced composite. Must sum to 1.0. */
  readonly axisWeights: {
    readonly cost: number;
    readonly quality: number;
    readonly speed: number;
  };
  /** Minimum measured benchmark samples before the quality axis will score an endpoint. */
  readonly minimumQualityBenchmarkSamples: number;
}

export const CANDIDATE_SPACE_SCORING_CONFIG: CandidateSpaceScoringConfig = {
  axisWeights: { cost: 0.33, quality: 0.34, speed: 0.33 },
  minimumQualityBenchmarkSamples: 3,
};
