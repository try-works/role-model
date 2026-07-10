import { describe, expect, test, vi } from "vitest";

import {
  activateRuntimeEndpoint,
  clearAllBenchmarkData,
  createRolePolicyRole,
  explicitAssignmentToRoleIds,
  fetchActivityCapture,
  fetchActivityMetrics,
  fetchAudioVoices,
  fetchBenchmarkRuns,
  fetchBenchmarkSummariesByMode,
  fetchControllerAssignment,
  fetchDownstreamOpenAIProviderConfig,
  fetchLocalModels,
  fetchModelTelemetryRollup,
  fetchRequestDetail,
  fetchRolePolicy,
  fetchRouterCandidates,
  fetchRouterConfig,
  fetchRouterDecisionDetail,
  fetchRouterDecisions,
  fetchRouterSummary,
  fetchRuntimeConfig,
  fetchRuntimeDashboardSnapshot,
  fetchRuntimeShellSnapshot,
  fetchRuntimeSnapshot,
  fetchRuntimeSummary,
  fetchTelemetryAnalytics,
  fetchTelemetryDashboard,
  fetchTelemetryRequests,
  fetchTextLogs,
  fetchVersionInfo,
  loadLlamaSwapModel,
  loadPeerModel,
  openRuntimeExternalUrl,
  pollRuntimeDeviceAuthorization,
  reconnectRuntimeAccount,
  removeRuntimeAccountModel,
  roleIdsToExplicitAssignment,
  setLlamaSwapModelRoles,
  setPeerModelRoles,
  startRuntimeDeviceAuthorization,
  submitAdvancedRequest,
  submitAudioTranscription,
  submitImageGeneration,
  submitRerankRequest,
  submitSdApiTxt2Img,
  submitSpeechGeneration,
  submitWorkbenchChat,
  subscribeTelemetryStream,
  updateControllerAssignment,
  updateRolePolicyRole,
  updateRuntimeAccountApiKey,
  updateRuntimeConfig,
  updateTaskDefinitions,
} from "./runtime-api";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

function responseWithStatus(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("fetchRuntimeSnapshot", () => {
  test("loads the operator shell data from the runtime control-plane endpoints", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;

      switch (url) {
        case "/api/role-model/runtime/summary":
          return jsonResponse({
            providerCount: 3,
            accountCount: 2,
            endpointCount: 3,
            readinessSummary: {
              pendingDeviceAuthorizationCount: 1,
              credentialsMissingAccountCount: 1,
              connectedWithoutEndpointCount: 1,
              readyAccountCount: 1,
            },
          });
        case "/api/role-model/providers":
          return jsonResponse([{ providerId: "moonshot" }]);
        case "/api/role-model/accounts":
          return jsonResponse([
            {
              providerAccountId: "moonshot.personal.primary",
              modelRoleBindings: [
                {
                  modelId: "moonshot/kimi-k2.5",
                  roleIds: ["general.chat"],
                },
              ],
            },
          ]);
        case "/api/role-model/accounts/device":
          return jsonResponse([
            {
              authRequestId: "auth-001",
              providerAccountId: "moonshot.personal.kimi-code",
              providerId: "moonshot",
              variantId: "kimi-code",
              status: "pending",
              userCode: "ABCD-EFGH",
              verificationUriComplete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
            },
          ]);
        case "/api/role-model/endpoints":
          return jsonResponse([{ endpointId: "openai.personal.primary.us-east-1.fast" }]);
        case "/api/role-model/roles":
          return jsonResponse([{ roleId: "general.chat", label: "General chat" }]);
        case "/api/role-model/requests":
          return jsonResponse([{ requestId: "req-001" }]);
        case "/api/role-model/models":
          return jsonResponse([
            {
              id: "openai/gpt-4.1-mini-fast",
              object: "model",
              owned_by: "role-model",
              providerId: "openai",
              displayName: "GPT-4.1 Mini Fast",
              endpoint_ids: [],
              capabilities: ["text.chat", "tools.function_calling"],
              modalities: ["text"],
              contextWindow: 1047576,
              maxOutputTokens: 32768,
              pricing: {
                inputPer1M: 0.4,
                outputPer1M: 1.6,
                currency: "USD",
              },
            },
          ]);
        case "/v1/models":
          return jsonResponse({
            object: "list",
            data: [
              {
                id: "openai/gpt-4.1-mini-fast",
                object: "model",
                owned_by: "role-model",
                providerId: "openai",
                displayName: "GPT-4.1 Mini Fast",
                endpoint_ids: [],
                capabilities: ["text.chat", "tools.function_calling"],
                modalities: ["text"],
                contextWindow: 1047576,
                maxOutputTokens: 32768,
                pricing: {
                  inputPer1M: 0.4,
                  outputPer1M: 1.6,
                  currency: "USD",
                },
              },
            ],
          });
        default:
          throw new Error(`Unexpected request: ${url}`);
      }
    });

    await expect(fetchRuntimeSnapshot(fetcher)).resolves.toEqual({
      summary: {
        providerCount: 3,
        accountCount: 2,
        endpointCount: 3,
        readinessSummary: {
          pendingDeviceAuthorizationCount: 1,
          credentialsMissingAccountCount: 1,
          connectedWithoutEndpointCount: 1,
          readyAccountCount: 1,
        },
      },
      providers: [{ providerId: "moonshot" }],
      accounts: [
        {
          providerAccountId: "moonshot.personal.primary",
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.5",
              roleIds: ["general.chat"],
            },
          ],
        },
      ],
      deviceAuthorizations: [
        {
          authRequestId: "auth-001",
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshot",
          variantId: "kimi-code",
          status: "pending",
          userCode: "ABCD-EFGH",
          verificationUriComplete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
        },
      ],
      endpoints: [{ endpointId: "openai.personal.primary.us-east-1.fast" }],
      requests: [{ requestId: "req-001" }],
      models: [
        {
          id: "openai/gpt-4.1-mini-fast",
          object: "model",
          owned_by: "role-model",
          providerId: "openai",
          displayName: "GPT-4.1 Mini Fast",
          endpoint_ids: [],
          capabilities: ["text.chat", "tools.function_calling"],
          modalities: ["text"],
          contextWindow: 1047576,
          maxOutputTokens: 32768,
          pricing: {
            inputPer1M: 0.4,
            outputPer1M: 1.6,
            currency: "USD",
          },
        },
      ],
      roles: [{ roleId: "general.chat", label: "General chat" }],
    });
  });
});

describe("fetchRuntimeSummary", () => {
  test("retries transient runtime summary failures before surfacing an error", async () => {
    vi.useFakeTimers();
    const responses = [
      responseWithStatus(500, { error: "bridge bootstrap still running" }),
      responseWithStatus(500, { error: "registry warming" }),
      jsonResponse({
        providerCount: 3,
        accountCount: 2,
        endpointCount: 4,
      }),
    ];
    const fetcher = vi.fn(async () => {
      const next = responses.shift();
      if (!next) {
        throw new Error("Unexpected extra runtime summary fetch.");
      }
      return next;
    });

    const pending = fetchRuntimeSummary(fetcher);
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual({
      providerCount: 3,
      accountCount: 2,
      endpointCount: 4,
    });
    expect(fetcher).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });
});

