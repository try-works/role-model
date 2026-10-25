import { afterEach, describe, expect, it, vi } from "vitest";

import { mountShell } from "../src/mount";
import {
  OBSERVABILITY_CLIENT_PATH,
  createObservabilityClient,
  observabilityErrorMessage,
} from "../src/observability";
import type { RuntimeEventSourceFactory } from "../src/refresh";

/**
 * S26d (R13 wave 2): the observability read port, client through page.
 * Real host path/client with injected fetch, four DOM states, and refresh through the shell's
 * existing single runtime subscription.
 */

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

const mounted: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> =
  [];

const mountAt = (id: string, pathname: string, options: Parameters<typeof mountShell>[1] = {}) => {
  window.history.replaceState({}, "", pathname);
  localStorage.clear();
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, options);
  mounted.push({ container, handle });
  return handle;
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

const successFetch = async (input: string | URL | Request, init?: RequestInit) => {
  void input;
  void init;
  return jsonResponse({
    metrics: { "router.decisions": { count: 3, incremental: false } },
    schemaVersion: "role-model.observability-snapshot.v1",
  });
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

describe("S26d observability client", () => {
  it("uses the real host path with accept, token only when provisioned, and the forwarded abort signal", async () => {
    const calls: Array<{ init?: RequestInit; url: string }> = [];
    const client = createObservabilityClient({
      fetchImpl: async (input, init) => {
        calls.push({ init, url: String(input) });
        return jsonResponse({ metrics: {}, schemaVersion: "x" });
      },
      token: "s26d-token",
    });
    const controller = new AbortController();
    const result = await client({ signal: controller.signal });
    expect(result.status).toBe(200);
    expect(calls[0]?.url.endsWith(OBSERVABILITY_CLIENT_PATH)).toBe(true);
    expect(calls[0]?.init?.method).toBe("GET");
    expect(new Headers(calls[0]?.init?.headers).get("accept")).toBe("application/json");
    expect(new Headers(calls[0]?.init?.headers).get("authorization")).toBe("Bearer s26d-token");
    expect(calls[0]?.init?.signal).toBe(controller.signal);
  });

  it("omits authorization without a provisioned token and maps a non-200 to the exact error phrase", async () => {
    const client = createObservabilityClient({
      fetchImpl: async (_input, init) => {
        expect(new Headers(init?.headers).get("authorization")).toBeNull();
        return jsonResponse({ reason: "unavailable" }, 503);
      },
    });
    const result = await client({ signal: new AbortController().signal });
    expect(result.status).toBe(503);
    expect(observabilityErrorMessage(503, "unavailable")).toBe(
      "Observability read failed: HTTP 503 (unavailable)",
    );
  });
});

describe("S26d observability page", () => {
  it("renders the success state from the real client", async () => {
    mountAt("s26d-success", "/observe/observability-snapshot", {
      readObservability: createObservabilityClient({ fetchImpl: successFetch }),
    });
    const page = await waitFor(
      () => document.querySelector("[data-observability-state='ok']") ?? undefined,
      "success state",
    );
    expect(page.textContent).toContain("router.decisions");
    expect(page.textContent).toContain("3");
    expect(document.title).toBe("Observability | RM3 Foldkit shell");
  });

  it("renders the empty state for an empty metric registry", async () => {
    mountAt("s26d-empty", "/observe/observability-snapshot", {
      readObservability: createObservabilityClient({
        fetchImpl: async () => jsonResponse({ metrics: {}, schemaVersion: "x" }),
      }),
    });
    const page = await waitFor(
      () => document.querySelector("[data-observability-state='empty']") ?? undefined,
      "empty state",
    );
    expect(page.textContent).toContain("No metrics recorded yet.");
  });

  it("renders loading while the injected read is in flight", async () => {
    let resolveRead: ((response: Response) => void) | undefined;
    mountAt("s26d-loading", "/observe/observability-snapshot", {
      readObservability: createObservabilityClient({
        fetchImpl: async () =>
          await new Promise<Response>((resolve) => {
            resolveRead = resolve;
          }),
      }),
    });
    const page = await waitFor(
      () => document.querySelector("[data-observability-state='loading']") ?? undefined,
      "loading state",
    );
    expect(page.textContent).toContain("Loading observability snapshot…");
    resolveRead?.(jsonResponse({ metrics: {}, schemaVersion: "x" }));
    await waitFor(
      () => document.querySelector("[data-observability-state='empty']") ?? undefined,
      "loading resolved to empty",
    );
  });

  it("renders the error state with the exact host failure phrase", async () => {
    mountAt("s26d-error", "/observe/observability-snapshot", {
      readObservability: createObservabilityClient({
        fetchImpl: async () => jsonResponse({ reason: "unavailable" }, 503),
      }),
    });
    const page = await waitFor(
      () => document.querySelector("[data-observability-state='error']") ?? undefined,
      "error state",
    );
    expect(page.getAttribute("role")).toBe("alert");
    expect(page.textContent).toContain("Observability read failed: HTTP 503 (unavailable)");
  });

  it("refreshes through the existing single subscription, not a second owner", async () => {
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
    mountAt("s26d-refresh", "/observe/observability-snapshot", {
      readObservability: createObservabilityClient({
        fetchImpl: async () => {
          fetchCalls += 1;
          return jsonResponse({
            metrics: { "router.decisions": { count: fetchCalls, incremental: false } },
            schemaVersion: "x",
          });
        },
      }),
      runtimeEventSourceFactory: factory,
    });
    await waitFor(
      () => (document.querySelector("[data-observability-state='ok']") ? true : undefined),
      "initial observability read",
    );
    expect(fetchCalls).toBe(1);
    expect(active).toBe(1);
    expect([...listeners.keys()]).toEqual(["revision.update"]);

    listeners.get("revision.update")?.({
      data: JSON.stringify({ revision: 1 }),
    } as MessageEvent<string>);

    await waitFor(() => (fetchCalls === 2 ? true : undefined), "refresh through the subscription");
    expect(active).toBe(1);
    await waitFor(
      () => (document.body.textContent?.includes("2") ? true : undefined),
      "refreshed count rendered",
    );
  });
});
