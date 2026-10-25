import { describe, expect, it } from "vitest";

import {
  DIAGNOSTICS_CONTRACT_PATH,
  OBSERVABILITY_PATH,
  captureLegacyDiagnostics,
  captureLegacyObservability,
  captureNextDiagnostics,
  compareDiagnosticsRequestParity,
  compareLegacyObservabilityToContract,
  diagnosticsContract,
  observabilityContract,
} from "./s25d-diagnostics-request-parity";

const fetchOk = async () =>
  new Response(JSON.stringify({ state: "disabled", records: [] }), {
    headers: { "content-type": "application/json" },
    status: 200,
  });

const codes = (differences: readonly { readonly code: string }[]): readonly string[] =>
  differences.map((item) => item.code);

describe("S25d diagnostics request-inventory parity", () => {
  it("captures the new client's method/path/query/body/headers/multiplicity/status and matches the contract", async () => {
    const legacy = captureLegacyDiagnostics();
    const next = await captureNextDiagnostics({ fetchImpl: fetchOk });
    expect(next.requests).toHaveLength(1);
    expect(next.requests[0]).toMatchObject({
      body: null,
      headers: [{ name: "accept", value: "application/json" }],
      method: "GET",
      path: DIAGNOSTICS_CONTRACT_PATH,
      query: [],
      status: 200,
      step: "diagnostics-read",
    });
    const result = compareDiagnosticsRequestParity(legacy, next);
    expect(result.contractDiff).toEqual([]);
    expect(result.differences).toEqual([
      {
        classification: "intended",
        code: "extra_event",
        detail: "legacy runtime-ui has no diagnostics route/request; the run115 client adds one",
        field: "multiplicity (extra request)",
      },
    ]);
    expect(result.passed).toBe(true);
  });

  it("captures the optional authorization header and compares it semantically", async () => {
    const next = await captureNextDiagnostics({ fetchImpl: fetchOk, token: "s25d-token" });
    expect(next.requests[0]?.headers).toContainEqual({
      name: "authorization",
      value: "Bearer s25d-token",
    });
    const result = compareDiagnosticsRequestParity(
      captureLegacyDiagnostics(),
      next,
      diagnosticsContract({ token: "s25d-token" }),
    );
    expect(result.contractDiff).toEqual([]);
    expect(result.differences[0]?.classification).toBe("intended");
  });

  it("captures a non-200 response status and compares it", async () => {
    const next = await captureNextDiagnostics({
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: "forbidden" }), {
          headers: { "content-type": "application/json" },
          status: 403,
        }),
    });
    expect(next.requests[0]?.status).toBe(403);
    const result = compareDiagnosticsRequestParity(
      captureLegacyDiagnostics(),
      next,
      diagnosticsContract({ status: 403 }),
    );
    expect(result.contractDiff).toEqual([]);
  });

  it("names method when the new request method changes", async () => {
    const result = compareDiagnosticsRequestParity(
      captureLegacyDiagnostics(),
      await captureNextDiagnostics({
        fetchImpl: fetchOk,
        mutateRequest: (trace) => ({ ...trace, method: "POST" }),
      }),
    );
    expect(codes(result.contractDiff)).toEqual(["method_mismatch"]);
    expect(result.differences[0]?.field).toBe("method");
    expect(result.passed).toBe(false);
  });

  it("names path when the new request path changes", async () => {
    const result = compareDiagnosticsRequestParity(
      captureLegacyDiagnostics(),
      await captureNextDiagnostics({
        fetchImpl: fetchOk,
        mutateRequest: (trace) => ({ ...trace, path: `${DIAGNOSTICS_CONTRACT_PATH}/extra` }),
      }),
    );
    expect(codes(result.contractDiff)).toEqual(["path_mismatch"]);
    expect(result.differences[0]?.field).toBe("path");
  });

  it("names headers when the new request drops Accept", async () => {
    const result = compareDiagnosticsRequestParity(
      captureLegacyDiagnostics(),
      await captureNextDiagnostics({
        fetchImpl: fetchOk,
        mutateRequest: (trace) => ({
          ...trace,
          headers: trace.headers.filter((item) => item.name !== "accept"),
        }),
      }),
    );
    expect(codes(result.contractDiff)).toEqual(["header_mismatch"]);
    expect(result.differences[0]?.field).toBe("headers");
  });

  it("names multiplicity when the new client issues a second read", async () => {
    const result = compareDiagnosticsRequestParity(
      captureLegacyDiagnostics(),
      await captureNextDiagnostics({ fetchImpl: fetchOk, reads: 2 }),
    );
    expect(codes(result.contractDiff)).toEqual(["extra_event"]);
    expect(result.differences[0]?.field).toBe("multiplicity (extra request)");
  });

  it("names query, body and status mutations too", async () => {
    const query = compareDiagnosticsRequestParity(
      captureLegacyDiagnostics(),
      await captureNextDiagnostics({
        fetchImpl: fetchOk,
        mutateRequest: (trace) => ({ ...trace, query: [["limit", "1"]] }),
      }),
    );
    expect(codes(query.contractDiff)).toEqual(["query_mismatch"]);
    const body = compareDiagnosticsRequestParity(
      captureLegacyDiagnostics(),
      await captureNextDiagnostics({
        fetchImpl: fetchOk,
        mutateRequest: (trace) => ({ ...trace, body: "unexpected" }),
      }),
    );
    expect(codes(body.contractDiff)).toEqual(["body_mismatch"]);
    const status = compareDiagnosticsRequestParity(
      captureLegacyDiagnostics(),
      await captureNextDiagnostics({
        fetchImpl: fetchOk,
        mutateRequest: (trace) => ({ ...trace, status: 500 }),
      }),
    );
    expect(codes(status.contractDiff)).toEqual(["status_mismatch"]);
  });
});

describe("S25d two-sided observability capture", () => {
  it("captures the real legacy observability request and detects its missing Accept header", async () => {
    const legacy = await captureLegacyObservability();
    expect(legacy.requests).toHaveLength(1);
    expect(legacy.requests[0]).toMatchObject({
      body: null,
      headers: [],
      method: "GET",
      path: OBSERVABILITY_PATH,
      query: [],
      status: 200,
    });
    const result = compareLegacyObservabilityToContract(legacy, observabilityContract());
    // The real divergence fails strict equality but is accepted after classification.
    expect(result.passed).toBe(false);
    expect(result.accepted).toBe(true);
    expect(result.differences).toHaveLength(1);
    expect(result.differences[0]).toMatchObject({
      classification: "intended",
      code: "header_mismatch",
      field: "headers",
    });
    // Genuine divergence, not a synthetic mutation: declared contract says accept, legacy sends none.
    expect(legacy.requests[0]?.headers).not.toContainEqual({
      name: "accept",
      value: "application/json",
    });
  });

  it("keeps the legacy bearer header while still reporting the Accept divergence", async () => {
    const legacy = await captureLegacyObservability({ token: "s25d-token" });
    expect(legacy.requests[0]?.headers).toContainEqual({
      name: "authorization",
      value: "Bearer s25d-token",
    });
    const result = compareLegacyObservabilityToContract(
      legacy,
      observabilityContract({ token: "s25d-token" }),
    );
    expect(codes(result.differences)).toEqual(["header_mismatch"]);
    expect(result.differences[0]?.field).toBe("headers");
  });
});
