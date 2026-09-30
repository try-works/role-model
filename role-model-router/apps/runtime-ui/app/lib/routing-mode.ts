/**
 * Run 103 / SP8 - the runtime-ui mirror of the routing posture vocabulary that
 * `role-model-router/apps/runtime-host-bridge/src/scoring-strategy.ts` owns on the runtime side.
 *
 * The UI reads legacy spellings (so a file written before run 103 still displays the posture it
 * means) but it is canonical-only on the write path: every patch this module builds carries
 * `baseline | difficulty | hybrid | intelligent` and `balanced | quality | latency | cost | custom`,
 * so a save can never persist a synonym the runtime would have to migrate again.
 */

export const ROUTING_MODE_NAMES = ["baseline", "difficulty", "hybrid", "intelligent"] as const;
export type RoutingModeName = (typeof ROUTING_MODE_NAMES)[number];

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

export const WEIGHT_SUM_TOLERANCE = 0.001;

export const SCORING_PRESETS = {
  balanced: {
    quality: 0.3,
    latency: 0.2,
    throughput: 0.1,
    cost: 0.2,
    reliability: 0.15,
    preference: 0.05,
  },
  quality: {
    quality: 0.5,
    latency: 0.1,
    throughput: 0.05,
    cost: 0.1,
    reliability: 0.2,
    preference: 0.05,
  },
  latency: {
    quality: 0.15,
    latency: 0.45,
    throughput: 0.15,
    cost: 0.05,
    reliability: 0.15,
    preference: 0.05,
  },
  cost: {
    quality: 0.15,
    latency: 0.1,
    throughput: 0.05,
    cost: 0.5,
    reliability: 0.15,
    preference: 0.05,
  },
} as const satisfies Readonly<Record<Exclude<ScoringStrategyName, "custom">, WeightProfile>>;

/** Accepted on read, never written: the migration table of design document section 3. */
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

export const LEGACY_ROUTING_MODE_SPELLINGS: Readonly<Record<string, RoutingModeName>> = {
  baseline: "baseline",
  basic: "baseline",
  controller: "intelligent",
  intelligent: "intelligent",
  difficulty: "difficulty",
  hybrid: "hybrid",
};

export const EXECUTION_SCOPE_NAMES = [
  "decision_only",
  "hybrid",
  "local_only",
  "remote_only",
] as const;
export type ExecutionScopeName = (typeof EXECUTION_SCOPE_NAMES)[number];

export type RoutingModeOption = {
  readonly value: RoutingModeName;
  readonly label: string;
  readonly detail: string;
  readonly guidance: string;
  readonly bestFor: string;
  readonly needsController: boolean;
  /** The alias family the mode owns (design document section 6.2). */
  readonly aliasFamily: string;
};

export const ROUTING_MODE_OPTIONS: ReadonlyArray<RoutingModeOption> = [
  {
    value: "baseline",
    label: "Baseline",
    detail:
      "Use the saved scoring strategy directly. Neither difficulty classification nor a controller directive replaces it.",
    guidance: "operator strategy",
    bestFor: "a fixed, explainable ranking recipe",
    needsController: false,
    aliasFamily: "baseline",
  },
  {
    value: "difficulty",
    label: "Difficulty",
    detail:
      "Classify the request: an easy bucket prefers cost, a hard bucket prefers quality, and medium keeps the saved strategy.",
    guidance: "difficulty-aware",
    bestFor: "quality-bounded routing",
    needsController: false,
    aliasFamily: "difficulty",
  },
  {
    value: "hybrid",
    label: "Hybrid",
    detail: "Blend controller guidance with the difficulty-aware fallback behaviour.",
    guidance: "controller + difficulty",
    bestFor: "guided hybrid fallback",
    needsController: true,
    aliasFamily: "hybrid",
  },
  {
    value: "intelligent",
    label: "Intelligent",
    detail:
      "Let the routing controller direct role, task, capabilities and, unless the weights are pinned, the strategy.",
    guidance: "controller-guided",
    bestFor: "live endpoint ranking",
    needsController: true,
    aliasFamily: "controller",
  },
] as const;

