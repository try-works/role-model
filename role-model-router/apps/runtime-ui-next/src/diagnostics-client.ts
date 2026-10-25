import type { DiagnosticsReadResult, DiagnosticsReader } from "./diagnostics";

/**
 * Run 115 S15e/S15g (R21 client half): the fetch-based diagnostics reader the page lacked.
 *
 * SAME-ORIGIN CLAIM (demoted, not proven): the client ASSUMES the page and the diagnostics API are
 * served from the same origin; it does not and cannot prove that the host it reaches is the host
 * that served the page. With an explicit baseUrl it enforces only what it can: a token-less read is
 * refused unless the base origin is loopback AND equals the page origin (see the precondition
 * below). CORS/preflight behaviour, TLS and the host's socket-peer trust are NOT exercised by this
 * module or its tests - they remain unproven without a live host.
 *
 * If the page were served from another origin with a token: the host would need CORS for GET + the
 * authorization header from that origin, and the token would have to be provisioned to the page
 * (never baked into public assets).
 *
 * TOKEN-LESS PRECONDITION (explicit): a token-less read is only meaningful when the request reaches
 * the host from a loopback socket AND device-owner trust is on (the runtime binds 127.0.0.1/::1/
 * localhost and does not disable trust). If the runtime binds 0.0.0.0 or trust is off, a token-less
 * same-origin read returns 401. The client turns that specific case into DiagnosticsTrustRequiredError
 * so the failure names the precondition instead of an opaque "Access denied".
 *
 * CREDENTIAL SHAPE (matched to the host's authorizeOperatorRequest, not guessed):
 * - loopback device-owner trust (bind host + socket peer loopback) OR
 *   "Authorization: Bearer <operator read credential>" compared timing-safe (sha256 digests).
 * - the bearer is sent ONLY when the embedder supplies a token; otherwise no authorization header.
 * - the client never sends headers that CLAIM a trust decision (x-role-model-device-owner,
 *   x-role-model-owner, x-role-model-trusted-peer are rejected 403), and sends no operator context
 *   headers (the host applies its configured context to a header-less same-origin request).
 *
 * STATUS MAPPING: raw { status, body } so parseDiagnosticsSnapshot keeps the page's view model. 200
 * bodies (ok/empty/disabled/stale/dropped) pass through unchanged; 401 with a token stays 401 (page
 * denied) while a token-less 401 becomes DiagnosticsTrustRequiredError; 403 stays 403 (page denied);
 * a transport rejection propagates; a non-JSON 2xx body is a protocol failure and is thrown.
 */

export const DIAGNOSTICS_CLIENT_PATH = "/api/role-model/operator/diagnostics";

export interface DiagnosticsClientOptions {
  /** Absolute origin override; defaults to window.location.origin (same-origin deployment). */
  readonly baseUrl?: string;
  /** Optional operator read credential; sent as Authorization: Bearer. */
  readonly token?: string;
  readonly fetchImpl?: typeof fetch;
}

/** Never sent: the host rejects these 403 rather than trusting them. */
export const DIAGNOSTICS_FORBIDDEN_OWNER_HEADERS = [
  "x-role-model-device-owner",
  "x-role-model-owner",
  "x-role-model-trusted-peer",
] as const;

/** A token-less read reached the host and was refused: loopback device-owner trust is unavailable. */
export class DiagnosticsTrustRequiredError extends Error {
  readonly _tag = "DiagnosticsTrustRequiredError";
  constructor() {
    super(
      "diagnostics read was refused 401 without a credential: token-less reads require loopback device-owner trust (host bound to loopback and trust enabled). Bind the runtime to loopback or configure an operator read token.",
    );
    this.name = "DiagnosticsTrustRequiredError";
  }
}

const LOOPBACK_DIAGNOSTICS_HOSTS = new Set(["127.0.0.1", "::1", "[::1]", "localhost"]);

export const isLoopbackDiagnosticsHost = (hostname: string): boolean =>
  LOOPBACK_DIAGNOSTICS_HOSTS.has(hostname.toLowerCase());

const readPageOrigin = (): string | undefined => {
  const origin = globalThis.location?.origin;
  return origin === undefined || origin.length === 0 ? undefined : origin;
};

const resolveBaseUrl = (baseUrl: string | undefined): string => {
  if (baseUrl !== undefined && baseUrl.length > 0) {
    return baseUrl;
  }
  const origin = readPageOrigin();
  if (origin === undefined) {
    throw new Error("diagnostics client needs a base URL outside a browser origin");
  }
  return origin;
};

const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (text.trim().length === 0) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("diagnostics read returned a non-JSON body");
  }
};

export const createDiagnosticsClient = (
  options: DiagnosticsClientOptions = {},
): DiagnosticsReader => {
  const fetchImpl = options.fetchImpl ?? fetch;
  const base = resolveBaseUrl(options.baseUrl);
  const baseUrl = new URL(base);
  const token =
    options.token === undefined || options.token.trim().length === 0 ? undefined : options.token;
  const pageOrigin = readPageOrigin();
  const explicitBase = options.baseUrl !== undefined && options.baseUrl.length > 0;
  const loopbackBase = isLoopbackDiagnosticsHost(baseUrl.hostname);
  const sameOriginAsPage = pageOrigin === undefined || baseUrl.origin === pageOrigin;

  // S15g fix 3: refuse a token-less read that cannot rely on device-owner trust. This is a client
  // contract, not a server check: it stops the opaque cross-origin/no-trust 401 before the request.
  if (token === undefined && (!loopbackBase || (explicitBase && !sameOriginAsPage))) {
    throw new Error(
      "diagnostics client refuses a token-less read for a non-loopback or non-same-origin base URL: device-owner trust is decided by the host's socket peer (loopback), so this request could only fail with an opaque 401. Configure an operator read token, or serve the page and API from loopback same-origin.",
    );
  }

  const url = new URL(DIAGNOSTICS_CLIENT_PATH, baseUrl);
  const authorization = token === undefined ? undefined : `Bearer ${token}`;
  return async (input) => {
    const headers: Record<string, string> = { accept: "application/json" };
    if (authorization !== undefined) {
      headers.authorization = authorization;
    }
    const response = await fetchImpl(url.toString(), {
      cache: "no-store",
      headers,
      method: "GET",
      signal: input.signal,
    });
    if (response.status === 401 && token === undefined) {
      // S15g fix 4: the token-less precondition was false (host 0.0.0.0 or trust off). Name it.
      throw new DiagnosticsTrustRequiredError();
    }
    const body: DiagnosticsReadResult["body"] = await readBody(response);
    return { body, status: response.status };
  };
};

/** The default reader for a same-origin page embed; tests inject their own reader. */
export const diagnosticsClient: DiagnosticsReader = createDiagnosticsClient();
