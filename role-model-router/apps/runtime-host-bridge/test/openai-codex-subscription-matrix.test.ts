import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";
import { buildOpenAIRequest, createOpenAIProviderAdapter } from "@role-model-router/provider-openai";

import {
  OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS,
  OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX,
  createCodexSubscriptionResponsesExecutionAdapter,
  createRuntimeBridgeBackend,
  mapResponsesRequest,
} from "../src/index.js";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(import.meta.dirname, "fixtures-restart-rehydration");

const EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS = [
  "chatgpt/gpt-5.5",
  "chatgpt/gpt-5.5-pro",
  "chatgpt/gpt-5.4",
  "chatgpt/gpt-5.4-mini",
  "chatgpt/gpt-5.4-nano",
  "chatgpt/gpt-5.4-pro",
  "chatgpt/gpt-5.3-codex",
  "chatgpt/gpt-5.3-codex-spark",
  "chatgpt/gpt-5.3-chat-latest",
] as const;

const OPENAI_CODEX_SUBSCRIPTION_CODER_PATCH_TIMEOUT_MS = 30_000;

describe("OpenAI Codex Subscription model matrix", () => {
  test("defines only the supported OpenAI GPT-5.3+ subscription rows", () => {
    expect(OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS).toEqual(
      EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS,
    );
    expect(
      OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX.map(({ modelId, lifecycle }) => ({
        modelId,
        lifecycle,
      })),
    ).toEqual([
      { modelId: "chatgpt/gpt-5.5", lifecycle: "supported" },
      { modelId: "chatgpt/gpt-5.5-pro", lifecycle: "supported" },
      { modelId: "chatgpt/gpt-5.4", lifecycle: "supported" },
      { modelId: "chatgpt/gpt-5.4-mini", lifecycle: "supported" },
      { modelId: "chatgpt/gpt-5.4-nano", lifecycle: "supported" },
      { modelId: "chatgpt/gpt-5.4-pro", lifecycle: "supported" },
      { modelId: "chatgpt/gpt-5.3-codex", lifecycle: "supported" },
      { modelId: "chatgpt/gpt-5.3-codex-spark", lifecycle: "preview" },
      { modelId: "chatgpt/gpt-5.3-chat-latest", lifecycle: "deprecated" },
    ]);
    expect(OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS).not.toEqual(
      expect.arrayContaining([
        "chatgpt/gpt-5.1-codex-max",
        "chatgpt/gpt-5.1-codex-mini",
        "chatgpt/gpt-5.2",
        "chatgpt/gpt-5.2-codex",
        "chatgpt/gpt-5.3-instant",
      ]),
    );
    expect(
      OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX.every((entry) => entry.supportsHostedWebSearch),
    ).toBe(true);
    expect(
      OPENAI_CODEX_SUBSCRIPTION_MODEL_MATRIX.every((entry) => entry.supportsFunctionCalling),
    ).toBe(true);
  });

  test("listProviders exposes the full Codex Subscription 5.3+ matrix for OpenAI", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `openai-provider-matrix-${Date.now()}`);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "openai-provider-matrix-tests",
    });

    try {
      const providers = await backend.listProviders();
      const openai = providers.find((provider) => provider.providerId === "openai");
      const codexSubscription = openai?.variants.find(
        (variant) => variant.variantId === "openai-codex-subscription",
      );

      expect(codexSubscription?.label).toBe("Codex Subscription");
      expect(codexSubscription?.modelIds).toEqual(EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS);
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("rejects pre-5.3 Codex Subscription model ids during device authorization setup", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `openai-provider-legacy-${Date.now()}`);
    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "openai-provider-legacy-tests",
      codexAuthAdapter: {
        startDeviceCodeLogin: async () => ({
          loginId: "login-codex-legacy-001",
          verificationUrl: "https://auth.openai.com/codex/device",
          userCode: "LEGC-Y0001",
          wsUrl: "ws://127.0.0.1:4591",
          pid: 4591,
        }),
        readAccount: async () => ({
          account: null,
          requiresOpenaiAuth: true,
        }),
      },
    });

    try {
      await expect(
        backend.startProviderDeviceAuthorization({
          providerAccountId: "openai.personal.codex-subscription",
          providerId: "openai",
          providerKind: "provider-openai",
          variantId: "openai-codex-subscription",
          orgScope: "personal",
          accountScope: "workspace-default",
          allowedModels: ["chatgpt/gpt-5.2-codex"],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
        }),
      ).rejects.toThrow(/GPT-5\.3\+|Codex Subscription/i);
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("accepts hosted web search and function-tool request surfaces for every supported OpenAI model id", async () => {
    const runtimeStateRoot = path.join(os.tmpdir(), `openai-provider-requests-${Date.now()}`);
    const codexExecutionRequests: Array<{
      modelId: string;
      requestId: string;
      url: string;
      body: Record<string, unknown>;
    }> = [];
    let managedCodexHome: string | null = null;

    const backend = await createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "openai-provider-request-surface-tests",
      codexAuthAdapter: {
        startDeviceCodeLogin: async ({ codexHome }) => {
          managedCodexHome = codexHome;
          return {
            loginId: "login-codex-matrix-001",
            verificationUrl: "https://auth.openai.com/codex/device",
            userCode: "MATR-IX001",
            wsUrl: "ws://127.0.0.1:4592",
            pid: 4592,
          };
        },
        readAccount: async ({ codexHome }) => {
          await mkdir(codexHome, { recursive: true });
          await writeFile(
            path.join(codexHome, "auth.json"),
            JSON.stringify(
              {
                auth_mode: "chatgpt",
                tokens: {
                  access_token: "codex-access-matrix-001",
                  refresh_token: "codex-refresh-matrix-001",
                  account_id: "codex-account-matrix-001",
                },
                last_refresh: "2026-06-19T08:00:00.000Z",
              },
              null,
              2,
            ),
            "utf8",
          );
          return {
            account: {
              type: "chatgpt",
              email: "matrix@example.com",
              planType: "pro",
            },
            requiresOpenaiAuth: true,
          };
        },
      },
      codexExecutionAdapter: {
        executeRequest: async ({ requestId, modelId, requestCapture }) => {
          codexExecutionRequests.push({
            modelId,
            requestId,
            url: requestCapture.url,
            body: requestCapture.body,
          });
          return {
            statusCode: 200,
            body: {
              id: `resp-${requestId}`,
              output: [
                {
                  type: "message",
                  role: "assistant",
                  content: [
                    {
                      type: "output_text",
                      text: `Codex matrix response for ${modelId}`,
                    },
                  ],
                },
              ],
              usage: {
                input_tokens: 34,
                output_tokens: 9,
              },
            },
            vendorMetadata: {
              vendorId: "chatgpt-codex-responses",
              latencyMs: 10,
            },
          };
        },
      },
    });

    try {
      const pending = await backend.startProviderDeviceAuthorization({
        providerAccountId: "openai.personal.codex-subscription",
        providerId: "openai",
        providerKind: "provider-openai",
        variantId: "openai-codex-subscription",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: [...EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });

      expect(pending.status).toBe("pending");
      expect(managedCodexHome).toBeTruthy();

      await expect(
        backend.pollProviderDeviceAuthorization({
          authRequestId: pending.authRequestId,
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          status: "connected",
          providerAccountId: "openai.personal.codex-subscription",
        }),
      );

      for (const modelId of EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS) {
        const transportModelId = modelId.replace("chatgpt/", "");
        const requestSlug = transportModelId.replace(/[^a-z0-9]+/gi, "-");

        await expect(
          backend.activateEndpoint({
            providerAccountId: "openai.personal.codex-subscription",
            modelId,
            region: "global",
          }),
        ).resolves.toEqual(
          expect.objectContaining({
            providerAccountId: "openai.personal.codex-subscription",
            modelId,
            endpointId: `openai.personal.codex-subscription.global.${transportModelId}`,
            status: "active",
          }),
        );

        await expect(
          backend.executeResponses(
            {
              model: modelId,
              input: `Find a current source for ${transportModelId}.`,
              tools: [
                {
                  type: "web_search",
                },
              ],
            },
            `req-web-${requestSlug}`,
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            model: modelId,
            endpointId: `openai.personal.codex-subscription.global.${transportModelId}`,
            outputText: `Codex matrix response for ${modelId}`,
          }),
        );

        await expect(
          backend.executeResponses(
            {
              model: modelId,
              input: `Call the request-scoped tool for ${transportModelId}.`,
              tools: [
                {
                  type: "function",
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
              ],
            },
            `req-tool-${requestSlug}`,
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            model: modelId,
            endpointId: `openai.personal.codex-subscription.global.${transportModelId}`,
            finishReason: "stop",
          }),
        );
      }

      const webSearchRequests = codexExecutionRequests.filter((request) =>
        request.requestId.startsWith("req-web-"),
      );
      const functionToolRequests = codexExecutionRequests.filter((request) =>
        request.requestId.startsWith("req-tool-"),
      );

      expect(webSearchRequests.map((request) => request.modelId)).toEqual(
        EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS,
      );
      expect(functionToolRequests.map((request) => request.modelId)).toEqual(
        EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS,
      );
      expect(
        webSearchRequests.map((request) => (request.body.model as string | undefined) ?? null),
      ).toEqual(EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS.map((modelId) => modelId.slice(8)));
      expect(
        functionToolRequests.map((request) => (request.body.model as string | undefined) ?? null),
      ).toEqual(EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS.map((modelId) => modelId.slice(8)));
      expect(
        webSearchRequests.map(
          (request) => (request.body.tools as Array<{ type: string }>)[0]?.type,
        ),
      ).toEqual(EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS.map(() => "web_search"));
      expect(
        functionToolRequests.map(
          (request) => (request.body.tools as Array<{ type: string }>)[0]?.type,
        ),
      ).toEqual(EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS.map(() => "function"));
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  }, 45_000);

  test("bridges Codex continuation history onto chat-completions upstream targets for Kimi, DeepSeek, and generic LiteLLM", () => {
    const executionRequest = {
      messages: [
        { role: "user", content: "Keep the same tool-turn semantics across providers." },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call_1",
              type: "function" as const,
              function: {
                name: "lookupRegistry",
                arguments: '{"endpointId":"router.primary"}',
              },
            },
          ],
        },
        {
          role: "tool",
          tool_call_id: "call_1",
          content: '{"endpointId":"router.primary","status":"ready"}',
        },
      ],
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
    };

    const cases = [
      {
        name: "codex -> kimi",
        adapterFamily: "ai-sdk-openai-compatible",
        target: {
          endpointId: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
          modelId: "moonshot/kimi-k2.7-code",
          providerId: "moonshot",
          providerKind: "provider-openai",
          providerAccountId: "moonshot.personal.kimi-code",
          adapterFamily: "ai-sdk-openai-compatible",
          authFamily: "api-key",
          apiBase: "https://api.kimi.test/coding/v1",
          requestShapeHints: {
            providerShape: "openai.chat.completions",
            bodyKeys: ["messages", "tools", "tool_choice"],
            headerKeys: ["Authorization"],
          },
          candidate: {
            identity: {
              endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
              provider_kind: "remote_openai_compat",
            },
          },
          account: {
            credentialRef: {
              backend: "env",
              ref: "MOONSHOT_API_KEY",
            },
          },
        },
      },
      {
        name: "codex -> deepseek",
        adapterFamily: "litellm-proxy",
        target: {
          endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
          modelId: "deepseek/deepseek-v4-flash",
          providerId: "deepseek",
          providerKind: "provider-openai",
          providerAccountId: "deepseek.personal.primary",
          adapterFamily: "litellm-proxy",
          authFamily: "api-key",
          apiBase: "https://litellm.test/v1",
          requestShapeHints: {
            providerShape: "openai.chat.completions",
            bodyKeys: ["messages", "tools", "tool_choice"],
            headerKeys: ["Authorization", "x-litellm-session-id", "x-litellm-trace-id"],
          },
          candidate: {
            identity: {
              endpoint_id: "deepseek.personal.primary.global.deepseek-v4-flash",
              provider_kind: "remote_openai_compat",
              serving_source: "vendor-litellm",
            },
          },
          account: {
            credentialRef: {
              backend: "env",
              ref: "LITELLM_PROXY_KEY",
            },
          },
        },
      },
      {
        name: "codex -> generic litellm",
        adapterFamily: "litellm-proxy",
        target: {
          endpointId: "litellm.team.primary.global.qwen3-coder",
          modelId: "qwen/qwen3-coder",
          providerId: "litellm",
          providerKind: "provider-openai",
          providerAccountId: "litellm.team.primary",
          adapterFamily: "litellm-proxy",
          authFamily: "api-key",
          apiBase: "https://litellm-generic.test/v1",
          requestShapeHints: {
            providerShape: "openai.chat.completions",
            bodyKeys: ["messages", "tools", "tool_choice"],
            headerKeys: ["Authorization", "x-litellm-session-id", "x-litellm-trace-id"],
          },
          candidate: {
            identity: {
              endpoint_id: "litellm.team.primary.global.qwen3-coder",
              provider_kind: "remote_openai_compat",
              serving_source: "vendor-litellm",
            },
          },
          account: {
            credentialRef: {
              backend: "env",
              ref: "LITELLM_PROXY_KEY",
            },
          },
        },
      },
    ] as const;

    for (const routeCase of cases) {
      const adapter = createOpenAIProviderAdapter(routeCase.adapterFamily);
      const capabilities = adapter.negotiateCapabilities({
        target: routeCase.target as never,
        executionRequest,
      });
      const requestCapture = buildOpenAIRequest({
        target: routeCase.target as never,
        executionRequest,
        capabilities,
      });

      expect(requestCapture.url, routeCase.name).toContain("/chat/completions");
      expect(requestCapture.body).toEqual(
        expect.objectContaining({
          messages: [
            {
              role: "user",
              content: "Keep the same tool-turn semantics across providers.",
            },
            {
              role: "assistant",
              content: null,
              reasoning_content: "",
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: {
                    name: "lookupRegistry",
                    arguments: '{"endpointId":"router.primary"}',
                  },
                },
              ],
            },
            {
              role: "tool",
              tool_call_id: "call_1",
              content: '{"endpointId":"router.primary","status":"ready"}',
            },
          ],
        }),
      );
    }
  });

  test("renders Kimi and DeepSeek continuation history into native Codex Responses input", async () => {
    const sourceCases = [
      {
        name: "kimi -> codex",
        providerFamily: "ai-sdk-openai-compatible",
      },
      {
        name: "deepseek -> codex",
        providerFamily: "litellm-proxy",
      },
    ] as const;

    for (const sourceCase of sourceCases) {
      let capturedBody: Record<string, unknown> | null = null;
      const adapter = createCodexSubscriptionResponsesExecutionAdapter({
        networkFetcher: (async (_url: string | URL, init?: RequestInit) => {
          capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
          return new Response(
            `data: ${JSON.stringify({
              type: "response.completed",
              response: {
                id: `resp-${sourceCase.name.replace(/[^a-z0-9]+/gi, "-")}`,
                status: "completed",
                output_text: "ok",
                usage: { input_tokens: 3, output_tokens: 1 },
              },
            })}\n\n`,
            {
              status: 200,
              headers: { "content-type": "text/event-stream" },
            },
          );
        }) as typeof fetch,
      });

      await adapter.executeRequest({
        runtimeStateRoot: os.tmpdir(),
        scopeId: `matrix-${sourceCase.name.replace(/[^a-z0-9]+/gi, "-")}`,
        requestId: `req-${sourceCase.name.replace(/[^a-z0-9]+/gi, "-")}`,
        providerAccountId: "openai.personal.codex-subscription",
        modelId: "gpt-5.4",
        requestCapture: {
          providerFamily: sourceCase.providerFamily,
          endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
          url: "https://api.openai.com/v1/chat/completions",
          headers: {},
          body: {
            model: "chatgpt/gpt-5.4",
            stream: false,
            messages: [
              {
                role: "user",
                content: "Keep the same tool-turn semantics across providers.",
              },
              {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    id: "call_1",
                    type: "function",
                    function: {
                      name: "lookupRegistry",
                      arguments: '{"endpointId":"router.primary"}',
                    },
                  },
                ],
              },
              {
                role: "tool",
                tool_call_id: "call_1",
                content: '{"endpointId":"router.primary","status":"ready"}',
              },
            ],
          },
        },
        authPayload: {
          auth_mode: "chatgpt",
          tokens: {
            access_token: "codex-access-matrix",
            refresh_token: "codex-refresh-matrix",
            account_id: "codex-account-matrix",
          },
        },
      });

      expect(capturedBody, sourceCase.name).toEqual(
        expect.objectContaining({
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: "Keep the same tool-turn semantics across providers.",
                },
              ],
            },
            {
              type: "function_call",
              call_id: "call_1",
              name: "lookupRegistry",
              arguments: '{"endpointId":"router.primary"}',
            },
            {
              type: "function_call_output",
              call_id: "call_1",
              output: '{"endpointId":"router.primary","status":"ready"}',
            },
          ],
        }),
      );
    }
  });

  test("maps mixed-provider controller.remote-only web-search requests to runtime tool calling without excluding supported providers", () => {
    const result = mapResponsesRequest(
      {
        endpoints: [
          {
            identity: {
              endpoint_id: "deepseek.personal.primary.global.deepseek-v4-flash",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "deepseek/deepseek-v4-flash",
              runtime_version: "test-registry-v1",
              region: "global",
            },
            declared: {
              endpoint_id: "deepseek.personal.primary.global.deepseek-v4-flash",
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
              endpoint_id: "moonshot.personal.primary.global.kimi-k2.7-code",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "moonshot/kimi-k2.7-code",
              runtime_version: "test-registry-v1",
              region: "global",
            },
            declared: {
              endpoint_id: "moonshot.personal.primary.global.kimi-k2.7-code",
              capabilities: ["text.chat", "tools.function_calling"],
              modalities: ["text"],
              max_context_tokens: 262144,
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
              endpoint_id: "openai.personal.codex-subscription.global.gpt-5.4",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "chatgpt/gpt-5.4",
              runtime_version: "test-registry-v1",
              region: "global",
            },
            declared: {
              endpoint_id: "openai.personal.codex-subscription.global.gpt-5.4",
              capabilities: ["text.chat", "tools.function_calling"],
              modalities: ["text"],
              max_context_tokens: 256000,
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
          active: 3,
          degraded: 0,
          offline: 0,
        },
      },
      {
        model: "controller.remote-only",
        input: "Find the current Cloudflare (NYSE: NET) stock price and cite a source.",
        tools: [
          {
            type: "web_search",
          },
        ],
      },
      "req-openai-alias-web-search-001",
      [
        {
          aliasId: "controller.remote-only",
          modelIds: ["deepseek/deepseek-v4-flash", "moonshot/kimi-k2.7-code", "chatgpt/gpt-5.4"],
        },
      ],
    );

    expect(result.routingRequest.allowEndpoints).toEqual([
      "deepseek.personal.primary.global.deepseek-v4-flash",
      "moonshot.personal.primary.global.kimi-k2.7-code",
      "openai.personal.codex-subscription.global.gpt-5.4",
    ]);
    expect(result.executionRequest.tools).toEqual([
      {
        name: "web_search",
        description: "Search the web for current information and return structured results.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to execute.",
            },
            max_results: {
              type: "integer",
              minimum: 1,
              maximum: 10,
              description: "Optional maximum number of search results to return.",
            },
          },
          required: ["query"],
        },
      },
    ]);
  });

  test(
    "keeps every supported OpenAI GPT-5.3+ subscription model coder.patch routable",
    async () => {
      const runtimeStateRoot = path.join(os.tmpdir(), `openai-provider-coder-role-${Date.now()}`);
      const codexExecutionRequests: Array<{
        modelId: string;
        requestId: string;
        url: string;
        body: Record<string, unknown>;
      }> = [];

      const backend = await createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId: "openai-provider-coder-role-tests",
        codexAuthAdapter: {
          startDeviceCodeLogin: async () => ({
            loginId: "login-codex-coder-role-001",
            verificationUrl: "https://auth.openai.com/codex/device",
            userCode: "CODE-R0001",
            wsUrl: "ws://127.0.0.1:4593",
            pid: 4593,
          }),
          readAccount: async ({ codexHome }) => {
            await mkdir(codexHome, { recursive: true });
            await writeFile(
              path.join(codexHome, "auth.json"),
              JSON.stringify(
                {
                  auth_mode: "chatgpt",
                  tokens: {
                    access_token: "codex-access-coder-role-001",
                    refresh_token: "codex-refresh-coder-role-001",
                    account_id: "codex-account-coder-role-001",
                  },
                  last_refresh: "2026-06-19T08:00:00.000Z",
                },
                null,
                2,
              ),
              "utf8",
            );
            return {
              account: {
                type: "chatgpt",
                email: "coder-role@example.com",
                planType: "pro",
              },
              requiresOpenaiAuth: true,
            };
          },
        },
        codexExecutionAdapter: {
          executeRequest: async ({ requestId, modelId, requestCapture }) => {
            codexExecutionRequests.push({
              modelId,
              requestId,
              url: requestCapture.url,
              body: requestCapture.body,
            });
            return {
              statusCode: 200,
              body: requestCapture.url.endsWith("/chat/completions")
                ? {
                    id: `chatcmpl-${requestId}`,
                    choices: [
                      {
                        index: 0,
                        finish_reason: "stop",
                        message: {
                          role: "assistant",
                          content: `Coder patch response for ${modelId}`,
                        },
                      },
                    ],
                    usage: {
                      prompt_tokens: 55,
                      completion_tokens: 13,
                    },
                  }
                : {
                    id: `resp-${requestId}`,
                    output: [
                      {
                        type: "message",
                        role: "assistant",
                        content: [
                          {
                            type: "output_text",
                            text: `Coder patch response for ${modelId}`,
                          },
                        ],
                      },
                    ],
                    usage: {
                      input_tokens: 55,
                      output_tokens: 13,
                    },
                  },
              vendorMetadata: {
                vendorId: "chatgpt-codex-responses",
                latencyMs: 12,
              },
            };
          },
        },
      });

      try {
        const pending = await backend.startProviderDeviceAuthorization({
          providerAccountId: "openai.personal.codex-subscription",
          providerId: "openai",
          providerKind: "provider-openai",
          variantId: "openai-codex-subscription",
          orgScope: "personal",
          accountScope: "workspace-default",
          allowedModels: [...EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
        });

        expect(pending.status).toBe("pending");

        await expect(
          backend.pollProviderDeviceAuthorization({
            authRequestId: pending.authRequestId,
          }),
        ).resolves.toEqual(
          expect.objectContaining({
            status: "connected",
            providerAccountId: "openai.personal.codex-subscription",
          }),
        );

        for (const modelId of EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS) {
          const transportModelId = modelId.replace("chatgpt/", "");
          await backend.activateEndpoint({
            providerAccountId: "openai.personal.codex-subscription",
            modelId,
            region: "global",
          });
        }

        const candidates = (await backend.listRouterCandidates()) as Array<{
          endpointId: string;
          modelId: string;
          roleBindings: readonly string[];
          capabilities: readonly string[];
        }>;

        expect(
          candidates
            .filter((candidate) =>
              EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS.includes(
                // biome-ignore lint/suspicious/noExplicitAny: test model id cast
                candidate.modelId as any,
              ),
            )
            .sort((left, right) => left.modelId.localeCompare(right.modelId))
            .map((candidate) => ({
              modelId: candidate.modelId,
              capabilities: [...candidate.capabilities].sort(),
            })),
        ).toEqual(
          [...EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS]
            .sort((left, right) => left.localeCompare(right))
            .map((modelId) => ({
              modelId,
              capabilities: expect.arrayContaining([
                "code.edit",
                "text.chat",
                "tools.function_calling",
              ]),
            })),
        );

        for (const modelId of EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS) {
          const requestSlug = modelId.replace(/^chatgpt\//, "").replace(/[^a-z0-9]+/gi, "-");
          await expect(
            backend.executeChatCompletions(
              {
                model: modelId,
                messages: [
                  {
                    role: "user",
                    content: "Write a concise patch plan and preserve contract compatibility.",
                  },
                ],
              },
              `req-coder-${requestSlug}`,
              undefined,
              {
                requestedRoleId: "coder.patch",
              },
            ),
          ).resolves.toEqual(
            expect.objectContaining({
              model: modelId,
              outputText: `Coder patch response for ${modelId}`,
            }),
          );
        }

        expect(codexExecutionRequests.map((request) => request.modelId)).toEqual(
          EXPECTED_OPENAI_CODEX_SUBSCRIPTION_MODEL_IDS,
        );
      } finally {
        await backend.shutdown();
        await rm(runtimeStateRoot, { recursive: true, force: true });
      }
    },
    OPENAI_CODEX_SUBSCRIPTION_CODER_PATCH_TIMEOUT_MS,
  );
});
