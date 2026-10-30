import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { READBACK_SPECS, createReadbackClient, createReadbackClients } from "../src/readback";

/**
 * S279 (R12): owner-local in-flight sharing for aliased readback GETs.
 *
 * Aliases share one physical GET only while a flight is in flight inside one
 * createReadbackClients owner: models/configuredModels and runtimeSummary/health.
 * Requests are keyed by the exact effective URL (id/query included) plus method and
 * relevant request headers (accept/authorization); no permanent cache and no
 * cross-shell sharing. Each consumer parses its own body.
 *
 * Deterministic gated fetch only; no module mocks and no timing sleeps on the
 * positive paths. A bounded timeout guard keeps negative-path RED runs from hanging.
 */

interface RecordedCall {
  readonly url: string;
  readonly method: string;
  readonly cache: RequestCache | undefined;
  readonly accept: string | null;
  readonly authorization: string | null;
  readonly signal: AbortSignal | undefined;
  readonly release: (spec: ReleaseSpec) => void;
}

interface ReleaseSpec {
  readonly body: string;
  readonly status?: number;
  readonly contentType?: string;
}

interface GatedFetch {
  readonly fetchImpl: typeof fetch;
  readonly calls: RecordedCall[];
}

const makeGatedFetch = (): GatedFetch => {
  const calls: RecordedCall[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const url = new URL(String(input), "http://localhost");
    const headers = new Headers(init?.headers);
    return new Promise<Response>((resolve) => {
      calls.push({
        accept: headers.get("accept"),
        authorization: headers.get("authorization"),
        cache: init?.cache,
        method: init?.method ?? "GET",
        release: ({ body, contentType = "application/json", status = 200 }) =>
          resolve(new Response(body, { headers: { "content-type": contentType }, status })),
        signal: init?.signal ?? undefined,
        url: url.toString(),
      });
    });
  };
  return { calls, fetchImpl };
};

type Settled<Value> =
  | { readonly status: "fulfilled"; readonly value: Value }
  | { readonly status: "rejected"; readonly reason: unknown }
  | { readonly status: "pending" };

const settle = async <Value>(promise: Promise<Value>): Promise<Settled<Value>> => {
  try {
    return { status: "fulfilled", value: await promise };
  } catch (reason) {
    return { status: "rejected", reason };
  }
};

/** Negative-path guard: RED bytes can leave a consumer pending forever. */
const settleBounded = async <Value>(promise: Promise<Value>): Promise<Settled<Value>> =>
  Promise.race<Settled<Value>>([
    settle(promise),
    new Promise<Settled<Value>>((resolve) => {
      setTimeout(() => resolve({ status: "pending" }), 250);
    }),
  ]);

const newSignal = (): AbortSignal => new AbortController().signal;
const countPath = (calls: readonly RecordedCall[], pathname: string): number =>
  calls.filter((call) => new URL(call.url).pathname === pathname).length;

const MODELS = "/api/role-model/models";
const SUMMARY = "/api/role-model/runtime/summary";
const ENDPOINTS = "/api/role-model/endpoints";
const modelBody = JSON.stringify([{ displayName: "Model 1", id: "m-1", providerId: "p-1" }]);
const summaryBody = JSON.stringify({
  endpointCount: 1,
  executionMode: "local",
  runtime: { channel: "development", endpoint: "http://127.0.0.1:3458", version: "1" },
  status: "ok",
});
const endpointsBody = JSON.stringify({ endpoints: [{ endpointId: "e-1", modelId: "m-1" }] });
const payloadFor = (pathname: string): string =>
  pathname === MODELS ? modelBody : pathname === SUMMARY ? summaryBody : pathname === ENDPOINTS ? endpointsBody : "{}";

