import {
  type Header,
  type RequestTrace,
  type TraceDifference,
  type TraceDifferenceCode,
  compareRequestTraces,
} from "../../../packages/ui-parity/src/compare";
import { fetchObservabilitySnapshot } from "../../runtime-ui/app/lib/runtime-api";
import { DIAGNOSTICS_CLIENT_PATH, createDiagnosticsClient } from "../src/diagnostics-client";

export { DIAGNOSTICS_CLIENT_PATH };
/** Independent expected path: a client-constant mutation must not move the contract. */
export const DIAGNOSTICS_CONTRACT_PATH = "/api/role-model/operator/diagnostics";

/**
 * S25d (R12/R14): one-route request-inventory comparator.
 *
 * Capture surface: method, path, query pairs, body, headers, multiplicity and response status.
 * NOT covered: streams/SSE, redirect following, retries, cookies, CORS/preflight, TLS, and the
 * server's wire body/authorization internals.
 *
 * Diagnostics: the legacy React client has NO diagnostics route/request (the endpoint and page
 * were introduced in run115), so its capture is explicitly empty. The new client is compared to
 * the declared contract; the legacy-vs-new extra event is classified intended, not normalized.
 *
 * Two-sided pair: the new client has no observability-snapshot equivalent, so the legacy
 * observability request is compared to the declared contract. That reveals a genuine header
 * difference: legacy sends no Accept header, the declared contract requires it.
 */

export type ClientKind = "legacy" | "next";

export interface RequestCapture {
  readonly client: ClientKind;
  readonly requests: readonly RequestTrace[];
}

export interface CaptureNextOptions {
  readonly fetchImpl: typeof fetch;
  readonly token?: string;
  readonly baseUrl?: string;
  readonly reads?: number;
  /** Test-only capture mutation; the production request inventory is captured first. */
  readonly mutateRequest?: (trace: RequestTrace, index: number) => RequestTrace;
}

export const DIAGNOSTICS_CONTRACT_STEP = "diagnostics-read";
export const OBSERVABILITY_CONTRACT_STEP = "observability-snapshot";
export const OBSERVABILITY_PATH = "/api/role-model/operator/observability-snapshot";

const TEST_BASE_URL = "http://127.0.0.1:3458";

const header = (name: string, value: string): Header => ({ name, value });

const headersOf = (init: RequestInit | undefined): readonly Header[] => {
  const headers = new Headers(init?.headers);
  return Array.from(headers.entries())
    .map(([name, value]) => header(name.toLowerCase(), value))
    .sort((left, right) => left.name.localeCompare(right.name));
};

const traceOf = (
  step: string,
  url: string,
  init: RequestInit | undefined,
  status: number,
): RequestTrace => {
  const parsed = new URL(url, TEST_BASE_URL);
  return {
    body: typeof init?.body === "string" ? init.body : null,
    dependency: null,
    error: null,
    headers: headersOf(init),
    kind: "read",
    method: init?.method ?? "GET",
    path: parsed.pathname,
    query: Array.from(parsed.searchParams.entries()),
    requestId: null,
    status,
    step,
    terminalStream: "completed",
  };
};

export const diagnosticsContract = (
  options: {
    readonly token?: string;
    readonly status?: number;
  } = {},
): RequestTrace => ({
  body: null,
  dependency: null,
  error: null,
  headers: [
    header("accept", "application/json"),
    ...(options.token === undefined ? [] : [header("authorization", `Bearer ${options.token}`)]),
  ],
  kind: "read",
  method: "GET",
  path: DIAGNOSTICS_CONTRACT_PATH,
  query: [],
  requestId: null,
  status: options.status ?? 200,
  step: DIAGNOSTICS_CONTRACT_STEP,
  terminalStream: "completed",
});

/** Empty by evidence: apps/runtime-ui has no diagnostics route or endpoint reference. */
export const captureLegacyDiagnostics = (): RequestCapture => ({
  client: "legacy",
  requests: [],
});

export const captureNextDiagnostics = async (
  options: CaptureNextOptions,
): Promise<RequestCapture> => {
  const captured: RequestTrace[] = [];
  const fetchImpl: typeof fetch = async (input, init = {}) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const response = await options.fetchImpl(input, init);
    captured.push(traceOf(DIAGNOSTICS_CONTRACT_STEP, url, init, response.status));
    return response;
  };
  const reader = createDiagnosticsClient({
    fetchImpl,
    ...(options.baseUrl === undefined ? {} : { baseUrl: options.baseUrl }),
    ...(options.token === undefined ? {} : { token: options.token }),
  });
  for (let index = 0; index < (options.reads ?? 1); index += 1) {
    await reader({ id: "s25d", signal: new AbortController().signal });
  }
  return {
    client: "next",
    requests: captured.map((trace, index) =>
      options.mutateRequest === undefined ? trace : options.mutateRequest(trace, index),
    ),
  };
};

