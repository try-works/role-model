import path from "node:path";
import os from "node:os";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { stringify } from "yaml";

import {
  createRuntimeBridgeBackend,
  startBridgeServer,
  type RuntimeBridgeBackend,
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
  return `const http=require("node:http");const port=Number(process.env.PORT??process.argv[2]);const server=http.createServer((req,res)=>{if(req.url==="/health/liveliness"){res.statusCode=200;res.end("ok");return;}if(req.url==="/v1/responses"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedInput=typeof parsed.input==="string"?parsed.input:JSON.stringify(parsed.input??"");const isClassifier=joinedInput.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");const isController=joinedInput.includes("ROLE_MODEL_ROUTING_CONTROLLER");const isHardPrompt=joinedInput.includes("Analyze this code-edit workflow")||joinedInput.includes('\"toolCount\":2')||joinedInput.includes('\"toolCount\": 2')||joinedInput.includes('\"codeOrSchemaBurden\":true')||joinedInput.includes('\"codeOrSchemaBurden\": true');const classifierResponse=isHardPrompt?JSON.stringify({difficulty:"hard"}):JSON.stringify({difficulty:"easy"});const controllerResponse=joinedInput.includes("invalid-controller-fallback")?"not-json-controller-output":JSON.stringify({strategy:"quality",preferredEndpointIds:["openai.litellm.global.openai-gpt-4-1-mini-fast"]});const responseText=isController?controllerResponse:(isClassifier?classifierResponse:"remote litellm summary");if(parsed.stream){res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8"});res.write('data: {"type":"response.created","response":{"id":"resp-remote","created_at":1,"model":"openai/gpt-4.1-mini-fast"}}'+"\\n\\n");setTimeout(()=>{res.write('data: {"type":"response.output_text.delta","item_id":"msg_1","delta":'+JSON.stringify(responseText)+'}'+"\\n\\n");setTimeout(()=>{res.end('data: {"type":"response.completed","response":{"usage":{"input_tokens":14,"output_tokens":5}},"_hidden_params":{"response_cost":0.0042,"cache_hit":true}}'+"\\n\\n"+'data: [DONE]'+"\\n\\n");},10);},10);return;}res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"resp-remote",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:responseText}]}],usage:{input_tokens:14,output_tokens:5,prompt_tokens_details:{cached_tokens:9}},_hidden_params:{response_cost:0.0042,cache_hit:true}}));});return;}if(req.url==="/v1/chat/completions"){let body="";req.on("data",chunk=>body+=chunk);req.on("end",()=>{const parsed=JSON.parse(body||"{}");const joinedMessages=JSON.stringify(parsed.messages??[]);const isClassifier=joinedMessages.includes("ROLE_MODEL_DIFFICULTY_CLASSIFIER");const isController=joinedMessages.includes("ROLE_MODEL_ROUTING_CONTROLLER");const isHardPrompt=joinedMessages.includes("Analyze this code-edit workflow")||joinedMessages.includes('\"toolCount\":2')||joinedMessages.includes('\"toolCount\": 2')||joinedMessages.includes('\"codeOrSchemaBurden\":true')||joinedMessages.includes('\"codeOrSchemaBurden\": true');const classifierResponse=isHardPrompt?JSON.stringify({difficulty:"hard"}):JSON.stringify({difficulty:"easy"});const controllerResponse=joinedMessages.includes("invalid-controller-fallback")?"not-json-controller-output":JSON.stringify({strategy:"quality",preferredEndpointIds:["openai.litellm.global.openai-gpt-4-1-mini-fast"]});const responseText=isController?controllerResponse:(isClassifier?classifierResponse:"remote litellm summary");if(parsed.stream){res.writeHead(200,{"content-type":"text/event-stream; charset=utf-8"});res.write('data: {"id":"chat-remote","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{"role":"assistant","content":"remote "},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.write('data: {"id":"chat-remote","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{"content":"litellm summary"},"finish_reason":null}]}'+"\\n\\n");setTimeout(()=>{res.end('data: {"id":"chat-remote","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":14,"completion_tokens":5},"_hidden_params":{"response_cost":0.0042,"cache_hit":true}}'+"\\n\\n"+'data: [DONE]'+"\\n\\n");},10);},10);return;}res.setHeader("content-type","application/json");res.end(JSON.stringify({id:"chat-remote",object:"chat.completion",choices:[{index:0,message:{role:"assistant",content:responseText},finish_reason:"stop"}],usage:{prompt_tokens:14,completion_tokens:5,total_tokens:19},_hidden_params:{response_cost:0.0042,cache_hit:true}}));});return;}res.statusCode=404;res.end("missing");});server.listen(port,"127.0.0.1");const shutdown=()=>server.close(()=>process.exit(0));process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);`;
}

async function postResponses(
  baseUrl: string,
  model: string,
  requestId: string,
): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}> {
  const response = await fetch(`${baseUrl}/v1/responses`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
    },
    body: JSON.stringify({
      model,
      input: "Summarize the chosen endpoint.",
    }),
  });
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: await response.json(),
  };
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

