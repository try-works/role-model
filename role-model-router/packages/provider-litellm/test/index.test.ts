import { describe, expect, test } from "vitest";

import { createLiteLLMProviderAdapter } from "../src/index.js";

describe("provider-litellm", () => {
  test("defaults the adapter family to litellm-proxy", () => {
    const adapter = createLiteLLMProviderAdapter();

    expect(adapter.adapterFamily).toBe("litellm-proxy");
  });

  test("advertises implicit prompt caching and normalizes LiteLLM cache plus cost metadata", () => {
    const adapter = createLiteLLMProviderAdapter("ai-sdk-openai-compatible");
    const capabilities = adapter.negotiateCapabilities({
      target: {
        endpointId: "moonshot.vendor.primary",
        modelId: "moonshotai/kimi-k2.5",
        providerId: "moonshotai",
        providerKind: "provider-openai",
        providerAccountId: "moonshot.vendor.primary",
        adapterFamily: "ai-sdk-openai-compatible",
        authFamily: "api-key",
        apiBase: "http://127.0.0.1:4000/v1",
        requestShapeHints: {
          providerShape: "openai.chat.completions",
          bodyKeys: ["model", "messages"],
          headerKeys: ["authorization"],
        },
        candidate: {
          identity: {
            endpoint_id: "moonshot.vendor.primary",
            endpoint_kind: "remote_api",
            provider_kind: "remote_openai_compat",
            serving_source: "vendor-litellm",
            model_id: "moonshotai/kimi-k2.5",
            runtime_version: "test",
            region: "global",
          },
          declared: {
            endpoint_id: "moonshot.vendor.primary",
            capabilities: ["text.chat", "tools.function_calling"],
            modalities: ["text"],
            max_context_tokens: 128000,
            tool_calling: {
              supported: true,
              style: "openai",
            },
            supports_embeddings: false,
          },
          status: "active",
        },
        account: {
          providerAccountId: "moonshot.vendor.primary",
          providerId: "moonshotai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "MOONSHOT_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "http://127.0.0.1:4000/v1",
          allowedModels: ["moonshotai/kimi-k2.5"],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
        provider: null,
        model: null,
      },
      executionRequest: {
        messages: [{ role: "user", content: "Summarize the remote endpoint." }],
        stream: false,
        promptCache: {
          mode: "prefer",
        },
      },
    });

    expect(capabilities.promptCaching).toEqual({
      supported: true,
      mode: "implicit",
    });

    const requestCapture = adapter.buildRequest({
      target: {
        endpointId: "moonshot.vendor.primary",
        modelId: "moonshotai/kimi-k2.5",
        providerId: "moonshotai",
        providerKind: "provider-openai",
        providerAccountId: "moonshot.vendor.primary",
        adapterFamily: "ai-sdk-openai-compatible",
        authFamily: "api-key",
        apiBase: "http://127.0.0.1:4000/v1",
        requestShapeHints: {
          providerShape: "openai.chat.completions",
          bodyKeys: ["model", "messages"],
          headerKeys: ["authorization"],
        },
        candidate: {
          identity: {
            endpoint_id: "moonshot.vendor.primary",
            endpoint_kind: "remote_api",
            provider_kind: "remote_openai_compat",
            serving_source: "vendor-litellm",
            model_id: "moonshotai/kimi-k2.5",
            runtime_version: "test",
            region: "global",
          },
          declared: {
            endpoint_id: "moonshot.vendor.primary",
            capabilities: ["text.chat", "tools.function_calling"],
            modalities: ["text"],
            max_context_tokens: 128000,
            tool_calling: {
              supported: true,
              style: "openai",
            },
            supports_embeddings: false,
          },
          status: "active",
        },
        account: {
          providerAccountId: "moonshot.vendor.primary",
          providerId: "moonshotai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "MOONSHOT_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "http://127.0.0.1:4000/v1",
          allowedModels: ["moonshotai/kimi-k2.5"],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
        provider: null,
        model: null,
      },
      executionRequest: {
        messages: [{ role: "user", content: "Summarize the remote endpoint." }],
        stream: false,
        promptCache: {
          mode: "prefer",
        },
      },
      capabilities,
    });

    const normalized = adapter.normalizeResponse({
      target: {
        endpointId: "moonshot.vendor.primary",
        modelId: "moonshotai/kimi-k2.5",
        providerId: "moonshotai",
        providerKind: "provider-openai",
        providerAccountId: "moonshot.vendor.primary",
        adapterFamily: "ai-sdk-openai-compatible",
        authFamily: "api-key",
        apiBase: "http://127.0.0.1:4000/v1",
        requestShapeHints: {
          providerShape: "openai.chat.completions",
          bodyKeys: ["model", "messages"],
          headerKeys: ["authorization"],
        },
        candidate: {
          identity: {
            endpoint_id: "moonshot.vendor.primary",
            endpoint_kind: "remote_api",
            provider_kind: "remote_openai_compat",
            serving_source: "vendor-litellm",
            model_id: "moonshotai/kimi-k2.5",
            runtime_version: "test",
            region: "global",
          },
          declared: {
            endpoint_id: "moonshot.vendor.primary",
            capabilities: ["text.chat", "tools.function_calling"],
            modalities: ["text"],
            max_context_tokens: 128000,
            tool_calling: {
              supported: true,
              style: "openai",
            },
            supports_embeddings: false,
          },
          status: "active",
        },
        account: {
          providerAccountId: "moonshot.vendor.primary",
          providerId: "moonshotai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "MOONSHOT_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "http://127.0.0.1:4000/v1",
          allowedModels: ["moonshotai/kimi-k2.5"],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
        provider: null,
        model: null,
      },
      executionRequest: {
        messages: [{ role: "user", content: "Summarize the remote endpoint." }],
        stream: false,
        promptCache: {
          mode: "prefer",
        },
      },
      capabilities,
      requestCapture,
      responseCapture: {
        providerFamily: "ai-sdk-openai-compatible",
        endpointId: "moonshot.vendor.primary",
        statusCode: 200,
        body: {
          id: "chatcmpl-litellm",
          choices: [
            {
              message: {
                content: "remote litellm summary",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 14,
            completion_tokens: 5,
            prompt_tokens_details: {
              cached_tokens: 9,
            },
          },
          _hidden_params: {
            response_cost: 0.0042,
            cache_hit: true,
          },
        },
      },
    });

    expect(normalized.promptCache).toEqual({
      requested: true,
      used: true,
      readTokens: 9,
      writeTokens: 0,
    });
    expect(normalized.vendorMetadata).toEqual({
      costUsd: 0.0042,
      cacheUsed: true,
    });
  });
});