describe("fetchRuntimeShellSnapshot", () => {
  test("loads only the runtime shell dependencies and skips heavyweight inventory endpoints", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;

      switch (url) {
        case "/api/role-model/runtime/summary":
          return jsonResponse({
            providerCount: 3,
            accountCount: 2,
            endpointCount: 4,
            lifecycleSummary: {
              active: 2,
              degraded: 1,
              offline: 1,
            },
          });
        case "/api/role-model/controller":
          return jsonResponse({
            endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4",
            modelId: "chatgpt/gpt-5.4",
            sourceType: "runtime-default",
          });
        case "/api/role-model/runtime/config":
          return jsonResponse({
            path: "C:/runtime-config.yaml",
            config: {
              executionMode: "remote_only",
              routingStrategy: "difficulty",
              llamaSwap: { models: [] },
              liteLLM: { providers: [] },
            },
          });
        case "/api/version":
          return jsonResponse({
            version: "1.2.3",
            commit: "abc123",
            build_date: "2026-07-10",
          });
        case "/api/role-model/requests":
        case "/api/role-model/models":
        case "/api/role-model/providers":
        case "/api/role-model/accounts":
        case "/api/role-model/accounts/device":
        case "/api/role-model/endpoints":
        case "/api/role-model/roles":
          throw new Error(`Heavy endpoint should not be fetched: ${url}`);
        default:
          throw new Error(`Unexpected request: ${url}`);
      }
    });

    await expect(fetchRuntimeShellSnapshot(fetcher)).resolves.toEqual({
      summary: {
        providerCount: 3,
        accountCount: 2,
        endpointCount: 4,
        lifecycleSummary: {
          active: 2,
          degraded: 1,
          offline: 1,
        },
      },
      controller: {
        endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4",
        modelId: "chatgpt/gpt-5.4",
        sourceType: "runtime-default",
      },
      configRecord: {
        path: "C:/runtime-config.yaml",
        config: {
          executionMode: "remote_only",
          routingStrategy: "difficulty",
          llamaSwap: { models: [] },
          liteLLM: { providers: [] },
        },
      },
      version: {
        version: "1.2.3",
        commit: "abc123",
        build_date: "2026-07-10",
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
});

describe("fetchRuntimeDashboardSnapshot", () => {
  test("loads only endpoint inventory and role definitions for the overview route", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;

      switch (url) {
        case "/api/role-model/endpoints":
          return jsonResponse([
            {
              endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro",
              providerId: "deepseek",
              modelId: "deepseek/deepseek-v4-pro",
            },
          ]);
        case "/api/role-model/roles":
          return jsonResponse([{ roleId: "general.chat", label: "General chat" }]);
        case "/api/role-model/runtime/summary":
        case "/api/role-model/providers":
        case "/api/role-model/accounts":
        case "/api/role-model/accounts/device":
        case "/api/role-model/requests":
        case "/api/role-model/models":
        case "/api/version":
        case "/api/role-model/controller":
        case "/api/role-model/runtime/config":
          throw new Error(`Heavy endpoint should not be fetched: ${url}`);
        default:
          throw new Error(`Unexpected request: ${url}`);
      }
    });

    await expect(fetchRuntimeDashboardSnapshot(fetcher)).resolves.toEqual({
      endpoints: [
        {
          endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro",
          providerId: "deepseek",
          modelId: "deepseek/deepseek-v4-pro",
        },
      ],
      roles: [{ roleId: "general.chat", label: "General chat" }],
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("fetchLocalModels", () => {
  test("preserves local ownership and llama-swap config metadata from the runtime API", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/local/models");

      return jsonResponse([
        {
          modelId: "lfm2.5-1.2b-instruct",
          loadedAt: "2026-05-16T00:00:00.000Z",
          engine: "llama.cpp",
          localModelSource: "llama-swap",
          contextWindow: 8192,
          proxyBaseUrl: "http://127.0.0.1:1234",
          checkEndpoint: "http://127.0.0.1:1234/health",
          useModelName: "lfm2.5-1.2b-instruct",
        },
      ]);
    });

    await expect(fetchLocalModels(fetcher)).resolves.toEqual([
      {
        modelId: "lfm2.5-1.2b-instruct",
        loadedAt: "2026-05-16T00:00:00.000Z",
        engine: "llama.cpp",
        localModelSource: "llama-swap",
        contextWindow: 8192,
        proxyBaseUrl: "http://127.0.0.1:1234",
        checkEndpoint: "http://127.0.0.1:1234/health",
        useModelName: "lfm2.5-1.2b-instruct",
      },
    ]);
  });
});

describe("fetchDownstreamOpenAIProviderConfig", () => {
  test("loads the downstream OpenAI-compatible provider contract for consumer apps", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/downstream/openai");

      return jsonResponse({
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
            object: "model",
            owned_by: "role-model",
            endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
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
      });
    });

    await expect(fetchDownstreamOpenAIProviderConfig(fetcher)).resolves.toEqual({
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
          object: "model",
          owned_by: "role-model",
          endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
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
    });
  });
});

describe("fetchRequestDetail", () => {
  test("loads request detail and the linked endpoint profile for the inspector pane", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;

      switch (url) {
        case "/api/role-model/requests/req-001":
          return jsonResponse({
            requestId: "req-001",
            clientRequestId: "req-client-001",
            endpointId: "openai.personal.primary.us-east-1.fast",
            capturePolicy: {
              redactionLevel: "strict",
              retentionClass: "standard",
              structuredInspectionAvailable: true,
            },
            privacyReceipt: {
              samplingRate: 1,
              retentionTtlHours: 720,
              retainUntil: 1_700_100_000_000,
            },
            observationAvailability: {
              source: "raw-observation",
              rawObservationAvailable: true,
            },
            taxonomyDimensions: {
              taxonomy_original_role_hint_id: "engineer",
              taxonomy_group_id: "engineering",
              taxonomy_role_id: "coder",
              taxonomy_task_type: "coder.review",
              taxonomy_capability_ids: ["tool-use", "traceability"],
            },
          });
        case "/api/role-model/endpoints/openai.personal.primary.us-east-1.fast/profile":
          return jsonResponse({
            endpointId: "openai.personal.primary.us-east-1.fast",
            latestProfile: { endpoint_id: "openai.personal.primary.us-east-1.fast" },
            recentSamples: [],
          });
        default:
          throw new Error(`Unexpected request: ${url}`);
      }
    });

    await expect(fetchRequestDetail("req-001", fetcher)).resolves.toEqual({
      request: {
        requestId: "req-001",
        clientRequestId: "req-client-001",
        endpointId: "openai.personal.primary.us-east-1.fast",
        capturePolicy: {
          redactionLevel: "strict",
          retentionClass: "standard",
          structuredInspectionAvailable: true,
        },
        privacyReceipt: {
          samplingRate: 1,
          retentionTtlHours: 720,
          retainUntil: 1_700_100_000_000,
        },
        observationAvailability: {
          source: "raw-observation",
          rawObservationAvailable: true,
        },
        taxonomyDimensions: {
          taxonomy_original_role_hint_id: "engineer",
          taxonomy_group_id: "engineering",
          taxonomy_role_id: "coder",
          taxonomy_task_type: "coder.review",
          taxonomy_capability_ids: ["tool-use", "traceability"],
        },
      },
      endpointProfile: {
        endpointId: "openai.personal.primary.us-east-1.fast",
        latestProfile: { endpoint_id: "openai.personal.primary.us-east-1.fast" },
        recentSamples: [],
      },
    });
  });
});

