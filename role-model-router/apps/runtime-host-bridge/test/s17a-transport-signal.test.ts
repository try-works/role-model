import { Effect, Exit } from "effect";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  TrackBPrivateOperationAbortError,
  TrackBPrivateOperationError,
  TrackBPrivateOperationProtocolError,
  TrackBPrivateOperationTimeoutError,
  createTrackBOperations,
  privateRetentionRequest,
  privateRetentionRequestEffect,
} from "../src/track-b-operations.js";
import { recordDirectContributionWith, recordRouteCaptureAtHostEdge } from "../src/index.js";

/**
 * Run 115 S17a (R26 Transport/SSE B5 first slice), extended by S17c: AbortSignal into transport
 * I/O, scoped reader/listener cleanup observed on REAL resources, typed failures, and the pinned
 * private-operation retry schedule.
 *
 * S17c adds: a real operation-boundary caller (recordLocalRouteCapture), resource-state assertions
 * (response.body.locked, real add/removeEventListener counts), and call/sleep pins for status and
 * timeout on both the direct and the Effect paths.
 */

const ENDPOINT = "http://127.0.0.1:1/";
const TOKEN = "transport-test-token-0123456789";

interface FetchTrace {
  aborted: boolean;
  calls: number;
  signal?: AbortSignal;
  readonly sleeps: number[];
}

const stalledUntilAbortedFetch = (state: FetchTrace): typeof fetch =>
  ((_url: string | URL | Request, init?: RequestInit) => {
    state.calls += 1;
    state.signal = init?.signal ?? undefined;
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal === null || signal === undefined) {
        return;
      }
      signal.addEventListener("abort", () => {
        state.aborted = true;
        reject(new DOMException("aborted", "AbortError"));
      });
    });
  }) as typeof fetch;

const responseBody = (text: string, status = 200): Response =>
  new Response(text, { status, headers: { "content-type": "application/json" } });

const tick = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 10));
};

/**
 * A real AbortSignal with its add/removeEventListener methods wrapped so the scoped cleanup can be
 * observed on the actual resource rather than on an onRelease marker.
 */
const countingSignal = (): {
  readonly controller: AbortController;
  readonly signal: AbortSignal;
  readonly added: string[];
  readonly removed: string[];
} => {
  const controller = new AbortController();
  const added: string[] = [];
  const removed: string[] = [];
  const signal = controller.signal;
  const add = signal.addEventListener.bind(signal);
  const remove = signal.removeEventListener.bind(signal);
  Object.defineProperty(signal, "addEventListener", {
    value: (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      added.push(type);
      add(type, listener, options);
    },
  });
  Object.defineProperty(signal, "removeEventListener", {
    value: (
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ) => {
      removed.push(type);
      remove(type, listener, options);
    },
  });
  return { added, controller, removed, signal };
};

