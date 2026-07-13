import type {
  NormalizedProviderResponse,
  ProviderAdapter,
  ProviderAdapterExecutionContext,
  ProviderAdapterNormalizeContext,
  ProviderCapabilityMatrix,
  ProviderRequestCapture,
  RuntimeExecutionToolDefinition,
} from "@role-model-router/adapter-execution";
import { normalizeToolCallArguments } from "@role-model-router/adapter-execution";

export function createOpenAIProviderAdapter(adapterFamily = "ai-sdk-openai"): ProviderAdapter {
  return {
    adapterFamily,
    negotiateCapabilities: ({ executionRequest }) =>
      getOpenAICapabilities(Boolean(executionRequest.structuredOutput)),
    buildRequest: buildOpenAIRequest,
    normalizeResponse: normalizeOpenAIResponse,
  };
}

function getOpenAICapabilities(hasStructuredOutput: boolean): ProviderCapabilityMatrix {
  return {
    structuredOutputs: hasStructuredOutput ? "native" : "unsupported",
    toolCalling: {
      supported: true,
      extraction: "provider-native",
    },
    streaming: {
      text: "delta",
      toolCalls: "delta",
      toolArguments: "delta",
    },
    promptCaching: {
      supported: true,
      mode: "implicit",
    },
    usage: {
      inputTokens: true,
      outputTokens: true,
      cacheReadTokens: true,
      cacheWriteTokens: true,
    },
  };
}

function toOpenAIProviderMessageContent(
  content: ProviderAdapterExecutionContext["executionRequest"]["messages"][number]["content"],
): string | null | Array<{ readonly type?: string; readonly text?: string }> {
  if (typeof content === "string" || content === null) {
    return content;
  }
  return [...content];
}

function toOpenAIInput(
  messages: ProviderAdapterExecutionContext["executionRequest"]["messages"],
): Array<Record<string, unknown>> {
  return messages.map((message) => {
    const rawContent = message.content === undefined ? null : message.content;
    const normalizedContent =
      message.role === "tool" && (rawContent === null || rawContent === undefined)
        ? ""
        : toOpenAIProviderMessageContent(rawContent);
    return {
      role: message.role,
      content: normalizedContent,
      ...(message.tool_calls?.length ? { tool_calls: message.tool_calls } : {}),
      ...(message.role === "assistant" && message.tool_calls?.length
        ? { reasoning_content: "" }
        : {}),
      ...(typeof message.tool_call_id === "string" ? { tool_call_id: message.tool_call_id } : {}),
      ...(typeof message.name === "string" ? { name: message.name } : {}),
    };
  });
}

function toOpenAIResponseToolOutput(
  content: ProviderAdapterExecutionContext["executionRequest"]["messages"][number]["content"],
): string {
  if (typeof content === "string") {
    return content;
  }
  if (content === null || content === undefined) {
    return "";
  }
  return content
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter((part) => part.length > 0)
    .join("");
}

function toOpenAIResponseToolArguments(argumentsValue: unknown): string {
  if (typeof argumentsValue === "string") {
    return argumentsValue;
  }
  if (argumentsValue === undefined) {
    return "";
  }
  try {
    return JSON.stringify(argumentsValue);
  } catch {
    return String(argumentsValue);
  }
}

function hasResponsesToolReplayHistory(
  messages: ProviderAdapterExecutionContext["executionRequest"]["messages"],
): boolean {
  return messages.some(
    (message) =>
      (message.role === "assistant" && message.tool_calls?.length) || message.role === "tool",
  );
}

function toOpenAIResponsesInput(
  messages: ProviderAdapterExecutionContext["executionRequest"]["messages"],
): Array<Record<string, unknown>> {
  const input: Array<Record<string, unknown>> = [];
  for (const message of messages) {
    if (message.role === "assistant" && message.tool_calls?.length) {
      const assistantContent = toOpenAIProviderMessageContent(
        message.content === undefined ? null : message.content,
      );
      if (
        assistantContent !== null &&
        !(typeof assistantContent === "string" && assistantContent.length === 0) &&
        !(Array.isArray(assistantContent) && assistantContent.length === 0)
      ) {
        input.push({
          role: "assistant",
          content: assistantContent,
        });
      }
      for (const toolCall of message.tool_calls) {
        input.push({
          type: "function_call",
          call_id: toolCall.id,
          name: toolCall.function.name,
          arguments: toOpenAIResponseToolArguments(toolCall.function.arguments),
        });
      }
      continue;
    }
    if (message.role === "tool" && typeof message.tool_call_id === "string") {
      input.push({
        type: "function_call_output",
        call_id: message.tool_call_id,
        output: toOpenAIResponseToolOutput(message.content),
      });
      continue;
    }
    input.push(
      toOpenAIInput([message])[0] ?? {
        role: message.role,
        content: null,
      },
    );
  }
  return input;
}

