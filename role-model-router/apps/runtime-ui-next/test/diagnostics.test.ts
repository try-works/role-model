import { afterEach, describe, expect, it } from "vitest";

import { mountShell } from "../src/mount";

/**
 * Run 115 S15b (R21 UI half): the diagnostics page inside the Foldkit shell.
 *
 * The reader is injected, so no server is started. The page must model the read as a Command +
 * Message pair (the runtime runs the Command after update returns and dispatches the result
 * Message), and it must render the read module's states distinctly: ok, empty, disabled, stale
 * (rule and age), dropped (loss counts), denied and transport error.
 *
 * The wire bodies mirror role-model-router/apps/runtime-host-bridge/src/local-diagnostics-read.ts
 * (LOCAL_DIAGNOSTICS_SCHEMA :15, states :37, body fields :68-96, staleness :191-198, loss :193).
 */

interface ReaderInput {
  readonly id: string;
  readonly signal: AbortSignal;
}

interface ReaderResult {
  readonly status: number;
  readonly body: unknown;
}

type Reader = (input: ReaderInput) => Promise<ReaderResult>;

const schemaVersion = "role-model.local-diagnostics-read.v1";
const identity = { instanceId: "inst-1", buildId: "build-9" };
const record = { atMs: 1_700_000_000_000, code: "queue.retry", count: 3, level: "warn" };

const bodyOf = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  bounds: {
    limit: 20,
    maxCodeBytes: 512,
    maxIdentityBytes: 256,
    maxRecords: 50,
    maxResponseBytes: 16_384,
  },
  conditions: { dropped: false, stale: false },
  cursor: null,
  identity,
  loss: { dropped: 0, windowMs: 0 },
  recordCount: 0,
  records: [],
  schemaVersion,
  staleness: { ageMs: 5_000, ruleMs: 300_000, stale: false },
  totalAvailable: 0,
  truncated: false,
  ...overrides,
});

const readerOf =
  (result: ReaderResult): Reader =>
  async () =>
    result;
const readerRejecting =
  (message: string): Reader =>
  async () => {
    throw new Error(message);
  };

let readerCalls: ReaderInput[] = [];
const trackingReader =
  (results: ReadonlyArray<ReaderResult>): Reader =>
  async (input) => {
    readerCalls.push(input);
    const index = Math.min(readerCalls.length - 1, results.length - 1);
    const result = results[index];
    if (result === undefined) {
      throw new Error("trackingReader needs at least one result");
    }
    return result;
  };

