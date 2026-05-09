import { describe, expect, test } from "vitest";

import {
  createOpenAIProviderAdapter,
  buildOpenAIRequest,
  normalizeOpenAIResponse,
} from "../src/index.js";

describe("OpenAI provider adapter", () => {
  test("can be created for the openai-compatible adapter family", () => {
    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");

    expect(adapter.adapterFamily).toBe("ai-sdk-openai-compatible");
  });

  test("builds an OpenAI responses request and normalizes text, usage, and tool calls", () => {
    const target = {
      endpointId: "openai.personal.primary.us-east-1.fast",
      modelId: "openai/gpt-4.1-mini-fast",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.responses",
        bodyKeys: ["temperature", "max_output_tokens"],
        headerKeys: ["OpenAI-Beta"],
      },
      candidate: {
        identity: {
          endpoint_id: "openai.personal.primary.us-east-1.fast",
          provider_kind: "remote_openai_compat",
        },
      },
      account: {
        credentialRef: {
          backend: "env",
          ref: "OPENAI_API_KEY",
        },
      },
    };

    const executionRequest = {
      messages: [
        { role: "system", content: "You explain routing outcomes." },
        { role: "user", content: "Summarize the chosen endpoint." },
      ],
      maxOutputTokens: 256,
      temperature: 0.2,
      stream: true,
      tools: [
        {
          name: "lookupRegistry",
          description: "Look up endpoint details.",
          inputSchema: {
            type: "object",
            properties: {
              endpointId: { type: "string" },
            },
            required: ["endpointId"],
          },
        },
      ],
      structuredOutput: {
        name: "routing_summary",
        schema: {
          type: "object",
          properties: {
            winner: { type: "string" },
          },
          required: ["winner"],
        },
      },
      promptCache: {
        mode: "prefer",
        key: "conversation-main",
      },
    };

    const adapter = createOpenAIProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });
    const normalized = normalizeOpenAIResponse({
      target,
      executionRequest,
      requestCapture,
      responseCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: target.endpointId,
        statusCode: 200,
        vendorMetadata: {
          vendorId: "litellm",
          latencyMs: 87,
        },
        body: {
          id: "resp_test_01",
          output: [
            {
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  text: "OpenAI summary",
                },
              ],
            },
            {
              type: "function_call",
              call_id: "call_1",
              name: "lookupRegistry",
              arguments: "{\"endpointId\":\"openai.personal.primary.us-east-1.fast\"}",
            },
          ],
          usage: {
            input_tokens: 32,
            output_tokens: 24,
          },
        },
      },
      capabilities,
    });

    expect(capabilities.structuredOutputs).toBe("native");
    expect(requestCapture.url).toBe("https://api.openai.test/v1/responses");
    expect(requestCapture.body).toMatchObject({
      model: "openai/gpt-4.1-mini-fast",
      temperature: 0.2,
      max_output_tokens: 256,
    });
    expect(normalized.outputText).toBe("OpenAI summary");
    expect(normalized.toolCalls).toHaveLength(1);
    expect(normalized.toolCalls[0]).toMatchObject({
      name: "lookupRegistry",
    });
    expect(normalized.usage).toEqual({
      inputTokens: 32,
      outputTokens: 24,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(normalized.latencyMs).toBe(87);
    expect(normalized.promptCache.used).toBe(false);
  });

  test("normalizes a streamed OpenAI responses transcript into final text, tool calls, and usage", () => {
    const target = {
      endpointId: "openai.personal.primary.us-east-1.fast",
      modelId: "openai/gpt-4.1-mini-fast",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.responses",
        bodyKeys: ["temperature", "max_output_tokens"],
        headerKeys: ["OpenAI-Beta"],
      },
      candidate: {
        identity: {
          endpoint_id: "openai.personal.primary.us-east-1.fast",
          provider_kind: "remote_openai_compat",
        },
      },
      account: {
        credentialRef: {
          backend: "env",
          ref: "OPENAI_API_KEY",
        },
      },
    };

    const executionRequest = {
      messages: [{ role: "user", content: "Reply with Ready now." }],
      stream: true,
      tools: [
        {
          name: "lookupRegistry",
          description: "Look up endpoint details.",
          inputSchema: {
            type: "object",
            properties: {
              endpointId: { type: "string" },
            },
            required: ["endpointId"],
          },
        },
      ],
    };

    const adapter = createOpenAIProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });
    const normalized = normalizeOpenAIResponse({
      target,
      executionRequest,
      requestCapture,
      responseCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: target.endpointId,
        statusCode: 200,
        body: [
          'data: {"type":"response.created","response":{"id":"resp_123","created_at":1,"model":"openai/gpt-4.1-mini-fast"}}',
          'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"message","id":"msg_1"}}',
          'data: {"type":"response.output_text.delta","item_id":"msg_1","delta":"Ready "}',
          'data: {"type":"response.output_text.delta","item_id":"msg_1","delta":"now"}',
          'data: {"type":"response.output_item.added","output_index":1,"item":{"type":"function_call","id":"fc_1","call_id":"call_1","name":"lookupRegistry","arguments":""}}',
          'data: {"type":"response.function_call_arguments.delta","item_id":"fc_1","output_index":1,"delta":"{\\"endpointId\\":\\"openai.personal.primary.us-east-1.fast\\"}"}',
          'data: {"type":"response.output_item.done","output_index":1,"item":{"type":"function_call","id":"fc_1","call_id":"call_1","name":"lookupRegistry","arguments":"{\\"endpointId\\":\\"openai.personal.primary.us-east-1.fast\\"}","status":"completed"}}',
          'data: {"type":"response.completed","response":{"usage":{"input_tokens":11,"output_tokens":4}}}',
        ].join("\n\n"),
      },
      capabilities,
    });

    expect(normalized.outputText).toBe("Ready now");
    expect(normalized.toolCalls).toEqual([
      {
        name: "lookupRegistry",
        arguments: {
          endpointId: "openai.personal.primary.us-east-1.fast",
        },
        providerToolId: "call_1",
      },
    ]);
    expect(normalized.finishReason).toBe("stop");
    expect(normalized.stream).toEqual({
      requested: true,
      textDeltas: 2,
      toolCallDeltas: 1,
      toolArgumentDeltas: 1,
    });
    expect(normalized.usage).toEqual({
      inputTokens: 11,
      outputTokens: 4,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
  });

  test("builds an OpenAI-compatible chat-completions request for Kimi and normalizes the reply", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
      modelId: "moonshot/kimi-k2.5",
      providerId: "moonshot",
      providerKind: "provider-openai",
      providerAccountId: "moonshot.personal.kimi-code",
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: "api-key",
      apiBase: "https://api.kimi.test/coding/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["temperature", "max_tokens", "tools"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.5",
          provider_kind: "remote_openai_compat",
        },
      },
      account: {
        credentialRef: {
          backend: "local-encrypted-file",
          ref: "oauth/moonshot/moonshot.personal.kimi-code",
        },
      },
    };

    const executionRequest = {
      messages: [{ role: "user", content: "Reply with the word ok." }],
      maxOutputTokens: 128,
      temperature: 0.1,
    };

    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });
    const normalized = normalizeOpenAIResponse({
      target,
      executionRequest,
      requestCapture,
      responseCapture: {
        providerFamily: "ai-sdk-openai-compatible",
        endpointId: target.endpointId,
        statusCode: 200,
        body: {
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: "ok",
              },
            },
          ],
          usage: {
            prompt_tokens: 11,
            completion_tokens: 4,
          },
        },
      },
      capabilities,
    });

    expect(requestCapture.url).toBe("https://api.kimi.test/coding/v1/chat/completions");
    expect(requestCapture.body).toMatchObject({
      model: "moonshot/kimi-k2.5",
      messages: [{ role: "user", content: "Reply with the word ok." }],
      temperature: 0.1,
      max_tokens: 128,
    });
    expect(normalized.outputText).toBe("ok");
    expect(normalized.finishReason).toBe("stop");
    expect(normalized.usage).toEqual({
      inputTokens: 11,
      outputTokens: 4,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
  });

  test("normalizes an OpenAI-compatible chat-completions SSE transcript for Kimi streaming", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.5",
      modelId: "moonshot/kimi-k2.5",
      providerId: "moonshot",
      providerKind: "provider-openai",
      providerAccountId: "moonshot.personal.kimi-code",
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: "api-key",
      apiBase: "https://api.kimi.test/coding/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["temperature", "max_tokens", "tools"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.5",
          provider_kind: "remote_openai_compat",
        },
      },
      account: {
        credentialRef: {
          backend: "local-encrypted-file",
          ref: "oauth/moonshot/moonshot.personal.kimi-code",
        },
      },
    };

    const executionRequest = {
      messages: [{ role: "user", content: "Reply with the word ready." }],
      maxOutputTokens: 128,
      temperature: 0.1,
      stream: true,
    };

    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });
    const normalized = normalizeOpenAIResponse({
      target,
      executionRequest,
      requestCapture,
      responseCapture: {
        providerFamily: "ai-sdk-openai-compatible",
        endpointId: target.endpointId,
        statusCode: 200,
        body: [
          'data: {"id":"chatcmpl-kimi-1","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}',
          'data: {"id":"chatcmpl-kimi-1","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"content":"Ready"},"finish_reason":null}]}',
          'data: {"id":"chatcmpl-kimi-1","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}',
          "data: [DONE]",
        ].join("\n\n"),
      },
      capabilities,
    });

    expect(normalized.outputText).toBe("Ready");
    expect(normalized.finishReason).toBe("stop");
    expect(normalized.stream).toEqual({
      requested: true,
      textDeltas: 1,
      toolCallDeltas: 0,
      toolArgumentDeltas: 0,
    });
  });
});
