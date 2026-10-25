import { afterEach, describe, expect, it } from "vitest";

import { createDiagnosticsClient } from "../src/diagnostics-client";
import { type DiagnosticsMountOptions, mountWithDiagnostics } from "../src/mount";

/**
 * Run 115 S15f (R21): end-to-end page mount over the REAL diagnostics fetch client.
 *
 * The fetch implementation is injected, so no network runs and no server is started: this proves
 * the shell -> client -> wiring -> page path, NOT a real HTTP exchange. Still unproven here: the
 * host's real authorization/context gate over a socket, CORS/origin behaviour, TLS, timeouts and
 * the deployed asset/entry wiring - those need a live host and are covered (if at all) elsewhere.
 */

interface FetchCall {
  readonly init: RequestInit | undefined;
  readonly url: URL;
}

const stubFetch = (
  result: Response | (() => Promise<Response>),
): { readonly calls: FetchCall[]; readonly fetchImpl: typeof fetch } => {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ init, url: input instanceof URL ? input : new URL(String(input)) });
    return typeof result === "function" ? await result() : result;
  }) as typeof fetch;
  return { calls, fetchImpl };
};

const responseOf = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

const baseBody = (state: string, overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  bounds: {
    limit: 20,
    maxCodeBytes: 512,
    maxIdentityBytes: 256,
    maxRecords: 50,
    maxResponseBytes: 16_384,
  },
  conditions: { dropped: false, stale: false },
  cursor: null,
  identity: { buildId: "build-s15f", instanceId: "inst-s15f" },
  loss: { dropped: 0, windowMs: 0 },
  recordCount: 0,
  records: [],
  schemaVersion: "role-model.local-diagnostics-read.v1",
  staleness: { ageMs: 5_000, ruleMs: 300_000, stale: false },
  state,
  totalAvailable: 0,
  truncated: false,
  ...overrides,
});

const mounted: Array<{ readonly container: HTMLDivElement; readonly handle: { dispose: () => void } }> = [];
const TOKEN = "operator-read-token-0123456789";

const mountAt = (
  path: string,
  fetchImpl: typeof fetch,
  overrides: Partial<DiagnosticsMountOptions> = {},
): void => {
  window.history.replaceState({}, "", path);
  const container = document.createElement("div");
  container.id = "s15g-diagnostics-e2e";
  document.body.append(container);
  const handle = mountWithDiagnostics(container, {
    baseUrl: "http://127.0.0.1:3458",
    fetchImpl,
    token: TOKEN,
    ...overrides,
  });
  mounted.push({ container, handle });
};

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    entry.handle.dispose();
    entry.container.remove();
  }
  window.history.replaceState({}, "", "/");
});

const stateNode = (state: string): Element | undefined =>
  document.querySelector(`[data-diagnostics-state="${state}"]`) ?? undefined;

const bodyText = (): string => document.body.textContent ?? "";

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
    `Timed out waiting for ${label} (last value: ${String(last)}) | body: ${bodyText().slice(0, 500)}`,
  );
};

