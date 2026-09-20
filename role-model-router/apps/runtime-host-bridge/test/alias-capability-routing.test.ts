import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import {
  claimExecutionCircuitProbe,
  clearExecutionCircuitEndpoint,
  createEmptyExecutionCircuitState,
  evaluateExecutionCircuitEligibility,
  recordExecutionCircuitFailure,
  resolveExecutionCircuitRefusal,
  toExecutionCircuitReceipt,
} from "../src/execution-circuit-breaker.js";
import { mapChatCompletionsRequest } from "../src/index.js";

const registry = {
  endpoints: [
    endpoint("openai.personal.codex.global.gpt-5-4", "chatgpt/gpt-5.4", ["text", "image"]),
    endpoint("deepseek.personal.primary.global.deepseek-v4-flash", "deepseek/deepseek-v4-flash", [
      "text",
    ]),
    endpoint("moonshot.personal.kimi-code.global.kimi-k2-7-code", "moonshot/kimi-k2.7-code", [
      "text",
      "image",
      "video",
    ]),
  ],
  diagnostics: [],
  lifecycleSummary: { active: 3, degraded: 0, offline: 0 },
} as unknown as EndpointRegistryResult;

function endpoint(
  endpointId: string,
  modelId: string,
  modalities: readonly string[],
  options: {
    reasoningEffort?: string;
    capabilities?: readonly string[];
  } = {},
) {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: modelId,
      runtime_version: "1",
      region: "global",
      ...(options.reasoningEffort ? { reasoning_effort: options.reasoningEffort } : {}),
    },
    declared: {
      endpoint_id: endpointId,
      capabilities: options.capabilities ?? [
        "text.chat",
        "tools.function_calling",
        "reasoning",
        "structured.output",
      ],
      modalities,
      max_context_tokens: 1,
      tool_calling: {
        supported: (options.capabilities ?? ["tools.function_calling"]).includes(
          "tools.function_calling",
        ),
        style: "openai",
      },
      supports_embeddings: false,
    },
    status: "active",
  };
}

const hybridAlias = [
  {
    aliasId: "hybrid.hybrid",
    mode: "hybrid" as const,
    modelIds: ["chatgpt/gpt-5.4", "deepseek/deepseek-v4-flash", "moonshot/kimi-k2.7-code"],
  },
];

