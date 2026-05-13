import { describe, expect, test } from "vitest";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { resolveSqliteMemoryLocation } from "@role-model-router/sqlite-memory";

import * as bridge from "../src/index.js";
import * as cli from "../src/cli.js";
import { createQaFixtureRoot, createQaServerOptions } from "../scripts/start-for-qa.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");

const registry: EndpointRegistryResult = {
  endpoints: [
    {
      identity: {
        endpoint_id: "moonshot.personal.primary.global.kimi-k2.5",
        endpoint_kind: "remote_api",
        provider_kind: "remote_openai_compat",
        serving_source: "remote-service",
        model_id: "moonshot/kimi-k2.5",
        runtime_version: "run07-registry-v1",
        region: "global",
      },
      declared: {
        endpoint_id: "moonshot.personal.primary.global.kimi-k2.5",
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
        endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.5",
        endpoint_kind: "remote_api",
        provider_kind: "remote_openai_compat",
        serving_source: "remote-service",
        model_id: "moonshot/kimi-k2.5",
        runtime_version: "run07-registry-v1",
        region: "global",
      },
      declared: {
        endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.5",
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
  ],
  diagnostics: [],
  lifecycleSummary: {
    active: 1,
    degraded: 1,
    offline: 0,
  },
};

function createAliasRemoteVendorScript(): string {
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isClassifier=joinedMessages.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");const classifierResponse=joinedMessages.includes('\"toolCount\": 2')||joinedMessages.includes('\"codeOrSchemaBurden\": true')?JSON.stringify({difficulty:\"hard\"}):JSON.stringify({difficulty:\"easy\"});res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-alias-remote",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content:isClassifier?classifierResponse:"alias remote summary"},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16},_hidden_params:{response_cost:0.0012,cache_hit:false}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

function createDifficultyClassifierVendorScript(mode: "valid-hard" | "slow-hard"): string {
  const responseDelayMs = mode === "slow-hard" ? 50 : 0;
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isClassifier=joinedMessages.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");const respond=()=>{res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-difficulty-remote",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content:isClassifier?JSON.stringify({difficulty:\"hard\"}):"alias remote summary"},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16},_hidden_params:{response_cost:0.0012,cache_hit:false}}));};if(${responseDelayMs}>0){setTimeout(respond,${responseDelayMs});return;}respond();});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

function createControllerVendorScript(): string {
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-controller-remote",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content:isController?JSON.stringify({strategy:\"quality\",preferLocal:true}):"alias remote summary"},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16},_hidden_params:{response_cost:0.0012,cache_hit:false}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

function createHybridArbitrationVendorScript(): string {
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isClassifier=joinedMessages.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");const content=isController?JSON.stringify({strategy:"quality",preferLocal:true}):(isClassifier?JSON.stringify({difficulty:"easy"}):"hybrid alias remote summary");res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-hybrid-remote",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16},_hidden_params:{response_cost:0.0012,cache_hit:false}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

function createSequencedDifficultyClassifierVendorScript(): string {
  return `const http=require("node:http");let classifierCalls=0;const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isClassifier=joinedMessages.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");if(isClassifier){classifierCalls+=1;}const difficulty=isClassifier?(classifierCalls===1?"hard":"easy"):null;res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-difficulty-sequenced",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content:isClassifier?JSON.stringify({difficulty}):"alias remote summary"},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16},_hidden_params:{response_cost:0.0012,cache_hit:false}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

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
          id: "moonshot/kimi-k2.5",
          object: "model",
          owned_by: "role-model",
          endpoint_ids: [
            "moonshot.personal.kimi-code.global.kimi-k2.5",
            "moonshot.personal.primary.global.kimi-k2.5",
          ],
        },
      ],
    });
  });

  test("creates alias entries in the model-list response alongside real models", () => {
    const result = (
      bridge as {
        createModelListResponse: (
          value: EndpointRegistryResult,
          modelAliases?: readonly {
            aliasId: string;
            modelIds: readonly string[];
          }[],
        ) => unknown;
      }
    ).createModelListResponse(registry, [
      {
        aliasId: "gpt-5.4",
        modelIds: ["moonshot/kimi-k2.5"],
      },
    ]);

    expect(result).toEqual({
      object: "list",
      data: [
        {
          id: "gpt-5.4",
          object: "model",
          owned_by: "role-model",
          endpoint_ids: [
            "moonshot.personal.kimi-code.global.kimi-k2.5",
            "moonshot.personal.primary.global.kimi-k2.5",
          ],
        },
        {
          id: "moonshot/kimi-k2.5",
          object: "model",
          owned_by: "role-model",
          endpoint_ids: [
            "moonshot.personal.kimi-code.global.kimi-k2.5",
            "moonshot.personal.primary.global.kimi-k2.5",
          ],
        },
      ],
    });
  });

  test("builds QA bootstrap options with router surfaces and complete fixtures", () => {
    const readRouterSummary = async () => ({ section: "router-summary" });
    const readRouterConfig = async () => ({ section: "router-config" });
    const listRouterCandidates = async () => [{ candidateId: "cand-1" }];
    const listRouterDecisions = async () => [{ requestId: "req-1" }];
    const readRouterDecision = async (requestId: string) => ({ requestId });

    const backend = {
      registry,
      executeChatCompletions: async () => {
        throw new Error("unused");
      },
      executeResponses: async () => {
        throw new Error("unused");
      },
      readRuntimeSummary: async () => ({ lifecycleSummary: registry.lifecycleSummary }),
      readRuntimeConfig: async () => ({ applied: false, path: null, config: null }),
      updateRuntimeConfig: async () => ({ applied: false, path: null, config: null }),
      readTelemetrySummary: async () => ({ totalRequests: 0 }),
      listTelemetryComparisonRows: async () => [],
      listTelemetryRequests: async () => [],
      subscribeTelemetry: () => () => undefined,
      listProviders: async () => [],
      listRoles: async () => [],
      listAccounts: async () => [],
      upsertProviderAccount: async () => ({ providerAccountId: "acct-1" }),
      startProviderDeviceAuthorization: async () => ({ status: "pending" }),
      pollProviderDeviceAuthorization: async () => ({ status: "pending" }),
      activateEndpoint: async () => ({ success: true }),
      readControllerAssignment: async () => null,
      updateControllerAssignment: async () => ({
        scope: "global" as const,
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        modelId: "moonshot/kimi-k2.5",
        sourceType: "remote" as const,
      }),
      readRouterSummary,
      readRouterConfig,
      listRouterCandidates,
      listRouterDecisions,
      readRouterDecision,
      listEndpoints: async () => [],
      listRecentRequestObservations: async () => [],
      readRequestObservation: async () => ({ requestId: "req-1" }),
      readEndpointProfile: async () => ({ endpointId: "moonshot.personal.primary.global.kimi-k2.5" }),
      listLocalModels: async () => [],
      loadLocalModel: async () => ({ success: true }),
      unloadLocalModel: async () => ({ success: true }),
      readLocalPolicy: async () => ({}),
      updateLocalPolicy: async () => ({}),
      listSwapHistory: async () => [],
      shutdown: async () => undefined,
    } as Parameters<typeof createQaServerOptions>[1];

    expect(createQaFixtureRoot(repoRoot)).toBe(
      path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
    );

    const options = createQaServerOptions(repoRoot, backend);

    expect(options.staticRoot).toBe(
      path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
    );
    expect(options.readRouterSummary).toBe(readRouterSummary);
    expect(options.readRouterConfig).toBe(readRouterConfig);
    expect(options.listRouterCandidates).toBe(listRouterCandidates);
    expect(options.listRouterDecisions).toBe(listRouterDecisions);
    expect(options.readRouterDecision).toBe(readRouterDecision);
  });

  test("builds packaged CLI options with static UI, router surfaces, and fixture-root defaults", () => {
    const readRouterSummary = async () => ({ section: "router-summary" });
    const readRouterConfig = async () => ({ section: "router-config" });
    const listRouterCandidates = async () => [{ candidateId: "cand-1" }];
    const listRouterDecisions = async () => [{ requestId: "req-1" }];
    const readRouterDecision = async (requestId: string) => ({ requestId });

    const backend = {
      registry,
      executeChatCompletions: async () => {
        throw new Error("unused");
      },
      executeResponses: async () => {
        throw new Error("unused");
      },
      readRuntimeSummary: async () => ({ lifecycleSummary: registry.lifecycleSummary }),
      readRuntimeConfig: async () => ({ applied: false, path: null, config: null }),
      updateRuntimeConfig: async () => ({ applied: false, path: null, config: null }),
      readHealthStatus: async () => ({ status: "healthy" }),
      readTelemetrySummary: async () => ({ totalRequests: 0 }),
      listTelemetryComparisonRows: async () => [],
      listTelemetryRequests: async () => [],
      subscribeTelemetry: () => () => undefined,
      listProviders: async () => [],
      listRoles: async () => [],
      listAccounts: async () => [],
      upsertProviderAccount: async () => ({ providerAccountId: "acct-1" }),
      startProviderDeviceAuthorization: async () => ({ status: "pending" }),
      pollProviderDeviceAuthorization: async () => ({ status: "pending" }),
      activateEndpoint: async () => ({ success: true }),
      readControllerAssignment: async () => null,
      updateControllerAssignment: async () => ({
        scope: "global" as const,
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        modelId: "moonshot/kimi-k2.5",
        sourceType: "remote" as const,
      }),
      readRouterSummary,
      readRouterConfig,
      listRouterCandidates,
      listRouterDecisions,
      readRouterDecision,
      listEndpoints: async () => [],
      listRecentRequestObservations: async () => [],
      readRequestObservation: async () => ({ requestId: "req-1" }),
      readEndpointProfile: async () => ({ endpointId: "moonshot.personal.primary.global.kimi-k2.5" }),
      listLocalModels: async () => [],
      loadLocalModel: async () => ({ success: true }),
      unloadLocalModel: async () => ({ success: true }),
      readLocalPolicy: async () => ({}),
      updateLocalPolicy: async () => ({}),
      listSwapHistory: async () => [],
      getLocalLogs: async () => "logs",
      readModelOverrides: async () => ({}),
      updateModelOverrides: async () => ({}),
      readPeers: async () => [],
      updatePeers: async () => [],
      checkPeerHealth: async () => ({ ok: true }),
      shutdown: async () => undefined,
    };

    expect(typeof (cli as { resolveCliFixtureRoot?: unknown }).resolveCliFixtureRoot).toBe("function");
    expect(typeof (cli as { createCliServerOptions?: unknown }).createCliServerOptions).toBe("function");

    const fixtureRoot = (
      cli as {
        resolveCliFixtureRoot: (repoRoot: string, fixtureRoot?: string) => string;
      }
    ).resolveCliFixtureRoot(repoRoot);
    expect(fixtureRoot).toBe(path.join(repoRoot, "testdata", "router-runtime", "fixtures"));

    const staticRoot = path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client");
    const options = (
      cli as {
        createCliServerOptions: (
          options: { host: string; port: number; staticRoot: string },
          backend: typeof backend,
        ) => {
          staticRoot?: string;
          readRouterSummary?: unknown;
          readRouterConfig?: unknown;
          listRouterCandidates?: unknown;
          listRouterDecisions?: unknown;
          readRouterDecision?: unknown;
          listLocalModels?: unknown;
          getLocalLogs?: unknown;
          readModelOverrides?: unknown;
          updateModelOverrides?: unknown;
          readPeers?: unknown;
          updatePeers?: unknown;
          checkPeerHealth?: unknown;
        };
      }
    ).createCliServerOptions(
      {
        host: "127.0.0.1",
        port: 3456,
        staticRoot,
      },
      backend,
    );

    expect(options.staticRoot).toBe(staticRoot);
    expect(options.readRouterSummary).toBe(readRouterSummary);
    expect(options.readRouterConfig).toBe(readRouterConfig);
    expect(options.listRouterCandidates).toBe(listRouterCandidates);
    expect(options.listRouterDecisions).toBe(listRouterDecisions);
    expect(options.readRouterDecision).toBe(readRouterDecision);
    expect(options.listLocalModels).toBe(backend.listLocalModels);
    expect(options.getLocalLogs).toBe(backend.getLocalLogs);
    expect(options.readModelOverrides).toBe(backend.readModelOverrides);
    expect(options.updateModelOverrides).toBe(backend.updateModelOverrides);
    expect(options.readPeers).toBe(backend.readPeers);
    expect(options.updatePeers).toBe(backend.updatePeers);
    expect(options.checkPeerHealth).toBe(backend.checkPeerHealth);
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
        model: "moonshot/kimi-k2.5",
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
          "moonshot.personal.kimi-code.global.kimi-k2.5",
          "moonshot.personal.primary.global.kimi-k2.5",
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

  test("maps an alias chat-completions request into a pooled endpoint allow-list and alias diagnostics", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly {
            aliasId: string;
            modelIds: readonly string[];
          }[],
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
          };
          routingDiagnostics?: {
            aliasResolution?: {
              requestedModel: string;
              aliasId: string;
              resolvedModelIds: readonly string[];
              allowEndpoints: readonly string[];
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Route to the alias pool." }],
      },
      "req-host-alias-chat-001",
      [
        {
          aliasId: "gpt-5.4",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
    );

    expect(result.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.kimi-code.global.kimi-k2.5",
      "moonshot.personal.primary.global.kimi-k2.5",
    ]);
    expect(result.routingDiagnostics).toEqual({
      aliasResolution: {
        requestedModel: "gpt-5.4",
        aliasId: "gpt-5.4",
        resolvedModelIds: ["moonshot/kimi-k2.5"],
        allowEndpoints: [
          "moonshot.personal.kimi-code.global.kimi-k2.5",
          "moonshot.personal.primary.global.kimi-k2.5",
        ],
      },
    });
  });

  test("keeps exact-model routing unchanged when aliases are configured", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly {
            aliasId: string;
            modelIds: readonly string[];
          }[],
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
          };
          routingDiagnostics?: {
            aliasResolution?: unknown;
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Keep exact-model routing." }],
      },
      "req-host-exact-model-001",
      [
        {
          aliasId: "gpt-5.4",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
    );

    expect(result.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.kimi-code.global.kimi-k2.5",
      "moonshot.personal.primary.global.kimi-k2.5",
    ]);
    expect(result.routingDiagnostics?.aliasResolution).toBeUndefined();
  });

  test("maps validated controller guidance into an intelligent alias routing plan", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly {
            aliasId: string;
            mode?: "basic" | "difficulty" | "intelligent" | "hybrid" | null;
            modelIds: readonly string[];
          }[],
          difficultyContext?: unknown,
          controllerContext?: {
            active?: boolean;
            resolvedGuidance?: {
              requestedRoleId?: string;
              taskType?: string;
              requiredCapabilities?: readonly string[];
              preferredCapabilities?: readonly string[];
              strategy?: "balanced" | "cost" | "quality";
              preferLocal?: boolean;
              preferredEndpointIds?: readonly string[];
            };
          },
        ) => {
          routingRequest: {
            requestedRoleId?: string;
            taskType: string;
            requiredCapabilities: readonly string[];
            preferredCapabilities: readonly string[];
            strategy: string;
            preferLocal: boolean;
            allowEndpoints: readonly string[];
          };
          routingModel?: {
            endpointId: string;
            preferredEndpointIds: readonly string[];
          };
          routingDiagnostics?: {
            controllerRouting?: {
              active: boolean;
              acceptedDirectives?: {
                requestedRoleId?: string;
                taskType?: string;
                requiredCapabilities?: readonly string[];
                preferredCapabilities?: readonly string[];
                strategy?: string;
                preferLocal?: boolean;
                preferredEndpointIds?: readonly string[];
              };
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Prepare a patch and preserve the schema contract." }],
        tools: [
          {
            type: "function",
            function: {
              name: "lookupRegistry",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      "req-host-intelligent-chat-001",
      [
        {
          aliasId: "gpt-5.4",
          mode: "intelligent",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      undefined,
      {
        active: true,
        resolvedGuidance: {
          requestedRoleId: "coder.patch",
          taskType: "code.edit",
          requiredCapabilities: ["code.edit", "tools.function_calling"],
          preferredCapabilities: ["reasoning.multi_step"],
          strategy: "quality",
          preferLocal: true,
          preferredEndpointIds: [
            "moonshot.personal.kimi-code.global.kimi-k2.5",
            "moonshot.personal.primary.global.kimi-k2.5",
          ],
        },
      },
    );

    expect(result.routingRequest).toMatchObject({
      requestedRoleId: "coder.patch",
      taskType: "code.edit",
      requiredCapabilities: ["code.edit", "tools.function_calling"],
      preferredCapabilities: ["reasoning.multi_step"],
      strategy: "quality",
      preferLocal: true,
      allowEndpoints: [
        "moonshot.personal.kimi-code.global.kimi-k2.5",
        "moonshot.personal.primary.global.kimi-k2.5",
      ],
    });
    expect(result.routingModel).toEqual({
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
      preferredEndpointIds: [
        "moonshot.personal.kimi-code.global.kimi-k2.5",
        "moonshot.personal.primary.global.kimi-k2.5",
      ],
    });
    expect(result.routingDiagnostics?.controllerRouting).toEqual({
      active: true,
      acceptedDirectives: {
        requestedRoleId: "coder.patch",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit", "tools.function_calling"],
        preferredCapabilities: ["reasoning.multi_step"],
        strategy: "quality",
        preferLocal: true,
        preferredEndpointIds: [
          "moonshot.personal.kimi-code.global.kimi-k2.5",
          "moonshot.personal.primary.global.kimi-k2.5",
        ],
      },
    });
  });

  test("uses a baseline override to bypass intelligent alias controller routing", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly {
            aliasId: string;
            mode?: "basic" | "difficulty" | "intelligent" | "hybrid" | null;
            modelIds: readonly string[];
          }[],
          difficultyContext?: unknown,
          controllerContext?: {
            active?: boolean;
            resolvedGuidance?: {
              requestedRoleId?: string;
              taskType?: string;
              requiredCapabilities?: readonly string[];
              preferredCapabilities?: readonly string[];
              strategy?: "balanced" | "cost" | "quality";
              preferLocal?: boolean;
              preferredEndpointIds?: readonly string[];
            };
          },
          requestOptions?: {
            routingModeOverride?: "baseline" | "difficulty" | "controller" | "hybrid";
          },
        ) => {
          routingRequest: {
            taskType: string;
            requiredCapabilities: readonly string[];
            preferredCapabilities: readonly string[];
            strategy: string;
            preferLocal: boolean;
            allowEndpoints: readonly string[];
          };
          routingModel?: {
            endpointId: string;
            preferredEndpointIds: readonly string[];
          };
          routingDiagnostics?: {
            aliasResolution?: {
              requestedModel: string;
              aliasId: string;
              resolvedModelIds: readonly string[];
              allowEndpoints: readonly string[];
            };
            controllerRouting?: unknown;
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Prepare a patch and preserve the schema contract." }],
        tools: [
          {
            type: "function",
            function: {
              name: "lookupRegistry",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      "req-host-intelligent-chat-override-001",
      [
        {
          aliasId: "gpt-5.4",
          mode: "intelligent",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      undefined,
      {
        active: true,
        resolvedGuidance: {
          requestedRoleId: "coder.patch",
          taskType: "code.edit",
          requiredCapabilities: ["code.edit", "tools.function_calling"],
          preferredCapabilities: ["reasoning.multi_step"],
          strategy: "quality",
          preferLocal: true,
          preferredEndpointIds: [
            "moonshot.personal.kimi-code.global.kimi-k2.5",
            "moonshot.personal.primary.global.kimi-k2.5",
          ],
        },
      },
      {
        routingModeOverride: "baseline",
      },
    );

    expect(result.routingRequest).toMatchObject({
      taskType: "text.chat",
      requiredCapabilities: ["text.chat"],
      preferredCapabilities: [],
      strategy: "balanced",
      preferLocal: false,
      allowEndpoints: [
        "moonshot.personal.kimi-code.global.kimi-k2.5",
        "moonshot.personal.primary.global.kimi-k2.5",
      ],
    });
    expect(result.routingModel).toBeUndefined();
    expect(result.routingDiagnostics).toEqual({
      aliasResolution: {
        requestedModel: "gpt-5.4",
        aliasId: "gpt-5.4",
        resolvedModelIds: ["moonshot/kimi-k2.5"],
        allowEndpoints: [
          "moonshot.personal.kimi-code.global.kimi-k2.5",
          "moonshot.personal.primary.global.kimi-k2.5",
        ],
      },
    });
  });

  test("records explicit hybrid arbitration when controller guidance alters the difficulty plan", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly {
            aliasId: string;
            mode?: "basic" | "difficulty" | "intelligent" | "hybrid" | null;
            modelIds: readonly string[];
          }[],
          difficultyContext?: {
            resolvedClassification?: {
              difficulty: "easy" | "medium" | "hard";
              fallbackApplied: boolean;
              rubricSignals: {
                contextTokens: number;
                toolCount: number;
                historyTurnCount: number;
                instructionConstraintCount: number;
                decompositionKeywordCount: number;
                codeOrSchemaBurden: boolean;
              };
            };
            endpointMaxDifficultyByEndpointId?: Record<string, "easy" | "medium" | "hard">;
          },
          controllerContext?: {
            active?: boolean;
            resolvedGuidance?: {
              strategy?: "balanced" | "cost" | "quality";
              preferLocal?: boolean;
              preferredEndpointIds?: readonly string[];
            };
          },
        ) => {
          routingRequest: {
            strategy: string;
            preferLocal: boolean;
            allowEndpoints: readonly string[];
          };
          routingDiagnostics?: {
            routingMode?: {
              source: string;
              aliasMode?: string;
              effectiveMode: string;
            };
            difficultyRouting?: {
              difficulty: string;
              strategy: string;
            };
            controllerRouting?: {
              active: boolean;
              acceptedDirectives?: {
                strategy?: string;
                preferLocal?: boolean;
              };
            };
            hybridArbitration?: {
              active: boolean;
              difficultyStrategy: string;
              finalStrategy: string;
              controllerChangedPlan: boolean;
              dominantSignal: string;
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "gpt-5.4-hybrid",
        messages: [{ role: "user", content: "Choose the best path for a short coding request." }],
      },
      "req-host-hybrid-chat-001",
      [
        {
          aliasId: "gpt-5.4-hybrid",
          mode: "hybrid",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      {
        resolvedClassification: {
          difficulty: "easy",
          fallbackApplied: false,
          rubricSignals: {
            contextTokens: 32,
            toolCount: 0,
            historyTurnCount: 1,
            instructionConstraintCount: 0,
            decompositionKeywordCount: 0,
            codeOrSchemaBurden: false,
          },
        },
        endpointMaxDifficultyByEndpointId: {
          "moonshot.personal.primary.global.kimi-k2.5": "hard",
          "moonshot.personal.kimi-code.global.kimi-k2.5": "easy",
        },
      },
      {
        active: true,
        resolvedGuidance: {
          strategy: "quality",
          preferLocal: true,
        },
      },
    );

    expect(result.routingRequest).toMatchObject({
      strategy: "quality",
      preferLocal: true,
      allowEndpoints: [
        "moonshot.personal.kimi-code.global.kimi-k2.5",
        "moonshot.personal.primary.global.kimi-k2.5",
      ],
    });
    expect(result.routingDiagnostics).toMatchObject({
      routingMode: {
        source: "alias-default",
        aliasMode: "hybrid",
        effectiveMode: "hybrid",
      },
      difficultyRouting: {
        difficulty: "easy",
        strategy: "cost",
      },
      controllerRouting: {
        active: true,
        acceptedDirectives: {
          strategy: "quality",
          preferLocal: true,
        },
      },
      hybridArbitration: {
        active: true,
        difficultyStrategy: "cost",
        finalStrategy: "quality",
        controllerChangedPlan: true,
        dominantSignal: "controller",
      },
    });
  });

  test("maps a difficulty-mode alias chat request into a gated allow-list and difficulty diagnostics", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly {
            aliasId: string;
            mode?: "basic" | "difficulty" | "intelligent" | "hybrid" | null;
            modelIds: readonly string[];
          }[],
          difficultyContext?: {
            endpointMaxDifficultyByEndpointId?: Record<
              string,
              "easy" | "medium" | "hard"
            >;
          },
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
            strategy: string;
          };
          routingDiagnostics?: {
            difficultyRouting?: {
              difficulty: "easy" | "medium" | "hard";
              strategy: string;
              fallbackApplied: boolean;
              excludedEndpointIds: readonly string[];
              rubricSignals: {
                toolCount: number;
                historyTurnCount: number;
              };
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "gpt-5.4",
        messages: [
          { role: "system", content: "You are handling a strict schema-constrained migration." },
          {
            role: "user",
            content:
              "Analyze this large code-edit request, preserve backwards compatibility, satisfy multiple constraints, and produce a step-by-step plan with schema checks and test updates.",
          },
          {
            role: "assistant",
            content: "I will inspect the schema, update the implementation, and verify the output.",
          },
          {
            role: "user",
            content:
              "Now finish the refactor, update the contract, and use the available tools to validate the change across the full workflow.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "readSchema",
              parameters: { type: "object", properties: {} },
            },
          },
          {
            type: "function",
            function: {
              name: "runTests",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      "req-host-difficulty-chat-001",
      [
        {
          aliasId: "gpt-5.4",
          mode: "difficulty",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      {
        endpointMaxDifficultyByEndpointId: {
          "moonshot.personal.primary.global.kimi-k2.5": "hard",
          "moonshot.personal.kimi-code.global.kimi-k2.5": "easy",
        },
      },
    );

    expect(result.routingRequest.strategy).toBe("quality");
    expect(result.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.primary.global.kimi-k2.5",
    ]);
    expect(result.routingDiagnostics?.difficultyRouting).toEqual({
      difficulty: "hard",
      strategy: "quality",
      fallbackApplied: false,
      excludedEndpointIds: [
        "moonshot.personal.kimi-code.global.kimi-k2.5",
      ],
      rubricSignals: expect.objectContaining({
        toolCount: 2,
        historyTurnCount: 4,
      }),
    });
  });

  test("uses a baseline override to bypass difficulty alias gating", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly {
            aliasId: string;
            mode?: "basic" | "difficulty" | "intelligent" | "hybrid" | null;
            modelIds: readonly string[];
          }[],
          difficultyContext?: {
            endpointMaxDifficultyByEndpointId?: Record<
              string,
              "easy" | "medium" | "hard"
            >;
          },
          controllerContext?: unknown,
          requestOptions?: {
            routingModeOverride?: "baseline" | "difficulty" | "controller" | "hybrid";
          },
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
            strategy: string;
          };
          routingDiagnostics?: {
            aliasResolution?: {
              requestedModel: string;
              aliasId: string;
              resolvedModelIds: readonly string[];
              allowEndpoints: readonly string[];
            };
            difficultyRouting?: unknown;
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "gpt-5.4",
        messages: [
          { role: "system", content: "You are handling a strict schema-constrained migration." },
          {
            role: "user",
            content:
              "Analyze this large code-edit request, preserve backwards compatibility, satisfy multiple constraints, and produce a step-by-step plan with schema checks and test updates.",
          },
          {
            role: "assistant",
            content: "I will inspect the schema, update the implementation, and verify the output.",
          },
          {
            role: "user",
            content:
              "Now finish the refactor, update the contract, and use the available tools to validate the change across the full workflow.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "readSchema",
              parameters: { type: "object", properties: {} },
            },
          },
          {
            type: "function",
            function: {
              name: "runTests",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      "req-host-difficulty-chat-override-001",
      [
        {
          aliasId: "gpt-5.4",
          mode: "difficulty",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      {
        endpointMaxDifficultyByEndpointId: {
          "moonshot.personal.primary.global.kimi-k2.5": "hard",
          "moonshot.personal.kimi-code.global.kimi-k2.5": "easy",
        },
      },
      undefined,
      {
        routingModeOverride: "baseline",
      },
    );

    expect(result.routingRequest.strategy).toBe("balanced");
    expect(result.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.kimi-code.global.kimi-k2.5",
      "moonshot.personal.primary.global.kimi-k2.5",
    ]);
    expect(result.routingDiagnostics).toEqual({
      aliasResolution: {
        requestedModel: "gpt-5.4",
        aliasId: "gpt-5.4",
        resolvedModelIds: ["moonshot/kimi-k2.5"],
        allowEndpoints: [
          "moonshot.personal.kimi-code.global.kimi-k2.5",
          "moonshot.personal.primary.global.kimi-k2.5",
        ],
      },
    });
  });

  test("maps an alias responses request into a pooled endpoint allow-list and alias diagnostics", () => {
    const result = (
      bridge as {
        mapResponsesRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly {
            aliasId: string;
            modelIds: readonly string[];
          }[],
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
          };
          routingDiagnostics?: {
            aliasResolution?: {
              requestedModel: string;
              aliasId: string;
              resolvedModelIds: readonly string[];
              allowEndpoints: readonly string[];
            };
          };
        };
      }
    ).mapResponsesRequest(
      registry,
      {
        model: "gpt-5.4",
        input: "Route this through the alias pool.",
      },
      "req-host-alias-response-001",
      [
        {
          aliasId: "gpt-5.4",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
    );

    expect(result.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.kimi-code.global.kimi-k2.5",
      "moonshot.personal.primary.global.kimi-k2.5",
    ]);
    expect(result.routingDiagnostics).toEqual({
      aliasResolution: {
        requestedModel: "gpt-5.4",
        aliasId: "gpt-5.4",
        resolvedModelIds: ["moonshot/kimi-k2.5"],
        allowEndpoints: [
          "moonshot.personal.kimi-code.global.kimi-k2.5",
          "moonshot.personal.primary.global.kimi-k2.5",
        ],
      },
    });
  });

  test("maps a difficulty-mode responses request into an easy strategy and keeps eligible endpoints", () => {
    const result = (
      bridge as {
        mapResponsesRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly {
            aliasId: string;
            mode?: "basic" | "difficulty" | "intelligent" | "hybrid" | null;
            modelIds: readonly string[];
          }[],
          difficultyContext?: {
            endpointMaxDifficultyByEndpointId?: Record<
              string,
              "easy" | "medium" | "hard"
            >;
          },
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
            strategy: string;
          };
          routingDiagnostics?: {
            difficultyRouting?: {
              difficulty: "easy" | "medium" | "hard";
              strategy: string;
              fallbackApplied: boolean;
            };
          };
        };
      }
    ).mapResponsesRequest(
      registry,
      {
        model: "gpt-5.4",
        input: "Say hello in one sentence.",
      },
      "req-host-difficulty-response-001",
      [
        {
          aliasId: "gpt-5.4",
          mode: "difficulty",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      {
        endpointMaxDifficultyByEndpointId: {
          "moonshot.personal.primary.global.kimi-k2.5": "hard",
          "moonshot.personal.kimi-code.global.kimi-k2.5": "easy",
        },
      },
    );

    expect(result.routingRequest.strategy).toBe("cost");
    expect(result.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.kimi-code.global.kimi-k2.5",
      "moonshot.personal.primary.global.kimi-k2.5",
    ]);
    expect(result.routingDiagnostics?.difficultyRouting).toEqual(
      expect.objectContaining({
        difficulty: "easy",
        strategy: "cost",
        fallbackApplied: false,
      }),
    );
  });

  test("prefers a configured alias in downstream OpenAI provider config", () => {
    const result = (
      bridge as {
        createDownstreamOpenAIProviderConfig: (
          value: EndpointRegistryResult,
          baseUrl: string,
          modelAliases?: readonly {
            aliasId: string;
            modelIds: readonly string[];
          }[],
        ) => {
          models: readonly { id: string }[];
          setup: { recommendedModel: string | null };
        };
      }
    ).createDownstreamOpenAIProviderConfig(registry, "http://127.0.0.1:4010", [
      {
        aliasId: "gpt-5.4",
        modelIds: ["moonshot/kimi-k2.5"],
      },
    ]);

    expect(result.models.map((entry) => entry.id)).toEqual([
      "gpt-5.4",
      "moonshot/kimi-k2.5",
    ]);
    expect(result.setup.recommendedModel).toBe("gpt-5.4");
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
            id: "moonshot/kimi-k2.5",
            object: "model",
            owned_by: "role-model",
            endpoint_ids: [
              "moonshot.personal.kimi-code.global.kimi-k2.5",
              "moonshot.personal.primary.global.kimi-k2.5",
            ],
          },
        ],
      });
    } finally {
      await server.close();
    }
  });

  test("serves alias entries in model-list and downstream provider config from runtime config", async () => {
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
          readRuntimeConfig: () => Promise<{
            config: {
              modelAliases: readonly {
                aliasId: string;
                modelIds: readonly string[];
              }[];
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
      readRuntimeConfig: async () => ({
        config: {
          modelAliases: [
            {
              aliasId: "gpt-5.4",
              modelIds: ["moonshot/kimi-k2.5"],
            },
          ],
        },
      }),
    });

    try {
      const modelsResponse = await fetch(`http://127.0.0.1:${server.port}/v1/models`);
      expect(modelsResponse.status).toBe(200);
      expect(await modelsResponse.json()).toEqual({
        object: "list",
        data: [
          {
            id: "gpt-5.4",
            object: "model",
            owned_by: "role-model",
            endpoint_ids: [
              "moonshot.personal.kimi-code.global.kimi-k2.5",
              "moonshot.personal.primary.global.kimi-k2.5",
            ],
          },
          {
            id: "moonshot/kimi-k2.5",
            object: "model",
            owned_by: "role-model",
            endpoint_ids: [
              "moonshot.personal.kimi-code.global.kimi-k2.5",
              "moonshot.personal.primary.global.kimi-k2.5",
            ],
          },
        ],
      });

      const providerResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/downstream/openai`);
      expect(providerResponse.status).toBe(200);
      await expect(providerResponse.json()).resolves.toEqual(
        expect.objectContaining({
          models: [
            expect.objectContaining({ id: "gpt-5.4" }),
            expect.objectContaining({ id: "moonshot/kimi-k2.5" }),
          ],
          setup: expect.objectContaining({
            recommendedModel: "gpt-5.4",
          }),
        }),
      );
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
          model: "moonshot/kimi-k2.5",
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
          model: "moonshot/kimi-k2.5",
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
            readRouterSummary: () => Promise<unknown>;
            readRouterConfig: () => Promise<unknown>;
            listRouterCandidates: () => Promise<unknown>;
            listRouterDecisions: () => Promise<unknown>;
            readRouterDecision: (requestId: string) => Promise<unknown>;
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
         readRouterSummary: async () => ({
           strategy: "balanced",
           executionMode: "hybrid",
           controller: {
             endpointId: "cli.local.coder",
             modelId: "gpt-5.4",
             sourceType: "local",
           },
           configuredCandidateCount: 2,
           recentDecisionCount: 3,
         }),
         readRouterConfig: async () => ({
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
             preferredEndpointIds: ["cli.local.coder"],
             ignoredEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.5"],
           },
           policySources: {
             roles: [
               {
                 roleId: "general.chat",
                 taskTypes: ["general.chat"],
                 routingPolicyOverrides: {
                   computePreference: "balanced",
                 },
               },
             ],
             tasks: [
               {
                 taskType: "general.chat",
                 label: "General chat",
                 routingTarget: "balanced",
               },
             ],
           },
         }),
         listRouterCandidates: async () => [
           {
             endpointId: "cli.local.coder",
             modelId: "gpt-5.4",
             providerId: "local",
             sourceType: "local",
             endpointKind: "local_process",
             servingSource: "local",
             healthStatus: "healthy",
             controllerEligible: true,
             roleBindings: ["general.chat"],
             toolCallingSupported: true,
           },
         ],
         listRouterDecisions: async () => [
           {
             requestId: "req-router-001",
             routingDecisionId: "route-001",
             selectedEndpointId: "cli.local.coder",
             selectedModelId: "gpt-5.4",
             strategyLabel: "balanced",
           },
         ],
         readRouterDecision: async (requestId) => ({
           requestId,
           routingDecisionId: "route-001",
           selectedEndpointId: "cli.local.coder",
           selectedModelId: "gpt-5.4",
           fallbackEndpointIds: ["moonshot.personal.primary.global.kimi-k2.5"],
           strategyLabel: "balanced",
           scoredCandidates: [
             {
               endpointId: "cli.local.coder",
               totalScore: 0.98,
               metricProvenance: "measured",
             },
           ],
           observeRequestPath: `/app/observe/requests/${requestId}`,
         }),
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

        const routerSummaryResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/router/summary`);
        expect(routerSummaryResponse.status).toBe(200);
        expect(await routerSummaryResponse.json()).toEqual({
          strategy: "balanced",
          executionMode: "hybrid",
          controller: {
            endpointId: "cli.local.coder",
            modelId: "gpt-5.4",
            sourceType: "local",
          },
          configuredCandidateCount: 2,
          recentDecisionCount: 3,
        });

        const routerConfigResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/router/config`);
        expect(routerConfigResponse.status).toBe(200);
        expect(await routerConfigResponse.json()).toEqual({
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
            preferredEndpointIds: ["cli.local.coder"],
            ignoredEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.5"],
          },
          policySources: {
            roles: [
              {
                roleId: "general.chat",
                taskTypes: ["general.chat"],
                routingPolicyOverrides: {
                  computePreference: "balanced",
                },
              },
            ],
            tasks: [
              {
                taskType: "general.chat",
                label: "General chat",
                routingTarget: "balanced",
              },
            ],
          },
        });

        const routerCandidatesResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/router/candidates`);
        expect(routerCandidatesResponse.status).toBe(200);
        expect(await routerCandidatesResponse.json()).toEqual([
          {
            endpointId: "cli.local.coder",
            modelId: "gpt-5.4",
            providerId: "local",
            sourceType: "local",
            endpointKind: "local_process",
            servingSource: "local",
            healthStatus: "healthy",
            controllerEligible: true,
            roleBindings: ["general.chat"],
            toolCallingSupported: true,
          },
        ]);

        const routerDecisionsResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/router/decisions`);
        expect(routerDecisionsResponse.status).toBe(200);
        expect(await routerDecisionsResponse.json()).toEqual([
          {
            requestId: "req-router-001",
            routingDecisionId: "route-001",
            selectedEndpointId: "cli.local.coder",
            selectedModelId: "gpt-5.4",
            strategyLabel: "balanced",
          },
        ]);

        const routerDecisionDetailResponse = await fetch(
          `http://127.0.0.1:${server.port}/api/role-model/router/decisions/req-router-001`,
        );
        expect(routerDecisionDetailResponse.status).toBe(200);
        expect(await routerDecisionDetailResponse.json()).toEqual({
          requestId: "req-router-001",
          routingDecisionId: "route-001",
          selectedEndpointId: "cli.local.coder",
          selectedModelId: "gpt-5.4",
          fallbackEndpointIds: ["moonshot.personal.primary.global.kimi-k2.5"],
          strategyLabel: "balanced",
          scoredCandidates: [
            {
              endpointId: "cli.local.coder",
              totalScore: 0.98,
              metricProvenance: "measured",
            },
          ],
          observeRequestPath: "/app/observe/requests/req-router-001",
        });
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
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
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
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
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
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
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
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
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
            id: "moonshot/kimi-k2.5",
            object: "model",
            owned_by: "role-model",
            endpoint_ids: [
              "moonshot.personal.kimi-code.global.kimi-k2.5",
              "moonshot.personal.primary.global.kimi-k2.5",
            ],
          },
        ],
        setup: {
          recommendedModel: "moonshot/kimi-k2.5",
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
        model: "moonshot/kimi-k2.5",
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
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
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Summarize the routing result." }],
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("x-role-model-endpoint-id")).toBe(
        "moonshot.personal.primary.global.kimi-k2.5",
      );
      expect(response.headers.get("x-role-model-adapter-family")).toBe("ai-sdk-openai");
      expect(response.headers.get("x-role-model-routing-decision-id")).toBe("decision-chat-123");
      expect(response.headers.get("x-role-model-cost-usd")).toBe("0.0042");
      expect(await response.json()).toEqual({
        id: "chatcmpl-role-model",
        object: "chat.completion",
        created: expect.any(Number),
        model: "moonshot/kimi-k2.5",
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
            model: "moonshot/kimi-k2.5",
          },
        }, {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-responses-stream-123",
        });
        await delay(25);
        await streamWriter?.({
          type: "response.output_text.delta",
          item_id: "msg_1",
          delta: "Ready now",
        }, {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
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
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-responses-stream-123",
        });
        executionCompleted = true;
        return {
          responseId: "resp_123",
          model: "moonshot/kimi-k2.5",
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
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
          model: "moonshot/kimi-k2.5",
          stream: true,
          input: "Reply with Ready now.",
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      expect(response.headers.get("x-role-model-endpoint-id")).toBe(
        "moonshot.personal.primary.global.kimi-k2.5",
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
            model: "moonshot/kimi-k2.5",
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
        model: "moonshot/kimi-k2.5",
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
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
              arguments: "{\"endpointId\":\"moonshot.personal.primary.global.kimi-k2.5\"}",
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
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Use the registry tool." }],
        }),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        id: "chatcmpl-role-model",
        object: "chat.completion",
        created: expect.any(Number),
        model: "moonshot/kimi-k2.5",
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
                      "{\"endpointId\":\"moonshot.personal.primary.global.kimi-k2.5\"}",
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
          model: "moonshot/kimi-k2.5",
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
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-chat-stream-123",
        });
        await delay(25);
        await streamWriter?.({
          id: "chatcmpl-role-model",
          object: "chat.completion.chunk",
          created: 1,
          model: "moonshot/kimi-k2.5",
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
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-chat-stream-123",
        });
        await delay(25);
        await streamWriter?.({
          id: "chatcmpl-role-model",
          object: "chat.completion.chunk",
          created: 1,
          model: "moonshot/kimi-k2.5",
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop",
            },
          ],
        }, {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-chat-stream-123",
        });
        executionCompleted = true;
        return {
          model: "moonshot/kimi-k2.5",
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
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
          model: "moonshot/kimi-k2.5",
          stream: true,
          messages: [{ role: "user", content: "Stream this." }],
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      expect(response.headers.get("x-role-model-endpoint-id")).toBe(
        "moonshot.personal.primary.global.kimi-k2.5",
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
          model: "moonshot/kimi-k2.5",
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
          model: "moonshot/kimi-k2.5",
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
          model: "moonshot/kimi-k2.5",
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

  test("forwards x-role-model-routing-mode to chat-completions execution", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    let requestOptions:
      | {
          routingModeOverride?: string;
        }
      | undefined;

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
            requestOptions?: {
              routingModeOverride?: string;
            },
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
      executeChatCompletions: async (_body, _requestId, _streamWriter, value) => {
        requestOptions = value;
        return {
          model: "moonshot/kimi-k2.5",
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-chat-routing-mode-123",
          outputText: "ok",
          finishReason: "stop",
          usage: {
            inputTokens: 1,
            outputTokens: 1,
          },
        };
      },
    });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-role-model-routing-mode": "baseline",
        },
        body: JSON.stringify({
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Respect the override." }],
        }),
      });

      expect(response.status).toBe(200);
      expect(requestOptions).toEqual({
        routingModeOverride: "baseline",
      });
    } finally {
      await server.close();
    }
  });

  test("rejects an invalid x-role-model-routing-mode header", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    let executionCalls = 0;
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
            requestOptions?: {
              routingModeOverride?: string;
            },
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
      executeChatCompletions: async () => {
        executionCalls += 1;
        return {
          model: "moonshot/kimi-k2.5",
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          adapterFamily: "ai-sdk-openai",
          routingDecisionId: "decision-chat-routing-mode-invalid",
          outputText: "unexpected",
          finishReason: "stop",
          usage: {
            inputTokens: 1,
            outputTokens: 1,
          },
        };
      },
    });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-role-model-routing-mode": "bogus",
        },
        body: JSON.stringify({
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Reject invalid overrides." }],
        }),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error:
          "Invalid x-role-model-routing-mode header value \"bogus\". Expected one of: baseline, difficulty, controller, hybrid.",
      });
      expect(executionCalls).toBe(0);
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
        model: "deepseek/chat-capture-v1",
        messages: [
          { role: "system", content: "Be concise." },
          { role: "user", content: "Summarize the chosen endpoint." },
        ],
      },
      "req-runtime-bridge-001",
    );

    expect(result.model).toBe("deepseek/chat-capture-v1");
    expect(result.endpointId).toBe("test.capture.chat-v1");
    expect(result.adapterFamily).toBe("ai-sdk-openai-compatible");
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

    const firstRequestId = "req-runtime-bridge-observation-001";
    const result = await backend.executeChatCompletions(
      {
        model: "deepseek/chat-capture-v1",
        messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
      },
      firstRequestId,
    );

    await expect(backend.readRequestObservation?.(firstRequestId)).resolves.toMatchObject({
      requestId: firstRequestId,
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

    const secondRequestId = "req-runtime-bridge-observation-002";
    await backend.executeChatCompletions(
      {
        model: "deepseek/chat-capture-v1",
        messages: [{ role: "user", content: "Summarize the chosen endpoint again." }],
      },
      secondRequestId,
    );

    await expect(backend.readRequestObservation?.(secondRequestId)).resolves.toMatchObject({
      requestId: secondRequestId,
      endpointId: result.endpointId,
      routingDiagnostics: {
        observedProfile: {
          endpointId: result.endpointId,
          source: "runtime-state",
          readMode: "per-request",
          measuredAtMs: expect.any(Number),
        },
        effectiveMetrics: {
          quality: expect.objectContaining({
            value: expect.any(Number),
            source: "measured",
            measuredAtMs: expect.any(Number),
            freshnessWeight: expect.any(Number),
          }),
          latency: expect.objectContaining({
            value: expect.any(Number),
            source: "measured",
            measuredAtMs: expect.any(Number),
            freshnessWeight: expect.any(Number),
          }),
          throughput: expect.objectContaining({
            value: expect.any(Number),
            source: "measured",
            measuredAtMs: expect.any(Number),
            freshnessWeight: expect.any(Number),
          }),
        },
        throughputPenalty: {
          endpointId: result.endpointId,
          active: false,
        },
      },
    });
  });

  test("persists routing-mode override and rewrite-skipped diagnostics for exact-model runtime-backed chat requests", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-routing-mode-tests-"));

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            executeChatCompletions: (
              body: Record<string, unknown>,
              requestId: string,
              streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
              requestOptions?: {
                routingModeOverride?: string;
              },
            ) => Promise<{
              endpointId: string;
            }>;
            readRequestObservation: (requestId: string) => Promise<unknown>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-host-routing-mode-tests",
      });

      const requestId = "req-runtime-bridge-routing-mode-001";
      await backend.executeChatCompletions(
        {
          model: "deepseek/chat-capture-v1",
          messages: [{ role: "user", content: "Keep the exact-model route and record the rewrite receipt." }],
        },
        requestId,
        undefined,
        {
          routingModeOverride: "baseline",
        },
      );

      await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
        requestId,
        routingDiagnostics: {
          routingMode: {
            source: "request-override",
            requestedOverride: "baseline",
            effectiveMode: "baseline",
          },
          rewrite: {
            requestedModel: "deepseek/chat-capture-v1",
            downstreamModelId: "deepseek/chat-capture-v1",
            applied: false,
            reason: "requested-model-matches-downstream",
          },
        },
      });
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("does not seed placeholder Anthropic/OpenAI accounts, endpoints, models, or router guidance in the default runtime bootstrap", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-default-fixture-tests-"));

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            registry: EndpointRegistryResult;
            listAccounts: () => Promise<
              readonly {
                providerAccountId: string;
              }[]
            >;
            listEndpoints: () => Promise<
              readonly {
                endpointId: string;
              }[]
            >;
            readRouterSummary: () => Promise<{
              controller?: {
                endpointId?: string | null;
              } | null;
              guidance?: {
                endpointId?: string | null;
                preferredEndpointIds?: readonly string[];
                ignoredEndpointIds?: readonly string[];
              } | null;
            }>;
            readRouterConfig: () => Promise<{
              controller?: {
                endpointId?: string | null;
              } | null;
              guidance?: {
                endpointId?: string | null;
                preferredEndpointIds?: readonly string[];
                ignoredEndpointIds?: readonly string[];
              } | null;
              policySources?: {
                roleBindings?: readonly {
                  endpoint_id: string;
                }[];
              };
            }>;
          }>;
          createModelListResponse: (value: EndpointRegistryResult) => {
            data: readonly {
              id: string;
            }[];
          };
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-host-default-fixture-tests",
      });

      const accounts = await backend.listAccounts();
      const endpoints = await backend.listEndpoints();
      const models = (
        bridge as {
          createModelListResponse: (value: EndpointRegistryResult) => { data: readonly { id: string }[] };
        }
      ).createModelListResponse(backend.registry);
      const routerSummary = await backend.readRouterSummary();
      const routerConfig = await backend.readRouterConfig();

      expect(accounts.map((account) => account.providerAccountId)).not.toEqual(
        expect.arrayContaining(["openai.personal.primary", "anthropic.team.shared"]),
      );
      expect(endpoints.map((endpoint) => endpoint.endpointId)).not.toEqual(
        expect.arrayContaining([
          "openai.personal.primary.us-east-1.fast",
          "anthropic.team.shared.us-east-1.default",
        ]),
      );
      expect(models.data.map((model) => model.id)).not.toEqual(
        expect.arrayContaining(["openai/gpt-4.1-mini-fast", "claude-3.7-sonnet"]),
      );
      expect(routerSummary.controller?.endpointId ?? "").not.toMatch(/openai|anthropic/);
      expect(routerSummary.guidance?.endpointId ?? "").not.toMatch(/openai|anthropic/);
      expect(routerSummary.guidance?.preferredEndpointIds ?? []).not.toEqual(
        expect.arrayContaining(["openai.personal.primary.us-east-1.fast"]),
      );
      expect(routerSummary.guidance?.ignoredEndpointIds ?? []).not.toEqual(
        expect.arrayContaining(["anthropic.team.shared.us-east-1.default"]),
      );
      expect(routerConfig.controller?.endpointId ?? "").not.toMatch(/openai|anthropic/);
      expect(routerConfig.guidance?.endpointId ?? "").not.toMatch(/openai|anthropic/);
      expect((routerConfig.policySources?.roleBindings ?? []).map((binding) => binding.endpoint_id)).not.toEqual(
        expect.arrayContaining(["openai.personal.primary.us-east-1.fast"]),
      );
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("persists alias-resolution diagnostics for runtime-backed chat requests", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-alias-tests-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        routing: {
          strategy: "balanced",
        },
        model_aliases: {
          "gpt-5.4": {
            model_ids: ["openai/gpt-4.1-mini-fast"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createDifficultyClassifierVendorScript("valid-hard")],
          providers: {
            openai: {
              api_key: "${OPENAI_API_KEY}",
              model_list: [
                {
                  model_name: "openai/gpt-4.1-mini-fast",
                  litellm_params: {
                    model: "openai/gpt-4.1-mini",
                  },
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-alias-tests",
      unifiedRuntimeConfigPath,
    });

    const requestId = "req-runtime-bridge-alias-001";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Route through the alias pool." }],
      },
      requestId,
    );

    await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
      requestId,
      routingDiagnostics: {
        aliasResolution: {
          requestedModel: "gpt-5.4",
          aliasId: "gpt-5.4",
          resolvedModelIds: ["openai/gpt-4.1-mini-fast"],
          allowEndpoints: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
        },
      },
    });
  });

  test("persists difficulty-routing diagnostics for runtime-backed chat requests", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-difficulty-tests-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        difficulty_classifier: {
          enabled: true,
          rubric_version: "v1",
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
          fallback_difficulty: "hard",
        },
        model_aliases: {
          "gpt-5.4": {
            mode: "difficulty",
            model_ids: ["openai/gpt-4.1-mini-fast"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createDifficultyClassifierVendorScript("valid-hard")],
          providers: {
            openai: {
              api_key: "${OPENAI_API_KEY}",
              model_list: [
                {
                  model_name: "openai/gpt-4.1-mini-fast",
                  max_difficulty: "hard",
                  litellm_params: {
                    model: "openai/gpt-4.1-mini",
                  },
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-difficulty-tests",
      unifiedRuntimeConfigPath,
    });

    const requestId = "req-runtime-bridge-difficulty-001";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [
          { role: "system", content: "Preserve strict schema compatibility." },
          {
            role: "user",
            content:
              "Analyze this code-edit workflow, apply multiple constraints, use the available tools, and verify the final contract end to end.",
          },
          { role: "assistant", content: "I will inspect the schema and update the implementation carefully." },
          {
            role: "user",
            content:
              "Now finish the refactor, update the tests, and validate the final output against the schema.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "readSchema",
              parameters: { type: "object", properties: {} },
            },
          },
          {
            type: "function",
            function: {
              name: "runTests",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      requestId,
    );

    await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
      requestId,
      routingDiagnostics: {
        aliasResolution: {
          requestedModel: "gpt-5.4",
          aliasId: "gpt-5.4",
          resolvedModelIds: ["openai/gpt-4.1-mini-fast"],
          allowEndpoints: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
        },
        difficultyRouting: expect.objectContaining({
          difficulty: "hard",
          strategy: "quality",
          fallbackApplied: false,
          rubricSignals: expect.objectContaining({
            toolCount: 2,
            historyTurnCount: 4,
            codeOrSchemaBurden: true,
          }),
        }),
      },
    });
  });

  test("allows an observed max-difficulty override when bucketed performance supports a harder request", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-difficulty-override-tests-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        observed_data: {
          difficulty_learning: {
            override: {
              min_samples: 4,
              max_failure_rate: 0.2,
              min_quality_score: 0.8,
              min_tokens_per_sec: 22,
            },
          },
        },
        difficulty_classifier: {
          enabled: true,
          rubric_version: "v1",
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
          fallback_difficulty: "easy",
        },
        model_aliases: {
          "gpt-5.4": {
            mode: "difficulty",
            model_ids: ["openai/gpt-4.1-mini-fast"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createDifficultyClassifierVendorScript("valid-hard")],
          providers: {
            openai: {
              api_key: "${OPENAI_API_KEY}",
              model_list: [
                {
                  model_name: "openai/gpt-4.1-mini-fast",
                  max_difficulty: "easy",
                  litellm_params: {
                    model: "openai/gpt-4.1-mini",
                  },
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const scopeId = "runtime-host-difficulty-override-tests";
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId,
      unifiedRuntimeConfigPath,
    });

    const databasePath = resolveSqliteMemoryLocation({
      runtimeStateRoot,
      scopeId,
    });
    const database = new DatabaseSync(databasePath);
    database
      .prepare(
        "INSERT INTO observed_profile_snapshots_by_difficulty (snapshot_id, endpoint_id, difficulty_bucket, measured_at_ms, profile_json) VALUES (?, ?, ?, ?, ?)",
      )
      .run(
        "override-hard-profile",
        "openai.litellm.global.openai-gpt-4-1-mini-fast",
        "hard",
        10_000,
        JSON.stringify({
          endpoint_id: "openai.litellm.global.openai-gpt-4-1-mini-fast",
          endpoint_version: "run27-override-v1",
          measured_at_ms: 10_000,
          measurement_window: {
            started_at_ms: 1_000,
            ended_at_ms: 2_000,
          },
          sample_size: 4,
          sources: {
            live_request_samples: 4,
            benchmark_samples: 0,
          },
          latency_ms_p50: 410,
          latency_ms_p95: 690,
          failure_rate: 0.08,
          freshness_score: 0.97,
          confidence_score: 0.95,
          quality_score: 0.84,
          tokens_per_sec: 25,
          cost_per_1k_tokens_est: 1.1,
          currency: "USD",
        }),
      );
    database.close();

    const requestId = "req-runtime-bridge-difficulty-override-001";
    await expect(
      backend.executeChatCompletions(
        {
          model: "gpt-5.4",
          messages: [
            { role: "system", content: "Preserve strict schema compatibility." },
            {
              role: "user",
              content:
                "Analyze this code-edit workflow, apply multiple constraints, use the available tools, and verify the final contract end to end.",
            },
            { role: "assistant", content: "I will inspect the schema and update the implementation carefully." },
            {
              role: "user",
              content:
                "Now finish the refactor, update the tests, and validate the final output against the schema.",
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "readSchema",
                parameters: { type: "object", properties: {} },
              },
            },
            {
              type: "function",
              function: {
                name: "runTests",
                parameters: { type: "object", properties: {} },
              },
            },
          ],
        },
        requestId,
      ),
    ).resolves.toMatchObject({
      endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
    });

    await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
      requestId,
      routingDiagnostics: {
        difficultyRouting: expect.objectContaining({
          difficulty: "hard",
          strategy: "quality",
          fallbackApplied: false,
          overrideAppliedEndpointIds: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
          overrideRecommendedMaxDifficultyByEndpointId: {
            "openai.litellm.global.openai-gpt-4-1-mini-fast": "hard",
          },
        }),
      },
    });
  });

  test("routes hard requests using bucketed observed profiles and records the selected difficulty bucket", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-difficulty-bucket-tests-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        difficulty_classifier: {
          enabled: true,
          rubric_version: "v1",
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
          fallback_difficulty: "easy",
        },
        model_aliases: {
          "gpt-5.4": {
            mode: "difficulty",
            model_ids: ["openai/gpt-4.1-mini-fast", "claude-3.7-sonnet"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createDifficultyClassifierVendorScript("valid-hard")],
          providers: {
            openai: {
              api_key: "${OPENAI_API_KEY}",
              model_list: [
                {
                  model_name: "openai/gpt-4.1-mini-fast",
                  max_difficulty: "hard",
                  litellm_params: {
                    model: "openai/gpt-4.1-mini",
                  },
                },
              ],
            },
            anthropic: {
              api_key: "${ANTHROPIC_API_KEY}",
              model_list: [
                {
                  model_name: "claude-3.7-sonnet",
                  max_difficulty: "hard",
                  litellm_params: {
                    model: "anthropic/claude-3.7-sonnet",
                  },
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const scopeId = "runtime-host-difficulty-bucket-tests";
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId,
      unifiedRuntimeConfigPath,
    });

    const databasePath = resolveSqliteMemoryLocation({
      runtimeStateRoot,
      scopeId,
    });
    const database = new DatabaseSync(databasePath);
    const insertProfile = database.prepare(
      "INSERT INTO observed_profile_snapshots (snapshot_id, endpoint_id, measured_at_ms, profile_json) VALUES (?, ?, ?, ?)",
    );
    const insertBucketedProfile = database.prepare(
      "INSERT INTO observed_profile_snapshots_by_difficulty (snapshot_id, endpoint_id, difficulty_bucket, measured_at_ms, profile_json) VALUES (?, ?, ?, ?, ?)",
    );
    const buildProfile = (
      endpointId: string,
      measuredAtMs: number,
      qualityScore: number,
      failureRate: number,
      tokensPerSec: number,
      latencyMsP50: number,
      latencyMsP95: number,
    ) => ({
      endpoint_id: endpointId,
      endpoint_version: "run27-bucket-v1",
      measured_at_ms: measuredAtMs,
      measurement_window: {
        started_at_ms: measuredAtMs - 1_000,
        ended_at_ms: measuredAtMs,
      },
      sample_size: 5,
      sources: {
        live_request_samples: 5,
        benchmark_samples: 0,
      },
      latency_ms_p50: latencyMsP50,
      latency_ms_p95: latencyMsP95,
      failure_rate: failureRate,
      freshness_score: 0.97,
      confidence_score: 0.95,
      quality_score: qualityScore,
      tokens_per_sec: tokensPerSec,
      cost_per_1k_tokens_est: 1,
      currency: "USD",
    });

    insertProfile.run(
      "bucket-endpoint-openai",
      "openai.litellm.global.openai-gpt-4-1-mini-fast",
      10_000,
      JSON.stringify(
        buildProfile("openai.litellm.global.openai-gpt-4-1-mini-fast", 10_000, 0.96, 0.02, 36, 180, 280),
      ),
    );
    insertProfile.run(
      "bucket-endpoint-anthropic",
      "anthropic.litellm.global.claude-3-7-sonnet",
      10_100,
      JSON.stringify(
        buildProfile("anthropic.litellm.global.claude-3-7-sonnet", 10_100, 0.42, 0.05, 12, 700, 980),
      ),
    );
    insertBucketedProfile.run(
      "bucket-hard-openai",
      "openai.litellm.global.openai-gpt-4-1-mini-fast",
      "hard",
      11_000,
      JSON.stringify(
        buildProfile("openai.litellm.global.openai-gpt-4-1-mini-fast", 11_000, 0.28, 0.24, 9, 880, 1_120),
      ),
    );
    insertBucketedProfile.run(
      "bucket-hard-anthropic",
      "anthropic.litellm.global.claude-3-7-sonnet",
      "hard",
      11_100,
      JSON.stringify(
        buildProfile("anthropic.litellm.global.claude-3-7-sonnet", 11_100, 0.97, 0.01, 27, 260, 390),
      ),
    );
    database.close();

    const requestId = "req-runtime-bridge-difficulty-bucket-001";
    await expect(
      backend.executeChatCompletions(
        {
          model: "gpt-5.4",
          messages: [
            { role: "system", content: "Preserve strict schema compatibility." },
            {
              role: "user",
              content:
                "Analyze this code-edit workflow, apply multiple constraints, use the available tools, and verify the final contract end to end.",
            },
            { role: "assistant", content: "I will inspect the schema and update the implementation carefully." },
            {
              role: "user",
              content:
                "Now finish the refactor, update the tests, and validate the final output against the schema.",
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "readSchema",
                parameters: { type: "object", properties: {} },
              },
            },
            {
              type: "function",
              function: {
                name: "runTests",
                parameters: { type: "object", properties: {} },
              },
            },
          ],
        },
        requestId,
      ),
    ).resolves.toMatchObject({
      endpointId: "anthropic.litellm.global.claude-3-7-sonnet",
    });

    await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
      requestId,
      endpointId: "anthropic.litellm.global.claude-3-7-sonnet",
      routingDiagnostics: {
        difficultyRouting: expect.objectContaining({
          difficulty: "hard",
          strategy: "quality",
          fallbackApplied: false,
        }),
        observedProfile: {
          endpointId: "anthropic.litellm.global.claude-3-7-sonnet",
          source: "runtime-state",
          readMode: "per-request",
          difficultyBucket: "hard",
          bucketOverrideApplied: true,
          measuredAtMs: 11_100,
        },
      },
    });
  });

  test("uses the configured remote classifier result for difficulty-mode runtime-backed chat requests", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-difficulty-classifier-tests-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        difficulty_classifier: {
          enabled: true,
          rubric_version: "v1",
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
          fallback_difficulty: "easy",
        },
        model_aliases: {
          "gpt-5.4": {
            mode: "difficulty",
            model_ids: ["openai/gpt-4.1-mini-fast"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createDifficultyClassifierVendorScript("valid-hard")],
          providers: {
            openai: {
              api_key: "${OPENAI_API_KEY}",
              model_list: [
                {
                  model_name: "openai/gpt-4.1-mini-fast",
                  max_difficulty: "hard",
                  litellm_params: {
                    model: "openai/gpt-4.1-mini",
                  },
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-difficulty-classifier-tests",
      unifiedRuntimeConfigPath,
    });

    const requestId = "req-runtime-bridge-difficulty-classifier-001";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Say hello in one short sentence." }],
      },
      requestId,
    );

    await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
      requestId,
      routingDiagnostics: {
        difficultyRouting: expect.objectContaining({
          difficulty: "hard",
          strategy: "quality",
          fallbackApplied: false,
        }),
      },
    });
  });

  test("uses the configured remote controller result for intelligent runtime-backed chat requests", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-controller-tests-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        controller: {
          enabled: true,
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
        },
        model_aliases: {
          "gpt-5.4": {
            mode: "intelligent",
            model_ids: ["openai/gpt-4.1-mini-fast"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createControllerVendorScript()],
          providers: {
            openai: {
              api_key: "${OPENAI_API_KEY}",
              model_list: [
                {
                  model_name: "openai/gpt-4.1-mini-fast",
                  max_difficulty: "hard",
                  litellm_params: {
                    model: "openai/gpt-4.1-mini",
                  },
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-controller-tests",
      unifiedRuntimeConfigPath,
    });

    const requestId = "req-runtime-bridge-controller-001";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Prepare a patch plan and preserve the existing contract." }],
      },
      requestId,
    );

    await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
      requestId,
      routingDiagnostics: {
        controllerRouting: {
          active: true,
          acceptedDirectives: {
            strategy: "quality",
            preferLocal: true,
          },
        },
      },
    });
  });

  test("persists alias-default hybrid arbitration and rewrite-applied diagnostics for runtime-backed chat requests", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-hybrid-tests-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        difficulty_classifier: {
          enabled: true,
          rubric_version: "v1",
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
          fallback_difficulty: "easy",
        },
        controller: {
          enabled: true,
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
        },
        model_aliases: {
          "gpt-5.4-hybrid": {
            mode: "hybrid",
            model_ids: ["openai/gpt-4.1-mini-fast"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createHybridArbitrationVendorScript()],
          providers: {
            openai: {
              api_key: "${OPENAI_API_KEY}",
              model_list: [
                {
                  model_name: "openai/gpt-4.1-mini-fast",
                  max_difficulty: "hard",
                  litellm_params: {
                    model: "openai/gpt-4.1-mini",
                  },
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-hybrid-tests",
      unifiedRuntimeConfigPath,
    });

    const requestId = "req-runtime-bridge-hybrid-001";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4-hybrid",
        messages: [{ role: "user", content: "Choose the best path for a short coding request." }],
      },
      requestId,
    );

    await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
      requestId,
      routingDiagnostics: {
        routingMode: {
          source: "alias-default",
          aliasMode: "hybrid",
          effectiveMode: "hybrid",
        },
        difficultyRouting: {
          difficulty: "easy",
          strategy: "cost",
        },
        controllerRouting: {
          active: true,
          acceptedDirectives: {
            strategy: "quality",
            preferLocal: true,
          },
        },
        hybridArbitration: {
          active: true,
          difficultyStrategy: "cost",
          finalStrategy: "quality",
          controllerChangedPlan: true,
          dominantSignal: "controller",
        },
        rewrite: {
          requestedModel: "gpt-5.4-hybrid",
          downstreamModelId: "openai/gpt-4.1-mini-fast",
          applied: true,
          reason: "requested-model-rewritten-for-selected-endpoint",
        },
      },
    });
  });

  test("falls back deterministically when the configured classifier times out", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-difficulty-timeout-tests-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        difficulty_classifier: {
          enabled: true,
          rubric_version: "v1",
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1,
          fallback_difficulty: "medium",
        },
        model_aliases: {
          "gpt-5.4": {
            mode: "difficulty",
            model_ids: ["openai/gpt-4.1-mini-fast"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createDifficultyClassifierVendorScript("slow-hard")],
          providers: {
            openai: {
              api_key: "${OPENAI_API_KEY}",
              model_list: [
                {
                  model_name: "openai/gpt-4.1-mini-fast",
                  max_difficulty: "hard",
                  litellm_params: {
                    model: "openai/gpt-4.1-mini",
                  },
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-difficulty-timeout-tests",
      unifiedRuntimeConfigPath,
    });

    const requestId = "req-runtime-bridge-difficulty-timeout-001";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Say hello in one short sentence." }],
      },
      requestId,
    );

    await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
      requestId,
      routingDiagnostics: {
        difficultyRouting: expect.objectContaining({
          difficulty: "medium",
          strategy: "balanced",
          fallbackApplied: true,
          fallbackReason: "classifier-timeout",
        }),
      },
    });
  });

  test("reuses cached difficulty classification for repeated requests in the same conversation when invalidation thresholds are not exceeded", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-difficulty-cache-tests-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        observed_data: {
          difficulty_learning: {
            invalidation: {
              max_context_tokens_delta: 4000,
              max_history_turn_delta: 4,
              max_tool_count_delta: 2,
              max_instruction_constraint_delta: 8,
              max_decomposition_keyword_delta: 8,
              reclassify_on_code_or_schema_change: false,
            },
          },
        },
        difficulty_classifier: {
          enabled: true,
          rubric_version: "v1",
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
          fallback_difficulty: "easy",
        },
        model_aliases: {
          "gpt-5.4": {
            mode: "difficulty",
            model_ids: ["openai/gpt-4.1-mini-fast"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createSequencedDifficultyClassifierVendorScript()],
          providers: {
            openai: {
              api_key: "${OPENAI_API_KEY}",
              model_list: [
                {
                  model_name: "openai/gpt-4.1-mini-fast",
                  max_difficulty: "hard",
                  litellm_params: {
                    model: "openai/gpt-4.1-mini",
                  },
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-difficulty-cache-tests",
      unifiedRuntimeConfigPath,
    });

    const firstRequestId = "req-runtime-bridge-difficulty-cache-001";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [
          {
            role: "user",
            content: "Read the schema, use both tools, then refactor the implementation carefully.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "readSchema",
              parameters: { type: "object", properties: {} },
            },
          },
          {
            type: "function",
            function: {
              name: "runTests",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      firstRequestId,
    );

    await expect(backend.readRequestObservation(firstRequestId)).resolves.toMatchObject({
      requestId: firstRequestId,
      routingDiagnostics: {
        difficultyRouting: expect.objectContaining({
          difficulty: "hard",
          strategy: "quality",
          fallbackApplied: false,
        }),
      },
    });

    const secondRequestId = "req-runtime-bridge-difficulty-cache-002";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Summarize the answer in one sentence." }],
      },
      secondRequestId,
    );

    await expect(backend.readRequestObservation(secondRequestId)).resolves.toMatchObject({
      requestId: secondRequestId,
      routingDiagnostics: {
        difficultyRouting: expect.objectContaining({
          difficulty: "hard",
          strategy: "quality",
          fallbackApplied: false,
          cacheHit: true,
        }),
      },
    });
  });

  test("reports cache invalidation reasons before reclassifying a repeated request", async () => {
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-difficulty-invalidation-tests-"));
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        observed_data: {
          difficulty_learning: {
            invalidation: {
              max_context_tokens_delta: 4000,
              max_history_turn_delta: 4,
              max_tool_count_delta: 2,
              max_instruction_constraint_delta: 8,
              max_decomposition_keyword_delta: 8,
              reclassify_on_code_or_schema_change: true,
            },
          },
        },
        difficulty_classifier: {
          enabled: true,
          rubric_version: "v1",
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
          fallback_difficulty: "easy",
        },
        model_aliases: {
          "gpt-5.4": {
            mode: "difficulty",
            model_ids: ["openai/gpt-4.1-mini-fast"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createSequencedDifficultyClassifierVendorScript()],
          providers: {
            openai: {
              api_key: "${OPENAI_API_KEY}",
              model_list: [
                {
                  model_name: "openai/gpt-4.1-mini-fast",
                  max_difficulty: "hard",
                  litellm_params: {
                    model: "openai/gpt-4.1-mini",
                  },
                },
              ],
            },
          },
        },
      }),
      "utf8",
    );

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-difficulty-invalidation-tests",
      unifiedRuntimeConfigPath,
    });

    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [
          {
            role: "user",
            content: "Read the schema, use both tools, then refactor the implementation carefully.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "readSchema",
              parameters: { type: "object", properties: {} },
            },
          },
          {
            type: "function",
            function: {
              name: "runTests",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      "req-runtime-bridge-difficulty-invalidation-001",
    );

    const requestId = "req-runtime-bridge-difficulty-invalidation-002";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [{ role: "user", content: "Summarize the answer in one sentence." }],
      },
      requestId,
    );

    await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
      requestId,
      routingDiagnostics: {
        difficultyRouting: expect.objectContaining({
          difficulty: "easy",
          strategy: "cost",
          fallbackApplied: false,
          cacheInvalidated: true,
          cacheInvalidationReasons: expect.arrayContaining(["code-or-schema-change"]),
        }),
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
      endpointId: "test.capture.chat-v1",
      modelId: "deepseek/chat-capture-v1",
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
        model: "deepseek/chat-capture-v1",
        input: "Summarize the chosen endpoint.",
      },
      "req-runtime-bridge-responses-001",
    );

    expect(result.responseId).toBe("resp_test_01");
    expect(result.model).toBe("deepseek/chat-capture-v1");
    expect(result.endpointId).toBe("test.capture.chat-v1");
    expect(result.adapterFamily).toBe("ai-sdk-openai-compatible");
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
          model: "deepseek/chat-capture-v1",
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
            endpointId: "test.capture.chat-v1",
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
            endpointId: "test.capture.chat-v1",
            sourceType: "remote",
            providerFamily: "ai-sdk-openai-compatible",
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
            endpointId: "test.capture.chat-v1",
            sourceType: "remote",
            providerFamily: "ai-sdk-openai-compatible",
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
          endpointId: "test.capture.chat-v1",
          sourceType: "remote",
          capturePolicy: expect.objectContaining({
            structuredInspectionAvailable: true,
          }),
        }),
      );

      const endpointProfileResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/endpoints/test.capture.chat-v1/profile`,
      );
      expect(endpointProfileResponse.status).toBe(200);
      expect(await endpointProfileResponse.json()).toEqual(
        expect.objectContaining({
          endpointId: "test.capture.chat-v1",
          latestProfile: expect.objectContaining({
            endpoint_id: "test.capture.chat-v1",
          }),
        }),
      );
    } finally {
      await server.close();
    }
  });

  test("reads bucketed endpoint profiles with an advisory max-difficulty recommendation", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-host-difficulty-"));
    const scopeId = "runtime-host-difficulty-profile-tests";
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          readEndpointProfile?: (endpointId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId,
    });

    expect(typeof backend.readEndpointProfile).toBe("function");

    const endpointId = "moonshot.personal.primary.global.kimi-k2.5";
    const databasePath = resolveSqliteMemoryLocation({
      runtimeStateRoot,
      scopeId,
    });
    const database = new DatabaseSync(databasePath);
    const insertProfile = database.prepare(
      "INSERT INTO observed_profile_snapshots_by_difficulty (snapshot_id, endpoint_id, difficulty_bucket, measured_at_ms, profile_json) VALUES (?, ?, ?, ?, ?)",
    );
    const baseProfile = {
      endpoint_id: endpointId,
      endpoint_version: "run27-bridge-test-v1",
      measurement_window: {
        started_at_ms: 1_000,
        ended_at_ms: 2_000,
      },
      freshness_score: 0.97,
      confidence_score: 0.95,
      latency_ms_p50: 420,
      latency_ms_p95: 710,
      sources: {
        live_request_samples: 4,
        benchmark_samples: 0,
      },
      currency: "USD",
    };

    insertProfile.run(
      "bridge-snapshot-easy",
      endpointId,
      "easy",
      10_000,
      JSON.stringify({
        ...baseProfile,
        measured_at_ms: 10_000,
        sample_size: 5,
        failure_rate: 0.03,
        quality_score: 0.93,
        tokens_per_sec: 34,
        cost_per_1k_tokens_est: 0.9,
      }),
    );
    insertProfile.run(
      "bridge-snapshot-medium",
      endpointId,
      "medium",
      11_000,
      JSON.stringify({
        ...baseProfile,
        measured_at_ms: 11_000,
        sample_size: 4,
        failure_rate: 0.14,
        quality_score: 0.84,
        tokens_per_sec: 24,
        cost_per_1k_tokens_est: 1.1,
      }),
    );
    insertProfile.run(
      "bridge-snapshot-hard",
      endpointId,
      "hard",
      12_000,
      JSON.stringify({
        ...baseProfile,
        measured_at_ms: 12_000,
        sample_size: 4,
        failure_rate: 0.28,
        quality_score: 0.83,
        tokens_per_sec: 27,
        cost_per_1k_tokens_est: 1.6,
      }),
    );
    database.close();

    const profile = await backend.readEndpointProfile?.(endpointId);

    expect(profile).toEqual(
      expect.objectContaining({
        endpointId,
        difficultyProfiles: expect.objectContaining({
          easy: expect.objectContaining({
            sample_size: 5,
          }),
          medium: expect.objectContaining({
            sample_size: 4,
          }),
          hard: expect.objectContaining({
            sample_size: 4,
          }),
        }),
        advisoryMaxDifficultyRecommendation: expect.objectContaining({
          recommendedMaxDifficulty: "medium",
          evaluations: expect.objectContaining({
            hard: expect.objectContaining({
              eligible: false,
              rejectionReasons: ["max-failure-rate"],
            }),
          }),
        }),
      }),
    );
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
          model: "deepseek/chat-capture-v1",
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
