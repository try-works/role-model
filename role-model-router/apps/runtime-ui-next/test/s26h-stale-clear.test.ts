import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { createObservabilityClient } from "../src/observability";
import { OPERATOR_TOKEN_STORAGE_KEY } from "../src/operator-token";
import { createReadbackClients } from "../src/readback";
import type { RuntimeEventSourceFactory } from "../src/refresh";

/** S26h: gap-stale clears on success, failure keeps it, storage token, readback auth/invalid bodies. */

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
const waitFor = async <Value>(
  read: () => Value | undefined,
  label: string,
  timeoutMs = 4000,
): Promise<Value> => {
  const deadline = Date.now() + timeoutMs;
  let last: Value | undefined;
  while (Date.now() < deadline) {
    last = read();
    if (last !== undefined) return last;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    `Timed out waiting for ${label} (last: ${String(last)}) | body: ${document.body.textContent?.slice(0, 500) ?? ""}`,
  );
};
const mounted: Array<{ container: HTMLElement; handle: { dispose(): void } }> = [];
const mountAt = (id: string, pathname: string, options: Parameters<typeof mountShell>[1] = {}) => {
  window.history.replaceState({}, "", pathname);
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, options);
  mounted.push({ handle, container });
  return handle;
};
afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

const bodies: Record<string, unknown> = {
  localLogs: { logs: "line" },
  localPeers: [{ id: "p", url: "http://peer" }],
  queues: { available: true, queues: [{ active: 1, name: "q", waiting: 0 }] },
  requests: { requests: [{ modelId: "m", requestId: "r", status: 200 }] },
  routerCandidates: [{ id: "c", modelId: "m" }],
  routerDecisions: { decisions: [{ modelId: "m", requestId: "r" }] },
  runtime: { config: { channel: "development" } },
  sessionReadiness: { ready: true, status: "ready" },
  storeReceipts: { store: { receipts: [{ code: "x", id: "r" }] }, worker: { receipts: [] } },
};
const paths: Record<string, string> = {
  localLogs: "/local/logs",
  localPeers: "/local/peers",
  queues: "/observe/queues",
  requests: "/requests",
  routerCandidates: "/router/candidates",
  routerDecisions: "/router/decisions",
  runtime: "/runtime",
  sessionReadiness: "/session-readiness",
  storeReceipts: "/observe/store-degradation-receipts",
};