export type ScoringStrategyOption = {
  readonly value: ScoringStrategyName;
  readonly label: string;
  readonly detail: string;
  readonly needsWeights: boolean;
};

export const SCORING_STRATEGY_OPTIONS: ReadonlyArray<ScoringStrategyOption> = [
  {
    value: "balanced",
    label: "Balanced",
    detail: "The shipped balanced preset: quality and cost hold equal weight.",
    needsWeights: false,
  },
  {
    value: "quality",
    label: "Quality",
    detail: "Rank by measured quality first; latency and cost stay tie-breakers.",
    needsWeights: false,
  },
  {
    value: "latency",
    label: "Latency",
    detail: "Rank by measured latency first, with quality as the guard rail.",
    needsWeights: false,
  },
  {
    value: "cost",
    label: "Cost",
    detail: "Rank by effective cost first, with quality as the guard rail.",
    needsWeights: false,
  },
  {
    value: "custom",
    label: "Custom",
    detail:
      "Supply the six weights yourself; the runtime rejects a profile outside 0..1 or off the 1.0 ± 0.001 sum.",
    needsWeights: true,
  },
] as const;

export const WEIGHT_METRIC_LABELS: Readonly<Record<WeightMetric, string>> = {
  quality: "Quality",
  latency: "Latency",
  throughput: "Throughput",
  cost: "Cost",
  reliability: "Reliability",
  preference: "Preference",
};

export const EXECUTION_SCOPE_OPTIONS: ReadonlyArray<{
  readonly value: ExecutionScopeName;
  readonly label: string;
  readonly detail: string;
}> = [
  {
    value: "hybrid",
    label: "Hybrid",
    detail: "Keep both local llama-swap and remote LiteLLM execution available to the runtime.",
  },
  {
    value: "local_only",
    label: "Local only",
    detail: "Route only through local llama-swap-managed models.",
  },
  {
    value: "remote_only",
    label: "Remote only",
    detail: "Route only through remote provider-backed endpoints.",
  },
  {
    value: "decision_only",
    label: "Decision only",
    detail: "Keep routing and diagnostics active without enabling local or remote execution.",
  },
] as const;

export const PIN_WEIGHTS_HELP_TEXT =
  "Prevent difficulty classification and Intelligent mode from overriding the saved strategy";

export function formatWeightMetricLabel(metric: WeightMetric): string {
  return WEIGHT_METRIC_LABELS[metric];
}

export function normalizeRoutingModeValue(
  value: string | null | undefined,
): RoutingModeName | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized.length === 0) {
    return null;
  }
  return LEGACY_ROUTING_MODE_SPELLINGS[normalized] ?? null;
}

export function normalizeScoringStrategyValue(
  value: string | null | undefined,
): ScoringStrategyName | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (normalized.length === 0) {
    return null;
  }
  return LEGACY_SCORING_STRATEGY_SPELLINGS[normalized] ?? null;
}

/** True when the persisted string is a synonym that a save has to migrate. */
export function isLegacyRoutingModeSpelling(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? "";
  const canonical = normalizeRoutingModeValue(normalized);
  return canonical !== null && canonical !== normalized;
}

export function isLegacyScoringStrategySpelling(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? "";
  const canonical = normalizeScoringStrategyValue(normalized);
  return canonical !== null && canonical !== normalized;
}

export function formatRoutingModeLabel(value: string | null | undefined): string {
  const normalized = normalizeRoutingModeValue(value);
  if (!normalized) {
    return "unset";
  }
  return ROUTING_MODE_OPTIONS.find((option) => option.value === normalized)?.label ?? normalized;
}

