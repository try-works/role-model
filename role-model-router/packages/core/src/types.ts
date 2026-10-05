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
}

/**
 * Run 105 R4 (stage 3): one rung of the per-(role, task) endpoint ladder.
 *
 * `status` is the STORED user-removal flag ("available"/"unavailable"); the router's
 * per-request eligibility is applied separately at walk time (R4 - the two filters are
 * deliberately independent). Ranks are 1-based and ascending.
 */
export interface RouteAdvisoryRung {
  readonly endpointId: string;
  readonly rank: number;
  readonly status: "available" | "unavailable";
}

/**
 * Run 105 R1: the (role, task) scope one advisory was learned under. `taxonomyVersion` is
 * PROVENANCE only (addendum A1) - the match key is `(roleId, taskTypeId)` exact, and the
 * pre-existing taxonomy gate is unchanged.
 */
export interface RouteLearningAdvisoryScope {
  readonly roleId: string;
  readonly taskTypeId: string;
  readonly taxonomyVersion: string | null;
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
   * Run 105 R4/R5 (stage 3): the per-(role, task) endpoint ladder this advisory was derived
   * from, rank-ordered best-first. When present the router WALKS it, skipping only the rungs
   * that are not routable (`status: unavailable`, or not in the request's eligible set) and
   * taking the first routable rung as `preferredEndpointId`. The walk is deliberately NOT
   * band-aware (addendum A2): the existing score band still decides whether the walked
   * preference is APPLIED. Absent -> byte-for-byte pre-run105 behaviour.
   */
  readonly preferredLadder?: readonly RouteAdvisoryRung[];
  /**
   * Run 105 R1: the role the advisory was learned for. The match key is
   * `(roleId, taskTypeId)` exact; a mismatch is refused with the EXISTING
   * `advisory_task_mismatch` code rather than a new vocabulary.
   */
  readonly roleId?: string | null;
  /**
   * Run 99 R33: the taxonomy identity the host resolved the *request* against, so the router can
   * fail closed when the advisory was learned under a different taxonomy revision.
   */
  readonly requestTaxonomyVersion?: string | null;
  /**
   * Run 105 R1: the role the REQUEST was routed with, so the advisory can be role-checked the
   * same way it is already task-checked. `null` keeps the pre-run105 behaviour (no role gate).
   */
  readonly requestRoleId?: string | null;
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
  /**
   * Run 99 R27: these two are produced by the gate and consumed by the live observation
   * (index.ts) but were never declared (run 105 C14). Declaring them is additive: no runtime
   * value changes.
   */
  readonly advisoryPackageEligible: boolean;
  readonly eligibleEndpointCount: number;
  /**
   * Run 105 C13/R13: the ladder walk's own evidence. `advisoryLadderLength` is the number of
   * rungs offered, `advisoryRungRank`/`advisoryRungWalked` name the rung the walk landed on
   * (null when it landed on none), and `advisoryRungSkipped` counts the non-routable rungs it
   * passed over (bounded to 32). All four are omitted when no ladder was supplied.
   */
  readonly advisoryLadderLength?: number;
  readonly advisoryRungRank?: number | null;
  readonly advisoryRungWalked?: string | null;
  readonly advisoryRungSkipped?: number;
  /** Run 105 R1: the scope the walk actually read, for the observation. */
  /** Run 105 C11: present only when a role was actually in play (byte-compat when null). */
  readonly advisoryRoleId?: string | null;
  /** Run 105 C11: present only when the request declared a role (byte-compat when null). */
  readonly requestRoleId?: string | null;
}
