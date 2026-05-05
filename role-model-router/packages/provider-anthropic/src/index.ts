import type {
  NormalizedProviderResponse,
  ProviderAdapter,
  ProviderAdapterExecutionContext,
  ProviderAdapterNormalizeContext,
  ProviderCapabilityMatrix,
  ProviderRequestCapture,
} from "@role-model-router/adapter-execution";

export function createAnthropicProviderAdapter(): ProviderAdapter {
  return {
    adapterFamily: "ai-sdk-anthropic",
    negotiateCapabilities: () => ({
      structuredOutputs: "json-fallback",
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
        supported: true,
        mode: "explicit",
      },
      usage: {
        inputTokens: true,
        outputTokens: true,
        cacheReadTokens: true,
        cacheWriteTokens: true,
      },
    }),
    buildRequest: buildAnthropicRequest,
    normalizeResponse: normalizeAnthropicResponse,
  };
}

function splitAnthropicMessages(
  messages: ProviderAdapterExecutionContext["executionRequest"]["messages"],
): { system: string | null; messages: Array<{ role: string; content: string }> } {
  const systemMessages = messages.filter((message) => message.role === "system");
  const chatMessages = messages.filter((message) => message.role !== "system");
  return {
    system: systemMessages.length > 0 ? systemMessages.map((message) => message.content).join("\n\n") : null,
    messages: chatMessages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  };
}

function toAnthropicTools(
  tools: NonNullable<ProviderAdapterExecutionContext["executionRequest"]["tools"]>,
): Array<Record<string, unknown>> {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
  }));
}

export function buildAnthropicRequest(
  input: ProviderAdapterExecutionContext & {
    readonly capabilities: ProviderCapabilityMatrix;
  },
): ProviderRequestCapture {
  const split = splitAnthropicMessages(input.executionRequest.messages);
  return {
    providerFamily: "ai-sdk-anthropic",
    endpointId: input.target.endpointId,
    url: `${input.target.apiBase}/messages`,
    headers: {
      "x-api-key": input.target.account?.credentialRef.ref ?? "ANTHROPIC_API_KEY",
      "anthropic-version": "2023-06-01",
      ...(input.executionRequest.promptCache && input.capabilities.promptCaching.supported
        ? { "anthropic-beta": "prompt-caching-2024-07-31" }
        : {}),
    },
    body: {
      model: input.target.modelId,
      messages: split.messages,
      ...(split.system ? { system: split.system } : {}),
      ...(typeof input.executionRequest.temperature === "number"
        ? { temperature: input.executionRequest.temperature }
        : {}),
      ...(typeof input.executionRequest.maxOutputTokens === "number"
        ? { max_tokens: input.executionRequest.maxOutputTokens }
        : {}),
      ...(input.executionRequest.stream ? { stream: true } : {}),
      ...(input.executionRequest.tools?.length
        ? { tools: toAnthropicTools(input.executionRequest.tools ?? []) }
        : {}),
    },
  };
}

export function normalizeAnthropicResponse(
  input: Omit<ProviderAdapterNormalizeContext, "executionRequest"> & {
    readonly executionRequest?: ProviderAdapterNormalizeContext["executionRequest"];
  },
): NormalizedProviderResponse {
  const body = input.responseCapture.body as {
    content?: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: unknown;
    }>;
    stop_reason?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };

  const outputText = (body.content ?? [])
    .filter((entry) => entry.type === "text")
    .map((entry) => entry.text ?? "")
    .filter(Boolean)
    .join("\n");

  const toolCalls = (body.content ?? [])
    .filter((entry) => entry.type === "tool_use" && entry.name)
    .map((entry) => ({
      name: entry.name ?? "unknown",
      arguments: entry.input ?? null,
      providerToolId: entry.id,
    }));

  const cacheReadTokens = body.usage?.cache_read_input_tokens ?? 0;
  const cacheWriteTokens = body.usage?.cache_creation_input_tokens ?? 0;

  return {
    providerFamily: "ai-sdk-anthropic",
    requestCapture: input.requestCapture,
    responseCapture: input.responseCapture,
    outputText,
    toolCalls,
    finishReason: body.stop_reason ?? "end_turn",
    structuredOutputMode: "json-fallback",
    stream: {
      requested: Boolean(
        input.executionRequest?.stream ??
          ((input.requestCapture.body.stream as boolean | undefined) ?? false),
      ),
      textDeltas: outputText ? 1 : 0,
      toolCallDeltas: toolCalls.length,
      toolArgumentDeltas: toolCalls.length,
    },
    promptCache: {
      requested: Boolean(
        input.executionRequest?.promptCache ??
          input.requestCapture.headers["anthropic-beta"],
      ),
      used: cacheReadTokens > 0 || cacheWriteTokens > 0,
      readTokens: cacheReadTokens,
      writeTokens: cacheWriteTokens,
    },
    usage: {
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0,
      cacheReadTokens,
      cacheWriteTokens,
    },
    errorClass: null,
    latencyMs: 140,
    diagnostics: [],
  };
}
