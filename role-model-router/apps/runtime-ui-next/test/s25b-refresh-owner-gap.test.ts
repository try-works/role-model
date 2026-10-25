import { afterEach, describe, expect, it } from "vitest";

import { defineReadDiagnostics } from "../src/commands";
import { Message } from "../src/message";
import { mountShell } from "../src/mount";
import type { RuntimeEventSourceFactory } from "../src/refresh";
import { createUpdate } from "../src/update";

/**
 * Run 115 S25b (R12): the Foldkit shell owns ONE runtime refresh subscription, detects a revision
 * gap immediately (even when no later event ever arrives), dispatches a snapshot resync Command,
 * and renders stale while the resync is pending/failed.
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

interface FakeSource {
  readonly listeners: Map<string, (event: MessageEvent<string>) => void>;
  readonly closed: () => number;
  readonly emitRevision: (revision: number) => void;
}

type DiagnosticsResult = {
  readonly body: Record<string, unknown>;
  readonly status: number;
};
const diagnosticsResult = (buildId: string, state = "disabled"): DiagnosticsResult => ({
  body: {
    identity: { buildId, instanceId: "instance-s25b" },
    records: [],
    state,
  },
  status: 200,
});

const mounts: Array<{ readonly container: HTMLElement; readonly handle: { dispose(): void } }> = [];
let activeSources = 0;
let peakActive = 0;
const fakeSources: FakeSource[] = [];

const fakeFactory: RuntimeEventSourceFactory = () => {
  let closed = 0;
  const listeners = new Map<string, (event: MessageEvent<string>) => void>();
  const source: FakeSource = {
    listeners,
    closed: () => closed,
    emitRevision: (revision) =>
      listeners.get("revision.update")?.({
        data: JSON.stringify({ revision }),
      } as MessageEvent<string>),
  };
  activeSources += 1;
  peakActive = Math.max(peakActive, activeSources);
  fakeSources.push(source);
  return {
    addEventListener: (type, listener) => listeners.set(type, listener),
    close: () => {
      closed += 1;
      activeSources -= 1;
    },
  };
};

const mount = (id: string, options: Parameters<typeof mountShell>[1] = {}) => {
  const container = document.createElement("div");
  container.id = id;
  document.body.append(container);
  const handle = mountShell(container, { runtimeEventSourceFactory: fakeFactory, ...options });
  mounts.push({ container, handle });
  return { container, handle };
};

afterEach(() => {
  for (const entry of mounts.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  activeSources = 0;
  peakActive = 0;
  fakeSources.length = 0;
  window.history.replaceState({}, "", "/");
});

describe("S25b shell refresh owner and gap resync", () => {
  it("the real shell entry starts exactly one subscription and leaks none across two starts", async () => {
    const first = mount("s25b-refresh-first");
    expect(first).toBeDefined();
    await waitFor(() => (fakeSources.length > 0 ? true : undefined), "the first source");
    expect(fakeSources).toHaveLength(1);
    expect(activeSources).toBe(1);
    first.handle.dispose();
    first.handle.dispose();
    expect(activeSources).toBe(0);
    expect(fakeSources[0]?.closed()).toBe(1);

    mount("s25b-refresh-second");
    await waitFor(() => (fakeSources.length > 1 ? true : undefined), "the second source");
    expect(fakeSources).toHaveLength(2);
    expect(activeSources).toBe(1);
    expect(peakActive).toBe(1);
    expect(fakeSources[0]?.closed()).toBe(1);
    expect(fakeSources[1]?.closed()).toBe(0);

    // Navigation must not add a route-owned subscription: recheck after the route changes.
    document.querySelector<HTMLAnchorElement>('a[data-nav="diagnostics"]')?.click();
    await waitFor(
      () => (window.location.pathname.startsWith("/diagnostics/") ? true : undefined),
      "the diagnostics route",
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fakeSources).toHaveLength(2);
    expect(activeSources).toBe(1);
  });

  it("a revision gap 1 -> 3 with NO later event resyncs immediately, shows stale, and ignores the old revision", async () => {
    window.history.replaceState({}, "", "/diagnostics/abc");
    let snapshotCalls = 0;
    let resolveSnapshot: ((value: DiagnosticsResult) => void) | undefined;
    mount("s25b-refresh-gap", {
      readDiagnostics: async () => diagnosticsResult("build-A"),
      readRefreshSnapshot: async () => {
        snapshotCalls += 1;
        return await new Promise<DiagnosticsResult>((resolve) => {
          resolveSnapshot = resolve;
        });
      },
    });

    await waitFor(() => (fakeSources.length === 1 ? true : undefined), "the source");
    const shell = () => document.querySelector<HTMLElement>(".rm3-next-shell");
    await waitFor(
      () => (document.querySelector('[data-diagnostics-state="disabled"]') ? true : undefined),
      "the initial diagnostics read",
    );

    fakeSources[0]?.emitRevision(1);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-revision") === "1" ? true : undefined),
      "revision 1 applied",
    );
    expect(shell()?.getAttribute("data-refresh-state")).toBe("live");
    expect(document.querySelector('[data-refresh-state="stale"]')).toBeNull();

    // Hard case: a jump to 3 with no revision 2 and no later event.
    fakeSources[0]?.emitRevision(3);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-state") === "stale" ? true : undefined),
      "the stale state after the gap",
    );
    await waitFor(() => (snapshotCalls === 1 ? true : undefined), "the snapshot resync command");
    expect(document.querySelector('[data-refresh-state="stale"]')?.textContent).toContain("Stale:");
    expect(shell()?.getAttribute("data-refresh-revision")).toBe("3");

    // An old revision arriving while the resync is pending must not change anything.
    fakeSources[0]?.emitRevision(2);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(snapshotCalls).toBe(1);
    expect(shell()?.getAttribute("data-refresh-state")).toBe("stale");

    resolveSnapshot?.(diagnosticsResult("build-B"));
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-state") === "live" ? true : undefined),
      "the completed resync",
    );
    expect(shell()?.getAttribute("data-refresh-revision")).toBe("3");
    // Defect A: the resync payload is applied, not discarded.
    await waitFor(
      () => (document.body.textContent?.includes("build: build-B") ? true : undefined),
      "the resynced diagnostics payload",
    );
    expect(document.body.textContent).not.toContain("build: build-A");
    expect(document.querySelector('[data-refresh-state="stale"]')).toBeNull();

    // Old revision after the resync is still ignored.
    fakeSources[0]?.emitRevision(2);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(shell()?.getAttribute("data-refresh-revision")).toBe("3");
    expect(snapshotCalls).toBe(1);
  });

  it("a failed snapshot resync leaves the page visibly stale", async () => {
    window.history.replaceState({}, "", "/diagnostics/failed");
    mount("s25b-refresh-failed", {
      readDiagnostics: async () => ({ body: { records: [], state: "empty" }, status: 200 }),
      readRefreshSnapshot: async () => {
        throw new Error("snapshot unavailable");
      },
    });
    await waitFor(() => (fakeSources.length === 1 ? true : undefined), "the source");
    fakeSources[0]?.emitRevision(1);
    const shell = () => document.querySelector<HTMLElement>(".rm3-next-shell");
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-revision") === "1" ? true : undefined),
      "revision 1 applied",
    );
    fakeSources[0]?.emitRevision(3);
    await waitFor(
      () =>
        (document.querySelector('[data-refresh-state="stale"]')?.textContent ?? "").includes(
          "snapshot unavailable",
        )
          ? true
          : undefined,
      "the failed-resync stale banner",
    );
    expect(shell()?.getAttribute("data-refresh-state")).toBe("stale");
    expect(shell()?.getAttribute("data-refresh-revision")).toBe("3");

    // Defect B: a contiguous revision must not clear the failed resync.
    fakeSources[0]?.emitRevision(4);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-revision") === "4" ? true : undefined),
      "revision 4 applied",
    );
    expect(shell()?.getAttribute("data-refresh-state")).toBe("stale");
    expect(document.querySelector('[data-refresh-state="stale"]')?.textContent).toContain(
      "snapshot unavailable",
    );
  });

  const navigate = (path: string): void => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  it("navigation fences a pending resync: round-trip old payload cannot overwrite fresh data", async () => {
    window.history.replaceState({}, "", "/diagnostics/a");
    let reads = 0;
    let resolveSnapshot: ((value: DiagnosticsResult) => void) | undefined;
    mount("s25e-round-trip", {
      readDiagnostics: async ({ id }) => {
        reads += 1;
        return diagnosticsResult(`build-${id}-${String(reads)}`);
      },
      readRefreshSnapshot: async () =>
        await new Promise<DiagnosticsResult>((resolve) => {
          resolveSnapshot = resolve;
        }),
    });
    await waitFor(() => (fakeSources.length === 1 ? true : undefined), "the source");
    const shell = () => document.querySelector<HTMLElement>(".rm3-next-shell");
    await waitFor(
      () => (document.body.textContent?.includes("build: build-a-1") ? true : undefined),
      "initial build-a",
    );
    fakeSources[0]?.emitRevision(1);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-revision") === "1" ? true : undefined),
      "revision 1",
    );
    fakeSources[0]?.emitRevision(3);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-state") === "stale" ? true : undefined),
      "pending resync",
    );

    navigate("/diagnostics/b");
    await waitFor(
      () => (document.body.textContent?.includes("build: build-b-2") ? true : undefined),
      "fresh route b",
    );
    navigate("/diagnostics/a");
    await waitFor(
      () => (document.body.textContent?.includes("build: build-a-3") ? true : undefined),
      "fresh route a",
    );
    expect(shell()?.getAttribute("data-refresh-state")).not.toBe("stale");

    // The OLD pending resync resolves last; navigation advanced the token, so it must lose.
    resolveSnapshot?.(diagnosticsResult("build-A-stale"));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.body.textContent).toContain("build: build-a-3");
    expect(document.body.textContent).not.toContain("build-A-stale");
    expect(shell()?.getAttribute("data-refresh-state")).not.toBe("stale");
    expect(document.querySelector('[data-refresh-state="stale"]')).toBeNull();
  });

  it("a failure for route A resolving after navigation to B does not mark B stale", async () => {
    window.history.replaceState({}, "", "/diagnostics/a");
    let rejectSnapshot: ((error: Error) => void) | undefined;
    mount("s25e-failure-route", {
      readDiagnostics: async ({ id }) => diagnosticsResult(`build-${id}`),
      readRefreshSnapshot: async () =>
        await new Promise<DiagnosticsResult>((_resolve, reject) => {
          rejectSnapshot = reject;
        }),
    });
    await waitFor(() => (fakeSources.length === 1 ? true : undefined), "the source");
    const shell = () => document.querySelector<HTMLElement>(".rm3-next-shell");
    await waitFor(
      () => (document.body.textContent?.includes("build: build-a") ? true : undefined),
      "route a",
    );
    fakeSources[0]?.emitRevision(1);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-revision") === "1" ? true : undefined),
      "revision 1",
    );
    fakeSources[0]?.emitRevision(3);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-state") === "stale" ? true : undefined),
      "pending resync on a",
    );
    navigate("/diagnostics/b");
    await waitFor(
      () => (document.body.textContent?.includes("build: build-b") ? true : undefined),
      "route b",
    );
    expect(shell()?.getAttribute("data-refresh-state")).not.toBe("stale");

    rejectSnapshot?.(new Error("old route failure"));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.body.textContent).toContain("build: build-b");
    expect(shell()?.getAttribute("data-refresh-state")).not.toBe("stale");
    expect(document.querySelector('[data-refresh-state="stale"]')).toBeNull();
  });

  it("a fresh route read without a following gap does not leave the page stale", async () => {
    window.history.replaceState({}, "", "/diagnostics/a");
    mount("s25e-fresh-read", {
      readDiagnostics: async ({ id }) => diagnosticsResult(`build-${id}`),
      readRefreshSnapshot: async () => await new Promise<DiagnosticsResult>(() => undefined),
    });
    await waitFor(() => (fakeSources.length === 1 ? true : undefined), "the source");
    const shell = () => document.querySelector<HTMLElement>(".rm3-next-shell");
    await waitFor(
      () => (document.body.textContent?.includes("build: build-a") ? true : undefined),
      "route a",
    );
    fakeSources[0]?.emitRevision(1);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-revision") === "1" ? true : undefined),
      "revision 1",
    );
    fakeSources[0]?.emitRevision(3);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-state") === "stale" ? true : undefined),
      "pending resync",
    );
    navigate("/diagnostics/b");
    await waitFor(
      () => (document.body.textContent?.includes("build: build-b") ? true : undefined),
      "fresh route b",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(shell()?.getAttribute("data-refresh-state")).not.toBe("stale");
    expect(document.querySelector('[data-refresh-state="stale"]')).toBeNull();
  });

  it("failure attribution requires both the current token and the current route id", () => {
    const update = createUpdate(
      defineReadDiagnostics(async () => ({
        body: { records: [], state: "empty" },
        status: 200,
      })),
    );
    const model = {
      clicks: 0,
      diagnostics: { records: [], routeId: "b", status: "idle" },
      refresh: { lastAppliedRevision: 3, resyncToken: 1, status: "live" },
      route: { _tag: "Diagnostics", id: "b" },
      theme: "light",
    } as never;
    const result = update(
      model,
      Message.RefreshResyncFailed({ message: "old route failure", routeId: "a", token: 1 }),
    );
    expect(result.model.refresh.status).toBe("live");
    expect(result.model.refresh.message).toBeUndefined();
  });

  it("two resyncs in flight: the older response resolving last cannot win", async () => {
    window.history.replaceState({}, "", "/diagnostics/race");
    const resolvers: Array<(value: DiagnosticsResult) => void> = [];
    mount("s25b-refresh-race", {
      readDiagnostics: async () => diagnosticsResult("build-initial"),
      readRefreshSnapshot: async () =>
        await new Promise<DiagnosticsResult>((resolve) => {
          resolvers.push(resolve);
        }),
    });
    await waitFor(() => (fakeSources.length === 1 ? true : undefined), "the source");
    const shell = () => document.querySelector<HTMLElement>(".rm3-next-shell");
    await waitFor(
      () => (document.querySelector('[data-diagnostics-state="disabled"]') ? true : undefined),
      "the initial diagnostics read",
    );
    fakeSources[0]?.emitRevision(1);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-revision") === "1" ? true : undefined),
      "revision 1 applied",
    );
    fakeSources[0]?.emitRevision(3);
    await waitFor(() => (resolvers.length === 1 ? true : undefined), "resync 1");
    fakeSources[0]?.emitRevision(5);
    await waitFor(() => (resolvers.length === 2 ? true : undefined), "resync 2");

    // New resync wins first...
    resolvers[1]?.(diagnosticsResult("build-new"));
    await waitFor(
      () => (document.body.textContent?.includes("build: build-new") ? true : undefined),
      "the new resync payload",
    );
    expect(shell()?.getAttribute("data-refresh-state")).toBe("live");

    // ...then the old resync resolves last; the token fence ignores it.
    resolvers[0]?.(diagnosticsResult("build-old"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.body.textContent).toContain("build: build-new");
    expect(document.body.textContent).not.toContain("build: build-old");
    expect(shell()?.getAttribute("data-refresh-state")).toBe("live");
    expect(shell()?.getAttribute("data-refresh-revision")).toBe("5");
  });

  it("an older FAILED resync resolving last cannot make the newer success stale", async () => {
    window.history.replaceState({}, "", "/diagnostics/race-failure");
    const pending: Array<{
      reject: (error: Error) => void;
      resolve: (value: DiagnosticsResult) => void;
    }> = [];
    mount("s25b-refresh-race-failure", {
      readDiagnostics: async () => diagnosticsResult("build-initial"),
      readRefreshSnapshot: async () =>
        await new Promise<DiagnosticsResult>((resolve, reject) => {
          pending.push({ reject, resolve });
        }),
    });
    await waitFor(() => (fakeSources.length === 1 ? true : undefined), "the source");
    const shell = () => document.querySelector<HTMLElement>(".rm3-next-shell");
    await waitFor(
      () => (document.querySelector('[data-diagnostics-state="disabled"]') ? true : undefined),
      "the initial diagnostics read",
    );
    fakeSources[0]?.emitRevision(1);
    await waitFor(
      () => (shell()?.getAttribute("data-refresh-revision") === "1" ? true : undefined),
      "revision 1 applied",
    );
    fakeSources[0]?.emitRevision(3);
    await waitFor(() => (pending.length === 1 ? true : undefined), "resync 1");
    fakeSources[0]?.emitRevision(5);
    await waitFor(() => (pending.length === 2 ? true : undefined), "resync 2");

    pending[1]?.resolve(diagnosticsResult("build-new"));
    await waitFor(
      () => (document.body.textContent?.includes("build: build-new") ? true : undefined),
      "the new resync payload",
    );
    expect(shell()?.getAttribute("data-refresh-state")).toBe("live");

    pending[0]?.reject(new Error("old resync failed"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.body.textContent).toContain("build: build-new");
    expect(shell()?.getAttribute("data-refresh-state")).toBe("live");
    expect(shell()?.getAttribute("data-refresh-revision")).toBe("5");
  });
});
