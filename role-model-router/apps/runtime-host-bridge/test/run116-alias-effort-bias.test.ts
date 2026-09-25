import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import { applyReasoningEffortToModelPool } from "../src/index.js";

/**
 * Run 100 addendum 10, E3 (measured on `:3457` 2026-09-24/25):
 *
 * A client that sends `reasoning_effort` on an alias request never saw the alias pool. The alias resolved to all
 * seven endpoints and the router then reported `eligible=2 codes=POLICY_DENY_ENDPOINT=5` for `high`, `eligible=1`
 * for `low` - because `filterRequestedModelPoolByReasoningEffort` replaced the pool with the endpoints whose fixed
 * effort equals the requested one. The operator's rule is that an alias is a pool plus a bias: the request's effort
 * may order that pool, it may not empty it. Exact effort-instance selection stays authoritative for an explicit
 * model id or endpoint row (run 91 semantics), which the third case below pins.
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
      runtime_version: "run116-test",
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

describe("run116 E3: an alias keeps its pool and treats the requested effort as a bias", () => {
  test("an alias request that asks for high keeps every endpoint and prefers the high instances", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: "baseline.remote-only",
      requestedEffort: "high",
      allowEndpoints: aliasPool,
      preferredEndpointIds: [],
      aliasRequest: true,
    });

    expect(applied.allowEndpoints).toHaveLength(aliasPool.length);
    expect([...applied.allowEndpoints].sort()).toEqual([...aliasPool].sort());
    // The bias is the router's own preference channel (`routingModelRank`), so the pool stays intact even when the
    // preferred instance is unhealthy or over budget.
    // The preference names exactly the instances the strict filter would have named (one shared selector), so a
    // provider-default row is not "the high instance" while a fixed-effort instance of the same level exists.
    expect(applied.preferredEndpointIds).toEqual([
      flashHigh,
      proHigh,
      "moonshot.global.kimi-k3-code",
    ]);
  });

  test("an alias request with no effort keeps the pool and the alias's configured preference", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: "baseline.remote-only",
      requestedEffort: null,
      allowEndpoints: aliasPool,
      preferredEndpointIds: [flashLow],
      aliasRequest: true,
    });

    expect(applied.allowEndpoints).toHaveLength(aliasPool.length);
    expect(applied.preferredEndpointIds).toEqual([flashLow]);
  });

  test("an alias request whose effort names no instance in the pool still refuses instead of coercing silently", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: "baseline.remote-only",
      requestedEffort: "ultra",
      allowEndpoints: aliasPool,
      preferredEndpointIds: [flashLow],
      aliasRequest: true,
    });

    // An empty pool is what the callers turn into the bounded `reasoning_effort_unavailable` error (run 98), so an
    // effort nothing in the pool can run stays a refusal - the pool keeps its membership only when the effort can be
    // honoured by at least one of its instances.
    expect(applied.allowEndpoints).toEqual([]);
    expect(applied.preferredEndpointIds).toEqual([]);
  });

  test("an explicit model id keeps exact effort-instance selection", () => {
    const modelPool = [flashLow, flashHigh, flashMax];
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: FLASH,
      requestedEffort: "high",
      allowEndpoints: modelPool,
      preferredEndpointIds: [],
      aliasRequest: false,
    });

    expect(applied.allowEndpoints).toEqual([flashHigh]);
    expect(applied.preferredEndpointIds).toEqual([]);
  });

  test("an explicit model id with an unsupported effort still refuses the pool", () => {
    const modelPool = [flashLow, flashHigh, flashMax];
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: FLASH,
      requestedEffort: "ultra",
      allowEndpoints: modelPool,
      preferredEndpointIds: [],
      aliasRequest: false,
    });

    expect(applied.allowEndpoints).toEqual([]);
  });
});