describe("fetchModelTelemetryRollup", () => {
  test("aggregates richer taxonomy rollups for model detail telemetry", async () => {
    const fetcher = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("POST");
      const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;

      if (payload.breakdown === "taxonomyTaskType") {
        return jsonResponse({
          startAtMs: 1_700_000_000_000,
          endAtMs: 1_700_604_800_000,
          granularity: "day",
          metrics: ["requestCount", "successCount", "averageLatencyMs"],
          breakdown: "taxonomyTaskType",
          buckets: [
            {
              startAtMs: 1_700_000_000_000,
              endAtMs: 1_700_086_400_000,
              totals: {
                requestCount: 3,
                successCount: 2,
                averageLatencyMs: 450,
              },
              series: [
                {
                  key: "coder.review",
                  label: "coder.review",
                  metrics: {
                    requestCount: 2,
                    successCount: 2,
                    averageLatencyMs: 320,
                  },
                },
                {
                  key: "coder.debug",
                  label: "coder.debug",
                  metrics: {
                    requestCount: 1,
                    successCount: 0,
                    averageLatencyMs: 710,
                  },
                },
              ],
            },
            {
              startAtMs: 1_700_086_400_000,
              endAtMs: 1_700_172_800_000,
              totals: {
                requestCount: 2,
                successCount: 1,
                averageLatencyMs: 510,
              },
              series: [
                {
                  key: "coder.review",
                  label: "coder.review",
                  metrics: {
                    requestCount: 1,
                    successCount: 0,
                    averageLatencyMs: 480,
                  },
                },
                {
                  key: "coder.plan",
                  label: "coder.plan",
                  metrics: {
                    requestCount: 1,
                    successCount: 1,
                    averageLatencyMs: 540,
                  },
                },
              ],
            },
          ],
          totals: {
            requestCount: 5,
            successCount: 3,
            averageLatencyMs: 474,
          },
          ranking: null,
          labels: {},
        });
      }

      if ((payload.ranking as { dimension?: string } | null)?.dimension === "taxonomyGroupId") {
        return jsonResponse({
          startAtMs: 1_700_000_000_000,
          endAtMs: 1_700_604_800_000,
          granularity: "day",
          metrics: ["requestCount"],
          breakdown: null,
          buckets: [],
          totals: { requestCount: 5 },
          ranking: {
            dimension: "taxonomyGroupId",
            metric: "requestCount",
            rows: [{ key: "engineering", label: "Engineering", value: 5 }],
          },
          labels: {},
        });
      }

      if ((payload.ranking as { dimension?: string } | null)?.dimension === "taxonomyRoleId") {
        return jsonResponse({
          startAtMs: 1_700_000_000_000,
          endAtMs: 1_700_604_800_000,
          granularity: "day",
          metrics: ["requestCount"],
          breakdown: null,
          buckets: [],
          totals: { requestCount: 5 },
          ranking: {
            dimension: "taxonomyRoleId",
            metric: "requestCount",
            rows: [{ key: "coder", label: "Coder", value: 5 }],
          },
          labels: {},
        });
      }

      if (
        (payload.ranking as { dimension?: string } | null)?.dimension === "taxonomyCapabilityId"
      ) {
        return jsonResponse({
          startAtMs: 1_700_000_000_000,
          endAtMs: 1_700_604_800_000,
          granularity: "day",
          metrics: ["requestCount"],
          breakdown: null,
          buckets: [],
          totals: { requestCount: 5 },
          ranking: {
            dimension: "taxonomyCapabilityId",
            metric: "requestCount",
            rows: [
              { key: "tool-use", label: "Tool use", value: 4 },
              { key: "traceability", label: "Traceability", value: 3 },
            ],
          },
          labels: {},
        });
      }

      throw new Error(`Unexpected telemetry rollup payload: ${JSON.stringify(payload)}`);
    });

    await expect(fetchModelTelemetryRollup("openai/gpt-5.4", fetcher)).resolves.toEqual({
      groups: [{ groupId: "engineering", requestCount: 5 }],
      roles: [{ roleId: "coder", requestCount: 5 }],
      capabilities: [
        { capabilityId: "tool-use", requestCount: 4 },
        { capabilityId: "traceability", requestCount: 3 },
      ],
      tasks: [
        {
          taskType: "coder.review",
          requestCount: 3,
          successRate: 2 / 3,
          avgLatencyMs: 373,
        },
        {
          taskType: "coder.plan",
          requestCount: 1,
          successRate: 1,
          avgLatencyMs: 540,
        },
        {
          taskType: "coder.debug",
          requestCount: 1,
          successRate: 0,
          avgLatencyMs: 710,
        },
      ],
      strengths: ["Strong recent success for coder.plan (1 req, 100% success)."],
      warnings: [
        "Watch coder.debug (1 req, 0% success).",
        "Watch coder.review (3 req, 67% success).",
      ],
      totalRequests: 5,
      windowDays: 7,
    });
  });
});

