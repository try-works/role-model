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
 * may order that pool, it may not empty it.
 *
 * Run 101 addendum 15 (measured on `:3457` 2026-09-27): the same filter emptied a *model id's* pool, so pi/DSH
 * requests that name `chatgpt/gpt-5.6-sol` plus `medium` had one candidate; the first provider flake then had
 * nowhere to fail over to and the attempt's 503 became the request's status (every 503 row in the 24-hour telemetry
 * read carried `candidateCount = 1` and `rerouteCount = 0`). A model id is a pool too. Only an endpoint row - the
 * model value itself or the explicit `endpointId` option - names an instance and keeps the strict
 * effort-instance selection (run 91 semantics), which the cases below pin.
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
    });

    expect(applied.allowEndpoints).toHaveLength(aliasPool.length);
    expect(applied.preferredEndpointIds).toEqual([flashLow]);
  });

  test("an alias request whose effort names no instance in the pool records unsupported_fallback and keeps the pool", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: "baseline.remote-only",
      requestedEffort: "ultra",
      allowEndpoints: aliasPool,
      preferredEndpointIds: [flashLow],
    });

    // Run 106 R3/D5: preferred + zero exact executable arms records unsupported_fallback, ignores the hint, and
    // keeps the pool router-managed instead of refusing; the effort is never silently coerced.
    expect(applied.allowEndpoints).toEqual(aliasPool);
    expect(applied.preferredEndpointIds).toEqual([flashLow]);
    expect(applied.resolution).toBe("unsupported_fallback");
  });

  test("a model id is a pool: the requested effort orders it and the pool keeps its members", () => {
    const modelPool = [flashLow, flashHigh, flashMax];
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: FLASH,
      requestedEffort: "high",
      allowEndpoints: modelPool,
      preferredEndpointIds: [],
    });

    // Run 101 addendum 15: the pool survives, so denying `flashHigh` after a provider flake still leaves
    // `flashLow`/`flashMax` for the reroute loop instead of surfacing a 503.
    expect(applied.allowEndpoints).toEqual(modelPool);
    expect(applied.preferredEndpointIds).toEqual([flashHigh]);
  });

  test("an explicit model id with an unsupported effort records unsupported_fallback and keeps the pool", () => {
    const modelPool = [flashLow, flashHigh, flashMax];
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: FLASH,
      requestedEffort: "ultra",
      allowEndpoints: modelPool,
      preferredEndpointIds: [],
    });

    expect(applied.allowEndpoints).toEqual(modelPool);
    expect(applied.resolution).toBe("unsupported_fallback");
  });

  test("an endpoint row as the model value keeps exact instance selection", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: flashHigh,
      requestedEffort: "high",
      allowEndpoints: [flashHigh],
      preferredEndpointIds: [],
    });

    expect(applied.allowEndpoints).toEqual([flashHigh]);
    expect(applied.preferredEndpointIds).toEqual([]);
  });

  test("an explicit endpointId option keeps exact instance selection", () => {
    const applied = applyReasoningEffortToModelPool({
      registry,
      requestedModel: FLASH,
      requestedEndpointId: flashLow,
      requestedEffort: "high",
      allowEndpoints: [flashLow],
      preferredEndpointIds: [],
    });

    // The instance is named, so the strict filter applies and an effort the named row cannot run stays the bounded
    // `reasoning_effort_unavailable` refusal rather than being served at another instance.
    expect(applied.allowEndpoints).toEqual([]);
  });
});