describe("private operations transport signal", () => {
  it("cancels the underlying fetch when the enclosing fiber times out (request does not keep running)", async () => {
    const state: FetchTrace = { aborted: false, calls: 0, sleeps: [] };
    const exit = await Effect.runPromiseExit(
      Effect.timeout(
        privateRetentionRequestEffect(ENDPOINT, TOKEN, "probe", {}, 10_000, {
          fetchImpl: stalledUntilAbortedFetch(state),
        }),
        "30 millis",
      ),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    expect(state.calls).toBe(1);
    expect(state.aborted).toBe(true);
  });

  it("releases the real reader and abort listener (body unlocked) on success", async () => {
    const releases: string[] = [];
    const counted = countingSignal();
    const response = responseBody(JSON.stringify({ ok: true }));
    const result = await privateRetentionRequest(ENDPOINT, TOKEN, "success", {}, 5_000, {
      fetchImpl: (async () => response) as typeof fetch,
      onRelease: (resource) => releases.push(resource),
      signal: counted.signal,
    });

    expect(result).toEqual({ ok: true });
    expect(response.body?.locked).toBe(false);
    expect(releases.sort()).toEqual(["abort-listener", "reader"]);
    expect(counted.added).toContain("abort");
    expect(counted.removed).toContain("abort");
  });

  it("counts scoped releases on the status-failure path and does not retry a stated status", async () => {
    const releases: string[] = [];
    const trace: FetchTrace = { aborted: false, calls: 0, sleeps: [] };
    const counted = countingSignal();
    const response = responseBody(JSON.stringify({ error: "refused" }), 500);
    const failure = await privateRetentionRequest(ENDPOINT, TOKEN, "failure", {}, 5_000, {
      fetchImpl: (async () => {
        trace.calls += 1;
        return response;
      }) as typeof fetch,
      onRelease: (resource) => releases.push(resource),
      signal: counted.signal,
      sleep: async (delayMs) => {
        trace.sleeps.push(delayMs);
      },
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TrackBPrivateOperationError);
    expect((failure as TrackBPrivateOperationError).status).toBe(500);
    expect(response.body?.locked).toBe(false);
    expect(releases.sort()).toEqual(["abort-listener", "reader"]);
    expect(counted.removed).toContain("abort");
    expect(trace.calls).toBe(1);
    expect(trace.sleeps).toEqual([]);
  });

  it("counts scoped releases on the caller-abort path and does not retry", async () => {
    const releases: string[] = [];
    const counted = countingSignal();
    const response = new Response(
      new ReadableStream({
        start(streamController) {
          counted.signal.addEventListener("abort", () => {
            streamController.error(new DOMException("aborted", "AbortError"));
          });
        },
      }),
      { status: 200 },
    );
    const pending = privateRetentionRequest(ENDPOINT, TOKEN, "abort", {}, 5_000, {
      fetchImpl: (async () => response) as typeof fetch,
      onRelease: (resource) => releases.push(resource),
      signal: counted.signal,
    });
    await tick();
    counted.controller.abort();
    const failure = await pending.catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TrackBPrivateOperationAbortError);
    expect(response.body?.locked).toBe(false);
    expect(releases.sort()).toEqual(["abort-listener", "reader"]);
    expect(counted.removed).toContain("abort");
  });

  it("pins the exact connection-retry schedule 250/1000/2500/5000ms", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const failure = await privateRetentionRequest(ENDPOINT, TOKEN, "retry", {}, 5_000, {
      fetchImpl: (async () => {
        calls += 1;
        throw Object.assign(new Error("fetch failed"), { cause: { code: "ECONNRESET" } });
      }) as typeof fetch,
      sleep: async (delayMs) => {
        sleeps.push(delayMs);
      },
    }).catch((error: unknown) => error);

    expect(calls).toBe(5);
    expect(sleeps).toEqual([250, 1_000, 2_500, 5_000]);
    expect(failure).toBeInstanceOf(Error);
    expect((failure as Error).message).toBe("fetch failed");
  });

  it("pins the retry schedule through the Effect path as well", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const exit = await Effect.runPromiseExit(
      privateRetentionRequestEffect(ENDPOINT, TOKEN, "retry-effect", {}, 5_000, {
        fetchImpl: (async () => {
          calls += 1;
          throw Object.assign(new Error("fetch failed"), { cause: { code: "ECONNRESET" } });
        }) as typeof fetch,
        sleep: async (delayMs) => {
          sleeps.push(delayMs);
        },
      }),
    );

    expect(Exit.isFailure(exit)).toBe(true);
    expect(calls).toBe(5);
    expect(sleeps).toEqual([250, 1_000, 2_500, 5_000]);
  });

  it("pins status and timeout as one call and no sleep on both paths", async () => {
    const statusTrace: FetchTrace = { aborted: false, calls: 0, sleeps: [] };
    const status = await privateRetentionRequest(ENDPOINT, TOKEN, "status", {}, 5_000, {
      fetchImpl: (async () => {
        statusTrace.calls += 1;
        return responseBody(JSON.stringify({ error: "bad request" }), 400);
      }) as typeof fetch,
      sleep: async (delayMs) => {
        statusTrace.sleeps.push(delayMs);
      },
    }).catch((error: unknown) => error);
    expect(status).toBeInstanceOf(TrackBPrivateOperationError);
    expect((status as TrackBPrivateOperationError).status).toBe(400);
    expect(statusTrace.calls).toBe(1);
    expect(statusTrace.sleeps).toEqual([]);

    const timeoutTrace: FetchTrace = { aborted: false, calls: 0, sleeps: [] };
    const timeout = await privateRetentionRequest(ENDPOINT, TOKEN, "timeout", {}, 20, {
      fetchImpl: ((_url: string | URL | Request, init?: RequestInit) => {
        timeoutTrace.calls += 1;
        timeoutTrace.signal = init?.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("timed out", "TimeoutError"));
          });
        });
      }) as typeof fetch,
      sleep: async (delayMs) => {
        timeoutTrace.sleeps.push(delayMs);
      },
    }).catch((error: unknown) => error);
    expect(timeout).toBeInstanceOf(TrackBPrivateOperationTimeoutError);
    expect(timeoutTrace.calls).toBe(1);
    expect(timeoutTrace.sleeps).toEqual([]);

    const effectStatusCalls = { calls: 0 };
    const effectSleeps: number[] = [];
    const effectStatus = await Effect.runPromiseExit(
      privateRetentionRequestEffect(ENDPOINT, TOKEN, "status-effect", {}, 5_000, {
        fetchImpl: (async () => {
          effectStatusCalls.calls += 1;
          return responseBody(JSON.stringify({ error: "bad request" }), 400);
        }) as typeof fetch,
        sleep: async (delayMs) => {
          effectSleeps.push(delayMs);
        },
      }),
    );
    expect(Exit.isFailure(effectStatus)).toBe(true);
    expect(effectStatusCalls.calls).toBe(1);
    expect(effectSleeps).toEqual([]);

    const effectTimeoutCalls = { calls: 0 };
    const effectTimeoutSleeps: number[] = [];
    const effectTimeout = await Effect.runPromiseExit(
      privateRetentionRequestEffect(ENDPOINT, TOKEN, "timeout-effect", {}, 20, {
        fetchImpl: ((_url: string | URL | Request, init?: RequestInit) => {
          effectTimeoutCalls.calls += 1;
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("timed out", "TimeoutError"));
            });
          });
        }) as typeof fetch,
        sleep: async (delayMs) => {
          effectTimeoutSleeps.push(delayMs);
        },
      }),
    );
    expect(Exit.isFailure(effectTimeout)).toBe(true);
    expect(effectTimeoutCalls.calls).toBe(1);
    expect(effectTimeoutSleeps).toEqual([]);
  });

  it("does not retry a caller abort", async () => {
    const counted = countingSignal();
    counted.controller.abort();
    let calls = 0;
    const sleeps: number[] = [];
    const failure = await privateRetentionRequest(ENDPOINT, TOKEN, "pre-aborted", {}, 5_000, {
      fetchImpl: (async () => {
        calls += 1;
        return responseBody("{}");
      }) as typeof fetch,
      signal: counted.signal,
      sleep: async (delayMs) => {
        sleeps.push(delayMs);
      },
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TrackBPrivateOperationAbortError);
    expect(calls).toBe(0);
    expect(sleeps).toEqual([]);
  });

  it("keeps timeout, status, protocol and abort failures distinct and non-retried", async () => {
    const timeout = await privateRetentionRequest(ENDPOINT, TOKEN, "timeout", {}, 20, {
      fetchImpl: ((_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("timed out", "TimeoutError"));
          });
        })) as typeof fetch,
    }).catch((error: unknown) => error);
    expect(timeout).toBeInstanceOf(TrackBPrivateOperationTimeoutError);

    const protocolTrace: FetchTrace = { aborted: false, calls: 0, sleeps: [] };
    const protocol = await privateRetentionRequest(ENDPOINT, TOKEN, "protocol", {}, 5_000, {
      fetchImpl: (async () => {
        protocolTrace.calls += 1;
        return responseBody("not-json");
      }) as typeof fetch,
      sleep: async (delayMs) => {
        protocolTrace.sleeps.push(delayMs);
      },
    }).catch((error: unknown) => error);
    expect(protocol).toBeInstanceOf(TrackBPrivateOperationProtocolError);
    expect(protocolTrace.calls).toBe(1);
    expect(protocolTrace.sleeps).toEqual([]);

    const effectProtocolTrace: FetchTrace = { aborted: false, calls: 0, sleeps: [] };
    const effectProtocol = await Effect.runPromiseExit(
      privateRetentionRequestEffect(ENDPOINT, TOKEN, "protocol-effect", {}, 5_000, {
        fetchImpl: (async () => {
          effectProtocolTrace.calls += 1;
          return responseBody("not-json");
        }) as typeof fetch,
        sleep: async (delayMs) => {
          effectProtocolTrace.sleeps.push(delayMs);
        },
      }),
    );
    expect(Exit.isFailure(effectProtocol)).toBe(true);
    expect(effectProtocolTrace.calls).toBe(1);
    expect(effectProtocolTrace.sleeps).toEqual([]);

    const aborted = new AbortController();
    aborted.abort();
    const abort = await privateRetentionRequest(ENDPOINT, TOKEN, "abort", {}, 5_000, {
      fetchImpl: (async () => responseBody("{}")) as typeof fetch,
      signal: aborted.signal,
    }).catch((error: unknown) => error);
    expect(abort).toBeInstanceOf(TrackBPrivateOperationAbortError);
  });

  it("forwards the reachable request signal to the direct contribution recorder", async () => {
    const controller = new AbortController();
    const observed: Array<{ readonly signal?: AbortSignal }> = [];
    await recordDirectContributionWith(
      {
        recordContributionAggregate: async (_input, options) => {
          observed.push({ signal: options?.signal });
        },
      },
      {
        abortSignal: controller.signal,
        endpointId: "endpoint-1",
        effortSource: "none",
        inputTokens: 1,
        modelId: "model-1",
        outputTokens: 2,
        reasoningEffort: null,
        requestId: "s17c-contribution",
        responseStatusCode: 200,
        routingDecisionId: "decision-1",
        taskType: "general.chat",
      },
      { scopeId: "s17c", trackBPostObservation: false },
    );

    expect(observed.length).toBe(1);
    expect(observed[0]?.signal).toBe(controller.signal);
  });

  it("carries the request signal from the HOST capture edge into fetch", async () => {
    const statePath = path.join(await mkdtemp(path.join(tmpdir(), "s17d-host-")), "state.json");
    const trace: FetchTrace = { aborted: false, calls: 0, sleeps: [] };
    const operations = createTrackBOperations({
      catalog: [],
      authorizationEpoch: 1,
      fetchImpl: stalledUntilAbortedFetch(trace),
      operationsEndpoint: "http://127.0.0.1:9/",
      operationsToken: TOKEN,
      runtimeChannel: "development",
      scope: "s17d",
      statePath,
    });
    const counted = countingSignal();
    const pending = recordRouteCaptureAtHostEdge(
      operations,
      { modelId: "m", requestId: "s17d-host-request" },
      { requestOptions: { abortSignal: counted.signal } },
    );
    await tick();
    counted.controller.abort();
    const failure = await pending.catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TrackBPrivateOperationAbortError);
    expect(trace.calls).toBe(1);
    expect(trace.signal?.aborted).toBe(true);
    expect(trace.aborted).toBe(true);
  });

  it("carries the caller signal through the REAL operation boundary into fetch", async () => {
    const statePath = path.join(await mkdtemp(path.join(tmpdir(), "s17c-ops-")), "state.json");
    const trace: FetchTrace = { aborted: false, calls: 0, sleeps: [] };
    const operations = createTrackBOperations({
      catalog: [],
      authorizationEpoch: 1,
      fetchImpl: stalledUntilAbortedFetch(trace),
      operationsEndpoint: "http://127.0.0.1:9/",
      operationsToken: TOKEN,
      runtimeChannel: "development",
      scope: "s17c",
      statePath,
    });
    const counted = countingSignal();
    const pending = operations.recordLocalRouteCapture(
      { modelId: "m", requestId: "s17c-request" },
      { signal: counted.signal },
    );
    await tick();
    counted.controller.abort();
    const failure = await pending.catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TrackBPrivateOperationAbortError);
    expect(trace.calls).toBe(1);
    expect(trace.signal?.aborted).toBe(true);
    expect(trace.aborted).toBe(true);
    expect(counted.removed).toContain("abort");
  });
});