function toOpenAITools(
  tools: NonNullable<ProviderAdapterExecutionContext["executionRequest"]["tools"]>,
): Array<Record<string, unknown>> {
  return tools.map((tool) =>
    tool.kind === "hosted"
      ? tool.raw
      : {
          type: "function",
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        },
  );
}

function isKimiBuiltinHostedTool(tool: RuntimeExecutionToolDefinition): boolean {
  if (tool.kind !== "hosted") {
    return false;
  }
  const rawType = tool.raw?.type;
  const rawFunction = tool.raw?.function;
  return (
    rawType === "builtin_function" &&
    typeof rawFunction === "object" &&
    rawFunction !== null &&
    (rawFunction as Record<string, unknown>).name === "$web_search"
  );
}

function hasOnlyKimiBuiltinHostedTools(
  tools: readonly RuntimeExecutionToolDefinition[] | undefined,
): boolean {
  return Boolean(tools?.length) && (tools ?? []).every((tool) => isKimiBuiltinHostedTool(tool));
}

function buildOpenAIHeaders(input: ProviderAdapterExecutionContext): Record<string, string> {
  const sessionId =
    typeof input.executionRequest.sessionAffinity?.sessionId === "string"
      ? input.executionRequest.sessionAffinity.sessionId
      : undefined;
  const clientRequestId =
    typeof input.executionRequest.sessionAffinity?.clientRequestId === "string"
      ? input.executionRequest.sessionAffinity.clientRequestId
      : undefined;
  const usesLiteLLMContinuityHeaders =
    input.target.adapterFamily === "litellm-proxy" ||
    input.target.candidate.identity.serving_source === "vendor-litellm";
  return {
    authorization: `Bearer ${input.target.account?.credentialRef.ref ?? "OPENAI_API_KEY"}`,
    ...(sessionId ? { "session-id": sessionId } : {}),
    ...(clientRequestId ? { "x-client-request-id": clientRequestId } : {}),
    ...(usesLiteLLMContinuityHeaders && sessionId ? { "x-litellm-session-id": sessionId } : {}),
    ...(usesLiteLLMContinuityHeaders && (clientRequestId ?? sessionId)
      ? { "x-litellm-trace-id": clientRequestId ?? sessionId ?? "" }
      : {}),
  };
}

function toOpenAIReasoning(
  reasoning: ProviderAdapterExecutionContext["executionRequest"]["reasoning"],
): { key: "reasoning" | "thinking"; value: Record<string, unknown> } | undefined {
  if (!reasoning) {
    return undefined;
  }

  const value = {
    ...(reasoning.raw ?? {}),
    ...(typeof reasoning.effort === "string" ? { effort: reasoning.effort } : {}),
  };
  if (Object.keys(value).length === 0) {
    return undefined;
  }
  return {
    key: reasoning.channel === "thinking" ? "thinking" : "reasoning",
    value,
  };
}

function toOpenAIChatCompletionsReasoning(
  reasoning: ProviderAdapterExecutionContext["executionRequest"]["reasoning"],
): Record<string, unknown> | undefined {
  if (!reasoning) {
    return undefined;
  }

  if (reasoning.channel === "thinking") {
    return {
      thinking: {
        ...(reasoning.raw ?? {}),
        ...(typeof reasoning.effort === "string" ? { effort: reasoning.effort } : {}),
      },
    };
  }

  if (typeof reasoning.effort === "string") {
    return {
      reasoning_effort: reasoning.effort,
    };
  }

  if (reasoning.raw) {
    return {
      reasoning: reasoning.raw,
    };
  }

  return undefined;
}

function toOpenAIChatTools(
  tools: NonNullable<ProviderAdapterExecutionContext["executionRequest"]["tools"]>,
): Array<Record<string, unknown>> {
  return tools.map((tool) =>
    tool.kind === "hosted"
      ? tool.raw
      : {
          type: "function",
          function: {
            name: tool.name,
            ...(tool.description ? { description: tool.description } : {}),
            parameters: tool.inputSchema,
          },
        },
  );
}

function toOpenAIResponsesToolChoice(
  toolChoice: ProviderAdapterExecutionContext["executionRequest"]["toolChoice"],
): ProviderAdapterExecutionContext["executionRequest"]["toolChoice"] | Record<string, unknown> {
  if (
    typeof toolChoice === "object" &&
    toolChoice !== null &&
    !Array.isArray(toolChoice) &&
    toolChoice.type === "function"
  ) {
    const functionName =
      typeof toolChoice.function?.name === "string" ? toolChoice.function.name.trim() : "";
    if (functionName.length > 0) {
      return {
        type: "function",
        name: functionName,
      };
    }
  }
  return toolChoice;
}

