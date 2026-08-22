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

function readAnthropicMessageText(
  content: ProviderAdapterExecutionContext["executionRequest"]["messages"][number]["content"],
): string {
  if (typeof content === "string") {
    return content;
  }
  if (content === null || content === undefined) {
    return "";
  }
  return content
    .map((entry) => (typeof entry?.text === "string" ? entry.text : ""))
    .filter(Boolean)
    .join("\n");
}

function splitAnthropicMessages(
  messages: ProviderAdapterExecutionContext["executionRequest"]["messages"],
): { system: string | null; messages: Array<{ role: string; content: string }> } {
  const systemMessages = messages.filter((message) => message.role === "system");
  const chatMessages = messages.filter((message) => message.role !== "system");
  return {
    system:
      systemMessages.length > 0
        ? systemMessages.map((message) => readAnthropicMessageText(message.content)).join("\n\n")
        : null,
    messages: chatMessages.map((message) => ({
      role: message.role,
      content: readAnthropicMessageText(message.content),
    })),
  };
}

function toAnthropicTools(
  tools: NonNullable<ProviderAdapterExecutionContext["executionRequest"]["tools"]>,
): Array<Record<string, unknown>> {
  return tools.map((tool) => {
    if (tool.kind === "hosted") {
      throw new Error("Hosted OpenAI tools are not supported on the Anthropic adapter.");
    }
    return {
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    };
  });
}

const ANTHROPIC_BUDGET_TOKENS_BY_EFFORT: Readonly<Record<string, number>> = {
  low: 2_048,
  medium: 4_096,
  high: 8_192,
  max: 16_384,
};

/**
 * Serialize a normalized reasoning request into Anthropic extended thinking.
 * Anthropic's Messages API has no generic `reasoning_effort` string; extended
 * thinking is expressed via `thinking: { type: "enabled", budget_tokens }`.
 * A fully-specified raw/thinking payload is forwarded verbatim, otherwise the
 * normalized effort level is mapped onto a sensible budget_tokens value.
 */
function toAnthropicThinking(
  reasoning: ProviderAdapterExecutionContext["executionRequest"]["reasoning"],
): Record<string, unknown> | undefined {
  if (!reasoning) {
    return undefined;
  }
  if (reasoning.raw && Object.keys(reasoning.raw).length > 0) {
    return reasoning.raw;
  }
  if (typeof reasoning.effort === "string") {
    const budget_tokens = ANTHROPIC_BUDGET_TOKENS_BY_EFFORT[reasoning.effort];
    if (typeof budget_tokens === "number") {
      return { type: "enabled", budget_tokens };
    }
  }
  return undefined;
}

export function buildAnthropicRequest(
  input: ProviderAdapterExecutionContext & {
    readonly capabilities: ProviderCapabilityMatrix;
  },
): ProviderRequestCapture {
  const split = splitAnthropicMessages(input.executionRequest.messages);
  const thinking = toAnthropicThinking(input.executionRequest.reasoning);
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
      ...(thinking ? { thinking } : {}),
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
          (input.requestCapture.body.stream as boolean | undefined) ??
          false,
      ),
      textDeltas: outputText ? 1 : 0,
      toolCallDeltas: toolCalls.length,
      toolArgumentDeltas: toolCalls.length,
    },
    promptCache: {
      requested: Boolean(
        input.executionRequest?.promptCache ?? input.requestCapture.headers["anthropic-beta"],
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
