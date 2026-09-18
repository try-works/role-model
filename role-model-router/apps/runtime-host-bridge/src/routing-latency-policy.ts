/**
 * Run 98 addendum 40 (L5): the versioned configuration for the measured-latency selection input.
 *
 * The operator owns these values in the same versioned policy config the other activation parameters
 * live in; the runtime resolves them, bounds them, and fails closed to the documented defaults, so a
 * malformed or hostile value can never widen what the router is allowed to do. The environment is an
 * explicit local override that may only *narrow* the configuration (today: disable it, or lower the
 * delta within bounds).
 *
 * Default stage behaviour is identity: `enabled: false` means routing does not consult measured
 * latency at all, so a runtime that has not been authorized produces byte-identical decisions.
 */
export const ROUTING_LATENCY_SELECTION_POLICY_SCHEMA_VERSION =
  "role-model.routing-latency-selection-policy.v1";

export type RoutingLatencySelectionStage = "S0" | "S1" | "S2" | "S3" | "S4";

export interface RoutingLatencySelectionPolicy {
  readonly schemaVersion: typeof ROUTING_LATENCY_SELECTION_POLICY_SCHEMA_VERSION;
  readonly enabled: boolean;
  /** Lowest activation stage at which the input may influence a decision. */
  readonly minStage: RoutingLatencySelectionStage;
  readonly windowHours: number;
  readonly minSamples: number;
  /** How much better (ms) a candidate's measured p95 must be before it is preferred. */
  readonly maxDeltaMs: number;
  /** Prompt-size buckets, by input tokens; the final bucket is open-ended. */
  readonly tokenBucketUpperBounds: readonly number[];
  readonly maxCandidates: number;
}

export interface ResolvedRoutingLatencySelectionPolicy {
  readonly policy: RoutingLatencySelectionPolicy;
  readonly source: "defaults" | "config" | "environment";
  /** Field names whose configured value was rejected; empty when nothing was dropped. */
  readonly violations: readonly string[];
}

const STAGES: readonly RoutingLatencySelectionStage[] = ["S0", "S1", "S2", "S3", "S4"];
const BOUNDS = {
  windowHours: { min: 1, max: 168 },
  minSamples: { min: 3, max: 1_000 },
  maxDeltaMs: { min: 0, max: 60_000 },
  maxCandidates: { min: 1, max: 32 },
  maxBucketCount: 8,
  maxBucketBound: 1_000_000,
} as const;

const DEFAULT_POLICY: RoutingLatencySelectionPolicy = Object.freeze({
  schemaVersion: ROUTING_LATENCY_SELECTION_POLICY_SCHEMA_VERSION,
  enabled: false,
  minStage: "S2",
  windowHours: 24,
  minSamples: 5,
  maxDeltaMs: 2_000,
  tokenBucketUpperBounds: Object.freeze([50_000, 150_000]),
  maxCandidates: 4,
});

const readInteger = (
  value: unknown,
  bounds: { readonly min: number; readonly max: number },
): number | null =>
  typeof value === "number" &&
  Number.isSafeInteger(value) &&
  value >= bounds.min &&
  value <= bounds.max
    ? value
    : null;

const readBucketBounds = (value: unknown): readonly number[] | null => {
  if (!Array.isArray(value) || value.length === 0 || value.length > BOUNDS.maxBucketCount) {
    return null;
  }
  const bounds: number[] = [];
  for (const entry of value) {
    const bound = readInteger(entry, { min: 1, max: BOUNDS.maxBucketBound });
    if (bound === null) return null;
    if (bounds.length > 0 && bound <= (bounds[bounds.length - 1] ?? 0)) return null;
    bounds.push(bound);
  }
  return bounds;
};

export function resolveRoutingLatencySelectionPolicy(input: {
  readonly raw?: unknown;
  readonly environment?: Record<string, string | undefined>;
}): ResolvedRoutingLatencySelectionPolicy {
  const environment = input.environment ?? {};
  const raw =
    input.raw && typeof input.raw === "object" && !Array.isArray(input.raw)
      ? (input.raw as Record<string, unknown>)
      : null;
  const violations: string[] = [];
  let source: ResolvedRoutingLatencySelectionPolicy["source"] = raw ? "config" : "defaults";

  let enabled = DEFAULT_POLICY.enabled;
  if (raw && "enabled" in raw) {
    if (typeof raw.enabled === "boolean") enabled = raw.enabled;
    else violations.push("enabled");
  }

  let minStage = DEFAULT_POLICY.minStage;
  if (raw && "minStage" in raw) {
    if (typeof raw.minStage === "string" && STAGES.includes(raw.minStage as never)) {
      minStage = raw.minStage as RoutingLatencySelectionStage;
    } else {
      violations.push("minStage");
    }
  }

  const resolveBounded = (
    field: "windowHours" | "minSamples" | "maxDeltaMs" | "maxCandidates",
  ): number => {
    if (!raw || !(field in raw)) return DEFAULT_POLICY[field];
    const resolved = readInteger(raw[field], BOUNDS[field]);
    if (resolved === null) {
      violations.push(field);
      return DEFAULT_POLICY[field];
    }
    return resolved;
  };

  let tokenBucketUpperBounds = DEFAULT_POLICY.tokenBucketUpperBounds;
  if (raw && "tokenBucketUpperBounds" in raw) {
    const resolved = readBucketBounds(raw.tokenBucketUpperBounds);
    if (resolved === null) violations.push("tokenBucketUpperBounds");
    else tokenBucketUpperBounds = resolved;
  }

  let windowHours = resolveBounded("windowHours");
  let minSamples = resolveBounded("minSamples");
  let maxDeltaMs = resolveBounded("maxDeltaMs");
  const maxCandidates = resolveBounded("maxCandidates");

  // Environment overrides may only narrow: they can disable the input or lower the delta inside the
  // configured value. Anything else is recorded as a violation and ignored.
  if (environment.ROLE_MODEL_ROUTING_LATENCY_SELECTION_ENABLED !== undefined) {
    const value = environment.ROLE_MODEL_ROUTING_LATENCY_SELECTION_ENABLED.trim().toLowerCase();
    if (["off", "false", "0", "disabled"].includes(value)) {
      enabled = false;
      source = "environment";
    } else if (["on", "true", "1", "enabled"].includes(value)) {
      // An environment switch may not enable what the config has not authorized.
      source = "environment";
    } else {
      violations.push("enabled");
    }
  }
  const deltaOverride = environment.ROLE_MODEL_ROUTING_LATENCY_SELECTION_MAX_DELTA_MS?.trim();
  if (deltaOverride) {
    const parsed = Number(deltaOverride);
    const bounded = readInteger(parsed, BOUNDS.maxDeltaMs);
    if (bounded === null) {
      violations.push("maxDeltaMs");
    } else {
      maxDeltaMs = Math.min(maxDeltaMs, bounded);
      source = "environment";
    }
  }

  // A rejected value means the operator's intent is not fully represented, so nothing may be enabled
  // on the strength of a partially-understood configuration.
  if (violations.length > 0) {
    return { policy: { ...DEFAULT_POLICY }, source: "defaults", violations };
  }

  return {
    policy: {
      schemaVersion: ROUTING_LATENCY_SELECTION_POLICY_SCHEMA_VERSION,
      enabled,
      minStage,
      windowHours,
      minSamples,
      maxDeltaMs,
      tokenBucketUpperBounds,
      maxCandidates,
    },
    source,
    violations,
  };
}