describe("router APIs", () => {
  test("loads the router summary, config, candidates, and decision ledger from router-specific endpoints", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;

      switch (url) {
        case "/api/role-model/router/summary":
          return jsonResponse({
            strategy: "balanced",
            executionMode: "hybrid",
            controller: {
              endpointId: "cli.local.coder",
              modelId: "gpt-5.4",
              sourceType: "local",
            },
            configuredCandidateCount: 2,
            recentDecisionCount: 3,
            aliasInventory: [
              {
                aliasId: "mixed.local-remote",
                mode: "difficulty",
                configuredHintModelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
                allowEndpointIds: ["cli.local.coder", "moonshot.personal.primary.global.kimi-k2.5"],
                resolvedModelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
                driftWarnings: [],
                localEndpointCount: 1,
                remoteEndpointCount: 1,
                activeEndpointCount: 2,
                healthyEndpointCount: 1,
                readiness: "degraded",
              },
            ],
          });
        case "/api/role-model/router/config":
          return jsonResponse({
            persisted: {
              strategy: "balanced",
              executionMode: "hybrid",
            },
            controller: {
              endpointId: "cli.local.coder",
              modelId: "gpt-5.4",
              sourceType: "local",
            },
            guidance: {
              endpointId: "cli.local.coder",
              preferredEndpointIds: ["cli.local.coder"],
              ignoredEndpointIds: ["moonshot.personal.primary.global.kimi-k2.5"],
            },
            sources: {
              runtimeConfigPath: "D:\\runtime-config.yaml",
              routingModel: "sample",
              policyInputs: "runtime",
            },
            policySources: {
              roles: [
                {
                  role_id: "general.chat",
                  routing_policy_overrides: { compute_preference: "balanced" },
                },
              ],
              tasks: [{ task_type: "general.chat", description: "General chat task" }],
              roleBindings: [
                {
                  binding_id: "binding-001",
                  endpoint_id: "cli.local.coder",
                  role_id: "general.chat",
                },
              ],
            },
          });
        case "/api/role-model/router/candidates":
          return jsonResponse([
            {
              endpointId: "cli.local.coder",
              modelId: "gpt-5.4",
              providerId: "local",
              sourceType: "local",
              endpointKind: "local_process",
              servingSource: "local",
              healthStatus: "healthy",
              controllerEligible: true,
              preferred: true,
              ignored: false,
              roleBindings: ["general.chat"],
              toolCallingSupported: true,
            },
          ]);
        case "/api/role-model/router/decisions":
          return jsonResponse([
            {
              requestId: "req-router-001",
              routingDecisionId: "route-001",
              selectedEndpointId: "cli.local.coder",
              selectedModelId: "gpt-5.4",
              strategyLabel: "balanced",
              decidedAtMs: 1_735_689_600_000,
            },
          ]);
        default:
          throw new Error(`Unexpected request: ${url}`);
      }
    });

    await expect(fetchRouterSummary(fetcher)).resolves.toEqual({
      strategy: "balanced",
      executionMode: "hybrid",
      controller: {
        endpointId: "cli.local.coder",
        modelId: "gpt-5.4",
        sourceType: "local",
      },
      configuredCandidateCount: 2,
      recentDecisionCount: 3,
      aliasInventory: [
        {
          aliasId: "mixed.local-remote",
          mode: "difficulty",
          configuredHintModelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
          allowEndpointIds: ["cli.local.coder", "moonshot.personal.primary.global.kimi-k2.5"],
          resolvedModelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
          driftWarnings: [],
          localEndpointCount: 1,
          remoteEndpointCount: 1,
          activeEndpointCount: 2,
          healthyEndpointCount: 1,
          readiness: "degraded",
        },
      ],
    });
    await expect(fetchRouterConfig(fetcher)).resolves.toEqual({
      persisted: {
        strategy: "balanced",
        executionMode: "hybrid",
      },
      controller: {
        endpointId: "cli.local.coder",
        modelId: "gpt-5.4",
        sourceType: "local",
      },
      guidance: {
        endpointId: "cli.local.coder",
        preferredEndpointIds: ["cli.local.coder"],
        ignoredEndpointIds: ["moonshot.personal.primary.global.kimi-k2.5"],
      },
      sources: {
        runtimeConfigPath: "D:\\runtime-config.yaml",
        routingModel: "sample",
        policyInputs: "runtime",
      },
      policySources: {
        roles: [
          { role_id: "general.chat", routing_policy_overrides: { compute_preference: "balanced" } },
        ],
        tasks: [{ task_type: "general.chat", description: "General chat task" }],
        roleBindings: [
          { binding_id: "binding-001", endpoint_id: "cli.local.coder", role_id: "general.chat" },
        ],
      },
    });
    await expect(fetchRouterCandidates(fetcher)).resolves.toEqual([
      {
        endpointId: "cli.local.coder",
        modelId: "gpt-5.4",
        providerId: "local",
        sourceType: "local",
        endpointKind: "local_process",
        servingSource: "local",
        healthStatus: "healthy",
        controllerEligible: true,
        preferred: true,
        ignored: false,
        roleBindings: ["general.chat"],
        toolCallingSupported: true,
      },
    ]);
    await expect(fetchRouterDecisions(fetcher)).resolves.toEqual([
      {
        requestId: "req-router-001",
        routingDecisionId: "route-001",
        selectedEndpointId: "cli.local.coder",
        selectedModelId: "gpt-5.4",
        strategyLabel: "balanced",
        decidedAtMs: 1_735_689_600_000,
      },
    ]);
  });

  test("loads router decision detail from the router decision endpoint", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/router/decisions/req-router-001");

      return jsonResponse({
        requestId: "req-router-001",
        routingDecisionId: "route-001",
        selectedEndpointId: "cli.local.coder",
        selectedModelId: "gpt-5.4",
        fallbackEndpointIds: ["moonshot.personal.primary.global.kimi-k2.5"],
        strategyLabel: "balanced",
        decision: {
          routing_decision_id: "route-001",
          fallback_endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
        },
        routingDiagnostics: {
          aliasResolution: {
            aliasId: "gpt-5.4",
            resolvedModelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
          },
          routingMode: {
            effectiveMode: "controller",
          },
        },
        requestAlias: "gpt-5.4",
        aliasPoolResolution: {
          aliasId: "gpt-5.4",
          modelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
        },
        request: {
          requestId: "req-router-001",
          endpointId: "cli.local.coder",
        },
        endpointProfile: {
          endpointId: "cli.local.coder",
          latestProfile: { endpoint_id: "cli.local.coder" },
          recentSamples: [],
        },
        observeRequestPath: "/app/observe/requests/req-router-001",
      });
    });

    await expect(fetchRouterDecisionDetail("req-router-001", fetcher)).resolves.toEqual({
      requestId: "req-router-001",
      routingDecisionId: "route-001",
      selectedEndpointId: "cli.local.coder",
      selectedModelId: "gpt-5.4",
      fallbackEndpointIds: ["moonshot.personal.primary.global.kimi-k2.5"],
      strategyLabel: "balanced",
      decision: {
        routing_decision_id: "route-001",
        fallback_endpoint_ids: ["moonshot.personal.primary.global.kimi-k2.5"],
      },
      routingDiagnostics: {
        aliasResolution: {
          aliasId: "gpt-5.4",
          resolvedModelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
        },
        routingMode: {
          effectiveMode: "controller",
        },
      },
      requestAlias: "gpt-5.4",
      aliasPoolResolution: {
        aliasId: "gpt-5.4",
        modelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
      },
      request: {
        requestId: "req-router-001",
        endpointId: "cli.local.coder",
      },
      endpointProfile: {
        endpointId: "cli.local.coder",
        latestProfile: { endpoint_id: "cli.local.coder" },
        recentSamples: [],
      },
      observeRequestPath: "/app/observe/requests/req-router-001",
    });
  });
});

