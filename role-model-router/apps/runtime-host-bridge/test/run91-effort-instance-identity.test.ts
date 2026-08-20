import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import { createDownstreamOpenAIDiscovery } from "../src/downstream-openai-discovery.js";
import {
  createModelListResponse,
  createRuntimeModelRecords,
  mapChatCompletionsRequest,
  mapResponsesRequest,
  resolveAdapterGatedReasoningEfforts,
  resolveEndpointExecutionEffort,
} from "../src/index.js";

const source = {
  vendor: "models.dev",
  commit: "run91-test",
  capturedAt: "2026-08-15T00:00:00.000Z",
  schemaVersion: "models.dev.v1",
};

const catalog = {
  catalogVersion: "run91-test",
  source,
  providers: [],
  models: [
    {
      modelId: "deepseek/deepseek-v4-pro",
      providerId: "deepseek",
      providerKind: "provider-openai",
      authFamily: "api-key",
      displayName: "DeepSeek V4 Pro",
      version: "test",
      capabilities: ["text.chat", "reasoning", "tools.function_calling"],
      modalities: ["text"],
      reasoningEffortLevels: ["medium", "max"],
      reasoningOptionKinds: ["effort"],
      contextWindow: 128_000,
      maxOutputTokens: 16_000,
      pricing: null,
      requestShapeHints: null,
      experimentalModes: [],
      extendsProvenance: { baseModelId: null, chain: [] },
      upstreamProvenance: source,
    },
  ],
} as never;

function endpoint(endpointId: string, reasoningEffort: string | null) {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: "deepseek/deepseek-v4-pro",
      runtime_version: "run91-test",
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
    },
    status: "active",
  };
}

const defaultEndpoint = endpoint("account.global.deepseek-v4-pro", null);
const mediumEndpoint = endpoint("account.global.deepseek-v4-pro~effort-v1~bWVkaXVt", "medium");
const maxEndpoint = endpoint("account.global.deepseek-v4-pro~effort-v1~bWF4", "max");
const registry = {
  endpoints: [defaultEndpoint, mediumEndpoint, maxEndpoint],
  diagnostics: [],
  lifecycleSummary: { active: 3, degraded: 0, offline: 0 },
} as unknown as EndpointRegistryResult;

