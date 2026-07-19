import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { stringify } from "yaml";

import {
  type RuntimeBridgeBackend,
  createRuntimeBridgeBackend,
  startBridgeServer,
} from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createLocalVendorScript(): string {
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/responses"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedInput=typeof parsed.input==="string"?parsed.input:JSON.stringify(parsed.input??"");const isClassifier=joinedInput.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");const isHardPrompt=joinedInput.includes("Analyze this code-edit workflow")||joinedInput.includes('\"toolCount\":2')||joinedInput.includes('\"toolCount\": 2')||joinedInput.includes('\"codeOrSchemaBurden\":true')||joinedInput.includes('\"codeOrSchemaBurden\": true');const classifierResponse=isHardPrompt?JSON.stringify({difficulty:"hard"}):JSON.stringify({difficulty:"easy"});if(parsed.stream){res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8"});res.write('data: {"type":"response.created","response":{"id":"resp-local","created_at":1,"model":"local/llama-3.1-8b-instruct"}}'+"\\n\\n");setTimeout(()=>{res.write('data: {"type":"response.output_text.delta","item_id":"msg_1","delta":'+JSON.stringify(isClassifier?classifierResponse:"local llama summary")+'}'+"\\n\\n");setTimeout(()=>{res.end('data: {"type":"response.completed","response":{"usage":{"input_tokens":11,"output_tokens":4}},"_hidden_params":{"response_cost":0.0005,"cache_hit":false}}'+"\\n\\n"+'data: [DONE]'+"\\n\\n");},10);},10);return;}res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"resp-local",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:isClassifier?classifierResponse:"local llama summary"}]}],usage:{input_tokens:11,output_tokens:4},_hidden_params:{response_cost:0.0005,cache_hit:false}}));});return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isClassifier=joinedMessages.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");const isHardPrompt=joinedMessages.includes("Analyze this code-edit workflow")||joinedMessages.includes('\"toolCount\":2')||joinedMessages.includes('\"toolCount\": 2')||joinedMessages.includes('\"codeOrSchemaBurden\":true')||joinedMessages.includes('\"codeOrSchemaBurden\": true');const classifierResponse=isHardPrompt?JSON.stringify({difficulty:"hard"}):JSON.stringify({difficulty:"easy"});if(parsed.stream){res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8"});res.write('data: {"id":"chat-local","object":"chat.completion.chunk","created":1,"model":"local/llama-3.1-8b-instruct","choices":[{"index":0,"delta":{"role":"assistant","content":"local "},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.write('data: {"id":"chat-local","object":"chat.completion.chunk","created":1,"model":"local/llama-3.1-8b-instruct","choices":[{"index":0,"delta":{"content":"llama summary"},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.end('data: {"id":"chat-local","object":"chat.completion.chunk","created":1,"model":"local/llama-3.1-8b-instruct","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":11,"completion_tokens":4},"_hidden_params":{"response_cost":0.0005,"cache_hit":false}}'+"\\n\\n"+'data: [DONE]'+"\\n\\n");},10);},10);return;}res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-local",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content:isClassifier?classifierResponse:"local llama summary"},finish_reason:"stop"}],usage:{prompt_tokens":11,completion_tokens":4,total_tokens:15},_hidden_params:{response_cost:0.0005,cache_hit:false}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

function createSimpleLocalVendorScript(): string {
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/responses"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");if(parsed.stream){res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8"});res.write('data: {"type":"response.created","response":{"id":"resp-local","created_at":1,"model":"local/llama-3.1-8b-instruct"}}'+"\\n\\n");setTimeout(()=>{res.write('data: {"type":"response.output_text.delta","item_id":"msg_1","delta":"local llama summary"}'+"\\n\\n");setTimeout(()=>{res.end('data: {"type":"response.completed","response":{"usage":{"input_tokens":11,"output_tokens":4}},"_hidden_params":{"response_cost":0.0005,"cache_hit":false}}'+"\\n\\n"+'data: [DONE]'+"\\n\\n");},10);},10);return;}res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"resp-local",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:"local llama summary"}]}],usage:{input_tokens:11,output_tokens:4},_hidden_params:{response_cost:0.0005,cache_hit:false}}));});return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");if(parsed.stream){res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8"});res.write('data: {"id":"chat-local","object":"chat.completion.chunk","created":1,"model":"local/llama-3.1-8b-instruct","choices":[{"index":0,"delta":{"role":"assistant","content":"local "},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.write('data: {"id":"chat-local","object":"chat.completion.chunk","created":1,"model":"local/llama-3.1-8b-instruct","choices":[{"index":0,"delta":{"content":"llama summary"},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.end('data: {"id":"chat-local","object":"chat.completion.chunk","created":1,"model":"local/llama-3.1-8b-instruct","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":11,"completion_tokens":4},"_hidden_params":{"response_cost":0.0005,"cache_hit":false}}'+"\\n\\n"+'data: [DONE]'+"\\n\\n");},10);},10);return;}res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-local",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content:"local llama summary"},finish_reason:"stop"}],usage:{prompt_tokens:11,completion_tokens:4,total_tokens:15},_hidden_params:{response_cost:0.0005,cache_hit:false}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}
function createRemoteVendorScript(): string {
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/models"){res.setHeader("content-type","application/json");res.end(JSON.stringify({object:"list",data:[{id:"openai/gpt-4.1-mini-fast",object:"model",owned_by:"openai"}]}));return;}if(req.url==="/v1/responses"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedInput=typeof parsed.input==="string"?parsed.input:JSON.stringify(parsed.input??"");const isClassifier=joinedInput.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");const isController=joinedInput.includes("ROLE_MODEL_ROUTING_CONTROLLER");const isHardPrompt=joinedInput.includes("Analyze this code-edit workflow")||joinedInput.includes('\"toolCount\":2')||joinedInput.includes('\"toolCount\": 2')||joinedInput.includes('\"codeOrSchemaBurden\":true')||joinedInput.includes('\"codeOrSchemaBurden\": true');const classifierResponse=isHardPrompt?JSON.stringify({difficulty:"hard"}):JSON.stringify({difficulty:"easy"});const controllerResponse=joinedInput.includes("invalid-controller-fallback")?"not-json-controller-output":JSON.stringify({strategy:"quality",preferredEndpointIds:["openai.litellm.global.openai-gpt-4-1-mini-fast"]});const responseText=isController?controllerResponse:(isClassifier?classifierResponse:"remote litellm summary");if(parsed.stream){res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8"});res.write('data: {"type":"response.created","response":{"id":"resp-remote","created_at":1,"model":"openai/gpt-4.1-mini-fast"}}'+"\\n\\n");setTimeout(()=>{res.write('data: {"type":"response.output_text.delta","item_id":"msg_1","delta":'+JSON.stringify(responseText)+'}'+"\\n\\n");setTimeout(()=>{res.end('data: {"type":"response.completed","response":{"usage":{"input_tokens":14,"output_tokens":5}},"_hidden_params":{"response_cost":0.0042,"cache_hit":true}}'+"\\n\\n"+'data: [DONE]'+"\\n\\n");},10);},10);return;}res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"resp-remote",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:responseText}]}],usage:{input_tokens:14,output_tokens:5,prompt_tokens_details:{cached_tokens:9}},_hidden_params:{response_cost:0.0042,cache_hit:true}}));});return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isClassifier=joinedMessages.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");const isHardPrompt=joinedMessages.includes("Analyze this code-edit workflow")||joinedMessages.includes('\"toolCount\":2')||joinedMessages.includes('\"toolCount\": 2')||joinedMessages.includes('\"codeOrSchemaBurden\":true')||joinedMessages.includes('\"codeOrSchemaBurden\": true');const classifierResponse=isHardPrompt?JSON.stringify({difficulty:"hard"}):JSON.stringify({difficulty:"easy"});const controllerResponse=joinedMessages.includes("invalid-controller-fallback")?"not-json-controller-output":JSON.stringify({strategy:"quality",preferredEndpointIds:["openai.litellm.global.openai-gpt-4-1-mini-fast"]});const responseText=isController?controllerResponse:(isClassifier?classifierResponse:"remote litellm summary");if(parsed.stream){res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8"});res.write('data: {"id":"chat-remote","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{"role":"assistant","content":"remote "},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.write('data: {"id":"chat-remote","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{"content":"litellm summary"},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.end('data: {"id":"chat-remote","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":14,"completion_tokens":5},"_hidden_params":{"response_cost":0.0042,"cache_hit":true}}'+"\\n\\n"+'data: [DONE]'+"\\n\\n");},10);},10);return;}res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-remote",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content:responseText},finish_reason:"stop"}],usage:{prompt_tokens:14,completion_tokens:5,total_tokens:19},_hidden_params:{response_cost:0.0042,cache_hit:true}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

type RuntimeVendorHttpResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
};

async function postJsonRequest(
  baseUrl: string,
  requestPath: RuntimeVendorCorpusRequestPath,
  requestId: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<RuntimeVendorHttpResult> {
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.json(),
  };
}

async function postResponses(
  baseUrl: string,
  model: string,
  requestId: string,
): Promise<RuntimeVendorHttpResult> {
  return postJsonRequest(baseUrl, "/v1/responses", requestId, {
    model,
    input: "Summarize the chosen endpoint.",
  });
}

