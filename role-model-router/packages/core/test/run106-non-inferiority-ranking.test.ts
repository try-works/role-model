import { describe, expect, test } from "vitest";

import { routeRequest } from "../src/router.js";
import type { EndpointCandidate, RouteRequestInput, RoutingRequest } from "../src/types.js";

function candidate(
  endpointId: string,
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
  requestId: "run106-non-inferiority-ranking",
  taskType: "text.chat",
  requiredCapabilities: [],
  preferredCapabilities: [],
  requiredModalities: ["text"],
  contextTokens: 1000,
  needsTools: false,
  strategy: "balanced",
  preferLocal: false,
};

function buildInput(): RouteRequestInput {
  return {
    request: baseRequest,
    candidates: [
      candidate("incumbent-dominated", {
        observed: {
          latency_ms_p50: 11_000,
          latency_ms_p95: 11_000,
          tokens_per_sec: 50,
          failure_rate: 0,
          cost_per_1k_tokens_est: 0.4,
          measured_at_ms: Date.now(),
        },
        benchmarkCapability: { overallScore: 0.95 },
        routingSignals: {
          catalogCostEstimate: {
            canonicalModelId: "incumbent-dominated",
            tokenEconomicsSource: "catalog",
            inputPer1M: null,
            outputPer1M: null,
            estimatedRequestUsd: 0.4,
            cost_per_1k_tokens_est: 0.4,
          },
        },
      }),
      candidate("challenger-non-inferior", {
        observed: {
          latency_ms_p50: 7_000,
          latency_ms_p95: 7_000,
          tokens_per_sec: 50,
          failure_rate: 0,
          cost_per_1k_tokens_est: 0.25,
          measured_at_ms: Date.now(),
        },
        benchmarkCapability: { overallScore: 0.91 },
        routingSignals: {
          catalogCostEstimate: {
            canonicalModelId: "challenger-non-inferior",
            tokenEconomicsSource: "catalog",
            inputPer1M: null,
            outputPer1M: null,
            estimatedRequestUsd: 0.25,
            cost_per_1k_tokens_est: 0.25,
          },
        },
      }),
    ],
  };
}

describe("run106 non-inferiority ranking (R8 integration)", () => {
  test("a non-inferior, materially faster and cheaper arm outranks a dominated weighted leader", () => {
    const decision = routeRequest(buildInput());

    // The challenger is non-inferior on quality (0.91 >= 0.95 - 0.05), and is materially
    // faster (7000ms vs 11000ms) and cheaper ($0.25 vs $0.40). It must outrank the leader.
    expect(decision.chosen_endpoint_id).toBe("challenger-non-inferior");
    expect(decision.scored_candidates[0]?.endpoint_id).toBe("challenger-non-inferior");
    expect(decision.fallback_endpoint_ids).toContain("incumbent-dominated");
  });
});
