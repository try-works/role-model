import { describe, expect, test } from "vitest";

import { routeRequest } from "../src/router.js";
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
      ...(reasoningEffort === null ? { reasoning_effort: null } : { reasoning_effort: reasoningEffort }),
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
  requestId: "run106-canonical-decision-provenance",
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

describe("run106 canonical decision provenance (R10)", () => {
  test("a provider-default chosen arm records effort_source provider_default", () => {
    const decision = routeRequest(buildInput());
    expect(decision.effort_source).toBe("provider_default");
  });

  test("a fixed-effort chosen arm records effort_source named", () => {
    const decision = routeRequest(
      buildInput({ candidates: [candidate("fixed-high", "high")] }),
    );
    expect(decision.reasoning_effort).toBe("high");
    expect(decision.effort_source).toBe("named");
  });

  test("the decision records resolution kind and effective effort", () => {
    const decision = routeRequest(
      buildInput({
        candidates: [candidate("fixed-high", "high")],
        effortResolution: {
          resolution: "exact_primary",
          effectiveEffort: "high",
        },
      }),
    );
    expect(decision.effort_resolution).toBe("exact_primary");
    expect(decision.effective_effort).toBe("high");
  });

  test("router-managed resolution records a null effective effort", () => {
    const decision = routeRequest(
      buildInput({
        candidates: [candidate("fixed-high", "high")],
        effortResolution: {
          resolution: "router_managed",
          effectiveEffort: null,
        },
      }),
    );
    expect(decision.effort_resolution).toBe("router_managed");
    expect(decision.effective_effort).toBeNull();
  });
});