function asFunctionToolDefinition(
  tool: RuntimeExecutionToolDefinition,
): Extract<RuntimeExecutionToolDefinition, { readonly kind?: "function" }> {
  if (tool.kind === "hosted") {
    throw new Error("Hosted OpenAI tools are only supported on the Responses API path.");
  }
  return tool;
}

function resolveProviderShape(input: {
  readonly target: ProviderAdapterExecutionContext["target"];
  readonly executionRequest?: ProviderAdapterExecutionContext["executionRequest"];
}): string {
  const hasHostedTools = (input.executionRequest?.tools ?? []).some(
    (tool) => tool.kind === "hosted",
  );
  if (hasHostedTools) {
    if (hasOnlyKimiBuiltinHostedTools(input.executionRequest?.tools)) {
      return input.target.requestShapeHints?.providerShape ?? "openai.chat.completions";
    }
    return "openai.responses";
  }
  return input.target.requestShapeHints?.providerShape ?? "openai.responses";
}

function readLatencyMs(input: {
  readonly responseCapture: ProviderAdapterNormalizeContext["responseCapture"];
}): number {
  return input.responseCapture.vendorMetadata?.latencyMs ?? 120;
}

type OpenAICacheFacts = {
  readonly readTokens: number;
  readonly writeTokens: number;
  readonly used: boolean;
  readonly readSupported: boolean;
  readonly writeSupported: boolean;
};

function readNumericField(value: unknown, key: string): number | undefined {
  if (!value || typeof value !== "object" || !(key in value)) {
    return undefined;
  }
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "number" ? field : undefined;
}

function readOpenAIUsageCacheFacts(
  usage: unknown,
  vendorMetadata?: ProviderAdapterNormalizeContext["responseCapture"]["vendorMetadata"],
): OpenAICacheFacts {
  const promptDetails =
    usage && typeof usage === "object" && "prompt_tokens_details" in usage
      ? (usage as Record<string, unknown>).prompt_tokens_details
      : undefined;
  const inputDetails =
    usage && typeof usage === "object" && "input_tokens_details" in usage
      ? (usage as Record<string, unknown>).input_tokens_details
      : undefined;
  const readTokensFromBody =
    readNumericField(inputDetails, "cached_tokens") ??
    readNumericField(promptDetails, "cached_tokens") ??
    readNumericField(usage, "cached_tokens");
  const writeTokensFromBody =
    readNumericField(inputDetails, "cache_write_tokens") ??
    readNumericField(promptDetails, "cache_write_tokens") ??
    readNumericField(usage, "cache_write_tokens");
  const readSupported =
    typeof readTokensFromBody === "number" ||
    typeof vendorMetadata?.cacheReadTokens === "number" ||
    typeof vendorMetadata?.cacheUsed === "boolean";
  const writeSupported =
    typeof writeTokensFromBody === "number" || typeof vendorMetadata?.cacheWriteTokens === "number";
  const readTokens = readTokensFromBody ?? vendorMetadata?.cacheReadTokens ?? 0;
  const writeTokens = writeTokensFromBody ?? vendorMetadata?.cacheWriteTokens ?? 0;
  const used = vendorMetadata?.cacheUsed ?? readTokens > 0;

  return {
    readTokens,
    writeTokens,
    used,
    readSupported,
    writeSupported,
  };
}

function readAssistantContent(
  message:
    | {
        readonly content?: string | Array<{ readonly type?: string; readonly text?: string }>;
      }
    | undefined,
): string {
  if (!message) {
    return "";
  }
  const messageContent = message.content;
  return typeof messageContent === "string"
    ? messageContent
    : Array.isArray(messageContent)
      ? messageContent
          .map((entry) => (typeof entry?.text === "string" ? entry.text : ""))
          .filter(Boolean)
          .join("\n")
      : "";
}

function readAssistantReasoning(
  message:
    | {
        readonly reasoning_content?: string | null;
      }
    | undefined,
): string {
  return typeof message?.reasoning_content === "string" ? message.reasoning_content : "";
}

function readOpenAIStreamPayloads(rawTranscript: string): readonly string[] {
  if (!rawTranscript.includes("data:")) {
    return [];
  }

  const payloads: string[] = [];
  for (const block of rawTranscript.split(/\r?\n\r?\n/)) {
    const dataLines = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim());

    if (dataLines.length === 0) {
      continue;
    }

    const payloadText = dataLines.join("\n");
    if (payloadText === "[DONE]") {
      continue;
    }
    payloads.push(payloadText);
  }

  return payloads;
}

