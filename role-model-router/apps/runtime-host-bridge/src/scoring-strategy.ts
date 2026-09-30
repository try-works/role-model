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
import { createHash } from "node:crypto";
import { Data, Result, Schema } from "effect";

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
  baseline: "balanced",
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

export const ROUTING_MODE_NAMES = ["baseline", "difficulty", "hybrid", "intelligent"] as const;
export type RoutingModeName = (typeof ROUTING_MODE_NAMES)[number];

/** `controller` is the compat spelling of `intelligent` (design document section 3). */
export function normalizeRoutingModeName(value: string | null | undefined): RoutingModeName | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  switch (normalized) {
    case "baseline":
    case "basic":
      return "baseline";
    case "controller":
    case "intelligent":
      return "intelligent";
    case "difficulty":
      return "difficulty";
    case "hybrid":
      return "hybrid";
    default:
      return null;
  }
}

export interface RoutingPostureInput {
  readonly mode?: string | null;
  readonly scoringStrategy?: string | null;
  readonly pinWeights?: boolean;
  readonly weights?: unknown;
}

export interface RoutingPosture {
  readonly mode: RoutingModeName;
  readonly scoringStrategy: ScoringStrategyName | null;
  readonly pinWeights: boolean;
  readonly operator: OperatorStrategyPosture | null;
  /** Read-side degradations; a malformed value never widens behaviour (fail closed). */
  readonly degradations: readonly string[];
}

/**
 * Run 103 / SP2b - decode the routing block into the posture the ladder consumes. Legacy
 * spellings normalize on read, unknown values degrade to the default posture with a recorded
 * reason, and a `custom` strategy without valid weights fails closed.
 */
export function decodeRoutingPosture(input: RoutingPostureInput): RoutingPosture {
  const degradations: string[] = [];

  const normalizedMode = normalizeRoutingModeName(input.mode);
  if (input.mode && !normalizedMode) {
    degradations.push(`unknown routing mode "${input.mode}" normalized to baseline`);
  }

  let scoringStrategy: ScoringStrategyName | null = null;
  const rawStrategy = input.scoringStrategy?.trim() ?? "";
  if (rawStrategy.length > 0) {
    scoringStrategy = normalizeScoringStrategyName(rawStrategy);
    if (!scoringStrategy) {
      degradations.push(`unknown scoring strategy "${rawStrategy}" ignored; failing closed to the default posture`);
    }
  }

  let operator: OperatorStrategyPosture | null = null;
  if (scoringStrategy === "custom") {
    const decoded = Schema.decodeUnknownResult(WeightProfile)(input.weights);
    if (Result.isSuccess(decoded)) {
      operator = { name: "custom", weights: decoded.success };
    } else {
      degradations.push(
        'scoring_strategy "custom" requires a valid weights profile (six metrics in 0..1 summing to 1); failing closed to the default posture',
      );
      scoringStrategy = null;
    }
  } else if (scoringStrategy) {
    operator = {
      name: scoringStrategy,
      weights: weightsForStrategyName(scoringStrategy, SCORING_PRESETS.balanced),
    };
  }

  return {
    mode: normalizedMode ?? "baseline",
    scoringStrategy,
    pinWeights: input.pinWeights === true,
    operator,
    degradations,
  };
}

const LEGACY_MODE_SPELLINGS: Readonly<Record<string, RoutingModeName>> = {
  difficulty: "difficulty",
  hybrid: "hybrid",
  controller: "intelligent",
  intelligent: "intelligent",
};

const LEGACY_NO_POSTURE_SPELLINGS = new Set(["", "craft-ask"]);

/**
 * Run 103 / SP2c - migrate the legacy single `routing.strategy` string onto the two axes
 * (design document section 3). Mode spellings set the mode and leave the scoring strategy
 * unset; scoring spellings set `baseline` plus that strategy; `craft-ask` maps to the default
 * posture; an unknown spelling degrades with a recorded reason.
 */
export function decodeLegacyRoutingStrategy(raw: string | null | undefined): RoutingPosture {
  const normalized = raw?.trim().toLowerCase() ?? "";
  if (LEGACY_NO_POSTURE_SPELLINGS.has(normalized)) {
    return decodeRoutingPosture({});
  }
  const mode = LEGACY_MODE_SPELLINGS[normalized];
  if (mode) {
    return decodeRoutingPosture({ mode });
  }
  if (normalizeScoringStrategyName(normalized)) {
    return decodeRoutingPosture({ mode: "baseline", scoringStrategy: normalized });
  }
  return decodeRoutingPosture({ mode: "baseline", scoringStrategy: normalized });
}

