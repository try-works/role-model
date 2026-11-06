import { Effect, Fiber, Option, Stream } from "effect";
import { describe, expect, it } from "vitest";

import { type Url, fromString as urlFromString } from "@role-model-router/foldkit/url";

import { defineReadDiagnostics, defineReadReadback } from "../src/commands";
import { Message } from "../src/message";
import { DEFAULT_OVERVIEW_FILTERS, overviewQuery } from "../src/overview-filters";
import { createReadbackClients } from "../src/readback";
import {
  type RuntimeEventSourceFactory,
  type RuntimeEventSourceLike,
  refreshRevisionStream,
} from "../src/refresh";
import { createUpdate } from "../src/update";
import { shellModel } from "./support/runtime-shell";

/**
 * S278 (R12): the shared runtime refresh stream must consume `telemetry.update`, not only
 * `revision.update`.
 *
 * The original React client subscribed both events on one EventSource
 * (`apps/runtime-ui/app/lib/runtime-api.ts:3021-3026`). The telemetry payload
 * (`runtime-api.ts:693-698`) is `{ eventName, emittedAtMs, request, summary? }` and carries NO
 * revision, so a telemetry invalidation must re-read the current route and must never advance the
 * revision watermark or the gap/resync token. The shell only listened for `revision.update`, so a
 * newly persisted request never refreshed a telemetry page.
 *
 * These tests drive the production stream with an injected real source, feed the emitted Message to
 * the production reducer, and execute the returned real read Command against the real readback
 * client with an injected `fetch` — an actual GET, not a command-shape assertion alone.
 */

const REQUESTS_PATH = "/api/role-model/telemetry/requests";

const urlOf = (href: string): Url =>
  Option.getOrThrow(urlFromString(`http://foldkit.local${href}`));

const firstMessage = (messages: readonly Message[]): Message => {
  const [message] = messages;
  if (message === undefined) throw new Error("expected at least one emitted message");
  return message;
};

interface FakeRuntimeSource extends RuntimeEventSourceLike {
  closeCount(): number;
  emit(type: string, data: string): void;
  listenerCount(type: string): number;
}

const createFakeSource = (): FakeRuntimeSource => {
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

const telemetryPayload = (requestId: string): string =>
  JSON.stringify({
    emittedAtMs: 1_760_000_000_000,
    eventName: "telemetry.update",
    request: { endpointId: "endpoint-s278", modelId: "model-s278", requestId, status: "success" },
    summary: { requestCount: 1 },
  });

const waitFor = async (
  predicate: () => boolean,
  message: string,
  timeoutMs = 1_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => {
      setTimeout(resolve, 5);
    });
  }
  throw new Error(message);
};

/** Path-aware stub body: each reader parses its own contract from the real client. */
const bodyForUrl = (url: string) =>
  url.includes("/api/metrics/page")
    ? { items: [{ requestId: "req-s278" }], window: { asOfMs: 1, endAtMs: 1, startAtMs: 0 } }
    : url.includes("/api/role-model/telemetry/summary")
      ? { requestCount: 1, status: "ok" }
      : {
          requests: [
            {
              endpointId: "endpoint-s278",
              modelId: "model-s278",
              requestId: "req-s278",
              status: "success",
            },
          ],
        };

