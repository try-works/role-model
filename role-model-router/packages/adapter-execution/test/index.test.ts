import { describe, expect, test } from "vitest";

import {
  executeRoutedRequest,
  executeLiveRoutedRequest,
  type ProviderAdapter,
  type RuntimeExecutionRequest,
} from "../src/index.js";

describe("executeRoutedRequest", () => {
  test("selects the OpenAI-family adapter and preserves routed execution context", () => {
    const executionRequest: RuntimeExecutionRequest = {
      messages: [
        { role: "system", content: "You explain routing outcomes." },
        { role: "user", content: "Summarize the chosen endpoint." },
      ],
      maxOutputTokens: 256,
      temperature: 0.2,
      stream: true,
      tools: [
        {
          name: "lookupRegistry",
          description: "Look up endpoint details.",
          inputSchema: {
            type: "object",
            properties: {
              endpointId: { type: "string" },
            },
            required: ["endpointId"],
          },
        },
      ],
      structuredOutput: {
        name: "routing_summary",
        schema: {
          type: "object",
          properties: {
            winner: { type: "string" },
            reason: { type: "string" },
          },
          required: ["winner", "reason"],
        },
      },
      promptCache: {
        mode: "prefer",
        key: "conversation-main",
      },
    };

    const adapters: ProviderAdapter[] = [
      {
        adapterFamily: "ai-sdk-openai",
        negotiateCapabilities: () => ({
          structuredOutputs: "native",
          toolCalling: {
            supported: true,
            extraction: "provider-native",
          },
          streaming: {
            text: "delta",
            toolCalls: "delta",
            toolArguments: "delta",
          },
          promptCaching: {
            supported: false,
            mode: "unsupported",
          },
          usage: {
            inputTokens: true,
            outputTokens: true,
            cacheReadTokens: false,
            cacheWriteTokens: false,
          },
        }),
        buildRequest: ({ target, executionRequest: request }) => ({
          providerFamily: "ai-sdk-openai",
          endpointId: target.endpointId,
          url: `${target.apiBase}/responses`,
          headers: {
            authorization: "Bearer OPENAI_API_KEY",
          },
          body: {
            model: target.modelId,
            input: request.messages,
          },
        }),
        normalizeResponse: ({ requestCapture, responseCapture }) => ({
          providerFamily: "ai-sdk-openai",
          requestCapture,
          responseCapture,
          outputText: "OpenAI summary",
          toolCalls: [],
          finishReason: "stop",
          structuredOutputMode: "native",
          stream: {
            requested: true,
            textDeltas: 2,
            toolCallDeltas: 0,
            toolArgumentDeltas: 0,
          },
          promptCache: {
            requested: true,
            used: false,
            readTokens: 0,
            writeTokens: 0,
          },
          usage: {
            inputTokens: 32,
            outputTokens: 24,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
          vendorMetadata: {
            vendorId: "litellm",
            costUsd: 0.0042,
          },
          errorClass: null,
          latencyMs: 120,
          diagnostics: [],
        }),
      },
    ];

    const result = executeRoutedRequest({
      routeResult: {
        projected: {
          routeInput: {
            request: {
              requestId: "req-adapter-validation",
              taskType: "code.edit",
              requiredCapabilities: ["code.edit"],
              preferredCapabilities: ["reasoning.multi_step"],
              requiredModalities: ["text"],
              contextTokens: 200,
              needsTools: true,
              strategy: "balanced",
              preferLocal: false,
            },
            candidates: [],
            roleDefinitions: [],
            taskDefinitions: [],
            roleBindings: [],
          },
          routingDiagnostics: {
            retrievalReceiptId: "conversation-main-retrieval-receipt",
            routingModel: {
              enabled: true,
              endpointId: "openai.personal.primary.us-east-1.fast",
              preferredEndpointIds: ["openai.personal.primary.us-east-1.fast"],
              ignoredEndpointIds: [],
            },
          },
        },
        decision: {
          routing_decision_id: "decision-req-adapter-validation",
          request_id: "req-adapter-validation",
          app_id: "app-runtime",
          org_id: "org-runtime",
          chosen_endpoint_id: "openai.personal.primary.us-east-1.fast",
          eligible_count: 1,
          ineligible_count: 0,
          policy_snapshot: {
            policy_id: "balanced-policy",
            strategy: "balanced",
            compute_preference: "auto",
            prefer_local: false,
            budget_mode: "strict",
            tie_break_order: ["quality", "latency_ms", "reliability", "endpoint_id"],
            required_capabilities: ["code.edit"],
            required_modalities: ["text"],
            require_tools: true,
            deny_endpoints: [],
            allow_endpoints: [],
            deny_provider_kinds: [],
            allow_provider_kinds: [],
            budget: {
              enabled: true,
              currency: "USD",
              max_cost_per_request: 0.01,
              target_cost_per_request: 0.01,
            },
            privacy: {
              allow_remote: true,
            },
            targets: {
              latency_target_ms: 150,
              latency_max_ms: 300,
              throughput_target_tps: 40,
            },
          },
          eligibility: [],
          scored_candidates: [],
          fallback_endpoints: [],
          selection_reasons: ["highest_score"],
          used_measured: true,
          used_declared: true,
          scoring_version: "router-v1",
          tie_break: {
            order: ["quality", "latency_ms", "reliability", "endpoint_id"],
            compared: [],
          },
          metric_breakdown: {
            quality: { weight: 0.3, chosen_score: 0.92 },
            latency: { weight: 0.2, chosen_score: 0.7 },
            throughput: { weight: 0.1, chosen_score: 0.8 },
            cost: { weight: 0.2, chosen_score: 0.6 },
            reliability: { weight: 0.15, chosen_score: 0.9 },
            preference: { weight: 0.05, chosen_score: 0.6 },
          },
        },
        routingDiagnostics: {
          retrievalReceiptId: "conversation-main-retrieval-receipt",
          routingModel: {
            enabled: true,
            endpointId: "openai.personal.primary.us-east-1.fast",
            preferredEndpointIds: ["openai.personal.primary.us-east-1.fast"],
            ignoredEndpointIds: [],
          },
        },
      },
      catalog: {
        catalogVersion: "1",
        source: {
          vendor: "models.dev",
          commit: "test-catalog",
          capturedAt: "2026-05-05T00:00:00Z",
          schemaVersion: "1",
        },
        providers: [
          {
            providerId: "openai",
            displayName: "OpenAI",
            providerKind: "provider-openai",
            authFamily: "api-key",
            adapterFamily: "ai-sdk-openai",
            apiBase: "https://api.openai.test/v1",
            envVars: ["OPENAI_API_KEY"],
            controlPlaneRequirements: [],
            localOverrideApplied: false,
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "test-catalog",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "1",
            },
          },
        ],
        models: [
          {
            modelId: "openai/gpt-4.1-mini-fast",
            providerId: "openai",
            providerKind: "provider-openai",
            authFamily: "api-key",
            displayName: "GPT-4.1 Mini Fast",
            version: "1",
            capabilities: ["code.edit", "tools.function_calling", "structured.output"],
            modalities: ["text"],
            contextWindow: 32768,
            maxOutputTokens: 4096,
            pricing: {
              inputPer1M: 0.4,
              outputPer1M: 1.6,
              currency: "USD",
            },
            requestShapeHints: {
              providerShape: "openai.responses",
              bodyKeys: ["temperature", "max_output_tokens"],
              headerKeys: ["OpenAI-Beta"],
            },
            experimentalModes: [],
            extendsProvenance: {
              baseModelId: null,
              chain: [],
            },
            localOverrideApplied: false,
            localNotes: [],
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "test-catalog",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "1",
            },
          },
        ],
      },
      accounts: [
        {
          providerAccountId: "openai.personal.primary",
          providerId: "openai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "OPENAI_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["us-east-1"],
          },
          baseUrlOverride: null,
          allowedModels: ["openai/gpt-4.1-mini-fast"],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      ],
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "openai.personal.primary.us-east-1.fast",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "openai/gpt-4.1-mini-fast",
              runtime_version: "run07-registry-v1",
              region: "us-east-1",
              host_class: "server",
              device_class: "server",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "openai.personal.primary.us-east-1.fast",
              capabilities: ["code.edit", "tools.function_calling", "structured.output"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: {
                supported: true,
                style: "openai",
              },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 1,
          degraded: 0,
          offline: 0,
        },
      },
      registrySources: {
        cloud: [
          {
            endpointId: "openai.personal.primary.us-east-1.fast",
            providerAccountId: "openai.personal.primary",
            modelId: "openai/gpt-4.1-mini-fast",
            region: "us-east-1",
            endpointKind: "remote-openai-compatible",
            servingSource: "remote-service",
            lifecycleState: "active",
            healthStatus: "healthy",
          },
        ],
        local: [],
      },
      executionRequest,
      adapters,
      captures: {
        byEndpointId: {
          "openai.personal.primary.us-east-1.fast": {
            body: {
              id: "resp_test_01",
              output: [
                {
                  type: "message",
                  role: "assistant",
                  content: [
                    {
                      type: "output_text",
                      text: "OpenAI summary",
                    },
                  ],
                },
              ],
              usage: {
                input_tokens: 32,
                output_tokens: 24,
              },
            },
          },
        },
      },
    });

    expect(result.target.providerId).toBe("openai");
    expect(result.target.adapterFamily).toBe("ai-sdk-openai");
    expect(result.requestCapture.url).toBe("https://api.openai.test/v1/responses");
    expect(result.normalized.outputText).toBe("OpenAI summary");
    expect(result.usageEvent.tokens_in).toBe(32);
    expect(result.usageEvent.cost_actual).toBe(0.0042);
    expect(result.trace.spans.map((span) => span.span_type)).toEqual([
      "provider.load",
      "provider.decode",
    ]);
  });

  test("prefers cloud-source request shape hints over catalog defaults", () => {
    const adapters: ProviderAdapter[] = [
      {
        adapterFamily: "ai-sdk-openai",
        negotiateCapabilities: () => ({
          structuredOutputs: "unsupported",
          toolCalling: {
            supported: false,
            extraction: "none",
          },
          streaming: {
            text: "buffered",
            toolCalls: "none",
            toolArguments: "none",
          },
          promptCaching: {
            supported: false,
            mode: "unsupported",
          },
          usage: {
            inputTokens: true,
            outputTokens: true,
            cacheReadTokens: false,
            cacheWriteTokens: false,
          },
        }),
        buildRequest: ({ target }) => ({
          providerFamily: "ai-sdk-openai",
          endpointId: target.endpointId,
          url:
            target.requestShapeHints?.providerShape === "openai.chat.completions"
              ? `${target.apiBase}/chat/completions`
              : `${target.apiBase}/responses`,
          headers: {},
          body: {},
        }),
        normalizeResponse: ({ requestCapture, responseCapture }) => ({
          providerFamily: "ai-sdk-openai",
          requestCapture,
          responseCapture,
          outputText: "ok",
          toolCalls: [],
          finishReason: "stop",
          structuredOutputMode: "none",
          stream: {
            requested: false,
            textDeltas: 0,
            toolCallDeltas: 0,
            toolArgumentDeltas: 0,
          },
          promptCache: {
            requested: false,
            used: false,
            readTokens: 0,
            writeTokens: 0,
          },
          usage: {
            inputTokens: 0,
            outputTokens: 0,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
          errorClass: null,
          latencyMs: 1,
          diagnostics: [],
        }),
      },
    ];

    const result = executeRoutedRequest({
      routeResult: {
        projected: {
          routeInput: {
            request: {
              requestId: "req-litellm-hints",
              taskType: "text.chat",
              requiredCapabilities: ["text.chat"],
              preferredCapabilities: [],
              requiredModalities: ["text"],
              contextTokens: 100,
              needsTools: false,
              strategy: "balanced",
              maxCostUsd: 1,
              metadata: {},
            },
            candidates: [],
          },
          policySnapshot: {
            strategy: "balanced",
            privacy: "standard",
            maxCostUsd: 1,
            maxLatencyMs: 1000,
            preferredRegions: [],
            cachePreference: "neutral",
          },
        },
        decision: {
          decision_id: "decision-litellm-hints",
          trace_id: "trace-litellm-hints",
          chosen_endpoint_id: "openai.litellm.global.openai-gpt-4-1-mini-fast",
          fallback_endpoint_ids: [],
          selection_reason: "best_match",
          excluded_endpoints: [],
          considered_endpoints: [],
          policy_snapshot: {
            strategy: "balanced",
          },
          scoring_version: "test",
          used_measured: false,
          used_declared: true,
          explanation: "selected litellm-backed endpoint",
        },
      },
      catalog: {
        catalogVersion: "1",
        source: {
          vendor: "models.dev",
          commit: "test-catalog",
          capturedAt: "2026-05-05T00:00:00Z",
          schemaVersion: "1",
        },
        providers: [
          {
            providerId: "openai",
            displayName: "OpenAI",
            providerKind: "provider-openai",
            authFamily: "api-key",
            adapterFamily: "ai-sdk-openai",
            apiBase: "https://api.openai.test/v1",
            envVars: ["OPENAI_API_KEY"],
            supportedAuthModes: ["api-key-static"],
            controlPlaneRequirements: [],
            localOverrideApplied: false,
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "test-catalog",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "1",
            },
          },
        ],
        models: [
          {
            modelId: "openai/gpt-4.1-mini-fast",
            providerId: "openai",
            providerKind: "provider-openai",
            authFamily: "api-key",
            displayName: "GPT-4.1 Mini Fast",
            version: "1",
            capabilities: ["text.chat"],
            modalities: ["text"],
            contextWindow: 32768,
            maxOutputTokens: 4096,
            pricing: null,
            requestShapeHints: {
              providerShape: "openai.responses",
              bodyKeys: ["input"],
              headerKeys: ["OpenAI-Beta"],
            },
            experimentalModes: [],
            extendsProvenance: {
              baseModelId: null,
              chain: [],
            },
            localOverrideApplied: false,
            localNotes: [],
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "test-catalog",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "1",
            },
          },
        ],
      },
      accounts: [
        {
          providerAccountId: "openai.litellm",
          providerId: "openai",
          providerKind: "provider-openai",
          orgScope: "runtime-config",
          accountScope: "runtime-config",
          credentialRef: {
            backend: "local-encrypted-file",
            ref: "runtime/openai.litellm",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "http://127.0.0.1:4000/v1",
          allowedModels: ["openai/gpt-4.1-mini-fast"],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      ],
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "openai.litellm.global.openai-gpt-4-1-mini-fast",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "vendor-litellm",
              model_id: "openai/gpt-4.1-mini-fast",
              runtime_version: "run15",
              region: "global",
              host_class: "server",
              device_class: "server",
              org_scope: "runtime-config",
            },
            declared: {
              endpoint_id: "openai.litellm.global.openai-gpt-4-1-mini-fast",
              capabilities: ["text.chat"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: {
                supported: true,
                style: "openai",
              },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 1,
          degraded: 0,
          offline: 0,
        },
      },
      registrySources: {
        cloud: [
          {
            endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
            providerAccountId: "openai.litellm",
            modelId: "openai/gpt-4.1-mini-fast",
            region: "global",
            endpointKind: "remote-openai-compatible",
            servingSource: "vendor-litellm",
            lifecycleState: "active",
            healthStatus: "healthy",
            requestShapeHints: {
              providerShape: "openai.chat.completions",
              bodyKeys: ["messages", "max_tokens"],
              headerKeys: ["authorization"],
            },
          },
        ],
        local: [],
      },
      executionRequest: {
        messages: [{ role: "user", content: "Say hello." }],
        stream: false,
      },
      adapters,
      captures: {
        byEndpointId: {
          "openai.litellm.global.openai-gpt-4-1-mini-fast": {
            body: {},
          },
        },
      },
    });

    expect(result.target.requestShapeHints).toEqual({
      providerShape: "openai.chat.completions",
      bodyKeys: ["messages", "max_tokens"],
      headerKeys: ["authorization"],
    });
    expect(result.requestCapture.url).toBe("http://127.0.0.1:4000/v1/chat/completions");
  });

  test("fails when the chosen endpoint cannot be resolved to a supported provider adapter", () => {
    expect(() =>
      executeRoutedRequest({
        routeResult: {
          projected: {
            routeInput: {
              request: {
                requestId: "req-local",
                taskType: "code.edit",
                requiredCapabilities: ["code.edit"],
                preferredCapabilities: [],
                requiredModalities: ["text"],
                contextTokens: 10,
                needsTools: false,
                strategy: "balanced",
                preferLocal: true,
              },
              candidates: [],
              roleDefinitions: [],
              taskDefinitions: [],
              roleBindings: [],
            },
            routingDiagnostics: {
              retrievalReceiptId: "receipt-local",
              routingModel: {
                enabled: false,
                endpointId: null,
                preferredEndpointIds: [],
                ignoredEndpointIds: [],
              },
            },
          },
          decision: {
            routing_decision_id: "decision-req-local",
            request_id: "req-local",
            app_id: "app-runtime",
            chosen_endpoint_id: "cli.local.coder",
            eligible_count: 1,
            ineligible_count: 0,
            policy_snapshot: {
              policy_id: "balanced-policy",
              strategy: "balanced",
              compute_preference: "local",
              prefer_local: true,
              budget_mode: "disabled",
              tie_break_order: ["quality", "latency_ms", "reliability", "endpoint_id"],
              required_capabilities: ["code.edit"],
              required_modalities: ["text"],
              require_tools: false,
              deny_endpoints: [],
              allow_endpoints: [],
              deny_provider_kinds: [],
              allow_provider_kinds: [],
              budget: {
                enabled: false,
                currency: "USD",
              },
              privacy: {
                allow_remote: true,
              },
              targets: {
                latency_target_ms: 150,
                latency_max_ms: 300,
                throughput_target_tps: 40,
              },
            },
            eligibility: [],
            scored_candidates: [],
            fallback_endpoints: [],
            selection_reasons: ["highest_score"],
            used_measured: false,
            used_declared: true,
            scoring_version: "router-v1",
            tie_break: {
              order: ["quality", "latency_ms", "reliability", "endpoint_id"],
              compared: [],
            },
            metric_breakdown: {
              quality: { weight: 0.3, chosen_score: 0.9 },
              latency: { weight: 0.2, chosen_score: 0.9 },
              throughput: { weight: 0.1, chosen_score: 0.9 },
              cost: { weight: 0.2, chosen_score: 1 },
              reliability: { weight: 0.15, chosen_score: 0.9 },
              preference: { weight: 0.05, chosen_score: 1 },
            },
          },
          routingDiagnostics: {
            retrievalReceiptId: "receipt-local",
            routingModel: {
              enabled: false,
              endpointId: null,
              preferredEndpointIds: [],
              ignoredEndpointIds: [],
            },
          },
        },
        catalog: {
          catalogVersion: "1",
          source: {
            vendor: "models.dev",
            commit: "test-catalog",
            capturedAt: "2026-05-05T00:00:00Z",
            schemaVersion: "1",
          },
          providers: [],
          models: [],
        },
        accounts: [],
        registry: {
          endpoints: [
            {
              identity: {
                endpoint_id: "cli.local.coder",
                endpoint_kind: "local_engine",
                provider_kind: "cli",
                serving_source: "local-process",
                model_id: "gpt-5.4",
                runtime_version: "run07-registry-v1",
                region: "local",
              },
              declared: {
                endpoint_id: "cli.local.coder",
                capabilities: ["code.edit"],
                modalities: ["text"],
                max_context_tokens: 32768,
                tool_calling: {
                  supported: false,
                  style: "none",
                },
                supports_embeddings: false,
              },
              status: "active",
            },
          ],
          diagnostics: [],
          lifecycleSummary: {
            active: 1,
            degraded: 0,
            offline: 0,
          },
        },
        registrySources: {
          cloud: [],
          local: [
            {
              endpointId: "cli.local.coder",
              providerKind: "provider-cli",
              providerId: "local-cli",
              modelId: "gpt-5.4",
              capabilities: ["code.edit"],
              modalities: ["text"],
              endpointKind: "cli-agent",
              servingSource: "local-process",
              lifecycleState: "active",
              hostClass: "developer-workstation",
              deviceClass: "developer-workstation",
              region: "local",
              orgScope: "personal",
            },
          ],
        },
        executionRequest: {
          messages: [{ role: "user", content: "hello" }],
        },
        adapters: [],
        captures: {
          byEndpointId: {},
        },
      }),
    ).toThrow("No provider adapter is registered");
  });

  test("can execute through a live provider-request callback instead of fixture captures", async () => {
    const adapters: ProviderAdapter[] = [
      {
        adapterFamily: "ai-sdk-openai-compatible",
        negotiateCapabilities: () => ({
          structuredOutputs: "unsupported",
          toolCalling: {
            supported: true,
            extraction: "provider-native",
          },
          streaming: {
            text: "message",
            toolCalls: "message",
            toolArguments: "message",
          },
          promptCaching: {
            supported: false,
            mode: "unsupported",
          },
          usage: {
            inputTokens: true,
            outputTokens: true,
            cacheReadTokens: false,
            cacheWriteTokens: false,
          },
        }),
        buildRequest: ({ target, executionRequest: request }) => ({
          providerFamily: target.adapterFamily,
          endpointId: target.endpointId,
          url: `${target.apiBase}/chat/completions`,
          headers: {
            authorization: "Bearer oauth/moonshotai/account",
          },
          body: {
            model: target.modelId,
            messages: request.messages,
          },
        }),
        normalizeResponse: ({ requestCapture, responseCapture }) => ({
          providerFamily: responseCapture.providerFamily,
          requestCapture,
          responseCapture,
          outputText: String(
            ((responseCapture.body as { choices?: Array<{ message?: { content?: string } }> }).choices ?? [])[0]
              ?.message?.content ?? "",
          ),
          toolCalls: [],
          finishReason: "stop",
          structuredOutputMode: "none",
          stream: {
            requested: false,
            textDeltas: 1,
            toolCallDeltas: 0,
            toolArgumentDeltas: 0,
          },
          promptCache: {
            requested: false,
            used: false,
            readTokens: 0,
            writeTokens: 0,
          },
          usage: {
            inputTokens: 12,
            outputTokens: 7,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
          errorClass: null,
          latencyMs: 45,
          diagnostics: [],
        }),
      },
    ];

    const result = await executeLiveRoutedRequest({
      routeResult: {
        projected: {
          routeInput: {
            request: {
              requestId: "req-kimi-live",
              taskType: "text.chat",
              requiredCapabilities: ["text.chat"],
              preferredCapabilities: [],
              requiredModalities: ["text"],
              contextTokens: 16,
              needsTools: false,
              strategy: "balanced",
              preferLocal: false,
            },
            candidates: [],
            roleDefinitions: [],
            taskDefinitions: [],
            roleBindings: [],
          },
          routingDiagnostics: {
            retrievalReceiptId: "receipt-kimi-live",
            routingModel: {
              enabled: false,
              endpointId: null,
              preferredEndpointIds: [],
              ignoredEndpointIds: [],
            },
          },
        },
        decision: {
          routing_decision_id: "decision-req-kimi-live",
          request_id: "req-kimi-live",
          app_id: "app-runtime",
          org_id: "org-runtime",
          chosen_endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.5",
          eligible_count: 1,
          ineligible_count: 0,
          policy_snapshot: {
            policy_id: "balanced-policy",
            strategy: "balanced",
            compute_preference: "auto",
            prefer_local: false,
            budget_mode: "strict",
            tie_break_order: ["quality", "latency_ms", "reliability", "endpoint_id"],
            required_capabilities: ["text.chat"],
            required_modalities: ["text"],
            require_tools: false,
            deny_endpoints: [],
            allow_endpoints: [],
            deny_provider_kinds: [],
            allow_provider_kinds: [],
            budget: {
              enabled: false,
              currency: "USD",
            },
            privacy: {
              allow_remote: true,
            },
            targets: {
              latency_target_ms: 150,
              latency_max_ms: 300,
              throughput_target_tps: 40,
            },
          },
          eligibility: [],
          scored_candidates: [],
          fallback_endpoints: [],
          selection_reasons: ["highest_score"],
          used_measured: false,
          used_declared: true,
          scoring_version: "router-v1",
          tie_break: {
            order: ["quality", "latency_ms", "reliability", "endpoint_id"],
            compared: [],
          },
          metric_breakdown: {
            quality: { weight: 1, chosen_score: 1 },
          },
        },
        routingDiagnostics: {
          retrievalReceiptId: "receipt-kimi-live",
          routingModel: {
            enabled: false,
            endpointId: null,
            preferredEndpointIds: [],
            ignoredEndpointIds: [],
          },
        },
      },
      catalog: {
        catalogVersion: "1",
        source: {
          vendor: "models.dev",
          commit: "test-catalog",
          capturedAt: "2026-05-05T00:00:00Z",
          schemaVersion: "1",
        },
        providers: [
          {
            providerId: "moonshotai",
            displayName: "Moonshot AI",
            providerKind: "provider-openai",
            authFamily: "api-key",
            adapterFamily: "ai-sdk-openai-compatible",
            apiBase: "https://api.kimi.test/coding/v1",
            envVars: ["MOONSHOT_API_KEY"],
            supportedAuthModes: ["oauth2-device-code"],
            controlPlaneRequirements: [],
            localOverrideApplied: false,
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "test-catalog",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "1",
            },
          },
        ],
        models: [
          {
            modelId: "moonshotai/kimi-k2.5",
            providerId: "moonshotai",
            providerKind: "provider-openai",
            authFamily: "api-key",
            displayName: "Kimi K2.5",
            version: "1",
            capabilities: ["text.chat"],
            modalities: ["text"],
            contextWindow: 32768,
            maxOutputTokens: 4096,
            pricing: null,
            requestShapeHints: {
              providerShape: "openai.chat.completions",
              bodyKeys: ["messages", "max_tokens"],
              headerKeys: ["Authorization"],
            },
            experimentalModes: [],
            extendsProvenance: {
              baseModelId: null,
              chain: [],
            },
            localOverrideApplied: false,
            localNotes: [],
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "test-catalog",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "1",
            },
          },
        ],
      },
      accounts: [
        {
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshotai",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "local-encrypted-file",
            ref: "oauth/moonshotai/moonshot.personal.kimi-code",
          },
          authMode: "oauth2-device-code",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "https://api.kimi.test/coding/v1",
          allowedModels: ["moonshotai/kimi-k2.5"],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      ],
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.5",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "moonshotai/kimi-k2.5",
              runtime_version: "run14",
              region: "global",
              host_class: "server",
              device_class: "server",
              org_scope: "personal",
            },
            declared: {
              endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.5",
              capabilities: ["text.chat"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: {
                supported: true,
                style: "openai",
              },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 1,
          degraded: 0,
          offline: 0,
        },
      },
      registrySources: {
        cloud: [
          {
            endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
            providerAccountId: "moonshot.personal.kimi-code",
            modelId: "moonshotai/kimi-k2.5",
            region: "global",
            endpointKind: "remote-openai-compatible",
            servingSource: "remote-service",
            lifecycleState: "active",
            healthStatus: "healthy",
          },
        ],
        local: [],
      },
      executionRequest: {
        messages: [{ role: "user", content: "Say hi." }],
      },
      adapters,
      executeProviderRequest: async ({ target, requestCapture }) => {
        expect(target.adapterFamily).toBe("ai-sdk-openai-compatible");
        expect(requestCapture.url).toBe("https://api.kimi.test/coding/v1/chat/completions");
        return {
          providerFamily: target.adapterFamily,
          endpointId: target.endpointId,
          statusCode: 200,
          body: {
            choices: [{ message: { content: "live kimi reply" }, finish_reason: "stop" }],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 7,
            },
          },
        };
      },
    });

    expect(result.target.adapterFamily).toBe("ai-sdk-openai-compatible");
    expect(result.normalized.outputText).toBe("live kimi reply");
    expect(result.responseCapture.statusCode).toBe(200);
  });

  test("resolves fallback endpoint ids into fallback model ids for live provider execution", async () => {
    const adapters: ProviderAdapter[] = [
      {
        adapterFamily: "ai-sdk-openai",
        negotiateCapabilities: () => ({
          structuredOutputs: "unsupported",
          toolCalling: {
            supported: true,
            extraction: "provider-native",
          },
          streaming: {
            text: "message",
            toolCalls: "message",
            toolArguments: "message",
          },
          promptCaching: {
            supported: false,
            mode: "unsupported",
          },
          usage: {
            inputTokens: true,
            outputTokens: true,
            cacheReadTokens: false,
            cacheWriteTokens: false,
          },
        }),
        buildRequest: ({ target, executionRequest: request }) => ({
          providerFamily: target.adapterFamily,
          endpointId: target.endpointId,
          url: `${target.apiBase}/chat/completions`,
          headers: {
            authorization: "Bearer runtime/openai",
          },
          body: {
            model: target.modelId,
            messages: request.messages,
          },
        }),
        normalizeResponse: ({ requestCapture, responseCapture }) => ({
          providerFamily: responseCapture.providerFamily,
          requestCapture,
          responseCapture,
          outputText: "live litellm reply",
          toolCalls: [],
          finishReason: "stop",
          structuredOutputMode: "none",
          stream: {
            requested: false,
            textDeltas: 1,
            toolCallDeltas: 0,
            toolArgumentDeltas: 0,
          },
          promptCache: {
            requested: false,
            used: false,
            readTokens: 0,
            writeTokens: 0,
          },
          usage: {
            inputTokens: 12,
            outputTokens: 7,
            cacheReadTokens: 0,
            cacheWriteTokens: 0,
          },
          errorClass: null,
          latencyMs: 45,
          diagnostics: [],
        }),
      },
    ];

    const result = await executeLiveRoutedRequest({
      routeResult: {
        projected: {
          routeInput: {
            request: {
              requestId: "req-litellm-live-fallbacks",
              taskType: "text.chat",
              requiredCapabilities: ["text.chat"],
              preferredCapabilities: [],
              requiredModalities: ["text"],
              contextTokens: 16,
              needsTools: false,
              strategy: "balanced",
              preferLocal: false,
            },
            candidates: [],
            roleDefinitions: [],
            taskDefinitions: [],
            roleBindings: [],
          },
          routingDiagnostics: {
            retrievalReceiptId: "receipt-litellm-live-fallbacks",
            routingModel: {
              enabled: false,
              endpointId: null,
              preferredEndpointIds: [],
              ignoredEndpointIds: [],
            },
          },
        },
        decision: {
          routing_decision_id: "decision-req-litellm-live-fallbacks",
          request_id: "req-litellm-live-fallbacks",
          app_id: "app-runtime",
          org_id: "org-runtime",
          chosen_endpoint_id: "openai.litellm.global.openai-gpt-4-1-mini-fast",
          fallback_endpoint_ids: ["openai.litellm.global.openai-gpt-4-1-mini-slow"],
          eligible_count: 2,
          ineligible_count: 0,
          policy_snapshot: {
            policy_id: "balanced-policy",
            strategy: "balanced",
            compute_preference: "auto",
            prefer_local: false,
            budget_mode: "strict",
            tie_break_order: ["quality", "latency_ms", "reliability", "endpoint_id"],
            required_capabilities: ["text.chat"],
            required_modalities: ["text"],
            require_tools: false,
            deny_endpoints: [],
            allow_endpoints: [],
            deny_provider_kinds: [],
            allow_provider_kinds: [],
            budget: {
              enabled: false,
              currency: "USD",
            },
            privacy: {
              allow_remote: true,
            },
            targets: {
              latency_target_ms: 150,
              latency_max_ms: 300,
              throughput_target_tps: 40,
            },
          },
          eligibility: [],
          scored_candidates: [],
          selection_reasons: ["highest_score"],
          used_measured: false,
          used_declared: true,
          scoring_version: "router-v1",
          tie_break: {
            order: ["quality", "latency_ms", "reliability", "endpoint_id"],
            compared: [],
          },
          metric_breakdown: {
            quality: { weight: 1, chosen_score: 1 },
          },
        },
        routingDiagnostics: {
          retrievalReceiptId: "receipt-litellm-live-fallbacks",
          routingModel: {
            enabled: false,
            endpointId: null,
            preferredEndpointIds: [],
            ignoredEndpointIds: [],
          },
        },
      },
      catalog: {
        catalogVersion: "1",
        source: {
          vendor: "models.dev",
          commit: "test-catalog",
          capturedAt: "2026-05-05T00:00:00Z",
          schemaVersion: "1",
        },
        providers: [
          {
            providerId: "openai",
            displayName: "OpenAI",
            providerKind: "provider-openai",
            authFamily: "api-key",
            adapterFamily: "ai-sdk-openai",
            apiBase: "https://api.openai.test/v1",
            envVars: ["OPENAI_API_KEY"],
            supportedAuthModes: ["api-key-static"],
            controlPlaneRequirements: [],
            localOverrideApplied: false,
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "test-catalog",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "1",
            },
          },
        ],
        models: [
          {
            modelId: "openai/gpt-4.1-mini-fast",
            providerId: "openai",
            providerKind: "provider-openai",
            authFamily: "api-key",
            displayName: "GPT-4.1 Mini Fast",
            version: "1",
            capabilities: ["text.chat"],
            modalities: ["text"],
            contextWindow: 32768,
            maxOutputTokens: 4096,
            pricing: null,
            requestShapeHints: {
              providerShape: "openai.chat.completions",
              bodyKeys: ["messages", "max_tokens"],
              headerKeys: ["Authorization"],
            },
            experimentalModes: [],
            extendsProvenance: {
              baseModelId: null,
              chain: [],
            },
            localOverrideApplied: false,
            localNotes: [],
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "test-catalog",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "1",
            },
          },
          {
            modelId: "openai/gpt-4.1-mini-slow",
            providerId: "openai",
            providerKind: "provider-openai",
            authFamily: "api-key",
            displayName: "GPT-4.1 Mini Slow",
            version: "1",
            capabilities: ["text.chat"],
            modalities: ["text"],
            contextWindow: 32768,
            maxOutputTokens: 4096,
            pricing: null,
            requestShapeHints: {
              providerShape: "openai.chat.completions",
              bodyKeys: ["messages", "max_tokens"],
              headerKeys: ["Authorization"],
            },
            experimentalModes: [],
            extendsProvenance: {
              baseModelId: null,
              chain: [],
            },
            localOverrideApplied: false,
            localNotes: [],
            upstreamProvenance: {
              vendor: "models.dev",
              commit: "test-catalog",
              capturedAt: "2026-05-05T00:00:00Z",
              schemaVersion: "1",
            },
          },
        ],
      },
      accounts: [
        {
          providerAccountId: "openai.litellm",
          providerId: "openai",
          providerKind: "provider-openai",
          orgScope: "runtime-config",
          accountScope: "runtime-config",
          credentialRef: {
            backend: "local-encrypted-file",
            ref: "runtime/openai.litellm",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "http://127.0.0.1:4000/v1",
          allowedModels: ["openai/gpt-4.1-mini-fast", "openai/gpt-4.1-mini-slow"],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      ],
      registry: {
        endpoints: [
          {
            identity: {
              endpoint_id: "openai.litellm.global.openai-gpt-4-1-mini-fast",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "vendor-litellm",
              model_id: "openai/gpt-4.1-mini-fast",
              runtime_version: "run15",
              region: "global",
              host_class: "server",
              device_class: "server",
              org_scope: "runtime-config",
            },
            declared: {
              endpoint_id: "openai.litellm.global.openai-gpt-4-1-mini-fast",
              capabilities: ["text.chat"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: {
                supported: true,
                style: "openai",
              },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
          {
            identity: {
              endpoint_id: "openai.litellm.global.openai-gpt-4-1-mini-slow",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "vendor-litellm",
              model_id: "openai/gpt-4.1-mini-slow",
              runtime_version: "run15",
              region: "global",
              host_class: "server",
              device_class: "server",
              org_scope: "runtime-config",
            },
            declared: {
              endpoint_id: "openai.litellm.global.openai-gpt-4-1-mini-slow",
              capabilities: ["text.chat"],
              modalities: ["text"],
              max_context_tokens: 32768,
              tool_calling: {
                supported: true,
                style: "openai",
              },
              supports_embeddings: false,
              platform_constraints: [],
            },
            status: "active",
          },
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 2,
          degraded: 0,
          offline: 0,
        },
      },
      registrySources: {
        cloud: [
          {
            endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
            providerAccountId: "openai.litellm",
            modelId: "openai/gpt-4.1-mini-fast",
            region: "global",
            endpointKind: "remote-openai-compatible",
            servingSource: "vendor-litellm",
            lifecycleState: "active",
            healthStatus: "healthy",
            requestShapeHints: {
              providerShape: "openai.chat.completions",
              bodyKeys: ["messages", "max_tokens"],
              headerKeys: ["authorization"],
            },
          },
          {
            endpointId: "openai.litellm.global.openai-gpt-4-1-mini-slow",
            providerAccountId: "openai.litellm",
            modelId: "openai/gpt-4.1-mini-slow",
            region: "global",
            endpointKind: "remote-openai-compatible",
            servingSource: "vendor-litellm",
            lifecycleState: "active",
            healthStatus: "healthy",
            requestShapeHints: {
              providerShape: "openai.chat.completions",
              bodyKeys: ["messages", "max_tokens"],
              headerKeys: ["authorization"],
            },
          },
        ],
        local: [],
      },
      executionRequest: {
        messages: [{ role: "user", content: "Say hi." }],
      },
      adapters,
      executeProviderRequest: async ({ target, requestCapture, fallbackModelIds }) => {
        expect(target.adapterFamily).toBe("ai-sdk-openai");
        expect(requestCapture.url).toBe("http://127.0.0.1:4000/v1/chat/completions");
        expect(fallbackModelIds).toEqual(["openai/gpt-4.1-mini-slow"]);
        return {
          providerFamily: target.adapterFamily,
          endpointId: target.endpointId,
          statusCode: 200,
          body: {
            choices: [{ message: { content: "live litellm reply" }, finish_reason: "stop" }],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 7,
            },
          },
        };
      },
    });

    expect(result.normalized.outputText).toBe("live litellm reply");
    expect(result.responseCapture.statusCode).toBe(200);
  });
});
