import { describe, expect, it } from "vitest";

import { resolveEndpointExecutionEffort } from "../src/index.js";

function executionRequest(effort?: string) {
  return {
    messages: [],
    ...(effort ? { reasoning: { effort } } : {}),
  };
}

describe("run106 canonical effort emission (R10)", () => {
  it("fixed-effort arm without a client effort emits variant", () => {
    const result = resolveEndpointExecutionEffort({
      fixedEffort: "high",
      declaredEffortLevels: [],
      executionRequest: executionRequest(),
    });
    expect(result.receipt).toEqual({
      reasoningEffort: "high",
      effortSource: "variant",
      coerced: false,
    });
  });

  it("fixed-effort arm with a different client effort emits variant_coerced with coerced=true", () => {
    const result = resolveEndpointExecutionEffort({
      fixedEffort: "high",
      declaredEffortLevels: [],
      executionRequest: executionRequest("max"),
    });
    expect(result.receipt).toEqual({
      reasoningEffort: "high",
      effortSource: "variant_coerced",
      coerced: true,
    });
  });

  it("provider-default arm honoring a declared client effort emits client", () => {
    const result = resolveEndpointExecutionEffort({
      fixedEffort: null,
      declaredEffortLevels: ["low", "high"],
      executionRequest: executionRequest("high"),
    });
    expect(result.receipt).toEqual({
      reasoningEffort: "high",
      effortSource: "client",
      coerced: false,
    });
  });

  it("provider-default arm with no client effort emits none (not provider_default)", () => {
    const result = resolveEndpointExecutionEffort({
      fixedEffort: null,
      declaredEffortLevels: ["low", "high"],
      executionRequest: executionRequest(),
    });
    expect(result.receipt).toEqual({ reasoningEffort: null, effortSource: "none", coerced: false });
  });

  it("provider-default arm with an undeclared client effort strips reasoning and emits none", () => {
    const result = resolveEndpointExecutionEffort({
      fixedEffort: null,
      declaredEffortLevels: ["low"],
      executionRequest: executionRequest("max"),
    });
    expect(result.receipt).toEqual({ reasoningEffort: null, effortSource: "none", coerced: false });
    expect(result.executionRequest.reasoning).toBeUndefined();
  });

  it("provider-default arm with disabled reasoning (none) emits none and strips reasoning", () => {
    const result = resolveEndpointExecutionEffort({
      fixedEffort: null,
      declaredEffortLevels: ["low", "high"],
      executionRequest: executionRequest("none"),
    });
    expect(result.receipt).toEqual({ reasoningEffort: null, effortSource: "none", coerced: false });
    expect(result.executionRequest.reasoning).toBeUndefined();
  });

  it("provider-default arm with disabled reasoning (off) emits none", () => {
    const result = resolveEndpointExecutionEffort({
      fixedEffort: null,
      declaredEffortLevels: ["low", "high"],
      executionRequest: executionRequest("off"),
    });
    expect(result.receipt).toEqual({ reasoningEffort: null, effortSource: "none", coerced: false });
    expect(result.executionRequest.reasoning).toBeUndefined();
  });
});
