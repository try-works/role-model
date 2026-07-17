import type { RuntimeExecutionRequest } from "@role-model-router/adapter-execution";
import { describe, expect, test } from "vitest";

import {
  buildOpenAIRequest,
  createOpenAIProviderAdapter,
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
              arguments: '{"endpointId":"openai.personal.primary.us-east-1.fast"}',
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
    expect(requestCapture.providerFamily).toBe("openai");
    expect(requestCapture.url).toBe("https://api.openai.test/v1/responses");
    expect(requestCapture.body).toMatchObject({
      model: "gpt-4.1-mini-fast",
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
      inputTokensSource: "measured",
      outputTokensSource: "measured",
      inputTokensAvailable: true,
      outputTokensAvailable: true,
      source: "measured",
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

    expect(requestCapture.providerFamily).toBe("openai");
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
      inputTokensSource: "measured",
      outputTokensSource: "measured",
      inputTokensAvailable: true,
      outputTokensAvailable: true,
      source: "measured",
    });
  });

  test("preserves cached-token detail fields from a streamed OpenAI responses transcript", () => {
    const target = {
      endpointId: "openai.personal.primary.us-east-1.fast",
      modelId: "chatgpt/gpt-5.4",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.responses",
        bodyKeys: ["temperature", "max_output_tokens", "prompt_cache_key"],
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
      messages: [{ role: "user", content: "Reply with Warm response." }],
      stream: true,
      promptCache: {
        mode: "prefer",
        key: "codex-cache-key-stream",
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
        body: [
          'data: {"type":"response.created","response":{"id":"resp_cache_stream","created_at":1,"model":"chatgpt/gpt-5.4"}}',
          'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"message","id":"msg_1"}}',
          'data: {"type":"response.output_text.delta","item_id":"msg_1","delta":"Warm "}',
          'data: {"type":"response.output_text.delta","item_id":"msg_1","delta":"response"}',
          'data: {"type":"response.completed","response":{"usage":{"input_tokens":1400,"output_tokens":41,"input_tokens_details":{"cached_tokens":1111,"cache_write_tokens":222}}}}',
        ].join("\n\n"),
      },
      capabilities,
    });

    expect(normalized.promptCache).toEqual({
      requested: true,
      used: true,
      readTokens: 1111,
      writeTokens: 222,
    });
    expect(normalized.usage).toEqual({
      inputTokens: 1400,
      outputTokens: 41,
      cacheReadTokens: 1111,
      cacheWriteTokens: 222,
      inputTokensSource: "measured",
      outputTokensSource: "measured",
      inputTokensAvailable: true,
      outputTokensAvailable: true,
      source: "measured",
    });
  });

  test("preserves hosted OpenAI responses tools instead of coercing them into function tools", () => {
    const target = {
      endpointId: "openai.personal.primary.us-east-1.fast",
      modelId: "chatgpt/gpt-5.4",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.responses",
        bodyKeys: ["temperature", "max_output_tokens", "tools"],
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
      messages: [{ role: "user", content: "Find the current Cloudflare stock price." }],
      tools: [
        {
          kind: "hosted",
          name: "web_search",
          raw: {
            type: "web_search",
          },
        },
      ],
      // biome-ignore lint/suspicious/noExplicitAny: test mock object
    } as any;

    const adapter = createOpenAIProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.body.tools).toEqual([
      {
        type: "web_search",
      },
    ]);
  });

  test("forces the OpenAI Responses API path when hosted tools are requested", () => {
    const target = {
      endpointId: "openai.personal.primary.us-east-1.fast",
      modelId: "chatgpt/gpt-5.4",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["temperature", "max_tokens", "tools"],
        headerKeys: [],
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
      messages: [{ role: "user", content: "Find the current Cloudflare stock price." }],
      tools: [
        {
          kind: "hosted",
          name: "web_search",
          raw: {
            type: "web_search",
          },
        },
      ],
      // biome-ignore lint/suspicious/noExplicitAny: test mock object
    } as any;

    const adapter = createOpenAIProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.url).toBe("https://api.openai.test/v1/responses");
    expect(requestCapture.body.tools).toEqual([
      {
        type: "web_search",
      },
    ]);
  });

  test("keeps Kimi hosted web search on chat-completions and disables thinking", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
      modelId: "moonshot/kimi-k2.6",
      providerId: "moonshot",
      providerKind: "provider-openai",
      providerAccountId: "moonshot.personal.kimi-code",
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: "api-key",
      apiBase: "https://api.kimi.test/coding/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["temperature", "max_tokens", "tools", "thinking"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
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
      messages: [{ role: "user", content: "Find the current Cloudflare stock price." }],
      tools: [
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
      ],
      // biome-ignore lint/suspicious/noExplicitAny: test mock object
    } as any;

    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.providerFamily).toBe("moonshot");
    expect(requestCapture.url).toBe("https://api.kimi.test/coding/v1/chat/completions");
    expect(requestCapture.body.tools).toEqual([
      {
        type: "builtin_function",
        function: {
          name: "$web_search",
        },
      },
    ]);
    expect(requestCapture.body.thinking).toEqual({
      type: "disabled",
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
      model: "kimi-k2.5",
      messages: [{ role: "user", content: "Reply with the word ok." }],
      max_tokens: 128,
    });
    expect(requestCapture.body.temperature).toBeUndefined();
    expect(normalized.outputText).toBe("ok");
    expect(normalized.finishReason).toBe("stop");
    expect(normalized.usage).toEqual({
      inputTokens: 11,
      outputTokens: 4,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputTokensSource: "normalized",
      outputTokensSource: "normalized",
      inputTokensAvailable: true,
      outputTokensAvailable: true,
      source: "normalized",
    });
  });

  test("maps moonshot/kimi-k3 to upstream k3 and omits K3-incompatible fixed knobs", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.k3",
      modelId: "moonshot/kimi-k3",
      providerId: "moonshot",
      providerKind: "provider-openai",
      providerAccountId: "moonshot.personal.kimi-code",
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: "api-key",
      apiBase: "https://api.kimi.test/coding/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["max_tokens", "tools", "reasoning_effort"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "moonshot.personal.kimi-code.global.k3",
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
      messages: [{ role: "user", content: "Use max reasoning effort." }],
      maxOutputTokens: 256,
      temperature: 0.2,
      reasoning: {
        effort: "max" as const,
      },
    };

    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.providerFamily).toBe("moonshot");
    expect(requestCapture.url).toBe("https://api.kimi.test/coding/v1/chat/completions");
    expect(requestCapture.body.model).toBe("k3");
    expect(requestCapture.body.max_tokens).toBe(256);
    expect(requestCapture.body.reasoning_effort).toBe("max");
    expect(requestCapture.body.temperature).toBeUndefined();
    expect(requestCapture.body.thinking).toBeUndefined();
  });

  test("keeps moonshot/kimi-k2.7-code on its existing upstream id and omits fixed temperature", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
      modelId: "moonshot/kimi-k2.7-code",
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
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
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
      messages: [{ role: "user", content: "Keep the existing K2.7 behavior." }],
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

    expect(requestCapture.body.model).toBe("kimi-k2.7-code");
    expect(requestCapture.body.temperature).toBeUndefined();
    expect(requestCapture.body.reasoning_effort).toBeUndefined();
  });

  for (const modelId of ["moonshot/kimi-k2.5", "moonshot/kimi-k2.6"] as const) {
    test(`omits fixed temperature for ${modelId}`, () => {
      const target = {
        endpointId: `moonshot.personal.primary.global.${modelId.split("/")[1]}`,
        modelId,
        providerId: "moonshot",
        providerKind: "provider-openai",
        providerAccountId: "moonshot.personal.primary",
        adapterFamily: "ai-sdk-openai-compatible",
        authFamily: "api-key",
        apiBase: "https://api.moonshot.test/v1",
        requestShapeHints: {
          providerShape: "openai.chat.completions",
          bodyKeys: ["temperature", "max_tokens"],
          headerKeys: ["Authorization"],
        },
        candidate: {
          identity: {
            endpoint_id: `moonshot.personal.primary.global.${modelId.split("/")[1]}`,
            provider_kind: "remote_openai_compat",
          },
        },
        account: {
          credentialRef: {
            backend: "env",
            ref: "MOONSHOT_API_KEY",
          },
        },
      };
      const executionRequest = {
        messages: [{ role: "user", content: `Keep ${modelId} on its fixed temperature contract.` }],
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

      expect(requestCapture.body.model).toBe(modelId.split("/")[1]);
      expect(requestCapture.body.temperature).toBeUndefined();
    });
  }

  test("forwards forced chat-completions tool_choice to the downstream OpenAI request body", () => {
    const target = {
      endpointId: "openai.personal.primary.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["temperature", "max_tokens", "tools", "tool_choice"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "openai.personal.primary.global.gpt-5.4",
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
      messages: [{ role: "user", content: "Use the add_numbers tool." }],
      tools: [
        {
          name: "add_numbers",
          description: "Add two integers.",
          inputSchema: {
            type: "object",
            properties: {
              a: { type: "integer" },
              b: { type: "integer" },
            },
            required: ["a", "b"],
          },
        },
      ],
      toolChoice: {
        type: "function",
        function: {
          name: "add_numbers",
        },
      },
    };

    const adapter = createOpenAIProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.url).toBe("https://api.openai.test/v1/chat/completions");
    expect(requestCapture.body.tool_choice).toEqual({
      type: "function",
      function: {
        name: "add_numbers",
      },
    });
  });

  test("forwards chat-completions reasoning controls to the downstream OpenAI request body", () => {
    const target = {
      endpointId: "deepseek.personal.primary.global.deepseek-v4-pro",
      modelId: "deepseek/deepseek-v4-pro",
      providerId: "deepseek",
      providerKind: "provider-openai",
      providerAccountId: "deepseek.personal.primary",
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: "api-key",
      apiBase: "https://api.deepseek.test/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["temperature", "max_tokens", "reasoning_effort"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "deepseek.personal.primary.global.deepseek-v4-pro",
          provider_kind: "remote_openai_compat",
        },
      },
      account: {
        credentialRef: {
          backend: "env",
          ref: "DEEPSEEK_API_KEY",
        },
      },
    };

    const executionRequest = {
      messages: [{ role: "user", content: "Use high reasoning effort." }],
      reasoning: {
        effort: "high",
      },
    };

    const adapter = createOpenAIProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.providerFamily).toBe("deepseek");
    expect(requestCapture.url).toBe("https://api.deepseek.test/v1/chat/completions");
    expect(requestCapture.body.reasoning_effort).toBe("high");
    expect(requestCapture.body.reasoning).toBeUndefined();
    expect(requestCapture.body.thinking).toBeUndefined();
  });

  test("forwards responses tool_choice, reasoning, continuation, and session-affinity hints", () => {
    const target = {
      endpointId: "openai.personal.primary.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.responses",
        bodyKeys: [
          "temperature",
          "max_output_tokens",
          "tools",
          "tool_choice",
          "reasoning",
          "previous_response_id",
          "prompt_cache_key",
        ],
        headerKeys: ["Authorization", "OpenAI-Beta", "session-id", "x-client-request-id"],
      },
      candidate: {
        identity: {
          endpoint_id: "openai.personal.primary.global.gpt-5.4",
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
      messages: [{ role: "user", content: "Use the lookupRegistry tool and continue the turn." }],
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
      toolChoice: {
        type: "function",
        function: {
          name: "lookupRegistry",
        },
      },
      reasoning: {
        effort: "high",
      },
      promptCache: {
        mode: "prefer",
        key: "cache-key-001",
      },
      continuation: {
        previousResponseId: "resp_prev_001",
      },
      sessionAffinity: {
        sessionId: "session-alpha",
        clientRequestId: "client-req-001",
      },
      // biome-ignore lint/suspicious/noExplicitAny: RED test for additive contract fields
    } as any;

    const adapter = createOpenAIProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.url).toBe("https://api.openai.test/v1/responses");
    expect(requestCapture.body.tool_choice).toEqual({
      type: "function",
      name: "lookupRegistry",
    });
    expect(requestCapture.body.reasoning).toEqual({
      effort: "high",
    });
    expect(requestCapture.body.previous_response_id).toBe("resp_prev_001");
    expect(requestCapture.body.prompt_cache_key).toBe("cache-key-001");
    expect(requestCapture.headers["session-id"]).toBe("session-alpha");
    expect(requestCapture.headers["x-client-request-id"]).toBe("client-req-001");
  });

  test("forwards responses parallel_tool_calls when explicitly true", () => {
    const target = {
      endpointId: "openai.personal.primary.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.responses",
        bodyKeys: ["tools", "parallel_tool_calls"],
        headerKeys: ["Authorization", "OpenAI-Beta"],
      },
      candidate: {
        identity: {
          endpoint_id: "openai.personal.primary.global.gpt-5.4",
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

    const executionRequest: RuntimeExecutionRequest = {
      messages: [{ role: "user", content: "Use every needed tool in one turn." }],
      tools: [
        {
          name: "lookupRegistry",
          description: "Look up endpoint details.",
          inputSchema: {
            type: "object",
            properties: {
              endpointId: { type: "string" },
            },
          },
        },
      ],
      parallelToolCalls: true,
    };

    const adapter = createOpenAIProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.body.parallel_tool_calls).toBe(true);
  });

  test("forwards responses parallel_tool_calls when explicitly false", () => {
    const target = {
      endpointId: "openai.personal.primary.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.responses",
        bodyKeys: ["tools", "parallel_tool_calls"],
        headerKeys: ["Authorization", "OpenAI-Beta"],
      },
      candidate: {
        identity: {
          endpoint_id: "openai.personal.primary.global.gpt-5.4",
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

    const executionRequest: RuntimeExecutionRequest = {
      messages: [{ role: "user", content: "Use at most one tool in this turn." }],
      tools: [
        {
          name: "lookupRegistry",
          description: "Look up endpoint details.",
          inputSchema: {
            type: "object",
            properties: {
              endpointId: { type: "string" },
            },
          },
        },
      ],
      parallelToolCalls: false,
    };

    const adapter = createOpenAIProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.body.parallel_tool_calls).toBe(false);
  });

  test("omits responses parallel_tool_calls when the caller left it unset", () => {
    const target = {
      endpointId: "openai.personal.primary.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.responses",
        bodyKeys: ["tools"],
        headerKeys: ["Authorization", "OpenAI-Beta"],
      },
      candidate: {
        identity: {
          endpoint_id: "openai.personal.primary.global.gpt-5.4",
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
      messages: [{ role: "user", content: "Use tools if you need them." }],
      tools: [
        {
          name: "lookupRegistry",
          description: "Look up endpoint details.",
          inputSchema: {
            type: "object",
            properties: {
              endpointId: { type: "string" },
            },
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

    expect(requestCapture.body).not.toHaveProperty("parallel_tool_calls");
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

  test("preserves cached-token detail fields from a streamed chat-completions transcript", () => {
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
        bodyKeys: ["temperature", "max_tokens", "prompt_cache_key"],
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
      messages: [{ role: "user", content: "Reply with cached ready." }],
      stream: true,
      promptCache: {
        mode: "prefer",
        key: "kimi-cache-key-stream",
      },
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
          'data: {"id":"chatcmpl-kimi-cache-1","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}',
          'data: {"id":"chatcmpl-kimi-cache-1","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{"content":"cached ready"},"finish_reason":null}]}',
          'data: {"id":"chatcmpl-kimi-cache-1","object":"chat.completion.chunk","created":1,"model":"moonshot/kimi-k2.5","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":1200,"completion_tokens":7,"prompt_tokens_details":{"cached_tokens":875}}}',
          "data: [DONE]",
        ].join("\n\n"),
      },
      capabilities,
    });

    expect(normalized.promptCache).toEqual({
      requested: true,
      used: true,
      readTokens: 875,
      writeTokens: 0,
    });
    expect(normalized.usage).toEqual({
      inputTokens: 1200,
      outputTokens: 7,
      cacheReadTokens: 875,
      cacheWriteTokens: 0,
      inputTokensSource: "normalized",
      outputTokensSource: "normalized",
      inputTokensAvailable: true,
      outputTokensAvailable: true,
      source: "normalized",
    });
  });

  test("advertises implicit prompt caching support for OpenAI-family providers", () => {
    const adapter = createOpenAIProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({
      target: {
        endpointId: "openai.personal.primary.global.gpt-5.4",
        modelId: "chatgpt/gpt-5.4",
        providerId: "openai",
        providerKind: "provider-openai",
        providerAccountId: "openai.personal.primary",
        adapterFamily: "ai-sdk-openai",
        authFamily: "api-key",
        apiBase: "https://api.openai.test/v1",
        requestShapeHints: {
          providerShape: "openai.responses",
          bodyKeys: ["model", "input"],
          headerKeys: ["Authorization"],
        },
        candidate: {
          identity: {
            endpoint_id: "openai.personal.primary.global.gpt-5.4",
            provider_kind: "remote_openai_compat",
          },
        },
        account: {
          credentialRef: {
            backend: "env",
            ref: "OPENAI_API_KEY",
          },
        },
      },
      executionRequest: {
        messages: [{ role: "user", content: "Explain prompt caching." }],
        promptCache: {
          mode: "prefer",
          key: "session-cache-key",
        },
      },
    });

    expect(capabilities.promptCaching).toEqual({
      supported: true,
      mode: "implicit",
    });
    expect(capabilities.usage.cacheReadTokens).toBe(true);
    expect(capabilities.usage.cacheWriteTokens).toBe(true);
  });

  test("normalizes OpenAI Responses cached-token detail fields without rewriting totals", () => {
    const target = {
      endpointId: "openai.personal.primary.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.responses",
        bodyKeys: ["model", "input", "prompt_cache_key"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "openai.personal.primary.global.gpt-5.4",
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
      messages: [{ role: "user", content: "Summarize the warmed prefix." }],
      promptCache: {
        mode: "prefer",
        key: "cache-key-001",
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
        body: {
          id: "resp_cache_hit_01",
          output: [
            {
              type: "message",
              role: "assistant",
              content: [
                {
                  type: "output_text",
                  text: "Warm response",
                },
              ],
            },
          ],
          usage: {
            input_tokens: 1400,
            output_tokens: 41,
            input_tokens_details: {
              cached_tokens: 1111,
              cache_write_tokens: 222,
            },
          },
        },
      },
      capabilities,
    });

    expect(normalized.promptCache).toEqual({
      requested: true,
      used: true,
      readTokens: 1111,
      writeTokens: 222,
    });
    expect(normalized.usage).toEqual({
      inputTokens: 1400,
      outputTokens: 41,
      cacheReadTokens: 1111,
      cacheWriteTokens: 222,
      inputTokensSource: "measured",
      outputTokensSource: "measured",
      inputTokensAvailable: true,
      outputTokensAvailable: true,
      source: "measured",
    });
  });

  test("normalizes Kimi chat-completions cached tokens from top-level usage", () => {
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
        bodyKeys: ["temperature", "max_tokens", "prompt_cache_key"],
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
      messages: [{ role: "user", content: "Reply with cached ok." }],
      promptCache: {
        mode: "prefer",
        key: "kimi-cache-key",
        source: "explicit" as const,
      },
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
                content: "cached ok",
              },
            },
          ],
          usage: {
            prompt_tokens: 1200,
            completion_tokens: 7,
            cached_tokens: 875,
          },
        },
      },
      capabilities,
    });

    expect(normalized.promptCache).toEqual({
      requested: true,
      requestSource: "explicit",
      used: true,
      readTokens: 875,
      writeTokens: 0,
    });
    expect(normalized.usage).toEqual({
      inputTokens: 1200,
      outputTokens: 7,
      cacheReadTokens: 875,
      cacheWriteTokens: 0,
      inputTokensSource: "normalized",
      outputTokensSource: "normalized",
      inputTokensAvailable: true,
      outputTokensAvailable: true,
      source: "normalized",
    });
  });

  test("forwards chat-completions prompt_cache_key when prompt caching is enabled", () => {
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
        bodyKeys: ["temperature", "max_tokens", "prompt_cache_key"],
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
      messages: [{ role: "user", content: "Keep the cache key stable." }],
      promptCache: {
        mode: "prefer",
        key: "kimi-chat-cache-key",
      },
    };

    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.body.prompt_cache_key).toBe("kimi-chat-cache-key");
  });

  test("normalizes reasoning-only chat-completions bodies into assistant output text", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
      modelId: "moonshot/kimi-k2.6",
      providerId: "moonshot",
      providerKind: "provider-openai",
      providerAccountId: "moonshot.personal.kimi-code",
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: "api-key",
      apiBase: "https://api.kimi.test/coding/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["temperature", "max_tokens"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
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
      messages: [{ role: "user", content: "Say ready." }],
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
                content: "",
                reasoning_content: "Ready for routing.",
              },
            },
          ],
          usage: {
            prompt_tokens: 9,
            completion_tokens: 6,
          },
        },
      },
      capabilities,
    });

    expect(normalized.outputText).toBe("");
    expect(normalized.reasoningText).toBe("Ready for routing.");
  });

  test("forwards null assistant content and tool-turn fields for chat completions", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
      modelId: "moonshot/kimi-k2.6",
      providerId: "moonshot",
      providerKind: "provider-openai",
      providerAccountId: "moonshot.personal.kimi-code",
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: "api-key",
      apiBase: "https://api.moonshot.test/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["temperature", "max_tokens"],
        headerKeys: [],
      },
      candidate: {
        identity: {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
          provider_kind: "remote_openai_compat",
        },
      },
      account: {
        credentialRef: {
          backend: "env",
          ref: "MOONSHOT_API_KEY",
        },
      },
    };

    const executionRequest = {
      messages: [
        { role: "user", content: "Check Cloudflare stock price" },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: {
                name: "web_search",
                arguments: '{"query":"NET stock price"}',
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
          name: "web_search",
          description: "Search the web.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
            },
          },
        },
      ],
    };

    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({
      target,
      executionRequest,
      capabilities,
    });

    expect(requestCapture.body.messages).toEqual([
      { role: "user", content: "Check Cloudflare stock price" },
      {
        role: "assistant",
        content: null,
        reasoning_content: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: {
              name: "web_search",
              arguments: '{"query":"NET stock price"}',
            },
          },
        ],
      },
      {
        role: "tool",
        content: "NET: $185.42",
        tool_call_id: "call_1",
      },
    ]);
  });

  test("renders responses continuation turns as function_call and function_call_output items", () => {
    const target = {
      endpointId: "openai.personal.primary.global.gpt-5.4",
      modelId: "chatgpt/gpt-5.4",
      providerId: "openai",
      providerKind: "provider-openai",
      providerAccountId: "openai.personal.primary",
      adapterFamily: "ai-sdk-openai",
      authFamily: "api-key",
      apiBase: "https://api.openai.test/v1",
      requestShapeHints: {
        providerShape: "openai.responses",
        bodyKeys: ["tools", "input"],
        headerKeys: ["Authorization", "OpenAI-Beta"],
      },
      candidate: {
        identity: {
          endpoint_id: "openai.personal.primary.global.gpt-5.4",
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
        { role: "user", content: "Check Cloudflare stock price" },
        {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "call_1",
              type: "function",
              function: {
                name: "web_search",
                arguments: '{"query":"NET stock price"}',
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
          name: "web_search",
          description: "Search the web.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
            },
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

    expect(requestCapture.body.input).toEqual([
      { role: "user", content: "Check Cloudflare stock price" },
      {
        type: "function_call",
        call_id: "call_1",
        name: "web_search",
        arguments: '{"query":"NET stock price"}',
      },
      {
        type: "function_call_output",
        call_id: "call_1",
        output: "NET: $185.42",
      },
    ]);
  });

  test("normalizes a streamed chat-completions transcript with nested choices[0].usage", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
      modelId: "moonshot/kimi-k2.6",
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
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
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
      messages: [{ role: "user", content: "Summarize routing outcomes." }],
      stream: true,
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
        providerFamily: "ai-sdk-openai-compatible",
        endpointId: target.endpointId,
        statusCode: 200,
        body: [
          'data: {"id":"chatcmpl_kimi_nested","choices":[{"index":0,"delta":{"role":"assistant","content":"Routing"}}]}',
          'data: {"id":"chatcmpl_kimi_nested","choices":[{"index":0,"delta":{"content":" outcomes"}}]}',
          'data: {"id":"chatcmpl_kimi_nested","choices":[{"index":0,"finish_reason":"stop","usage":{"prompt_tokens":37,"completion_tokens":6}}]}',
        ].join("\n\n"),
      },
      capabilities,
    });

    expect(normalized.outputText).toBe("Routing outcomes");
    expect(normalized.finishReason).toBe("stop");
    expect(normalized.usage).toEqual({
      inputTokens: 37,
      outputTokens: 6,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      inputTokensSource: "normalized",
      outputTokensSource: "normalized",
      inputTokensAvailable: true,
      outputTokensAvailable: true,
      source: "normalized",
    });
  });

  test("estimates input tokens when streamed usage is absent and labels provenance", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.6",
      modelId: "moonshot/kimi-k2.6",
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
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.6",
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
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Summarize routing outcomes in a few words." },
      ],
      stream: true,
      tools: [
        {
          name: "lookupTelemetry",
          description: "Read telemetry facts.",
          inputSchema: {
            type: "object",
            properties: { requestId: { type: "string" } },
            required: ["requestId"],
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
        providerFamily: "ai-sdk-openai-compatible",
        endpointId: target.endpointId,
        statusCode: 200,
        body: [
          'data: {"id":"chatcmpl_kimi_no_usage","choices":[{"index":0,"delta":{"role":"assistant","content":"Done"}}]}',
          'data: {"id":"chatcmpl_kimi_no_usage","choices":[{"index":0,"finish_reason":"stop","delta":{}}]}',
        ].join("\n\n"),
      },
      capabilities,
    });

    expect(normalized.outputText).toBe("Done");
    expect(normalized.finishReason).toBe("stop");
    expect(normalized.usage.inputTokens).toBe(
      Math.ceil(new TextEncoder().encode(JSON.stringify(requestCapture.body)).length / 4),
    );
    expect(normalized.usage.outputTokens).toBeGreaterThanOrEqual(0);
    expect(normalized.usage.source).toBe("estimated");
  });

  test("marks request-size usage unavailable when the captured provider body cannot be serialized", () => {
    const target = {
      endpointId: "moonshot.circular.global.kimi",
      modelId: "moonshot/kimi-k2.7-code",
      providerId: "moonshot",
      requestShapeHints: { providerShape: "openai.chat.completions" },
    } as never;
    const executionRequest: RuntimeExecutionRequest = {
      messages: [{ role: "user", content: "Circular request capture" }],
    };
    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const body: Record<string, unknown> = { model: "kimi-k2.7-code" };
    body.self = body;
    const normalized = normalizeOpenAIResponse({
      target,
      executionRequest,
      capabilities,
      requestCapture: {
        providerFamily: "moonshot",
        endpointId: "moonshot.circular.global.kimi",
        url: "https://api.kimi.test/coding/v1/chat/completions",
        headers: {},
        body,
      },
      responseCapture: {
        providerFamily: "moonshot",
        endpointId: "moonshot.circular.global.kimi",
        statusCode: 200,
        body: { choices: [{ finish_reason: "stop", message: { content: "ok" } }] },
      },
    });

    expect(normalized.usage).toMatchObject({
      inputTokens: 0,
      inputTokensAvailable: false,
      inputTokensSource: "unavailable",
      source: "unavailable",
    });
  });

  test("requests Kimi streamed usage and forwards a capable prompt cache key on the final wire body", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
      modelId: "moonshot/kimi-k2.7-code",
      providerId: "moonshot",
      providerKind: "provider-openai",
      providerAccountId: "moonshot.personal.kimi-code",
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: "api-key",
      apiBase: "https://api.kimi.test/coding/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["stream", "stream_options", "prompt_cache_key"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
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
      messages: [{ role: "user", content: "Inspect the final request body." }],
      stream: true,
      promptCache: {
        mode: "prefer" as const,
        key: "kimi-session-stable",
        source: "synthesized" as const,
      },
    };
    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({ target, executionRequest, capabilities });

    expect(capabilities.usage).toMatchObject({ streamOptionsIncludeUsage: true });
    expect(requestCapture.body).toMatchObject({
      stream: true,
      stream_options: { include_usage: true },
      prompt_cache_key: "kimi-session-stable",
    });
  });

  test("does not activate prompt caching for an unsupported selected capability", () => {
    const target = {
      endpointId: "compatible.no-cache.global.model",
      modelId: "compatible/model",
      providerId: "compatible",
      providerKind: "provider-openai",
      providerAccountId: "compatible.primary",
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: "api-key",
      apiBase: "https://compatible.test/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["stream"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "compatible.no-cache.global.model",
          provider_kind: "remote_openai_compat",
        },
      },
      account: { credentialRef: { backend: "env", ref: "COMPATIBLE_API_KEY" } },
    };
    const executionRequest = {
      messages: [{ role: "user", content: "Do not activate caching." }],
      promptCache: {
        mode: "prefer" as const,
        key: "must-not-be-forwarded",
        source: "synthesized" as const,
      },
    };
    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");
    const negotiated = adapter.negotiateCapabilities({ target, executionRequest });
    const capabilities = {
      ...negotiated,
      promptCaching: { supported: false, mode: "unsupported" as const },
    };
    const requestCapture = buildOpenAIRequest({ target, executionRequest, capabilities });
    const normalized = normalizeOpenAIResponse({
      target,
      executionRequest,
      requestCapture,
      responseCapture: {
        providerFamily: "compatible",
        endpointId: target.endpointId,
        statusCode: 200,
        body: {
          choices: [{ finish_reason: "stop", message: { content: "ok" } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        },
      },
      capabilities,
    });

    expect(requestCapture.body).not.toHaveProperty("prompt_cache_key");
    expect(normalized.promptCache.requested).toBe(false);
  });

  test("normalizes nested final usage when a streamed Kimi response ends with tool_calls", () => {
    const target = {
      endpointId: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
      modelId: "moonshot/kimi-k2.7-code",
      providerId: "moonshot",
      providerKind: "provider-openai",
      providerAccountId: "moonshot.personal.kimi-code",
      adapterFamily: "ai-sdk-openai-compatible",
      authFamily: "api-key",
      apiBase: "https://api.kimi.test/coding/v1",
      requestShapeHints: {
        providerShape: "openai.chat.completions",
        bodyKeys: ["stream", "tools"],
        headerKeys: ["Authorization"],
      },
      candidate: {
        identity: {
          endpoint_id: "moonshot.personal.kimi-code.global.kimi-k2.7-code",
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
      messages: [{ role: "user", content: "Call the lookup tool." }],
      stream: true,
    };
    const adapter = createOpenAIProviderAdapter("ai-sdk-openai-compatible");
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildOpenAIRequest({ target, executionRequest, capabilities });
    const normalized = normalizeOpenAIResponse({
      target,
      executionRequest,
      requestCapture,
      responseCapture: {
        providerFamily: "moonshot",
        endpointId: target.endpointId,
        statusCode: 200,
        body: [
          'data: {"id":"tool-usage","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call-1","type":"function","function":{"name":"lookup","arguments":"{}"}}]},"finish_reason":null}]}',
          'data: {"id":"tool-usage","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls","usage":{"prompt_tokens":91,"completion_tokens":12,"cached_tokens":40}}]}',
          "data: [DONE]",
        ].join("\n\n"),
      },
      capabilities,
    });

    expect(normalized.finishReason).toBe("tool_calls");
    expect(normalized.usage).toMatchObject({
      inputTokens: 91,
      outputTokens: 12,
      cacheReadTokens: 40,
      source: "normalized",
    });
  });
});