export type DifferenceClassification = "intended" | "defect";

export interface ClassifiedDifference {
  readonly code: TraceDifferenceCode;
  readonly field: string;
  readonly classification: DifferenceClassification;
  readonly detail: string;
}

const FIELD_BY_CODE: Readonly<Record<TraceDifferenceCode, string>> = {
  auth_header_mismatch: "authorization header",
  body_mismatch: "body",
  causal_order_mismatch: "causal order",
  dependency_mismatch: "dependency",
  error_mismatch: "error",
  extra_event: "multiplicity (extra request)",
  header_mismatch: "headers",
  kind_mismatch: "request kind",
  method_mismatch: "method",
  missing_event: "multiplicity (missing request)",
  path_mismatch: "path",
  query_mismatch: "query",
  status_mismatch: "status",
  terminal_stream_mismatch: "stream terminal",
};

const defect = (difference: TraceDifference): ClassifiedDifference => ({
  classification: "defect",
  code: difference.code,
  detail: "request inventory does not match the declared contract",
  field: FIELD_BY_CODE[difference.code],
});

const classifyLegacyExtra = (difference: TraceDifference): ClassifiedDifference => {
  if (difference.code === "extra_event") {
    return {
      classification: "intended",
      code: difference.code,
      detail: "legacy runtime-ui has no diagnostics route/request; the run115 client adds one",
      field: FIELD_BY_CODE[difference.code],
    };
  }
  return defect(difference);
};

export interface DiagnosticsParityResult {
  readonly contractDiff: readonly TraceDifference[];
  readonly differences: readonly ClassifiedDifference[];
  readonly passed: boolean;
}

/** Contract diffs are defects; only the legacy-had-no-request extra event is intended. */
export const compareDiagnosticsRequestParity = (
  legacy: RequestCapture,
  next: RequestCapture,
  expected: RequestTrace = diagnosticsContract(),
): DiagnosticsParityResult => {
  const contractDiff = compareRequestTraces([expected], next.requests);
  const legacyDiff = compareRequestTraces(legacy.requests, next.requests);
  const differences = [...contractDiff.map(defect), ...legacyDiff.map(classifyLegacyExtra)];
  return {
    contractDiff,
    differences,
    passed:
      contractDiff.length === 0 && differences.every((item) => item.classification === "intended"),
  };
};

export const observabilityContract = (options: { readonly token?: string } = {}): RequestTrace => ({
  body: null,
  dependency: null,
  error: null,
  headers: [
    header("accept", "application/json"),
    ...(options.token === undefined ? [] : [header("authorization", `Bearer ${options.token}`)]),
  ],
  kind: "read",
  method: "GET",
  path: OBSERVABILITY_PATH,
  query: [],
  requestId: null,
  status: 200,
  step: OBSERVABILITY_CONTRACT_STEP,
  terminalStream: "completed",
});

export const captureLegacyObservability = async (
  options: { readonly token?: string } = {},
): Promise<RequestCapture> => {
  const captured: RequestTrace[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const response = new Response(
      JSON.stringify({
        metrics: { "router.decisions": { count: 3, incremental: false } },
        schemaVersion: "role-model.observability-snapshot.v1",
      }),
      { headers: { "content-type": "application/json" }, status: 200 },
    );
    captured.push(traceOf(OBSERVABILITY_CONTRACT_STEP, url, init, response.status));
    return response;
  };
  await fetchObservabilitySnapshot(fetcher, options.token);
  return { client: "legacy", requests: captured };
};

export interface TwoSidedParityResult {
  /** False on any divergence, including an intended one. */
  readonly passed: boolean;
  /** True when every divergence is classified intended (no defect). */
  readonly accepted: boolean;
  readonly actual: RequestCapture;
  readonly differences: readonly ClassifiedDifference[];
  readonly expected: RequestTrace;
}

/**
 * Legacy observability vs the declared contract. There is no new-client equivalent. The missing
 * accept header is a genuine, intended divergence in the legacy client, not a normalization: the
 * comparator names the header field and keeps the row in the table.
 */
export const compareLegacyObservabilityToContract = (
  actual: RequestCapture,
  expected: RequestTrace = observabilityContract(),
): TwoSidedParityResult => {
  const differences = compareRequestTraces([expected], actual.requests).map((difference) => {
    if (
      difference.code === "header_mismatch" &&
      actual.requests[0]?.headers.every((item) => item.name !== "accept")
    ) {
      return {
        classification: "intended" as const,
        code: difference.code,
        detail:
          "legacy sends no Accept header; the declared contract requires accept: application/json. The host returns JSON regardless; no new-client equivalent exists.",
        field: FIELD_BY_CODE[difference.code],
      };
    }
    return defect(difference);
  });
  return {
    accepted: differences.every((item) => item.classification === "intended"),
    actual,
    differences,
    expected,
    passed: differences.length === 0,
  };
};
