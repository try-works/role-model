export type RoutingStrategy = "balanced" | "low-latency" | "high-quality" | "low-cost";
export type EndpointStatus = "active" | "offline" | "revoked" | (string & {});

export interface EndpointIdentityRecord {
  endpoint_id: string;
  endpoint_kind: string;
  provider_kind: string;
  serving_source: string;
  model_id: string;
  package_id: string;
  variant_id: string;
  runtime_version: string;
  quantization: string;
  precision: string;
  host_class: string;
  device_class: string;
  region: string;
  org_scope: string;
}

export interface DeclaredCapabilityProfileRecord {
  endpoint_id: string;
  capabilities: readonly string[];
  modalities: readonly string[];
  max_context_tokens: number;
  tool_calling: boolean;
  supports_embeddings: boolean;
  platform_constraints: readonly string[];
}

export interface ObservedPerformanceProfileRecord {
  endpoint_id: string;
  judge_score: number;
  latency_ms_p50: number;
  latency_ms_p95: number;
  tokens_per_sec: number;
  cold_start_ms: number;
  failure_rate: number;
  cost_per_1k_tokens_est: number;
  freshness_score: number;
  confidence_score: number;
}

export interface EndpointCandidate {
  identity: EndpointIdentityRecord;
  declared: DeclaredCapabilityProfileRecord;
  observed?: ObservedPerformanceProfileRecord;
  status: EndpointStatus;
  deniedByPolicy?: boolean;
}

export interface RoutingRequest {
  requestId: string;
  taskType: string;
  requiredCapabilities: readonly string[];
  preferredCapabilities: readonly string[];
  requiredModalities: readonly string[];
  contextTokens: number;
  needsTools: boolean;
  strategy: RoutingStrategy;
  preferLocal: boolean;
  budgetLimit?: number;
  denyRemote?: boolean;
}

export interface RoutingPolicySnapshot {
  policy_id: string;
  strategy: RoutingStrategy;
  prefer_local: boolean;
  budget_mode: "strict" | "advisory" | "disabled";
  tie_break_order: readonly string[];
}

export interface IneligibleCandidate {
  endpoint_id: string;
  reasons: readonly string[];
}

export interface ScoredCandidate {
  endpoint_id: string;
  score: number;
}

export interface RouterDecisionRecord {
  routing_decision_id: string;
  request_id: string;
  policy_snapshot: RoutingPolicySnapshot;
  eligible_candidates: readonly string[];
  ineligible_candidates: readonly IneligibleCandidate[];
  scored_candidates: readonly ScoredCandidate[];
  chosen_endpoint_id: string;
  fallback_endpoint_ids: readonly string[];
  selection_reasons: readonly string[];
  used_measured: boolean;
  used_declared: boolean;
  scoring_version: string;
}

export interface RouteRequestInput {
  request: RoutingRequest;
  candidates: readonly EndpointCandidate[];
}