async function postChatCompletions(
  baseUrl: string,
  requestId: string,
  body: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<RuntimeVendorHttpResult> {
  return postJsonRequest(baseUrl, "/v1/chat/completions", requestId, body, headers);
}

async function collectStreamedResponse(
  backend: Pick<RuntimeBridgeBackend, "executeResponses">,
  model: string,
  requestId: string,
): Promise<{
  vendorId: string | undefined;
  outputText: string;
  chunkCount: number;
}> {
  const chunks: Record<string, unknown>[] = [];
  const result = await backend.executeResponses(
    {
      model,
      stream: true,
      input: "Summarize the chosen endpoint.",
    },
    requestId,
    async (chunk) => {
      chunks.push(chunk);
    },
  );
  return {
    vendorId: result.vendorId,
    outputText: result.outputText,
    chunkCount: chunks.length,
  };
}

async function waitForRuntimeModelEndpointsReady(
  backend: Pick<RuntimeBridgeBackend, "listEndpoints">,
  modelIds: readonly string[],
  timeoutMs = 30_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const endpoints = await backend.listEndpoints();
    const readyByModelId = new Map(
      modelIds.map((modelId) => [
        modelId,
        endpoints.some(
          (endpoint) =>
            endpoint.modelId === modelId &&
            endpoint.status === "active" &&
            endpoint.healthStatus === "healthy",
        ),
      ]),
    );
    if ([...readyByModelId.values()].every(Boolean)) {
      return;
    }
    await delay(50);
  }
  throw new Error(`Timed out waiting for runtime endpoints for models: ${modelIds.join(", ")}.`);
}

function readSelectedModelId(observation: RuntimeVendorObservation): string | null {
  const telemetrySnapshot = observation?.telemetrySnapshot as
    | { selectedModelId?: unknown }
    | undefined;
  if (
    typeof telemetrySnapshot?.selectedModelId === "string" &&
    telemetrySnapshot.selectedModelId.length > 0
  ) {
    return telemetrySnapshot.selectedModelId;
  }
  return typeof observation?.usageEvent?.model_id === "string" &&
    observation.usageEvent.model_id.length > 0
    ? observation.usageEvent.model_id
    : null;
}

function inferCorpusProviderFamily(input: {
  readonly providerId: string | null;
  readonly providerFamily: string | null;
}): string | null {
  return input.providerFamily ?? input.providerId;
}

function buildCorpusCaseRecord(input: {
  readonly definition: RuntimeVendorCorpusCaseDefinition;
  readonly requestId: string;
  readonly response: RuntimeVendorHttpResult;
  readonly observation: RuntimeVendorObservation;
}): RuntimeVendorCorpusCaseRecord {
  const failureClass = readFailureClass(input.response.body);
  const actualOutcomeClass: RuntimeVendorCorpusOutcomeClass =
    input.response.statusCode >= 400 || failureClass ? "failure" : "success";
  const selectedEndpointId =
    actualOutcomeClass === "success" ? (input.observation?.endpointId ?? null) : null;
  const selectedModelId =
    actualOutcomeClass === "success" ? readSelectedModelId(input.observation) : null;
  const providerId =
    actualOutcomeClass === "success"
      ? (((input.observation?.telemetrySnapshot as { providerId?: string | null } | undefined)
          ?.providerId ?? null) as string | null)
      : null;
  const providerFamily =
    actualOutcomeClass === "success"
      ? (input.observation?.executionTelemetry.providerFamily ?? null)
      : null;
  const vendorId =
    actualOutcomeClass === "success"
      ? (((input.observation?.executionTelemetry as { vendorId?: string | null } | undefined)
          ?.vendorId ?? null) as string | null)
      : null;
  const actualExecutionFamily =
    actualOutcomeClass === "success"
      ? (input.observation?.executionSemantics.executionFamily ?? null)
      : null;
  const adapterFamily =
    actualOutcomeClass === "success"
      ? (input.observation?.executionSemantics.adapterFamily ?? null)
      : null;
  const payloadBytes =
    actualOutcomeClass === "success"
      ? (input.observation?.executionSemantics.payloadBytes ?? null)
      : null;
  const normalizedProviderFamily = inferCorpusProviderFamily({
    providerId,
    providerFamily,
  });
  return {
    caseId: input.definition.caseId,
    clientKind: input.definition.clientKind,
    category: input.definition.category,
    requestPath: input.definition.requestPath,
    deterministic: true,
    routingConstraint: input.definition.routingConstraint,
    allowedEndpointIds: [...input.definition.allowedEndpointIds],
    expectedExecutionFamily: input.definition.expectedExecutionFamily,
    ...(input.definition.expectedExecutionFamilies
      ? { expectedExecutionFamilies: [...input.definition.expectedExecutionFamilies] }
      : {}),
    actualExecutionFamily,
    expectedOutcomeClass: input.definition.expectedOutcomeClass,
    actualOutcomeClass,
    selectedEndpointId,
    selectedModelId,
    providerFamily: normalizedProviderFamily,
    vendorId,
    adapterFamily,
    statusCode: input.response.statusCode,
    streamTerminalStatus: input.observation?.executionTelemetry.finishReason ?? null,
    failureClass,
    retryCount: input.observation?.executionSemantics.retryCount ?? 0,
    rerouteCount: input.observation?.executionSemantics.rerouteCount ?? 0,
    payloadBytes: {
      ingress: measurePayloadBytes(input.definition.body),
      translated: payloadBytes?.translated ?? null,
      providerCanonical: payloadBytes?.providerCanonical ?? null,
      providerWire: payloadBytes?.providerWire ?? null,
      providerResponse: payloadBytes?.providerResponse ?? null,
    },
    toolCallCount: input.observation?.tooling?.toolCalls.length ?? 0,
    toolExecutionCount: input.observation?.tooling?.executions.length ?? 0,
    idempotencyDecision: input.observation?.executionSemantics.idempotencyDecision ?? null,
    requestId: input.requestId,
    routingDecisionId: input.observation?.routingDecisionId ?? null,
  };
}

function summarizeCorpusCases(
  cases: readonly RuntimeVendorCorpusCaseRecord[],
): RuntimeVendorCorpusSummary {
  const categoryCounts: Record<string, number> = {};
  let piCount = 0;
  let craftCount = 0;
  let successCount = 0;
  let failureCount = 0;

  for (const corpusCase of cases) {
    categoryCounts[corpusCase.category] = (categoryCounts[corpusCase.category] ?? 0) + 1;
    if (corpusCase.clientKind === "pi") {
      piCount += 1;
    } else {
      craftCount += 1;
    }
    if (corpusCase.actualOutcomeClass === "success") {
      successCount += 1;
    } else {
      failureCount += 1;
    }
  }

  return {
    deterministic: true,
    totalCaseCount: cases.length,
    successCaseCount: successCount,
    failureCaseCount: failureCount,
    clientCaseCounts: {
      pi: piCount,
      craft: craftCount,
    },
    categoryCounts,
  };
}

type RuntimeVendorValidationHarnessMode = "mock" | "real";

type LlamaSwapValidationModelConfig = {
  readonly path: string;
  readonly command?: string;
  readonly check_endpoint?: string;
  readonly use_model_name?: string;
  readonly max_difficulty?: "easy" | "medium" | "hard";
};

type LlamaSwapValidationConfig = {
  readonly command?: string;
  readonly args?: readonly string[];
  readonly models: Record<string, LlamaSwapValidationModelConfig>;
};

type LiteLLMValidationConfig = {
  readonly command?: string;
  readonly args?: readonly string[];
  readonly providers: {
    readonly openai: {
      readonly api_key: string;
      readonly model_list: ReadonlyArray<{
        readonly model_name: string;
        readonly max_difficulty?: "easy" | "medium" | "hard";
        readonly litellm_params: {
          readonly model: string;
          readonly api_base?: string;
        };
      }>;
    };
  };
};

type RuntimeValidationConfig = {
  readonly version: "1.0";
  readonly routing: {
    readonly strategy: "balanced";
  };
  readonly observed_data?: {
    readonly difficulty_learning?: {
      readonly override?: {
        readonly min_samples?: number;
      };
    };
  };
  readonly model_aliases?: Record<
    string,
    {
      readonly mode?: "basic" | "difficulty" | "intelligent" | "hybrid";
      readonly model_ids: readonly string[];
    }
  >;
  readonly difficulty_classifier?: {
    readonly enabled: boolean;
    readonly rubric_version: string;
    readonly source_type: "local" | "remote";
    readonly model_id: string;
    readonly timeout_ms: number;
    readonly fallback_difficulty: "easy" | "medium" | "hard";
  };
  readonly controller?: {
    readonly enabled: boolean;
    readonly source_type: "local" | "remote";
    readonly model_id: string;
    readonly timeout_ms: number;
  };
  readonly llama_swap?: LlamaSwapValidationConfig;
  readonly litellm_proxy?: LiteLLMValidationConfig;
};

type RuntimeVendorHarnessSummary = {
  readonly local: "managed-node-mock" | "real-llama-swap-mock-upstream";
  readonly remote: "managed-node-mock" | "real-litellm-mock-upstream";
  readonly realVendorCoverage: boolean;
};

type RuntimeVendorCorpusClientKind = "pi" | "craft";
type RuntimeVendorCorpusOutcomeClass = "success" | "failure";
type RuntimeVendorCorpusRuntimeKind = "decision" | "hybrid";
type RuntimeVendorCorpusRequestPath = "/v1/responses" | "/v1/chat/completions";
type RuntimeVendorObservation = Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;