/**
 * The applied strategy label. An unrecognized value is named as unrecognized rather than echoed
 * back, so no surface can present the raw config string as the strategy a decision used (R3).
 */
export function formatScoringStrategyLabel(value: string | null | undefined): string {
  const normalized = normalizeScoringStrategyValue(value);
  if (!normalized) {
    return "unrecognized strategy";
  }
  return (
    SCORING_STRATEGY_OPTIONS.find((option) => option.value === normalized)?.label ?? normalized
  );
}

export function describeRoutingMode(value: string | null | undefined): string | null {
  const normalized = normalizeRoutingModeValue(value);
  if (!normalized) {
    return null;
  }
  return ROUTING_MODE_OPTIONS.find((option) => option.value === normalized)?.detail ?? null;
}

export function normalizeExecutionScopeValue(
  value: string | null | undefined,
): ExecutionScopeName | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return (EXECUTION_SCOPE_NAMES as readonly string[]).includes(normalized)
    ? (normalized as ExecutionScopeName)
    : null;
}

export function formatExecutionScopeSegment(executionScope: string): string {
  return executionScope.trim().toLowerCase().replaceAll("_", "-");
}

/**
 * The client-facing alias the resolved posture owns. Unknown or missing modes fall back to the
 * `default` family instead of echoing a repo-specific string into an alias id (R3).
 */
export function formatCanonicalRoutingAlias(
  mode: string | null | undefined,
  executionScope: string,
): string {
  const normalized = normalizeRoutingModeValue(mode);
  const family = normalized
    ? (ROUTING_MODE_OPTIONS.find((option) => option.value === normalized)?.aliasFamily ?? "default")
    : "default";
  return `${family}.${formatExecutionScopeSegment(executionScope)}`;
}

/** Reads the six metrics off a readback value; anything outside 0..1 or non-numeric is refused. */
export function readWeightProfile(value: unknown): WeightProfile | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const weights: Partial<Record<WeightMetric, number>> = {};
  for (const metric of WEIGHT_METRICS) {
    const raw = record[metric];
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0 || raw > 1) {
      return null;
    }
    weights[metric] = raw;
  }
  return weights as WeightProfile;
}

export function weightsSum(weights: WeightProfile): number {
  return WEIGHT_METRICS.reduce((total, metric) => total + weights[metric], 0);
}

export function weightsSumIsValid(weights: WeightProfile): boolean {
  return Math.abs(weightsSum(weights) - 1) <= WEIGHT_SUM_TOLERANCE;
}

export interface WeightValidation {
  readonly ok: boolean;
  readonly sum: number;
  readonly sumError: string | null;
  readonly metricErrors: Partial<Record<WeightMetric, string>>;
}

export function validateWeightProfile(weights: WeightProfile): WeightValidation {
  const metricErrors: Partial<Record<WeightMetric, string>> = {};
  for (const metric of WEIGHT_METRICS) {
    const value = weights[metric];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      metricErrors[metric] = "must be between 0 and 1";
    }
  }
  const sum = weightsSum(weights);
  const sumValid = Math.abs(sum - 1) <= WEIGHT_SUM_TOLERANCE;
  return {
    ok: sumValid && Object.keys(metricErrors).length === 0,
    sum,
    sumError: sumValid
      ? null
      : `weights must sum to 1.0 +- ${WEIGHT_SUM_TOLERANCE} (saw ${Number(sum.toFixed(4))})`,
    metricErrors,
  };
}

export function formatWeightValue(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "—";
}

export interface RoutingPostureReadback {
  readonly legacyStrategy: string | null;
  readonly mode: string | null;
  readonly scoringStrategy: string | null;
  readonly pinWeights: boolean;
  readonly weights: unknown;
  readonly degradations?: readonly string[];
}

export type RoutingPostureSource = "routing-block" | "legacy-string" | "default";

