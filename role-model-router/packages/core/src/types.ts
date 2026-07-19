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
    readonly overallScore?: number | null;
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
}