type RuntimeVendorCorpusCaseDefinition = {
  readonly caseId: string;
  readonly clientKind: RuntimeVendorCorpusClientKind;
  readonly category: string;
  readonly requestPath: RuntimeVendorCorpusRequestPath;
  readonly runtimeKind: RuntimeVendorCorpusRuntimeKind;
  readonly routingConstraint: string;
  readonly allowedEndpointIds: readonly string[];
  readonly expectedExecutionFamily: string | null;
  readonly expectedExecutionFamilies?: readonly string[];
  readonly expectedOutcomeClass: RuntimeVendorCorpusOutcomeClass;
  readonly body: Record<string, unknown>;
  readonly headers?: Record<string, string>;
};

export type RuntimeVendorCorpusCaseRecord = {
  readonly caseId: string;
  readonly clientKind: RuntimeVendorCorpusClientKind;
  readonly category: string;
  readonly requestPath: RuntimeVendorCorpusRequestPath;
  readonly deterministic: true;
  readonly routingConstraint: string;
  readonly allowedEndpointIds: readonly string[];
  readonly expectedExecutionFamily: string | null;
  readonly expectedExecutionFamilies?: readonly string[];
  readonly actualExecutionFamily: string | null;
  readonly expectedOutcomeClass: RuntimeVendorCorpusOutcomeClass;
  readonly actualOutcomeClass: RuntimeVendorCorpusOutcomeClass;
  readonly selectedEndpointId: string | null;
  readonly selectedModelId: string | null;
  readonly providerFamily: string | null;
  readonly vendorId: string | null;
  readonly adapterFamily: string | null;
  readonly statusCode: number;
  readonly streamTerminalStatus: string | null;
  readonly failureClass: string | null;
  readonly retryCount: number;
  readonly rerouteCount: number;
  readonly payloadBytes: {
    readonly ingress: number;
    readonly translated: number | null;
    readonly providerCanonical: number | null;
    readonly providerWire: number | null;
    readonly providerResponse: number | null;
  };
  readonly toolCallCount: number;
  readonly toolExecutionCount: number;
  readonly idempotencyDecision: string | null;
  readonly requestId: string;
  readonly routingDecisionId: string | null;
};

export type RuntimeVendorCorpusSummary = {
  readonly deterministic: true;
  readonly totalCaseCount: number;
  readonly successCaseCount: number;
  readonly failureCaseCount: number;
  readonly clientCaseCounts: {
    readonly pi: number;
    readonly craft: number;
  };
  readonly categoryCounts: Readonly<Record<string, number>>;
};

export type RuntimeVendorCorpusResult = {
  readonly summary: RuntimeVendorCorpusSummary;
  readonly cases: readonly RuntimeVendorCorpusCaseRecord[];
};

const LOCAL_EXECUTION_FAMILY = "vendor-llama-swap";
const LOCAL_PROVIDER_FAMILY = "ai-sdk-openai-compatible";
const REMOTE_EXECUTION_FAMILY = "vendor-litellm";
const REMOTE_PROVIDER_FAMILY = "litellm-proxy";
const CODEX_EXECUTION_FAMILY = "remote-service";
const VALIDATION_CODEX_PROVIDER_ACCOUNT_ID = "openai.personal.openai-codex-subscription";
const CRAFT_PREAMBLE =
  "You are Craft Agent, powered by Craft Agents Backend. Help users connect data sources, automate workflows, and validate integrations. Follow the system contract and schema for tool validation.";

function formatCorpusOrdinal(index: number): string {
  return String(index).padStart(3, "0");
}

function slugifyModelId(modelId: string): string {
  return modelId
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function deriveLocalEndpointId(modelId: string): string {
  return `llama-swap.local.${slugifyModelId(modelId)}`;
}

function deriveRemoteEndpointId(modelId: string): string {
  const providerId = modelId.split("/", 1)[0] ?? "remote";
  return `${providerId}.litellm.global.${slugifyModelId(modelId)}`;
}

function deriveCodexEndpointId(modelId: string): string {
  const runtimeModelId = modelId.replace(/^chatgpt\//, "");
  return `openai.personal.openai-codex-subscription.global.${runtimeModelId}`;
}

function buildLongContext(label: string, index: number): string {
  const suffix = formatCorpusOrdinal(index);
  return Array.from(
    { length: 24 },
    (_, segment) =>
      `${label} ${suffix} segment ${segment + 1}: preserve routing semantics, compare endpoints, and verify the final contract end to end.`,
  ).join(" ");
}

function buildResponsesTools(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    type: "function" as const,
    name: `runtime_vendor_response_tool_${index + 1}`,
    description: "Validate corpus tool routing for responses requests.",
    parameters: {
      type: "object",
      properties: {},
    },
  }));
}

function buildChatTools(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    type: "function" as const,
    function: {
      name: `runtime_vendor_chat_tool_${index + 1}`,
      description: "Validate corpus tool routing for chat requests.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  }));
}

function buildToolContinuationMessages(prefix: string, suffix: string, toolName: string) {
  return [
    {
      role: "user",
      content: `${prefix} run the workflow and preserve the tool context for case ${suffix}.`,
    },
    {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: `call_${suffix}`,
          type: "function",
          function: {
            name: toolName,
            arguments: "{}",
          },
        },
      ],
    },
    {
      role: "tool",
      content: `Tool output for case ${suffix}.`,
      tool_call_id: `call_${suffix}`,
    },
    {
      role: "user",
      content: `${prefix} continue after the tool output and summarize the result for case ${suffix}.`,
    },
  ];
}

