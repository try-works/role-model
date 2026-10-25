/**
 * Pure request-trace comparator for the parity harness.
 *
 * Chosen capture contract:
 * - `step` is the stable causal label shared by the expected and actual captures.
 *   `requestId` is volatile capture-local metadata and is never compared.
 * - `dependency` names the stable label of the causal predecessor. Mutation,
 *   tool, and turn traces must provide an explicit non-null label. "$scenario"
 *   is the only external root; every other predecessor must occur earlier in
 *   the capture. Step labels may not use that reserved root. Independent reads
 *   have no dependency; dependent reads must follow their predecessor.
 * - `body` is a stable capture-normalized string, or `null` when no body was
 *   sent. It is compared byte-for-byte and is never copied into a finding.
 * - Query keys and header names are canonicalized (query key order, header name
 *   case and header order) while repeated values keep their capture order.
 * - Authorization/API-key headers are compared semantically and their values
 *   are never copied into a finding.
 * - Reads are compared as an order-insensitive multiset keyed by `step`.
 *   Mutations, tools, and turns keep the expected causal order and dependency
 *   labels; they are not sorted by endpoint.
 *
 * Findings are deterministic and bounded by the compared events: each finding
 * carries only a stable code, an event index, and the stable step label.
 */

export type TraceKind = "read" | "mutation" | "tool" | "turn";

export type TerminalStream = "completed" | "error" | "aborted" | "open";

export interface Header {
  readonly name: string;
  readonly value: string;
}

export type QueryPair = readonly [name: string, value: string];

export interface RequestTrace {
  /** Volatile capture-local id. Never compared. */
  readonly requestId: string | null;
  /** Stable causal label shared by the expected and actual captures. */
  readonly step: string;
  readonly kind: TraceKind;
  readonly method: string;
  readonly path: string;
  readonly query: readonly QueryPair[];
  readonly headers: readonly Header[];
  /** Capture-normalized body text, or null when no body was captured. */
  readonly body: string | null;
  readonly status: number | null;
  readonly terminalStream: TerminalStream;
  readonly error: string | null;
  /** Stable causal predecessor label; explicit for mutation/tool/turn. */
  readonly dependency: string | null;
}

export type TraceDifferenceCode =
  | "missing_event"
  | "extra_event"
  | "kind_mismatch"
  | "method_mismatch"
  | "path_mismatch"
  | "query_mismatch"
  | "header_mismatch"
  | "auth_header_mismatch"
  | "body_mismatch"
  | "status_mismatch"
  | "terminal_stream_mismatch"
  | "error_mismatch"
  | "dependency_mismatch"
  | "causal_order_mismatch";

export interface TraceDifference {
  readonly code: TraceDifferenceCode;
  readonly index: number;
  readonly step: string;
}

interface CanonicalHeader {
  readonly name: string;
  readonly values: readonly string[];
}

const AUTH_HEADER_NAMES: ReadonlySet<string> = new Set([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "api-key",
]);

function isAuthHeaderName(lowercaseName: string): boolean {
  return AUTH_HEADER_NAMES.has(lowercaseName);
}

function authSemanticValue(lowercaseName: string, value: string): string {
  if (lowercaseName === "authorization" || lowercaseName === "proxy-authorization") {
    const separator = value.indexOf(" ");
    if (separator === -1) {
      return value.toLowerCase();
    }
    const scheme = value.slice(0, separator).toLowerCase();
    const credential = value.slice(separator + 1);
    return `${scheme} ${credential}`;
  }
  return value;
}

function canonicalQuery(query: readonly QueryPair[]): readonly QueryPair[] {
  const grouped = new Map<string, string[]>();
  for (const pair of query) {
    const key = pair[0];
    const value = pair[1];
    const values = grouped.get(key);
    if (values === undefined) {
      grouped.set(key, [value]);
    } else {
      values.push(value);
    }
  }
  const keys = Array.from(grouped.keys()).sort();
  const canonical: QueryPair[] = [];
  for (const key of keys) {
    const values = grouped.get(key);
    if (values !== undefined) {
      for (const value of values) {
        canonical.push([key, value]);
      }
    }
  }
  return canonical;
}