describe("telemetry APIs", () => {
  test("loads the canonical telemetry dashboard reads from the role-model telemetry endpoints", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;

      switch (url) {
        case "/api/role-model/telemetry/summary":
          return jsonResponse({
            requestCount: 3,
            successCount: 2,
            failureCount: 1,
            totalInputTokens: 96,
            totalOutputTokens: 30,
            totalTokens: 126,
            cachedRequestCount: 1,
            totalActualCostUsd: 0.0042,
            totalEstimatedCostUsd: 0.0053,
            totalEffectiveCostUsd: 0.0053,
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
          });
        case "/api/role-model/telemetry/rows":
          return jsonResponse([
            {
              endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
              modelId: "lfm2.5-1.2b-instruct",
              sourceType: "local",
              providerFamily: "llama-swap",
              promptCacheSupported: false,
              requestCount: 1,
            },
            {
              endpointId: "openai.personal.primary.us-east-1.fast",
              modelId: "openai/gpt-4.1-mini-fast",
              sourceType: "remote",
              providerFamily: "ai-sdk-openai",
              promptCacheSupported: true,
              requestCount: 2,
            },
          ]);
        case "/api/role-model/telemetry/requests":
          return jsonResponse([
            {
              requestId: "req-002",
              clientRequestId: "req-client-002",
              endpointId: "openai.personal.primary.us-east-1.fast",
              sourceType: "remote",
              requestClass: "live_request",
              providerFamily: "ai-sdk-openai",
              finishReason: "stop",
              promptCacheSupported: true,
              streamTextDeltaCount: 4,
            },
          ]);
        default:
          throw new Error(`Unexpected request: ${url}`);
      }
    });

    await expect(fetchTelemetryDashboard(fetcher)).resolves.toEqual({
      summary: expect.objectContaining({
        requestCount: 3,
        totalEffectiveCostUsd: 0.0053,
        sourceBreakdown: expect.objectContaining({
          local: expect.objectContaining({ requestCount: 1 }),
          remote: expect.objectContaining({ requestCount: 2 }),
        }),
      }),
      rows: [
        {
          endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
          modelId: "lfm2.5-1.2b-instruct",
          sourceType: "local",
          providerFamily: "llama-swap",
          promptCacheSupported: false,
          requestCount: 1,
        },
        {
          endpointId: "openai.personal.primary.us-east-1.fast",
          modelId: "openai/gpt-4.1-mini-fast",
          sourceType: "remote",
          providerFamily: "ai-sdk-openai",
          promptCacheSupported: true,
          requestCount: 2,
        },
      ],
      requests: [
        {
          requestId: "req-002",
          clientRequestId: "req-client-002",
          endpointId: "openai.personal.primary.us-east-1.fast",
          sourceType: "remote",
          requestClass: "live_request",
          providerFamily: "ai-sdk-openai",
          finishReason: "stop",
          promptCacheSupported: true,
          streamTextDeltaCount: 4,
        },
      ],
    });
  });

  test("loads telemetry request rows with limit parameters", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      expect(url).toContain("/api/role-model/telemetry/requests?limit=25");
      return jsonResponse([
        {
          requestId: "req-001",
          endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
          sourceType: "local",
        },
      ]);
    });

    await expect(fetchTelemetryRequests({ limit: 25 }, fetcher)).resolves.toEqual([
      {
        requestId: "req-001",
        endpointId: "llama-swap.local.lfm2.5-1.2b-instruct",
        sourceType: "local",
      },
    ]);
  });

  test("serializes taxonomy telemetry request filters into the request query string", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      expect(url).toContain("/api/role-model/telemetry/requests?");
      expect(url).toContain("taxonomyGroupIds=engineering");
      expect(url).toContain("taxonomyRoleIds=coder");
      expect(url).toContain("taxonomyTaskTypes=coder.review");
      expect(url).toContain("taxonomyTaskVariants=deep-audit");
      expect(url).toContain("taxonomyCapabilityIds=tool-use%2Ctraceability");
      expect(url).toContain("taxonomyModalityIds=text");
      expect(url).toContain("taxonomyToolClassIds=github");
      return jsonResponse([]);
    });

    await expect(
      fetchTelemetryRequests(
        {
          filters: {
            taxonomyGroupIds: ["engineering"],
            taxonomyRoleIds: ["coder"],
            taxonomyTaskTypes: ["coder.review"],
            taxonomyTaskVariants: ["deep-audit"],
            taxonomyCapabilityIds: ["tool-use", "traceability"],
            taxonomyModalityIds: ["text"],
            taxonomyToolClassIds: ["github"],
          },
        },
        fetcher,
      ),
    ).resolves.toEqual([]);
  });

  test("posts the generic telemetry analytics query payload", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      expect(url).toBe("/api/role-model/telemetry/query");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        "content-type": "application/json",
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        startAtMs: 1_700_000_000_000,
        endAtMs: 1_700_086_400_000,
        granularity: "hour",
        metrics: ["requestCount", "effectiveCostUsd", "routingCostSavingsUsd"],
        breakdown: "sourceType",
        filters: {
          sourceTypes: ["local", "remote"],
        },
        ranking: {
          dimension: "modelId",
          metric: "requestCount",
          limit: 5,
        },
      });

      return jsonResponse({
        startAtMs: 1_700_000_000_000,
        endAtMs: 1_700_086_400_000,
        granularity: "hour",
        metrics: ["requestCount", "effectiveCostUsd", "routingCostSavingsUsd"],
        breakdown: "sourceType",
        buckets: [
          {
            startAtMs: 1_700_000_000_000,
            endAtMs: 1_700_003_600_000,
            totals: {
              requestCount: 2,
              effectiveCostUsd: 0.0053,
              routingCostSavingsUsd: 0.0054,
            },
            series: [
              {
                key: "local",
                label: "Local",
                metrics: {
                  requestCount: 1,
                  effectiveCostUsd: 0.0011,
                  routingCostSavingsUsd: 0,
                },
              },
              {
                key: "remote",
                label: "Remote",
                metrics: {
                  requestCount: 1,
                  effectiveCostUsd: 0.0042,
                  routingCostSavingsUsd: 0.0054,
                },
              },
            ],
          },
        ],
        totals: {
          requestCount: 2,
          effectiveCostUsd: 0.0053,
          routingCostSavingsUsd: 0.0054,
        },
        ranking: {
          dimension: "modelId",
          metric: "requestCount",
          rows: [
            {
              key: "local/mock-llama",
              label: "local/mock-llama",
              value: 1,
            },
            {
              key: "openai/gpt-4.1-mini-fast",
              label: "openai/gpt-4.1-mini-fast",
              value: 1,
            },
          ],
        },
        labels: {
          sourceType: {
            local: "Local",
            remote: "Remote",
          },
        },
      });
    });

    await expect(
      fetchTelemetryAnalytics(
        {
          startAtMs: 1_700_000_000_000,
          endAtMs: 1_700_086_400_000,
          granularity: "hour",
          metrics: ["requestCount", "effectiveCostUsd", "routingCostSavingsUsd"],
          breakdown: "sourceType",
          filters: {
            sourceTypes: ["local", "remote"],
          },
          ranking: {
            dimension: "modelId",
            metric: "requestCount",
            limit: 5,
          },
        },
        fetcher,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        breakdown: "sourceType",
        buckets: expect.arrayContaining([
          expect.objectContaining({
            totals: expect.objectContaining({
              requestCount: 2,
            }),
          }),
        ]),
        labels: expect.objectContaining({
          sourceType: expect.objectContaining({
            local: "Local",
            remote: "Remote",
          }),
        }),
      }),
    );
  });

  test("subscribes to canonical telemetry SSE updates and closes the source on cleanup", () => {
    let listener: (event: MessageEvent<string>) => void = () => {
      throw new Error("telemetry listener was not registered");
    };
    const close = vi.fn();
    const factory = vi.fn(() => ({
      addEventListener(type: string, handler: (event: MessageEvent<string>) => void) {
        expect(type).toBe("telemetry.update");
        listener = handler;
      },
      close,
    }));
    const onEvent = vi.fn();

    const dispose = subscribeTelemetryStream(onEvent, factory);

    listener({
      data: JSON.stringify({
        eventName: "telemetry.update",
        emittedAtMs: 1_770_000_000_100,
        request: {
          requestId: "req-telemetry-001",
          sourceType: "remote",
        },
      }),
    } as MessageEvent<string>);

    expect(factory).toHaveBeenCalledWith("/api/role-model/telemetry/stream");
    expect(onEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: "telemetry.update",
        request: expect.objectContaining({
          requestId: "req-telemetry-001",
          sourceType: "remote",
        }),
      }),
    );

    dispose();
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("observe APIs", () => {
  test("loads vendor activity metrics for the observe activity page", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/metrics");

      return jsonResponse([
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
      ]);
    });

    await expect(fetchActivityMetrics(fetcher)).resolves.toEqual([
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
    ]);
  });

  test("loads a persisted request/response capture by id", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/captures/7");

      return jsonResponse({
        id: 7,
        req_path: "/v1/chat/completions",
        req_headers: {
          authorization: "Bearer role-model-local",
        },
        req_body: "e30=",
        resp_headers: {
          "content-type": "application/json",
        },
        resp_body: "W10=",
      });
    });

    await expect(fetchActivityCapture(7, fetcher)).resolves.toEqual({
      id: 7,
      req_path: "/v1/chat/completions",
      req_headers: {
        authorization: "Bearer role-model-local",
      },
      req_body: "e30=",
      resp_headers: {
        "content-type": "application/json",
      },
      resp_body: "W10=",
    });
  });

  test("returns null when an activity capture is not found", async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ error: "capture not found" }), { status: 404 }),
    );

    await expect(fetchActivityCapture(404, fetcher)).resolves.toBeNull();
  });

  test("loads raw log text for observe log consoles", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/logs");

      return new Response("proxy ready\nupstream warm\n", {
        status: 200,
        headers: {
          "content-type": "text/plain",
        },
      });
    });

    await expect(fetchTextLogs("/logs", fetcher)).resolves.toBe("proxy ready\nupstream warm\n");
  });

  test("loads vendor version info for the runtime system surface", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/version");

      return jsonResponse({
        version: "1.2.3",
        commit: "abc123",
        build_date: "2026-05-07",
      });
    });

    await expect(fetchVersionInfo(fetcher)).resolves.toEqual({
      version: "1.2.3",
      commit: "abc123",
      build_date: "2026-05-07",
    });
  });
});

describe("controller assignment APIs", () => {
  test("loads the current global controller assignment", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/controller");

      return jsonResponse({
        scope: "global",
        endpointId: "cli.local.coder",
        modelId: "gpt-5.4",
        sourceType: "local",
        status: "active",
      });
    });

    await expect(fetchControllerAssignment(fetcher)).resolves.toEqual({
      scope: "global",
      endpointId: "cli.local.coder",
      modelId: "gpt-5.4",
      sourceType: "local",
      status: "active",
    });
  });

  test("loads a null controller assignment when no controller is configured yet", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/controller");

      return jsonResponse(null);
    });

    await expect(fetchControllerAssignment(fetcher)).resolves.toBeNull();
  });

  test("patches the selected controller candidate", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/controller");
      expect(init?.method).toBe("PATCH");
      expect(init?.body).toBe(
        JSON.stringify({
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        }),
      );

      return jsonResponse({
        scope: "global",
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        modelId: "moonshot/kimi-k2.5",
        sourceType: "remote",
        status: "active",
      });
    });

    await expect(
      updateControllerAssignment(
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      scope: "global",
      endpointId: "moonshot.personal.primary.global.kimi-k2.5",
      modelId: "moonshot/kimi-k2.5",
      sourceType: "remote",
      status: "active",
    });
  });
});