function measurePayloadBytes(value: unknown): number {
  return Buffer.byteLength(
    typeof value === "string" ? value : JSON.stringify(value ?? null),
    "utf8",
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readFailureClass(payload: unknown): string | null {
  const payloadRecord = asRecord(payload);
  const errorRecord = asRecord(payloadRecord?.error);
  if (typeof errorRecord?.code === "string" && errorRecord.code.length > 0) {
    return errorRecord.code;
  }
  if (typeof errorRecord?.type === "string" && errorRecord.type.length > 0) {
    return errorRecord.type;
  }
  if (typeof payloadRecord?.error_class === "string" && payloadRecord.error_class.length > 0) {
    return payloadRecord.error_class;
  }
  return null;
}

export type RuntimeVendorValidationPlan = {
  readonly aliasModelId: string;
  readonly difficultyAliasModelId: string;
  readonly intelligentAliasModelId: string;
  readonly codexAliasModelId: string;
  readonly localModelId: string;
  readonly remoteModelId: string;
  readonly codexModelId: string;
  readonly decisionConfig: RuntimeValidationConfig;
  readonly localConfig: RuntimeValidationConfig & {
    readonly llama_swap: LlamaSwapValidationConfig;
  };
  readonly remoteConfig: RuntimeValidationConfig & {
    readonly litellm_proxy: LiteLLMValidationConfig;
  };
  readonly hybridConfig: RuntimeValidationConfig & {
    readonly llama_swap: LlamaSwapValidationConfig;
    readonly litellm_proxy: LiteLLMValidationConfig;
  };
  readonly vendorHarness: RuntimeVendorHarnessSummary;
  readonly remoteUpstream: {
    readonly port: number;
    readonly scriptPath: string;
    readonly apiBaseUrl: string;
    readonly healthUrl: string;
  } | null;
};

function createDecisionConfig(): RuntimeValidationConfig {
  return {
    version: "1.0",
    routing: {
      strategy: "balanced",
    },
    observed_data: {
      difficulty_learning: {
        override: {
          min_samples: 999,
        },
      },
    },
  };
}

function createMockLocalConfig(localModelId: string): RuntimeValidationConfig & {
  readonly llama_swap: LlamaSwapValidationConfig;
} {
  return {
    ...createDecisionConfig(),
    llama_swap: {
      command: "node",
      args: ["-e", createSimpleLocalVendorScript()],
      models: {
        [localModelId]: {
          path: "./models/llama-3.1-8b-instruct-q4.gguf",
          max_difficulty: "easy",
        },
      },
    },
  };
}

function createMockRemoteConfig(remoteModelId: string): RuntimeValidationConfig & {
  readonly litellm_proxy: LiteLLMValidationConfig;
} {
  return {
    ...createDecisionConfig(),
    litellm_proxy: {
      command: "node",
      args: ["-e", createRemoteVendorScript()],
      providers: {
        openai: {
          api_key: "${OPENAI_API_KEY}",
          model_list: [
            {
              model_name: remoteModelId,
              max_difficulty: "hard",
              litellm_params: {
                model: "openai/gpt-4.1-mini",
              },
            },
          ],
        },
      },
    },
  };
}

function buildPiCorpusCases(
  plan: RuntimeVendorValidationPlan,
): RuntimeVendorCorpusCaseDefinition[] {
  const localEndpointId = deriveLocalEndpointId(plan.localModelId);
  const remoteEndpointId = deriveRemoteEndpointId(plan.remoteModelId);
  const codexEndpointId = deriveCodexEndpointId(plan.codexModelId);
  const aliasEndpoints = [localEndpointId, remoteEndpointId, codexEndpointId];
  const codexAliasEndpoints = [remoteEndpointId, codexEndpointId];
  const cases: RuntimeVendorCorpusCaseDefinition[] = [];

  for (let index = 1; index <= 10; index += 1) {
    const suffix = formatCorpusOrdinal(index);
    cases.push(
      {
        caseId: `pi.responses.exact-local.plain-${suffix}`,
        clientKind: "pi",
        category: "plain-text",
        requestPath: "/v1/responses",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.localModelId}`,
        allowedEndpointIds: [localEndpointId],
        expectedExecutionFamily: LOCAL_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.localModelId,
          input: `Summarize the local deterministic Pi case ${suffix}.`,
        },
      },
      {
        caseId: `pi.responses.exact-remote.plain-${suffix}`,
        clientKind: "pi",
        category: "plain-text",
        requestPath: "/v1/responses",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.remoteModelId}`,
        allowedEndpointIds: [remoteEndpointId],
        expectedExecutionFamily: REMOTE_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.remoteModelId,
          input: `Summarize the remote deterministic Pi case ${suffix}.`,
        },
      },
      {
        caseId: `pi.responses.alias-easy-${suffix}`,
        clientKind: "pi",
        category: "plain-text",
        requestPath: "/v1/responses",
        runtimeKind: "hybrid",
        routingConstraint: `alias:${plan.difficultyAliasModelId}`,
        allowedEndpointIds: aliasEndpoints,
        expectedExecutionFamily: LOCAL_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.difficultyAliasModelId,
          input: `Say hello in one sentence for deterministic Pi case ${suffix}.`,
        },
      },
      {
        caseId: `pi.responses.alias-hard-tools-${suffix}`,
        clientKind: "pi",
        category: "tool-bearing",
        requestPath: "/v1/responses",
        runtimeKind: "hybrid",
        routingConstraint: `alias:${plan.difficultyAliasModelId}`,
        allowedEndpointIds: aliasEndpoints,
        expectedExecutionFamily: REMOTE_EXECUTION_FAMILY,
        expectedExecutionFamilies: [REMOTE_EXECUTION_FAMILY, CODEX_EXECUTION_FAMILY],
        expectedOutcomeClass: "success",
        body: {
          model: plan.difficultyAliasModelId,
          input: `Analyze this code-edit workflow for deterministic Pi case ${suffix}, apply multiple constraints, verify the final contract end to end, and decompose the work before producing the answer.`,
          tools: buildResponsesTools(2),
        },
      },
      {
        caseId: `pi.responses.non-tool-mentions-tools-${suffix}`,
        clientKind: "pi",
        category: "non-tool-mentions-tools",
        requestPath: "/v1/responses",
        runtimeKind: "hybrid",
        routingConstraint: `alias:${plan.difficultyAliasModelId}`,
        allowedEndpointIds: aliasEndpoints,
        expectedExecutionFamily: LOCAL_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.difficultyAliasModelId,
          input: `Before answering deterministic Pi case ${suffix}, explain which tools you would consider using, but do not call them.`,
        },
      },
      {
        caseId: `pi.responses.continuation-after-tool-output-${suffix}`,
        clientKind: "pi",
        category: "continuation-after-tool-output",
        requestPath: "/v1/responses",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.remoteModelId}`,
        allowedEndpointIds: [remoteEndpointId],
        expectedExecutionFamily: null,
        expectedOutcomeClass: "failure",
        body: {
          model: plan.remoteModelId,
          input: `Continue after the prior tool output for deterministic Pi case ${suffix}.`,
          previous_response_id: `resp_prev_pi_${suffix}`,
          reasoning_effort: "high",
        },
        headers: {
          "x-session-id": `pi-session-${suffix}`,
          "x-client-request-id": `pi-client-${suffix}`,
        },
      },
      {
        caseId: `pi.responses.long-context-${suffix}`,
        clientKind: "pi",
        category: "long-context",
        requestPath: "/v1/responses",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.remoteModelId}`,
        allowedEndpointIds: [remoteEndpointId],
        expectedExecutionFamily: REMOTE_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.remoteModelId,
          input: buildLongContext("PI_LONG_CONTEXT", index),
        },
      },
      {
        caseId: `pi.responses.image-sensitive.${suffix}`,
        clientKind: "pi",
        category: "image-sensitive",
        requestPath: "/v1/responses",
        runtimeKind: "hybrid",
        routingConstraint: `alias:${plan.codexAliasModelId}`,
        allowedEndpointIds: codexAliasEndpoints,
        expectedExecutionFamily: CODEX_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.codexAliasModelId,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Describe the uploaded image for deterministic Pi case ${suffix}.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: "data:image/png;base64,abc",
                  },
                },
              ],
            },
          ],
        },
      },
      {
        caseId: `pi.responses.controller-remote-${suffix}`,
        clientKind: "pi",
        category: "plain-text",
        requestPath: "/v1/responses",
        runtimeKind: "hybrid",
        routingConstraint: `alias:${plan.intelligentAliasModelId}`,
        allowedEndpointIds: aliasEndpoints,
        expectedExecutionFamily: LOCAL_EXECUTION_FAMILY,
        expectedExecutionFamilies: [LOCAL_EXECUTION_FAMILY, REMOTE_EXECUTION_FAMILY],
        expectedOutcomeClass: "success",
        body: {
          model: plan.intelligentAliasModelId,
          input: `Prefer the strongest remote endpoint for deterministic Pi case ${suffix}.`,
        },
      },
      {
        caseId: `pi.responses.reasoning-continuation-remote-${suffix}`,
        clientKind: "pi",
        category: "plain-text",
        requestPath: "/v1/responses",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.remoteModelId}`,
        allowedEndpointIds: [remoteEndpointId],
        expectedExecutionFamily: null,
        expectedOutcomeClass: "failure",
        body: {
          model: plan.remoteModelId,
          input: `Use higher reasoning effort for deterministic Pi case ${suffix}.`,
          reasoning_effort: "high",
        },
        headers: {
          "x-session-id": `pi-reasoning-session-${suffix}`,
          "x-client-request-id": `pi-reasoning-client-${suffix}`,
          "x-prompt-cache-key": `pi-cache-${suffix}`,
        },
      },
    );
  }

  return cases;
}

function buildCraftCorpusCases(
  plan: RuntimeVendorValidationPlan,
): RuntimeVendorCorpusCaseDefinition[] {
  const localEndpointId = deriveLocalEndpointId(plan.localModelId);
  const remoteEndpointId = deriveRemoteEndpointId(plan.remoteModelId);
  const aliasEndpoints = [localEndpointId, remoteEndpointId];
  const codexEndpointId = deriveCodexEndpointId(plan.codexModelId);
  const codexAliasEndpoints = [remoteEndpointId, codexEndpointId];
  const cases: RuntimeVendorCorpusCaseDefinition[] = [];

  for (let index = 1; index <= 10; index += 1) {
    const suffix = formatCorpusOrdinal(index);
    cases.push(
      {
        caseId: `craft.chat.dual-user-preamble.${suffix}`,
        clientKind: "craft",
        category: "plain-text",
        requestPath: "/v1/chat/completions",
        runtimeKind: "hybrid",
        routingConstraint: `alias:${plan.difficultyAliasModelId}`,
        allowedEndpointIds: aliasEndpoints,
        expectedExecutionFamily: LOCAL_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.difficultyAliasModelId,
          messages: [
            { role: "user", content: CRAFT_PREAMBLE },
            { role: "user", content: `hello from Craft deterministic case ${suffix}` },
          ],
        },
      },
      {
        caseId: `craft.chat.assistant-preamble.${suffix}`,
        clientKind: "craft",
        category: "plain-text",
        requestPath: "/v1/chat/completions",
        runtimeKind: "hybrid",
        routingConstraint: `alias:${plan.difficultyAliasModelId}`,
        allowedEndpointIds: aliasEndpoints,
        expectedExecutionFamily: LOCAL_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.difficultyAliasModelId,
          messages: [
            { role: "assistant", content: CRAFT_PREAMBLE },
            { role: "user", content: `hello from assistant-prefilled Craft case ${suffix}` },
          ],
        },
      },
      {
        caseId: `craft.chat.exact-local.plain-${suffix}`,
        clientKind: "craft",
        category: "plain-text",
        requestPath: "/v1/chat/completions",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.localModelId}`,
        allowedEndpointIds: [localEndpointId],
        expectedExecutionFamily: LOCAL_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.localModelId,
          messages: [{ role: "user", content: `Summarize exact local Craft case ${suffix}.` }],
        },
      },
      {
        caseId: `craft.chat.exact-remote.plain-${suffix}`,
        clientKind: "craft",
        category: "plain-text",
        requestPath: "/v1/chat/completions",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.remoteModelId}`,
        allowedEndpointIds: [remoteEndpointId],
        expectedExecutionFamily: REMOTE_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.remoteModelId,
          messages: [{ role: "user", content: `Summarize exact remote Craft case ${suffix}.` }],
        },
      },
      {
        caseId: `craft.chat.declared-tools.${suffix}`,
        clientKind: "craft",
        category: "tool-bearing",
        requestPath: "/v1/chat/completions",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.remoteModelId}`,
        allowedEndpointIds: [remoteEndpointId],
        expectedExecutionFamily: REMOTE_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.remoteModelId,
          messages: [
            { role: "user", content: CRAFT_PREAMBLE },
            { role: "user", content: `hello from declared-tools Craft case ${suffix}` },
          ],
          tools: buildChatTools(33),
        },
      },
      {
        caseId: `craft.chat.active-tool-turn.${suffix}`,
        clientKind: "craft",
        category: "continuation-after-tool-output",
        requestPath: "/v1/chat/completions",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.remoteModelId}`,
        allowedEndpointIds: [remoteEndpointId],
        expectedExecutionFamily: REMOTE_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.remoteModelId,
          messages: buildToolContinuationMessages(
            "Craft corpus",
            suffix,
            "runtime_vendor_chat_tool_1",
          ),
          tools: buildChatTools(10),
        },
      },
      {
        caseId: `craft.chat.non-tool-mentions-tools.${suffix}`,
        clientKind: "craft",
        category: "non-tool-mentions-tools",
        requestPath: "/v1/chat/completions",
        runtimeKind: "hybrid",
        routingConstraint: `alias:${plan.difficultyAliasModelId}`,
        allowedEndpointIds: aliasEndpoints,
        expectedExecutionFamily: LOCAL_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.difficultyAliasModelId,
          messages: [
            {
              role: "user",
              content: `For deterministic Craft case ${suffix}, explain which tools you would consider using, but do not call them.`,
            },
          ],
        },
      },
      {
        caseId: `craft.chat.continuation-after-tool-output.${suffix}`,
        clientKind: "craft",
        category: "continuation-after-tool-output",
        requestPath: "/v1/chat/completions",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.remoteModelId}`,
        allowedEndpointIds: [remoteEndpointId],
        expectedExecutionFamily: REMOTE_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.remoteModelId,
          messages: buildToolContinuationMessages(
            "Craft continuation corpus",
            suffix,
            "runtime_vendor_chat_tool_1",
          ),
          tools: buildChatTools(12),
        },
      },
      {
        caseId: `craft.chat.long-context.${suffix}`,
        clientKind: "craft",
        category: "long-context",
        requestPath: "/v1/chat/completions",
        runtimeKind: "hybrid",
        routingConstraint: `exact-model:${plan.remoteModelId}`,
        allowedEndpointIds: [remoteEndpointId],
        expectedExecutionFamily: REMOTE_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.remoteModelId,
          messages: [{ role: "user", content: buildLongContext("CRAFT_LONG_CONTEXT", index) }],
        },
      },
      {
        caseId: `craft.chat.inline-image.${suffix}`,
        clientKind: "craft",
        category: "image-sensitive",
        requestPath: "/v1/chat/completions",
        runtimeKind: "hybrid",
        routingConstraint: `alias:${plan.codexAliasModelId}`,
        allowedEndpointIds: codexAliasEndpoints,
        expectedExecutionFamily: CODEX_EXECUTION_FAMILY,
        expectedOutcomeClass: "success",
        body: {
          model: plan.codexAliasModelId,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: `Describe this image for Craft case ${suffix}.` },
                { type: "image", data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB" },
              ],
            },
          ],
        },
      },
    );
  }

  return cases;
}

