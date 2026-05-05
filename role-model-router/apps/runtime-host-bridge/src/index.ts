import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { NormalizedCatalog } from "@role-model-router/catalog";
import { assembleContextEnvelope } from "@role-model-router/context-envelope";
import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";
import { buildEndpointRegistry, type RegistrySources } from "@role-model-router/endpoint-registry";
import { routeRuntimeRequest, type RoutingModelSelection } from "@role-model-router/protocol-routing";
import { createAnthropicProviderAdapter } from "@role-model-router/provider-anthropic";
import { validateProviderAccounts } from "@role-model-router/provider-account";
import { createOpenAIProviderAdapter } from "@role-model-router/provider-openai";
import { createRetrievalReceipt } from "@role-model-router/retrieval-receipt";
import {
  initializeSqliteMemory,
  persistContinuitySnapshot,
  persistProviderAccounts,
  persistRetrievalReceipt,
  readConversationContinuity,
} from "@role-model-router/sqlite-memory";

import {
  executeRoutedRequest,
  type RuntimeExecutionRequest,
  type RuntimeResponseCaptureMap,
} from "@role-model-router/adapter-execution";

interface OpenAIChatCompletionsTool {
  readonly type: string;
  readonly function?: {
    readonly name: string;
    readonly description?: string;
    readonly parameters: Record<string, unknown>;
  };
}

interface OpenAIChatCompletionsMessage {
  readonly role: string;
  readonly content: string;
}

interface OpenAIChatCompletionsBody {
  readonly model: string;
  readonly messages: readonly OpenAIChatCompletionsMessage[];
  readonly tools?: readonly OpenAIChatCompletionsTool[];
  readonly stream?: boolean;
  readonly max_tokens?: number;
  readonly temperature?: number;
}

export interface BridgeModelRecord {
  readonly id: string;
  readonly object: "model";
  readonly owned_by: "role-model";
  readonly endpoint_ids: readonly string[];
}

export interface BridgeModelListResponse {
  readonly object: "list";
  readonly data: readonly BridgeModelRecord[];
}

export interface BridgeExecutionPlan {
  readonly routingRequest: {
    readonly requestId: string;
    readonly taskType: "text.chat";
    readonly requiredCapabilities: readonly ["text.chat"];
    readonly preferredCapabilities: readonly [];
    readonly requiredModalities: readonly ["text"];
    readonly contextTokens: number;
    readonly needsTools: boolean;
    readonly strategy: "balanced";
    readonly preferLocal: false;
    readonly allowEndpoints: readonly string[];
  };
  readonly executionRequest: {
    readonly messages: readonly OpenAIChatCompletionsMessage[];
    readonly tools?: readonly {
      readonly name: string;
      readonly description?: string;
      readonly inputSchema: Record<string, unknown>;
    }[];
    readonly stream?: boolean;
    readonly maxOutputTokens?: number;
    readonly temperature?: number;
  };
}

export interface BridgeServer {
  readonly port: number;
  close(): Promise<void>;
}

export interface BridgeChatCompletionsExecutionResult {
  readonly model: string;
  readonly endpointId: string;
  readonly adapterFamily: string;
  readonly outputText: string;
  readonly finishReason: string;
  readonly usage: {
    readonly inputTokens: number;
    readonly outputTokens: number;
  };
}

export interface StartBridgeServerOptions {
  readonly host: string;
  readonly port: number;
  readonly registry: EndpointRegistryResult;
  readonly executeChatCompletions: (
    body: OpenAIChatCompletionsBody,
    requestId: string,
  ) => Promise<BridgeChatCompletionsExecutionResult>;
}

export interface RuntimeBridgeBackend {
  readonly registry: EndpointRegistryResult;
  executeChatCompletions: (
    body: OpenAIChatCompletionsBody,
    requestId: string,
  ) => Promise<BridgeChatCompletionsExecutionResult>;
}

export interface CreateRuntimeBridgeBackendOptions {
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}

export interface BridgeServerOptions {
  readonly host: string;
  readonly port: number;
  readonly repoRoot: string;
  readonly runtimeStateRoot: string;
  readonly scopeId: string;
}

interface CaptureFixtureMap {
  readonly byEndpointId: Readonly<Record<string, { readonly responseFixture: string }>>;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en");
}