function sameQuery(left: readonly QueryPair[], right: readonly QueryPair[]): boolean {
  const leftCanonical = canonicalQuery(left);
  const rightCanonical = canonicalQuery(right);
  if (leftCanonical.length !== rightCanonical.length) {
    return false;
  }
  for (let index = 0; index < leftCanonical.length; index += 1) {
    const leftPair = leftCanonical[index];
    const rightPair = rightCanonical[index];
    if (leftPair[0] !== rightPair[0] || leftPair[1] !== rightPair[1]) {
      return false;
    }
  }
  return true;
}

function canonicalHeaders(
  headers: readonly Header[],
  authGroup: boolean,
): readonly CanonicalHeader[] {
  const grouped = new Map<string, string[]>();
  for (const header of headers) {
    const name = header.name.toLowerCase();
    if (isAuthHeaderName(name) !== authGroup) {
      continue;
    }
    const value = authGroup ? authSemanticValue(name, header.value) : header.value;
    const values = grouped.get(name);
    if (values === undefined) {
      grouped.set(name, [value]);
    } else {
      values.push(value);
    }
  }
  const names = Array.from(grouped.keys()).sort();
  const canonical: CanonicalHeader[] = [];
  for (const name of names) {
    const values = grouped.get(name);
    if (values !== undefined) {
      canonical.push({ name, values });
    }
  }
  return canonical;
}

function sameCanonicalHeaders(
  left: readonly CanonicalHeader[],
  right: readonly CanonicalHeader[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    const leftHeader = left[index];
    const rightHeader = right[index];
    if (leftHeader.name !== rightHeader.name) {
      return false;
    }
    if (leftHeader.values.length !== rightHeader.values.length) {
      return false;
    }
    for (let valueIndex = 0; valueIndex < leftHeader.values.length; valueIndex += 1) {
      if (leftHeader.values[valueIndex] !== rightHeader.values[valueIndex]) {
        return false;
      }
    }
  }
  return true;
}

function finding(
  code: TraceDifferenceCode,
  index: number,
  step: string,
): TraceDifference {
  return { code, index, step };
}

function collectTraceDifferences(
  expected: RequestTrace,
  actual: RequestTrace,
  index: number,
  differences: TraceDifference[],
): void {
  const step = expected.step;
  if (expected.kind !== actual.kind) {
    differences.push(finding("kind_mismatch", index, step));
  }
  if (expected.method.toUpperCase() !== actual.method.toUpperCase()) {
    differences.push(finding("method_mismatch", index, step));
  }
  if (expected.path !== actual.path) {
    differences.push(finding("path_mismatch", index, step));
  }
  if (!sameQuery(expected.query, actual.query)) {
    differences.push(finding("query_mismatch", index, step));
  }
  if (
    !sameCanonicalHeaders(
      canonicalHeaders(expected.headers, false),
      canonicalHeaders(actual.headers, false),
    )
  ) {
    differences.push(finding("header_mismatch", index, step));
  }
  if (
    !sameCanonicalHeaders(
      canonicalHeaders(expected.headers, true),
      canonicalHeaders(actual.headers, true),
    )
  ) {
    differences.push(finding("auth_header_mismatch", index, step));
  }
  if (expected.body !== actual.body) {
    differences.push(finding("body_mismatch", index, step));
  }
  if (expected.status !== actual.status) {
    differences.push(finding("status_mismatch", index, step));
  }
  if (expected.terminalStream !== actual.terminalStream) {
    differences.push(finding("terminal_stream_mismatch", index, step));
  }
  if (expected.error !== actual.error) {
    differences.push(finding("error_mismatch", index, step));
  }
  if (expected.kind !== "read" && (expected.dependency === null || actual.dependency === null)) {
    differences.push(finding("dependency_mismatch", index, step));
  } else if (expected.dependency !== actual.dependency) {
    differences.push(finding("dependency_mismatch", index, step));
  }
}

