import { describe, expect, test } from "vitest";

import { getQualityMetric, routeRequest } from "../src/router.js";
import type { EndpointCandidate, RouteRequestInput, RoutingRequest } from "../src/types.js";

function candidate(
  endpointId: string,
  reasoningEffort: string | null,
  overrides: Partial<EndpointCandidate> = {},
): EndpointCandidate {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: endpointId,
      runtime_version: "1",
      region: "global",
      ...(reasoningEffort === null
        ? { reasoning_effort: null }
        : { reasoning_effort: reasoningEffort }),
    },
    declared: {
      endpoint_id: endpointId,
      capabilities: ["text.chat"],
      modalities: ["text"],
      max_context_tokens: 100_000,
      tool_calling: { supported: false, style: "openai" },
      supports_embeddings: false,
    },
    status: "active",
    ...overrides,
  };
}

const baseRequest: RoutingRequest = {
  requestId: "run106-phase35-review-fixes",
  taskType: "text.chat",
  requiredCapabilities: [],
  preferredCapabilities: [],
  requiredModalities: ["text"],
  contextTokens: 1000,
  needsTools: false,
  strategy: "balanced",
  preferLocal: false,
};

function buildInput(overrides: Partial<RouteRequestInput> = {}): RouteRequestInput {
  return {
    request: baseRequest,
    candidates: [candidate("provider-default", null)],
    ...overrides,
  };
}

/** A measured profile with just the fields the non-inferiority gate reads. */
function measured(latencyMsP50: number, latencyMsP95: number, costPer1k: number) {
  return {
    latency_ms_p50: latencyMsP50,
    latency_ms_p95: latencyMsP95,
    cost_per_1k_tokens_est: costPer1k,
    measured_at_ms: 1,
  };
}

describe("run106 Phase 3.5 review fixes (H-2, M-1, M-2, L-4)", () => {
  test("M-1: getQualityMetric labels a borrowed related-effort prior as borrowed", () => {
    const c = candidate("borrowed", null, {
      benchmarkCapability: { relatedEffortOverallScore: 0.9 },
    });
    const metric = getQualityMetric(c, buildInput());
    expect(metric.source).toBe("borrowed");
  });

  test("M-1: borrowed quality never establishes non-inferiority", () => {
    const leader = candidate("borrowed-leader", "high", {
      benchmarkCapability: { relatedEffortOverallScore: 1.0 },
      observed: measured(11000, 12000, 0.4),
    });
    const challenger = candidate("benchmark-challenger", "high", {
      benchmarkCapability: { overallScore: 0.8 },
      observed: measured(6000, 6500, 0.25),
    });
    const decision = routeRequest(buildInput({ candidates: [leader, challenger] }));
    expect(decision.chosen_endpoint_id).toBe("borrowed-leader");
  });

  test("M-2: non-inferiority promotion records its receipt and a selection reason", () => {
    const leader = candidate("weighted-leader", "high", {
      benchmarkCapability: { overallScore: 0.9 },
      observed: measured(11000, 12000, 0.4),
    });
    const challenger = candidate("non-inferior-challenger", "high", {
      benchmarkCapability: { overallScore: 0.88 },
      observed: measured(6000, 6500, 0.25),
    });
    const decision = routeRequest(buildInput({ candidates: [leader, challenger] }));
    expect(decision.chosen_endpoint_id).toBe("non-inferior-challenger");
    expect(decision.non_inferiority_promotion).toMatchObject({
      promoted_endpoint_id: "non-inferior-challenger",
      displaced_endpoint_id: "weighted-leader",
      quality_margin: 0.05,
      min_latency_advantage_ms: 200,
      min_cost_advantage_fraction: 0.1,
      changed_weighted_selection: true,
    });
    expect(decision.selection_reasons).toContain("NON_INFERIOR_PROMOTION");
  });

  test("H-2: decision records requested effort, policy, and exact-arm counts", () => {
    const decision = routeRequest(
      buildInput({
        candidates: [
          candidate("exact-high", "high"),
          candidate("exact-high-denied", "high"),
          candidate("provider-default", null),
        ],
        request: { ...baseRequest, denyEndpoints: ["exact-high-denied"] },
        effortResolution: {
          resolution: "exact_fallback_expanded",
          effectiveEffort: "high",
          requestedEffort: "high",
          requestedPolicy: "preferred",
        },
      }),
    );
    expect(decision.requested_effort).toBe("high");
    expect(decision.requested_policy).toBe("preferred");
    expect(decision.effort_exact_arm_count_before_hard_eligibility).toBe(2);
    expect(decision.effort_exact_arm_count_after_hard_eligibility).toBe(1);
  });

  test("L-4: marks fallback when a non-exact arm wins under exact_fallback_expanded", () => {
    const decision = routeRequest(
      buildInput({
        candidates: [candidate("exact-high", "high"), candidate("provider-default", null)],
        request: { ...baseRequest, denyEndpoints: ["exact-high"] },
        effortResolution: {
          resolution: "exact_fallback_expanded",
          effectiveEffort: "high",
          requestedEffort: "high",
          requestedPolicy: "preferred",
        },
      }),
    );
    expect(decision.chosen_endpoint_id).toBe("provider-default");
    expect(decision.effort_fallback_applied).toBe(true);
    expect(decision.selection_reasons).toContain("EFFORT_FALLBACK_APPLIED");
  });

  test("L-4: does not mark fallback when the exact arm wins under exact_fallback_expanded", () => {
    const decision = routeRequest(
      buildInput({
        candidates: [candidate("exact-high", "high")],
        effortResolution: {
          resolution: "exact_fallback_expanded",
          effectiveEffort: "high",
          requestedEffort: "high",
          requestedPolicy: "preferred",
        },
      }),
    );
    expect(decision.chosen_endpoint_id).toBe("exact-high");
    expect(decision.effort_fallback_applied).not.toBe(true);
    expect(decision.selection_reasons).not.toContain("EFFORT_FALLBACK_APPLIED");
  });
});
