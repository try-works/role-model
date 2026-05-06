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
    const body = input.responseCapture.body as {
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
        textDeltas: outputText ? 1 : 0,
        toolCallDeltas: toolCalls.length,
        toolArgumentDeltas: toolCalls.length,
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
      latencyMs: 120,
      diagnostics: [],
    };
  }

  const body = input.responseCapture.body as {
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
    finishReason: "stop",
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
      textDeltas: outputText ? 1 : 0,
      toolCallDeltas: toolCalls.length,
      toolArgumentDeltas: toolCalls.length,
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
    latencyMs: 120,
    diagnostics: [],
  };
}
