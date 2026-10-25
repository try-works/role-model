import { Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";

import { createDiagnosticsClient, DiagnosticsTrustRequiredError } from "../src/diagnostics-client";
import { diagnosticsRenderText, parseDiagnosticsSnapshot } from "../src/diagnostics";

/**
 * Run 115 S15e/S15g (R21 client half): the diagnostics page's real request path, proven against a
 * fetch stub (no server).
 *
 * The host authorizes this route through authorizeOperatorRequest: loopback device-owner trust
 * (bind host + socket peer) OR "Authorization: Bearer <operator read credential>" compared
 * timing-safe. Headers that CLAIM the trust decision are rejected 403 by the server, so the client
 * never sends them.
 *
 * S15g adds: an in-flight abort proof (stub settles ONLY on abort, under Effect.timeout), a
 * token-less refusal for non-loopback/non-same-origin base URLs, and a typed error when a
 * token-less same-origin read is refused 401 (host 0.0.0.0 / trust off).
 */

const TOKEN = "operator-read-token-0123456789";

interface FetchCall {
  readonly init: RequestInit | undefined;
  readonly url: URL;
}

const stubFetch = (
  response: Response | (() => Promise<Response>),
): { readonly calls: FetchCall[]; readonly fetchImpl: typeof fetch } => {
  const calls: FetchCall[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ init, url: input instanceof URL ? input : new URL(String(input)) });
    return typeof response === "function" ? await response() : response;
  }) as typeof fetch;
  return { calls, fetchImpl };
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });

const bodyOf = (state: string): Record<string, unknown> => ({
  identity: { buildId: "build-s15e", instanceId: "inst-s15e" },
  recordCount: 0,
  records: [],
  state,
});

const readerFor = (fetchImpl: typeof fetch, token: string = TOKEN) =>
  createDiagnosticsClient({
    baseUrl: "http://127.0.0.1:3458",
    fetchImpl,
    token,
  });

const input = { id: "route-s15e", signal: new AbortController().signal };