function estimateContextTokens(
  messages: readonly OpenAIChatCompletionsMessage[],
  toolCount: number,
): number {
  const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
  return Math.max(1, Math.ceil(totalChars / 4) + messages.length * 2 + toolCount);
}

function toToolDefinition(tool: OpenAIChatCompletionsTool): {
  readonly name: string;
  readonly description?: string;
  readonly inputSchema: Record<string, unknown>;
} {
  if (tool.type !== "function" || !tool.function) {
    throw new Error("Only OpenAI function tools are supported by the runtime host bridge.");
  }

  return {
    name: tool.function.name,
    description: tool.function.description,
    inputSchema: tool.function.parameters,
  };
}

function parseChatCompletionsBody(body: Record<string, unknown>): OpenAIChatCompletionsBody {
  if (typeof body.model !== "string") {
    throw new Error("chat-completions request must include a string model");
  }
  if (!Array.isArray(body.messages)) {
    throw new Error("chat-completions request must include a messages array");
  }

  return body as unknown as OpenAIChatCompletionsBody;
}

export function createModelListResponse(
  registry: EndpointRegistryResult,
): BridgeModelListResponse {
  const byModelId = new Map<string, string[]>();

  for (const endpoint of registry.endpoints) {
    const current = byModelId.get(endpoint.identity.model_id) ?? [];
    current.push(endpoint.identity.endpoint_id);
    byModelId.set(endpoint.identity.model_id, current);
  }

  const data = [...byModelId.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([modelId, endpointIds]) => ({
      id: modelId,
      object: "model" as const,
      owned_by: "role-model" as const,
      endpoint_ids: [...endpointIds].sort(compareText),
    }));

  return {
    object: "list",
    data,
  };
}

export function mapChatCompletionsRequest(
  registry: EndpointRegistryResult,
  body: OpenAIChatCompletionsBody,
  requestId: string,
): BridgeExecutionPlan {
  const allowEndpoints = registry.endpoints
    .filter((endpoint) => endpoint.identity.model_id === body.model)
    .map((endpoint) => endpoint.identity.endpoint_id)
    .sort(compareText);

  if (allowEndpoints.length === 0) {
    throw new Error(`No registry endpoints are available for requested model ${body.model}.`);
  }

  const tools = body.tools?.map(toToolDefinition);

  return {
    routingRequest: {
      requestId,
      taskType: "text.chat",
      requiredCapabilities: ["text.chat"],
      preferredCapabilities: [],
      requiredModalities: ["text"],
      contextTokens: estimateContextTokens(body.messages, tools?.length ?? 0),
      needsTools: Boolean(tools?.length),
      strategy: "balanced",
      preferLocal: false,
      allowEndpoints,
    },
    executionRequest: {
      messages: body.messages,
      ...(tools?.length ? { tools } : {}),
      ...(typeof body.stream === "boolean" ? { stream: body.stream } : {}),
      ...(typeof body.max_tokens === "number"
        ? { maxOutputTokens: body.max_tokens }
        : {}),
      ...(typeof body.temperature === "number"
        ? { temperature: body.temperature }
        : {}),
    },
  };
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  headers?: Record<string, string>,
): void {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json");
  for (const [key, value] of Object.entries(headers ?? {})) {
    response.setHeader(key, value);
  }
  response.end(`${JSON.stringify(body)}\n`);
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

async function readJson<TValue>(filePath: string): Promise<TValue> {
  return JSON.parse(await readFile(filePath, "utf8")) as TValue;
}

async function loadResponseCaptures(
  repoRoot: string,
  fixtureMap: CaptureFixtureMap,
): Promise<RuntimeResponseCaptureMap> {
  const byEndpointId: Record<string, { body: unknown }> = {};
  for (const [endpointId, fixture] of Object.entries(fixtureMap.byEndpointId)) {
    byEndpointId[endpointId] = {
      body: await readJson<unknown>(
        path.join(repoRoot, "testdata", "router-runtime", fixture.responseFixture),
      ),
    };
  }

  return { byEndpointId };
}

function createChatCompletionsResponse(
  result: BridgeChatCompletionsExecutionResult,
): Record<string, unknown> {
  return {
    id: "chatcmpl-role-model",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: result.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: result.outputText,
        },
        finish_reason: result.finishReason,
      },
    ],
    usage: {
      prompt_tokens: result.usage.inputTokens,
      completion_tokens: result.usage.outputTokens,
      total_tokens: result.usage.inputTokens + result.usage.outputTokens,
    },
  };
}