async function allocatePort(): Promise<number> {
  return await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to reserve a loopback port for vendor validation."));
        return;
      }
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function writeVendorValidationSupportScript(input: {
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly fileName: string;
  readonly contents: string;
}): Promise<string> {
  const supportDir = path.join(input.runtimeStateRoot, `${input.scopeId}-support`);
  await mkdir(supportDir, { recursive: true });
  const scriptPath = path.join(supportDir, input.fileName);
  await writeFile(scriptPath, input.contents, "utf8");
  return scriptPath;
}

function createRealLocalConfig(input: {
  readonly localModelId: string;
  readonly localUpstreamScriptPath: string;
}): RuntimeValidationConfig & { readonly llama_swap: LlamaSwapValidationConfig } {
  const quotedNodePath = JSON.stringify(process.execPath);
  const quotedScriptPath = JSON.stringify(input.localUpstreamScriptPath);
  return {
    ...createDecisionConfig(),
    llama_swap: {
      models: {
        [input.localModelId]: {
          path: "./models/llama-3.1-8b-instruct-q4.gguf",
          command: `${quotedNodePath} ${quotedScriptPath} \${PORT}`,
          check_endpoint: "/health",
          use_model_name: "mock/llama-upstream",
          max_difficulty: "easy",
        },
      },
    },
  };
}

function createRealRemoteConfig(input: {
  readonly remoteModelId: string;
  readonly remoteUpstreamApiBaseUrl: string;
}): RuntimeValidationConfig & { readonly litellm_proxy: LiteLLMValidationConfig } {
  return {
    ...createDecisionConfig(),
    litellm_proxy: {
      providers: {
        openai: {
          api_key: "${OPENAI_API_KEY}",
          model_list: [
            {
              model_name: input.remoteModelId,
              max_difficulty: "hard",
              litellm_params: {
                model: "openai/gpt-4.1-mini",
                api_base: input.remoteUpstreamApiBaseUrl,
              },
            },
          ],
        },
      },
    },
  };
}

export async function createRuntimeVendorValidationPlan(options: {
  readonly runtimeStateRoot: string;
  readonly scopeId?: string;
  readonly harnessMode?: RuntimeVendorValidationHarnessMode;
}): Promise<RuntimeVendorValidationPlan> {
  const scopePrefix = options.scopeId ?? "runtime-vendor-validation";
  const harnessMode = options.harnessMode ?? "real";
  const aliasModelId = "baseline.hybrid";
  const difficultyAliasModelId = "difficulty.hybrid";
  const intelligentAliasModelId = "controller.hybrid";
  const codexAliasModelId = "difficulty.remote-only";
  const localModelId = "local/llama-3.1-8b-instruct";
  const remoteModelId = "openai/gpt-4.1-mini-fast";
  const codexModelId = "chatgpt/gpt-5.4";

  if (harnessMode === "mock") {
    const localConfig = createMockLocalConfig(localModelId);
    const remoteConfig = createMockRemoteConfig(remoteModelId);
    return {
      aliasModelId,
      difficultyAliasModelId,
      intelligentAliasModelId,
      codexAliasModelId,
      localModelId,
      remoteModelId,
      codexModelId,
      decisionConfig: createDecisionConfig(),
      localConfig,
      remoteConfig,
      hybridConfig: {
        ...createDecisionConfig(),
        difficulty_classifier: {
          enabled: true,
          rubric_version: "v1",
          source_type: "remote",
          model_id: remoteModelId,
          timeout_ms: 1500,
          fallback_difficulty: "medium",
        },
        controller: {
          enabled: true,
          source_type: "remote",
          model_id: remoteModelId,
          timeout_ms: 1500,
        },
        model_aliases: {
          [aliasModelId]: {
            model_ids: [localModelId, remoteModelId],
          },
          [difficultyAliasModelId]: {
            mode: "difficulty",
            model_ids: [localModelId, remoteModelId],
          },
          [intelligentAliasModelId]: {
            mode: "intelligent",
            model_ids: [localModelId, remoteModelId],
          },
          [codexAliasModelId]: {
            mode: "difficulty",
            model_ids: [remoteModelId, codexModelId],
          },
        },
        llama_swap: localConfig.llama_swap,
        litellm_proxy: remoteConfig.litellm_proxy,
      },
      vendorHarness: {
        local: "managed-node-mock",
        remote: "managed-node-mock",
        realVendorCoverage: false,
      },
      remoteUpstream: null,
    };
  }

  const localUpstreamScriptPath = await writeVendorValidationSupportScript({
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: scopePrefix,
    fileName: "local-llama-upstream.cjs",
    contents: createSimpleLocalVendorScript(),
  });
  const remoteUpstreamScriptPath = await writeVendorValidationSupportScript({
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: scopePrefix,
    fileName: "remote-openai-upstream.cjs",
    contents: createRemoteVendorScript(),
  });
  const remoteUpstreamPort = await allocatePort();
  const remoteUpstreamApiBaseUrl = `http://127.0.0.1:${remoteUpstreamPort}/v1`;

  const localConfig = createRealLocalConfig({
    localModelId,
    localUpstreamScriptPath,
  });
  const remoteConfig = createRealRemoteConfig({
    remoteModelId,
    remoteUpstreamApiBaseUrl,
  });

  return {
    aliasModelId,
    difficultyAliasModelId,
    intelligentAliasModelId,
    codexAliasModelId,
    localModelId,
    remoteModelId,
    codexModelId,
    decisionConfig: createDecisionConfig(),
    localConfig,
    remoteConfig,
    hybridConfig: {
      ...createDecisionConfig(),
      difficulty_classifier: {
        enabled: true,
        rubric_version: "v1",
        source_type: "remote",
        model_id: remoteModelId,
        timeout_ms: 1500,
        fallback_difficulty: "medium",
      },
      controller: {
        enabled: true,
        source_type: "remote",
        model_id: remoteModelId,
        timeout_ms: 1500,
      },
      model_aliases: {
        [aliasModelId]: {
          model_ids: [localModelId, remoteModelId],
        },
        [difficultyAliasModelId]: {
          mode: "difficulty",
          model_ids: [localModelId, remoteModelId],
        },
        [intelligentAliasModelId]: {
          mode: "intelligent",
          model_ids: [localModelId, remoteModelId],
        },
        [codexAliasModelId]: {
          mode: "difficulty",
          model_ids: [remoteModelId, codexModelId],
        },
      },
      llama_swap: localConfig.llama_swap,
      litellm_proxy: remoteConfig.litellm_proxy,
    },
    vendorHarness: {
      local: "real-llama-swap-mock-upstream",
      remote: "real-litellm-mock-upstream",
      realVendorCoverage: true,
    },
    remoteUpstream: {
      port: remoteUpstreamPort,
      scriptPath: remoteUpstreamScriptPath,
      apiBaseUrl: remoteUpstreamApiBaseUrl,
      healthUrl: `http://127.0.0.1:${remoteUpstreamPort}/health/liveliness`,
    },
  };
}

