import { Effect, Fiber, Stream } from "effect";
import { describe, expect, it } from "vitest";

import { defineReadDiagnostics, defineReadReadback } from "../src/commands";
import { Message } from "../src/message";
import { DEFAULT_OVERVIEW_FILTERS } from "../src/overview-filters";
import { createReadbackClients } from "../src/readback";
import {
  type RuntimeEventSourceFactory,
  type RuntimeEventSourceLike,
  refreshRevisionStream,
} from "../src/refresh";
import { createUpdate } from "../src/update";
import { shellModel } from "./support/runtime-shell";

/**
 * S290: the shell's single refresh EventSource must own one browser connection for a page's lifetime
 * and survive a BFCache round trip without leaking or double-connecting.
 *
 * Controlled evidence (S289): the packaged gate fails Studio at 15 s on the unchanged SEA, and the
 * ONLY difference that makes the identical gate PASS is a bootstrap that closes the EventSource on
 * pagehide. Retention is implicated; exact socket counts are not claimed here. These tests lock the
 * lifecycle contract deterministically with an injected source and an injected page target.
 */

interface FakeSource extends RuntimeEventSourceLike {
  closeCount(): number;
  emit(type: string, data: string): void;
  listenerCount(type: string): number;
}

const createFakeSource = (): FakeSource => {
  const listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>();
  let closes = 0;
  return {
    addEventListener(type, listener) {
      const registered = listeners.get(type) ?? new Set<(event: MessageEvent<string>) => void>();
      registered.add(listener);
      listeners.set(type, registered);
    },
    close() {
      closes += 1;
    },
    closeCount: () => closes,
    emit(type, data) {
      for (const listener of listeners.get(type) ?? []) {
        listener(new MessageEvent(type, { data }));
      }
    },
    listenerCount: (type) => listeners.get(type)?.size ?? 0,
  };
};

const createFactory = () => {
  const sources: FakeSource[] = [];
  const factory: RuntimeEventSourceFactory = () => {
    const source = createFakeSource();
    sources.push(source);
    return source;
  };
  return { factory, sources };
};

interface FakeLifecycle {
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
  emit(type: "pagehide" | "pageshow", persisted?: boolean): void;
  listenerCount(type: "pagehide" | "pageshow"): number;
}

const createLifecycle = (): FakeLifecycle => {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  return {
    addEventListener(type, listener) {
      const registered = listeners.get(type) ?? new Set<(event: Event) => void>();
      registered.add(listener);
      listeners.set(type, registered);
    },
    emit(type, persisted = false) {
      const event = new Event(type);
      Object.defineProperty(event, "persisted", { value: persisted });
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
    listenerCount: (type) => listeners.get(type)?.size ?? 0,
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
  };
};

const revisionPayload = (revision: number): string => JSON.stringify({ revision });

const telemetryPayload = (requestId: string): string =>
  JSON.stringify({
    emittedAtMs: 1_760_000_000_000,
    eventName: "telemetry.update",
    request: { requestId },
  });

interface RunningStream {
  readonly messages: Message[];
  stop(): Promise<void>;
}

const startStream = (
  factory: RuntimeEventSourceFactory,
  lifecycle?: FakeLifecycle,
): RunningStream => {
  const messages: Message[] = [];
  const stream =
    lifecycle === undefined
      ? refreshRevisionStream(factory)
      : refreshRevisionStream(factory, lifecycle);
  const fiber = Effect.runFork(
    Stream.runForEach(stream, (message) =>
      Effect.sync(() => {
        messages.push(message);
      }),
    ),
  );
  return {
    messages,
    stop: async () => {
      await Effect.runPromise(Fiber.interrupt(fiber));
    },
  };
};

/** Bounded settle: the queue is offered synchronously; this only lets the fiber observe it. */
const settle = (): Promise<void> => Effect.runPromise(Effect.sleep("10 millis"));

const messageTag = (message: Message): unknown => ("_tag" in message ? message._tag : undefined);

const restoreMessages = (messages: readonly Message[]): Message[] =>
  messages.filter((message) => messageTag(message) === "RuntimePageRestored");

const revisionMessages = (messages: readonly Message[]): Message[] =>
  messages.filter((message) => messageTag(message) === "RuntimeRevisionReceived");

const sourceAt = (sources: readonly FakeSource[], index: number): FakeSource => {
  const source = sources[index];
  if (source === undefined) throw new Error(`expected a source at index ${String(index)}`);
  return source;
};

const countedFetch = () => {
  const calls: { method: string; url: string }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ method: init?.method ?? "GET", url });
    const body = url.includes("/api/metrics/page")
      ? { items: [], window: { asOfMs: 1, endAtMs: 1, startAtMs: 0 } }
      : { requests: [] };
    return new Response(JSON.stringify(body), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  };
  return { calls, fetchImpl };
};

