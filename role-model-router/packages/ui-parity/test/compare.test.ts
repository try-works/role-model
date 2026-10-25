import { describe, expect, it } from "vitest";

import { type RequestTrace, compareRequestTraces } from "../src/index.js";

function trace(overrides: Partial<RequestTrace> = {}): RequestTrace {
  return {
    requestId: "req-volatile-default",
    step: "read-config",
    kind: "read",
    method: "GET",
    path: "/api/config",
    query: [],
    headers: [],
    body: null,
    status: 200,
    terminalStream: "completed",
    error: null,
    dependency: null,
    ...overrides,
  };
}

describe("compareRequestTraces", () => {
  it("rejects equal captures with an undeclared dependency", () => {
    const write = trace({ step: "write", kind: "mutation", dependency: "ghost" });
    expect(compareRequestTraces([write], [write]).length).toBeGreaterThan(0);
  });
  it("rejects equal self-dependent captures", () => {
    const write = trace({ step: "write", kind: "mutation", dependency: "write" });
    expect(compareRequestTraces([write], [write]).length).toBeGreaterThan(0);
  });
  it("rejects equal cyclic captures", () => {
    const first = trace({ step: "first", kind: "mutation", dependency: "second" });
    const second = trace({ step: "second", kind: "mutation", dependency: "first" });
    expect(compareRequestTraces([first, second], [first, second]).length).toBeGreaterThan(0);
  });
  it("allows an explicitly reserved scenario-action root", () => {
    const write = trace({ step: "write", kind: "mutation", dependency: "$scenario" });
    expect(compareRequestTraces([write], [write])).toEqual([]);
  });
  it("matches repeated same-step independent read variants as a multiset", () => {
    const first = trace({ step: "poll", query: [["page", "1"]], body: "first" });
    const second = trace({ step: "poll", query: [["page", "2"]], body: "second" });
    expect(compareRequestTraces([first, second, first], [second, first, first])).toEqual([]);
  });

  it("rejects a dependent read moved before its mutation predecessor", () => {
    const initial = trace({ step: "initial" });
    const write = trace({ step: "write", kind: "mutation", method: "POST", dependency: "initial" });
    const read = trace({ step: "readback", dependency: "write" });
    const differences = compareRequestTraces([initial, write, read], [initial, read, write]);
    expect(differences.some((difference) => difference.code === "causal_order_mismatch")).toBe(true);
  });

  it("rejects a write moved before the read that authorizes it", () => {
    const initial = trace({ step: "initial" });
    const write = trace({ step: "write", kind: "mutation", method: "POST", dependency: "initial" });
    const differences = compareRequestTraces([initial, write], [write, initial]);
    expect(differences.some((difference) => difference.code === "causal_order_mismatch")).toBe(true);
  });
  it("returns no differences for identical captures", () => {
    const expected: readonly RequestTrace[] = [
      trace({ requestId: "expected-1" }),
      trace({
        requestId: "expected-2",
        step: "write-setting",
        kind: "mutation",
        method: "PUT",
        path: "/api/settings",
        body: '{"theme":"dark"}',
        dependency: "read-config",
      }),
    ];
    const actual: readonly RequestTrace[] = [
      trace({ requestId: "actual-1" }),
      trace({
        requestId: "actual-2",
        step: "write-setting",
        kind: "mutation",
        method: "PUT",
        path: "/api/settings",
        body: '{"theme":"dark"}',
        dependency: "read-config",
      }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([]);
  });

  it("returns no differences for two empty captures", () => {
    expect(compareRequestTraces([], [])).toEqual([]);
  });

  it("ignores volatile request ids and matches on stable step labels", () => {
    const expected = [trace({ requestId: "req-expected-42", step: "read-session" })];
    const actual = [trace({ requestId: "req-actual-99", step: "read-session" })];

    expect(compareRequestTraces(expected, actual)).toEqual([]);
  });

  it("canonicalizes method case, header name case/order, and query key order", () => {
    const expected = [
      trace({
        method: "get",
        query: [
          ["b", "2"],
          ["a", "1"],
          ["a", "3"],
        ],
        headers: [
          { name: "X-Trace", value: "one" },
          { name: "Accept", value: "application/json" },
          { name: "x-trace", value: "two" },
        ],
      }),
    ];
    const actual = [
      trace({
        method: "GET",
        query: [
          ["a", "1"],
          ["b", "2"],
          ["a", "3"],
        ],
        headers: [
          { name: "accept", value: "application/json" },
          { name: "x-trace", value: "one" },
          { name: "X-TRACE", value: "two" },
        ],
      }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([]);
  });

  it("preserves repeated query value order", () => {
    const expected = [
      trace({
        query: [
          ["tag", "a"],
          ["tag", "b"],
        ],
      }),
    ];
    const actual = [
      trace({
        query: [
          ["tag", "b"],
          ["tag", "a"],
        ],
      }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "query_mismatch", index: 0, step: "read-config" },
    ]);
  });

  it("preserves repeated header value order", () => {
    const expected = [
      trace({
        headers: [
          { name: "x-tag", value: "a" },
          { name: "x-tag", value: "b" },
        ],
      }),
    ];
    const actual = [
      trace({
        headers: [
          { name: "x-tag", value: "b" },
          { name: "x-tag", value: "a" },
        ],
      }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "header_mismatch", index: 0, step: "read-config" },
    ]);
  });

  it("reports a changed method", () => {
    const expected = [trace({ method: "GET" })];
    const actual = [trace({ method: "POST" })];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "method_mismatch", index: 0, step: "read-config" },
    ]);
  });

  it("reports a changed path", () => {
    const expected = [trace({ path: "/api/config" })];
    const actual = [trace({ path: "/api/config/next" })];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "path_mismatch", index: 0, step: "read-config" },
    ]);
  });

  it("reports a changed query value", () => {
    const expected = [trace({ query: [["limit", "10"]] })];
    const actual = [trace({ query: [["limit", "20"]] })];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "query_mismatch", index: 0, step: "read-config" },
    ]);
  });

  it("distinguishes a missing body from an empty body", () => {
    const expected = [trace({ body: null })];
    const actual = [trace({ body: "" })];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "body_mismatch", index: 0, step: "read-config" },
    ]);
  });

  it("reports a changed body without leaking its bytes", () => {
    const expected = [
      trace({
        step: "write-setting",
        kind: "mutation",
        method: "POST",
        body: '{"credential":"expected-body-marker"}',
        dependency: "read-config",
      }),
    ];
    const actual = [
      trace({
        step: "write-setting",
        kind: "mutation",
        method: "POST",
        body: '{"credential":"actual-body-marker"}',
        dependency: "read-config",
      }),
    ];
    const differences = compareRequestTraces(expected, actual);

    expect(differences).toEqual([
      { code: "body_mismatch", index: 0, step: "write-setting" },
    ]);
    const serialized = JSON.stringify(differences);
    expect(serialized).not.toContain("expected-body-marker");
    expect(serialized).not.toContain("actual-body-marker");
  });

  it("reports a changed status", () => {
    const expected = [trace({ status: 200 })];
    const actual = [trace({ status: 503 })];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "status_mismatch", index: 0, step: "read-config" },
    ]);
  });

  it("reports a changed terminal stream", () => {
    const expected = [trace({ terminalStream: "completed" })];
    const actual = [trace({ terminalStream: "error" })];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "terminal_stream_mismatch", index: 0, step: "read-config" },
    ]);
  });

  it("reports a changed terminal error", () => {
    const expected = [
      trace({ terminalStream: "error", error: "upstream_timeout" }),
    ];
    const actual = [
      trace({ terminalStream: "error", error: "upstream_unavailable" }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "error_mismatch", index: 0, step: "read-config" },
    ]);
  });

  it("reports a changed non-auth header without leaking its value", () => {
    const expected = [
      trace({ headers: [{ name: "x-request-class", value: "expected-private" }] }),
    ];
    const actual = [
      trace({ headers: [{ name: "x-request-class", value: "actual-private" }] }),
    ];
    const differences = compareRequestTraces(expected, actual);

    expect(differences).toEqual([
      { code: "header_mismatch", index: 0, step: "read-config" },
    ]);
    const serialized = JSON.stringify(differences);
    expect(serialized).not.toContain("expected-private");
    expect(serialized).not.toContain("actual-private");
  });

  it("compares an authorization scheme case-insensitively", () => {
    const expected = [
      trace({
        headers: [
          { name: "Authorization", value: "Bearer <redacted:tenant-a>" },
        ],
      }),
    ];
    const actual = [
      trace({
        headers: [
          { name: "authorization", value: "bearer <redacted:tenant-a>" },
        ],
      }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([]);
  });

  it("reports a changed authorization scheme", () => {
    const expected = [
      trace({ headers: [{ name: "authorization", value: "Bearer tenant-a" }] }),
    ];
    const actual = [
      trace({ headers: [{ name: "authorization", value: "Basic tenant-a" }] }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "auth_header_mismatch", index: 0, step: "read-config" },
    ]);
  });

  it("reports a changed authorization credential without leaking it", () => {
    const expected = [
      trace({
        headers: [
          { name: "authorization", value: "Bearer expected-auth-secret" },
        ],
      }),
    ];
    const actual = [
      trace({
        headers: [{ name: "authorization", value: "Bearer actual-auth-secret" }],
      }),
    ];
    const differences = compareRequestTraces(expected, actual);

    expect(differences).toEqual([
      { code: "auth_header_mismatch", index: 0, step: "read-config" },
    ]);
    const serialized = JSON.stringify(differences);
    expect(serialized).not.toContain("expected-auth-secret");
    expect(serialized).not.toContain("actual-auth-secret");
  });

  it("reports a changed api key as an auth-sensitive header", () => {
    const expected = [
      trace({ headers: [{ name: "x-api-key", value: "expected-api-key" }] }),
    ];
    const actual = [
      trace({ headers: [{ name: "x-api-key", value: "actual-api-key" }] }),
    ];
    const differences = compareRequestTraces(expected, actual);

    expect(differences).toEqual([
      { code: "auth_header_mismatch", index: 0, step: "read-config" },
    ]);
    const serialized = JSON.stringify(differences);
    expect(serialized).not.toContain("expected-api-key");
    expect(serialized).not.toContain("actual-api-key");
  });

  it("reports a changed causal dependency", () => {
    const expected = [
      trace({
        step: "write-setting",
        kind: "mutation",
        method: "POST",
        dependency: "read-config",
      }),
    ];
    const actual = [
      trace({
        step: "write-setting",
        kind: "mutation",
        method: "POST",
        dependency: "read-session",
      }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "dependency_mismatch", index: 0, step: "write-setting" },
    ]);
  });

  it("requires an explicit dependency label for mutations", () => {
    const expected = [
      trace({
        step: "write-setting",
        kind: "mutation",
        method: "POST",
        dependency: null,
      }),
    ];
    const actual = [
      trace({
        step: "write-setting",
        kind: "mutation",
        method: "POST",
        dependency: null,
      }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "dependency_mismatch", index: 0, step: "write-setting" },
    ]);
  });

  it("ignores independent read order and keeps duplicate reads", () => {
    const expected = [
      trace({ requestId: "expected-1", step: "read-alpha" }),
      trace({ requestId: "expected-2", step: "read-beta" }),
    ];
    const actual = [
      trace({ requestId: "actual-2", step: "read-beta" }),
      trace({ requestId: "actual-1", step: "read-alpha" }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([]);
  });

  it("reports a missing duplicate read", () => {
    const expected = [
      trace({ requestId: "expected-1", step: "read-alpha" }),
      trace({ requestId: "expected-2", step: "read-beta" }),
    ];
    const actual = [trace({ requestId: "actual-1", step: "read-alpha" })];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "missing_event", index: 1, step: "read-beta" },
    ]);
  });

  it("reports an extra independent read", () => {
    const expected = [trace({ requestId: "expected-1", step: "read-alpha" })];
    const actual = [
      trace({ requestId: "actual-1", step: "read-alpha" }),
      trace({ requestId: "actual-2", step: "read-beta" }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "extra_event", index: 1, step: "read-beta" },
    ]);
  });

  it("matches tool and turn dependencies by stable causal labels", () => {
    const expected = [
      trace({
        step: "turn-1",
        kind: "turn",
        method: "POST",
        path: "/v1/chat",
        dependency: "$scenario",
      }),
      trace({
        step: "tool-1",
        kind: "tool",
        method: "POST",
        path: "/v1/tool",
        dependency: "turn-1",
      }),
    ];
    const actual = [
      trace({
        requestId: "actual-turn",
        step: "turn-1",
        kind: "turn",
        method: "POST",
        path: "/v1/chat",
        dependency: "$scenario",
      }),
      trace({
        requestId: "actual-tool",
        step: "tool-1",
        kind: "tool",
        method: "POST",
        path: "/v1/tool",
        dependency: "turn-1",
      }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([]);
  });

  it("preserves causal write order instead of sorting writes by endpoint", () => {
    const expected = [
      trace({ step: "read-state", kind: "read" }),
      trace({
        step: "write-a",
        kind: "mutation",
        method: "POST",
        path: "/api/write",
        dependency: "read-state",
      }),
      trace({
        step: "write-b",
        kind: "mutation",
        method: "POST",
        path: "/api/write",
        dependency: "write-a",
      }),
    ];
    const actual = [
      trace({ step: "read-state", kind: "read" }),
      trace({
        step: "write-b",
        kind: "mutation",
        method: "POST",
        path: "/api/write",
        dependency: "write-a",
      }),
      trace({
        step: "write-a",
        kind: "mutation",
        method: "POST",
        path: "/api/write",
        dependency: "read-state",
      }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "causal_order_mismatch", index: 1, step: "write-a" },
    ]);
  });

  it("bounds findings to one per mismatched field", () => {
    const expected = [
      trace({
        step: "write-result",
        kind: "mutation",
        method: "POST",
        path: "/api/result",
        body: `expected-body-marker:${"a".repeat(256)}`,
        status: 200,
        terminalStream: "completed",
        error: null,
        dependency: "read-config",
      }),
    ];
    const actual = [
      trace({
        step: "write-result",
        kind: "mutation",
        method: "POST",
        path: "/api/result",
        body: `actual-body-marker:${"b".repeat(256)}`,
        status: 503,
        terminalStream: "error",
        error: "upstream_unavailable",
        dependency: "read-config",
      }),
    ];
    const differences = compareRequestTraces(expected, actual);

    expect(differences.map((difference) => difference.code)).toEqual([
      "body_mismatch",
      "status_mismatch",
      "terminal_stream_mismatch",
      "error_mismatch",
    ]);
    expect(
      differences.every(
        (difference) =>
          difference.index === 0 && difference.step === "write-result",
      ),
    ).toBe(true);
    const serialized = JSON.stringify(differences);
    expect(serialized).not.toContain("expected-body-marker");
    expect(serialized).not.toContain("actual-body-marker");
  });

  it("reports a changed event kind", () => {
    const expected = [
      trace({
        step: "write-setting",
        kind: "mutation",
        method: "POST",
        dependency: "read-config",
      }),
    ];
    const actual = [
      trace({
        step: "write-setting",
        kind: "turn",
        method: "POST",
        dependency: "read-config",
      }),
    ];

    expect(compareRequestTraces(expected, actual)).toEqual([
      { code: "kind_mismatch", index: 0, step: "write-setting" },
    ]);
  });
});
