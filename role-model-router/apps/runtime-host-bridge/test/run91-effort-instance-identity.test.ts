import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import { createDownstreamOpenAIDiscovery } from "../src/downstream-openai-discovery.js";
import {
  createModelListResponse,
  createRuntimeModelRecords,
  fetchWithTransientRetry,
  mapChatCompletionsRequest,
  mapResponsesRequest,
  resolveAdapterGatedReasoningEfforts,
  resolveEndpointExecutionEffort,
} from "../src/index.js";

describe("addendum 39 S2: the OAuth refresh retries transport failures only", () => {
  test("retries a transient transport failure and returns the successful response", async () => {
    let attempts = 0;
    const response = await fetchWithTransientRetry(
      async () => {
        attempts += 1;
        if (attempts < 2) {
          const cause = Object.assign(new Error("connect timeout"), {
            code: "UND_ERR_CONNECT_TIMEOUT",
          });
          throw new TypeError("fetch failed", { cause });
        }
        return new Response(JSON.stringify({ access_token: "token" }), { status: 200 });
      },
      "https://token.example/oauth",
      { method: "POST" },
    );

    expect(attempts).toBe(2);
    expect(response.status).toBe(200);
  });

  test("does not retry a rejected grant", async () => {
    let attempts = 0;
    await expect(
      fetchWithTransientRetry(
        async () => {
          attempts += 1;
          return new Response("invalid_grant", { status: 400 });
        },
        "https://token.example/oauth",
        { method: "POST" },
      ),
    ).resolves.toMatchObject({ status: 400 });
    expect(attempts).toBe(1);
  });
});

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

