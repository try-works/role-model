import type {
  DeclaredCapabilityProfile,
  EndpointIdentity,
  ObservedPerformanceProfile,
  RoleBinding,
  RoleDefinition,
  RouterDecision,
  RoutingPolicy,
  TaskDefinition,
} from "@role-model/protocol-types";

export type RoutingStrategy =
  | "balanced"
  | "latency"
  | "quality"
  | "cost"
  | "low-latency"
  | "high-quality"
  | "low-cost";
export type RoutingPolicyStrategy = RoutingPolicy["strategy"];
export type EndpointStatus = "active" | "offline" | "revoked" | (string & {});

export type EndpointIdentityRecord = EndpointIdentity;
export type DeclaredCapabilityProfileRecord = DeclaredCapabilityProfile;
export type ObservedPerformanceProfileRecord = ObservedPerformanceProfile;
export type RoleDefinitionRecord = RoleDefinition;
export type TaskDefinitionRecord = TaskDefinition;
export type RoleBindingRecord = RoleBinding;
export type RoutingPolicySnapshot = RoutingPolicy;
export type RouterDecisionRecord = RouterDecision;
export type CandidateEligibility = RouterDecisionRecord["eligibility"][number];
export type CandidateExclusion = CandidateEligibility["exclusions"][number];
export type ScoredCandidate = RouterDecisionRecord["scored_candidates"][number];

export interface RuntimeRoutingSignals {
  continuityAffinity?: boolean;
  cacheAffinity?: boolean;
  routingModelRank?: number;
  catalogCostEstimate?: CatalogCostEstimateSignals;
}

export interface CatalogCostEstimateSignals {
  readonly canonicalModelId: string;
  readonly tokenEconomicsSource: "catalog" | "local-free" | "unknown";
  readonly inputPer1M: number | null;
  readonly outputPer1M: number | null;
  readonly estimatedRequestUsd: number | null;
  readonly cost_per_1k_tokens_est: number | null;
  /**
   * models.dev context tiers for the model, when the catalog publishes them. A request longer
   * than a tier's threshold bills the whole request at that tier's rates, so downstream cost
   * consumers (for example measured-usage estimates) must apply the same tiers as the router.
   */
  readonly costTiers?: readonly CatalogCostEstimateTier[];
}

export interface CatalogCostEstimateTier {
  readonly minContextTokens: number;
  readonly inputPer1M: number;
  readonly outputPer1M: number;
}

export interface RuntimeEligibilitySignals {
  accountDisabled?: boolean;
  authUnavailable?: boolean;
  quotaExhausted?: boolean;
  budgetExceeded?: boolean;
  regionDisallowed?: boolean;
  entitlementMissing?: boolean;
  providerUnavailable?: boolean;
  deploymentClassMismatch?: boolean;
}

export interface ObservedDataConfigRecord {
  enabled: boolean;
  aggregation: {
    minSamples: number;
  };
  metricDecayPercentPerDay: {
    latency: number;
    throughput: number;
  };
  throughputSla: {
    enabled: boolean;
    minTokensPerSec: number;
    penaltyTimeoutMs: number;
    penaltyFactor: number;
  };
  benchmarkTaskBlendWeight?: number;
  telemetryAdvisoryFailureThreshold?: number;
  telemetryAdvisoryPenalty?: number;
}

export interface ThroughputPenaltyStateRecord {
  endpointId: string;
  lastObservedTokensPerSec: number;
  minTokensPerSec: number;
  penaltyFactor: number;
  activatedAtMs: number;
  expiresAtMs: number;
  lastObservationMeasuredAtMs: number;
}

export interface EndpointCandidate {
  identity: EndpointIdentityRecord;
  declared: DeclaredCapabilityProfileRecord;
  observed?: ObservedPerformanceProfileRecord;
  status: EndpointStatus;
  deniedByPolicy?: boolean;
  runtimeEligibility?: RuntimeEligibilitySignals;
  routingSignals?: RuntimeRoutingSignals;
  readonly benchmarkCapability?: {
    readonly evidenceSource?: "run-artifact" | "profile-derived";
    readonly overallScore?: number | null;
    readonly relatedEffortOverallScore?: number | null;
    readonly lastRunId?: string | null;
    readonly lastRunCompletedAtMs?: number | null;
    readonly lastRunMode?: "quick" | "full" | null;
    readonly lastRunSuiteId?: string | null;
    readonly judgeEndpointId?: string | null;
    readonly judgeModelId?: string | null;
    readonly taskScores?: Record<string, number>;
    readonly roleScores?: Record<string, number>;
    readonly eligibleRoleScores?: Record<string, number>;
    readonly groupScores?: Record<string, number>;
    readonly coverage?: {
      readonly overallCases: number;
      readonly roleCases?: Record<string, number>;
      readonly groupCases?: Record<string, number>;
      readonly lowCoverageRoleIds?: readonly string[];
      readonly lowCoverageGroupIds?: readonly string[];
    };
  };
  readonly telemetryScores?: {
    readonly taskSuccessRates?: Record<string, number>;
    readonly taskRollups?: Record<
      string,
      {
        readonly successRate: number;
        readonly successCount: number;
        readonly failureCount: number;
        readonly sampleCount: number;
        readonly minimumSampleCount: number;
        readonly windowStartMs: number;
        readonly windowEndMs: number;
        readonly measuredAtMs: number;
      }
    >;
  };
}

