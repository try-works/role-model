/**
 * L4: the OpenAI wire format.
 *
 * Outbound: a Harness request must become a chat-completions body the runtime
 * accepts, with `role_model` attachable at the top level.
 *
 * Inbound: an OpenAI SSE stream must become the Harness's `StreamChunk`
 * vocabulary exactly — block indexes must correlate deltas, usage must precede the
 * terminal finish, and failures must be reported as a terminal `finish` rather
 * than thrown from the middle of a stream.
 */

import { describe, expect, test } from "vitest";
import {
  buildChatBody,
  parseSseData,
  streamChunksFromOpenAiSse,
  toOpenAiMessages,
} from "../src/openai-wire.js";
import type { WireImageResolver } from "../src/openai-wire.js";

/** One text message. */
const userText = (text: string) => ({ role: "user", content: [{ type: "text", text }] });

/** Collect an async iterable into an array. */
async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

/** Build an SSE byte stream from raw frame strings. */
async function* sseStream(frames: readonly string[]): AsyncIterable<Uint8Array> {
  const encoder = new TextEncoder();
  for (const frame of frames) yield encoder.encode(frame);
}

/** Build an SSE byte stream that fails partway through. */
async function* failingSseStream(
  frames: readonly string[],
  error: unknown,
): AsyncIterable<Uint8Array> {
  const encoder = new TextEncoder();
  for (const frame of frames) yield encoder.encode(frame);
  throw error;
}

describe("toOpenAiMessages", () => {
  test("maps a plain user text message", () => {
    expect(toOpenAiMessages([userText("hello")])).toEqual([{ role: "user", content: "hello" }]);
  });

  test("prepends a system message", () => {
    const messages = toOpenAiMessages([userText("hello")], { system: "be terse" });
    expect(messages[0]).toEqual({ role: "system", content: "be terse" });
    expect(messages[1]).toEqual({ role: "user", content: "hello" });
  });

  test("joins multiple text blocks of one message", () => {
    const messages = toOpenAiMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "a" },
          { type: "text", text: "b" },
        ],
      },
    ]);
    expect(messages).toEqual([{ role: "user", content: "a\nb" }]);
  });

  test("maps an assistant tool call to OpenAI tool_calls and keeps text", () => {
    const messages = toOpenAiMessages([
      {
        role: "assistant",
        content: [
          { type: "text", text: "let me look" },
          { type: "tool-call", id: "call_1", name: "read", arguments: '{"path":"a.ts"}' },
        ],
      },
    ]);
    expect(messages).toEqual([
      {
        role: "assistant",
        content: "let me look",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "read", arguments: '{"path":"a.ts"}' },
          },
        ],
      },
    ]);
  });

  test("maps a tool result to the tool role", () => {
    const messages = toOpenAiMessages([
      {
        role: "tool",
        content: [{ type: "tool-call", id: "call_1", name: "read", arguments: "{}" }],
        toolResult: {
          callId: "call_1",
          name: "read",
          content: [{ type: "text", text: "file body" }],
        },
      },
    ]);
    expect(messages).toEqual([{ role: "tool", tool_call_id: "call_1", content: "file body" }]);
  });

  test("drops reasoning blocks, which providers do not accept as input", () => {
    const messages = toOpenAiMessages([
      {
        role: "assistant",
        content: [
          { type: "reasoning", text: "thinking…" },
          { type: "text", text: "answer" },
        ],
      },
    ]);
    expect(messages).toEqual([{ role: "assistant", content: "answer" }]);
  });

  test("maps an image block to a data URL when a resolver is supplied", () => {
    const resolveImage: WireImageResolver = () => "data:image/png;base64,AAAA";
    const messages = toOpenAiMessages(
      [
        {
          role: "user",
          content: [
            { type: "text", text: "look" },
            { type: "image", attachment: { id: "img1" } },
          ],
        },
      ],
      { resolveImage },
    );
    expect(messages[0]).toEqual({
      role: "user",
      content: [
        { type: "text", text: "look" },
        { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
      ],
    });
  });

  test("describes an image in text when no resolver can produce bytes", () => {
    const messages = toOpenAiMessages([
      { role: "user", content: [{ type: "image", attachment: { id: "img1" } }] },
    ]);
    expect(JSON.stringify(messages[0])).toContain("img1");
    expect(JSON.stringify(messages[0])).toContain("image");
  });

  test("describes a file block as handle text in place of bytes", () => {
    const messages = toOpenAiMessages([
      {
        role: "user",
        content: [{ type: "file", attachment: { filename: "report.pdf", byteSize: 1234 } }],
      },
    ]);
    const text = JSON.stringify(messages[0]);
    expect(text).toContain("report.pdf");
    expect(text).toContain("1234");
  });

  test("never emits an empty content array for a message", () => {
    const messages = toOpenAiMessages([{ role: "user", content: [] }]);
    expect(messages[0]?.content).toBe("");
  });
});

