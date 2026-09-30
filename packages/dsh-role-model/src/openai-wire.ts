/**
 * The OpenAI chat-completions wire format, in both directions.
 *
 * Outbound, a Harness request becomes the body the runtime accepts, leaving room
 * for `role_model` to be attached at the top level by the adapter.
 *
 * Inbound, an OpenAI SSE stream becomes the Harness's `StreamChunk` vocabulary.
 * The translation is intentionally total: a malformed frame, an in-band error, or
 * a transport failure becomes a terminal `finish` chunk rather than a throw from
 * the middle of a stream, because the adapter contract requires the chunk stream to
 * carry its own outcome.
 *
 * @module @try-works/dsh-role-model/openai-wire
 */

/** A value of unknown shape from a decoded frame. */
type Json = Record<string, unknown>;

/** One content block, structurally. */
export interface WireBlock {
  readonly type?: string | undefined;
  readonly text?: string | undefined;
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly arguments?: string | undefined;
  readonly attachment?: unknown;
}

/** One request message, structurally. */
export interface WireMessage {
  readonly role?: string | undefined;
  readonly content?: string | readonly WireBlock[] | undefined;
  /**
   * Provider-issued id of the tool call this message answers.
   *
   * This is where the Harness carries it: `ToolResultMessage.toolCallId`
   * (`packages/llm/llm/src/message.ts`). It is **not** nested in a `toolResult`
   * object — reading it from there produced an empty `tool_call_id`, which upstream
   * rejects with "An Assistant message with 'tool_calls' must be followed by tool
   * messages responding to each 'tool_call_id'".
   */
  readonly toolCallId?: string | undefined;
  readonly toolResult?:
    | {
        readonly callId?: string | undefined;
        readonly name?: string | undefined;
        readonly content?: string | readonly WireBlock[] | undefined;
      }
    | undefined;
}

/** A tool declaration, structurally. */
export interface WireTool {
  readonly name: string;
  readonly description?: string | undefined;
  readonly parameters?: unknown;
}

/**
 * Resolve an image attachment to a data URL, or `undefined` when its bytes cannot
 * be produced. When it returns undefined the image is described in text instead,
 * so the model still knows an image was present.
 */
export type WireImageResolver = (attachment: unknown) => string | undefined;

/** Options for {@link toOpenAiMessages}. */
export interface ToOpenAiMessagesOptions {
  readonly system?: string | undefined;
  readonly resolveImage?: WireImageResolver | undefined;
}

/** Inputs to {@link buildChatBody}. */
export interface BuildChatBodyInput {
  readonly model: string;
  readonly messages: readonly WireMessage[];
  readonly system?: string | undefined;
  readonly tools?: readonly WireTool[] | undefined;
  readonly temperature?: number | undefined;
  readonly maxTokens?: number | undefined;
  readonly stop?: readonly string[] | undefined;
  readonly reasoningEffort?: string | undefined;
  /** Ask the endpoint to include usage in the stream. */
  readonly includeUsage?: boolean | undefined;
  /** Field name carrying the output cap; defaults to `max_tokens`. */
  readonly maxTokensField?: string | undefined;
  readonly resolveImage?: WireImageResolver | undefined;
}

/** One translated OpenAI message. */
export interface OpenAiMessage {
  readonly role: string;
  readonly content: string | readonly unknown[];
  readonly tool_calls?: readonly unknown[];
  readonly tool_call_id?: string;
}

/** True for a plain object. */
function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Text of a content value (string or block array). */
function textOfContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

/** A text handle describing a file whose bytes never reach the provider. */
function fileHandleText(attachment: unknown): string {
  const record = isRecord(attachment) ? attachment : {};
  const filename = typeof record.filename === "string" ? record.filename : "attachment";
  const size = typeof record.byteSize === "number" ? record.byteSize : undefined;
  const path = typeof record.path === "string" ? record.path : undefined;
  return `[file ${filename}${size === undefined ? "" : `, ${String(size)} bytes`}${path === undefined ? "" : `, saved at ${path}`}]`;
}

/** A text placeholder for an image whose bytes could not be inlined. */
function imagePlaceholderText(attachment: unknown): string {
  const record = isRecord(attachment) ? attachment : {};
  const id = typeof record.id === "string" ? record.id : "attachment";
  return `[image ${id}]`;
}

/**
 * Translate Harness messages into OpenAI chat messages.
 * @param messages - the Harness request's messages.
 * @param options - optional system prompt and image resolver.
 * @returns the OpenAI messages.
 */