export type RuntimeVendorValidationPlan = {
  readonly aliasModelId: string;
  readonly difficultyAliasModelId: string;
  readonly intelligentAliasModelId: string;
  readonly localModelId: string;
  readonly remoteModelId: string;
  readonly decisionConfig: RuntimeValidationConfig;
  readonly localConfig: RuntimeValidationConfig & { readonly llama_swap: LlamaSwapValidationConfig };
  readonly remoteConfig: RuntimeValidationConfig & { readonly litellm_proxy: LiteLLMValidationConfig };
  readonly hybridConfig: RuntimeValidationConfig & {
    readonly llama_swap: LlamaSwapValidationConfig;
    readonly litellm_proxy: LiteLLMValidationConfig;
  };
  readonly vendorHarness: RuntimeVendorHarnessSummary;
  readonly remoteUpstream:
    | {
        readonly port: number;
        readonly scriptPath: string;
        readonly apiBaseUrl: string;
        readonly healthUrl: string;
      }
    | null;
};

function createDecisionConfig(): RuntimeValidationConfig {
  return {
    version: "1.0",
    routing: {
      strategy: "balanced",
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
  const aliasModelId = "gpt-5.4";
  const difficultyAliasModelId = "gpt-5.4-difficulty";
  const intelligentAliasModelId = "gpt-5.4-intelligent";
  const localModelId = "local/llama-3.1-8b-instruct";
  const remoteModelId = "openai/gpt-4.1-mini-fast";

  if (harnessMode === "mock") {
    const localConfig = createMockLocalConfig(localModelId);
    const remoteConfig = createMockRemoteConfig(remoteModelId);
      return {
        aliasModelId,
        difficultyAliasModelId,
        intelligentAliasModelId,
        localModelId,
        remoteModelId,
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
    localModelId,
    remoteModelId,
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

async function startRuntimeForConfig(input: {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
  readonly config: Record<string, unknown>;
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
  });
  const server = await startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: backend.registry,
    getRegistry: () => backend.registry,
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
}> {
  const runtimeStateRoot =
    options.runtimeStateRoot ?? (await mkdtemp(path.join(os.tmpdir(), "role-model-runtime-vendors-")));
  const scopePrefix = options.scopeId ?? "runtime-vendor-validation";
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
        });
        try {
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
              input: "invalid-controller-fallback: preserve the baseline alias route when controller output is invalid.",
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
            hybridDifficultyRepeatObservation = await hybridRepeatRuntime.backend.readRequestObservation(
              "req-runtime-vendor-hybrid-difficulty-repeat",
            );
          } finally {
            await hybridRepeatRuntime.close();
          }
          const healthResponse = await fetch(`${hybridRuntime.baseUrl}/healthz`);
          const telemetrySummary = await hybridRuntime.backend.readTelemetrySummary();
          const telemetryRows = await hybridRuntime.backend.listTelemetryComparisonRows();
          const telemetryRequests = await hybridRuntime.backend.listTelemetryRequests({ limit: 20 });
          const localObservation = await localRuntime.backend.readRequestObservation(
            "req-runtime-vendor-local-direct",
          );
          const remoteObservation = await remoteRuntime.backend.readRequestObservation(
            "req-runtime-vendor-remote-direct",
          );
          const hybridAliasObservation = await hybridRuntime.backend.readRequestObservation(
            "req-runtime-vendor-hybrid-alias",
          );
          const modeMatrixBaselineObservation = await hybridRuntime.backend.readRequestObservation(
            "req-runtime-vendor-mode-baseline",
          );
          const modeMatrixDifficultyObservation = await hybridRuntime.backend.readRequestObservation(
            "req-runtime-vendor-mode-difficulty",
          );
          const modeMatrixControllerObservation = await hybridRuntime.backend.readRequestObservation(
            "req-runtime-vendor-mode-controller",
          );
          const modeMatrixHybridObservation = await hybridRuntime.backend.readRequestObservation(
            "req-runtime-vendor-mode-hybrid",
          );
          const hybridIntelligentObservation = await hybridRuntime.backend.readRequestObservation(
            "req-runtime-vendor-hybrid-intelligent",
          );
          const hybridControllerFallbackObservation = await hybridRuntime.backend.readRequestObservation(
            "req-runtime-vendor-hybrid-controller-fallback",
          );
          const hybridDifficultyEasyObservation = await hybridRuntime.backend.readRequestObservation(
            "req-runtime-vendor-hybrid-difficulty-easy",
          );
          const hybridDifficultyHardObservation = await hybridRuntime.backend.readRequestObservation(
            "req-runtime-vendor-hybrid-difficulty-hard",
          );
          const localObservedProfile = await localRuntime.backend.readEndpointProfile(localDirect.endpointId);
          const remoteObservedProfile = await remoteRuntime.backend.readEndpointProfile(remoteDirect.endpointId);
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
      await rm(runtimeStateRoot, { recursive: true, force: true });
    }
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").toString()) {
  const repoRoot = path.resolve(__dirname, "..", "..", "..", "..");
  const runtimeStateRoot = process.argv[2];
  const harnessMode =
    process.argv[3] === "mock" || process.env.ROLE_MODEL_VENDOR_VALIDATION_HARNESS === "mock"
      ? "mock"
      : "real";
  void runRuntimeVendorValidation({ repoRoot, runtimeStateRoot, harnessMode }).then((result) => {
    console.log(JSON.stringify(result, null, 2));
  });
}
