import { Effect, Layer } from "effect";
import { describe, expect, test } from "vitest";

import { RouteDecisionProducer, routeRequest } from "@role-model-router/core";
import {
  type ProjectRuntimeRouteInputInput,
  projectRuntimeRouteInput,
  routeRuntimeRequest,
} from "../src/index.js";
import { TEST_CATALOG } from "./test-catalog-fixture.js";

/**
 * Run 115 S7b (R25): the real caller must obtain its decision through the producer's Effect
 * service. These tests instrument the producer Layer, so they fail if `routeRuntimeRequest`
 * keeps calling the synchronous kernel directly no matter how equal the returned decision is.
 */

function runtimeInput(
  overrides: Partial<ProjectRuntimeRouteInputInput> = {},
): ProjectRuntimeRouteInputInput {
  return {
    request: {
      requestId: "run115-s7b-wiring",
      taskType: "text.chat",
      requiredCapabilities: ["text.chat"],
      preferredCapabilities: [],
      requiredModalities: ["text"],
      contextTokens: 64,
      needsTools: false,
      strategy: "balanced",
      preferLocal: false,
      allowEndpoints: ["remote.producer"],
    },
    catalog: TEST_CATALOG,
    registry: {
      endpoints: [
        {
          identity: {
            endpoint_id: "remote.producer",
            endpoint_kind: "remote_api",
            provider_kind: "remote_openai_compat",
            serving_source: "remote-service",
            model_id: "openai/gpt-4.1-mini-fast",
            runtime_version: "run115-s7b",
            region: "global",
          },
          declared: {
            endpoint_id: "remote.producer",
            capabilities: ["text.chat", "reasoning"],
            modalities: ["text"],
            max_context_tokens: 32768,
            tool_calling: { supported: false, style: "none" },
            supports_embeddings: false,
            platform_constraints: [],
          },
          status: "active",
        },
      ],
      diagnostics: [],
      lifecycleSummary: { active: 1, degraded: 0, offline: 0 },
    },
    observedProfilesByEndpointId: {},
    envelope: {
      sessionId: "session-s7b",
      conversationId: "conversation-s7b",
      selectedTurns: [],
      selectedArtifacts: [],
      latestHandoff: null,
      estimatedTokenCount: 0,
      diagnostics: [],
    },
    retrievalReceipt: {
      receiptId: "conversation-s7b-retrieval-receipt",
      conversationId: "conversation-s7b",
      summary: {
        selectedTurns: 0,
        selectedArtifacts: 0,
        omittedTurns: 0,
        omittedArtifacts: 0,
        estimatedTokens: 0,
      },
      entries: [],
    },
    roleDefinitions: [],
    taskDefinitions: [],
    roleBindings: [],
    ...overrides,
  };
}

interface ProducerInvocations {
  decisions: number;
}

/** A Layer whose implementation is observably a wrapper around the kernel. */
function countingProducerLayer(counter: ProducerInvocations) {
  return Layer.succeed(RouteDecisionProducer, {
    decide: (routeInput) => {
      counter.decisions += 1;
      return Effect.sync(() => routeRequest(routeInput));
    },
  });
}

describe("run115 S7b route decision producer wiring", () => {
  test("routeRuntimeRequest obtains its decision through the producer Layer", () => {
    const counter: ProducerInvocations = { decisions: 0 };
    const fixture = runtimeInput();

    const result = routeRuntimeRequest(fixture, {
      routeDecisionLayer: countingProducerLayer(counter),
    });

    // While the caller still bypasses the producer this is the assertion that fails (0 !== 1);
    // equal output alone could never prove the wiring.
    expect(counter.decisions).toBe(1);

    const kernelDecision = routeRequest(projectRuntimeRouteInput(fixture).routeInput);
    expect(result.decision).toEqual(kernelDecision);
    expect(JSON.stringify(result.decision)).toBe(JSON.stringify(kernelDecision));
    expect(result.decision.chosen_endpoint_id).toBe("remote.producer");
  });

  test("the empty pool stays a success with an empty chosen endpoint id", () => {
    const counter: ProducerInvocations = { decisions: 0 };
    const fixture = runtimeInput({
      registry: {
        endpoints: [],
        diagnostics: [],
        lifecycleSummary: { active: 0, degraded: 0, offline: 0 },
      },
    });

    const result = routeRuntimeRequest(fixture, {
      routeDecisionLayer: countingProducerLayer(counter),
    });

    expect(counter.decisions).toBe(1);
    expect(result.decision.chosen_endpoint_id).toBe("");
    expect(result.decision.selection_reasons).toEqual([]);
    expect(result.decision).toEqual(routeRequest(projectRuntimeRouteInput(fixture).routeInput));
  });

  test("one-arg callers keep the default producer Layer decision", () => {
    const fixture = runtimeInput();
    const result = routeRuntimeRequest(fixture);
    expect(result.decision).toEqual(routeRequest(projectRuntimeRouteInput(fixture).routeInput));
  });
});