function findCausalOrderDifference(
  expected: readonly RequestTrace[],
  actual: readonly RequestTrace[],
): TraceDifference | null {
  // Internal predecessors must occur before consumers, including reads.
  // Referential validity of otherwise equivalent captures is checked below.
  const labels = new Set(actual.map((trace) => trace.step));
  const seen = new Set<string>();
  let dependencyOrder: TraceDifference | null = null;
  for (let index = 0; index < actual.length; index += 1) {
    const trace = actual[index];
    if (trace.dependency !== null && labels.has(trace.dependency) && !seen.has(trace.dependency)) {
      dependencyOrder ??= finding("causal_order_mismatch", index, trace.step);
    }
    seen.add(trace.step);
  }
  const expectedCausal = expected
    .map((trace, index) => ({ trace, index }))
    .filter((entry) => entry.trace.kind !== "read");
  const actualCausal = actual
    .map((trace, index) => ({ trace, index }))
    .filter((entry) => entry.trace.kind !== "read");
  if (expectedCausal.length !== actualCausal.length) {
    return null;
  }
  const expectedSteps = expectedCausal.map((entry) => entry.trace.step).sort();
  const actualSteps = actualCausal.map((entry) => entry.trace.step).sort();
  for (let index = 0; index < expectedSteps.length; index += 1) {
    if (expectedSteps[index] !== actualSteps[index]) {
      return null;
    }
  }
  for (let index = 0; index < expectedCausal.length; index += 1) {
    if (expectedCausal[index].trace.step !== actualCausal[index].trace.step) {
      return finding(
        "causal_order_mismatch",
        expectedCausal[index].index,
        expectedCausal[index].trace.step,
      );
    }
  }
  return dependencyOrder;
}

/**
 * Compare two captured request traces and return deterministic findings.
 *
 * An empty array means the captures are equivalent under the contract above.
 * Mismatched bodies, headers, and auth values are reported by code only; their
 * content is never returned or thrown.
 */
export function compareRequestTraces(
  expected: readonly RequestTrace[],
  actual: readonly RequestTrace[],
): readonly TraceDifference[] {
  const differences: TraceDifference[] = [];
  const used = new Set<number>();
  const reservedReads = new Map<number, number>();
  // Reserve exact reads first so changed occurrences cannot consume a later
  // exact match when several independent polls share one scenario label.
  for (let index = 0; index < expected.length; index += 1) {
    const trace = expected[index];
    if (trace.kind !== "read" || trace.dependency !== null) continue;
    const match = actual.findIndex((candidate, candidateIndex) => {
      if (used.has(candidateIndex) || candidate.step !== trace.step) return false;
      const findings: TraceDifference[] = [];
      collectTraceDifferences(trace, candidate, index, findings);
      return findings.length === 0;
    });
    if (match !== -1) {
      reservedReads.set(index, match);
      used.add(match);
    }
  }

  for (let index = 0; index < expected.length; index += 1) {
    const expectedTrace = expected[index];
    const actualIndex = reservedReads.get(index) ?? actual.findIndex((candidate, candidateIndex) =>
      candidate.step === expectedTrace.step && !used.has(candidateIndex));
    if (actualIndex === -1) {
      differences.push(finding("missing_event", index, expectedTrace.step));
      continue;
    }
    used.add(actualIndex);
    collectTraceDifferences(expectedTrace, actual[actualIndex], index, differences);
  }

  for (let index = 0; index < actual.length; index += 1) {
    if (!used.has(index)) {
      differences.push(finding("extra_event", index, actual[index].step));
    }
  }

  const causalOrderDifference = findCausalOrderDifference(expected, actual);
  if (causalOrderDifference !== null) {
    differences.push(causalOrderDifference);
  }

  // A mismatched capture is already rejected. Validate both graphs before an
  // empty result can assert equivalence, including a malformed reference input.
  if (differences.length === 0) {
    for (const capture of [expected, actual]) {
      const completed = new Set<string>();
      for (let index = 0; index < capture.length; index += 1) {
        const trace = capture[index];
        if (trace.step === "$scenario" || (trace.dependency !== null && trace.dependency !== "$scenario" && !completed.has(trace.dependency))) {
          return [finding("dependency_mismatch", index, trace.step)];
        }
        completed.add(trace.step);
      }
    }
  }
  return differences;
}
