import { describe, expect, test } from "vitest";

import {
  buildActivitySummary,
  buildConfiguredModelCards,
  buildDownstreamProviderGuide,
  buildProviderCards,
  buildWorkbenchModelOptions,
  summarizeWorkbenchResult,
  summarizeRuntimeStats,
} from "./view-models";

describe("buildProviderCards", () => {
  test("turns provider variants and account state into provider cards for the onboarding page", () => {
    expect(
      buildProviderCards(
        [
          {
            providerId: "moonshotai",
            displayName: "Moonshot AI",
            variants: [
              {
                variantId: "moonshot-open-platform",
                label: "Moonshot Open Platform",
                authMode: "api-key-static",
                availability: "ready",
              },
              {
                variantId: "kimi-code",
                label: "Kimi Code",
                authMode: "oauth2-device-code",
                availability: "backend-limited",
              },
            ],
          },
        ],
        [
          {
            providerAccountId: "moonshot.personal.primary",
            providerId: "moonshotai",
          },
        ],
      ),
    ).toEqual([
      {
        providerId: "moonshotai",
        title: "Moonshot AI",
        accountCount: 1,
        variants: [
          {
            variantId: "moonshot-open-platform",
            label: "Moonshot Open Platform",
            authMode: "api-key-static",
            availability: "ready",
          },
          {
            variantId: "kimi-code",
            label: "Kimi Code",
            authMode: "oauth2-device-code",
            availability: "backend-limited",
          },
        ],
      },
    ]);
  });
});

describe("summarizeRuntimeStats", () => {
  test("creates stable dashboard stat cards from the runtime summary counts", () => {
    expect(
      summarizeRuntimeStats({
        providerCount: 3,
        accountCount: 2,
        endpointCount: 3,
      }),
    ).toEqual([
      { label: "Providers", value: "3" },
      { label: "Accounts", value: "2" },
      { label: "Endpoints", value: "3" },
    ]);
  });
});

