import { Effect } from "effect";
import { describe, expect, test } from "vitest";

import {
  RouteDecisionProducer,
  RouteDecisionProducerLive,
} from "../src/route-decision-producer.js";
import { routeRequest } from "../src/router.js";
import type { EndpointCandidate, RouteRequestInput, RoutingRequest } from "../src/types.js";

/**
 * Run 115 S7 (R25): the Effect producer must return the SAME decision the synchronous kernel
 * returns, for every shape of input, including ties, the empty pool, hard eligibility,
 * arm/effort identity and the reason code/detail wire fields.
 */

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

function request(overrides: Partial<RoutingRequest> = {}): RoutingRequest {
  return {
    requestId: "run115-s7-route-decision-producer",
    taskType: "text.chat",
    requiredCapabilities: [],
    preferredCapabilities: [],
    requiredModalities: ["text"],
    contextTokens: 1000,
    needsTools: false,
    strategy: "balanced",
    preferLocal: false,
    ...overrides,
  };
}

/** Run the producer through its service and live layer, exactly as an Effect caller would. */
function decideThroughProducer(input: RouteRequestInput) {
  return Effect.runSync(
    Effect.provide(
      RouteDecisionProducer.use((producer) => producer.decide(input)),
      RouteDecisionProducerLive,
    ),
  );
}

interface Fixture {
  readonly name: string;
  readonly input: () => RouteRequestInput;
  readonly assert: (decision: ReturnType<typeof routeRequest>) => void;
}

const fixtures: readonly Fixture[] = [
  {
    name: "ties",
    input: () => ({
      request: request({ requestId: "run115-s7-ties" }),
      candidates: [candidate("alpha", null), candidate("beta", null)],
    }),
    assert: (decision) => {
      expect(decision.chosen_endpoint_id).toBe("alpha");
      expect(decision.selection_reasons).toContain("TIE_BREAK_APPLIED");
    },
  },
  {
    name: "empty pool",
    input: () => ({
      request: request({ requestId: "run115-s7-empty-pool" }),
      candidates: [],
    }),
    assert: (decision) => {
      expect(decision.chosen_endpoint_id).toBe("");
      expect(decision.fallback_endpoint_ids).toEqual([]);
      expect(decision.selection_reasons).toEqual([]);
      expect(decision.eligibility).toEqual([]);
      expect(decision.scored_candidates).toEqual([]);
    },
  },
  {
    name: "hard eligibility filtering",
    input: () => ({
      request: request({
        requestId: "run115-s7-hard-eligibility",
        requiredCapabilities: ["text.chat"],
      }),
      candidates: [
        candidate("capable", null),
        candidate("incapable", null, {
          declared: {
            endpoint_id: "incapable",
            capabilities: ["embeddings"],
            modalities: ["text"],
            max_context_tokens: 100_000,
            tool_calling: { supported: false, style: "openai" },
            supports_embeddings: true,
          },
        }),
      ],
    }),
    assert: (decision) => {
      expect(decision.chosen_endpoint_id).toBe("capable");
      const excluded = decision.eligibility.find((entry) => entry.endpoint_id === "incapable");
      expect(excluded?.eligible).toBe(false);
      expect(excluded?.exclusions).toContainEqual({
        code: "CAPABILITY_MISSING",
        detail: "Endpoint is missing a required capability.",
      });
      expect(decision.selection_reasons).toContain("BEST_TOTAL_SCORE");
    },
  },
  {
    name: "arm and effort identity",
    input: () => ({
      request: request({ requestId: "run115-s7-effort-identity" }),
      candidates: [candidate("high-arm", "high")],
      effortResolution: { resolution: "exact_primary", effectiveEffort: "high", source: "named" },
    }),
    assert: (decision) => {
      expect(decision.chosen_endpoint_id).toBe("high-arm");
      expect(decision.reasoning_effort).toBe("high");
      expect(decision.effort_source).toBe("named");
      expect(decision.effort_resolution).toBe("exact_primary");
      expect(decision.effective_effort).toBe("high");
      expect(decision.effort_fallback_applied).toBeUndefined();
    },
  },
  {
    name: "effort fallback identity disagreement",
    input: () => ({
      request: request({ requestId: "run115-s7-effort-fallback" }),
      candidates: [candidate("high-arm", "high")],
      effortResolution: {
        resolution: "exact_fallback_expanded",
        effectiveEffort: "low",
        requestedEffort: "low",
        source: "named",
      },
    }),
    assert: (decision) => {
      expect(decision.chosen_endpoint_id).toBe("high-arm");
      expect(decision.reasoning_effort).toBe("high");
      expect(decision.effective_effort).toBe("low");
      expect(decision.requested_effort).toBe("low");
      expect(decision.effort_fallback_applied).toBe(true);
    },
  },
];

describe("run115 S7 (R25) Effect route decision producer", () => {
  for (const fixture of fixtures) {
    test(`${fixture.name}: the producer matches the synchronous kernel byte-for-byte`, () => {
      const synchronousDecision = routeRequest(fixture.input());
      const producedDecision = decideThroughProducer(fixture.input());

      expect(producedDecision).toEqual(synchronousDecision);
      expect(JSON.stringify(producedDecision)).toBe(JSON.stringify(synchronousDecision));
      fixture.assert(producedDecision);
    });
  }

  test("the empty pool stays a success with an empty chosen endpoint", () => {
    const decision = decideThroughProducer({
      request: request({ requestId: "run115-s7-empty-pool-success" }),
      candidates: [],
    });
    expect(decision.chosen_endpoint_id).toBe("");
    expect(decision.selection_reasons).toEqual([]);
  });
});
