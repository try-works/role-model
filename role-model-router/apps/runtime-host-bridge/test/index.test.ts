import { describe, expect, test } from "vitest";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import * as bridge from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

const registry: EndpointRegistryResult = {
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
      },
      declared: {
        endpoint_id: "openai.personal.primary.us-east-1.fast",
        capabilities: ["text.chat", "tools.function_calling"],
        modalities: ["text"],
        max_context_tokens: 128000,
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
        endpoint_id: "openai.personal.secondary.us-west-2.fast",
        endpoint_kind: "remote_api",
        provider_kind: "remote_openai_compat",
        serving_source: "remote-service",
        model_id: "openai/gpt-4.1-mini-fast",
        runtime_version: "run07-registry-v1",
        region: "us-west-2",
      },
      declared: {
        endpoint_id: "openai.personal.secondary.us-west-2.fast",
        capabilities: ["text.chat"],
        modalities: ["text"],
        max_context_tokens: 128000,
        tool_calling: {
          supported: false,
          style: "none",
        },
        supports_embeddings: false,
        platform_constraints: [],
      },
      status: "degraded",
    },
    {
      identity: {
        endpoint_id: "anthropic.team.shared.us-east-1.default",
        endpoint_kind: "remote_api",
        provider_kind: "remote_openai_compat",
        serving_source: "remote-service",
        model_id: "claude-3.7-sonnet",
        runtime_version: "run07-registry-v1",
        region: "us-east-1",
      },
      declared: {
        endpoint_id: "anthropic.team.shared.us-east-1.default",
        capabilities: ["text.chat", "tools.function_calling"],
        modalities: ["text"],
        max_context_tokens: 200000,
        tool_calling: {
          supported: true,
          style: "json",
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
    degraded: 1,
    offline: 0,
  },
};

describe("runtime-host-bridge", () => {
  test("creates a stable model-list response grouped by model id", () => {
    expect(typeof (bridge as { createModelListResponse?: unknown }).createModelListResponse).toBe(
      "function",
    );

    const result = (
      bridge as {
        createModelListResponse: (value: EndpointRegistryResult) => unknown;
      }
    ).createModelListResponse(registry);

    expect(result).toEqual({
      object: "list",
      data: [
        {
          id: "claude-3.7-sonnet",
          object: "model",
          owned_by: "role-model",
          endpoint_ids: ["anthropic.team.shared.us-east-1.default"],
        },
        {
          id: "openai/gpt-4.1-mini-fast",
          object: "model",
          owned_by: "role-model",
          endpoint_ids: [
            "openai.personal.primary.us-east-1.fast",
            "openai.personal.secondary.us-west-2.fast",
          ],
        },
      ],
    });
  });

  test("maps a chat-completions request into role-model routing and execution inputs", () => {
    expect(
      typeof (bridge as { mapChatCompletionsRequest?: unknown }).mapChatCompletionsRequest,
    ).toBe("function");

    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            requestId: string;
            taskType: string;
            allowEndpoints: readonly string[];
            needsTools: boolean;
            strategy: string;
            requiredCapabilities: readonly string[];
            requiredModalities: readonly string[];
          };
          executionRequest: {
            messages: readonly { role: string; content: string }[];
            stream?: boolean;
            tools?: readonly { name: string }[];
            maxOutputTokens?: number;
            temperature?: number;
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "openai/gpt-4.1-mini-fast",
        messages: [
          { role: "system", content: "Be concise." },
          { role: "user", content: "Summarize the routing result." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "lookupRegistry",
              description: "Look up endpoint details.",
              parameters: {
                type: "object",
                properties: {
                  endpointId: {
                    type: "string",
                  },
                },
                required: ["endpointId"],
              },
            },
          },
        ],
        stream: true,
        max_tokens: 256,
        temperature: 0.2,
      },
      "req-host-001",
    );

    expect(result).toEqual({
      routingRequest: {
        requestId: "req-host-001",
        taskType: "text.chat",
        requiredCapabilities: ["text.chat"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 15,
        needsTools: true,
        strategy: "balanced",
        preferLocal: false,
        allowEndpoints: [
          "openai.personal.primary.us-east-1.fast",
          "openai.personal.secondary.us-west-2.fast",
        ],
      },
      executionRequest: {
        messages: [
          { role: "system", content: "Be concise." },
          { role: "user", content: "Summarize the routing result." },
        ],
        tools: [
          {
            name: "lookupRegistry",
            description: "Look up endpoint details.",
            inputSchema: {
              type: "object",
              properties: {
                endpointId: {
                  type: "string",
                },
              },
              required: ["endpointId"],
            },
          },
        ],
        stream: true,
        maxOutputTokens: 256,
        temperature: 0.2,
      },
    });
  });

  test("serves health and model-list endpoints", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    const server = await (
       bridge as {
         startBridgeServer: (options: {
           host: string;
           port: number;
           registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<unknown>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
    });

    try {
      const healthResponse = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(healthResponse.status).toBe(200);
      expect(await healthResponse.json()).toEqual({
        status: "healthy",
        executionMode: "decision_only",
        vendors: {},
        inactiveVendors: [],
      });

      const modelsResponse = await fetch(`http://127.0.0.1:${server.port}/v1/models`);
      expect(modelsResponse.status).toBe(200);
      expect(await modelsResponse.json()).toEqual({
        object: "list",
        data: [
          {
            id: "claude-3.7-sonnet",
            object: "model",
            owned_by: "role-model",
            endpoint_ids: ["anthropic.team.shared.us-east-1.default"],
          },
          {
            id: "openai/gpt-4.1-mini-fast",
            object: "model",
            owned_by: "role-model",
            endpoint_ids: [
              "openai.personal.primary.us-east-1.fast",
              "openai.personal.secondary.us-west-2.fast",
            ],
          },
        ],
      });
    } finally {
      await server.close();
    }
  });

  test("serves preserved host observability and vendor-facing utility endpoints", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    const server = await (
      bridge as {
        startBridgeServer: (options: Record<string, unknown> & {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<unknown>;
          readVersionInfo: () => Promise<unknown>;
          listActivityMetrics: () => Promise<unknown>;
          readActivityCapture: (captureId: number) => Promise<unknown>;
          readLogs: () => Promise<string>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      readVersionInfo: async () => ({
        version: "0.0.0-test",
        commit: "abc123",
        build_date: "2026-05-07",
      }),
      listActivityMetrics: async () => [
        {
          id: 7,
          timestamp: "2026-05-07T05:00:00.000Z",
          model: "openai/gpt-4.1-mini-fast",
          req_path: "/v1/chat/completions",
          resp_content_type: "application/json",
          resp_status_code: 200,
          tokens: {
            cache_tokens: 0,
            input_tokens: 44,
            output_tokens: 19,
            prompt_per_second: 88.1,
            tokens_per_second: 45.2,
          },
          duration_ms: 840,
          has_capture: true,
        },
      ],
      readActivityCapture: async (captureId: number) =>
        captureId === 7
          ? {
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
            }
          : null,
      readLogs: async () => "role-model bridge ready\nrecent request complete\n",
    });

    try {
      const versionResponse = await fetch(`http://127.0.0.1:${server.port}/api/version`);
      expect(versionResponse.status).toBe(200);
      expect(await versionResponse.json()).toEqual({
        version: "0.0.0-test",
        commit: "abc123",
        build_date: "2026-05-07",
      });

      const metricsResponse = await fetch(`http://127.0.0.1:${server.port}/api/metrics`);
      expect(metricsResponse.status).toBe(200);
      expect(await metricsResponse.json()).toEqual([
        expect.objectContaining({
          id: 7,
          model: "openai/gpt-4.1-mini-fast",
          has_capture: true,
        }),
      ]);

      const captureResponse = await fetch(`http://127.0.0.1:${server.port}/api/captures/7`);
      expect(captureResponse.status).toBe(200);
      expect(await captureResponse.json()).toEqual({
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

      const logsResponse = await fetch(`http://127.0.0.1:${server.port}/logs`);
      expect(logsResponse.status).toBe(200);
      expect(await logsResponse.text()).toContain("role-model bridge");

      const healthResponse = await fetch(`http://127.0.0.1:${server.port}/health`);
      expect(healthResponse.status).toBe(200);
      expect(await healthResponse.text()).toBe("OK");

      const uiResponse = await fetch(`http://127.0.0.1:${server.port}/ui`);
      expect(uiResponse.status).toBe(200);
      expect(await uiResponse.text()).toContain("/logs");
    } finally {
      await server.close();
    }
  });

  test("serves runtime control-plane summary, provider, account, and endpoint routes", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<unknown>;
           readRuntimeSummary: () => Promise<unknown>;
           listProviders: () => Promise<unknown>;
           listRoles: () => Promise<unknown>;
           listAccounts: () => Promise<unknown>;
           upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
           startProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<unknown>;
           pollProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<unknown>;
           readRuntimeConfig: () => Promise<unknown>;
           updateRuntimeConfig: (body: Record<string, unknown>) => Promise<unknown>;
           activateEndpoint: (body: Record<string, unknown>) => Promise<unknown>;
           readControllerAssignment: () => Promise<unknown>;
           updateControllerAssignment: (body: Record<string, unknown>) => Promise<unknown>;
           listEndpoints: () => Promise<unknown>;
           }) => Promise<{ port: number; close(): Promise<void> }>;
        }
      ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      readRuntimeSummary: async () => ({
        lifecycleSummary: registry.lifecycleSummary,
        providerCount: 1,
        accountCount: 2,
      }),
      listProviders: async () => [
        {
          providerId: "moonshot",
          displayName: "Moonshot AI",
          supportedAuthModes: ["api-key-static", "oauth2-device-code"],
        },
      ],
      listRoles: async () => [
        {
          roleId: "general.chat",
          label: "General chat",
        },
      ],
      listAccounts: async () => [
        {
          providerAccountId: "moonshot.personal.primary",
          providerId: "moonshot",
          authMode: "api-key-static",
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.5",
              roleIds: ["general.chat"],
            },
          ],
        },
      ],
       upsertProviderAccount: async (body) => ({
         saved: true,
         providerAccountId: body.providerAccountId,
       }),
       startProviderDeviceAuthorization: async () => ({
         authRequestId: "auth-001",
         providerAccountId: "moonshot.personal.kimi-code",
         status: "pending",
         userCode: "ABCD-EFGH",
       }),
       pollProviderDeviceAuthorization: async () => ({
         authRequestId: "auth-001",
         providerAccountId: "moonshot.personal.kimi-code",
         status: "connected",
       }),
       readRuntimeConfig: async () => ({
         applied: true,
         path: "D:\\runtime-config.yaml",
         config: {
           version: "1.0",
           executionMode: "hybrid",
         },
       }),
       updateRuntimeConfig: async (body) => ({
         applied: true,
         path: "D:\\runtime-config.yaml",
         config: {
           version: body.version,
           executionMode: "hybrid",
         },
       }),
        activateEndpoint: async () => ({
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
           providerAccountId: "moonshot.personal.primary",
           modelId: "moonshot/kimi-k2.5",
           status: "active",
        }),
        readControllerAssignment: async () => ({
          scope: "global",
          endpointId: "cli.local.coder",
          modelId: "gpt-5.4",
          sourceType: "local",
        }),
        updateControllerAssignment: async (body) => ({
          scope: "global",
          endpointId: body.endpointId,
          modelId: "moonshot/kimi-k2.5",
          sourceType: "remote",
        }),
        listEndpoints: async () => [
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            providerId: "moonshot",
            modelId: "moonshot/kimi-k2.5",
        },
      ],
    });

    try {
      const summaryResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/runtime/summary`);
      expect(summaryResponse.status).toBe(200);
      expect(await summaryResponse.json()).toEqual({
        lifecycleSummary: registry.lifecycleSummary,
        providerCount: 1,
        accountCount: 2,
      });

      const providersResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/providers`);
      expect(providersResponse.status).toBe(200);
      expect(await providersResponse.json()).toEqual([
        {
          providerId: "moonshot",
          displayName: "Moonshot AI",
          supportedAuthModes: ["api-key-static", "oauth2-device-code"],
        },
      ]);

       const accountsResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/accounts`);
       expect(accountsResponse.status).toBe(200);
       expect(await accountsResponse.json()).toEqual([
         {
           providerAccountId: "moonshot.personal.primary",
           providerId: "moonshot",
           authMode: "api-key-static",
           modelRoleBindings: [
             {
               modelId: "moonshot/kimi-k2.5",
               roleIds: ["general.chat"],
             },
           ],
         },
       ]);

       const rolesResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/roles`);
       expect(rolesResponse.status).toBe(200);
       expect(await rolesResponse.json()).toEqual([
         {
           roleId: "general.chat",
           label: "General chat",
         },
       ]);

      const upsertResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/accounts`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          providerAccountId: "moonshot.personal.primary",
        }),
      });
      expect(upsertResponse.status).toBe(200);
       expect(await upsertResponse.json()).toEqual({
         saved: true,
         providerAccountId: "moonshot.personal.primary",
       });

       const deviceStartResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/accounts/device/start`, {
         method: "POST",
         headers: {
           "content-type": "application/json",
         },
         body: JSON.stringify({
           providerAccountId: "moonshot.personal.kimi-code",
         }),
       });
       expect(deviceStartResponse.status).toBe(200);
       expect(await deviceStartResponse.json()).toEqual({
         authRequestId: "auth-001",
         providerAccountId: "moonshot.personal.kimi-code",
         status: "pending",
         userCode: "ABCD-EFGH",
       });

       const devicePollResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/accounts/device/poll`, {
         method: "POST",
         headers: {
           "content-type": "application/json",
         },
         body: JSON.stringify({
           authRequestId: "auth-001",
         }),
       });
       expect(devicePollResponse.status).toBe(200);
        expect(await devicePollResponse.json()).toEqual({
          authRequestId: "auth-001",
          providerAccountId: "moonshot.personal.kimi-code",
          status: "connected",
        });

        const runtimeConfigResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/runtime/config`);
        expect(runtimeConfigResponse.status).toBe(200);
        expect(await runtimeConfigResponse.json()).toEqual({
          applied: true,
          path: "D:\\runtime-config.yaml",
          config: {
            version: "1.0",
            executionMode: "hybrid",
          },
        });

        const runtimeConfigUpdateResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/runtime/config`, {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            version: "1.1",
          }),
        });
        expect(runtimeConfigUpdateResponse.status).toBe(200);
        expect(await runtimeConfigUpdateResponse.json()).toEqual({
          applied: true,
          path: "D:\\runtime-config.yaml",
          config: {
            version: "1.1",
            executionMode: "hybrid",
          },
        });

        const controllerResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/controller`);
        expect(controllerResponse.status).toBe(200);
        expect(await controllerResponse.json()).toEqual({
          scope: "global",
          endpointId: "cli.local.coder",
          modelId: "gpt-5.4",
          sourceType: "local",
        });

        const updateControllerResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/controller`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          }),
        });
        expect(updateControllerResponse.status).toBe(200);
        expect(await updateControllerResponse.json()).toEqual({
          scope: "global",
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          modelId: "moonshot/kimi-k2.5",
          sourceType: "remote",
        });

        const activateResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/endpoints`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
         },
         body: JSON.stringify({
           providerAccountId: "moonshot.personal.primary",
           modelId: "moonshot/kimi-k2.5",
           region: "global",
         }),
       });
       expect(activateResponse.status).toBe(200);
       expect(await activateResponse.json()).toEqual({
         endpointId: "moonshot.personal.primary.global.kimi-k2.5",
         providerAccountId: "moonshot.personal.primary",
         modelId: "moonshot/kimi-k2.5",
         status: "active",
       });

       const endpointsResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/endpoints`);
       expect(endpointsResponse.status).toBe(200);
      expect(await endpointsResponse.json()).toEqual([
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          providerId: "moonshot",
          modelId: "moonshot/kimi-k2.5",
        },
      ]);
    } finally {
      await server.close();
    }
  });

  test("serves canonical telemetry summary, comparison, and recent request routes", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          readTelemetrySummary: () => Promise<unknown>;
          listTelemetryComparisonRows: () => Promise<unknown>;
          listTelemetryRequests: () => Promise<unknown>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async () => {
        throw new Error("not used");
      },
      readTelemetrySummary: async () => ({
        requestCount: 2,
        successCount: 1,
        failureCount: 1,
        totalTokens: 200,
      }),
      listTelemetryComparisonRows: async () => [
        {
          endpointId: "llama-swap.local.local-mock-llama",
          sourceType: "local",
          requestCount: 1,
        },
        {
          endpointId: "openai.personal.primary.us-east-1.fast",
          sourceType: "remote",
          requestCount: 1,
        },
      ],
      listTelemetryRequests: async () => [
        {
          requestId: "req-telemetry-local-001",
          sourceType: "local",
          endpointId: "llama-swap.local.local-mock-llama",
        },
        {
          requestId: "req-telemetry-remote-001",
          sourceType: "remote",
          endpointId: "openai.personal.primary.us-east-1.fast",
        },
      ],
    });

    try {
      const summaryResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/telemetry/summary`);
      expect(summaryResponse.status).toBe(200);
      expect(await summaryResponse.json()).toEqual({
        requestCount: 2,
        successCount: 1,
        failureCount: 1,
        totalTokens: 200,
      });

      const rowsResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/telemetry/rows`);
      expect(rowsResponse.status).toBe(200);
      expect(await rowsResponse.json()).toEqual([
        {
          endpointId: "llama-swap.local.local-mock-llama",
          sourceType: "local",
          requestCount: 1,
        },
        {
          endpointId: "openai.personal.primary.us-east-1.fast",
          sourceType: "remote",
          requestCount: 1,
        },
      ]);

      const requestsResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/telemetry/requests`);
      expect(requestsResponse.status).toBe(200);
      expect(await requestsResponse.json()).toEqual([
        {
          requestId: "req-telemetry-local-001",
          sourceType: "local",
          endpointId: "llama-swap.local.local-mock-llama",
        },
        {
          requestId: "req-telemetry-remote-001",
          sourceType: "remote",
          endpointId: "openai.personal.primary.us-east-1.fast",
        },
      ]);
    } finally {
      await server.close();
    }
  });

  test("serves downstream OpenAI-compatible provider metadata for consumer apps", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<unknown>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
    });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/api/role-model/downstream/openai`);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        kind: "openai-compatible",
        providerId: "role-model-runtime",
        displayName: "Role Model Runtime",
        baseUrl: `http://127.0.0.1:${server.port}`,
        endpoints: {
          health: `http://127.0.0.1:${server.port}/healthz`,
          models: `http://127.0.0.1:${server.port}/v1/models`,
          chatCompletions: `http://127.0.0.1:${server.port}/v1/chat/completions`,
          responses: `http://127.0.0.1:${server.port}/v1/responses`,
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
            id: "claude-3.7-sonnet",
            object: "model",
            owned_by: "role-model",
            endpoint_ids: ["anthropic.team.shared.us-east-1.default"],
          },
          {
            id: "openai/gpt-4.1-mini-fast",
            object: "model",
            owned_by: "role-model",
            endpoint_ids: [
              "openai.personal.primary.us-east-1.fast",
              "openai.personal.secondary.us-west-2.fast",
            ],
          },
        ],
        setup: {
          recommendedModel: "claude-3.7-sonnet",
          notes: [
            "Configure downstream tooling as an OpenAI-compatible provider.",
            "Use GET /v1/models to discover the current model ids.",
            "Use POST /v1/chat/completions or POST /v1/responses for routed inference.",
          ],
        },
      });
    } finally {
      await server.close();
    }
  });

  test("serves chat-completions responses with role-model execution metadata", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
          ) => Promise<{
            model: string;
            endpointId: string;
            adapterFamily: string;
            outputText: string;
            finishReason: string;
            usage: {
              inputTokens: number;
              outputTokens: number;
            };
          }>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async () => ({
        model: "openai/gpt-4.1-mini-fast",
        endpointId: "openai.personal.primary.us-east-1.fast",
        adapterFamily: "ai-sdk-openai",
        routingDecisionId: "decision-chat-123",
        outputText: "Routed summary",
        finishReason: "stop",
        usage: {
          inputTokens: 32,
          outputTokens: 24,
        },
        vendorMetadata: {
          costUsd: 0.0042,
        },
      }),
    });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4.1-mini-fast",
          messages: [{ role: "user", content: "Summarize the routing result." }],
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("x-role-model-endpoint-id")).toBe(
        "openai.personal.primary.us-east-1.fast",
      );
      expect(response.headers.get("x-role-model-adapter-family")).toBe("ai-sdk-openai");
      expect(response.headers.get("x-role-model-routing-decision-id")).toBe("decision-chat-123");
      expect(response.headers.get("x-role-model-cost-usd")).toBe("0.0042");
      expect(await response.json()).toEqual({
        id: "chatcmpl-role-model",
        object: "chat.completion",
        created: expect.any(Number),
        model: "openai/gpt-4.1-mini-fast",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "Routed summary",
            },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 32,
          completion_tokens: 24,
          total_tokens: 56,
        },
      });
    } finally {
      await server.close();
    }
  });

  test("serves OpenAI-compatible SSE events for streaming responses requests", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    let executionCalls = 0;
    let executionCompleted = false;
    const server = await (
      bridge as {
        startBridgeServer: (options: Record<string, unknown> & {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
          ) => Promise<unknown>;
          executeResponses: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
          ) => Promise<{
            responseId: string;
            model: string;
            endpointId: string;
            adapterFamily: string;
            routingDecisionId?: string;
            outputText: string;
            finishReason: string;
            usage: {
              inputTokens: number;
              outputTokens: number;
            };
            vendorMetadata?: {
              costUsd?: number;
            };
          }>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async (_body, _requestId, streamWriter) => {
        executionCalls += 1;
        expect(typeof streamWriter).toBe("function");
        await streamWriter?.({
          type: "response.created",
          response: {
            id: "resp_123",
            created_at: 1,
            model: "openai/gpt-4.1-mini-fast",
          },
        }, {
          endpointId: "openai.personal.primary.us-east-1.fast",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-responses-stream-123",
        });
        await delay(25);
        await streamWriter?.({
          type: "response.output_text.delta",
          item_id: "msg_1",
          delta: "Ready now",
        }, {
          endpointId: "openai.personal.primary.us-east-1.fast",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-responses-stream-123",
        });
        await delay(25);
        await streamWriter?.({
          type: "response.completed",
          response: {
            usage: {
              input_tokens: 11,
              output_tokens: 4,
            },
          },
        }, {
          endpointId: "openai.personal.primary.us-east-1.fast",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-responses-stream-123",
        });
        executionCompleted = true;
        return {
          responseId: "resp_123",
          model: "openai/gpt-4.1-mini-fast",
          endpointId: "openai.personal.primary.us-east-1.fast",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-responses-stream-123",
          outputText: "Ready now",
          finishReason: "stop",
          usage: {
            inputTokens: 11,
            outputTokens: 4,
          },
          vendorMetadata: {
            costUsd: 0.0042,
          },
        };
      },
    });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/v1/responses`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4.1-mini-fast",
          stream: true,
          input: "Reply with Ready now.",
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      expect(response.headers.get("x-role-model-endpoint-id")).toBe(
        "openai.personal.primary.us-east-1.fast",
      );
      expect(response.headers.get("x-role-model-adapter-family")).toBe("ai-sdk-openai");
      expect(response.headers.get("x-role-model-routing-decision-id")).toBe("decision-responses-stream-123");

      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      const decoder = new TextDecoder();
      const firstChunk = await reader!.read();
      const streamedPrefix = decoder.decode(firstChunk.value ?? new Uint8Array(), { stream: true });
      expect(streamedPrefix).toContain('"type":"response.created"');
      expect(executionCompleted).toBe(false);

      let transcript = streamedPrefix;
      while (true) {
        const chunk = await reader!.read();
        transcript += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
        if (chunk.done) {
          break;
        }
      }

      const payloads = transcript
        .trim()
        .split("\n\n")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => entry.replace(/^data:\s*/, ""))
        .map((entry) => JSON.parse(entry) as Record<string, unknown>);

      expect(payloads).toEqual([
        {
          type: "response.created",
          response: {
            id: "resp_123",
            created_at: 1,
            model: "openai/gpt-4.1-mini-fast",
          },
        },
        {
          type: "response.output_text.delta",
          item_id: "msg_1",
          delta: "Ready now",
        },
        {
          type: "response.completed",
          response: {
            usage: {
              input_tokens: 11,
              output_tokens: 4,
            },
          },
        },
      ]);
      expect(executionCalls).toBe(1);
    } finally {
      await server.close();
    }
  });

  test("surfaces tool calls on chat-completions responses when the backend returns them", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            model: string;
            endpointId: string;
            adapterFamily: string;
            outputText: string;
            finishReason: string;
            usage: {
              inputTokens: number;
              outputTokens: number;
            };
            toolCalls: Array<{
              id: string;
              type: "function";
              function: {
                name: string;
                arguments: string;
              };
            }>;
          }>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async () => ({
        model: "openai/gpt-4.1-mini-fast",
        endpointId: "openai.personal.primary.us-east-1.fast",
        adapterFamily: "ai-sdk-openai",
        outputText: "",
        finishReason: "tool_calls",
        usage: {
          inputTokens: 32,
          outputTokens: 24,
        },
        toolCalls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "lookupRegistry",
              arguments: "{\"endpointId\":\"openai.personal.primary.us-east-1.fast\"}",
            },
          },
        ],
      }),
    });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4.1-mini-fast",
          messages: [{ role: "user", content: "Use the registry tool." }],
        }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        id: "chatcmpl-role-model",
        object: "chat.completion",
        created: expect.any(Number),
        model: "openai/gpt-4.1-mini-fast",
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: {
                    name: "lookupRegistry",
                    arguments:
                      "{\"endpointId\":\"openai.personal.primary.us-east-1.fast\"}",
                  },
                },
              ],
            },
            finish_reason: "tool_calls",
          },
        ],
        usage: {
          prompt_tokens: 32,
          completion_tokens: 24,
          total_tokens: 56,
        },
      });
    } finally {
      await server.close();
    }
  });

  test("streams provider deltas through the bridge as they arrive", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    let executionCalls = 0;
    let executionCompleted = false;
    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
          ) => Promise<{
            model: string;
            endpointId: string;
            adapterFamily: string;
            outputText: string;
            finishReason: string;
            usage: {
              inputTokens: number;
              outputTokens: number;
            };
          }>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async (_body, _requestId, streamWriter) => {
        executionCalls += 1;
        expect(typeof streamWriter).toBe("function");
        await streamWriter?.({
          id: "chatcmpl-role-model",
          object: "chat.completion.chunk",
          created: 1,
          model: "openai/gpt-4.1-mini-fast",
          choices: [
            {
              index: 0,
              delta: {
                role: "assistant",
                content: "un",
              },
              finish_reason: null,
            },
          ],
        }, {
          endpointId: "openai.personal.primary.us-east-1.fast",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-chat-stream-123",
        });
        await delay(25);
        await streamWriter?.({
          id: "chatcmpl-role-model",
          object: "chat.completion.chunk",
          created: 1,
          model: "openai/gpt-4.1-mini-fast",
          choices: [
            {
              index: 0,
              delta: {
                content: "expected",
              },
              finish_reason: null,
            },
          ],
        }, {
          endpointId: "openai.personal.primary.us-east-1.fast",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-chat-stream-123",
        });
        await delay(25);
        await streamWriter?.({
          id: "chatcmpl-role-model",
          object: "chat.completion.chunk",
          created: 1,
          model: "openai/gpt-4.1-mini-fast",
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop",
            },
          ],
        }, {
          endpointId: "openai.personal.primary.us-east-1.fast",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-chat-stream-123",
        });
        executionCompleted = true;
        return {
          model: "openai/gpt-4.1-mini-fast",
          endpointId: "openai.personal.primary.us-east-1.fast",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-chat-stream-123",
          outputText: "unexpected",
          finishReason: "stop",
          usage: {
            inputTokens: 1,
            outputTokens: 1,
          },
          vendorMetadata: {
            costUsd: 0.0042,
          },
        };
      },
    });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-4.1-mini-fast",
          stream: true,
          messages: [{ role: "user", content: "Stream this." }],
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      expect(response.headers.get("x-role-model-endpoint-id")).toBe(
        "openai.personal.primary.us-east-1.fast",
      );
      expect(response.headers.get("x-role-model-adapter-family")).toBe("ai-sdk-openai");
      expect(response.headers.get("x-role-model-routing-decision-id")).toBe("decision-chat-stream-123");

      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      const decoder = new TextDecoder();
      const firstChunk = await reader!.read();
      const streamedPrefix = decoder.decode(firstChunk.value ?? new Uint8Array(), { stream: true });
      expect(streamedPrefix).toContain('"content":"un"');
      expect(executionCompleted).toBe(false);

      let transcript = streamedPrefix;
      while (true) {
        const chunk = await reader!.read();
        transcript += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
        if (chunk.done) {
          break;
        }
      }

      const frames = transcript
        .trim()
        .split("\n\n")
        .map((entry) => entry.trim())
        .filter(Boolean);

      expect(frames.at(-1)).toBe("data: [DONE]");

      const payloads = frames
        .slice(0, -1)
        .map((entry) => entry.replace(/^data:\s*/, ""))
        .map((entry) => JSON.parse(entry) as Record<string, unknown>);

      expect(payloads).toHaveLength(3);
      expect(payloads[0]).toEqual(
        expect.objectContaining({
          object: "chat.completion.chunk",
          model: "openai/gpt-4.1-mini-fast",
          choices: [
            {
              index: 0,
              delta: {
                role: "assistant",
                content: "un",
              },
              finish_reason: null,
            },
          ],
        }),
      );
      expect(payloads[1]).toEqual(
        expect.objectContaining({
          object: "chat.completion.chunk",
          model: "openai/gpt-4.1-mini-fast",
          choices: [
            {
              index: 0,
              delta: {
                content: "expected",
              },
              finish_reason: null,
            },
          ],
        }),
      );
      expect(payloads[2]).toEqual(
        expect.objectContaining({
          object: "chat.completion.chunk",
          model: "openai/gpt-4.1-mini-fast",
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop",
            },
          ],
        }),
      );
      expect(executionCalls).toBe(1);
    } finally {
      await server.close();
    }
  });

  test("creates a runtime backend that executes chat-completions through the real routing and adapter path", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
          ) => Promise<{
            model: string;
            endpointId: string;
            adapterFamily: string;
            outputText: string;
            finishReason: string;
            usage: {
              inputTokens: number;
              outputTokens: number;
            };
          }>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot: path.join(os.tmpdir(), "role-model-runtime-host-bridge-tests"),
      scopeId: "runtime-host-bridge-tests",
    });

    expect(backend.registry.endpoints.length).toBeGreaterThan(0);

    const result = await backend.executeChatCompletions(
      {
        model: "openai/gpt-4.1-mini-fast",
        messages: [
          { role: "system", content: "Be concise." },
          { role: "user", content: "Summarize the chosen endpoint." },
        ],
      },
      "req-runtime-bridge-001",
    );

    expect(result.model).toBe("openai/gpt-4.1-mini-fast");
    expect(result.endpointId).toBe("openai.personal.primary.us-east-1.fast");
    expect(result.adapterFamily).toBe("ai-sdk-openai");
    expect(result.outputText.length).toBeGreaterThan(0);
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  });

  test("creates a runtime backend that persists structured request and endpoint inspection state", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
          ) => Promise<{
            model: string;
            endpointId: string;
            adapterFamily: string;
            outputText: string;
            finishReason: string;
            usage: {
              inputTokens: number;
              outputTokens: number;
            };
          }>;
          readRequestObservation?: (requestId: string) => Promise<unknown>;
          readEndpointProfile?: (endpointId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot: path.join(os.tmpdir(), "role-model-runtime-host-observation-tests"),
      scopeId: "runtime-host-observation-tests",
    });

    expect(typeof backend.readRequestObservation).toBe("function");
    expect(typeof backend.readEndpointProfile).toBe("function");

    const requestId = "req-runtime-bridge-observation-001";
    const result = await backend.executeChatCompletions(
      {
        model: "openai/gpt-4.1-mini-fast",
        messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
      },
      requestId,
    );

    await expect(backend.readRequestObservation?.(requestId)).resolves.toMatchObject({
      requestId,
      endpointId: result.endpointId,
      capturePolicy: {
        structuredInspectionAvailable: true,
      },
    });
    await expect(backend.readEndpointProfile?.(result.endpointId)).resolves.toMatchObject({
      endpointId: result.endpointId,
      latestProfile: {
        endpoint_id: result.endpointId,
      },
    });
  });

  test("creates a runtime backend that exposes provider presets, runtime summary, and account upserts", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const controlPlaneTestId = `runtime-host-control-plane-tests-${Date.now()}`;
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher?: typeof fetch;
        }) => Promise<{
          readRuntimeSummary?: () => Promise<unknown>;
          listProviders?: () => Promise<unknown>;
          listRoles?: () => Promise<unknown>;
          listAccounts?: () => Promise<unknown>;
          upsertProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
          startProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
          pollProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
          readControllerAssignment?: () => Promise<unknown>;
          updateControllerAssignment?: (body: Record<string, unknown>) => Promise<unknown>;
          listEndpoints?: () => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot: path.join(os.tmpdir(), controlPlaneTestId),
      scopeId: controlPlaneTestId,
      networkFetcher: async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
          expect(init?.method ?? "POST").toBe("POST");
          return new Response(
            JSON.stringify({
              user_code: "ABCD-EFGH",
              device_code: "device-001",
              verification_uri: "https://auth.kimi.com/device",
              verification_uri_complete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
              expires_in: 900,
              interval: 5,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url === "https://auth.kimi.com/api/oauth/token") {
          expect(init?.method ?? "POST").toBe("POST");
          return new Response(
            JSON.stringify({
              access_token: "access-001",
              refresh_token: "refresh-001",
              expires_in: 3600,
              scope: "openid profile",
              token_type: "Bearer",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url === "https://api.kimi.com/coding/v1/chat/completions") {
          expect(init?.method ?? "POST").toBe("POST");
          expect(init?.headers).toEqual(
            expect.objectContaining({
              authorization: "Bearer access-001",
            }),
          );
          expect(JSON.parse(String(init?.body))).toMatchObject({
            model: "moonshot/kimi-k2.5",
            messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
            stream: true,
          });
          const encoder = new TextEncoder();
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(
                  encoder.encode(
                    'data: {"id":"chatcmpl-kimi","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"role":"assistant","content":"live "},"finish_reason":null}]}\n\n',
                  ),
                );
                controller.enqueue(
                  encoder.encode(
                    'data: {"id":"chatcmpl-kimi","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"content":"kimi endpoint summary"},"finish_reason":null}]}\n\n',
                  ),
                );
                controller.enqueue(
                  encoder.encode(
                    'data: {"id":"chatcmpl-kimi","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":19,"completion_tokens":6}}\n\n',
                  ),
                );
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              },
            }),
            { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8" } },
          );
        }

        throw new Error(`Unexpected network request: ${url}`);
      },
    });

    expect(typeof backend.readRuntimeSummary).toBe("function");
    expect(typeof backend.listProviders).toBe("function");
    expect(typeof backend.listRoles).toBe("function");
    expect(typeof backend.listAccounts).toBe("function");
    expect(typeof backend.upsertProviderAccount).toBe("function");
    expect(typeof backend.startProviderDeviceAuthorization).toBe("function");
    expect(typeof backend.pollProviderDeviceAuthorization).toBe("function");
    expect(typeof backend.activateEndpoint).toBe("function");
    expect(typeof backend.readControllerAssignment).toBe("function");
    expect(typeof backend.updateControllerAssignment).toBe("function");
    expect(typeof backend.listEndpoints).toBe("function");

    await expect(backend.readRuntimeSummary?.()).resolves.toEqual(
      expect.objectContaining({
        providerCount: expect.any(Number),
      }),
    );
    const summary = await backend.readRuntimeSummary?.();
    expect(summary?.providerCount).toBeGreaterThan(3);
    await expect(backend.listProviders?.()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerId: "moonshot",
          variants: expect.arrayContaining([
            expect.objectContaining({
              variantId: "moonshot-open-platform",
              authMode: "api-key-static",
            }),
            expect.objectContaining({
              variantId: "kimi-code",
              authMode: "oauth2-device-code",
              availability: "backend-limited",
              oauth: expect.objectContaining({
                clientId: "17e5f671-d194-4dfb-9706-5516cb48c098",
              }),
            }),
          ]),
        }),
      ]),
    );
    await expect(backend.listRoles?.()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          roleId: "general.chat",
        }),
      ]),
    );

    await expect(
      backend.upsertProviderAccount?.({
        providerAccountId: "moonshot.personal.primary",
        providerId: "moonshot",
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
        baseUrlOverride: "https://api.moonshot.ai/v1",
        allowedModels: ["moonshot/kimi-k2.5"],
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.5",
            roleIds: ["general.chat", "coder.patch"],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        providerAccountId: "moonshot.personal.primary",
        providerId: "moonshot",
      }),
    );

    await expect(backend.listAccounts?.()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerAccountId: "moonshot.personal.primary",
          providerId: "moonshot",
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.5",
              roleIds: ["general.chat", "coder.patch"],
            },
          ],
        }),
      ]),
    );

    const pending = await backend.startProviderDeviceAuthorization?.({
      providerAccountId: "moonshot.personal.kimi-code",
      providerId: "moonshot",
      providerKind: "provider-openai",
      variantId: "kimi-code",
      orgScope: "personal",
      accountScope: "workspace-default",
      allowedModels: ["moonshot/kimi-k2.5"],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
    });
    expect(pending).toEqual(
      expect.objectContaining({
        authRequestId: expect.any(String),
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
      }),
    );

    await expect(backend.listAccounts?.()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerAccountId: "moonshot.personal.kimi-code",
          authMode: "oauth2-device-code",
          healthStatus: "credentials-missing",
        }),
      ]),
    );

    const connected = await backend.pollProviderDeviceAuthorization?.({
      authRequestId: (pending as { authRequestId: string }).authRequestId,
    });
    expect(connected).toEqual(
      expect.objectContaining({
        providerAccountId: "moonshot.personal.kimi-code",
        status: "connected",
      }),
    );

    await expect(
      backend.activateEndpoint?.({
        providerAccountId: "moonshot.personal.kimi-code",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
        providerAccountId: "moonshot.personal.kimi-code",
        modelId: "moonshot/kimi-k2.5",
      }),
    );

    await expect(backend.listEndpoints?.()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
          modelId: "moonshot/kimi-k2.5",
        }),
      ]),
    );

    await expect(backend.readControllerAssignment?.()).resolves.toEqual({
      scope: "global",
      endpointId: "openai.personal.primary.us-east-1.fast",
      modelId: "openai/gpt-4.1-mini-fast",
      sourceType: "remote",
    });

    await expect(
      backend.updateControllerAssignment?.({
        endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        scope: "global",
        endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
        modelId: "moonshot/kimi-k2.5",
        sourceType: "remote",
      }),
    );
  });

  test("executes chat-completions through an activated Kimi Code endpoint", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const streamedChunks: Record<string, unknown>[] = [];
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher?: typeof fetch;
        }) => Promise<{
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            model: string;
            endpointId: string;
            adapterFamily: string;
            outputText: string;
            finishReason: string;
            usage: {
              inputTokens: number;
              outputTokens: number;
            };
          }>;
          startProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
          pollProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot: path.join(os.tmpdir(), "role-model-runtime-host-kimi-execution-tests"),
      scopeId: "runtime-host-kimi-execution-tests",
      networkFetcher: async (input, init) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
          expect(init?.method ?? "POST").toBe("POST");
          return new Response(
            JSON.stringify({
              user_code: "ABCD-EFGH",
              device_code: "device-001",
              verification_uri: "https://auth.kimi.com/device",
              verification_uri_complete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
              expires_in: 900,
              interval: 5,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url === "https://auth.kimi.com/api/oauth/token") {
          expect(init?.method ?? "POST").toBe("POST");
          return new Response(
            JSON.stringify({
              access_token: "access-001",
              refresh_token: "refresh-001",
              expires_in: 3600,
              scope: "openid profile",
              token_type: "Bearer",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url === "https://api.kimi.com/coding/v1/chat/completions") {
          expect(init?.method ?? "POST").toBe("POST");
          expect(init?.headers).toEqual(
            expect.objectContaining({
              authorization: "Bearer access-001",
            }),
          );
          expect(JSON.parse(String(init?.body))).toMatchObject({
            model: "moonshot/kimi-k2.5",
            messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
            stream: true,
          });
          const encoder = new TextEncoder();
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(
                  encoder.encode(
                    'data: {"id":"chatcmpl-kimi","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"role":"assistant","content":"live "},"finish_reason":null}]}\n\n',
                  ),
                );
                controller.enqueue(
                  encoder.encode(
                    'data: {"id":"chatcmpl-kimi","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"content":"kimi endpoint summary"},"finish_reason":null}]}\n\n',
                  ),
                );
                controller.enqueue(
                  encoder.encode(
                    'data: {"id":"chatcmpl-kimi","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":19,"completion_tokens":6}}\n\n',
                  ),
                );
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              },
            }),
            { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8" } },
          );
        }

        throw new Error(`Unexpected network request: ${url}`);
      },
    });

    const pending = await backend.startProviderDeviceAuthorization?.({
      providerAccountId: "moonshot.personal.kimi-code",
      providerId: "moonshot",
      providerKind: "provider-openai",
      variantId: "kimi-code",
      orgScope: "personal",
      accountScope: "workspace-default",
      allowedModels: ["moonshot/kimi-k2.5"],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
    });
    await backend.pollProviderDeviceAuthorization?.({
      authRequestId: (pending as { authRequestId: string }).authRequestId,
    });
    await backend.activateEndpoint?.({
      providerAccountId: "moonshot.personal.kimi-code",
      modelId: "moonshot/kimi-k2.5",
      region: "global",
    });

    const result = await backend.executeChatCompletions(
      {
        model: "moonshot/kimi-k2.5",
        stream: true,
        messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
      },
      "req-runtime-bridge-kimi-001",
      async (chunk) => {
        streamedChunks.push(chunk);
      },
    );

    expect(streamedChunks).toEqual([
      expect.objectContaining({
        object: "chat.completion.chunk",
        choices: [
          expect.objectContaining({
            delta: expect.objectContaining({
              role: "assistant",
              content: "live ",
            }),
          }),
        ],
      }),
      expect.objectContaining({
        object: "chat.completion.chunk",
        choices: [
          expect.objectContaining({
            delta: expect.objectContaining({
              content: "kimi endpoint summary",
            }),
          }),
        ],
      }),
      expect.objectContaining({
        object: "chat.completion.chunk",
        choices: [
          expect.objectContaining({
            finish_reason: "stop",
          }),
        ],
      }),
    ]);
    expect(result.model).toBe("moonshot/kimi-k2.5");
    expect(result.endpointId).toBe("moonshot.personal.kimi-code.global.kimi-k2.5");
    expect(result.adapterFamily).toBe("ai-sdk-openai-compatible");
    expect(result.outputText).toBe("live kimi endpoint summary");
    expect(result.usage.inputTokens).toBe(19);
    expect(result.usage.outputTokens).toBe(6);
  });

  test("creates a runtime backend that executes responses through the real routing and adapter path", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
          ) => Promise<unknown>;
          executeResponses: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
          ) => Promise<{
            responseId: string;
            model: string;
            endpointId: string;
            adapterFamily: string;
            outputText: string;
            finishReason: string;
            usage: {
              inputTokens: number;
              outputTokens: number;
            };
          }>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot: path.join(os.tmpdir(), "role-model-runtime-host-responses-tests"),
      scopeId: "runtime-host-responses-tests",
    });

    const result = await backend.executeResponses(
      {
        model: "openai/gpt-4.1-mini-fast",
        input: "Summarize the chosen endpoint.",
      },
      "req-runtime-bridge-responses-001",
    );

    expect(result.responseId).toBe("resp_test_01");
    expect(result.model).toBe("openai/gpt-4.1-mini-fast");
    expect(result.endpointId).toBe("openai.personal.primary.us-east-1.fast");
    expect(result.adapterFamily).toBe("ai-sdk-openai");
    expect(result.outputText).toBe("OpenAI summary");
    expect(result.finishReason).toBe("stop");
    expect(result.usage.inputTokens).toBe(32);
    expect(result.usage.outputTokens).toBe(24);
  });

  test("serves structured request and endpoint inspection routes through the bridge server", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            model: string;
            endpointId: string;
            adapterFamily: string;
            outputText: string;
            finishReason: string;
            usage: {
              inputTokens: number;
              outputTokens: number;
            };
          }>;
          listRecentRequestObservations?: () => Promise<unknown>;
          readTelemetrySummary?: () => Promise<unknown>;
          listTelemetryComparisonRows?: () => Promise<unknown>;
          listTelemetryRequests?: () => Promise<unknown>;
          readRequestObservation?: (requestId: string) => Promise<unknown>;
          readEndpointProfile?: (endpointId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot: path.join(os.tmpdir(), "role-model-runtime-host-route-tests"),
      scopeId: "runtime-host-route-tests",
    });

    expect(typeof backend.listRecentRequestObservations).toBe("function");
    expect(typeof backend.readTelemetrySummary).toBe("function");
    expect(typeof backend.listTelemetryComparisonRows).toBe("function");
    expect(typeof backend.listTelemetryRequests).toBe("function");
    expect(typeof backend.readRequestObservation).toBe("function");
    expect(typeof backend.readEndpointProfile).toBe("function");

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<unknown>;
          listRecentRequestObservations?: () => Promise<unknown>;
          readTelemetrySummary?: () => Promise<unknown>;
          listTelemetryComparisonRows?: () => Promise<unknown>;
          listTelemetryRequests?: () => Promise<unknown>;
          readRequestObservation?: (requestId: string) => Promise<unknown>;
          readEndpointProfile?: (endpointId: string) => Promise<unknown>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
      readTelemetrySummary: backend.readTelemetrySummary,
      listTelemetryComparisonRows: backend.listTelemetryComparisonRows,
      listTelemetryRequests: backend.listTelemetryRequests,
      listRecentRequestObservations: backend.listRecentRequestObservations,
      readRequestObservation: backend.readRequestObservation,
      readEndpointProfile: backend.readEndpointProfile,
    });

    try {
      const requestId = "req-runtime-bridge-route-001";
      const completionResponse = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": requestId,
        },
        body: JSON.stringify({
          model: "openai/gpt-4.1-mini-fast",
          messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
        }),
      });
      expect(completionResponse.status).toBe(200);

      const recentResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/requests`);
      expect(recentResponse.status).toBe(200);
      expect(await recentResponse.json()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            requestId,
            endpointId: "openai.personal.primary.us-east-1.fast",
          }),
        ]),
      );

      const telemetrySummaryResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/summary`,
      );
      expect(telemetrySummaryResponse.status).toBe(200);
      expect(await telemetrySummaryResponse.json()).toEqual(
        expect.objectContaining({
          requestCount: 1,
          successCount: 1,
          failureCount: 0,
          sourceBreakdown: expect.objectContaining({
            remote: expect.objectContaining({
              requestCount: 1,
            }),
          }),
        }),
      );

      const telemetryRowsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/rows`,
      );
      expect(telemetryRowsResponse.status).toBe(200);
      expect(await telemetryRowsResponse.json()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            endpointId: "openai.personal.primary.us-east-1.fast",
            sourceType: "remote",
            providerFamily: "ai-sdk-openai",
            promptCacheSupported: false,
            requestCount: 1,
          }),
        ]),
      );

      const telemetryRequestsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/requests`,
      );
      expect(telemetryRequestsResponse.status).toBe(200);
      expect(await telemetryRequestsResponse.json()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            requestId,
            endpointId: "openai.personal.primary.us-east-1.fast",
            sourceType: "remote",
            providerFamily: "ai-sdk-openai",
            finishReason: "stop",
            promptCacheSupported: false,
            streamTextDeltaCount: 1,
            streamToolCallDeltaCount: 1,
            streamToolArgumentDeltaCount: 1,
          }),
        ]),
      );

      const requestDetailResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/requests/${requestId}`,
      );
      expect(requestDetailResponse.status).toBe(200);
      expect(await requestDetailResponse.json()).toEqual(
        expect.objectContaining({
          requestId,
          endpointId: "openai.personal.primary.us-east-1.fast",
          sourceType: "remote",
          capturePolicy: expect.objectContaining({
            structuredInspectionAvailable: true,
          }),
        }),
      );

      const endpointProfileResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/endpoints/openai.personal.primary.us-east-1.fast/profile`,
      );
      expect(endpointProfileResponse.status).toBe(200);
      expect(await endpointProfileResponse.json()).toEqual(
        expect.objectContaining({
          endpointId: "openai.personal.primary.us-east-1.fast",
          latestProfile: expect.objectContaining({
            endpoint_id: "openai.personal.primary.us-east-1.fast",
          }),
        }),
      );
    } finally {
      await server.close();
    }
  });

  test("streams canonical telemetry updates over SSE after new requests are persisted", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          readTelemetrySummary?: () => Promise<unknown>;
          listTelemetryComparisonRows?: () => Promise<unknown>;
          listTelemetryRequests?: () => Promise<unknown>;
          subscribeTelemetry?: (listener: (event: unknown) => void) => () => void;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot: path.join(os.tmpdir(), `role-model-runtime-host-sse-tests-${Date.now()}`),
      scopeId: `runtime-host-sse-tests-${Date.now()}`,
    });

    expect(typeof backend.subscribeTelemetry).toBe("function");

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          readTelemetrySummary?: () => Promise<unknown>;
          listTelemetryComparisonRows?: () => Promise<unknown>;
          listTelemetryRequests?: () => Promise<unknown>;
          subscribeTelemetry?: (listener: (event: unknown) => void) => () => void;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
      readTelemetrySummary: backend.readTelemetrySummary,
      listTelemetryComparisonRows: backend.listTelemetryComparisonRows,
      listTelemetryRequests: backend.listTelemetryRequests,
      subscribeTelemetry: backend.subscribeTelemetry,
    });

    const abortController = new AbortController();

    try {
      const streamResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/telemetry/stream`, {
        signal: abortController.signal,
      });
      expect(streamResponse.status).toBe(200);
      expect(streamResponse.headers.get("content-type")).toContain("text/event-stream");

      const reader = streamResponse.body?.getReader();
      expect(reader).toBeDefined();
      const decoder = new TextDecoder();

      await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": "req-runtime-bridge-sse-001",
        },
        body: JSON.stringify({
          model: "openai/gpt-4.1-mini-fast",
          messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
        }),
      });

      let transcript = "";
      while (!transcript.includes("req-runtime-bridge-sse-001")) {
        const chunk = await reader!.read();
        transcript += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
        if (chunk.done) {
          break;
        }
      }

      expect(transcript).toContain("event: telemetry.update");
      expect(transcript).toContain('"requestId":"req-runtime-bridge-sse-001"');
      expect(transcript).toContain('"sourceType":"remote"');
    } finally {
      abortController.abort();
      await delay(10);
      await server.close();
    }
  });

  test("resolves bridge server options from explicit values and defaults", () => {
    expect(typeof (bridge as { resolveBridgeServerOptions?: unknown }).resolveBridgeServerOptions).toBe(
      "function",
    );

    const result = (
      bridge as {
        resolveBridgeServerOptions: (value: {
          host?: string;
          port?: string;
          repoRoot?: string;
          runtimeStateRoot?: string;
          scopeId?: string;
        }) => {
          host: string;
          port: number;
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        };
      }
    ).resolveBridgeServerOptions({
      repoRoot,
      runtimeStateRoot: "C:\\runtime-state",
      port: "9191",
    });

    expect(result).toEqual({
      host: "127.0.0.1",
      port: 9191,
      repoRoot,
      runtimeStateRoot: "C:\\runtime-state",
      scopeId: "runtime-host-bridge",
    });
  });
});
