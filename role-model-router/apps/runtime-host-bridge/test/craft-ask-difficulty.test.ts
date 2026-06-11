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
        runtime_version: "run39-craft-test",
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
        runtime_version: "run39-craft-test",
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
      [
        {
          aliasId: "mixed.local-remote",
          mode: "difficulty",
          modelIds: ["lfm2.5-8b-a1b", "moonshot/kimi-k2.6"],
        },
      ],
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
      [
        {
          aliasId: "mixed.local-remote",
          mode: "difficulty",
          modelIds: ["lfm2.5-8b-a1b", "moonshot/kimi-k2.6"],
        },
      ],
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
});