export interface RoutingRequest {
  requestId: string;
  appId?: string;
  orgId?: string | null;
  roleModelIntent?: RoutingIntent;
  requestedRoleId?: string;
  taskType: string;
  requiredCapabilities: readonly string[];
  preferredCapabilities: readonly string[];
  requiredModalities: readonly string[];
  contextTokens: number;
  needsTools: boolean;
  strategy: RoutingStrategy;
  preferLocal: boolean;
  computePreference?: RoutingPolicySnapshot["compute_preference"];
  budgetLimit?: number;
  budgetMode?: "strict" | "advisory" | "disabled";
  denyRemote?: boolean;
  denyEndpoints?: readonly string[];
  allowEndpoints?: readonly string[];
  denyProviderKinds?: readonly string[];
  allowProviderKinds?: readonly string[];
}

export interface RoutingIntent {
  contractVersion?: number;
  taxonomyVersion: string;
  contentRevision?: string;
  classificationContractVersion: string;
  role?: {
    id: string;
    hard?: boolean;
  };
  task?: {
    id: string;
    hard?: boolean;
  };
  capabilities?: {
    required?: readonly string[];
    preferred?: readonly string[];
  };
  modalities?: {
    required?: readonly string[];
    output?: readonly string[];
  };
  toolClasses?: readonly string[];
  source?: "explicit_user" | "trusted_context" | "heuristic" | "runtime" | (string & {});
  roleSource?: "explicit_user" | "trusted_context" | "heuristic" | "runtime" | (string & {});
  taskSource?: "explicit_user" | "trusted_context" | "heuristic" | "runtime" | (string & {});
  confidence?: number;
  taskConfidence?: number;
  taskAction?: string;
  taskVariant?: string | null;
  evidence?: readonly string[];
  alternatives?: readonly {
    roleId?: string;
    taskType?: string;
    confidence?: number;
  }[];
}

export type EffortResolutionKind =
  | "router_managed"
  | "exact_primary"
  | "exact_fallback_expanded"
  | "unsupported_fallback"
  | "strict_rejected"
  | "equivalent_mapped";

export interface EffortResolution {
  readonly resolution: EffortResolutionKind;
  readonly effectiveEffort: string | null;
  /**
   * Run 106 R10: the client's requested reasoning effort, when one was supplied. Carries the
   * client request across the router so the decision record can explain what was requested even
   * when it degrades to unsupported_fallback (effectiveEffort null).
   */
  readonly requestedEffort?: string | null;
  /**
   * Run 106 R10: the client's requested effort policy (strict | preferred | router). Absent when
   * the client omitted effort and the host resolved router-managed.
   */
  readonly requestedPolicy?: "strict" | "preferred" | "router";
  /**
   * Run 106 R4: the client's effort source (named | disabled | none), carried so the decision can
   * emit the lossless four-state effort_source instead of collapsing no-client-preference onto
   * provider_default. Absent on legacy paths, where the router falls back to the chosen arm's
   * identity (provider_default | named).
   */
  readonly source?: EffortSource;
}

export interface RouteRequestInput {
  request: RoutingRequest;
  candidates: readonly EndpointCandidate[];
  roleDefinitions?: readonly RoleDefinitionRecord[];
  taskDefinitions?: readonly TaskDefinitionRecord[];
  roleBindings?: readonly RoleBindingRecord[];
  observedDataConfig?: ObservedDataConfigRecord;
  throughputPenaltyStateByEndpointId?: Record<string, ThroughputPenaltyStateRecord>;
  routingTimeMs?: number;
  /**
   * Run 98 R5 (stage S2, advisory-considered): the operator-policy-gated advisory input.
   * Hard eligibility and scoring run first; the advisory can only re-rank candidates that
   * are already eligible and only within the configured score band. The host passes this
   * only when the effective learning stage is S2 or above, so an S1 runtime produces the
   * exact same decision it produced before.
   */
  advisoryConsideration?: RouteAdvisoryConsiderationInput;
  /**
   * Run 106 R10: the effort policy resolution the host computed before narrowing the pool.
   * Recorded verbatim on the decision so provenance (resolution kind + effective effort)
   * survives the router's own scoring/selection pass.
   */
  effortResolution?: EffortResolution;
}

