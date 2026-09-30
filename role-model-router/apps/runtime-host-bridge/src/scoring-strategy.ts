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

/** Which step of the ladder produced the effective strategy (design document section 6.5). */
export type StrategySource = "controller" | "difficulty" | "operator" | "default";

export type DifficultyBucket = "easy" | "medium" | "hard";

export interface OperatorStrategyPosture {
  readonly name: ScoringStrategyName;
  readonly weights: WeightProfile;
}

export interface StrategyResolutionInput {
  readonly operator: OperatorStrategyPosture | null;
  readonly pinWeights: boolean;
  readonly difficultyRoutingActive: boolean;
  readonly difficulty?: DifficultyBucket;
  readonly controllerActive: boolean;
  readonly controllerStrategy?: ScoringStrategyName;
}

export interface StrategyResolution {
  readonly strategy: ScoringStrategyName;
  readonly weights: WeightProfile;
  readonly source: StrategySource;
  /** Recorded when `pinWeights` suppressed an automatic override (R2/R4). */
  readonly discarded?: {
    readonly source: "controller" | "difficulty";
    readonly strategy: ScoringStrategyName;
  };
}

export function weightsForStrategyName(
  name: ScoringStrategyName,
  fallback: WeightProfile,
): WeightProfile {
  switch (name) {
    case "balanced":
      return SCORING_PRESETS.balanced;
    case "quality":
      return SCORING_PRESETS.quality;
    case "latency":
      return SCORING_PRESETS.latency;
    case "cost":
      return SCORING_PRESETS.cost;
    default:
      return fallback;
  }
}

/** `easy` -> cost, `hard` -> quality, `medium` falls through to the operator strategy. */
export function difficultyBucketStrategy(
  difficulty: DifficultyBucket | undefined,
): ScoringStrategyName | null {
  switch (difficulty) {
    case "easy":
      return "cost";
    case "hard":
      return "quality";
    default:
      return null;
  }
}

/**
 * Run 103 / SP2 - the resolution ladder of design document section 5:
 * controller directive > difficulty decisive bucket > operator strategy > balanced,
 * with `pin_weights` blocking both automatic overrides and recording what it discarded.
 */
export function resolveStrategy(input: StrategyResolutionInput): StrategyResolution {
  const operator: StrategyResolution = input.operator
    ? { strategy: input.operator.name, weights: input.operator.weights, source: "operator" }
    : { strategy: "balanced", weights: SCORING_PRESETS.balanced, source: "default" };

  const controllerStrategy =
    input.controllerActive && input.controllerStrategy ? input.controllerStrategy : null;
  const bucketStrategy = input.difficultyRoutingActive
    ? difficultyBucketStrategy(input.difficulty)
    : null;

  if (input.pinWeights) {
    if (controllerStrategy) {
      return {
        ...operator,
        discarded: { source: "controller", strategy: controllerStrategy },
      };
    }
    if (bucketStrategy && bucketStrategy !== operator.strategy) {
      return {
        ...operator,
        discarded: { source: "difficulty", strategy: bucketStrategy },
      };
    }
    return operator;
  }

  if (controllerStrategy) {
    return {
      strategy: controllerStrategy,
      weights: weightsForStrategyName(controllerStrategy, operator.weights),
      source: "controller",
    };
  }

  if (bucketStrategy) {
    return {
      strategy: bucketStrategy,
      weights: weightsForStrategyName(bucketStrategy, operator.weights),
      source: "difficulty",
    };
  }

  return operator;
}
