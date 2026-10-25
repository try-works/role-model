import { Schema } from "effect";

export const StudioTabSchema = Schema.Literals(["chat", "images", "audio", "rerank", "advanced"]);
export type StudioTab = typeof StudioTabSchema.Type;
export const StudioFieldSchema = Schema.Literals(["advancedBody", "documents", "mode", "model", "prompt", "query", "size"]);
export type StudioField = typeof StudioFieldSchema.Type;
export const StudioStatusSchema = Schema.Literals(["idle", "loading", "success", "error"]);
export const StudioState = Schema.Struct({
  advancedBody: Schema.String,
  documents: Schema.String,
  message: Schema.optional(Schema.String),
  mode: Schema.String,
  model: Schema.String,
  prompt: Schema.String,
  query: Schema.String,
  responseText: Schema.String,
  size: Schema.String,
  status: StudioStatusSchema,
  statusCode: Schema.Number,
  tab: StudioTabSchema,
  token: Schema.Number,
});
export type StudioState = typeof StudioState.Type;

export const studioIdle = (tab: StudioTab = "chat"): StudioState => ({
  advancedBody: `{
  "model": "moonshot/kimi-k2.5",
  "max_tokens": 64,
  "messages": [{ "role": "user", "content": "Hello" }]
}`,

  documents: "first document\nsecond document",
  message: undefined,
  mode: "generate",
  model: "moonshot/kimi-k2.5",
  prompt: "A quiet harbour at dawn",
  query: "Which document is first?",
  responseText: "Run a Studio request to see the raw response.",
  size: "1024x1024",
  status: "idle",
  statusCode: -1,
  tab,
  token: 0,
});

export const studioLoading = (token: number): StudioState => ({
  ...studioIdle(),
  message: undefined,
  responseText: "Waiting for the runtime…",
  status: "loading",
  statusCode: -1,
  token,
});

export interface StudioRequest {
  readonly body: Readonly<Record<string, unknown>>;
  readonly method: "POST";
  readonly path: string;
  readonly tab: StudioTab;
}
export interface StudioResponse {
  readonly contentType: string;
  readonly status: number;
  readonly text: string;
}
export type StudioClient = (request: StudioRequest, signal: AbortSignal) => Promise<StudioResponse>;

export const studioRequestFor = (state: StudioState): StudioRequest | { readonly error: string } => {
  if (state.tab === "chat") {
    return { body: { messages: [{ content: state.prompt, role: "user" }], model: state.model, stream: false }, method: "POST", path: "/v1/chat/completions", tab: state.tab };
  }
  if (state.tab === "images") {
    return { body: { mode: state.mode, model: state.model, prompt: state.prompt, size: state.size }, method: "POST", path: "/v1/images/generations", tab: state.tab };
  }
  if (state.tab === "audio") {
    return { body: { input: state.prompt, model: state.model, response_format: "mp3", voice: "alloy" }, method: "POST", path: "/v1/audio/speech", tab: state.tab };
  }
  if (state.tab === "rerank") {
    return { body: { documents: state.documents.split("\n").filter((line) => line.length > 0), model: state.model, query: state.query, top_n: 5 }, method: "POST", path: "/v1/rerank", tab: state.tab };
  }
  try {
    const parsed = JSON.parse(state.advancedBody) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { error: "Advanced body must be a JSON object." };
    return { body: parsed as Record<string, unknown>, method: "POST", path: "/v1/messages", tab: state.tab };
  } catch {
    return { error: "Advanced body is not valid JSON." };
  }
};

export const createStudioClient = (options: { readonly baseUrl?: string; readonly fetchImpl?: typeof fetch } = {}): StudioClient =>
  async (request, signal) => {
    const base = options.baseUrl ?? "";
    const response = await (options.fetchImpl ?? fetch)(base + request.path, {
      body: JSON.stringify(request.body),
      headers: { "content-type": "application/json" },
      method: request.method,
      signal,
    });
    return { contentType: response.headers.get("content-type") ?? "", status: response.status, text: await response.text() };
  };