async function waitForHealthOk(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = undefined;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Health probe returned ${response.status} for ${url}.`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(
    `Timed out waiting for vendor-validation upstream health at ${url}: ${String(lastError)}`,
  );
}

async function stopProcessTree(child: ChildProcess): Promise<void> {
  if (child.pid == null || child.exitCode !== null) {
    return;
  }
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } else {
    child.kill("SIGTERM");
  }

  const deadline = Date.now() + 10_000;
  while (child.exitCode === null && Date.now() < deadline) {
    await delay(100);
  }

  if (child.exitCode === null && child.pid != null) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      child.kill("SIGKILL");
    }
  }
}

async function startRemoteUpstreamProcess(input: {
  readonly scriptPath: string;
  readonly port: number;
  readonly healthUrl: string;
}): Promise<{ readonly close: () => Promise<void> }> {
  const child = spawn(process.execPath, [input.scriptPath, String(input.port)], {
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: String(input.port),
    },
    windowsHide: true,
  });
  await waitForHealthOk(input.healthUrl);
  return {
    close: async () => {
      await stopProcessTree(child);
    },
  };
}

function createValidationCodexAuthAdapter() {
  return {
    startDeviceCodeLogin: async () => ({
      loginId: "login-runtime-vendor-codex-001",
      verificationUrl: "https://auth.openai.com/codex/device",
      userCode: "VRUN-6201",
      wsUrl: "ws://127.0.0.1:4595",
      pid: 4595,
    }),
    readAccount: async ({ codexHome }: { readonly codexHome: string }) => {
      await mkdir(codexHome, { recursive: true });
      await writeFile(
        path.join(codexHome, "auth.json"),
        JSON.stringify(
          {
            auth_mode: "chatgpt",
            tokens: {
              access_token: "codex-access-runtime-vendor-001",
              refresh_token: "codex-refresh-runtime-vendor-001",
              account_id: "codex-account-runtime-vendor-001",
            },
            last_refresh: "2026-07-08T09:00:00.000Z",
          },
          null,
          2,
        ),
        "utf8",
      );
      return {
        account: {
          type: "chatgpt",
          email: "runtime-vendor@example.com",
          planType: "pro",
        },
        requiresOpenaiAuth: true,
      };
    },
  };
}

function createValidationCodexExecutionAdapter() {
  return {
    executeRequest: async ({
      requestId,
      requestCapture,
    }: {
      readonly requestId: string;
      readonly requestCapture: {
        readonly url: string;
      };
    }) => {
      if (requestCapture.url.endsWith("/v1/responses")) {
        return {
          statusCode: 200,
          body: {
            id: `resp-${requestId}`,
            output: [
              {
                type: "message",
                role: "assistant",
                content: [{ type: "output_text", text: "IMAGE_OK" }],
              },
            ],
            usage: {
              input_tokens: 24,
              output_tokens: 2,
            },
          },
          vendorMetadata: {
            vendorId: "chatgpt-codex-responses",
            latencyMs: 8,
          },
        };
      }
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
                content: "IMAGE_OK",
              },
            },
          ],
          usage: {
            prompt_tokens: 24,
            completion_tokens: 2,
          },
        },
        vendorMetadata: {
          vendorId: "chatgpt-codex-responses",
          latencyMs: 8,
        },
      };
    },
  };
}

async function startRuntimeForConfig(input: {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly config: Record<string, unknown>;
  readonly codex?: {
    readonly providerAccountId: string;
    readonly modelId: string;
  };
}) {
  const configDir = path.join(input.runtimeStateRoot, input.scopeId);
  await mkdir(configDir, { recursive: true });
  const configPath = path.join(configDir, "runtime-config.yaml");
  await writeFile(configPath, stringify(input.config), "utf8");

  const backend = await createRuntimeBridgeBackend({
    fixtureRoot: path.join(input.repoRoot, "testdata", "router-runtime"),
    repoRoot: input.repoRoot,
    runtimeStateRoot: input.runtimeStateRoot,
    scopeId: input.scopeId,
    unifiedRuntimeConfigPath: configPath,
    ...(input.codex
      ? {
          codexAuthAdapter: createValidationCodexAuthAdapter(),
          codexExecutionAdapter: createValidationCodexExecutionAdapter(),
        }
      : {}),
  });
  if (input.codex) {
    const pending = await backend.startProviderDeviceAuthorization({
      providerAccountId: input.codex.providerAccountId,
      providerId: "openai",
      providerKind: "provider-openai",
      variantId: "openai-codex-subscription",
      orgScope: "personal",
      accountScope: "workspace-default",
      allowedModels: [input.codex.modelId],
      deniedModels: [],
      entitlementTags: ["chat"],
      budgetPolicyRef: "budget.default",
      quotaPolicyRef: "quota.default",
    });
    await backend.pollProviderDeviceAuthorization({
      authRequestId: pending.authRequestId,
    });
    await backend.activateEndpoint({
      providerAccountId: input.codex.providerAccountId,
      modelId: input.codex.modelId,
      region: "global",
    });
    await backend.updateRuntimeConfig({});
  }
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: backend.effectiveRegistry,
    getRegistry: () => backend.effectiveRegistry,
    executeChatCompletions: backend.executeChatCompletions,
    executeResponses: backend.executeResponses,
    readRuntimeSummary: backend.readRuntimeSummary,
    readRuntimeConfig: backend.readRuntimeConfig,
    updateRuntimeConfig: backend.updateRuntimeConfig,
    readHealthStatus: backend.readHealthStatus,
    readTelemetrySummary: backend.readTelemetrySummary,
    listTelemetryComparisonRows: backend.listTelemetryComparisonRows,
    listTelemetryRequests: backend.listTelemetryRequests,
    subscribeTelemetry: backend.subscribeTelemetry,
    listProviders: backend.listProviders,
    listRoles: backend.listRoles,
    listAccounts: backend.listAccounts,
    upsertProviderAccount: backend.upsertProviderAccount,
    startProviderDeviceAuthorization: backend.startProviderDeviceAuthorization,
    pollProviderDeviceAuthorization: backend.pollProviderDeviceAuthorization,
    activateEndpoint: backend.activateEndpoint,
    readControllerAssignment: backend.readControllerAssignment,
    updateControllerAssignment: backend.updateControllerAssignment,
    listEndpoints: backend.listEndpoints,
    listRecentRequestObservations: backend.listRecentRequestObservations,
    readRequestObservation: backend.readRequestObservation,
    readEndpointProfile: backend.readEndpointProfile,
  });

  return {
    backend,
    server,
    baseUrl: `http://127.0.0.1:${server.port}`,
    async close(): Promise<void> {
      await server.close();
      await backend.shutdown();
    },
  };
}

async function readObservationWithRetry(
  backend: Pick<RuntimeBridgeBackend, "readRequestObservation">,
  requestId: string,
  attempts = 5,
): Promise<RuntimeVendorObservation> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const observation = await backend.readRequestObservation(requestId);
    if (observation) {
      return observation;
    }
    if (attempt < attempts) {
      await delay(25);
    }
  }
  return null;
}

async function resolveRuntimeRequestId(
  backend: Pick<RuntimeBridgeBackend, "listTelemetryRequests">,
  clientRequestId: string,
  attempts = 5,
): Promise<string | null> {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const match = (await backend.listTelemetryRequests({ limit: 20 })).find(
      (record) => record.clientRequestId === clientRequestId,
    );
    if (match?.requestId) {
      return match.requestId;
    }
    if (attempt < attempts) {
      await delay(25);
    }
  }
  return null;
}