export function toOpenAiMessages(
  messages: readonly WireMessage[],
  options: ToOpenAiMessagesOptions = {},
): OpenAiMessage[] {
  const out: OpenAiMessage[] = [];
  if (options.system !== undefined && options.system.length > 0) {
    out.push({ role: "system", content: options.system });
  }

  for (const message of messages) {
    if (isRecord(message) && message.role === "tool") {
      const result = isRecord(message)
        ? (message.toolResult as WireMessage["toolResult"])
        : undefined;
      // The Harness carries the answered id at the top level; the nested `toolResult`
      // shape is accepted as a fallback for callers that build the wire form directly.
      const answered =
        typeof message.toolCallId === "string" && message.toolCallId.length > 0
          ? message.toolCallId
          : typeof result?.callId === "string"
            ? result.callId
            : "";
      out.push({
        role: "tool",
        tool_call_id: answered,
        content: textOfContent(
          result?.content ?? (isRecord(message) ? message.content : undefined),
        ),
      });
      continue;
    }

    const role = typeof message.role === "string" ? message.role : "user";
    const content = message.content;
    if (!Array.isArray(content)) {
      out.push({ role, content: typeof content === "string" ? content : "" });
      continue;
    }

    const textParts: string[] = [];
    const parts: unknown[] = [];
    const toolCalls: unknown[] = [];
    let sawNonTextException = false;

    for (const block of content) {
      if (!isRecord(block)) continue;
      if (block.type === "text" && typeof block.text === "string") {
        textParts.push(block.text);
        continue;
      }
      if (block.type === "reasoning") continue;
      if (block.type === "tool-call") {
        toolCalls.push({
          id: typeof block.id === "string" ? block.id : "",
          type: "function",
          function: {
            name: typeof block.name === "string" ? block.name : "",
            arguments: typeof block.arguments === "string" ? block.arguments : "{}",
          },
        });
        continue;
      }
      if (block.type === "image") {
        const resolved = options.resolveImage?.(block.attachment);
        if (resolved !== undefined) {
          parts.push({ type: "image_url", image_url: { url: resolved } });
          sawNonTextException = true;
        } else {
          textParts.push(imagePlaceholderText(block.attachment));
        }
        continue;
      }
      if (block.type === "file") {
        textParts.push(fileHandleText(block.attachment));
      }
    }

    const text = textParts.join("\n");
    // A message with parts is a multipart content array; otherwise plain text.
    const useParts = sawNonTextException;
    out.push({
      role,
      content: useParts ? [...(text.length > 0 ? [{ type: "text", text }] : []), ...parts] : text,
      ...(toolCalls.length === 0 ? {} : { tool_calls: toolCalls }),
    });
  }
  return out;
}

/**
 * Build the chat-completions body.
 *
 * Optional fields are omitted rather than sent as `null`/`undefined`, so the
 * endpoint's own defaults apply; `role_model` is added by the caller afterwards.
 *
 * @param input - the request to translate.
 * @returns the serializable body.
 */
export function buildChatBody(input: BuildChatBodyInput): Json {
  const body: Json = {
    model: input.model,
    messages: toOpenAiMessages(input.messages, {
      ...(input.system === undefined ? {} : { system: input.system }),
      ...(input.resolveImage === undefined ? {} : { resolveImage: input.resolveImage }),
    }),
    stream: true,
  };

  if (input.includeUsage === true) body.stream_options = { include_usage: true };
  if (input.temperature !== undefined) body.temperature = input.temperature;
  if (input.maxTokens !== undefined) {
    body[input.maxTokensField ?? "max_tokens"] = input.maxTokens;
  }
  if (input.stop !== undefined && input.stop.length > 0) body.stop = [...input.stop];
  // `off` means "do not request reasoning", which is expressed by omitting the field.
  if (input.reasoningEffort !== undefined && input.reasoningEffort !== "off") {
    body.reasoning_effort = input.reasoningEffort;
  }
  if (input.tools !== undefined && input.tools.length > 0) {
    body.tools = input.tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        ...(tool.description === undefined ? {} : { description: tool.description }),
        ...(tool.parameters === undefined ? {} : { parameters: tool.parameters }),
      },
    }));
  }
  return body;
}

/**
 * Extract the `data:` payloads from raw SSE lines.
 * @param lines - raw SSE lines (without terminators).
 * @returns the data payloads, with `[DONE]` included.
 */