const waitFor = async <Value>(read: () => Value | undefined, label: string, timeoutMs = 5000): Promise<Value> => {
  const deadline = Date.now() + timeoutMs;
  let last: Value | undefined;
  while (Date.now() < deadline) {
    last = read();
    if (last !== undefined) return last;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Timed out waiting for " + label + " (last: " + String(last) + ")");
};

describe("S279 readback in-flight sharing", () => {
  it("issues one GET for concurrent alias readers and keeps the exact request surface", async () => {
    const gated = makeGatedFetch();
    const clients = createReadbackClients({ fetchImpl: gated.fetchImpl, token: "s279-token" });
    const models = clients.models({ signal: newSignal() });
    const configured = clients.configuredModels({ signal: newSignal() });
    expect(gated.calls.length).toBe(1);
    const call = gated.calls[0];
    expect(new URL(call.url).pathname).toBe(MODELS);
    expect(call.method).toBe("GET");
    expect(call.cache).toBe("no-store");
    expect(call.accept).toBe("application/json");
    expect(call.authorization).toBe("Bearer s279-token");
    call.release({ body: modelBody });
    const [left, right] = await Promise.all([models, configured]);
    expect(left.status).toBe(200);
    expect(right.status).toBe(200);
    expect(left.body).toEqual(right.body);
    expect(left.body).not.toBe(right.body);
  });

  it("keeps status, non-JSON and body parsing unchanged per consumer", async () => {
    const gated = makeGatedFetch();
    const clients = createReadbackClients({ fetchImpl: gated.fetchImpl });
    const first = clients.models({ signal: newSignal() });
    const second = clients.configuredModels({ signal: newSignal() });
    gated.calls[0].release({ body: "not-json", status: 503 });
    const [left, right] = await Promise.all([first, second]);
    expect(left.status).toBe(503);
    expect(right.status).toBe(503);
    expect(left.body).toEqual({ message: "non-JSON body" });
    expect(right.body).toEqual({ message: "non-JSON body" });
  });

  it("gives every consumer a private parsed body (no shared mutable JSON)", async () => {
    const gated = makeGatedFetch();
    const clients = createReadbackClients({ fetchImpl: gated.fetchImpl });
    const first = clients.models({ signal: newSignal() });
    const second = clients.configuredModels({ signal: newSignal() });
    gated.calls[0].release({ body: modelBody });
    const [left, right] = await Promise.all([first, second]);
    expect(Array.isArray(left.body)).toBe(true);
    expect(Array.isArray(right.body)).toBe(true);
    if (Array.isArray(left.body)) left.body.push({ id: "mutated" });
    if (Array.isArray(right.body)) expect(right.body).toHaveLength(1);
    expect(left.body).not.toBe(right.body);
  });

  it("rejects only the aborted waiter; the other consumer still completes", async () => {
    const gated = makeGatedFetch();
    const clients = createReadbackClients({ fetchImpl: gated.fetchImpl });
    const aborted = new AbortController();
    const remaining = new AbortController();
    const first = clients.models({ signal: aborted.signal });
    const second = clients.configuredModels({ signal: remaining.signal });
    expect(gated.calls.length).toBe(1);
    aborted.abort();
    const firstResult = await settleBounded(first);
    expect(firstResult.status).toBe("rejected");
    if (firstResult.status === "rejected") expect(String(firstResult.reason).toLowerCase()).toContain("abort");
    expect(gated.calls[0].signal?.aborted).toBe(false);
    gated.calls[0].release({ body: modelBody });
    const secondResult = await second;
    expect(secondResult.status).toBe(200);
  });

  it("aborts the physical GET when the last waiter aborts and never lets the old flight poison a replacement", async () => {
    const gated = makeGatedFetch();
    const clients = createReadbackClients({ fetchImpl: gated.fetchImpl });
    const firstAbort = new AbortController();
    const secondAbort = new AbortController();
    const first = clients.models({ signal: firstAbort.signal });
    const second = clients.configuredModels({ signal: secondAbort.signal });
    expect(gated.calls.length).toBe(1);
    const oldCall = gated.calls[0];
    firstAbort.abort();
    secondAbort.abort();
    expect((await settleBounded(first)).status).toBe("rejected");
    expect((await settleBounded(second)).status).toBe("rejected");
    expect(oldCall.signal?.aborted).toBe(true);

    const replacement = clients.models({ signal: newSignal() });
    expect(gated.calls.length).toBe(2);
    const joined = clients.configuredModels({ signal: newSignal() });
    expect(gated.calls.length).toBe(2);

    oldCall.release({ body: modelBody });
    await Promise.resolve();
    expect(gated.calls.length).toBe(2);
    const third = clients.models({ signal: newSignal() });
    expect(gated.calls.length).toBe(2);
    gated.calls[1].release({ body: modelBody });
    const resolved = await Promise.all([replacement, joined, third]);
    expect(resolved.map((value) => value.status)).toEqual([200, 200, 200]);

    const afterSettle = clients.models({ signal: newSignal() });
    expect(gated.calls.length).toBe(3);
    gated.calls[2].release({ body: modelBody });
    expect((await afterSettle).status).toBe(200);
  });

  it("preserves explicit falsey abort reasons by identity", async () => {
    const explicitReasons: ReadonlyArray<unknown> = [null, 0, false];
    for (const reason of explicitReasons) {
      const gated = makeGatedFetch();
      const clients = createReadbackClients({ fetchImpl: gated.fetchImpl });
      const controller = new AbortController();
      const pending = clients.models({ signal: controller.signal });
      expect(gated.calls.length).toBe(1);
      controller.abort(reason);
      const result = await settleBounded(pending);
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") expect(result.reason).toBe(reason);
      gated.calls[0].release({ body: modelBody });
    }
  });

  it("cleans up a synchronously throwing fetch and retries with a fresh GET", async () => {
    let attempts = 0;
    const fetchImpl: typeof fetch = () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("sync fetch failure");
      return Promise.resolve(new Response(modelBody));
    };
    const clients = createReadbackClients({ fetchImpl });
    const first = await settleBounded(clients.models({ signal: newSignal() }));
    expect(first.status).toBe("rejected");
    if (first.status === "rejected") expect(String(first.reason)).toContain("sync fetch failure");
    const second = await clients.models({ signal: newSignal() });
    expect(second.status).toBe(200);
    expect(attempts).toBe(2);
  });

  it("rejects every concurrent waiter on an async fetch failure and starts fresh on retry", async () => {
    let attempts = 0;
    const fetchImpl: typeof fetch = () => {
      attempts += 1;
      if (attempts === 1) return Promise.reject(new Error("network down"));
      return Promise.resolve(new Response(modelBody));
    };
    const clients = createReadbackClients({ fetchImpl });
    const first = clients.models({ signal: newSignal() });
    const second = clients.configuredModels({ signal: newSignal() });
    expect(attempts).toBe(1);
    const left = await settleBounded(first);
    const right = await settleBounded(second);
    expect(left.status).toBe("rejected");
    expect(right.status).toBe("rejected");
    if (left.status === "rejected" && right.status === "rejected") {
      expect(String(left.reason)).toContain("network down");
      expect(left.reason).toBe(right.reason);
    }
    const retry = await clients.models({ signal: newSignal() });
    expect(retry.status).toBe(200);
    expect(attempts).toBe(2);
  });

  it("starts a fresh GET after a settled flight", async () => {
    const gated = makeGatedFetch();
    const clients = createReadbackClients({ fetchImpl: gated.fetchImpl });
    const first = clients.models({ signal: newSignal() });
    gated.calls[0].release({ body: modelBody });
    await first;
    const second = clients.models({ signal: newSignal() });
    expect(gated.calls.length).toBe(2);
    gated.calls[1].release({ body: modelBody });
    expect((await second).status).toBe(200);
  });

  it("separates distinct queries, ids, tokens and shell owners", async () => {
    const gated = makeGatedFetch();
    const clients = createReadbackClients({ fetchImpl: gated.fetchImpl });
    const one = clients.models({ query: "window=1", signal: newSignal() });
    const two = clients.models({ query: "window=2", signal: newSignal() });
    const detailOne = clients.requestDetail({ id: "req-1", signal: newSignal() });
    const detailTwo = clients.requestDetail({ id: "req-2", signal: newSignal() });
    expect(gated.calls.length).toBe(4);
    const tokenA = createReadbackClients({ fetchImpl: gated.fetchImpl, token: "a" });
    const tokenB = createReadbackClients({ fetchImpl: gated.fetchImpl, token: "b" });
    tokenA.models({ signal: newSignal() });
    tokenB.models({ signal: newSignal() });
    expect(gated.calls.length).toBe(6);
    const otherShell = createReadbackClients({ fetchImpl: gated.fetchImpl });
    otherShell.models({ signal: newSignal() });
    expect(gated.calls.length).toBe(7);
    for (const call of gated.calls) call.release({ body: "{}" });
    await Promise.all([one, two, detailOne, detailTwo]);
  });

  it("keeps the standalone createReadbackClient signal identity", async () => {
    const calls: Array<RequestInit | undefined> = [];
    const reader = createReadbackClient(
      READBACK_SPECS.runtimeSummary,
      { fetchImpl: async (_input, init) => { calls.push(init); return new Response("{}"); } },
    );
    const controller = new AbortController();
    await reader({ signal: controller.signal });
    expect(calls[0]?.signal).toBe(controller.signal);
  });
});