async function runDeterministicRuntimeVendorCorpus(input: {
  readonly plan: RuntimeVendorValidationPlan;
  readonly decisionRuntime: Awaited<ReturnType<typeof startRuntimeForConfig>>;
  readonly hybridRuntime: Awaited<ReturnType<typeof startRuntimeForConfig>>;
}): Promise<RuntimeVendorCorpusResult> {
  const caseDefinitions = [...buildPiCorpusCases(input.plan), ...buildCraftCorpusCases(input.plan)];
  const caseRecords: RuntimeVendorCorpusCaseRecord[] = [];

  for (const definition of caseDefinitions) {
    const requestId = `req-${definition.caseId.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
    const runtime =
      definition.runtimeKind === "decision" ? input.decisionRuntime : input.hybridRuntime;
    const response =
      definition.requestPath === "/v1/responses"
        ? await postJsonRequest(
            runtime.baseUrl,
            "/v1/responses",
            requestId,
            definition.body,
            definition.headers,
          )
        : await postChatCompletions(
            runtime.baseUrl,
            requestId,
            definition.body,
            definition.headers,
          );
    const runtimeRequestId = await resolveRuntimeRequestId(runtime.backend, requestId);
    const observation = runtimeRequestId
      ? await readObservationWithRetry(runtime.backend, runtimeRequestId)
      : null;
    const record = buildCorpusCaseRecord({
      definition,
      requestId: runtimeRequestId ?? requestId,
      response,
      observation,
    });

    if (record.actualOutcomeClass !== definition.expectedOutcomeClass) {
      throw new Error(
        `Corpus case ${definition.caseId} produced outcome ${record.actualOutcomeClass} instead of ${definition.expectedOutcomeClass} (status=${record.statusCode}, failure=${record.failureClass ?? "none"}).`,
      );
    }
    const expectedExecutionFamilies: readonly (string | null)[] =
      definition.expectedExecutionFamilies ?? [definition.expectedExecutionFamily];
    if (!expectedExecutionFamilies.includes(record.actualExecutionFamily)) {
      throw new Error(
        `Corpus case ${definition.caseId} produced execution family ${record.actualExecutionFamily ?? "null"} instead of ${expectedExecutionFamilies.map((family) => family ?? "null").join(" or ")}.`,
      );
    }
    if (definition.expectedOutcomeClass === "success") {
      if (!observation) {
        throw new Error(`Corpus case ${definition.caseId} is missing request-detail evidence.`);
      }
      if (!record.routingDecisionId) {
        throw new Error(`Corpus case ${definition.caseId} is missing a routing decision id.`);
      }
      if (
        record.payloadBytes.translated === null ||
        record.payloadBytes.providerCanonical === null ||
        record.payloadBytes.providerWire === null ||
        record.payloadBytes.providerResponse === null
      ) {
        throw new Error(
          `Corpus case ${definition.caseId} is missing provider payload-byte evidence.`,
        );
      }
    }

    caseRecords.push(record);
  }

  return {
    summary: summarizeCorpusCases(caseRecords),
    cases: caseRecords,
  };
}

export async function runRuntimeVendorValidation(options: {
  readonly repoRoot: string;
  readonly runtimeStateRoot?: string;
  readonly scopeId?: string;
  readonly harnessMode?: RuntimeVendorValidationHarnessMode;
}): Promise<{
  decisionOnly: {
    statusCode: number;
    errorClass: string;
  };
  localOnly: {
    executionMode: string;
    vendorId: string | undefined;
    outputText: string;
    responseHeaders: Record<string, string>;
  };
  remoteOnly: {
    executionMode: string;
    vendorId: string | undefined;
    outputText: string;
    costUsd: number | undefined;
    responseHeaders: Record<string, string>;
  };
  streaming: {
    local: {
      vendorId: string | undefined;
      outputText: string;
      chunkCount: number;
    };
    remote: {
      vendorId: string | undefined;
      outputText: string;
      chunkCount: number;
    };
  };
  hybrid: {
    executionMode: string;
    localVendorId: string | undefined;
    remoteVendorId: string | undefined;
  };
  modeMatrix: {
    baseline: {
      vendorId: string | undefined;
      observation: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
    };
    difficulty: {
      vendorId: string | undefined;
      observation: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
    };
    controller: {
      vendorId: string | undefined;
      observation: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
    };
    hybrid: {
      vendorId: string | undefined;
      observation: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
    };
  };
  difficultyHybrid: {
    easyVendorId: string | undefined;
    hardVendorId: string | undefined;
    easyObservation: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
    hardObservation: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
    repeatObservation: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
  };
  intelligentHybrid: {
    vendorId: string | undefined;
    outputText: string;
    observation: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
  };
  controllerFallback: {
    vendorId: string | undefined;
    outputText: string;
    observation: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
  };
  aliasHybrid: {
    vendorId: string | undefined;
    outputText: string;
    observation: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
  };
  vendorHarness: {
    local: "managed-node-mock" | "real-llama-swap-mock-upstream";
    remote: "managed-node-mock" | "real-litellm-mock-upstream";
    realVendorCoverage: boolean;
  };
  health: unknown;
  telemetry: {
    summary: Awaited<ReturnType<RuntimeBridgeBackend["readTelemetrySummary"]>>;
    rows: Awaited<ReturnType<RuntimeBridgeBackend["listTelemetryComparisonRows"]>>;
    requests: Awaited<ReturnType<RuntimeBridgeBackend["listTelemetryRequests"]>>;
  };
  observations: {
    local: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
    remote: Awaited<ReturnType<RuntimeBridgeBackend["readRequestObservation"]>>;
  };
  observedProfiles: {
    local: Awaited<ReturnType<RuntimeBridgeBackend["readEndpointProfile"]>>;
    remote: Awaited<ReturnType<RuntimeBridgeBackend["readEndpointProfile"]>>;
  };
  corpus: RuntimeVendorCorpusResult;
}> {
  const runtimeStateRoot =
    options.runtimeStateRoot ??
    (await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-vendors-")));
  const scopePrefix = options.scopeId ?? "runtime-vendor-validation";
  const previousOpenAiApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = previousOpenAiApiKey || "runtime-vendor-validation-key";
  const plan = await createRuntimeVendorValidationPlan({
    runtimeStateRoot,
    scopeId: scopePrefix,
    harnessMode: options.harnessMode,
  });

  const decisionRuntime = await startRuntimeForConfig({
    repoRoot: options.repoRoot,
    runtimeStateRoot,
    scopeId: `${scopePrefix}-decision`,
    config: plan.decisionConfig,
  });
  try {
    const remoteUpstream =
      plan.remoteUpstream == null
        ? null
        : await startRemoteUpstreamProcess({
            scriptPath: plan.remoteUpstream.scriptPath,
            port: plan.remoteUpstream.port,
            healthUrl: plan.remoteUpstream.healthUrl,
          });
    try {
      const decisionResponse = await postResponses(
        decisionRuntime.baseUrl,
        plan.remoteModelId,
        "req-runtime-vendor-decision",
      );
      const decisionBody = decisionResponse.body as {
        error?: {
          type?: string;
        };
      };

      const localRuntime = await startRuntimeForConfig({
        repoRoot: options.repoRoot,
        runtimeStateRoot,
        scopeId: `${scopePrefix}-local`,
        config: plan.localConfig,
      });
      try {
        await waitForRuntimeModelEndpointsReady(localRuntime.backend, [plan.localModelId]);
        const localResponse = await postResponses(
          localRuntime.baseUrl,
          plan.localModelId,
          "req-runtime-vendor-local",
        );
        const localStreaming = await collectStreamedResponse(
          localRuntime.backend,
          plan.localModelId,
          "req-runtime-vendor-local-stream",
        );
        const localDirect = await localRuntime.backend.executeResponses(
          {
            model: plan.localModelId,
            input: "Summarize the chosen endpoint.",
          },
          "req-runtime-vendor-local-direct",
        );

        const remoteRuntime = await startRuntimeForConfig({
          repoRoot: options.repoRoot,
          runtimeStateRoot,
          scopeId: `${scopePrefix}-remote`,
          config: plan.remoteConfig,
        });
        try {
          await waitForRuntimeModelEndpointsReady(remoteRuntime.backend, [plan.remoteModelId]);
          const remoteResponse = await postResponses(
            remoteRuntime.baseUrl,
            plan.remoteModelId,
            "req-runtime-vendor-remote",
          );
          const remoteStreaming = await collectStreamedResponse(
            remoteRuntime.backend,
            plan.remoteModelId,
            "req-runtime-vendor-remote-stream",
          );
          const remoteDirect = await remoteRuntime.backend.executeResponses(
            {
              model: plan.remoteModelId,
              input: "Summarize the chosen endpoint.",
            },
            "req-runtime-vendor-remote-direct",
          );

          const hybridRuntime = await startRuntimeForConfig({
            repoRoot: options.repoRoot,
            runtimeStateRoot,
            scopeId: `${scopePrefix}-hybrid`,
            config: plan.hybridConfig,
            codex: {
              providerAccountId: VALIDATION_CODEX_PROVIDER_ACCOUNT_ID,
              modelId: plan.codexModelId,
            },
          });
          try {
            await waitForRuntimeModelEndpointsReady(hybridRuntime.backend, [
              plan.localModelId,
              plan.remoteModelId,
            ]);
            const hybridLocal = await hybridRuntime.backend.executeResponses(
              {
                model: plan.localModelId,
                input: "Summarize the chosen endpoint.",
              },
              "req-runtime-vendor-hybrid-local",
            );
            const hybridRemote = await hybridRuntime.backend.executeResponses(
              {
                model: plan.remoteModelId,
                input: "Summarize the chosen endpoint.",
              },
              "req-runtime-vendor-hybrid-remote",
            );
            const hybridAlias = await hybridRuntime.backend.executeResponses(
              {
                model: plan.aliasModelId,
                input: "Summarize the chosen endpoint.",
              },
              "req-runtime-vendor-hybrid-alias",
            );
            const modeMatrixPrompt = "Prefer the strongest remote endpoint for this request.";
            const modeMatrixBaseline = await hybridRuntime.backend.executeResponses(
              {
                model: plan.aliasModelId,
                input: modeMatrixPrompt,
              },
              "req-runtime-vendor-mode-baseline",
              undefined,
              {
                routingModeOverride: "baseline",
              },
            );
            const modeMatrixDifficulty = await hybridRuntime.backend.executeResponses(
              {
                model: plan.aliasModelId,
                input: modeMatrixPrompt,
              },
              "req-runtime-vendor-mode-difficulty",
              undefined,
              {
                routingModeOverride: "difficulty",
              },
            );
            const modeMatrixController = await hybridRuntime.backend.executeResponses(
              {
                model: plan.aliasModelId,
                input: modeMatrixPrompt,
              },
              "req-runtime-vendor-mode-controller",
              undefined,
              {
                routingModeOverride: "controller",
              },
            );
            const modeMatrixHybrid = await hybridRuntime.backend.executeResponses(
              {
                model: plan.aliasModelId,
                input: modeMatrixPrompt,
              },
              "req-runtime-vendor-mode-hybrid",
              undefined,
              {
                routingModeOverride: "hybrid",
              },
            );
            const hybridIntelligent = await hybridRuntime.backend.executeResponses(
              {
                model: plan.intelligentAliasModelId,
                input: "Prefer the strongest remote endpoint for this request.",
              },
              "req-runtime-vendor-hybrid-intelligent",
            );
            const hybridControllerFallback = await hybridRuntime.backend.executeResponses(
              {
                model: plan.intelligentAliasModelId,
                input:
                  "invalid-controller-fallback: preserve the baseline alias route when controller output is invalid.",
              },
              "req-runtime-vendor-hybrid-controller-fallback",
            );
            const hybridDifficultyEasy = await hybridRuntime.backend.executeResponses(
              {
                model: plan.difficultyAliasModelId,
                input: "Say hello in one sentence.",
              },
              "req-runtime-vendor-hybrid-difficulty-easy",
            );
            const hybridDifficultyHard = await hybridRuntime.backend.executeResponses(
              {
                model: plan.difficultyAliasModelId,
                input:
                  "Analyze this code-edit workflow, apply multiple constraints, verify the final contract end to end, and decompose the work before producing the answer.",
                tools: [
                  {
                    type: "function",
                    name: "readSchema",
                    description: "Read the current schema before editing.",
                    parameters: {
                      type: "object",
                      properties: {},
                    },
                  },
                  {
                    type: "function",
                    name: "runTests",
                    description: "Run the relevant verification suite after the change.",
                    parameters: {
                      type: "object",
                      properties: {},
                    },
                  },
                ],
              },
              "req-runtime-vendor-hybrid-difficulty-hard",
            );
            const hybridRepeatRuntime = await startRuntimeForConfig({
              repoRoot: options.repoRoot,
              runtimeStateRoot,
              scopeId: `${scopePrefix}-hybrid-repeat`,
              config: {
                ...plan.hybridConfig,
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
              },
              codex: {
                providerAccountId: VALIDATION_CODEX_PROVIDER_ACCOUNT_ID,
                modelId: plan.codexModelId,
              },
            });
            let hybridDifficultyRepeatObservation: Awaited<
              ReturnType<RuntimeBridgeBackend["readRequestObservation"]>
            > | null = null;
            try {
              await hybridRepeatRuntime.backend.executeResponses(
                {
                  model: plan.difficultyAliasModelId,
                  input:
                    "Analyze this code-edit workflow, apply multiple constraints, verify the final contract end to end, and decompose the work before producing the answer.",
                  tools: [
                    {
                      type: "function",
                      name: "readSchema",
                      description: "Read the current schema before editing.",
                      parameters: {
                        type: "object",
                        properties: {},
                      },
                    },
                    {
                      type: "function",
                      name: "runTests",
                      description: "Run the relevant verification suite after the change.",
                      parameters: {
                        type: "object",
                        properties: {},
                      },
                    },
                  ],
                },
                "req-runtime-vendor-hybrid-repeat-seed-hard",
              );
              await hybridRepeatRuntime.backend.executeResponses(
                {
                  model: plan.difficultyAliasModelId,
                  input: "Say hello in one sentence.",
                },
                "req-runtime-vendor-hybrid-difficulty-repeat",
              );
              hybridDifficultyRepeatObservation =
                await hybridRepeatRuntime.backend.readRequestObservation(
                  "req-runtime-vendor-hybrid-difficulty-repeat",
                );
            } finally {
              await hybridRepeatRuntime.close();
            }
            const healthResponse = await fetch(`${hybridRuntime.baseUrl}/healthz`);
            const telemetrySummary = await hybridRuntime.backend.readTelemetrySummary();
            const telemetryRows = await hybridRuntime.backend.listTelemetryComparisonRows();
            const telemetryRequests = await hybridRuntime.backend.listTelemetryRequests({
              limit: 20,
            });
            const localObservation = await localRuntime.backend.readRequestObservation(
              "req-runtime-vendor-local-direct",
            );
            const remoteObservation = await remoteRuntime.backend.readRequestObservation(
              "req-runtime-vendor-remote-direct",
            );
            const hybridAliasObservation = await hybridRuntime.backend.readRequestObservation(
              "req-runtime-vendor-hybrid-alias",
            );
            const modeMatrixBaselineObservation =
              await hybridRuntime.backend.readRequestObservation(
                "req-runtime-vendor-mode-baseline",
              );
            const modeMatrixDifficultyObservation =
              await hybridRuntime.backend.readRequestObservation(
                "req-runtime-vendor-mode-difficulty",
              );
            const modeMatrixControllerObservation =
              await hybridRuntime.backend.readRequestObservation(
                "req-runtime-vendor-mode-controller",
              );
            const modeMatrixHybridObservation = await hybridRuntime.backend.readRequestObservation(
              "req-runtime-vendor-mode-hybrid",
            );
            const hybridIntelligentObservation = await hybridRuntime.backend.readRequestObservation(
              "req-runtime-vendor-hybrid-intelligent",
            );
            const hybridControllerFallbackObservation =
              await hybridRuntime.backend.readRequestObservation(
                "req-runtime-vendor-hybrid-controller-fallback",
              );
            const hybridDifficultyEasyObservation =
              await hybridRuntime.backend.readRequestObservation(
                "req-runtime-vendor-hybrid-difficulty-easy",
              );
            const hybridDifficultyHardObservation =
              await hybridRuntime.backend.readRequestObservation(
                "req-runtime-vendor-hybrid-difficulty-hard",
              );
            const localObservedProfile = await localRuntime.backend.readEndpointProfile(
              localDirect.endpointId,
            );
            const remoteObservedProfile = await remoteRuntime.backend.readEndpointProfile(
              remoteDirect.endpointId,
            );
            const corpus = await runDeterministicRuntimeVendorCorpus({
              plan,
              decisionRuntime,
              hybridRuntime,
            });
            return {
              decisionOnly: {
                statusCode: decisionResponse.statusCode,
                errorClass: decisionBody.error?.type ?? "UNKNOWN",
              },
              localOnly: {
                executionMode: (await localRuntime.backend.readRuntimeSummary()).executionMode,
                vendorId: localDirect.vendorId,
                outputText: localDirect.outputText,
                responseHeaders: localResponse.headers,
              },
              remoteOnly: {
                executionMode: (await remoteRuntime.backend.readRuntimeSummary()).executionMode,
                vendorId: remoteDirect.vendorId,
                outputText: remoteDirect.outputText,
                costUsd: remoteDirect.vendorMetadata?.costUsd,
                responseHeaders: remoteResponse.headers,
              },
              streaming: {
                local: localStreaming,
                remote: remoteStreaming,
              },
              hybrid: {
                executionMode: (await hybridRuntime.backend.readRuntimeSummary()).executionMode,
                localVendorId: hybridLocal.vendorId,
                remoteVendorId: hybridRemote.vendorId,
              },
              modeMatrix: {
                baseline: {
                  vendorId: modeMatrixBaseline.vendorId,
                  observation: modeMatrixBaselineObservation,
                },
                difficulty: {
                  vendorId: modeMatrixDifficulty.vendorId,
                  observation: modeMatrixDifficultyObservation,
                },
                controller: {
                  vendorId: modeMatrixController.vendorId,
                  observation: modeMatrixControllerObservation,
                },
                hybrid: {
                  vendorId: modeMatrixHybrid.vendorId,
                  observation: modeMatrixHybridObservation,
                },
              },
              difficultyHybrid: {
                easyVendorId: hybridDifficultyEasy.vendorId,
                hardVendorId: hybridDifficultyHard.vendorId,
                easyObservation: hybridDifficultyEasyObservation,
                hardObservation: hybridDifficultyHardObservation,
                repeatObservation: hybridDifficultyRepeatObservation,
              },
              intelligentHybrid: {
                vendorId: hybridIntelligent.vendorId,
                outputText: hybridIntelligent.outputText,
                observation: hybridIntelligentObservation,
              },
              controllerFallback: {
                vendorId: hybridControllerFallback.vendorId,
                outputText: hybridControllerFallback.outputText,
                observation: hybridControllerFallbackObservation,
              },
              aliasHybrid: {
                vendorId: hybridAlias.vendorId,
                outputText: hybridAlias.outputText,
                observation: hybridAliasObservation,
              },
              vendorHarness: {
                ...plan.vendorHarness,
              },
              health: await healthResponse.json(),
              telemetry: {
                summary: telemetrySummary,
                rows: telemetryRows,
                requests: telemetryRequests,
              },
              observations: {
                local: localObservation,
                remote: remoteObservation,
              },
              observedProfiles: {
                local: localObservedProfile,
                remote: remoteObservedProfile,
              },
              corpus,
            };
          } finally {
            await hybridRuntime.close();
          }
        } finally {
          await remoteRuntime.close();
        }
      } finally {
        await localRuntime.close();
      }
    } finally {
      await remoteUpstream?.close();
    }
  } finally {
    await decisionRuntime.close();
    if (!options.runtimeStateRoot) {
      await rm(runtimeStateRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    }
    if (previousOpenAiApiKey === undefined) {
      process.env.OPENAI_API_KEY = undefined;
    } else {
      process.env.OPENAI_API_KEY = previousOpenAiApiKey;
    }
  }
}

if (process.argv[1] === __filename) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const firstArg = process.argv[2];
  const secondArg = process.argv[3];
  const runtimeStateRoot = firstArg === "mock" || firstArg === "real" ? undefined : firstArg;
  const harnessArg = firstArg === "mock" || firstArg === "real" ? firstArg : secondArg;
  const harnessMode =
    harnessArg === "mock" || process.env.ROLE_MODEL_VENDOR_VALIDATION_HARNESS === "mock"
      ? "mock"
      : "real";
  void runRuntimeVendorValidation({ repoRoot, runtimeStateRoot, harnessMode }).then((result) => {
    console.log(JSON.stringify(result, null, 2));
  });
}
