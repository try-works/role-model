import { Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";

import { readProviderStreamTranscript } from "../src/index.js";
import {
  SseTranscriptAbortError,
  SseTranscriptIncompleteError,
  SseTranscriptProtocolError,
  readSseTranscript,
} from "../src/sse-transcript.js";
import type { SseCleanupKind, SseReaderLike, SseResponseLike } from "../src/sse-transcript.js";

/**
 * Run 115 S17b (R26 second half): scoped SSE cleanup, caller abort into the stream, and pinned frame
 * order.
 *
 * Cleanup is proven with counted releases on success, protocol failure and caller abort; the fiber
 * test uses a stream whose read never settles except through the forwarded AbortSignal, so a timeout
 * can only finish if the signal reached the reader (the S17a shape). Frame order is pinned with an
 * exact payload array: a reorder, drop or duplicate changes it.
 */

const encoder = new TextEncoder();

interface StreamState {
  canceled: boolean;
  reads: number;
  released: boolean;
  readsAfterRelease: number;
}

const fakeStream = (
  chunks: ReadonlyArray<string>,
  behaviour?: { readonly stall?: boolean },
): { readonly response: SseResponseLike; readonly state: StreamState } => {
  const state: StreamState = { canceled: false, reads: 0, released: false, readsAfterRelease: 0 };
  const queue = chunks.map((chunk) => encoder.encode(chunk));
  const reader: SseReaderLike = {
    read: async () => {
      state.reads += 1;
      if (state.released) {
        state.readsAfterRelease += 1;
      }
      if (behaviour?.stall === true) {
        return await new Promise(() => undefined);
      }
      const next = queue.shift();
      return next === undefined ? { done: true } : { done: false, value: next };
    },
    cancel: async () => {
      state.canceled = true;
    },
    releaseLock: () => {
      state.released = true;
    },
  };
  return {
    response: {
      body: { getReader: () => reader },
      text: async () => chunks.join(""),
    },
    state,
  };
};

const frame = (payload: unknown): string => `data: ${JSON.stringify(payload)}\n\n`;

const sseResponse = (chunks: ReadonlyArray<string>): Response =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" }, status: 200 },
  );

const cleanupOf = (): { readonly releases: SseCleanupKind[]; readonly onRelease: (kind: SseCleanupKind) => void } => {
  const releases: SseCleanupKind[] = [];
  return { onRelease: (kind) => releases.push(kind), releases };
};

const cleanupExpectation: ReadonlyArray<SseCleanupKind> = ["abort-listener", "decoder", "reader"];