describe("S15e diagnostics fetch client", () => {
  it("builds the operator diagnostics URL and sends the expected bearer credential", async () => {
    const stub = stubFetch(jsonResponse(bodyOf("ok")));
    const result = await readerFor(stub.fetchImpl)(input);

    expect(stub.calls.length).toBe(1);
    const call = stub.calls[0];
    expect(call?.url.toString()).toBe(
      "http://127.0.0.1:3458/api/role-model/operator/diagnostics",
    );
    expect(call?.init?.method).toBe("GET");
    const headers = new Headers(call?.init?.headers);
    expect(headers.get("accept")).toBe("application/json");
    expect(headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(result.status).toBe(200);
    expect(result.body).toEqual(bodyOf("ok"));
  });

  it("sends no credential header and no spoofable owner/operator-context headers", async () => {
    const stub = stubFetch(jsonResponse(bodyOf("disabled")));
    // Same-origin default (no explicit baseUrl) and no token: allowed by the precondition.
    const reader = createDiagnosticsClient({ fetchImpl: stub.fetchImpl });
    await reader(input);

    expect(stub.calls[0]?.url.origin).toBe(window.location.origin);
    expect(stub.calls[0]?.url.pathname).toBe("/api/role-model/operator/diagnostics");
    const headers = new Headers(stub.calls[0]?.init?.headers);
    expect(headers.get("authorization")).toBeNull();
    for (const forbidden of [
      "x-role-model-device-owner",
      "x-role-model-owner",
      "x-role-model-trusted-peer",
      "x-role-model-channel",
      "x-role-model-scope",
      "x-role-model-authorization-epoch",
      "x-role-model-capability",
    ]) {
      expect(headers.has(forbidden)).toBe(false);
    }
  });

  it("passes every 200 state through unchanged", async () => {
    for (const state of ["ok", "empty", "disabled", "stale", "dropped"]) {
      const body = bodyOf(state);
      const stub = stubFetch(jsonResponse(body));
      const result = await readerFor(stub.fetchImpl)(input);
      expect(result.status).toBe(200);
      expect(result.body).toEqual(body);
      const snapshot = parseDiagnosticsSnapshot("route-s15e", result);
      expect(snapshot.status).toBe(state);
    }
  });

  it("distinguishes a 401 denial from a 403 rejection", async () => {
    const denied = await readerFor(
      stubFetch(jsonResponse({ error: "operator_authentication_required" }, 401)).fetchImpl,
    )(input);
    expect(denied.status).toBe(401);
    const deniedSnapshot = parseDiagnosticsSnapshot("route-s15e", denied);
    expect(deniedSnapshot.status).toBe("denied");
    expect(deniedSnapshot.httpStatus).toBe(401);
    expect(diagnosticsRenderText(deniedSnapshot)).toContain("not authorized (HTTP 401)");

    const rejected = await readerFor(
      stubFetch(jsonResponse({ error: "diagnostics_owner_header_forbidden" }, 403)).fetchImpl,
    )(input);
    expect(rejected.status).toBe(403);
    const rejectedSnapshot = parseDiagnosticsSnapshot("route-s15e", rejected);
    expect(rejectedSnapshot.status).toBe("denied");
    expect(rejectedSnapshot.httpStatus).toBe(403);
    expect(diagnosticsRenderText(rejectedSnapshot)).toContain(
      "the server rejected this diagnostics read (HTTP 403)",
    );
  });

  it("turns a token-less 401 into an explicit trust precondition failure", async () => {
    const stub = stubFetch(jsonResponse({ error: "operator_authentication_required" }, 401));
    const failure = await createDiagnosticsClient({ fetchImpl: stub.fetchImpl })(input).catch(
      (error: unknown) => error,
    );
    expect(failure).toBeInstanceOf(DiagnosticsTrustRequiredError);
    expect((failure as Error).message).toContain("loopback device-owner trust");
    expect((failure as Error).message).toContain("Bind the runtime to loopback");
  });

  it("refuses a token-less read for a non-loopback or non-same-origin base URL", () => {
    // Non-loopback base, no token.
    expect(() =>
      createDiagnosticsClient({ baseUrl: "https://diagnostics.example.com", fetchImpl: stubFetch(jsonResponse({})).fetchImpl }),
    ).toThrow(/refuses a token-less read/u);
    // Loopback base but not the page origin (cross-origin in browser terms), no token.
    expect(() =>
      createDiagnosticsClient({ baseUrl: "http://127.0.0.1:3458", fetchImpl: stubFetch(jsonResponse({})).fetchImpl }),
    ).toThrow(/non-same-origin/u);
    // Same origin + no token is allowed (loopback page assumption).
    expect(() => createDiagnosticsClient({ fetchImpl: stubFetch(jsonResponse({})).fetchImpl })).not.toThrow();
  });

  it("surfaces a transport rejection and a non-JSON 200 body as failures", async () => {
    const transport = await readerFor(async () => {
      throw new TypeError("Failed to fetch");
    })(input).catch((error: unknown) => error);
    expect(transport).toBeInstanceOf(TypeError);
    expect((transport as TypeError).message).toBe("Failed to fetch");

    const invalid = await readerFor(stubFetch(new Response("not-json", { status: 200 })).fetchImpl)(
      input,
    ).catch((error: unknown) => error);
    expect(invalid).toBeInstanceOf(Error);
    expect((invalid as Error).message).toContain("non-JSON");
  });

  it("forwards the caller AbortSignal into the fetch call and aborts an IN-FLIGHT fetch", async () => {
    const resolvedStub = stubFetch(jsonResponse(bodyOf("ok")));
    const controller = new AbortController();
    await readerFor(resolvedStub.fetchImpl)({ id: "route-s15e", signal: controller.signal });
    const observed = resolvedStub.calls[0]?.init?.signal;
    expect(observed).toBe(controller.signal);
    controller.abort();
    expect(observed?.aborted).toBe(true);

    // In-flight proof: the stub settles ONLY on abort; Effect.timeout interrupts the fiber, which
    // must abort the fetch (a signal passed but not tied to the fetch lifecycle fails here).
    const state = { aborted: false, calls: 0, signal: undefined as AbortSignal | undefined };
    const stalledFetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      state.calls += 1;
      state.signal = init?.signal ?? undefined;
      return await new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          state.aborted = true;
          reject(new DOMException("aborted", "AbortError"));
        });
      });
    }) as typeof fetch;

    const exit = await Effect.runPromiseExit(
      Effect.timeout(
        Effect.tryPromise({
          try: (signal) => readerFor(stalledFetch)({ id: "route-s15e", signal }),
          catch: (error) => error,
        }),
        "30 millis",
      ),
    );
    expect(Exit.isFailure(exit)).toBe(true);
    expect(state.calls).toBe(1);
    expect(state.signal?.aborted).toBe(true);
    expect(state.aborted).toBe(true);
  });
});
