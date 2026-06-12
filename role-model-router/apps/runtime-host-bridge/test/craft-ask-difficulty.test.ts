import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { describe, expect, test } from "vitest";

import * as bridge from "../src/index.js";

const registry: EndpointRegistryResult = {
  endpoints: [
    {
      identity: {
        endpoint_id: "local-openai-compatible.personal.peer.local.lfm2.5-8b-a1b",
        endpoint_kind: "local_openai_compat",
        provider_kind: "local_openai_compat",
        serving_source: "local-peer",
        model_id: "lfm2.5-8b-a1b",
        runtime_version: "run42-craft-test",
        region: "local",
      },
      declared: {
        endpoint_id: "local-openai-compatible.personal.peer.local.lfm2.5-8b-a1b",
        capabilities: ["text.chat"],
        modalities: ["text"],
        max_context_tokens: 32768,
        tool_calling: { supported: false, parallel_tool_calls: false },
        streaming: { supported: true },
        pricing: { currency: "USD", input_per_million: 0, output_per_million: 0 },
        quality_tier: "standard",
        latency_tier: "low",
        reliability_tier: "standard",
        preference_weight: 0.5,
        max_difficulty: "hard",
      },
      resolved: {
        provider_account_id: "local-openai-compatible.personal.peer",
        provider_id: "local-openai-compatible",
        org_scope: "personal",
        account_scope: "peer",
        credential_ref: { backend: "local-file", ref: "local-peers/test" },
        auth_mode: "api-key-static",
        region_policy: { mode: "prefer", regions: ["local"] },
        base_url: "http://127.0.0.1:1234/v1",
        allowed_models: [],
        denied_models: [],
        entitlement_tags: ["chat"],
        budget_policy_ref: "budget.default",
        quota_policy_ref: "quota.default",
        status: "active",
        health_status: "healthy",
        rotation_state: "stable",
      },
    },
    {
      identity: {
        endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
        endpoint_kind: "remote_api",
        provider_kind: "remote_openai_compat",
        serving_source: "remote-service",
        model_id: "moonshot/kimi-k2.6",
        runtime_version: "run42-craft-test",
        region: "global",
      },
      declared: {
        endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
        capabilities: ["text.chat"],
        modalities: ["text"],
        max_context_tokens: 128000,
        tool_calling: { supported: true, parallel_tool_calls: true },
        streaming: { supported: true },
        pricing: { currency: "USD", input_per_million: 0, output_per_million: 0 },
        quality_tier: "premium",
        latency_tier: "low",
        reliability_tier: "high",
        preference_weight: 0.6,
        max_difficulty: "hard",
      },
      resolved: {
        provider_account_id: "moonshot.personal.kimi-code",
        provider_id: "moonshot",
        org_scope: "personal",
        account_scope: "workspace-default",
        credential_ref: { backend: "local-file", ref: "oauth/moonshot/test" },
        auth_mode: "oauth2-device-code",
        region_policy: { mode: "prefer", regions: ["global"] },
        base_url: "https://api.kimi.com/coding/v1",
        allowed_models: ["moonshot/kimi-k2.6"],
        denied_models: [],
        entitlement_tags: ["chat"],
        budget_policy_ref: "budget.default",
        quota_policy_ref: "quota.default",
        status: "active",
        health_status: "healthy",
        rotation_state: "stable",
      },
    },
  ],
  diagnostics: [],
};

const craftPreamble =
  "You are Craft Agent, powered by Craft Agents Backend. Help users connect data sources, automate workflows, and validate integrations. Follow the system contract and schema for tool validation.";

const mixedAlias = [
  {
    aliasId: "mixed.local-remote",
    mode: "difficulty" as const,
    modelIds: ["lfm2.5-8b-a1b", "moonshot/kimi-k2.6"],
  },
];

function buildDeclaredTools(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    type: "function" as const,
    function: {
      name: `craft_tool_${index}`,
      description: "Craft declared tool schema",
      parameters: { type: "object", properties: {} },
    },
  }));
}

type MapResult = ReturnType<typeof bridge.mapChatCompletionsRequest>;

describe("Craft ask-mode difficulty (R11/R15)", () => {
  test("classifies dual user-role Craft preamble + hello as easy using last user turn only", () => {
    const result: MapResult = bridge.mapChatCompletionsRequest(
      registry,
      {
        model: "mixed.local-remote",
        messages: [
          { role: "user", content: craftPreamble },
          { role: "user", content: "hello" },
        ],
      },
      "req-craft-dual-user-001",
      mixedAlias,
    );

    expect(result.routingDiagnostics?.difficultyRouting).toMatchObject({
      difficulty: "easy",
      strategy: "cost",
      rubricSignals: {
        historyTurnCount: 2,
        codeOrSchemaBurden: false,
      },
    });
  });

  test("classifies assistant preamble + hello as easy", () => {
    const result: MapResult = bridge.mapChatCompletionsRequest(
      registry,
      {
        model: "mixed.local-remote",
        messages: [
          { role: "assistant", content: craftPreamble },
          { role: "user", content: "hello" },
        ],
      },
      "req-craft-assistant-001",
      mixedAlias,
    );

    expect(result.routingDiagnostics?.difficultyRouting).toMatchObject({
      difficulty: "easy",
      strategy: "cost",
      rubricSignals: {
        historyTurnCount: 1,
        codeOrSchemaBurden: false,
      },
    });
  });
});

describe("Craft declared-tools ask-mode difficulty (R2)", () => {
  test("classifies declared-tools Craft chat without active tool usage as easy", () => {
    const result: MapResult = bridge.mapChatCompletionsRequest(
      registry,
      {
        model: "mixed.local-remote",
        messages: [
          { role: "user", content: craftPreamble },
          { role: "user", content: "hello" },
        ],
        tools: buildDeclaredTools(33),
      },
      "req-craft-declared-tools-001",
      mixedAlias,
    );

    expect(result.routingDiagnostics?.difficultyRouting).toMatchObject({
      difficulty: "easy",
      strategy: "cost",
      rubricSignals: {
        toolCount: 0,
        historyTurnCount: 2,
        codeOrSchemaBurden: false,
      },
    });
  });

  test("does not apply ask-mode when message history includes active tool usage", () => {
    const result: MapResult = bridge.mapChatCompletionsRequest(
      registry,
      {
        model: "mixed.local-remote",
        messages: [
          { role: "user", content: "run the workflow" },
          {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "craft_tool_0", arguments: "{}" },
              },
            ],
          },
          { role: "tool", content: "ok", tool_call_id: "call_1" },
          { role: "user", content: "thanks" },
        ],
        tools: buildDeclaredTools(10),
      },
      "req-craft-active-tools-001",
      mixedAlias,
    );

    expect(result.routingDiagnostics?.difficultyRouting?.difficulty).not.toBe("easy");
    expect(result.routingDiagnostics?.difficultyRouting?.strategy).not.toBe("cost");
    expect(result.routingDiagnostics?.difficultyRouting?.rubricSignals).toMatchObject({
      toolCount: 10,
    });
  });
});