function parseOpenAIChatCompletionsStreamTranscript(rawTranscript: string): {
  readonly body: {
    readonly choices: Array<{
      readonly finish_reason: string;
      readonly message: {
        readonly content: string;
        readonly reasoning_content?: string | null;
        readonly tool_calls: Array<{
          readonly id?: string;
          readonly function: {
            readonly name?: string;
            readonly arguments: string;
          };
        }>;
      };
    }>;
    readonly usage?: {
      readonly prompt_tokens?: number;
      readonly completion_tokens?: number;
    };
  };
  readonly streamStats: {
    readonly textDeltas: number;
    readonly toolCallDeltas: number;
    readonly toolArgumentDeltas: number;
  };
} | null {
  if (!rawTranscript.includes("data:")) {
    return null;
  }

  const toolCalls = new Map<
    number,
    {
      id?: string;
      function: {
        name?: string;
        arguments: string;
      };
    }
  >();
  let outputText = "";
  let reasoningText = "";
  let finishReason = "stop";
  let usage:
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
      }
    | undefined;
  let textDeltas = 0;
  let toolCallDeltas = 0;
  let toolArgumentDeltas = 0;

  for (const payloadText of readOpenAIStreamPayloads(rawTranscript)) {
    let payload: {
      readonly choices?: Array<{
        readonly finish_reason?: string | null;
        readonly delta?: {
          readonly content?: string;
          readonly reasoning_content?: string;
          readonly tool_calls?: Array<{
            readonly index?: number;
            readonly id?: string;
            readonly function?: {
              readonly name?: string;
              readonly arguments?: string;
            };
          }>;
        };
      }>;
      readonly usage?: {
        readonly prompt_tokens?: number;
        readonly completion_tokens?: number;
      };
    };

    try {
      payload = JSON.parse(payloadText) as typeof payload;
    } catch {
      continue;
    }

    usage = payload.usage ?? usage;
    const firstChoice = payload.choices?.[0];
    if (!firstChoice) {
      continue;
    }

    if (typeof firstChoice.finish_reason === "string" && firstChoice.finish_reason.length > 0) {
      finishReason = firstChoice.finish_reason;
    }

    if (typeof firstChoice.delta?.content === "string" && firstChoice.delta.content.length > 0) {
      outputText += firstChoice.delta.content;
      textDeltas += 1;
    }

    if (
      typeof firstChoice.delta?.reasoning_content === "string" &&
      firstChoice.delta.reasoning_content.length > 0
    ) {
      reasoningText += firstChoice.delta.reasoning_content;
      textDeltas += 1;
    }

    for (const toolCallDelta of firstChoice.delta?.tool_calls ?? []) {
      toolCallDeltas += 1;
      const index = typeof toolCallDelta.index === "number" ? toolCallDelta.index : toolCalls.size;
      const existing = toolCalls.get(index) ?? {
        id: toolCallDelta.id,
        function: {
          name: undefined as string | undefined,
          arguments: "",
        },
      };

      if (typeof toolCallDelta.id === "string" && toolCallDelta.id.length > 0) {
        existing.id = toolCallDelta.id;
      }

      if (
        typeof toolCallDelta.function?.name === "string" &&
        toolCallDelta.function.name.length > 0
      ) {
        existing.function.name = `${existing.function.name ?? ""}${toolCallDelta.function.name}`;
      }

      if (
        typeof toolCallDelta.function?.arguments === "string" &&
        toolCallDelta.function.arguments.length > 0
      ) {
        existing.function.arguments += toolCallDelta.function.arguments;
        toolArgumentDeltas += 1;
      }

      toolCalls.set(index, existing);
    }
  }

  return {
    body: {
      choices: [
        {
          finish_reason: finishReason,
          message: {
            content: outputText,
            reasoning_content: reasoningText.length > 0 ? reasoningText : null,
            tool_calls: [...toolCalls.entries()]
              .sort((left, right) => left[0] - right[0])
              .map(([, value]) => value),
          },
        },
      ],
      ...(usage ? { usage } : {}),
    },
    streamStats: {
      textDeltas,
      toolCallDeltas,
      toolArgumentDeltas,
    },
  };
}