export interface RequestStrategyInput {
  readonly posture?: RoutingPosture;
  /** Accepts the bridge's operator vocabulary too (`controller` normalizes to `intelligent`). */
  readonly effectiveRoutingMode: RoutingModeName | "controller";
  readonly difficulty?: DifficultyBucket;
  /** Set when the controller produced a validated strategy directive (SP4 applies the pin rule). */
  readonly controllerStrategy?: ScoringStrategyName;
  readonly controllerActive?: boolean;
}

/**
 * Run 103 / SP2c - the request-level entry point: a posture plus the difficulty result produce
 * the effective strategy that is written into the routing request.
 */
export function resolveRequestStrategy(input: RequestStrategyInput): StrategyResolution {
  const effectiveRoutingMode = normalizeRoutingModeName(input.effectiveRoutingMode) ?? "baseline";
  return resolveStrategy({
    operator: input.posture?.operator ?? null,
    pinWeights: input.posture?.pinWeights ?? false,
    difficultyRoutingActive:
      effectiveRoutingMode === "difficulty" || effectiveRoutingMode === "hybrid",
    difficulty: input.difficulty,
    controllerActive: input.controllerActive === true,
    controllerStrategy: input.controllerStrategy,
  });
}

/**
 * The core `RoutingStrategy` union has no `custom` member: the protocol snapshot keeps a canonical
 * preset name, while the effective weights travel in runtime diagnostics (design document section 7.3).
 */
export function toCoreRoutingStrategyName(
  name: ScoringStrategyName,
): Exclude<ScoringStrategyName, "custom"> {
  return name === "custom" ? "balanced" : name;
}

/** Stable digest over the six metrics, independent of key order (design document section 6.5). */
export function weightsDigest(weights: WeightProfile): string {
  const canonical = WEIGHT_METRICS.map((metric) => `${metric}=${weights[metric]}`).join(";");
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export interface StrategyProvenance {
  readonly strategy: ScoringStrategyName;
  readonly source: StrategySource;
  readonly weightsDigest: string;
  readonly discarded?: {
    readonly source: "controller" | "difficulty";
    readonly strategy: ScoringStrategyName;
  };
}

/**
 * Run 103 / SP3 - the receipt the decision carries: which strategy won, who chose it, which weights
 * were used, and what a pinned posture discarded.
 */
export function summarizeStrategyProvenance(
  resolution: StrategyResolution,
): StrategyProvenance {
  return {
    strategy: resolution.strategy,
    source: resolution.source,
    weightsDigest: weightsDigest(resolution.weights),
    ...(resolution.discarded ? { discarded: resolution.discarded } : {}),
  };
}

/**
 * Run 103 / SP3b - attach the strategy receipt to whatever diagnostics a mapper already built,
 * without dropping the fields it produced.
 */
export function withStrategyProvenance<TDiagnostics extends object>(
  diagnostics: TDiagnostics | undefined,
  resolution: StrategyResolution,
): TDiagnostics & { readonly strategyResolution: StrategyProvenance } {
  return {
    ...(diagnostics ?? ({} as TDiagnostics)),
    strategyResolution: summarizeStrategyProvenance(resolution),
  };
}

export interface ControllerStrategyApplicationInput {
  readonly pinWeights: boolean;
  /** The strategy the request already carries (from the ladder). */
  readonly requestStrategy: ScoringStrategyName;
  /** The controller's validated directive, when it emitted one. */
  readonly guidanceStrategy?: ScoringStrategyName;
}

export interface ControllerStrategyApplication {
  readonly strategy: ScoringStrategyName;
  readonly discarded?: {
    readonly source: "controller";
    readonly strategy: ScoringStrategyName;
  };
}

/**
 * Run 103 / SP4b - the controller may replace the request strategy only while the posture is
 * unpinned; a pinned posture keeps its weights and the suppressed directive is recorded.
 */
export function resolveControllerStrategyApplication(
  input: ControllerStrategyApplicationInput,
): ControllerStrategyApplication {
  if (!input.guidanceStrategy) {
    return { strategy: input.requestStrategy };
  }
  if (!input.pinWeights) {
    return { strategy: input.guidanceStrategy };
  }
  if (input.guidanceStrategy === input.requestStrategy) {
    return { strategy: input.requestStrategy };
  }
  return {
    strategy: input.requestStrategy,
    discarded: { source: "controller", strategy: input.guidanceStrategy },
  };
}