describe("S17b SSE scoped cleanup", () => {
  it("releases the reader, decoder scope and abort listener on success", async () => {
    const controller = new AbortController();
    const stream = fakeStream([frame({ n: 1 })]);
    const cleanup = cleanupOf();
    const payloads: string[] = [];
    const transcript = await readSseTranscript(stream.response, {
      signal: controller.signal,
      onRelease: cleanup.onRelease,
      onPayload: (payloadText) => {
        payloads.push(payloadText);
      },
    });

    expect(transcript).toBe(frame({ n: 1 }));
    expect(payloads).toEqual([JSON.stringify({ n: 1 })]);
    expect(stream.state.released).toBe(true);
    expect(stream.state.canceled).toBe(false);
    expect(cleanup.releases.sort()).toEqual(cleanupExpectation);
  });

  it("releases on a protocol failure and cancels the stream", async () => {
    const controller = new AbortController();
    const stream = fakeStream(["data: not-json\n\n"]);
    const cleanup = cleanupOf();
    const failure = await readSseTranscript(stream.response, {
      signal: controller.signal,
      onRelease: cleanup.onRelease,
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(SseTranscriptProtocolError);
    expect(stream.state.canceled).toBe(true);
    expect(stream.state.released).toBe(true);
    expect(cleanup.releases.sort()).toEqual(cleanupExpectation);
  });

  it("releases on caller abort, cancels the stalled stream and reports the typed abort", async () => {
    const controller = new AbortController();
    const stream = fakeStream([], { stall: true });
    const cleanup = cleanupOf();
    const pending = readSseTranscript(stream.response, {
      signal: controller.signal,
      onRelease: cleanup.onRelease,
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();
    const failure = await pending.catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(SseTranscriptAbortError);
    expect(controller.signal.aborted).toBe(true);
    expect(stream.state.canceled).toBe(true);
    expect(stream.state.released).toBe(true);
    expect(cleanup.releases.sort()).toEqual(cleanupExpectation);
  });

  it("stops a stalled stream when the enclosing fiber times out (abort reaches the read)", async () => {
    const stream = fakeStream([], { stall: true });
    const cleanup = cleanupOf();
    const exit = await Effect.runPromiseExit(
      Effect.timeout(
        Effect.tryPromise({
          try: (signal) =>
            readSseTranscript(stream.response, { signal, onRelease: cleanup.onRelease }),
          catch: (error) => error,
        }),
        "30 millis",
      ),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    // The abort cleanup runs through the effect finalizer's microtask chain; wait for it to settle.
    const deadline = Date.now() + 1_000;
    while (!stream.state.released && Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
    expect(stream.state.canceled).toBe(true);
    expect(stream.state.released).toBe(true);
    expect(cleanup.releases).toContain("reader");
    expect(stream.state.readsAfterRelease).toBe(0);
  });
});

describe("S17b SSE typed failures are distinct", () => {
  it("separates abort, mid-frame EOF, protocol violation and transport read failure", async () => {
    const abortController = new AbortController();
    abortController.abort();
    const aborted = await readSseTranscript(
      { body: null, text: async () => "" },
      { signal: abortController.signal },
    ).catch((error: unknown) => error);
    expect(aborted).toBeInstanceOf(SseTranscriptAbortError);

    const incomplete = await readSseTranscript(fakeStream(['data: {"n":1}\n\ndata: {"n":2']).response).catch(
      (error: unknown) => error,
    );
    expect(incomplete).toBeInstanceOf(SseTranscriptIncompleteError);

    const protocol = await readSseTranscript(fakeStream(["data: nope\n\n"]).response).catch(
      (error: unknown) => error,
    );
    expect(protocol).toBeInstanceOf(SseTranscriptProtocolError);

    const readFailure = await readSseTranscript({
      body: {
        getReader: () => ({
          read: async () => {
            throw new Error("socket hang up");
          },
          cancel: async () => undefined,
          releaseLock: () => undefined,
        }),
      },
      text: async () => "",
    }).catch((error: unknown) => error);
    expect(readFailure).not.toBeInstanceOf(SseTranscriptAbortError);
    expect(readFailure).not.toBeInstanceOf(SseTranscriptIncompleteError);
    expect(readFailure).not.toBeInstanceOf(SseTranscriptProtocolError);
    // Transport/business failures keep their identity instead of being wrapped.
    expect((readFailure as Error).message).toBe("socket hang up");
  });

  it("drains a valid final frame and reports [DONE] once without forwarding it as data", async () => {
    const doneCalls: number[] = [];
    const payloads: string[] = [];
    await readSseTranscript(fakeStream([frame({ n: 1 }), 'data: {"n":2}', "\n\ndata: [DONE]\n\n"]).response, {
      onDone: () => {
        doneCalls.push(1);
      },
      onPayload: (payloadText) => {
        payloads.push(payloadText);
      },
    });
    expect(payloads).toEqual([JSON.stringify({ n: 1 }), JSON.stringify({ n: 2 })]);
    expect(doneCalls.length).toBe(1);
  });
});

describe("S17b SSE frame preservation", () => {
  it("preserves tool/reasoning/fragmentation/drain/first-substantive/finish/DONE/error order exactly", async () => {
    const written: Array<Record<string, unknown>> = [];
    const chunks = [
      frame({ choices: [{ delta: { reasoning_content: "early" } }] }),
      'data: {"choices":[{"delta":{"content":"Hel',
      'lo"}}]}\n\n',
      frame({ choices: [{ delta: { reasoning_content: "later" } }] }),
      frame({
        choices: [
          { delta: { tool_calls: [{ function: { name: "lookup" }, id: "call_1", index: 0 }] } },
        ],
      }),
      frame({ choices: [{ delta: {}, finish_reason: "stop" }] }),
      frame({ error: { message: "upstream stream error" } }),
      "data: [DONE]\n\n",
    ];
    const response = sseResponse(chunks);
    const transcript = await readProviderStreamTranscript(
      response,
      (payload) => {
        written.push(payload);
      },
      { adapterFamily: "openai-chat-completions", endpointId: "endpoint-s17b", reasoningRequested: false },
    );

    // The first reasoning-only frame is dropped (not substantive); the fragmented content frame is
    // reassembled; every later frame is emitted once, in order; DONE is never a payload.
    expect(written).toEqual([
      { choices: [{ delta: { content: "Hello" } }] },
      { choices: [{ delta: { reasoning_content: "later" } }] },
      {
        choices: [
          { delta: { tool_calls: [{ function: { name: "lookup" }, id: "call_1", index: 0 }] } },
        ],
      },
      { choices: [{ delta: {}, finish_reason: "stop" }] },
      { error: { message: "upstream stream error" } },
    ]);
    expect(written.length).toBe(5);
    expect(transcript).toContain("Hello");
    expect(transcript).toContain("[DONE]");
  });
});
