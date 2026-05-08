import type {
  NormalizedProviderResponse,
  ProviderAdapter,
  ProviderAdapterExecutionContext,
  ProviderAdapterNormalizeContext,
  ProviderCapabilityMatrix,
  ProviderRequestCapture,
} from "@role-model-router/adapter-execution";
import { normalizeToolCallArguments } from "@role-model-router/adapter-execution";

export function createOpenAIProviderAdapter(
  adapterFamily = "ai-sdk-openai",
): ProviderAdapter {
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
      supported: false,
      mode: "unsupported",
    },
    usage: {
      inputTokens: true,
      outputTokens: true,
      cacheReadTokens: false,
      cacheWriteTokens: false,
    },
  };
}

function toOpenAIInput(
  messages: ProviderAdapterExecutionContext["executionRequest"]["messages"],
): Array<{ role: string; content: string }> {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

function toOpenAITools(
  tools: NonNullable<ProviderAdapterExecutionContext["executionRequest"]["tools"]>,
): Array<Record<string, unknown>> {
  return tools.map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
  }));
}

function toOpenAIChatTools(
  tools: NonNullable<ProviderAdapterExecutionContext["executionRequest"]["tools"]>,
): Array<Record<string, unknown>> {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      ...(tool.description ? { description: tool.description } : {}),
      parameters: tool.inputSchema,
    },
  }));
}

function resolveProviderShape(
  target: ProviderAdapterExecutionContext["target"],
): string {
  return target.requestShapeHints?.providerShape ?? "openai.responses";
}