describe("buildChatBody", () => {
  test("builds the minimal body the runtime expects", () => {
    const body = buildChatBody({
      model: "baseline.remote-only",
      messages: [userText("hello")],
    });
    expect(body).toEqual({
      model: "baseline.remote-only",
      messages: [{ role: "user", content: "hello" }],
      stream: true,
    });
  });

  test("includes stream_options when usage reporting is requested", () => {
    const body = buildChatBody({
      model: "m",
      messages: [userText("hi")],
      includeUsage: true,
    });
    expect(body.stream_options).toEqual({ include_usage: true });
  });

  test("maps tools to OpenAI function declarations", () => {
    const body = buildChatBody({
      model: "m",
      messages: [userText("hi")],
      tools: [
        {
          name: "read",
          description: "Read a file",
          parameters: { type: "object", properties: {} },
        },
      ],
    });
    expect(body.tools).toEqual([
      {
        type: "function",
        function: {
          name: "read",
          description: "Read a file",
          parameters: { type: "object", properties: {} },
        },
      },
    ]);
  });

  test("omits tools when none are declared", () => {
    expect(buildChatBody({ model: "m", messages: [userText("hi")] }).tools).toBeUndefined();
    expect(
      buildChatBody({ model: "m", messages: [userText("hi")], tools: [] }).tools,
    ).toBeUndefined();
  });

  test("carries temperature, max tokens, stop and reasoning effort when set", () => {
    const body = buildChatBody({
      model: "m",
      messages: [userText("hi")],
      temperature: 0.3,
      maxTokens: 512,
      stop: ["END"],
      reasoningEffort: "high",
    });
    expect(body).toMatchObject({
      temperature: 0.3,
      max_tokens: 512,
      stop: ["END"],
      reasoning_effort: "high",
    });
  });

  test("omits every optional field when unset, so the runtime default applies", () => {
    const body = buildChatBody({ model: "m", messages: [userText("hi")] });
    expect(Object.keys(body).sort()).toEqual(["messages", "model", "stream"]);
  });

  test("overrides the output-cap field name when the endpoint expects another", () => {
    const body = buildChatBody({
      model: "m",
      messages: [userText("hi")],
      maxTokens: 256,
      maxTokensField: "max_completion_tokens",
    });
    expect(body.max_completion_tokens).toBe(256);
    expect(body.max_tokens).toBeUndefined();
  });

  test("omits reasoning_effort for the off effort", () => {
    const body = buildChatBody({ model: "m", messages: [userText("hi")], reasoningEffort: "off" });
    expect(body.reasoning_effort).toBeUndefined();
  });

  test("serializes without throwing for every block kind", () => {
    const body = buildChatBody({
      model: "m",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "t" },
            { type: "image", attachment: { id: "i" } },
          ],
        },
        {
          role: "assistant",
          content: [{ type: "tool-call", id: "c", name: "read", arguments: "{}" }],
        },
        {
          role: "tool",
          toolResult: { callId: "c", name: "read", content: [{ type: "text", text: "r" }] },
        },
      ],
    });
    expect(() => JSON.stringify(body)).not.toThrow();
  });
});

describe("parseSseData", () => {
  test("extracts data frames and ignores comments and blanks", () => {
    const frames = parseSseData([
      ": keepalive",
      "",
      'data: {"a":1}',
      "data: [DONE]",
      "event: ping",
    ]);
    expect(frames).toEqual(['{"a":1}', "[DONE]"]);
  });

  test("tolerates CRLF line endings", () => {
    expect(parseSseData(['data: {"a":1}\r\n'])).toEqual(['{"a":1}']);
  });

  test("strips a single leading space after the colon", () => {
    expect(parseSseData(['data:{"a":1}', 'data:  {"b":2}'])).toEqual(['{"a":1}', ' {"b":2}']);
  });
});

