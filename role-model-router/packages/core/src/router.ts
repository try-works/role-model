import type {
  CandidateExclusion,
  EndpointCandidate,
  RoleBindingRecord,
  RoleDefinitionRecord,
  RouteRequestInput,
  RouterDecisionRecord,
  RoutingPolicySnapshot,
  RoutingPolicyStrategy,
  ScoredCandidate,
  TaskDefinitionRecord,
} from "./types.js";

function isLocalCandidate(candidate: EndpointCandidate): boolean {
  return (
    candidate.identity.serving_source === "local-process" || candidate.identity.region === "local"
  );
}

function unique<TValue extends string>(values: readonly TValue[]): TValue[] {
  return [...new Set(values)];
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

const SCORE_TIE_EPSILON = 0.01;
const LATENCY_TARGET_MS = 150;
const LATENCY_MAX_MS = 300;
const THROUGHPUT_TARGET_TPS = 40;
const DEFAULT_COST_TARGET = 0.01;
const FRESHNESS_NEUTRAL = 0.5;
const RELIABILITY_NEUTRAL = 0.7;
const STRATEGY_WEIGHTS: Record<
  RoutingPolicyStrategy,
  Record<"quality" | "latency" | "throughput" | "cost" | "reliability" | "preference", number>
> = {
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
};

type ScoringMetricName =
  | "quality"
  | "latency"
  | "throughput"
  | "cost"
  | "reliability"
  | "preference";

type MetricSource = "measured" | "declared" | "default";
type MetricEntry = {
  value: number;
  source: MetricSource;
  raw?: Record<string, unknown>;
};
type CandidateMetricScores = Record<ScoringMetricName, MetricEntry>;
type TieBreakDiagnostic = {
  quality: number;
  latency_ms: number;
  reliability: number;
  endpoint_id: string;
};
type SelectionReasonCode = RouterDecisionRecord["selection_reasons"][number];
type CandidateScoreResult = ScoredCandidate & {
  selectionReasons: SelectionReasonCode[];
  usedMeasured: boolean;
  usedDeclared: boolean;
};

function getFreshnessWeight(input: RouteRequestInput, candidate: EndpointCandidate, halflifeMs: number): number {
  const measuredAtMs = candidate.observed?.measured_at_ms;
  if (!input.observedDataConfig?.enabled || typeof measuredAtMs !== "number") {
    return 1;
  }
  if (typeof input.routingTimeMs !== "number") {
    return 1;
  }
  const ageMs = Math.max(0, input.routingTimeMs - measuredAtMs);
  if (ageMs === 0) {
    return 1;
  }
  return Math.exp((-Math.LN2 * ageMs) / halflifeMs);
}

function decayToNeutral(observedValue: number, neutralValue: number, freshnessWeight: number): number {
  return neutralValue + freshnessWeight * (observedValue - neutralValue);
}

function getActiveThroughputPenaltyState(
  input: RouteRequestInput,
  candidate: EndpointCandidate,
): NonNullable<RouteRequestInput["throughputPenaltyStateByEndpointId"]>[string] | undefined {
  const state = input.throughputPenaltyStateByEndpointId?.[candidate.identity.endpoint_id];
  if (!input.observedDataConfig?.throughputSla.enabled || !state) {
    return undefined;
  }
  if (typeof input.routingTimeMs === "number" && state.expiresAtMs < input.routingTimeMs) {
    return undefined;
  }
  return state;
}

function getRequestedRoleAndTask(input: RouteRequestInput): {
  requestedRole: RoleDefinitionRecord | undefined;
  requestedTask: TaskDefinitionRecord | undefined;
} {
  const requestedRole = input.request.requestedRoleId
    ? input.roleDefinitions?.find((role) => role.role_id === input.request.requestedRoleId)
    : undefined;
  const requestedTask = input.taskDefinitions?.find(
    (task) => task.task_type === input.request.taskType,
  );

  return { requestedRole, requestedTask };
}

function getEffectiveRequiredCapabilities(input: RouteRequestInput): string[] {
  const { requestedRole, requestedTask } = getRequestedRoleAndTask(input);
  return unique([
    ...input.request.requiredCapabilities,
    ...(requestedRole?.required_capabilities ?? []),
    ...(requestedTask?.required_capabilities ?? []),
  ]);
}

function getEffectivePreferredCapabilities(input: RouteRequestInput): string[] {
  const { requestedRole, requestedTask } = getRequestedRoleAndTask(input);
  return unique([
    ...input.request.preferredCapabilities,
    ...(requestedRole?.preferred_capabilities ?? []),
    ...(requestedTask?.preferred_capabilities ?? []),
  ]);
}

function toPolicyStrategy(
  strategy: RouteRequestInput["request"]["strategy"],
): RoutingPolicyStrategy {
  switch (strategy) {
    case "cost":
    case "low-cost":
      return "cost";
    case "latency":
    case "low-latency":
      return "latency";
    case "quality":
    case "high-quality":
      return "quality";
    default:
      return "balanced";
  }
}

function getRequestedComputePreference(
  request: RouteRequestInput["request"],
): RoutingPolicySnapshot["compute_preference"] {
  if (request.denyRemote) {
    return "local";
  }
  if (request.computePreference) {
    return request.computePreference;
  }
  if (request.preferLocal) {
    return "local";
  }
  return "auto";
}

function getBudgetMode(request: RouteRequestInput["request"]): "strict" | "advisory" | "disabled" {
  if (request.budgetMode) {
    return request.budgetMode;
  }
  if (typeof request.budgetLimit === "number") {
    return "strict";
  }
  return "disabled";
}

function buildBasePolicySnapshot(input: RouteRequestInput): RoutingPolicySnapshot {
  const budgetEnabled = typeof input.request.budgetLimit === "number";
  return {
    policy_id: `${input.request.strategy}-policy`,
    strategy: toPolicyStrategy(input.request.strategy),
    compute_preference: getRequestedComputePreference(input.request),
    prefer_local: input.request.preferLocal,
    budget_mode: getBudgetMode(input.request),
    tie_break_order: ["quality", "latency_ms", "reliability", "endpoint_id"],
    required_capabilities: getEffectiveRequiredCapabilities(input),
    required_modalities: [...input.request.requiredModalities],
    require_tools: input.request.needsTools,
    deny_endpoints: [...(input.request.denyEndpoints ?? [])],
    allow_endpoints: [...(input.request.allowEndpoints ?? [])],
    deny_provider_kinds: [...(input.request.denyProviderKinds ?? [])],
    allow_provider_kinds: [...(input.request.allowProviderKinds ?? [])],
    budget: {
      enabled: budgetEnabled,
      currency: "USD",
      ...(budgetEnabled
        ? {
            max_cost_per_request: input.request.budgetLimit,
            target_cost_per_request: input.request.budgetLimit,
          }
        : {}),
    },
    privacy: {
      allow_remote: !input.request.denyRemote,
    },
    targets: {
      latency_target_ms: LATENCY_TARGET_MS,
      latency_max_ms: LATENCY_MAX_MS,
      throughput_target_tps: THROUGHPUT_TARGET_TPS,
    },
  };
}

function mergePolicyOverrides(
  base: RoutingPolicySnapshot,
  overrides: Record<string, unknown> | undefined,
): RoutingPolicySnapshot {
  if (!overrides || Object.keys(overrides).length === 0) {
    return base;
  }

  const override = overrides as Partial<RoutingPolicySnapshot>;
  return {
    ...base,
    ...override,
    budget: override.budget ? { ...base.budget, ...override.budget } : base.budget,
    privacy: override.privacy ? { ...base.privacy, ...override.privacy } : base.privacy,
    targets: override.targets ? { ...base.targets, ...override.targets } : base.targets,
    required_capabilities: override.required_capabilities ?? base.required_capabilities,
    required_modalities: override.required_modalities ?? base.required_modalities,
    deny_endpoints: override.deny_endpoints ?? base.deny_endpoints,
    allow_endpoints: override.allow_endpoints ?? base.allow_endpoints,
    deny_provider_kinds: override.deny_provider_kinds ?? base.deny_provider_kinds,
    allow_provider_kinds: override.allow_provider_kinds ?? base.allow_provider_kinds,
    tie_break_order: override.tie_break_order ?? base.tie_break_order,
  };
}

function buildPolicySnapshot(input: RouteRequestInput): {
  policySnapshot: RoutingPolicySnapshot;
  rolePolicyApplied: boolean;
} {
  const { requestedRole } = getRequestedRoleAndTask(input);
  const basePolicySnapshot = buildBasePolicySnapshot(input);
  const rolePolicyApplied = Boolean(
    requestedRole?.routing_policy_overrides &&
      Object.keys(requestedRole.routing_policy_overrides).length > 0,
  );

  return {
    policySnapshot: mergePolicyOverrides(basePolicySnapshot, requestedRole?.routing_policy_overrides),
    rolePolicyApplied,
  };
}

function findEligibleCandidate(
  candidates: readonly EndpointCandidate[],
  endpointId: string,
): EndpointCandidate {
  const candidate = candidates.find((item) => item.identity.endpoint_id === endpointId);
  if (!candidate) {
    throw new Error(`Eligible candidate ${endpointId} was not found during tie-break evaluation.`);
  }

  return candidate;
}

function getRoleBindingForCandidate(
  candidate: EndpointCandidate,
  input: RouteRequestInput,
): RoleBindingRecord | undefined {
  if (!input.request.requestedRoleId) {
    return undefined;
  }

  return input.roleBindings?.find(
    (binding) =>
      binding.endpoint_id === candidate.identity.endpoint_id &&
      binding.role_id === input.request.requestedRoleId,
  );
}

function getEffectiveLatency(candidate: EndpointCandidate): number {
  if (
    typeof candidate.observed?.latency_ms_p50 === "number" &&
    typeof candidate.observed?.latency_ms_p95 === "number"
  ) {
    return (
      candidate.observed.latency_ms_p50 +
      0.25 * Math.max(0, candidate.observed.latency_ms_p95 - candidate.observed.latency_ms_p50)
    );
  }

  return 250;
}

function getQualityMetric(candidate: EndpointCandidate, input: RouteRequestInput): MetricEntry {
  if (typeof candidate.observed?.judge_score === "number") {
    const freshnessWeight = getFreshnessWeight(
      input,
      candidate,
      input.observedDataConfig?.metricHalflives.qualityMs ?? 1,
    );
    const observedValue = clamp(candidate.observed.judge_score);
    const value = input.observedDataConfig?.enabled
      ? decayToNeutral(observedValue, FRESHNESS_NEUTRAL, freshnessWeight)
      : observedValue;
    return {
      value,
      source: "measured",
      raw: {
        judge_score: candidate.observed.judge_score,
        measured_at_ms: candidate.observed.measured_at_ms,
        freshness_weight: freshnessWeight,
        neutral_value: FRESHNESS_NEUTRAL,
        effective_value: value,
      },
    };
  }

  if (typeof candidate.observed?.quality_score === "number") {
    const freshnessWeight = getFreshnessWeight(
      input,
      candidate,
      input.observedDataConfig?.metricHalflives.qualityMs ?? 1,
    );
    const observedValue = clamp(candidate.observed.quality_score);
    const value = input.observedDataConfig?.enabled
      ? decayToNeutral(observedValue, FRESHNESS_NEUTRAL, freshnessWeight)
      : observedValue;
    return {
      value,
      source: "measured",
      raw: {
        quality_score: candidate.observed.quality_score,
        measured_at_ms: candidate.observed.measured_at_ms,
        freshness_weight: freshnessWeight,
        neutral_value: FRESHNESS_NEUTRAL,
        effective_value: value,
      },
    };
  }

  return {
    value: 0.5,
    source: "default",
  };
}

function getLatencyMetric(
  candidate: EndpointCandidate,
  policySnapshot: RoutingPolicySnapshot,
  input: RouteRequestInput,
): MetricEntry {
  if (
    typeof candidate.observed?.latency_ms_p50 !== "number" ||
    typeof candidate.observed?.latency_ms_p95 !== "number"
  ) {
    return {
      value: 0.5,
      source: "default",
    };
  }

  const effectiveLatencyMs = getEffectiveLatency(candidate);
  const normalized =
    1 -
    Math.log1p(effectiveLatencyMs / policySnapshot.targets.latency_target_ms) /
      Math.log1p(policySnapshot.targets.latency_max_ms / policySnapshot.targets.latency_target_ms);
  const observedValue = clamp(normalized);
  const freshnessWeight = getFreshnessWeight(
    input,
    candidate,
    input.observedDataConfig?.metricHalflives.latencyMs ?? 1,
  );
  const value = input.observedDataConfig?.enabled
    ? decayToNeutral(observedValue, FRESHNESS_NEUTRAL, freshnessWeight)
    : observedValue;

  return {
    value,
    source: "measured",
    raw: {
      latency_ms_p50: candidate.observed.latency_ms_p50,
      latency_ms_p95: candidate.observed.latency_ms_p95,
      effective_latency_ms: effectiveLatencyMs,
      measured_at_ms: candidate.observed.measured_at_ms,
      freshness_weight: freshnessWeight,
      neutral_value: FRESHNESS_NEUTRAL,
      observed_value: observedValue,
      effective_value: value,
    },
  };
}

function getThroughputMetric(
  candidate: EndpointCandidate,
  policySnapshot: RoutingPolicySnapshot,
  input: RouteRequestInput,
): MetricEntry {
  if (typeof candidate.observed?.tokens_per_sec !== "number") {
    return {
      value: 0.5,
      source: "default",
    };
  }

  const normalized =
    Math.log1p(candidate.observed.tokens_per_sec) /
    Math.log1p(policySnapshot.targets.throughput_target_tps);
  const observedValue = clamp(normalized);
  const freshnessWeight = getFreshnessWeight(
    input,
    candidate,
    input.observedDataConfig?.metricHalflives.throughputMs ?? 1,
  );
  const decayedValue = input.observedDataConfig?.enabled
    ? decayToNeutral(observedValue, FRESHNESS_NEUTRAL, freshnessWeight)
    : observedValue;
  const activePenaltyState = getActiveThroughputPenaltyState(input, candidate);
  const value =
    activePenaltyState && activePenaltyState.penaltyFactor > 0
      ? clamp(decayedValue * activePenaltyState.penaltyFactor)
      : decayedValue;
  return {
    value,
    source: "measured",
    raw: {
      tokens_per_sec: candidate.observed.tokens_per_sec,
      measured_at_ms: candidate.observed.measured_at_ms,
      freshness_weight: freshnessWeight,
      neutral_value: FRESHNESS_NEUTRAL,
      observed_value: observedValue,
      effective_value: value,
      ...(activePenaltyState
        ? {
            throughput_penalty: {
              penalty_factor: activePenaltyState.penaltyFactor,
              activated_at_ms: activePenaltyState.activatedAtMs,
              expires_at_ms: activePenaltyState.expiresAtMs,
              min_tokens_per_sec: activePenaltyState.minTokensPerSec,
              last_observed_tokens_per_sec: activePenaltyState.lastObservedTokensPerSec,
            },
          }
        : {}),
    },
  };
}

function getCostMetric(
  candidate: EndpointCandidate,
  policySnapshot: RoutingPolicySnapshot,
  input: RouteRequestInput,
): MetricEntry {
  if (typeof candidate.observed?.cost_per_1k_tokens_est !== "number") {
    return {
      value: 0.5,
      source: "default",
    };
  }

  const targetCost = policySnapshot.budget.target_cost_per_request ?? DEFAULT_COST_TARGET;
  const observedValue = clamp(1 - candidate.observed.cost_per_1k_tokens_est / targetCost);
  const freshnessWeight = getFreshnessWeight(
    input,
    candidate,
    input.observedDataConfig?.metricHalflives.costMs ?? 1,
  );
  const value = input.observedDataConfig?.enabled
    ? decayToNeutral(observedValue, FRESHNESS_NEUTRAL, freshnessWeight)
    : observedValue;
  return {
    value,
    source: "measured",
    raw: {
      cost_per_1k_tokens_est: candidate.observed.cost_per_1k_tokens_est,
      target_cost_per_request: targetCost,
      measured_at_ms: candidate.observed.measured_at_ms,
      freshness_weight: freshnessWeight,
      neutral_value: FRESHNESS_NEUTRAL,
      observed_value: observedValue,
      effective_value: value,
    },
  };
}

function getReliabilityMetric(candidate: EndpointCandidate, input: RouteRequestInput): MetricEntry {
  if (typeof candidate.observed?.failure_rate !== "number") {
    return {
      value: RELIABILITY_NEUTRAL,
      source: "default",
    };
  }

  const observedValue = clamp(1 - candidate.observed.failure_rate);
  const freshnessWeight = getFreshnessWeight(
    input,
    candidate,
    input.observedDataConfig?.metricHalflives.reliabilityMs ?? 1,
  );
  const value = input.observedDataConfig?.enabled
    ? decayToNeutral(observedValue, RELIABILITY_NEUTRAL, freshnessWeight)
    : observedValue;
  return {
    value,
    source: "measured",
    raw: {
      failure_rate: candidate.observed.failure_rate,
      measured_at_ms: candidate.observed.measured_at_ms,
      freshness_weight: freshnessWeight,
      neutral_value: RELIABILITY_NEUTRAL,
      observed_value: observedValue,
      effective_value: value,
    },
  };
}

function getPreferenceMetric(
  candidate: EndpointCandidate,
  input: RouteRequestInput,
  policySnapshot: RoutingPolicySnapshot,
  rolePolicyApplied: boolean,
): MetricEntry {
  const effectiveRequiredCapabilities = getEffectiveRequiredCapabilities(input);
  const effectivePreferredCapabilities = getEffectivePreferredCapabilities(input);
  const requestedRoleId = input.request.requestedRoleId;
  const { requestedRole, requestedTask } = getRequestedRoleAndTask(input);
  const activeBinding = getRoleBindingForCandidate(candidate, input)?.status === "active";

  const adjustments: Record<string, unknown> = {};
  let score = 0.5;
  let source: MetricSource = "default";

  if (policySnapshot.compute_preference === "local") {
    const delta = isLocalCandidate(candidate) ? 0.15 : -0.15;
    score += delta;
    adjustments.compute_preference = "local";
    adjustments.compute_delta = delta;
    source = "declared";
  } else if (policySnapshot.compute_preference === "remote") {
    const delta = isLocalCandidate(candidate) ? -0.15 : 0.15;
    score += delta;
    adjustments.compute_preference = "remote";
    adjustments.compute_delta = delta;
    source = "declared";
  }

  const preferredCapabilityMatches = effectivePreferredCapabilities.filter(
    (capability) =>
      !effectiveRequiredCapabilities.includes(capability) &&
      candidate.declared.capabilities.includes(capability),
  ).length;
  if (preferredCapabilityMatches > 0) {
    const delta = Math.min(0.25, preferredCapabilityMatches * 0.25);
    score += delta;
    adjustments.preferred_capability_matches = preferredCapabilityMatches;
    adjustments.preferred_capability_delta = delta;
    source = "declared";
  }

  if (requestedRoleId && activeBinding) {
    score += 0.1;
    adjustments.active_role_binding = true;
    source = "declared";
  }

  if (requestedRole && rolePolicyApplied) {
    adjustments.role_policy_applied = true;
    source = "declared";
  }
  if (requestedTask) {
    adjustments.task_policy_present = true;
    source = "declared";
  }

  if (candidate.routingSignals?.continuityAffinity) {
    score += 0.1;
    adjustments.continuity_affinity = true;
    adjustments.continuity_affinity_delta = 0.1;
    source = "declared";
  }

  if (candidate.routingSignals?.cacheAffinity) {
    score += 0.1;
    adjustments.cache_affinity = true;
    adjustments.cache_affinity_delta = 0.1;
    source = "declared";
  }

  if (typeof candidate.routingSignals?.routingModelRank === "number") {
    const delta = Math.max(0, 0.15 - candidate.routingSignals.routingModelRank * 0.05);
    score += delta;
    adjustments.routing_model_rank = candidate.routingSignals.routingModelRank;
    adjustments.routing_model_rank_delta = delta;
    source = "declared";
  }

  return {
    value: clamp(score),
    source,
    ...(Object.keys(adjustments).length > 0 ? { raw: adjustments } : {}),
  };
}

function getCandidateMetricScores(
  candidate: EndpointCandidate,
  input: RouteRequestInput,
  policySnapshot: RoutingPolicySnapshot,
  rolePolicyApplied: boolean,
): CandidateMetricScores {
  return {
    quality: getQualityMetric(candidate, input),
    latency: getLatencyMetric(candidate, policySnapshot, input),
    throughput: getThroughputMetric(candidate, policySnapshot, input),
    cost: getCostMetric(candidate, policySnapshot, input),
    reliability: getReliabilityMetric(candidate, input),
    preference: getPreferenceMetric(candidate, input, policySnapshot, rolePolicyApplied),
  };
}

function isMetricUnknown(metric: MetricEntry): boolean {
  return metric.source === "default";
}

function getRedistributedWeights(
  strategy: RoutingPolicyStrategy,
  metrics: readonly CandidateMetricScores[],
): Record<ScoringMetricName, number> {
  const baseWeights = STRATEGY_WEIGHTS[strategy];
  const metricNames = Object.keys(baseWeights) as ScoringMetricName[];
  const unknownForAll = metricNames.filter((metricName) =>
    metrics.every((candidateMetrics) => isMetricUnknown(candidateMetrics[metricName])),
  );

  if (unknownForAll.length === 0 || unknownForAll.length === metricNames.length) {
    return baseWeights;
  }

  const redistributedWeights = { ...baseWeights };
  const removedWeight = unknownForAll.reduce(
    (sum, metricName) => sum + redistributedWeights[metricName],
    0,
  );
  const remainingMetrics = metricNames.filter((metricName) => !unknownForAll.includes(metricName));
  const remainingWeight = remainingMetrics.reduce(
    (sum, metricName) => sum + redistributedWeights[metricName],
    0,
  );

  for (const metricName of unknownForAll) {
    redistributedWeights[metricName] = 0;
  }

  for (const metricName of remainingMetrics) {
    redistributedWeights[metricName] += removedWeight * (baseWeights[metricName] / remainingWeight);
  }

  return redistributedWeights;
}

function toCandidateExclusion(code: CandidateExclusion["code"]): CandidateExclusion {
  const details: Record<string, string> = {
    ACCOUNT_DISABLED: "Endpoint account is disabled.",
    AUTH_UNAVAILABLE: "Endpoint authentication is unavailable for routing/execution.",
    BUDGET_EXCEEDED: "Endpoint cost exceeds the request budget.",
    CAPABILITY_MISSING: "Endpoint is missing a required capability.",
    CONTEXT_TOO_SMALL: "Endpoint context window is too small for the request.",
    DEPLOYMENT_CLASS_MISMATCH: "Endpoint deployment class does not satisfy the request.",
    ENTITLEMENT_MISSING: "Endpoint is missing a required entitlement.",
    FORBIDDEN_CAPABILITY_PRESENT: "Endpoint exposes a capability forbidden by the requested role.",
    MODALITY_UNSUPPORTED: "Endpoint does not support all required modalities.",
    PACKAGE_NOT_INSTALLED: "Endpoint package is not installed.",
    POLICY_DENY_ENDPOINT: "Endpoint is denied by routing policy.",
    POLICY_DENY_REMOTE: "Remote endpoints are denied by routing policy.",
    PROVIDER_OFFLINE: "Endpoint provider is offline.",
    QUOTA_EXHAUSTED: "Endpoint quota is exhausted.",
    REGION_DISALLOWED: "Endpoint region is disallowed for the current account or request.",
    REVOKED: "Endpoint has been revoked.",
    ROLE_BINDING_CAPABILITY_MISSING:
      "Endpoint role binding does not allow all required capabilities for this request.",
    ROLE_BINDING_DISABLED: "Endpoint role binding is disabled.",
    ROLE_BINDING_INACTIVE: "Endpoint role binding is inactive.",
    ROLE_BINDING_TASK_NOT_ALLOWED:
      "Endpoint role binding does not allow the requested task type.",
    ROLE_NOT_ALLOWED: "Requested role is not allowed for this task.",
    TASK_NOT_SUPPORTED_BY_ROLE: "Requested task is not supported by the requested role.",
    TOOLS_UNSUPPORTED: "Endpoint does not support tool calling.",
    VARIANT_INCOMPATIBLE: "Endpoint variant is incompatible with the request.",
  };

  return {
    code,
    detail: details[code] ?? `Endpoint exclusion: ${code}.`,
  };
}

function evaluateEligibility(
  input: RouteRequestInput,
  policySnapshot: RoutingPolicySnapshot,
): {
  eligible: EndpointCandidate[];
  eligibility: RouterDecisionRecord["eligibility"];
} {
  const eligible: EndpointCandidate[] = [];
  const eligibility: RouterDecisionRecord["eligibility"] = [];
  const requestedRoleId = input.request.requestedRoleId;
  const { requestedRole, requestedTask } = getRequestedRoleAndTask(input);
  const effectiveRequiredCapabilities = getEffectiveRequiredCapabilities(input);

  for (const candidate of input.candidates) {
    const reasons: CandidateExclusion["code"][] = [];

    if (candidate.runtimeEligibility?.accountDisabled) {
      reasons.push("ACCOUNT_DISABLED");
    }
    if (candidate.runtimeEligibility?.authUnavailable) {
      reasons.push("AUTH_UNAVAILABLE");
    }
    if (candidate.runtimeEligibility?.quotaExhausted) {
      reasons.push("QUOTA_EXHAUSTED");
    }
    if (candidate.runtimeEligibility?.budgetExceeded) {
      reasons.push("BUDGET_EXCEEDED");
    }
    if (candidate.runtimeEligibility?.regionDisallowed) {
      reasons.push("REGION_DISALLOWED");
    }
    if (candidate.runtimeEligibility?.entitlementMissing) {
      reasons.push("ENTITLEMENT_MISSING");
    }
    if (candidate.runtimeEligibility?.providerUnavailable) {
      reasons.push("PROVIDER_OFFLINE");
    }
    if (candidate.runtimeEligibility?.deploymentClassMismatch) {
      reasons.push("DEPLOYMENT_CLASS_MISMATCH");
    }
    if (candidate.status === "offline") {
      reasons.push("PROVIDER_OFFLINE");
    }
    if (candidate.status === "revoked") {
      reasons.push("REVOKED");
    }
    if (candidate.deniedByPolicy) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }
    if (
      policySnapshot.allow_endpoints.length > 0 &&
      !policySnapshot.allow_endpoints.includes(candidate.identity.endpoint_id)
    ) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }
    if (policySnapshot.deny_endpoints.includes(candidate.identity.endpoint_id)) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }
    if (
      policySnapshot.allow_provider_kinds.length > 0 &&
      !policySnapshot.allow_provider_kinds.includes(candidate.identity.provider_kind)
    ) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }
    if (policySnapshot.deny_provider_kinds.includes(candidate.identity.provider_kind)) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }
    if (!policySnapshot.privacy.allow_remote && !isLocalCandidate(candidate)) {
      reasons.push("POLICY_DENY_REMOTE");
    }

    if (
      effectiveRequiredCapabilities.some(
        (capability) => !candidate.declared.capabilities.includes(capability),
      )
    ) {
      reasons.push("CAPABILITY_MISSING");
    }
    if (
      requestedRole?.forbidden_capabilities.some((capability) =>
        candidate.declared.capabilities.includes(capability),
      )
    ) {
      reasons.push("FORBIDDEN_CAPABILITY_PRESENT");
    }
    if (
      policySnapshot.required_modalities.some(
        (modality) => !candidate.declared.modalities.includes(modality),
      )
    ) {
      reasons.push("MODALITY_UNSUPPORTED");
    }
    if (input.request.contextTokens > candidate.declared.max_context_tokens) {
      reasons.push("CONTEXT_TOO_SMALL");
    }
    if (policySnapshot.require_tools && !candidate.declared.tool_calling.supported) {
      reasons.push("TOOLS_UNSUPPORTED");
    }

    if (requestedRole && !requestedRole.task_types_supported.includes(input.request.taskType)) {
      reasons.push("TASK_NOT_SUPPORTED_BY_ROLE");
    }
    if (
      requestedRoleId &&
      requestedTask &&
      !requestedTask.allowed_roles.includes(requestedRoleId)
    ) {
      reasons.push("ROLE_NOT_ALLOWED");
    }

    const roleBinding = getRoleBindingForCandidate(candidate, input);
    if (roleBinding?.status === "inactive") {
      reasons.push("ROLE_BINDING_INACTIVE");
    }
    if (roleBinding?.status === "disabled") {
      reasons.push("ROLE_BINDING_DISABLED");
    }
    if (
      roleBinding?.status === "active" &&
      effectiveRequiredCapabilities.some(
        (capability) => !roleBinding.effective_capabilities.includes(capability),
      )
    ) {
      reasons.push("ROLE_BINDING_CAPABILITY_MISSING");
    }
    if (
      roleBinding?.status === "active" &&
      !roleBinding.effective_task_types.includes(input.request.taskType)
    ) {
      reasons.push("ROLE_BINDING_TASK_NOT_ALLOWED");
    }

    if (
      policySnapshot.budget.enabled &&
      policySnapshot.budget_mode !== "advisory" &&
      typeof policySnapshot.budget.max_cost_per_request === "number" &&
      typeof candidate.observed?.cost_per_1k_tokens_est === "number" &&
      candidate.observed.cost_per_1k_tokens_est > policySnapshot.budget.max_cost_per_request
    ) {
      reasons.push("BUDGET_EXCEEDED");
    }
    if (
      getActiveThroughputPenaltyState(input, candidate)?.penaltyFactor === 0 &&
      input.observedDataConfig?.throughputSla.enabled
    ) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }

    if (reasons.length > 0) {
      eligibility.push({
        endpoint_id: candidate.identity.endpoint_id,
        eligible: false,
        exclusions: unique(reasons).map(toCandidateExclusion),
      });
      continue;
    }

    eligible.push(candidate);
    eligibility.push({
      endpoint_id: candidate.identity.endpoint_id,
      eligible: true,
      exclusions: [],
    });
  }

  return { eligible, eligibility };
}