describe("submitWorkbenchChat", () => {
  test("posts a chat-completions payload to the runtime workbench path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/chat/completions");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
        }),
      );
      expect(init?.body).toBe(
        JSON.stringify({
          model: "openai/gpt-4.1-mini-fast",
          messages: [{ role: "user", content: "Summarize the routing result." }],
        }),
      );

      return jsonResponse({
        choices: [{ message: { content: "Done." } }],
      });
    });

    await expect(
      submitWorkbenchChat(
        {
          model: "openai/gpt-4.1-mini-fast",
          messages: [{ role: "user", content: "Summarize the routing result." }],
        },
        fetcher,
      ),
    ).resolves.toEqual({
      choices: [{ message: { content: "Done." } }],
    });
  });

  test("sends routing-mode override as a header instead of leaking it into the OpenAI-compatible body", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/chat/completions");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
          "x-role-model-routing-mode": "hybrid",
        }),
      );
      expect(init?.body).toBe(
        JSON.stringify({
          model: "gpt-5.4",
          messages: [{ role: "user", content: "Route this through the hybrid path." }],
        }),
      );

      return jsonResponse({
        choices: [{ message: { content: "Handled." } }],
      });
    });

    const payload: import("./runtime-api").WorkbenchChatInput & { routingModeOverride: "hybrid" } =
      {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Route this through the hybrid path." }],
        routingModeOverride: "hybrid",
      };

    await expect(submitWorkbenchChat(payload, fetcher)).resolves.toEqual({
      choices: [{ message: { content: "Handled." } }],
    });
  });

  test("sends endpoint override as a header instead of leaking it into the OpenAI-compatible body", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/chat/completions");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
          "x-role-model-endpoint-id": "moonshot.personal.primary.global.kimi-k2.5",
        }),
      );
      expect(init?.body).toBe(
        JSON.stringify({
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Use the saved OAuth endpoint." }],
        }),
      );

      return jsonResponse({
        choices: [{ message: { content: "Handled." } }],
      });
    });

    const payload: import("./runtime-api").WorkbenchChatInput & { endpointId: string } = {
      model: "moonshot/kimi-k2.5",
      messages: [{ role: "user", content: "Use the saved OAuth endpoint." }],
      endpointId: "moonshot.personal.primary.global.kimi-k2.5",
    };

    await expect(submitWorkbenchChat(payload, fetcher)).resolves.toEqual({
      choices: [{ message: { content: "Handled." } }],
    });
  });
});

describe("studio vendor API helpers", () => {
  test("posts an OpenAI image-generation request", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/images/generations");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          model: "gpt-image-1",
          prompt: "Swiss design poster",
          n: 1,
          size: "1024x1024",
        }),
      );
      return jsonResponse({
        created: 123,
        data: [{ b64_json: "aW1hZ2U=" }],
      });
    });

    await expect(
      submitImageGeneration(
        {
          model: "gpt-image-1",
          prompt: "Swiss design poster",
          n: 1,
          size: "1024x1024",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      created: 123,
      data: [{ b64_json: "aW1hZ2U=" }],
    });
  });

  test("posts an SDAPI txt2img request", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/sdapi/v1/txt2img");
      expect(init?.method).toBe("POST");
      return jsonResponse({
        images: ["c2Q="],
        parameters: { prompt: "Poster" },
        info: "ok",
      });
    });

    await expect(
      submitSdApiTxt2Img({ prompt: "Poster", width: 512, height: 512 }, fetcher),
    ).resolves.toEqual({
      images: ["c2Q="],
      parameters: { prompt: "Poster" },
      info: "ok",
    });
  });

  test("loads available speech voices for a selected model", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? `${input.pathname}${input.search}`
            : input.url;
      expect(url).toBe("/v1/audio/voices?model=moonshot%2Fkimi-audio");
      return jsonResponse([{ id: "alloy", name: "Alloy" }]);
    });

    await expect(fetchAudioVoices("moonshot/kimi-audio", fetcher)).resolves.toEqual([
      { id: "alloy", name: "Alloy" },
    ]);
  });

  test("reports a clear error when the voice inventory endpoint returns HTML instead of JSON", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response("<!DOCTYPE html><html><body>fallback</body></html>", {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
          },
        }),
    );

    await expect(fetchAudioVoices("moonshot/kimi-audio", fetcher)).rejects.toThrow(
      "Request to /v1/audio/voices?model=moonshot%2Fkimi-audio returned HTML instead of JSON.",
    );
  });

  test("posts a speech-generation request and returns audio bytes as a blob", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/audio/speech");
      expect(init?.method).toBe("POST");
      return new Response("audio-data", {
        status: 200,
        headers: {
          "content-type": "audio/mpeg",
        },
      });
    });

    const blob = await submitSpeechGeneration(
      {
        model: "moonshot/kimi-audio",
        input: "Read this out loud.",
        voice: "alloy",
      },
      fetcher,
    );
    await expect(blob.text()).resolves.toBe("audio-data");
  });

  test("posts a multipart transcription request", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/audio/transcriptions");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      return jsonResponse({ text: "Decoded transcript" });
    });

    const file = new File(["audio-bytes"], "clip.wav", { type: "audio/wav" });
    await expect(
      submitAudioTranscription(
        {
          file,
          model: "moonshot/kimi-audio",
        },
        fetcher,
      ),
    ).resolves.toEqual({ text: "Decoded transcript" });
  });

  test("posts a rerank request to the selected vendor path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/reranking");
      expect(init?.method).toBe("POST");
      return jsonResponse({
        results: [{ index: 1, relevance_score: 0.91 }],
        usage: { total_tokens: 32 },
      });
    });

    await expect(
      submitRerankRequest(
        {
          model: "cohere/rerank-v3.5",
          query: "routing policy",
          documents: ["overview", "routing policy", "glossary"],
        },
        "/v1/reranking",
        fetcher,
      ),
    ).resolves.toEqual({
      results: [{ index: 1, relevance_score: 0.91 }],
      usage: { total_tokens: 32 },
    });
  });

  test("posts a raw advanced API request to the selected endpoint family", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/v1/responses");
      expect(init?.method).toBe("POST");
      return jsonResponse({
        id: "resp_123",
        output: [{ type: "message" }],
      });
    });

    await expect(
      submitAdvancedRequest(
        "/v1/responses",
        {
          model: "openai/gpt-4.1-mini-fast",
          input: "Summarize the endpoint registry.",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      id: "resp_123",
      output: [{ type: "message" }],
    });
  });
});

describe("startRuntimeDeviceAuthorization", () => {
  test("posts the selected provider account payload to the runtime device-auth start path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/accounts/device/start");
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
        }),
      );
      expect(init?.body).toBe(
        JSON.stringify({
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshot",
          variantId: "kimi-code",
          allowedModels: ["moonshot/kimi-k2.5"],
        }),
      );

      return jsonResponse({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
        userCode: "ABCD-EFGH",
      });
    });

    await expect(
      startRuntimeDeviceAuthorization(
        {
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshot",
          variantId: "kimi-code",
          allowedModels: ["moonshot/kimi-k2.5"],
        },
        fetcher,
      ),
    ).resolves.toEqual({
      authRequestId: "auth-001",
      providerAccountId: "moonshot.personal.kimi-code",
      status: "pending",
      userCode: "ABCD-EFGH",
    });
  });
});