const createTestUpdate = (fetchImpl: typeof fetch) => {
  const readReadback = defineReadReadback(
    createReadbackClients({ baseUrl: "http://127.0.0.1", fetchImpl }),
  );
  const readDiagnostics = defineReadDiagnostics(async () => ({
    body: { records: [], state: "empty" },
    status: 200,
  }));
  return createUpdate(
    readDiagnostics,
    undefined,
    undefined,
    readReadback,
    undefined,
    undefined,
    undefined,
    undefined,
  );
};

describe("S290 refresh EventSource page lifetime", () => {
  it("opens exactly one source per stream with both event listeners on it", async () => {
    const { factory, sources } = createFactory();
    const lifecycle = createLifecycle();
    const running = startStream(factory, lifecycle);
    await settle();
    expect(sources).toHaveLength(1);
    expect(sources[0]?.listenerCount("revision.update")).toBe(1);
    expect(sources[0]?.listenerCount("telemetry.update")).toBe(1);
    await running.stop();
  });

  it("pagehide closes the one source exactly once and late callbacks from it never offer", async () => {
    const { factory, sources } = createFactory();
    const lifecycle = createLifecycle();
    const running = startStream(factory, lifecycle);
    await settle();
    const source = sourceAt(sources, 0);
    lifecycle.emit("pagehide", false);
    expect(source.closeCount()).toBe(1);
    lifecycle.emit("pagehide", true);
    expect(source.closeCount()).toBe(1);
    source.emit("revision.update", revisionPayload(7));
    source.emit("telemetry.update", telemetryPayload("retired-1"));
    await settle();
    expect(running.messages).toHaveLength(0);
    await running.stop();
  });

  it("persisted pageshow reopens exactly one fresh source with listeners and no duplicate on repeated show", async () => {
    const { factory, sources } = createFactory();
    const lifecycle = createLifecycle();
    const running = startStream(factory, lifecycle);
    await settle();
    lifecycle.emit("pagehide", true);
    lifecycle.emit("pageshow", true);
    await settle();
    expect(sources).toHaveLength(2);
    const fresh = sourceAt(sources, 1);
    expect(fresh.listenerCount("revision.update")).toBe(1);
    expect(fresh.listenerCount("telemetry.update")).toBe(1);
    fresh.emit("revision.update", revisionPayload(11));
    await settle();
    expect(revisionMessages(running.messages)).toHaveLength(1);
    lifecycle.emit("pageshow", true);
    await settle();
    expect(sources).toHaveLength(2);
    await running.stop();
  });

  it("retired-generation callbacks stay silent even after the fresh source is active", async () => {
    const { factory, sources } = createFactory();
    const lifecycle = createLifecycle();
    const running = startStream(factory, lifecycle);
    await settle();
    const retired = sourceAt(sources, 0);
    lifecycle.emit("pagehide", true);
    lifecycle.emit("pageshow", true);
    await settle();
    const fresh = sourceAt(sources, 1);
    fresh.emit("revision.update", revisionPayload(21));
    await settle();
    expect(revisionMessages(running.messages)).toHaveLength(1);
    retired.emit("revision.update", revisionPayload(22));
    retired.emit("telemetry.update", telemetryPayload("retired-2"));
    await settle();
    expect(revisionMessages(running.messages)).toHaveLength(1);
    await running.stop();
  });

  it("an ordinary pageshow (not persisted) opens no second source", async () => {
    const { factory, sources } = createFactory();
    const lifecycle = createLifecycle();
    const running = startStream(factory, lifecycle);
    await settle();
    lifecycle.emit("pageshow", false);
    await settle();
    expect(sources).toHaveLength(1);
    await running.stop();
  });

  it("SPA navigation events do not create another source", async () => {
    const { factory, sources } = createFactory();
    const lifecycle = createLifecycle();
    const running = startStream(factory, lifecycle);
    await settle();
    window.dispatchEvent(new Event("popstate"));
    window.dispatchEvent(new Event("foldkit:urlchange"));
    window.history.pushState({}, "", "/studio");
    await settle();
    expect(sources).toHaveLength(1);
    await running.stop();
  });

  it("the finalizer closes the current source, detaches page listeners and later pageshow cannot reopen", async () => {
    const { factory, sources } = createFactory();
    const lifecycle = createLifecycle();
    const running = startStream(factory, lifecycle);
    await settle();
    lifecycle.emit("pagehide", true);
    lifecycle.emit("pageshow", true);
    await settle();
    const fresh = sourceAt(sources, 1);
    await running.stop();
    expect(fresh.closeCount()).toBe(1);
    expect(lifecycle.listenerCount("pagehide")).toBe(0);
    expect(lifecycle.listenerCount("pageshow")).toBe(0);
    lifecycle.emit("pageshow", true);
    await settle();
    expect(sources).toHaveLength(2);
  });

  it("multiple hide/show cycles open one source per cycle and silence every retired generation", async () => {
    const { factory, sources } = createFactory();
    const lifecycle = createLifecycle();
    const running = startStream(factory, lifecycle);
    await settle();
    lifecycle.emit("pagehide", true);
    lifecycle.emit("pageshow", true);
    lifecycle.emit("pagehide", true);
    lifecycle.emit("pageshow", true);
    await settle();
    expect(sources).toHaveLength(3);
    expect(sources[0]?.closeCount()).toBe(1);
    expect(sources[1]?.closeCount()).toBe(1);
    expect(sources[2]?.closeCount()).toBe(0);
    sources[0]?.emit("revision.update", revisionPayload(31));
    sources[1]?.emit("revision.update", revisionPayload(32));
    await settle();
    expect(revisionMessages(running.messages)).toHaveLength(0);
    sources[2]?.emit("revision.update", revisionPayload(33));
    await settle();
    expect(revisionMessages(running.messages)).toHaveLength(1);
    await running.stop();
  });

  it("keeps revision and telemetry parsing unchanged (malformed payloads never emit)", async () => {
    const { factory, sources } = createFactory();
    const lifecycle = createLifecycle();
    const running = startStream(factory, lifecycle);
    await settle();
    const source = sourceAt(sources, 0);
    source.emit("revision.update", "{bad json");
    source.emit("revision.update", JSON.stringify({ revision: 1.5 }));
    source.emit("telemetry.update", "{bad json");
    source.emit(
      "telemetry.update",
      JSON.stringify({
        emittedAtMs: 1.5,
        eventName: "telemetry.update",
        request: { requestId: "x" },
      }),
    );
    await settle();
    expect(running.messages).toHaveLength(0);
    source.emit("revision.update", revisionPayload(41));
    await settle();
    expect(running.messages).toHaveLength(1);
    source.emit("telemetry.update", telemetryPayload("req-1"));
    await settle();
    expect(running.messages).toHaveLength(2);
    await running.stop();
  });

  it("emits exactly one RuntimePageRestored after a successful persisted reopen only", async () => {
    const { factory } = createFactory();
    const lifecycle = createLifecycle();
    const running = startStream(factory, lifecycle);
    await settle();
    expect(restoreMessages(running.messages)).toHaveLength(0);
    lifecycle.emit("pagehide", true);
    await settle();
    expect(restoreMessages(running.messages)).toHaveLength(0);
    lifecycle.emit("pageshow", false);
    await settle();
    expect(restoreMessages(running.messages)).toHaveLength(0);
    lifecycle.emit("pageshow", true);
    await settle();
    expect(restoreMessages(running.messages)).toHaveLength(1);
    lifecycle.emit("pageshow", true);
    await settle();
    expect(restoreMessages(running.messages)).toHaveLength(1);
    await running.stop();
  });

  it("closes the new generation before propagating when a listener attach fails", async () => {
    const lifecycle = createLifecycle();
    const bad = createFakeSource();
    const original = bad.addEventListener;
    let attaches = 0;
    bad.addEventListener = (type, listener) => {
      attaches += 1;
      if (attaches === 2) throw new Error("attach boom");
      original(type, listener);
    };
    const stream = refreshRevisionStream(() => bad, lifecycle);
    await expect(Effect.runPromise(Stream.runCollect(stream))).rejects.toThrow("attach boom");
    expect(bad.closeCount()).toBe(1);
    expect(lifecycle.listenerCount("pagehide")).toBe(0);
  });

  it("a failed reopen from the factory is reported and a later persisted pageshow retries successfully", async () => {
    const lifecycle = createLifecycle();
    const { factory, sources } = createFactory();
    let calls = 0;
    const failing: RuntimeEventSourceFactory = (url) => {
      calls += 1;
      if (calls === 2) throw new Error("factory reopen boom");
      return factory(url);
    };
    const running = startStream(failing, lifecycle);
    await settle();
    const errors: unknown[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      lifecycle.emit("pagehide", true);
      expect(() => lifecycle.emit("pageshow", true)).not.toThrow();
      await settle();
      expect(restoreMessages(running.messages)).toHaveLength(0);
      expect(errors).toHaveLength(1);
      lifecycle.emit("pageshow", true);
      await settle();
      expect(sources).toHaveLength(2);
      expect(restoreMessages(running.messages)).toHaveLength(1);
    } finally {
      console.error = originalError;
      await running.stop();
    }
  });

  it("cleans the pagehide listener and source when pageshow registration throws", async () => {
    const lifecycle = createLifecycle();
    const originalAdd = lifecycle.addEventListener;
    lifecycle.addEventListener = (type, listener) => {
      if (type === "pageshow") throw new Error("pageshow registration boom");
      originalAdd(type, listener);
    };
    const { factory, sources } = createFactory();
    const stream = refreshRevisionStream(factory, lifecycle);
    await expect(Effect.runPromise(Stream.runCollect(stream))).rejects.toThrow(
      "pageshow registration boom",
    );
    expect(sources[0]?.closeCount()).toBe(1);
    expect(lifecycle.listenerCount("pagehide")).toBe(0);
  });

  it("restore re-reads the current Index route with its selected window and filters, never the watermark", async () => {
    const { calls, fetchImpl } = countedFetch();
    const update = createTestUpdate(fetchImpl);
    const model = {
      ...shellModel({ route: { _tag: "Index" } }),
      overviewFilters: DEFAULT_OVERVIEW_FILTERS,
      overviewWindowMs: 3_600_000,
    };
    expect(model.refresh.lastAppliedRevision).toBe(0);
    const result = update(model, Message.RuntimePageRestored({}));
    expect(result.model.refresh.lastAppliedRevision).toBe(0);
    expect(result.model.refresh.resyncToken).toBe(0);
    expect(result.model.refresh.status).toBe("idle");
    expect(result.model.refresh.message).toBeUndefined();
    const commands = result.commands ?? [];
    expect(commands).toHaveLength(1);
    expect(commands[0]?.name).toBe("ReadReadback");
    const command = commands[0];
    if (command === undefined) throw new Error("expected one read Command");
    const resolved = await Effect.runPromise(command.effect);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.url).toContain("/api/metrics/page");
    expect(calls[0]?.url).toContain("windowMs=3600000");
    const applied = update(result.model, resolved);
    expect(applied.model.refresh.lastAppliedRevision).toBe(0);
  });
});