describe("alias capability routing", () => {
  test("filters image requests to image-capable alias targets before scoring", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "hybrid.hybrid",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this." },
              { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
            ],
          },
        ],
      } as never,
      "req-image-alias",
      hybridAlias,
    );

    expect(plan.routingRequest.requiredModalities).toEqual(["image", "text"]);
    expect(plan.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.kimi-code.global.kimi-k2-7-code",
      "openai.personal.codex.global.gpt-5-4",
    ]);
    expect(plan.routingDiagnostics?.capabilityEligibility?.excludedTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
          modelId: "deepseek/deepseek-v4-flash",
          reasons: ["missing_input.image"],
        }),
      ]),
    );
  });

  test("treats Craft inline image content as image input before alias scoring", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "hybrid.hybrid",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Describe this." },
              { type: "image", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB" },
            ],
          },
        ],
      } as never,
      "req-craft-inline-image-alias",
      hybridAlias,
    );

    expect(plan.routingRequest.requiredModalities).toEqual(["image", "text"]);
    expect(plan.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.kimi-code.global.kimi-k2-7-code",
      "openai.personal.codex.global.gpt-5-4",
    ]);
    expect(plan.routingDiagnostics?.capabilityEligibility?.excludedTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
          modelId: "deepseek/deepseek-v4-flash",
          reasons: ["missing_input.image"],
        }),
      ]),
    );
  });

  test("returns a stable no-eligible-target error when alias targets cannot satisfy image input", () => {
    expect(() =>
      mapChatCompletionsRequest(
        registry,
        {
          model: "text-only",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Describe this." },
                { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
              ],
            },
          ],
        } as never,
        "req-image-text-only",
        [
          {
            aliasId: "text-only",
            mode: "basic",
            modelIds: ["deepseek/deepseek-v4-flash"],
          },
        ],
      ),
    ).toThrow(/no_eligible_target/i);
  });

  test("reports an empty alias pool before attempting capability eligibility", () => {
    expect(() =>
      mapChatCompletionsRequest(
        registry,
        {
          model: "missing-alias-target",
          messages: [{ role: "user", content: "Hello" }],
        } as never,
        "req-empty-alias-pool",
        [
          {
            aliasId: "missing-alias-target",
            mode: "basic",
            modelIds: ["does-not-exist/model"],
          },
        ],
      ),
    ).toThrow(/ALIAS_POOL_EMPTY/i);
  });

  test("synthesizes prompt_cache_key from session_id when caller omits it", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.7-code",
        messages: [{ role: "user", content: "Hello" }],
      } as never,
      "req-synthesized-cache-key",
      [],
      undefined,
      undefined,
      { sessionId: "session-abc" },
    );

    expect(plan.executionRequest.promptCache).toEqual({
      mode: "prefer",
      key: "session-abc",
      source: "synthesized",
    });
  });

  test("keeps explicit prompt_cache_key and marks it explicit", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.7-code",
        messages: [{ role: "user", content: "Hello" }],
        prompt_cache_key: "caller-key",
      } as never,
      "req-explicit-cache-key",
      [],
      undefined,
      undefined,
      { sessionId: "session-abc" },
    );

    expect(plan.executionRequest.promptCache).toEqual({
      mode: "prefer",
      key: "caller-key",
      source: "explicit",
    });
  });

  test("derives the same opaque SHA-256 cache key from identical ordered messages", () => {
    const body = {
      model: "moonshot/kimi-k2.7-code",
      messages: [
        { role: "system", content: "Keep this private system instruction." },
        { role: "user", content: "Implement the cache contract." },
      ],
    } as never;

    const first = mapChatCompletionsRequest(registry, body, "req-hash-first");
    const second = mapChatCompletionsRequest(registry, body, "req-hash-second");

    expect(first.executionRequest.promptCache).toEqual(second.executionRequest.promptCache);
    expect(first.executionRequest.promptCache).toMatchObject({
      mode: "prefer",
      source: "synthesized",
      key: expect.stringMatching(/^rm-prompt-sha256:[a-f0-9]{64}$/),
    });
  });

  test("changes the synthesized cache key when ordered message content changes", () => {
    const first = mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.7-code",
        messages: [
          { role: "system", content: "Stable system" },
          { role: "user", content: "First request" },
        ],
      } as never,
      "req-hash-content-first",
    );
    const second = mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.7-code",
        messages: [
          { role: "system", content: "Stable system" },
          { role: "user", content: "Second request" },
        ],
      } as never,
      "req-hash-content-second",
    );

    expect(first.executionRequest.promptCache?.key).not.toBe(
      second.executionRequest.promptCache?.key,
    );
  });

  test("does not expose raw message content in a synthesized cache key", () => {
    const secret = "private-prompt-material";
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.7-code",
        messages: [{ role: "user", content: secret }],
      } as never,
      "req-hash-private",
    );

    expect(plan.executionRequest.promptCache?.key).not.toContain(secret);
  });

  test("keeps default and fixed-effort alias siblings distinct through tool eligibility and circuit recovery", () => {
    const baseModelId = "deepseek/deepseek-v4-flash";
    const defaultEndpointId = "deepseek.personal.primary.global.deepseek-v4-flash";
    const highEndpointId = `${defaultEndpointId}-high`;
    const maxEndpointId = `${defaultEndpointId}-max`;
    const variantRegistry = {
      endpoints: [
        endpoint(defaultEndpointId, baseModelId, ["text"]),
        endpoint(highEndpointId, baseModelId, ["text"], { reasoningEffort: "high" }),
        endpoint(maxEndpointId, baseModelId, ["text"], { reasoningEffort: "max" }),
      ],
      diagnostics: [],
      lifecycleSummary: { active: 3, degraded: 0, offline: 0 },
    } as unknown as EndpointRegistryResult;
    const aliases = [
      { aliasId: "baseline.remote-only", mode: "basic" as const, modelIds: [baseModelId] },
    ];

    const defaultPlan = mapChatCompletionsRequest(
      variantRegistry,
      {
        model: "baseline.remote-only",
        messages: [{ role: "user", content: "Use the configured default effort." }],
      } as never,
      "req-run96-r33-default",
      aliases,
    );
    expect(defaultPlan.routingRequest.allowEndpoints).toEqual([
      defaultEndpointId,
      highEndpointId,
      maxEndpointId,
    ]);

    const highPlan = mapChatCompletionsRequest(
      variantRegistry,
      {
        model: "baseline.remote-only",
        reasoning_effort: "high",
        messages: [{ role: "user", content: "Call the tool with high effort." }],
        tools: [
          {
            type: "function",
            function: { name: "lookup", parameters: { type: "object", properties: {} } },
          },
        ],
      } as never,
      "req-run96-r33-high",
      aliases,
    );
    expect(highPlan.routingRequest.requiredCapabilities).toEqual(
      expect.arrayContaining(["text.chat", "tools.function_calling"]),
    );
    expect(highPlan.routingRequest.allowEndpoints).toEqual([highEndpointId]);

    const startedAtMs = 10_000;
    let circuit = createEmptyExecutionCircuitState();
    for (let failure = 0; failure < 2; failure += 1) {
      circuit = recordExecutionCircuitFailure({
        state: circuit,
        endpointId: highEndpointId,
        errorClass: "upstream_connection_error",
        nowMs: startedAtMs + failure,
        trafficClass: "live",
      }).state;
    }
    expect(evaluateExecutionCircuitEligibility(circuit, highEndpointId, startedAtMs + 2)).toEqual({
      eligible: false,
      probeRequired: false,
    });
    const openRecord = circuit.endpoints[highEndpointId];
    expect(openRecord).toBeDefined();
    const refusal = resolveExecutionCircuitRefusal(
      openRecord ? [toExecutionCircuitReceipt(openRecord, startedAtMs + 2)] : [],
      startedAtMs + 2,
    );
    expect(refusal).toMatchObject({
      statusCode: 503,
      code: "endpoint_temporarily_unavailable",
    });

    const probeAtMs = openRecord?.nextProbeAtMs;
    expect(probeAtMs).toBeTypeOf("number");
    const firstProbe = claimExecutionCircuitProbe({
      state: circuit,
      endpointId: highEndpointId,
      nowMs: probeAtMs ?? 0,
      probeOwnerId: "req-run96-r33-probe-one",
    });
    expect(firstProbe.claimed).toBe(true);
    const concurrentProbe = claimExecutionCircuitProbe({
      state: firstProbe.state,
      endpointId: highEndpointId,
      nowMs: (probeAtMs ?? 0) + 1,
      probeOwnerId: "req-run96-r33-probe-two",
    });
    expect(concurrentProbe.claimed).toBe(false);
    expect(
      clearExecutionCircuitEndpoint(firstProbe.state, highEndpointId).endpoints,
    ).not.toHaveProperty(highEndpointId);
  });

  test("reports every fixed-effort alias sibling excluded by a genuine tool-capability mismatch", () => {
    const modelId = "deepseek/deepseek-v4-flash";
    const lowEndpointId = "deepseek.personal.primary.global.deepseek-v4-flash-low";
    const incapableRegistry = {
      endpoints: [
        endpoint(lowEndpointId, modelId, ["text"], {
          reasoningEffort: "low",
          capabilities: ["text.chat", "reasoning"],
        }),
      ],
      diagnostics: [],
      lifecycleSummary: { active: 1, degraded: 0, offline: 0 },
    } as unknown as EndpointRegistryResult;

    let failure: unknown;
    try {
      mapChatCompletionsRequest(
        incapableRegistry,
        {
          model: "baseline.remote-only",
          reasoning_effort: "low",
          messages: [{ role: "user", content: "Call the tool." }],
          tools: [
            {
              type: "function",
              function: { name: "lookup", parameters: { type: "object", properties: {} } },
            },
          ],
        } as never,
        "req-run96-r33-tool-mismatch",
        [{ aliasId: "baseline.remote-only", mode: "basic", modelIds: [modelId] }],
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({
      statusCode: 400,
      body: {
        error: {
          type: "capability_eligibility_error",
          code: "no_eligible_target",
          excludedTargets: [
            expect.objectContaining({
              endpointId: lowEndpointId,
              reasons: ["missing_capability.tools.function_calling"],
            }),
          ],
        },
      },
    });
  });

  /**
   * Run 98 addendum 57 §3.2: the advisory's family gate compares the request's declared task family, but the
   * routing request carried the capability default `text.chat` even when the caller declared an intent — the
   * decision recorded `taxonomyDimensions.taxonomy_task_type = coder.review` while the advisory consideration
   * saw `text.chat`, so an advisory validated for that family was refused with `advisory_task_mismatch`.
   */
  test("run98 a57: a declared intent task family reaches the routing request", () => {
    const plan = mapChatCompletionsRequest(
      registry,
      {
        model: "hybrid.hybrid",
        messages: [{ role: "user", content: "Review this code for bugs." }],
        role_model: {
          contract_version: 1,
          intent: {
            taxonomy_version: "1.0.0-alpha.1",
            classification_contract_version: "role-model.classification.v1",
            content_revision: "taxonomy-v1-alpha.1",
            task_type: "coder.review",
            requested_role_id: "coder",
          },
        },
      } as never,
      "req-intent-family",
      hybridAlias,
    );

    expect(plan.routingRequest.taskType).toBe("coder.review");
  });
});