export function parseSseData(lines: readonly string[]): string[] {
  const frames: string[] = [];
  for (const line of lines) {
    // A caller may pass raw lines or whole frames, so strip any trailing line
    // terminators first. That makes CRLF and LF streams parse identically.
    const normalized = line.replace(/[\r\n]+$/u, "");
    if (!normalized.startsWith("data:")) continue;
    let payload = normalized.slice("data:".length);
    if (payload.startsWith(" ")) payload = payload.slice(1);
    frames.push(payload);
  }
  return frames;
}

/** Split a byte stream into complete SSE lines, buffering partial ones. */
async function* sseLines(stream: AsyncIterable<Uint8Array>): AsyncIterable<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    while (true) {
      const newline = buffer.indexOf("\n");
      if (newline === -1) break;
      yield buffer.slice(0, newline);
      buffer = buffer.slice(newline + 1);
    }
  }
  buffer += decoder.decode();
  if (buffer.length > 0) yield buffer;
}

/** Normalize a provider finish reason to the Harness vocabulary. */
function finishReasonFor(reason: unknown): { kind: string } {
  if (reason === "tool_calls" || reason === "function_call") return { kind: "tool-calls" };
  if (reason === "length") return { kind: "max-tokens" };
  return { kind: "stop" };
}

/** A terminal error finish. */
function errorFinish(message: string): {
  type: "finish";
  reason: { kind: "error"; failure: { message: string; code: string } };
} {
  return { type: "finish", reason: { kind: "error", failure: { message, code: "SERVER" } } };
}

/** Read token usage from a chunk, translating to the Harness's disjoint counts. */
function usageFrom(raw: unknown):
  | {
      inputTokens: number;
      outputTokens: number;
      totalTokens?: number;
      cacheReadTokens?: number;
    }
  | undefined {
  if (!isRecord(raw)) return undefined;
  const prompt = typeof raw.prompt_tokens === "number" ? raw.prompt_tokens : undefined;
  const completion = typeof raw.completion_tokens === "number" ? raw.completion_tokens : undefined;
  if (prompt === undefined && completion === undefined) return undefined;
  const details = isRecord(raw.prompt_tokens_details) ? raw.prompt_tokens_details : undefined;
  const cached = typeof details?.cached_tokens === "number" ? details.cached_tokens : undefined;
  const total = typeof raw.total_tokens === "number" ? raw.total_tokens : undefined;
  const outputTokens = completion ?? 0;
  // Harness counts are disjoint: input is the UNCACHED prompt count.
  const inputTokens = Math.max(0, (prompt ?? 0) - (cached ?? 0));
  return {
    inputTokens,
    outputTokens,
    ...(total === undefined ? {} : { totalTokens: total }),
    ...(cached === undefined ? {} : { cacheReadTokens: cached }),
  };
}

/** Mutable accumulation state for one stream translation. */
interface StreamState {
  nextIndex: number;
  textIndex: number | undefined;
  text: string;
  reasoningIndex: number | undefined;
  reasoning: string;
  readonly toolCalls: Map<number, { id: string; name: string; arguments: string; index: number }>;
  usageSeen: boolean;
  finishReason: unknown;
  finished: boolean;
}

/**
 * Translate one OpenAI SSE stream into Harness stream chunks.
 *
 * @param stream - raw response body bytes.
 * @returns the chunk stream, always ending in a `finish`.
 */
export async function* streamChunksFromOpenAiSse(
  stream: AsyncIterable<Uint8Array>,
): AsyncIterable<
  | { type: "block-start"; index: number; blockType: string }
  | { type: "text-delta"; index: number; text: string }
  | { type: "reasoning-delta"; index: number; text: string }
  | { type: "tool-call-delta"; index: number; id: string; name?: string; argumentsDelta: string }
  | { type: "block-end"; index: number; block: unknown }
  | { type: "usage"; usage: unknown }
  | { type: "finish"; reason: unknown }
