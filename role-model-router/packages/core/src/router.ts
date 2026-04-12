import { SELECTION_REASON_CODES } from "./reason-codes.js";
import type {
  CandidateEligibility,
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

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

const SCORE_TIE_EPSILON = 0.01;
const LATENCY_TARGET_MS = 150;
const LATENCY_MAX_MS = 300;
const THROUGHPUT_TARGET_TPS = 40;
const ROLE_OR_TASK_PREFERENCE_BONUS = 0.01;
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

type MetricScore = {
  score: number;
  unknown: boolean;
};

type CandidateMetricScores = Record<ScoringMetricName, MetricScore>;

function getEffectiveComputePreference(
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

function buildPolicySnapshot(input: RouteRequestInput): RoutingPolicySnapshot {
  const budgetEnabled = typeof input.request.budgetLimit === "number";
  const effectiveRequiredCapabilities = getEffectiveRequiredCapabilities(input);
  const computePreference = getEffectiveComputePreference(input.request);
  return {
    policy_id: `${input.request.strategy}-policy`,
    strategy: toPolicyStrategy(input.request.strategy),
    compute_preference: computePreference,
    required_capabilities: effectiveRequiredCapabilities,
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
      latency_target_ms: 150,
      latency_max_ms: 300,
      throughput_target_tps: 40,
    },
    prefer_local: input.request.preferLocal,
    budget_mode: budgetEnabled ? "strict" : "disabled",
    tie_break_order: ["prefer_local", "cost", "latency_ms_p95", "endpoint_id"],
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

function getQualityMetric(candidate: EndpointCandidate): MetricScore {
  if (typeof candidate.observed?.judge_score === "number") {
    return { score: clamp(candidate.observed.judge_score), unknown: false };
  }

  if (typeof candidate.observed?.quality_score === "number") {
    return { score: clamp(candidate.observed.quality_score), unknown: false };
  }

  return { score: 0.5, unknown: true };
}

function getQualityScore(candidate: EndpointCandidate): number {
  return getQualityMetric(candidate).score;
}

function getLatencyMetric(candidate: EndpointCandidate): MetricScore {
  if (
    typeof candidate.observed?.latency_ms_p50 !== "number" ||
    typeof candidate.observed?.latency_ms_p95 !== "number"
  ) {
    return { score: 0.5, unknown: true };
  }

  const effectiveLatencyMs = getEffectiveLatency(candidate);
  const normalized =
    1 -
    Math.log1p(effectiveLatencyMs / LATENCY_TARGET_MS) /
      Math.log1p(LATENCY_MAX_MS / LATENCY_TARGET_MS);

  return { score: clamp(normalized), unknown: false };
}

function getThroughputMetric(candidate: EndpointCandidate): MetricScore {
  if (typeof candidate.observed?.tokens_per_sec !== "number") {
    return { score: 0.5, unknown: true };
  }

  const normalized =
    Math.log1p(candidate.observed.tokens_per_sec) / Math.log1p(THROUGHPUT_TARGET_TPS);
  return { score: clamp(normalized), unknown: false };
}

function getCostMetric(candidate: EndpointCandidate, input: RouteRequestInput): MetricScore {
  if (
    typeof input.request.budgetLimit !== "number" ||
    typeof candidate.observed?.cost_per_1k_tokens_est !== "number"
  ) {
    return { score: 0.5, unknown: true };
  }

  return {
    score: clamp(1 - candidate.observed.cost_per_1k_tokens_est / input.request.budgetLimit),
    unknown: false,
  };
}

function getReliabilityMetric(candidate: EndpointCandidate): MetricScore {
  if (typeof candidate.observed?.failure_rate !== "number") {
    return { score: 0.7, unknown: true };
  }

  return { score: clamp(1 - candidate.observed.failure_rate), unknown: false };
}

function getPreferenceMetric(candidate: EndpointCandidate, input: RouteRequestInput): MetricScore {
  const effectiveRequiredCapabilities = getEffectiveRequiredCapabilities(input);
  const effectivePreferredCapabilities = getEffectivePreferredCapabilities(input);
  const computePreference = getEffectiveComputePreference(input.request);
  let score = 0.5;

  if (computePreference === "local") {
    score += isLocalCandidate(candidate) ? 0.15 : -0.15;
  } else if (computePreference === "remote") {
    score += isLocalCandidate(candidate) ? -0.15 : 0.15;
  }

  if (
    effectivePreferredCapabilities.some(
      (capability) =>
        !effectiveRequiredCapabilities.includes(capability) &&
        candidate.declared.capabilities.includes(capability),
    )
  ) {
    score += 0.1;
  }

  if (getRoleBindingForCandidate(candidate, input)?.status === "active") {
    score += 0.1;
  }

  return { score: clamp(score), unknown: false };
}

function toCandidateExclusion(code: string): CandidateExclusion {
  const details: Record<string, string> = {
    BUDGET_EXCEEDED: "Endpoint cost exceeds the request budget.",
    CAPABILITY_MISSING: "Endpoint is missing a required capability.",
    CONTEXT_TOO_SMALL: "Endpoint context window is too small for the request.",
    MODALITY_UNSUPPORTED: "Endpoint does not support all required modalities.",
    PACKAGE_NOT_INSTALLED: "Endpoint package is not installed.",
    POLICY_DENY_ENDPOINT: "Endpoint is denied by routing policy.",
    POLICY_DENY_REMOTE: "Remote endpoints are denied by routing policy.",
    PROVIDER_OFFLINE: "Endpoint provider is offline.",
    REVOKED: "Endpoint has been revoked.",
    ROLE_BINDING_INACTIVE: "Endpoint role binding is not active.",
    ROLE_NOT_ALLOWED: "Requested role is not allowed for this task.",
    TASK_NOT_SUPPORTED: "Requested task is not supported by the role.",
    TOOLS_UNSUPPORTED: "Endpoint does not support tool calling.",
    VARIANT_INCOMPATIBLE: "Endpoint variant is incompatible with the request.",
    ENTITLEMENT_MISSING: "Endpoint is missing a required entitlement.",
  };

  return {
    code,
    detail: details[code] ?? `Endpoint exclusion: ${code}.`,
  };
}

function getCandidateMetricScores(
  candidate: EndpointCandidate,
  input: RouteRequestInput,
): CandidateMetricScores {
  return {
    quality: getQualityMetric(candidate),
    latency: getLatencyMetric(candidate),
    throughput: getThroughputMetric(candidate),
    cost: getCostMetric(candidate, input),
    reliability: getReliabilityMetric(candidate),
    preference: getPreferenceMetric(candidate, input),
  };
}

function getRedistributedWeights(
  input: RouteRequestInput,
  metrics: readonly CandidateMetricScores[],
): Record<ScoringMetricName, number> {
  const baseWeights = STRATEGY_WEIGHTS[toPolicyStrategy(input.request.strategy)];
  const metricNames = Object.keys(baseWeights) as ScoringMetricName[];
  const unknownForAll = metricNames.filter((metricName) =>
    metrics.every((candidateMetrics) => candidateMetrics[metricName].unknown),
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

function getReliabilityScore(candidate: EndpointCandidate): number {
  return getReliabilityMetric(candidate).score;
}

function evaluateEligibility(input: RouteRequestInput): {
  eligible: EndpointCandidate[];
  eligibility: CandidateEligibility[];
} {
  const eligible: EndpointCandidate[] = [];
  const eligibility: CandidateEligibility[] = [];
  const requestedRoleId = input.request.requestedRoleId;
  const { requestedRole, requestedTask } = getRequestedRoleAndTask(input);
  const effectiveRequiredCapabilities = getEffectiveRequiredCapabilities(input);

  for (const candidate of input.candidates) {
    const reasons: string[] = [];

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
      input.request.allowEndpoints &&
      input.request.allowEndpoints.length > 0 &&
      !input.request.allowEndpoints.includes(candidate.identity.endpoint_id)
    ) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }
    if (input.request.denyEndpoints?.includes(candidate.identity.endpoint_id)) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }
    if (
      input.request.allowProviderKinds &&
      input.request.allowProviderKinds.length > 0 &&
      !input.request.allowProviderKinds.includes(candidate.identity.provider_kind)
    ) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }
    if (input.request.denyProviderKinds?.includes(candidate.identity.provider_kind)) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }
    if (input.request.denyRemote && !isLocalCandidate(candidate)) {
      reasons.push("POLICY_DENY_REMOTE");
    }
    const roleBinding = getRoleBindingForCandidate(candidate, input);
    if (roleBinding && roleBinding.status !== "active") {
      reasons.push("ROLE_BINDING_INACTIVE");
    }
    if (requestedRole && !requestedRole.task_types_supported.includes(input.request.taskType)) {
      reasons.push("TASK_NOT_SUPPORTED");
    }
    if (
      requestedRoleId &&
      requestedTask &&
      !requestedTask.allowed_roles.includes(requestedRoleId)
    ) {
      reasons.push("ROLE_NOT_ALLOWED");
    }
    if (
      requestedRole?.forbidden_capabilities.some((capability) =>
        candidate.declared.capabilities.includes(capability),
      )
    ) {
      reasons.push("POLICY_DENY_ENDPOINT");
    }
    if (
      effectiveRequiredCapabilities.some(
        (capability) => !candidate.declared.capabilities.includes(capability),
      )
    ) {
      reasons.push("CAPABILITY_MISSING");
    }
    if (
      input.request.requiredModalities.some(
        (modality) => !candidate.declared.modalities.includes(modality),
      )
    ) {
      reasons.push("MODALITY_UNSUPPORTED");
    }
    if (input.request.contextTokens > candidate.declared.max_context_tokens) {
      reasons.push("CONTEXT_TOO_SMALL");
    }
    if (input.request.needsTools && !candidate.declared.tool_calling.supported) {
      reasons.push("TOOLS_UNSUPPORTED");
    }
    if (
      typeof input.request.budgetLimit === "number" &&
      typeof candidate.observed?.cost_per_1k_tokens_est === "number" &&
      candidate.observed.cost_per_1k_tokens_est > input.request.budgetLimit
    ) {
      reasons.push("BUDGET_EXCEEDED");
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

function scoreCandidate(
  candidate: EndpointCandidate,
  input: RouteRequestInput,
  metricScores: CandidateMetricScores,
  weights: Record<ScoringMetricName, number>,
): {
  endpoint_id: string;
  score: number;
  selectionReasons: string[];
} {
  let score =
    metricScores.quality.score * weights.quality +
    metricScores.latency.score * weights.latency +
    metricScores.throughput.score * weights.throughput +
    metricScores.cost.score * weights.cost +
    metricScores.reliability.score * weights.reliability +
    metricScores.preference.score * weights.preference;
  const selectionReasons: string[] = [];
  const { requestedRole, requestedTask } = getRequestedRoleAndTask(input);
  const rolePreferenceApplied =
    requestedRole?.preferred_capabilities.some((capability) =>
      candidate.declared.capabilities.includes(capability),
    ) ?? false;
  const taskPreferenceApplied =
    requestedTask?.preferred_capabilities.some((capability) =>
      candidate.declared.capabilities.includes(capability),
    ) ?? false;

  selectionReasons.push("DECLARED_PROFILE_USED");
  if (rolePreferenceApplied) {
    score += ROLE_OR_TASK_PREFERENCE_BONUS;
    selectionReasons.push("ROLE_PREFERENCE_APPLIED");
  }
  if (taskPreferenceApplied) {
    score += ROLE_OR_TASK_PREFERENCE_BONUS;
    selectionReasons.push("TASK_REQUIREMENTS_SATISFIED");
  }

  if (candidate.observed) {
    selectionReasons.push("MEASURED_PROFILE_USED");
  } else {
    selectionReasons.push("DEFAULT_PROFILE_USED");
  }

  const computePreference = getEffectiveComputePreference(input.request);
  if (computePreference === "local") {
    if (isLocalCandidate(candidate)) {
      selectionReasons.push("LOCAL_PREFERENCE_APPLIED");
    } else {
      selectionReasons.push("REMOTE_PREFERENCE_APPLIED");
    }
  } else if (computePreference === "remote") {
    if (isLocalCandidate(candidate)) {
      selectionReasons.push("LOCAL_PREFERENCE_APPLIED");
    } else {
      selectionReasons.push("REMOTE_PREFERENCE_APPLIED");
    }
  }

  const canonicalStrategy = toPolicyStrategy(input.request.strategy);
  if (canonicalStrategy === "cost") {
    selectionReasons.push("BUDGET_OPTIMIZATION");
  }
  if (canonicalStrategy === "latency") {
    selectionReasons.push("LOW_LATENCY_TARGET_MET");
  }
  if (canonicalStrategy === "quality") {
    selectionReasons.push("HIGH_QUALITY_TARGET_MET");
  }

  return {
    endpoint_id: candidate.identity.endpoint_id,
    score,
    selectionReasons: unique(selectionReasons),
  };
}

export function routeRequest(input: RouteRequestInput): RouterDecisionRecord {
  const { eligible, eligibility } = evaluateEligibility(input);
  const metricsByEndpoint = new Map(
    eligible.map((candidate) => [
      candidate.identity.endpoint_id,
      getCandidateMetricScores(candidate, input),
    ]),
  );
  const redistributedWeights = getRedistributedWeights(input, [...metricsByEndpoint.values()]);
  const scored = eligible.map((candidate) =>
    scoreCandidate(
      candidate,
      input,
      metricsByEndpoint.get(candidate.identity.endpoint_id) ??
        getCandidateMetricScores(candidate, input),
      redistributedWeights,
    ),
  );

  scored.sort((left, right) => {
    if (Math.abs(right.score - left.score) > SCORE_TIE_EPSILON) {
      return right.score - left.score;
    }

    const leftCandidate = findEligibleCandidate(eligible, left.endpoint_id);
    const rightCandidate = findEligibleCandidate(eligible, right.endpoint_id);
    const qualityDelta = getQualityScore(rightCandidate) - getQualityScore(leftCandidate);
    if (qualityDelta !== 0) {
      return qualityDelta;
    }

    const latencyDelta = getEffectiveLatency(leftCandidate) - getEffectiveLatency(rightCandidate);
    if (latencyDelta !== 0) {
      return latencyDelta;
    }

    const reliabilityDelta =
      getReliabilityScore(rightCandidate) - getReliabilityScore(leftCandidate);
    if (reliabilityDelta !== 0) {
      return reliabilityDelta;
    }

    return left.endpoint_id.localeCompare(right.endpoint_id);
  });

  const chosen = scored[0];
  const chosenCandidate = eligible.find(
    (candidate) => candidate.identity.endpoint_id === chosen?.endpoint_id,
  );
  const selectionReasons = chosen
    ? unique([
        "BEST_TOTAL_SCORE",
        ...chosen.selectionReasons,
        ...(scored.length > 1 ? ["FALLBACK_CHAIN_COMPUTED"] : []),
      ])
    : [];

  const scoredCandidates: ScoredCandidate[] = scored.map(({ endpoint_id, score }) => ({
    endpoint_id,
    score,
  }));

  return {
    routing_decision_id: `decision-${input.request.requestId}`,
    request_id: input.request.requestId,
    policy_snapshot: buildPolicySnapshot(input),
    eligibility,
    scored_candidates: scoredCandidates,
    chosen_endpoint_id: chosen?.endpoint_id ?? "",
    fallback_endpoint_ids: scored.slice(1).map((candidate) => candidate.endpoint_id),
    selection_reasons: selectionReasons,
    used_measured: Boolean(chosenCandidate?.observed),
    used_declared: Boolean(chosenCandidate),
    scoring_version: "baseline-v1",
  };
}