const waitFor = async <Value>(
  read: () => Value | undefined,
  label: string,
  timeoutMs = 3000,
): Promise<Value> => {
  const deadline = Date.now() + timeoutMs;
  let last: Value | undefined;
  while (Date.now() < deadline) {
    last = read();
    if (last !== undefined) {
      return last;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(
    `Timed out waiting for ${label} (last value: ${String(last)}) | url: ${window.location.pathname} | body: ${(document.body.textContent ?? "").slice(0, 700)}`,
  );
};

const stateNode = (state: string): Element | undefined =>
  document.querySelector(`[data-diagnostics-state="${state}"]`) ?? undefined;

const bodyText = (): string => document.body.textContent ?? "";

const navigateTo = (path: string): void => {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
};

const statusParagraph = (): HTMLElement | undefined =>
  document.querySelector<HTMLElement>('[role="status"]') ?? undefined;

const mounted: Array<{
  readonly container: HTMLDivElement;
  readonly handle: { dispose: () => void };
}> = [];

const mountAt = (path: string, reader: Reader): { readonly container: HTMLDivElement } => {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  container.id = "s15b-diagnostics-shell";
  document.body.append(container);
  const handle = mountShell(container, { readDiagnostics: reader });
  mounted.push({ container, handle });
  return { container };
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  readerCalls = [];
  window.history.replaceState({}, "", "/");
});

describe("diagnostics page states", () => {
  it("renders the ok state with records and identity", async () => {
    mountAt(
      "/diagnostics/inst-1",
      readerOf({
        body: bodyOf({
          recordCount: 1,
          records: [record],
          state: "ok",
          totalAvailable: 1,
        }),
        status: 200,
      }),
    );

    await waitFor(() => stateNode("ok"), "the ok diagnostics state");
    expect(bodyText()).toContain("queue.retry");
    expect(bodyText()).toContain("3");
    expect(bodyText()).toContain("inst-1");
    expect(bodyText()).toContain("build-9");
  });

  it("renders the empty state distinctly", async () => {
    mountAt("/diagnostics/inst-1", readerOf({ body: bodyOf({ state: "empty" }), status: 200 }));

    await waitFor(() => stateNode("empty"), "the empty diagnostics state");
    expect(bodyText()).toContain("No diagnostics records");
    expect(bodyText()).not.toContain("Access denied");
  });

  it("renders disabled as a state, not an error", async () => {
    mountAt(
      "/diagnostics/inst-1",
      readerOf({
        body: bodyOf({ identity: null, state: "disabled" }),
        status: 200,
      }),
    );

    await waitFor(() => stateNode("disabled"), "the disabled diagnostics state");
    expect(bodyText().toLowerCase()).toContain("disabled");
    // Disabled is its own state; the error state and error marker must not be used for it.
    expect(stateNode("error")).toBeUndefined();
    expect(bodyText()).toContain("state, not an error");
    expect(bodyText()).toContain("build: missing");
    // Disabled is a calm state: it must not keep a danger or warning border.
    const disabledPanel = document.querySelector<HTMLElement>('[data-diagnostics-state="disabled"]');
    expect(disabledPanel?.className).toContain("border-dashed");
    expect(disabledPanel?.className).not.toContain("border-[var(--rm-danger)]");
    expect(disabledPanel?.className).not.toContain("border-[var(--rm-warning)]");
  });

  it("renders stale with the rule and the age", async () => {
    mountAt(
      "/diagnostics/inst-1",
      readerOf({
        body: bodyOf({
          recordCount: 1,
          records: [record],
          conditions: { dropped: false, stale: true },
          staleness: { ageMs: 900_000, ruleMs: 300_000, stale: true },
          state: "stale",
          totalAvailable: 1,
        }),
        status: 200,
      }),
    );

    await waitFor(() => stateNode("stale"), "the stale diagnostics state");
    // Exact phrases pin WHICH number owns WHICH label: swapping age and rule in the render fails here.
    expect(bodyText()).toContain("Stale: the newest record is 15m old (rule 5m).");
    expect(bodyText()).toContain("rule 5m · age 15m");
  });

  it("renders dropped with the loss counts", async () => {
    mountAt(
      "/diagnostics/inst-1",
      readerOf({
        body: bodyOf({
          conditions: { dropped: true, stale: false },
          loss: { dropped: 12, windowMs: 600_000 },
          recordCount: 1,
          records: [record],
          state: "dropped",
          totalAvailable: 1,
        }),
        status: 200,
      }),
    );

    await waitFor(() => stateNode("dropped"), "the dropped diagnostics state");
    // Exact phrases pin count vs window: swapping them fails here.
    expect(bodyText()).toContain("Dropped: 12 record(s) lost in the last 10m.");
    expect(bodyText()).toContain("loss window 10m · 12 dropped");
  });

  it("shows independent conditions together instead of hiding one behind the other", async () => {
    mountAt(
      "/diagnostics/inst-1",
      readerOf({
        body: bodyOf({
          conditions: { dropped: true, stale: true },
          loss: { dropped: 4, windowMs: 600_000 },
          recordCount: 1,
          records: [record],
          staleness: { ageMs: 900_000, ruleMs: 300_000, stale: true },
          state: "stale",
          totalAvailable: 1,
        }),
        status: 200,
      }),
    );
    await waitFor(() => stateNode("stale"), "the stale state with a dropped condition");
    expect(bodyText()).toContain("15m");
    expect(bodyText()).toContain("5m");
    expect(bodyText()).toContain("also dropped");
    expect(bodyText()).toContain("4");

    for (const entry of mounted.splice(0)) {
      entry.handle.dispose();
      entry.container.remove();
    }

    mountAt(
      "/diagnostics/inst-1",
      readerOf({
        body: bodyOf({
          conditions: { dropped: true, stale: true },
          loss: { dropped: 4, windowMs: 600_000 },
          recordCount: 1,
          records: [record],
          staleness: { ageMs: 900_000, ruleMs: 300_000, stale: true },
          state: "dropped",
          totalAvailable: 1,
        }),
        status: 200,
      }),
    );
    await waitFor(() => stateNode("dropped"), "the dropped state with a stale condition");
    expect(bodyText()).toContain("also stale");
    expect(bodyText()).toContain("15m");
    expect(bodyText()).toContain("5m");
  });

  it("renders a denied response as access denied", async () => {
    mountAt(
      "/diagnostics/inst-1",
      readerOf({
        body: { error: "unauthorized", schemaVersion },
        status: 401,
      }),
    );

    await waitFor(() => stateNode("denied"), "the denied diagnostics state");
    expect(bodyText()).toContain("Access denied");
  });

  it("renders denied rather than an empty list for a denied response", async () => {
    mountAt(
      "/diagnostics/inst-1",
      readerOf({ body: { error: "unauthorized", schemaVersion }, status: 401 }),
    );

    await waitFor(() => stateNode("denied"), "the denied diagnostics state");
    expect(stateNode("empty")).toBeUndefined();
    expect(bodyText()).not.toContain("No diagnostics records");
  });

  it("renders a transport error distinctly from a denied state", async () => {
    mountAt("/diagnostics/inst-1", readerRejecting("socket closed"));

    await waitFor(() => stateNode("error"), "the transport-error diagnostics state");
    expect(bodyText()).toContain("socket closed");
    expect(stateNode("denied")).toBeUndefined();
  });

  it("labels a missing or unknown build identity as missing, never blank", async () => {
    mountAt(
      "/diagnostics/inst-1",
      readerOf({ body: bodyOf({ identity: null, state: "empty" }), status: 200 }),
    );
    await waitFor(() => stateNode("empty"), "the empty state with a null identity");
    expect(bodyText()).toContain("build: missing");

    for (const entry of mounted.splice(0)) {
      entry.handle.dispose();
      entry.container.remove();
    }
    mountAt(
      "/diagnostics/inst-1",
      readerOf({
        body: bodyOf({
          identity: { instanceId: "inst-1", buildId: "unknown" },
          state: "empty",
        }),
        status: 200,
      }),
    );
    await waitFor(() => stateNode("empty"), "the empty state with an unknown build id");
    expect(bodyText()).toContain("build: missing");
  });

  it("shows loading while the reader is in flight, then the command result message", async () => {
    let resolveRead: ((value: ReaderResult) => void) | undefined;
    const inFlight: Reader = async (input) => {
      readerCalls.push(input);
      return new Promise<ReaderResult>((resolve) => {
        resolveRead = resolve;
      });
    };

    mountAt("/diagnostics/inst-1", inFlight);

    await waitFor(() => stateNode("loading"), "the loading diagnostics state");
    expect(readerCalls).toHaveLength(1);
    expect(readerCalls[0]?.signal).toBeInstanceOf(AbortSignal);

    resolveRead?.({ body: bodyOf({ state: "empty" }), status: 200 });

    await waitFor(() => stateNode("empty"), "the result message state");
  });

  it("re-reads through a Command when the refresh control is used", async () => {
    mountAt(
      "/diagnostics/inst-1",
      trackingReader([
        {
          body: bodyOf({ recordCount: 1, records: [record], state: "ok", totalAvailable: 1 }),
          status: 200,
        },
        { body: bodyOf({ state: "empty" }), status: 200 },
      ]),
    );

    await waitFor(() => stateNode("ok"), "the first ok state");
    expect(readerCalls).toHaveLength(1);

    const refresh = await waitFor(
      () =>
        document.querySelector<HTMLButtonElement>('[data-action="refresh-diagnostics"]') ??
        undefined,
      "the refresh diagnostics control",
    );
    refresh.click();

    await waitFor(() => stateNode("empty"), "the refreshed empty state");
    expect(readerCalls).toHaveLength(2);
  });

  it("renders the refresh control and nav links with visible focus styles and the narrow layout classes", async () => {
    mountAt("/diagnostics/inst-1", readerOf({ body: bodyOf({ state: "empty" }), status: 200 }));

    await waitFor(() => stateNode("empty"), "the empty state");

    const panel = document.querySelector('[data-diagnostics-state="empty"]') as HTMLElement;
    expect(panel.className).toContain("w-full");
    expect(panel.className).toContain("sm:p-6");

    const layout = document.querySelector("[data-diagnostics-layout]") as HTMLElement;
    expect(layout.className).toContain("md:grid-cols-2");

    const refresh = document.querySelector<HTMLButtonElement>(
      '[data-action="refresh-diagnostics"]',
    );
    expect(refresh).toBeDefined();
    expect(refresh?.tagName).toBe("BUTTON");
    expect(refresh?.className).toContain("focus-visible:ring-2");
    expect(refresh?.className).toContain("w-full");
    expect(refresh?.disabled).toBe(false);

    const links = Array.from(document.querySelectorAll("nav a"));
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link.getAttribute("href")).toBeTruthy();
      expect((link as HTMLElement).className).toContain("focus-visible:ring-2");
    }
  });

  it("does not apply a resolved read for a previous route id after navigating away", async () => {
    const deferred: Array<{ readonly resolve: (result: ReaderResult) => void }> = [];
    const deferredReader: Reader = (input) => {
      readerCalls.push(input);
      return new Promise<ReaderResult>((resolve) => {
        deferred.push({ resolve });
      });
    };

    mountAt("/diagnostics/a", deferredReader);
    await waitFor(() => stateNode("loading"), "the a loading state");
    expect(readerCalls.map((call) => call.id)).toEqual(["a"]);

    navigateTo("/diagnostics/b");
    await waitFor(() => (readerCalls.length === 2 ? true : undefined), "the b read");
    expect(readerCalls[1]?.id).toBe("b");

    // Resolve the OLD route's read first. The route-id guard must drop it.
    deferred[0]?.resolve({
      body: bodyOf({ recordCount: 1, records: [record], state: "ok", totalAvailable: 1 }),
      status: 200,
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(stateNode("ok")).toBeUndefined();
    expect(bodyText()).not.toContain("queue.retry");
    expect(stateNode("loading")).toBeDefined();

    // The current route's read still applies.
    deferred[1]?.resolve({ body: bodyOf({ state: "empty" }), status: 200 });
    await waitFor(() => stateNode("empty"), "the b empty state");
  });

  it("aborts the Effect-forwarded signal when the shell disposes mid-flight", async () => {
    let forwarded: AbortSignal | undefined;
    let abortedDuringRead = false;
    const blockingReader: Reader = (input) => {
      readerCalls.push(input);
      forwarded = input.signal;
      return new Promise<ReaderResult>((_resolve, reject) => {
        input.signal.addEventListener(
          "abort",
          () => {
            abortedDuringRead = true;
            reject(new Error("reader aborted by dispose"));
          },
          { once: true },
        );
      });
    };

    mountAt("/diagnostics/inst-1", blockingReader);
    await waitFor(() => stateNode("loading"), "the loading state");
    expect(forwarded).toBeDefined();

    // Dispose the shell while the read is still in flight. This is Effect's interruption lifecycle:
    // a fabricated AbortSignal would never abort here.
    const entry = mounted.pop();
    entry?.handle.dispose();
    entry?.container.remove();

    await waitFor(() => (forwarded?.aborted === true ? true : undefined), "the forwarded signal abort");
    expect(abortedDuringRead).toBe(true);
  });

  it("labels a 403 rejection by its HTTP status instead of a generic authorization failure", async () => {
    mountAt(
      "/diagnostics/inst-1",
      readerOf({
        body: { error: "diagnostics_owner_header_forbidden", schemaVersion },
        status: 403,
      }),
    );

    await waitFor(() => stateNode("denied"), "the denied diagnostics state for a 403");
    expect(bodyText()).toContain("Access denied: the server rejected this diagnostics read (HTTP 403).");
    expect(bodyText()).not.toContain("not authorized");
  });

  it("exposes role=status live-region semantics while loading and after settling", async () => {
    let resolveRead: ((value: ReaderResult) => void) | undefined;
    const inFlight: Reader = (input) => {
      readerCalls.push(input);
      return new Promise<ReaderResult>((resolve) => {
        resolveRead = resolve;
      });
    };

    mountAt("/diagnostics/inst-1", inFlight);
    await waitFor(() => stateNode("loading"), "the loading state");
    const loadingStatus = statusParagraph();
    expect(loadingStatus?.getAttribute("role")).toBe("status");
    expect(loadingStatus?.getAttribute("aria-live")).toBe("polite");
    expect(loadingStatus?.getAttribute("aria-busy")).toBe("true");

    resolveRead?.({ body: bodyOf({ state: "empty" }), status: 200 });
    await waitFor(() => stateNode("empty"), "the empty state");
    expect(statusParagraph()?.getAttribute("aria-busy")).toBe("false");
  });
});
