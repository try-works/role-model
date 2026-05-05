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

export interface EndpointCandidate {
  identity: EndpointIdentityRecord;
  declared: DeclaredCapabilityProfileRecord;
  observed?: ObservedPerformanceProfileRecord;
  status: EndpointStatus;
  deniedByPolicy?: boolean;
  runtimeEligibility?: RuntimeEligibilitySignals;
  routingSignals?: RuntimeRoutingSignals;
}

export interface RoutingRequest {
  requestId: string;
  appId?: string;
  orgId?: string | null;
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

export interface RouteRequestInput {
  request: RoutingRequest;
  candidates: readonly EndpointCandidate[];
  roleDefinitions?: readonly RoleDefinitionRecord[];
  taskDefinitions?: readonly TaskDefinitionRecord[];
  roleBindings?: readonly RoleBindingRecord[];
}
