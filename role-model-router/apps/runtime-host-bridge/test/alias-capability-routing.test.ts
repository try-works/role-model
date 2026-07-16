import { describe, expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

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

function endpoint(endpointId: string, modelId: string, modalities: readonly string[]) {
  return {
    identity: {
      endpoint_id: endpointId,
      endpoint_kind: "remote_api",
      provider_kind: "remote_openai_compat",
      serving_source: "remote-service",
      model_id: modelId,
      runtime_version: "1",
      region: "global",
    },
    declared: {
      endpoint_id: endpointId,
      capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
      modalities,
      max_context_tokens: 1,
      tool_calling: { supported: true, style: "openai" },
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
});