function parseOpenAIResponsesStreamTranscript(rawTranscript: string): {
  readonly body: {
    readonly id?: string;
    readonly output: Array<{
      readonly type: string;
      readonly role?: string;
      readonly content?: Array<{ readonly type: string; readonly text: string }>;
      readonly call_id?: string;
      readonly name?: string;
      readonly arguments?: string;
    }>;
    readonly usage?: {
      readonly input_tokens?: number;
      readonly output_tokens?: number;
    };
  };
  readonly finishReason: string;
  readonly streamStats: {
    readonly textDeltas: number;
    readonly toolCallDeltas: number;
    readonly toolArgumentDeltas: number;
  };
} | null {
  if (!rawTranscript.includes("data:")) {
    return null;
  }

  const messageItems = new Map<string, { outputIndex: number; text: string }>();
  const toolCalls = new Map<
    string,
    {
      outputIndex: number;
      callId?: string;
      name?: string;
      arguments: string;
    }
  >();
  let responseId: string | undefined;
  let usage:
    | {
        input_tokens?: number;
        output_tokens?: number;
      }
    | undefined;
  let finishReason = "stop";
  let textDeltas = 0;
  let toolCallDeltas = 0;
  let toolArgumentDeltas = 0;

  for (const payloadText of readOpenAIStreamPayloads(rawTranscript)) {
    let payload:
      | {
          readonly type?: string;
          readonly output_index?: number;
          readonly item_id?: string;
          readonly delta?: string;
          readonly item?: {
            readonly type?: string;
            readonly id?: string;
            readonly call_id?: string;
            readonly name?: string;
            readonly arguments?: string;
          };
          readonly response?: {
            readonly id?: string;
            readonly usage?: {
              readonly input_tokens?: number;
              readonly output_tokens?: number;
            };
            readonly incomplete_details?: {
              readonly reason?: string;
            };
          };
        }
      | undefined;

    try {
      payload = JSON.parse(payloadText) as typeof payload;
    } catch {
      continue;
    }

    if (!payload?.type) {
      continue;
    }

    if (payload.type === "response.created") {
      if (typeof payload.response?.id === "string" && payload.response.id.length > 0) {
        responseId = payload.response.id;
      }
      continue;
    }

    if (payload.type === "response.output_item.added") {
      if (payload.item?.type === "message" && typeof payload.item.id === "string") {
        messageItems.set(payload.item.id, {
          outputIndex:
            typeof payload.output_index === "number" ? payload.output_index : messageItems.size,
          text: "",
        });
        continue;
      }
      if (payload.item?.type === "function_call" && typeof payload.item.id === "string") {
        toolCallDeltas += 1;
        toolCalls.set(payload.item.id, {
          outputIndex:
            typeof payload.output_index === "number" ? payload.output_index : toolCalls.size,
          callId: payload.item.call_id,
          name: payload.item.name,
          arguments: typeof payload.item.arguments === "string" ? payload.item.arguments : "",
        });
      }
      continue;
    }

    if (payload.type === "response.output_text.delta") {
      if (typeof payload.item_id !== "string" || typeof payload.delta !== "string") {
        continue;
      }
      const existing = messageItems.get(payload.item_id) ?? {
        outputIndex: messageItems.size,
        text: "",
      };
      existing.text += payload.delta;
      messageItems.set(payload.item_id, existing);
      if (payload.delta.length > 0) {
        textDeltas += 1;
      }
      continue;
    }

    if (payload.type === "response.function_call_arguments.delta") {
      if (typeof payload.item_id !== "string" || typeof payload.delta !== "string") {
        continue;
      }
      const existing = toolCalls.get(payload.item_id) ?? {
        outputIndex:
          typeof payload.output_index === "number" ? payload.output_index : toolCalls.size,
        callId: undefined,
        name: undefined,
        arguments: "",
      };
      existing.arguments += payload.delta;
      toolCalls.set(payload.item_id, existing);
      if (payload.delta.length > 0) {
        toolArgumentDeltas += 1;
      }
      continue;
    }

    if (payload.type === "response.output_item.done") {
      if (payload.item?.type === "function_call" && typeof payload.item.id === "string") {
        const existing = toolCalls.get(payload.item.id) ?? {
          outputIndex:
            typeof payload.output_index === "number" ? payload.output_index : toolCalls.size,
          callId: undefined,
          name: undefined,
          arguments: "",
        };
        if (typeof payload.item.call_id === "string" && payload.item.call_id.length > 0) {
          existing.callId = payload.item.call_id;
        }
        if (typeof payload.item.name === "string" && payload.item.name.length > 0) {
          existing.name = payload.item.name;
        }
        if (typeof payload.item.arguments === "string") {
          existing.arguments = payload.item.arguments;
        }
        toolCalls.set(payload.item.id, existing);
      }
      continue;
    }

    if (payload.type === "response.completed") {
      usage = payload.response?.usage ?? usage;
      finishReason = "stop";
      continue;
    }

    if (payload.type === "response.incomplete") {
      usage = payload.response?.usage ?? usage;
      finishReason = payload.response?.incomplete_details?.reason ?? "incomplete";
    }
  }

  return {
    body: {
      ...(responseId ? { id: responseId } : {}),
      output: [
        ...[...messageItems.entries()]
          .sort((left, right) => left[1].outputIndex - right[1].outputIndex)
          .map(([, value]) => ({
            outputIndex: value.outputIndex,
            item: {
              type: "message",
              role: "assistant",
              content: value.text.length > 0 ? [{ type: "output_text", text: value.text }] : [],
            },
          })),
        ...[...toolCalls.entries()]
          .sort((left, right) => left[1].outputIndex - right[1].outputIndex)
          .map(([, value]) => ({
            outputIndex: value.outputIndex,
            item: {
              type: "function_call",
              ...(value.callId ? { call_id: value.callId } : {}),
              ...(value.name ? { name: value.name } : {}),
              arguments: value.arguments,
            },
          })),
      ]
        .sort((left, right) => left.outputIndex - right.outputIndex)
        .map((entry) => entry.item),
      ...(usage ? { usage } : {}),
    },
    finishReason,
    streamStats: {
      textDeltas,
      toolCallDeltas,
      toolArgumentDeltas,
    },
  };
}