describe("buildWorkbenchModelOptions", () => {
  test("sorts and deduplicates model options for the workbench composer", () => {
    expect(
      buildWorkbenchModelOptions([
        { id: "moonshotai/kimi-k2.5", endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"] },
        { id: "openai/gpt-4.1-mini-fast", endpoint_ids: ["openai.personal.primary.us-east-1.fast"] },
        { id: "moonshotai/kimi-k2.5", endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"] },
      ]),
    ).toEqual([
      { label: "Kimi K2.5", value: "moonshotai/kimi-k2.5" },
      { label: "GPT 4.1 Mini Fast", value: "openai/gpt-4.1-mini-fast" },
    ]);
  });
});

describe("buildConfiguredModelCards", () => {
  test("builds unified local and remote model cards with controller and tooling state", () => {
    expect(
      buildConfiguredModelCards({
        models: [
          {
            id: "moonshotai/kimi-k2.5",
            endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
          },
          {
            id: "gpt-5.4",
            endpoint_ids: ["cli.local.coder"],
          },
        ],
        endpoints: [
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            modelId: "moonshotai/kimi-k2.5",
            providerId: "moonshotai",
            roleIds: ["general.chat"],
            status: "active",
            servingSource: "remote-service",
            toolCallingSupported: true,
          },
          {
            endpointId: "cli.local.coder",
            modelId: "gpt-5.4",
            providerId: null,
            roleIds: ["developer"],
            status: "active",
            servingSource: "local-process",
            toolCallingSupported: true,
          },
        ],
        accounts: [
          {
            providerAccountId: "moonshot.personal.primary",
            providerId: "moonshotai",
            modelRoleBindings: [
              {
                modelId: "moonshotai/kimi-k2.5",
                roleIds: ["general.chat"],
              },
            ],
          },
        ],
        requests: [
          {
            requestId: "req-001",
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          },
        ],
        controller: {
          scope: "global",
          endpointId: "cli.local.coder",
          modelId: "gpt-5.4",
        },
      }),
    ).toEqual([
      expect.objectContaining({
        modelId: "gpt-5.4",
        displayName: "GPT 5.4",
        sourceSummary: "local",
        endpointCount: 1,
        requestCount: 0,
        status: "active",
        roleIds: ["developer"],
        toolCallingSupported: true,
        controllerState: "active",
      }),
      expect.objectContaining({
        modelId: "moonshotai/kimi-k2.5",
        displayName: "Kimi K2.5",
        sourceSummary: "remote",
        endpointCount: 1,
        requestCount: 1,
        status: "active",
        roleIds: ["general.chat"],
        toolCallingSupported: true,
        controllerState: "eligible",
      }),
    ]);
  });
});

describe("summarizeWorkbenchResult", () => {
  test("extracts text, tool calls, tool executions, and usage for the studio inspector", () => {
    expect(
      summarizeWorkbenchResult({
        model: "moonshotai/kimi-k2.5",
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        outputText: "Registry lookup complete.",
        toolCalls: [
          {
            id: "call_001",
            type: "function",
            function: {
              name: "lookupRegistry",
              arguments: "{\"endpointId\":\"cli.local.coder\"}",
            },
          },
        ],
        toolExecutions: [
          {
            connectorId: "mcp.registry",
            toolName: "lookupRegistry",
            status: "succeeded",
            durationMs: 12,
          },
        ],
        usage: {
          inputTokens: 44,
          outputTokens: 19,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        outputText: "Registry lookup complete.",
        toolCalls: [
          expect.objectContaining({
            name: "lookupRegistry",
          }),
        ],
        toolExecutions: [
          expect.objectContaining({
            connectorId: "mcp.registry",
            status: "succeeded",
          }),
        ],
        usageRows: [
          { label: "Input tokens", value: "44" },
          { label: "Output tokens", value: "19" },
        ],
      }),
    );
  });
});

describe("buildDownstreamProviderGuide", () => {
  test("creates stable connection rows and examples for downstream OpenAI-compatible clients", () => {
    expect(
      buildDownstreamProviderGuide({
        kind: "openai-compatible",
        providerId: "role-model-runtime",
        displayName: "Role Model Runtime",
        baseUrl: "http://127.0.0.1:8091",
        endpoints: {
          health: "http://127.0.0.1:8091/healthz",
          models: "http://127.0.0.1:8091/v1/models",
          chatCompletions: "http://127.0.0.1:8091/v1/chat/completions",
        },
        authentication: {
          type: "bearer",
          headerName: "Authorization",
          required: false,
          placeholderToken: "role-model-local",
          note: "Inbound API-key validation is not enforced yet. If a downstream client requires a token field, use this placeholder bearer token.",
        },
        models: [
          {
            id: "moonshotai/kimi-k2.5",
          },
          {
            id: "openai/gpt-4.1-mini-fast",
          },
        ],
        setup: {
          recommendedModel: "moonshotai/kimi-k2.5",
          notes: [
            "Configure downstream tooling as an OpenAI-compatible provider.",
            "Use GET /v1/models to discover the current model ids.",
            "Use POST /v1/chat/completions for routed chat inference.",
          ],
        },
      }),
    ).toEqual({
      connectionRows: [
        { label: "Provider type", value: "OpenAI-compatible" },
        { label: "Base URL", value: "http://127.0.0.1:8091" },
        { label: "Models endpoint", value: "http://127.0.0.1:8091/v1/models" },
        { label: "Chat endpoint", value: "http://127.0.0.1:8091/v1/chat/completions" },
        { label: "Auth header", value: "Authorization: Bearer role-model-local" },
      ],
      availableModels: ["moonshotai/kimi-k2.5", "openai/gpt-4.1-mini-fast"],
      opencodeSteps: [
        "Choose an OpenAI-compatible provider entry in the downstream client.",
        "Set the base URL to http://127.0.0.1:8091.",
        "If the client requires an API key, use role-model-local as the bearer token.",
        "Select a model returned by http://127.0.0.1:8091/v1/models.",
      ],
      examples: {
        modelsCurl: "curl http://127.0.0.1:8091/v1/models",
        chatCurl:
          "curl http://127.0.0.1:8091/v1/chat/completions -H \"content-type: application/json\" -H \"Authorization: Bearer role-model-local\" -d '{\"model\":\"moonshotai/kimi-k2.5\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with ok.\"}]}'",
      },
    });
  });
});

describe("buildActivitySummary", () => {
  test("turns raw activity metrics into operator summary cards and ledger rows", () => {
    expect(
      buildActivitySummary([
        {
          id: 7,
          timestamp: "2026-05-07T04:00:00.000Z",
          model: "moonshotai/kimi-k2.5",
          req_path: "/v1/chat/completions",
          resp_content_type: "application/json",
          resp_status_code: 200,
          tokens: {
            cache_tokens: 12,
            input_tokens: 44,
            output_tokens: 19,
            prompt_per_second: 88.1,
            tokens_per_second: 45.2,
          },
          duration_ms: 840,
          has_capture: true,
        },
        {
          id: 8,
          timestamp: "2026-05-07T04:01:00.000Z",
          model: "openai/gpt-4.1-mini-fast",
          req_path: "/v1/responses",
          resp_content_type: "application/json",
          resp_status_code: 500,
          tokens: {
            cache_tokens: 0,
            input_tokens: 10,
            output_tokens: 0,
            prompt_per_second: 12.4,
            tokens_per_second: 0,
          },
          duration_ms: 1600,
          has_capture: false,
        },
      ]),
    ).toEqual({
      facts: [
        { label: "Entries", value: "2", detail: "1 with captures" },
        { label: "Errors", value: "1", detail: "Most recent status: 500" },
        { label: "Prompt tokens", value: "54", detail: "19 output tokens recorded" },
        { label: "Cached tokens", value: "12", detail: "Across the current in-memory metrics window" },
      ],
      rows: [
        expect.objectContaining({
          id: 8,
          model: "openai/gpt-4.1-mini-fast",
          path: "/v1/responses",
          status: "500",
          durationLabel: "1600 ms",
          captureLabel: "No capture",
        }),
        expect.objectContaining({
          id: 7,
          model: "moonshotai/kimi-k2.5",
          path: "/v1/chat/completions",
          status: "200",
          durationLabel: "840 ms",
          captureLabel: "Capture available",
        }),
      ],
    });
  });
});
