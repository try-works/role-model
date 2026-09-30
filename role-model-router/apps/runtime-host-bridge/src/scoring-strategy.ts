/**
 * Run 103 / SP1 - the single owner of the scoring-strategy vocabulary, the legacy spellings and
 * the preset weights (requirements R1, R2, R9, R10 of
 * `.recursive/run/103-agent-strategy-and-scoring-strategy/00-requirements.md`).
 *
 * Design reference: `docs/architecture/16-agent-strategy-and-scoring-strategy.md` sections 3, 4 and 7.
 * The presets are re-exported from the core router rather than copied, the vocabulary is a tagged
 * enum resolved with an exhaustive matcher, and the weight profile is validated with a Schema whose
 * bounds and sum invariant are executable.
 */
import { STRATEGY_WEIGHTS } from "@role-model-router/core";
import { Data, Schema } from "effect";

export const SCORING_STRATEGY_NAMES = ["balanced", "quality", "latency", "cost", "custom"] as const;
export type ScoringStrategyName = (typeof SCORING_STRATEGY_NAMES)[number];

export const WEIGHT_METRICS = [
  "quality",
  "latency",
  "throughput",
  "cost",
  "reliability",
  "preference",
] as const;
export type WeightMetric = (typeof WEIGHT_METRICS)[number];

export type WeightProfile = Readonly<Record<WeightMetric, number>>;

/** Accepted on read, normalized on write (design document section 3). */
export const LEGACY_SCORING_STRATEGY_SPELLINGS: Readonly<Record<string, ScoringStrategyName>> = {
  basic: "balanced",
  balanced: "balanced",
  latency: "latency",
  "low-latency": "latency",
  "latency-first": "latency",
  quality: "quality",
  "high-quality": "quality",
  cost: "cost",
  "low-cost": "cost",
  custom: "custom",
};

export function normalizeScoringStrategyName(
  value: string | null | undefined,
): ScoringStrategyName | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized.length === 0) {
    return null;
  }
  return LEGACY_SCORING_STRATEGY_SPELLINGS[normalized] ?? null;
}

const UnitWeight = Schema.Finite.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 1 })));

const weightsSumToOne = Schema.makeFilter((weights: WeightProfile) => {
  const sum = WEIGHT_METRICS.reduce((total, metric) => total + weights[metric], 0);
  return Math.abs(sum - 1) <= 0.001 ? undefined : `weights must sum to 1.0 (saw ${sum})`;
});

export const WeightProfile = Schema.Struct({
  quality: UnitWeight,
  latency: UnitWeight,
  throughput: UnitWeight,
  cost: UnitWeight,
  reliability: UnitWeight,
  preference: UnitWeight,
}).pipe(Schema.check(weightsSumToOne));

export const SCORING_PRESETS = {
  balanced: STRATEGY_WEIGHTS.balanced,
  quality: STRATEGY_WEIGHTS.quality,
  latency: STRATEGY_WEIGHTS.latency,
  cost: STRATEGY_WEIGHTS.cost,
} as const satisfies Readonly<Record<Exclude<ScoringStrategyName, "custom">, WeightProfile>>;

export type ScoringPlan = Data.TaggedEnum<{
  Balanced: {};
  Quality: {};
  Latency: {};
  Cost: {};
  Custom: { weights: WeightProfile };
}>;

export const ScoringPlan = Data.taggedEnum<ScoringPlan>();

/** Exhaustive by construction: a new variant fails to compile until it is handled here. */
export function resolveScoringWeights(plan: ScoringPlan): WeightProfile {
  return ScoringPlan.$match(plan, {
    Balanced: () => SCORING_PRESETS.balanced,
    Quality: () => SCORING_PRESETS.quality,
    Latency: () => SCORING_PRESETS.latency,
    Cost: () => SCORING_PRESETS.cost,
    Custom: ({ weights }) => weights,
  });
}
