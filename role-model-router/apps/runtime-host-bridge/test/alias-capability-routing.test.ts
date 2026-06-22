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
});
