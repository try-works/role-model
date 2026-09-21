import { expect, test } from "vitest";

import type { EndpointRegistryResult } from "@role-model-router/endpoint-registry";

import * as bridge from "../src/index.js";

// Run 98 addendum 40 (L1): the runtime reports the duration the client waited for, recorded after the
// response has been flushed, instead of leaving the provider response-header time as "latency".
type StartBridgeServer = (options: {
  readonly host: string;
  readonly port: number;
  readonly registry: EndpointRegistryResult;
  readonly executeChatCompletions: (
    body: Record<string, unknown>,
    requestId: string,
  ) => Promise<unknown>;
  readonly recordClientLatency?: (input: {
    readonly requestId: string;
    readonly requestLatencyMs: number;
  }) => void;
}) => Promise<{ readonly port: number; close(): Promise<void> }>;

const emptyRegistry = {
  endpoints: [],
  warnings: [],
  generatedAt: new Date().toISOString(),
} as unknown as EndpointRegistryResult;

function stubChatResult() {
  return {
    endpointId: "moonshot.personal.primary.global.kimi-k2.5",
    adapterFamily: "ai-sdk-openai-compatible",
    routingDecisionId: "decision-a40",
    model: "moonshot/kimi-k2.5",
    outputText: "ok",
    finishReason: "stop",
    usage: { inputTokens: 3, outputTokens: 1 },
  };
}

test("a40 L1: the handler reports the client-visible duration after the response is delivered", async () => {
  const calls: Array<{ readonly requestId: string; readonly requestLatencyMs: number }> = [];
  const server = await (
    bridge as unknown as { startBridgeServer: StartBridgeServer }
  ).startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: emptyRegistry,
    executeChatCompletions: async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
      return stubChatResult();
    },
    recordClientLatency: (input) => {
      calls.push(input);
    },
  });

  try {
    const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    expect(response.status).toBe(200);
    await response.json();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.requestId).toMatch(/^req-/);
    // The reported duration is the flushed request, which cannot be shorter than the provider stub.
    expect(calls[0]?.requestLatencyMs ?? 0).toBeGreaterThanOrEqual(60);
  } finally {
    await server.close();
  }
});

test("a40 L1: a request whose execution fails still reports the duration the client waited", async () => {
  const calls: Array<{ readonly requestId: string; readonly requestLatencyMs: number }> = [];
  const server = await (
    bridge as unknown as { startBridgeServer: StartBridgeServer }
  ).startBridgeServer({
    host: "127.0.0.1",
    port: 0,
    registry: emptyRegistry,
    executeChatCompletions: async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      throw new Error("provider refused");
    },
    recordClientLatency: (input) => {
      calls.push(input);
    },
  });

  try {
    const response = await fetch(`http://127.0.0.1:${server.port}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: "moonshot/kimi-k2.5",
        messages: [{ role: "user", content: "hello" }],
      }),
    });
    expect(response.status).toBe(400);
    await response.json();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.requestLatencyMs ?? 0).toBeGreaterThanOrEqual(30);
  } finally {
    await server.close();
  }
});
