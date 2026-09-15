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