export function buildOpenAIRequest(
  input: ProviderAdapterExecutionContext & {
    readonly capabilities: ProviderCapabilityMatrix;
  },
): ProviderRequestCapture {
  const providerShape = resolveProviderShape(input);
  const headers = buildOpenAIHeaders(input);
  if (providerShape === "openai.chat.completions") {
    const usesKimiBuiltinHostedWebSearch = hasOnlyKimiBuiltinHostedTools(
      input.executionRequest.tools,
    );
    const reasoning = toOpenAIChatCompletionsReasoning(input.executionRequest.reasoning);
    return {
      providerFamily: input.target.providerId,
      endpointId: input.target.endpointId,
      url: `${input.target.apiBase}/chat/completions`,
      headers,
      body: {
        model: input.target.modelId.includes("/")
          ? input.target.modelId.split("/").slice(1).join("/")
          : input.target.modelId,
        messages: toOpenAIInput(input.executionRequest.messages),
        ...(typeof input.executionRequest.temperature === "number"
          ? { temperature: input.executionRequest.temperature }
          : {}),
        ...(typeof input.executionRequest.maxOutputTokens === "number"
          ? { max_tokens: input.executionRequest.maxOutputTokens }
          : {}),
        ...(input.executionRequest.stream ? { stream: true } : {}),
        ...(input.executionRequest.tools?.length
          ? { tools: toOpenAIChatTools(input.executionRequest.tools ?? []) }
          : {}),
        ...(input.executionRequest.toolChoice !== undefined
          ? { tool_choice: input.executionRequest.toolChoice }
          : {}),
        ...(typeof input.executionRequest.parallelToolCalls === "boolean"
          ? { parallel_tool_calls: input.executionRequest.parallelToolCalls }
          : {}),
        ...(input.executionRequest.promptCache &&
        input.executionRequest.promptCache.mode !== "disabled" &&
        typeof input.executionRequest.promptCache.key === "string"
          ? { prompt_cache_key: input.executionRequest.promptCache.key }
          : {}),
        ...(reasoning ?? {}),
        ...(usesKimiBuiltinHostedWebSearch
          ? {
              thinking: {
                type: "disabled",
              },
            }
          : {}),
        ...(input.executionRequest.structuredOutput &&
        input.capabilities.structuredOutputs === "native"
          ? {
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: input.executionRequest.structuredOutput.name,
                  schema: input.executionRequest.structuredOutput.schema,
                  strict: true,
                },
              },
            }
          : {}),
      },
    };
  }

  const reasoning = toOpenAIReasoning(input.executionRequest.reasoning);
  return {
    providerFamily: input.target.providerId,
    endpointId: input.target.endpointId,
    url: `${input.target.apiBase}/responses`,
    headers: {
      ...headers,
      "OpenAI-Beta": "responses=v1",
    },
    body: {
      model: input.target.modelId.includes("/")
        ? input.target.modelId.split("/").slice(1).join("/")
        : input.target.modelId,
      input: hasResponsesToolReplayHistory(input.executionRequest.messages)
        ? toOpenAIResponsesInput(input.executionRequest.messages)
        : toOpenAIInput(input.executionRequest.messages),
      ...(typeof input.executionRequest.temperature === "number"
        ? { temperature: input.executionRequest.temperature }
        : {}),
      ...(typeof input.executionRequest.maxOutputTokens === "number"
        ? { max_output_tokens: input.executionRequest.maxOutputTokens }
        : {}),
      ...(input.executionRequest.stream ? { stream: true } : {}),
      ...(input.executionRequest.tools?.length
        ? { tools: toOpenAITools(input.executionRequest.tools ?? []) }
        : {}),
      ...(input.executionRequest.toolChoice !== undefined
        ? { tool_choice: toOpenAIResponsesToolChoice(input.executionRequest.toolChoice) }
        : {}),
      ...(typeof input.executionRequest.parallelToolCalls === "boolean"
        ? { parallel_tool_calls: input.executionRequest.parallelToolCalls }
        : {}),
      ...(reasoning ? { [reasoning.key]: reasoning.value } : {}),
      ...(typeof input.executionRequest.continuation?.previousResponseId === "string"
        ? { previous_response_id: input.executionRequest.continuation.previousResponseId }
        : {}),
      ...(input.executionRequest.promptCache &&
      input.executionRequest.promptCache.mode !== "disabled" &&
      typeof input.executionRequest.promptCache.key === "string"
        ? { prompt_cache_key: input.executionRequest.promptCache.key }
        : {}),
      ...(input.executionRequest.structuredOutput &&
      input.capabilities.structuredOutputs === "native"
        ? {
            text: {
              format: {
                type: "json_schema",
                name: input.executionRequest.structuredOutput.name,
                schema: input.executionRequest.structuredOutput.schema,
                strict: true,
              },
            },
          }
        : {}),
    },
  };
}

