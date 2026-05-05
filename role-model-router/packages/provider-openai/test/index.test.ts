import { describe, expect, test } from "vitest";

import {
  createOpenAIProviderAdapter,
  buildOpenAIRequest,
  normalizeOpenAIResponse,
} from "../src/index.js";

describe("OpenAI provider adapter", () => {
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
      requestCapture,
      responseCapture: {
        providerFamily: "ai-sdk-openai",
        endpointId: target.endpointId,
        statusCode: 200,
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
    expect(normalized.promptCache.used).toBe(false);
  });
});
