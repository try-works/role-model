import { readFileSync } from "node:fs";
import path from "node:path";
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
  readonly initialReads?: number;
  readonly emptyBody: unknown;
  readonly successText: string;
}

const fixture = (key: string): unknown =>
  JSON.parse(
    readFileSync(path.join(import.meta.dirname, "fixtures", "s26o", key + ".json"), "utf8"),
  );

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
    initialReads: 2,
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
    emptyBody: { peers: [] },
    emptyText: "No system peers configured yet.",
    key: "systemPeers",
    label: "System peers",
    path: "/system/peers",
    stateTestName: "System peers renders success, empty, loading and error on the DOM",
    successBody: { peers: [{ id: "sp1", url: "http://system-peer" }] },
    successText: "http://system-peer",
  },
  {
    emptyBody: {},
    emptyText: "No runtime configuration available.",
    key: "runtime",
    label: "Runtime",
    path: "/runtime",
    stateTestName: "Runtime renders success, empty, loading and error on the DOM",
    successBody: { applied: false, config: null, path: "runtime-config.yaml" },
    successText: "applied",
  },
  {
    emptyBody: {},
    emptyText: "No session readiness state available.",
    key: "sessionReadiness",
    label: "Session readiness",
    path: "/session-readiness",
    stateTestName: "Session readiness renders success, empty, loading and error on the DOM",
    successBody: { observedAt: "2026-10-25T05:46:08.202Z", overall: "unobserved", context: { channel: "development", scope: "standalone-runtime-dev" }, capabilities: {}, storage: {} },
    successText: "unobserved",
  },
  {
    emptyBody: { requestCount: 0, successCount: 0, failureCount: 0, totalTokens: 0 },
    emptyText: "No dashboard requests recorded yet.",
    key: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    stateTestName: "Dashboard renders success, empty, loading and error on the DOM",
    successBody: { requestCount: 1, successCount: 1, failureCount: 0, totalInputTokens: 10, totalOutputTokens: 4, totalTokens: 14, averageLatencyMs: 12, p95LatencyMs: 18, totalActualCostUsd: 0.1, totalEstimatedCostUsd: 0.1, totalEffectiveCostUsd: 0.1, cachedRequestCount: 0, excludedRequestCount: 0 },
    successText: "1",
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
    emptyBody: { items: [] },
    emptyText: "No host activity recorded yet.",
    key: "observeActivity",
    label: "Observe activity",
    path: "/observe/activity",
    stateTestName: "Observe activity renders success, empty, loading and error on the DOM",
    successBody: { items: [{ request_id: "activity-kind", status: "success" }] },
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
    successText: "STRUCTURED ROWS",
  },
  {
    emptyBody: { rows: [] },
    emptyText: "No routing rows recorded yet.",
    initialReads: 2,
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
    initialReads: 5,
    path: "/router",
    stateTestName: "Router renders success, empty, loading and error on the DOM",
    successBody: { alias: "router-alias", mode: "local" },
    successText: "router-alias",
  },
  {
    emptyBody: {},
    emptyText: "No request detail available.",
    key: "requestDetail",
    label: "Request detail",
    path: "/requests/req-1",
    stateTestName: "Request detail renders success, empty, loading and error on the DOM",
    successBody: { endpointId: "ep-1", requestId: "req-1", routingDecisionId: "decision-1", statusFamily: "success" },
    successText: "req-1",
  },
  {
    emptyBody: {},
    emptyText: "No router decision detail available.",
    key: "routerDecisionDetail",
    label: "Router decision detail",
    path: "/router/decisions/req-1",
    stateTestName: "Router decision detail renders success, empty, loading and error on the DOM",
    successBody: { endpointId: "ep-1", requestId: "req-1", routingDecisionId: "decision-1", statusFamily: "success" },
    successText: "req-1",
  },
  {
    emptyBody: { cases: [] },
    emptyText: "No benchmark suite available.",
    initialReads: 3,
    key: "benchmarkSuite",
    label: "Benchmark suite",
    path: "/system/benchmark",
    stateTestName: "Benchmark suite renders success, empty, loading and error on the DOM",
    successBody: fixture("benchmarkSuite"),
    // The parity page no longer lists raw case ids; it renders the suite-derived mode count. The route
    // plans three readbacks (suite + summary + runs), hence initialReads above.
    successText: "Quick (12 hard cases)",
  },
  {
    emptyBody: { categories: [], receipts: [], totalBytes: 0, totalCount: 0 },
    emptyText: "No storage retention records available.",
    key: "storageRetention",
    label: "Storage retention",
    path: "/system/storage-retention",
    stateTestName: "Storage retention renders success, empty, loading and error on the DOM",
    successBody: fixture("storageRetention"),
    successText: "retention",
  },
  {
    emptyBody: [],
    emptyText: "No peer models configured yet.",
    key: "localPeerModels",
    label: "Peer models",
    path: "/local/peer-models",
    stateTestName: "Peer models renders success, empty, loading and error on the DOM",
    successBody: [{ modelId: "peer-model", status: "ready" }],
    successText: "peer-model",
  },
  {
    emptyBody: {},
    emptyText: "No queue configuration available.",
    key: "queueConfig",
    label: "Queue configuration",
    path: "/control/queues-config",
    stateTestName: "Queue configuration renders success, empty, loading and error on the DOM",
    successBody: fixture("queueConfig"),
    successText: "policyVersion",
  },
  {
    emptyBody: {},
    emptyText: "No downstream OpenAI configuration available.",
    key: "downstreamOpenAI",
    label: "Downstream OpenAI",
    path: "/integrations/downstream",
    stateTestName: "Downstream OpenAI renders success, empty, loading and error on the DOM",
    successBody: fixture("downstreamOpenAI"),
    successText: "role-model-dev",
  },
  {
    emptyBody: [],
    emptyText: "No integration providers configured yet.",
    key: "integrationProviders",
    label: "Integration providers",
    path: "/integrations/upstream",
    stateTestName: "Integration providers renders success, empty, loading and error on the DOM",
    successBody: fixture("integrationProviders"),
    successText: "302ai",
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
    const calls: Array<{ init?: RequestInit; pathname: string; search: string }> = [];
    const clients = createReadbackClients({
      fetchImpl: async (input, init) => {
        const url = new URL(String(input));
        calls.push({ init, pathname: url.pathname, search: url.search });
        return json({});
      },
      token: "s26e-token",
    });
    const controller = new AbortController();
    for (const key of Object.keys(READBACK_PATHS) as ReadbackKey[]) {
      const result = await clients[key]({ signal: controller.signal });
      expect(result.status).toBe(200);
    }
    // Record pathname AND search: kind=pack is part of the declared host contract and must not
    // be silently stripped when comparing the client request to READBACK_SPECS.
    const expectedTargets = (Object.keys(READBACK_PATHS) as ReadbackKey[]).map((key) => {
      const spec = READBACK_SPECS[key];
      // pathFor is the spec's declared default query (windowMs); path carries kind=pack.
      const target = new URL(spec.pathFor?.("") ?? spec.path, "http://localhost");
      return { pathname: target.pathname, search: target.search };
    });
    expect(calls.map((call) => ({ pathname: call.pathname, search: call.search }))).toEqual(
      expectedTargets,
    );
    for (const call of calls) {
      expect(new Headers(call.init?.headers).get("authorization")).toBe("Bearer s26e-token");
      expect(call.init?.method).toBe("GET");
      // S279: shared readers use an owner-controlled signal so one alias cannot cancel another.
      // The physical signal and per-consumer abort propagation are exercised in S279; the standalone
      // createReadbackClient still preserves exact caller signal identity.
      expect(call.init?.signal).toBeInstanceOf(AbortSignal);
      expect(call.init?.signal?.aborted).toBe(false);
    }
  });
});