describe("S15f diagnostics page over the real client", () => {
  it("renders the ok state and its records, and requests the operator diagnostics URL", async () => {
    const stub = stubFetch(
      responseOf(
        baseBody("ok", {
          recordCount: 1,
          records: [{ atMs: 1_700_000_000_000, code: "queue.retry", count: 3, level: "warn" }],
          totalAvailable: 1,
        }),
      ),
    );
    mountAt("/diagnostics/s15f-ok", stub.fetchImpl);

    await waitFor(() => stateNode("ok"), "the ok state");
    expect(bodyText()).toContain("queue.retry");
    await waitFor(() => (stub.calls.length === 1 ? true : undefined), "the fetch call");
    expect(stub.calls[0]?.url.pathname).toBe("/api/role-model/operator/diagnostics");
    expect(stub.calls[0]?.url.search).toBe("");
    expect(new Headers(stub.calls[0]?.init?.headers).get("accept")).toBe("application/json");
  });

  it("renders the empty state", async () => {
    mountAt("/diagnostics/s15f-empty", stubFetch(responseOf(baseBody("empty"))).fetchImpl);
    await waitFor(() => stateNode("empty"), "the empty state");
    expect(bodyText()).toContain("No diagnostics records yet.");
  });

  it("renders the disabled state", async () => {
    mountAt("/diagnostics/s15f-disabled", stubFetch(responseOf(baseBody("disabled"))).fetchImpl);
    await waitFor(() => stateNode("disabled"), "the disabled state");
    expect(bodyText()).toContain("Diagnostics are disabled. This is a state, not an error.");
  });

  it("renders the stale state with the server's exact age and rule", async () => {
    mountAt(
      "/diagnostics/s15f-stale",
      stubFetch(
        responseOf(
          baseBody("stale", {
            conditions: { dropped: false, stale: true },
            staleness: { ageMs: 900_000, ruleMs: 300_000, stale: true },
          }),
        ),
      ).fetchImpl,
    );
    await waitFor(() => stateNode("stale"), "the stale state");
    expect(bodyText()).toContain("Stale: the newest record is 15m old (rule 5m).");
  });

  it("renders the dropped state with the server's exact loss counts", async () => {
    mountAt(
      "/diagnostics/s15f-dropped",
      stubFetch(
        responseOf(
          baseBody("dropped", {
            conditions: { dropped: true, stale: false },
            loss: { dropped: 12, windowMs: 600_000 },
          }),
        ),
      ).fetchImpl,
    );
    await waitFor(() => stateNode("dropped"), "the dropped state");
    expect(bodyText()).toContain("Dropped: 12 record(s) lost in the last 10m.");
  });

  it("renders a 401 denial", async () => {
    mountAt(
      "/diagnostics/s15f-401",
      stubFetch(responseOf({ error: "operator_authentication_required" }, 401)).fetchImpl,
    );
    await waitFor(() => stateNode("denied"), "the 401 denied state");
    expect(bodyText()).toContain("Access denied: this diagnostics read is not authorized (HTTP 401).");
  });

  it("renders a 403 rejection distinctly from a 401 denial", async () => {
    mountAt(
      "/diagnostics/s15f-403",
      stubFetch(responseOf({ error: "diagnostics_owner_header_forbidden" }, 403)).fetchImpl,
    );
    await waitFor(() => stateNode("denied"), "the 403 denied state");
    expect(bodyText()).toContain(
      "Access denied: the server rejected this diagnostics read (HTTP 403).",
    );
    expect(bodyText()).not.toContain("not authorized");
  });

  it("renders a transport failure as the error state", async () => {
    mountAt("/diagnostics/s15f-error", async () => {
      throw new TypeError("Failed to fetch");
    });
    await waitFor(() => stateNode("error"), "the transport error state");
    expect(bodyText()).toContain("Diagnostics read failed");
    expect(bodyText()).toContain("Failed to fetch");
  });

  it("constructs the REAL client with the injected fetchImpl/baseUrl/token and mounts its reader", async () => {
    const stub = stubFetch(
      responseOf(
        baseBody("ok", {
          recordCount: 1,
          records: [{ atMs: 1_700_000_000_000, code: "queue.retry", count: 3, level: "warn" }],
          totalAvailable: 1,
        }),
      ),
    );
    const constructed: Array<{ readonly baseUrl?: string; readonly fetchImpl?: typeof fetch; readonly token?: string }> = [];
    const factory = (options: Parameters<typeof createDiagnosticsClient>[0] = {}) => {
      constructed.push(options);
      return createDiagnosticsClient(options);
    };
    mountAt("/diagnostics/s15g-construction", stub.fetchImpl, { createReader: factory });

    await waitFor(() => stateNode("ok"), "the ok state through the constructed client");
    expect(constructed.length).toBe(1);
    expect(constructed[0]?.fetchImpl).toBe(stub.fetchImpl);
    expect(constructed[0]?.baseUrl).toBe("http://127.0.0.1:3458");
    expect(constructed[0]?.token).toBe(TOKEN);
    expect(bodyText()).toContain("queue.retry");
    expect(new Headers(stub.calls[0]?.init?.headers).get("authorization")).toBe(`Bearer ${TOKEN}`);
  });

  it("mounts the reader instance returned by the client factory", async () => {
    const stub = stubFetch(responseOf(baseBody("ok")));
    const fakeReader = async () => ({ body: baseBody("disabled"), status: 200 });
    mountAt("/diagnostics/s15g-identity", stub.fetchImpl, { createReader: () => fakeReader });

    await waitFor(() => stateNode("disabled"), "the disabled state from the factory's reader");
    expect(bodyText()).toContain("Diagnostics are disabled. This is a state, not an error.");
    expect(stub.calls.length).toBe(0);
  });

  it("turns a token-less same-origin 401 into the explicit trust-precondition error", async () => {
    const stub = stubFetch(responseOf({ error: "operator_authentication_required" }, 401));
    mountAt("/diagnostics/s15g-trust", stub.fetchImpl, { baseUrl: undefined, token: undefined });

    await waitFor(() => stateNode("error"), "the trust-precondition error state");
    expect(bodyText()).toContain("loopback device-owner trust");
    expect(bodyText()).toContain("Bind the runtime to loopback");
  });
});
