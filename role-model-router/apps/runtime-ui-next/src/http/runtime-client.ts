import { Option, Schema } from "effect";

/**
 * Workspace W1a (S488): one typed application HTTP client.
 *
 * This is the bounded shared-client seam: base URL, operator bearer token, per-request
 * AbortSignal, JSON decode and a typed HTTP error live here. Only the local-policy save path
 * is migrated in W1a; other feature clients stay untouched until their own bounded slice.
 */
export interface RuntimeHttpClientOptions {
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
  readonly token?: string;
  readonly tokenProvider?: () => string | undefined;
}

export type RuntimeHttpMethod = "GET" | "PUT" | "POST" | "PATCH" | "DELETE";

export type RuntimeJson =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: RuntimeJson }
  | readonly RuntimeJson[];

export interface RuntimeHttpRequest<Body = RuntimeJson> {
  readonly method: RuntimeHttpMethod;
  readonly path: string;
  readonly body?: Body;
  readonly signal?: AbortSignal;
}

export class RuntimeHttpError extends Error {
  readonly status: number;
  readonly body: RuntimeJson | undefined;

  constructor(status: number, message: string, body: RuntimeJson | undefined) {
    super(message);
    this.name = "RuntimeHttpError";
    this.status = status;
    this.body = body;
  }
}

export interface RuntimeHttpClient {
  readonly request: <T, Body = RuntimeJson>(request: RuntimeHttpRequest<Body>) => Promise<T>;
}

const ErrorBodySchema = Schema.Struct({ error: Schema.optional(Schema.String) });

const errorTextFromBody = (body: RuntimeJson | undefined, status: number): string => {
  const decoded = Schema.decodeUnknownOption(ErrorBodySchema)(body);
  if (
    Option.isSome(decoded) &&
    decoded.value.error !== undefined &&
    decoded.value.error.length > 0
  ) {
    return decoded.value.error;
  }
  return `runtime request failed with status ${String(status)}`;
};

export const createRuntimeHttpClient = (
  options: RuntimeHttpClientOptions = {},
): RuntimeHttpClient => {
  const baseUrl = options.baseUrl ?? "";
  return {
    request: async <T, Body = RuntimeJson>(request: RuntimeHttpRequest<Body>): Promise<T> => {
      const headers = new Headers({ accept: "application/json" });
      const resolvedToken = options.tokenProvider?.() ?? options.token;
      if (resolvedToken !== undefined && resolvedToken.length > 0) {
        headers.set("authorization", `Bearer ${resolvedToken}`);
      }
      const init: RequestInit = { method: request.method, headers };
      if (request.body !== undefined) {
        headers.set("content-type", "application/json");
        init.body = JSON.stringify(request.body);
      }
      if (request.signal !== undefined) init.signal = request.signal;
      const fetchImpl = options.fetchImpl ?? fetch;
      const response = await fetchImpl(baseUrl + request.path, init);
      const text = await response.text();
      let body: RuntimeJson | undefined;
      if (text.length > 0) {
        try {
          body = JSON.parse(text);
        } catch {
          throw new RuntimeHttpError(response.status, "runtime response was not JSON", text);
        }
      }
      if (!response.ok) {
        throw new RuntimeHttpError(response.status, errorTextFromBody(body, response.status), body);
      }
      // SAFETY: this generic endpoint's caller owns the contract for the decoded JSON body; the
      // client itself only guarantees JSON/status semantics, not a domain schema.
      return body as T;
    },
  };
};
