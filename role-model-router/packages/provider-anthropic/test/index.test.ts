import { describe, expect, test } from "vitest";

import {
  buildAnthropicRequest,
  createAnthropicProviderAdapter,
  normalizeAnthropicResponse,
} from "../src/index.js";

describe("Anthropic provider adapter", () => {
  test("builds an Anthropic messages request and normalizes text, tool hooks, and cache-aware usage", () => {
    const target = {
      endpointId: "anthropic.team.shared.us-east-1.default",
      modelId: "claude-3.7-sonnet",
      providerId: "anthropic",
      providerKind: "provider-anthropic",
      providerAccountId: "anthropic.team.shared",
      adapterFamily: "ai-sdk-anthropic",
      authFamily: "api-key",
      apiBase: "https://api.anthropic.test/v1",
      requestShapeHints: {
        providerShape: "anthropic.messages",
        bodyKeys: ["max_tokens", "temperature"],
        headerKeys: ["anthropic-version"],
      },
      candidate: {
        identity: {
          endpoint_id: "anthropic.team.shared.us-east-1.default",
          provider_kind: "remote_openai_compat",
        },
      },
      account: {
        credentialRef: {
          backend: "local-keychain",
          ref: "anthropic/team/shared",
        },
      },
    };

    const executionRequest = {
      messages: [
        { role: "system", content: "You explain routing outcomes." },
        { role: "user", content: "Summarize the chosen endpoint." },
      ],
      maxOutputTokens: 256,
      temperature: 0.1,
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

    const adapter = createAnthropicProviderAdapter();
    const capabilities = adapter.negotiateCapabilities({ target, executionRequest });
    const requestCapture = buildAnthropicRequest({
      target,
      executionRequest,
      capabilities,
    });
    const normalized = normalizeAnthropicResponse({
      requestCapture,
      responseCapture: {
        providerFamily: "ai-sdk-anthropic",
        endpointId: target.endpointId,
        statusCode: 200,
        body: {
          id: "msg_test_01",
          model: "claude-3.7-sonnet",
          content: [
            {
              type: "text",
              text: "Anthropic summary",
            },
            {
              type: "tool_use",
              id: "toolu_01",
              name: "lookupRegistry",
              input: {
                endpointId: "anthropic.team.shared.us-east-1.default",
              },
            },
          ],
          stop_reason: "end_turn",
          usage: {
            input_tokens: 40,
            output_tokens: 18,
            cache_read_input_tokens: 12,
            cache_creation_input_tokens: 4,
          },
        },
      },
      capabilities,
    });

    expect(capabilities.structuredOutputs).toBe("json-fallback");
    expect(capabilities.promptCaching.supported).toBe(true);
    expect(requestCapture.url).toBe("https://api.anthropic.test/v1/messages");
    expect(requestCapture.body).toMatchObject({
      model: "claude-3.7-sonnet",
      max_tokens: 256,
      temperature: 0.1,
    });
    expect(normalized.outputText).toBe("Anthropic summary");
    expect(normalized.toolCalls).toHaveLength(1);
    expect(normalized.toolCalls[0]).toMatchObject({
      name: "lookupRegistry",
      arguments: {
        endpointId: "anthropic.team.shared.us-east-1.default",
      },
    });
    expect(normalized.promptCache).toEqual({
      requested: true,
      used: true,
      readTokens: 12,
      writeTokens: 4,
    });
    expect(normalized.usage).toEqual({
      inputTokens: 40,
      outputTokens: 18,
      cacheReadTokens: 12,
      cacheWriteTokens: 4,
    });
  });
});
