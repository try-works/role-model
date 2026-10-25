import { type RequestTrace, compareRequestTraces } from "./compare.js";

export interface SelfcheckItem {
  readonly name: string;
  readonly passed: boolean;
}
export interface RequestParitySelfcheck {
  readonly status: "PASSED" | "FAILED";
  readonly scope: "request-comparator-only";
  readonly checks: readonly SelfcheckItem[];
}

/** Pure comparator controls, not React/browser or real-client verification. */
export function runRequestParitySelfcheck(): RequestParitySelfcheck {
  const read: RequestTrace = {
    requestId: null, step: "read", kind: "read", method: "GET",
    path: "/fixture", query: [], headers: [], body: null, status: 200,
    terminalStream: "completed", error: null, dependency: null,
  };
  const write: RequestTrace = { ...read, step: "write", kind: "mutation",
    method: "POST", body: "fixture-body", dependency: "read" };
  const readback: RequestTrace = { ...read, step: "readback", dependency: "write" };
  const baseline = [read, write, readback];
  const first = { ...read, step: "poll", query: [["page", "1"]] satisfies readonly (readonly [string, string])[] };
  const second = { ...read, step: "poll", query: [["page", "2"]] satisfies readonly (readonly [string, string])[] };
  const checks: SelfcheckItem[] = [
    { name: "identical-repeat", passed: compareRequestTraces(baseline, baseline).length === 0 },
    { name: "independent-read-permutation", passed: compareRequestTraces([first, second, first], [second, first, first]).length === 0 },
    { name: "changed-body", passed: compareRequestTraces(baseline, [read, { ...write, body: "different" }, readback]).some((item) => item.code === "body_mismatch") },
    { name: "extra-fetch", passed: compareRequestTraces(baseline, [...baseline, read]).some((item) => item.code === "extra_event") },
    { name: "missing-fetch", passed: compareRequestTraces(baseline, [read, write]).some((item) => item.code === "missing_event") },
    { name: "changed-method", passed: compareRequestTraces(baseline, [read, { ...write, method: "PUT" }, readback]).some((item) => item.code === "method_mismatch") },
    { name: "write-read-causality", passed: compareRequestTraces(baseline, [read, readback, write]).some((item) => item.code === "causal_order_mismatch") },
    { name: "changed-status", passed: compareRequestTraces(baseline, [read, { ...write, status: 500 }, readback]).some((item) => item.code === "status_mismatch") },
    { name: "changed-error", passed: compareRequestTraces(baseline, [read, { ...write, error: "fixture-upstream-error" }, readback]).some((item) => item.code === "error_mismatch") },
    { name: "changed-stream-terminal", passed: compareRequestTraces(baseline, [read, { ...write, terminalStream: "error" }, readback]).some((item) => item.code === "terminal_stream_mismatch") },
  ];
  return { status: checks.every((item) => item.passed) ? "PASSED" : "FAILED",
    scope: "request-comparator-only", checks };
}
