import { expect, test } from "vitest";

import { routeRequest } from "../src/router.js";
import type { EndpointCandidate, RouteRequestInput, RoutingRequest } from "../src/types.js";

/**
 * Run 98 addendum 57 §3.3 — the capability vocabulary the fleet actually uses.
 *
 * Live v302: every endpoint declares `code.edit, reasoning, structured.output, text.chat,
 * tools.function_calling` while the taxonomy's code families require `code.read` (and `coder.edit` also
 * `code.write`), so a request that declared the family the advisory was validated for was refused with
 * `400 no_eligible_target` — the advisory could never apply. A model that can edit code can read and write it,
 * so the catalogue's declaration satisfies the narrower requirements; the implication is deliberately narrow
 * (it satisfies nothing else).
 */
function candidate(endpointId: string, capabilities: readonly string[]): EndpointCandidate {
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
      capabilities,
      modalities: ["text"],
      max_context_tokens: 100_000,
      tool_calling: { supported: capabilities.includes("tools.function_calling"), style: "openai" },
      supports_embeddings: false,
    },
    status: "active",
  };
}

const baseRequest: RoutingRequest = {
  requestId: "a57-code-capability",
  taskType: "coder.review",
  requiredCapabilities: [],
  preferredCapabilities: [],
  requiredModalities: ["text"],
  contextTokens: 1_000,
  needsTools: false,
  strategy: "balanced",
  preferLocal: false,
};

const input = (
  request: RoutingRequest,
  candidates: readonly EndpointCandidate[],
): RouteRequestInput => ({ request, candidates });

const missingCapabilityExclusions = (decision: ReturnType<typeof routeRequest>): number =>
  decision.eligibility.reduce(
    (total, entry) =>
      total +
      (
        (entry as { readonly exclusions?: readonly { readonly code?: string }[] }).exclusions ?? []
      ).filter((exclusion) => exclusion.code === "CAPABILITY_MISSING").length,
    0,
  );

test("an endpoint declaring code.edit satisfies a code.read requirement", () => {
  const decision = routeRequest(
    input({ ...baseRequest, requiredCapabilities: ["code.read"] }, [
      candidate("edit-model", ["text.chat", "code.edit"]),
    ]),
  );

  expect(missingCapabilityExclusions(decision)).toBe(0);
  expect(decision.chosen_endpoint_id).toBe("edit-model");
});

test("an endpoint declaring code.edit satisfies a code.write requirement", () => {
  const decision = routeRequest(
    input({ ...baseRequest, requiredCapabilities: ["code.write"] }, [
      candidate("edit-model", ["text.chat", "code.edit"]),
    ]),
  );

  expect(missingCapabilityExclusions(decision)).toBe(0);
  expect(decision.chosen_endpoint_id).toBe("edit-model");
});

test("the implication is narrow — an unrelated requirement still excludes the endpoint", () => {
  const decision = routeRequest(
    input({ ...baseRequest, requiredCapabilities: ["code.read", "tools.function_calling"] }, [
      candidate("edit-model", ["text.chat", "code.edit"]),
    ]),
  );

  expect(missingCapabilityExclusions(decision)).toBe(1);
  expect(decision.scored_candidates).toHaveLength(0);
});

test("a model without code.edit is still excluded from a code.read requirement", () => {
  const decision = routeRequest(
    input({ ...baseRequest, requiredCapabilities: ["code.read"] }, [
      candidate("chat-model", ["text.chat"]),
    ]),
  );

  expect(missingCapabilityExclusions(decision)).toBe(1);
  expect(decision.scored_candidates).toHaveLength(0);
});
