export type RoutingStrategy =
  | "balanced"
  | "latency"
  | "quality"
  | "cost"
  | "low-latency"
  | "high-quality"
  | "low-cost";
export type RoutingPolicyStrategy = "balanced" | "cost" | "latency" | "quality";
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
  tool_calling: {
    supported: boolean;
    style: "openai" | "json" | "none";
  };
  supports_embeddings: boolean;
  platform_constraints: readonly string[];
}

export interface ObservedPerformanceProfileRecord {
  endpoint_id: string;
  judge_score: number;
  quality_score?: number;
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

export interface RoleDefinitionRecord {
  role_id: string;
  name: string;
  description: string;
  role_kind: string;
  default_system_instructions: string;
  task_types_supported: readonly string[];
  required_capabilities: readonly string[];
  preferred_capabilities: readonly string[];
  forbidden_capabilities: readonly string[];
  tool_policy: {
    mode: "disabled" | "limited" | "allowed";
    allowed_tools?: readonly string[];
  };
  routing_policy_overrides: Record<string, unknown>;
  output_contracts: readonly string[];
  safety_policy_refs: readonly string[];
}

export interface TaskDefinitionRecord {
  task_type: string;
  description: string;
  required_inputs: readonly string[];
  required_capabilities: readonly string[];
  preferred_capabilities: readonly string[];
  quality_metrics: readonly string[];
  allowed_roles: readonly string[];
  default_benchmark_suites: readonly string[];
}

export interface RoleBindingRecord {
  binding_id: string;
  role_id: string;
  endpoint_id: string;
  status: "active" | "disabled" | "candidate";
  policy_overrides: Record<string, unknown>;
  effective_capabilities: readonly string[];
  effective_task_types: readonly string[];
}

export interface RoutingRequest {
  requestId: string;
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
  denyRemote?: boolean;
  denyEndpoints?: readonly string[];
  allowEndpoints?: readonly string[];
  denyProviderKinds?: readonly string[];
  allowProviderKinds?: readonly string[];
}

export interface RoutingPolicySnapshot {
  policy_id: string;
  strategy: RoutingPolicyStrategy;
  compute_preference: "auto" | "local" | "remote" | "hybrid";
  required_capabilities: readonly string[];
  required_modalities: readonly string[];
  require_tools: boolean;
  deny_endpoints: readonly string[];
  allow_endpoints: readonly string[];
  deny_provider_kinds: readonly string[];
  allow_provider_kinds: readonly string[];
  budget: {
    enabled: boolean;
    currency: string;
    max_cost_per_request?: number;
    target_cost_per_request?: number;
  };
  privacy: {
    allow_remote: boolean;
  };
  targets: {
    latency_target_ms: number;
    latency_max_ms: number;
    throughput_target_tps: number;
  };
  prefer_local?: boolean;
  budget_mode?: "strict" | "advisory" | "disabled";
  tie_break_order?: readonly string[];
}

export interface CandidateExclusion {
  code: string;
  detail: string;
}

export interface CandidateEligibility {
  endpoint_id: string;
  eligible: boolean;
  exclusions: readonly CandidateExclusion[];
}

export interface ScoredCandidate {
  endpoint_id: string;
  score: number;
}

export interface RouterDecisionRecord {
  routing_decision_id: string;
  request_id: string;
  policy_snapshot: RoutingPolicySnapshot;
  eligibility: readonly CandidateEligibility[];
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
  roleDefinitions?: readonly RoleDefinitionRecord[];
  taskDefinitions?: readonly TaskDefinitionRecord[];
  roleBindings?: readonly RoleBindingRecord[];
}