describe("reconnectRuntimeAccount", () => {
  test("posts the saved account id to the explicit reconnect repair path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/accounts/repair/reconnect");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          providerAccountId: "moonshot.personal.kimi-code",
        }),
      );

      return jsonResponse({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
      });
    });

    await expect(
      reconnectRuntimeAccount(
        {
          providerAccountId: "moonshot.personal.kimi-code",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      authRequestId: "auth-001",
      providerAccountId: "moonshot.personal.kimi-code",
      status: "pending",
    });
  });
});

describe("removeRuntimeAccountModel", () => {
  test("deletes the configured model from the runtime account pool", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe(
        "/api/role-model/accounts/moonshot.personal.primary/models/moonshot%2Fkimi-k2.5",
      );
      expect(init?.method).toBe("DELETE");

      return jsonResponse({
        success: true,
        removedAccount: false,
      });
    });

    await expect(
      removeRuntimeAccountModel("moonshot.personal.primary", "moonshot/kimi-k2.5", fetcher),
    ).resolves.toEqual({
      success: true,
      removedAccount: false,
    });
  });
});

describe("pollRuntimeDeviceAuthorization", () => {
  test("posts the auth request id to the runtime device-auth poll path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/accounts/device/poll");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(JSON.stringify({ authRequestId: "auth-001" }));

      return jsonResponse({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "connected",
      });
    });

    await expect(pollRuntimeDeviceAuthorization("auth-001", fetcher)).resolves.toEqual({
      authRequestId: "auth-001",
      providerAccountId: "moonshot.personal.kimi-code",
      status: "connected",
    });
  });
});

describe("updateRuntimeAccountApiKey", () => {
  test("posts the saved account id and replacement key to the explicit repair path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/accounts/repair/update-key");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          providerAccountId: "moonshot.personal.primary",
          apiKey: "sk-inline-updated-key",
        }),
      );

      return jsonResponse({
        providerAccountId: "moonshot.personal.primary",
        credentialRef: {
          backend: "local-file",
          ref: "api-key/moonshot/moonshot.personal.primary",
        },
      });
    });

    await expect(
      updateRuntimeAccountApiKey(
        {
          providerAccountId: "moonshot.personal.primary",
          apiKey: "sk-inline-updated-key",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      providerAccountId: "moonshot.personal.primary",
      credentialRef: {
        backend: "local-file",
        ref: "api-key/moonshot/moonshot.personal.primary",
      },
    });
  });
});

describe("openRuntimeExternalUrl", () => {
  test("posts the verification URL to the runtime system browser helper", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/system/open-url");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          url: "https://auth.openai.com/device",
        }),
      );

      return jsonResponse({
        opened: true,
        url: "https://auth.openai.com/device",
      });
    });

    await expect(
      openRuntimeExternalUrl("https://auth.openai.com/device", fetcher),
    ).resolves.toEqual({
      opened: true,
      url: "https://auth.openai.com/device",
    });
  });
});

describe("activateRuntimeEndpoint", () => {
  test("posts endpoint activation payload to the runtime endpoints mutation path", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/endpoints");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBe(
        JSON.stringify({
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          region: "global",
        }),
      );

      return jsonResponse({
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        status: "active",
      });
    });

    await expect(
      activateRuntimeEndpoint(
        {
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          region: "global",
        },
        fetcher,
      ),
    ).resolves.toEqual({
      endpointId: "moonshot.personal.primary.global.kimi-k2.5",
      providerAccountId: "moonshot.personal.primary",
      modelId: "moonshot/kimi-k2.5",
      status: "active",
    });
  });
});

describe("fetchRuntimeConfig", () => {
  test("loads the normalized unified runtime config from the runtime control plane", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/runtime/config");

      return jsonResponse({
        applied: true,
        path: "D:\\runtime-config.yaml",
        config: {
          version: "1.0",
          executionMode: "hybrid",
          modelAliases: [
            {
              aliasId: "gpt-5.4",
              modelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
              mode: "hybrid",
            },
          ],
          llamaSwap: {
            enabled: true,
            models: [
              {
                modelId: "lfm2.5-1.2b-instruct",
                path: "./models/lfm2.5-1.2b-instruct.gguf",
              },
            ],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
          liteLLM: {
            enabled: true,
            providers: [
              { providerId: "moonshot", modelMappings: [{ modelId: "moonshot/kimi-k2.5" }] },
            ],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
        },
      });
    });

    await expect(fetchRuntimeConfig(fetcher)).resolves.toEqual({
      applied: true,
      path: "D:\\runtime-config.yaml",
      config: {
        version: "1.0",
        executionMode: "hybrid",
        modelAliases: [
          {
            aliasId: "gpt-5.4",
            modelIds: ["gpt-5.4", "moonshot/kimi-k2.5"],
            mode: "hybrid",
          },
        ],
        llamaSwap: {
          enabled: true,
          models: [
            {
              modelId: "lfm2.5-1.2b-instruct",
              path: "./models/lfm2.5-1.2b-instruct.gguf",
            },
          ],
          process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
        },
        liteLLM: {
          enabled: true,
          providers: [
            { providerId: "moonshot", modelMappings: [{ modelId: "moonshot/kimi-k2.5" }] },
          ],
          process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
        },
      },
    });
  });
});

describe("updateRuntimeConfig", () => {
  test("puts the normalized unified runtime config to the runtime control plane", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/runtime/config");
      expect(init?.method).toBe("PUT");
      expect(init?.headers).toEqual(
        expect.objectContaining({
          "content-type": "application/json",
        }),
      );
      expect(init?.body).toBe(
        JSON.stringify({
          version: "1.0",
          routingStrategy: "balanced",
          llamaSwap: {
            models: [
              {
                modelId: "lfm2.5-1.2b-instruct",
                path: "./models/lfm2.5-1.2b-instruct-v2.gguf",
              },
            ],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
          liteLLM: {
            providers: [
              { providerId: "moonshot", modelMappings: [{ modelId: "moonshot/kimi-k2.5" }] },
            ],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
        }),
      );

      return jsonResponse({
        applied: true,
        path: "D:\\runtime-config.yaml",
        config: {
          version: "1.0",
          executionMode: "hybrid",
        },
      });
    });

    await expect(
      updateRuntimeConfig(
        {
          version: "1.0",
          routingStrategy: "balanced",
          llamaSwap: {
            models: [
              {
                modelId: "lfm2.5-1.2b-instruct",
                path: "./models/lfm2.5-1.2b-instruct-v2.gguf",
              },
            ],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
          liteLLM: {
            providers: [
              { providerId: "moonshot", modelMappings: [{ modelId: "moonshot/kimi-k2.5" }] },
            ],
            process: { command: null, args: [], env: {}, cwd: null, startupTimeoutMs: null },
          },
        },
        fetcher,
      ),
    ).resolves.toEqual({
      applied: true,
      path: "D:\\runtime-config.yaml",
      config: {
        version: "1.0",
        executionMode: "hybrid",
      },
    });
  });
});

