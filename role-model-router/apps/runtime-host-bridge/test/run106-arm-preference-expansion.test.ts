import { describe, expect, it } from "vitest";

import { expandPreferredEndpointIdsToEffortArms } from "../src/index.js";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

function endpoint(id: string, reasoningEffort: string | null) {
  return {
    identity: {
      endpoint_id: id,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: "acct.global.model",
      runtime_version: "1",
      region: "global",
      ...(reasoningEffort === null ? { reasoning_effort: null } : { reasoning_effort: reasoningEffort }),
    },
    declared: {
      endpoint_id: id,
      capabilities: ["text.chat"],
      modalities: ["text"],
      max_context_tokens: 100_000,
      tool_calling: { supported: false, style: "openai" },
      supports_embeddings: false,
    },
    status: "active",
  } as unknown as EndpointRegistryResult["endpoints"][number];
}

function registry(endpoints: ReturnType<typeof endpoint>[]): EndpointRegistryResult {
  return { endpoints } as unknown as EndpointRegistryResult;
}

describe("run106 arm-aware controller/advisory preference expansion (R6)", () => {
  const base = "acct.global.model";
  const high = base + "-" + encodeURIComponent("high");
  const max = base + "-" + encodeURIComponent("max");

  it("expands a base-endpoint preference to every eligible effort arm deterministically", () => {
    const result = expandPreferredEndpointIdsToEffortArms({
      registry: registry([endpoint(base, null), endpoint(high, "high"), endpoint(max, "max")]),
      allowEndpoints: [base, high, max],
      preferredEndpointIds: [base],
    });
    expect(result).toEqual([base, high, max]);
  });

  it("only expands into the already-eligible arms (never invents effort)", () => {
    const result = expandPreferredEndpointIdsToEffortArms({
      registry: registry([endpoint(base, null), endpoint(high, "high"), endpoint(max, "max")]),
      allowEndpoints: [base, high],
      preferredEndpointIds: [base],
    });
    expect(result).toEqual([base, high]);
  });

  it("keeps a specific fixed-arm preference exact", () => {
    const result = expandPreferredEndpointIdsToEffortArms({
      registry: registry([endpoint(base, null), endpoint(high, "high"), endpoint(max, "max")]),
      allowEndpoints: [base, high, max],
      preferredEndpointIds: [high],
    });
    expect(result).toEqual([high]);
  });

  it("drops a preference that names neither a base endpoint nor an eligible arm", () => {
    const result = expandPreferredEndpointIdsToEffortArms({
      registry: registry([endpoint(base, null), endpoint(high, "high")]),
      allowEndpoints: [base, high],
      preferredEndpointIds: ["other.base"],
    });
    expect(result).toEqual([]);
  });
});