describe("S26e shared readback routes", () => {
  for (const route of routes) {
    it(route.stateTestName, async () => {
      const success = mountRoute(route, `s26e-${route.key}-ok`, async () =>
        json(route.successBody),
      );
      await waitFor(
        () => (document.body.textContent?.includes(route.successText) ? true : undefined),
        `${route.key} success`,
      );
      dispose(success);

      const empty = mountRoute(route, `s26e-${route.key}-empty`, async () => json(route.emptyBody));
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(document.body.textContent).not.toContain(route.successText);
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
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(document.body.textContent).not.toContain(route.successText);
      resolveRead?.(json(route.emptyBody));
      await new Promise((resolve) => setTimeout(resolve, 150));
      dispose(loading);

      const error = mountRoute(route, `s26e-${route.key}-error`, async () =>
        json({ reason: "unavailable" }, 503),
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(document.body.textContent).not.toContain(route.successText);
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
        () => (fetchCalls >= 1 ? true : undefined),
        `${route.key} initial read`,
      );
      const initialReads = route.initialReads ?? 1;
      expect(fetchCalls).toBe(initialReads);
      expect(active).toBe(1);
      // S278 restores the legacy two-event contract on this same single source.
      expect([...listeners.keys()].sort()).toEqual(["revision.update", "telemetry.update"]);
      listeners.get("revision.update")?.({
        data: JSON.stringify({ revision: 1 }),
      } as MessageEvent<string>);
      await waitFor(() => (fetchCalls > initialReads ? true : undefined), `${route.key} refresh`);
      // Router pages subscribe to several readbacks; the revision event re-reads the whole plan.
      expect(fetchCalls).toBeGreaterThan(initialReads);
      expect(active).toBe(1);
      dispose(entry);
    });
  }
});