export interface RoutingPostureSummary {
  readonly mode: RoutingModeName;
  readonly modeLabel: string;
  readonly scoringStrategy: ScoringStrategyName | null;
  readonly scoringStrategyLabel: string;
  readonly pinWeights: boolean;
  readonly weights: WeightProfile | null;
  readonly source: RoutingPostureSource;
  readonly sourceLabel: string;
  readonly legacyStrategy: string | null;
  readonly routingAliasId: string;
  readonly degradations: readonly string[];
}

const POSTURE_SOURCE_LABELS: Readonly<Record<RoutingPostureSource, string>> = {
  "routing-block": "the file declares routing.mode / routing.scoring_strategy",
  "legacy-string": "the file is still legacy and this page is showing the migrated posture",
  default: "no posture is saved yet; the runtime default applies",
};

/**
 * The resolved-posture line of the Routing strategy page: which mode and scoring strategy the next
 * decision will use, and whether the file declared them or a legacy string was migrated on read.
 */
export function resolveRoutingPostureSummary(input: {
  readonly routing?: RoutingPostureReadback | null;
  readonly persisted?: {
    readonly strategy?: string | null;
    readonly executionMode?: string | null;
  };
}): RoutingPostureSummary {
  const routing = input.routing ?? null;
  const executionScope = input.persisted?.executionMode ?? "decision_only";
  /**
   * A file that still carries the pre-run-103 single string is migrated exactly the way the runtime
   * migrates it: a mode spelling sets the mode, a scoring spelling sets `baseline` plus that
   * strategy, and anything empty or unknown falls back to the default posture.
   */
  const legacyStrategy =
    routing?.legacyStrategy ?? (routing === null ? (input.persisted?.strategy ?? null) : null);
  const legacySpelling = legacyStrategy?.trim().toLowerCase() ?? "";
  const legacyIsNoPosture = legacySpelling.length === 0 || legacySpelling === "craft-ask";
  const legacyMode = legacyIsNoPosture ? null : (normalizeRoutingModeValue(legacySpelling) ?? null);
  const mode = normalizeRoutingModeValue(routing?.mode) ?? legacyMode ?? "baseline";
  const scoringStrategy =
    normalizeScoringStrategyValue(routing?.scoringStrategy) ??
    (legacyMode === null && !legacyIsNoPosture
      ? normalizeScoringStrategyValue(legacySpelling)
      : null);
  const weights =
    scoringStrategy === "custom" ? (readWeightProfile(routing?.weights) ?? null) : null;

  let source: RoutingPostureSource;
  if (routing === null && legacyIsNoPosture) {
    source = "default";
  } else if (legacyStrategy !== null && legacyStrategy.trim().length > 0) {
    source = "legacy-string";
  } else {
    source = "routing-block";
  }

  return {
    mode,
    modeLabel: formatRoutingModeLabel(mode),
    scoringStrategy,
    scoringStrategyLabel:
      scoringStrategy === null ? "default (balanced)" : formatScoringStrategyLabel(scoringStrategy),
    pinWeights: routing?.pinWeights === true,
    weights,
    source,
    sourceLabel: POSTURE_SOURCE_LABELS[source],
    legacyStrategy,
    // With no saved posture at all the runtime's own default alias family applies.
    routingAliasId:
      source === "default"
        ? `default.${formatExecutionScopeSegment(executionScope)}`
        : formatCanonicalRoutingAlias(mode, executionScope),
    degradations: routing?.degradations ?? [],
  };
}

export interface RoutingPatchDocument {
  readonly routing: Readonly<Record<string, unknown>>;
  readonly execution_mode: ExecutionScopeName;
}

export type RoutingPatchBuildResult =
  | { readonly ok: true; readonly document: RoutingPatchDocument }
  | { readonly ok: false; readonly error: string };

/**
 * Rewrites the routing keys of a raw config document onto the canonical vocabulary. The System →
 * Config editor writes a free-form JSON document, so this is the guard that keeps that path from
 * persisting a synonym the runtime would only migrate again (R8 "no UI path").
 */
