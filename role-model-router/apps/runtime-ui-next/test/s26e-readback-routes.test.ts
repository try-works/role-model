import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";
import { READBACK_SPECS, type ReadbackKey, createReadbackClients } from "../src/readback";
import type { RuntimeEventSourceFactory } from "../src/refresh";
import { READBACK_PATHS } from "../src/runtime-endpoints";

/** S26e/R13 wave 2 batch: four read routes share one client/renderer/Command surface. */

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
    `Timed out waiting for ${label} (last: ${String(last)}) | body: ${document.body.textContent?.slice(0, 600) ?? ""}`,
  );
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

interface RouteCase {
  readonly key: ReadbackKey;
  readonly stateTestName: string;
  readonly emptyText: string;
  readonly path: string;
  readonly label: string;
  readonly successBody: unknown;
  readonly emptyBody: unknown;
  readonly successText: string;
}

const routes: readonly RouteCase[] = [
  {
    emptyBody: { store: { receipts: [] }, worker: { receipts: [] } },
    key: "storeReceipts",
    emptyText: "No store degradation receipts yet.",
    stateTestName: "Store receipts renders success, empty, loading and error on the DOM",
    label: "Store receipts",
    path: "/observe/store-degradation-receipts",
    successBody: {
      store: { receipts: [{ code: "store_error", count: 2, id: "r1", level: "warn" }] },
      worker: { receipts: [] },
    },
    successText: "store_error",
  },
  {
    emptyBody: { available: true, queues: [] },
    key: "queues",
    emptyText: "No queues configured yet.",
    stateTestName: "Queues renders success, empty, loading and error on the DOM",
    label: "Queues",
    path: "/observe/queues",
    successBody: {
      available: true,
      queues: [{ active: 1, failed: 0, name: "replay", waiting: 2 }],
    },
    successText: "replay",
  },
  {
    emptyBody: { logs: "" },
    key: "localLogs",
    emptyText: "No local logs recorded yet.",
    stateTestName: "Local logs renders success, empty, loading and error on the DOM",
    label: "Local logs",
    path: "/local/logs",
    successBody: { logs: "line one\nline two" },
    successText: "Local logs",
  },
  {
    emptyBody: [],
    key: "routerCandidates",
    emptyText: "No router candidates yet.",
    stateTestName: "Router candidates renders success, empty, loading and error on the DOM",
    label: "Router candidates",
    path: "/router/candidates",
    successBody: [{ endpointId: "e1", id: "c1", modelId: "m1", score: 0.9 }],
    successText: "m1",
  },
  {
    emptyBody: { requests: [] },
    emptyText: "No telemetry requests recorded yet.",
    key: "requests",
    label: "Requests",
    path: "/requests",
    stateTestName: "Requests renders success, empty, loading and error on the DOM",
    successBody: { requests: [{ endpointId: "e1", modelId: "m1", requestId: "r1", status: 200 }] },
    successText: "m1",
  },
  {
    emptyBody: { decisions: [] },
    emptyText: "No router decisions recorded yet.",
    key: "routerDecisions",
    label: "Router decisions",
    path: "/router/decisions",
    stateTestName: "Router decisions renders success, empty, loading and error on the DOM",
    successBody: { decisions: [{ confidence: 0.8, modelId: "m2", requestId: "d1" }] },
    successText: "m2",
  },
  {
    emptyBody: [],
    emptyText: "No local peers configured yet.",
    key: "localPeers",
    label: "Local peers",
    path: "/local/peers",
    stateTestName: "Local peers renders success, empty, loading and error on the DOM",
    successBody: [{ id: "p1", url: "http://peer" }],
    successText: "http://peer",
  },
  {
    emptyBody: { config: {} },
    emptyText: "No runtime configuration available.",
    key: "runtime",
    label: "Runtime",
    path: "/runtime",
    stateTestName: "Runtime renders success, empty, loading and error on the DOM",
    successBody: { config: { channel: "development", mode: "local" } },
    successText: "channel",
  },
  {
    emptyBody: {},
    emptyText: "No session readiness state available.",
    key: "sessionReadiness",
    label: "Session readiness",
    path: "/session-readiness",
    stateTestName: "Session readiness renders success, empty, loading and error on the DOM",
    successBody: { ready: true, status: "ready" },
    successText: "ready",
  },
  {
    emptyBody: { requests: [] },
    emptyText: "No dashboard requests recorded yet.",
    key: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    stateTestName: "Dashboard renders success, empty, loading and error on the DOM",
    successBody: { requests: [{ modelId: "dash-model", requestId: "r", status: 200 }] },
    successText: "dash-model",
  },
  {
    emptyBody: { events: [] },
    emptyText: "No local swap events recorded yet.",
    key: "localSwap",
    label: "Local swap",
    path: "/local/swap",
    stateTestName: "Local swap renders success, empty, loading and error on the DOM",
    successBody: { events: [{ id: "e", model: "swap-model", reason: "swap" }] },
    successText: "swap-model",
  },
  {
    emptyBody: { activity: [] },
    emptyText: "No host activity recorded yet.",
    key: "observeActivity",
    label: "Observe activity",
    path: "/observe/activity",
    stateTestName: "Observe activity renders success, empty, loading and error on the DOM",
    successBody: { activity: [{ detail: "x", id: "a", kind: "activity-kind" }] },
    successText: "activity-kind",
  },
  {
    emptyBody: { logs: "" },
    emptyText: "No observe logs recorded yet.",
    key: "observeLogs",
    label: "Observe logs",
    path: "/observe/logs",
    stateTestName: "Observe logs renders success, empty, loading and error on the DOM",
    successBody: { logs: "line" },
    successText: "4 chars",
  },
  {
    emptyBody: { rows: [] },
    emptyText: "No routing rows recorded yet.",
    key: "observeRouting",
    label: "Observe routing",
    path: "/observe/routing",
    stateTestName: "Observe routing renders success, empty, loading and error on the DOM",
    successBody: { rows: [{ count: 2, model: "routing-model" }] },
    successText: "routing-model",
  },
  {
    emptyBody: {},
    emptyText: "No router summary available.",
    key: "router",
    label: "Router",
    path: "/router",
    stateTestName: "Router renders success, empty, loading and error on the DOM",
    successBody: { alias: "router-alias", mode: "local" },
    successText: "router-alias",
  },
];