describe("streamChunksFromOpenAiSse", () => {
  test("emits block-start, text deltas and a block-end for a text answer", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        sseStream([
          'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );
    expect(chunks).toEqual([
      { type: "block-start", index: 0, blockType: "text" },
      { type: "text-delta", index: 0, text: "Hel" },
      { type: "text-delta", index: 0, text: "lo" },
      { type: "block-end", index: 0, block: { type: "text", text: "Hello" } },
      { type: "finish", reason: { kind: "stop" } },
    ]);
  });

  test("emits reasoning deltas as their own block and closes it before the text block", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        sseStream([
          'data: {"choices":[{"delta":{"reasoning_content":"why"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"answer"}}]}\n\n',
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );
    expect(chunks).toContainEqual({ type: "block-start", index: 0, blockType: "reasoning" });
    expect(chunks).toContainEqual({ type: "reasoning-delta", index: 0, text: "why" });
    expect(chunks).toContainEqual({
      type: "block-end",
      index: 0,
      block: { type: "reasoning", text: "why" },
    });
    expect(chunks).toContainEqual({ type: "block-start", index: 1, blockType: "text" });
    expect(chunks).toContainEqual({
      type: "block-end",
      index: 1,
      block: { type: "text", text: "answer" },
    });
  });

  test("emits tool-call deltas and a block-end carrying the parsed call", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        sseStream([
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"read","arguments":"{\\"pa"}}]}}]}\n\n',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"th\\":\\"a.ts\\"}"}}]}}]}\n\n',
          'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );
    expect(chunks).toContainEqual({
      type: "tool-call-delta",
      index: 0,
      id: "call_1",
      name: "read",
      argumentsDelta: '{"pa',
    });
    expect(chunks).toContainEqual({
      type: "tool-call-delta",
      index: 0,
      id: "call_1",
      argumentsDelta: 'th":"a.ts"}',
    });
    expect(chunks).toContainEqual({
      type: "block-end",
      index: 0,
      block: { type: "tool-call", id: "call_1", name: "read", arguments: '{"path":"a.ts"}' },
    });
    expect(chunks).toContainEqual({ type: "finish", reason: { kind: "tool-calls" } });
  });

  test("does not repeat the tool name on argument-only deltas", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        sseStream([
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"read","arguments":"{}"}}]}}]}\n\n',
          'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{}"}}]}}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );
    const deltas = chunks.filter((chunk) => chunk.type === "tool-call-delta");
    expect(deltas).toHaveLength(2);
    // The name rides only the frame that carried it; the assembled block always does.
    expect(deltas[0]).toMatchObject({ name: "read" });
    expect(deltas[1]).not.toHaveProperty("name");
    expect(deltas[1]).toMatchObject({ id: "call_1" });
  });

  test("emits usage before the terminal finish", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        sseStream([
          'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":4,"total_tokens":14}}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );
    const usageIndex = chunks.findIndex((chunk) => chunk.type === "usage");
    const finishIndex = chunks.findIndex((chunk) => chunk.type === "finish");
    expect(usageIndex).toBeGreaterThanOrEqual(0);
    expect(finishIndex).toBeGreaterThan(usageIndex);
    expect(chunks[usageIndex]).toEqual({
      type: "usage",
      usage: { inputTokens: 10, outputTokens: 4, totalTokens: 14 },
    });
  });

  test("subtracts cached prompt tokens from the uncached input count", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        sseStream([
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":100,"completion_tokens":5,"prompt_tokens_details":{"cached_tokens":80}}}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );
    const usage = chunks.find((chunk) => chunk.type === "usage");
    expect(usage).toEqual({
      type: "usage",
      usage: { inputTokens: 20, outputTokens: 5, cacheReadTokens: 80 },
    });
  });

  test("maps finish reasons to the harness vocabulary", async () => {
    const cases = [
      ["stop", { kind: "stop" }],
      ["tool_calls", { kind: "tool-calls" }],
      ["length", { kind: "max-tokens" }],
    ] as const;
    for (const [reason, expected] of cases) {
      const chunks = await collect(
        streamChunksFromOpenAiSse(
          sseStream([
            `data: {"choices":[{"delta":{},"finish_reason":"${reason}"}]}\n\n`,
            "data: [DONE]\n\n",
          ]),
        ),
      );
      expect(chunks.at(-1)).toEqual({ type: "finish", reason: expected });
    }
  });

  test("reports an unknown finish reason as a stop rather than an error", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        sseStream([
          'data: {"choices":[{"delta":{},"finish_reason":"content_filter"}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );
    expect(chunks.at(-1)).toEqual({ type: "finish", reason: { kind: "stop" } });
  });

  test("reports an in-band error frame as a terminal error finish", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        sseStream(['data: {"error":{"message":"upstream exploded","type":"api_error"}}\n\n']),
      ),
    );
    const last = chunks.at(-1);
    expect(last?.type).toBe("finish");
    expect(JSON.stringify(last)).toContain("upstream exploded");
  });

  test("reports a transport failure as a terminal error finish, never a throw", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        failingSseStream(
          ['data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'],
          new Error("socket closed"),
        ),
      ),
    );
    const last = chunks.at(-1);
    expect(last?.type).toBe("finish");
    expect(JSON.stringify(last)).toContain("socket closed");
    // The partial content already emitted stays emitted.
    expect(chunks.some((chunk) => chunk.type === "text-delta")).toBe(true);
  });

  test("reports a malformed data frame as a terminal error finish", async () => {
    const chunks = await collect(streamChunksFromOpenAiSse(sseStream(["data: {not json\n\n"])));
    expect(chunks.at(-1)?.type).toBe("finish");
    expect(JSON.stringify(chunks.at(-1))).toContain("malformed");
  });

  test("ends with a finish even when the stream stops without a reason", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        sseStream(['data: {"choices":[{"delta":{"content":"only"}}]}\n\n', "data: [DONE]\n\n"]),
      ),
    );
    expect(chunks.at(-1)?.type).toBe("finish");
    expect(chunks).toContainEqual({
      type: "block-end",
      index: 0,
      block: { type: "text", text: "only" },
    });
  });

  test("ignores keepalive comments and unknown fields", async () => {
    const chunks = await collect(
      streamChunksFromOpenAiSse(
        sseStream([
          ": keepalive\n\n",
          'data: {"id":"x","choices":[]}\n\n',
          'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
          "data: [DONE]\n\n",
        ]),
      ),
    );
    expect(chunks.filter((chunk) => chunk.type === "text-delta")).toHaveLength(1);
  });
});
