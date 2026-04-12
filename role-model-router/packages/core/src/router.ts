import { SELECTION_REASON_CODES } from "./reason-codes.js";
import type {
  EndpointCandidate,
  IneligibleCandidate,
  RouteRequestInput,
  RouterDecisionRecord,
  ScoredCandidate,
} from "./types.js";

function isLocalCandidate(candidate: EndpointCandidate): boolean {
  return (
    candidate.identity.serving_source === "local-process" || candidate.identity.region === "local"
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
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

function evaluateEligibility(input: RouteRequestInput): {
  eligible: EndpointCandidate[];
  ineligible: IneligibleCandidate[];
} {
  const eligible: EndpointCandidate[] = [];
  const ineligible: IneligibleCandidate[] = [];

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
      input.request.requiredCapabilities.some(
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
    if (input.request.needsTools && !candidate.declared.tool_calling) {
      reasons.push("TOOLS_UNSUPPORTED");
    }
    if (input.request.denyRemote && !isLocalCandidate(candidate)) {
      reasons.push("POLICY_DENY_REMOTE");
    }
    if (
      typeof input.request.budgetLimit === "number" &&
      typeof candidate.observed?.cost_per_1k_tokens_est === "number" &&
      candidate.observed.cost_per_1k_tokens_est > input.request.budgetLimit
    ) {
      reasons.push("BUDGET_EXCEEDED");
    }

    if (reasons.length > 0) {
      ineligible.push({ endpoint_id: candidate.identity.endpoint_id, reasons: unique(reasons) });
      continue;
    }

    eligible.push(candidate);
  }

  return { eligible, ineligible };
}

function scoreCandidate(
  candidate: EndpointCandidate,
  input: RouteRequestInput,
): {
  endpoint_id: string;
  score: number;
  selectionReasons: string[];
} {
  let score = 0;
  const selectionReasons: string[] = [];
  const preferredMatches = input.request.preferredCapabilities.filter((capability) =>
    candidate.declared.capabilities.includes(capability),
  ).length;

  score += preferredMatches * 2;
  selectionReasons.push("DECLARED_PROFILE_USED");

  if (candidate.observed) {
    score += candidate.observed.judge_score * 100;
    score += candidate.observed.freshness_score * 8;
    score += candidate.observed.confidence_score * 8;
    score -= candidate.observed.latency_ms_p95 / 100;
    score -= candidate.observed.failure_rate * 30;
    score -= candidate.observed.cost_per_1k_tokens_est * 500;
    selectionReasons.push("MEASURED_PROFILE_USED");
  } else {
    selectionReasons.push("DEFAULT_PROFILE_USED");
  }

  if (input.request.preferLocal) {
    if (isLocalCandidate(candidate)) {
      score += 4;
      selectionReasons.push("LOCAL_PREFERENCE_APPLIED");
    } else {
      selectionReasons.push("REMOTE_PREFERENCE_APPLIED");
    }
  }

  if (input.request.strategy === "low-cost") {
    score -= (candidate.observed?.cost_per_1k_tokens_est ?? 0) * 800;
    selectionReasons.push("BUDGET_OPTIMIZATION");
  }
  if (input.request.strategy === "low-latency") {
    score -= (candidate.observed?.latency_ms_p95 ?? 250) / 60;
    selectionReasons.push("LOW_LATENCY_TARGET_MET");
  }
  if (input.request.strategy === "high-quality") {
    score += (candidate.observed?.judge_score ?? 0.6) * 25;
    selectionReasons.push("HIGH_QUALITY_TARGET_MET");
  }

  return {
    endpoint_id: candidate.identity.endpoint_id,
    score,
    selectionReasons: unique(selectionReasons),
  };
}

export function routeRequest(input: RouteRequestInput): RouterDecisionRecord {
  const { eligible, ineligible } = evaluateEligibility(input);
  const scored = eligible.map((candidate) => scoreCandidate(candidate, input));

  scored.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const leftCandidate = findEligibleCandidate(eligible, left.endpoint_id);
    const rightCandidate = findEligibleCandidate(eligible, right.endpoint_id);
    const localityDelta =
      Number(isLocalCandidate(rightCandidate)) - Number(isLocalCandidate(leftCandidate));
    if (localityDelta !== 0) {
      return localityDelta;
    }

    const costDelta =
      (leftCandidate.observed?.cost_per_1k_tokens_est ?? Number.POSITIVE_INFINITY) -
      (rightCandidate.observed?.cost_per_1k_tokens_est ?? Number.POSITIVE_INFINITY);
    if (costDelta !== 0) {
      return costDelta;
    }

    const latencyDelta =
      (leftCandidate.observed?.latency_ms_p95 ?? Number.POSITIVE_INFINITY) -
      (rightCandidate.observed?.latency_ms_p95 ?? Number.POSITIVE_INFINITY);
    if (latencyDelta !== 0) {
      return latencyDelta;
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
    policy_snapshot: {
      policy_id: `${input.request.strategy}-policy`,
      strategy: input.request.strategy,
      prefer_local: input.request.preferLocal,
      budget_mode: typeof input.request.budgetLimit === "number" ? "strict" : "disabled",
      tie_break_order: ["prefer_local", "cost", "latency_ms_p95", "endpoint_id"],
    },
    eligible_candidates: eligible.map((candidate) => candidate.identity.endpoint_id),
    ineligible_candidates: ineligible,
    scored_candidates: scoredCandidates,
    chosen_endpoint_id: chosen?.endpoint_id ?? "",
    fallback_endpoint_ids: scored.slice(1).map((candidate) => candidate.endpoint_id),
    selection_reasons: selectionReasons,
    used_measured: Boolean(chosenCandidate?.observed),
    used_declared: Boolean(chosenCandidate),
    scoring_version: "baseline-v1",
  };
}