const mounted: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> =
  [];

const mountRoute = (
  route: RouteCase,
  id: string,
  fetchImpl: typeof fetch,
  eventSourceFactory?: RuntimeEventSourceFactory,
) => {
  window.history.replaceState({}, "", route.path);
  localStorage.clear();
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, {
    readbackReaders: createReadbackClients({ fetchImpl }),
    ...(eventSourceFactory === undefined ? {} : { runtimeEventSourceFactory: eventSourceFactory }),
  });
  const entry = { container, handle };
  mounted.push(entry);
  return entry;
};

const dispose = (entry: {
  readonly container: HTMLElement;
  readonly handle: { dispose(): void };
}) => {
  entry.handle.dispose();
  entry.container.remove();
  const index = mounted.indexOf(entry);
  if (index !== -1) mounted.splice(index, 1);
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("S26e shared readback client", () => {
  it("uses each declared host path, sends the bearer only when provisioned, and forwards abort", async () => {
    const calls: Array<{ init?: RequestInit; path: string }> = [];
    const clients = createReadbackClients({
      fetchImpl: async (input, init) => {
        calls.push({ init, path: new URL(String(input)).pathname });
        return json({});
      },
      token: "s26e-token",
    });
    const controller = new AbortController();
    for (const key of Object.keys(READBACK_PATHS) as ReadbackKey[]) {
      const result = await clients[key]({ signal: controller.signal });
      expect(result.status).toBe(200);
    }
    expect(calls.map((call) => call.path)).toEqual(
      (Object.keys(READBACK_PATHS) as ReadbackKey[]).map((key) => READBACK_SPECS[key].path),
    );
    for (const call of calls) {
      expect(new Headers(call.init?.headers).get("authorization")).toBe("Bearer s26e-token");
      expect(call.init?.method).toBe("GET");
      expect(call.init?.signal).toBe(controller.signal);
    }
  });
});

describe("S26e shared readback routes", () => {
  for (const route of routes) {
    it(route.stateTestName, async () => {
      const success = mountRoute(route, `s26e-${route.key}-ok`, async () =>
        json(route.successBody),
      );
      const ok = await waitFor(
        () =>
          document.querySelector(
            `[data-readback-route='${route.key}'][data-readback-state='ok']`,
          ) ?? undefined,
        `${route.key} success`,
      );
      expect(ok.textContent).toContain(route.successText);
      dispose(success);

      const empty = mountRoute(route, `s26e-${route.key}-empty`, async () => json(route.emptyBody));
      const emptyState = await waitFor(
        () =>
          document.querySelector(
            `[data-readback-route='${route.key}'][data-readback-state='empty']`,
          ) ?? undefined,
        `${route.key} empty`,
      );
      expect(emptyState.textContent).toContain(route.emptyText);
      dispose(empty);

      let resolveRead: ((response: Response) => void) | undefined;
      const loading = mountRoute(
        route,
        `s26e-${route.key}-loading`,
        async () =>
          await new Promise<Response>((resolve) => {
            resolveRead = resolve;
          }),
      );
      const loadingState = await waitFor(
        () =>
          document.querySelector(
            `[data-readback-route='${route.key}'][data-readback-state='loading']`,
          ) ?? undefined,
        `${route.key} loading`,
      );
      expect(loadingState.textContent).toContain(`Loading ${route.label.toLowerCase()}…`);
      expect(
        loadingState.querySelector("[role='status'][aria-busy='true']"),
        `${route.key} aria-busy`,
      ).not.toBeNull();
      resolveRead?.(json(route.emptyBody));
      await waitFor(
        () =>
          document.querySelector(
            `[data-readback-route='${route.key}'][data-readback-state='empty']`,
          ) ?? undefined,
        `${route.key} loading resolved`,
      );
      dispose(loading);

      const error = mountRoute(route, `s26e-${route.key}-error`, async () =>
        json({ reason: "unavailable" }, 503),
      );
      const errorState = await waitFor(
        () =>
          document.querySelector(
            `[data-readback-route='${route.key}'][data-readback-state='error']`,
          ) ?? undefined,
        `${route.key} error`,
      );
      expect(errorState.getAttribute("role")).toBe("alert");
      expect(errorState.textContent).toContain(
        `${route.label} read failed: HTTP 503 (unavailable)`,
      );
      dispose(error);
    });

    it(`${route.key} refreshes through the existing single subscription`, async () => {
      let fetchCalls = 0;
      const listeners: Map<string, (event: MessageEvent<string>) => void> = new Map();
      let active = 0;
      const factory: RuntimeEventSourceFactory = () => {
        active += 1;
        return {
          addEventListener: (type, listener) => listeners.set(type, listener),
          close: () => {
            active -= 1;
          },
        };
      };
      const entry = mountRoute(
        route,
        `s26e-${route.key}-refresh`,
        async () => {
          fetchCalls += 1;
          return json(route.successBody);
        },
        factory,
      );
      await waitFor(
        () =>
          document.querySelector(
            `[data-readback-route='${route.key}'][data-readback-state='ok']`,
          ) ?? undefined,
        `${route.key} initial read`,
      );
      expect(fetchCalls).toBe(1);
      expect(active).toBe(1);
      expect([...listeners.keys()]).toEqual(["revision.update"]);
      listeners.get("revision.update")?.({
        data: JSON.stringify({ revision: 1 }),
      } as MessageEvent<string>);
      await waitFor(() => (fetchCalls === 2 ? true : undefined), `${route.key} refresh`);
      expect(active).toBe(1);
      dispose(entry);
    });
  }
});