describe("Run 91 effort instance identity", () => {
  test("offers catalog effort values only through a versioned serializer-capable adapter", () => {
    expect(
      resolveAdapterGatedReasoningEfforts({
        providerId: "deepseek",
        modelId: "deepseek/deepseek-v4-pro",
        capabilities: ["reasoning"],
        catalogLevels: ["medium", "max"],
        adapterFamily: "ai-sdk-openai-compatible",
      }),
    ).toEqual(["medium", "max"]);
    expect(
      resolveAdapterGatedReasoningEfforts({
        providerId: "deepseek",
        modelId: "deepseek/deepseek-v4-pro",
        capabilities: ["reasoning"],
        catalogLevels: ["medium", "max"],
        adapterFamily: "unversioned-custom-adapter",
      }),
    ).toEqual([]);
  });

  test("coerces a conflicting client effort to the selected fixed endpoint effort", () => {
    const resolution = resolveEndpointExecutionEffort({
      fixedEffort: "high",
      executionRequest: {
        messages: [{ role: "user", content: "hello" }],
        reasoning: { effort: "medium" },
      } as never,
    });

    expect(resolution.executionRequest.reasoning).toEqual({ effort: "high" });
    expect(resolution.receipt).toEqual({
      reasoningEffort: "high",
      effortSource: "variant_coerced",
    });
  });

  test("attributes an unchanged fixed endpoint effort to the endpoint variant", () => {
    const resolution = resolveEndpointExecutionEffort({
      fixedEffort: "high",
      executionRequest: {
        messages: [{ role: "user", content: "hello" }],
        reasoning: { effort: "high" },
      } as never,
    });

    expect(resolution.receipt).toEqual({
      reasoningEffort: "high",
      effortSource: "variant",
    });
  });

  test("preserves client effort on a provider-default endpoint", () => {
    const resolution = resolveEndpointExecutionEffort({
      fixedEffort: null,
      executionRequest: {
        messages: [{ role: "user", content: "hello" }],
        reasoning: { effort: "medium" },
      } as never,
    });

    expect(resolution.receipt).toEqual({
      reasoningEffort: "medium",
      effortSource: "client",
    });
  });

  test("discovery retains the aggregate row and emits one selectable endpoint row per sibling", () => {
    const response = createDownstreamOpenAIDiscovery({
      baseUrl: "http://127.0.0.1:3456",
      catalog,
      registry,
    });
    const aggregate = response.models.find((model) => model.id === "deepseek/deepseek-v4-pro");
    const endpointRows = response.models.filter((model) => model.type === "endpoint");

    expect(aggregate).toMatchObject({
      type: "model",
      endpoint_ids: [
        "account.global.deepseek-v4-pro",
        "account.global.deepseek-v4-pro~effort-v1~bWVkaXVt",
        "account.global.deepseek-v4-pro~effort-v1~bWF4",
      ],
      capabilities: {
        reasoning: {
          effortLevels: ["medium", "max"],
        },
      },
    });
    expect(endpointRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "account.global.deepseek-v4-pro",
          type: "endpoint",
          endpoint_ids: ["account.global.deepseek-v4-pro"],
          upstream_model_id: "deepseek/deepseek-v4-pro",
          fixed_effort: null,
        }),
        expect.objectContaining({
          id: "account.global.deepseek-v4-pro~effort-v1~bWVkaXVt",
          type: "endpoint",
          endpoint_ids: ["account.global.deepseek-v4-pro~effort-v1~bWVkaXVt"],
          upstream_model_id: "deepseek/deepseek-v4-pro",
          fixed_effort: "medium",
        }),
        expect.objectContaining({
          id: "account.global.deepseek-v4-pro~effort-v1~bWF4",
          type: "endpoint",
          endpoint_ids: ["account.global.deepseek-v4-pro~effort-v1~bWF4"],
          upstream_model_id: "deepseek/deepseek-v4-pro",
          fixed_effort: "max",
        }),
      ]),
    );
  });

  test("recognizes an endpoint id in model selection before model or alias lookup", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "account.global.deepseek-v4-pro~effort-v1~bWVkaXVt",
        messages: [{ role: "user", content: "hello" }],
      } as never,
      "run91-exact-endpoint",
    );

    expect(plan.routingRequest.allowEndpoints).toEqual([
      "account.global.deepseek-v4-pro~effort-v1~bWVkaXVt",
    ]);
  });

  test("routes an alias with explicit reasoning effort only to matching fixed variants", () => {
    const aliases = [
      {
        aliasId: "baseline.remote-only",
        modelIds: ["deepseek/deepseek-v4-pro"],
        executionMode: "remote_only",
      },
    ] as never;

    const mediumPlan = mapChatCompletionsRequest(
      registry,
      {
        model: "baseline.remote-only",
        messages: [{ role: "user", content: "hello" }],
        reasoning_effort: "medium",
      } as never,
      "run91-alias-medium",
      aliases,
    );
    const maxPlan = mapResponsesRequest(
      registry,
      {
        model: "baseline.remote-only",
        input: "hello",
        reasoning: { effort: "max" },
      } as never,
      "run91-alias-max",
      aliases,
    );

    expect(mediumPlan.routingRequest.allowEndpoints).toEqual([
      "account.global.deepseek-v4-pro~effort-v1~bWVkaXVt",
    ]);
    expect(maxPlan.routingRequest.allowEndpoints).toEqual([
      "account.global.deepseek-v4-pro~effort-v1~bWF4",
    ]);
  });

  test("falls back to provider-default for an unconfigured alias effort without coercing a sibling", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "baseline.remote-only",
        messages: [{ role: "user", content: "hello" }],
        reasoning_effort: "high",
      } as never,
      "run91-alias-high-fallback",
      [
        {
          aliasId: "baseline.remote-only",
          modelIds: ["deepseek/deepseek-v4-pro"],
          executionMode: "remote_only",
        },
      ] as never,
    );

    expect(plan.routingRequest.allowEndpoints).toEqual(["account.global.deepseek-v4-pro"]);
  });

  test("fails closed when an alias effort has neither a matching variant nor provider-default", () => {
    const fixedOnlyRegistry = {
      ...registry,
      endpoints: [mediumEndpoint, maxEndpoint],
    } as unknown as EndpointRegistryResult;

    expect(() =>
      mapChatCompletionsRequest(
        fixedOnlyRegistry,
        {
          model: "baseline.remote-only",
          messages: [{ role: "user", content: "hello" }],
          reasoning_effort: "high",
        } as never,
        "run91-alias-high-no-fallback",
        [
          {
            aliasId: "baseline.remote-only",
            modelIds: ["deepseek/deepseek-v4-pro"],
            executionMode: "remote_only",
          },
        ] as never,
      ),
    ).toThrow(/no targets|no registry endpoints|no execution target/i);
  });

  test("keeps an exact fixed endpoint authoritative when client effort conflicts", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "account.global.deepseek-v4-pro~effort-v1~bWF4",
        messages: [{ role: "user", content: "hello" }],
        reasoning_effort: "medium",
      } as never,
      "run91-exact-max-with-medium-client-effort",
    );

    expect(plan.routingRequest.allowEndpoints).toEqual([
      "account.global.deepseek-v4-pro~effort-v1~bWF4",
    ]);
  });

  test("compact /v1/models fallback preserves endpoint-instance rows without a catalog", () => {
    const response = createModelListResponse(registry);
    const endpointRows = response.data.filter((model) => model.fixed_effort !== undefined);

    expect(endpointRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "account.global.deepseek-v4-pro~effort-v1~bWVkaXVt",
          upstream_model_id: "deepseek/deepseek-v4-pro",
          fixed_effort: "medium",
        }),
        expect.objectContaining({
          id: "account.global.deepseek-v4-pro~effort-v1~bWF4",
          upstream_model_id: "deepseek/deepseek-v4-pro",
          fixed_effort: "max",
        }),
      ]),
    );
  });

  test("runtime model records expose catalog effort metadata to the UI", () => {
    const [record] = createRuntimeModelRecords(registry, catalog);

    expect(record).toMatchObject({
      id: "deepseek/deepseek-v4-pro",
      reasoningEffortLevels: ["medium", "max"],
      reasoning: {
        supported: true,
        effortControl: true,
        effortLevels: ["medium", "max"],
      },
    });
  });
});