function createUnsupportedStreamingResponse(): Record<string, unknown> {
  return {
    error: {
      message: "streaming chat completions are not yet supported by the runtime host bridge",
      type: "invalid_request_error",
    },
  };
}

function createRequestHandler(options: StartBridgeServerOptions) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (!request.url) {
      writeJson(response, 400, { error: "missing request URL" });
      return;
    }

    const url = new URL(request.url, `http://${options.host}`);

    if (request.method === "GET" && url.pathname === "/healthz") {
      writeJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/v1/models") {
      writeJson(response, 200, createModelListResponse(options.registry));
      return;
    }

    if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
      const requestId = request.headers["x-request-id"]?.toString() ?? "req-runtime-host-bridge";
      const body = await readJsonBody(request);
      const parsedBody = parseChatCompletionsBody(body);
      if (parsedBody.stream) {
        writeJson(response, 400, createUnsupportedStreamingResponse());
        return;
      }
      const result = await options.executeChatCompletions(parsedBody, requestId);
      writeJson(response, 200, createChatCompletionsResponse(result), {
        "x-role-model-endpoint-id": result.endpointId,
        "x-role-model-adapter-family": result.adapterFamily,
      });
      return;
    }

    writeJson(response, 404, { error: "not found" });
  };
}

function listen(server: Server, host: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("bridge server did not expose a TCP port"));
        return;
      }
      resolve(address.port);
    });
  });
}