const countedFetch = () => {
  const calls: { method: string; url: string }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ method: init?.method ?? "GET", url });
    return new Response(JSON.stringify(bodyForUrl(url)), {
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

interface RunningStream {
  readonly messages: Message[];
  stop(): Promise<void>;
}

const startStream = (factory: RuntimeEventSourceFactory): RunningStream => {
  const messages: Message[] = [];
  const fiber = Effect.runFork(
    Stream.runForEach(refreshRevisionStream(factory), (message) =>
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

const telemetryMessage = async (
  source: FakeRuntimeSource,
  stream: RunningStream,
  requestId = "req-s278",
): Promise<Message> => {
  await waitFor(
    () => source.listenerCount("telemetry.update") > 0,
    "the refresh subscription must listen for telemetry.update",
  );
  source.emit("telemetry.update", telemetryPayload(requestId));
  await waitFor(
    () => stream.messages.length > 0,
    "the real refresh subscription must emit a typed telemetry invalidation",
  );
  return firstMessage(stream.messages);
};

describe("S278 telemetry refresh (R12)", () => {
  it("re-reads exactly the current data route for one telemetry event and never advances the watermark", async () => {
    const source = createFakeSource();
    const { calls, fetchImpl } = countedFetch();
    const update = createTestUpdate(fetchImpl);
    const stream = startStream(() => source);
    try {
      const message = await telemetryMessage(source, stream);
      const model = shellModel({ route: { _tag: "Requests" } });
      const result = update(model, message);

      expect(result.model.refresh.lastAppliedRevision).toBe(0);
      expect(result.model.refresh.resyncToken).toBe(0);
      expect(result.model.refresh.status).toBe("idle");
      expect(result.model.refresh.message).toBeUndefined();

      const commands = result.commands ?? [];
      expect(commands).toHaveLength(2);
      expect(commands.every((entry) => entry.name === "ReadReadback")).toBe(true);
      expect(
        commands.map((entry) =>
          String((entry.args as { readonly key?: unknown } | undefined)?.key),
        ),
      ).toEqual(["requests", "overviewMetrics"]);
      expect(result.model.readbacks.requests.token).toBe(model.readbacks.requests.token + 1);
      expect(result.model.readbacks.requests.status).toBe("loading");
      expect(result.model.readbacks.overviewMetrics.status).toBe("loading");

      const command = commands[0];
      if (command === undefined) throw new Error("expected one read Command");
      const resolved = await Effect.runPromise(command.effect);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.method).toBe("GET");
      expect(calls[0]?.url).toContain(REQUESTS_PATH);

      const applied = update(result.model, resolved);
      // The readback state's success status is "ok" (`readback.ts:225-226`), not "success".
      expect(applied.model.readbacks.requests.status).toBe("ok");
      expect(applied.model.readbacks.requests.rows.map((row) => row.id)).toContain("req-s278");
      expect(applied.model.refresh.lastAppliedRevision).toBe(0);
    } finally {
      await stream.stop();
    }
  });

  it("preserves revision decoding, dedupe and gap semantics", async () => {
    const source = createFakeSource();
    const { fetchImpl } = countedFetch();
    const update = createTestUpdate(fetchImpl);
    const stream = startStream(() => source);
    try {
      await waitFor(
        () => source.listenerCount("revision.update") > 0,
        "the refresh subscription must keep listening for revision.update",
      );
      const model = shellModel({ route: { _tag: "Requests" } });
      const first = update(model, Message.RuntimeRevisionReceived({ revision: 5 }));
      expect(first.model.refresh.lastAppliedRevision).toBe(5);
      expect(first.model.refresh.status).toBe("live");
      expect(first.commands ?? []).toHaveLength(1);
      const duplicate = update(first.model, Message.RuntimeRevisionReceived({ revision: 5 }));
      expect(duplicate.model.refresh.lastAppliedRevision).toBe(5);
      expect(duplicate.commands ?? []).toHaveLength(0);
      expect(duplicate.model.readbacks.requests.token).toBe(first.model.readbacks.requests.token);
    } finally {
      await stream.stop();
      expect(source.closeCount()).toBe(1);
    }
  });

  it("ignores malformed telemetry instead of inventing a revision", async () => {
    const source = createFakeSource();
    const { fetchImpl } = countedFetch();
    const update = createTestUpdate(fetchImpl);
    const stream = startStream(() => source);
    try {
      await waitFor(
        () => source.listenerCount("telemetry.update") > 0,
        "the refresh subscription must listen for telemetry.update",
      );
      const malformed = [
        "{",
        "null",
        "[]",
        JSON.stringify({ emittedAtMs: 1, eventName: "telemetry.update" }),
        JSON.stringify({ emittedAtMs: 1, eventName: "telemetry.update", request: {} }),
        JSON.stringify({
          emittedAtMs: "1",
          eventName: "telemetry.update",
          request: { requestId: "r" },
        }),
        JSON.stringify({
          emittedAtMs: 1,
          eventName: "revision.update",
          request: { requestId: "r" },
        }),
        JSON.stringify({ eventName: "telemetry.update", request: { requestId: "r" } }),
        JSON.stringify({ emittedAtMs: 1, eventName: "telemetry.update", request: ["r"] }),
        // JSON.parse turns 1e999 into Infinity, and a fractional timestamp is not an emittedAtMs.
        '{"emittedAtMs":1e999,"eventName":"telemetry.update","request":{"requestId":"r"}}',
        JSON.stringify({
          emittedAtMs: 1.5,
          eventName: "telemetry.update",
          request: { requestId: "r" },
        }),
        JSON.stringify({
          emittedAtMs: 1,
          eventName: "telemetry.update",
          request: { requestId: "" },
        }),
      ];
      for (const payload of malformed) {
        source.emit("telemetry.update", payload);
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      expect(stream.messages).toHaveLength(0);

      source.emit("revision.update", JSON.stringify({ eventName: "revision.update", revision: 7 }));
      await waitFor(() => stream.messages.length > 0, "the revision signal must still arrive");
      expect(stream.messages).toHaveLength(1);
      const applied = update(
        shellModel({ route: { _tag: "Requests" } }),
        firstMessage(stream.messages),
      );
      expect(applied.model.refresh.lastAppliedRevision).toBe(7);
    } finally {
      await stream.stop();
    }
  });

  it("fences a late telemetry read by the per-key token and never touches the active route", async () => {
    const source = createFakeSource();
    const { fetchImpl } = countedFetch();
    const update = createTestUpdate(fetchImpl);
    const stream = startStream(() => source);
    try {
      const message = await telemetryMessage(source, stream);
      const model = shellModel({ route: { _tag: "Requests" } });
      const result = update(model, message);
      const command = (result.commands ?? [])[0];
      if (command === undefined) throw new Error("expected one read Command");
      const resolved = await Effect.runPromise(command.effect);

      // Away and back: the Requests readback is re-issued with a NEW token, so the older result is fenced.
      const away = update(result.model, Message.ChangedUrl({ url: urlOf("/models") }));
      expect(away.model.route._tag).toBe("Models");
      const back = update(away.model, Message.ChangedUrl({ url: urlOf("/requests") }));
      expect(back.model.readbacks.requests.token).toBe(result.model.readbacks.requests.token + 1);
      expect(back.model.readbacks.requests.status).toBe("loading");
      const fenced = update(back.model, resolved);
      expect(fenced.model.readbacks.requests.token).toBe(back.model.readbacks.requests.token);
      expect(fenced.model.readbacks.requests.status).toBe("loading");
      expect(fenced.model.readbacks.requests.rows).toHaveLength(0);
      expect(fenced.model.refresh.lastAppliedRevision).toBe(0);

      // INHERITED LIMITATION (shared with revision reads, not introduced here): the shell fences per
      // readback key token, not by route identity. A late result for a key whose token did not change
      // is applied to that (now inactive) key slot; the active route's own data is untouched.
      const inactiveSlot = update(away.model, resolved);
      expect(inactiveSlot.model.readbacks.requests.status).toBe("ok");
      expect(inactiveSlot.model.readbacks.models).toEqual(away.model.readbacks.models);
    } finally {
      await stream.stop();
    }
  });

  it("preserves an existing stale gap watermark when telemetry arrives", async () => {
    const source = createFakeSource();
    const { fetchImpl } = countedFetch();
    const update = createTestUpdate(fetchImpl);
    const stream = startStream(() => source);
    try {
      const message = await telemetryMessage(source, stream);
      const model = shellModel({
        refresh: {
          lastAppliedRevision: 2,
          message: "resyncing after a revision gap",
          resyncToken: 3,
          status: "stale",
        },
        route: { _tag: "Requests" },
      });
      const result = update(model, message);
      // The telemetry transition itself preserves the gap verbatim: no watermark, resync or status write.
      expect(result.model.refresh).toEqual(model.refresh);
      const command = (result.commands ?? [])[0];
      expect(command?.name).toBe("ReadReadback");
      if (command === undefined) throw new Error("expected one read Command");

      // INHERITED LIMITATION, recorded rather than claimed as preserved: when the re-read completes,
      // the shared `ReadbackLoaded` transition (src/update.ts:481-484) auto-marks refresh "live" and
      // clears its message — the same thing it does for a revision-triggered read. The revision
      // watermark and the resync token are NOT touched, and no revision number is synthesized.
      const resolved = await Effect.runPromise(command.effect);
      const applied = update(result.model, resolved);
      expect(applied.model.refresh.status).toBe("live");
      expect(applied.model.refresh.message).toBeUndefined();
      expect(applied.model.refresh.lastAppliedRevision).toBe(model.refresh.lastAppliedRevision);
      expect(applied.model.refresh.resyncToken).toBe(model.refresh.resyncToken);
    } finally {
      await stream.stop();
    }
  });

  it("re-reads the Index overview with the selected window and filters, never an empty windowMs", async () => {
    const source = createFakeSource();
    const { calls, fetchImpl } = countedFetch();
    const update = createTestUpdate(fetchImpl);
    const stream = startStream(() => source);
    try {
      const message = await telemetryMessage(source, stream);
      const filters = {
        breakdown: "endpoint",
        breakdownValue: "endpoint-s278",
        difficulty: "hard",
        source: "local",
        status: "failure",
      } as const;
      const model = shellModel({
        overviewFilters: filters,
        overviewWindowMs: 3_600_000,
        route: { _tag: "Index" },
      });
      const result = update(model, message);
      const command = (result.commands ?? [])[0];
      expect(command?.name).toBe("ReadReadback");
      if (command === undefined) throw new Error("expected one read Command");
      // The Index read must carry the SAME query the shell's own selected-window/filter read builds
      // (update.ts:493/503): the selected window and filters, not an empty windowMs.
      expect(command.args?.key).toBe("overviewMetrics");
      expect(command.args?.query).toBe(overviewQuery(filters, 3_600_000));
      expect(result.model.refresh.lastAppliedRevision).toBe(0);
      expect(result.model.refresh.resyncToken).toBe(0);
      expect(result.model.readbacks.overviewMetrics.token).toBe(
        model.readbacks.overviewMetrics.token + 1,
      );

      const resolved = await Effect.runPromise(command.effect);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toContain("/api/metrics/page?windowMs=3600000");
      expect(calls[0]?.url).toContain("endpointIds=endpoint-s278");
      expect(calls[0]?.url).toContain("statusFamilies=failure");
      // A regression to the bug shows up as a dangling empty window in the real GET.
      expect(calls[0]?.url).not.toMatch(/windowMs=(&|$)/);

      // A default Index (no selected window/filters) uses the shell default 86400000, not empty.
      const defaults = update(shellModel({ route: { _tag: "Index" } }), message);
      const defaultCommand = (defaults.commands ?? [])[0];
      if (defaultCommand === undefined) throw new Error("expected one default read Command");
      expect(defaultCommand.args?.query).toBe(overviewQuery(DEFAULT_OVERVIEW_FILTERS, 86_400_000));
      const defaultResolved = await Effect.runPromise(defaultCommand.effect);
      expect(calls).toHaveLength(2);
      expect(calls[1]?.url).toContain("/api/metrics/page?windowMs=86400000");
      expect(calls[1]?.url).not.toMatch(/windowMs=(&|$)/);
      const defaultApplied = update(defaults.model, defaultResolved);
      expect(defaultApplied.model.readbacks.overviewMetrics.status).toBe("ok");
      // A late response for the pre-telemetry token is fenced.
      const late = update(
        defaultApplied.model,
        Message.ReadbackLoaded({
          key: "overviewMetrics",
          snapshot: { ...defaultApplied.model.readbacks.overviewMetrics, token: 0 },
          token: 0,
        }),
      );
      expect(late.model.readbacks.overviewMetrics).toEqual(
        defaultApplied.model.readbacks.overviewMetrics,
      );
    } finally {
      await stream.stop();
    }
  });

  it("re-reads the Dashboard window through the id, never an empty window", async () => {
    const source = createFakeSource();
    const { calls, fetchImpl } = countedFetch();
    const update = createTestUpdate(fetchImpl);
    const stream = startStream(() => source);
    try {
      const message = await telemetryMessage(source, stream);
      const model = shellModel({ overviewWindowMs: 7_200_000, route: { _tag: "Dashboard" } });
      const result = update(model, message);
      const command = (result.commands ?? [])[0];
      if (command === undefined) throw new Error("expected one read Command");
      expect(command.args?.key).toBe("dashboard");
      // The Dashboard reader takes its window as the id argument (readback.ts:757-763; init.ts:146).
      expect(command.args?.id).toBe("7200000");
      expect(result.model.refresh.lastAppliedRevision).toBe(0);
      expect(result.model.refresh.resyncToken).toBe(0);

      await Effect.runPromise(command.effect);
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toContain("/api/role-model/telemetry/summary?windowMs=7200000");
      expect(calls[0]?.url).not.toMatch(/windowMs=(&|$)/);

      const defaulted = update(shellModel({ route: { _tag: "Dashboard" } }), message);
      expect((defaulted.commands ?? [])[0]?.args?.id).toBe("86400000");
    } finally {
      await stream.stop();
    }
  });

  it("disposes the one source exactly once and delivers nothing afterwards", async () => {
    const source = createFakeSource();
    const factories: string[] = [];
    const stream = startStream((url) => {
      factories.push(url);
      return source;
    });
    await waitFor(
      () =>
        source.listenerCount("revision.update") > 0 && source.listenerCount("telemetry.update") > 0,
      "the refresh subscription must register both listeners on one source",
    );
    await stream.stop();
    expect(factories).toHaveLength(1);
    expect(source.closeCount()).toBe(1);
    // The fake source is deliberately a retaining source: close() does not detach the listeners, so a
    // post-dispose invocation reaches the callback. That must neither throw nor offer into the
    // finalised queue (the stream's own active guard is what makes this true).
    expect(source.listenerCount("telemetry.update")).toBeGreaterThan(0);
    expect(source.listenerCount("revision.update")).toBeGreaterThan(0);
    expect(() => {
      source.emit("telemetry.update", telemetryPayload("req-late"));
    }).not.toThrow();
    expect(() => {
      source.emit("revision.update", JSON.stringify({ eventName: "revision.update", revision: 9 }));
    }).not.toThrow();
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(stream.messages).toHaveLength(0);
    expect(source.closeCount()).toBe(1);
  });
});
