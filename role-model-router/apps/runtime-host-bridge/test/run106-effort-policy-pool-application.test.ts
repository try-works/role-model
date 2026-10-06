import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import { applyReasoningEffortToModelPool } from "../src/index.js";

/**
 * Run 106 R3/R10 (SP4b): the typed effort-policy resolution kind must be COMPUTED and RECORDED on the pool
 * application, not left implicit in the inlined `if (policy === "strict")` branching.
 *
 * The R10 resolution vocabulary is
 *   router_managed | exact_primary | exact_fallback_expanded | unsupported_fallback | strict_rejected | equivalent_mapped.
 * This test pins the pool-level kinds that resolveEffortPolicy can actually produce today: router_managed,
 * exact_primary (strict + exact arm), exact_fallback_expanded (preferred + exact arm), strict_rejected
 * (strict + no exact arm), and unsupported_fallback (preferred + zero exact arms).
 */

function endpoint(
  endpointId: string,
  modelId: string,
  reasoningEffort: string | null,
  options: { readonly declaredEffortLevels?: readonly string[] } = {},
) {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: modelId,
      runtime_version: "run106-test",
      region: "global",
      ...(reasoningEffort === null ? {} : { reasoning_effort: reasoningEffort }),
    },
    declared: {
      endpoint_id: endpointId,
      capabilities: ["text.chat", "reasoning", "tools.function_calling"],
      modalities: ["text"],
      max_context_tokens: 128_000,
      tool_calling: { supported: true, style: "openai" },
      supports_embeddings: false,
      ...(options.declaredEffortLevels
        ? { reasoning_effort_levels: [...options.declaredEffortLevels] }
        : {}),
    },
    status: "active",
  };
}

const FLASH = "deepseek/deepseek-flash";
const PRO = "deepseek/deepseek-v4-pro";

const flashLow = "deepseek.global.deepseek-flash-low";
const flashHigh = "deepseek.global.deepseek-flash-high";
const flashMax = "deepseek.global.deepseek-flash-max";
const proHigh = "deepseek.global.deepseek-v4-pro-high";
const proMax = "deepseek.global.deepseek-v4-pro-max";
const providerDefault = "deepseek.global.deepseek-v4-pro-default";

const registry = {
  endpoints: [
    endpoint(flashLow, FLASH, "low"),
    endpoint(flashHigh, FLASH, "high"),
    endpoint(flashMax, FLASH, "max"),
    endpoint(proHigh, PRO, "high"),
    endpoint(proMax, PRO, "max"),
    endpoint(providerDefault, PRO, null, { declaredEffortLevels: ["medium", "high"] }),
    endpoint("moonshot.global.kimi-k3-code", "moonshot/kimi-k3-code", "high"),
  ],
} as never as EndpointRegistryResult;

const aliasPool = [
  flashLow,
  flashHigh,
  flashMax,
  proHigh,
  proMax,
  providerDefault,
  "moonshot.global.kimi-k3-code",
];

describe("run106 R3/R10: effort-policy resolution kind is recorded on the pool application", () => {
  test("router policy records router_managed and keeps the pool and preference untouched", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: "baseline.remote-only",
      requestedEffort: "high",
      requestedPolicy: "router",
      allowEndpoints: aliasPool,
      preferredEndpointIds: [flashLow],
    });

    expect(applied.resolution).toBe("router_managed");
    expect(applied.effectiveEffort).toBeNull();
    expect(applied.allowEndpoints).toEqual(aliasPool);
    expect(applied.preferredEndpointIds).toEqual([flashLow]);
  });

  test("strict with an exact arm records exact_primary and narrows to the exact arms", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: "baseline.remote-only",
      requestedEffort: "high",
      requestedPolicy: "strict",
      allowEndpoints: aliasPool,
      preferredEndpointIds: [],
    });

    expect(applied.resolution).toBe("exact_primary");
    expect(applied.effectiveEffort).toBe("high");
    expect(applied.allowEndpoints).toEqual([flashHigh, proHigh, "moonshot.global.kimi-k3-code"]);
    expect(applied.preferredEndpointIds).toEqual([]);
  });

  test("strict with no exact arm records strict_rejected and empties the pool", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: "baseline.remote-only",
      requestedEffort: "ultra",
      requestedPolicy: "strict",
      allowEndpoints: aliasPool,
      preferredEndpointIds: [flashLow],
    });

    expect(applied.resolution).toBe("strict_rejected");
    expect(applied.effectiveEffort).toBeNull();
    expect(applied.allowEndpoints).toEqual([]);
    expect(applied.preferredEndpointIds).toEqual([]);
  });

  test("preferred with an exact arm records exact_fallback_expanded and prefers the exact arms", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: "baseline.remote-only",
      requestedEffort: "high",
      requestedPolicy: "preferred",
      allowEndpoints: aliasPool,
      preferredEndpointIds: [],
    });

    expect(applied.resolution).toBe("exact_fallback_expanded");
    expect(applied.effectiveEffort).toBe("high");
    expect(applied.allowEndpoints).toEqual(aliasPool);
    expect(applied.preferredEndpointIds).toEqual([
      flashHigh,
      proHigh,
      "moonshot.global.kimi-k3-code",
    ]);
  });

  test("preferred with zero exact arms records unsupported_fallback and keeps the pool router-managed", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: "baseline.remote-only",
      requestedEffort: "ultra",
      requestedPolicy: "preferred",
      allowEndpoints: aliasPool,
      preferredEndpointIds: [flashLow],
    });

    expect(applied.resolution).toBe("unsupported_fallback");
    expect(applied.effectiveEffort).toBeNull();
    expect(applied.allowEndpoints).toEqual(aliasPool);
    expect(applied.preferredEndpointIds).toEqual([flashLow]);
  });

  test("no requested effort records router_managed regardless of policy", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: "baseline.remote-only",
      requestedEffort: null,
      requestedPolicy: "preferred",
      allowEndpoints: aliasPool,
      preferredEndpointIds: [flashLow],
    });

    expect(applied.resolution).toBe("router_managed");
    expect(applied.effectiveEffort).toBeNull();
    expect(applied.allowEndpoints).toEqual(aliasPool);
    expect(applied.preferredEndpointIds).toEqual([flashLow]);
  });
});