export function normalizeOpenAIResponse(
  input: Omit<ProviderAdapterNormalizeContext, "executionRequest"> & {
    readonly executionRequest?: ProviderAdapterNormalizeContext["executionRequest"];
  },
): NormalizedProviderResponse {
  const providerShape = resolveProviderShape(input);
  if (providerShape === "openai.chat.completions") {
    const streamedBody =
      typeof input.responseCapture.body === "string"
        ? parseOpenAIChatCompletionsStreamTranscript(input.responseCapture.body)
        : null;
    const body = (streamedBody?.body ?? input.responseCapture.body) as {
      choices?: Array<{
        finish_reason?: string;
        message?: {
          content?: string | Array<{ type?: string; text?: string }>;
          reasoning_content?: string | null;
          tool_calls?: Array<{
            id?: string;
            function?: {
              name?: string;
              arguments?: unknown;
            };
          }>;
        };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        prompt_tokens_details?: {
          cached_tokens?: number;
          cache_write_tokens?: number;
        };
        cached_tokens?: number;
        cache_write_tokens?: number;
      };
    };
    const firstChoice = body.choices?.[0];
    const cacheFacts = readOpenAIUsageCacheFacts(body.usage, input.responseCapture.vendorMetadata);
    const vendorMetadata = input.responseCapture.vendorMetadata;
    const outputText = readAssistantContent(firstChoice?.message);
    const reasoningText = readAssistantReasoning(firstChoice?.message);
    const toolCalls = (firstChoice?.message?.tool_calls ?? [])
      .filter((entry) => entry.function?.name)
      .map((entry) => ({
        name: entry.function?.name ?? "unknown",
        arguments: normalizeToolCallArguments(entry.function?.arguments),
        providerToolId: entry.id,
      }));

    return {
      providerFamily: input.responseCapture.providerFamily,
      requestCapture: input.requestCapture,
      responseCapture: input.responseCapture,
      outputText,
      ...(reasoningText.length > 0 ? { reasoningText } : {}),
      toolCalls,
      finishReason: firstChoice?.finish_reason ?? "stop",
      structuredOutputMode:
        input.capabilities.structuredOutputs === "native" &&
        "response_format" in input.requestCapture.body
          ? "native"
          : "none",
      stream: {
        requested: Boolean(
          input.executionRequest?.stream ??
            (input.requestCapture.body.stream as boolean | undefined) ??
            false,
        ),
        textDeltas: streamedBody?.streamStats.textDeltas ?? (outputText || reasoningText ? 1 : 0),
        toolCallDeltas: streamedBody?.streamStats.toolCallDeltas ?? toolCalls.length,
        toolArgumentDeltas: streamedBody?.streamStats.toolArgumentDeltas ?? toolCalls.length,
      },
      promptCache: {
        requested: Boolean(input.executionRequest?.promptCache),
        used: cacheFacts.used,
        readTokens: cacheFacts.readTokens,
        writeTokens: cacheFacts.writeTokens,
      },
      usage: {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        cacheReadTokens: cacheFacts.readTokens,
        cacheWriteTokens: cacheFacts.writeTokens,
      },
      errorClass: null,
      latencyMs: readLatencyMs(input),
      diagnostics: [],
      ...(input.responseCapture.vendorMetadata ||
      cacheFacts.readSupported ||
      cacheFacts.writeSupported
        ? {
            vendorMetadata: {
              vendorId: vendorMetadata?.vendorId,
              ...(typeof vendorMetadata?.latencyMs === "number"
                ? { latencyMs: vendorMetadata.latencyMs }
                : {}),
              ...(typeof vendorMetadata?.costUsd === "number"
                ? { costUsd: vendorMetadata.costUsd }
                : {}),
              ...(typeof vendorMetadata?.cacheStatus === "string"
                ? { cacheStatus: vendorMetadata.cacheStatus }
                : {}),
              ...(typeof vendorMetadata?.cacheUsed === "boolean" || cacheFacts.readSupported
                ? { cacheUsed: cacheFacts.used }
                : {}),
              ...(cacheFacts.readSupported ? { cacheReadTokens: cacheFacts.readTokens } : {}),
              ...(cacheFacts.writeSupported ? { cacheWriteTokens: cacheFacts.writeTokens } : {}),
            },
          }
        : {}),
    };
  }

  const streamedBody =
    typeof input.responseCapture.body === "string"
      ? parseOpenAIResponsesStreamTranscript(input.responseCapture.body)
      : null;
  const body = (streamedBody?.body ?? input.responseCapture.body) as {
    id?: string;
    output?: Array<{
      type: string;
      role?: string;
      content?: Array<{ type: string; text?: string }>;
      call_id?: string;
      name?: string;
      arguments?: unknown;
    }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      input_tokens_details?: {
        cached_tokens?: number;
        cache_write_tokens?: number;
      };
      cached_tokens?: number;
      cache_write_tokens?: number;
    };
  };
  const cacheFacts = readOpenAIUsageCacheFacts(body.usage, input.responseCapture.vendorMetadata);
  const vendorMetadata = input.responseCapture.vendorMetadata;

  const outputText = (body.output ?? [])
    .flatMap((entry) =>
      entry.type === "message" ? (entry.content ?? []).map((content) => content.text ?? "") : [],
    )
    .filter(Boolean)
    .join("\n");

  const toolCalls = (body.output ?? [])
    .filter((entry) => entry.type === "function_call" && entry.name)
    .map((entry) => ({
      name: entry.name ?? "unknown",
      arguments: normalizeToolCallArguments(entry.arguments),
      providerToolId: entry.call_id,
    }));

  return {
    providerFamily: input.responseCapture.providerFamily,
    requestCapture: input.requestCapture,
    responseCapture: input.responseCapture,
    outputText,
    toolCalls,
    finishReason: streamedBody?.finishReason ?? "stop",
    structuredOutputMode:
      input.capabilities.structuredOutputs === "native" && "text" in input.requestCapture.body
        ? "native"
        : "none",
    stream: {
      requested: Boolean(
        input.executionRequest?.stream ??
          (input.requestCapture.body.stream as boolean | undefined) ??
          false,
      ),
      textDeltas: streamedBody?.streamStats.textDeltas ?? (outputText ? 1 : 0),
      toolCallDeltas: streamedBody?.streamStats.toolCallDeltas ?? toolCalls.length,
      toolArgumentDeltas: streamedBody?.streamStats.toolArgumentDeltas ?? toolCalls.length,
    },
    promptCache: {
      requested: Boolean(input.executionRequest?.promptCache),
      used: cacheFacts.used,
      readTokens: cacheFacts.readTokens,
      writeTokens: cacheFacts.writeTokens,
    },
    usage: {
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0,
      cacheReadTokens: cacheFacts.readTokens,
      cacheWriteTokens: cacheFacts.writeTokens,
    },
    errorClass: null,
    latencyMs: readLatencyMs(input),
    diagnostics: [],
    ...(input.responseCapture.vendorMetadata ||
    cacheFacts.readSupported ||
    cacheFacts.writeSupported
      ? {
          vendorMetadata: {
            vendorId: vendorMetadata?.vendorId,
            ...(typeof vendorMetadata?.latencyMs === "number"
              ? { latencyMs: vendorMetadata.latencyMs }
              : {}),
            ...(typeof vendorMetadata?.costUsd === "number"
              ? { costUsd: vendorMetadata.costUsd }
              : {}),
            ...(typeof vendorMetadata?.cacheStatus === "string"
              ? { cacheStatus: vendorMetadata.cacheStatus }
              : {}),
            ...(typeof vendorMetadata?.cacheUsed === "boolean" || cacheFacts.readSupported
              ? { cacheUsed: cacheFacts.used }
              : {}),
            ...(cacheFacts.readSupported ? { cacheReadTokens: cacheFacts.readTokens } : {}),
            ...(cacheFacts.writeSupported ? { cacheWriteTokens: cacheFacts.writeTokens } : {}),
          },
        }
      : {}),
  };
}