describe("role policy APIs", () => {
  test("loads the full runtime-managed role policy from the control plane", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      expect(url).toBe("/api/role-model/role-policy");
      return jsonResponse({
        roleDefinitions: [
          {
            role_id: "qa.reviewer",
            name: "QA Reviewer",
            description: "Validates runtime behavior before release.",
            role_kind: "assistant",
            default_system_instructions: "Review carefully.",
            task_types_supported: ["code.review"],
            required_capabilities: [],
            preferred_capabilities: ["reasoning.multi_step"],
            forbidden_capabilities: [],
            tool_policy: { mode: "limited", allowed_tools: ["run_tests"] },
            routing_policy_overrides: { compute_preference: "balanced" },
            output_contracts: ["review.checklist"],
            safety_policy_refs: ["safety.review"],
          },
        ],
        taskDefinitions: [
          {
            task_type: "code.review",
            description: "Code review task",
            required_inputs: [],
            required_capabilities: ["code.edit"],
            preferred_capabilities: ["reasoning.multi_step"],
            quality_metrics: [],
            allowed_roles: ["qa.reviewer"],
            default_benchmark_suites: [],
          },
        ],
      });
    });

    await expect(fetchRolePolicy(fetcher)).resolves.toEqual({
      roleDefinitions: [
        expect.objectContaining({
          role_id: "qa.reviewer",
          tool_policy: { mode: "limited", allowed_tools: ["run_tests"] },
        }),
      ],
      taskDefinitions: [
        expect.objectContaining({
          task_type: "code.review",
          allowed_roles: ["qa.reviewer"],
        }),
      ],
    });
  });

  test("posts role creation, puts role updates, and puts task allowlists to the control plane", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/role-model/roles" && init?.method === "POST") {
        expect(init?.body).toBe(
          JSON.stringify({
            role_id: "qa.reviewer",
            name: "QA Reviewer",
          }),
        );
        return jsonResponse({ role_id: "qa.reviewer", name: "QA Reviewer" });
      }
      if (url === "/api/role-model/roles/qa.reviewer" && init?.method === "PUT") {
        expect(init?.body).toBe(JSON.stringify({ name: "QA Reviewer Updated" }));
        return jsonResponse({ role_id: "qa.reviewer", name: "QA Reviewer Updated" });
      }
      if (url === "/api/role-model/tasks" && init?.method === "PUT") {
        expect(init?.body).toBe(
          JSON.stringify([
            {
              task_type: "code.review",
              description: "Code review task",
              required_inputs: [],
              required_capabilities: ["code.edit"],
              preferred_capabilities: [],
              quality_metrics: [],
              allowed_roles: ["qa.reviewer"],
              default_benchmark_suites: [],
            },
          ]),
        );
        return jsonResponse([
          {
            task_type: "code.review",
            description: "Code review task",
            required_inputs: [],
            required_capabilities: ["code.edit"],
            preferred_capabilities: [],
            quality_metrics: [],
            allowed_roles: ["qa.reviewer"],
            default_benchmark_suites: [],
          },
        ]);
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    await expect(
      createRolePolicyRole(
        {
          role_id: "qa.reviewer",
          name: "QA Reviewer",
        },
        fetcher,
      ),
    ).resolves.toEqual({ role_id: "qa.reviewer", name: "QA Reviewer" });

    await expect(
      updateRolePolicyRole(
        "qa.reviewer",
        {
          name: "QA Reviewer Updated",
        },
        fetcher,
      ),
    ).resolves.toEqual({ role_id: "qa.reviewer", name: "QA Reviewer Updated" });

    await expect(
      updateTaskDefinitions(
        [
          {
            task_type: "code.review",
            description: "Code review task",
            required_inputs: [],
            required_capabilities: ["code.edit"],
            preferred_capabilities: [],
            quality_metrics: [],
            allowed_roles: ["qa.reviewer"],
            default_benchmark_suites: [],
          },
        ],
        fetcher,
      ),
    ).resolves.toEqual([
      {
        task_type: "code.review",
        description: "Code review task",
        required_inputs: [],
        required_capabilities: ["code.edit"],
        preferred_capabilities: [],
        quality_metrics: [],
        allowed_roles: ["qa.reviewer"],
        default_benchmark_suites: [],
      },
    ]);
  });
});

describe("benchmark display endpoints", () => {
  test("fetchBenchmarkSummariesByMode loads full and quick summaries", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/role-model/benchmark/summaries/by-mode") {
        return jsonResponse({
          full: { runId: "run-full", completedAtMs: 20, mode: "full", subjects: [] },
          quick: { runId: "run-quick", completedAtMs: 10, mode: "quick", subjects: [] },
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    await expect(fetchBenchmarkSummariesByMode(fetcher)).resolves.toEqual({
      full: { runId: "run-full", completedAtMs: 20, mode: "full", subjects: [] },
      quick: { runId: "run-quick", completedAtMs: 10, mode: "quick", subjects: [] },
    });
  });

  test("fetchBenchmarkRuns loads completed run history", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/role-model/benchmark/runs") {
        return jsonResponse([
          {
            runId: "run-quick",
            mode: "quick",
            completedAtMs: 10,
            suiteId: "routing-capability-v2",
            caseCount: 12,
            endpointIds: ["local.a", "remote.b"],
          },
        ]);
      }
      throw new Error(`unexpected url ${url}`);
    });

    await expect(fetchBenchmarkRuns(fetcher)).resolves.toEqual([
      {
        runId: "run-quick",
        mode: "quick",
        completedAtMs: 10,
        suiteId: "routing-capability-v2",
        caseCount: 12,
        endpointIds: ["local.a", "remote.b"],
      },
    ]);
  });

  test("clearAllBenchmarkData deletes global benchmark state", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      if (url === "/api/role-model/benchmark/data" && init?.method === "DELETE") {
        return jsonResponse({
          clearedSampleCount: 4,
          affectedEndpointCount: 2,
          clearedRunCount: 3,
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    await expect(clearAllBenchmarkData(fetcher)).resolves.toEqual({
      clearedSampleCount: 4,
      affectedEndpointCount: 2,
      clearedRunCount: 3,
    });
  });
});
describe("role assignment helpers", () => {
  test("represent default all roles separately from explicit none", () => {
    expect(roleIdsToExplicitAssignment([], true)).toEqual({
      roleAssignmentMode: "all",
      enabledRoleIds: [],
      disabledRoleIds: [],
    });
    expect(roleIdsToExplicitAssignment([], false)).toEqual({
      roleAssignmentMode: "include",
      enabledRoleIds: [],
      disabledRoleIds: [],
    });
    expect(
      explicitAssignmentToRoleIds({
        roleAssignmentMode: "include",
        enabledRoleIds: ["coder"],
        disabledRoleIds: [],
      }),
    ).toEqual(["coder"]);
  });

  test("posts default-all assignment metadata for peer and llama-swap model registration", async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      requests.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
      return jsonResponse({ success: true });
    });

    await loadPeerModel("local-peer-model", [], fetcher);
    await loadLlamaSwapModel("local-llama-model", [], fetcher);

    expect(requests).toEqual([
      {
        url: "/api/role-model/local/peer/models/local-peer-model/load",
        body: {
          roleIds: [],
          roleAssignmentMode: "all",
          enabledRoleIds: [],
          disabledRoleIds: [],
        },
      },
      {
        url: "/api/role-model/local/llama-swap/models/local-llama-model/load",
        body: {
          roleIds: [],
          roleAssignmentMode: "all",
          enabledRoleIds: [],
          disabledRoleIds: [],
        },
      },
    ]);
  });

  test("puts explicit empty include assignment metadata when saving no-role local bindings", async () => {
    const requests: Array<{ url: string; body: unknown }> = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
      requests.push({ url, body: JSON.parse(String(init?.body ?? "{}")) });
      return jsonResponse({ success: true });
    });

    await setPeerModelRoles("local-peer-model", [], fetcher);
    await setLlamaSwapModelRoles("local-llama-model", [], fetcher);

    expect(requests).toEqual([
      {
        url: "/api/role-model/local/peer/models/local-peer-model/roles",
        body: {
          roleIds: [],
          roleAssignmentMode: "include",
          enabledRoleIds: [],
          disabledRoleIds: [],
        },
      },
      {
        url: "/api/role-model/local/llama-swap/models/local-llama-model/roles",
        body: {
          roleIds: [],
          roleAssignmentMode: "include",
          enabledRoleIds: [],
          disabledRoleIds: [],
        },
      },
    ]);
  });
});