function readLatencyMs(input: {
  readonly responseCapture: ProviderAdapterNormalizeContext["responseCapture"];
}): number {
  return input.responseCapture.vendorMetadata?.latencyMs ?? 120;
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

function parseOpenAIChatCompletionsStreamTranscript(
  rawTranscript: string,
):
  | {
      readonly body: {
        readonly choices: Array<{
          readonly finish_reason: string;
          readonly message: {
            readonly content: string;
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
    }
  | null {
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

      if (typeof toolCallDelta.function?.name === "string" && toolCallDelta.function.name.length > 0) {
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

function parseOpenAIResponsesStreamTranscript(
  rawTranscript: string,
):
  | {
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
    }
  | null {
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
          outputIndex: typeof payload.output_index === "number" ? payload.output_index : messageItems.size,
          text: "",
        });
        continue;
      }
      if (payload.item?.type === "function_call" && typeof payload.item.id === "string") {
        toolCallDeltas += 1;
        toolCalls.set(payload.item.id, {
          outputIndex: typeof payload.output_index === "number" ? payload.output_index : toolCalls.size,
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
        outputIndex: typeof payload.output_index === "number" ? payload.output_index : toolCalls.size,
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
          outputIndex: typeof payload.output_index === "number" ? payload.output_index : toolCalls.size,
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
  const providerShape = resolveProviderShape(input.target);
  if (providerShape === "openai.chat.completions") {
    return {
      providerFamily: input.target.adapterFamily,
      endpointId: input.target.endpointId,
      url: `${input.target.apiBase}/chat/completions`,
      headers: {
        authorization: `Bearer ${input.target.account?.credentialRef.ref ?? "OPENAI_API_KEY"}`,
      },
      body: {
        model: input.target.modelId,
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

  return {
    providerFamily: input.target.adapterFamily,
    endpointId: input.target.endpointId,
    url: `${input.target.apiBase}/responses`,
    headers: {
      authorization: `Bearer ${input.target.account?.credentialRef.ref ?? "OPENAI_API_KEY"}`,
      "OpenAI-Beta": "responses=v1",
    },
    body: {
      model: input.target.modelId,
      input: toOpenAIInput(input.executionRequest.messages),
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
  const providerShape = resolveProviderShape(input.target);
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
      };
    };
    const firstChoice = body.choices?.[0];
    const messageContent = firstChoice?.message?.content;
    const outputText =
      typeof messageContent === "string"
        ? messageContent
        : Array.isArray(messageContent)
          ? messageContent
              .map((entry) => (typeof entry?.text === "string" ? entry.text : ""))
              .filter(Boolean)
              .join("\n")
          : "";
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
            ((input.requestCapture.body.stream as boolean | undefined) ?? false),
        ),
        textDeltas: streamedBody?.streamStats.textDeltas ?? (outputText ? 1 : 0),
        toolCallDeltas: streamedBody?.streamStats.toolCallDeltas ?? toolCalls.length,
        toolArgumentDeltas: streamedBody?.streamStats.toolArgumentDeltas ?? toolCalls.length,
      },
      promptCache: {
        requested: Boolean(input.executionRequest?.promptCache),
        used: false,
        readTokens: 0,
        writeTokens: 0,
      },
      usage: {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
      errorClass: null,
      latencyMs: readLatencyMs(input),
      diagnostics: [],
      ...(input.responseCapture.vendorMetadata
        ? {
            vendorMetadata: {
              vendorId: input.responseCapture.vendorMetadata.vendorId,
              ...(typeof input.responseCapture.vendorMetadata.latencyMs === "number"
                ? { latencyMs: input.responseCapture.vendorMetadata.latencyMs }
                : {}),
              ...(typeof input.responseCapture.vendorMetadata.costUsd === "number"
                ? { costUsd: input.responseCapture.vendorMetadata.costUsd }
                : {}),
              ...(typeof input.responseCapture.vendorMetadata.cacheStatus === "string"
                ? { cacheStatus: input.responseCapture.vendorMetadata.cacheStatus }
                : {}),
              ...(typeof input.responseCapture.vendorMetadata.cacheUsed === "boolean"
                ? { cacheUsed: input.responseCapture.vendorMetadata.cacheUsed }
                : {}),
              ...(typeof input.responseCapture.vendorMetadata.cacheReadTokens === "number"
                ? { cacheReadTokens: input.responseCapture.vendorMetadata.cacheReadTokens }
                : {}),
              ...(typeof input.responseCapture.vendorMetadata.cacheWriteTokens === "number"
                ? { cacheWriteTokens: input.responseCapture.vendorMetadata.cacheWriteTokens }
                : {}),
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
    };
  };

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
      input.capabilities.structuredOutputs === "native" &&
      "text" in input.requestCapture.body
        ? "native"
        : "none",
    stream: {
      requested: Boolean(
        input.executionRequest?.stream ??
          ((input.requestCapture.body.stream as boolean | undefined) ?? false),
      ),
      textDeltas: streamedBody?.streamStats.textDeltas ?? (outputText ? 1 : 0),
      toolCallDeltas: streamedBody?.streamStats.toolCallDeltas ?? toolCalls.length,
      toolArgumentDeltas: streamedBody?.streamStats.toolArgumentDeltas ?? toolCalls.length,
    },
    promptCache: {
      requested: Boolean(input.executionRequest?.promptCache),
      used: false,
      readTokens: 0,
      writeTokens: 0,
    },
    usage: {
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    },
    errorClass: null,
    latencyMs: readLatencyMs(input),
    diagnostics: [],
    ...(input.responseCapture.vendorMetadata
      ? {
          vendorMetadata: {
            vendorId: input.responseCapture.vendorMetadata.vendorId,
            ...(typeof input.responseCapture.vendorMetadata.latencyMs === "number"
              ? { latencyMs: input.responseCapture.vendorMetadata.latencyMs }
              : {}),
            ...(typeof input.responseCapture.vendorMetadata.costUsd === "number"
              ? { costUsd: input.responseCapture.vendorMetadata.costUsd }
              : {}),
            ...(typeof input.responseCapture.vendorMetadata.cacheStatus === "string"
              ? { cacheStatus: input.responseCapture.vendorMetadata.cacheStatus }
              : {}),
            ...(typeof input.responseCapture.vendorMetadata.cacheUsed === "boolean"
              ? { cacheUsed: input.responseCapture.vendorMetadata.cacheUsed }
              : {}),
            ...(typeof input.responseCapture.vendorMetadata.cacheReadTokens === "number"
              ? { cacheReadTokens: input.responseCapture.vendorMetadata.cacheReadTokens }
              : {}),
            ...(typeof input.responseCapture.vendorMetadata.cacheWriteTokens === "number"
              ? { cacheWriteTokens: input.responseCapture.vendorMetadata.cacheWriteTokens }
              : {}),
          },
        }
      : {}),
  };
}