function endpoint(
  endpointId: string,
  reasoningEffort: string | null,
  options: {
    readonly modelId?: string;
    readonly modalities?: readonly string[];
    readonly declaredEffortLevels?: readonly string[];
  } = {},
) {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: options.modelId ?? "deepseek/deepseek-v4-pro",
      runtime_version: "run91-test",
      region: "global",
      ...(reasoningEffort === null ? {} : { reasoning_effort: reasoningEffort }),
    },
    declared: {
      endpoint_id: endpointId,
      capabilities: ["text.chat", "reasoning", "tools.function_calling"],
      modalities: options.modalities ?? ["text"],
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

const defaultEndpoint = endpoint("account.global.deepseek-v4-pro", null);
const mediumEndpoint = endpoint("account.global.deepseek-v4-pro-medium", "medium");
const maxEndpoint = endpoint("account.global.deepseek-v4-pro-max", "max");
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

  test("offers catalog effort values through the Anthropic thinking-budget serializer adapter", () => {
    expect(
      resolveAdapterGatedReasoningEfforts({
        providerId: "anthropic",
        modelId: "claude-3.7-sonnet",
        capabilities: ["reasoning"],
        catalogLevels: ["medium", "max"],
        adapterFamily: "ai-sdk-anthropic",
      }),
    ).toEqual(["medium", "max"]);
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

  test("keeps a provider-default endpoint at default effort", () => {
    const resolution = resolveEndpointExecutionEffort({
      fixedEffort: null,
      executionRequest: {
        messages: [{ role: "user", content: "hello" }],
        reasoning: { effort: "medium" },
      } as never,
    });

    expect(resolution.executionRequest.reasoning).toBeUndefined();
    expect(resolution.receipt).toEqual({ reasoningEffort: null, effortSource: "none" });
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
        "account.global.deepseek-v4-pro-medium",
        "account.global.deepseek-v4-pro-max",
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
          id: "account.global.deepseek-v4-pro-medium",
          type: "endpoint",
          endpoint_ids: ["account.global.deepseek-v4-pro-medium"],
          upstream_model_id: "deepseek/deepseek-v4-pro",
          fixed_effort: "medium",
        }),
        expect.objectContaining({
          id: "account.global.deepseek-v4-pro-max",
          type: "endpoint",
          endpoint_ids: ["account.global.deepseek-v4-pro-max"],
          upstream_model_id: "deepseek/deepseek-v4-pro",
          fixed_effort: "max",
        }),
      ]),
    );
  });

  test("advertises only configured fixed efforts for a routing alias", () => {
    const configuredRegistry = {
      endpoints: [defaultEndpoint, maxEndpoint],
      diagnostics: [],
      lifecycleSummary: { active: 2, degraded: 0, offline: 0 },
    } as unknown as EndpointRegistryResult;
    const response = createDownstreamOpenAIDiscovery({
      baseUrl: "http://127.0.0.1:3456",
      catalog,
      registry: configuredRegistry,
      modelAliases: [
        {
          aliasId: "baseline.remote-only",
          modelIds: ["deepseek/deepseek-v4-pro"],
          executionMode: "remote_only",
        },
      ] as never,
    });

    expect(
      response.models.find((model) => model.id === "baseline.remote-only")?.capabilities.reasoning,
    ).toEqual({
      supported: true,
      effortControl: true,
      effortLevels: ["max"],
    });
  });

  test("recognizes an endpoint id in model selection before model or alias lookup", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "account.global.deepseek-v4-pro-medium",
        messages: [{ role: "user", content: "hello" }],
      } as never,
      "run91-exact-endpoint",
    );

    expect(plan.routingRequest.allowEndpoints).toEqual(["account.global.deepseek-v4-pro-medium"]);
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
      "account.global.deepseek-v4-pro-medium",
    ]);
    expect(maxPlan.routingRequest.allowEndpoints).toEqual(["account.global.deepseek-v4-pro-max"]);
  });

  test("fails closed rather than treating provider-default as an unconfigured effort variant", () => {
    expect(() =>
      mapChatCompletionsRequest(
        registry,
        {
          model: "baseline.remote-only",
          messages: [{ role: "user", content: "hello" }],
          reasoning_effort: "high",
        } as never,
        "run91-alias-high-no-variant",
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
        model: "account.global.deepseek-v4-pro-max",
        messages: [{ role: "user", content: "hello" }],
        reasoning_effort: "medium",
      } as never,
      "run91-exact-max-with-medium-client-effort",
    );

    expect(plan.routingRequest.allowEndpoints).toEqual(["account.global.deepseek-v4-pro-max"]);
  });

  test("compact /v1/models fallback preserves endpoint-instance rows without a catalog", () => {
    const response = createModelListResponse(registry);
    const endpointRows = response.data.filter((model) => model.fixed_effort !== undefined);

    expect(endpointRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "account.global.deepseek-v4-pro-medium",
          upstream_model_id: "deepseek/deepseek-v4-pro",
          fixed_effort: "medium",
        }),
        expect.objectContaining({
          id: "account.global.deepseek-v4-pro-max",
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

  test("routes an explicit effort to a provider-default endpoint that declares the level", () => {
    const declarerRegistry = {
      endpoints: [
        endpoint("moonshot.personal.kimi-code.global.kimi-k3", null, {
          modelId: "moonshot/kimi-k3",
          modalities: ["text", "image", "video"],
          declaredEffortLevels: ["low", "high", "max"],
        }),
      ],
      diagnostics: [],
      lifecycleSummary: { active: 1, degraded: 0, offline: 0 },
    } as unknown as EndpointRegistryResult;

    const plan = mapChatCompletionsRequest(
      declarerRegistry,
      {
        model: "baseline.remote-only",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this." },
              { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
            ],
          },
        ],
        reasoning_effort: "high",
      } as never,
      "run98-effort-declared-level",
      [
        {
          aliasId: "baseline.remote-only",
          modelIds: ["moonshot/kimi-k3"],
          executionMode: "remote_only",
        },
      ] as never,
    );

    expect(plan.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.kimi-code.global.kimi-k3",
    ]);
    expect(plan.routingRequest.requiredModalities).toEqual(["image", "text"]);
  });

  test("passes a declared provider effort through instead of stripping it", () => {
    const resolution = resolveEndpointExecutionEffort({
      fixedEffort: null,
      declaredEffortLevels: ["low", "high", "max"],
      executionRequest: {
        messages: [{ role: "user", content: "hello" }],
        reasoning: { effort: "high" },
      } as never,
    });

    expect(resolution.executionRequest.reasoning).toEqual({ effort: "high" });
    expect(resolution.receipt).toEqual({ reasoningEffort: "high", effortSource: "client" });
  });

  test("reports a bounded reasoning-effort error instead of blaming capabilities", () => {
    const undeclaredRegistry = {
      endpoints: [
        endpoint("moonshot.personal.kimi-code.global.kimi-k2.7-code", null, {
          modelId: "moonshot/kimi-k2.7-code",
          modalities: ["text", "image", "video"],
        }),
      ],
      diagnostics: [],
      lifecycleSummary: { active: 1, degraded: 0, offline: 0 },
    } as unknown as EndpointRegistryResult;
    let caught: { statusCode?: number; body?: { error?: Record<string, unknown> } } | null = null;
    try {
      mapChatCompletionsRequest(
        undeclaredRegistry,
        {
          model: "baseline.remote-only",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Describe this." },
                { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
              ],
            },
          ],
          reasoning_effort: "high",
        } as never,
        "run98-effort-undeclared-level",
        [
          {
            aliasId: "baseline.remote-only",
            modelIds: ["moonshot/kimi-k2.7-code"],
            executionMode: "remote_only",
          },
        ] as never,
      );
    } catch (error) {
      caught = error as typeof caught;
    }

    expect(caught?.statusCode).toBe(400);
    expect(caught?.body?.error).toMatchObject({
      type: "routing_eligibility_error",
      code: "reasoning_effort_unavailable",
      requestedModel: "baseline.remote-only",
      requestedEffort: "high",
    });
  });
});
