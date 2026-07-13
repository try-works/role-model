import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, test, vi } from "vitest";
import { stringify } from "yaml";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import { canonicalTaxonomy } from "@role-model-router/core";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { createRuntimeObservationBundle } from "@role-model-router/runtime-observability";
import {
  initializeSqliteMemory,
  listProviderAccounts,
  listRuntimeEndpoints,
  persistRuntimeObservationBundle,
  persistRuntimeTelemetryFailure,
  resolveSqliteMemoryLocation,
  upsertRuntimeEndpoint,
  upsertProviderAccount as upsertSqliteProviderAccount,
} from "@role-model-router/sqlite-memory";
import { executeToolCalls } from "@role-model-router/tool-registry";
import { runRuntimeAdapterValidation } from "../../../packages/adapter-execution/src/cli.ts";
import { buildRoutableInventory } from "../src/routable-inventory.js";

import {
  bootstrapQaControlPlane,
  createQaCanonicalRoleIds,
  createQaFixtureRoot,
  createQaRuntimeBridgeBackendOptions,
  createQaRuntimeConfigPath,
  createQaRuntimeConfigText,
  createQaServerOptions,
  shouldBootstrapQaPlaceholderControlPlane,
} from "../scripts/start-for-qa.ts";
import * as cli from "../src/cli.js";
import * as bridge from "../src/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
const testFixtureRoot = path.join(__dirname, "fixtures");

function splitPathSegments(value: string): string[] {
  return value.split(/[\\/]+/).filter((segment) => segment.length > 0);
}

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

function createControllerVendorScript(options?: { readonly responseDelayMs?: number }): string {
  const responseDelayMs = options?.responseDelayMs ?? 0;
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");const respond=()=>{res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-controller-remote",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content:isController?JSON.stringify({strategy:\"quality\",preferLocal:true}):"alias remote summary"},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16},_hidden_params:{response_cost:0.0012,cache_hit:false}}));};if(${responseDelayMs}>0){setTimeout(respond,${responseDelayMs});return;}respond();});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

function createControllerRetryVendorScript(): string {
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");const isCompactRetry=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER_COMPACT");const isHardCase=joinedMessages.includes("runtime routing regression");const message=isController&&isHardCase&&!isCompactRetry?{role:"assistant",content:""}:{role:"assistant",content:isController?JSON.stringify({requestedRoleId:"coder",taskType:"coder.edit",requiredCapabilities:["code.write"],preferredCapabilities:["reasoning.multi_step"],strategy:"quality"}):"alias remote summary"};const finishReason=isController&&isHardCase&&!isCompactRetry?"length":"stop";res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-controller-retry",object:"chat.completion",choices:[{index:0,message,finish_reason:finishReason}],usage:{prompt_tokens:12,completion_tokens:isController&&isHardCase&&!isCompactRetry?1024:32,total_tokens:128}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

function createControllerInvalidVendorScript(): string {
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");const content=isController?"This looks like coding work that should use the strongest remote code path and careful reasoning.":"alias remote summary";res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-controller-invalid",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:24,total_tokens:36}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

function createHybridArbitrationVendorScript(): string {
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isClassifier=joinedMessages.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");const content=isController?JSON.stringify({strategy:"quality",preferLocal:true}):(isClassifier?JSON.stringify({difficulty:"easy"}):"hybrid alias remote summary");res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-hybrid-remote",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16},_hidden_params:{response_cost:0.0012,cache_hit:false}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

function createSequencedDifficultyClassifierVendorScript(): string {
  return `const http=require("node:http");let classifierCalls=0;const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isClassifier=joinedMessages.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");if(isClassifier){classifierCalls+=1;}const difficulty=isClassifier?(classifierCalls===1?"hard":"easy"):null;res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-difficulty-sequenced",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content:isClassifier?JSON.stringify({difficulty}):"alias remote summary"},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16},_hidden_params:{response_cost:0.0012,cache_hit:false}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

function createLlamaSwapRunningModelsVendorScript(input: {
  readonly models: Readonly<Record<string, { readonly cmd?: string }>>;
}): string {
  return `const http=require("node:http");const models=${JSON.stringify(input.models)};const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health"){res.statusCode=200;res.setHeader("content-type","application/json");res.end(JSON.stringify({ok:true}));return;}if(req.url==="/running"){res.statusCode=200;res.setHeader("content-type","application/json");res.end(JSON.stringify({models}));return;}res.statusCode=404;res.setHeader("content-type","application/json");res.end(JSON.stringify({error:"not found"}));});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

describe("runtime-host-bridge", () => {
  test("summarizes selection diagnostics when a tie-break chooses the winner inside the score epsilon", () => {
    const selection = bridge.summarizeSelectionDiagnosticsFromDecision({
      routing_decision_id: "decision-test-tie-break",
      request_id: "req-test-tie-break",
      app_id: "test-app",
      org_id: null,
      policy_snapshot: {
        policy_id: "quality-policy",
        strategy: "quality",
        compute_preference: "auto",
        prefer_local: false,
        budget_mode: "disabled",
        tie_break_order: ["quality", "latency_ms", "reliability", "endpoint_id"],
        required_capabilities: ["code.edit"],
        required_modalities: ["text"],
        require_tools: false,
        deny_endpoints: [],
        allow_endpoints: ["kimi", "pro"],
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
      scored_candidates: [
        {
          endpoint_id: "kimi",
          total_score: 0.8204552492682547,
          metric_breakdown: {} as never,
          tie_break: {
            quality: 0.9285714285714286,
            latency_ms: 47200.625,
            reliability: 0.9941283473114646,
            endpoint_id: "kimi",
          },
        },
        {
          endpoint_id: "pro",
          total_score: 0.8252557768137551,
          metric_breakdown: {} as never,
          tie_break: {
            quality: 0.8761904761904761,
            latency_ms: 9655.025,
            reliability: 0.9937887531154296,
            endpoint_id: "pro",
          },
        },
      ],
      chosen_endpoint_id: "kimi",
      fallback_endpoint_ids: ["pro"],
      selection_reasons: ["BEST_TOTAL_SCORE"],
      used_measured: true,
      used_declared: true,
      scoring_version: "baseline-v2",
    });

    expect(selection).toEqual({
      mode: "tie-break",
      scoreTieEpsilon: 0.01,
      scoreDelta: expect.closeTo(0.004800527545500379, 12),
      winnerEndpointId: "kimi",
      winnerTotalScore: 0.8204552492682547,
      runnerUpEndpointId: "pro",
      runnerUpTotalScore: 0.8252557768137551,
      tieBreakOrder: ["quality", "latency_ms", "reliability", "endpoint_id"],
    });
  });

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

  test("adds compact Pi-compatible capability metadata to v1 model-list records", () => {
    const catalog = {
      catalogVersion: "test-catalog",
      source: {
        vendor: "test",
        commit: "test",
        capturedAt: "2026-06-22T00:00:00.000Z",
        schemaVersion: "test.v1",
      },
      providers: [],
      models: [
        {
          modelId: "moonshot/kimi-k2.5",
          providerId: "moonshot",
          providerKind: "provider-openai",
          authFamily: "api-key",
          displayName: "Kimi K2.5",
          version: "test",
          capabilities: ["text.chat", "tools.function_calling", "reasoning", "structured.output"],
          modalities: ["text", "image", "video"],
          contextWindow: 262_144,
          maxOutputTokens: 262_144,
          pricing: null,
          requestShapeHints: null,
          experimentalModes: [],
          extendsProvenance: { baseModelId: null, chain: [] },
          localOverrideApplied: false,
          localNotes: [],
          upstreamProvenance: {
            vendor: "test",
            commit: "test",
            capturedAt: "2026-06-22T00:00:00.000Z",
            schemaVersion: "test.v1",
          },
        },
      ],
    } as NormalizedCatalog;

    const result = (
      bridge as {
        createModelListResponse: (
          value: EndpointRegistryResult,
          modelAliases: readonly {
            aliasId: string;
            mode?: string;
            modelIds: readonly string[];
          }[],
          inventory: null,
          catalog: NormalizedCatalog,
          baseUrl: string,
        ) => {
          data: readonly Array<Record<string, unknown>>;
        };
      }
    ).createModelListResponse(
      registry,
      [
        {
          aliasId: "hybrid.hybrid",
          mode: "hybrid",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      null,
      catalog,
      "http://127.0.0.1:3456",
    );

    const alias = result.data.find((entry) => entry.id === "hybrid.hybrid");
    expect(alias).toMatchObject({
      id: "hybrid.hybrid",
      context_window: 262_144,
      max_tokens: 262_144,
      input: ["text", "image"],
      input_modalities: ["image", "text", "video"],
      output_modalities: ["text"],
      role_model: {
        type: "alias",
        routing_mode: "hybrid",
        discovery_url: "http://127.0.0.1:3456/api/role-model/downstream/openai",
        context_window: 262_144,
        max_tokens: 262_144,
        input_modalities: ["image", "text", "video"],
        tools: { function_calling: true },
        reasoning: { supported: true, effort_control: true },
        structured_output: { supported: true },
      },
    });
    expect(
      typeof (alias?.role_model as { capability_revision?: unknown })?.capability_revision,
    ).toBe("string");
  });

  test("builds request-time routing telemetry snapshots from live routing candidates", () => {
    expect(
      typeof (bridge as { buildRuntimeTelemetrySnapshot?: unknown }).buildRuntimeTelemetrySnapshot,
    ).toBe("function");

    const snapshot = (
      bridge as {
        buildRuntimeTelemetrySnapshot: (input: {
          routed: Record<string, unknown>;
          execution: Record<string, unknown>;
          requestOperation: string;
          requestedModelId?: string;
          roleIds?: readonly string[];
          toolingUsed?: boolean;
        }) => Record<string, unknown>;
      }
    ).buildRuntimeTelemetrySnapshot({
      routed: {
        decision: {
          chosen_endpoint_id: "remote.fast",
          fallback_endpoint_ids: ["local.free"],
          scored_candidates: [{ endpoint_id: "remote.fast" }, { endpoint_id: "local.free" }],
        },
        projected: {
          routeInput: {
            candidates: [
              {
                identity: {
                  endpoint_id: "remote.fast",
                  endpoint_kind: "remote_api",
                  provider_kind: "remote_openai_compat",
                  serving_source: "remote-service",
                  model_id: "provider/fast",
                  region: "us-east-1",
                },
                status: "active",
              },
              {
                identity: {
                  endpoint_id: "local.free",
                  endpoint_kind: "local_engine",
                  provider_kind: "gguf",
                  serving_source: "local-process",
                  model_id: "local/free",
                  region: "local",
                },
                status: "active",
              },
            ],
          },
        },
        catalogEconomicsByEndpointId: {
          "remote.fast": {
            canonicalModelId: "provider/fast",
            tokenEconomicsSource: "catalog",
            inputPer1M: 5,
            outputPer1M: 15,
            estimatedRequestUsd: 0.004,
            cost_per_1k_tokens_est: 0.004,
          },
          "local.free": {
            canonicalModelId: "local/free",
            tokenEconomicsSource: "local-free",
            inputPer1M: 0,
            outputPer1M: 0,
            estimatedRequestUsd: 0.01,
            cost_per_1k_tokens_est: 0.01,
          },
        },
      },
      execution: {
        target: {
          endpointId: "remote.fast",
          modelId: "provider/fast",
          providerId: "provider",
          providerAccountId: "provider.personal",
          candidate: {
            identity: {
              endpoint_kind: "remote_api",
              serving_source: "remote-service",
              region: "us-east-1",
            },
            status: "active",
          },
          account: {
            healthStatus: "healthy",
          },
        },
        normalized: {
          promptCache: {
            requested: true,
            used: true,
            readTokens: 100,
            writeTokens: 0,
          },
          toolCalls: [],
        },
      },
      requestOperation: "chat",
      requestedModelId: "hybrid.remote-only",
      roleIds: ["general.chat"],
      toolingUsed: false,
    });

    expect(snapshot).toEqual(
      expect.objectContaining({
        providerId: "provider",
        providerAccountId: "provider.personal",
        sourceType: "remote",
        endpointKind: "remote_api",
        servingSource: "remote-service",
        selectedModelId: "provider/fast",
        requestedModelId: "hybrid.remote-only",
        requestOperation: "chat",
        roleIds: ["general.chat"],
        toolingUsed: false,
        cacheState: "hit",
        eligibleEndpointIds: ["remote.fast", "local.free"],
        eligibleModelIds: ["provider/fast", "local/free"],
        selectedUncachedCostUsd: 0.004,
        baselineMaxEligibleCostUsd: 0.01,
        routingCostSavingsUsd: 0.006,
        cacheCostSavingsUsd: 0.0005,
        totalAvoidedCostUsd: 0.0065,
        costBaselineSource: "eligible_candidate_max",
        costSavingsSupport: "full",
      }),
    );
    expect(snapshot.candidateCostSnapshot).toEqual(
      expect.objectContaining({
        "remote.fast": expect.objectContaining({
          modelId: "provider/fast",
          providerId: "provider",
          sourceType: "remote",
          estimatedRequestUsd: 0.004,
        }),
        "local.free": expect.objectContaining({
          modelId: "local/free",
          providerKind: "gguf",
          sourceType: "local",
          estimatedRequestUsd: 0.01,
        }),
      }),
    );
  });

  test("builds QA bootstrap options with router surfaces and complete fixtures", () => {
    const readRouterSummary = async () => ({ section: "router-summary" });
    const readRouterConfig = async () => ({ section: "router-config" });
    const listRouterCandidates = async () => [{ candidateId: "cand-1" }];
    const listRouterDecisions = async () => [{ requestId: "req-1" }];
    const readRouterDecision = async (requestId: string) => ({ requestId });
    const readRolePolicy = async () => ({
      roleDefinitions: [],
      taskDefinitions: [],
    });
    const createRolePolicyRole = async () => ({ role_id: "qa.reviewer" });
    const updateRolePolicyRole = async () => ({ role_id: "qa.reviewer" });
    const listTaskDefinitions = async () => [];
    const updateTaskDefinitions = async () => [];
    const listModels = async () => [];
    const listProviderDeviceAuthorizations = async () => [];
    const getLocalLogs = async () => ({ logs: "local log line" });
    const readModelOverrides = async () => ({});
    const updateModelOverrides = async () => ({});
    const readPeers = async () => [];
    const updatePeers = async () => [];
    const checkPeerHealth = async () => ({ healthy: true });
    const readVersionInfo = async () => ({
      version: "0.0.2",
      commit: "abc123",
      build_date: "2026-06-29T00:00:00.000Z",
    });
    const readBenchmarkSuite = async () => ({ cases: [] });
    const runBenchmark = async () => ({ runId: "run-1", status: "running" });
    const readBenchmarkRun = async () => ({ runId: "run-1", status: "completed" });
    const readActiveBenchmarkRun = async () => null;
    const clearBenchmarkEndpointData = async () => ({ deleted: 0 });
    const clearBenchmarkData = async () => ({ deleted: 0 });
    const readBenchmarkSummary = async () => ({ subjects: [] });
    const listBenchmarkRuns = async () => [];
    const readBenchmarkSummariesByMode = async () => ({ quick: null, full: null });
    const readBenchmarkPreferences = async () => ({ judgeEndpointId: null });
    const updateBenchmarkPreferences = async () => ({ judgeEndpointId: "endpoint-1" });

    const backend = {
      registry,
      readVersionInfo,
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
      listModels,
      listAccounts: async () => [],
      listProviderDeviceAuthorizations,
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
      listRecentRequestIds: async () => [],
      readRolePolicy,
      createRolePolicyRole,
      updateRolePolicyRole,
      listTaskDefinitions,
      updateTaskDefinitions,
      listEndpoints: async () => [],
      listRecentRequestObservations: async () => [],
      readRequestObservation: async () => ({ requestId: "req-1" }),
      readEndpointProfile: async () => ({
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
      }),
      listLocalModels: async () => [],
      loadLocalModel: async () => ({ success: true }),
      unloadLocalModel: async () => ({ success: true }),
      readLocalPolicy: async () => ({}),
      updateLocalPolicy: async () => ({}),
      listSwapHistory: async () => [],
      getLocalLogs,
      readModelOverrides,
      updateModelOverrides,
      readPeers,
      updatePeers,
      checkPeerHealth,
      readBenchmarkSuite,
      runBenchmark,
      readBenchmarkRun,
      readActiveBenchmarkRun,
      clearBenchmarkEndpointData,
      clearBenchmarkData,
      readBenchmarkSummary,
      listBenchmarkRuns,
      readBenchmarkSummariesByMode,
      readBenchmarkPreferences,
      updateBenchmarkPreferences,
      shutdown: async () => undefined,
    } as Parameters<typeof createQaServerOptions>[1];

    expect(createQaFixtureRoot(repoRoot)).toBe(
      path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
    );
    expect(createQaRuntimeConfigPath("D:\\qa-runtime")).toBe(
      path.join("D:\\qa-runtime", "runtime-config.yaml"),
    );
    expect(createQaRuntimeConfigText()).toContain("model_aliases:");
    expect(createQaRuntimeConfigText()).toContain("mixed.local-remote:");
    expect(createQaRuntimeConfigText()).toContain("lfm2.5-1.2b-instruct");
    expect(createQaRuntimeConfigText()).toContain("openai/gpt-4.1-mini-fast");
    expect(createQaRuntimeConfigText()).toContain("llama_swap:");
    expect(createQaRuntimeConfigText()).toContain("models:");
    expect(createQaRuntimeConfigText()).toContain("path: ./models/lfm2.5-1.2b-instruct.gguf");
    expect(createQaRuntimeConfigText()).toContain("litellm_proxy:");
    expect(createQaRuntimeConfigText()).toContain("providers:");

    const options = createQaServerOptions(repoRoot, backend);

    expect(options.staticRoot).toBe(
      path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
    );
    expect(options.readRouterSummary).toBe(readRouterSummary);
    expect(options.readRouterConfig).toBe(readRouterConfig);
    expect(options.listRouterCandidates).toBe(listRouterCandidates);
    expect(options.listRouterDecisions).toBe(listRouterDecisions);
    expect(options.readRouterDecision).toBe(readRouterDecision);
    expect(options.listRecentRequestIds).toBe(backend.listRecentRequestIds);
    expect(options.readRolePolicy).toBe(readRolePolicy);
    expect(options.createRolePolicyRole).toBe(createRolePolicyRole);
    expect(options.updateRolePolicyRole).toBe(updateRolePolicyRole);
    expect(options.listTaskDefinitions).toBe(listTaskDefinitions);
    expect(options.updateTaskDefinitions).toBe(updateTaskDefinitions);
    expect(options.listModels).toBe(listModels);
    expect(options.listProviderDeviceAuthorizations).toBe(listProviderDeviceAuthorizations);
    expect(options.getLocalLogs).toBe(getLocalLogs);
    expect(options.readModelOverrides).toBe(readModelOverrides);
    expect(options.updateModelOverrides).toBe(updateModelOverrides);
    expect(options.readPeers).toBe(readPeers);
    expect(options.updatePeers).toBe(updatePeers);
    expect(options.checkPeerHealth).toBe(checkPeerHealth);
    expect(options.readBenchmarkSuite).toBe(readBenchmarkSuite);
    expect(options.runBenchmark).toBe(runBenchmark);
    expect(options.readBenchmarkRun).toBe(readBenchmarkRun);
    expect(options.readActiveBenchmarkRun).toBe(readActiveBenchmarkRun);
    expect(options.clearBenchmarkEndpointData).toBe(clearBenchmarkEndpointData);
    expect(options.clearBenchmarkData).toBe(clearBenchmarkData);
    expect(options.readBenchmarkSummary).toBe(readBenchmarkSummary);
    expect(options.listBenchmarkRuns).toBe(listBenchmarkRuns);
    expect(options.readBenchmarkSummariesByMode).toBe(readBenchmarkSummariesByMode);
    expect(options.readBenchmarkPreferences).toBe(readBenchmarkPreferences);
    expect(options.updateBenchmarkPreferences).toBe(updateBenchmarkPreferences);
    expect(options.readVersionInfo).toBe(readVersionInfo);
  });

  test("builds QA backend options that start managed mock vendors for end-to-end Pi QA", () => {
    const runtimeStateRoot = path.join(os.tmpdir(), "role-model-runtime-host-qa-options-test");
    const scopeId = "runtime-qa";

    expect(createQaRuntimeBridgeBackendOptions(repoRoot, runtimeStateRoot, scopeId)).toEqual({
      fixtureRoot: createQaFixtureRoot(repoRoot),
      repoRoot,
      runtimeStateRoot,
      scopeId,
      unifiedRuntimeConfigPath: createQaRuntimeConfigPath(runtimeStateRoot),
      runtimeVendorStartup: "disabled",
    });
  });

  test("seeds QA runtime config with executable local and remote mock backend commands", () => {
    const config = createQaRuntimeConfigText();

    expect(config).toContain("llama_swap:");
    expect(config).toContain("litellm_proxy:");
  });

  test("seeds QA runtime config with canonical task capabilities for role-routed backend QA", () => {
    const config = createQaRuntimeConfigText();
    expect(config).toContain("version:");
    expect(config).toContain("routing:");
  });

  test("binds managed QA backends to canonical taxonomy roles for classified request QA", () => {
    const roleIds = createQaCanonicalRoleIds();

    expect(roleIds).toEqual(expect.arrayContaining(["analyst", "coder", "security"]));
    expect(roleIds.length).toBeGreaterThan(20);
  });

  test("does not bootstrap placeholder remote control-plane endpoints by default", () => {
    expect(shouldBootstrapQaPlaceholderControlPlane({})).toBe(false);
    expect(
      shouldBootstrapQaPlaceholderControlPlane({
        RUNTIME_QA_BOOTSTRAP_PLACEHOLDER_CONTROL_PLANE: "1",
      }),
    ).toBe(true);
  });

  test("bootstraps QA control-plane state for mixed local+remote routing proof", async () => {
    const calls: Array<{ kind: string; body: Record<string, unknown> }> = [];
    const backend = {
      upsertProviderAccount: async (body: Record<string, unknown>) => {
        calls.push({ kind: "account", body });
        return { providerAccountId: "moonshot.personal.primary" };
      },
      activateEndpoint: async (body: Record<string, unknown>) => {
        calls.push({ kind: "endpoint", body });
        return { endpointId: "moonshot.personal.primary.global.kimi-k2.5" };
      },
    };

    await bootstrapQaControlPlane(
      backend as Pick<
        Parameters<typeof createQaServerOptions>[1],
        "upsertProviderAccount" | "activateEndpoint"
      >,
    );

    const expectedCalls: Array<{ kind: string; body: Record<string, unknown> }> = [
      {
        kind: "account",
        body: {
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
              roleIds: ["general.chat"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      },
      {
        kind: "endpoint",
        body: {
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.5",
          region: "global",
        },
      },
    ];

    if (process.env.DEEPSEEK_API_KEY) {
      expectedCalls.push(
        {
          kind: "account",
          body: {
            providerAccountId: "deepseek.personal.deepseek-api-key",
            providerId: "deepseek",
            providerKind: "provider-openai",
            orgScope: "personal",
            accountScope: "workspace-default",
            credentialRef: {
              backend: "env",
              ref: "DEEPSEEK_API_KEY",
            },
            authMode: "api-key-static",
            regionPolicy: {
              mode: "prefer",
              regions: ["global"],
            },
            baseUrlOverride: "https://api.deepseek.com/v1",
            allowedModels: ["deepseek/deepseek-v4-flash", "deepseek/deepseek-v4-pro"],
            modelRoleBindings: [
              {
                modelId: "deepseek/deepseek-v4-flash",
                roleIds: ["general.chat"],
              },
              {
                modelId: "deepseek/deepseek-v4-pro",
                roleIds: ["general.chat"],
              },
            ],
            deniedModels: [],
            entitlementTags: ["chat", "benchmark"],
            budgetPolicyRef: "budget.default",
            quotaPolicyRef: "quota.default",
            status: "active",
            healthStatus: "healthy",
            rotationState: "stable",
          },
        },
        {
          kind: "endpoint",
          body: {
            providerAccountId: "deepseek.personal.deepseek-api-key",
            modelId: "deepseek/deepseek-v4-flash",
            region: "global",
          },
        },
        {
          kind: "endpoint",
          body: {
            providerAccountId: "deepseek.personal.deepseek-api-key",
            modelId: "deepseek/deepseek-v4-pro",
            region: "global",
          },
        },
      );
    }

    expect(calls).toEqual(expectedCalls);
  });

  test("builds packaged CLI options with static UI, router surfaces, and fixture-root defaults", async () => {
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
      queryTelemetryAnalytics: async () => ({ buckets: [], ranking: null }),
      subscribeTelemetry: () => () => undefined,
      listProviders: async () => [],
      listRoles: async () => [],
      listAccounts: async () => [],
      upsertProviderAccount: async () => ({ providerAccountId: "acct-1" }),
      startProviderDeviceAuthorization: async () => ({ status: "pending" }),
      pollProviderDeviceAuthorization: async () => ({ status: "pending" }),
      reconnectProviderAccount: async () => ({ status: "pending" }),
      updateProviderApiKey: async () => ({ providerAccountId: "acct-1" }),
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
      readEndpointProfile: async () => ({
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
      }),
      listLocalModels: async () => [],
      loadLocalModel: async () => ({ success: true }),
      unloadLocalModel: async () => ({ success: true }),
      readLocalPolicy: async () => ({}),
      updateLocalPolicy: async () => ({}),
      readRolePolicy: async () => ({
        roleDefinitions: [],
        taskDefinitions: [],
      }),
      createRolePolicyRole: async () => ({
        role_id: "qa.reviewer",
        name: "QA Reviewer",
        description: "Reviews work.",
        role_kind: "assistant",
        default_system_instructions: "",
        task_types_supported: [],
        required_capabilities: [],
        preferred_capabilities: [],
        forbidden_capabilities: [],
        tool_policy: {
          mode: "allowed",
          allowed_tools: [],
        },
        routing_policy_overrides: {},
        output_contracts: [],
        safety_policy_refs: [],
      }),
      updateRolePolicyRole: async () => ({
        role_id: "qa.reviewer",
        name: "QA Reviewer",
        description: "Reviews work.",
        role_kind: "assistant",
        default_system_instructions: "",
        task_types_supported: [],
        required_capabilities: [],
        preferred_capabilities: [],
        forbidden_capabilities: [],
        tool_policy: {
          mode: "allowed",
          allowed_tools: [],
        },
        routing_policy_overrides: {},
        output_contracts: [],
        safety_policy_refs: [],
      }),
      listTaskDefinitions: async () => [],
      updateTaskDefinitions: async () => [],
      listSwapHistory: async () => [],
      listActivityMetrics: async () => [{ id: 1 }],
      readActivityCapture: async () => ({ id: 1 }),
      getLocalLogs: async () => "logs",
      readModelOverrides: async () => ({}),
      updateModelOverrides: async () => ({}),
      readPeers: async () => [],
      updatePeers: async () => [],
      checkPeerHealth: async () => ({ ok: true }),
      shutdown: async () => undefined,
    };

    expect(typeof (cli as { resolveCliFixtureRoot?: unknown }).resolveCliFixtureRoot).toBe(
      "function",
    );
    expect(typeof (cli as { createCliServerOptions?: unknown }).createCliServerOptions).toBe(
      "function",
    );

    const fixtureRoot = (
      cli as {
        resolveCliFixtureRoot: (repoRoot: string, fixtureRoot?: string) => string | undefined;
      }
    ).resolveCliFixtureRoot(repoRoot);
    expect(fixtureRoot).toBeUndefined();
    expect(
      (
        cli as {
          resolveCliFixtureRoot: (repoRoot: string, fixtureRoot?: string) => string | undefined;
        }
      ).resolveCliFixtureRoot(repoRoot, path.join(repoRoot, "testdata", "router-runtime")),
    ).toBe(path.join(repoRoot, "testdata", "router-runtime"));

    const staticRoot = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-ui",
      "build",
      "client",
    );
    const options = (
      cli as {
        createCliServerOptions: (
          options: { host: string; port: number; staticRoot: string },
          backend: typeof backend,
        ) => {
          staticRoot?: string;
          listActivityMetrics?: (...args: readonly unknown[]) => Promise<unknown>;
          readActivityCapture?: (...args: readonly unknown[]) => Promise<unknown>;
          readRouterSummary?: (...args: readonly unknown[]) => Promise<unknown>;
          readRouterConfig?: (...args: readonly unknown[]) => Promise<unknown>;
          listRouterCandidates?: (...args: readonly unknown[]) => Promise<unknown>;
          listRouterDecisions?: (...args: readonly unknown[]) => Promise<unknown>;
          readRouterDecision?: (...args: readonly unknown[]) => Promise<unknown>;
          listLocalModels?: (...args: readonly unknown[]) => Promise<unknown>;
          getLocalLogs?: (...args: readonly unknown[]) => Promise<unknown>;
          readRolePolicy?: (...args: readonly unknown[]) => Promise<unknown>;
          createRolePolicyRole?: (...args: readonly unknown[]) => Promise<unknown>;
          updateRolePolicyRole?: (...args: readonly unknown[]) => Promise<unknown>;
          listTaskDefinitions?: (...args: readonly unknown[]) => Promise<unknown>;
          updateTaskDefinitions?: (...args: readonly unknown[]) => Promise<unknown>;
          readModelOverrides?: (...args: readonly unknown[]) => Promise<unknown>;
          updateModelOverrides?: (...args: readonly unknown[]) => Promise<unknown>;
          readPeers?: (...args: readonly unknown[]) => Promise<unknown>;
          queryTelemetryAnalytics?: (...args: readonly unknown[]) => Promise<unknown>;
          reconnectProviderAccount?: (...args: readonly unknown[]) => Promise<unknown>;
          updateProviderApiKey?: (...args: readonly unknown[]) => Promise<unknown>;
          updatePeers?: (...args: readonly unknown[]) => Promise<unknown>;
          checkPeerHealth?: (...args: readonly unknown[]) => Promise<unknown>;
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
    await expect(options.listActivityMetrics?.()).resolves.toEqual([{ id: 1 }]);
    await expect(options.readActivityCapture?.()).resolves.toEqual({ id: 1 });
    await expect(options.queryTelemetryAnalytics?.()).resolves.toEqual({
      buckets: [],
      ranking: null,
    });
    await expect(options.readRouterSummary?.()).resolves.toEqual({ section: "router-summary" });
    await expect(options.readRouterConfig?.()).resolves.toEqual({ section: "router-config" });
    await expect(options.listRouterCandidates?.()).resolves.toEqual([{ candidateId: "cand-1" }]);
    await expect(options.listRouterDecisions?.()).resolves.toEqual([{ requestId: "req-1" }]);
    await expect(options.readRouterDecision?.("req-2")).resolves.toEqual({ requestId: "req-2" });
    await expect(options.listLocalModels?.()).resolves.toEqual([]);
    await expect(options.getLocalLogs?.()).resolves.toBe("logs");
    await expect(options.readRolePolicy?.()).resolves.toEqual({
      roleDefinitions: [],
      taskDefinitions: [],
    });
    await expect(options.createRolePolicyRole?.()).resolves.toEqual(
      expect.objectContaining({ role_id: "qa.reviewer" }),
    );
    await expect(options.updateRolePolicyRole?.()).resolves.toEqual(
      expect.objectContaining({ role_id: "qa.reviewer" }),
    );
    await expect(options.listTaskDefinitions?.()).resolves.toEqual([]);
    await expect(options.updateTaskDefinitions?.()).resolves.toEqual([]);
    await expect(options.readModelOverrides?.()).resolves.toEqual({});
    await expect(options.updateModelOverrides?.()).resolves.toEqual({});
    await expect(options.readPeers?.()).resolves.toEqual([]);
    await expect(options.reconnectProviderAccount?.()).resolves.toEqual({ status: "pending" });
    await expect(options.updateProviderApiKey?.()).resolves.toEqual({
      providerAccountId: "acct-1",
    });
    await expect(options.updatePeers?.()).resolves.toEqual([]);
    await expect(options.checkPeerHealth?.()).resolves.toEqual({ ok: true });
  });

  test("passes the optional shutdown hook into CLI server options", async () => {
    const shutdown = vi.fn(async () => undefined);
    const backend = {
      effectiveRegistry: registry,
      getExecutionCatalog: async () => null,
      executeChatCompletions: async () => {
        throw new Error("unused");
      },
      executeResponses: async () => {
        throw new Error("unused");
      },
      readVersionInfo: async () => ({}),
      listActivityMetrics: async () => [],
      readActivityCapture: async () => null,
      getLocalLogs: async () => ({ logs: "" }),
      proxyVendorLogStream: async () => null,
      readRuntimeSummary: async () => ({}),
      readRuntimeConfig: async () => ({ applied: false, path: null, config: null }),
      updateRuntimeConfig: async () => ({ applied: false, path: null, config: null }),
      readHealthStatus: async () => ({ status: "healthy" }),
      readTelemetrySummary: async () => ({ totalRequests: 0 }),
      listTelemetryComparisonRows: async () => [],
      listTelemetryRequests: async () => [],
      queryTelemetryAnalytics: async () => ({ buckets: [], ranking: null }),
      subscribeTelemetry: () => () => undefined,
      listProviders: async () => [],
      listModels: async () => [],
      listRoles: async () => [],
      listAccounts: async () => [],
      listProviderDeviceAuthorizations: async () => [],
      upsertProviderAccount: async () => ({ providerAccountId: "acct-1" }),
      startProviderDeviceAuthorization: async () => ({ status: "pending" }),
      pollProviderDeviceAuthorization: async () => ({ status: "pending" }),
      reconnectProviderAccount: async () => ({ status: "pending" }),
      updateProviderApiKey: async () => ({ providerAccountId: "acct-1" }),
      removeProviderAccountModel: async () => ({ success: true, removedAccount: false }),
      activateEndpoint: async () => ({ success: true }),
      readControllerAssignment: async () => null,
      updateControllerAssignment: async () => null,
      readRouterSummary: async () => ({}),
      readRouterConfig: async () => ({}),
      listRouterCandidates: async () => [],
      listRouterDecisions: async () => [],
      readRouterDecision: async () => null,
      listEndpoints: async () => [],
      listRecentRequestObservations: async () => [],
      readRequestObservation: async () => null,
      readEndpointProfile: async () => null,
      readBenchmarkSuite: async () => null,
      runBenchmark: async () => null,
      readBenchmarkRun: async () => null,
      readActiveBenchmarkRun: async () => null,
      clearBenchmarkEndpointData: async () => ({ success: true }),
      clearBenchmarkData: async () => ({ success: true }),
      readBenchmarkSummary: async () => null,
      listBenchmarkRuns: async () => [],
      readBenchmarkSummariesByMode: async () => [],
      readBenchmarkPreferences: async () => null,
      updateBenchmarkPreferences: async () => null,
      listLocalModels: async () => [],
      listPeerLocalModels: async () => [],
      listLlamaSwapLocalModels: async () => [],
      loadLocalModel: async () => ({ success: true }),
      loadPeerModel: async () => ({ success: true }),
      loadLlamaSwapModel: async () => ({ success: true }),
      setPeerModelRoles: async () => ({ success: true }),
      setLlamaSwapModelRoles: async () => ({ success: true }),
      unloadPeerModel: async () => ({ success: true }),
      unloadLocalModel: async () => ({ success: true }),
      readLocalPolicy: async () => ({}),
      updateLocalPolicy: async () => ({}),
      readRolePolicy: async () => ({ roleDefinitions: [], taskDefinitions: [] }),
      createRolePolicyRole: async () => ({}),
      updateRolePolicyRole: async () => ({}),
      listTaskDefinitions: async () => [],
      updateTaskDefinitions: async () => [],
      listSwapHistory: async () => [],
      readModelOverrides: async () => ({}),
      updateModelOverrides: async () => ({}),
      readPeers: async () => [],
      updatePeers: async () => [],
      checkPeerHealth: async () => ({ ok: true }),
      getEffectiveRoutableInventory: async () => [],
      shutdown,
    };

    const options = (
      cli as {
        createCliServerOptions: (
          options: { host: string; port: number },
          backend: typeof backend,
          shutdown?: () => Promise<void>,
        ) => { shutdown?: () => Promise<void> };
      }
    ).createCliServerOptions(
      {
        host: "127.0.0.1",
        port: 3456,
      },
      backend,
      shutdown,
    );

    expect(options.shutdown).toBe(shutdown);
  });

  test("suppresses placeholder provider accounts when using the packaged CLI defaults", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-cli-fixtures-"),
    );

    try {
      const fixtureRoot = (
        cli as {
          resolveCliFixtureRoot: (repoRoot: string, fixtureRoot?: string) => string | undefined;
        }
      ).resolveCliFixtureRoot(repoRoot);
      expect(fixtureRoot).toBeUndefined();

      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot?: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            listAccounts: () => Promise<Array<{ providerAccountId: string }>>;
            shutdown: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        runtimeStateRoot,
        scopeId: "runtime-host-cli-default-fixtures",
      });

      try {
        const accounts = await backend.listAccounts();
        expect(accounts.map((account) => account.providerAccountId)).not.toEqual(
          expect.arrayContaining(["openai.personal.primary", "anthropic.team.shared"]),
        );
      } finally {
        await backend.shutdown();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("purges stale runtime-config LiteLLM endpoints when startup has no runtime config", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-stale-litellm-"),
    );
    const scopeId = "runtime-host-stale-litellm";

    try {
      const { databasePath } = initializeSqliteMemory({ runtimeStateRoot, scopeId });
      upsertSqliteProviderAccount({
        databasePath,
        account: {
          providerAccountId: "openai.litellm",
          providerId: "openai",
          providerKind: "provider-openai",
          orgScope: "runtime-config",
          accountScope: "runtime-config",
          credentialRef: {
            backend: "env",
            ref: "OPENAI_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "http://127.0.0.1:45679/v1",
          allowedModels: ["openai/gpt-4.1-mini-fast"],
          modelRoleBindings: [],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.runtime-config",
          quotaPolicyRef: "quota.runtime-config",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        },
      });
      upsertRuntimeEndpoint({
        databasePath,
        endpoint: {
          endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
          providerAccountId: "openai.litellm",
          modelId: "openai/gpt-4.1-mini-fast",
          region: "global",
          endpointKind: "remote-openai-compatible",
          servingSource: "remote-service",
          lifecycleState: "active",
          healthStatus: "healthy",
        },
      });

      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            listAccounts: () => Promise<Array<{ providerAccountId: string }>>;
            listEndpoints: () => Promise<Array<{ endpointId: string }>>;
            shutdown: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        runtimeStateRoot,
        scopeId,
      });

      try {
        await expect(backend.listAccounts()).resolves.not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ providerAccountId: "openai.litellm" }),
          ]),
        );
        await expect(backend.listEndpoints()).resolves.not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
            }),
          ]),
        );
        expect(
          listProviderAccounts({ databasePath }).map((account) => account.providerAccountId),
        ).not.toContain("openai.litellm");
        expect(
          listRuntimeEndpoints({ databasePath }).map((endpoint) => endpoint.endpointId),
        ).not.toContain("openai.litellm.global.openai-gpt-4-1-mini-fast");
      } finally {
        await backend.shutdown();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("loads placeholder accounts only when fixture-root is explicitly provided", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-cli-explicit-fixtures-"),
    );

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot?: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            listAccounts: () => Promise<Array<{ providerAccountId: string }>>;
            shutdown: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-host-cli-explicit-fixtures",
      });

      try {
        const accounts = await backend.listAccounts();
        expect(accounts.map((account) => account.providerAccountId)).toEqual(
          expect.arrayContaining(["openai.personal.primary", "anthropic.team.shared"]),
        );
      } finally {
        await backend.shutdown();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
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
        requiredCapabilities: ["text.chat", "tools.function_calling"],
        preferredCapabilities: [],
        requiredModalities: ["text"],
        contextTokens: 15,
        needsTools: true,
        strategy: "balanced",
        preferLocal: false,
        allowEndpoints: ["moonshot.personal.primary.global.kimi-k2.5"],
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
      routingDiagnostics: {
        capabilityEligibility: {
          requiredInputModalities: ["text"],
          requiredOutputModalities: ["text"],
          requiredCapabilities: ["text.chat", "tools.function_calling"],
          advisoryCapabilities: [],
          includedEndpoints: ["moonshot.personal.primary.global.kimi-k2.5"],
          excludedTargets: [
            {
              endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
              modelId: "moonshot/kimi-k2.5",
              reasons: ["missing_capability.tools.function_calling"],
            },
          ],
        },
      },
    });
  });

  test("maps request role_model intent metadata into the routing request", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            roleModelIntent?: unknown;
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Review this diff for security risks." }],
        role_model: {
          intent: {
            taxonomyVersion: "1.0.0-alpha.1",
            classificationContractVersion: "role-model.classification.v1",
            role: { id: "security", hard: true },
            task: { id: "security.audit", hard: true },
            capabilities: {
              required: ["security.analysis"],
              preferred: ["code.read"],
            },
            modalities: { required: ["text"] },
            toolClasses: ["filesystem.read"],
            source: "explicit_user",
            confidence: 0.98,
            evidence: ["explicit security review request"],
            alternatives: [{ roleId: "coder", taskType: "coder.review", confidence: 0.42 }],
          },
        },
      },
      "req-taxonomy-intent",
    );

    expect(result.routingRequest.roleModelIntent).toEqual(
      expect.objectContaining({
        taxonomyVersion: "1.0.0-alpha.1",
        classificationContractVersion: "role-model.classification.v1",
        role: { id: "security", hard: true },
        task: { id: "security.audit", hard: true },
        source: "explicit_user",
        confidence: 0.98,
      }),
    );
  });

  test("maps stable proposal-shaped chat role_model intent metadata into the routing request", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            roleModelIntent?: unknown;
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Review this diff for security risks." }],
        role_model: {
          contract_version: 1,
          intent: {
            taxonomy_version: "1.0.0-alpha.1",
            content_revision: "taxonomy-v1-alpha.1",
            classification_contract_version: "role-model.classification.v1",
            requested_role_id: "security",
            role_hint_id: "coder",
            role_source: "user",
            task_type: "security.audit",
            task_action: "audit",
            task_variant: null,
            task_source: "client.rule",
            task_confidence: 0.98,
            required_capabilities: ["security.analysis"],
            preferred_capabilities: ["code.read"],
            required_modalities: ["text"],
            tool_classes: ["filesystem.read"],
            evidence: ["explicit security review request"],
            alternatives: [{ role_hint_id: "coder", task_type: "coder.review", confidence: 0.42 }],
          },
        },
      },
      "req-taxonomy-intent-stable",
    );

    expect(result.routingRequest.roleModelIntent).toEqual(
      expect.objectContaining({
        taxonomyVersion: "1.0.0-alpha.1",
        classificationContractVersion: "role-model.classification.v1",
        role: { id: "security", hard: false },
        task: { id: "security.audit", hard: false },
        originalRoleHintId: "coder",
        originalTaskType: "security.audit",
        contentRevision: "taxonomy-v1-alpha.1",
        contractVersion: 1,
        taskAction: "audit",
        taskVariant: null,
        capabilities: {
          preferred: ["code.read", "security.analysis"],
        },
        modalities: { required: ["text"] },
        toolClasses: ["filesystem.read"],
        source: "client.rule",
        roleSource: "user",
        taskSource: "client.rule",
        taskConfidence: 0.98,
        confidence: 0.98,
        evidence: ["explicit security review request"],
        alternatives: [{ roleId: "coder", taskType: "coder.review", confidence: 0.42 }],
      }),
    );
  });

  test("normalizes stable advisory role_model intent with ignored-field diagnostics", () => {
    const observation = (
      bridge as {
        createRoleModelNormalizedIntentObservation: (
          intent: Record<string, unknown>,
          roleDefinitions: readonly Record<string, unknown>[],
          taskDefinitions: readonly Record<string, unknown>[],
        ) => {
          normalizedIntent?: Record<string, unknown>;
          diagnostics: readonly { code: string; field: string; id: string; severity: string }[];
        };
      }
    ).createRoleModelNormalizedIntentObservation(
      {
        contractVersion: 1,
        taxonomyVersion: "1.0.0-alpha.1",
        contentRevision: "taxonomy-v1-alpha.1",
        classificationContractVersion: "role-model.classification.v1",
        originalRoleHintId: "unknown.role",
        originalTaskType: "unknown.task",
        role: { id: "unknown.role", hard: false },
        task: { id: "unknown.task", hard: false },
        capabilities: {
          preferred: ["security.analysis", "unknown.capability"],
        },
        modalities: { required: ["text", "unknown_modality"] },
        toolClasses: ["filesystem.read", "unknown.tool"],
        source: "heuristic",
        roleSource: "heuristic.group",
        taskSource: "heuristic.rule",
        confidence: 0.74,
        taskConfidence: 0.61,
      },
      [{ role_id: "security" }],
      [{ task_type: "security.audit", allowed_roles: ["security"] }],
    );

    expect(observation.normalizedIntent).toMatchObject({
      taxonomyVersion: "1.0.0-alpha.1",
      contentRevision: "taxonomy-v1-alpha.1",
      classificationContractVersion: "role-model.classification.v1",
      originalRoleHintId: "unknown.role",
      originalTaskType: "unknown.task",
      source: "heuristic",
      roleSource: "heuristic.group",
      taskSource: "heuristic.rule",
      confidence: 0.74,
      taskConfidence: 0.61,
      capabilities: { preferred: ["security.analysis"] },
      modalities: { required: ["text"] },
      toolClasses: ["filesystem.read"],
    });
    expect(observation.normalizedIntent).not.toHaveProperty("role");
    expect(observation.normalizedIntent).not.toHaveProperty("task");
    expect(observation.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "ROLE_MODEL_INTENT_FIELD_IGNORED",
          field: "role",
          id: "unknown.role",
        }),
        expect.objectContaining({
          code: "ROLE_MODEL_INTENT_FIELD_IGNORED",
          field: "task",
          id: "unknown.task",
        }),
        expect.objectContaining({
          code: "ROLE_MODEL_INTENT_FIELD_IGNORED",
          field: "capabilities.preferred",
          id: "unknown.capability",
        }),
        expect.objectContaining({
          code: "ROLE_MODEL_INTENT_FIELD_IGNORED",
          field: "modalities.required",
          id: "unknown_modality",
        }),
        expect.objectContaining({
          code: "ROLE_MODEL_INTENT_FIELD_IGNORED",
          field: "toolClasses",
          id: "unknown.tool",
        }),
      ]),
    );
  });

  test("applies valid role_model intent as runtime role and task policy", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly unknown[],
          difficultyContext?: unknown,
          controllerContext?: unknown,
          requestOptions?: unknown,
          roleDefinitions?: readonly Record<string, unknown>[],
          defaultRoutingMode?: unknown,
          inventory?: unknown,
          taskDefinitions?: readonly Record<string, unknown>[],
        ) => {
          routingRequest: {
            requestedRoleId?: string;
            taskType: string;
            roleModelIntent?: unknown;
            requiredCapabilities: readonly string[];
            preferredCapabilities: readonly string[];
          };
          routingDiagnostics?: {
            rolePolicy?: {
              requestedRoleId?: string;
              appliedRoleId?: string;
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Review this diff for security risks." }],
        role_model: {
          intent: {
            taxonomyVersion: "1.0.0-alpha.1",
            classificationContractVersion: "role-model.classification.v1",
            role: { id: "security", hard: false },
            task: { id: "security.audit", hard: false },
            capabilities: {
              required: ["text.chat"],
              preferred: ["security.analysis"],
            },
            modalities: { required: ["text"] },
            source: "heuristic",
            confidence: 0.91,
          },
        },
      },
      "req-taxonomy-intent-policy",
      [],
      undefined,
      undefined,
      undefined,
      [
        {
          role_id: "security",
          description: "Security review role.",
          default_system_instructions: "Review for security issues.",
          task_types_supported: ["security.audit"],
          required_capabilities: ["text.chat"],
          preferred_capabilities: ["security.analysis"],
          forbidden_capabilities: [],
          tool_policy: { mode: "allowed", allowed_tools: [] },
          output_contracts: [],
          safety_policy_refs: [],
        },
      ],
      undefined,
      null,
      [
        {
          task_type: "security.audit",
          description: "Security audit task.",
          required_inputs: ["text"],
          required_capabilities: ["text.chat"],
          preferred_capabilities: ["security.analysis"],
          quality_metrics: [],
          allowed_roles: ["security"],
          default_benchmark_suites: [],
        },
      ],
    );

    expect(result.routingRequest).toEqual(
      expect.objectContaining({
        requestedRoleId: "security",
        taskType: "security.audit",
        requiredCapabilities: ["text.chat"],
        preferredCapabilities: ["security.analysis"],
      }),
    );
    expect(result.routingDiagnostics?.rolePolicy).toEqual(
      expect.objectContaining({
        requestedRoleId: "security",
        appliedRoleId: "security",
      }),
    );
  });

  test("keeps stable Pi role_model metadata advisory for exact-model routing", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly unknown[],
          difficultyContext?: unknown,
          controllerContext?: unknown,
          requestOptions?: unknown,
          roleDefinitions?: readonly Record<string, unknown>[],
          defaultRoutingMode?: unknown,
          inventory?: unknown,
          taskDefinitions?: readonly Record<string, unknown>[],
        ) => {
          routingRequest: {
            requestedRoleId?: string;
            taskType: string;
            roleModelIntent?: unknown;
            requiredCapabilities: readonly string[];
            preferredCapabilities: readonly string[];
          };
          routingDiagnostics?: {
            rolePolicy?: unknown;
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Review this diff for security risks." }],
        role_model: {
          contract_version: 1,
          intent: {
            taxonomy_version: "1.0.0-alpha.1",
            classification_contract_version: "role-model.classification.v1",
            role_hint_id: "not-a-real-role",
            task_type: "not_a_role.not_a_task",
            source: "heuristic",
            confidence: 0.72,
            required_capabilities: ["security.analysis", "not.real.required"],
            preferred_capabilities: ["code.read", "not.real.preferred"],
            required_modalities: ["text"],
          },
        },
      },
      "req-taxonomy-stable-advisory-exact-model",
      [],
      undefined,
      undefined,
      undefined,
      [
        {
          role_id: "security",
          description: "Security review role.",
          default_system_instructions: "Review for security issues.",
          task_types_supported: ["security.audit"],
          required_capabilities: ["security.analysis"],
          preferred_capabilities: ["code.read"],
          forbidden_capabilities: [],
          tool_policy: { mode: "allowed", allowed_tools: [] },
          output_contracts: [],
          safety_policy_refs: [],
        },
      ],
      undefined,
      null,
      [
        {
          task_type: "security.audit",
          description: "Security audit task.",
          required_inputs: ["text"],
          required_capabilities: ["security.analysis"],
          preferred_capabilities: ["code.read"],
          quality_metrics: [],
          allowed_roles: ["security"],
          default_benchmark_suites: [],
        },
      ],
    );

    expect(result.routingRequest.requestedRoleId).toBeUndefined();
    expect(result.routingRequest).toEqual(
      expect.objectContaining({
        taskType: "text.chat",
        requiredCapabilities: expect.not.arrayContaining(["security.analysis"]),
        preferredCapabilities: expect.arrayContaining([
          "security.analysis",
          "not.real.required",
          "code.read",
          "not.real.preferred",
        ]),
      }),
    );
    expect(result.routingDiagnostics?.rolePolicy).toBeUndefined();
  });

  test("maps chat-completions tool-turn history with null assistant content without crashing", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            contextTokens: number;
            needsTools: boolean;
          };
          executionRequest: {
            messages: readonly {
              role: string;
              content?: string | null;
              tool_calls?: readonly unknown[];
              tool_call_id?: string;
            }[];
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [
          { role: "user", content: "Can you check the stock price of cloudflare" },
          {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: {
                  name: "web_search",
                  arguments: '{"query":"Cloudflare NET stock price"}',
                },
              },
            ],
          },
          {
            role: "tool",
            tool_call_id: "call_1",
            content: "NET: $185.42",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "web_search",
              description: "Search the web.",
              parameters: {
                type: "object",
                properties: {
                  query: { type: "string" },
                },
              },
            },
          },
        ],
      },
      "req-null-content-tool-turn",
    );

    expect(result.routingRequest.contextTokens).toBeGreaterThan(0);
    expect(result.routingRequest.needsTools).toBe(true);
    expect(result.executionRequest.messages).toEqual([
      { role: "user", content: "Can you check the stock price of cloudflare" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "web_search",
              arguments: '{"query":"Cloudflare NET stock price"}',
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_1",
        content: "NET: $185.42",
      },
    ]);
  });

  test("maps hosted OpenAI responses tools without rejecting them as function-only tools", () => {
    const openaiRegistry: EndpointRegistryResult = {
      endpoints: [
        {
          identity: {
            endpoint_id: "openai.personal.codex-subscription.global.gpt-5.4",
            endpoint_kind: "remote_api",
            provider_kind: "provider-openai",
            serving_source: "remote-service",
            model_id: "chatgpt/gpt-5.4",
            runtime_version: "test-registry-v1",
            region: "global",
          },
          declared: {
            endpoint_id: "openai.personal.codex-subscription.global.gpt-5.4",
            capabilities: ["text.chat", "tools.function_calling"],
            modalities: ["text"],
            max_context_tokens: 200000,
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
    };

    const result = (
      bridge as {
        mapResponsesRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            needsTools: boolean;
          };
          executionRequest: {
            tools?: readonly unknown[];
          };
        };
      }
    ).mapResponsesRequest(
      openaiRegistry,
      {
        model: "chatgpt/gpt-5.4",
        input: "Find the current Cloudflare stock price and cite the source.",
        tools: [
          {
            type: "web_search",
          },
        ],
      },
      "req-responses-hosted-web-search",
    );

    expect(result.routingRequest.needsTools).toBe(true);
    expect(result.executionRequest.tools).toEqual([
      {
        kind: "hosted",
        name: "web_search",
        raw: {
          type: "web_search",
        },
      },
    ]);
  });

  test("maps mixed-provider responses web_search alias pools to runtime tool calling without excluding function-calling providers", () => {
    const mixedRegistry: EndpointRegistryResult = {
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
            endpoint_id: "openai.personal.codex-subscription.global.gpt-5.4",
            endpoint_kind: "remote_api",
            provider_kind: "provider-openai",
            serving_source: "remote-service",
            model_id: "chatgpt/gpt-5.4",
            runtime_version: "test-registry-v1",
            region: "global",
          },
          declared: {
            endpoint_id: "openai.personal.codex-subscription.global.gpt-5.4",
            capabilities: ["text.chat", "tools.function_calling"],
            modalities: ["text"],
            max_context_tokens: 200000,
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
    };

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
      mixedRegistry,
      {
        model: "controller.remote-only",
        input: "Find the current Cloudflare stock price and cite the source.",
        tools: [
          {
            type: "web_search",
          },
        ],
      },
      "req-hosted-web-search-alias-filter-001",
      [
        {
          aliasId: "controller.remote-only",
          mode: "intelligent",
          modelIds: ["chatgpt/gpt-5.4", "deepseek/deepseek-v4-flash", "moonshot/kimi-k2.7-code"],
        },
      ],
    );

    expect(result.routingRequest.allowEndpoints).toEqual([
      "deepseek.personal.primary.global.deepseek-v4-flash",
      "moonshot.personal.primary.global.kimi-k2.7-code",
      "openai.personal.codex-subscription.global.gpt-5.4",
    ]);
    expect(result.routingDiagnostics?.aliasResolution).toEqual({
      requestedModel: "controller.remote-only",
      aliasId: "controller.remote-only",
      resolvedModelIds: [
        "chatgpt/gpt-5.4",
        "deepseek/deepseek-v4-flash",
        "moonshot/kimi-k2.7-code",
      ],
      allowEndpoints: [
        "deepseek.personal.primary.global.deepseek-v4-flash",
        "moonshot.personal.primary.global.kimi-k2.7-code",
        "openai.personal.codex-subscription.global.gpt-5.4",
      ],
    });
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

  test("maps exact non-OpenAI responses web-search requests to consumer-managed web_search tools", () => {
    const result = (
      bridge as {
        mapResponsesRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
            needsTools: boolean;
          };
          executionRequest: {
            tools?: readonly unknown[];
          };
        };
      }
    ).mapResponsesRequest(
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
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 1,
          degraded: 0,
          offline: 0,
        },
      },
      {
        model: "deepseek/deepseek-v4-flash",
        input: "Find the current Cloudflare stock price and cite the source.",
        tools: [
          {
            type: "web_search",
          },
        ],
      },
      "req-hosted-web-search-exact-deepseek-001",
    );

    expect(result.routingRequest.needsTools).toBe(true);
    expect(result.routingRequest.allowEndpoints).toEqual([
      "deepseek.personal.primary.global.deepseek-v4-flash",
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

  test("maps exact Kimi responses web-search requests to the hosted builtin_function contract", () => {
    const result = (
      bridge as {
        mapResponsesRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
            needsTools: boolean;
          };
          executionRequest: {
            tools?: readonly unknown[];
          };
        };
      }
    ).mapResponsesRequest(
      {
        endpoints: [
          {
            identity: {
              endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "moonshot/kimi-k2.7-code",
              runtime_version: "test-registry-v1",
              region: "global",
            },
            declared: {
              endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
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
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 1,
          degraded: 0,
          offline: 0,
        },
      },
      {
        model: "moonshot/kimi-k2.7-code",
        input: "Find the current Cloudflare stock price and cite the source.",
        tools: [
          {
            type: "web_search",
          },
        ],
      },
      "req-hosted-web-search-exact-kimi-001",
    );

    expect(result.routingRequest.needsTools).toBe(true);
    expect(result.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.kimi-code.global.kimi-k2.7-code",
    ]);
    expect(result.executionRequest.tools).toEqual([
      {
        kind: "hosted",
        name: "web_search",
        raw: {
          type: "builtin_function",
          function: {
            name: "$web_search",
          },
        },
      },
    ]);
  });

  test("maps chat-completions continuation requests with Kimi hosted builtin_function tools", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          executionRequest: {
            tools?: readonly unknown[];
          };
        };
      }
    ).mapChatCompletionsRequest(
      {
        endpoints: [
          {
            identity: {
              endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
              endpoint_kind: "remote_api",
              provider_kind: "remote_openai_compat",
              serving_source: "remote-service",
              model_id: "moonshot/kimi-k2.7-code",
              runtime_version: "test-registry-v1",
              region: "global",
            },
            declared: {
              endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
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
        ],
        diagnostics: [],
        lifecycleSummary: {
          active: 1,
          degraded: 0,
          offline: 0,
        },
      },
      {
        model: "moonshot/kimi-k2.7-code",
        messages: [
          {
            role: "user",
            content: "Find the current Cloudflare stock price and cite the source.",
          },
          {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: {
                  name: "$web_search",
                  arguments: '{"query":"Cloudflare stock price","total_tokens":1234}',
                },
              },
            ],
          },
          {
            role: "tool",
            tool_call_id: "call_1",
            content: '{"query":"Cloudflare stock price","total_tokens":1234}',
          },
        ],
        tools: [
          {
            type: "builtin_function",
            function: {
              name: "$web_search",
              parameters: {
                type: "object",
              },
            },
          },
        ],
      },
      "req-kimi-chat-continuation-001",
    );

    expect(result.executionRequest.tools).toEqual([
      {
        kind: "hosted",
        name: "web_search",
        raw: {
          type: "builtin_function",
          function: {
            name: "$web_search",
          },
        },
      },
    ]);
  });

  test("describes endpoint web-search support by active runtime transport", () => {
    expect(
      typeof (bridge as { resolveEndpointWebSearchSupport?: unknown })
        .resolveEndpointWebSearchSupport,
    ).toBe("function");

    const resolveEndpointWebSearchSupport = (
      bridge as {
        resolveEndpointWebSearchSupport: (
          endpoint: EndpointRegistryResult["endpoints"][number],
        ) => unknown;
      }
    ).resolveEndpointWebSearchSupport;

    const createEndpoint = (input: {
      endpointId: string;
      modelId: string;
      providerKind?: string;
      toolCallingSupported?: boolean;
      toolCallingStyle?: string;
      capabilities?: readonly string[];
    }): EndpointRegistryResult["endpoints"][number] => ({
      identity: {
        endpoint_id: input.endpointId,
        endpoint_kind: "remote_api",
        provider_kind: input.providerKind ?? "remote_openai_compat",
        serving_source: "remote-service",
        model_id: input.modelId,
        runtime_version: "test-registry-v1",
        region: "global",
      },
      declared: {
        endpoint_id: input.endpointId,
        capabilities: [...(input.capabilities ?? ["text.chat", "tools.function_calling"])],
        modalities: ["text"],
        max_context_tokens: 200000,
        tool_calling: {
          supported: input.toolCallingSupported ?? true,
          style: input.toolCallingStyle ?? "openai",
        },
        supports_embeddings: false,
        platform_constraints: [],
      },
      status: "active",
    });

    expect(
      resolveEndpointWebSearchSupport(
        createEndpoint({
          endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
          modelId: "chatgpt/gpt-5.4",
          providerKind: "provider-openai",
          toolCallingStyle: "none",
        }),
      ),
    ).toEqual({
      mode: "native",
      currentRuntimeContract: "openai.responses.web_search",
      documentedProviderContract: "openai.responses.web_search",
    });

    expect(
      resolveEndpointWebSearchSupport(
        createEndpoint({
          endpointId: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
          modelId: "moonshot/kimi-k2.7-code",
        }),
      ),
    ).toEqual({
      mode: "native",
      currentRuntimeContract: "moonshot.chat.builtin_web_search",
      documentedProviderContract: "moonshot.chat.builtin_web_search",
    });

    expect(
      resolveEndpointWebSearchSupport(
        createEndpoint({
          endpointId: "deepseek.personal.primary.global.deepseek-v4-flash",
          modelId: "deepseek/deepseek-v4-flash",
        }),
      ),
    ).toEqual({
      mode: "runtime-fallback",
      currentRuntimeContract: null,
      documentedProviderContract: "deepseek.anthropic.server_web_search",
    });
  });

  test("exports Codex dynamic-tool extraction for request-scoped function tools", () => {
    expect(typeof (bridge as { buildCodexDynamicTools?: unknown }).buildCodexDynamicTools).toBe(
      "function",
    );

    const dynamicTools = (
      bridge as {
        buildCodexDynamicTools: (requestCapture: {
          url: string;
          body: Record<string, unknown>;
        }) => readonly unknown[];
      }
    ).buildCodexDynamicTools({
      url: "https://api.openai.test/v1/responses",
      body: {
        model: "gpt-5.4",
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
          {
            type: "web_search",
          },
        ],
      },
    });

    expect(dynamicTools).toEqual([
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
    ]);
  });

  test("exports createRequestScopedToolRegistry for request-scoped function tool registry", () => {
    expect(
      typeof (bridge as { createRequestScopedToolRegistry?: unknown })
        .createRequestScopedToolRegistry,
    ).toBe("function");
  });

  test("createRequestScopedToolRegistry produces explicit failures for unimplemented bridged tool names", async () => {
    const createRequestScopedToolRegistry = (
      bridge as {
        createRequestScopedToolRegistry: (
          dynamicTools: readonly {
            readonly name: string;
            readonly description?: string;
            readonly inputSchema: Record<string, unknown>;
          }[],
        ) => { connectors: readonly { tools: readonly { name: string }[] }[] };
      }
    ).createRequestScopedToolRegistry;

    const registry = createRequestScopedToolRegistry([
      {
        name: "lookupRegistry",
        description: "Look up endpoint details.",
        inputSchema: {
          type: "object",
          properties: { endpointId: { type: "string" } },
          required: ["endpointId"],
        },
      },
    ]);

    expect(registry.connectors).toHaveLength(1);
    expect(registry.connectors[0].tools.map((t) => t.name)).toEqual(["lookupRegistry"]);

    const result = await executeToolCalls(registry, {
      requestId: "test-req-1",
      toolCalls: [
        {
          name: "lookupRegistry",
          arguments: { endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4" },
          providerToolId: "call-1",
        },
      ],
    });

    expect(result.executions).toHaveLength(1);
    expect(result.executions[0].status).toBe("failed");
    expect(result.executions[0].toolName).toBe("lookupRegistry");
    expect(result.executions[0].output).toBeNull();
    expect(result.executions[0].diagnostics[0]?.message).toContain(
      "is not implemented by the Codex Subscription bridge",
    );
  });

  test("seedManagedCodexWorkspaceFixture stages benchmark files for Codex tool-heavy cases", async () => {
    expect(
      typeof (bridge as { seedManagedCodexWorkspaceFixture?: unknown })
        .seedManagedCodexWorkspaceFixture,
    ).toBe("function");

    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-codex-workspace-"));
    try {
      await (
        bridge as {
          seedManagedCodexWorkspaceFixture: (workspaceRoot: string) => Promise<void>;
        }
      ).seedManagedCodexWorkspaceFixture(workspaceRoot);

      await expect(readFileSync(path.join(workspaceRoot, "src", "router.ts"), "utf8")).toContain(
        "export function routeRuntimeRequest",
      );
      await expect(readFileSync(path.join(workspaceRoot, "src", "router.ts"), "utf8")).toContain(
        "throughputSlaHardDeny",
      );
      await expect(
        readFileSync(path.join(workspaceRoot, "state", "runtime-config.yaml"), "utf8"),
      ).toContain("strategy: controller");
      await expect(readFileSync(path.join(workspaceRoot, "src", "config.ts"), "utf8")).toContain(
        "const MODE = 'baseline';",
      );
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("createRequestScopedToolRegistry executes read/list/write tools and apply_patch against a staged workspace", async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-codex-tools-"));
    try {
      await (
        bridge as {
          seedManagedCodexWorkspaceFixture: (workspaceRoot: string) => Promise<void>;
        }
      ).seedManagedCodexWorkspaceFixture(workspaceRoot);

      const createRequestScopedToolRegistry = (
        bridge as {
          createRequestScopedToolRegistry: (
            dynamicTools: readonly {
              readonly name: string;
              readonly description?: string;
              readonly inputSchema: Record<string, unknown>;
            }[],
            options?: {
              readonly workspaceRoot?: string;
              readonly applyPatchMode?: "ack" | "mutate";
            },
          ) => { connectors: readonly { tools: readonly { name: string }[] }[] };
        }
      ).createRequestScopedToolRegistry;

      const registry = createRequestScopedToolRegistry(
        [
          {
            name: "read_file",
            description: "Read a file from the benchmark workspace.",
            inputSchema: {
              type: "object",
              properties: { path: { type: "string" } },
              required: ["path"],
            },
          },
          {
            name: "grep_search",
            description: "Search within the benchmark workspace.",
            inputSchema: {
              type: "object",
              properties: { pattern: { type: "string" } },
              required: ["pattern"],
            },
          },
          {
            name: "list_dir",
            description: "List a directory from the benchmark workspace.",
            inputSchema: {
              type: "object",
              properties: { path: { type: "string" } },
            },
          },
          {
            name: "write_file",
            description: "Write a file into the benchmark workspace.",
            inputSchema: {
              type: "object",
              properties: {
                path: { type: "string" },
                content: { type: "string" },
              },
              required: ["path", "content"],
            },
          },
          {
            name: "create_directory",
            description: "Create a directory in the benchmark workspace.",
            inputSchema: {
              type: "object",
              properties: { path: { type: "string" } },
              required: ["path"],
            },
          },
          {
            name: "apply_patch",
            description: "Apply a unified diff patch in the benchmark workspace.",
            inputSchema: {
              type: "object",
              properties: { diff: { type: "string" } },
              required: ["diff"],
            },
          },
        ],
        { workspaceRoot, applyPatchMode: "mutate" },
      );

      const readResult = await executeToolCalls(registry, {
        requestId: "codex-tool-read",
        toolCalls: [
          {
            name: "read_file",
            arguments: { path: "src/router.ts" },
            providerToolId: "call-read",
          },
        ],
      });
      expect(readResult.executions[0]?.status).toBe("succeeded");
      expect(String(readResult.executions[0]?.output)).toContain("routeRuntimeRequest");

      const grepResult = await executeToolCalls(registry, {
        requestId: "codex-tool-grep",
        toolCalls: [
          {
            name: "grep_search",
            arguments: { pattern: "evaluateEligibility" },
            providerToolId: "call-grep",
          },
        ],
      });
      expect(grepResult.executions[0]?.status).toBe("succeeded");
      expect(String(grepResult.executions[0]?.output)).toContain("src/router.ts");
      expect(String(grepResult.executions[0]?.output)).toContain("evaluateEligibility");

      const listDirResult = await executeToolCalls(registry, {
        requestId: "codex-tool-list-dir",
        toolCalls: [
          {
            name: "list_dir",
            arguments: { path: "src" },
            providerToolId: "call-list-dir",
          },
        ],
      });
      expect(listDirResult.executions[0]?.status).toBe("succeeded");
      expect(String(listDirResult.executions[0]?.output)).toContain("Directory src:");
      expect(String(listDirResult.executions[0]?.output)).toContain("router.ts");

      const createDirectoryResult = await executeToolCalls(registry, {
        requestId: "codex-tool-create-dir",
        toolCalls: [
          {
            name: "create_directory",
            arguments: { path: "notes" },
            providerToolId: "call-create-dir",
          },
        ],
      });
      expect(createDirectoryResult.executions[0]?.status).toBe("succeeded");
      expect(String(createDirectoryResult.executions[0]?.output)).toContain("Created directory");

      const writeFileResult = await executeToolCalls(registry, {
        requestId: "codex-tool-write-file",
        toolCalls: [
          {
            name: "write_file",
            arguments: { path: "notes/summary.md", content: "# summary\n" },
            providerToolId: "call-write-file",
          },
        ],
      });
      expect(writeFileResult.executions[0]?.status).toBe("succeeded");
      expect(readFileSync(path.join(workspaceRoot, "notes", "summary.md"), "utf8")).toContain(
        "# summary",
      );

      const patchResult = await executeToolCalls(registry, {
        requestId: "codex-tool-patch",
        toolCalls: [
          {
            name: "apply_patch",
            arguments: {
              diff: [
                "--- a/src/config.ts",
                "+++ b/src/config.ts",
                "@@ -1 +1 @@",
                "-export const MODE = 'baseline';",
                "+export const MODE = 'difficulty';",
              ].join("\n"),
            },
            providerToolId: "call-patch",
          },
        ],
      });
      expect(patchResult.executions[0]?.status).toBe("succeeded");
      expect(String(patchResult.executions[0]?.output)).toContain("Patch applied successfully");
      expect(readFileSync(path.join(workspaceRoot, "src", "config.ts"), "utf8")).toContain(
        "difficulty",
      );
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("createRequestScopedToolRegistry fails explicitly for unsupported bridged tools", async () => {
    const createRequestScopedToolRegistry = (
      bridge as {
        createRequestScopedToolRegistry: (
          dynamicTools: readonly {
            readonly name: string;
            readonly description?: string;
            readonly inputSchema: Record<string, unknown>;
          }[],
          options?: {
            readonly workspaceRoot?: string;
            readonly applyPatchMode?: "ack" | "mutate";
          },
        ) => { connectors: readonly { tools: readonly { name: string }[] }[] };
      }
    ).createRequestScopedToolRegistry;

    const registry = createRequestScopedToolRegistry([
      {
        name: "nonstandard_runtime_tool",
        description: "A tool the Codex bridge cannot execute.",
        inputSchema: {
          type: "object",
        },
      },
    ]);

    const result = await executeToolCalls(registry, {
      requestId: "codex-tool-unsupported",
      toolCalls: [
        {
          name: "nonstandard_runtime_tool",
          arguments: {},
          providerToolId: "call-unsupported",
        },
      ],
    });

    expect(result.executions[0]?.status).toBe("failed");
    expect(result.executions[0]?.diagnostics[0]?.message).toContain(
      "is not implemented by the Codex Subscription bridge",
    );
  });

  test("createRequestScopedToolRegistry tells Codex to use shell tools for external file paths", async () => {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-codex-tools-"));
    const externalRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-codex-external-"));
    try {
      await (
        bridge as {
          seedManagedCodexWorkspaceFixture: (workspaceRoot: string) => Promise<void>;
        }
      ).seedManagedCodexWorkspaceFixture(workspaceRoot);
      const externalPath = path.join(externalRoot, "notes.md");
      await writeFile(externalPath, "# external notes\n", "utf8");

      const createRequestScopedToolRegistry = (
        bridge as {
          createRequestScopedToolRegistry: (
            dynamicTools: readonly {
              readonly name: string;
              readonly description?: string;
              readonly inputSchema: Record<string, unknown>;
            }[],
            options?: {
              readonly workspaceRoot?: string;
              readonly applyPatchMode?: "ack" | "mutate";
            },
          ) => { connectors: readonly { tools: readonly { name: string }[] }[] };
        }
      ).createRequestScopedToolRegistry;

      const registry = createRequestScopedToolRegistry(
        [
          {
            name: "read_file",
            description: "Read a file from the benchmark workspace.",
            inputSchema: {
              type: "object",
              properties: { path: { type: "string" } },
              required: ["path"],
            },
          },
        ],
        { workspaceRoot },
      );

      const readResult = await executeToolCalls(registry, {
        requestId: "codex-tool-read-external",
        toolCalls: [
          {
            name: "read_file",
            arguments: { path: externalPath },
            providerToolId: "call-read-external",
          },
        ],
      });

      expect(readResult.executions[0]?.status).toBe("failed");
      expect(readResult.executions[0]?.diagnostics[0]?.message).toContain(
        "Use shell commands for external filesystem paths",
      );
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
      await rm(externalRoot, { recursive: true, force: true });
    }
  });

  test("buildCodexDynamicTools output is compatible with createRequestScopedToolRegistry", async () => {
    const dynamicTools = (
      bridge as {
        buildCodexDynamicTools: (requestCapture: {
          url: string;
          body: Record<string, unknown>;
        }) => readonly {
          readonly name: string;
          readonly description?: string;
          readonly inputSchema: Record<string, unknown>;
        }[];
      }
    ).buildCodexDynamicTools({
      url: "https://api.openai.test/v1/responses",
      body: {
        model: "gpt-5.4",
        tools: [
          {
            type: "function",
            name: "lookupRegistry",
            description: "Look up endpoint details.",
            parameters: {
              type: "object",
              properties: { endpointId: { type: "string" } },
              required: ["endpointId"],
            },
          },
        ],
      },
    });

    const createRequestScopedToolRegistry = (
      bridge as {
        createRequestScopedToolRegistry: (
          dynamicTools: readonly {
            readonly name: string;
            readonly description?: string;
            readonly inputSchema: Record<string, unknown>;
          }[],
        ) => { connectors: readonly { tools: readonly { name: string }[] }[] };
      }
    ).createRequestScopedToolRegistry;

    const registry = createRequestScopedToolRegistry(dynamicTools);
    expect(registry.connectors[0].tools.map((t) => t.name)).toEqual(["lookupRegistry"]);
  });

  test("Codex Subscription sanitizes unsupported Chat Completions optional parameters", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        `data: ${JSON.stringify({
          type: "response.completed",
          response: {
            id: "resp_codex_parameter_policy_chat",
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
    });
    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{
            statusCode: number;
            vendorMetadata?: {
              parameterSanitization?: readonly Record<string, unknown>[];
            };
          }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    const result = await adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-parameter-policy-tests",
      requestId: "req-codex-parameter-policy-chat-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/chat/completions",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: true,
          temperature: 0,
          max_tokens: 32,
          max_completion_tokens: 32,
          messages: [{ role: "user", content: "Say OK." }],
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
    });

    expect(result.statusCode).toBe(200);
    expect(capturedBody).toEqual(
      expect.objectContaining({
        model: "gpt-5.4",
        store: false,
        stream: true,
        include: ["reasoning.encrypted_content"],
        input: [{ role: "user", content: [{ type: "input_text", text: "Say OK." }] }],
      }),
    );
    expect(capturedBody).not.toHaveProperty("temperature");
    expect(capturedBody).not.toHaveProperty("max_tokens");
    expect(capturedBody).not.toHaveProperty("max_completion_tokens");
    expect(capturedBody).not.toHaveProperty("max_output_tokens");
    expect(result.vendorMetadata?.parameterSanitization).toEqual([
      expect.objectContaining({
        field: "temperature",
        sourceSurface: "openai.chat.completions",
        targetSurface: "chatgpt.codex.responses",
        action: "drop_with_receipt",
        adapterFamily: "codex-subscription-responses",
        providerId: "openai",
        vendorId: "chatgpt-codex-responses",
      }),
      expect.objectContaining({
        field: "max_tokens",
        sourceSurface: "openai.chat.completions",
        targetSurface: "chatgpt.codex.responses",
        action: "drop_with_receipt",
      }),
      expect.objectContaining({
        field: "max_completion_tokens",
        sourceSurface: "openai.chat.completions",
        targetSurface: "chatgpt.codex.responses",
        action: "drop_with_receipt",
      }),
    ]);
  });

  test("Codex Subscription sanitizes unsupported Responses optional parameters", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        `data: ${JSON.stringify({
          type: "response.completed",
          response: {
            id: "resp_codex_parameter_policy_responses",
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
    });
    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{
            statusCode: number;
            vendorMetadata?: {
              parameterSanitization?: readonly Record<string, unknown>[];
            };
          }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    const result = await adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-parameter-policy-tests",
      requestId: "req-codex-parameter-policy-responses-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/responses",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: true,
          temperature: 0,
          max_output_tokens: 32,
          input: "Say OK.",
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
    });

    expect(result.statusCode).toBe(200);
    expect(capturedBody).toEqual(
      expect.objectContaining({
        model: "gpt-5.4",
        store: false,
        stream: true,
        include: ["reasoning.encrypted_content"],
        input: [{ role: "user", content: [{ type: "input_text", text: "Say OK." }] }],
      }),
    );
    expect(capturedBody).not.toHaveProperty("temperature");
    expect(capturedBody).not.toHaveProperty("max_output_tokens");
    expect(result.vendorMetadata?.parameterSanitization).toEqual([
      expect.objectContaining({
        field: "temperature",
        sourceSurface: "openai.responses",
        targetSurface: "chatgpt.codex.responses",
        action: "drop_with_receipt",
      }),
      expect.objectContaining({
        field: "max_output_tokens",
        sourceSurface: "openai.responses",
        targetSurface: "chatgpt.codex.responses",
        action: "drop_with_receipt",
      }),
    ]);
  });

  test("Codex Subscription preserves explicit parallel_tool_calls=false on Responses requests", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        `data: ${JSON.stringify({
          type: "response.completed",
          response: {
            id: "resp_codex_parallel_false",
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
    });
    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{ statusCode: number }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    await adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-parallel-tool-false-tests",
      requestId: "req-codex-parallel-false-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/responses",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: false,
          input: "Use at most one tool.",
          tools: [
            {
              type: "function",
              name: "lookupRegistry",
              parameters: {
                type: "object",
                properties: {
                  endpointId: { type: "string" },
                },
              },
            },
          ],
          parallel_tool_calls: false,
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
    });

    expect(capturedBody?.parallel_tool_calls).toBe(false);
  });

  test("Codex Subscription transforms forced chat tool_choice into Responses named-tool form", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        `data: ${JSON.stringify({
          type: "response.completed",
          response: {
            id: "resp_codex_tool_choice_named",
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
    });
    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{ statusCode: number }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    await adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-tool-choice-tests",
      requestId: "req-codex-tool-choice-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/chat/completions",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: false,
          messages: [{ role: "user", content: "Use the read_file tool." }],
          tools: [
            {
              type: "function",
              function: {
                name: "read_file",
                parameters: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                  },
                  required: ["path"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: {
              name: "read_file",
            },
          },
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
    });

    expect(capturedBody?.tool_choice).toEqual({
      type: "function",
      name: "read_file",
    });
  });

  test("Codex Subscription leaves parallel_tool_calls unset when the caller omitted it", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        `data: ${JSON.stringify({
          type: "response.completed",
          response: {
            id: "resp_codex_parallel_unset",
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
    });
    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{ statusCode: number }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    await adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-parallel-tool-unset-tests",
      requestId: "req-codex-parallel-unset-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/responses",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: false,
          input: "Use tools if needed.",
          tools: [
            {
              type: "function",
              name: "lookupRegistry",
              parameters: {
                type: "object",
                properties: {
                  endpointId: { type: "string" },
                },
              },
            },
          ],
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
    });

    expect(capturedBody).not.toHaveProperty("parallel_tool_calls");
  });

  test("Codex Subscription applies the same parameter policy after alias routing", async () => {
    const capturedBodies: Record<string, unknown>[] = [];
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      capturedBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
      return new Response(
        `data: ${JSON.stringify({
          type: "response.completed",
          response: {
            id: "resp_codex_parameter_policy_alias",
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
    });
    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{
            statusCode: number;
            vendorMetadata?: {
              parameterSanitization?: readonly Record<string, unknown>[];
            };
          }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    const execute = (model: string, requestId: string) =>
      adapter.executeRequest({
        runtimeStateRoot: os.tmpdir(),
        scopeId: "codex-parameter-policy-tests",
        requestId,
        providerAccountId: "openai.personal.codex-subscription",
        modelId: "gpt-5.4",
        requestCapture: {
          providerFamily: "ai-sdk-openai",
          endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
          url: "https://api.openai.com/v1/chat/completions",
          headers: {},
          body: {
            model,
            stream: true,
            temperature: 0,
            max_tokens: 32,
            messages: [{ role: "user", content: "Say OK." }],
          },
        },
        authPayload: {
          auth_mode: "chatgpt",
          tokens: {
            access_token: "codex-access-test",
            refresh_token: "codex-refresh-test",
            account_id: "acct_codex_test",
          },
        },
      });

    const exactResult = await execute("chatgpt/gpt-5.4", "req-codex-parameter-policy-exact-001");
    const aliasResult = await execute(
      "difficulty.remote-only",
      "req-codex-parameter-policy-alias-001",
    );

    expect(exactResult.statusCode).toBe(200);
    expect(aliasResult.statusCode).toBe(200);
    expect(capturedBodies).toHaveLength(2);
    for (const body of capturedBodies) {
      expect(body).not.toHaveProperty("temperature");
      expect(body).not.toHaveProperty("max_tokens");
      expect(body).not.toHaveProperty("max_output_tokens");
    }
    expect(
      exactResult.vendorMetadata?.parameterSanitization?.map((decision) => decision.field),
    ).toEqual(["temperature", "max_tokens"]);
    expect(
      aliasResult.vendorMetadata?.parameterSanitization?.map((decision) => decision.field),
    ).toEqual(["temperature", "max_tokens"]);
  });

  test("Codex Subscription execution uses ChatGPT Codex Responses SSE and preserves downstream chat deltas", async () => {
    expect(
      typeof (bridge as { createCodexSubscriptionResponsesExecutionAdapter?: unknown })
        .createCodexSubscriptionResponsesExecutionAdapter,
    ).toBe("function");

    const upstreamEvents = [
      {
        type: "response.output_item.added",
        output_index: 0,
        item: { type: "reasoning", id: "rs_1", summary: [] },
      },
      {
        type: "response.reasoning_summary_text.delta",
        output_index: 0,
        delta: "thinking",
      },
      {
        type: "response.output_item.added",
        output_index: 1,
        item: { type: "message", id: "msg_1", role: "assistant", content: [] },
      },
      {
        type: "response.content_part.added",
        output_index: 1,
        part: { type: "output_text", text: "" },
      },
      { type: "response.output_text.delta", output_index: 1, delta: "Hel" },
      { type: "response.output_text.delta", output_index: 1, delta: "lo" },
      {
        type: "response.completed",
        response: {
          id: "resp_codex_test",
          status: "completed",
          usage: {
            input_tokens: 5,
            output_tokens: 3,
            total_tokens: 8,
            input_tokens_details: {
              cached_tokens: 4,
            },
            output_tokens_details: { reasoning_tokens: 1 },
          },
        },
      },
    ];
    const upstreamSse = `${upstreamEvents
      .map((event) => `data: ${JSON.stringify(event)}`)
      .join("\n\n")}\n\n`;
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      expect(String(url)).toBe("https://chatgpt.com/backend-api/codex/responses");
      const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer codex-access-test");
      expect(headers.get("chatgpt-account-id")).toBe("acct_codex_test");
      expect(headers.get("openai-beta")).toBe("responses=experimental");
      expect(headers.get("accept")).toBe("text/event-stream");
      expect(headers.has("x-api-key")).toBe(false);
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        model?: string;
        stream?: boolean;
        include?: string[];
        input?: unknown[];
        reasoning?: { effort?: string };
      };
      expect(body.model).toBe("gpt-5.4");
      expect(body.stream).toBe(true);
      expect(body.include).toEqual(["reasoning.encrypted_content"]);
      expect(body.reasoning?.effort).toBe("high");
      expect(body.input).toEqual([
        { role: "user", content: [{ type: "input_text", text: "Say hello." }] },
      ]);
      return new Response(upstreamSse, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    });

    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: {
            runtimeStateRoot: string;
            scopeId: string;
            requestId: string;
            providerAccountId: string;
            modelId: string;
            requestCapture: {
              providerFamily: string;
              endpointId: string;
              url: string;
              headers: Record<string, string>;
              body: Record<string, unknown>;
            };
            authPayload: {
              auth_mode: string;
              tokens: {
                access_token: string;
                refresh_token: string;
                account_id: string;
              };
            };
          }) => Promise<{
            statusCode: number;
            body: unknown;
            vendorMetadata?: { vendorId?: string };
          }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    const result = await adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-responses-contract-tests",
      requestId: "req-codex-responses-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/chat/completions",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: true,
          reasoning_effort: "high",
          messages: [{ role: "user", content: "Say hello." }],
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.statusCode).toBe(200);
    expect(result.vendorMetadata?.vendorId).toBe("chatgpt-codex-responses");
    expect(result.body).not.toContain("response.output_text.delta");
    expect(result.body).not.toContain("chatgpt-codex-responses");

    const payloads = String(result.body)
      .split(/\n\n/u)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.startsWith("data: "))
      .map((chunk) => chunk.slice("data: ".length))
      .filter((chunk) => chunk !== "[DONE]")
      .map(
        (chunk) =>
          JSON.parse(chunk) as {
            choices?: Array<{ delta?: Record<string, unknown>; finish_reason?: string | null }>;
          },
      );
    expect(
      payloads.flatMap((payload) =>
        (payload.choices ?? []).map((choice) => choice.delta?.reasoning_content).filter(Boolean),
      ),
    ).toEqual(["thinking"]);
    expect(
      payloads.flatMap((payload) =>
        (payload.choices ?? []).map((choice) => choice.delta?.content).filter(Boolean),
      ),
    ).toEqual(["Hel", "lo"]);
    expect(
      payloads.flatMap((payload) =>
        (payload.choices ?? []).map((choice) => choice.finish_reason).filter(Boolean),
      ),
    ).toEqual(["stop"]);
    expect(payloads.at(-1)).toEqual(
      expect.objectContaining({
        usage: {
          prompt_tokens: 5,
          completion_tokens: 3,
          prompt_tokens_details: {
            cached_tokens: 4,
          },
        },
      }),
    );
  });

  test("Codex Subscription execution preserves supported-zero cache detail on non-streamed Responses replies", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        `data: ${JSON.stringify({
          type: "response.completed",
          response: {
            id: "resp_codex_supported_zero",
            status: "completed",
            output_text: "cold response",
            usage: {
              input_tokens: 900,
              output_tokens: 12,
              input_tokens_details: {
                cached_tokens: 0,
              },
            },
          },
        })}\n\n`,
        {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        },
      );
    });

    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{
            statusCode: number;
            body: unknown;
          }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    const result = await adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-responses-cache-tests",
      requestId: "req-codex-responses-cache-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/responses",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: false,
          input: "Return a cold response.",
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
    });

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual(
      expect.objectContaining({
        id: "resp_codex_supported_zero",
        usage: {
          input_tokens: 900,
          output_tokens: 12,
          input_tokens_details: {
            cached_tokens: 0,
          },
        },
      }),
    );
  });

  test("Codex Subscription execution surfaces sibling tool calls on non-stream chat-completions replies", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        [
          {
            type: "response.output_item.done",
            output_index: 0,
            item: {
              type: "function_call",
              id: "fc_1",
              call_id: "call_1",
              name: "lookupRegistry",
              arguments: '{"endpointId":"moonshot.personal.primary.global.kimi-k2.5"}',
            },
          },
          {
            type: "response.output_item.done",
            output_index: 1,
            item: {
              type: "function_call",
              id: "fc_2",
              call_id: "call_2",
              name: "lookupRegistry",
              arguments: '{"endpointId":"deepseek.personal.primary.global.deepseek-v4-flash"}',
            },
          },
          {
            type: "response.completed",
            response: {
              id: "resp_codex_multi_tool_chat",
              status: "completed",
              usage: {
                input_tokens: 22,
                output_tokens: 7,
              },
            },
          },
        ]
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join(""),
        {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        },
      );
    });

    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{
            statusCode: number;
            body: Record<string, unknown>;
          }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    const result = await adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-nonstream-chat-tool-tests",
      requestId: "req-codex-nonstream-chat-tools-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/chat/completions",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: false,
          messages: [{ role: "user", content: "Use the registry tool twice." }],
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
    });

    expect(result.body).toEqual({
      id: "chatcmpl_req-codex-nonstream-chat-tools-001",
      object: "chat.completion",
      created: expect.any(Number),
      model: "chatgpt/gpt-5.4",
      choices: [
        {
          index: 0,
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: {
                  name: "lookupRegistry",
                  arguments: '{"endpointId":"moonshot.personal.primary.global.kimi-k2.5"}',
                },
              },
              {
                id: "call_2",
                type: "function",
                function: {
                  name: "lookupRegistry",
                  arguments: '{"endpointId":"deepseek.personal.primary.global.deepseek-v4-flash"}',
                },
              },
            ],
          },
        },
      ],
      usage: {
        prompt_tokens: 22,
        completion_tokens: 7,
      },
    });
  });

  test("Codex Subscription execution surfaces sibling tool calls on non-stream Responses replies", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        [
          {
            type: "response.output_item.done",
            output_index: 0,
            item: {
              type: "function_call",
              id: "fc_1",
              call_id: "call_1",
              name: "lookupRegistry",
              arguments: '{"endpointId":"moonshot.personal.primary.global.kimi-k2.5"}',
            },
          },
          {
            type: "response.output_item.done",
            output_index: 1,
            item: {
              type: "function_call",
              id: "fc_2",
              call_id: "call_2",
              name: "lookupRegistry",
              arguments: '{"endpointId":"deepseek.personal.primary.global.deepseek-v4-flash"}',
            },
          },
          {
            type: "response.completed",
            response: {
              id: "resp_codex_multi_tool_responses",
              status: "completed",
              usage: {
                input_tokens: 22,
                output_tokens: 7,
              },
            },
          },
        ]
          .map((event) => `data: ${JSON.stringify(event)}\n\n`)
          .join(""),
        {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        },
      );
    });

    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{
            statusCode: number;
            body: Record<string, unknown>;
          }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    const result = await adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-nonstream-responses-tool-tests",
      requestId: "req-codex-nonstream-responses-tools-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/responses",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: false,
          input: "Use the registry tool twice.",
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
    });

    expect(result.body).toEqual({
      id: "resp_codex_multi_tool_responses",
      object: "response",
      created_at: expect.any(Number),
      status: "incomplete",
      model: "chatgpt/gpt-5.4",
      output: [
        {
          type: "message",
          id: "msg_resp_codex_multi_tool_responses",
          role: "assistant",
          content: [],
        },
        {
          type: "function_call",
          id: "call_1",
          call_id: "call_1",
          name: "lookupRegistry",
          arguments: '{"endpointId":"moonshot.personal.primary.global.kimi-k2.5"}',
        },
        {
          type: "function_call",
          id: "call_2",
          call_id: "call_2",
          name: "lookupRegistry",
          arguments: '{"endpointId":"deepseek.personal.primary.global.deepseek-v4-flash"}',
        },
      ],
      usage: {
        input_tokens: 22,
        output_tokens: 7,
      },
    });
  });

  test("Codex Subscription execution writes chat-completions deltas before upstream completion", async () => {
    expect(
      typeof (bridge as { createCodexSubscriptionResponsesExecutionAdapter?: unknown })
        .createCodexSubscriptionResponsesExecutionAdapter,
    ).toBe("function");

    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;
    const encoder = new TextEncoder();
    const upstreamStream = new ReadableStream<Uint8Array>({
      start(controller) {
        streamController = controller;
      },
    });
    const fetchMock = vi.fn(async () => {
      return new Response(upstreamStream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    });
    const streamedChunks: string[] = [];
    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{
            statusCode: number;
            body: unknown;
          }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    const execution = adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-responses-streaming-tests",
      requestId: "req-codex-responses-streaming-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/chat/completions",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: true,
          messages: [{ role: "user", content: "Stream one token." }],
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
      streamChunkWriter: async (chunk: string) => {
        streamedChunks.push(chunk);
      },
    });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    streamController?.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({
          type: "response.output_text.delta",
          output_index: 0,
          delta: "early",
        })}\n\n`,
      ),
    );

    const firstChunk = await Promise.race([
      (async () => {
        while (streamedChunks.length === 0) {
          await delay(5);
        }
        return streamedChunks.join("");
      })(),
      delay(100).then(() => "timeout"),
    ]);

    try {
      expect(firstChunk).toContain('"content":"early"');
    } finally {
      streamController?.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "response.completed",
            response: {
              id: "resp_codex_streaming_test",
              status: "completed",
              usage: { input_tokens: 1, output_tokens: 1 },
            },
          })}\n\n`,
        ),
      );
      streamController?.close();
      await execution;
    }
  });

  test("Codex Subscription request conversion preserves assistant history as output_text", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const fetchMock = vi.fn(async (_url: string | URL, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      return new Response(
        `data: ${JSON.stringify({
          type: "response.completed",
          response: {
            id: "resp_codex_history_test",
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
    });
    const adapter = (
      bridge as {
        createCodexSubscriptionResponsesExecutionAdapter: (options: {
          networkFetcher: typeof fetch;
        }) => {
          executeRequest: (input: Record<string, unknown>) => Promise<{ statusCode: number }>;
        };
      }
    ).createCodexSubscriptionResponsesExecutionAdapter({
      networkFetcher: fetchMock as typeof fetch,
    });

    await adapter.executeRequest({
      runtimeStateRoot: os.tmpdir(),
      scopeId: "codex-responses-history-tests",
      requestId: "req-codex-responses-history-001",
      providerAccountId: "openai.personal.codex-subscription",
      modelId: "gpt-5.4",
      requestCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: "openai.personal.codex-subscription.global.gpt-5.4",
        url: "https://api.openai.com/v1/chat/completions",
        headers: {},
        body: {
          model: "chatgpt/gpt-5.4",
          stream: false,
          messages: [
            { role: "user", content: "hey" },
            { role: "assistant", content: "Hey - what can I help with?" },
            { role: "user", content: "sdfsdf" },
          ],
        },
      },
      authPayload: {
        auth_mode: "chatgpt",
        tokens: {
          access_token: "codex-access-test",
          refresh_token: "codex-refresh-test",
          account_id: "acct_codex_test",
        },
      },
    });

    expect(capturedBody?.input).toEqual([
      { role: "user", content: [{ type: "input_text", text: "hey" }] },
      {
        role: "assistant",
        content: [{ type: "output_text", text: "Hey - what can I help with?" }],
      },
      { role: "user", content: [{ type: "input_text", text: "sdfsdf" }] },
    ]);
  });

  test("Codex Subscription runtime source no longer contains app-server execution code", () => {
    const runtimeSource = readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
    const forbiddenPatterns = [
      /codex app-server/iu,
      /app-server/iu,
      /executeCodexAppServer/u,
      /createCodexAppServer/u,
      /buildCodexAppServer/u,
      /CODEX_APP_SERVER/u,
    ];

    for (const pattern of forbiddenPatterns) {
      expect(runtimeSource).not.toMatch(pattern);
    }
  });

  test("createRequestScopedToolRegistry does not require repoRoot or file system access", () => {
    const createRequestScopedToolRegistry = (
      bridge as {
        createRequestScopedToolRegistry: (
          dynamicTools: readonly {
            readonly name: string;
            readonly description?: string;
            readonly inputSchema: Record<string, unknown>;
          }[],
        ) => { connectors: readonly { tools: readonly { name: string }[] }[] };
      }
    ).createRequestScopedToolRegistry;

    const registry = createRequestScopedToolRegistry([
      {
        name: "testTool",
        description: "Test tool.",
        inputSchema: { type: "object" },
      },
    ]);

    expect(registry.connectors).toHaveLength(1);
    expect(registry.connectors[0].tools[0].name).toBe("testTool");
  });

  test("non-tool Codex behavior: buildCodexDynamicTools returns empty array when no function tools present", () => {
    const dynamicTools = (
      bridge as {
        buildCodexDynamicTools: (requestCapture: {
          url: string;
          body: Record<string, unknown>;
        }) => readonly unknown[];
      }
    ).buildCodexDynamicTools({
      url: "https://api.openai.test/v1/responses",
      body: {
        model: "gpt-5.4",
        tools: [
          {
            type: "web_search",
          },
        ],
      },
    });

    expect(dynamicTools).toEqual([]);
  });

  test("loadMcpConnectorConfigs throws ENOENT when testdata file is absent (reproduces original packaged-runtime crash)", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "role-model-packaged-sim-"));
    try {
      const loadMcpConnectorConfigs = (
        bridge as {
          loadMcpConnectorConfigs: (repoRoot: string) => Promise<unknown>;
        }
      ).loadMcpConnectorConfigs;

      await expect(loadMcpConnectorConfigs(tempDir)).rejects.toThrow(/ENOENT/);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("Codex tool path surfaces explicit failures for unimplemented request-scoped tool names in packaged-runtime-like environments", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "role-model-packaged-sim-"));
    try {
      const loadMcpConnectorConfigs = (
        bridge as {
          loadMcpConnectorConfigs: (repoRoot: string) => Promise<unknown>;
        }
      ).loadMcpConnectorConfigs;

      await expect(loadMcpConnectorConfigs(tempDir)).rejects.toThrow(/ENOENT/);

      const createRequestScopedToolRegistry = (
        bridge as {
          createRequestScopedToolRegistry: (
            dynamicTools: readonly {
              readonly name: string;
              readonly description?: string;
              readonly inputSchema: Record<string, unknown>;
            }[],
          ) => { connectors: readonly { tools: readonly { name: string }[] }[] };
        }
      ).createRequestScopedToolRegistry;

      const dynamicTools = (
        bridge as {
          buildCodexDynamicTools: (requestCapture: {
            url: string;
            body: Record<string, unknown>;
          }) => readonly {
            readonly name: string;
            readonly description?: string;
            readonly inputSchema: Record<string, unknown>;
          }[];
        }
      ).buildCodexDynamicTools({
        url: "https://api.openai.test/v1/responses",
        body: {
          model: "gpt-5.4",
          tools: [
            {
              type: "function",
              name: "lookupRegistry",
              description: "Look up endpoint details.",
              parameters: {
                type: "object",
                properties: { endpointId: { type: "string" } },
                required: ["endpointId"],
              },
            },
          ],
        },
      });

      const registry = createRequestScopedToolRegistry(dynamicTools);

      const result = await executeToolCalls(registry, {
        requestId: "packaged-sim-1",
        toolCalls: [
          {
            name: "lookupRegistry",
            arguments: { endpointId: "openai.personal.openai-codex-subscription.global.gpt-5.4" },
            providerToolId: "call-1",
          },
        ],
      });

      expect(result.executions).toHaveLength(1);
      expect(result.executions[0].status).toBe("failed");
      expect(result.executions[0].toolName).toBe("lookupRegistry");
      expect(result.executions[0].output).toBeNull();
      expect(result.executions[0].diagnostics[0]?.message).toContain(
        "is not implemented by the Codex Subscription bridge",
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test("createRequestScopedToolRegistry signature has no repoRoot parameter (architecture-level guard against testdata reads)", () => {
    const createRequestScopedToolRegistry = (
      bridge as {
        createRequestScopedToolRegistry: (...args: unknown[]) => unknown;
      }
    ).createRequestScopedToolRegistry;

    expect(createRequestScopedToolRegistry.length).toBe(1);

    const createRequestScopedToolRegistryTyped = createRequestScopedToolRegistry as (
      dynamicTools: readonly {
        readonly name: string;
        readonly description?: string;
        readonly inputSchema: Record<string, unknown>;
      }[],
    ) => unknown;

    const registry = createRequestScopedToolRegistryTyped([
      {
        name: "archGuardTool",
        description: "Architecture guard test.",
        inputSchema: { type: "object" },
      },
    ]);

    expect(registry).toBeDefined();
    expect((registry as { connectors: unknown[] }).connectors).toHaveLength(1);
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
      capabilityEligibility: {
        requiredInputModalities: ["text"],
        requiredOutputModalities: ["text"],
        requiredCapabilities: ["text.chat"],
        advisoryCapabilities: [],
        includedEndpoints: [
          "moonshot.personal.kimi-code.global.kimi-k2.5",
          "moonshot.personal.primary.global.kimi-k2.5",
        ],
        excludedTargets: [],
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

  test("narrows exact-model chat routing to an explicitly requested endpoint", () => {
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
          difficultyContext?: unknown,
          controllerContext?: unknown,
          requestOptions?: {
            endpointId?: string;
          },
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Use the saved OAuth endpoint." }],
      },
      "req-host-endpoint-override-001",
      undefined,
      undefined,
      undefined,
      {
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
      },
    );

    expect(result.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.primary.global.kimi-k2.5",
    ]);
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
          requestedRoleId: "coder",
          taskType: "code.edit",
          requiredCapabilities: ["code.edit", "tools.function_calling"],
          preferredCapabilities: ["reasoning.multi_step"],
          strategy: "quality",
          preferLocal: true,
          preferredEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.5"],
        },
      },
    );

    expect(result.routingRequest).toMatchObject({
      requestedRoleId: "coder",
      taskType: "code.edit",
      requiredCapabilities: ["code.edit", "tools.function_calling"],
      preferredCapabilities: ["reasoning.multi_step"],
      strategy: "quality",
      preferLocal: true,
      allowEndpoints: ["moonshot.personal.primary.global.kimi-k2.5"],
    });
    expect(result.routingModel).toBeUndefined();
    expect(result.routingDiagnostics?.controllerRouting).toEqual({
      active: true,
      acceptedDirectives: {
        requestedRoleId: "coder",
        taskType: "code.edit",
        requiredCapabilities: ["code.edit", "tools.function_calling"],
        preferredCapabilities: ["reasoning.multi_step"],
        strategy: "quality",
        preferLocal: true,
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
      requiredCapabilities: ["text.chat", "tools.function_calling"],
      preferredCapabilities: [],
      strategy: "balanced",
      preferLocal: false,
      allowEndpoints: ["moonshot.personal.primary.global.kimi-k2.5"],
    });
    expect(result.routingModel).toBeUndefined();
    expect(result.routingDiagnostics).toEqual({
      aliasResolution: {
        requestedModel: "gpt-5.4",
        aliasId: "gpt-5.4",
        resolvedModelIds: ["moonshot/kimi-k2.5"],
        allowEndpoints: ["moonshot.personal.primary.global.kimi-k2.5"],
      },
      capabilityEligibility: {
        requiredInputModalities: ["text"],
        requiredOutputModalities: ["text"],
        requiredCapabilities: ["text.chat", "tools.function_calling"],
        advisoryCapabilities: [],
        includedEndpoints: ["moonshot.personal.primary.global.kimi-k2.5"],
        excludedTargets: [
          {
            endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            reasons: ["missing_capability.tools.function_calling"],
          },
        ],
      },
    });
  });

  test("applies a directly requested role to chat routing and execution policy", () => {
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
          controllerContext?: unknown,
          requestOptions?: {
            requestedRoleId?: string;
          },
          roleDefinitions?: readonly Record<string, unknown>[],
        ) => {
          routingRequest: {
            requestedRoleId?: string;
            taskType: string;
            requiredCapabilities: readonly string[];
            preferredCapabilities: readonly string[];
            needsTools: boolean;
          };
          executionRequest: {
            messages: readonly { role: string; content: string }[];
            tools?: readonly { name: string }[];
          };
          routingDiagnostics?: {
            rolePolicy?: {
              requestedRoleId: string;
              appliedRoleId: string;
              defaultSystemInstructionsApplied: boolean;
              toolPolicyMode: string;
              allowedTools?: readonly string[];
              outputContracts: readonly string[];
              safetyPolicyRefs: readonly string[];
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Review the runtime policy update." }],
        tools: [
          {
            type: "function",
            function: {
              name: "run_tests",
              parameters: { type: "object", properties: {} },
            },
          },
          {
            type: "function",
            function: {
              name: "deploy_release",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      "req-host-role-policy-chat-001",
      [],
      undefined,
      undefined,
      {
        requestedRoleId: "qa.reviewer",
      },
      [
        {
          role_id: "qa.reviewer",
          name: "QA Reviewer",
          description: "Validates runtime behavior.",
          role_kind: "assistant",
          default_system_instructions: "Review carefully and call only approved tools.",
          task_types_supported: ["text.chat"],
          required_capabilities: [],
          preferred_capabilities: ["reasoning.multi_step"],
          forbidden_capabilities: [],
          tool_policy: {
            mode: "limited",
            allowed_tools: ["run_tests"],
          },
          routing_policy_overrides: {},
          output_contracts: ["review.checklist"],
          safety_policy_refs: ["safety.review"],
        },
      ],
    );

    expect(result.routingRequest).toMatchObject({
      requestedRoleId: "qa.reviewer",
      taskType: "text.chat",
      requiredCapabilities: ["text.chat", "tools.function_calling"],
      preferredCapabilities: [],
      needsTools: true,
    });
    expect(result.executionRequest.messages).toEqual([
      {
        role: "system",
        content: "Review carefully and call only approved tools.",
      },
      {
        role: "system",
        content: "You must satisfy these output contracts in your response: review.checklist.",
      },
      {
        role: "system",
        content: "Apply these safety policies while handling the request: safety.review.",
      },
      {
        role: "user",
        content: "Review the runtime policy update.",
      },
    ]);
    expect(result.executionRequest.tools).toEqual([
      expect.objectContaining({
        name: "run_tests",
      }),
    ]);
    expect(result.routingDiagnostics?.rolePolicy).toEqual({
      requestedRoleId: "qa.reviewer",
      appliedRoleId: "qa.reviewer",
      defaultSystemInstructionsApplied: true,
      toolPolicyMode: "limited",
      allowedTools: ["run_tests"],
      outputContracts: ["review.checklist"],
      safetyPolicyRefs: ["safety.review"],
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
            endpointMaxDifficultyByEndpointId?: Record<string, "easy" | "medium" | "hard">;
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
      rubricSignals: expect.objectContaining({
        toolCount: 2,
        historyTurnCount: 4,
        codeOrSchemaBurden: true,
      }),
    });
    expect(result.routingDiagnostics).toMatchObject({
      capabilityEligibility: {
        requiredInputModalities: ["text"],
        requiredOutputModalities: ["text"],
        requiredCapabilities: ["text.chat", "tools.function_calling"],
        includedEndpoints: ["moonshot.personal.primary.global.kimi-k2.5"],
        excludedTargets: [
          {
            endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            reasons: ["missing_capability.tools.function_calling"],
          },
        ],
      },
    });
  });

  test("escalates a high-risk single-turn code-change ask to hard difficulty and quality routing", () => {
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
            endpointMaxDifficultyByEndpointId?: Record<string, "easy" | "medium" | "hard">;
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
                codeOrSchemaBurden: boolean;
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
          {
            role: "user",
            content:
              "Read this TypeScript routing bug report, identify the root cause, preserve the public API, add regression tests, explain how you would verify the fix, and patch the controller output handling without breaking existing alias behavior.",
          },
        ],
      },
      "req-host-difficulty-chat-hard-ask-001",
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
      excludedEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.5"],
      rubricSignals: expect.objectContaining({
        codeOrSchemaBurden: true,
      }),
    });
  });

  test("escalates tool-bearing workspace file requests to hard difficulty instead of the cost lane", () => {
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
            endpointMaxDifficultyByEndpointId?: Record<string, "easy" | "medium" | "hard">;
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
              rubricSignals: {
                toolCount: number;
                codeOrSchemaBurden: boolean;
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
          {
            role: "user",
            content:
              "Read src/router.ts and answer with the first exported symbol name from that file.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "read_file",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      "req-host-difficulty-chat-file-tool-001",
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
      rubricSignals: expect.objectContaining({
        toolCount: 1,
        codeOrSchemaBurden: true,
      }),
    });
  });

  test("keeps ordinary tool code aliases provider agnostic", () => {
    const mixedRegistry: EndpointRegistryResult = {
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
            endpoint_id: "openai.personal.openai-codex-subscription.global.gpt-5.4",
            endpoint_kind: "remote_api",
            provider_kind: "remote_openai_compat",
            serving_source: "remote-service",
            model_id: "chatgpt/gpt-5.4",
            runtime_version: "test-registry-v1",
            region: "global",
          },
          declared: {
            endpoint_id: "openai.personal.openai-codex-subscription.global.gpt-5.4",
            capabilities: ["text.chat", "tools.function_calling"],
            modalities: ["text"],
            max_context_tokens: 200000,
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
    };

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
            endpointMaxDifficultyByEndpointId?: Record<string, "easy" | "medium" | "hard">;
          },
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
            strategy: string;
          };
          routingModel?: {
            endpointId: string;
            preferredEndpointIds: readonly string[];
          };
        };
      }
    ).mapChatCompletionsRequest(
      mixedRegistry,
      {
        model: "difficulty.remote-only",
        messages: [
          {
            role: "user",
            content:
              "Read src/router.ts and answer with the first exported symbol name from that file only.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "read_file",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      "req-host-difficulty-provider-agnostic-001",
      [
        {
          aliasId: "difficulty.remote-only",
          mode: "difficulty",
          modelIds: ["chatgpt/gpt-5.4", "deepseek/deepseek-v4-flash"],
        },
      ],
      {
        endpointMaxDifficultyByEndpointId: {
          "deepseek.personal.primary.global.deepseek-v4-flash": "hard",
          "openai.personal.openai-codex-subscription.global.gpt-5.4": "hard",
        },
      },
    );

    expect(result.routingRequest.allowEndpoints).toEqual([
      "deepseek.personal.primary.global.deepseek-v4-flash",
      "openai.personal.openai-codex-subscription.global.gpt-5.4",
    ]);
    expect(result.routingModel).toBeUndefined();
    expect(result.routingRequest.strategy).toBe("quality");
  });

  test("does not contain provider-specific routing pin helpers", () => {
    const runtimeSource = readFileSync(path.join(__dirname, "..", "src", "index.ts"), "utf8");
    expect(runtimeSource).not.toContain("applyOpenAICodexSubscriptionInitialPin");
    expect(runtimeSource).not.toContain("resolveOpenAICodexSubscriptionRoutingModel");
    expect(runtimeSource).not.toContain("shouldPreferOpenAICodexSubscriptionForTurn");
    expect(runtimeSource).not.toContain("preferredCodexRoutingModel");
    expect(runtimeSource).not.toContain("fallbackAllowEndpoints");
  });

  test("keeps operator-configured Codex subscription exact endpoints eligible even when the model id is newer than the static matrix", () => {
    const codexRegistry: EndpointRegistryResult = {
      endpoints: [
        {
          identity: {
            endpoint_id: "openai.personal.openai-codex-subscription.global.gpt-5.6-preview",
            endpoint_kind: "remote_api",
            provider_kind: "remote_openai_compat",
            serving_source: "remote-service",
            model_id: "chatgpt/gpt-5.6-preview",
            runtime_version: "test-registry-v1",
            region: "global",
          },
          declared: {
            endpoint_id: "openai.personal.openai-codex-subscription.global.gpt-5.6-preview",
            capabilities: ["text.chat", "tools.function_calling"],
            modalities: ["text"],
            max_context_tokens: 200000,
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
    };

    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
          };
          routingModel?: {
            endpointId: string;
            preferredEndpointIds: readonly string[];
          };
        };
      }
    ).mapChatCompletionsRequest(
      codexRegistry,
      {
        model: "chatgpt/gpt-5.6-preview",
        messages: [
          {
            role: "user",
            content: "Read src/router.ts and answer with the first exported symbol name only.",
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "read_file",
              parameters: { type: "object", properties: {} },
            },
          },
        ],
      },
      "req-host-codex-compat-001",
    );

    expect(result.routingRequest.allowEndpoints).toEqual([
      "openai.personal.openai-codex-subscription.global.gpt-5.6-preview",
    ]);
    expect(result.routingModel).toBeUndefined();
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
            endpointMaxDifficultyByEndpointId?: Record<string, "easy" | "medium" | "hard">;
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
      "moonshot.personal.primary.global.kimi-k2.5",
    ]);
    expect(result.routingDiagnostics).toEqual({
      aliasResolution: {
        requestedModel: "gpt-5.4",
        aliasId: "gpt-5.4",
        resolvedModelIds: ["moonshot/kimi-k2.5"],
        allowEndpoints: ["moonshot.personal.primary.global.kimi-k2.5"],
      },
      capabilityEligibility: {
        requiredInputModalities: ["text"],
        requiredOutputModalities: ["text"],
        requiredCapabilities: ["text.chat", "tools.function_calling"],
        advisoryCapabilities: [],
        includedEndpoints: ["moonshot.personal.primary.global.kimi-k2.5"],
        excludedTargets: [
          {
            endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
            modelId: "moonshot/kimi-k2.5",
            reasons: ["missing_capability.tools.function_calling"],
          },
        ],
      },
    });
  });

  test("uses the persisted Strategy B mode as the default routing mode when no alias mode or request override is set", () => {
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
            active: boolean;
            resolvedGuidance?: {
              strategy?: string;
              preferLocal?: boolean;
            };
          },
          requestOptions?: unknown,
          roleDefinitions?: unknown,
          defaultRoutingMode?: "baseline" | "difficulty" | "controller" | "hybrid",
        ) => {
          routingRequest: {
            strategy: string;
            preferLocal: boolean;
            allowEndpoints: readonly string[];
          };
          routingDiagnostics?: {
            routingMode?: {
              source: string;
              effectiveMode: string;
            };
            controllerRouting?: {
              active: boolean;
              acceptedDirectives?: {
                strategy?: string;
                preferLocal?: boolean;
              };
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Route this with the saved strategy." }],
      },
      "req-host-default-controller-chat-001",
      [],
      undefined,
      {
        active: true,
        resolvedGuidance: {
          strategy: "quality",
          preferLocal: true,
        },
      },
      undefined,
      undefined,
      "controller",
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
        source: "runtime-config",
        effectiveMode: "controller",
      },
      controllerRouting: {
        active: true,
        acceptedDirectives: {
          strategy: "quality",
          preferLocal: true,
        },
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
      capabilityEligibility: {
        requiredInputModalities: ["text"],
        requiredOutputModalities: ["text"],
        requiredCapabilities: ["text.chat"],
        advisoryCapabilities: [],
        includedEndpoints: [
          "moonshot.personal.kimi-code.global.kimi-k2.5",
          "moonshot.personal.primary.global.kimi-k2.5",
        ],
        excludedTargets: [],
      },
    });
  });

  test("maps responses role_model intent metadata into the routing request", () => {
    const result = (
      bridge as {
        mapResponsesRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            roleModelIntent?: unknown;
          };
        };
      }
    ).mapResponsesRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        input: "Implement this small bug fix and add a regression test.",
        role_model: {
          intent: {
            taxonomyVersion: "1.0.0-alpha.1",
            classificationContractVersion: "role-model.classification.v1",
            role: { id: "coder", hard: false },
            task: { id: "coder.edit", hard: false },
            capabilities: { preferred: ["code.write"] },
            modalities: { required: ["text"] },
            source: "heuristic",
            confidence: 0.72,
          },
        },
      },
      "resp-taxonomy-intent",
    );

    expect(result.routingRequest.roleModelIntent).toEqual(
      expect.objectContaining({
        taxonomyVersion: "1.0.0-alpha.1",
        classificationContractVersion: "role-model.classification.v1",
        role: { id: "coder", hard: false },
        task: { id: "coder.edit", hard: false },
        source: "heuristic",
        confidence: 0.72,
      }),
    );
  });

  test("maps stable proposal-shaped responses role_model intent metadata into the routing request", () => {
    const result = (
      bridge as {
        mapResponsesRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            roleModelIntent?: unknown;
          };
        };
      }
    ).mapResponsesRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        input: "Implement this small bug fix and add a regression test.",
        role_model: {
          contract_version: 1,
          intent: {
            taxonomy_version: "1.0.0-alpha.1",
            content_revision: "taxonomy-v1-alpha.1",
            classification_contract_version: "role-model.classification.v1",
            role_hint_id: "coder",
            role_source: "heuristic",
            task_type: "coder.edit",
            task_action: "edit",
            task_source: "heuristic",
            task_confidence: 0.72,
            preferred_capabilities: ["code.write"],
            required_modalities: ["text"],
          },
        },
      },
      "resp-taxonomy-intent-stable",
    );

    expect(result.routingRequest.roleModelIntent).toEqual(
      expect.objectContaining({
        taxonomyVersion: "1.0.0-alpha.1",
        classificationContractVersion: "role-model.classification.v1",
        role: { id: "coder", hard: false },
        task: { id: "coder.edit", hard: false },
        capabilities: { preferred: ["code.write"] },
        modalities: { required: ["text"] },
        source: "heuristic",
        confidence: 0.72,
      }),
    );
  });

  test("maps responses tool choice, reasoning, prompt cache, affinity, and previous response id into the execution request", () => {
    const reasoningRegistry: EndpointRegistryResult = {
      ...registry,
      endpoints: registry.endpoints.map((endpoint) =>
        endpoint.identity.endpoint_id === "moonshot.personal.primary.global.kimi-k2.5"
          ? {
              ...endpoint,
              declared: {
                ...endpoint.declared,
                capabilities: [...endpoint.declared.capabilities, "reasoning"],
              },
            }
          : endpoint,
      ),
    };

    const result = (
      bridge as {
        mapResponsesRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly unknown[],
          difficultyContext?: unknown,
          controllerContext?: unknown,
          requestOptions?: {
            sessionId?: string;
            clientRequestId?: string;
            transportPreference?: string;
          },
        ) => {
          executionRequest: Record<string, unknown>;
        };
      }
    ).mapResponsesRequest(
      reasoningRegistry,
      {
        model: "moonshot/kimi-k2.5",
        input: "Use the lookupRegistry tool and continue the previous response.",
        tools: [
          {
            type: "function",
            name: "lookupRegistry",
            parameters: {
              type: "object",
              properties: {
                endpointId: { type: "string" },
              },
              required: ["endpointId"],
            },
          },
        ],
        tool_choice: {
          type: "function",
          name: "lookupRegistry",
        },
        reasoning_effort: "high",
        previous_response_id: "resp_prev_001",
        prompt_cache_key: "cache-key-001",
      },
      "resp-propagation-001",
      [],
      undefined,
      undefined,
      {
        sessionId: "session-alpha",
        clientRequestId: "client-req-001",
        transportPreference: "websocket",
      },
    );

    expect(result.executionRequest.toolChoice).toEqual({
      type: "function",
      function: {
        name: "lookupRegistry",
      },
    });
    expect(result.executionRequest.promptCache).toEqual({
      mode: "prefer",
      key: "cache-key-001",
    });
    expect(result.executionRequest.reasoning).toEqual({
      effort: "high",
    });
    expect(result.executionRequest.continuation).toEqual({
      previousResponseId: "resp_prev_001",
    });
    expect(result.executionRequest.sessionAffinity).toEqual({
      sessionId: "session-alpha",
      clientRequestId: "client-req-001",
    });
    expect(result.executionRequest.transportPreference).toBe("websocket");
  });

  test("maps responses parallel_tool_calls into the execution request", () => {
    const result = (
      bridge as {
        mapResponsesRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          executionRequest: Record<string, unknown>;
        };
      }
    ).mapResponsesRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        input: "Use at most one tool in this turn.",
        parallel_tool_calls: false,
      },
      "resp-parallel-tool-calls-001",
    );

    expect(result.executionRequest.parallelToolCalls).toBe(false);
  });

  test("maps typed responses function-call replay items into execution messages", () => {
    const openaiRegistry: EndpointRegistryResult = {
      endpoints: [
        {
          identity: {
            endpoint_id: "openai.personal.codex-subscription.global.gpt-5.4",
            endpoint_kind: "remote_api",
            provider_kind: "provider-openai",
            serving_source: "remote-service",
            model_id: "chatgpt/gpt-5.4",
            runtime_version: "test-registry-v1",
            region: "global",
          },
          declared: {
            endpoint_id: "openai.personal.codex-subscription.global.gpt-5.4",
            capabilities: ["text.chat", "tools.function_calling"],
            modalities: ["text"],
            max_context_tokens: 200000,
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
    };

    const result = (
      bridge as {
        mapResponsesRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          executionRequest: {
            messages: readonly Record<string, unknown>[];
          };
        };
      }
    ).mapResponsesRequest(
      openaiRegistry,
      {
        model: "chatgpt/gpt-5.4",
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: "Use the lookupRegistry tool and then continue.",
              },
            ],
          },
          {
            type: "function_call",
            call_id: "call_lookup_001",
            name: "lookupRegistry",
            arguments: '{"endpointId":"openai.personal.primary.us-east-1.fast"}',
          },
          {
            type: "function_call_output",
            call_id: "call_lookup_001",
            output: '{"endpointId":"openai.personal.primary.us-east-1.fast","status":"healthy"}',
          },
        ],
      },
      "resp-typed-replay-001",
    );

    expect(result.executionRequest.messages).toEqual([
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Use the lookupRegistry tool and then continue.",
          },
        ],
      },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_lookup_001",
            type: "function",
            function: {
              name: "lookupRegistry",
              arguments: '{"endpointId":"openai.personal.primary.us-east-1.fast"}',
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: "call_lookup_001",
        content: '{"endpointId":"openai.personal.primary.us-east-1.fast","status":"healthy"}',
      },
    ]);
  });

  test("maps chat-completions session affinity and transport preference into the execution request", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly unknown[],
          difficultyContext?: unknown,
          controllerContext?: unknown,
          requestOptions?: {
            sessionId?: string;
            clientRequestId?: string;
            transportPreference?: string;
          },
        ) => {
          executionRequest: Record<string, unknown>;
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Route this with preserved affinity." }],
      },
      "chat-affinity-001",
      [],
      undefined,
      undefined,
      {
        sessionId: "session-chat-001",
        clientRequestId: "client-chat-001",
        transportPreference: "sse",
      },
    );

    expect(result.executionRequest.sessionAffinity).toEqual({
      sessionId: "session-chat-001",
      clientRequestId: "client-chat-001",
    });
    expect(result.executionRequest.transportPreference).toBe("sse");
  });

  test("maps chat-completions prompt_cache_key into the execution request", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          executionRequest: Record<string, unknown>;
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Route this with a stable cache key." }],
        prompt_cache_key: "chat-cache-key-001",
      },
      "chat-prompt-cache-001",
    );

    expect(result.executionRequest.promptCache).toEqual({
      mode: "prefer",
      key: "chat-cache-key-001",
    });
  });

  test("maps chat-completions parallel_tool_calls into the execution request", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          executionRequest: Record<string, unknown>;
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Use every needed tool in one turn." }],
        parallel_tool_calls: true,
      },
      "chat-parallel-tool-calls-001",
    );

    expect(result.executionRequest.parallelToolCalls).toBe(true);
  });

  test("tracks cache continuity per session across A -> B -> A and records create versus restore state", async () => {
    expect(
      typeof (bridge as { readCacheContinuityRouteHints?: unknown }).readCacheContinuityRouteHints,
    ).toBe("function");
    expect(
      typeof (bridge as { persistCacheContinuityOutcome?: unknown }).persistCacheContinuityOutcome,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-cache-continuity-ledger-"),
    );

    try {
      const { databasePath } = initializeSqliteMemory({
        runtimeStateRoot,
        scopeId: "cache-continuity-test",
      });
      const hostBridge = bridge as {
        readCacheContinuityRouteHints: (input: {
          readonly databasePath: string;
          readonly executionRequest: Record<string, unknown>;
        }) => Record<string, unknown> | null;
        persistCacheContinuityOutcome: (input: {
          readonly databasePath: string;
          readonly executionRequest: Record<string, unknown>;
          readonly endpointId: string;
          readonly promptCachingSupported: boolean;
          readonly inputTokens: number;
          readonly requestSurface: string;
        }) => Record<string, unknown> | null;
      };
      const executionRequest = {
        messages: [{ role: "user", content: "Keep this session stable." }],
        sessionAffinity: {
          sessionId: "pi-session-001",
          clientRequestId: "pi-client-001",
        },
      };

      expect(
        hostBridge.readCacheContinuityRouteHints({
          databasePath,
          executionRequest,
        }),
      ).toEqual({
        enabled: true,
        scopeSource: "session_affinity",
        activeEndpointId: null,
        warmedEndpointIds: [],
      });

      expect(
        hostBridge.persistCacheContinuityOutcome({
          databasePath,
          executionRequest,
          endpointId: "endpoint-a",
          promptCachingSupported: true,
          inputTokens: 1600,
          requestSurface: "openai.chat.completions",
        }),
      ).toEqual({
        enabled: true,
        scopeSource: "session_affinity",
        previousActiveEndpointId: null,
        advisoryWarmedEndpointIds: [],
        selectedEndpointId: "endpoint-a",
        selectedDomainState: "created",
        advisorySelectionApplied: false,
      });

      expect(
        hostBridge.readCacheContinuityRouteHints({
          databasePath,
          executionRequest,
        }),
      ).toEqual({
        enabled: true,
        scopeSource: "session_affinity",
        activeEndpointId: "endpoint-a",
        warmedEndpointIds: ["endpoint-a"],
      });

      expect(
        hostBridge.persistCacheContinuityOutcome({
          databasePath,
          executionRequest,
          endpointId: "endpoint-b",
          promptCachingSupported: true,
          inputTokens: 1700,
          requestSurface: "openai.responses",
        }),
      ).toEqual({
        enabled: true,
        scopeSource: "session_affinity",
        previousActiveEndpointId: "endpoint-a",
        advisoryWarmedEndpointIds: ["endpoint-a"],
        selectedEndpointId: "endpoint-b",
        selectedDomainState: "created",
        advisorySelectionApplied: false,
      });

      expect(
        hostBridge.readCacheContinuityRouteHints({
          databasePath,
          executionRequest,
        }),
      ).toEqual({
        enabled: true,
        scopeSource: "session_affinity",
        activeEndpointId: "endpoint-b",
        warmedEndpointIds: ["endpoint-a", "endpoint-b"],
      });

      expect(
        hostBridge.persistCacheContinuityOutcome({
          databasePath,
          executionRequest,
          endpointId: "endpoint-a",
          promptCachingSupported: true,
          inputTokens: 1800,
          requestSurface: "openai.chat.completions",
        }),
      ).toEqual({
        enabled: true,
        scopeSource: "session_affinity",
        previousActiveEndpointId: "endpoint-b",
        advisoryWarmedEndpointIds: ["endpoint-a", "endpoint-b"],
        selectedEndpointId: "endpoint-a",
        selectedDomainState: "restored",
        advisorySelectionApplied: true,
      });
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("maps chat-completions reasoning effort into the execution request", () => {
    const reasoningRegistry: EndpointRegistryResult = {
      ...registry,
      endpoints: registry.endpoints.map((endpoint) =>
        endpoint.identity.endpoint_id === "moonshot.personal.primary.global.kimi-k2.5"
          ? {
              ...endpoint,
              declared: {
                ...endpoint.declared,
                capabilities: [...endpoint.declared.capabilities, "reasoning"],
              },
            }
          : endpoint,
      ),
    };

    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            requiredCapabilities: readonly string[];
          };
          executionRequest: Record<string, unknown>;
        };
      }
    ).mapChatCompletionsRequest(
      reasoningRegistry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Use high reasoning effort." }],
        reasoning_effort: "high",
      },
      "chat-reasoning-effort-001",
    );

    expect(result.routingRequest.requiredCapabilities).toContain("reasoning.effort_control");
    expect(result.executionRequest.reasoning).toEqual({
      effort: "high",
    });
  });

  test("maps chat-completions thinking controls into the execution request", () => {
    const reasoningRegistry: EndpointRegistryResult = {
      ...registry,
      endpoints: registry.endpoints.map((endpoint) =>
        endpoint.identity.endpoint_id === "moonshot.personal.primary.global.kimi-k2.5"
          ? {
              ...endpoint,
              declared: {
                ...endpoint.declared,
                capabilities: [...endpoint.declared.capabilities, "reasoning"],
              },
            }
          : endpoint,
      ),
    };

    const thinking = {
      type: "enabled",
      budget_tokens: 1024,
    };
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
        ) => {
          routingRequest: {
            requiredCapabilities: readonly string[];
          };
          executionRequest: Record<string, unknown>;
        };
      }
    ).mapChatCompletionsRequest(
      reasoningRegistry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Use explicit thinking controls." }],
        thinking,
      },
      "chat-thinking-control-001",
    );

    expect(result.routingRequest.requiredCapabilities).toContain("reasoning.control");
    expect(result.executionRequest.reasoning).toEqual({
      channel: "thinking",
      raw: thinking,
    });
  });

  test("treats unknown stable role_model task metadata as advisory before routing", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly unknown[],
          difficultyContext?: unknown,
          controllerContext?: unknown,
          requestOptions?: unknown,
          roleDefinitions?: readonly Record<string, unknown>[],
          defaultRoutingMode?: unknown,
          inventory?: unknown,
          taskDefinitions?: readonly Record<string, unknown>[],
        ) => {
          routingRequest: {
            taskType: string;
            roleModelIntent?: {
              task?: { id: string; hard?: boolean };
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Do an impossible taxonomy task." }],
        role_model: {
          contract_version: 1,
          intent: {
            taxonomy_version: "1.0.0-alpha.1",
            classification_contract_version: "role-model.classification.v1",
            requested_role_id: "security",
            task_type: "security.unknown",
            task_source: "client.rule",
            required_capabilities: ["text.chat"],
            required_modalities: ["text"],
          },
        },
      },
      "req-taxonomy-intent-invalid-task",
      [],
      undefined,
      undefined,
      undefined,
      [
        {
          role_id: "security",
          description: "Security review role.",
          default_system_instructions: "Review for security issues.",
          task_types_supported: ["security.audit"],
          required_capabilities: ["text.chat"],
          preferred_capabilities: ["security.analysis"],
          forbidden_capabilities: [],
          tool_policy: { mode: "allowed", allowed_tools: [] },
          output_contracts: [],
          safety_policy_refs: [],
        },
      ],
      undefined,
      null,
      [
        {
          task_type: "security.audit",
          description: "Security audit task.",
          required_inputs: ["text"],
          required_capabilities: ["text.chat"],
          preferred_capabilities: ["security.analysis"],
          quality_metrics: [],
          allowed_roles: ["security"],
          default_benchmark_suites: [],
        },
      ],
    );

    expect(result.routingRequest.roleModelIntent?.task).toEqual({
      id: "security.unknown",
      hard: false,
    });
    expect(result.routingRequest.taskType).not.toBe("security.unknown");
  });

  test("treats unknown stable role_model requested role metadata as advisory before routing", () => {
    const result = (
      bridge as {
        mapChatCompletionsRequest: (
          value: EndpointRegistryResult,
          body: Record<string, unknown>,
          requestId: string,
          modelAliases?: readonly unknown[],
          difficultyContext?: unknown,
          controllerContext?: unknown,
          requestOptions?: unknown,
          roleDefinitions?: readonly Record<string, unknown>[],
        ) => {
          routingRequest: {
            requestedRoleId?: string;
            roleModelIntent?: {
              role?: { id: string; hard?: boolean };
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "Please handle this request normally." }],
        role_model: {
          contract_version: 1,
          intent: {
            taxonomy_version: "1.0.0-alpha.1",
            classification_contract_version: "role-model.classification.v1",
            requested_role_id: "missing-role",
            role_source: "heuristic",
            task_type: "missing-role.unknown",
            task_source: "heuristic",
            required_modalities: ["text"],
          },
        },
      },
      "req-taxonomy-intent-invalid-role",
      [],
      undefined,
      undefined,
      undefined,
      [
        {
          role_id: "security",
          description: "Security review role.",
          default_system_instructions: "Review for security issues.",
          task_types_supported: ["security.audit"],
          required_capabilities: ["text.chat"],
          preferred_capabilities: ["security.analysis"],
          forbidden_capabilities: [],
          tool_policy: { mode: "allowed", allowed_tools: [] },
          output_contracts: [],
          safety_policy_refs: [],
        },
      ],
    );

    expect(result.routingRequest.roleModelIntent?.role).toEqual({
      id: "missing-role",
      hard: false,
    });
    expect(result.routingRequest.requestedRoleId).toBeUndefined();
  });

  test("rejects explicit hard role_model task metadata before routing", () => {
    expect(() =>
      (
        bridge as {
          mapChatCompletionsRequest: (
            value: EndpointRegistryResult,
            body: Record<string, unknown>,
            requestId: string,
            modelAliases?: readonly unknown[],
            difficultyContext?: unknown,
            controllerContext?: unknown,
            requestOptions?: unknown,
            roleDefinitions?: readonly Record<string, unknown>[],
            defaultRoutingMode?: unknown,
            inventory?: unknown,
            taskDefinitions?: readonly Record<string, unknown>[],
          ) => unknown;
        }
      ).mapChatCompletionsRequest(
        registry,
        {
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Do an impossible taxonomy task." }],
          role_model: {
            intent: {
              taxonomyVersion: "1.0.0-alpha.1",
              classificationContractVersion: "role-model.classification.v1",
              role: { id: "security", hard: true },
              task: { id: "security.unknown", hard: true },
            },
          },
        },
        "req-taxonomy-intent-hard-invalid-task",
        [],
        undefined,
        undefined,
        undefined,
        [
          {
            role_id: "security",
            description: "Security review role.",
            default_system_instructions: "Review for security issues.",
            task_types_supported: ["security.audit"],
            required_capabilities: ["text.chat"],
            preferred_capabilities: ["security.analysis"],
            forbidden_capabilities: [],
            tool_policy: { mode: "allowed", allowed_tools: [] },
            output_contracts: [],
            safety_policy_refs: [],
          },
        ],
        undefined,
        null,
        [
          {
            task_type: "security.audit",
            description: "Security audit task.",
            required_inputs: ["text"],
            required_capabilities: ["text.chat"],
            preferred_capabilities: ["security.analysis"],
            quality_metrics: [],
            allowed_roles: ["security"],
            default_benchmark_suites: [],
          },
        ],
      ),
    ).toThrow("Requested task security.unknown is not defined in the runtime task policy.");
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
            endpointMaxDifficultyByEndpointId?: Record<string, "easy" | "medium" | "hard">;
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

  test("applies requested role execution policy to responses requests", () => {
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
          difficultyContext?: unknown,
          controllerContext?: unknown,
          requestOptions?: {
            requestedRoleId?: string;
          },
          roleDefinitions?: readonly Record<string, unknown>[],
        ) => {
          routingRequest: {
            requestedRoleId?: string;
            taskType: string;
            requiredCapabilities: readonly string[];
            preferredCapabilities: readonly string[];
            needsTools: boolean;
          };
          executionRequest: {
            messages: readonly { role: string; content: string }[];
            tools?: readonly { name: string }[];
          };
          routingDiagnostics?: {
            rolePolicy?: {
              requestedRoleId: string;
              appliedRoleId: string;
              defaultSystemInstructionsApplied: boolean;
              toolPolicyMode: string;
              allowedTools?: readonly string[];
              outputContracts: readonly string[];
              safetyPolicyRefs: readonly string[];
            };
          };
        };
      }
    ).mapResponsesRequest(
      registry,
      {
        model: "moonshot/kimi-k2.5",
        input: "Review the runtime policy update.",
        tools: [
          {
            type: "function",
            name: "run_tests",
            parameters: { type: "object", properties: {} },
          },
          {
            type: "function",
            name: "deploy_release",
            parameters: { type: "object", properties: {} },
          },
        ],
      },
      "req-host-role-policy-response-001",
      [],
      undefined,
      undefined,
      {
        requestedRoleId: "qa.reviewer",
      },
      [
        {
          role_id: "qa.reviewer",
          name: "QA Reviewer",
          description: "Validates runtime behavior.",
          role_kind: "assistant",
          default_system_instructions: "Review carefully and call only approved tools.",
          task_types_supported: ["text.chat"],
          required_capabilities: [],
          preferred_capabilities: ["reasoning.multi_step"],
          forbidden_capabilities: [],
          tool_policy: {
            mode: "limited",
            allowed_tools: ["run_tests"],
          },
          routing_policy_overrides: {},
          output_contracts: ["review.checklist"],
          safety_policy_refs: ["safety.review"],
        },
      ],
    );

    expect(result.routingRequest).toMatchObject({
      requestedRoleId: "qa.reviewer",
      taskType: "text.chat",
      requiredCapabilities: ["text.chat", "tools.function_calling"],
      preferredCapabilities: [],
      needsTools: true,
    });
    expect(result.executionRequest.messages).toEqual([
      {
        role: "system",
        content: "Review carefully and call only approved tools.",
      },
      {
        role: "system",
        content: "You must satisfy these output contracts in your response: review.checklist.",
      },
      {
        role: "system",
        content: "Apply these safety policies while handling the request: safety.review.",
      },
      {
        role: "user",
        content: "Review the runtime policy update.",
      },
    ]);
    expect(result.executionRequest.tools).toEqual([
      expect.objectContaining({
        name: "run_tests",
      }),
    ]);
    expect(result.routingDiagnostics?.rolePolicy).toEqual({
      requestedRoleId: "qa.reviewer",
      appliedRoleId: "qa.reviewer",
      defaultSystemInstructionsApplied: true,
      toolPolicyMode: "limited",
      allowedTools: ["run_tests"],
      outputContracts: ["review.checklist"],
      safetyPolicyRefs: ["safety.review"],
    });
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

    expect(result.models.map((entry) => entry.id)).toEqual(["gpt-5.4", "moonshot/kimi-k2.5"]);
    expect(result.setup.recommendedModel).toBe("gpt-5.4");
  });

  test("prefers the alias derived from the live runtime routing config in downstream OpenAI provider config", () => {
    const result = (
      bridge as {
        createDownstreamOpenAIProviderConfig: (
          value: EndpointRegistryResult,
          baseUrl: string,
          modelAliases?: readonly {
            aliasId: string;
            modelIds: readonly string[];
          }[],
          options?: {
            recommendedModelId?: string | null;
          },
        ) => {
          models: readonly { id: string }[];
          setup: { recommendedModel: string | null };
        };
      }
    ).createDownstreamOpenAIProviderConfig(
      registry,
      "http://127.0.0.1:4010",
      [
        {
          aliasId: "default.decision-only",
          modelIds: ["moonshot/kimi-k2.5"],
        },
        {
          aliasId: "difficulty.remote-only",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      {
        recommendedModelId: "difficulty.remote-only",
      },
    );

    expect(result.models.map((entry) => entry.id)).toEqual([
      "default.decision-only",
      "difficulty.remote-only",
      "moonshot/kimi-k2.5",
    ]);
    expect(result.setup.recommendedModel).toBe("difficulty.remote-only");
  });

  test("fallback downstream OpenAI provider config remains compatible with pi-role-model", () => {
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
          contractVersion: string;
          models: readonly {
            id: string;
            type?: string;
            piMapping?: { contextWindow: number | null; maxTokens: number | null };
          }[];
          setup: { recommendedModel: string | null };
        };
      }
    ).createDownstreamOpenAIProviderConfig(registry, "http://127.0.0.1:4010", [
      {
        aliasId: "gpt-5.4",
        modelIds: ["moonshot/kimi-k2.5"],
      },
    ]);

    expect(result.contractVersion).toBe("role-model.downstream.openai.v1");
    expect(result.models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "gpt-5.4",
          type: "alias",
          piMapping: { contextWindow: 128000, maxTokens: 8192 },
        }),
        expect.objectContaining({
          id: "moonshot/kimi-k2.5",
          type: "model",
          piMapping: { contextWindow: 128000, maxTokens: 8192 },
        }),
      ]),
    );
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

  test("serves lightweight latest request ids separately from the rich recent-request ledger", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    const listRecentRequestIds = vi.fn(async (limit = 10) => {
      expect(limit).toBe(10);
      return ["req-010", "req-009"];
    });
    const listRecentRequestObservations = vi.fn(async () => [
      {
        requestId: "req-010",
        clientRequestId: "client-010",
        endpointId: "test.capture.chat-v1",
      },
    ]);

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
          listRecentRequestIds?: (limit?: number) => Promise<readonly string[]>;
          listRecentRequestObservations?: () => Promise<readonly unknown[]>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      listRecentRequestIds,
      listRecentRequestObservations,
    });

    try {
      const latestIdsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/requests/latest-ids?limit=10`,
      );
      expect(latestIdsResponse.status).toBe(200);
      expect(await latestIdsResponse.json()).toEqual(["req-010", "req-009"]);
      expect(listRecentRequestIds).toHaveBeenCalledWith(10);
      expect(listRecentRequestObservations).not.toHaveBeenCalled();

      const recentResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/requests`);
      expect(recentResponse.status).toBe(200);
      expect(await recentResponse.json()).toEqual([
        {
          requestId: "req-010",
          clientRequestId: "client-010",
          endpointId: "test.capture.chat-v1",
        },
      ]);
      expect(listRecentRequestObservations).toHaveBeenCalledTimes(1);
    } finally {
      await server.close();
    }
  });

  test("accepts a local shutdown request when a shutdown hook is configured", async () => {
    const shutdown = vi.fn(async () => undefined);
    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          shutdown?: () => Promise<void>;
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
      shutdown,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
    });

    try {
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/runtime/shutdown`,
        { method: "POST" },
      );
      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ status: "shutting_down" });
      await delay(0);
      expect(shutdown).toHaveBeenCalledOnce();
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

      const providerResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/downstream/openai`,
      );
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
        startBridgeServer: (
          options: Record<string, unknown> & {
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
          },
        ) => Promise<{ port: number; close(): Promise<void> }>;
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

  test("returns JSON for /logs/stream before static root catch-all", async () => {
    const staticRoot = path.join(os.tmpdir(), `role-model-static-${Date.now()}`);
    await mkdir(staticRoot, { recursive: true });
    await writeFile(
      path.join(staticRoot, "index.html"),
      "<!doctype html><html><body>spa</body></html>",
      "utf8",
    );

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
          staticRoot: string;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      staticRoot,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
    });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/logs/stream`);
      expect(response.status).toBe(503);
      expect(response.headers.get("content-type")).toContain("application/json");
      const body = (await response.json()) as { error?: string };
      expect(body.error).toContain("log stream unavailable");
      expect(JSON.stringify(body)).not.toContain("<!doctype html>");
    } finally {
      await server.close();
      await rm(staticRoot, { recursive: true, force: true });
    }
  });

  test("serves the runtime UI shell from root and app routes when static root exists", async () => {
    const staticRoot = path.join(os.tmpdir(), `role-model-static-root-${Date.now()}`);
    await mkdir(staticRoot, { recursive: true });
    await writeFile(
      path.join(staticRoot, "index.html"),
      "<!doctype html><html><body>runtime ui shell</body></html>",
      "utf8",
    );

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
          staticRoot: string;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      staticRoot,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
    });

    try {
      for (const route of ["/", "/app", "/app/router/strategy"]) {
        const response = await fetch(`http://127.0.0.1:${server.port}${route}`);
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/html");
        expect(await response.text()).toContain("runtime ui shell");
      }
    } finally {
      await server.close();
      await rm(staticRoot, { recursive: true, force: true });
    }
  });

  test("preserves x-role-model-request-id as client correlation metadata while generating a canonical request id", async () => {
    let capturedRequestId = "";
    let capturedClientRequestId: string | undefined;
    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              clientRequestId?: string;
            },
          ) => Promise<unknown>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async (_body, requestId, _streamWriter, requestOptions) => {
        capturedRequestId = requestId;
        capturedClientRequestId = requestOptions?.clientRequestId;
        return {
          model: "moonshot/kimi-k2.5",
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          adapterFamily: "ai-sdk-openai-compatible",
          routingDecisionId: "decision-alias-test",
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
          "x-role-model-request-id": "req-alias-36",
        },
        body: JSON.stringify({
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      expect(response.status).toBe(200);
      expect(capturedRequestId).toMatch(/^req-/);
      expect(capturedRequestId).not.toBe("req-alias-36");
      expect(capturedClientRequestId).toBe("req-alias-36");
    } finally {
      await server.close();
    }
  });

  test("does not attempt to write a fallback error after the response is already committed", () => {
    const end = vi.fn();
    const setHeader = vi.fn();
    const response = {
      headersSent: true,
      writableEnded: true,
      statusCode: 200,
      setHeader,
      end,
    } as unknown as import("node:http").ServerResponse;

    const wrote = (
      bridge as {
        writeUnhandledBridgeError: (
          response: import("node:http").ServerResponse,
          error: unknown,
        ) => boolean;
      }
    ).writeUnhandledBridgeError(response, new Error("late failure"));

    expect(wrote).toBe(false);
    expect(setHeader).not.toHaveBeenCalled();
    expect(end).not.toHaveBeenCalled();
  });

  test("generates a unique canonical request id for each request when headers omit request ids", async () => {
    const capturedRequestIds: string[] = [];
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
      executeChatCompletions: async (_body, requestId) => {
        capturedRequestIds.push(requestId);
        return {
          model: "moonshot/kimi-k2.5",
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          adapterFamily: "ai-sdk-openai-compatible",
          routingDecisionId: `decision-${requestId}`,
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
      for (let index = 0; index < 2; index += 1) {
        const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "moonshot/kimi-k2.5",
            messages: [{ role: "user", content: `ping-${index}` }],
          }),
        });
        expect(response.status).toBe(200);
      }

      expect(capturedRequestIds).toHaveLength(2);
      expect(capturedRequestIds[0]).toMatch(/^req-/);
      expect(capturedRequestIds[1]).toMatch(/^req-/);
      expect(capturedRequestIds[0]).not.toBe("req-runtime-host-bridge");
      expect(capturedRequestIds[1]).not.toBe("req-runtime-host-bridge");
      expect(capturedRequestIds[0]).not.toBe(capturedRequestIds[1]);
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
      readRolePolicy: async () => ({
        roleDefinitions: [
          {
            role_id: "general.chat",
            name: "General Chat",
            description: "General chat role",
            role_kind: "assistant",
            default_system_instructions: "Help the user.",
            task_types_supported: ["text.chat"],
            required_capabilities: [],
            preferred_capabilities: [],
            forbidden_capabilities: [],
            tool_policy: { mode: "allowed", allowed_tools: [] },
            routing_policy_overrides: {},
            output_contracts: [],
            safety_policy_refs: [],
          },
        ],
        taskDefinitions: [
          {
            task_type: "text.chat",
            description: "General chat task",
            required_inputs: [],
            required_capabilities: ["text.chat"],
            preferred_capabilities: [],
            quality_metrics: [],
            allowed_roles: ["general.chat"],
            default_benchmark_suites: [],
          },
        ],
      }),
      createRolePolicyRole: async (body) => ({
        saved: true,
        ...body,
      }),
      updateRolePolicyRole: async (roleId, body) => ({
        saved: true,
        role_id: roleId,
        ...body,
      }),
      listTaskDefinitions: async () => [
        {
          task_type: "text.chat",
          description: "General chat task",
          required_inputs: [],
          required_capabilities: ["text.chat"],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["general.chat"],
          default_benchmark_suites: [],
        },
      ],
      updateTaskDefinitions: async (body) => body,
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
      listProviderDeviceAuthorizations: async () => [
        {
          authRequestId: "auth-001",
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshot",
          variantId: "kimi-code",
          status: "pending",
          userCode: "ABCD-EFGH",
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
          webSearchSupport: {
            mode: "native",
            currentRuntimeContract: "moonshot.chat.builtin_web_search",
            documentedProviderContract: "moonshot.chat.builtin_web_search",
          },
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
      const summaryResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/runtime/summary`,
      );
      expect(summaryResponse.status).toBe(200);
      expect(await summaryResponse.json()).toEqual({
        lifecycleSummary: registry.lifecycleSummary,
        providerCount: 1,
        accountCount: 2,
      });

      const providersResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/providers`,
      );
      expect(providersResponse.status).toBe(200);
      expect(await providersResponse.json()).toEqual([
        {
          providerId: "moonshot",
          displayName: "Moonshot AI",
          supportedAuthModes: ["api-key-static", "oauth2-device-code"],
        },
      ]);

      const accountsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/accounts`,
      );
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

      const deviceAuthorizationsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/accounts/device`,
      );
      expect(deviceAuthorizationsResponse.status).toBe(200);
      expect(await deviceAuthorizationsResponse.json()).toEqual([
        {
          authRequestId: "auth-001",
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshot",
          variantId: "kimi-code",
          status: "pending",
          userCode: "ABCD-EFGH",
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

      const rolePolicyResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/role-policy`,
      );
      expect(rolePolicyResponse.status).toBe(200);
      expect(await rolePolicyResponse.json()).toEqual({
        roleDefinitions: [
          expect.objectContaining({
            role_id: "general.chat",
            task_types_supported: ["text.chat"],
          }),
        ],
        taskDefinitions: [
          expect.objectContaining({
            task_type: "text.chat",
            allowed_roles: ["general.chat"],
          }),
        ],
      });

      const createRoleResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/roles`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            role_id: "qa.reviewer",
            name: "QA Reviewer",
          }),
        },
      );
      expect(createRoleResponse.status).toBe(200);
      expect(await createRoleResponse.json()).toEqual({
        saved: true,
        role_id: "qa.reviewer",
        name: "QA Reviewer",
      });

      const updateRoleResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/roles/qa.reviewer`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            name: "QA Reviewer Updated",
          }),
        },
      );
      expect(updateRoleResponse.status).toBe(200);
      expect(await updateRoleResponse.json()).toEqual({
        saved: true,
        role_id: "qa.reviewer",
        name: "QA Reviewer Updated",
      });

      const tasksResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/tasks`);
      expect(tasksResponse.status).toBe(200);
      expect(await tasksResponse.json()).toEqual([
        expect.objectContaining({
          task_type: "text.chat",
          allowed_roles: ["general.chat"],
        }),
      ]);

      const updateTasksResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/tasks`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify([
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
        },
      );
      expect(updateTasksResponse.status).toBe(200);
      expect(await updateTasksResponse.json()).toEqual([
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

      const upsertResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/accounts`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            providerAccountId: "moonshot.personal.primary",
          }),
        },
      );
      expect(upsertResponse.status).toBe(200);
      expect(await upsertResponse.json()).toEqual({
        saved: true,
        providerAccountId: "moonshot.personal.primary",
      });

      const deviceStartResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/accounts/device/start`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            providerAccountId: "moonshot.personal.kimi-code",
          }),
        },
      );
      expect(deviceStartResponse.status).toBe(200);
      expect(await deviceStartResponse.json()).toEqual({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "pending",
        userCode: "ABCD-EFGH",
      });

      const devicePollResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/accounts/device/poll`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            authRequestId: "auth-001",
          }),
        },
      );
      expect(devicePollResponse.status).toBe(200);
      expect(await devicePollResponse.json()).toEqual({
        authRequestId: "auth-001",
        providerAccountId: "moonshot.personal.kimi-code",
        status: "connected",
      });

      const runtimeConfigResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/runtime/config`,
      );
      expect(runtimeConfigResponse.status).toBe(200);
      expect(await runtimeConfigResponse.json()).toEqual({
        applied: true,
        path: "D:\\runtime-config.yaml",
        config: {
          version: "1.0",
          executionMode: "hybrid",
        },
      });

      const runtimeConfigUpdateResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/runtime/config`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            version: "1.1",
          }),
        },
      );
      expect(runtimeConfigUpdateResponse.status).toBe(200);
      expect(await runtimeConfigUpdateResponse.json()).toEqual({
        applied: true,
        path: "D:\\runtime-config.yaml",
        config: {
          version: "1.1",
          executionMode: "hybrid",
        },
      });

      const controllerResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/controller`,
      );
      expect(controllerResponse.status).toBe(200);
      expect(await controllerResponse.json()).toEqual({
        scope: "global",
        endpointId: "cli.local.coder",
        modelId: "gpt-5.4",
        sourceType: "local",
      });

      const updateControllerResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/controller`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          }),
        },
      );
      expect(updateControllerResponse.status).toBe(200);
      expect(await updateControllerResponse.json()).toEqual({
        scope: "global",
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        modelId: "moonshot/kimi-k2.5",
        sourceType: "remote",
      });

      const activateResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/endpoints`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            providerAccountId: "moonshot.personal.primary",
            modelId: "moonshot/kimi-k2.5",
            region: "global",
          }),
        },
      );
      expect(activateResponse.status).toBe(200);
      expect(await activateResponse.json()).toEqual({
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        status: "active",
      });

      const endpointsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/endpoints`,
      );
      expect(endpointsResponse.status).toBe(200);
      expect(await endpointsResponse.json()).toEqual([
        {
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          providerId: "moonshot",
          modelId: "moonshot/kimi-k2.5",
          webSearchSupport: {
            mode: "native",
            currentRuntimeContract: "moonshot.chat.builtin_web_search",
            documentedProviderContract: "moonshot.chat.builtin_web_search",
          },
        },
      ]);

      const routerSummaryResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/router/summary`,
      );
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

      const routerConfigResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/router/config`,
      );
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

      const routerCandidatesResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/router/candidates`,
      );
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

      const routerDecisionsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/router/decisions`,
      );
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
      const summaryResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/summary`,
      );
      expect(summaryResponse.status).toBe(200);
      expect(await summaryResponse.json()).toEqual({
        requestCount: 2,
        successCount: 1,
        failureCount: 1,
        totalTokens: 200,
      });

      const rowsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/rows`,
      );
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

      const requestsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/requests`,
      );
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

  test("serves the generic telemetry analytics query route", async () => {
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
          queryTelemetryAnalytics: (body: Record<string, unknown>) => Promise<unknown>;
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
      queryTelemetryAnalytics: async (body) => ({
        echoedQuery: body,
        buckets: [],
        ranking: null,
      }),
    });

    try {
      const analyticsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/query`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            windowMs: 86_400_000,
            granularity: "hour",
            metrics: ["requestCount", "effectiveCostUsd"],
            breakdown: "sourceType",
          }),
        },
      );
      expect(analyticsResponse.status).toBe(200);
      expect(await analyticsResponse.json()).toEqual({
        echoedQuery: {
          windowMs: 86_400_000,
          granularity: "hour",
          metrics: ["requestCount", "effectiveCostUsd"],
          breakdown: "sourceType",
        },
        buckets: [],
        ranking: null,
      });
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
      const response = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/downstream/openai`,
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        contractVersion: "role-model.downstream.openai.v1",
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
            type: "model",
            endpoint_ids: [
              "moonshot.personal.kimi-code.global.kimi-k2.5",
              "moonshot.personal.primary.global.kimi-k2.5",
            ],
            piMapping: {
              contextWindow: 128000,
              maxTokens: 8192,
            },
            modalities: {
              availableInput: ["text"],
              output: ["text"],
            },
            capabilities: {
              available: ["text.chat", "tools.function_calling"],
            },
          },
        ],
        setup: {
          recommendedModel: "moonshot/kimi-k2.5",
          notes: [
            "Configure downstream tooling as an OpenAI-compatible provider.",
            "Use GET /v1/models to discover the current model ids.",
            "Use POST /v1/chat/completions for routed inference and multi-turn tool history.",
            "POST /v1/responses supports string or string-content message input only; use chat-completions for tool-turn histories.",
          ],
        },
        freshness: {
          catalogVersion: "fallback",
          runtimeInventoryRevision: "fallback",
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
        startBridgeServer: (
          options: Record<string, unknown> & {
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
          },
        ) => Promise<{ port: number; close(): Promise<void> }>;
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
        await streamWriter?.(
          {
            type: "response.created",
            response: {
              id: "resp_123",
              created_at: 1,
              model: "moonshot/kimi-k2.5",
            },
          },
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            adapterFamily: "ai-sdk-openai",
            routingDecisionId: "decision-responses-stream-123",
          },
        );
        await delay(25);
        await streamWriter?.(
          {
            type: "response.output_text.delta",
            item_id: "msg_1",
            delta: "Ready now",
          },
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            adapterFamily: "ai-sdk-openai",
            routingDecisionId: "decision-responses-stream-123",
          },
        );
        await delay(25);
        await streamWriter?.(
          {
            type: "response.completed",
            response: {
              usage: {
                input_tokens: 11,
                output_tokens: 4,
              },
            },
          },
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            adapterFamily: "ai-sdk-openai",
            routingDecisionId: "decision-responses-stream-123",
          },
        );
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
      expect(response.headers.get("x-role-model-routing-decision-id")).toBe(
        "decision-responses-stream-123",
      );

      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      if (!reader) {
        throw new Error("Expected responses stream body reader to be available.");
      }
      const decoder = new TextDecoder();
      const firstChunk = await reader.read();
      const streamedPrefix = decoder.decode(firstChunk.value ?? new Uint8Array(), { stream: true });
      expect(streamedPrefix).toContain('"type":"response.created"');
      expect(executionCompleted).toBe(false);

      let transcript = streamedPrefix;
      while (true) {
        const chunk = await reader.read();
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
              arguments: '{"endpointId":"moonshot.personal.primary.global.kimi-k2.5"}',
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
                    arguments: '{"endpointId":"moonshot.personal.primary.global.kimi-k2.5"}',
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

  test("normalizes chat-completions provider SSE into Responses events on streamed /v1/responses", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    let executionCompleted = false;
    const server = await (
      bridge as {
        startBridgeServer: (
          options: Record<string, unknown> & {
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
            }>;
          },
        ) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async () => {
        throw new Error("not used");
      },
      executeResponses: async (_body, _requestId, streamWriter) => {
        expect(typeof streamWriter).toBe("function");
        const metadata = {
          endpointId: "deepseek.personal.primary.global.deepseek-v4-pro",
          adapterFamily: "ai-sdk-openai-compatible",
          routingDecisionId: "decision-responses-normalized-123",
        };
        await streamWriter?.(
          {
            id: "chatcmpl-deepseek",
            object: "chat.completion.chunk",
            created: 1,
            model: "deepseek/deepseek-v4-pro",
            choices: [
              {
                index: 0,
                delta: {
                  role: "assistant",
                  content: null,
                  reasoning_content: "",
                },
                finish_reason: null,
              },
            ],
          },
          metadata,
        );
        await delay(10);
        await streamWriter?.(
          {
            id: "chatcmpl-deepseek",
            object: "chat.completion.chunk",
            created: 1,
            model: "deepseek/deepseek-v4-pro",
            choices: [
              {
                index: 0,
                delta: {
                  content: null,
                  reasoning_content: "Thinking...",
                },
                finish_reason: null,
              },
            ],
          },
          metadata,
        );
        await delay(10);
        await streamWriter?.(
          {
            id: "chatcmpl-deepseek",
            object: "chat.completion.chunk",
            created: 1,
            model: "deepseek/deepseek-v4-pro",
            choices: [
              {
                index: 0,
                delta: {
                  content: "OK",
                },
                finish_reason: null,
              },
            ],
          },
          metadata,
        );
        await delay(10);
        await streamWriter?.(
          {
            id: "chatcmpl-deepseek",
            object: "chat.completion.chunk",
            created: 1,
            model: "deepseek/deepseek-v4-pro",
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 7,
              completion_tokens: 1,
            },
          },
          metadata,
        );
        executionCompleted = true;
        return {
          responseId: "resp_deepseek_123",
          model: "deepseek/deepseek-v4-pro",
          endpointId: "deepseek.personal.primary.global.deepseek-v4-pro",
          adapterFamily: "ai-sdk-openai-compatible",
          routingDecisionId: "decision-responses-normalized-123",
          outputText: "OK",
          finishReason: "stop",
          usage: {
            inputTokens: 7,
            outputTokens: 1,
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
          model: "difficulty.remote-only",
          stream: true,
          input: "Say OK.",
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
      expect(response.headers.get("x-role-model-endpoint-id")).toBe(
        "deepseek.personal.primary.global.deepseek-v4-pro",
      );
      expect(response.headers.get("x-role-model-adapter-family")).toBe("ai-sdk-openai-compatible");
      expect(response.headers.get("x-role-model-routing-decision-id")).toBe(
        "decision-responses-normalized-123",
      );

      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      if (!reader) {
        throw new Error("Expected responses stream body reader to be available.");
      }
      const decoder = new TextDecoder();
      const firstChunk = await reader.read();
      const streamedPrefix = decoder.decode(firstChunk.value ?? new Uint8Array(), { stream: true });
      expect(streamedPrefix).toContain('"type":"response.created"');
      expect(streamedPrefix).not.toContain('"chat.completion.chunk"');
      expect(streamedPrefix).not.toContain('"reasoning_content"');
      expect(executionCompleted).toBe(false);

      let transcript = streamedPrefix;
      while (true) {
        const chunk = await reader.read();
        transcript += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
        if (chunk.done) {
          break;
        }
      }

      expect(transcript).not.toContain('"chat.completion.chunk"');
      expect(transcript).not.toContain('"reasoning_content"');

      const payloads = transcript
        .trim()
        .split("\n\n")
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => entry.replace(/^data:\s*/, ""))
        .map((entry) => JSON.parse(entry) as Record<string, unknown>);

      expect(payloads.map((payload) => payload.type)).toEqual([
        "response.created",
        "response.output_item.added",
        "response.output_text.delta",
        "response.completed",
      ]);
      expect(payloads[0]).toEqual(
        expect.objectContaining({
          type: "response.created",
          response: expect.objectContaining({
            model: "deepseek/deepseek-v4-pro",
          }),
        }),
      );
      expect(payloads[1]).toEqual(
        expect.objectContaining({
          type: "response.output_item.added",
          output_index: 0,
          item: expect.objectContaining({
            type: "message",
          }),
        }),
      );
      expect(payloads[2]).toEqual(
        expect.objectContaining({
          type: "response.output_text.delta",
          delta: "OK",
        }),
      );
      expect(payloads[3]).toEqual(
        expect.objectContaining({
          type: "response.completed",
          response: expect.objectContaining({
            usage: {
              input_tokens: 7,
              output_tokens: 1,
            },
          }),
        }),
      );
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
        await streamWriter?.(
          {
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
          },
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            adapterFamily: "ai-sdk-openai",
            routingDecisionId: "decision-chat-stream-123",
          },
        );
        await delay(25);
        await streamWriter?.(
          {
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
          },
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            adapterFamily: "ai-sdk-openai",
            routingDecisionId: "decision-chat-stream-123",
          },
        );
        await delay(25);
        await streamWriter?.(
          {
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
          },
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            adapterFamily: "ai-sdk-openai",
            routingDecisionId: "decision-chat-stream-123",
          },
        );
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
      expect(response.headers.get("x-role-model-routing-decision-id")).toBe(
        "decision-chat-stream-123",
      );

      const reader = response.body?.getReader();
      expect(reader).toBeDefined();
      if (!reader) {
        throw new Error("Expected chat stream body reader to be available.");
      }
      const decoder = new TextDecoder();
      const firstChunk = await reader.read();
      const streamedPrefix = decoder.decode(firstChunk.value ?? new Uint8Array(), { stream: true });
      expect(streamedPrefix).toContain('"content":"un"');
      expect(executionCompleted).toBe(false);

      let transcript = streamedPrefix;
      while (true) {
        const chunk = await reader.read();
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

  test("emits reasoning_content before visible content for synthetic chat-completions streams", async () => {
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
            reasoningText?: string;
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
        outputText: "Ready",
        reasoningText: "I should answer briefly.",
        finishReason: "stop",
        usage: {
          inputTokens: 1,
          outputTokens: 1,
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
          stream: true,
          messages: [{ role: "user", content: "Stream this." }],
          reasoning_effort: "high",
        }),
      });

      expect(response.status).toBe(200);
      const transcript = await response.text();
      const payloads = transcript
        .trim()
        .split("\n\n")
        .map((entry) => entry.trim())
        .filter((entry) => entry && entry !== "data: [DONE]")
        .map((entry) => entry.replace(/^data:\s*/, ""))
        .map((entry) => JSON.parse(entry) as Record<string, unknown>);

      expect(payloads[0]).toMatchObject({
        choices: [
          {
            index: 0,
            delta: {
              role: "assistant",
              reasoning_content: "I should answer briefly.",
            },
            finish_reason: null,
          },
        ],
      });
      expect(JSON.stringify(payloads[0])).not.toContain('"content"');
      expect(payloads[1]).toMatchObject({
        choices: [
          {
            index: 0,
            delta: {
              content: "Ready",
            },
            finish_reason: null,
          },
        ],
      });
    } finally {
      await server.close();
    }
  });

  test("forwards x-role-model-routing-mode to chat-completions execution", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    let requestOptions:
      | {
          routingModeOverride?: string;
          endpointId?: string;
          requestedRoleId?: string;
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
              endpointId?: string;
              requestedRoleId?: string;
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
          "x-role-model-endpoint-id": "moonshot.personal.primary.global.kimi-k2.5",
          "x-role-model-requested-role-id": "qa.reviewer",
        },
        body: JSON.stringify({
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Respect the override." }],
        }),
      });

      expect(response.status).toBe(200);
      expect(requestOptions).toMatchObject({
        routingModeOverride: "baseline",
        endpointId: "moonshot.personal.primary.global.kimi-k2.5",
        requestedRoleId: "qa.reviewer",
      });
      expect(requestOptions?.abortSignal).toBeDefined();
      expect(requestOptions?.abortSignal?.aborted).toBe(false);
    } finally {
      await server.close();
    }
  });

  test("forwards ingress session, client correlation, and transport headers to chat-completions execution", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    let requestOptions:
      | {
          sessionId?: string;
          clientRequestId?: string;
          transportPreference?: string;
          abortSignal?: AbortSignal;
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
              sessionId?: string;
              clientRequestId?: string;
              transportPreference?: string;
              abortSignal?: AbortSignal;
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
          adapterFamily: "ai-sdk-openai-compatible",
          routingDecisionId: "decision-chat-ingress-affinity-123",
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
          "x-client-request-id": "client-chat-header-001",
          "session-id": "session-chat-header-001",
          "x-role-model-transport-preference": "websocket",
        },
        body: JSON.stringify({
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Preserve ingress semantics." }],
        }),
      });

      expect(response.status).toBe(200);
      expect(requestOptions).toMatchObject({
        clientRequestId: "client-chat-header-001",
        sessionId: "session-chat-header-001",
        transportPreference: "websocket",
      });
      expect(requestOptions?.abortSignal).toBeDefined();
      expect(requestOptions?.abortSignal?.aborted).toBe(false);
    } finally {
      await server.close();
    }
  });

  test("accepts Pi session-affinity header aliases on chat-completions ingress", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    let requestOptions:
      | {
          sessionId?: string;
          clientRequestId?: string;
          transportPreference?: string;
          abortSignal?: AbortSignal;
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
              sessionId?: string;
              clientRequestId?: string;
              transportPreference?: string;
              abortSignal?: AbortSignal;
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
          adapterFamily: "ai-sdk-openai-compatible",
          routingDecisionId: "decision-chat-ingress-affinity-pi-123",
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
          "x-client-request-id": "pi-client-header-001",
          session_id: "pi-session-header-001",
          "x-session-affinity": "pi-session-header-001",
        },
        body: JSON.stringify({
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Accept Pi session headers." }],
        }),
      });

      expect(response.status).toBe(200);
      expect(requestOptions).toMatchObject({
        clientRequestId: "pi-client-header-001",
        sessionId: "pi-session-header-001",
      });
      expect(requestOptions?.abortSignal).toBeDefined();
      expect(requestOptions?.abortSignal?.aborted).toBe(false);
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
          'Invalid x-role-model-routing-mode header value "bogus". Expected one of: baseline, difficulty, controller, hybrid.',
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
      fixtureRoot: testFixtureRoot,
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
      fixtureRoot: testFixtureRoot,
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

    const firstObservation = (await backend.readRequestObservation?.(firstRequestId)) as {
      telemetrySnapshot?: {
        selectedModelId?: string;
        requestedModelId?: string | null;
        requestOperation?: string | null;
        eligibleEndpointIds?: readonly string[];
        eligibleModelIds?: readonly string[];
        candidateCostSnapshot?: Record<string, unknown>;
        baselineMaxEligibleCostUsd?: number | null;
        costSavingsSupport?: string | null;
      };
    } | null;
    expect(firstObservation).toMatchObject({
      requestId: firstRequestId,
      endpointId: result.endpointId,
      capturePolicy: {
        structuredInspectionAvailable: true,
      },
    });
    expect(firstObservation?.telemetrySnapshot).toEqual(
      expect.objectContaining({
        selectedModelId: result.model,
        requestedModelId: "deepseek/chat-capture-v1",
        requestOperation: "chat",
        eligibleEndpointIds: expect.arrayContaining([result.endpointId]),
        eligibleModelIds: expect.arrayContaining([result.model]),
        candidateCostSnapshot: expect.objectContaining({
          [result.endpointId]: expect.objectContaining({
            modelId: result.model,
            sourceType: "remote",
          }),
        }),
        selectedPricingSnapshot: expect.objectContaining({
          modelId: result.model,
          providerId: "deepseek",
        }),
        costSavingsSupport: "partial",
      }),
    );
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
            source: "benchmark",
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
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-routing-mode-tests-"),
    );

    try {
      process.env.MOONSHOT_API_KEY = "test-moonshot-key";
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
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId: "runtime-host-routing-mode-tests",
      });

      const requestId = "req-runtime-bridge-routing-mode-001";
      await backend.executeChatCompletions(
        {
          model: "deepseek/chat-capture-v1",
          messages: [
            { role: "user", content: "Keep the exact-model route and record the rewrite receipt." },
          ],
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

  test("persists applied role policy diagnostics and injected system instructions for runtime-backed chat requests", async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-role-policy-fixtures-"),
    );
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-role-policy-execution-"),
    );

    try {
      await cp(testFixtureRoot, fixtureRoot, { recursive: true });
      await writeFile(
        path.join(fixtureRoot, "observability-policy.json"),
        JSON.stringify(
          {
            environment: "local-dev",
            rawCapture: {
              requestHeaders: "redact-secrets",
              requestBody: "enabled",
              responseBody: "disabled",
            },
            structuredInspection: {
              mode: "redacted",
              redactHeaders: ["authorization"],
            },
            operatorSurface: {
              preserveRawCaptures: true,
            },
          },
          null,
          2,
        ),
      );

      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            createRolePolicyRole: (
              body: Record<string, unknown>,
            ) => Promise<Record<string, unknown>>;
            listTaskDefinitions: () => Promise<readonly Record<string, unknown>[]>;
            updateTaskDefinitions: (
              body: readonly Record<string, unknown>[],
            ) => Promise<readonly Record<string, unknown>[]>;
            executeChatCompletions: (
              body: Record<string, unknown>,
              requestId: string,
              streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
              requestOptions?: {
                requestedRoleId?: string;
              },
            ) => Promise<{
              endpointId: string;
            }>;
            readRequestObservation: (requestId: string) => Promise<unknown>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot,
        runtimeStateRoot,
        scopeId: "runtime-host-role-policy-execution-tests",
      });

      await backend.createRolePolicyRole({
        role_id: "qa.reviewer",
        name: "QA Reviewer",
        description: "Reviews routed runtime behavior.",
        role_kind: "assistant",
        default_system_instructions: "Review carefully and produce a release-readiness assessment.",
        task_types_supported: ["text.chat"],
        required_capabilities: [],
        preferred_capabilities: ["reasoning.multi_step"],
        forbidden_capabilities: [],
        tool_policy: { mode: "allowed", allowed_tools: [] },
        routing_policy_overrides: {},
        output_contracts: ["review.checklist"],
        safety_policy_refs: ["safety.review"],
      });

      const taskDefinitions = await backend.listTaskDefinitions();
      await backend.updateTaskDefinitions(
        taskDefinitions.map((taskDefinition) =>
          taskDefinition.task_type === "text.chat"
            ? {
                ...taskDefinition,
                allowed_roles: Array.from(
                  new Set([...(taskDefinition.allowed_roles as readonly string[]), "qa.reviewer"]),
                ),
              }
            : taskDefinition,
        ),
      );

      const requestId = "req-runtime-bridge-role-policy-001";
      await backend.executeChatCompletions(
        {
          model: "deepseek/chat-capture-v1",
          messages: [{ role: "user", content: "Assess release readiness." }],
        },
        requestId,
        undefined,
        {
          requestedRoleId: "qa.reviewer",
        },
      );

      await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
        requestId,
        endpointId: "test.capture.chat-v1",
        routingDiagnostics: {
          rolePolicy: {
            requestedRoleId: "qa.reviewer",
            appliedRoleId: "qa.reviewer",
            defaultSystemInstructionsApplied: true,
            toolPolicyMode: "allowed",
            outputContracts: ["review.checklist"],
            safetyPolicyRefs: ["safety.review"],
          },
        },
        inspection: {
          request: {
            requestCapture: {
              body: {
                model: "chat-capture-v1",
                input: [
                  {
                    role: "system",
                    content: "Review carefully and produce a release-readiness assessment.",
                  },
                  {
                    role: "system",
                    content:
                      "You must satisfy these output contracts in your response: review.checklist.",
                  },
                  {
                    role: "system",
                    content:
                      "Apply these safety policies while handling the request: safety.review.",
                  },
                  {
                    role: "user",
                    content: "Assess release readiness.",
                  },
                ],
              },
            },
          },
        },
      });
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("does not seed placeholder Anthropic/OpenAI accounts, endpoints, models, or router guidance in the default runtime bootstrap", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-default-fixture-tests-"),
    );

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
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId: "runtime-host-default-fixture-tests",
      });

      const accounts = await backend.listAccounts();
      const endpoints = await backend.listEndpoints();
      const models = (
        bridge as {
          createModelListResponse: (value: EndpointRegistryResult) => {
            data: readonly { id: string }[];
          };
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
      expect(
        (routerConfig.policySources?.roleBindings ?? []).map((binding) => binding.endpoint_id),
      ).not.toEqual(expect.arrayContaining(["openai.personal.primary.us-east-1.fast"]));
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("upsertProviderAccount replaces existing model role assignments for the same model", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-role-assignment-upsert-"),
    );

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            upsertProviderAccount: (account: Record<string, unknown>) => Promise<unknown>;
            listAccounts: () => Promise<
              readonly {
                providerAccountId: string;
                modelRoleBindings?: readonly {
                  modelId: string;
                  roleIds: readonly string[];
                  roleAssignmentMode?: string;
                  enabledRoleIds?: readonly string[];
                  disabledRoleIds?: readonly string[];
                }[];
              }[]
            >;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId: "runtime-host-role-assignment-upsert",
      });

      const baseAccount = {
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
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      };

      await backend.upsertProviderAccount({
        ...baseAccount,
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.5",
            roleIds: ["general.chat"],
          },
        ],
      });

      await backend.upsertProviderAccount({
        ...baseAccount,
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.5",
            roleIds: [],
            roleAssignmentMode: "all",
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
        ],
      });

      const account = (await backend.listAccounts()).find(
        (entry) => entry.providerAccountId === "moonshot.personal.primary",
      );
      expect(account?.modelRoleBindings).toEqual([
        {
          modelId: "moonshot/kimi-k2.5",
          roleIds: [],
          roleAssignmentMode: "all",
          enabledRoleIds: [],
          disabledRoleIds: [],
        },
      ]);
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("persists alias-resolution diagnostics for runtime-backed chat requests", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-alias-tests-"),
    );
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
          listTelemetryRequests: () => Promise<
            readonly {
              requestId: string;
              requestClass?: string;
            }[]
          >;
          listActivityMetrics: () => Promise<
            readonly {
              req_path: string;
              model: string;
            }[]
          >;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-alias-tests",
      unifiedRuntimeConfigPath,
    });

    const requestId = "req-runtime-bridge-alias-001";
    const runtimeAliasId = "gpt-5.4";
    await backend.executeChatCompletions(
      {
        model: runtimeAliasId,
        messages: [{ role: "user", content: "Route through the alias pool." }],
      },
      requestId,
    );

    await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
      requestId,
      routingDiagnostics: {
        aliasResolution: {
          requestedModel: runtimeAliasId,
          aliasId: runtimeAliasId,
          resolvedModelIds: ["openai/gpt-4.1-mini-fast"],
          allowEndpoints: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
        },
      },
    });
    await expect(backend.listTelemetryRequests()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          requestId,
          requestClass: "live_request",
        }),
      ]),
    );
    await expect(backend.listActivityMetrics()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          req_path: "/v1/chat/completions",
        }),
      ]),
    );
  });

  test("executes every canonical remote alias through the runtime-backed chat path", async () => {
    const cases = [
      {
        aliasId: "default.remote-only",
        requestId: "req-runtime-bridge-alias-default-remote-only-001",
        litellmCommand: createAliasRemoteVendorScript(),
      },
      {
        aliasId: "baseline.remote-only",
        requestId: "req-runtime-bridge-alias-baseline-remote-only-001",
        routingStrategy: "baseline",
        litellmCommand: createAliasRemoteVendorScript(),
      },
      {
        aliasId: "controller.remote-only",
        requestId: "req-runtime-bridge-alias-controller-remote-only-001",
        routingStrategy: "controller",
        controller: {
          enabled: true,
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
        },
        litellmCommand: createControllerVendorScript(),
      },
      {
        aliasId: "difficulty.remote-only",
        requestId: "req-runtime-bridge-alias-difficulty-remote-only-001",
        routingStrategy: "difficulty",
        difficultyClassifier: {
          enabled: true,
          rubric_version: "v1",
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
          fallback_difficulty: "easy",
        },
        litellmCommand: createDifficultyClassifierVendorScript("valid-hard"),
      },
      {
        aliasId: "hybrid.remote-only",
        requestId: "req-runtime-bridge-alias-hybrid-remote-only-001",
        routingStrategy: "hybrid",
        difficultyClassifier: {
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
        litellmCommand: createHybridArbitrationVendorScript(),
      },
    ] as const;

    for (const testCase of cases) {
      const runtimeStateRoot = await mkdtemp(
        path.join(os.tmpdir(), "role-model-runtime-host-alias-remote-matrix-"),
      );
      const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");

      try {
        await writeFile(
          unifiedRuntimeConfigPath,
          stringify({
            version: "1.0",
            ...(testCase.routingStrategy
              ? {
                  routing: {
                    strategy: testCase.routingStrategy,
                  },
                }
              : {}),
            execution_mode: "remote_only",
            ...(testCase.difficultyClassifier
              ? { difficulty_classifier: testCase.difficultyClassifier }
              : {}),
            ...(testCase.controller ? { controller: testCase.controller } : {}),
            litellm_proxy: {
              command: "node",
              args: ["-e", testCase.litellmCommand],
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
              shutdown?: () => Promise<void>;
            }>;
          }
        ).createRuntimeBridgeBackend({
          repoRoot,
          fixtureRoot: testFixtureRoot,
          runtimeStateRoot,
          scopeId: `runtime-host-${testCase.aliasId.replaceAll(".", "-")}`,
          unifiedRuntimeConfigPath,
        });

        try {
          await expect(
            backend.executeChatCompletions(
              {
                model: testCase.aliasId,
                messages: [{ role: "user", content: "Say hello in one short sentence." }],
              },
              testCase.requestId,
            ),
          ).resolves.toMatchObject({
            endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
          });

          await expect(backend.readRequestObservation(testCase.requestId)).resolves.toMatchObject({
            requestId: testCase.requestId,
            routingDiagnostics: {
              aliasResolution: {
                requestedModel: testCase.aliasId,
                aliasId: testCase.aliasId,
                allowEndpoints: ["openai.litellm.global.openai-gpt-4-1-mini-fast"],
              },
            },
          });
        } finally {
          await Promise.race([backend.shutdown?.() ?? Promise.resolve(), delay(1_000)]);
        }
      } finally {
        await rm(runtimeStateRoot, { recursive: true, force: true });
      }
    }
  }, 60_000);

  test("filters router summary aliases and candidates by explicit remote-only execution mode", () => {
    const filter = (
      bridge as {
        filterRouterRegistryByExecutionMode?: (
          registry: EndpointRegistryResult,
          executionMode: "decision_only" | "local_only" | "remote_only" | "hybrid",
        ) => EndpointRegistryResult;
      }
    ).filterRouterRegistryByExecutionMode;
    expect(filter).toBeTypeOf("function");

    const mixedRegistry: EndpointRegistryResult = {
      endpoints: [
        {
          identity: {
            endpoint_id: "local.llama.lfm",
            endpoint_kind: "local_engine",
            provider_kind: "local_llama_swap",
            serving_source: "llama-swap",
            model_id: "lfm2.5-1.2b-instruct",
            runtime_version: "test-registry-v1",
            region: "local",
          },
          declared: {
            endpoint_id: "local.llama.lfm",
            capabilities: ["text.chat"],
            modalities: ["text"],
            max_context_tokens: 4096,
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
            endpoint_id: "remote.moonshot.kimi",
            endpoint_kind: "remote_api",
            provider_kind: "remote_openai_compat",
            serving_source: "remote-service",
            model_id: "moonshot/kimi-k2.5",
            runtime_version: "test-registry-v1",
            region: "global",
          },
          declared: {
            endpoint_id: "remote.moonshot.kimi",
            capabilities: ["text.chat"],
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
      ],
      diagnostics: [],
      lifecycleSummary: {
        active: 2,
        degraded: 0,
        offline: 0,
      },
    };

    expect(
      filter?.(mixedRegistry, "remote_only").endpoints.map(
        (endpoint) => endpoint.identity.endpoint_id,
      ),
    ).toEqual(["remote.moonshot.kimi"]);
    expect(
      filter?.(mixedRegistry, "local_only").endpoints.map(
        (endpoint) => endpoint.identity.endpoint_id,
      ),
    ).toEqual(["local.llama.lfm"]);
    expect(
      filter?.(mixedRegistry, "hybrid").endpoints.map((endpoint) => endpoint.identity.endpoint_id),
    ).toEqual(["local.llama.lfm", "remote.moonshot.kimi"]);
    expect(
      filter?.(mixedRegistry, "decision_only").endpoints.map(
        (endpoint) => endpoint.identity.endpoint_id,
      ),
    ).toEqual(["local.llama.lfm", "remote.moonshot.kimi"]);
    expect(filter?.(mixedRegistry, "remote_only").lifecycleSummary).toEqual({
      active: 1,
      degraded: 0,
      offline: 0,
    });
  });

  test("maps the full canonical alias matrix to non-empty candidate pools when matching inventory exists", () => {
    const filter = (
      bridge as {
        filterRouterRegistryByExecutionMode?: (
          registry: EndpointRegistryResult,
          executionMode: "decision_only" | "local_only" | "remote_only" | "hybrid",
        ) => EndpointRegistryResult;
      }
    ).filterRouterRegistryByExecutionMode;
    expect(filter).toBeTypeOf("function");

    const mixedRegistry: EndpointRegistryResult = {
      endpoints: [
        {
          identity: {
            endpoint_id: "local.llama.lfm",
            endpoint_kind: "local_engine",
            provider_kind: "local_llama_swap",
            serving_source: "llama-swap",
            model_id: "lfm2.5-1.2b-instruct",
            runtime_version: "test-registry-v1",
            region: "local",
          },
          declared: {
            endpoint_id: "local.llama.lfm",
            capabilities: ["text.chat"],
            modalities: ["text"],
            max_context_tokens: 4096,
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
            endpoint_id: "remote.moonshot.kimi",
            endpoint_kind: "remote_api",
            provider_kind: "remote_openai_compat",
            serving_source: "remote-service",
            model_id: "moonshot/kimi-k2.5",
            runtime_version: "test-registry-v1",
            region: "global",
          },
          declared: {
            endpoint_id: "remote.moonshot.kimi",
            capabilities: ["text.chat"],
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
      ],
      diagnostics: [],
      lifecycleSummary: {
        active: 2,
        degraded: 0,
        offline: 0,
      },
    };
    const mixedSources = {
      cloud: [
        {
          endpointId: "remote.moonshot.kimi",
          providerAccountId: "moonshot.test.remote",
          modelId: "moonshot/kimi-k2.5",
          region: "global",
          endpointKind: "remote-openai-compatible",
          servingSource: "remote-service",
          lifecycleState: "active",
          healthStatus: "healthy",
          capabilities: ["text.chat"],
        },
      ],
      local: [
        {
          endpointId: "local.llama.lfm",
          providerKind: "local_llama_swap",
          providerId: "local-openai-compatible",
          modelId: "lfm2.5-1.2b-instruct",
          capabilities: ["text.chat"],
          modalities: ["text"],
          endpointKind: "local-engine",
          servingSource: "llama-swap",
          lifecycleState: "active",
          hostClass: "developer-workstation",
          deviceClass: "developer-workstation",
          region: "local",
          orgScope: "personal",
        },
      ],
    };
    const strategyCases = [
      { aliasPrefix: "default", aliasMode: "basic", routingStrategy: null },
      { aliasPrefix: "baseline", aliasMode: "basic", routingStrategy: "baseline" },
      { aliasPrefix: "baseline", aliasMode: "basic", routingStrategy: "latency-first" },
      { aliasPrefix: "controller", aliasMode: "intelligent", routingStrategy: "controller" },
      { aliasPrefix: "controller", aliasMode: "intelligent", routingStrategy: "intelligent" },
      { aliasPrefix: "difficulty", aliasMode: "difficulty", routingStrategy: "difficulty" },
      { aliasPrefix: "hybrid", aliasMode: "hybrid", routingStrategy: "hybrid" },
    ] as const;
    const executionModeCases = [
      {
        executionMode: "decision_only" as const,
        endpointIds: ["local.llama.lfm", "remote.moonshot.kimi"],
        modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.5"],
      },
      {
        executionMode: "hybrid" as const,
        endpointIds: ["local.llama.lfm", "remote.moonshot.kimi"],
        modelIds: ["lfm2.5-1.2b-instruct", "moonshot/kimi-k2.5"],
      },
      {
        executionMode: "local_only" as const,
        endpointIds: ["local.llama.lfm"],
        modelIds: ["lfm2.5-1.2b-instruct"],
      },
      {
        executionMode: "remote_only" as const,
        endpointIds: ["remote.moonshot.kimi"],
        modelIds: ["moonshot/kimi-k2.5"],
      },
    ];

    for (const strategyCase of strategyCases) {
      for (const executionModeCase of executionModeCases) {
        if (!filter) throw new Error("filter must be defined");
        const filteredRegistry = filter(mixedRegistry, executionModeCase.executionMode);
        const inventory = buildRoutableInventory(filteredRegistry, mixedSources);
        const aliasId = `${strategyCase.aliasPrefix}.${executionModeCase.executionMode.replaceAll(
          "_",
          "-",
        )}`;
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
                endpointMaxDifficultyByEndpointId?: Record<string, "easy" | "medium" | "hard">;
              },
              controllerContext?: unknown,
              requestOptions?: unknown,
              roleDefinitions?: unknown,
              defaultRoutingMode?: "baseline" | "difficulty" | "controller" | "hybrid",
              inventory?: unknown,
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
          filteredRegistry,
          {
            model: aliasId,
            messages: [{ role: "user", content: "Route this through the canonical alias pool." }],
          },
          `req-host-alias-matrix-${strategyCase.aliasPrefix}-${executionModeCase.executionMode}`,
          [
            {
              aliasId,
              mode: strategyCase.aliasMode,
              modelIds: executionModeCase.modelIds,
            },
          ],
          {
            endpointMaxDifficultyByEndpointId: Object.fromEntries(
              executionModeCase.endpointIds.map((endpointId) => [endpointId, "hard"]),
            ),
          },
          undefined,
          undefined,
          undefined,
          undefined,
          inventory,
        );

        expect(result.routingRequest.allowEndpoints).toEqual(executionModeCase.endpointIds);
        expect(result.routingDiagnostics?.aliasResolution).toEqual({
          requestedModel: aliasId,
          aliasId,
          resolvedModelIds: executionModeCase.modelIds,
          allowEndpoints: executionModeCase.endpointIds,
        });
      }
    }
  });

  test("routes execution-facing planning through the effective execution-mode registry", () => {
    const source = readFileSync(new URL("../src/index.ts", import.meta.url), "utf8");

    expect(source).toContain("get effectiveRegistry(): EndpointRegistryResult");
    expect(source).toContain("getEffectiveRoutableInventory(): RoutableInventory | null");
    expect(source).toContain("isControllerAssignmentAllowedByExecutionMode(");
    expect(source).toContain(
      "async readControllerAssignment(): Promise<BridgeControllerAssignment | null> {\n      return getCurrentControllerAssignment();\n    }",
    );
    expect(source).toContain("const executionRegistry = getRouterEffectiveRegistry();");
    expect(source).toContain("const executionInventory = getRouterEffectiveRoutableInventory();");
    expect(source).toContain(
      "const executionSnapshot = createExecutionRuntimeSnapshot(executionRegistry);",
    );
    expect(source).toContain("registry: executionSnapshot.registry,");
    expect(source).toContain("catalog: executionSnapshot.executionCatalog,");
    expect(source).toContain("accounts: executionSnapshot.accounts,");
    expect(source).toContain("registrySources: executionSnapshot.registrySources,");
    expect(source).not.toContain("mapChatCompletionsRequest(\n          currentRegistry,");
    expect(source).not.toContain("mapResponsesRequest(\n          currentRegistry,");
    expect(source).not.toContain("resolveRequestedModelPool(\n      currentRegistry,");
    expect(source).not.toContain(
      "executeLiveRoutedRequest({\n            routeResult: routed,\n            catalog: getCurrentExecutionCatalog(),",
    );
  });

  test("persists difficulty-routing diagnostics for runtime-backed chat requests", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-difficulty-tests-"),
    );
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
      fixtureRoot: testFixtureRoot,
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
          {
            role: "assistant",
            content: "I will inspect the schema and update the implementation carefully.",
          },
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
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-difficulty-override-tests-"),
    );
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
      fixtureRoot: testFixtureRoot,
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
            {
              role: "assistant",
              content: "I will inspect the schema and update the implementation carefully.",
            },
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
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-difficulty-bucket-tests-"),
    );
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
      fixtureRoot: testFixtureRoot,
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
        buildProfile(
          "openai.litellm.global.openai-gpt-4-1-mini-fast",
          10_000,
          0.96,
          0.02,
          36,
          180,
          280,
        ),
      ),
    );
    insertProfile.run(
      "bucket-endpoint-anthropic",
      "anthropic.litellm.global.claude-3-7-sonnet",
      10_100,
      JSON.stringify(
        buildProfile(
          "anthropic.litellm.global.claude-3-7-sonnet",
          10_100,
          0.42,
          0.05,
          12,
          700,
          980,
        ),
      ),
    );
    insertBucketedProfile.run(
      "bucket-hard-openai",
      "openai.litellm.global.openai-gpt-4-1-mini-fast",
      "hard",
      11_000,
      JSON.stringify(
        buildProfile(
          "openai.litellm.global.openai-gpt-4-1-mini-fast",
          11_000,
          0.28,
          0.24,
          9,
          880,
          1_120,
        ),
      ),
    );
    insertBucketedProfile.run(
      "bucket-hard-anthropic",
      "anthropic.litellm.global.claude-3-7-sonnet",
      "hard",
      11_100,
      JSON.stringify(
        buildProfile(
          "anthropic.litellm.global.claude-3-7-sonnet",
          11_100,
          0.97,
          0.01,
          27,
          260,
          390,
        ),
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
            {
              role: "assistant",
              content: "I will inspect the schema and update the implementation carefully.",
            },
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
      endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
      routingDiagnostics: {
        difficultyRouting: expect.objectContaining({
          difficulty: "hard",
          strategy: "quality",
          fallbackApplied: false,
        }),
        observedProfile: {
          endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
          source: "runtime-state",
          readMode: "per-request",
          difficultyBucket: "hard",
          bucketOverrideApplied: true,
          measuredAtMs: 11_000,
        },
      },
    });
  });

  test("infers a hard observed-profile bucket from controller quality strategy when difficulty routing is absent", () => {
    expect(
      typeof (bridge as { resolveObservedDifficultyBucketForPlan?: unknown })
        .resolveObservedDifficultyBucketForPlan,
    ).toBe("function");

    const result = (
      bridge as {
        resolveObservedDifficultyBucketForPlan: (plan: {
          routingDiagnostics?: {
            difficultyRouting?: {
              difficulty?: "easy" | "medium" | "hard";
            };
            controllerRouting?: {
              acceptedDirectives?: {
                strategy?: "balanced" | "cost" | "quality";
              };
            };
          };
        }) => "easy" | "medium" | "hard" | undefined;
      }
    ).resolveObservedDifficultyBucketForPlan({
      routingDiagnostics: {
        controllerRouting: {
          active: true,
          acceptedDirectives: {
            strategy: "quality",
          },
        },
      },
    });

    expect(result).toBe("hard");
  });

  test("keeps fresh endpoint-wide metrics when stale hard-bucket quality is present under benchmark-driven routing", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-difficulty-merge-tests-"),
    );
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

    const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
    const testFixtureRoot = path.join(__dirname, "fixtures");
    const scopeId = "runtime-host-difficulty-merge";
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (input: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          unifiedRuntimeConfigPath: string;
        }) => Promise<{
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId?: string,
          ) => Promise<{
            endpointId: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
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
    const buildProfile = (input: {
      endpointId: string;
      measuredAtMs: number;
      qualityScore: number;
      failureRate: number;
      tokensPerSec: number;
      latencyMsP50: number;
      latencyMsP95: number;
      liveSamples: number;
      benchmarkSamples: number;
      freshnessScore: number;
    }) => ({
      endpoint_id: input.endpointId,
      endpoint_version: "run50-difficulty-merge-v1",
      measured_at_ms: input.measuredAtMs,
      measurement_window: {
        started_at_ms: input.measuredAtMs - 1_000,
        ended_at_ms: input.measuredAtMs,
      },
      sample_size: input.liveSamples + input.benchmarkSamples,
      sources: {
        live_request_samples: input.liveSamples,
        benchmark_samples: input.benchmarkSamples,
      },
      latency_ms_p50: input.latencyMsP50,
      latency_ms_p95: input.latencyMsP95,
      failure_rate: input.failureRate,
      freshness_score: input.freshnessScore,
      confidence_score: 0.95,
      quality_score: input.qualityScore,
      tokens_per_sec: input.tokensPerSec,
      cost_per_1k_tokens_est: 1,
      currency: "USD",
    });

    insertProfile.run(
      "merge-endpoint-openai",
      "openai.litellm.global.openai-gpt-4-1-mini-fast",
      100_000,
      JSON.stringify(
        buildProfile({
          endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
          measuredAtMs: 100_000,
          qualityScore: 0.2,
          failureRate: 0.02,
          tokensPerSec: 36,
          latencyMsP50: 180,
          latencyMsP95: 240,
          liveSamples: 6,
          benchmarkSamples: 0,
          freshnessScore: 0.99,
        }),
      ),
    );
    insertProfile.run(
      "merge-endpoint-anthropic",
      "anthropic.litellm.global.claude-3-7-sonnet",
      100_100,
      JSON.stringify(
        buildProfile({
          endpointId: "anthropic.litellm.global.claude-3-7-sonnet",
          measuredAtMs: 100_100,
          qualityScore: 0.1,
          failureRate: 0.02,
          tokensPerSec: 34,
          latencyMsP50: 210,
          latencyMsP95: 280,
          liveSamples: 6,
          benchmarkSamples: 0,
          freshnessScore: 0.99,
        }),
      ),
    );
    insertBucketedProfile.run(
      "merge-hard-openai",
      "openai.litellm.global.openai-gpt-4-1-mini-fast",
      "hard",
      1_000,
      JSON.stringify(
        buildProfile({
          endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
          measuredAtMs: 1_000,
          qualityScore: 0.92,
          failureRate: 0.2,
          tokensPerSec: 8,
          latencyMsP50: 900,
          latencyMsP95: 1_100,
          liveSamples: 0,
          benchmarkSamples: 21,
          freshnessScore: 0.95,
        }),
      ),
    );
    insertBucketedProfile.run(
      "merge-hard-anthropic",
      "anthropic.litellm.global.claude-3-7-sonnet",
      "hard",
      1_100,
      JSON.stringify(
        buildProfile({
          endpointId: "anthropic.litellm.global.claude-3-7-sonnet",
          measuredAtMs: 1_100,
          qualityScore: 0.3,
          failureRate: 0.2,
          tokensPerSec: 8,
          latencyMsP50: 920,
          latencyMsP95: 1_120,
          liveSamples: 0,
          benchmarkSamples: 21,
          freshnessScore: 0.95,
        }),
      ),
    );
    database.close();

    const requestId = "req-runtime-bridge-difficulty-merge-001";
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
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "readSchema",
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
      endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
      routingDiagnostics: {
        observedProfile: {
          endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
          source: "runtime-state",
          readMode: "per-request",
          difficultyBucket: "hard",
          bucketOverrideApplied: true,
          measuredAtMs: 100_000,
        },
        effectiveMetrics: {
          latency: expect.objectContaining({
            measuredAtMs: 100_000,
          }),
        },
      },
    });

    const observation = (await backend.readRequestObservation(requestId)) as {
      routingDiagnostics?: {
        effectiveMetrics?: {
          quality?: {
            value?: number;
            source?: string;
            freshnessWeight?: number;
          };
        };
      };
    };
    expect(observation.routingDiagnostics?.effectiveMetrics?.quality).toMatchObject({
      source: "benchmark",
      value: expect.any(Number),
      freshnessWeight: expect.any(Number),
    });
  });

  test("uses the configured remote classifier result for difficulty-mode runtime-backed chat requests", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-difficulty-classifier-tests-"),
    );
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
      fixtureRoot: testFixtureRoot,
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
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-controller-tests-"),
    );
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
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-controller-tests",
      unifiedRuntimeConfigPath,
    });

    const requestId = "req-runtime-bridge-controller-001";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [
          { role: "user", content: "Prepare a patch plan and preserve the existing contract." },
        ],
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
  }, 10_000);

  test("uses the default controller timeout budget for realistic remote controller latency", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-controller-default-timeout-tests-"),
    );
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        controller: {
          enabled: true,
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
        },
        model_aliases: {
          "gpt-5.4": {
            mode: "intelligent",
            model_ids: ["openai/gpt-4.1-mini-fast"],
          },
        },
        litellm_proxy: {
          command: "node",
          args: ["-e", createControllerVendorScript({ responseDelayMs: 2000 })],
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
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-controller-default-timeout-tests",
      unifiedRuntimeConfigPath,
    });

    const requestId = "req-runtime-bridge-controller-default-timeout-001";
    await backend.executeChatCompletions(
      {
        model: "gpt-5.4",
        messages: [
          { role: "user", content: "Prepare a patch plan and preserve the existing contract." },
        ],
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
  }, 10_000);

  test("records sanitized controller guidance through the live HTTP bridge for intelligent aliases", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-controller-http-regression-"),
    );
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    const controllerVendorScript = `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");const content=isController?JSON.stringify({requestedRoleId:"general.chat",taskType:"code-generation",requiredCapabilities:["text.chat","capability.fake"],strategy:"capability_based",preferLocal:true,preferredEndpointIds:["openai.litellm.global.openai-gpt-4-1-mini-fast","invalid.endpoint"]}):"alias remote summary";res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-controller-http-regression",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16},_hidden_params:{response_cost:0.0012,cache_hit:false}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
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
          args: ["-e", controllerVendorScript],
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
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              clientRequestId?: string;
            },
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          listTelemetryRequests?: () => Promise<unknown>;
          readRequestObservation?: (requestId: string) => Promise<unknown>;
          shutdown?: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-controller-http-regression-tests",
      unifiedRuntimeConfigPath,
    });

    const selectedEndpointId = backend.registry.endpoints.find(
      (endpoint) => endpoint.identity.model_id === "openai/gpt-4.1-mini-fast",
    )?.identity.endpoint_id;
    expect(selectedEndpointId).toBe("openai.litellm.global.openai-gpt-4-1-mini-fast");

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              clientRequestId?: string;
            },
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          listTelemetryRequests?: () => Promise<unknown>;
          readRequestObservation?: (requestId: string) => Promise<unknown>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
      listTelemetryRequests: backend.listTelemetryRequests,
      readRequestObservation: backend.readRequestObservation,
    });

    try {
      const clientRequestId = "req-controller-http-regression-001";
      const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": clientRequestId,
        },
        body: JSON.stringify({
          model: "gpt-5.4",
          messages: [{ role: "user", content: "Say hello in one short sentence." }],
        }),
      });
      expect(response.status).toBe(200);
      await response.text();

      const telemetryResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/requests`,
      );
      expect(telemetryResponse.status).toBe(200);
      const telemetryRows = (await telemetryResponse.json()) as Array<{
        requestId: string;
        clientRequestId?: string | null;
      }>;
      const requestRow = telemetryRows.find((entry) => entry.clientRequestId === clientRequestId);
      expect(requestRow?.requestId).toBeTruthy();

      const detailResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/requests/${requestRow?.requestId}`,
      );
      expect(detailResponse.status).toBe(200);
      const detail = (await detailResponse.json()) as {
        routingDiagnostics?: {
          controllerRouting?: {
            acceptedDirectives?: Record<string, unknown>;
          };
        };
      };

      expect(detail).toEqual(
        expect.objectContaining({
          routingDiagnostics: expect.objectContaining({
            controllerRouting: expect.objectContaining({
              active: true,
              acceptedDirectives: expect.objectContaining({
                requiredCapabilities: ["text.chat"],
                strategy: "quality",
                preferLocal: true,
              }),
            }),
          }),
        }),
      );
      expect(detail.routingDiagnostics?.controllerRouting?.acceptedDirectives).not.toHaveProperty(
        "taskType",
      );
    } finally {
      await Promise.race([server.close(), delay(1_000)]);
      await Promise.race([backend.shutdown?.() ?? Promise.resolve(), delay(1_000)]);
    }
  }, 10_000);

  test("preserves accepted controller directives for known compatibility strategy aliases", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-controller-compat-alias-"),
    );
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    const compatControllerVendorScript = `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");const content=isController?JSON.stringify({strategy:"remote_only"}):"alias remote summary";res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-controller-compat-remote",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content},finish_reason:"stop"}],usage:{prompt_tokens:12,completion_tokens:4,total_tokens:16},_hidden_params:{response_cost:0.0012,cache_hit:false}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        routing: {
          strategy: "controller",
        },
        controller: {
          enabled: true,
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
        },
        execution_mode: "remote_only",
        litellm_proxy: {
          command: "node",
          args: ["-e", compatControllerVendorScript],
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
          shutdown?: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-controller-compat-alias-tests",
      unifiedRuntimeConfigPath,
    });

    try {
      const requestId = "req-runtime-bridge-controller-compat-alias-001";
      await backend.executeChatCompletions(
        {
          model: "controller.remote-only",
          messages: [{ role: "user", content: "Say hello in one short sentence." }],
        },
        requestId,
      );

      await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
        requestId,
        routingDiagnostics: {
          controllerRouting: {
            active: true,
            acceptedDirectives: {
              preferLocal: false,
            },
          },
        },
      });
      await expect(backend.readRequestObservation(requestId)).resolves.not.toMatchObject({
        routingDiagnostics: {
          controllerRouting: {
            fallbackReason: "invalid-controller-output",
          },
        },
      });
    } finally {
      await Promise.race([backend.shutdown?.() ?? Promise.resolve(), delay(1_000)]);
    }
  }, 10_000);

  test("gives controller routing enough output budget to avoid empty truncated guidance", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-controller-budget-"),
    );
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    const budgetAwareControllerVendorScript = `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");const maxTokens=Number(parsed.max_tokens??parsed.max_completion_tokens??0);const controllerMessage=isController&&maxTokens<=256?{role:"assistant",content:""}:{role:"assistant",content:JSON.stringify({requestedRoleId:"general.chat",taskType:"text.chat",requiredCapabilities:["text.chat"]})};res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-controller-budget",object:"chat.completion",choices:[{index:0,message:controllerMessage,finish_reason:isController&&maxTokens<=256?"length":"stop"}],usage:{prompt_tokens:12,completion_tokens:isController&&maxTokens<=256?maxTokens:24,total_tokens:36}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        routing: {
          strategy: "controller",
        },
        controller: {
          enabled: true,
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
        },
        execution_mode: "remote_only",
        litellm_proxy: {
          command: "node",
          args: ["-e", budgetAwareControllerVendorScript],
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
          shutdown?: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-controller-budget-tests",
      unifiedRuntimeConfigPath,
    });

    try {
      const requestId = "req-runtime-bridge-controller-budget-001";
      await backend.executeChatCompletions(
        {
          model: "controller.remote-only",
          messages: [{ role: "user", content: "Say hello in one short sentence." }],
        },
        requestId,
      );

      await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
        requestId,
        routingDiagnostics: {
          controllerRouting: {
            active: true,
            acceptedDirectives: {
              requiredCapabilities: ["text.chat"],
            },
          },
        },
      });
      await expect(backend.readRequestObservation(requestId)).resolves.not.toMatchObject({
        routingDiagnostics: {
          controllerRouting: {
            fallbackReason: "invalid-controller-output",
          },
        },
      });
    } finally {
      await Promise.race([backend.shutdown?.() ?? Promise.resolve(), delay(1_000)]);
    }
  }, 10_000);

  test("backfills coding role and capability hints into minimal controller strategy guidance", () => {
    const heuristic = bridge.inferHeuristicControllerGuidance({
      messages: [
        {
          role: "user",
          content:
            "Read the router code, patch the regression carefully, and verify the behavior with tests.",
        },
      ],
      toolCount: 1,
      roleDefinitions: [
        {
          role_id: "coder",
          display_name: "Coder",
          description: "Writes and edits code.",
          default_system_instructions: "",
          task_types_supported: ["coder.edit"],
          required_capabilities: [],
          preferred_capabilities: [],
          forbidden_capabilities: [],
          tool_policy: { mode: "allowed", allowed_tools: [] },
          output_contracts: [],
          safety_policy_refs: [],
        },
      ],
      taskDefinitions: [
        {
          task_type: "coder.edit",
          display_name: "Coder Edit",
          description: "Edits code with tools.",
          required_capabilities: ["code.edit"],
          preferred_capabilities: ["reasoning.multi_step"],
          allowed_roles: ["coder"],
          success_criteria: [],
          quality_metrics: [],
        },
      ],
    });

    expect(heuristic).toMatchObject({
      requestedRoleId: "coder",
      taskType: "coder.edit",
      strategy: "quality",
      preferredCapabilities: ["reasoning.multi_step"],
    });

    expect(
      bridge.mergeControllerGuidanceDefaults({
        guidance: {
          strategy: "quality",
          preferLocal: false,
        },
        heuristic,
      }),
    ).toMatchObject({
      requestedRoleId: "coder",
      taskType: "coder.edit",
      strategy: "quality",
      preferLocal: false,
      preferredCapabilities: ["reasoning.multi_step"],
    });
  });

  test("does not infer coding guidance solely from consumer-declared default tools", () => {
    const heuristic = bridge.inferHeuristicControllerGuidance({
      messages: [
        {
          role: "user",
          content: "hey",
        },
      ],
      toolCount: 4,
    });

    expect(heuristic).toMatchObject({
      strategy: "balanced",
    });
    expect(heuristic).not.toMatchObject({
      requestedRoleId: "coder",
      taskType: "coder.edit",
    });
    expect(heuristic?.preferredCapabilities ?? []).not.toContain("tools.function_calling");
  });

  test("retries controller routing once with a compact prompt when the first controller response is empty", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-controller-compact-retry-"),
    );
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        routing: {
          strategy: "controller",
        },
        controller: {
          enabled: true,
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 2500,
        },
        execution_mode: "remote_only",
        litellm_proxy: {
          command: "node",
          args: ["-e", createControllerRetryVendorScript()],
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
          shutdown?: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-controller-compact-retry-tests",
      unifiedRuntimeConfigPath,
    });

    try {
      const requestId = "req-runtime-bridge-controller-compact-retry-001";
      await backend.executeChatCompletions(
        {
          model: "openai/gpt-4.1-mini-fast",
          messages: [
            {
              role: "user",
              content:
                "Investigate a multi-step runtime routing regression, preserve the public API, add regression tests, and explain how you would verify the fix without breaking alias behavior.",
            },
          ],
        },
        requestId,
      );

      await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
        requestId,
        routingDiagnostics: {
          controllerRouting: {
            active: true,
            acceptedDirectives: {
              preferredCapabilities: ["reasoning.multi_step"],
              strategy: "quality",
            },
          },
        },
      });
      await expect(backend.readRequestObservation(requestId)).resolves.not.toMatchObject({
        routingDiagnostics: {
          controllerRouting: {
            fallbackReason: "invalid-controller-output",
          },
        },
      });
    } finally {
      await Promise.race([backend.shutdown?.() ?? Promise.resolve(), delay(1_000)]);
    }
  }, 10_000);

  test("falls back to heuristic controller guidance when the live controller returns prose instead of JSON", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-controller-heuristic-"),
    );
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        routing: {
          strategy: "controller",
        },
        controller: {
          enabled: true,
          source_type: "remote",
          model_id: "openai/gpt-4.1-mini-fast",
          timeout_ms: 1500,
        },
        execution_mode: "remote_only",
        litellm_proxy: {
          command: "node",
          args: ["-e", createControllerInvalidVendorScript()],
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
          shutdown?: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-controller-heuristic-tests",
      unifiedRuntimeConfigPath,
    });

    try {
      const requestId = "req-runtime-bridge-controller-heuristic-001";
      await backend.executeChatCompletions(
        {
          model: "controller.remote-only",
          messages: [
            {
              role: "user",
              content:
                "Investigate this code-edit regression, update the patch, revise the tests, and verify the final schema behavior.",
            },
          ],
        },
        requestId,
      );

      await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
        requestId,
        routingDiagnostics: {
          controllerRouting: {
            active: true,
            fallbackApplied: true,
            fallbackReason: "controller-heuristic-fallback",
            acceptedDirectives: {
              strategy: "quality",
            },
          },
        },
      });
      await expect(backend.readRequestObservation(requestId)).resolves.not.toMatchObject({
        routingDiagnostics: {
          controllerRouting: {
            fallbackReason: "invalid-controller-output",
          },
        },
      });
    } finally {
      await Promise.race([backend.shutdown?.() ?? Promise.resolve(), delay(1_000)]);
    }
  }, 10_000);

  test("keeps controller.remote-only routing inside the remote-only alias slice even when the available inventory is hybrid", () => {
    const mixedRegistry: EndpointRegistryResult = {
      endpoints: [
        {
          identity: {
            endpoint_id: "local.llama.lfm",
            endpoint_kind: "local_engine",
            provider_kind: "local_llama_swap",
            serving_source: "llama-swap",
            model_id: "lfm2.5-1.2b-instruct",
            runtime_version: "test-registry-v1",
            region: "local",
          },
          declared: {
            endpoint_id: "local.llama.lfm",
            capabilities: ["text.chat"],
            modalities: ["text"],
            max_context_tokens: 4096,
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
            endpoint_id: "remote.moonshot.kimi",
            endpoint_kind: "remote_api",
            provider_kind: "remote_openai_compat",
            serving_source: "remote-service",
            model_id: "moonshot/kimi-k2.5",
            runtime_version: "test-registry-v1",
            region: "global",
          },
          declared: {
            endpoint_id: "remote.moonshot.kimi",
            capabilities: ["text.chat"],
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
      ],
      diagnostics: [],
      lifecycleSummary: {
        active: 2,
        degraded: 0,
        offline: 0,
      },
    };
    const mixedSources = {
      cloud: [
        {
          endpointId: "remote.moonshot.kimi",
          providerAccountId: "moonshot.test.remote",
          modelId: "moonshot/kimi-k2.5",
          region: "global",
          endpointKind: "remote-openai-compatible",
          servingSource: "remote-service",
          lifecycleState: "active",
          healthStatus: "healthy",
          capabilities: ["text.chat"],
        },
      ],
      local: [
        {
          endpointId: "local.llama.lfm",
          providerKind: "local_llama_swap",
          providerId: "local-openai-compatible",
          modelId: "lfm2.5-1.2b-instruct",
          capabilities: ["text.chat"],
          modalities: ["text"],
          endpointKind: "local-engine",
          servingSource: "llama-swap",
          lifecycleState: "active",
          hostClass: "developer-workstation",
          deviceClass: "developer-workstation",
          region: "local",
          orgScope: "personal",
        },
      ],
    };
    const inventory = buildRoutableInventory(mixedRegistry, mixedSources);

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
          controllerContext?: unknown,
          requestOptions?: unknown,
          roleDefinitions?: unknown,
          defaultRoutingMode?: "baseline" | "difficulty" | "controller" | "hybrid",
          inventory?: unknown,
        ) => {
          routingRequest: {
            allowEndpoints: readonly string[];
          };
          routingDiagnostics?: {
            aliasResolution?: {
              aliasId: string;
              allowEndpoints: readonly string[];
              resolvedModelIds: readonly string[];
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      mixedRegistry,
      {
        model: "controller.remote-only",
        messages: [{ role: "user", content: "Choose a remote endpoint only." }],
      },
      "req-host-controller-remote-slice-001",
      [
        {
          aliasId: "controller.remote-only",
          mode: "intelligent",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      undefined,
      undefined,
      undefined,
      undefined,
      "controller",
      inventory,
    );

    expect(result.routingRequest.allowEndpoints).toEqual(["remote.moonshot.kimi"]);
    expect(result.routingDiagnostics?.aliasResolution).toEqual({
      aliasId: "controller.remote-only",
      requestedModel: "controller.remote-only",
      resolvedModelIds: ["moonshot/kimi-k2.5"],
      allowEndpoints: ["remote.moonshot.kimi"],
    });
  });

  test("serves coherent live role and task policy over the HTTP control plane", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-role-policy-http-regression-"),
    );
    const scopeId = `runtime-host-role-policy-http-regression-${Date.now()}`;
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              clientRequestId?: string;
            },
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          listRoles?: () => Promise<unknown>;
          readRolePolicy?: () => Promise<unknown>;
          listTaskDefinitions?: () => Promise<unknown>;
          shutdown?: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
    });

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              clientRequestId?: string;
            },
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          listRoles?: () => Promise<unknown>;
          readRolePolicy?: () => Promise<unknown>;
          listTaskDefinitions?: () => Promise<unknown>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
      listRoles: backend.listRoles,
      readRolePolicy: backend.readRolePolicy,
      listTaskDefinitions: backend.listTaskDefinitions,
    });

    try {
      const [rolesResponse, rolePolicyResponse, tasksResponse] = await Promise.all([
        fetch(`http://127.0.0.1:${server.port}/api/role-model/roles`),
        fetch(`http://127.0.0.1:${server.port}/api/role-model/role-policy`),
        fetch(`http://127.0.0.1:${server.port}/api/role-model/tasks`),
      ]);
      expect(rolesResponse.status).toBe(200);
      expect(rolePolicyResponse.status).toBe(200);
      expect(tasksResponse.status).toBe(200);

      const roles = (await rolesResponse.json()) as Array<{ roleId: string }>;
      const rolePolicy = (await rolePolicyResponse.json()) as {
        roleDefinitions: Array<{ role_id: string; task_types_supported: string[] }>;
        taskDefinitions: Array<{ task_type: string; allowed_roles: string[] }>;
      };
      const tasks = (await tasksResponse.json()) as Array<{
        task_type: string;
        allowed_roles: string[];
      }>;

      const roleIds = new Set(roles.map((entry) => entry.roleId));
      const policyRoleIds = new Set(rolePolicy.roleDefinitions.map((entry) => entry.role_id));
      const taskIds = new Set(tasks.map((entry) => entry.task_type));

      expect(roleIds.has("coder")).toBe(true);
      expect(policyRoleIds.has("coder")).toBe(true);
      expect(taskIds.has("coder.edit")).toBe(true);

      for (const taskDefinition of tasks) {
        const policyTask = rolePolicy.taskDefinitions.find(
          (entry) => entry.task_type === taskDefinition.task_type,
        );
        expect(policyTask).toBeDefined();
        expect((policyTask?.allowed_roles ?? []).slice().sort()).toEqual(
          taskDefinition.allowed_roles.slice().sort(),
        );
        for (const roleId of taskDefinition.allowed_roles) {
          expect(roleIds.has(roleId)).toBe(true);
          expect(policyRoleIds.has(roleId)).toBe(true);
        }
      }

      for (const roleDefinition of rolePolicy.roleDefinitions) {
        for (const taskType of roleDefinition.task_types_supported) {
          expect(taskIds.has(taskType)).toBe(true);
        }
      }
    } finally {
      await server.close();
      await backend.shutdown?.();
    }
  });

  test("ignores unsupported controller task and capability directives while keeping valid preferred endpoint subsets for coding-role requests", () => {
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
            active: boolean;
            resolvedGuidance?: {
              taskType?: string;
              requiredCapabilities?: readonly string[];
              preferredEndpointIds?: readonly string[];
            };
          },
          requestOptions?: {
            requestedRoleId?: string;
          },
          roleDefinitions?: readonly Record<string, unknown>[],
          defaultRoutingMode?: "baseline" | "difficulty" | "controller" | "hybrid",
          inventory?: unknown,
          taskDefinitions?: readonly Record<string, unknown>[],
        ) => {
          routingRequest: {
            requestedRoleId?: string;
            taskType: string;
            requiredCapabilities: readonly string[];
            preferredCapabilities: readonly string[];
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
                preferredEndpointIds?: readonly string[];
              };
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "controller.remote-only",
        messages: [
          {
            role: "user",
            content:
              "Write a concise TypeScript helper that parses a unified diff hunk header and returns start/count pairs.",
          },
        ],
      },
      "req-host-controller-sanitize-001",
      [
        {
          aliasId: "controller.remote-only",
          mode: "intelligent",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      undefined,
      {
        active: true,
        resolvedGuidance: {
          taskType: "code-generation",
          requiredCapabilities: ["typescript", "code-generation"],
          preferredEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.5"],
        },
      },
      {
        requestedRoleId: "coder.patch",
      },
      [
        {
          role_id: "coder.patch",
          name: "Coder Patch",
          description: "Code editing tasks.",
          role_kind: "assistant",
          default_system_instructions: "Operate as Coder Patch.",
          task_types_supported: ["code.edit"],
          required_capabilities: [],
          preferred_capabilities: [],
          forbidden_capabilities: [],
          tool_policy: {
            mode: "allowed",
            allowed_tools: [],
          },
          routing_policy_overrides: {},
          output_contracts: [],
          safety_policy_refs: [],
        },
      ],
      undefined,
      undefined,
      [
        {
          task_type: "text.chat",
          description: "General chat task",
          required_inputs: [],
          required_capabilities: ["text.chat"],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["general.chat"],
          default_benchmark_suites: [],
        },
        {
          task_type: "code.edit",
          description: "Code editing task",
          required_inputs: [],
          required_capabilities: ["code.edit"],
          preferred_capabilities: ["reasoning.multi_step"],
          quality_metrics: [],
          allowed_roles: ["coder.patch", "coder.review"],
          default_benchmark_suites: [],
        },
      ],
    );

    expect(result.routingRequest).toMatchObject({
      requestedRoleId: "coder.patch",
      taskType: "code.edit",
      requiredCapabilities: ["code.edit"],
      preferredCapabilities: ["reasoning.multi_step"],
      allowEndpoints: [
        "moonshot.personal.kimi-code.global.kimi-k2.5",
        "moonshot.personal.primary.global.kimi-k2.5",
      ],
    });
    expect(result.routingModel).toEqual({
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
      preferredEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.5"],
    });
    expect(result.routingDiagnostics?.controllerRouting).toEqual({
      active: true,
      acceptedDirectives: {
        preferredEndpointIds: ["moonshot.personal.kimi-code.global.kimi-k2.5"],
      },
    });
  });

  test("resolves explicit non-controller coder.review requests onto a role-compatible task", () => {
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
            active: boolean;
          },
          requestOptions?: {
            requestedRoleId?: string;
          },
          roleDefinitions?: readonly Record<string, unknown>[],
          defaultRoutingMode?: "baseline" | "difficulty" | "controller" | "hybrid",
          inventory?: unknown,
          taskDefinitions?: readonly Record<string, unknown>[],
        ) => {
          routingRequest: {
            requestedRoleId?: string;
            taskType: string;
            requiredCapabilities: readonly string[];
            preferredCapabilities: readonly string[];
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "default.remote-only",
        messages: [
          {
            role: "user",
            content:
              "Review this JSON schema migration plan and identify two compatibility risks with persisted alias-matrix records and telemetry query payloads.",
          },
        ],
      },
      "req-host-explicit-role-review-001",
      [
        {
          aliasId: "default.remote-only",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      undefined,
      {
        active: false,
      },
      {
        requestedRoleId: "coder.review",
      },
      [
        {
          role_id: "coder.review",
          name: "Coder Review",
          description: "Review and schema tasks.",
          role_kind: "assistant",
          default_system_instructions: "Operate as Coder Review.",
          task_types_supported: ["code.edit", "json.schema_adherence"],
          required_capabilities: [],
          preferred_capabilities: [],
          forbidden_capabilities: [],
          tool_policy: {
            mode: "allowed",
            allowed_tools: [],
          },
          routing_policy_overrides: {},
          output_contracts: [],
          safety_policy_refs: [],
        },
      ],
      undefined,
      undefined,
      [
        {
          task_type: "text.chat",
          description: "General chat task",
          required_inputs: [],
          required_capabilities: ["text.chat"],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["general.chat"],
          default_benchmark_suites: [],
        },
        {
          task_type: "code.edit",
          description: "Code editing task",
          required_inputs: [],
          required_capabilities: ["code.edit"],
          preferred_capabilities: ["reasoning.multi_step"],
          quality_metrics: [],
          allowed_roles: ["coder.patch", "coder.review"],
          default_benchmark_suites: [],
        },
        {
          task_type: "json.schema_adherence",
          description: "Schema adherence task",
          required_inputs: [],
          required_capabilities: ["json.schema_adherence"],
          preferred_capabilities: ["reasoning.multi_step"],
          quality_metrics: [],
          allowed_roles: ["coder.review"],
          default_benchmark_suites: [],
        },
      ],
    );

    expect(result.routingRequest).toMatchObject({
      requestedRoleId: "coder.review",
      taskType: "json.schema_adherence",
      requiredCapabilities: ["json.schema_adherence"],
      preferredCapabilities: ["reasoning.multi_step"],
    });
  });

  test("drops controller preferred endpoints when they merely restate the full allowed pool", () => {
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
            active: boolean;
            resolvedGuidance?: {
              preferredEndpointIds?: readonly string[];
            };
          },
          requestOptions?: {
            requestedRoleId?: string;
          },
          roleDefinitions?: readonly Record<string, unknown>[],
          defaultRoutingMode?: "baseline" | "difficulty" | "controller" | "hybrid",
          inventory?: unknown,
          taskDefinitions?: readonly Record<string, unknown>[],
        ) => {
          routingRequest: {
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
                preferredEndpointIds?: readonly string[];
              };
            };
          };
        };
      }
    ).mapChatCompletionsRequest(
      registry,
      {
        model: "controller.remote-only",
        messages: [{ role: "user", content: "Review the routing candidates." }],
      },
      "req-host-controller-full-pool-001",
      [
        {
          aliasId: "controller.remote-only",
          mode: "intelligent",
          modelIds: ["moonshot/kimi-k2.5"],
        },
      ],
      undefined,
      {
        active: true,
        resolvedGuidance: {
          preferredEndpointIds: [
            "moonshot.personal.kimi-code.global.kimi-k2.5",
            "moonshot.personal.primary.global.kimi-k2.5",
          ],
        },
      },
    );

    expect(result.routingRequest.allowEndpoints).toEqual([
      "moonshot.personal.kimi-code.global.kimi-k2.5",
      "moonshot.personal.primary.global.kimi-k2.5",
    ]);
    expect(result.routingModel).toBeUndefined();
    expect(result.routingDiagnostics?.controllerRouting).toEqual({
      active: true,
      acceptedDirectives: {},
    });
  });

  test("rehydrates persisted controller assignment for controller aliases after restart even without a controller block in runtime config", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-controller-restart-tests-"),
    );
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        execution_mode: "remote_only",
        routing: {
          strategy: "controller",
        },
        model_aliases: {
          "controller.remote-only": {
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

    const createBackend = () =>
      (
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
            ) => Promise<{ endpointId: string }>;
            readRequestObservation: (requestId: string) => Promise<unknown>;
            updateControllerAssignment: (body: Record<string, unknown>) => Promise<unknown>;
            shutdown?: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId: "runtime-host-controller-restart-tests",
        unifiedRuntimeConfigPath,
      });

    const firstBackend = await createBackend();
    try {
      await firstBackend.updateControllerAssignment({
        endpointId: "openai.litellm.global.openai-gpt-4-1-mini-fast",
      });
    } finally {
      await Promise.race([firstBackend.shutdown?.() ?? Promise.resolve(), delay(1_000)]);
    }

    const secondBackend = await createBackend();
    try {
      const requestId = "req-runtime-bridge-controller-restart-001";
      await secondBackend.executeChatCompletions(
        {
          model: "controller.remote-only",
          messages: [
            { role: "user", content: "Prepare a patch plan and preserve the existing contract." },
          ],
        },
        requestId,
      );

      await expect(secondBackend.readRequestObservation(requestId)).resolves.toMatchObject({
        requestId,
        routingDiagnostics: {
          controllerRouting: {
            active: true,
          },
        },
      });
    } finally {
      await Promise.race([secondBackend.shutdown?.() ?? Promise.resolve(), delay(1_000)]);
    }
  }, 10_000);

  test("persists alias-default hybrid arbitration and rewrite-applied diagnostics for runtime-backed chat requests", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-hybrid-tests-"),
    );
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
      fixtureRoot: testFixtureRoot,
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
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-difficulty-timeout-tests-"),
    );
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
      fixtureRoot: testFixtureRoot,
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
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-difficulty-cache-tests-"),
    );
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
      fixtureRoot: testFixtureRoot,
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
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-difficulty-invalidation-tests-"),
    );
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
      fixtureRoot: testFixtureRoot,
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

    const previousMoonshotApiKey = process.env.MOONSHOT_API_KEY;
    delete process.env.MOONSHOT_API_KEY;
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
          listModels?: () => Promise<unknown>;
          listRoles?: () => Promise<unknown>;
          listAccounts?: () => Promise<unknown>;
          listProviderDeviceAuthorizations?: () => Promise<unknown>;
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
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot: path.join(os.tmpdir(), controlPlaneTestId),
      scopeId: controlPlaneTestId,
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
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
            model: "kimi-k2.5",
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
    expect(typeof backend.listProviderDeviceAuthorizations).toBe("function");
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
        expect.objectContaining({
          providerId: "azure_ai",
          displayName: "Azure AI",
          npmPackage: "@ai-sdk/azure",
          adapterFamily: "ai-sdk-azure",
          apiBase: "https://services.ai.azure.com/models",
          envVars: ["AZURE_AI_API_KEY"],
        }),
      ]),
    );
    await expect(backend.listModels?.()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "deepseek/chat-capture-v1",
          providerId: "deepseek",
          displayName: "Chat Capture V1",
          endpoint_ids: ["test.capture.chat-v1"],
          capabilities: expect.arrayContaining(["text.chat"]),
          modalities: expect.arrayContaining(["text"]),
        }),
      ]),
    );
    await expect(backend.listRoles?.()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          roleId: "coder",
        }),
      ]),
    );
    const runtimeRoles = (await backend.listRoles?.()) as readonly { roleId: string }[];
    expect(runtimeRoles.map((role) => role.roleId).sort()).toEqual(
      canonicalTaxonomy.roles.map((role) => role.id).sort(),
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
            roleAssignmentMode: "include",
            enabledRoleIds: ["coder", "security"],
            roleIds: ["coder", "security"],
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
          status: "disabled",
          healthStatus: "credentials-missing",
          rotationState: "not-required",
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.5",
              roleAssignmentMode: "include",
              enabledRoleIds: ["coder", "security"],
              roleIds: ["coder", "security"],
            },
          ],
        }),
      ]),
    );

    await expect(
      backend.activateEndpoint?.({
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      }),
    ).rejects.toThrow(
      "Provider account moonshot.personal.primary is not ready for endpoint activation.",
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

    const pendingSummary = await backend.readRuntimeSummary?.();
    expect(
      (
        pendingSummary as {
          readinessSummary?: {
            pendingDeviceAuthorizationCount?: number;
            credentialsMissingAccountCount?: number;
          };
        }
      ).readinessSummary?.pendingDeviceAuthorizationCount,
    ).toBeGreaterThan(0);
    expect(
      (
        pendingSummary as {
          readinessSummary?: {
            pendingDeviceAuthorizationCount?: number;
            credentialsMissingAccountCount?: number;
          };
        }
      ).readinessSummary?.credentialsMissingAccountCount,
    ).toBe(0);

    const connected = await backend.pollProviderDeviceAuthorization?.({
      authRequestId: (pending as { authRequestId: string }).authRequestId,
    });
    expect(connected).toEqual(
      expect.objectContaining({
        providerAccountId: "moonshot.personal.kimi-code",
        status: "connected",
      }),
    );

    const connectedSummary = await backend.readRuntimeSummary?.();
    expect(
      (
        connectedSummary as {
          readinessSummary?: {
            connectedWithoutEndpointCount?: number;
          };
        }
      ).readinessSummary?.connectedWithoutEndpointCount,
    ).toBeGreaterThan(0);

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
    if (previousMoonshotApiKey === undefined) {
      delete process.env.MOONSHOT_API_KEY;
    } else {
      process.env.MOONSHOT_API_KEY = previousMoonshotApiKey;
    }
  });

  test("persists runtime-managed role policy and task allowlists across backend restart", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const controlPlaneTestId = `runtime-host-role-policy-tests-${Date.now()}`;
    const runtimeStateRoot = path.join(os.tmpdir(), controlPlaneTestId);
    const createBackend = () =>
      (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            readRolePolicy?: () => Promise<{
              roleDefinitions: readonly Record<string, unknown>[];
              taskDefinitions: readonly Record<string, unknown>[];
            }>;
            createRolePolicyRole?: (
              body: Record<string, unknown>,
            ) => Promise<Record<string, unknown>>;
            updateRolePolicyRole?: (
              roleId: string,
              body: Record<string, unknown>,
            ) => Promise<Record<string, unknown>>;
            listTaskDefinitions?: () => Promise<readonly Record<string, unknown>[]>;
            updateTaskDefinitions?: (
              body: readonly Record<string, unknown>[],
            ) => Promise<readonly Record<string, unknown>[]>;
            shutdown?: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId: controlPlaneTestId,
      });

    const backend = await createBackend();
    expect(typeof backend.readRolePolicy).toBe("function");
    expect(typeof backend.createRolePolicyRole).toBe("function");
    expect(typeof backend.updateRolePolicyRole).toBe("function");
    expect(typeof backend.listTaskDefinitions).toBe("function");
    expect(typeof backend.updateTaskDefinitions).toBe("function");

    await expect(backend.readRolePolicy?.()).resolves.toEqual(
      expect.objectContaining({
        roleDefinitions: expect.arrayContaining([
          expect.objectContaining({
            role_id: "coder",
            default_system_instructions: expect.any(String),
          }),
        ]),
        taskDefinitions: expect.arrayContaining([
          expect.objectContaining({
            task_type: "coder.edit",
            allowed_roles: expect.arrayContaining(["coder"]),
          }),
        ]),
      }),
    );

    await expect(
      backend.createRolePolicyRole?.({
        role_id: "qa.reviewer",
        name: "QA Reviewer",
        description: "Reviews and validates changes before release.",
        role_kind: "assistant",
        default_system_instructions: "Review changes carefully and highlight risks.",
        task_types_supported: ["code.review"],
        required_capabilities: [],
        preferred_capabilities: ["reasoning.multi_step"],
        forbidden_capabilities: [],
        tool_policy: { mode: "limited", allowed_tools: ["run_tests"] },
        routing_policy_overrides: { compute_preference: "balanced" },
        output_contracts: ["review.checklist"],
        safety_policy_refs: ["safety.review"],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        role_id: "qa.reviewer",
        name: "QA Reviewer",
      }),
    );

    await expect(
      backend.updateTaskDefinitions?.([
        {
          task_type: "writer.chat",
          description: "Writer chat task",
          required_inputs: [],
          required_capabilities: ["communication.user_facing"],
          preferred_capabilities: [],
          quality_metrics: [],
          allowed_roles: ["writer"],
          default_benchmark_suites: [],
        },
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
      ]),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          task_type: "code.review",
          allowed_roles: ["qa.reviewer"],
        }),
      ]),
    );

    await backend.shutdown?.();

    const restartedBackend = await createBackend();
    await expect(restartedBackend.readRolePolicy?.()).resolves.toEqual(
      expect.objectContaining({
        roleDefinitions: expect.arrayContaining([
          expect.objectContaining({
            role_id: "qa.reviewer",
            default_system_instructions: "Review changes carefully and highlight risks.",
            tool_policy: {
              mode: "limited",
              allowed_tools: ["run_tests"],
            },
            output_contracts: ["review.checklist"],
            safety_policy_refs: ["safety.review"],
          }),
        ]),
        taskDefinitions: expect.arrayContaining([
          expect.objectContaining({
            task_type: "code.review",
            allowed_roles: ["qa.reviewer"],
          }),
        ]),
      }),
    );
    await restartedBackend.shutdown?.();
  });

  test("executes env-backed api-key accounts through the live provider path when the env credential resolves", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(os.tmpdir(), `runtime-host-live-env-tests-${Date.now()}`);
    const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
    process.env.MOONSHOT_API_KEY = "moonshot-live-key";

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher?: typeof fetch;
          }) => Promise<{
            upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint: (body: Record<string, unknown>) => Promise<{ endpointId: string }>;
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
            listTelemetryRequests: () => Promise<
              readonly {
                requestId: string;
                retryCount: number;
                rerouteCount: number;
                cooldownDecision?: string | null;
              }[]
            >;
            readRequestObservation: (requestId: string) => Promise<{
              executionSemantics: {
                retryCount: number;
                rerouteCount: number;
                cooldownDecision: string;
                idempotencyDecision: string;
                toolSideEffectState: string;
              };
            } | null>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-host-live-env-tests",
        networkFetcher: async (input, init) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url === "https://api.moonshot.ai/v1/chat/completions") {
            expect(init?.method ?? "POST").toBe("POST");
            expect(init?.headers).toEqual(
              expect.objectContaining({
                authorization: "Bearer moonshot-live-key",
              }),
            );
            expect(JSON.parse(String(init?.body))).toMatchObject({
              model: "kimi-k2.5",
              messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
            });
            return new Response(
              JSON.stringify({
                id: "chatcmpl-moonshot-env",
                object: "chat.completion",
                model: "moonshot/kimi-k2.5",
                choices: [
                  {
                    index: 0,
                    message: {
                      role: "assistant",
                      content: "live moonshot env endpoint summary",
                    },
                    finish_reason: "stop",
                  },
                ],
                usage: {
                  prompt_tokens: 19,
                  completion_tokens: 6,
                  total_tokens: 25,
                },
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }

          throw new Error(`Unexpected network request: ${url}`);
        },
      });

      await backend.upsertProviderAccount({
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
            roleAssignmentMode: "all",
            roleIds: [],
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });
      const endpoint = await backend.activateEndpoint({
        providerAccountId: "moonshot.personal.primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });
      const result = await backend.executeChatCompletions(
        {
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
        },
        "req-runtime-bridge-live-env-001",
      );

      expect(result.model).toBe("moonshot/kimi-k2.5");
      expect(result.endpointId).toBe(endpoint.endpointId);
      expect(result.adapterFamily).toBe("ai-sdk-openai-compatible");
      expect(result.outputText).toBe("live moonshot env endpoint summary");
      expect(result.finishReason).toBe("stop");
      expect(result.usage.inputTokens).toBe(19);
      expect(result.usage.outputTokens).toBe(6);
    } finally {
      if (originalMoonshotApiKey === undefined) {
        process.env.MOONSHOT_API_KEY = undefined;
      } else {
        process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
      }
    }
  });

  test("retries transient API timeouts once and falls back to a secondary endpoint after quota exhaustion", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(
      os.tmpdir(),
      `runtime-host-live-fallback-tests-${Date.now()}`,
    );
    const originalPrimaryApiKey = process.env.MOONSHOT_PRIMARY_API_KEY;
    const originalBackupApiKey = process.env.MOONSHOT_BACKUP_API_KEY;
    process.env.MOONSHOT_PRIMARY_API_KEY = "moonshot-primary-live-key";
    process.env.MOONSHOT_BACKUP_API_KEY = "moonshot-backup-live-key";

    const seenAuthorizations: string[] = [];
    let primaryAttempts = 0;

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher?: typeof fetch;
          }) => Promise<{
            upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint: (body: Record<string, unknown>) => Promise<{ endpointId: string }>;
            executeChatCompletions: (
              body: Record<string, unknown>,
              requestId: string,
            ) => Promise<{
              model: string;
              endpointId: string;
              outputText: string;
              finishReason: string;
              usage: {
                inputTokens: number;
                outputTokens: number;
              };
            }>;
            readRequestObservation: (requestId: string) => Promise<{
              executionSemantics?: {
                retryCount?: number;
                rerouteCount?: number;
                cooldownDecision?: string | null;
                idempotencyDecision?: string | null;
                toolSideEffectState?: string | null;
                failedAttempts?: Array<Record<string, unknown>>;
              };
            } | null>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-host-live-fallback-tests",
        networkFetcher: async (input, init) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url !== "https://api.moonshot.ai/v1/chat/completions") {
            throw new Error(`Unexpected network request: ${url}`);
          }

          const headers = (init?.headers ?? {}) as Record<string, string>;
          const authorization = headers.authorization ?? "";
          seenAuthorizations.push(authorization);

          if (authorization === "Bearer moonshot-primary-live-key") {
            primaryAttempts += 1;
            if (primaryAttempts === 1) {
              throw new Error(
                "Connection Error: Could not reach the AI service. Request timed out.",
              );
            }
            return new Response(
              JSON.stringify({
                error: {
                  message:
                    "Codex Subscription execution failed because the authenticated ChatGPT account has hit its current usage limit or has no remaining credits for this turn.",
                  code: "insufficient_quota",
                },
              }),
              { status: 429, headers: { "content-type": "application/json" } },
            );
          }

          if (authorization === "Bearer moonshot-backup-live-key") {
            return new Response(
              JSON.stringify({
                id: "chatcmpl-moonshot-backup",
                object: "chat.completion",
                model: "moonshot/kimi-k2.5",
                choices: [
                  {
                    index: 0,
                    message: {
                      role: "assistant",
                      content: "backup endpoint handled the request",
                    },
                    finish_reason: "stop",
                  },
                ],
                usage: {
                  prompt_tokens: 24,
                  completion_tokens: 7,
                  total_tokens: 31,
                },
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }

          throw new Error(`Unexpected authorization header: ${authorization}`);
        },
      });

      await backend.upsertProviderAccount({
        providerAccountId: "moonshot.personal.a-primary",
        providerId: "moonshot",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: {
          backend: "env",
          ref: "MOONSHOT_PRIMARY_API_KEY",
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
            roleAssignmentMode: "all",
            roleIds: [],
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });
      await backend.upsertProviderAccount({
        providerAccountId: "moonshot.personal.z-backup",
        providerId: "moonshot",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: {
          backend: "env",
          ref: "MOONSHOT_BACKUP_API_KEY",
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
            roleAssignmentMode: "all",
            roleIds: [],
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });
      await backend.activateEndpoint({
        providerAccountId: "moonshot.personal.a-primary",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });
      await backend.activateEndpoint({
        providerAccountId: "moonshot.personal.z-backup",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });

      const result = await backend.executeChatCompletions(
        {
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
        },
        "req-runtime-bridge-live-fallback-001",
      );

      expect(result.endpointId).toBe("moonshot.personal.z-backup.global.kimi-k2.5");
      expect(result.outputText).toBe("backup endpoint handled the request");
      expect(result.finishReason).toBe("stop");
      expect(result.usage.inputTokens).toBe(24);
      expect(result.usage.outputTokens).toBe(7);
      await expect(
        backend.readRequestObservation("req-runtime-bridge-live-fallback-001"),
      ).resolves.toEqual(
        expect.objectContaining({
          executionSemantics: expect.objectContaining({
            retryCount: 1,
            rerouteCount: 1,
            cooldownDecision: "recorded",
            idempotencyDecision: "not_needed",
            toolSideEffectState: "none",
            failedAttempts: expect.arrayContaining([
              expect.objectContaining({
                failedEndpointId: "moonshot.personal.a-primary.global.kimi-k2.5",
                failureClass: "upstream_timeout",
                retryable: true,
                fallbackEligible: true,
                cooldownRecorded: false,
              }),
              expect.objectContaining({
                failedEndpointId: "moonshot.personal.a-primary.global.kimi-k2.5",
                failureClass: "quota_exhausted",
                retryable: false,
                fallbackEligible: true,
                cooldownRecorded: true,
                cooldownFailureCount: 1,
                errorPreview: expect.objectContaining({
                  message: expect.stringContaining("usage limit"),
                }),
              }),
            ]),
          }),
        }),
      );
      await expect(backend.listTelemetryRequests()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            requestId: "req-runtime-bridge-live-fallback-001",
            retryCount: 1,
            rerouteCount: 1,
            cooldownDecision: "recorded",
          }),
        ]),
      );
      const followUpResult = await backend.executeChatCompletions(
        {
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Summarize the chosen endpoint again." }],
        },
        "req-runtime-bridge-live-fallback-002",
      );

      expect(followUpResult.endpointId).toBe("moonshot.personal.z-backup.global.kimi-k2.5");
      expect(followUpResult.outputText).toBe("backup endpoint handled the request");
      expect(seenAuthorizations).toEqual([
        "Bearer moonshot-primary-live-key",
        "Bearer moonshot-primary-live-key",
        "Bearer moonshot-backup-live-key",
        "Bearer moonshot-backup-live-key",
      ]);
    } finally {
      if (originalPrimaryApiKey === undefined) {
        process.env.MOONSHOT_PRIMARY_API_KEY = undefined;
      } else {
        process.env.MOONSHOT_PRIMARY_API_KEY = originalPrimaryApiKey;
      }
      if (originalBackupApiKey === undefined) {
        process.env.MOONSHOT_BACKUP_API_KEY = undefined;
      } else {
        process.env.MOONSHOT_BACKUP_API_KEY = originalBackupApiKey;
      }
    }
  });

  test("persists routed provider execution failures with selected endpoint inspection context", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "runtime-host-failure-capture-"));
    const originalApiKey = process.env.DEEPSEEK_FAILURE_CAPTURE_API_KEY;
    process.env.DEEPSEEK_FAILURE_CAPTURE_API_KEY = "deepseek-failure-capture-key";
    const requestId = "req-runtime-bridge-routed-provider-failure-001";
    const seenRequestBodies: unknown[] = [];

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher?: typeof fetch;
        }) => Promise<{
          upsertProviderAccount: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint: (body: Record<string, unknown>) => Promise<{ endpointId: string }>;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<unknown>;
          listTelemetryRequests: () => Promise<
            readonly Array<{
              requestId: string;
              endpointId: string;
              modelId?: string | null;
              requestedModelId?: string | null;
              selectedModelId?: string | null;
              providerId?: string | null;
              providerFamily?: string | null;
              providerAccountId?: string | null;
              endpointKind?: string | null;
              servingSource?: string | null;
              sourceType?: string | null;
              errorClass?: string | null;
              statusCode?: number | null;
              adapterFamily?: string | null;
              executionFamily?: string | null;
              eligibleEndpointIds?: readonly string[];
            }>
          >;
          readRequestObservation: (requestId: string) => Promise<Record<string, unknown> | null>;
          shutdown: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-failure-capture-tests",
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        expect(url).toBe("https://api.deepseek.com/v1/chat/completions");
        seenRequestBodies.push(JSON.parse(String(init?.body)));
        return new Response(
          JSON.stringify({
            error: {
              message: "Insufficient Balance",
              type: "unknown_error",
              code: "invalid_request_error",
            },
          }),
          { status: 402, headers: { "content-type": "application/json" } },
        );
      },
    });

    try {
      await backend.upsertProviderAccount({
        providerAccountId: "deepseek.personal.failure-capture",
        providerId: "deepseek",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: {
          backend: "env",
          ref: "DEEPSEEK_FAILURE_CAPTURE_API_KEY",
        },
        authMode: "api-key-static",
        regionPolicy: {
          mode: "prefer",
          regions: ["global"],
        },
        baseUrlOverride: "https://api.deepseek.com/v1",
        allowedModels: ["deepseek/deepseek-v4-pro"],
        modelRoleBindings: [
          {
            modelId: "deepseek/deepseek-v4-pro",
            roleAssignmentMode: "all",
            roleIds: [],
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });
      const endpoint = await backend.activateEndpoint({
        providerAccountId: "deepseek.personal.failure-capture",
        modelId: "deepseek/deepseek-v4-pro",
        region: "global",
      });

      await expect(
        backend.executeChatCompletions(
          {
            model: "deepseek/deepseek-v4-pro",
            messages: [{ role: "user", content: "Return OK." }],
          },
          requestId,
        ),
      ).rejects.toThrow(/Insufficient Balance/);
      expect(seenRequestBodies).toHaveLength(1);

      const telemetryRows = await backend.listTelemetryRequests();
      const failureRow = telemetryRows.find((row) => row.requestId === requestId);
      expect(failureRow).toEqual(
        expect.objectContaining({
          endpointId: endpoint.endpointId,
          modelId: "deepseek/deepseek-v4-pro",
          requestedModelId: "deepseek/deepseek-v4-pro",
          selectedModelId: "deepseek/deepseek-v4-pro",
          providerId: "deepseek",
          providerFamily: "deepseek",
          providerAccountId: "deepseek.personal.failure-capture",
          endpointKind: "remote_api",
          servingSource: "remote-service",
          sourceType: "remote",
          errorClass: "quota_exhausted",
          statusCode: 402,
          adapterFamily: "ai-sdk-openai-compatible",
          executionFamily: "remote-service",
          eligibleEndpointIds: [endpoint.endpointId],
        }),
      );
      expect(failureRow?.endpointId).not.toBe("routing.failed.pre-execution");

      await expect(backend.readRequestObservation(requestId)).resolves.toEqual(
        expect.objectContaining({
          endpointId: endpoint.endpointId,
          observationAvailability: expect.objectContaining({
            source: "raw-observation",
            rawObservationAvailable: true,
            structuredInspectionAvailable: true,
          }),
          executionSemantics: expect.objectContaining({
            sourceClient: "openai.chat.completions",
            adapterFamily: "ai-sdk-openai-compatible",
            executionFamily: "remote-service",
            failedAttempts: [
              expect.objectContaining({
                failedEndpointId: endpoint.endpointId,
                providerId: "deepseek",
                failureClass: "quota_exhausted",
                failurePhase: "provider_execution",
                retryable: false,
                fallbackEligible: true,
                errorPreview: expect.objectContaining({
                  message: "Insufficient Balance",
                  statusCode: 402,
                }),
              }),
            ],
          }),
          telemetrySnapshot: expect.objectContaining({
            providerId: "deepseek",
            providerAccountId: "deepseek.personal.failure-capture",
            requestedModelId: "deepseek/deepseek-v4-pro",
            selectedModelId: "deepseek/deepseek-v4-pro",
            eligibleEndpointIds: [endpoint.endpointId],
          }),
        }),
      );
    } finally {
      if (originalApiKey === undefined) {
        process.env.DEEPSEEK_FAILURE_CAPTURE_API_KEY = undefined;
      } else {
        process.env.DEEPSEEK_FAILURE_CAPTURE_API_KEY = originalApiKey;
      }
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("preserves the original Codex timeout when exact-model fallback exhausts all eligible endpoints", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "runtime-host-codex-timeout-"));
    const scopeId = "runtime-host-codex-timeout-tests";
    let executeAttempts = 0;

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          codexAuthAdapter?: {
            startDeviceCodeLogin: (input: { codexHome: string }) => Promise<{
              loginId: string;
              verificationUrl: string;
              userCode: string;
              wsUrl: string;
              pid: number;
            }>;
            readAccount: (input: { codexHome: string }) => Promise<{
              account: {
                type: string;
                email: string;
                planType: string;
              } | null;
              requiresOpenaiAuth: boolean;
            }>;
          };
          codexExecutionAdapter?: {
            executeRequest: (input: {
              requestId: string;
              modelId: string;
              requestCapture: {
                url: string;
                body: Record<string, unknown>;
              };
            }) => Promise<unknown>;
          };
        }) => Promise<{
          registry: EndpointRegistryResult;
          startProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<{
            status: string;
            authRequestId: string;
          }>;
          pollProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint: (body: Record<string, unknown>) => Promise<{
            endpointId: string;
          }>;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              endpointId?: string;
              ignoreExecutionFailureCooldowns?: boolean;
            },
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          listTelemetryRequests?: () => Promise<unknown>;
          listEndpoints: () => Promise<
            Array<{
              endpointId: string;
              executionCooldown?: {
                active?: boolean;
                failureCount?: number;
                cooldownUntilMs?: number;
                lastErrorClass?: string;
              };
            }>
          >;
          readRequestObservation: (requestId: string) => Promise<{
            executionSemantics?: {
              executionCooldowns?: Array<Record<string, unknown>>;
            };
            telemetrySnapshot?: {
              dimensions?: Record<string, unknown>;
            };
          } | null>;
          shutdown: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      codexAuthAdapter: {
        startDeviceCodeLogin: async () => ({
          loginId: "login-codex-timeout-001",
          verificationUrl: "https://auth.openai.com/codex/device",
          userCode: "TIME-OUT01",
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
                  access_token: "codex-access-timeout-001",
                  refresh_token: "codex-refresh-timeout-001",
                  account_id: "codex-account-timeout-001",
                },
                last_refresh: "2026-07-06T09:00:00.000Z",
              },
              null,
              2,
            ),
            "utf8",
          );
          return {
            account: {
              type: "chatgpt",
              email: "timeout@example.com",
              planType: "pro",
            },
            requiresOpenaiAuth: true,
          };
        },
      },
      codexExecutionAdapter: {
        executeRequest: async () => {
          executeAttempts += 1;
          throw new Error("Connection Error: Could not reach the AI service. Request timed out.");
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
        allowedModels: ["chatgpt/gpt-5.4"],
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

      const endpoint = await backend.activateEndpoint({
        providerAccountId: "openai.personal.codex-subscription",
        modelId: "chatgpt/gpt-5.4",
        region: "global",
      });

      await expect(
        backend.executeChatCompletions(
          {
            model: "chatgpt/gpt-5.4",
            messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
          },
          "req-runtime-bridge-codex-timeout-001",
        ),
      ).rejects.toThrow(/could not reach the ai service|timed out/i);
      expect(executeAttempts).toBe(2);
      const timeoutTelemetryRows = ((await backend.listTelemetryRequests?.()) ?? []) as Array<{
        requestId?: string;
        endpointId?: string;
        errorClass?: string | null;
        providerId?: string | null;
        providerFamily?: string | null;
        providerAccountId?: string | null;
        requestedModelId?: string | null;
        vendorId?: string | null;
        adapterFamily?: string | null;
      }>;
      const timeoutFailureRow = timeoutTelemetryRows.find(
        (row) => row.requestId === "req-runtime-bridge-codex-timeout-001",
      );
      expect(timeoutFailureRow).toEqual(
        expect.objectContaining({
          endpointId: endpoint.endpointId,
          errorClass: "upstream_timeout",
          providerId: "openai",
          providerFamily: "openai",
          providerAccountId: "openai.personal.codex-subscription",
          requestedModelId: "chatgpt/gpt-5.4",
          vendorId: "chatgpt-codex-responses",
          adapterFamily: "ai-sdk-openai",
        }),
      );
      expect(timeoutFailureRow?.endpointId).not.toBe("routing.failed.pre-execution");
      await expect(
        backend.readRequestObservation("req-runtime-bridge-codex-timeout-001"),
      ).resolves.toEqual(
        expect.objectContaining({
          endpointId: endpoint.endpointId,
          observationAvailability: expect.objectContaining({
            source: "raw-observation",
            structuredInspectionAvailable: true,
          }),
          executionSemantics: expect.objectContaining({
            retryCount: 1,
            failedAttempts: expect.arrayContaining([
              expect.objectContaining({
                failedEndpointId: endpoint.endpointId,
                failureClass: "upstream_timeout",
                failurePhase: "provider_execution",
                retryable: true,
                fallbackEligible: true,
              }),
            ]),
          }),
        }),
      );
      let cooldownError: unknown;
      try {
        await backend.executeChatCompletions(
          {
            model: "chatgpt/gpt-5.4",
            messages: [{ role: "user", content: "Try again while the endpoint is cooling down." }],
          },
          "req-runtime-bridge-codex-timeout-002",
        );
      } catch (error) {
        cooldownError = error;
      }
      expect(cooldownError).toBeInstanceOf(Error);
      expect((cooldownError as Error).message).toMatch(
        /temporarily unavailable|recent execution failures/i,
      );
      expect(executeAttempts).toBe(2);
      await expect(
        backend.executeChatCompletions(
          {
            model: "chatgpt/gpt-5.4",
            messages: [
              {
                role: "user",
                content: "Benchmark this exact endpoint even if a cooldown receipt exists.",
              },
            ],
          },
          "req-runtime-bridge-codex-timeout-benchmark-001",
          undefined,
          {
            endpointId: endpoint.endpointId,
            ignoreExecutionFailureCooldowns: true,
          },
        ),
      ).rejects.toThrow(/could not reach the ai service|timed out/i);
      expect(executeAttempts).toBe(4);

      const server = await (
        bridge as {
          startBridgeServer: (options: {
            host: string;
            port: number;
            registry: EndpointRegistryResult;
            executeChatCompletions: (
              body: Record<string, unknown>,
              requestId: string,
              streamWriter?: unknown,
              requestOptions?: {
                clientRequestId?: string;
              },
            ) => Promise<unknown>;
            executeResponses: (
              body: Record<string, unknown>,
              requestId: string,
            ) => Promise<unknown>;
            listTelemetryRequests?: () => Promise<unknown>;
            readRequestObservation?: (requestId: string) => Promise<unknown>;
          }) => Promise<{ port: number; close(): Promise<void> }>;
        }
      ).startBridgeServer({
        host: "127.0.0.1",
        port: 0,
        registry: backend.registry,
        executeChatCompletions: backend.executeChatCompletions,
        executeResponses: backend.executeResponses,
        listTelemetryRequests: backend.listTelemetryRequests,
        readRequestObservation: backend.readRequestObservation,
      });

      try {
        const httpClientRequestId = "req-runtime-bridge-codex-timeout-http-001";
        const httpResponse = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-request-id": httpClientRequestId,
          },
          body: JSON.stringify({
            model: "chatgpt/gpt-5.4",
            messages: [{ role: "user", content: "Try the cooling endpoint through HTTP." }],
          }),
        });
        expect(httpResponse.status).toBe(400);
        await expect(httpResponse.json()).resolves.toEqual(
          expect.objectContaining({
            error: expect.objectContaining({
              type: "routing_error",
              code: "no_eligible_target",
              requestedModel: "chatgpt/gpt-5.4",
              deniedEndpointIds: [endpoint.endpointId],
              executionCooldowns: [
                expect.objectContaining({
                  endpointId: endpoint.endpointId,
                  active: true,
                  failureCount: 2,
                  lastErrorClass: "upstream_timeout",
                }),
              ],
            }),
          }),
        );
        expect(executeAttempts).toBe(4);

        const telemetryResponse = await fetch(
          `http://127.0.0.1:${server.port}/api/role-model/telemetry/requests`,
        );
        expect(telemetryResponse.status).toBe(200);
        const telemetryRows = (await telemetryResponse.json()) as Array<{
          clientRequestId?: string | null;
          errorClass?: string | null;
          requestedModelId?: string | null;
          requestId?: string;
          statusCode?: number | null;
        }>;
        const httpTelemetryRow = telemetryRows.find(
          (row) => row.clientRequestId === httpClientRequestId,
        );
        expect(httpTelemetryRow).toEqual(
          expect.objectContaining({
            errorClass: "no_eligible_target",
            requestedModelId: "chatgpt/gpt-5.4",
            statusCode: 400,
          }),
        );
        expect(httpTelemetryRow?.requestId).toBeTruthy();

        const httpObservationResponse = await fetch(
          `http://127.0.0.1:${server.port}/api/role-model/requests/${httpTelemetryRow?.requestId}`,
        );
        expect(httpObservationResponse.status).toBe(200);
        await expect(httpObservationResponse.json()).resolves.toEqual(
          expect.objectContaining({
            diagnostics: expect.objectContaining({
              execution: expect.arrayContaining([
                expect.objectContaining({
                  code: "no_eligible_target",
                }),
              ]),
            }),
            telemetrySnapshot: expect.objectContaining({
              dimensions: expect.objectContaining({
                executionCooldown: expect.objectContaining({
                  deniedEndpointIds: [endpoint.endpointId],
                  entries: [
                    expect.objectContaining({
                      endpointId: endpoint.endpointId,
                      active: true,
                      failureCount: 2,
                      lastErrorClass: "upstream_timeout",
                    }),
                  ],
                }),
              }),
            }),
          }),
        );
      } finally {
        await server.close();
      }

      const databasePath = resolveSqliteMemoryLocation({
        runtimeStateRoot,
        scopeId,
      });
      const database = new DatabaseSync(databasePath);
      try {
        const row = database
          .prepare(
            "SELECT maintenance_value FROM memory_maintenance WHERE maintenance_key = ? LIMIT 1",
          )
          .get("routing.execution-failure-cooldowns.v1") as
          | {
              maintenance_value: string;
            }
          | undefined;

        expect(row).toBeDefined();
        const cooldowns =
          row && typeof row.maintenance_value === "string"
            ? (JSON.parse(row.maintenance_value) as Record<string, Record<string, unknown>>)
            : {};
        expect(cooldowns).toEqual(
          expect.objectContaining({
            [endpoint.endpointId]: expect.objectContaining({
              endpointId: endpoint.endpointId,
              failureCount: 2,
              lastErrorClass: "upstream_timeout",
            }),
          }),
        );
      } finally {
        database.close();
      }

      const observation = await backend.readRequestObservation(
        "req-runtime-bridge-codex-timeout-002",
      );
      expect(observation).toEqual(
        expect.objectContaining({
          diagnostics: expect.objectContaining({
            execution: expect.arrayContaining([
              expect.objectContaining({
                code: "no_eligible_target",
              }),
            ]),
          }),
          telemetrySnapshot: expect.objectContaining({
            dimensions: expect.objectContaining({
              executionCooldown: expect.objectContaining({
                deniedEndpointIds: [endpoint.endpointId],
                entries: [
                  expect.objectContaining({
                    endpointId: endpoint.endpointId,
                    active: true,
                    failureCount: 1,
                    lastErrorClass: "upstream_timeout",
                  }),
                ],
              }),
            }),
          }),
        }),
      );
      await expect(backend.listEndpoints()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            endpointId: endpoint.endpointId,
            executionCooldown: expect.objectContaining({
              active: true,
              failureCount: 2,
              lastErrorClass: "upstream_timeout",
            }),
          }),
        ]),
      );
    } finally {
      await backend.shutdown?.();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("executes direct exact-model chat requests through the Codex subscription endpoint", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "runtime-host-codex-direct-"));
    const scopeId = "runtime-host-codex-direct-tests";
    const seenRequests: Array<{
      requestId: string;
      modelId: string;
      requestModel: string | null;
    }> = [];

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          codexAuthAdapter?: {
            startDeviceCodeLogin: (input: { codexHome: string }) => Promise<{
              loginId: string;
              verificationUrl: string;
              userCode: string;
              wsUrl: string;
              pid: number;
            }>;
            readAccount: (input: { codexHome: string }) => Promise<{
              account: {
                type: string;
                email: string;
                planType: string;
              } | null;
              requiresOpenaiAuth: boolean;
            }>;
          };
          codexExecutionAdapter?: {
            executeRequest: (input: {
              requestId: string;
              modelId: string;
              requestCapture: {
                url: string;
                body: Record<string, unknown>;
              };
            }) => Promise<{
              statusCode: number;
              body: Record<string, unknown>;
              vendorMetadata?: Record<string, unknown>;
            }>;
          };
        }) => Promise<{
          startProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<{
            status: string;
            authRequestId: string;
          }>;
          pollProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint: (body: Record<string, unknown>) => Promise<{
            endpointId: string;
          }>;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
            requestOptions?: {
              endpointId?: string;
            },
          ) => Promise<{
            model: string;
            endpointId: string;
            outputText: string;
          }>;
          readRequestObservation: (requestId: string) => Promise<{
            executionSemantics?: {
              adapterFamily?: string;
            };
            executionTelemetry?: {
              vendorId?: string;
            };
          } | null>;
          shutdown: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      codexAuthAdapter: {
        startDeviceCodeLogin: async () => ({
          loginId: "login-codex-direct-001",
          verificationUrl: "https://auth.openai.com/codex/device",
          userCode: "DRECT-001",
          wsUrl: "ws://127.0.0.1:4594",
          pid: 4594,
        }),
        readAccount: async ({ codexHome }) => {
          await mkdir(codexHome, { recursive: true });
          await writeFile(
            path.join(codexHome, "auth.json"),
            JSON.stringify(
              {
                auth_mode: "chatgpt",
                tokens: {
                  access_token: "codex-access-direct-001",
                  refresh_token: "codex-refresh-direct-001",
                  account_id: "codex-account-direct-001",
                },
                last_refresh: "2026-07-06T09:30:00.000Z",
              },
              null,
              2,
            ),
            "utf8",
          );
          return {
            account: {
              type: "chatgpt",
              email: "direct@example.com",
              planType: "pro",
            },
            requiresOpenaiAuth: true,
          };
        },
      },
      codexExecutionAdapter: {
        executeRequest: async ({ requestId, modelId, requestCapture }) => {
          seenRequests.push({
            requestId,
            modelId,
            requestModel:
              typeof requestCapture.body.model === "string" ? requestCapture.body.model : null,
          });
          return {
            statusCode: 200,
            body: {
              id: `chatcmpl-${requestId}`,
              choices: [
                {
                  index: 0,
                  finish_reason: "stop",
                  message: {
                    role: "assistant",
                    content: `Direct Codex response for ${modelId}`,
                  },
                },
              ],
              usage: {
                prompt_tokens: 28,
                completion_tokens: 8,
              },
            },
            vendorMetadata: {
              vendorId: "chatgpt-codex-responses",
              latencyMs: 9,
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
        allowedModels: ["chatgpt/gpt-5.4"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });

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

      const endpoint = await backend.activateEndpoint({
        providerAccountId: "openai.personal.codex-subscription",
        modelId: "chatgpt/gpt-5.4",
        region: "global",
      });

      await expect(
        backend.executeChatCompletions(
          {
            model: "chatgpt/gpt-5.4",
            messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
          },
          "req-runtime-bridge-codex-direct-001",
          undefined,
          {
            endpointId: endpoint.endpointId,
          },
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          model: "chatgpt/gpt-5.4",
          endpointId: endpoint.endpointId,
          outputText: "Direct Codex response for chatgpt/gpt-5.4",
        }),
      );

      expect(seenRequests).toEqual([
        {
          requestId: "req-runtime-bridge-codex-direct-001",
          modelId: "chatgpt/gpt-5.4",
          requestModel: "gpt-5.4",
        },
      ]);

      await expect(
        backend.readRequestObservation("req-runtime-bridge-codex-direct-001"),
      ).resolves.toEqual(
        expect.objectContaining({
          executionSemantics: expect.objectContaining({
            adapterFamily: "codex-subscription-responses",
          }),
          executionTelemetry: expect.objectContaining({
            vendorId: "chatgpt-codex-responses",
          }),
        }),
      );
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("Codex Subscription request detail preserves Responses-ingress parameter policy", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "runtime-host-codex-responses-policy-"),
    );
    const scopeId = "runtime-host-codex-responses-policy-tests";
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          codexAuthAdapter: {
            startDeviceCodeLogin: () => Promise<Record<string, unknown>>;
            readAccount: (input: { codexHome: string }) => Promise<Record<string, unknown>>;
          };
          codexExecutionAdapter: {
            executeRequest: (input: { requestId: string }) => Promise<{
              statusCode: number;
              body: Record<string, unknown>;
              vendorMetadata: {
                vendorId: string;
                latencyMs: number;
                parameterSanitization: readonly Record<string, unknown>[];
              };
            }>;
          };
        }) => Promise<{
          startProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<{
            authRequestId: string;
          }>;
          pollProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint: (body: Record<string, unknown>) => Promise<{ endpointId: string }>;
          executeResponses: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              endpointId?: string;
            },
          ) => Promise<unknown>;
          readRequestObservation: (requestId: string) => Promise<{
            executionSemantics?: {
              parameterSanitization?: readonly Record<string, unknown>[];
            };
          } | null>;
          shutdown: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      codexAuthAdapter: {
        startDeviceCodeLogin: async () => ({
          loginId: "login-codex-responses-policy-001",
          verificationUrl: "https://auth.openai.com/codex/device",
          userCode: "RESP-001",
          wsUrl: "ws://127.0.0.1:4598",
          pid: 4598,
        }),
        readAccount: async ({ codexHome }) => {
          await mkdir(codexHome, { recursive: true });
          await writeFile(
            path.join(codexHome, "auth.json"),
            JSON.stringify(
              {
                auth_mode: "chatgpt",
                tokens: {
                  access_token: "codex-access-responses-policy-001",
                  refresh_token: "codex-refresh-responses-policy-001",
                  account_id: "codex-account-responses-policy-001",
                },
                last_refresh: "2026-07-06T09:45:00.000Z",
              },
              null,
              2,
            ),
            "utf8",
          );
          return {
            account: {
              type: "chatgpt",
              email: "responses-policy@example.com",
              planType: "pro",
            },
            requiresOpenaiAuth: true,
          };
        },
      },
      codexExecutionAdapter: {
        executeRequest: async ({ requestId }) => ({
          statusCode: 200,
          body: {
            id: `chatcmpl-${requestId}`,
            choices: [
              {
                index: 0,
                finish_reason: "stop",
                message: {
                  role: "assistant",
                  content: "Responses ingress policy OK",
                },
              },
            ],
            usage: {
              prompt_tokens: 18,
              completion_tokens: 5,
            },
          },
          vendorMetadata: {
            vendorId: "chatgpt-codex-responses",
            latencyMs: 7,
            parameterSanitization: [
              {
                field: "temperature",
                sourceSurface: "openai.chat.completions",
                targetSurface: "chatgpt.codex.responses",
                action: "drop_with_receipt",
                reason: "unsupported_by_selected_backend",
                sourceValueKind: "present",
                adapterFamily: "codex-subscription-responses",
                providerId: "openai",
                vendorId: "chatgpt-codex-responses",
              },
              {
                field: "max_tokens",
                sourceSurface: "openai.chat.completions",
                targetSurface: "chatgpt.codex.responses",
                action: "drop_with_receipt",
                reason: "unsupported_by_selected_backend",
                sourceValueKind: "present",
                adapterFamily: "codex-subscription-responses",
                providerId: "openai",
                vendorId: "chatgpt-codex-responses",
              },
            ],
          },
        }),
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
        allowedModels: ["chatgpt/gpt-5.4"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });

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

      const endpoint = await backend.activateEndpoint({
        providerAccountId: "openai.personal.codex-subscription",
        modelId: "chatgpt/gpt-5.4",
        region: "global",
      });

      await backend.executeResponses(
        {
          model: "chatgpt/gpt-5.4",
          input: "Reply exactly RESPONSES_INGRESS_POLICY_OK.",
          temperature: 0,
          max_output_tokens: 32,
        },
        "req-runtime-bridge-codex-responses-policy-001",
        undefined,
        {
          endpointId: endpoint.endpointId,
        },
      );

      await expect(
        backend.readRequestObservation("req-runtime-bridge-codex-responses-policy-001"),
      ).resolves.toEqual(
        expect.objectContaining({
          executionSemantics: expect.objectContaining({
            parameterSanitization: [
              expect.objectContaining({
                field: "temperature",
                sourceSurface: "openai.responses",
                targetSurface: "chatgpt.codex.responses",
                action: "drop_with_receipt",
              }),
              expect.objectContaining({
                field: "max_output_tokens",
                sourceSurface: "openai.responses",
                targetSurface: "chatgpt.codex.responses",
                action: "drop_with_receipt",
              }),
            ],
          }),
        }),
      );
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("exact Codex execution repairs stale bridge auth from standalone runtime and clears auth cooldowns", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeContainerRoot = await mkdtemp(
      path.join(os.tmpdir(), "runtime-host-codex-auth-repair-"),
    );
    const runtimeStateRoot = path.join(runtimeContainerRoot, "state");
    const scopeId = "runtime-host-codex-auth-repair-tests";
    const bridgeCredentialFile = path.join(
      runtimeStateRoot,
      scopeId,
      "credentials",
      "oauth",
      "openai",
      "openai.personal.codex-subscription.json",
    );
    const standaloneCredentialFile = path.join(
      runtimeContainerRoot,
      "standalone-runtime",
      "credentials",
      "oauth",
      "openai",
      "openai.personal.codex-subscription.json",
    );
    const seenAuthRefreshes: string[] = [];
    const seenAccessTokens: string[] = [];

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          codexAuthAdapter?: {
            startDeviceCodeLogin: (input: { codexHome: string }) => Promise<{
              loginId: string;
              verificationUrl: string;
              userCode: string;
              wsUrl: string;
              pid: number;
            }>;
            readAccount: (input: { codexHome: string }) => Promise<{
              account: {
                type: string;
                email: string;
                planType: string;
              } | null;
              requiresOpenaiAuth: boolean;
            }>;
          };
          codexExecutionAdapter?: {
            executeRequest: (input: {
              requestId: string;
              modelId: string;
              requestCapture: {
                url: string;
                body: Record<string, unknown>;
              };
              authPayload: Record<string, unknown>;
            }) => Promise<{
              statusCode: number;
              body: Record<string, unknown>;
              vendorMetadata?: Record<string, unknown>;
            }>;
          };
        }) => Promise<{
          startProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<{
            status: string;
            authRequestId: string;
          }>;
          pollProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint: (body: Record<string, unknown>) => Promise<{
            endpointId: string;
          }>;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
            requestOptions?: {
              endpointId?: string;
            },
          ) => Promise<{
            model: string;
            endpointId: string;
            outputText: string;
          }>;
          shutdown: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      codexAuthAdapter: {
        startDeviceCodeLogin: async () => ({
          loginId: "login-codex-auth-repair-001",
          verificationUrl: "https://auth.openai.com/codex/device",
          userCode: "REPR-0001",
          wsUrl: "ws://127.0.0.1:4595",
          pid: 4595,
        }),
        readAccount: async ({ codexHome }) => {
          await mkdir(codexHome, { recursive: true });
          await writeFile(
            path.join(codexHome, "auth.json"),
            JSON.stringify(
              {
                auth_mode: "chatgpt",
                tokens: {
                  access_token: "codex-access-stale-001",
                  refresh_token: "codex-refresh-stale-001",
                  account_id: "codex-account-auth-repair-001",
                },
                last_refresh: "2026-06-19T16:56:25.457Z",
              },
              null,
              2,
            ),
            "utf8",
          );
          return {
            account: {
              type: "chatgpt",
              email: "repair@example.com",
              planType: "pro",
            },
            requiresOpenaiAuth: true,
          };
        },
      },
      codexExecutionAdapter: {
        executeRequest: async ({ authPayload, modelId }) => {
          seenAuthRefreshes.push(String(authPayload.last_refresh ?? ""));
          const tokens =
            authPayload && typeof authPayload === "object"
              ? ((authPayload as { tokens?: { access_token?: string } }).tokens ?? {})
              : {};
          seenAccessTokens.push(String(tokens.access_token ?? ""));
          return {
            statusCode: 200,
            body: {
              id: "chatcmpl-codex-auth-repair",
              choices: [
                {
                  index: 0,
                  finish_reason: "stop",
                  message: {
                    role: "assistant",
                    content: `Recovered Codex response for ${modelId}`,
                  },
                },
              ],
              usage: {
                prompt_tokens: 31,
                completion_tokens: 8,
              },
            },
            vendorMetadata: {
              vendorId: "chatgpt-codex-responses",
              latencyMs: 11,
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
        allowedModels: ["chatgpt/gpt-5.4"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });

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

      const endpoint = await backend.activateEndpoint({
        providerAccountId: "openai.personal.codex-subscription",
        modelId: "chatgpt/gpt-5.4",
        region: "global",
      });

      await mkdir(path.dirname(standaloneCredentialFile), { recursive: true });
      await writeFile(
        standaloneCredentialFile,
        JSON.stringify(
          {
            providerId: "openai",
            providerAccountId: "openai.personal.codex-subscription",
            access_token: "codex-access-standalone-002",
            refresh_token: "codex-refresh-standalone-002",
            token_type: "Bearer",
            saved_at_ms: Date.parse("2026-07-05T18:15:03.000Z"),
            codexAuth: {
              auth_mode: "chatgpt",
              OPENAI_API_KEY: null,
              last_refresh: "2026-07-05T18:14:58.145Z",
              tokens: {
                access_token: "codex-access-standalone-002",
                refresh_token: "codex-refresh-standalone-002",
                account_id: "codex-account-auth-repair-001",
              },
            },
          },
          null,
          2,
        ),
        "utf8",
      );

      const databasePath = resolveSqliteMemoryLocation({
        runtimeStateRoot,
        scopeId,
      });
      const database = new DatabaseSync(databasePath);
      try {
        database
          .prepare(
            "INSERT OR REPLACE INTO memory_maintenance (maintenance_key, maintenance_value, updated_at_ms) VALUES (?, ?, ?)",
          )
          .run(
            "routing.execution-failure-cooldowns.v1",
            JSON.stringify({
              [endpoint.endpointId]: {
                endpointId: endpoint.endpointId,
                failureCount: 2,
                cooldownUntilMs: Date.now() + 60 * 60 * 1000,
                lastFailureAtMs: Date.now(),
                lastErrorClass: "provider_auth_error",
              },
            }),
            Date.now(),
          );
      } finally {
        database.close();
      }

      await expect(
        backend.executeChatCompletions(
          {
            model: "chatgpt/gpt-5.4",
            messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
          },
          "req-runtime-bridge-codex-auth-repair-001",
          undefined,
          {
            endpointId: endpoint.endpointId,
          },
        ),
      ).resolves.toEqual(
        expect.objectContaining({
          model: "chatgpt/gpt-5.4",
          endpointId: endpoint.endpointId,
          outputText: "Recovered Codex response for chatgpt/gpt-5.4",
        }),
      );

      expect(seenAuthRefreshes).toEqual(["2026-07-05T18:14:58.145Z"]);
      expect(seenAccessTokens).toEqual(["codex-access-standalone-002"]);

      const repairedBridgePayload = JSON.parse(await readFile(bridgeCredentialFile, "utf8")) as {
        codexAuth?: {
          last_refresh?: string;
          tokens?: {
            access_token?: string;
          };
        };
      };
      expect(repairedBridgePayload.codexAuth?.last_refresh).toBe("2026-07-05T18:14:58.145Z");
      expect(repairedBridgePayload.codexAuth?.tokens?.access_token).toBe(
        "codex-access-standalone-002",
      );

      const verifyDatabase = new DatabaseSync(databasePath);
      try {
        const cooldownRow = verifyDatabase
          .prepare(
            "SELECT maintenance_value FROM memory_maintenance WHERE maintenance_key = ? LIMIT 1",
          )
          .get("routing.execution-failure-cooldowns.v1") as
          | {
              maintenance_value: string;
            }
          | undefined;
        const cooldowns =
          cooldownRow && typeof cooldownRow.maintenance_value === "string"
            ? (JSON.parse(cooldownRow.maintenance_value) as Record<string, unknown>)
            : {};
        expect(cooldowns).not.toHaveProperty(endpoint.endpointId);
      } finally {
        verifyDatabase.close();
      }
    } finally {
      await backend.shutdown();
      await rm(runtimeContainerRoot, { recursive: true, force: true });
    }
  });

  test("suppresses already-executed Codex dynamic tool calls from the final chat response and de-duplicates executions", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "runtime-host-codex-dynamic-tool-collapse-"),
    );
    const scopeId = "runtime-host-codex-dynamic-tool-collapse-tests";

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          codexAuthAdapter?: {
            startDeviceCodeLogin: (input: { codexHome: string }) => Promise<{
              loginId: string;
              verificationUrl: string;
              userCode: string;
              wsUrl: string;
              pid: number;
            }>;
            readAccount: (input: { codexHome: string }) => Promise<{
              account: {
                type: string;
                email: string;
                planType: string;
              } | null;
              requiresOpenaiAuth: boolean;
            }>;
          };
          codexExecutionAdapter?: {
            executeRequest: (input: {
              runtimeStateRoot: string;
              scopeId: string;
              requestId: string;
              providerAccountId: string;
              modelId: string;
              requestCapture: {
                url: string;
                body: Record<string, unknown>;
              };
              authPayload: Record<string, unknown>;
              executeDynamicToolCall?: (input: {
                toolCallId: string;
                toolName: string;
                toolArguments: unknown;
                workspaceRoot: string;
              }) => Promise<{
                success: boolean;
                contentItems: readonly {
                  type: "inputText";
                  text: string;
                }[];
                execution?: {
                  toolCallId: string;
                  toolName: string;
                  connectorId: string;
                  connectorKind: string;
                  status: string;
                  output: unknown;
                  diagnostics: readonly unknown[];
                };
              }>;
            }) => Promise<{
              statusCode: number;
              body: Record<string, unknown>;
              dynamicToolExecutions?: readonly {
                toolCallId: string;
                toolName: string;
                connectorId: string;
                connectorKind: string;
                status: string;
                output: unknown;
                diagnostics: readonly unknown[];
              }[];
              vendorMetadata?: Record<string, unknown>;
            }>;
          };
        }) => Promise<{
          startProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<{
            status: string;
            authRequestId: string;
          }>;
          pollProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint: (body: Record<string, unknown>) => Promise<{
            endpointId: string;
          }>;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<{
            model: string;
            endpointId: string;
            outputText: string;
            finishReason: string;
            toolCalls?: readonly unknown[];
            toolExecutions?: readonly {
              toolCallId: string;
              toolName: string;
              connectorId: string;
              connectorKind: string;
              status: string;
              output: unknown;
              diagnostics: readonly unknown[];
            }[];
          }>;
          listTelemetryRequests: () => Promise<
            readonly {
              requestId: string;
              retryCount: number;
              rerouteCount: number;
              idempotencyDecision?: string | null;
              toolSideEffectState?: string | null;
            }[]
          >;
          readRequestObservation: (requestId: string) => Promise<{
            executionSemantics: {
              retryCount: number;
              rerouteCount: number;
              idempotencyDecision: string;
              toolSideEffectState: string;
            };
          } | null>;
          shutdown: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      codexAuthAdapter: {
        startDeviceCodeLogin: async () => ({
          loginId: "login-codex-dynamic-collapse-001",
          verificationUrl: "https://auth.openai.com/codex/device",
          userCode: "TOOLS-001",
          wsUrl: "ws://127.0.0.1:4597",
          pid: 4597,
        }),
        readAccount: async ({ codexHome }) => {
          await mkdir(codexHome, { recursive: true });
          await writeFile(
            path.join(codexHome, "auth.json"),
            JSON.stringify(
              {
                auth_mode: "chatgpt",
                tokens: {
                  access_token: "codex-access-dynamic-collapse-001",
                  refresh_token: "codex-refresh-dynamic-collapse-001",
                  account_id: "codex-account-dynamic-collapse-001",
                },
                last_refresh: "2026-07-06T10:30:00.000Z",
              },
              null,
              2,
            ),
            "utf8",
          );
          return {
            account: {
              type: "chatgpt",
              email: "dynamic-collapse@example.com",
              planType: "pro",
            },
            requiresOpenaiAuth: true,
          };
        },
      },
      codexExecutionAdapter: {
        executeRequest: async ({ executeDynamicToolCall, requestCapture, requestId }) => {
          expect(requestCapture.body.tools).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                type: "function",
              }),
            ]),
          );
          expect(requestCapture.body.tool_choice).toEqual({
            type: "function",
            function: {
              name: "read_file",
            },
          });
          expect(executeDynamicToolCall).toBeDefined();

          const workspaceRoot = await mkdtemp(
            path.join(os.tmpdir(), "runtime-host-codex-dynamic-collapse-ws-"),
          );
          try {
            await (
              bridge as {
                seedManagedCodexWorkspaceFixture: (workspaceRoot: string) => Promise<void>;
              }
            ).seedManagedCodexWorkspaceFixture(workspaceRoot);

            const toolResult = await executeDynamicToolCall?.({
              toolCallId: "call-read-file-001",
              toolName: "read_file",
              toolArguments: { path: "src/router.ts" },
              workspaceRoot,
            });
            expect(toolResult?.execution).toBeDefined();

            return {
              statusCode: 200,
              body: {
                id: `chatcmpl-${requestId}`,
                choices: [
                  {
                    index: 0,
                    finish_reason: "stop",
                    message: {
                      role: "assistant",
                      content: "route",
                      tool_calls: [
                        {
                          id: "call-read-file-001",
                          type: "function",
                          function: {
                            name: "read_file",
                            arguments: '{"path":"src/router.ts"}',
                          },
                        },
                      ],
                    },
                  },
                ],
                usage: {
                  prompt_tokens: 31,
                  completion_tokens: 7,
                },
              },
              dynamicToolExecutions: toolResult?.execution ? [toolResult.execution] : [],
              vendorMetadata: {
                vendorId: "chatgpt-codex-responses",
                latencyMs: 12,
              },
            };
          } finally {
            await rm(workspaceRoot, { recursive: true, force: true });
          }
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
        allowedModels: ["chatgpt/gpt-5.4"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });

      await backend.pollProviderDeviceAuthorization({
        authRequestId: pending.authRequestId,
      });

      const endpoint = await backend.activateEndpoint({
        providerAccountId: "openai.personal.codex-subscription",
        modelId: "chatgpt/gpt-5.4",
        region: "global",
      });

      const requestId = "req-runtime-bridge-codex-dynamic-collapse-001";
      const result = await backend.executeChatCompletions(
        {
          model: "chatgpt/gpt-5.4",
          messages: [
            {
              role: "user",
              content:
                "Read the benchmark router source file and reply with the first word of its exported function name only.",
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "read_file",
                description: "Read a file from the benchmark workspace.",
                parameters: {
                  type: "object",
                  properties: {
                    path: { type: "string" },
                  },
                  required: ["path"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: {
              name: "read_file",
            },
          },
        },
        requestId,
      );

      expect(result.model).toBe("chatgpt/gpt-5.4");
      expect(result.endpointId).toBe(endpoint.endpointId);
      expect(result.outputText).toBe("route");
      expect(result.finishReason).toBe("stop");
      expect(result.toolCalls).toBeUndefined();
      expect(result.toolExecutions).toEqual([
        expect.objectContaining({
          toolCallId: "call-read-file-001",
          toolName: "read_file",
          connectorId: "request-scoped",
          connectorKind: "dynamic-tool",
          status: "succeeded",
        }),
      ]);
      await expect(backend.readRequestObservation(requestId)).resolves.toEqual(
        expect.objectContaining({
          executionSemantics: expect.objectContaining({
            retryCount: 0,
            rerouteCount: 0,
            idempotencyDecision: "tool_replay_guard_required",
            toolSideEffectState: "executed",
          }),
        }),
      );
      await expect(backend.listTelemetryRequests()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            requestId,
            retryCount: 0,
            rerouteCount: 0,
            idempotencyDecision: "tool_replay_guard_required",
            toolSideEffectState: "executed",
          }),
        ]),
      );
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("classifies subscription quota exhaustion as fallback-eligible without retrying the same endpoint", () => {
    expect(
      typeof (bridge as { classifyUpstreamExecutionFailure?: unknown })
        .classifyUpstreamExecutionFailure,
    ).toBe("function");

    const error = (
      bridge as {
        classifyUpstreamExecutionFailure: (input: {
          endpointId: string;
          message?: string;
          fallbackStatusCode?: number;
        }) => {
          statusCode: number;
          errorClass: string;
          retryable: boolean;
          fallbackEligible: boolean;
        };
      }
    ).classifyUpstreamExecutionFailure({
      endpointId: "openai.personal.a-codex.global.gpt-5.4",
      message:
        "Codex Subscription execution failed because the authenticated ChatGPT account has hit its current usage limit or has no remaining credits for this turn.",
      fallbackStatusCode: 503,
    });

    expect(error.statusCode).toBe(429);
    expect(error.errorClass).toBe("quota_exhausted");
    expect(error.retryable).toBe(false);
    expect(error.fallbackEligible).toBe(true);
  });

  test("classifies provider insufficient balance failures as quota exhaustion", () => {
    expect(
      typeof (bridge as { classifyUpstreamExecutionFailure?: unknown })
        .classifyUpstreamExecutionFailure,
    ).toBe("function");

    const error = (
      bridge as {
        classifyUpstreamExecutionFailure: (input: {
          endpointId: string;
          statusCode: number;
          body: unknown;
          providerId: string;
          providerFamily: string;
          executionFamily: string;
          adapterFamily: string;
        }) => {
          statusCode: number;
          errorClass: string;
          retryable: boolean;
          fallbackEligible: boolean;
        };
      }
    ).classifyUpstreamExecutionFailure({
      endpointId: "deepseek.personal.deepseek-api-key.global.deepseek-v4-pro",
      statusCode: 402,
      body: {
        error: {
          message: "Insufficient Balance",
          type: "unknown_error",
          code: "invalid_request_error",
        },
      },
      providerId: "deepseek",
      providerFamily: "deepseek",
      executionFamily: "remote-service",
      adapterFamily: "ai-sdk-openai-compatible",
    });

    expect(error.statusCode).toBe(402);
    expect(error.errorClass).toBe("quota_exhausted");
    expect(error.retryable).toBe(false);
    expect(error.fallbackEligible).toBe(true);
  });

  test("uses an escalating execution-failure cooldown schedule", () => {
    expect(
      typeof (bridge as { resolveExecutionFailureCooldownDurationMs?: unknown })
        .resolveExecutionFailureCooldownDurationMs,
    ).toBe("function");

    const resolveDuration = (
      bridge as {
        resolveExecutionFailureCooldownDurationMs: (failureCount: number) => number;
      }
    ).resolveExecutionFailureCooldownDurationMs;

    expect(resolveDuration(1)).toBe(10 * 60 * 1000);
    expect(resolveDuration(2)).toBe(30 * 60 * 1000);
    expect(resolveDuration(3)).toBe(60 * 60 * 1000);
    expect(resolveDuration(4)).toBe(5 * 60 * 60 * 1000);
    expect(resolveDuration(5)).toBe(10 * 60 * 60 * 1000);
    expect(resolveDuration(6)).toBe(20 * 60 * 60 * 1000);
    expect(resolveDuration(12)).toBe(20 * 60 * 60 * 1000);
  });

  test("does not place Codex subscription endpoints on cooldown for invalid_request failures", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "runtime-host-codex-invalid-request-"),
    );
    const scopeId = "runtime-host-codex-invalid-request-tests";
    let executeAttempts = 0;

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          codexAuthAdapter?: {
            startDeviceCodeLogin: (input: { codexHome: string }) => Promise<{
              loginId: string;
              verificationUrl: string;
              userCode: string;
              wsUrl: string;
              pid: number;
            }>;
            readAccount: (input: { codexHome: string }) => Promise<{
              account: {
                type: string;
                email: string;
                planType: string;
              } | null;
              requiresOpenaiAuth: boolean;
            }>;
          };
          codexExecutionAdapter?: {
            executeRequest: (input: {
              requestId: string;
              modelId: string;
              requestCapture: {
                url: string;
                body: Record<string, unknown>;
              };
            }) => Promise<{
              statusCode: number;
              body: Record<string, unknown>;
            }>;
          };
        }) => Promise<{
          startProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<{
            status: string;
            authRequestId: string;
          }>;
          pollProviderDeviceAuthorization: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint: (body: Record<string, unknown>) => Promise<{
            endpointId: string;
          }>;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
          ) => Promise<unknown>;
          shutdown: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
      codexAuthAdapter: {
        startDeviceCodeLogin: async () => ({
          loginId: "login-codex-invalid-request-001",
          verificationUrl: "https://auth.openai.com/codex/device",
          userCode: "BADREQ-001",
          wsUrl: "ws://127.0.0.1:4596",
          pid: 4596,
        }),
        readAccount: async ({ codexHome }) => {
          await mkdir(codexHome, { recursive: true });
          await writeFile(
            path.join(codexHome, "auth.json"),
            JSON.stringify(
              {
                auth_mode: "chatgpt",
                tokens: {
                  access_token: "codex-access-invalid-request-001",
                  refresh_token: "codex-refresh-invalid-request-001",
                  account_id: "codex-account-invalid-request-001",
                },
                last_refresh: "2026-07-06T09:30:00.000Z",
              },
              null,
              2,
            ),
            "utf8",
          );
          return {
            account: {
              type: "chatgpt",
              email: "invalid-request@example.com",
              planType: "pro",
            },
            requiresOpenaiAuth: true,
          };
        },
      },
      codexExecutionAdapter: {
        executeRequest: async () => {
          executeAttempts += 1;
          return {
            statusCode: 400,
            body: {
              error: {
                message: "Invalid request: local contract mismatch",
                type: "invalid_request",
                code: "invalid_request",
              },
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
        allowedModels: ["chatgpt/gpt-5.4"],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
      });

      await backend.pollProviderDeviceAuthorization({
        authRequestId: pending.authRequestId,
      });

      const endpoint = await backend.activateEndpoint({
        providerAccountId: "openai.personal.codex-subscription",
        modelId: "chatgpt/gpt-5.4",
        region: "global",
      });

      await expect(
        backend.executeChatCompletions(
          {
            model: "chatgpt/gpt-5.4",
            messages: [{ role: "user", content: "First malformed request." }],
          },
          "req-runtime-bridge-codex-invalid-request-001",
        ),
      ).rejects.toThrow(/invalid request/i);

      await expect(
        backend.executeChatCompletions(
          {
            model: "chatgpt/gpt-5.4",
            messages: [{ role: "user", content: "Second malformed request." }],
          },
          "req-runtime-bridge-codex-invalid-request-002",
        ),
      ).rejects.toThrow(/invalid request/i);

      expect(executeAttempts).toBe(2);

      const databasePath = resolveSqliteMemoryLocation({
        runtimeStateRoot,
        scopeId,
      });
      const database = new DatabaseSync(databasePath);
      try {
        const row = database
          .prepare(
            "SELECT maintenance_value FROM memory_maintenance WHERE maintenance_key = ? LIMIT 1",
          )
          .get("routing.execution-failure-cooldowns.v1") as
          | {
              maintenance_value: string;
            }
          | undefined;
        const cooldowns =
          row && typeof row.maintenance_value === "string"
            ? (JSON.parse(row.maintenance_value) as Record<string, Record<string, unknown>>)
            : {};
        expect(cooldowns[endpoint.endpointId]).toBeUndefined();
      } finally {
        database.close();
      }
    } finally {
      await backend.shutdown();
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("keeps Kimi Code and DeepSeek coding endpoints coder-eligible from the tracked catalog", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(
      os.tmpdir(),
      `runtime-host-remote-coder-catalog-tests-${Date.now()}`,
    );
    const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
    const originalDeepSeekApiKey = process.env.DEEPSEEK_API_KEY;
    process.env.MOONSHOT_API_KEY = "moonshot-api-key";
    process.env.DEEPSEEK_API_KEY = "deepseek-api-key";

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher?: typeof fetch;
          }) => Promise<{
            upsertProviderAccount: (input: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint: (input: {
              providerAccountId: string;
              modelId: string;
              region: string;
            }) => Promise<{ endpointId: string }>;
            listRouterCandidates: () => Promise<
              readonly {
                endpointId: string;
                modelId: string;
                roleBindings: readonly string[];
                capabilities: readonly string[];
              }[]
            >;
            executeChatCompletions: (
              body: Record<string, unknown>,
              requestId: string,
              streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
              requestOptions?: { requestedRoleId?: string },
            ) => Promise<{
              model: string;
              endpointId: string;
              outputText: string;
            }>;
            shutdown: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-host-remote-coder-catalog-tests",
        networkFetcher: async (input, init) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          const body = init?.body ? JSON.parse(String(init.body)) : {};

          if (url === "https://api.moonshot.ai/v1/chat/completions") {
            expect(body).toMatchObject({
              model: "kimi-k2.7-code",
            });
            return new Response(
              JSON.stringify({
                id: "chatcmpl-moonshot-k27-code",
                object: "chat.completion",
                model: "moonshot/kimi-k2.7-code",
                choices: [
                  {
                    index: 0,
                    message: {
                      role: "assistant",
                      content: "live Kimi coding summary",
                    },
                    finish_reason: "stop",
                  },
                ],
                usage: {
                  prompt_tokens: 31,
                  completion_tokens: 9,
                  total_tokens: 40,
                },
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }

          if (url === "https://api.deepseek.com/v1/chat/completions") {
            expect(body).toMatchObject({
              model: "deepseek-v4-flash",
            });
            return new Response(
              JSON.stringify({
                id: "chatcmpl-deepseek-v4-flash",
                object: "chat.completion",
                model: "deepseek/deepseek-v4-flash",
                choices: [
                  {
                    index: 0,
                    message: {
                      role: "assistant",
                      content: "live DeepSeek coding summary",
                    },
                    finish_reason: "stop",
                  },
                ],
                usage: {
                  prompt_tokens: 27,
                  completion_tokens: 8,
                  total_tokens: 35,
                },
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }

          throw new Error(`Unexpected network request: ${url}`);
        },
      });

      try {
        await backend.upsertProviderAccount({
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
          allowedModels: ["moonshot/kimi-k2.7-code"],
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.7-code",
              roleAssignmentMode: "include",
              enabledRoleIds: ["coder"],
              roleIds: ["coder"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });
        await backend.upsertProviderAccount({
          providerAccountId: "deepseek.personal.primary",
          providerId: "deepseek",
          providerKind: "provider-openai",
          orgScope: "personal",
          accountScope: "workspace-default",
          credentialRef: {
            backend: "env",
            ref: "DEEPSEEK_API_KEY",
          },
          authMode: "api-key-static",
          regionPolicy: {
            mode: "prefer",
            regions: ["global"],
          },
          baseUrlOverride: "https://api.deepseek.com/v1",
          allowedModels: ["deepseek/deepseek-v4-flash"],
          modelRoleBindings: [
            {
              modelId: "deepseek/deepseek-v4-flash",
              roleAssignmentMode: "include",
              enabledRoleIds: ["coder"],
              roleIds: ["coder"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });

        const kimiEndpoint = await backend.activateEndpoint({
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.7-code",
          region: "global",
        });
        const deepseekEndpoint = await backend.activateEndpoint({
          providerAccountId: "deepseek.personal.primary",
          modelId: "deepseek/deepseek-v4-flash",
          region: "global",
        });

        await expect(backend.listRouterCandidates()).resolves.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              endpointId: kimiEndpoint.endpointId,
              modelId: "moonshot/kimi-k2.7-code",
              roleBindings: expect.arrayContaining(["coder"]),
              capabilities: expect.arrayContaining(["code.edit", "tools.function_calling"]),
            }),
            expect.objectContaining({
              endpointId: deepseekEndpoint.endpointId,
              modelId: "deepseek/deepseek-v4-flash",
              roleBindings: expect.arrayContaining(["coder"]),
              capabilities: expect.arrayContaining(["code.edit", "tools.function_calling"]),
            }),
          ]),
        );
        const codingCandidates = await backend.listRouterCandidates();
        for (const candidate of codingCandidates) {
          expect(candidate.roleBindings).not.toEqual(
            expect.arrayContaining(["general.chat", "coder.patch", "tool.agent"]),
          );
        }

        await expect(
          backend.executeChatCompletions(
            {
              model: "moonshot/kimi-k2.7-code",
              messages: [
                {
                  role: "user",
                  content: "Prepare a small patch plan and preserve the schema contract.",
                },
              ],
            },
            "req-runtime-bridge-kimi-coder-001",
            undefined,
            {
              requestedRoleId: "coder",
              taskType: "coder.edit",
            },
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            model: "moonshot/kimi-k2.7-code",
            endpointId: kimiEndpoint.endpointId,
            outputText: "live Kimi coding summary",
          }),
        );

        await expect(
          backend.executeChatCompletions(
            {
              model: "deepseek/deepseek-v4-flash",
              messages: [
                {
                  role: "user",
                  content: "Prepare a small patch plan and preserve the schema contract.",
                },
              ],
            },
            "req-runtime-bridge-deepseek-coder-001",
            undefined,
            {
              requestedRoleId: "coder",
              taskType: "coder.edit",
            },
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            model: "deepseek/deepseek-v4-flash",
            endpointId: deepseekEndpoint.endpointId,
            outputText: "live DeepSeek coding summary",
          }),
        );
      } finally {
        await backend.shutdown();
      }
    } finally {
      if (originalMoonshotApiKey === undefined) {
        process.env.MOONSHOT_API_KEY = undefined;
      } else {
        process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
      }
      if (originalDeepSeekApiKey === undefined) {
        process.env.DEEPSEEK_API_KEY = undefined;
      } else {
        process.env.DEEPSEEK_API_KEY = originalDeepSeekApiKey;
      }
    }
  });

  test("registers configured local OpenAI-compatible peers as execution-ready model endpoints", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(os.tmpdir(), `runtime-host-local-peer-tests-${Date.now()}`);
    const modelId = "lfm2.5-1.2b-instruct";
    const peerUrl = "http://127.0.0.1:1234";

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher?: typeof fetch;
        }) => Promise<{
          updatePeers: (
            body: readonly { id: string; url: string; authToken?: string }[],
          ) => Promise<readonly { id: string; url: string; authToken?: string }[]>;
          listAccounts: () => Promise<readonly Record<string, unknown>[]>;
          loadLocalModel: (modelId: string) => Promise<{ success: boolean }>;
          listEndpoints: () => Promise<readonly Record<string, unknown>[]>;
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
      runtimeStateRoot,
      scopeId: "runtime-host-local-peer-tests",
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === `${peerUrl}/v1/models`) {
          return new Response(
            JSON.stringify({
              object: "list",
              data: [{ id: modelId, object: "model" }],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url === `${peerUrl}/v1/chat/completions`) {
          expect(init?.method ?? "POST").toBe("POST");
          expect(init?.headers).toEqual(
            expect.objectContaining({
              authorization: "Bearer role-model-local",
            }),
          );
          expect(JSON.parse(String(init?.body))).toMatchObject({
            model: modelId,
            messages: [{ role: "user", content: "Summarize the configured local endpoint." }],
          });
          return new Response(
            JSON.stringify({
              id: "chatcmpl-local-peer",
              object: "chat.completion",
              model: modelId,
              choices: [
                {
                  index: 0,
                  message: {
                    role: "assistant",
                    content: "local endpoint summary",
                  },
                  finish_reason: "stop",
                },
              ],
              usage: {
                prompt_tokens: 12,
                completion_tokens: 4,
                total_tokens: 16,
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        throw new Error(`Unexpected network request: ${url}`);
      },
    });

    await backend.updatePeers([{ id: "local-main", url: peerUrl }]);

    await expect(backend.listAccounts()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerId: "local-openai-compatible",
          providerAccountId: "local-openai-compatible.personal.local-main",
          baseUrlOverride: `${peerUrl}/v1`,
          status: "active",
          healthStatus: "healthy",
        }),
      ]),
    );

    await expect(backend.loadLocalModel(modelId)).resolves.toEqual({ success: true });

    await expect(backend.listEndpoints()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          endpointId: "local-openai-compatible.personal.local-main.local.lfm2.5-1.2b-instruct",
          modelId,
          providerId: "local-openai-compatible",
          providerAccountId: "local-openai-compatible.personal.local-main",
        }),
      ]),
    );

    await expect(backend.listLocalModels()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          modelId,
          engine: "local-openai-compatible",
        }),
      ]),
    );

    const result = await backend.executeChatCompletions(
      {
        model: modelId,
        messages: [{ role: "user", content: "Summarize the configured local endpoint." }],
      },
      "req-runtime-bridge-local-peer-001",
    );

    expect(result.model).toBe(modelId);
    expect(result.endpointId).toBe(
      "local-openai-compatible.personal.local-main.local.lfm2.5-1.2b-instruct",
    );
    expect(result.adapterFamily).toBe("ai-sdk-openai-compatible");
    expect(result.outputText).toBe("local endpoint summary");
    expect(result.finishReason).toBe("stop");
    expect(result.usage.inputTokens).toBe(12);
    expect(result.usage.outputTokens).toBe(4);
  });

  test("executes non-controller requested coder review task requests without empty chosen-endpoint failures", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(
      os.tmpdir(),
      `runtime-host-remote-review-role-tests-${Date.now()}`,
    );
    const originalMoonshotApiKey = process.env.MOONSHOT_API_KEY;
    process.env.MOONSHOT_API_KEY = "moonshot-api-key";

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher?: typeof fetch;
          }) => Promise<{
            upsertProviderAccount: (input: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint: (input: {
              providerAccountId: string;
              modelId: string;
              region: string;
            }) => Promise<{ endpointId: string }>;
            executeChatCompletions: (
              body: Record<string, unknown>,
              requestId: string,
              streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
              requestOptions?: { requestedRoleId?: string },
            ) => Promise<{
              model: string;
              endpointId: string;
              outputText: string;
            }>;
            shutdown: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
        runtimeStateRoot,
        scopeId: "runtime-host-remote-review-role-tests",
        networkFetcher: async (input, init) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          const body = init?.body ? JSON.parse(String(init.body)) : {};

          if (url === "https://api.moonshot.ai/v1/chat/completions") {
            expect(body).toMatchObject({
              model: "kimi-k2.7-code",
            });
            return new Response(
              JSON.stringify({
                id: "chatcmpl-moonshot-review-role",
                object: "chat.completion",
                model: "moonshot/kimi-k2.7-code",
                choices: [
                  {
                    index: 0,
                    message: {
                      role: "assistant",
                      content: "review role succeeded",
                    },
                    finish_reason: "stop",
                  },
                ],
                usage: {
                  prompt_tokens: 28,
                  completion_tokens: 9,
                  total_tokens: 37,
                },
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }

          throw new Error(`Unexpected network request: ${url}`);
        },
      });

      try {
        await backend.upsertProviderAccount({
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
          allowedModels: ["moonshot/kimi-k2.7-code"],
          modelRoleBindings: [
            {
              modelId: "moonshot/kimi-k2.7-code",
              roleAssignmentMode: "include",
              enabledRoleIds: ["coder", "tester"],
              roleIds: ["coder", "tester"],
            },
          ],
          deniedModels: [],
          entitlementTags: ["chat"],
          budgetPolicyRef: "budget.default",
          quotaPolicyRef: "quota.default",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        });

        const kimiEndpoint = await backend.activateEndpoint({
          providerAccountId: "moonshot.personal.primary",
          modelId: "moonshot/kimi-k2.7-code",
          region: "global",
        });

        await expect(
          backend.executeChatCompletions(
            {
              model: "moonshot/kimi-k2.7-code",
              messages: [
                {
                  role: "user",
                  content:
                    "Review this JSON schema migration plan and identify two compatibility risks with persisted alias-matrix records and telemetry query payloads.",
                },
              ],
            },
            "req-runtime-bridge-review-role-001",
            undefined,
            {
              requestedRoleId: "coder",
              taskType: "coder.review",
            },
          ),
        ).resolves.toEqual(
          expect.objectContaining({
            model: "moonshot/kimi-k2.7-code",
            endpointId: kimiEndpoint.endpointId,
            outputText: "review role succeeded",
          }),
        );
      } finally {
        await backend.shutdown();
      }
    } finally {
      if (originalMoonshotApiKey === undefined) {
        process.env.MOONSHOT_API_KEY = undefined;
      } else {
        process.env.MOONSHOT_API_KEY = originalMoonshotApiKey;
      }
    }
  });

  test("exposes llama-swap ownership and config metadata on local model and endpoint readback", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(
      os.tmpdir(),
      `runtime-host-llama-swap-readback-tests-${Date.now()}`,
    );
    const unifiedRuntimeConfigPath = path.join(runtimeStateRoot, "runtime-config.yaml");
    const modelId = "lfm2.5-1.2b-instruct";

    await mkdir(runtimeStateRoot, { recursive: true });
    await writeFile(
      unifiedRuntimeConfigPath,
      stringify({
        version: "1.0",
        llama_swap: {
          command: "node",
          args: [
            "-e",
            createLlamaSwapRunningModelsVendorScript({
              models: {
                [modelId]: {
                  cmd: "llama-server --model lfm2.5-1.2b-instruct.gguf",
                },
              },
            }),
          ],
          models: {
            [modelId]: {
              path: "C:\\models\\lfm2.5-1.2b-instruct.gguf",
              context_window: 8192,
              proxy: "http://127.0.0.1:1234",
              check_endpoint: "http://127.0.0.1:1234/health",
              use_model_name: modelId,
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
          listEndpoints: () => Promise<
            readonly {
              endpointId: string;
              modelId: string;
              providerId: string | null;
              localModelSource?: "llama-swap" | "peer-backed";
            }[]
          >;
          listLocalModels: () => Promise<
            readonly {
              modelId: string;
              loadedAt: string;
              engine: string;
              localModelSource?: "llama-swap" | "peer-backed";
              contextWindow?: number | null;
              proxyBaseUrl?: string | null;
              checkEndpoint?: string | null;
              useModelName?: string | null;
            }[]
          >;
          shutdown?: () => Promise<void>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-llama-swap-readback-tests",
      unifiedRuntimeConfigPath,
    });

    try {
      await expect(backend.listEndpoints()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            endpointId: "llama-swap.local.lfm2-5-1-2b-instruct",
            modelId,
            providerId: "llama-swap",
            localModelSource: "llama-swap",
          }),
        ]),
      );

      await expect(backend.listLocalModels()).resolves.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            modelId,
            engine: "llama.cpp",
            localModelSource: "llama-swap",
            contextWindow: 8192,
            proxyBaseUrl: "http://127.0.0.1:1234",
            checkEndpoint: "http://127.0.0.1:1234/health",
            useModelName: modelId,
          }),
        ]),
      );
    } finally {
      await Promise.race([backend.shutdown?.() ?? Promise.resolve(), delay(1_000)]);
    }
  });

  test("rejects local model activation when no configured local endpoint exposes the requested model", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(
      os.tmpdir(),
      `runtime-host-local-peer-miss-tests-${Date.now()}`,
    );
    const peerUrl = "http://127.0.0.1:1234";

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher?: typeof fetch;
        }) => Promise<{
          updatePeers: (
            body: readonly { id: string; url: string; authToken?: string }[],
          ) => Promise<readonly { id: string; url: string; authToken?: string }[]>;
          loadLocalModel: (modelId: string) => Promise<{ success: boolean }>;
          listEndpoints: () => Promise<readonly Record<string, unknown>[]>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: "runtime-host-local-peer-miss-tests",
      networkFetcher: async (input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === `${peerUrl}/v1/models`) {
          return new Response(
            JSON.stringify({
              object: "list",
              data: [{ id: "different-model", object: "model" }],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }

        throw new Error(`Unexpected network request: ${url}`);
      },
    });

    await backend.updatePeers([{ id: "local-main", url: peerUrl }]);

    await expect(backend.loadLocalModel("lfm2.5-1.2b-instruct")).rejects.toThrow(
      "Model lfm2.5-1.2b-instruct is not available on any configured local endpoint.",
    );
    await expect(backend.listEndpoints()).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerId: "local-openai-compatible",
          modelId: "lfm2.5-1.2b-instruct",
        }),
      ]),
    );
  });

  test("rehydrates connected OAuth accounts from stored token files on backend restart", async () => {
    const runtimeStateId = `runtime-host-oauth-readback-${Date.now()}`;
    const runtimeStateRoot = path.join(os.tmpdir(), runtimeStateId);
    const networkFetcher: typeof fetch = async (input, init) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
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

      throw new Error(`Unexpected network request: ${url}`);
    };

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher?: typeof fetch;
        }) => Promise<{
          listAccounts?: () => Promise<unknown>;
          startProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
          pollProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: runtimeStateId,
      networkFetcher,
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

    const databasePath = path.join(runtimeStateRoot, runtimeStateId, "memory", "memory.sqlite");
    const database = new DatabaseSync(databasePath);
    database
      .prepare(
        "UPDATE provider_accounts SET status = ?, health_status = ?, rotation_state = ? WHERE provider_account_id = ?",
      )
      .run("disabled", "credentials-missing", "in-progress", "moonshot.personal.kimi-code");
    database.close();

    const restartedBackend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher?: typeof fetch;
        }) => Promise<{
          listAccounts?: () => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: runtimeStateId,
      networkFetcher: async (input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        throw new Error(`Unexpected network request after restart: ${url}`);
      },
    });

    await expect(restartedBackend.listAccounts?.()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerAccountId: "moonshot.personal.kimi-code",
          status: "active",
          healthStatus: "healthy",
          rotationState: "stable",
        }),
      ]),
    );
  });

  test("restores pending OAuth device-authorizations from SQLite after backend restart", async () => {
    const runtimeStateId = `runtime-host-oauth-pending-${Date.now()}`;
    const runtimeStateRoot = path.join(os.tmpdir(), runtimeStateId);
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher?: typeof fetch;
        }) => Promise<{
          startProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: runtimeStateId,
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
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

        throw new Error(`Unexpected network request: ${url}`);
      },
    });

    await backend.startProviderDeviceAuthorization?.({
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

    const restartedBackend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher?: typeof fetch;
        }) => Promise<{
          listProviderDeviceAuthorizations?: () => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId: runtimeStateId,
      networkFetcher: async (input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        throw new Error(`Unexpected network request after restart: ${url}`);
      },
    });

    await expect(restartedBackend.listProviderDeviceAuthorizations?.()).resolves.toEqual([
      expect.objectContaining({
        authRequestId: expect.any(String),
        providerAccountId: "moonshot.personal.kimi-code",
        providerId: "moonshot",
        variantId: "kimi-code",
        status: "pending",
        userCode: "ABCD-EFGH",
        verificationUriComplete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
      }),
    ]);
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
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot: path.join(os.tmpdir(), "role-model-runtime-host-kimi-execution-tests"),
      scopeId: "runtime-host-kimi-execution-tests",
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
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
            model: "kimi-k2.5",
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

  test("executes exact Kimi hosted web-search requests through to a final assistant answer", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(
      os.tmpdir(),
      "role-model-runtime-host-kimi-hosted-web-search-tests",
    );
    let kimiRequestCount = 0;
    const kimiRequestBodies: Record<string, unknown>[] = [];
    await rm(runtimeStateRoot, { recursive: true, force: true });

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            fixtureRoot?: string;
            networkFetcher?: typeof fetch;
          }) => Promise<{
            executeResponses: (
              body: Record<string, unknown>,
              requestId: string,
            ) => Promise<{
              model: string;
              endpointId: string;
              adapterFamily: string;
              outputText: string;
              finishReason: string;
              toolCalls?: readonly {
                id: string;
                type: "function";
                function: {
                  name: string;
                  arguments: string;
                };
              }[];
              toolExecutions?: readonly {
                toolCallId: string;
                toolName: string;
                connectorId: string;
                connectorKind: string;
                status: string;
                output: unknown;
              }[];
              usage: {
                inputTokens: number;
                outputTokens: number;
              };
            }>;
            startProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
            pollProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
            shutdown?: () => Promise<void>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId: "runtime-host-kimi-hosted-web-search-tests",
        networkFetcher: async (input, init) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
            return new Response(
              JSON.stringify({
                user_code: "ABCD-EFGH",
                device_code: "device-002",
                verification_uri: "https://auth.kimi.com/device",
                verification_uri_complete: "https://auth.kimi.com/device?user_code=ABCD-EFGH",
                expires_in: 900,
                interval: 5,
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          if (url === "https://auth.kimi.com/api/oauth/token") {
            return new Response(
              JSON.stringify({
                access_token: "access-002",
                refresh_token: "refresh-002",
                expires_in: 3600,
                scope: "openid profile",
                token_type: "Bearer",
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }
          if (url === "https://api.kimi.com/coding/v1/chat/completions") {
            kimiRequestCount += 1;
            expect(init?.method ?? "POST").toBe("POST");
            expect(init?.headers).toEqual(
              expect.objectContaining({
                authorization: "Bearer access-002",
              }),
            );
            const requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
            kimiRequestBodies.push(requestBody);
            if (kimiRequestCount === 1) {
              expect(requestBody).toEqual(
                expect.objectContaining({
                  model: "kimi-k2.7-code",
                  thinking: {
                    type: "disabled",
                  },
                  tools: [
                    {
                      type: "builtin_function",
                      function: {
                        name: "$web_search",
                      },
                    },
                  ],
                }),
              );
              return new Response(
                JSON.stringify({
                  choices: [
                    {
                      finish_reason: "tool_calls",
                      message: {
                        content: null,
                        tool_calls: [
                          {
                            id: "call_1",
                            type: "function",
                            function: {
                              name: "$web_search",
                              arguments: '{"query":"Cloudflare stock price","total_tokens":1234}',
                            },
                          },
                        ],
                      },
                    },
                  ],
                  usage: {
                    prompt_tokens: 77,
                    completion_tokens: 9,
                  },
                }),
                { status: 200, headers: { "content-type": "application/json" } },
              );
            }

            expect(requestBody).toEqual(
              expect.objectContaining({
                model: "kimi-k2.7-code",
              }),
            );

            return new Response(
              JSON.stringify({
                choices: [
                  {
                    finish_reason: "stop",
                    message: {
                      role: "assistant",
                      content: "Cloudflare (NYSE: NET) closed at $224.06 according to MarketWatch.",
                    },
                  },
                ],
                usage: {
                  prompt_tokens: 41,
                  completion_tokens: 17,
                },
              }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }

          throw new Error(`Unexpected network request: ${url}`);
        },
      });

      try {
        const pending = await backend.startProviderDeviceAuthorization?.({
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshot",
          providerKind: "provider-openai",
          variantId: "kimi-code",
          orgScope: "personal",
          accountScope: "workspace-default",
          allowedModels: ["moonshot/kimi-k2.7-code"],
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
          modelId: "moonshot/kimi-k2.7-code",
          region: "global",
        });

        const result = await backend.executeResponses(
          {
            model: "moonshot/kimi-k2.7-code",
            input: "Find the current Cloudflare stock price and cite the source.",
            tools: [
              {
                type: "web_search",
              },
            ],
          },
          "req-runtime-bridge-kimi-hosted-web-search-001",
        );

        expect(result.model).toBe("moonshot/kimi-k2.7-code");
        expect(result.endpointId).toBe("moonshot.personal.kimi-code.global.kimi-k2.7-code");
        expect(result.adapterFamily).toBe("ai-sdk-openai-compatible");
        expect(result.finishReason).toBe("stop");
        expect(result.outputText).toContain("Cloudflare (NYSE: NET) closed at $224.06");
        expect(result.toolCalls).toBeUndefined();
        expect(result.toolExecutions).toEqual([
          {
            toolCallId: "call_1",
            toolName: "$web_search",
            connectorId: "runtime.builtin",
            connectorKind: "builtin",
            status: "succeeded",
            output: {
              query: "Cloudflare stock price",
              total_tokens: 1234,
            },
            diagnostics: [],
          },
        ]);
        expect(kimiRequestCount).toBe(2);
        expect(kimiRequestBodies[1]?.messages).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              role: "assistant",
              tool_calls: [
                expect.objectContaining({
                  function: expect.objectContaining({
                    name: "$web_search",
                  }),
                }),
              ],
            }),
            expect.objectContaining({
              role: "tool",
              tool_call_id: "call_1",
              content: '{"query":"Cloudflare stock price","total_tokens":1234}',
            }),
          ]),
        );
      } finally {
        await backend.shutdown?.();
      }
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  for (const deepseekModelId of [
    "deepseek/deepseek-v4-flash",
    "deepseek/deepseek-v4-pro",
  ] as const) {
    test(`surfaces exact ${deepseekModelId} web-search requests as consumer-managed tool calls`, async () => {
      expect(
        typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
      ).toBe("function");

      const runtimeStateRoot = path.join(
        os.tmpdir(),
        `runtime-host-${deepseekModelId.replace(/[/.]/g, "-")}-web-search-tests`,
      );
      const originalDeepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      process.env.DEEPSEEK_API_KEY = "deepseek-api-key";
      let providerRequestCount = 0;
      const providerRequestBodies: Record<string, unknown>[] = [];

      try {
        const backend = await (
          bridge as {
            createRuntimeBridgeBackend: (options: {
              repoRoot: string;
              fixtureRoot: string;
              runtimeStateRoot: string;
              scopeId: string;
              networkFetcher?: typeof fetch;
            }) => Promise<{
              upsertProviderAccount: (input: Record<string, unknown>) => Promise<unknown>;
              activateEndpoint: (input: {
                providerAccountId: string;
                modelId: string;
                region: string;
              }) => Promise<{ endpointId: string }>;
              executeChatCompletions: (
                body: Record<string, unknown>,
                requestId: string,
              ) => Promise<{
                model: string;
                endpointId: string;
                adapterFamily: string;
                outputText: string;
                finishReason: string;
                toolCalls?: readonly unknown[];
                toolExecutions?: readonly unknown[];
              }>;
              shutdown: () => Promise<void>;
            }>;
          }
        ).createRuntimeBridgeBackend({
          repoRoot,
          fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
          runtimeStateRoot,
          scopeId: `${deepseekModelId.replace(/[/.]/g, "-")}-web-search-tests`,
          networkFetcher: async (input, init) => {
            const url =
              typeof input === "string"
                ? input
                : input instanceof URL
                  ? input.toString()
                  : input.url;

            if (url === "https://api.deepseek.com/v1/chat/completions") {
              providerRequestCount += 1;
              const requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
              providerRequestBodies.push(requestBody);
              expect(requestBody).toEqual(
                expect.objectContaining({
                  model: deepseekModelId.split("/").slice(1).join("/"),
                }),
              );
              if (providerRequestCount === 1) {
                return new Response(
                  JSON.stringify({
                    choices: [
                      {
                        finish_reason: "tool_calls",
                        message: {
                          content: null,
                          tool_calls: [
                            {
                              id: "call_1",
                              type: "function",
                              function: {
                                name: "web_search",
                                arguments:
                                  '{"query":"Cloudflare NET stock price today NYSE","max_results":5}',
                              },
                            },
                          ],
                        },
                      },
                    ],
                    usage: {
                      prompt_tokens: 52,
                      completion_tokens: 11,
                      total_tokens: 63,
                    },
                  }),
                  { status: 200, headers: { "content-type": "application/json" } },
                );
              }
            }

            throw new Error(`Unexpected network request: ${url}`);
          },
        });

        try {
          await backend.upsertProviderAccount({
            providerAccountId: "deepseek.personal.primary",
            providerId: "deepseek",
            providerKind: "provider-openai",
            orgScope: "personal",
            accountScope: "workspace-default",
            credentialRef: {
              backend: "env",
              ref: "DEEPSEEK_API_KEY",
            },
            authMode: "api-key-static",
            regionPolicy: {
              mode: "prefer",
              regions: ["global"],
            },
            baseUrlOverride: "https://api.deepseek.com/v1",
            allowedModels: [deepseekModelId],
            deniedModels: [],
            entitlementTags: ["chat"],
            budgetPolicyRef: "budget.default",
            quotaPolicyRef: "quota.default",
            status: "active",
            healthStatus: "healthy",
            rotationState: "stable",
          });

          const endpoint = await backend.activateEndpoint({
            providerAccountId: "deepseek.personal.primary",
            modelId: deepseekModelId,
            region: "global",
          });

          const result = await backend.executeResponses(
            {
              model: deepseekModelId,
              input: "Find the current Cloudflare stock price and cite the source.",
              tools: [
                {
                  type: "web_search",
                },
              ],
            },
            `req-${deepseekModelId.replace(/[/.]/g, "-")}-web-search-001`,
          );

          expect(result.model).toBe(deepseekModelId);
          expect(result.endpointId).toBe(endpoint.endpointId);
          expect(result.adapterFamily).toBe("ai-sdk-openai-compatible");
          expect(result.finishReason).toBe("tool_calls");
          expect(result.outputText).toBe("");
          expect(result.toolCalls).toEqual([
            expect.objectContaining({
              id: "call_1",
              function: expect.objectContaining({
                name: "web_search",
                arguments: '{"query":"Cloudflare NET stock price today NYSE","max_results":5}',
              }),
            }),
          ]);
          expect(result.toolExecutions).toBeUndefined();
          expect(providerRequestCount).toBe(1);
          expect(providerRequestBodies[0]?.tools).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                function: expect.objectContaining({
                  name: "web_search",
                }),
              }),
            ]),
          );
        } finally {
          await backend.shutdown();
        }
      } finally {
        if (originalDeepSeekApiKey === undefined) {
          process.env.DEEPSEEK_API_KEY = undefined;
        } else {
          process.env.DEEPSEEK_API_KEY = originalDeepSeekApiKey;
        }
      }
    });
  }

  for (const dsmlCase of [
    {
      name: "web_search",
      outputText: "",
      content: [
        "<｜｜DSML｜｜tool_calls>",
        '<｜｜DSML｜｜invoke name="web_search">',
        '{"query":"Cloudflare NET after hours price","max_results":3}',
      ].join("\n"),
      expectedArguments: '{"query":"Cloudflare NET after hours price","max_results":3}',
    },
    {
      name: "web_open",
      outputText: "",
      content: [
        "<｜｜DSML｜｜tool_calls>",
        '<｜｜DSML｜｜invoke name="web_open">',
        '<｜｜DSML｜｜parameter name="url" string="true">https://www.marketwatch.com/investing/stock/net</｜｜DSML｜｜parameter>',
        "</｜｜DSML｜｜invoke>",
      ].join("\n"),
      expectedArguments: '{"url":"https://www.marketwatch.com/investing/stock/net"}',
    },
    {
      name: "web_browse",
      outputText: "I need to inspect the finance page directly.",
      content: [
        "I need to inspect the finance page directly.",
        "<｜｜DSML｜｜tool_calls>",
        '<｜｜DSML｜｜invoke name="web_browse">',
        '<｜｜DSML｜｜parameter name="url" string="true">https://www.google.com/finance/quote/NET:NYSE</｜｜DSML｜｜parameter>',
        "</｜｜DSML｜｜invoke>",
      ].join("\n"),
      expectedArguments: '{"url":"https://www.google.com/finance/quote/NET:NYSE"}',
    },
  ] as const) {
    test(`normalizes DeepSeek DSML ${dsmlCase.name} markup into consumer-visible tool calls`, async () => {
      expect(
        typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
      ).toBe("function");

      const runtimeStateRoot = path.join(
        os.tmpdir(),
        `runtime-host-deepseek-dsml-${dsmlCase.name.replace(/[^a-z0-9]+/gi, "-")}-tests`,
      );
      const originalDeepSeekApiKey = process.env.DEEPSEEK_API_KEY;
      process.env.DEEPSEEK_API_KEY = "deepseek-api-key";
      let providerRequestCount = 0;

      try {
        const backend = await (
          bridge as {
            createRuntimeBridgeBackend: (options: {
              repoRoot: string;
              fixtureRoot: string;
              runtimeStateRoot: string;
              scopeId: string;
              networkFetcher?: typeof fetch;
            }) => Promise<{
              upsertProviderAccount: (input: Record<string, unknown>) => Promise<unknown>;
              activateEndpoint: (input: {
                providerAccountId: string;
                modelId: string;
                region: string;
              }) => Promise<{ endpointId: string }>;
              executeChatCompletions: (
                body: Record<string, unknown>,
                requestId: string,
              ) => Promise<{
                model: string;
                endpointId: string;
                adapterFamily: string;
                outputText: string;
                finishReason: string;
                toolCalls?: readonly unknown[];
                toolExecutions?: readonly unknown[];
              }>;
              shutdown: () => Promise<void>;
            }>;
          }
        ).createRuntimeBridgeBackend({
          repoRoot,
          fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
          runtimeStateRoot,
          scopeId: `deepseek-dsml-${dsmlCase.name}-tests`,
          networkFetcher: async (input, init) => {
            const url =
              typeof input === "string"
                ? input
                : input instanceof URL
                  ? input.toString()
                  : input.url;

            if (url === "https://api.deepseek.com/v1/chat/completions") {
              providerRequestCount += 1;
              const requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
              expect(requestBody).toEqual(
                expect.objectContaining({
                  model: "deepseek-v4-pro",
                }),
              );
              return new Response(
                JSON.stringify({
                  choices: [
                    {
                      finish_reason: "stop",
                      message: {
                        role: "assistant",
                        content: dsmlCase.content,
                      },
                    },
                  ],
                  usage: {
                    prompt_tokens: 34,
                    completion_tokens: 24,
                    total_tokens: 58,
                  },
                }),
                { status: 200, headers: { "content-type": "application/json" } },
              );
            }

            throw new Error(`Unexpected network request: ${url}`);
          },
        });

        try {
          await backend.upsertProviderAccount({
            providerAccountId: "deepseek.personal.primary",
            providerId: "deepseek",
            providerKind: "provider-openai",
            orgScope: "personal",
            accountScope: "workspace-default",
            credentialRef: {
              backend: "env",
              ref: "DEEPSEEK_API_KEY",
            },
            authMode: "api-key-static",
            regionPolicy: {
              mode: "prefer",
              regions: ["global"],
            },
            baseUrlOverride: "https://api.deepseek.com/v1",
            allowedModels: ["deepseek/deepseek-v4-pro"],
            deniedModels: [],
            entitlementTags: ["chat"],
            budgetPolicyRef: "budget.default",
            quotaPolicyRef: "quota.default",
            status: "active",
            healthStatus: "healthy",
            rotationState: "stable",
          });

          const endpoint = await backend.activateEndpoint({
            providerAccountId: "deepseek.personal.primary",
            modelId: "deepseek/deepseek-v4-pro",
            region: "global",
          });

          const result = await backend.executeChatCompletions(
            {
              model: "deepseek/deepseek-v4-pro",
              messages: [
                {
                  role: "user",
                  content: "Find the current Cloudflare stock price and cite the source.",
                },
                {
                  role: "assistant",
                  content: null,
                  tool_calls: [
                    {
                      id: "call_1",
                      type: "function",
                      function: {
                        name: "web_search",
                        arguments:
                          '{"query":"Cloudflare NET stock price today NYSE","max_results":5}',
                      },
                    },
                  ],
                },
                {
                  role: "tool",
                  tool_call_id: "call_1",
                  content:
                    '{"query":"Cloudflare NET stock price today NYSE","results":[{"title":"Cloudflare","url":"https://example.com"}]}',
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "web_search",
                    parameters: {
                      type: "object",
                      properties: {
                        query: { type: "string" },
                      },
                      required: ["query"],
                    },
                  },
                },
                {
                  type: "function",
                  function: {
                    name: "web_open",
                    parameters: {
                      type: "object",
                      properties: {
                        url: { type: "string" },
                      },
                      required: ["url"],
                    },
                  },
                },
                {
                  type: "function",
                  function: {
                    name: "web_browse",
                    parameters: {
                      type: "object",
                      properties: {
                        url: { type: "string" },
                      },
                      required: ["url"],
                    },
                  },
                },
              ],
            },
            `req-deepseek-dsml-${dsmlCase.name}-001`,
          );

          expect(result.model).toBe("deepseek/deepseek-v4-pro");
          expect(result.endpointId).toBe(endpoint.endpointId);
          expect(result.adapterFamily).toBe("ai-sdk-openai-compatible");
          expect(result.finishReason).toBe("tool_calls");
          expect(result.outputText).toBe(dsmlCase.outputText);
          expect(result.toolCalls).toEqual([
            expect.objectContaining({
              function: expect.objectContaining({
                name: dsmlCase.name,
                arguments: dsmlCase.expectedArguments,
              }),
            }),
          ]);
          expect(result.toolExecutions).toBeUndefined();
          expect(providerRequestCount).toBe(1);
        } finally {
          await backend.shutdown();
        }
      } finally {
        if (originalDeepSeekApiKey === undefined) {
          process.env.DEEPSEEK_API_KEY = undefined;
        } else {
          process.env.DEEPSEEK_API_KEY = originalDeepSeekApiKey;
        }
      }
    });
  }

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
      fixtureRoot: testFixtureRoot,
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
    expect(result.finishReason).toBe("tool_calls");
    expect(result.usage.inputTokens).toBe(32);
    expect(result.usage.outputTokens).toBe(24);
  });

  test("persists applied role policy diagnostics and injected policy messages for runtime-backed responses requests", async () => {
    const fixtureRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-role-policy-response-fixtures-"),
    );
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-role-policy-responses-"),
    );

    try {
      await cp(testFixtureRoot, fixtureRoot, { recursive: true });
      await writeFile(
        path.join(fixtureRoot, "observability-policy.json"),
        JSON.stringify(
          {
            environment: "local-dev",
            rawCapture: {
              requestHeaders: "redact-secrets",
              requestBody: "enabled",
              responseBody: "disabled",
            },
            structuredInspection: {
              mode: "redacted",
              redactHeaders: ["authorization"],
            },
            operatorSurface: {
              preserveRawCaptures: true,
            },
          },
          null,
          2,
        ),
      );

      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            fixtureRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
          }) => Promise<{
            createRolePolicyRole: (
              body: Record<string, unknown>,
            ) => Promise<Record<string, unknown>>;
            listTaskDefinitions: () => Promise<readonly Record<string, unknown>[]>;
            updateTaskDefinitions: (
              body: readonly Record<string, unknown>[],
            ) => Promise<readonly Record<string, unknown>[]>;
            executeResponses: (
              body: Record<string, unknown>,
              requestId: string,
              streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
              requestOptions?: {
                requestedRoleId?: string;
              },
            ) => Promise<{
              endpointId: string;
            }>;
            readRequestObservation: (requestId: string) => Promise<unknown>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot,
        runtimeStateRoot,
        scopeId: "runtime-host-role-policy-response-tests",
      });

      await backend.createRolePolicyRole({
        role_id: "qa.reviewer",
        name: "QA Reviewer",
        description: "Reviews routed runtime behavior.",
        role_kind: "assistant",
        default_system_instructions: "Review carefully and produce a release-readiness assessment.",
        task_types_supported: ["text.chat"],
        required_capabilities: [],
        preferred_capabilities: ["reasoning.multi_step"],
        forbidden_capabilities: [],
        tool_policy: { mode: "limited", allowed_tools: ["run_tests"] },
        routing_policy_overrides: {},
        output_contracts: ["review.checklist"],
        safety_policy_refs: ["safety.review"],
      });

      const taskDefinitions = await backend.listTaskDefinitions();
      await backend.updateTaskDefinitions(
        taskDefinitions.map((taskDefinition) =>
          taskDefinition.task_type === "text.chat"
            ? {
                ...taskDefinition,
                allowed_roles: Array.from(
                  new Set([...(taskDefinition.allowed_roles as readonly string[]), "qa.reviewer"]),
                ),
              }
            : taskDefinition,
        ),
      );

      const requestId = "req-runtime-bridge-role-policy-responses-001";
      await backend.executeResponses(
        {
          model: "deepseek/chat-capture-v1",
          input: "Assess release readiness.",
          tools: [
            {
              type: "function",
              name: "run_tests",
              parameters: { type: "object", properties: {} },
            },
            {
              type: "function",
              name: "deploy_release",
              parameters: { type: "object", properties: {} },
            },
          ],
        },
        requestId,
        undefined,
        {
          requestedRoleId: "qa.reviewer",
        },
      );

      await expect(backend.readRequestObservation(requestId)).resolves.toMatchObject({
        requestId,
        endpointId: "test.capture.chat-v1",
        routingDiagnostics: {
          rolePolicy: {
            requestedRoleId: "qa.reviewer",
            appliedRoleId: "qa.reviewer",
            defaultSystemInstructionsApplied: true,
            toolPolicyMode: "limited",
            allowedTools: ["run_tests"],
            outputContracts: ["review.checklist"],
            safetyPolicyRefs: ["safety.review"],
          },
        },
        inspection: {
          request: {
            requestCapture: {
              body: {
                model: "chat-capture-v1",
                input: [
                  {
                    role: "system",
                    content: "Review carefully and produce a release-readiness assessment.",
                  },
                  {
                    role: "system",
                    content:
                      "You must satisfy these output contracts in your response: review.checklist.",
                  },
                  {
                    role: "system",
                    content:
                      "Apply these safety policies while handling the request: safety.review.",
                  },
                  {
                    role: "user",
                    content: "Assess release readiness.",
                  },
                ],
              },
            },
          },
        },
      });
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
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
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot: await mkdtemp(
        path.join(os.tmpdir(), "role-model-runtime-host-route-tests-"),
      ),
      scopeId: `runtime-host-route-tests-${Date.now()}`,
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
      const clientRequestId = "req-runtime-bridge-route-001";
      const completionResponse = await fetch(
        `http://127.0.0.1:${server.port}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-request-id": clientRequestId,
          },
          body: JSON.stringify({
            model: "deepseek/chat-capture-v1",
            messages: [{ role: "user", content: "Summarize the chosen endpoint." }],
          }),
        },
      );
      expect(completionResponse.status).toBe(200);
      const telemetryRequestsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/requests`,
      );
      expect(telemetryRequestsResponse.status).toBe(200);
      const telemetryRequests = (await telemetryRequestsResponse.json()) as Array<{
        requestId: string;
        clientRequestId?: string | null;
        endpointId: string;
      }>;
      const requestId =
        telemetryRequests.find((entry) => entry.clientRequestId === clientRequestId)?.requestId ??
        null;
      expect(requestId).toMatch(/^req-/);
      if (!requestId) {
        throw new Error("Expected a canonical request id for the correlated request.");
      }

      const recentResponse = await fetch(`http://127.0.0.1:${server.port}/api/role-model/requests`);
      expect(recentResponse.status).toBe(200);
      expect(await recentResponse.json()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            requestId,
            clientRequestId,
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
            providerId: "deepseek",
            providerFamily: "deepseek",
            promptCacheSupported: true,
            requestCount: 1,
          }),
        ]),
      );

      expect(telemetryRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            requestId,
            clientRequestId,
            endpointId: "test.capture.chat-v1",
            sourceType: "remote",
            providerId: "deepseek",
            providerFamily: "deepseek",
            finishReason: "tool_calls",
            promptCacheSupported: true,
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
          clientRequestId,
          endpointId: "test.capture.chat-v1",
          sourceType: "remote",
          capturePolicy: expect.objectContaining({
            structuredInspectionAvailable: true,
          }),
          observationAvailability: expect.objectContaining({
            source: "raw-observation",
            rawObservationAvailable: true,
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

  test("aggregates generic telemetry analytics from persisted request-time routing and cost facts", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-telemetry-analytics-tests-"),
    );
    const scopeId = "runtime-host-telemetry-analytics-tests";
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          queryTelemetryAnalytics?: (body: Record<string, unknown>) => Promise<unknown>;
          readRequestObservation?: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
    });

    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId,
    });
    const databasePath = resolveSqliteMemoryLocation({
      runtimeStateRoot,
      scopeId,
    });
    const remoteTimestampMs = 1_700_000_000_000;
    const localTimestampMs = remoteTimestampMs + 1_200;
    const baseBundle = createRuntimeObservationBundle({
      decision: validation.decision,
      routingDiagnostics: validation.routingDiagnostics,
      retrievalReceipt: validation.retrievalReceipt,
      contextEnvelope: validation.contextEnvelope,
      execution: validation.execution,
      priorSamples: [],
      maintenancePolicy: {
        "redaction.level": "strict",
        "retention.class": "standard",
        "backup.policy": "wal-copy-on-demand",
        "deletion.policy": "explicit-export-delete",
      },
      capturePolicy: {},
      accountState: {
        providerAccountId: validation.execution.target.providerAccountId,
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      },
    });

    const remoteBundle = {
      ...baseBundle,
      requestId: "req-telemetry-analytics-remote-001",
      routingDecisionId: "decision-telemetry-analytics-remote-001",
      endpointId: "openai.personal.primary.us-east-1.fast",
      taxonomyDimensions: {
        taxonomy_group_id: "engineering",
        taxonomy_role_id: "coder",
        taxonomy_task_type: "coder.review",
        taxonomy_task_variant: "security",
        taxonomy_capability_ids: ["code.read", "security.analysis"],
        taxonomy_modality_ids: ["json", "text"],
        taxonomy_tool_class_ids: ["filesystem.read", "shell.execute"],
      },
      routingDiagnostics: {
        ...baseBundle.routingDiagnostics,
        routingMode: {
          source: "alias-default",
          aliasMode: "hybrid",
          effectiveMode: "hybrid",
        },
        difficultyRouting: {
          difficulty: "easy",
          strategy: "cost",
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
        controllerRouting: {
          active: true,
          acceptedDirectives: {
            requestedRoleId: "coder.patch",
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
        rolePolicy: {
          requestedRoleId: "coder.patch",
          appliedRoleId: "coder.patch",
          defaultSystemInstructionsApplied: true,
          toolPolicyMode: "limited",
          allowedTools: ["run_tests"],
          outputContracts: ["review.checklist"],
          safetyPolicyRefs: ["safety.review"],
        },
      },
      usageEvent: {
        ...baseBundle.usageEvent,
        request_id: "req-telemetry-analytics-remote-001",
        routing_decision_id: "decision-telemetry-analytics-remote-001",
        endpoint_id: "openai.personal.primary.us-east-1.fast",
        model_id: "openai/gpt-4.1-mini-fast",
        provider_kind: "remote_openai_compat",
        tokens_in: 120,
        tokens_out: 48,
        latency_ms: 840,
        cost_actual: 0.0042,
        cost_estimate: 0.0042,
        currency: "USD",
        timestamp_ms: remoteTimestampMs,
      },
      observedPerformance: {
        ...baseBundle.observedPerformance,
        sample: {
          ...baseBundle.observedPerformance.sample,
          request_id: "req-telemetry-analytics-remote-001",
          routing_decision_id: "decision-telemetry-analytics-remote-001",
          endpoint_id: "openai.personal.primary.us-east-1.fast",
          timestamp_ms: remoteTimestampMs,
          latency_ms: 840,
          latency_ms_p95: 840,
          source_type: "live_request",
          difficulty_bucket: "easy",
        },
        profile: {
          ...baseBundle.observedPerformance.profile,
          endpoint_id: "openai.personal.primary.us-east-1.fast",
          measured_at_ms: remoteTimestampMs,
        },
      },
      cacheObservability: {
        promptCacheRequested: true,
        promptCacheUsed: true,
        cacheReadTokens: 16,
        cacheWriteTokens: 8,
        routingCacheAffinity: true,
      },
      executionTelemetry: {
        providerFamily: "ai-sdk-openai",
        finishReason: "stop",
        stream: {
          requested: true,
          textDeltas: 4,
          toolCallDeltas: 1,
          toolArgumentDeltas: 2,
        },
        streamSupport: {
          text: "delta",
          toolCalls: "delta",
          toolArguments: "delta",
        },
        promptCaching: {
          supported: true,
          mode: "provider-managed",
        },
        usageSupport: {
          inputTokens: true,
          outputTokens: true,
          cacheReadTokens: true,
          cacheWriteTokens: true,
        },
        costProvenance: "actual",
      },
      tooling: {
        ...baseBundle.tooling,
        toolCalls: [],
        executions: [],
      },
      telemetrySnapshot: {
        providerId: "openai",
        providerAccountId: "openai.personal",
        sourceType: "remote",
        endpointKind: "remote_api",
        servingSource: "remote-service",
        region: "us-east-1",
        lifecycleStateAtRequest: "active",
        healthStatusAtRequest: "healthy",
        requestedModelId: "mixed.local-remote",
        requestOperation: "chat",
        roleIds: ["coder.patch", "general.chat"],
        toolingUsed: false,
        cacheState: "hit",
        eligibleEndpointIds: [
          "openai.personal.primary.us-east-1.fast",
          "llama-swap.local.local-mock-llama",
        ],
        eligibleModelIds: ["openai/gpt-4.1-mini-fast", "local/mock-llama"],
        candidateCostSnapshot: {
          "openai.personal.primary.us-east-1.fast": {
            modelId: "openai/gpt-4.1-mini-fast",
            providerId: "openai",
            sourceType: "remote",
            estimatedRequestUsd: 0.0062,
          },
          "llama-swap.local.local-mock-llama": {
            modelId: "local/mock-llama",
            providerId: "llama-swap",
            sourceType: "local",
            estimatedRequestUsd: 0.0116,
          },
        },
        selectedPricingSnapshot: {
          modelId: "openai/gpt-4.1-mini-fast",
          providerId: "openai",
          sourceType: "remote",
          estimatedRequestUsd: 0.0062,
        },
        selectedUncachedCostUsd: 0.0062,
        baselineMaxEligibleCostUsd: 0.0116,
        routingCostSavingsUsd: 0.0054,
        cacheCostSavingsUsd: 0.002,
        totalAvoidedCostUsd: 0.0074,
        costBaselineSource: "eligible_candidate_max",
        costSavingsSupport: "full",
      },
      inspection: {
        ...baseBundle.inspection,
        request: {
          ...baseBundle.inspection.request,
          requestId: "req-telemetry-analytics-remote-001",
          routingDecisionId: "decision-telemetry-analytics-remote-001",
          responseCapture: {
            ...baseBundle.inspection.request.responseCapture,
            statusCode: 200,
          },
        },
      },
    };

    const localBundle = {
      ...baseBundle,
      requestId: "req-telemetry-analytics-local-001",
      routingDecisionId: "decision-telemetry-analytics-local-001",
      endpointId: "llama-swap.local.local-mock-llama",
      taxonomyDimensions: {
        taxonomy_group_id: "governance_safety",
        taxonomy_role_id: "security",
        taxonomy_task_type: "security.audit",
        taxonomy_task_variant: "deep",
        taxonomy_capability_ids: ["security.analysis"],
        taxonomy_modality_ids: ["text"],
        taxonomy_tool_class_ids: ["filesystem.read"],
      },
      usageEvent: {
        ...baseBundle.usageEvent,
        request_id: "req-telemetry-analytics-local-001",
        routing_decision_id: "decision-telemetry-analytics-local-001",
        endpoint_id: "llama-swap.local.local-mock-llama",
        model_id: "local/mock-llama",
        provider_kind: "local_openai_compat",
        tokens_in: 32,
        tokens_out: 0,
        latency_ms: 1200,
        cost_actual: undefined,
        cost_estimate: 0.0011,
        currency: "USD",
        error_class: "upstream_timeout",
        timestamp_ms: localTimestampMs,
      },
      observedPerformance: {
        ...baseBundle.observedPerformance,
        sample: {
          ...baseBundle.observedPerformance.sample,
          request_id: "req-telemetry-analytics-local-001",
          routing_decision_id: "decision-telemetry-analytics-local-001",
          endpoint_id: "llama-swap.local.local-mock-llama",
          timestamp_ms: localTimestampMs,
          latency_ms: 1200,
          latency_ms_p95: 1200,
          source_type: "live_request",
          failure: true,
          error_class: "upstream_timeout",
        },
        profile: {
          ...baseBundle.observedPerformance.profile,
          endpoint_id: "llama-swap.local.local-mock-llama",
          measured_at_ms: localTimestampMs,
        },
      },
      cacheObservability: {
        promptCacheRequested: false,
        promptCacheUsed: false,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        routingCacheAffinity: false,
      },
      executionTelemetry: {
        providerFamily: "llama-swap",
        finishReason: "error",
        stream: {
          requested: true,
          textDeltas: 2,
          toolCallDeltas: 0,
          toolArgumentDeltas: 0,
        },
        streamSupport: {
          text: "delta",
          toolCalls: "unsupported",
          toolArguments: "unsupported",
        },
        promptCaching: {
          supported: false,
          mode: "unsupported",
        },
        usageSupport: {
          inputTokens: true,
          outputTokens: true,
          cacheReadTokens: false,
          cacheWriteTokens: false,
        },
        costProvenance: "estimated",
      },
      tooling: {
        ...baseBundle.tooling,
        toolCalls: [],
        executions: [],
      },
      telemetrySnapshot: {
        providerId: "llama-swap",
        providerAccountId: null,
        sourceType: "local",
        endpointKind: "local_engine",
        servingSource: "local-process",
        region: "local",
        lifecycleStateAtRequest: "active",
        healthStatusAtRequest: "healthy",
        requestedModelId: "local/mock-llama",
        requestOperation: "chat",
        roleIds: ["general.chat"],
        toolingUsed: false,
        cacheState: "unsupported",
        eligibleEndpointIds: ["llama-swap.local.local-mock-llama"],
        eligibleModelIds: ["local/mock-llama"],
        candidateCostSnapshot: {
          "llama-swap.local.local-mock-llama": {
            modelId: "local/mock-llama",
            providerId: "llama-swap",
            sourceType: "local",
            estimatedRequestUsd: 0.0011,
          },
        },
        selectedPricingSnapshot: {
          modelId: "local/mock-llama",
          providerId: "llama-swap",
          sourceType: "local",
          estimatedRequestUsd: 0.0011,
        },
        selectedUncachedCostUsd: 0.0011,
        baselineMaxEligibleCostUsd: 0.0011,
        routingCostSavingsUsd: 0,
        cacheCostSavingsUsd: 0,
        totalAvoidedCostUsd: 0,
        costBaselineSource: "selected_only",
        costSavingsSupport: "partial",
      },
      inspection: {
        ...baseBundle.inspection,
        request: {
          ...baseBundle.inspection.request,
          requestId: "req-telemetry-analytics-local-001",
          routingDecisionId: "decision-telemetry-analytics-local-001",
          responseCapture: {
            ...baseBundle.inspection.request.responseCapture,
            statusCode: 504,
          },
        },
      },
    };

    persistRuntimeObservationBundle({
      databasePath,
      observation: remoteBundle,
    });
    persistRuntimeObservationBundle({
      databasePath,
      observation: localBundle,
    });
    const legacyTimestampMs = localTimestampMs + 1_200;
    persistRuntimeObservationBundle({
      databasePath,
      observation: {
        ...baseBundle,
        requestId: "req-telemetry-analytics-legacy-001",
        routingDecisionId: "decision-telemetry-analytics-legacy-001",
        endpointId: "openai.personal.primary.us-east-1.legacy",
        usageEvent: {
          ...baseBundle.usageEvent,
          request_id: "req-telemetry-analytics-legacy-001",
          routing_decision_id: "decision-telemetry-analytics-legacy-001",
          endpoint_id: "openai.personal.primary.us-east-1.legacy",
          model_id: "openai/gpt-4.1-mini-fast",
          provider_kind: "remote_openai_compat",
          tokens_in: 80,
          tokens_out: 24,
          latency_ms: 640,
          cost_actual: 0.0031,
          cost_estimate: 0.0031,
          currency: "USD",
          timestamp_ms: legacyTimestampMs,
        },
        observedPerformance: {
          ...baseBundle.observedPerformance,
          sample: {
            ...baseBundle.observedPerformance.sample,
            request_id: "req-telemetry-analytics-legacy-001",
            routing_decision_id: "decision-telemetry-analytics-legacy-001",
            endpoint_id: "openai.personal.primary.us-east-1.legacy",
            timestamp_ms: legacyTimestampMs,
            latency_ms: 640,
            latency_ms_p95: 640,
            source_type: "live_request",
          },
          profile: {
            ...baseBundle.observedPerformance.profile,
            endpoint_id: "openai.personal.primary.us-east-1.legacy",
            measured_at_ms: legacyTimestampMs,
          },
        },
        telemetrySnapshot: {
          ...remoteBundle.telemetrySnapshot,
          requestedModelId: "legacy/openai-generic",
        },
        inspection: {
          ...baseBundle.inspection,
          request: {
            ...baseBundle.inspection.request,
            requestId: "req-telemetry-analytics-legacy-001",
            routingDecisionId: "decision-telemetry-analytics-legacy-001",
            responseCapture: {
              ...baseBundle.inspection.request.responseCapture,
              statusCode: 200,
            },
          },
        },
      },
    });
    persistRuntimeTelemetryFailure({
      databasePath,
      requestId: "req-telemetry-analytics-failure-only-001",
      routingDecisionId: "decision-telemetry-analytics-failure-only-001",
      endpointId: "routing.failed.pre-execution",
      modelId: "routing/failed",
      statusCode: 503,
      errorClass: "no_candidate",
      latencyMs: 12,
      clientRequestId: "client-telemetry-analytics-failure-only-001",
      requestClass: "live_request",
      sourceType: null,
    });

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: remoteTimestampMs - 1_000,
        endAtMs: localTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["requestCount", "effectiveCostUsd", "totalAvoidedCostUsd"],
        breakdown: "sourceType",
        ranking: {
          dimension: "modelId",
          metric: "requestCount",
          limit: 5,
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        breakdown: "sourceType",
        metrics: ["requestCount", "effectiveCostUsd", "totalAvoidedCostUsd"],
        buckets: [
          expect.objectContaining({
            totals: expect.objectContaining({
              requestCount: 2,
              effectiveCostUsd: 0.0053,
              totalAvoidedCostUsd: 0.0074,
            }),
            series: expect.arrayContaining([
              expect.objectContaining({
                key: "local",
                label: "Local",
                metrics: expect.objectContaining({
                  requestCount: 1,
                  effectiveCostUsd: 0.0011,
                  totalAvoidedCostUsd: 0,
                }),
              }),
              expect.objectContaining({
                key: "remote",
                label: "Remote",
                metrics: expect.objectContaining({
                  requestCount: 1,
                  effectiveCostUsd: 0.0042,
                  totalAvoidedCostUsd: 0.0074,
                }),
              }),
            ]),
          }),
        ],
        ranking: expect.objectContaining({
          dimension: "modelId",
          metric: "requestCount",
          rows: expect.arrayContaining([
            expect.objectContaining({
              key: "openai/gpt-4.1-mini-fast",
              value: 1,
            }),
            expect.objectContaining({
              key: "local/mock-llama",
              value: 1,
            }),
          ]),
        }),
      }),
    );

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: remoteTimestampMs - 1_000,
        endAtMs: legacyTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["requestCount"],
        breakdown: "taxonomyTaskType",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        metadata: expect.objectContaining({
          taxonomyCoverage: {
            matchedRowCount: 3,
            richerTaxonomyRowCount: 2,
            legacyRowCount: 1,
            coverageRate: 0.666667,
            backfillPerformed: false,
          },
        }),
        dimensionSupport: expect.objectContaining({
          taxonomyTaskType: expect.objectContaining({
            status: "partial",
            matchedRowCount: 3,
            populatedRowCount: 2,
            sparseRowCount: 1,
            reason:
              "1 row(s) in this slice do not include taxonomyTaskType. Richer taxonomy coverage in this range is 2/3 rows (66.7%); rows without richer taxonomy remain included and richer-taxonomy backfill is not performed.",
          }),
        }),
      }),
    );

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: remoteTimestampMs - 1_000,
        endAtMs: localTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["requestCount", "averageLatencyMs"],
        breakdown: "taxonomyToolClassId",
        filters: {
          taxonomyCapabilityIds: ["security.analysis"],
        },
        ranking: {
          dimension: "taxonomyCapabilityId",
          metric: "requestCount",
          limit: 5,
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        breakdown: "taxonomyToolClassId",
        buckets: [
          expect.objectContaining({
            totals: expect.objectContaining({
              requestCount: 2,
              averageLatencyMs: 1020,
            }),
            series: expect.arrayContaining([
              expect.objectContaining({
                key: "filesystem.read",
                metrics: expect.objectContaining({
                  requestCount: 2,
                  averageLatencyMs: 1020,
                }),
              }),
              expect.objectContaining({
                key: "shell.execute",
                metrics: expect.objectContaining({
                  requestCount: 1,
                  averageLatencyMs: 840,
                }),
              }),
            ]),
          }),
        ],
        ranking: expect.objectContaining({
          dimension: "taxonomyCapabilityId",
          metric: "requestCount",
          rows: expect.arrayContaining([
            expect.objectContaining({
              key: "security.analysis",
              value: 2,
            }),
            expect.objectContaining({
              key: "code.read",
              value: 1,
            }),
          ]),
        }),
        dimensionSupport: expect.objectContaining({
          taxonomyToolClassId: expect.objectContaining({
            dimension: "taxonomyToolClassId",
            status: "supported",
            populatedRowCount: 2,
          }),
          taxonomyCapabilityId: expect.objectContaining({
            dimension: "taxonomyCapabilityId",
            status: "supported",
            populatedRowCount: 2,
          }),
        }),
      }),
    );

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: remoteTimestampMs - 1_000,
        endAtMs: localTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["totalEffectiveCostUsd"],
      }),
    ).rejects.toThrow("unsupported telemetry analytics metric: totalEffectiveCostUsd");

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: remoteTimestampMs - 1_000,
        endAtMs: localTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["requestCount"],
        breakdown: "selectedModelId",
      }),
    ).rejects.toThrow("unsupported telemetry analytics dimension: selectedModelId");

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: remoteTimestampMs - 1_000,
        endAtMs: localTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["requestCount"],
        ranking: {
          dimension: "selectedModelId",
          metric: "requestCount",
          limit: 5,
        },
      }),
    ).rejects.toThrow("unsupported telemetry analytics dimension: selectedModelId");

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: remoteTimestampMs - 1_000,
        endAtMs: localTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["requestCount"],
        ranking: {
          dimension: "modelId",
          metric: "totalEffectiveCostUsd",
          limit: 5,
        },
      }),
    ).rejects.toThrow("unsupported telemetry analytics metric: totalEffectiveCostUsd");

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: remoteTimestampMs - 1_000,
        endAtMs: localTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["requestCount"],
        ranking: {
          dimension: "modelId",
          metric: "requestCount",
          limit: 0,
        },
      }),
    ).rejects.toThrow("ranking.limit must be a positive integer");

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: remoteTimestampMs - 1_000,
        endAtMs: localTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["cacheHitTokenRate"],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        totals: expect.objectContaining({
          cacheHitTokenRate: 0.117647,
        }),
        metricSupport: expect.objectContaining({
          cacheHitTokenRate: expect.objectContaining({
            status: "partial",
            supportedRowCount: 1,
            unsupportedRowCount: 1,
            reason: "1 row(s) in this slice do not support cacheHitTokenRate.",
          }),
        }),
      }),
    );

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: remoteTimestampMs - 1_000,
        endAtMs: localTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["cacheHitTokenRate"],
        filters: {
          sourceTypes: ["remote"],
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        totals: expect.objectContaining({
          cacheHitTokenRate: 0.117647,
        }),
      }),
    );

    await expect(
      backend.readRequestObservation?.("req-telemetry-analytics-remote-001"),
    ).resolves.toEqual(
      expect.objectContaining({
        requestId: "req-telemetry-analytics-remote-001",
        effectiveCostUsd: 0.0042,
        costCalculationBasis: "actual_vendor_cost",
        costCalculationVersion: "run49.v1",
        selectedUncachedCostUsd: 0.0062,
        baselineMaxEligibleCostUsd: 0.0116,
        routingCostSavingsUsd: 0.0054,
        cacheCostSavingsUsd: 0.002,
        totalAvoidedCostUsd: 0.0074,
        costBaselineSource: "eligible_candidate_max",
        costSavingsSupport: "full",
      }),
    );

    await expect(
      backend.readRequestObservation?.("req-telemetry-analytics-failure-only-001"),
    ).resolves.toEqual(
      expect.objectContaining({
        requestId: "req-telemetry-analytics-failure-only-001",
        routingDecisionId: "decision-telemetry-analytics-failure-only-001",
        endpointId: "routing.failed.pre-execution",
        statusFamily: "failure",
        effectiveCostUsd: 0,
        costCalculationBasis: "no_execution_zero",
        costCalculationVersion: "run49.v1",
        selectedUncachedCostUsd: 0,
        baselineMaxEligibleCostUsd: 0,
        routingCostSavingsUsd: 0,
        cacheCostSavingsUsd: 0,
        totalAvoidedCostUsd: 0,
        costBaselineSource: null,
        costSavingsSupport: null,
      }),
    );

    const database = new DatabaseSync(databasePath);
    database
      .prepare("DELETE FROM runtime_observations WHERE request_id = ?")
      .run("req-telemetry-analytics-local-001");
    database.close();

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs: localTimestampMs - 1_000,
        endAtMs: localTimestampMs + 1_000,
        granularity: "hour",
        metrics: ["requestCount"],
        breakdown: "taxonomyTaskType",
        filters: {
          sourceTypes: ["local"],
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        totals: expect.objectContaining({
          requestCount: 1,
        }),
        buckets: [
          expect.objectContaining({
            series: expect.arrayContaining([
              expect.objectContaining({
                key: "security.audit",
                metrics: expect.objectContaining({
                  requestCount: 1,
                }),
              }),
            ]),
          }),
        ],
        dimensionSupport: expect.objectContaining({
          taxonomyTaskType: expect.objectContaining({
            dimension: "taxonomyTaskType",
            status: "supported",
            matchedRowCount: 1,
            populatedRowCount: 1,
          }),
        }),
      }),
    );
  });

  test("aggregates telemetry analytics over the full requested slice with contract metadata and aligned ledger filters", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-telemetry-contract-tests-"),
    );
    const scopeId = "runtime-host-telemetry-contract-tests";
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          queryTelemetryAnalytics?: (body: Record<string, unknown>) => Promise<unknown>;
          listTelemetryRequests?: (
            query?: Record<string, unknown>,
          ) => Promise<readonly Record<string, unknown>[]>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
    });

    const databasePath = resolveSqliteMemoryLocation({
      runtimeStateRoot,
      scopeId,
    });
    const startAtMs = Date.now() - 1_000;
    for (let index = 0; index < 65; index += 1) {
      const sourceType = index % 2 === 0 ? "remote" : "local";
      persistRuntimeTelemetryFailure({
        databasePath,
        requestId: `req-telemetry-contract-${String(index).padStart(3, "0")}`,
        routingDecisionId: `decision-telemetry-contract-${String(index).padStart(3, "0")}`,
        endpointId: `${sourceType}.contract.${index}`,
        modelId: `${sourceType}/contract-model`,
        statusCode: 503,
        errorClass: "contract_probe",
        latencyMs: 10 + index,
        requestClass: "live_request",
        sourceType,
      });
    }
    const endAtMs = Date.now() + 1_000;

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs,
        endAtMs,
        granularity: "hour",
        metrics: ["requestCount"],
        breakdown: "sourceType",
        filters: {
          sourceTypes: ["remote"],
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        appliedQuery: expect.objectContaining({
          startAtMs,
          endAtMs,
          filters: {
            sourceTypes: ["remote"],
          },
        }),
        metadata: expect.objectContaining({
          scannedRowCount: 65,
          matchedRowCount: 33,
          aggregationRowCount: 33,
          truncated: false,
          truncationReason: null,
        }),
        metricSupport: expect.objectContaining({
          requestCount: expect.objectContaining({
            metric: "requestCount",
            status: "supported",
            matchedRowCount: 33,
            supportedRowCount: 33,
          }),
        }),
        dimensionSupport: expect.objectContaining({
          sourceType: expect.objectContaining({
            dimension: "sourceType",
            status: "supported",
            matchedRowCount: 33,
            populatedRowCount: 33,
          }),
        }),
        totals: expect.objectContaining({
          requestCount: 33,
        }),
      }),
    );

    await expect(
      backend.queryTelemetryAnalytics?.({
        startAtMs,
        endAtMs,
        granularity: "hour",
        metrics: ["requestCount"],
        ranking: {
          dimension: "endpointId",
          metric: "requestCount",
          limit: 5,
        },
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        ranking: expect.objectContaining({
          rows: expect.any(Array),
        }),
        metadata: expect.objectContaining({
          truncated: true,
          truncationReason:
            "Ranking limited to top 5 endpointId value(s) out of 65 matched value(s).",
        }),
      }),
    );

    await expect(
      backend.listTelemetryRequests?.({
        startAtMs,
        endAtMs,
        limit: 200,
        filters: {
          sourceTypes: ["remote"],
        },
      }),
    ).resolves.toSatisfy((requests: readonly Record<string, unknown>[]) => {
      return requests.length === 33 && requests.every((request) => request.sourceType === "remote");
    });
  });

  test("startup retention cleanup removes expired raw observations while preserving telemetry ledger evidence", async () => {
    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-retention-cleanup-"),
    );
    const scopeId = "runtime-host-retention-cleanup";
    const initialized = initializeSqliteMemory({
      runtimeStateRoot,
      scopeId,
    });
    const databasePath = resolveSqliteMemoryLocation({
      runtimeStateRoot,
      scopeId,
    });
    const validation = await runRuntimeAdapterValidation({
      repoRoot,
      fixtureRoot: path.join(repoRoot, "testdata", "router-runtime", "fixtures"),
      runtimeStateRoot,
      scopeId,
    });
    const bundle = createRuntimeObservationBundle({
      decision: validation.decision,
      routingDiagnostics: validation.routingDiagnostics,
      retrievalReceipt: validation.retrievalReceipt,
      contextEnvelope: validation.contextEnvelope,
      execution: validation.execution,
      priorSamples: [],
      maintenancePolicy: {
        "redaction.level": "strict",
        "retention.class": "standard",
      },
      capturePolicy: {},
      accountState: {
        providerAccountId: validation.execution.target.providerAccountId,
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      },
      telemetryConfig: {
        samplingRate: 1,
        retentionTtlHours: 1,
      },
    });

    persistRuntimeObservationBundle({
      databasePath,
      observation: {
        ...bundle,
        requestId: "req-retention-expired-001",
        routingDecisionId: "decision-retention-expired-001",
        privacyReceipt: {
          ...bundle.privacyReceipt,
          retainUntil: Date.now() - 60_000,
        },
      },
    });

    const beforeCleanupDatabase = new DatabaseSync(initialized.databasePath);
    try {
      const beforeCleanupCount = beforeCleanupDatabase
        .prepare("SELECT COUNT(*) AS count FROM runtime_observations")
        .get() as { count: number };
      expect(beforeCleanupCount.count).toBe(1);
    } finally {
      beforeCleanupDatabase.close();
    }

    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          listTelemetryRequests?: () => Promise<readonly { requestId: string }[]>;
          readRequestObservation?: (requestId: string) => Promise<Record<string, unknown> | null>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId,
    });

    const database = new DatabaseSync(initialized.databasePath);
    try {
      const afterCleanupCount = database
        .prepare("SELECT COUNT(*) AS count FROM runtime_observations")
        .get() as { count: number };
      expect(afterCleanupCount.count).toBe(0);
    } finally {
      database.close();
    }

    await expect(backend.listTelemetryRequests?.()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ requestId: "req-retention-expired-001" })]),
    );
    await expect(backend.readRequestObservation?.("req-retention-expired-001")).resolves.toEqual(
      expect.objectContaining({
        requestId: "req-retention-expired-001",
        capturePolicy: expect.objectContaining({
          environment: "telemetry-ledger-fallback",
          rawCaptureAvailable: false,
          structuredInspectionAvailable: false,
        }),
        privacyReceipt: expect.objectContaining({
          samplingRate: 1,
          retentionTtlHours: 1,
        }),
        observationAvailability: expect.objectContaining({
          source: "telemetry-ledger-fallback",
          rawObservationAvailable: false,
        }),
      }),
    );
  });

  test("keeps duplicate caller request ids as separate canonical telemetry rows", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-correlation-tests-"),
    );
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              clientRequestId?: string;
            },
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          listTelemetryRequests: () => Promise<
            readonly {
              requestId: string;
              clientRequestId?: string | null;
            }[]
          >;
          readRequestObservation: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-correlation-tests",
    });

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              clientRequestId?: string;
            },
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          listTelemetryRequests?: () => Promise<unknown>;
          readRequestObservation?: (requestId: string) => Promise<unknown>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
      listTelemetryRequests: backend.listTelemetryRequests,
      readRequestObservation: backend.readRequestObservation,
    });

    try {
      for (let index = 0; index < 2; index += 1) {
        const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-request-id": "req-shared-correlation-001",
          },
          body: JSON.stringify({
            model: "deepseek/chat-capture-v1",
            messages: [{ role: "user", content: `repeat-${index}` }],
          }),
        });
        expect(response.status).toBe(200);
      }

      const telemetryRequestsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/requests`,
      );
      expect(telemetryRequestsResponse.status).toBe(200);
      const requestRows = (await telemetryRequestsResponse.json()) as Array<{
        requestId: string;
        clientRequestId?: string | null;
      }>;
      const correlatedRows = requestRows.filter(
        (entry) => entry.clientRequestId === "req-shared-correlation-001",
      );
      expect(correlatedRows).toHaveLength(2);
      expect(new Set(correlatedRows.map((entry) => entry.requestId)).size).toBe(2);

      for (const row of correlatedRows) {
        const detailResponse = await fetch(
          `http://127.0.0.1:${server.port}/api/role-model/requests/${row.requestId}`,
        );
        expect(detailResponse.status).toBe(200);
        await expect(detailResponse.json()).resolves.toEqual(
          expect.objectContaining({
            requestId: row.requestId,
            clientRequestId: "req-shared-correlation-001",
          }),
        );
      }
    } finally {
      await server.close();
    }
  });

  test("records caller correlation and live request classification for failed chat completions", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-failed-telemetry-"),
    );
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          fixtureRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
        }) => Promise<{
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              clientRequestId?: string;
            },
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          listTelemetryRequests?: () => Promise<unknown>;
          readRequestObservation?: (requestId: string) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-host-failed-telemetry-tests",
    });

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: unknown,
            requestOptions?: {
              clientRequestId?: string;
            },
          ) => Promise<unknown>;
          executeResponses: (body: Record<string, unknown>, requestId: string) => Promise<unknown>;
          listTelemetryRequests?: () => Promise<unknown>;
          readRequestObservation?: (requestId: string) => Promise<unknown>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry: backend.registry,
      executeChatCompletions: backend.executeChatCompletions,
      executeResponses: backend.executeResponses,
      listTelemetryRequests: backend.listTelemetryRequests,
      readRequestObservation: backend.readRequestObservation,
    });

    try {
      const clientRequestId = "req-client-failure-001";
      const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": clientRequestId,
        },
        body: JSON.stringify({
          model: "nonexistent/model-for-failure",
          messages: [{ role: "user", content: "Force a telemetry failure row." }],
        }),
      });
      expect(response.status).toBe(400);

      const capabilityClientRequestId = "req-client-capability-failure-001";
      const capabilityResponse = await fetch(
        `http://127.0.0.1:${server.port}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-request-id": capabilityClientRequestId,
          },
          body: JSON.stringify({
            model: "deepseek/chat-capture-v1",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "Describe this image." },
                  { type: "image_url", image_url: { url: "data:image/png;base64,abc" } },
                ],
              },
            ],
          }),
        },
      );
      expect(capabilityResponse.status).toBe(400);
      await expect(capabilityResponse.json()).resolves.toEqual(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "no_eligible_target",
            requestedModel: "deepseek/chat-capture-v1",
          }),
        }),
      );

      const telemetryRequestsResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/requests`,
      );
      expect(telemetryRequestsResponse.status).toBe(200);
      const telemetryRows = (await telemetryRequestsResponse.json()) as Array<{
        clientRequestId?: string | null;
        dimensions?: Record<string, unknown> | null;
        errorClass?: string | null;
        modelId?: string | null;
        requestClass?: string | null;
        requestId?: string;
        requestedModelId?: string | null;
        requestOperation?: string | null;
      }>;
      expect(telemetryRows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            clientRequestId,
            requestClass: "live_request",
          }),
          expect.objectContaining({
            clientRequestId: capabilityClientRequestId,
            errorClass: "no_eligible_target",
            modelId: "deepseek/chat-capture-v1",
            requestClass: "live_request",
            requestedModelId: "deepseek/chat-capture-v1",
            requestOperation: "chat",
            dimensions: expect.objectContaining({
              capabilityEligibility: expect.objectContaining({
                requestedModel: "deepseek/chat-capture-v1",
                requiredInputModalities: ["image", "text"],
                requiredOutputModalities: ["text"],
                requiredCapabilities: ["text.chat"],
                excludedTargets: expect.arrayContaining([
                  expect.objectContaining({
                    modelId: "deepseek/chat-capture-v1",
                    reasons: ["missing_input.image"],
                  }),
                ]),
              }),
            }),
          }),
        ]),
      );

      const genericFailureRow = telemetryRows.find(
        (row) => row.clientRequestId === clientRequestId,
      );
      expect(genericFailureRow?.requestId).toBeDefined();
      expect(genericFailureRow?.dimensions).toEqual(
        expect.objectContaining({
          errorContext: expect.objectContaining({
            message: expect.stringContaining("no targets for model nonexistent/model-for-failure"),
          }),
        }),
      );

      const genericFailureObservationResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/requests/${genericFailureRow?.requestId}`,
      );
      expect(genericFailureObservationResponse.status).toBe(200);
      await expect(genericFailureObservationResponse.json()).resolves.toEqual(
        expect.objectContaining({
          requestId: genericFailureRow?.requestId,
          clientRequestId,
          observationAvailability: expect.objectContaining({
            source: "raw-observation",
            rawObservationAvailable: true,
          }),
          diagnostics: expect.objectContaining({
            execution: expect.arrayContaining([
              expect.objectContaining({
                code: "no_eligible_target",
                message: expect.stringContaining(
                  "no targets for model nonexistent/model-for-failure",
                ),
              }),
            ]),
          }),
          inspection: expect.objectContaining({
            request: expect.objectContaining({
              responseCapture: expect.objectContaining({
                statusCode: 400,
                body: expect.objectContaining({
                  message: expect.stringContaining(
                    "no targets for model nonexistent/model-for-failure",
                  ),
                }),
              }),
            }),
          }),
        }),
      );

      const capabilityRow = telemetryRows.find(
        (row) => row.clientRequestId === capabilityClientRequestId,
      );
      expect(capabilityRow?.requestId).toBeDefined();
      const capabilityObservationResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/requests/${capabilityRow?.requestId}`,
      );
      expect(capabilityObservationResponse.status).toBe(200);
      await expect(capabilityObservationResponse.json()).resolves.toEqual(
        expect.objectContaining({
          telemetrySnapshot: expect.objectContaining({
            requestedModelId: "deepseek/chat-capture-v1",
            requestOperation: "chat",
            dimensions: expect.objectContaining({
              capabilityEligibility: expect.objectContaining({
                requestedModel: "deepseek/chat-capture-v1",
                requiredInputModalities: ["image", "text"],
                requiredOutputModalities: ["text"],
                requiredCapabilities: ["text.chat"],
                excludedTargets: expect.arrayContaining([
                  expect.objectContaining({
                    modelId: "deepseek/chat-capture-v1",
                    reasons: ["missing_input.image"],
                  }),
                ]),
              }),
            }),
          }),
          usageEvent: expect.objectContaining({
            error_class: "no_eligible_target",
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

    const runtimeStateRoot = await mkdtemp(
      path.join(os.tmpdir(), "role-model-runtime-host-difficulty-"),
    );
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
      fixtureRoot: testFixtureRoot,
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
      fixtureRoot: testFixtureRoot,
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
      const streamResponse = await fetch(
        `http://127.0.0.1:${server.port}/api/role-model/telemetry/stream`,
        {
          signal: abortController.signal,
        },
      );
      expect(streamResponse.status).toBe(200);
      expect(streamResponse.headers.get("content-type")).toContain("text/event-stream");

      const reader = streamResponse.body?.getReader();
      expect(reader).toBeDefined();
      if (!reader) {
        throw new Error("Expected telemetry stream body reader to be available.");
      }
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
      while (!transcript.includes('"clientRequestId":"req-runtime-bridge-sse-001"')) {
        const chunk = await reader.read();
        transcript += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
        if (chunk.done) {
          break;
        }
      }

      expect(transcript).toContain("event: telemetry.update");
      expect(transcript).toContain('"clientRequestId":"req-runtime-bridge-sse-001"');
      expect(transcript).toMatch(/"requestId":"req-[^"]+"/);
      expect(transcript).toContain('"sourceType":"remote"');
    } finally {
      abortController.abort();
      await delay(10);
      await server.close();
    }
  }, 15_000);

  test("aborts streamed chat execution when the downstream client disconnects", async () => {
    expect(typeof (bridge as { startBridgeServer?: unknown }).startBridgeServer).toBe("function");

    let resolveAbortObserved: (aborted: boolean) => void = () => {};
    const abortObserved = new Promise<boolean>((resolve) => {
      resolveAbortObserved = resolve;
    });

    const server = await (
      bridge as {
        startBridgeServer: (options: {
          host: string;
          port: number;
          registry: EndpointRegistryResult;
          executeChatCompletions: (
            body: Record<string, unknown>,
            requestId: string,
            streamWriter?: (
              chunk: Record<string, unknown>,
              metadata?: Record<string, unknown>,
            ) => void | Promise<void>,
            requestOptions?: { abortSignal?: AbortSignal },
          ) => Promise<{
            model: string;
            endpointId: string;
            adapterFamily: string;
            outputText: string;
            finishReason: string;
            usage: { inputTokens: number; outputTokens: number };
          }>;
          executeResponses: () => Promise<unknown>;
        }) => Promise<{ port: number; close(): Promise<void> }>;
      }
    ).startBridgeServer({
      host: "127.0.0.1",
      port: 0,
      registry,
      executeChatCompletions: async (_body, _requestId, streamWriter, requestOptions) => {
        if (!requestOptions?.abortSignal) {
          resolveAbortObserved(false);
        } else {
          requestOptions.abortSignal.addEventListener(
            "abort",
            () => {
              resolveAbortObserved(true);
            },
            { once: true },
          );
        }
        await streamWriter?.(
          {
            id: "chatcmpl-abort-test",
            object: "chat.completion.chunk",
            choices: [{ index: 0, delta: { content: "partial" }, finish_reason: null }],
          },
          {
            endpointId: "moonshot.personal.primary.global.kimi-k2.5",
            adapterFamily: "test-adapter",
            routingDecisionId: "decision-abort-test",
          },
        );
        await delay(1_000);
        return {
          model: "moonshot/kimi-k2.5",
          endpointId: "moonshot.personal.primary.global.kimi-k2.5",
          adapterFamily: "test-adapter",
          outputText: "partial",
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1 },
        };
      },
      executeResponses: async () => ({}),
    });

    const abortController = new AbortController();

    try {
      const streamResponse = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          model: "baseline.remote-only",
          stream: true,
          messages: [{ role: "user", content: "open a stream" }],
        }),
      });
      expect(streamResponse.status).toBe(200);
      const reader = streamResponse.body?.getReader();
      expect(reader).toBeDefined();
      await reader?.read();

      abortController.abort();

      await expect(Promise.race([abortObserved, delay(500).then(() => false)])).resolves.toBe(true);
    } finally {
      abortController.abort();
      await server.close();
    }
  }, 5_000);

  test("executes chat-completions through a LiteLLM-derived moonshot-oauth endpoint with X-Msh headers", async () => {
    // This test exercises the PRODUCTION path where provider-presets.json is empty
    // and OAuth config comes entirely from KNOWN_PROVIDER_OVERRIDES in litellm-catalog.ts.
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const capturedRequestHeaders: Record<string, string>[] = [];
    const streamedChunks: Record<string, unknown>[] = [];
    const runtimeStateRoot = await mkdtemp(path.join(os.tmpdir(), "role-model-litellm-oauth-"));
    const backend = await (
      bridge as {
        createRuntimeBridgeBackend: (options: {
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          networkFetcher?: typeof fetch;
        }) => Promise<{
          registry: EndpointRegistryResult;
          listProviders?: () => Promise<unknown>;
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
            usage: { inputTokens: number; outputTokens: number };
          }>;
          startProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
          pollProviderDeviceAuthorization?: (body: Record<string, unknown>) => Promise<unknown>;
          activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
        }>;
      }
    ).createRuntimeBridgeBackend({
      repoRoot,
      fixtureRoot: testFixtureRoot,
      runtimeStateRoot,
      scopeId: "runtime-litellm-oauth-tests",
      networkFetcher: async (input, init) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url === "https://auth.kimi.com/api/oauth/device_authorization") {
          return new Response(
            JSON.stringify({
              user_code: "LITELLM-TEST",
              device_code: "device-litellm-001",
              verification_uri: "https://www.kimi.com/code/authorize_device",
              verification_uri_complete:
                "https://www.kimi.com/code/authorize_device?user_code=LITELLM-TEST",
              expires_in: 900,
              interval: 5,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url === "https://auth.kimi.com/api/oauth/token") {
          return new Response(
            JSON.stringify({
              access_token: "litellm-access-token-001",
              refresh_token: "litellm-refresh-001",
              expires_in: 3600,
              token_type: "Bearer",
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (url === "https://api.kimi.com/coding/v1/chat/completions") {
          capturedRequestHeaders.push({ ...(init?.headers as Record<string, string>) });
          const encoder = new TextEncoder();
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(
                  encoder.encode(
                    'data: {"id":"chatcmpl-litellm","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"role":"assistant","content":"moonshot "},"finish_reason":null}]}\n\n',
                  ),
                );
                controller.enqueue(
                  encoder.encode(
                    'data: {"id":"chatcmpl-litellm","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"content":"oauth works"},"finish_reason":null}]}\n\n',
                  ),
                );
                controller.enqueue(
                  encoder.encode(
                    'data: {"id":"chatcmpl-litellm","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":3}}\n\n',
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
    try {
      // Verify the Kimi Code OAuth variant is exposed via LiteLLM (no preset required)
      const providers = (await backend.listProviders?.()) as Array<{
        providerId: string;
        variants: Array<{ variantId: string; authMode: string; oauth?: { clientId: string } }>;
      }>;
      const moonshotProvider = providers.find((p) => p.providerId === "moonshot");
      expect(moonshotProvider).toBeDefined();
      const oauthVariant = moonshotProvider?.variants.find((v) => v.variantId === "kimi-code");
      expect(oauthVariant).toBeDefined();
      expect(oauthVariant?.authMode).toBe("oauth2-device-code");
      expect(oauthVariant?.oauth?.clientId).toBe("17e5f671-d194-4dfb-9706-5516cb48c098");

      // Full OAuth device-code flow using the LiteLLM-derived variant
      const pending = await backend.startProviderDeviceAuthorization?.({
        providerAccountId: "moonshot.personal.kimi-code",
        providerId: "moonshot",
        variantId: "kimi-code",
        orgScope: "personal",
        accountScope: "workspace-default",
        allowedModels: ["moonshot/kimi-k2.5"],
        deniedModels: [],
        entitlementTags: ["chat"],
      });
      expect(pending).toEqual(
        expect.objectContaining({
          status: "pending",
          userCode: "LITELLM-TEST",
        }),
      );

      const connected = await backend.pollProviderDeviceAuthorization?.({
        authRequestId: (pending as { authRequestId: string }).authRequestId,
      });
      expect(connected).toEqual(expect.objectContaining({ status: "connected" }));

      await backend.activateEndpoint?.({
        providerAccountId: "moonshot.personal.kimi-code",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });

      // Execute chat — must reach the Kimi Code base URL with Bearer token + X-Msh-* headers
      const result = await backend.executeChatCompletions(
        {
          model: "moonshot/kimi-k2.5",
          stream: true,
          messages: [{ role: "user", content: "Test LiteLLM OAuth." }],
        },
        "req-litellm-oauth-001",
        async (chunk) => {
          streamedChunks.push(chunk);
        },
      );

      expect(result.outputText).toBe("moonshot oauth works");
      expect(result.endpointId).toBe("moonshot.personal.kimi-code.global.kimi-k2.5");

      // Verify the outgoing request to Moonshot carried the OAuth Bearer token
      expect(capturedRequestHeaders.length).toBeGreaterThan(0);
      expect(capturedRequestHeaders[0]).toEqual(
        expect.objectContaining({
          authorization: "Bearer litellm-access-token-001",
        }),
      );
      // Verify Kimi-specific headers are present (from LiteLLM OAuth requiredHeaders)
      expect(capturedRequestHeaders[0]).toEqual(
        expect.objectContaining({
          "X-Msh-Platform": "kimi_cli",
          "X-Msh-Version": expect.any(String),
          "X-Msh-Device-Name": expect.any(String),
          "X-Msh-Device-Id": expect.any(String),
        }),
      );
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("executes chat-completions through an api-key-static provider via environment credential", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    // Write the API key as a local-file credential so the live execution path is triggered.
    // The credential file mimics an OAuth token file but holds the API key as access_token.
    const runtimeStateRoot = path.join(os.tmpdir(), "role-model-apikey-tests");
    const scopeId = "runtime-apikey-tests";
    const credentialDir = path.join(runtimeStateRoot, scopeId, "credentials", "oauth", "moonshot");
    const credentialFile = path.join(credentialDir, "moonshot.personal.apikey.json");
    await rm(runtimeStateRoot, { recursive: true, force: true });
    await mkdir(credentialDir, { recursive: true });
    await writeFile(
      credentialFile,
      JSON.stringify({ access_token: "sk-test-moonshot-api-key-001" }),
      "utf8",
    );

    const capturedAuthHeaders: string[] = [];
    try {
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
              streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
            ) => Promise<{
              model: string;
              endpointId: string;
              outputText: string;
              finishReason: string;
              usage: { inputTokens: number; outputTokens: number };
            }>;
            upsertProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input, init) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url === "https://api.moonshot.ai/v1/chat/completions") {
            const authHeader = (init?.headers as Record<string, string>)?.authorization ?? "";
            capturedAuthHeaders.push(authHeader);
            const encoder = new TextEncoder();
            return new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(
                    encoder.encode(
                      'data: {"id":"chatcmpl-apikey","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"role":"assistant","content":"api-key "},"finish_reason":null}]}\n\n',
                    ),
                  );
                  controller.enqueue(
                    encoder.encode(
                      'data: {"id":"chatcmpl-apikey","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"content":"auth works"},"finish_reason":null}]}\n\n',
                    ),
                  );
                  controller.enqueue(
                    encoder.encode(
                      'data: {"id":"chatcmpl-apikey","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":8,"completion_tokens":4}}\n\n',
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

      // Upsert API-key account using local-file credential (triggers live execution path)
      await backend.upsertProviderAccount?.({
        providerAccountId: "moonshot.personal.apikey",
        providerId: "moonshot",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: {
          backend: "local-file",
          ref: "oauth/moonshot/moonshot.personal.apikey",
        },
        authMode: "api-key-static",
        regionPolicy: { mode: "prefer", regions: ["global"] },
        baseUrlOverride: "https://api.moonshot.ai/v1",
        allowedModels: ["moonshot/kimi-k2.5"],
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.5",
            roleAssignmentMode: "all",
            roleIds: [],
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });

      await backend.activateEndpoint?.({
        providerAccountId: "moonshot.personal.apikey",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });

      const result = await backend.executeChatCompletions(
        {
          model: "moonshot/kimi-k2.5",
          stream: true,
          messages: [{ role: "user", content: "Test API key auth." }],
        },
        "req-apikey-001",
      );

      expect(result.outputText).toBe("api-key auth works");
      expect(result.endpointId).toMatch(/moonshot\.personal\.apikey/);
      expect(capturedAuthHeaders.length).toBeGreaterThan(0);
      // resolveCredentialValue reads access_token from the local-file; applyCredentialToHeaders prefixes Bearer
      expect(capturedAuthHeaders[0]).toBe("Bearer sk-test-moonshot-api-key-001");
    } finally {
      await rm(credentialFile, { force: true });
    }
  });

  test("propagates downstream stream-writer failures during direct provider streaming", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(os.tmpdir(), "role-model-stream-disconnect-tests");
    const scopeId = "runtime-stream-disconnect-tests";
    const credentialDir = path.join(runtimeStateRoot, scopeId, "credentials", "oauth", "deepseek");
    const credentialFile = path.join(credentialDir, "deepseek.personal.apikey.json");
    await rm(runtimeStateRoot, { recursive: true, force: true });
    await mkdir(credentialDir, { recursive: true });
    await writeFile(
      credentialFile,
      JSON.stringify({ access_token: "sk-test-deepseek-api-key-001" }),
      "utf8",
    );

    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher?: typeof fetch;
          }) => Promise<{
            executeChatCompletions: (
              body: Record<string, unknown>,
              requestId: string,
              streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
            ) => Promise<{
              model: string;
              endpointId: string;
              outputText: string;
              finishReason: string;
            }>;
            upsertProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url === "https://api.deepseek.com/chat/completions") {
            const encoder = new TextEncoder();
            return new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(
                    encoder.encode(
                      'data: {"id":"chatcmpl-disconnect","object":"chat.completion.chunk","created":1,"model":"deepseek/deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"partial"},"finish_reason":null}]}\n\n',
                    ),
                  );
                  controller.enqueue(
                    encoder.encode(
                      'data: {"id":"chatcmpl-disconnect","object":"chat.completion.chunk","created":1,"model":"deepseek/deepseek-v4-flash","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":8,"completion_tokens":4}}\n\n',
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

      await backend.upsertProviderAccount?.({
        providerAccountId: "deepseek.personal.apikey",
        providerId: "deepseek",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: {
          backend: "local-file",
          ref: "oauth/deepseek/deepseek.personal.apikey",
        },
        authMode: "api-key-static",
        regionPolicy: { mode: "prefer", regions: ["global"] },
        baseUrlOverride: "https://api.deepseek.com",
        allowedModels: ["deepseek/deepseek-v4-flash"],
        modelRoleBindings: [
          {
            modelId: "deepseek/deepseek-v4-flash",
            roleAssignmentMode: "all",
            roleIds: [],
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });

      await backend.activateEndpoint?.({
        providerAccountId: "deepseek.personal.apikey",
        modelId: "deepseek/deepseek-v4-flash",
        region: "global",
      });

      await expect(
        backend.executeChatCompletions(
          {
            model: "deepseek/deepseek-v4-flash",
            stream: true,
            messages: [{ role: "user", content: "Open a stream." }],
          },
          "req-stream-disconnect-001",
          async () => {
            throw new Error("downstream stream writer disconnected");
          },
        ),
      ).rejects.toThrow(/downstream stream writer disconnected/);
    } finally {
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  });

  test("forwards reasoning-only upstream SSE chunks when chat-completions opted into reasoning", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(os.tmpdir(), "role-model-stream-normalization-tests");
    const scopeId = "runtime-stream-normalization-tests";
    const credentialDir = path.join(runtimeStateRoot, scopeId, "credentials", "oauth", "deepseek");
    const credentialFile = path.join(credentialDir, "deepseek.personal.apikey.json");
    await rm(runtimeStateRoot, { recursive: true, force: true });
    await mkdir(credentialDir, { recursive: true });
    await writeFile(
      credentialFile,
      JSON.stringify({ access_token: "sk-test-deepseek-api-key-001" }),
      "utf8",
    );

    const streamedChunks: Array<Record<string, unknown>> = [];
    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher?: typeof fetch;
          }) => Promise<{
            executeChatCompletions: (
              body: Record<string, unknown>,
              requestId: string,
              streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
            ) => Promise<{
              model: string;
              endpointId: string;
              outputText: string;
              finishReason: string;
            }>;
            upsertProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url === "https://api.deepseek.com/chat/completions") {
            const encoder = new TextEncoder();
            return new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(
                    encoder.encode(
                      'data: {"id":"chatcmpl-deepseek-stream","object":"chat.completion.chunk","created":1,"model":"deepseek/deepseek-v4-flash","choices":[{"index":0,"delta":{"reasoning_content":"Thinking..."}}]}\n\n',
                    ),
                  );
                  controller.enqueue(
                    encoder.encode(
                      'data: {"id":"chatcmpl-deepseek-stream","object":"chat.completion.chunk","created":1,"model":"deepseek/deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"Ready"}}]}\n\n',
                    ),
                  );
                  controller.enqueue(
                    encoder.encode(
                      'data: {"id":"chatcmpl-deepseek-stream","object":"chat.completion.chunk","created":1,"model":"deepseek/deepseek-v4-flash","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":8,"completion_tokens":4}}\n\n',
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

      await backend.upsertProviderAccount?.({
        providerAccountId: "deepseek.personal.apikey",
        providerId: "deepseek",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: {
          backend: "local-file",
          ref: "oauth/deepseek/deepseek.personal.apikey",
        },
        authMode: "api-key-static",
        regionPolicy: { mode: "prefer", regions: ["global"] },
        baseUrlOverride: "https://api.deepseek.com",
        allowedModels: ["deepseek/deepseek-v4-flash"],
        modelRoleBindings: [
          {
            modelId: "deepseek/deepseek-v4-flash",
            roleAssignmentMode: "all",
            roleIds: [],
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });

      await backend.activateEndpoint?.({
        providerAccountId: "deepseek.personal.apikey",
        modelId: "deepseek/deepseek-v4-flash",
        region: "global",
      });

      const result = await backend.executeChatCompletions(
        {
          model: "deepseek/deepseek-v4-flash",
          stream: true,
          reasoning_effort: "high",
          messages: [{ role: "user", content: "Say Ready." }],
        },
        "req-stream-normalization-001",
        async (chunk) => {
          streamedChunks.push(chunk);
        },
      );

      expect(result.outputText).toBe("Ready");
      expect(streamedChunks.length).toBeGreaterThan(0);
      expect(streamedChunks[0]).toMatchObject({
        choices: [
          expect.objectContaining({
            delta: expect.objectContaining({ reasoning_content: "Thinking..." }),
          }),
        ],
      });
      expect(JSON.stringify(streamedChunks[0])).not.toContain('"content"');
      expect(streamedChunks[1]).toMatchObject({
        choices: [
          expect.objectContaining({ delta: expect.objectContaining({ content: "Ready" }) }),
        ],
      });
    } finally {
      await rm(credentialFile, { force: true });
    }
  });

  test("suppresses reasoning-only upstream SSE chunks until downstream-safe content is available when reasoning is not requested", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(
      os.tmpdir(),
      "role-model-stream-normalization-no-reasoning-tests",
    );
    const scopeId = "runtime-stream-normalization-no-reasoning-tests";
    const credentialDir = path.join(runtimeStateRoot, scopeId, "credentials", "oauth", "deepseek");
    const credentialFile = path.join(credentialDir, "deepseek.personal.apikey.json");
    await rm(runtimeStateRoot, { recursive: true, force: true });
    await mkdir(credentialDir, { recursive: true });
    await writeFile(
      credentialFile,
      JSON.stringify({ access_token: "sk-test-deepseek-api-key-002" }),
      "utf8",
    );

    const streamedChunks: Array<Record<string, unknown>> = [];
    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher?: typeof fetch;
          }) => Promise<{
            executeChatCompletions: (
              body: Record<string, unknown>,
              requestId: string,
              streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
            ) => Promise<{
              model: string;
              endpointId: string;
              outputText: string;
              finishReason: string;
            }>;
            upsertProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url === "https://api.deepseek.com/chat/completions") {
            const encoder = new TextEncoder();
            return new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(
                    encoder.encode(
                      'data: {"id":"chatcmpl-deepseek-stream","object":"chat.completion.chunk","created":1,"model":"deepseek/deepseek-v4-flash","choices":[{"index":0,"delta":{"reasoning_content":"Thinking..."}}]}\n\n',
                    ),
                  );
                  controller.enqueue(
                    encoder.encode(
                      'data: {"id":"chatcmpl-deepseek-stream","object":"chat.completion.chunk","created":1,"model":"deepseek/deepseek-v4-flash","choices":[{"index":0,"delta":{"content":"Ready"}}]}\n\n',
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

      await backend.upsertProviderAccount?.({
        providerAccountId: "deepseek.personal.apikey",
        providerId: "deepseek",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: {
          backend: "local-file",
          ref: "oauth/deepseek/deepseek.personal.apikey",
        },
        authMode: "api-key-static",
        regionPolicy: { mode: "prefer", regions: ["global"] },
        baseUrlOverride: "https://api.deepseek.com",
        allowedModels: ["deepseek/deepseek-v4-flash"],
        modelRoleBindings: [
          {
            modelId: "deepseek/deepseek-v4-flash",
            roleAssignmentMode: "all",
            roleIds: [],
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });

      await backend.activateEndpoint?.({
        providerAccountId: "deepseek.personal.apikey",
        modelId: "deepseek/deepseek-v4-flash",
        region: "global",
      });

      const result = await backend.executeChatCompletions(
        {
          model: "deepseek/deepseek-v4-flash",
          stream: true,
          messages: [{ role: "user", content: "Say Ready." }],
        },
        "req-stream-normalization-no-reasoning-001",
        async (chunk) => {
          streamedChunks.push(chunk);
        },
      );

      expect(result.outputText).toBe("Ready");
      expect(streamedChunks.length).toBeGreaterThan(0);
      expect(streamedChunks[0]).toMatchObject({
        choices: [
          expect.objectContaining({ delta: expect.objectContaining({ content: "Ready" }) }),
        ],
      });
    } finally {
      await rm(credentialFile, { force: true });
    }
  });

  test("accepts legacy credentialized endpoint ids when pinning a requested endpoint", async () => {
    expect(
      typeof (bridge as { createRuntimeBridgeBackend?: unknown }).createRuntimeBridgeBackend,
    ).toBe("function");

    const runtimeStateRoot = path.join(os.tmpdir(), "role-model-legacy-endpoint-id-tests");
    const scopeId = "runtime-legacy-endpoint-id-tests";
    const credentialDir = path.join(runtimeStateRoot, scopeId, "credentials", "oauth", "moonshot");
    const credentialFile = path.join(credentialDir, "moonshot.personal.api-key.json");
    await rm(runtimeStateRoot, { recursive: true, force: true });
    await mkdir(credentialDir, { recursive: true });
    await writeFile(
      credentialFile,
      JSON.stringify({ access_token: "sk-test-moonshot-api-key-legacy-001" }),
      "utf8",
    );

    const capturedEndpointIds: string[] = [];
    try {
      const backend = await (
        bridge as {
          createRuntimeBridgeBackend: (options: {
            repoRoot: string;
            runtimeStateRoot: string;
            scopeId: string;
            networkFetcher?: typeof fetch;
          }) => Promise<{
            executeChatCompletions: (
              body: Record<string, unknown>,
              requestId: string,
              streamWriter?: (chunk: Record<string, unknown>) => void | Promise<void>,
              requestOptions?: {
                endpointId?: string;
              },
            ) => Promise<{
              model: string;
              endpointId: string;
              outputText: string;
              finishReason: string;
            }>;
            upsertProviderAccount?: (body: Record<string, unknown>) => Promise<unknown>;
            activateEndpoint?: (body: Record<string, unknown>) => Promise<unknown>;
          }>;
        }
      ).createRuntimeBridgeBackend({
        repoRoot,
        fixtureRoot: testFixtureRoot,
        runtimeStateRoot,
        scopeId,
        networkFetcher: async (input, init) => {
          const url =
            typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          if (url === "https://api.moonshot.ai/v1/chat/completions") {
            const parsedBody = JSON.parse(String(init?.body ?? "{}")) as {
              model?: string;
            };
            capturedEndpointIds.push(parsedBody.model ?? "unknown");
            return new Response(
              JSON.stringify({
                id: "chatcmpl-legacy-endpoint-id",
                object: "chat.completion",
                choices: [
                  {
                    index: 0,
                    message: { role: "assistant", content: "legacy endpoint ok" },
                    finish_reason: "stop",
                  },
                ],
                usage: {
                  prompt_tokens: 8,
                  completion_tokens: 3,
                  total_tokens: 11,
                },
              }),
              {
                status: 200,
                headers: { "content-type": "application/json" },
              },
            );
          }
          throw new Error(`Unexpected network request: ${url}`);
        },
      });

      await backend.upsertProviderAccount?.({
        providerAccountId: "moonshot.personal.api-key",
        providerId: "moonshot",
        providerKind: "provider-openai",
        orgScope: "personal",
        accountScope: "workspace-default",
        credentialRef: {
          backend: "local-file",
          ref: "oauth/moonshot/moonshot.personal.api-key",
        },
        authMode: "api-key-static",
        regionPolicy: { mode: "prefer", regions: ["global"] },
        baseUrlOverride: "https://api.moonshot.ai/v1",
        allowedModels: ["moonshot/kimi-k2.5"],
        modelRoleBindings: [
          {
            modelId: "moonshot/kimi-k2.5",
            roleAssignmentMode: "all",
            roleIds: [],
            enabledRoleIds: [],
            disabledRoleIds: [],
          },
        ],
        deniedModels: [],
        entitlementTags: ["chat"],
        budgetPolicyRef: "budget.default",
        quotaPolicyRef: "quota.default",
        status: "active",
        healthStatus: "healthy",
        rotationState: "stable",
      });

      await backend.activateEndpoint?.({
        providerAccountId: "moonshot.personal.api-key",
        modelId: "moonshot/kimi-k2.5",
        region: "global",
      });

      const result = await backend.executeChatCompletions(
        {
          model: "moonshot/kimi-k2.5",
          messages: [{ role: "user", content: "Use the pinned endpoint." }],
        },
        "req-legacy-endpoint-id-001",
        undefined,
        {
          endpointId: "moonshot.personal.credential.global.kimi-k2.5",
        },
      );

      expect(result.outputText).toBe("legacy endpoint ok");
      expect(result.endpointId).toBe("moonshot.personal.api-key.global.kimi-k2.5");
      expect(capturedEndpointIds).toEqual(["kimi-k2.5"]);
    } finally {
      await rm(credentialFile, { force: true });
    }
  });

  test("resolves bridge server options from explicit values and defaults", () => {
    expect(
      typeof (bridge as { resolveBridgeServerOptions?: unknown }).resolveBridgeServerOptions,
    ).toBe("function");

    const result = (
      bridge as {
        resolveBridgeServerOptions: (value: {
          host?: string;
          port?: string;
          repoRoot?: string;
          runtimeStateRoot?: string;
          scopeId?: string;
          executablePath?: string;
          localAppData?: string;
        }) => {
          host: string;
          port: number;
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          staticRoot: string;
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
      staticRoot: path.join(repoRoot, "role-model-router", "apps", "runtime-ui", "build", "client"),
      unifiedRuntimeConfigPath: "C:\\runtime-state\\runtime-config.yaml",
    });
  });

  test("keeps repoRoot-derived static paths stable when runtimeStateRoot uses a different path dialect", () => {
    const result = (
      bridge as {
        resolveBridgeServerOptions: (value: {
          host?: string;
          port?: string;
          repoRoot?: string;
          runtimeStateRoot?: string;
          scopeId?: string;
          executablePath?: string;
          localAppData?: string;
        }) => {
          host: string;
          port: number;
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          staticRoot: string;
        };
      }
    ).resolveBridgeServerOptions({
      repoRoot: "/home/runner/work/role-model/role-model",
      runtimeStateRoot: "C:\\runtime-state",
      port: "9191",
    });

    expect(result).toEqual({
      host: "127.0.0.1",
      port: 9191,
      repoRoot: "/home/runner/work/role-model/role-model",
      runtimeStateRoot: "C:\\runtime-state",
      scopeId: "runtime-host-bridge",
      staticRoot:
        "/home/runner/work/role-model/role-model/role-model-router/apps/runtime-ui/build/client",
      unifiedRuntimeConfigPath: "C:\\runtime-state\\runtime-config.yaml",
    });
  });

  test("resolves packaged bridge server options from executable path defaults", () => {
    const packageDir = path.join(repoRoot, "role-model-router", "dist", "release", "win32-x64");
    const packagedStaticRoot = path.join(packageDir, "build", "client");
    const devStaticRoot = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-ui",
      "build",
      "client",
    );
    const result = (
      bridge as {
        resolveBridgeServerOptions: (value: {
          host?: string;
          port?: string;
          repoRoot?: string;
          runtimeStateRoot?: string;
          scopeId?: string;
          executablePath?: string;
          localAppData?: string;
        }) => {
          host: string;
          port: number;
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          staticRoot: string;
        };
      }
    ).resolveBridgeServerOptions({
      executablePath: path.join(packageDir, "role-model-runtime.exe"),
      localAppData: "C:\\Users\\tester\\AppData\\Local",
    });

    expect(result).toEqual({
      host: "127.0.0.1",
      port: 3456,
      repoRoot,
      runtimeStateRoot: "C:\\Users\\tester\\AppData\\Local\\Role Model Runtime\\state",
      scopeId: "runtime-host-bridge",
      staticRoot: existsSync(path.join(packagedStaticRoot, "index.html"))
        ? packagedStaticRoot
        : devStaticRoot,
      unifiedRuntimeConfigPath:
        "C:\\Users\\tester\\AppData\\Local\\Role Model Runtime\\state\\runtime-config.yaml",
    });
  });

  test("prefers repoRoot frontend assets over packaged assets when repoRoot is explicit", () => {
    const packageDir = path.join(repoRoot, "role-model-router", "dist", "release", "win32-x64");
    const devStaticRoot = path.join(
      repoRoot,
      "role-model-router",
      "apps",
      "runtime-ui",
      "build",
      "client",
    );
    const result = (
      bridge as {
        resolveBridgeServerOptions: (value: {
          host?: string;
          port?: string;
          repoRoot?: string;
          runtimeStateRoot?: string;
          scopeId?: string;
          executablePath?: string;
          localAppData?: string;
        }) => {
          host: string;
          port: number;
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          staticRoot: string;
        };
      }
    ).resolveBridgeServerOptions({
      repoRoot,
      executablePath: path.join(packageDir, "role-model-runtime.exe"),
      localAppData: "C:\\Users\\tester\\AppData\\Local",
    });

    expect(result.staticRoot).toBe(devStaticRoot);
  });

  test("resolves packaged bridge server options from POSIX executable path defaults", () => {
    const result = (
      bridge as {
        resolveBridgeServerOptions: (value: {
          host?: string;
          port?: string;
          repoRoot?: string;
          runtimeStateRoot?: string;
          scopeId?: string;
          executablePath?: string;
          localAppData?: string;
        }) => {
          host: string;
          port: number;
          repoRoot: string;
          runtimeStateRoot: string;
          scopeId: string;
          staticRoot: string;
        };
      }
    ).resolveBridgeServerOptions({
      executablePath:
        "/home/tester/role-model/role-model-router/dist/release/linux-x64/role-model-runtime",
      localAppData: "/home/tester/.local/share",
    });

    expect(result).toEqual({
      host: "127.0.0.1",
      port: 3456,
      repoRoot: "/home/tester/role-model",
      runtimeStateRoot: "/home/tester/.local/share/Role Model Runtime/state",
      scopeId: "runtime-host-bridge",
      staticRoot: "/home/tester/role-model/role-model-router/apps/runtime-ui/build/client",
      unifiedRuntimeConfigPath:
        "/home/tester/.local/share/Role Model Runtime/state/runtime-config.yaml",
    });
  });
});
