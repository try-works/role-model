/**
 * L5: the plugin-owned provider adapter.
 *
 * This is what makes DSH use the role-model runtime at all. The specs pin the two
 * things DSH validates strictly (model entries must name the owning provider and
 * `resolveModel` must echo the requested identity, or the whole selector group
 * becomes a failure chip), the reasoning-effort declaration, the fact that intent
 * metadata rides the outbound body, and that failures become host `LlmError`s with
 * routable codes rather than opaque throws.
 */

import { describe, expect, test } from "vitest";
import { createRoleModelAdapter } from "../src/adapter.js";
import { createDiscovery, createModelRecord } from "./fixtures.js";

const ENDPOINT = "http://127.0.0.1:3457";
const ROUTE = "role-model";

/** The host classes the adapter must use; the doubles are structurally equivalent. */
class FakeHarnessError extends Error {
  readonly code: string;
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }
}

class FakeLlmError extends FakeHarnessError {
  readonly failure: { message: string; code: string; status?: number };
  constructor(message: string, code: string, options?: { status?: number; cause?: unknown }) {
    super(message, code, options?.cause === undefined ? undefined : { cause: options.cause });
    this.failure = {
      message,
      code,
      ...(options?.status === undefined ? {} : { status: options.status }),
    };
  }
}

/** A minimal `LlmAdapter` base: enough shape to satisfy the adapter's contract. */
const FakeLlmAdapter = class {};

