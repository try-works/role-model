import { describe, expect, test } from "vitest";

import {
  buildAccountModelCatalogIds,
  buildActivitySummary,
  buildConfiguredModelCards,
  buildConfiguredProviderRows,
  buildDownstreamProviderGuide,
  buildEndpointCatalogRows,
  buildModelCatalogRows,
  buildProviderCards,
  buildTelemetryComparisonCards,
  buildTelemetryRequestRows,
  buildWorkbenchEndpointOptions,
  buildWorkbenchModelOptions,
  summarizeRuntimeStats,
  summarizeTelemetryStats,
  summarizeWorkbenchResult,
} from "./view-models";

describe("buildProviderCards", () => {
  test("turns provider variants and account state into provider cards for the onboarding page", () => {
    expect(
      buildProviderCards(
        [
          {
            providerId: "moonshot",
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
            providerId: "moonshot",
          },
        ],
      ),
    ).toEqual([
      {
        providerId: "moonshot",
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
        { id: "moonshot/kimi-k2.5", endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"] },
        {
          id: "openai/gpt-4.1-mini-fast",
          endpoint_ids: ["openai.personal.primary.us-east-1.fast"],
        },
        { id: "moonshot/kimi-k2.5", endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"] },
      ]),
    ).toEqual([
      { label: "Kimi K2.5", value: "moonshot/kimi-k2.5" },
      { label: "GPT 4.1 Mini Fast", value: "openai/gpt-4.1-mini-fast" },
    ]);
  });
});

describe("buildWorkbenchEndpointOptions", () => {
  test("prefers saved OAuth endpoints over shared LiteLLM endpoints for the selected model", () => {
    expect(
      buildWorkbenchEndpointOptions({
        modelId: "moonshot/kimi-k2.5",
        models: [
          {
            id: "moonshot/kimi-k2.5",
            endpoint_ids: [
              "moonshot.litellm.global.kimi-k2.5",
              "moonshot.personal.moonshot-oauth.global.kimi-k2.5",
            ],
          },
        ],
        endpoints: [
          {
            endpointId: "moonshot.litellm.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            providerId: "moonshot",
            providerAccountId: "moonshot.litellm",
            status: "active",
            healthStatus: "healthy",
            sourceType: "remote",
          },
          {
            endpointId: "moonshot.personal.moonshot-oauth.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            providerId: "moonshot",
            providerAccountId: "moonshot.personal.moonshot-oauth",
            status: "active",
            healthStatus: "healthy",
            sourceType: "remote",
          },
        ],
        accounts: [
          {
            providerAccountId: "moonshot.litellm",
            providerId: "moonshot",
            credentialRef: {
              backend: "env",
              ref: "MOONSHOT_API_KEY",
            },
          },
          {
            providerAccountId: "moonshot.personal.moonshot-oauth",
            providerId: "moonshot",
            credentialRef: {
              backend: "local-file",
              ref: "oauth/moonshot/moonshot.personal.moonshot-oauth",
            },
          },
        ],
      }),
    ).toEqual([
      {
        label: "moonshot.personal.moonshot-oauth.global.kimi-k2.5",
        value: "moonshot.personal.moonshot-oauth.global.kimi-k2.5",
      },
      {
        label: "moonshot.litellm.global.kimi-k2.5",
        value: "moonshot.litellm.global.kimi-k2.5",
      },
    ]);
  });
});

describe("buildConfiguredModelCards", () => {
  test("builds unified local and remote model cards with controller and tooling state", () => {
    expect(
      buildConfiguredModelCards({
        models: [
          {
            id: "moonshot/kimi-k2.5",
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
            modelId: "moonshot/kimi-k2.5",
            providerId: "moonshot",
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
            providerId: "moonshot",
            modelRoleBindings: [
              {
                modelId: "moonshot/kimi-k2.5",
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
        modelId: "moonshot/kimi-k2.5",
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

describe("buildModelCatalogRows", () => {
  test("turns the runtime model catalog into sorted rows with endpoint ids", () => {
    expect(
      buildModelCatalogRows([
        {
          id: "moonshot/kimi-k2.6",
          endpoint_ids: [
            "moonshot.litellm.global.moonshot-kimi-k2-6",
            "moonshot.litellm.global.moonshot-kimi-k2-6",
          ],
        },
        {
          id: "openai/gpt-4.1-mini-fast",
          endpoint_ids: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
        },
      ]),
    ).toEqual([
      {
        modelId: "moonshot/kimi-k2.6",
        displayName: "Kimi K2.6",
        endpointCount: 1,
        endpointIds: ["moonshot.litellm.global.moonshot-kimi-k2-6"],
      },
      {
        modelId: "openai/gpt-4.1-mini-fast",
        displayName: "GPT 4.1 Mini Fast",
        endpointCount: 1,
        endpointIds: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
      },
    ]);
  });
});

describe("buildEndpointCatalogRows", () => {
  test("turns the runtime endpoint registry into stable endpoint catalog rows", () => {
    expect(
      buildEndpointCatalogRows([
        {
          endpointId: "moonshot.litellm.global.moonshot-kimi-k2-6",
          modelId: "moonshot/kimi-k2.6",
          providerId: "moonshot",
          sourceType: "remote",
          servingSource: "vendor-litellm",
          endpointKind: "remote_api",
          status: "active",
          healthStatus: "healthy",
        },
        {
          endpointId: "llama-swap.local.local-mock-llama",
          modelId: "local/mock-llama",
          providerId: null,
          sourceType: "local",
          servingSource: "vendor-llama-swap",
          endpointKind: "local_engine",
          status: "active",
          healthStatus: "healthy",
        },
      ]),
    ).toEqual([
      {
        endpointId: "llama-swap.local.local-mock-llama",
        modelId: "local/mock-llama",
        providerLabel: "local/runtime",
        sourceLabel: "Local",
        servingSource: "vendor-llama-swap",
        endpointKind: "local_engine",
        status: "active",
        healthStatus: "healthy",
      },
      {
        endpointId: "moonshot.litellm.global.moonshot-kimi-k2-6",
        modelId: "moonshot/kimi-k2.6",
        providerLabel: "moonshot",
        sourceLabel: "Remote",
        servingSource: "vendor-litellm",
        endpointKind: "remote_api",
        status: "active",
        healthStatus: "healthy",
      },
    ]);
  });
});

describe("buildAccountModelCatalogIds", () => {
  test("prefers provider catalog order while constraining to account-allowed models", () => {
    expect(
      buildAccountModelCatalogIds({
        account: {
          providerId: "moonshot",
          allowedModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"],
        },
        providers: [
          {
            providerId: "moonshot",
            displayName: "Moonshot AI",
            modelIds: ["moonshot/kimi-k2.6", "moonshot/kimi-k2.5"],
          },
        ],
        models: [
          {
            id: "moonshot/kimi-k2.5",
          },
          {
            id: "moonshot/kimi-k2.6",
          },
        ],
      }),
    ).toEqual(["moonshot/kimi-k2.6", "moonshot/kimi-k2.5"]);
  });
});

describe("buildConfiguredProviderRows", () => {
  test("summarizes configured providers and models from saved accounts plus live endpoints", () => {
    expect(
      buildConfiguredProviderRows({
        accounts: [
          {
            providerAccountId: "moonshot.personal.primary",
            providerId: "moonshot",
            authMode: "api-key-static",
            healthStatus: "healthy",
            status: "active",
            allowedModels: ["moonshot/kimi-k2.6", "moonshot/kimi-k2.5"],
          },
          {
            providerAccountId: "moonshot.personal.kimi-code",
            providerId: "moonshot",
            authMode: "oauth2-device-code",
            healthStatus: "healthy",
            status: "active",
            allowedModels: ["moonshot/kimi-k2.6"],
          },
        ],
        endpoints: [
          {
            endpointId: "moonshot.litellm.global.moonshot-kimi-k2-6",
            providerId: "moonshot",
            modelId: "moonshot/kimi-k2.6",
            status: "active",
          },
          {
            endpointId: "moonshot.litellm.global.moonshot-kimi-k2-5",
            providerId: "moonshot",
            modelId: "moonshot/kimi-k2.5",
            status: "degraded",
          },
        ],
      }),
    ).toEqual([
      {
        providerId: "moonshot",
        accountIds: ["moonshot.personal.kimi-code", "moonshot.personal.primary"],
        authModes: ["api-key-static", "oauth2-device-code"],
        configuredModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"],
        endpointModels: ["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"],
        endpointCount: 2,
        activeEndpointCount: 1,
        healthStatuses: ["healthy"],
      },
    ]);
  });
});

describe("summarizeWorkbenchResult", () => {
  test("extracts text, tool calls, tool executions, and usage for the studio inspector", () => {
    expect(
      summarizeWorkbenchResult({
        model: "moonshot/kimi-k2.5",
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        outputText: "Registry lookup complete.",
        toolCalls: [
          {
            id: "call_001",
            type: "function",
            function: {
              name: "lookupRegistry",
              arguments: '{"endpointId":"cli.local.coder"}',
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
            id: "moonshot/kimi-k2.5",
          },
          {
            id: "openai/gpt-4.1-mini-fast",
          },
        ],
        setup: {
          recommendedModel: "moonshot/kimi-k2.5",
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
        { label: "Base URL (standard)", value: "http://127.0.0.1:8091" },
        { label: "Base URL (/v1 suffix)", value: "http://127.0.0.1:8091/v1" },
        { label: "Models endpoint", value: "http://127.0.0.1:8091/v1/models" },
        { label: "Chat endpoint", value: "http://127.0.0.1:8091/v1/chat/completions" },
        { label: "Auth header", value: "Authorization: Bearer role-model-local" },
      ],
      availableModels: ["moonshot/kimi-k2.5", "openai/gpt-4.1-mini-fast"],
      opencodeSteps: [
        "Choose an OpenAI-compatible provider entry in the downstream client.",
        "Set the base URL to http://127.0.0.1:8091 (most clients) or http://127.0.0.1:8091/v1 (clients that expect /v1 in the base URL).",
        "If the client requires an API key, use role-model-local as the bearer token.",
        "Select a model returned by http://127.0.0.1:8091/v1/models.",
      ],
      examples: {
        modelsCurl: "curl http://127.0.0.1:8091/v1/models",
        chatCurl:
          'curl http://127.0.0.1:8091/v1/chat/completions -H "content-type: application/json" -H "Authorization: Bearer role-model-local" -d \'{"model":"moonshot/kimi-k2.5","messages":[{"role":"user","content":"Reply with ok."}]}\'',
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
          model: "moonshot/kimi-k2.5",
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
        {
          label: "Cached tokens",
          value: "12",
          detail: "Across the current in-memory metrics window",
        },
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
          model: "moonshot/kimi-k2.5",
          path: "/v1/chat/completions",
          status: "200",
          durationLabel: "840 ms",
          captureLabel: "Capture available",
        }),
      ],
    });
  });
});

describe("telemetry view models", () => {
  test("creates stable summary cards from the canonical telemetry summary", () => {
    expect(
      summarizeTelemetryStats({
        requestCount: 3,
        successCount: 2,
        failureCount: 1,
        totalInputTokens: 96,
        totalOutputTokens: 30,
        totalTokens: 126,
        cachedRequestCount: 1,
        totalActualCostUsd: 0.0042,
        totalEstimatedCostUsd: 0.0053,
        averageLatencyMs: 420,
        p95LatencyMs: 880,
        lastSeenAtMs: 1_770_000_000_100,
        sourceBreakdown: {
          local: {
            requestCount: 1,
            successCount: 1,
            failureCount: 0,
            totalInputTokens: 32,
            totalOutputTokens: 14,
            totalTokens: 46,
            cachedRequestCount: 0,
            totalActualCostUsd: 0,
            totalEstimatedCostUsd: 0.0011,
            averageLatencyMs: 280,
            p95LatencyMs: 280,
            lastSeenAtMs: 1_770_000_000_000,
          },
          remote: {
            requestCount: 2,
            successCount: 1,
            failureCount: 1,
            totalInputTokens: 64,
            totalOutputTokens: 16,
            totalTokens: 80,
            cachedRequestCount: 1,
            totalActualCostUsd: 0.0042,
            totalEstimatedCostUsd: 0.0042,
            averageLatencyMs: 490,
            p95LatencyMs: 880,
            lastSeenAtMs: 1_770_000_000_100,
          },
        },
      }),
    ).toEqual([
      {
        label: "Requests",
        value: "3",
        detail: "1 local / 2 remote in the current telemetry window",
      },
      { label: "Failures", value: "1", detail: "2 successful requests recorded" },
      {
        label: "Latency",
        value: "880 ms",
        detail: "420 ms average latency across structured telemetry",
      },
      {
        label: "Tokens",
        value: "126",
        detail: "1 cached request and $0.0042 actual cost recorded",
      },
    ]);
  });

  test("builds telemetry comparison cards for local and remote endpoint rows", () => {
    expect(
      buildTelemetryComparisonCards([
        {
          endpointId: "llama-swap.local.local-mock-llama",
          modelId: "local/mock-llama",
          sourceType: "local",
          providerFamily: "llama-swap",
          promptCacheSupported: false,
          status: "active",
          requestCount: 1,
          successCount: 1,
          failureCount: 0,
          totalTokens: 46,
          averageLatencyMs: 280,
          p95LatencyMs: 280,
          totalActualCostUsd: 0,
          totalEstimatedCostUsd: 0.0011,
          cachedRequestCount: 0,
          healthStatus: "healthy",
          roleIds: ["general.chat"],
          providerId: null,
          endpointKind: "local_engine",
          servingSource: "local-process",
          totalInputTokens: 32,
          totalOutputTokens: 14,
          lastSeenAtMs: 1_770_000_000_000,
          providerKind: "local_openai_compat",
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        endpointId: "llama-swap.local.local-mock-llama",
        sourceLabel: "Local",
        providerLabel: "llama-swap",
        cacheLabel: "Caching unavailable",
        reliabilityLabel: "0 failures / 1 success",
        latencyLabel: "280 ms p95 / 280 ms avg",
        tokenLabel: "46 tokens",
        costLabel: "$0.0011 est.",
        roleSummary: "general.chat",
      }),
    ]);
  });

  test("builds telemetry-backed request ledger rows in newest-first order", () => {
    expect(
      buildTelemetryRequestRows([
        {
          requestId: "req-001",
          endpointId: "llama-swap.local.local-mock-llama",
          modelId: "local/mock-llama",
          sourceType: "local",
          providerFamily: "llama-swap",
          createdAtMs: 1_770_000_000_000,
          latencyMs: 280,
          totalTokens: 46,
          actualCostUsd: 0,
          estimatedCostUsd: 0.0011,
          errorClass: null,
          statusCode: 200,
          finishReason: "stop",
          promptCacheSupported: false,
          promptCacheRequested: false,
          promptCacheUsed: false,
          streamTextDeltaCount: 2,
          streamTextSupported: true,
          streamToolCallDeltaCount: 0,
          streamToolCallSupported: false,
          streamToolArgumentDeltaCount: 0,
          streamToolArgumentSupported: false,
        },
        {
          requestId: "req-002",
          routingDecisionId: "route-002",
          endpointId: "openai.personal.primary.us-east-1.fast",
          modelId: "openai/gpt-4.1-mini-fast",
          sourceType: "remote",
          providerFamily: "ai-sdk-openai",
          createdAtMs: 1_770_000_000_100,
          latencyMs: 880,
          totalTokens: 80,
          actualCostUsd: 0.0042,
          estimatedCostUsd: 0.0042,
          errorClass: "upstream_timeout",
          statusCode: 504,
          finishReason: "length",
          promptCacheSupported: true,
          promptCacheRequested: true,
          promptCacheUsed: true,
          streamTextDeltaCount: 4,
          streamTextSupported: true,
          streamToolCallDeltaCount: 1,
          streamToolCallSupported: true,
          streamToolArgumentDeltaCount: 2,
          streamToolArgumentSupported: true,
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        requestId: "req-002",
        routingDecisionLabel: "route-002",
        sourceLabel: "Remote",
        statusLabel: "504 upstream_timeout",
        providerFamilyLabel: "ai-sdk-openai",
        finishReasonLabel: "length",
        cacheLabel: "Cache hit",
        streamLabel: "4 text deltas / 1 tool / 2 args",
        latencyLabel: "880 ms",
        tokenLabel: "80 tokens",
        costLabel: "$0.0042 actual",
      }),
      expect.objectContaining({
        requestId: "req-001",
        sourceLabel: "Local",
        statusLabel: "200 ok",
        providerFamilyLabel: "llama-swap",
        finishReasonLabel: "stop",
        cacheLabel: "Caching unavailable",
        streamLabel: "2 text deltas",
        latencyLabel: "280 ms",
        tokenLabel: "46 tokens",
        costLabel: "$0.0011 est.",
      }),
    ]);
  });
});