export async function startBridgeServer(
  options: StartBridgeServerOptions,
): Promise<BridgeServer> {
  const server = createServer((request, response) => {
    void createRequestHandler(options)(request, response).catch((error: unknown) => {
      writeJson(response, 500, {
        error:
          error instanceof Error ? error.message : "runtime host bridge request failed",
      });
    });
  });
  const port = await listen(server, options.host, options.port);

  return {
    port,
    async close(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

export async function createRuntimeBridgeBackend(
  options: CreateRuntimeBridgeBackendOptions,
): Promise<RuntimeBridgeBackend> {
  const normalizedCatalog = await readJson<NormalizedCatalog>(
    path.join(
      options.repoRoot,
      "role-model-router",
      "packages",
      "catalog",
      "data",
      "normalized-catalog.json",
    ),
  );
  const providerAccountsFixture = await readJson<{ accounts: unknown[] }>(
    path.join(options.repoRoot, "testdata", "router-runtime", "provider-accounts.json"),
  );
  const registrySources = await readJson<RegistrySources>(
    path.join(options.repoRoot, "testdata", "router-runtime", "registry-sources.json"),
  );
  const continuityFixture = await readJson<{
    session: Parameters<typeof persistContinuitySnapshot>[0]["session"];
    conversation: Parameters<typeof persistContinuitySnapshot>[0]["conversation"];
    turns: Parameters<typeof persistContinuitySnapshot>[0]["turns"];
    artifacts: Parameters<typeof persistContinuitySnapshot>[0]["artifacts"];
    artifactLinks: Parameters<typeof persistContinuitySnapshot>[0]["artifactLinks"];
    handoffs: Parameters<typeof persistContinuitySnapshot>[0]["handoffs"];
    selection: {
      maxTurns: number;
      maxArtifacts: number;
      tokenBudget: number;
    };
  }>(path.join(options.repoRoot, "testdata", "router-runtime", "context-envelope.json"));
  const observedProfilesByEndpointId = await readJson<
    Parameters<typeof routeRuntimeRequest>[0]["observedProfilesByEndpointId"]
  >(path.join(options.repoRoot, "testdata", "router-runtime", "routing-observed-profiles.json"));
  const roleTaskFixture = await readJson<{
    roleDefinitions: Parameters<typeof routeRuntimeRequest>[0]["roleDefinitions"];
    taskDefinitions: Parameters<typeof routeRuntimeRequest>[0]["taskDefinitions"];
    roleBindings: Parameters<typeof routeRuntimeRequest>[0]["roleBindings"];
  }>(path.join(options.repoRoot, "testdata", "router-runtime", "adapter-role-task.json"));
  const routingModel = await readJson<RoutingModelSelection>(
    path.join(options.repoRoot, "testdata", "router-runtime", "routing-model-guidance.json"),
  );
  const captureFixtureMap = await readJson<CaptureFixtureMap>(
    path.join(options.repoRoot, "testdata", "router-runtime", "adapter-captures.json"),
  );

  const validation = validateProviderAccounts({
    catalog: normalizedCatalog,
    accounts: providerAccountsFixture.accounts,
  });
  if (validation.diagnostics.length > 0) {
    throw new Error("Provider-account validation failed for runtime host bridge.");
  }

  const initialization = initializeSqliteMemory({
    runtimeStateRoot: options.runtimeStateRoot,
    scopeId: options.scopeId,
  });

  persistProviderAccounts({
    databasePath: initialization.databasePath,
    accounts: validation.accounts,
  });
  persistContinuitySnapshot({
    databasePath: initialization.databasePath,
    session: continuityFixture.session,
    conversation: continuityFixture.conversation,
    turns: continuityFixture.turns,
    artifacts: continuityFixture.artifacts,
    artifactLinks: continuityFixture.artifactLinks,
    handoffs: continuityFixture.handoffs,
  });

  const registry = buildEndpointRegistry({
    catalog: normalizedCatalog,
    accounts: validation.accounts,
    sources: registrySources,
  });
  if (registry.diagnostics.length > 0) {
    throw new Error("Endpoint-registry validation failed for runtime host bridge.");
  }

  const continuity = readConversationContinuity({
    databasePath: initialization.databasePath,
    conversationId: continuityFixture.conversation.conversationId,
  });
  const envelope = assembleContextEnvelope({
    continuity,
    maxTurns: continuityFixture.selection.maxTurns,
    maxArtifacts: continuityFixture.selection.maxArtifacts,
    tokenBudget: continuityFixture.selection.tokenBudget,
  });
  const retrievalReceipt = createRetrievalReceipt({
    envelope,
    totalTurns: continuity.turns.length,
    totalArtifacts: continuity.artifacts.length,
  });
  persistRetrievalReceipt({
    databasePath: initialization.databasePath,
    retrievalReceiptId: retrievalReceipt.receiptId,
    conversationId: retrievalReceipt.conversationId,
    receiptSummary: JSON.stringify(retrievalReceipt.summary),
  });

  const captures = await loadResponseCaptures(options.repoRoot, captureFixtureMap);

  return {
    registry,
    async executeChatCompletions(
      body: OpenAIChatCompletionsBody,
      requestId: string,
    ): Promise<BridgeChatCompletionsExecutionResult> {
      const plan = mapChatCompletionsRequest(registry, body, requestId);
      const routed = routeRuntimeRequest({
        request: plan.routingRequest,
        registry,
        observedProfilesByEndpointId,
        envelope,
        retrievalReceipt,
        roleDefinitions: roleTaskFixture.roleDefinitions,
        taskDefinitions: roleTaskFixture.taskDefinitions,
        roleBindings: roleTaskFixture.roleBindings,
        routingModel,
      });
      const execution = executeRoutedRequest({
        routeResult: routed,
        catalog: normalizedCatalog,
        accounts: validation.accounts,
        registry,
        registrySources,
        executionRequest: plan.executionRequest as RuntimeExecutionRequest,
        adapters: [createOpenAIProviderAdapter(), createAnthropicProviderAdapter()],
        captures,
      });

      return {
        model: execution.target.modelId,
        endpointId: execution.target.endpointId,
        adapterFamily: execution.target.adapterFamily,
        outputText: execution.normalized.outputText,
        finishReason: execution.normalized.finishReason,
        usage: {
          inputTokens: execution.normalized.usage.inputTokens,
          outputTokens: execution.normalized.usage.outputTokens,
        },
      };
    },
  };
}

export function resolveBridgeServerOptions(input: {
  host?: string;
  port?: string;
  repoRoot?: string;
  runtimeStateRoot?: string;
  scopeId?: string;
}): BridgeServerOptions {
  if (!input.repoRoot) {
    throw new Error("repoRoot is required for the runtime host bridge.");
  }
  if (!input.runtimeStateRoot) {
    throw new Error("runtimeStateRoot is required for the runtime host bridge.");
  }

  return {
    host: input.host?.trim() || "127.0.0.1",
    port: input.port ? Number.parseInt(input.port, 10) : 8091,
    repoRoot: input.repoRoot,
    runtimeStateRoot: input.runtimeStateRoot,
    scopeId: input.scopeId?.trim() || "runtime-host-bridge",
  };
}