describe("S279 mounted shell aliases", () => {
  const mounted: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> = [];
  afterEach(() => {
    for (const entry of mounted.splice(0)) {
      entry.handle.dispose();
      entry.container.remove();
    }
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("mounts the production /models config and coalesces models+summary rail aliases to one GET each", async () => {
    const gated = makeGatedFetch();
    const container = document.createElement("div");
    container.id = "s279-models";
    document.body.append(container);
    window.history.replaceState({}, "", "/models");
    const handle = mountShell(container, { readbackFetchImpl: gated.fetchImpl, readbackToken: "s279-mount" });
    mounted.push({ container, handle });
    const released = new Set<RecordedCall>();
    const releaseAll = (): void => {
      for (const call of gated.calls) {
        if (released.has(call)) continue;
        released.add(call);
        call.release({ body: payloadFor(new URL(call.url).pathname) });
      }
    };
    try {
      await waitFor(
        () => (countPath(gated.calls, MODELS) >= 1 && countPath(gated.calls, SUMMARY) >= 1 ? true : undefined),
        "the mounted readback commands",
      );
      expect(countPath(gated.calls, MODELS)).toBe(1);
      expect(countPath(gated.calls, SUMMARY)).toBe(1);
      const modelsCall = gated.calls.find((call) => new URL(call.url).pathname === MODELS);
      expect(modelsCall?.authorization).toBe("Bearer s279-mount");
      expect(modelsCall?.accept).toBe("application/json");
      releaseAll();
      await waitFor(
        () => (document.querySelector('[data-route="models"] h3')?.textContent === "Model inventory" ? true : undefined),
        "the configured models projection",
      );
      releaseAll();
      const railValues = await waitFor(() => {
        const inventory = document.querySelector("[data-slot='role-model-model-inventory']")?.textContent ?? "";
        const router = document.querySelector("[data-slot='role-model-router-endpoint']")?.textContent ?? "";
        return inventory.length > 0 && router.length > 0 ? { inventory, router } : undefined;
      }, "the models and router footer projections");
      expect(railValues.inventory).toContain("Models");
      expect(railValues.router).toMatch(/\/v1|—/);
    } finally {
      releaseAll();
    }
  });
});