function buildTieBreak(
  candidate: EndpointCandidate,
  metricBreakdown: CandidateMetricScores,
): TieBreakDiagnostic {
  return {
    quality: metricBreakdown.quality.value,
    latency_ms: typeof metricBreakdown.latency.raw?.effective_latency_ms === "number"
      ? (metricBreakdown.latency.raw.effective_latency_ms as number)
      : getEffectiveLatency(candidate),
    reliability: metricBreakdown.reliability.value,
    endpoint_id: candidate.identity.endpoint_id,
  };
}

function scoreCandidate(
  candidate: EndpointCandidate,
  input: RouteRequestInput,
  policySnapshot: RoutingPolicySnapshot,
  metricScores: CandidateMetricScores,
  weights: Record<ScoringMetricName, number>,
  rolePolicyApplied: boolean,
): CandidateScoreResult {
  const totalScore =
    metricScores.quality.value * weights.quality +
    metricScores.latency.value * weights.latency +
    metricScores.throughput.value * weights.throughput +
    metricScores.cost.value * weights.cost +
    metricScores.reliability.value * weights.reliability +
    metricScores.preference.value * weights.preference;

  const selectionReasons: RouterDecisionRecord["selection_reasons"] = ["DECLARED_PROFILE_USED"];
  const { requestedTask } = getRequestedRoleAndTask(input);
  const hasMeasuredMetric = Object.values(metricScores).some((metric) => metric.source === "measured");
  const hasDefaultMetric = Object.values(metricScores).some((metric) => metric.source === "default");

  if (hasMeasuredMetric) {
    selectionReasons.push("MEASURED_PROFILE_USED");
  }
  if (hasDefaultMetric) {
    selectionReasons.push("DEFAULT_PROFILE_USED");
  }

  if (policySnapshot.compute_preference === "local" && isLocalCandidate(candidate)) {
    selectionReasons.push("LOCAL_PREFERENCE_APPLIED");
  }
  if (policySnapshot.compute_preference === "remote" && !isLocalCandidate(candidate)) {
    selectionReasons.push("REMOTE_PREFERENCE_APPLIED");
  }
  if (candidate.routingSignals?.continuityAffinity) {
    selectionReasons.push("CONTINUITY_AFFINITY_APPLIED");
  }
  if (candidate.routingSignals?.cacheAffinity) {
    selectionReasons.push("CACHE_AFFINITY_APPLIED");
  }
  if (
    typeof candidate.routingSignals?.routingModelRank === "number" &&
    Math.max(0, 0.15 - candidate.routingSignals.routingModelRank * 0.05) > 0
  ) {
    selectionReasons.push("ROUTING_MODEL_PREFERENCE_APPLIED");
  }

  if (toPolicyStrategy(input.request.strategy) === "cost" || policySnapshot.budget_mode === "advisory") {
    selectionReasons.push("BUDGET_OPTIMIZATION");
  }
  if (
    toPolicyStrategy(input.request.strategy) === "latency" ||
    buildTieBreak(candidate, metricScores).latency_ms <= policySnapshot.targets.latency_target_ms
  ) {
    selectionReasons.push("LOW_LATENCY_TARGET_MET");
  }
  if (
    toPolicyStrategy(input.request.strategy) === "quality" ||
    metricScores.quality.value >= 0.75
  ) {
    selectionReasons.push("HIGH_QUALITY_TARGET_MET");
  }
  if (input.request.requestedRoleId || rolePolicyApplied) {
    selectionReasons.push("ROLE_POLICY_APPLIED");
  }
  if (requestedTask) {
    selectionReasons.push("TASK_POLICY_APPLIED");
  }

  return {
    endpoint_id: candidate.identity.endpoint_id,
    total_score: totalScore,
    metric_breakdown: metricScores,
    tie_break: buildTieBreak(candidate, metricScores),
    selectionReasons: unique(selectionReasons),
    usedMeasured: hasMeasuredMetric,
    usedDeclared: true,
  };
}