describe("S26h stale clears on successful gap refetch", () => {
  for (const [key, path] of Object.entries(paths)) {
    it(`${key} gap refetch clears stale`, async () => {
      let calls = 0;
      const listeners: Map<string, (event: MessageEvent<string>) => void> = new Map();
      const factory: RuntimeEventSourceFactory = () => ({
        addEventListener: (type, listener) => listeners.set(type, listener),
        close: () => undefined,
      });
      mountAt(`s26h-${key}`, path, {
        readbackReaders: createReadbackClients({
          fetchImpl: async () => {
            calls += 1;
            return json(bodies[key]);
          },
        }),
        runtimeEventSourceFactory: factory,
      });
      await waitFor(
        () => document.querySelector(`[data-readback-state='ok']`) ?? undefined,
        `${key} initial`,
      );
      listeners.get("revision.update")?.({
        data: JSON.stringify({ revision: 1 }),
      } as MessageEvent<string>);
      await waitFor(() => (calls === 2 ? true : undefined), `${key} revision`);
      listeners.get("revision.update")?.({
        data: JSON.stringify({ revision: 3 }),
      } as MessageEvent<string>);
      await waitFor(() => (calls === 3 ? true : undefined), `${key} gap refetch`);
      await waitFor(
        () => (document.querySelector("[data-refresh-state='stale']") === null ? true : undefined),
        `${key} stale cleared`,
      );
    });
  }

  it("observability gap refetch clears stale", async () => {
    let calls = 0;
    const listeners: Map<string, (event: MessageEvent<string>) => void> = new Map();
    const factory: RuntimeEventSourceFactory = () => ({
      addEventListener: (type, listener) => listeners.set(type, listener),
      close: () => undefined,
    });
    mountAt("s26h-observe", "/observe/observability-snapshot", {
      readObservability: createObservabilityClient({
        fetchImpl: async () => {
          calls += 1;
          return json({ metrics: { m: { count: calls, incremental: false } } });
        },
      }),
      runtimeEventSourceFactory: factory,
    });
    await waitFor(
      () => document.querySelector("[data-observability-state='ok']") ?? undefined,
      "observability initial",
    );
    listeners.get("revision.update")?.({
      data: JSON.stringify({ revision: 1 }),
    } as MessageEvent<string>);
    await waitFor(() => (calls === 2 ? true : undefined), "observability revision");
    listeners.get("revision.update")?.({
      data: JSON.stringify({ revision: 3 }),
    } as MessageEvent<string>);
    await waitFor(() => (calls === 3 ? true : undefined), "observability gap");
    await waitFor(
      () => (document.querySelector("[data-refresh-state='stale']") === null ? true : undefined),
      "observability stale cleared",
    );
  });

  it("a failed gap refetch keeps stale", async () => {
    let calls = 0;
    const listeners: Map<string, (event: MessageEvent<string>) => void> = new Map();
    const factory: RuntimeEventSourceFactory = () => ({
      addEventListener: (type, listener) => listeners.set(type, listener),
      close: () => undefined,
    });
    mountAt("s26h-fail", "/local/logs", {
      readbackReaders: createReadbackClients({
        fetchImpl: async () => {
          calls += 1;
          return calls === 1 ? json(bodies.localLogs) : json({ reason: "down" }, 503);
        },
      }),
      runtimeEventSourceFactory: factory,
    });
    await waitFor(
      () => document.querySelector("[data-readback-state='ok']") ?? undefined,
      "initial",
    );
    listeners.get("revision.update")?.({
      data: JSON.stringify({ revision: 1 }),
    } as MessageEvent<string>);
    await waitFor(() => (calls === 2 ? true : undefined), "revision");
    await waitFor(
      () => document.querySelector("[data-readback-state='error']") ?? undefined,
      "revision error applied",
    );
    listeners.get("revision.update")?.({
      data: JSON.stringify({ revision: 3 }),
    } as MessageEvent<string>);
    await waitFor(() => (calls === 3 ? true : undefined), "failed gap fetch");
    await waitFor(
      () => document.querySelector("[data-readback-state='error']") ?? undefined,
      "failed gap",
    );
    expect(document.querySelector("[data-refresh-state='stale']")).not.toBeNull();
  });

  it("reads the operator token from legacy storage by default and honors readbackToken", async () => {
    localStorage.setItem(OPERATOR_TOKEN_STORAGE_KEY, "stored-token");
    const headers: string[] = [];
    mountAt("s26h-stored", "/observe/observability-snapshot", {
      observabilityFetchImpl: async (_input, init) => {
        headers.push(new Headers(init?.headers).get("authorization") ?? "missing");
        return json({ metrics: {} });
      },
    });
    await waitFor(
      () => document.querySelector("[data-observability-state='empty']") ?? undefined,
      "stored token read",
    );
    expect(headers).toEqual(["Bearer stored-token"]);

    const explicit: string[] = [];
    mountAt("s26h-readback-token", "/local/logs", {
      readbackFetchImpl: async (_input, init) => {
        explicit.push(new Headers(init?.headers).get("authorization") ?? "missing");
        return json({ logs: "" });
      },
      readbackToken: "explicit-readback-token",
    });
    await waitFor(
      () => document.querySelector("[data-readback-state='empty']") ?? undefined,
      "readback token read",
    );
    expect(explicit).toEqual(["Bearer explicit-readback-token"]);
  });

  it("distinguishes 401/403 and rejects invalid 200 readback bodies", async () => {
    const unauthorized = mountAt("s26h-401", "/requests", {
      readbackReaders: createReadbackClients({ fetchImpl: async () => json({}, 401) }),
    });
    const unauthPage = await waitFor(
      () => document.querySelector("[data-readback-state='error']") ?? undefined,
      "readback 401",
    );
    expect(unauthPage.textContent).toContain("Requests read failed: HTTP 401 (not authorized)");
    unauthorized.dispose();

    const forbidden = mountAt("s26h-403", "/requests", {
      readbackReaders: createReadbackClients({ fetchImpl: async () => json({}, 403) }),
    });
    const forbiddenPage = await waitFor(
      () => document.querySelector("[data-readback-state='error']") ?? undefined,
      "readback 403",
    );
    expect(forbiddenPage.textContent).toContain("Requests read failed: HTTP 403 (forbidden)");
    forbidden.dispose();

    const invalid = mountAt("s26h-invalid", "/requests", {
      readbackReaders: createReadbackClients({ fetchImpl: async () => json({ bad: true }) }),
    });
    const invalidPage = await waitFor(
      () => document.querySelector("[data-readback-state='error']") ?? undefined,
      "invalid 200",
    );
    expect(invalidPage.textContent).toContain("Requests read failed: invalid response");
  });
});