export function canonicalizeRoutingDocument<TDocument extends Record<string, unknown>>(
  document: TDocument,
): { readonly document: TDocument; readonly migrated: readonly string[] } {
  const next = { ...document } as Record<string, unknown>;
  const migrated: string[] = [];

  const routing = next.routing;
  if (typeof routing === "object" && routing !== null && !Array.isArray(routing)) {
    const block = { ...(routing as Record<string, unknown>) };
    for (const key of ["mode", "scoring_strategy", "scoringStrategy"] as const) {
      const raw = block[key];
      if (typeof raw !== "string" || raw.trim().length === 0) {
        continue;
      }
      const isModeKey = key === "mode";
      const canonical = isModeKey
        ? normalizeRoutingModeValue(raw)
        : normalizeScoringStrategyValue(raw);
      if (canonical !== null && canonical !== raw.trim().toLowerCase()) {
        block[key] = canonical;
        migrated.push(`routing.${key}: ${raw} -> ${canonical}`);
      }
    }
    next.routing = block;
  }

  for (const key of ["routingStrategy", "routing_strategy"] as const) {
    const raw = next[key];
    if (typeof raw !== "string" || raw.trim().length === 0) {
      continue;
    }
    const normalized = raw.trim().toLowerCase();
    if (normalized === "craft-ask") {
      delete next[key];
      migrated.push(`${key}: ${raw} -> (removed; it means "no posture")`);
      continue;
    }
    const canonical =
      normalizeRoutingModeValue(normalized) ?? normalizeScoringStrategyValue(normalized);
    if (canonical !== null && canonical !== normalized) {
      next[key] = canonical;
      migrated.push(`${key}: ${raw} -> ${canonical}`);
    }
  }

  return { document: next as TDocument, migrated };
}

/**
 * Builds the document patch the runtime's `PUT /api/role-model/runtime/config` merges. The patch
 * carries canonical vocabulary only; weights travel only for `custom`, because the config contract
 * rejects them for a preset strategy.
 */
export function buildRoutingPatchDocument(input: {
  readonly routing: RoutingPostureReadback | null;
  readonly scoringStrategy: string | null;
  readonly weights: WeightProfile | null;
  readonly pinWeights: boolean;
  readonly executionScope: string;
}): RoutingPatchBuildResult {
  const mode =
    normalizeRoutingModeValue(input.routing?.mode ?? null) ??
    normalizeRoutingModeValue(input.routing?.legacyStrategy ?? null) ??
    "baseline";
  const executionScope = normalizeExecutionScopeValue(input.executionScope);
  if (executionScope === null) {
    return { ok: false, error: `unknown execution scope "${input.executionScope}"` };
  }

  const rawStrategy = input.scoringStrategy?.trim() ?? "";
  const scoringStrategy =
    rawStrategy.length === 0 ? null : normalizeScoringStrategyValue(rawStrategy);
  if (rawStrategy.length > 0 && scoringStrategy === null) {
    return {
      ok: false,
      error: `scoring_strategy must be balanced, quality, latency, cost, or custom (saw "${rawStrategy}")`,
    };
  }

  const routing: Record<string, unknown> = { mode };
  if (scoringStrategy !== null) {
    routing.scoring_strategy = scoringStrategy;
  }
  routing.pin_weights = input.pinWeights === true;

  if (scoringStrategy === "custom") {
    const weights = input.weights;
    if (weights === null) {
      return { ok: false, error: "scoring_strategy custom requires a weights profile" };
    }
    const validation = validateWeightProfile(weights);
    if (!validation.ok) {
      return {
        ok: false,
        error: validation.sumError ?? "weights must be six metrics within 0..1",
      };
    }
    routing.weights = { ...weights };
  }

  return { ok: true, document: { routing, execution_mode: executionScope } };
}