export interface RouteAdvisoryConsiderationInput {
  /** The learned candidate the advisory was derived from. */
  readonly candidateId: string | null;
  /** The route package/endpoint the advisory prefers. */
  readonly preferredEndpointId: string | null;
  readonly advisoryState: "fresh" | "stale" | "unavailable";
  readonly confidence: number;
  readonly advisoryId?: string | null;
  readonly policyVersion?: string | null;
  readonly stage: "S0" | "S1" | "S2" | "S3" | "S4";
  /** Largest score shift the advisory may apply, in the router's normalized score units. */
  readonly scoreBand: number;
  readonly minAdvisoryConfidence: number;
  /** Percentage of decisions the advisory may influence (S3+); 100 for S2. */
  readonly cohortPercent: number;
  /** Randomized exploration share within the band; 0 keeps the tie-break deterministic. */
  readonly explorationPercent?: number;
  readonly killSwitch?: boolean;
  readonly thresholdSetVersion?: string | null;
  /**
   * Run 99 R33 (addendum 19 S35, addendum 20 D1-D3): the task family this advisory may
   * influence, and the taxonomy identity it was learned under. Canonical
   * `EndpointPreferenceRecordV1` applicability travels as `preferredFor`/`avoidFor`
   * (`guidance/19`), so a preference learned from one family cannot move another family's
   * traffic. A mismatch is refused before the confidence floor.
   */
  readonly taskTypeId?: string | null;
  readonly taxonomyVersion?: string | null;
  readonly preferredFor?: readonly string[];
  readonly avoidFor?: readonly string[];
  /**
   * Run 99 R33: the taxonomy identity the host resolved the *request* against, so the router can
   * fail closed when the advisory was learned under a different taxonomy revision.
   */
  readonly requestTaxonomyVersion?: string | null;
}

export interface RouteAdvisoryConsiderationOutcome {
  readonly applied: boolean;
  readonly explorationMode: "baseline" | "advisory_considered" | "advisory_exploration";
  readonly selectionProbability: number | null;
  readonly advisoryCandidateId: string | null;
  readonly advisoryPackageId: string | null;
  readonly advisoryConfidence: number;
  readonly thresholdSetVersion: string | null;
  readonly policyVersion: string | null;
  readonly fallbackReason: string | null;
  readonly scoreBand: number;
  readonly scoreGapBefore: number | null;
  readonly cohortBucket: number | null;
  /** Run 99 R33: the scope that actually decided the family gate. */
  readonly advisoryTaskTypeId: string | null;
  readonly requestTaskTypeId: string | null;
  readonly advisoryTaxonomyVersion: string | null;
}

/**
 * Run 106 / R4: lossless effort-source states.
 *
 * Four mutually-exclusive states keep the effort dimension distinct through every layer:
 * - `named`: a concrete named reasoning-effort level was requested/applied (reasoningEffort is the level).
 * - `disabled`: reasoning was explicitly disabled (reasoningEffort is null).
 * - `provider_default`: the provider-default instance applies (reasoningEffort is null).
 * - `none`: no client preference; the router manages effort (reasoningEffort is null).
 */
export type EffortSource = "named" | "disabled" | "provider_default" | "none";

/**
 * Historical effort-source values that remain readable and migrate deterministically onto the
 * canonical `EffortSource` vocabulary. `variant_coerced` keeps its coercion attribution through
 * the `coerced` flag rather than being silently flattened into a plain named effort.
 */
export type LegacyEffortSource = "client" | "variant" | "variant_coerced";

/** Any value that may appear in serialized or persisted rows, including legacy values. */
export type EffortSourceValue = EffortSource | LegacyEffortSource;

export interface NormalizedEffortSource {
  readonly source: EffortSource;
  /** True when the named effort was coerced from a variant (historical `variant_coerced`). */
  readonly coerced: boolean;
}

/**
 * Normalize a persisted or wire effort-source value onto the canonical four-state vocabulary.
 *
 * - Canonical values pass through unchanged.
 * - Legacy named sources (`client`, `variant`) collapse onto `named`; their only distinction was
 *   who named the effort, which the lossless vocabulary does not carry.
 * - `variant_coerced` stays readable as a coerced `named` effort.
 * - `null`, `undefined`, and the empty string migrate deterministically to `provider_default`,
 *   matching the historical "null effort means the provider-default instance" semantics.
 * - Unrecognized values are rejected rather than silently dropped.
 */
export function normalizeEffortSource(
  value: EffortSourceValue | string | null | undefined,
): NormalizedEffortSource {
  if (value === null || value === undefined || value === "") {
    return { source: "provider_default", coerced: false };
  }
  switch (value) {
    case "named":
      return { source: "named", coerced: false };
    case "disabled":
      return { source: "disabled", coerced: false };
    case "provider_default":
      return { source: "provider_default", coerced: false };
    case "none":
      return { source: "none", coerced: false };
    case "client":
    case "variant":
      return { source: "named", coerced: false };
    case "variant_coerced":
      return { source: "named", coerced: true };
    default:
      throw new Error(`Unrecognized effort_source value: ${JSON.stringify(value)}.`);
  }
}