/** Build an adapter over a recording fetch. */
function buildAdapter(
  routes: {
    discovery?: unknown;
    chat?: { status?: number; body?: string; frames?: readonly string[] } | "network-error";
  },
  attachments?: {
    readImage(ref: { attachmentId: string; mediaType: string }): Promise<{ data: Uint8Array }>;
  },
): {
  adapter: ReturnType<typeof createRoleModelAdapter>;
  calls: { url: string; init: RequestInit | undefined; body?: string }[];
} {
  const calls: { url: string; init: RequestInit | undefined; body?: string }[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    calls.push({ url, init, ...(init?.body === undefined ? {} : { body: String(init.body) }) });

    if (url.endsWith("/healthz") || url.endsWith("/api/version")) {
      return new Response(JSON.stringify({ status: "healthy" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.endsWith("/api/role-model/downstream/openai")) {
      return new Response(JSON.stringify(routes.discovery ?? createDiscovery()), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (url.includes("/chat/completions")) {
      const chat = routes.chat;
      if (chat === "network-error") throw new TypeError("fetch failed");
      const frames = chat?.frames ?? [
        'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
        "data: [DONE]\n\n",
      ];
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const frame of frames) controller.enqueue(encoder.encode(frame));
          controller.close();
        },
      });
      return new Response(chat?.body === undefined ? body : chat.body, {
        status: chat?.status ?? 200,
        headers: { "content-type": "text/event-stream" },
      });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  const adapter = createRoleModelAdapter({
    providerRoute: ROUTE,
    endpoint: ENDPOINT,
    placeholderToken: "role-model-local",
    fetch: fetchImpl,
    LlmAdapterBase: FakeLlmAdapter as unknown as never,
    LlmErrorClass: FakeLlmError as unknown as never,
    ...(attachments === undefined ? {} : { attachments: attachments as never }),
  });
  return { adapter, calls };
}
/** Collect an async iterable. */
async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

describe("providerInfo", () => {
  test("names the route exactly and lower-case", () => {
    const { adapter } = buildAdapter({});
    expect(adapter.providerInfo(ROUTE)).toEqual({ id: ROUTE, name: ROUTE });
  });

  test("never uses a capitalised product name", () => {
    const { adapter } = buildAdapter({});
    expect(adapter.providerInfo(ROUTE).name).not.toMatch(/Role[ -]Model/u);
  });
});

describe("listModels", () => {
  test("names the owning provider on every entry, as DSH requires", async () => {
    const { adapter } = buildAdapter({});
    const models = await adapter.listModels(ROUTE);
    expect(models.length).toBeGreaterThan(0);
    for (const model of models) expect(model.provider).toBe(ROUTE);
  });

  test("emits unique non-empty ids and names", async () => {
    const { adapter } = buildAdapter({});
    const models = await adapter.listModels(ROUTE);
    const ids = models.map((model) => model.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const model of models) {
      expect(model.id.length).toBeGreaterThan(0);
      expect(model.name.length).toBeGreaterThan(0);
    }
  });

  test("carries input modalities so the composer can offer attachments", async () => {
    const discovery = createDiscovery({
      models: [createModelRecord({ id: "x", modalities: { availableInput: ["text", "image"] } })],
    });
    const { adapter } = buildAdapter({ discovery });
    const models = await adapter.listModels(ROUTE);
    expect(models[0]?.inputModalities).toEqual(["text", "image"]);
  });

  test("raises an LlmError with a routable code when the runtime is unreachable", async () => {
    const { adapter } = buildAdapter({});
    const failing = createRoleModelAdapter({
      providerRoute: ROUTE,
      endpoint: ENDPOINT,
      placeholderToken: "role-model-local",
      fetch: (async () => {
        throw new TypeError("fetch failed");
      }) as typeof fetch,
      LlmAdapterBase: FakeLlmAdapter as unknown as never,
      LlmErrorClass: FakeLlmError as unknown as never,
    });
    await expect(adapter.listModels(ROUTE)).resolves.toBeDefined();
    await expect(failing.listModels(ROUTE)).rejects.toMatchObject({ code: "SERVER" });
  });

  test("serves the last successful catalog after the runtime goes away", async () => {
    let fail = false;
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (fail) throw new TypeError("fetch failed");
      if (url.endsWith("/healthz") || url.endsWith("/api/version"))
        return new Response("{}", { status: 200 });
      if (url.endsWith("/api/role-model/downstream/openai")) {
        return new Response(JSON.stringify(createDiscovery()), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;
    const adapter = createRoleModelAdapter({
      providerRoute: ROUTE,
      endpoint: ENDPOINT,
      placeholderToken: "role-model-local",
      fetch: fetchImpl,
      LlmAdapterBase: FakeLlmAdapter as unknown as never,
      LlmErrorClass: FakeLlmError as unknown as never,
    });
    const first = await adapter.listModels(ROUTE);
    expect(first.length).toBeGreaterThan(0);
    fail = true;
    // A cached catalog keeps the selector group alive through an outage.
    await expect(adapter.listModels(ROUTE)).resolves.toEqual(first);
  });
});

describe("resolveModel", () => {
  test("echoes the requested provider and id, with a name", async () => {
    const { adapter } = buildAdapter({});
    const resolved = await adapter.resolveModel(ROUTE, "baseline.remote-only");
    expect(resolved.provider).toBe(ROUTE);
    expect(resolved.id).toBe("baseline.remote-only");
    expect(resolved.name.length).toBeGreaterThan(0);
  });

  test("declares the context window and output cap", async () => {
    const { adapter } = buildAdapter({});
    const resolved = await adapter.resolveModel(ROUTE, "baseline.remote-only");
    expect(resolved.context?.contextWindow).toBeGreaterThan(0);
    expect(resolved.defaultMaxTokens).toBeGreaterThan(0);
  });

  test("declares a fixed effort as a single-effort set with that default", async () => {
    const discovery = createDiscovery({
      models: [createModelRecord({ id: "pinned", type: "endpoint", fixedEffort: "high" })],
    });
    const { adapter } = buildAdapter({ discovery });
    const resolved = await adapter.resolveModel(ROUTE, "pinned");
    expect(resolved.reasoning).toEqual({
      efforts: [{ id: "high", name: "high" }],
      defaultEffort: "high",
    });
  });

  test("declares no reasoning control for a model with none", async () => {
    const discovery = createDiscovery({
      models: [
        createModelRecord({
          id: "plain",
          type: "endpoint",
          capabilities: { reasoning: undefined },
        }),
      ],
    });
    const { adapter } = buildAdapter({ discovery });
    const resolved = await adapter.resolveModel(ROUTE, "plain");
    expect(resolved.reasoning).toBeUndefined();
  });

  test("rejects an unknown model with the host error taxonomy", async () => {
    const { adapter } = buildAdapter({});
    await expect(adapter.resolveModel(ROUTE, "does-not-exist")).rejects.toMatchObject({
      code: "UNKNOWN_MODEL",
    });
  });

  test("rejects a provider it does not own", async () => {
    const { adapter } = buildAdapter({});
    await expect(
      adapter.resolveModel("someone-else", "baseline.remote-only"),
    ).rejects.toMatchObject({ code: "NO_ADAPTER" });
  });
});

describe("stream", () => {
  test("posts to the runtime chat-completions endpoint with the placeholder bearer", async () => {
    const { adapter, calls } = buildAdapter({});
    await collect(
      adapter.stream({
        provider: ROUTE,
        model: "baseline.remote-only",
        messages: [{ role: "user", content: [{ type: "text", text: "Implement a bug fix." }] }],
      }),
    );
    const chat = calls.find((call) => call.url.includes("/chat/completions"));
    expect(chat?.url).toBe(`${ENDPOINT}/v1/chat/completions`);
    const headers = chat?.init?.headers as Record<string, string> | undefined;
    expect(headers?.authorization).toBe("Bearer role-model-local");
    expect(headers?.accept).toBe("text/event-stream");
  });

  test("injects role_model into the outbound body", async () => {
    const { adapter, calls } = buildAdapter({});
    await collect(
      adapter.stream({
        provider: ROUTE,
        model: "baseline.remote-only",
        messages: [
          { role: "user", content: [{ type: "text", text: "Implement a bug fix in the parser." }] },
        ],
      }),
    );
    const chat = calls.find((call) => call.url.includes("/chat/completions"));
    const body = JSON.parse(chat?.body ?? "{}") as Record<string, unknown>;
    expect(body.role_model).toBeDefined();
    const intent = (body.role_model as { intent: { role_hint_id: string } }).intent;
    expect(intent.role_hint_id).toBe("coder");
  });

  test("omits role_model for an auxiliary compaction call", async () => {
    const { adapter, calls } = buildAdapter({});
    await collect(
      adapter.stream({
        provider: ROUTE,
        model: "baseline.remote-only",
        purpose: "compaction",
        messages: [
          { role: "user", content: [{ type: "text", text: "Summarize this conversation." }] },
        ],
      }),
    );
    const chat = calls.find((call) => call.url.includes("/chat/completions"));
    const body = JSON.parse(chat?.body ?? "{}") as Record<string, unknown>;
    expect(body.role_model).toBeUndefined();
  });

  test("translates the SSE stream into harness chunks", async () => {
    const { adapter } = buildAdapter({});
    const chunks = await collect(
      adapter.stream({
        provider: ROUTE,
        model: "baseline.remote-only",
        messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      }),
    );
    expect(chunks).toContainEqual({ type: "text-delta", index: 0, text: "hello" });
    expect(chunks.at(-1)).toEqual({ type: "finish", reason: { kind: "stop" } });
  });

  test("rejects before dispatch when the request is for another provider", async () => {
    const { adapter, calls } = buildAdapter({});
    await expect(
      collect(
        adapter.stream({
          provider: "someone-else",
          model: "baseline.remote-only",
          messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        }),
      ),
    ).rejects.toMatchObject({ code: "NO_ADAPTER" });
    expect(calls.filter((call) => call.url.includes("/chat/completions"))).toHaveLength(0);
  });

  test("maps an HTTP 401 to an AUTH failure with its status", async () => {
    const { adapter } = buildAdapter({
      chat: { status: 401, body: '{"error":{"message":"bad key"}}' },
    });
    await expect(
      collect(
        adapter.stream({
          provider: ROUTE,
          model: "baseline.remote-only",
          messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        }),
      ),
    ).rejects.toMatchObject({ code: "AUTH", failure: { status: 401 } });
  });

  test("maps an HTTP 429 to RATE_LIMIT, preserving the retry hint", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      if (url.endsWith("/healthz") || url.endsWith("/api/version"))
        return new Response("{}", { status: 200 });
      if (url.endsWith("/api/role-model/downstream/openai")) {
        return new Response(JSON.stringify(createDiscovery()), { status: 200 });
      }
      return new Response('{"error":{"message":"slow down"}}', {
        status: 429,
        headers: { "retry-after": "2" },
      });
    }) as typeof fetch;
    const adapter = createRoleModelAdapter({
      providerRoute: ROUTE,
      endpoint: ENDPOINT,
      placeholderToken: "role-model-local",
      fetch: fetchImpl,
      LlmAdapterBase: FakeLlmAdapter as unknown as never,
      LlmErrorClass: FakeLlmError as unknown as never,
    });
    await expect(
      collect(
        adapter.stream({
          provider: ROUTE,
          model: "baseline.remote-only",
          messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        }),
      ),
    ).rejects.toMatchObject({ code: "RATE_LIMIT" });
    expect(calls.some((call) => call.includes("/chat/completions"))).toBe(true);
  });

  test("maps an HTTP 400 to INVALID_REQUEST and a 500 to SERVER", async () => {
    for (const [status, code] of [
      [400, "INVALID_REQUEST"],
      [500, "SERVER"],
    ] as const) {
      const { adapter } = buildAdapter({ chat: { status, body: '{"error":{"message":"nope"}}' } });
      await expect(
        collect(
          adapter.stream({
            provider: ROUTE,
            model: "baseline.remote-only",
            messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
          }),
        ),
      ).rejects.toMatchObject({ code });
    }
  });

  test("reports a transport failure as an LlmError, not a bare TypeError", async () => {
    const { adapter } = buildAdapter({ chat: "network-error" });
    await expect(
      collect(
        adapter.stream({
          provider: ROUTE,
          model: "baseline.remote-only",
          messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        }),
      ),
    ).rejects.toMatchObject({ code: "TRANSPORT" });
  });

  test("honours an aborted signal", async () => {
    const { adapter } = buildAdapter({});
    const controller = new AbortController();
    controller.abort();
    await expect(
      collect(
        adapter.stream({
          provider: ROUTE,
          model: "baseline.remote-only",
          signal: controller.signal,
          messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        }),
      ),
    ).rejects.toMatchObject({ code: "ABORTED" });
  });

  test("passes tools, temperature and limits through to the body", async () => {
    const { adapter, calls } = buildAdapter({});
    await collect(
      adapter.stream({
        provider: ROUTE,
        model: "baseline.remote-only",
        messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
        tools: [{ name: "read", description: "read", parameters: { type: "object" } }],
        temperature: 0.1,
        maxTokens: 64,
      }),
    );
    const chat = calls.find((call) => call.url.includes("/chat/completions"));
    const body = JSON.parse(chat?.body ?? "{}") as Record<string, unknown>;
    expect(body.tools).toBeDefined();
    expect(body.temperature).toBe(0.1);
    expect(body.max_tokens).toBe(64);
  });
});

describe("image input", () => {
  /**
   * A prompt image must reach the runtime as an image. The harness carries it as an
   * `image` block whose bytes live behind the durable `attachments` service, so the
   * adapter has to read them and inline a data URL.
   *
   * Before this, the adapter had no way to resolve an attachment and silently replaced
   * every image with placeholder text — the model never saw it, which is exactly the
   * "image input does not work through the plugin" report.
   */
  const imageRef = {
    attachmentId: "sha256:abc",
    mediaType: "image/png",
    bytes: 3,
    width: 1,
    height: 1,
  };

  /** Read the chat-completions body the adapter sent. */
  function sentBody(calls: { url: string; body?: string }[]): Record<string, unknown> {
    const chat = calls.find((call) => call.url.includes("/chat/completions"));
    return JSON.parse(chat?.body ?? "{}") as Record<string, unknown>;
  }

  test("inlines a prompt image as a data URL", async () => {
    const read: string[] = [];
    const { adapter, calls } = buildAdapter(
      {},
      {
        readImage: (ref) => {
          read.push(ref.attachmentId);
          return Promise.resolve({ data: new Uint8Array([1, 2, 3]) });
        },
      },
    );
    await collect(
      adapter.stream({
        provider: ROUTE,
        model: "baseline.remote-only",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "what is this" },
              { type: "image", attachment: imageRef },
            ],
          },
        ],
      } as never),
    );

    const body = sentBody(calls);
    const messages = body.messages as { role: string; content: unknown }[];
    const parts = messages[0]?.content;
    // Multipart content, because a text-only string cannot carry an image.
    expect(Array.isArray(parts)).toBe(true);
    // Base64 of 0x01 0x02 0x03.
    expect(parts).toContainEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,AQID" },
    });
    expect(read).toEqual(["sha256:abc"]);
  });

  test("keeps the accompanying text alongside the image", async () => {
    const { adapter, calls } = buildAdapter(
      {},
      {
        readImage: () => Promise.resolve({ data: new Uint8Array([1]) }),
      },
    );
    await collect(
      adapter.stream({
        provider: ROUTE,
        model: "baseline.remote-only",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "caption this" },
              { type: "image", attachment: imageRef },
            ],
          },
        ],
      } as never),
    );
    const parts = (sentBody(calls).messages as { content: unknown }[])[0]?.content;
    expect(parts).toContainEqual({ type: "text", text: "caption this" });
  });

  test("does not read an image the harness already offloaded", async () => {
    // An offloaded block means the harness decided the model cannot take it; turning it
    // into an image anyway would contradict that decision and waste the read.
    const read: string[] = [];
    const { adapter, calls } = buildAdapter(
      {},
      {
        readImage: (ref) => {
          read.push(ref.attachmentId);
          return Promise.resolve({ data: new Uint8Array([1]) });
        },
      },
    );
    await collect(
      adapter.stream({
        provider: ROUTE,
        model: "baseline.remote-only",
        messages: [
          {
            role: "user",
            content: [{ type: "image", attachment: imageRef, offloaded: true }],
          },
        ],
      } as never),
    );
    expect(read).toEqual([]);
    const content = (sentBody(calls).messages as { content: unknown }[])[0]?.content;
    expect(JSON.stringify(content)).not.toContain("image_url");
  });

  test("degrades to placeholder text when there is no attachment service", async () => {
    // Never throw for this: a route that answers text-only is still usable, and the
    // placeholder tells the model an image existed.
    const { adapter, calls } = buildAdapter({});
    await collect(
      adapter.stream({
        provider: ROUTE,
        model: "baseline.remote-only",
        messages: [{ role: "user", content: [{ type: "image", attachment: imageRef }] }],
      } as never),
    );
    const content = (sentBody(calls).messages as { content: unknown }[])[0]?.content;
    expect(JSON.stringify(content)).not.toContain("image_url");
    expect(JSON.stringify(content).length).toBeGreaterThan(0);
  });

  test("a failed image read does not fail the whole request", async () => {
    const { adapter, calls } = buildAdapter(
      {},
      {
        readImage: () => Promise.reject(new Error("attachment store offline")),
      },
    );
    await collect(
      adapter.stream({
        provider: ROUTE,
        model: "baseline.remote-only",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "still works" },
              { type: "image", attachment: imageRef },
            ],
          },
        ],
      } as never),
    );
    const content = (sentBody(calls).messages as { content: unknown }[])[0]?.content;
    expect(JSON.stringify(content)).toContain("still works");
  });
});
