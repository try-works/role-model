/**
 * S279 (R12): owner-local in-flight sharing for the readback GET clients.
 *
 * One createReadbackClients owner owns one transport. Concurrent identical GETs inside
 * that owner share one physical fetch while it is in flight; the entry is removed as
 * soon as it settles or its last consumer aborts, so this is NOT a response cache and
 * NOT global across shells. Consumers keep independent cancellation: aborting one
 * waiter rejects only that waiter, and only the last waiter abort aborts the physical
 * fetch. A late settle of an aborted flight cannot remove a replacement entry because
 * the map removal is identity-guarded.
 *
 * The shared fetch reads the response body once and gives every waiter a fresh
 * Response carrying the same raw text/status, so each readback reader parses its own
 * body and no parsed object is shared between consumers.
 *
 * Effect-first rationale: this stays a plain Promise/AbortSignal coordinator at the fetch boundary on
 * purpose. The state is one in-flight waiter set per owner with real AbortSignals around a Response
 * facade; there is no queue, retry policy, cache or domain concurrency to model, the lifecycle is
 * bounded and synchronous, and the module must expose the exact `typeof fetch` facade the readback
 * client already consumes. An Effect Layer here would add a second runtime boundary without removing
 * a real failure mode, so no generic cache/retry framework is introduced.
 *
 * External rejection boundary: the promise handed to this facade is the injected fetch
 * implementation. Fetch and AbortSignal reject with arbitrary values (including falsey values and
 * non-Error reasons), and the consumer must observe that exact reason identity; the transport does
 * not wrap or normalize those values. Its own invariant failures are Error instances. This is the
 * only place the helper holds `unknown` values, and those types are the external boundary, not a
 * domain error model.
 *
 * Reconstruction boundary: only the readback client consumes this facade, always with an exact URL
 * string and its own GET/no-store/accept/authorization init. Request inputs are reduced to their URL
 * for the key; Request-specific headers/method/cache are not merged and no generic fetch semantics
 * are claimed. The reconstructed Response preserves status/statusText/headers/body text only - the
 * readback readers use text/status, not url/type/redirected. Statuses a Response constructor cannot
 * represent (1xx, 0/opaque) fail explicitly instead of hanging; same-origin GETs do not produce them.
 */

export interface ReadbackFlightTransport {
  readonly fetch: typeof fetch;
}

interface Waiter {
  readonly resolve: (response: Response) => void;
  readonly reject: (reason: unknown) => void;
  detach: () => void;
}

interface Flight {
  readonly controller: AbortController;
  readonly key: string;
  readonly waiters: Set<Waiter>;
  closed: boolean;
}

const NULL_BODY_STATUS = new Set([204, 205, 304]);

// AbortSignal.reason is the caller's exact reason. abort() with no argument already produces the
// native AbortError DOMException, and an explicit falsey reason (null/0/false/"") must be delivered
// unchanged, so this boundary never substitutes a new DOMException.
const abortReason = (signal: AbortSignal): unknown => signal.reason;

const requestUrl = (input: RequestInfo | URL): string =>
  input instanceof Request ? input.url : String(input);

const requestKey = (url: string, init?: RequestInit): string => {
  const headers = new Headers(init?.headers);
  return [
    (init?.method ?? "GET").toUpperCase(),
    url,
    init?.cache ?? "",
    headers.get("accept") ?? "",
    headers.get("authorization") ?? "",
  ].join("\u0000");
};

const safeDetach = (waiter: Waiter): void => {
  try {
    waiter.detach();
  } catch {
    // Listener removal is best effort; it must never strand the remaining waiters.
  }
};

const buildResponse = (response: Response, body: string): Response => {
  if (response.status < 200 || response.status > 599) {
    throw new Error(
      "readback transport cannot reconstruct status " + String(response.status),
    );
  }
  return new Response(NULL_BODY_STATUS.has(response.status) ? null : body, {
    headers: new Headers(response.headers),
    status: response.status,
    statusText: response.statusText,
  });
};

export const createReadbackFlightTransport = (inner: typeof fetch): ReadbackFlightTransport => {
  const flights = new Map<string, Flight>();

  const release = (flight: Flight, waiter: Waiter): void => {
    flight.waiters.delete(waiter);
    safeDetach(waiter);
  };

  const removeWaiter = (flight: Flight, waiter: Waiter, reason: unknown): void => {
    release(flight, waiter);
    if (flight.waiters.size === 0 && flights.get(flight.key) === flight && !flight.closed) {
      flight.closed = true;
      flights.delete(flight.key);
      flight.controller.abort(reason);
    }
  };

  const settle = (flight: Flight, settleWaiter: (waiter: Waiter) => void): void => {
    if (flight.closed) return;
    flight.closed = true;
    if (flights.get(flight.key) === flight) flights.delete(flight.key);
    const waiters = [...flight.waiters];
    flight.waiters.clear();
    for (const waiter of waiters) {
      safeDetach(waiter);
      try {
        settleWaiter(waiter);
      } catch (error) {
        waiter.reject(error);
      }
    }
  };

  const fail = (flight: Flight, error: unknown): void =>
    settle(flight, (waiter) => waiter.reject(error));

  const complete = async (flight: Flight, response: Response): Promise<void> => {
    try {
      const body = await response.text();
      if (flight.closed) return;
      const responses = new Map<Waiter, Response>();
      for (const waiter of flight.waiters) {
        try {
          responses.set(waiter, buildResponse(response, body));
        } catch (error) {
          fail(flight, error);
          return;
        }
      }
      settle(flight, (waiter) => {
        const rebuilt = responses.get(waiter);
        if (rebuilt !== undefined) waiter.resolve(rebuilt);
      });
    } catch (error) {
      fail(flight, error);
    }
  };

  const addWaiter = (flight: Flight, signal: AbortSignal | undefined): Promise<Response> =>
    new Promise<Response>((resolve, reject) => {
      if (signal?.aborted === true) {
        reject(abortReason(signal));
        return;
      }
      const waiter: Waiter = {
        detach: () => undefined,
        reject,
        resolve,
      };
      flight.waiters.add(waiter);
      if (signal !== undefined) {
        const onAbort = (): void => {
          const reason = abortReason(signal);
          removeWaiter(flight, waiter, reason);
          reject(reason);
        };
        signal.addEventListener("abort", onAbort, { once: true });
        waiter.detach = () => signal.removeEventListener("abort", onAbort);
      }
    });

  const fetchImpl: typeof fetch = (input, init) => {
    const signal = init?.signal ?? undefined;
    if (signal?.aborted === true) return Promise.reject(abortReason(signal));
    const key = requestKey(requestUrl(input), init);
    const existing = flights.get(key);
    if (existing !== undefined) return addWaiter(existing, signal);

    const flight: Flight = {
      closed: false,
      controller: new AbortController(),
      key,
      waiters: new Set<Waiter>(),
    };
    flights.set(key, flight);
    const first = addWaiter(flight, signal);
    let pending: Promise<Response>;
    try {
      pending = Promise.resolve(inner(input, { ...init, signal: flight.controller.signal }));
    } catch (error) {
      fail(flight, error);
      return first;
    }
    void pending.then(
      (response) => {
        void complete(flight, response).catch((error: unknown) => fail(flight, error));
      },
      (error: unknown) => fail(flight, error),
    );
    return first;
  };

  return { fetch: fetchImpl };
};