function compareTieBreak(left: TieBreakDiagnostic, right: TieBreakDiagnostic): number {
  if (Math.abs(right.quality - left.quality) > 0) {
    return right.quality - left.quality;
  }
  if (Math.abs(left.latency_ms - right.latency_ms) > 0) {
    return left.latency_ms - right.latency_ms;
  }
  if (Math.abs(right.reliability - left.reliability) > 0) {
    return right.reliability - left.reliability;
  }
  return left.endpoint_id.localeCompare(right.endpoint_id);
}

export function routeRequest(input: RouteRequestInput): RouterDecisionRecord {
  const { policySnapshot, rolePolicyApplied } = buildPolicySnapshot(input);
  const { eligible, eligibility } = evaluateEligibility(input, policySnapshot);
  const metricsByEndpoint = new Map(
    eligible.map((candidate) => [
      candidate.identity.endpoint_id,
      getCandidateMetricScores(candidate, input, policySnapshot, rolePolicyApplied),
    ]),
  );
  const redistributedWeights = getRedistributedWeights(policySnapshot.strategy, [
    ...metricsByEndpoint.values(),
  ]);
  const scored = eligible.map((candidate) =>
    scoreCandidate(
      candidate,
      input,
      policySnapshot,
      metricsByEndpoint.get(candidate.identity.endpoint_id) ??
        getCandidateMetricScores(candidate, input, policySnapshot, rolePolicyApplied),
      redistributedWeights,
      rolePolicyApplied,
    ),
  );

  scored.sort((left, right) => {
    if (Math.abs(right.total_score - left.total_score) > SCORE_TIE_EPSILON) {
      return right.total_score - left.total_score;
    }

    const leftCandidate = findEligibleCandidate(eligible, left.endpoint_id);
    const rightCandidate = findEligibleCandidate(eligible, right.endpoint_id);
    return compareTieBreak(
      buildTieBreak(
        leftCandidate,
        metricsByEndpoint.get(left.endpoint_id) ??
          getCandidateMetricScores(leftCandidate, input, policySnapshot, rolePolicyApplied),
      ),
      buildTieBreak(
        rightCandidate,
        metricsByEndpoint.get(right.endpoint_id) ??
          getCandidateMetricScores(rightCandidate, input, policySnapshot, rolePolicyApplied),
      ),
    );
  });

  const chosen = scored[0];
  const selectionReasons: SelectionReasonCode[] = chosen
    ? unique<SelectionReasonCode>([
        "BEST_TOTAL_SCORE",
        ...chosen.selectionReasons,
        ...(scored.length > 1 ? (["FALLBACK_CHAIN_COMPUTED"] as const) : []),
      ])
    : [];
  const scoredCandidates = scored.map(
    ({ selectionReasons: _selectionReasons, usedMeasured: _usedMeasured, usedDeclared: _usedDeclared, ...candidate }) =>
      candidate,
  );

  return {
    routing_decision_id: `decision-${input.request.requestId}`,
    request_id: input.request.requestId,
    app_id: input.request.appId ?? "unknown-app",
    org_id: input.request.orgId ?? null,
    policy_snapshot: policySnapshot,
    eligibility,
    scored_candidates: scoredCandidates,
    chosen_endpoint_id: chosen?.endpoint_id ?? "",
    fallback_endpoint_ids: scored.slice(1).map((candidate) => candidate.endpoint_id),
    selection_reasons: selectionReasons,
    used_measured: chosen?.usedMeasured ?? false,
    used_declared: chosen?.usedDeclared ?? false,
    scoring_version: "baseline-v2",
  };
}