> {
  const state: StreamState = {
    nextIndex: 0,
    textIndex: undefined,
    text: "",
    reasoningIndex: undefined,
    reasoning: "",
    toolCalls: new Map(),
    usageSeen: false,
    finishReason: undefined,
    finished: false,
  };

  /** Close whichever block is currently open, in order. */
  function* closeOpenBlocks(): Generator<{ type: "block-end"; index: number; block: unknown }> {
    if (state.reasoningIndex !== undefined) {
      yield {
        type: "block-end",
        index: state.reasoningIndex,
        block: { type: "reasoning", text: state.reasoning },
      };
      state.reasoningIndex = undefined;
    }
    if (state.textIndex !== undefined) {
      yield {
        type: "block-end",
        index: state.textIndex,
        block: { type: "text", text: state.text },
      };
      state.textIndex = undefined;
    }
    for (const call of [...state.toolCalls.values()].sort((a, b) => a.index - b.index)) {
      yield {
        type: "block-end",
        index: call.index,
        block: { type: "tool-call", id: call.id, name: call.name, arguments: call.arguments },
      };
    }
    state.toolCalls.clear();
  }

  try {
    for await (const line of sseLines(stream)) {
      for (const payload of parseSseData([line])) {
        if (payload === "[DONE]") continue;

        let frame: unknown;
        try {
          frame = JSON.parse(payload);
        } catch {
          yield errorFinish("malformed SSE data frame from the role-model runtime");
          state.finished = true;
          return;
        }
        if (!isRecord(frame)) continue;

        if (isRecord(frame.error)) {
          const message =
            typeof frame.error.message === "string" ? frame.error.message : "runtime error";
          yield errorFinish(message);
          state.finished = true;
          return;
        }

        const usage = usageFrom(frame.usage);
        if (usage !== undefined && !state.usageSeen) {
          state.usageSeen = true;
          yield { type: "usage", usage };
        }

        const choices = Array.isArray(frame.choices) ? frame.choices : [];
        const choice = isRecord(choices[0]) ? choices[0] : undefined;
        if (choice === undefined) continue;

        const delta = isRecord(choice.delta) ? choice.delta : undefined;
        if (delta !== undefined) {
          const reasoningDelta =
            typeof delta.reasoning_content === "string"
              ? delta.reasoning_content
              : typeof delta.reasoning === "string"
                ? delta.reasoning
                : undefined;
          if (reasoningDelta !== undefined && reasoningDelta.length > 0) {
            if (state.reasoningIndex === undefined) {
              state.reasoningIndex = state.nextIndex++;
              yield { type: "block-start", index: state.reasoningIndex, blockType: "reasoning" };
            }
            state.reasoning += reasoningDelta;
            yield { type: "reasoning-delta", index: state.reasoningIndex, text: reasoningDelta };
          }

          const contentDelta = typeof delta.content === "string" ? delta.content : undefined;
          if (contentDelta !== undefined && contentDelta.length > 0) {
            if (state.textIndex === undefined) {
              state.textIndex = state.nextIndex++;
              yield { type: "block-start", index: state.textIndex, blockType: "text" };
            }
            state.text += contentDelta;
            yield { type: "text-delta", index: state.textIndex, text: contentDelta };
          }

          const toolDeltas = Array.isArray(delta.tool_calls) ? delta.tool_calls : [];
          for (const raw of toolDeltas) {
            if (!isRecord(raw)) continue;
            const providerIndex = typeof raw.index === "number" ? raw.index : 0;
            let call = state.toolCalls.get(providerIndex);
            if (call === undefined) {
              call = { id: "", name: "", arguments: "", index: state.nextIndex++ };
              state.toolCalls.set(providerIndex, call);
              yield { type: "block-start", index: call.index, blockType: "tool-call" };
            }
            const fn = isRecord(raw.function) ? raw.function : undefined;
            if (typeof raw.id === "string" && raw.id.length > 0) call.id = raw.id;
            const frameName =
              typeof fn?.name === "string" && fn.name.length > 0 ? fn.name : undefined;
            if (frameName !== undefined) call.name = frameName;
            const argumentsDelta = typeof fn?.arguments === "string" ? fn.arguments : "";
            call.arguments += argumentsDelta;
            yield {
              type: "tool-call-delta",
              index: call.index,
              id: call.id,
              // The name rides only the delta that carries it, matching the
              // provider's own framing; the assembled block carries it always.
              ...(frameName === undefined ? {} : { name: frameName }),
              argumentsDelta,
            };
          }
        }

        if (typeof choice.finish_reason === "string") state.finishReason = choice.finish_reason;
      }
    }
  } catch (error) {
    yield* closeOpenBlocks();
    yield errorFinish(error instanceof Error ? error.message : String(error));
    return;
  }

  yield* closeOpenBlocks();
  if (!state.finished) yield { type: "finish", reason: finishReasonFor(state.finishReason) };
}
